/** Classify a directory from its own metadata without requiring a Git executable. */
import { createHash } from 'node:crypto'
import { lstat, readFile, realpath, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { ManagedTarget, ManagedTargetKind } from './repository-types.ts'
import { projectRepositoryPath } from './repository-path-policy.ts'

export const canonicalPathKey = (path: string): string => process.platform === 'win32' ? path.toLowerCase() : path
export const targetId = (projectRoot: string, path: string): string =>
  createHash('sha256').update(`${canonicalPathKey(projectRoot)}\0${canonicalPathKey(path)}`).digest('hex')

/** A malformed marker is an error, never evidence of an ordinary directory. */
export async function hasOwnGit(path: string): Promise<boolean> {
  const filename = resolve(path, '.git')
  const marker = await lstat(filename).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  if (marker === null) return false
  if (marker.isSymbolicLink()) throw new Error('Git metadata must not be a symbolic link')
  let gitDir = filename
  if (marker.isFile()) {
    if (marker.size > 4096) throw new Error('Invalid Git directory pointer')
    const text = (await readFile(filename, 'utf8')).trim()
    if (!text.startsWith('gitdir: ')) throw new Error('Invalid Git directory pointer')
    gitDir = resolve(dirname(filename), text.slice(8))
  } else if (!marker.isDirectory()) throw new Error('Invalid Git metadata')
  if (!(await stat(gitDir)).isDirectory()) throw new Error('Git directory is unavailable')
  const head = (await readFile(resolve(gitDir, 'HEAD'), 'utf8')).trim()
  if (!/^ref: [^\r\n]+$|^[0-9a-f]{40,64}$/i.test(head)) throw new Error('Invalid Git HEAD')
  return true
}

export async function inspectTarget(root: string, entry: { name: string; path: string; source: string; kind?: ManagedTargetKind }): Promise<ManagedTarget> {
  let path = resolve(root, entry.path)
  const result: ManagedTarget = {
    id: targetId(root, path), name: entry.name, path, relativePath: projectRepositoryPath(root, path),
    source: entry.source, kind: entry.kind ?? 'directory', state: 'ready', capabilities: { git: false },
  }
  try {
    path = await realpath(path)
    result.path = path
    result.id = targetId(root, path)
    result.relativePath = projectRepositoryPath(root, path)
    if (!(await stat(path)).isDirectory()) throw new Error('Target path is not a directory')
    const git = await hasOwnGit(path)
    result.kind = entry.kind ?? (git ? 'git' : 'directory')
    if (result.kind === 'git' && !git) result.state = 'notGit'
    if (result.kind === 'directory' && git) result.state = 'kindMismatch'
    result.capabilities.git = git && result.kind === 'git' && result.state === 'ready'
  } catch (error) {
    // Missing metadata in an existing directory is a broken Git target, not a missing directory.
    const missing = await stat(path).catch(() => null)
    result.state = missing === null && (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'error'
    result.reason = error instanceof Error ? error.message : String(error)
  }
  return result
}
