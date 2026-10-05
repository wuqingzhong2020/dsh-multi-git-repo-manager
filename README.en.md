# dsh-multi-git-repo-manager

[简体中文](README.md) | [English](README.en.md)

Version: **v0.1.3**.

The Host service and Remote namespace are `multiGitRepoManagerByWqz`; the paired review service is `multiGitFileReviewByWqz`. Consumers can import identities from `dsh-multi-git-repo-manager/service-names`. Upgrade the paired review plugin together; project files and Profile settings remain compatible.

**Shared Git repository and ordinary directory management for DeepSeek Harness plugins.** Extracted from [dsh-file-review-tab-Multi-git-repository](https://github.com/wuqingzhong2020/dsh-file-review-tab-Multi-git-repository), it provides the native right-sidebar **Multi-repository management** tab. Other plugins can share project configuration, target discovery and file ownership through the `multiGitRepoManagerByWqz` service.

The manager runs independently. File Review **v0.3.4** requires exactly **0.1.3** of this plugin; install and enable both for review. Diffs, comments, confirmation and undo/reapply belong to the consumer. The extraction has not changed `D:\projectZJGG\ref\dsh-file-review`.

## User documentation

Start with the [English user guide](docs/USER_GUIDE.en.md) or [Chinese guide](docs/USER_GUIDE.md) for tab entry points, target types, discovery, save/reload, temporary targets and troubleshooting. The guides include an actual Desktop screenshot.

![Multi-repository management in actual Desktop](docs/image/manager-after-restart.png)

Open the right sidebar in a project conversation and choose **Multi-repository management** on the Start page. The new-tab **+** button also opens a Start page. Native tabs support switching, split panes and full screen; hidden tabs retain unsaved forms. The old conversation-header management tab has been removed. The manager currently has no separate User guide button; open its manual from this README.

## Developer documentation

Read [architecture and integration](docs/ARCHITECTURE.md) and the [managed-target model](docs/MANAGED_TARGETS.en.md) before extending the plugin. They describe Host/Client boundaries, v1/v2 migration, target states and authoritative file admission.

Maintainers should also read the [release and marketplace guide](docs/RELEASING.md). See [version history](docs/releases/version.md), [ordinary-directory validation](docs/NON_GIT_VERIFICATION.md) and [earlier Desktop checks](docs/DESKTOP_VERIFICATION.md) for evidence and limits. The architecture, release and validation records are currently in Chinese.

## Features

- **Typed targets:** add, name, edit and remove Git repositories and ordinary directories, with separate Git/directory/unavailable counts. Removing an entry does not remove files.
- **Native sidebar tab:** use the host's tab, title and body slots; switching or hiding tabs preserves the form. Container-based layout adapts to narrow panes.
- **Project configuration:** enable/disable multi-target scope, optionally include the project root, and save internal targets in `dsh-file-review-repositories.json`. Conversations in subdirectories discover the nearest project file.
- **v1/v2 compatibility:** existing Git-only v1 files continue to work. The first save using directories or discovery containers writes v2 and preserves the original v1 bytes in `.v1.bak`.
- **Direct-child discovery:** configure containers such as `project` and `project/plugins`. Discovery returns candidates; explicitly add and save them to manage them. Containers do not become targets automatically.
- **Type and availability checks:** recognize independent Git roots and worktree `.git` files. Ordinary directories without their own Git metadata are ready; missing paths, damaged metadata and kind mismatches retain diagnostics.
- **Session-only external targets:** external Git repositories and ordinary directories use absolute paths and stay out of project JSON. Agent disposal, plugin unloading and process restart release them.
- **Authoritative ownership:** the deepest target wins; unavailable children, unknown nested repositories and unmanaged components block parent fallback. Real-path checks cover escaping links, Git metadata and files not yet created.
- **Legacy import:** parse old JSON, INI and `.gitmodules` lists and match Profile indexes for explicit migration. Legacy indexes alone do not enable extra scope.
- **Atomic save and notifications:** bind saves to the current project and file revision. Shared events connect independent browser bundles so consumers can reload their workspace.
- **Language and directory selection:** follow the host's Chinese/English setting and preserve user text. Use the host directory picker and convert internal selections to relative paths.

## Installation

The declared target is **DSH >=0.2.0**, with **0.2.0-rc.2** supported as a test channel. Actual validation used Windows Desktop 0.2.0-rc.2 at `D:\app\DeepSeekHarnessDesktop\DeepSeek Harness.exe`. Stable/newer hosts, the complete Web host and other platforms have not completed real-host validation.

Local builds produce `dist/dsh-multi-git-repo-manager-0.1.3.tgz` and its `.sha256`. Public download URLs require the matching asset to be uploaded to [GitHub Releases](https://github.com/wuqingzhong2020/dsh-multi-git-repo-manager/releases) first. Existing validation records describe local delivery, rather than confirming a public release.

### DeepSeek Harness Desktop

Fully exit Desktop, including the tray process, then install the local package in PowerShell. Replace the example download path:

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\desktop" add "D:\Downloads\dsh-multi-git-repo-manager-0.1.3.tgz"
```

For the matching review consumer, install both archives together:

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\desktop" add "D:\Downloads\dsh-multi-git-repo-manager-0.1.3.tgz" "D:\Downloads\dsh-file-review-tab-multi-git-repository-0.3.4.tgz"
```

Restart, confirm the required plugins are enabled on the Plugins page, and open management from the right-sidebar Start page. **Installation and enablement are separate:** DSH 0.2 loads only selected `dsh.profile.bundles`. An npm dependency does not select its plugin. The manager may run alone; review requires both plugins.

For a new build with the same version, copy the tgz to a filename containing its SHA256 prefix before installation. pnpm may reuse an archive at the same path. Verify installed Host/Client hashes against the build; a displayed version alone does not identify the latest build.

### Standalone Web Profile

From the manager repository, install an existing local archive:

```sh
dsh plugin --profile web add ./dist/dsh-multi-git-repo-manager-0.1.3.tgz
```

After the public release and matching asset exist:

```sh
dsh plugin --profile web add https://github.com/wuqingzhong2020/dsh-multi-git-repo-manager/releases/download/v0.1.3/dsh-multi-git-repo-manager-0.1.3.tgz
```

Install and enable the consumer too if needed. Restart `dsh web` when hot reload is unavailable. Prebuilt tgz is the current default; see the [release guide](docs/RELEASING.md) for source-install requirements concerning `lib/`. Full Web operation remains unverified.

### Desktop picker starting-directory adapter

Desktop 0.2.0-rc.2 does not accept a starting path through its original directory picker. To add that behavior, fully exit Desktop and run this package's compatibility script, adjusting the host path if necessary:

```powershell
node "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-multi-git-repo-manager\scripts\patch-desktop-directory-picker.mjs" "D:\app\DeepSeekHarnessDesktop\resources\app.asar"
```

The script retains source/window validation, creates an adjacent `app.asar.dsh-directory-picker-*.bak`, recognizes an existing adaptation, and stops for an unsupported host build. Installing the tgz never patches Desktop automatically. Recheck after host updates. The manager owns this adapter; the consumer keeps a compatibility forwarding entry.

## Project configuration

1. Open a project conversation and choose management from the right-sidebar Start page. The project root and name come from the session and are read-only.
2. Select **Add repository**, choose **Git** or **Non-Git directory**, enter a name/path or use **Open** to choose a folder. The same button adds both kinds.
3. Set project enablement and root inclusion. Choose **Generate new configuration file** for a new project or **Save configuration** for an existing file.
4. Inspect target counts, sources and states. After editing JSON on disk, choose **Reload saved configuration**; reloading replaces the current form with saved content.

An included project root is classified using its own metadata. A non-Git root becomes an ordinary directory, while independent Git children remain separate, more specific targets. Disable root inclusion when only listed targets should be managed.

### Configuration example and migration

Keep the existing filename **`dsh-file-review-repositories.json`**. A v2 project with directories and discovery:

```json
{
  "version": 2,
  "enabled": true,
  "includeProjectRoot": false,
  "repositories": [{ "name": "Core", "path": "core" }],
  "directories": [
    { "name": "LocalComponent", "path": "project/LocalComponent" },
    { "name": "LocalPlugin", "path": "project/plugins/LocalPlugin" }
  ],
  "discovery": { "containers": ["project", "project/plugins"] }
}
```

Git entries use `repositories`; ordinary entries use `directories`. The file location determines the project root, which is not persisted as an absolute machine path. Git-only v1 files remain usable. First saving directories or discovery upgrades to v2 and preserves the original bytes in `.v1.bak`; an existing backup is not overwritten. Upgraded files remain v2. Unknown fields, future versions and stale file revisions prevent overwriting.

### Discovery and temporary targets

Enter one internal container path per line, choose **Preview discovery**, then **Add to list** for individual candidates and save. Only direct children are inspected; nested containers are excluded as candidates, and containers do not become targets automatically.

Internal targets persist as relative paths. External targets—including sibling/parent directories, other volumes and escaping junctions—require explicit session-only absolute entries and never enter JSON. Generate the project file before adding temporary targets. Removing an entry changes configuration or session references; this plugin performs no clone, pull, Git initialization or source deletion.

Limits: **1 MiB project file, 512 targets, 32 discovery containers**. See the [user guide](docs/USER_GUIDE.en.md) for states, path rules and troubleshooting.

## Consumer API

Pin the required shared peer so the host supplies a single plugin instance:

```json
{ "peerDependencies": { "dsh-multi-git-repo-manager": "0.1.3" } }
```

Inject the Cordis service on the Host:

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from 'dsh-multi-git-repo-manager'

export const inject = ['multiGitRepoManagerByWqz']
export function apply(ctx: Context) {
  const workspaceFor = (agent: Agent) => ctx.multiGitRepoManagerByWqz.workspace(agent)
  const managedFile = async (agent: Agent, path: string) => {
    const [result] = await ctx.multiGitRepoManagerByWqz.resolveTargetPaths(agent, [path])
    if (result?.state !== 'managed') throw new Error(result?.reason ?? 'File has no managed owner')
    return result
  }
  // Integrate these into your service; revalidate before actual file operations.
}
```

`workspace.targets` combines Git and ordinary targets; `repositories` is the compatible Git projection. `roots` describes coarse scope and does not authorize file operations. Resolve concrete files through `resolveTargetPaths` and require `managed` before reading, navigation or writes. Git functionality requires a ready target with `capabilities.git`.

The browser uses `sessions.scope(sessionId)?.get('remote.multiGitRepoManagerByWqz')`. Check `RemoteResult.ok` before reading `value` or `error.message`. The scope already binds the Agent; these calls do not take a caller-selected Agent or trusted project root:

| Call | Purpose |
| --- | --- |
| `workspace()` | Effective targets, boundaries and workspace revision |
| `project()` | Form configuration, file revision and temporary targets |
| `saveProject(request)` | Save `project`, `revision`, `fileRevision`; return the updated page |
| `discoverTargets(project)` | Preview the current project's draft containers without enabling candidates |
| `resolveTargetPaths(paths)` | Resolve ownership of up to 4096 concrete input paths |
| `setTemporaryTargets(entries)` | Replace this session's external `name`/`path`/`kind` target collection |
| `setTemporaryRepositories(entries)` | Legacy Git-only update that retains existing ordinary temporary targets |
| `directoryStart(path)` | Resolve the picker starting directory for the current project |

| Public entry | Purpose |
| --- | --- |
| Package root | Service, plugin exports and Host configuration/path tools |
| `/types` | Typed targets and ownership results, with compatible `Review*` names |
| `/workspace`, `/project-file`, `/schemas`, `/settings` | Resolution, persistence, validation and Profile settings |
| `/paths` | Browser display paths; does not replace Host admission |
| `/events` | Cross-bundle change notifications and subscriptions |
| `/service-names` | Shared Host service and session Remote identities without runtime dependencies |
| `/settings-model`, `/directory-picker`, `/directory` | Draft conversion, browser picker and Host starting-path validation |
| `/remote`, `/typert` | DSH remote declarations and protocol |

Bundle pure `/paths` and `/events` tools as needed and fetch a new workspace after notifications. They do not use Node filesystems. Events connect independent bundles and are not a filesystem watcher. The manager owns the service, Remote namespace and management tab; consumers register their own business UI. See [integration rules](docs/MANAGED_TARGETS.en.md).

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Installed but no management entry | Enable the plugin in the active Profile, use a project conversation and the right Start page; restart and verify Host/Client hashes |
| Preview exists but multi-target review is inactive | Generate and enable the project file; legacy indexes and discovery candidates are previews |
| A component inside a parent Git root is classified as ordinary | Classification uses its own metadata; choose ordinary directory if it has no independent repository |
| Kind mismatch | Check for new Git metadata, explicitly change the declared kind and save |
| Stale-save error | Preserve needed draft edits, reload, merge changes and save against the new revision |
| External path absent from JSON | It is session-only; only internal targets persist with the project |
| Manual JSON edit did not refresh consumers | Notifications are not a filesystem watcher; reload configuration |

In File Review, **All non-Git directories** selects the aggregate; `Name (Non-Git directory)` selects one target. These entries are different filters. The consumer determines supported review behavior; the manager itself provides neither Git diffs nor a baseline for manual edits.

## Development and validation

Use Node.js 24 and pnpm; build the manager before the consumer:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
pnpm test:pack
```

Tests use source files and compiled `lib/`; build after functionality changes. Git integration tests need `git` on PATH, and link tests need writable temporary directories supporting directory links. Tests use temporary projects. `test:pack` checks exports, internal modules and archive contents and generates SHA256.

The consumer's local pnpm override links version 0.1.3 to the adjacent manager repository. Published dependencies remain pinned. Ship the manager before the dependent package; the manager never imports a review consumer.

Recorded validation passed **49 manager Node tests**, **172 consumer Node tests**, **8 browser tests** and isolated package installation. Actual Desktop checks covered directory discovery, v2 save/backup, review scope switching and normal exit/restart. Mixed tool turns and other listed cases are covered by automated tests, rather than a full manual real-host run. See [validation details](docs/NON_GIT_VERIFICATION.md).

## Public release and marketplace

Use the GitHub source repository and prebuilt Release archives; npm publication is optional. Source pushes, Release uploads and marketplace entries are separate steps. After preparing installable artifacts, follow the community's current [contribution guide](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md).

The repository includes a [release guide](docs/RELEASING.md), [v0.1.3 notes](docs/releases/version.md#v012) and [marketplace YAML template](docs/market/wuqingzhong2020__dsh-multi-git-repo-manager.yml). These maintenance documents do not establish that publication or listing has occurred.

## Credits

Management code was extracted from this author's [multi-repository review plugin](https://github.com/wuqingzhong2020/dsh-file-review-tab-Multi-git-repository). This plugin uses DSH Cordis, Typert and native sidebar interfaces; review behavior stays in its consumers.

## License

[MIT](LICENSE)
