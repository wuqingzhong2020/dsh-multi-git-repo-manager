import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import type { NamedManagedTarget, TargetPathResolution, TargetDiscovery, ReviewProject, NamedReviewRepository, ReviewProjectPage, ReviewWorkspace, SaveReviewProject } from './repository-types.ts'
import { PACKAGE_NAME, REPOSITORY_INVOCATIONS } from './typert-descriptors.ts'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespaceMap {
    multiGitRepoManager: {
      setTemporaryTargets: (agentId: SessionId, entries: NamedManagedTarget[]) => Promise<RemoteResult<ReviewWorkspace>>
      resolveTargetPaths: (agentId: SessionId, paths: string[]) => Promise<RemoteResult<TargetPathResolution[]>>
      discoverTargets: (agentId: SessionId, project: ReviewProject) => Promise<RemoteResult<TargetDiscovery>>
      directoryStart: (agentId: SessionId, path: string) => Promise<RemoteResult<string>>
      project: (agentId: SessionId) => Promise<RemoteResult<ReviewProjectPage>>
      saveProject: (agentId: SessionId, request: SaveReviewProject) => Promise<RemoteResult<ReviewProjectPage>>
      setTemporaryRepositories: (agentId: SessionId, entries: NamedReviewRepository[]) => Promise<RemoteResult<ReviewWorkspace>>
      workspace: (agentId: SessionId) => Promise<RemoteResult<ReviewWorkspace>>
    }
  }
  interface TypertRemoteMap {
    'multiGitRepoManager/setTemporaryTargets': (agentId: SessionId, entries: NamedManagedTarget[]) => Promise<RemoteResult<ReviewWorkspace>>
    'multiGitRepoManager/resolveTargetPaths': (agentId: SessionId, paths: string[]) => Promise<RemoteResult<TargetPathResolution[]>>
    'multiGitRepoManager/discoverTargets': (agentId: SessionId, project: ReviewProject) => Promise<RemoteResult<TargetDiscovery>>
    'multiGitRepoManager/directoryStart': (agentId: SessionId, path: string) => Promise<RemoteResult<string>>
    'multiGitRepoManager/project': (agentId: SessionId) => Promise<RemoteResult<ReviewProjectPage>>
    'multiGitRepoManager/saveProject': (agentId: SessionId, request: SaveReviewProject) => Promise<RemoteResult<ReviewProjectPage>>
    'multiGitRepoManager/setTemporaryRepositories': (agentId: SessionId, entries: NamedReviewRepository[]) => Promise<RemoteResult<ReviewWorkspace>>
    'multiGitRepoManager/workspace': (agentId: SessionId) => Promise<RemoteResult<ReviewWorkspace>>
  }
  interface TypertRemoteScopeMap {
    'agent:multiGitRepoManager/setTemporaryTargets': (entries: NamedManagedTarget[]) => Promise<RemoteResult<ReviewWorkspace>>
    'agent:multiGitRepoManager/resolveTargetPaths': (paths: string[]) => Promise<RemoteResult<TargetPathResolution[]>>
    'agent:multiGitRepoManager/discoverTargets': (project: ReviewProject) => Promise<RemoteResult<TargetDiscovery>>
    'agent:multiGitRepoManager/directoryStart': (path: string) => Promise<RemoteResult<string>>
    'agent:multiGitRepoManager/project': () => Promise<RemoteResult<ReviewProjectPage>>
    'agent:multiGitRepoManager/saveProject': (request: SaveReviewProject) => Promise<RemoteResult<ReviewProjectPage>>
    'agent:multiGitRepoManager/setTemporaryRepositories': (entries: NamedReviewRepository[]) => Promise<RemoteResult<ReviewWorkspace>>
    'agent:multiGitRepoManager/workspace': () => Promise<RemoteResult<ReviewWorkspace>>
  }
}


export const TYPERT_REMOTE: TypertRemoteContribution = { package: PACKAGE_NAME, descriptors: REPOSITORY_INVOCATIONS }
export default TYPERT_REMOTE
