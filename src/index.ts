import type { Context } from '@deepseek-ai/cordis'
import type { MultiGitRepoManagerConfig } from './repository-config.ts'
import { RepositorySettings } from './repository-settings.ts'
import { MultiGitRepoManager } from './multi-git-repo-manager.ts'
import { reviewProjectSchema } from './repository-schemas.ts'

export type * from './repository-types.ts'
export type { MultiGitRepoManagerConfig } from './repository-config.ts'
export { Config } from './repository-config.ts'
export { MultiGitRepoManager, sessionCwd, type ProjectSettingsStore } from './multi-git-repo-manager.ts'
export { RepositorySettings } from './repository-settings.ts'
export { pathKey, previewProject, resolveReviewWorkspace, inside, parseRepositoryManifest } from './repository-workspace.ts'
export { PROJECT_FILE_NAME, readProjectFile, writeProjectFile, findProjectFile } from './repository-project-file.ts'
export { canonicalRepositoryPath, projectRepositoryPath } from './repository-path-policy.ts'
export { resolveDirectoryStart } from './repository-directory.ts'
export { resolveTargetPaths } from './target-ownership.ts'
export { discoverTargets } from './target-discovery.ts'
export { inspectTarget, hasOwnGit } from './managed-target.ts'

export const inject = []
export function apply(ctx: Context, config: MultiGitRepoManagerConfig): void {
  const projects = Array.isArray(config?.projects) ? config.projects : config?.projects?.get() ?? []
  new MultiGitRepoManager(ctx, new RepositorySettings(ctx, reviewProjectSchema.array().parse(projects)))
}

export * from './service-names.ts'
