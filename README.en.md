# dsh-multi-git-repo-manager

Git repositories and non-Git directories share typed targets, direct-child discovery and authoritative file admission. See [managed targets](docs/MANAGED_TARGETS.en.md) for v1/v2 migration and consumer APIs.

See the [validation record](docs/NON_GIT_VERIFICATION.md) for automated checks, isolated package installation and actual Windows Desktop checks, including their limits.

[简体中文](README.md) | [English](README.en.md)

Version: **v0.1.2**. Shared multi-Git-repository management for DeepSeek Harness plugins.

Extracted from `dsh-file-review-tab-Multi-git-repository`, this plugin independently owns the native right-sidebar **Multi-repository management** tab, project configuration, repository discovery, directory selection, and session-only external repositories. Consumers use the shared `multiGitRepoManager` Host service and `remote.multiGitRepoManager` browser namespace.

Open the right sidebar in a project conversation and select **Multi-repository management** on the Start page, including the page shown by the new-tab button. It uses the same native tab system as File Review, with tab switching, split panes, full screen, and unsaved drafts preserved when hidden. The former conversation-header management tab has been removed.

The editor supports adding, editing, removing, reloading, saving, enable/disable, root inclusion, Git availability previews, and Chinese/English copy. Paths inside the project stay relative; external repositories stay in the receiving session. Canonical paths, project identity, stale-save checks, atomic writes, nested repository ownership, and repository deduplication preserve the original scope rules.

## Installation

Build and install `dist/dsh-multi-git-repo-manager-0.1.2.tgz` through the Desktop plugin page. Enable this plugin and, for file review, the updated `dsh-file-review-tab-multi-git-repository` plugin.

DSH 0.2 loads only the plugins selected in `dsh.profile.bundles`. Installing an npm dependency does not select its plugin. Select both plugins in the Profile; the manager also runs independently of file review.

The version-1/version-2 project file remains **`dsh-file-review-repositories.json`** for compatibility. Existing files need no renaming. The consumer imports its previous Profile index; subsequent saves update the manager's own settings namespace. The Desktop starting-directory adapter now lives in this package; installing the plugin does not patch Desktop automatically. `D:\projectZJGG\ref\dsh-file-review` has not been migrated.

## Consumer API

Pin `"dsh-multi-git-repo-manager": "0.1.2"` in required peerDependencies so the host provides one shared plugin instance. Import its types and declare `inject = ['multiGitRepoManager']`; call `ctx.multiGitRepoManager.workspace(agent)` to obtain the authoritative workspace for that agent.

The browser uses `sessions.scope(sessionId)?.get('remote.multiGitRepoManager')`. Methods: `workspace()`, `project()`, `saveProject(request)`, `setTemporaryTargets(entries)`, `resolveTargetPaths(paths)`, `discoverTargets(project)`, and `directoryStart(path)`; `setTemporaryRepositories(entries)` remains a Git-only compatibility method. Unwrap `RemoteResult` by checking `ok`. The manager mounts this namespace and registers the management tab; consumers should not register them again.

Public subpaths include `/types`, `/workspace`, `/project-file`, `/schemas`, `/settings`, `/paths`, `/events`, `/settings-model`, `/directory-picker`, `/directory`, `/remote`, and `/typert`. Neutral type aliases such as `RepositoryProject` and `RepositoryWorkspace` coexist with compatible `Review*` names. Bundle browser-only `/paths` and `/events` helpers as needed; `subscribeRepositories` receives saves across independent plugin bundles. This event is not a filesystem watcher.

## Development

Use Node.js 24 and pnpm. Run `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm test`, and `pnpm test:pack`. Build the manager before its consumer. The consumer's local pnpm override points to this adjacent repository; published dependencies remain pinned to `0.1.2`.

Ship the manager before the dependent review package. See [architecture and release notes](docs/ARCHITECTURE.md) and the [Chinese README](README.md) for details.
