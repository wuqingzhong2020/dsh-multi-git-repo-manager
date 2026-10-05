/** Shared Host and Remote identities; keep this module free of runtime dependencies. */
export const MULTI_GIT_REPO_MANAGER_SERVICE_NAME = 'multiGitRepoManagerByWqz' as const
export const MULTI_GIT_REPO_MANAGER_REMOTE_NAMESPACE = `remote.${MULTI_GIT_REPO_MANAGER_SERVICE_NAME}` as const
