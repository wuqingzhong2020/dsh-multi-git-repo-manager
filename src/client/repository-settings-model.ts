import type { NamedManagedTarget, ManagedProject } from '../repository-types.ts'
import { absoluteReviewPath, repositoryProjectPath } from './repository-paths.ts'

/** Trim complete rows; the Host owns canonical validation and persistence. */
export function prepareProjectForSave(project: ManagedProject): ManagedProject {
  const normalize = (entries: ManagedProject['repositories']) => entries
    .filter(entry => entry.name.trim() !== '' && entry.path.trim() !== '')
    .map(entry => ({ name: entry.name.trim(), path: repositoryProjectPath(project.root, entry.path) }))
  return {
    ...project, name: project.name.trim(),
    repositories: normalize(project.repositories), directories: normalize(project.directories),
  }
}

/** Keep declarations in the editor, including unavailable and temporary targets. */
export function createRepositoryDraft(
  project: ManagedProject,
  temporary: NamedManagedTarget[],
): ManagedProject {
  const entries = [...draftTargets(project)]
  for (const entry of temporary) {
    if (!entries.some(current => current.path === entry.path && current.kind === entry.kind)) entries.push(entry)
  }
  return { ...project, ...withDraftTargets(entries) }
}

/** One editor row model maps to the two explicit lists in the portable v2 file. */
export function draftTargets(project: ManagedProject): NamedManagedTarget[] {
  return [
    ...project.repositories.map(entry => ({ ...entry, kind: 'git' as const })),
    ...project.directories.map(entry => ({ ...entry, kind: 'directory' as const })),
  ]
}
export function withDraftTargets(entries: NamedManagedTarget[]): Pick<ManagedProject, 'repositories' | 'directories'> {
  return {
    repositories: entries.filter(entry => entry.kind === 'git').map(({ name, path }) => ({ name, path })),
    directories: entries.filter(entry => entry.kind === 'directory').map(({ name, path }) => ({ name, path })),
  }
}
export function collectTemporaryTargets(project: ManagedProject): NamedManagedTarget[] {
  return draftTargets(prepareProjectForSave(project))
    .filter(entry => absoluteReviewPath(entry.path))
}
