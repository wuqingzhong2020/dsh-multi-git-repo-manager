# Multi-repository management user guide

[简体中文](USER_GUIDE.md) | [English](USER_GUIDE.en.md)

For manager **0.1.4**, based on the current implementation and actual Windows Desktop 0.2.0-rc.2. See [installation](../README.en.md#installation); review functionality comes from a separate consumer.

## 1. Enable and open

Install and enable the manager on the Desktop Plugins page. For File Review, also install and enable consumer 0.3.5, which requires manager 0.1.4. The active Profile must select the required bundles.

Open a project conversation, show the right sidebar and select **Multi-repository management** on its Start page. The **+** new-tab button provides the same entry. Native tabs support split panes and full screen; management no longer appears in the conversation header.

The session supplies the read-only project directory, name and configuration filename. Switching hidden tabs retains unsaved forms. Confirm the project before generating, saving or reloading configuration.

![Actual Desktop target editor and counts after restart](image/manager-after-restart.png)

This screenshot uses a Chinese host and an isolated fixture with one Git repository and two ordinary directories after save and normal restart. See [validation limits](#9-validation-limits).

## 2. Add a target

1. Choose **Add repository**; this button adds either kind of target.
2. Select **Git** or **Non-Git directory** and enter a name.
3. Enter a path or use the row's **Open** button. Internal paths are relative to the project; external paths are absolute.
4. Enable multi-repository management and optionally include the project root.
5. Choose **Generate new configuration file** initially, or **Save configuration**, then inspect counts, sources and states.

Git means an independent root, including a valid worktree. A component inside a parent Git repository may be an ordinary directory if it has no Git metadata of its own. Parent ignore rules do not determine its kind.

The included project root is classified using its own metadata. A non-Git `dsh-plugins` root is an ordinary target; independent Git children remain separate targets. Disable root inclusion to manage only listed targets.

## 3. Discover children

Enter one internal container per line, for example:

```text
project
project/plugins
```

Choose **Preview discovery**. Only immediate children are inspected, without reading source or running project commands. Already managed paths and nested containers are not duplicate candidates; unavailable containers produce diagnostics.

Choose **Add to list** for each desired ready candidate and save. Discovery results are not enabled targets. A container is not added automatically; add it explicitly if its loose files should be managed.

## 4. Save and reload

The manager owns `dsh-file-review-repositories.json`; consumers read its authoritative management results.

| Field | Meaning |
| --- | --- |
| `version` | Format 2 only |
| `enabled` | Enable the project's multi-target scope |
| `includeProjectRoot` | Include the root as a target |
| `repositories` | Named Git targets with internal relative paths |
| `directories` | v2 named ordinary directory targets |
| `discovery.containers` | v2 discovery paths; candidates still require explicit addition |

Only v2 is read and saved, with no imports or format upgrades. See the [JSON example](../README.en.md#configuration-example).

The file location determines the project root. Limits are 1 MiB, 512 targets and 32 containers. Canonical duplicates are merged; the same path cannot explicitly declare both kinds.

After changing JSON on disk, **Reload saved configuration** replaces the current form. A save refuses a changed file revision: preserve needed edits, reload, merge and save again. Unknown fields, future versions and invalid paths are not silently overwritten.

The Profile stores project roots only. A valid, enabled project file is the authority for managed targets. Unconfigured or disabled projects use the current session's base scope.

## 5. External temporary targets

Generate the project file first, then add an external absolute path and its kind. Parent/sibling folders, other volumes and escaping junctions are external and cannot persist with project JSON.

Temporary entries belong only to the receiving session. Agent disposal, plugin unloading and process restart release them; closing a tab does not itself release the Agent.

Temporary edits can notify consumers immediately; internal draft changes require saving. The manager does not clone, pull, initialize Git or create a diff baseline for ordinary directories.

## 6. States and removal

| State | Meaning |
| --- | --- |
| `ready` | The declared kind matches the available target |
| `missing` | The path does not exist |
| `notGit` | A declared Git target has no own valid Git metadata |
| `kindMismatch` | A declared ordinary directory has its own Git metadata; explicitly change kind and save |
| `error` | Metadata is damaged or the directory cannot be read |

Changing kind updates the declaration and never runs `git init` or rewrites consumers' historical references. **Delete** asks for confirmation, removes the form entry, and requires saving internal changes. Disk files remain.

The deepest target wins, including unavailable targets. Unknown nested repositories, unmanaged container children, `.git` metadata and escaping links block parent fallback. Developers should use the [target ownership contract](ARCHITECTURE.md#目标与文件归属); users can repair the target and reload.

## 7. File Review integration

Saving configuration notifies consumers to fetch their workspace again. Manual JSON edits need a reload. The manager and review have separate native tabs, and the manager runs on its own.

**All Git repositories** and **All non-Git directories** are aggregate filters. `Name (Non-Git directory)` selects one target. These entries do not represent duplicate configuration.

The review consumer supports recorded Last turn, This session and Pending review changes for ordinary directories. Its five Git comparisons are disabled for them. Manual edits without a recorded baseline do not generate session diffs. Comments, file confirmation, copying and evidence-based undo belong to the review consumer.

## 8. Troubleshooting

| Problem | Action |
| --- | --- |
| Missing management entry | Enable the plugin, select a project conversation and use the right-sidebar Start page |
| Old text after installation | Fully restart; install same-version builds under a new digest filename and verify Client hashes |
| Picker ignores the current path | Check starting-path support; the 0.2.0-rc.2 adapter and backup instructions are in the README |
| Preview exists but extra targets are inactive | Generate, save and enable the file; previews do not authorize extra scope |
| Target becomes unavailable after changing kind | Check actual metadata and paths, then save and reload |
| External targets disappear after restart | Add them explicitly again; they are session-only |
| Another project shows different entries | Each session resolves its own project file and temporary targets |

## 9. Validation limits

Current regression covers v2 configuration, complete contracts, session isolation, admission, paired installation and browser UI. See [version notes](releases/version.md#v014) for actual Desktop results. Full Web, stable hosts and other platforms remain unverified.
