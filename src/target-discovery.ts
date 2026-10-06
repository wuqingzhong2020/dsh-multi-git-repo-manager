/** Inspect only configured containers' immediate children, never source contents. */
import { readdir, realpath } from 'node:fs/promises'
import { basename, isAbsolute, resolve } from 'node:path'
import type { ManagedProject, TargetDiscovery } from './repository-types.ts'
import { canonicalPathKey, inspectTarget } from './managed-target.ts'
import { canonicalRepositoryPath } from './repository-path-policy.ts'

export async function discoveryContainers(project: ManagedProject): Promise<string[]> {
  const result: string[] = []
  for (const input of project.discovery.containers) {
    const path = await canonicalRepositoryPath(project.root, input)
    if (isAbsolute(path)) throw new Error('Discovery containers must be inside the project')
    result.push(resolve(project.root, path))
  }
  return [...new Map(result.map(path => [canonicalPathKey(path), path])).values()]
}

export async function discoverTargets(project: ManagedProject): Promise<TargetDiscovery> {
  const containers = await discoveryContainers(project)
  const containerKeys = new Set(containers.map(canonicalPathKey))
  const known = new Set((await Promise.all([
    ...project.repositories, ...project.directories,
  ].map(entry => realpath(resolve(project.root, entry.path)).catch(() => resolve(project.root, entry.path))))).map(canonicalPathKey))
  const result: TargetDiscovery = { candidates: [], warnings: [] }
  for (const container of containers) {
    try {
      const children = await readdir(container, { withFileTypes: true })
      for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
        if (!child.isDirectory() || child.name === '.git') continue
        const path = resolve(container, child.name)
        if (known.has(canonicalPathKey(path)) || containerKeys.has(canonicalPathKey(path))) continue
        if (result.candidates.length >= 512) { result.warnings.push('Discovery exceeds 512 candidates'); return result }
        const candidate = await inspectTarget(project.root, { name: basename(path), path, source: 'discovery' })
        // Junctions escaping the project are never offered as persistable targets.
        if (isAbsolute(await canonicalRepositoryPath(project.root, candidate.path))) continue
        known.add(canonicalPathKey(candidate.path)); result.candidates.push(candidate)
      }
    } catch (error) { result.warnings.push(`${container}: ${error instanceof Error ? error.message : String(error)}`) }
  }
  return result
}
