# Managed Git repositories and ordinary directories

Version 0.1.2 separates classification (`managed-target.ts`), direct-child discovery (`target-discovery.ts`), file admission (`target-ownership.ts`) and portable persistence (`repository-project-file.ts`). The Host service owns session identity and temporary targets. Consumers own their business capabilities.

Keep `dsh-file-review-repositories.json`. Version 1 remains readable and writable for Git-only projects. Adding ordinary directories or discovery containers writes version 2 with `directories: [{name, path}]` and optional `discovery: {containers: [path]}`. The exact original v1 bytes are backed up once as `.v1.bak`. Upgraded files stay at v2; stale revisions, unknown fields and future versions cannot be overwritten.

Internal canonical paths stay relative. External paths, other drives and escaping junctions require explicit session-only targets and never enter portable JSON. Limits are 1 MiB, 512 targets and 32 discovery containers. Removing entries never deletes directories.

Target kind (`git` or `directory`) is separate from availability. A valid ordinary directory is ready. A Git declaration losing its own metadata stays notGit; a directory acquiring Git metadata becomes kindMismatch until explicitly converted. Broken markers remain errors. Classification does not require a Git executable.

`workspace(agent)` returns targets, discovery boundaries and a revision, while repositories remains the Git-only compatibility projection. Roots alone cannot authorize operations. Call `resolveTargetPaths(agent, paths)` for managed/unmanaged/unavailable/outside/metadata/error admission and use the returned concrete owner only when managed. The most specific target wins, including unavailable targets. Unknown discovery children and undisclosed nested Git roots block parent fallback.

`discoverTargets(agent, project)` previews immediate children only, reads metadata rather than source, and never expands scope by itself. Add selected candidates and save. Containers do not become automatic targets; loose container files require explicitly managing that container.

`setTemporaryTargets(agent, entries)` accepts external absolute paths with explicit kinds, isolates sessions and releases entries on agent disposal or plugin unload. The old Git-only setter remains compatible. IDs derive from project and real directory identity; renames and conversions must not rewrite consumer history or comments.
