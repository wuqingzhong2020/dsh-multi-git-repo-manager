/** Classify explicit targets without executing Git commands or project scripts. */
import { realpath, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { basename, isAbsolute } from 'node:path'
import type { ManagedTargetKind, ManagedProject, ManagedWorkspace, ProjectIndexEntry } from './repository-types.ts'
import { inspectTarget } from './managed-target.ts'
import { discoveryContainers } from './target-discovery.ts'
import { managedProjectSchema } from './repository-schemas.ts'
import { findProjectFile, readProjectFile, PROJECT_FILE_NAME } from './repository-project-file.ts'
import { canonicalRepositoryPath, inside } from './repository-path-policy.ts'
export { inside } from './repository-path-policy.ts'

export function pathKey(path: string): string {
  return process.platform === 'win32' ? path.toLowerCase() : path
}

async function normalizeProject(project: ManagedProject): Promise<ManagedProject> {
  const validated = managedProjectSchema.parse(project)
  if (!isAbsolute(validated.root)) throw new Error('Project root must be an absolute path')
  const root = await realpath(validated.root)
  if (!(await stat(root)).isDirectory()) throw new Error('Project root is not a directory')
  const normalize = async (entry: { name: string; path: string }) => ({
    ...entry, path: await canonicalRepositoryPath(root, entry.path),
  })
  return {
    ...validated, root,
    repositories: await Promise.all(validated.repositories.map(normalize)),
    directories: await Promise.all(validated.directories.map(normalize)),
  }
}

export async function previewProject(project: ManagedProject): Promise<ManagedWorkspace> {
  const normalized = await normalizeProject(project)
  const candidates = [
    ...normalized.repositories.map(entry => ({ ...entry, kind: 'git' as const, source: PROJECT_FILE_NAME })),
    ...normalized.directories.map(entry => ({ ...entry, kind: 'directory' as const, source: PROJECT_FILE_NAME })),
  ]
  const targets = []
  const seen = new Set<string>()
  const declaredKinds = new Map<string, ManagedTargetKind>()
  // Explicit rows win over the automatic root so a type mismatch remains visible.
  for (const candidate of candidates) {
    const target = await inspectTarget(normalized.root, candidate)
    const key = pathKey(target.path)
    const previousKind = declaredKinds.get(key)
    if (previousKind && previousKind !== candidate.kind) throw new Error('A target cannot be declared as both Git and directory')
    declaredKinds.set(key, candidate.kind)
    if (seen.has(key)) continue
    seen.add(key)
    targets.push(target)
  }
  if (normalized.includeProjectRoot && !seen.has(pathKey(normalized.root))) {
    targets.unshift(await inspectTarget(normalized.root, { name: normalized.name || basename(normalized.root), path: normalized.root, source: 'project' }))
  }
  if (targets.length > 512) throw new Error('Project exceeds 512 managed targets')
  const boundaries = await discoveryContainers(normalized)
  return {
    project: normalized, targets, boundaries, warnings: [],
    repositories: targets.filter(target => target.kind === 'git').map(target => ({
      ...target, state: target.state === 'kindMismatch' ? 'error' as const : target.state,
    })),
    roots: targets.filter(target => target.state === 'ready').map(target => target.path),
    workspaceRevision: createHash('sha256').update(JSON.stringify([targets, boundaries])).digest('hex'),
  }
}

/** The closest local file wins, including an explicit disabled configuration. */
export async function resolveManagedWorkspace(cwd: string, index: ProjectIndexEntry[]): Promise<ManagedWorkspace> {
  const sessionRoot = await realpath(cwd)
  const local = await findProjectFile(sessionRoot)
  if (local !== null && local.project.enabled) return previewProject(local.project)
  if (local === null) {
    for (const entry of [...index].sort((a, b) => b.root.length - a.root.length)) {
      // An index is a locator, never an authorization to consume its target declarations.
      if (!inside(entry.root, sessionRoot)) continue
      const configured = await readProjectFile(entry.root)
      if (configured !== null) {
        if (configured.project.enabled) return previewProject(configured.project)
        break
      }
    }
  }
  const target = await inspectTarget(sessionRoot, { name: basename(sessionRoot), path: sessionRoot, source: 'project' })
  return {
    project: null, repositories: [], warnings: [], targets: [target], boundaries: [],
    roots: target.state === 'ready' ? [target.path] : [],
    workspaceRevision: createHash('sha256').update(JSON.stringify([target])).digest('hex'),
  }
}
