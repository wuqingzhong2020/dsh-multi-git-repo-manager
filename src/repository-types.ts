import type { Agent } from '@deepseek-ai/dsh-agent'

/** Serializable management facts shared by the Host and browser. */
export interface NamedTarget { name: string; path: string }
export type ManagedTargetKind = 'git' | 'directory'
export interface NamedManagedTarget extends NamedTarget { kind: ManagedTargetKind }
export interface ManagedTarget {
  id: string
  name: string
  kind: ManagedTargetKind
  path: string
  relativePath: string
  source: string
  state: 'ready' | 'missing' | 'notGit' | 'error' | 'kindMismatch'
  /** Own usable Git metadata; does not imply CLI, HEAD or comparison availability. */
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

export interface ManagedProject {
  name: string
  root: string
  enabled: boolean
  includeProjectRoot: boolean
  repositories: NamedTarget[]
  directories: NamedTarget[]
  discovery: { containers: string[] }
}

/** Git projection for consumers that enumerate repositories. */
export interface ManagedRepository {
  name: string
  relativePath: string
  path: string
  source: string
  state: 'ready' | 'missing' | 'notGit' | 'error'
  reason?: string
}

export interface ManagedWorkspace {
  project: ManagedProject | null
  repositories: ManagedRepository[]
  warnings: string[]
  roots: string[]
  /** Complete ownership snapshot, including unavailable target boundaries. */
  targets: ManagedTarget[]
  boundaries: string[]
  /** Management scope revision, independent of Git content versions. */
  workspaceRevision: string
}

/** Consumers read scope and admission without receiving configuration writers. */
export interface ManagedWorkspaceReader {
  workspace(agent: Agent): Promise<ManagedWorkspace>
  resolveTargetPaths(agent: Agent, paths: string[]): Promise<TargetPathResolution[]>
}

/** The Profile indexes project files; it never contains a second target list. */
export interface ProjectIndexEntry { root: string }
export interface ProjectIndexSettings { projects: ProjectIndexEntry[]; revision: number }
export type SaveProjectIndex = ProjectIndexSettings

export interface ManagedProjectPage {
  project: ManagedProject
  revision: number
  configured: boolean
  workspace: ManagedWorkspace
  fileRevision: string
  temporaryTargets: NamedManagedTarget[]
}
export interface SaveManagedProject {
  project: ManagedProject
  revision: number
  fileRevision: string
}
