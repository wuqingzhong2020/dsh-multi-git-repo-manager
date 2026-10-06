import { MULTI_GIT_REPO_MANAGER_SERVICE_NAME } from './service-names.ts'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import type { NamedManagedTarget, TargetPathResolution, TargetDiscovery, ManagedProject, ManagedProjectPage, ManagedWorkspace, SaveManagedProject } from './repository-types.ts'
import { PACKAGE_NAME, REPOSITORY_INVOCATIONS } from './typert-descriptors.ts'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespaceMap {
    [MULTI_GIT_REPO_MANAGER_SERVICE_NAME]: {
      setTemporaryTargets: (agentId: SessionId, entries: NamedManagedTarget[]) => Promise<RemoteResult<ManagedWorkspace>>
      resolveTargetPaths: (agentId: SessionId, paths: string[]) => Promise<RemoteResult<TargetPathResolution[]>>
      discoverTargets: (agentId: SessionId, project: ManagedProject) => Promise<RemoteResult<TargetDiscovery>>
      directoryStart: (agentId: SessionId, path: string) => Promise<RemoteResult<string>>
      project: (agentId: SessionId) => Promise<RemoteResult<ManagedProjectPage>>
      saveProject: (agentId: SessionId, request: SaveManagedProject) => Promise<RemoteResult<ManagedProjectPage>>
      workspace: (agentId: SessionId) => Promise<RemoteResult<ManagedWorkspace>>
    }
  }
  interface TypertRemoteMap {
    'multiGitRepoManagerByWqz/setTemporaryTargets': (agentId: SessionId, entries: NamedManagedTarget[]) => Promise<RemoteResult<ManagedWorkspace>>
    'multiGitRepoManagerByWqz/resolveTargetPaths': (agentId: SessionId, paths: string[]) => Promise<RemoteResult<TargetPathResolution[]>>
    'multiGitRepoManagerByWqz/discoverTargets': (agentId: SessionId, project: ManagedProject) => Promise<RemoteResult<TargetDiscovery>>
    'multiGitRepoManagerByWqz/directoryStart': (agentId: SessionId, path: string) => Promise<RemoteResult<string>>
    'multiGitRepoManagerByWqz/project': (agentId: SessionId) => Promise<RemoteResult<ManagedProjectPage>>
    'multiGitRepoManagerByWqz/saveProject': (agentId: SessionId, request: SaveManagedProject) => Promise<RemoteResult<ManagedProjectPage>>
    'multiGitRepoManagerByWqz/workspace': (agentId: SessionId) => Promise<RemoteResult<ManagedWorkspace>>
  }
  interface TypertRemoteScopeMap {
    'agent:multiGitRepoManagerByWqz/setTemporaryTargets': (entries: NamedManagedTarget[]) => Promise<RemoteResult<ManagedWorkspace>>
    'agent:multiGitRepoManagerByWqz/resolveTargetPaths': (paths: string[]) => Promise<RemoteResult<TargetPathResolution[]>>
    'agent:multiGitRepoManagerByWqz/discoverTargets': (project: ManagedProject) => Promise<RemoteResult<TargetDiscovery>>
    'agent:multiGitRepoManagerByWqz/directoryStart': (path: string) => Promise<RemoteResult<string>>
    'agent:multiGitRepoManagerByWqz/project': () => Promise<RemoteResult<ManagedProjectPage>>
    'agent:multiGitRepoManagerByWqz/saveProject': (request: SaveManagedProject) => Promise<RemoteResult<ManagedProjectPage>>
    'agent:multiGitRepoManagerByWqz/workspace': () => Promise<RemoteResult<ManagedWorkspace>>
  }
}


export const TYPERT_REMOTE: TypertRemoteContribution = { package: PACKAGE_NAME, descriptors: REPOSITORY_INVOCATIONS }
export default TYPERT_REMOTE

export { MULTI_GIT_REPO_MANAGER_SERVICE_NAME, MULTI_GIT_REPO_MANAGER_REMOTE_NAMESPACE } from './service-names.ts'
