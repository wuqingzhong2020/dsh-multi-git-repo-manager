import { MULTI_GIT_REPO_MANAGER_SERVICE_NAME } from './service-names.ts'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import type { NamedManagedTarget, TargetPathResolution, TargetDiscovery, ReviewProject, NamedReviewRepository, ReviewProjectPage, ReviewWorkspace, SaveReviewProject } from './repository-types.ts'
import { PACKAGE_NAME, REPOSITORY_INVOCATIONS } from './typert-descriptors.ts'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespaceMap {
    [MULTI_GIT_REPO_MANAGER_SERVICE_NAME]: {
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
    'multiGitRepoManagerByWqz/setTemporaryTargets': (agentId: SessionId, entries: NamedManagedTarget[]) => Promise<RemoteResult<ReviewWorkspace>>
    'multiGitRepoManagerByWqz/resolveTargetPaths': (agentId: SessionId, paths: string[]) => Promise<RemoteResult<TargetPathResolution[]>>
    'multiGitRepoManagerByWqz/discoverTargets': (agentId: SessionId, project: ReviewProject) => Promise<RemoteResult<TargetDiscovery>>
    'multiGitRepoManagerByWqz/directoryStart': (agentId: SessionId, path: string) => Promise<RemoteResult<string>>
    'multiGitRepoManagerByWqz/project': (agentId: SessionId) => Promise<RemoteResult<ReviewProjectPage>>
    'multiGitRepoManagerByWqz/saveProject': (agentId: SessionId, request: SaveReviewProject) => Promise<RemoteResult<ReviewProjectPage>>
    'multiGitRepoManagerByWqz/setTemporaryRepositories': (agentId: SessionId, entries: NamedReviewRepository[]) => Promise<RemoteResult<ReviewWorkspace>>
    'multiGitRepoManagerByWqz/workspace': (agentId: SessionId) => Promise<RemoteResult<ReviewWorkspace>>
  }
  interface TypertRemoteScopeMap {
    'agent:multiGitRepoManagerByWqz/setTemporaryTargets': (entries: NamedManagedTarget[]) => Promise<RemoteResult<ReviewWorkspace>>
    'agent:multiGitRepoManagerByWqz/resolveTargetPaths': (paths: string[]) => Promise<RemoteResult<TargetPathResolution[]>>
    'agent:multiGitRepoManagerByWqz/discoverTargets': (project: ReviewProject) => Promise<RemoteResult<TargetDiscovery>>
    'agent:multiGitRepoManagerByWqz/directoryStart': (path: string) => Promise<RemoteResult<string>>
    'agent:multiGitRepoManagerByWqz/project': () => Promise<RemoteResult<ReviewProjectPage>>
    'agent:multiGitRepoManagerByWqz/saveProject': (request: SaveReviewProject) => Promise<RemoteResult<ReviewProjectPage>>
    'agent:multiGitRepoManagerByWqz/setTemporaryRepositories': (entries: NamedReviewRepository[]) => Promise<RemoteResult<ReviewWorkspace>>
    'agent:multiGitRepoManagerByWqz/workspace': () => Promise<RemoteResult<ReviewWorkspace>>
  }
}


export const TYPERT_REMOTE: TypertRemoteContribution = { package: PACKAGE_NAME, descriptors: REPOSITORY_INVOCATIONS }
export default TYPERT_REMOTE

export { MULTI_GIT_REPO_MANAGER_SERVICE_NAME, MULTI_GIT_REPO_MANAGER_REMOTE_NAMESPACE } from './service-names.ts'
