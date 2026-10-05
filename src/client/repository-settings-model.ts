import type { NamedManagedTarget, NamedReviewRepository, ReviewProject, ReviewWorkspace } from '../repository-types.ts'
import {
  absoluteReviewPath,
  normalizeReviewPath,
  relativeProjectDirectory,
  repositoryProjectPath,
} from './repository-paths.ts'

/** Trim complete rows and normalize paths before the Host validates and saves them. */
export function prepareProjectForSave(project: ReviewProject): ReviewProject {
  return {
    ...project,
    name: project.name.trim(),
    enabled: project.enabled ?? true,
    configFiles: [],
    repositories: [],
    namedRepositories: (project.namedRepositories ?? [])
      .filter(entry => entry.name.trim() !== '' && entry.path.trim() !== '')
      .map(entry => ({
        name: entry.name.trim(),
        path: repositoryProjectPath(project.root, entry.path),
      })),
    ...(project.directories ? { directories: project.directories.filter(entry => entry.name.trim() && entry.path.trim()).map(entry => ({ name: entry.name.trim(), path: repositoryProjectPath(project.root, entry.path) })) } : {}),
  }
}

/** Combine resolved repositories and session-only entries in their displayed order. */
export function createRepositoryDraft(
  project: ReviewProject,
  workspace: ReviewWorkspace,
  temporary: NamedReviewRepository[],
): ReviewProject {
  const entries = workspace.repositories
    .filter(repo => repo.source !== 'project')
    .map(repo => ({ name: repo.name, path: repo.relativePath }))
  for (const entry of temporary) {
    const path = normalizeReviewPath(entry.path).toLowerCase()
    const alreadyListed = entries.some(
      current => normalizeReviewPath(current.path).toLowerCase() === path,
    )
    if (!alreadyListed) entries.push(entry)
  }
  return {
    ...project,
    enabled: project.enabled ?? true,
    configFiles: [],
    repositories: [],
    namedRepositories: entries,
    directories: workspace.targets?.filter(target => target.kind === 'directory' && target.source !== 'project').map(target => ({ name: target.name, path: target.relativePath })) ?? project.directories,
  }
}

/** The editor shares one typed row model; the portable JSON retains two explicit lists. */
export function draftTargets(project: ReviewProject): NamedManagedTarget[] {
  return [
    ...(project.namedRepositories ?? []).map(entry => ({ ...entry, kind: 'git' as const })),
    ...(project.directories ?? []).map(entry => ({ ...entry, kind: 'directory' as const })),
  ]
}
export function withDraftTargets(entries: NamedManagedTarget[]): Pick<ReviewProject, 'namedRepositories' | 'directories'> {
  return {
    namedRepositories: entries.filter(entry => entry.kind === 'git').map(({ name, path }) => ({ name, path })),
    directories: entries.filter(entry => entry.kind === 'directory').map(({ name, path }) => ({ name, path })),
  }
}
export function collectTemporaryTargets(project: ReviewProject): NamedManagedTarget[] {
  return draftTargets(project).map(entry => ({ ...entry, name: entry.name.trim(), path: repositoryProjectPath(project.root, entry.path) }))
    .filter(entry => entry.name && entry.path && absoluteReviewPath(entry.path))
}

/** Keep external absolute paths in the session instead of the portable project file. */
export function collectTemporaryRepositories(project: ReviewProject): NamedReviewRepository[] {
  return (project.namedRepositories ?? [])
    .map(entry => ({ ...entry, path: repositoryProjectPath(project.root, entry.path) }))
    .filter(
      entry =>
        entry.name.trim() &&
        absoluteReviewPath(entry.path) &&
        relativeProjectDirectory(project.root, entry.path) === null,
    )
    .map(entry => ({ name: entry.name.trim(), path: normalizeReviewPath(entry.path.trim()) }))
}
