/** File admission uses the most specific target, including unavailable boundaries. */
import { lstat, realpath } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import type { ReviewWorkspace, TargetPathResolution } from './repository-types.ts'
import { inside } from './repository-path-policy.ts'
import { canonicalPathKey, hasOwnGit, inspectTarget } from './managed-target.ts'

async function canonicalFile(path: string): Promise<string> {
  let current = path
  const tail: string[] = []
  while (true) {
    try { return resolve(await realpath(current), ...tail.reverse()) }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      const parent = dirname(current)
      if (parent === current) throw error
      tail.push(relative(parent, current)); current = parent
    }
  }
}

export async function resolveTargetPaths(workspace: ReviewWorkspace, cwd: string, inputs: readonly string[]): Promise<TargetPathResolution[]> {
  const fallback = workspace.project == null
    ? [await inspectTarget(await realpath(cwd), { name: 'Workspace', path: cwd, source: 'project' })]
    : []
  const legacy = workspace.targets === undefined && workspace.project != null
    ? await Promise.all(workspace.roots.map(path => inspectTarget(workspace.project!.root, { name: 'Workspace', path, source: 'legacy' }))) : []
  const targets = workspace.targets ?? [...fallback, ...legacy]
  const containers = workspace.boundaries ?? []
  const ordered = [...targets].sort((a, b) => b.path.length - a.path.length)
  const resolveOne = async (input: string): Promise<TargetPathResolution> => {
    const requested = resolve(cwd, input)
    const result: TargetPathResolution = { input, path: requested, state: 'unmanaged' }
    if (requested.split(/[\\/]/).some(part => part.toLowerCase() === '.git')) return { ...result, state: 'metadata' }
    try {
      const marker = await lstat(requested).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null
        throw error
      })
      if (marker?.isSymbolicLink()) return { ...result, state: 'outside', reason: 'Symbolic links are not review files' }
      result.path = await canonicalFile(requested)
      const lexical = ordered.find(target => inside(target.path, requested))
      const target = ordered.find(target => inside(target.path, result.path))
      if (!target || (lexical && lexical.id !== target.id)) return { ...result, state: 'outside' }
      result.target = target
      if (target.state !== 'ready') return { ...result, state: 'unavailable' }
      // Unknown direct children of discovery containers are explicit unmanaged boundaries.
      for (const container of containers) {
        if (!inside(container, result.path)) continue
        const child = relative(container, result.path).split(sep)[0]
        if (child && canonicalPathKey(target.path).length < canonicalPathKey(resolve(container, child)).length)
          return { ...result, state: 'unmanaged', reason: 'Discovery candidate has not been added' }
      }
      // Walk only this file's ancestors. An undisclosed nested Git root cannot inherit admission.
      let parent = dirname(result.path)
      while (inside(target.path, parent) && canonicalPathKey(parent) !== canonicalPathKey(target.path)) {
        if (await hasOwnGit(parent)) return { ...result, state: 'unmanaged', reason: 'Nested Git repository has not been added' }
        const next = dirname(parent)
        if (next === parent) break
        parent = next
      }
      return { ...result, state: 'managed' }
    } catch (error) { return { ...result, state: 'error', reason: error instanceof Error ? error.message : String(error) } }
  }
  // Bounded batches avoid opening hundreds of descriptors concurrently.
  const results: TargetPathResolution[] = []
  for (let offset = 0; offset < inputs.length; offset += 16)
    results.push(...await Promise.all(inputs.slice(offset, offset + 16).map(resolveOne)))
  return results
}
