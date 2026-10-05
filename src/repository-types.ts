/** Serializable project configuration and repository preview shared by both faces. */
export interface NamedReviewRepository { name: string; path: string }
export type ManagedTargetKind = 'git' | 'directory'
export interface NamedManagedTarget extends NamedReviewRepository { kind: ManagedTargetKind }
export interface ManagedTarget {
  id: string
  name: string
  kind: ManagedTargetKind
  path: string
  relativePath: string
  source: string
  state: 'ready' | 'missing' | 'notGit' | 'error' | 'kindMismatch'
  capabilities: { git: boolean }
  reason?: string
}
export interface TargetPathResolution {
  input: string
  path: string
  state: 'managed' | 'unmanaged' | 'unavailable' | 'outside' | 'metadata' | 'error'
  target?: ManagedTarget
  reason?: string
}
export interface TargetDiscovery { candidates: ManagedTarget[]; warnings: string[] }

export interface ReviewProject {
  name: string
  root: string
  includeProjectRoot: boolean
  configFiles: string[]
  repositories: string[]
  /** Repositories managed in the project-local JSON file. */
  namedRepositories?: NamedReviewRepository[] | undefined
  directories?: NamedReviewRepository[] | undefined
  discovery?: { containers: string[] } | undefined
  /** Whether multi-repository management is enabled for this project. */
  enabled?: boolean | undefined
}

export interface ReviewRepository {
  name: string
  /** Display path relative to the current project root when the volume permits. */
  relativePath: string
  /** Canonical absolute path used for file ownership and Host safety checks. */
  path: string
  source: string
  state: 'ready' | 'missing' | 'notGit' | 'error'
  reason?: string
}

export interface ReviewWorkspace {
  project: ReviewProject | null
  repositories: ReviewRepository[]
  warnings: string[]
  /** Trusted canonical roots used by the Host, never supplied by an undo caller. */
  roots: string[]
  /** Authoritative targets; repositories is the backwards compatible Git projection. */
  targets?: ManagedTarget[]
  boundaries?: string[]
  workspaceRevision?: string
}

export interface ReviewProjectSettings {
  projects: ReviewProject[]
  revision: number
}

export type SaveReviewProjects = ReviewProjectSettings

export interface ReviewProjectPage {
  project: ReviewProject
  revision: number
  configured: boolean
  workspace: ReviewWorkspace
  /** Hash of the project-local file, used to reject stale saves. */
  fileRevision: string
  /** Session-only absolute repositories, excluded from the project file. */
  temporaryRepositories: NamedReviewRepository[]
  temporaryTargets?: NamedManagedTarget[]
}

export interface SaveReviewProject {
  project: ReviewProject
  revision: number
  fileRevision: string
}

export type NamedRepository = NamedReviewRepository
export type RepositoryProject = ReviewProject
export type Repository = ReviewRepository
export type RepositoryWorkspace = ReviewWorkspace
export type RepositoryProjectPage = ReviewProjectPage
export type SaveRepositoryProject = SaveReviewProject
