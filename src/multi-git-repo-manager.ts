import { MULTI_GIT_REPO_MANAGER_SERVICE_NAME } from './service-names.ts'
/** Session-scoped management; configuration and admission have one authority. */
import { createHash } from 'node:crypto'
import { realpath } from 'node:fs/promises'
import { basename, isAbsolute } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { NamedManagedTarget, TargetDiscovery, TargetPathResolution, ProjectIndexSettings, SaveProjectIndex, ManagedProject, ManagedProjectPage, ManagedWorkspace, ManagedWorkspaceReader, SaveManagedProject } from './repository-types.ts'
import { discoverTargets } from './target-discovery.ts'
import { resolveTargetPaths } from './target-ownership.ts'
import { pathKey, previewProject, resolveManagedWorkspace } from './repository-workspace.ts'
import { findProjectFile, writeProjectFile } from './repository-project-file.ts'
import { canonicalRepositoryPath } from './repository-path-policy.ts'
import { resolveDirectoryStart } from './repository-directory.ts'
import { namedManagedTargetSchema } from './repository-schemas.ts'

export interface ProjectSettingsStore {
  get(): ProjectIndexSettings
  save(request: SaveProjectIndex): Promise<ProjectIndexSettings>
}

export function sessionCwd(agent: Agent): string {
  const cwd = agent.session.header.cwd
  if (cwd === undefined || cwd.trim() === '') throw new Error('session has no workspace directory')
  return cwd
}
const agentKey = (agent: Agent) => String(agent.id)

declare module '@deepseek-ai/cordis' {
  interface Context { multiGitRepoManagerByWqz: MultiGitRepoManager }
}

export class MultiGitRepoManager extends TypertRemoteService implements ManagedWorkspaceReader {
  private readonly temporaryTargets = new Map<string, { root: string; entries: NamedManagedTarget[] }>()
  private readonly temporaryVersions = new Map<string, { id: number; cwd: string }>()
  private temporaryRequestSequence = 0
  constructor(ctx: Context, private readonly projectSettings?: ProjectSettingsStore) {
    super(ctx, MULTI_GIT_REPO_MANAGER_SERVICE_NAME)
    ctx.on('agent/disposed', ({ agent }) => { this.releaseSession(agent) })
    ctx.effect(() => () => { this.temporaryTargets.clear(); this.temporaryVersions.clear() })
  }

  private temporary(agent: Agent, root: string): NamedManagedTarget[] {
    const stored = this.temporaryTargets.get(agentKey(agent))
    if (stored && pathKey(stored.root) !== pathKey(root)) {
      const key = agentKey(agent)
      this.temporaryTargets.delete(key)
      // Preserve a new request already issued for this cwd, while invalidating old work.
      if (this.temporaryVersions.get(key)?.cwd !== sessionCwd(agent)) this.temporaryVersions.delete(key)
      return []
    }
    return stored?.entries ?? []
  }

  async project(agent: Agent): Promise<ManagedProjectPage> {
    const settings = this.projectSettings?.get() ?? { projects: [], revision: 0 }
    const root = await realpath(sessionCwd(agent))
    const localFile = await findProjectFile(root)
    const matched = await resolveManagedWorkspace(root, settings.projects)
    const project: ManagedProject = localFile?.project ?? matched.project ?? {
      name: basename(root), root, enabled: true, includeProjectRoot: true,
      repositories: [], directories: [], discovery: { containers: [] },
    }
    return {
      project, revision: settings.revision, configured: localFile !== null,
      workspace: localFile !== null && project.enabled ? await this.workspace(agent) : await previewProject(project),
      fileRevision: localFile?.revision ?? '',
      temporaryTargets: this.temporary(agent, project.root),
    }
  }

  async directoryStart(agent: Agent, path: string): Promise<string> {
    return resolveDirectoryStart((await this.project(agent)).project.root, path)
  }

  /** Wire callers cannot select a different project's configuration. */
  async preview(agent: Agent, project: ManagedProject): Promise<ManagedWorkspace> {
    const current = await this.project(agent)
    if (pathKey(await realpath(project.root)) !== pathKey(current.project.root))
      throw new Error('Project root does not belong to this session')
    return previewProject({ ...project, name: current.project.name, root: current.project.root })
  }

  async saveProject(agent: Agent, request: SaveManagedProject): Promise<ManagedProjectPage> {
    const preview = await this.preview(agent, request.project)
    const project = preview.project!
    await writeProjectFile(project, request.fileRevision)
    if (this.projectSettings !== undefined) {
      const settings = this.projectSettings.get()
      const projects = settings.projects.filter(item => pathKey(item.root) !== pathKey(project.root))
      projects.push({ root: project.root })
      // The project file remains authoritative when the optional index update fails.
      try { await this.projectSettings.save({ projects, revision: settings.revision }) }
      catch { /* Reading the nearest project file still works. */ }
    }
    return this.project(agent)
  }

  async workspace(agent: Agent): Promise<ManagedWorkspace> {
    const base = await resolveManagedWorkspace(sessionCwd(agent), this.projectSettings?.get().projects ?? [])
    // Visiting an unconfigured workspace also releases the previous project's scope.
    const temporary = this.temporary(agent, base.project?.root ?? await realpath(sessionCwd(agent)))
    if (base.project === null) return base
    if (temporary.length === 0) return base
    const extra = await previewProject({
      ...base.project, includeProjectRoot: false,
      repositories: temporary.filter(entry => entry.kind === 'git').map(({ name, path }) => ({ name, path })),
      directories: temporary.filter(entry => entry.kind === 'directory').map(({ name, path }) => ({ name, path })),
      discovery: { containers: [] },
    })
    const targets = [...base.targets]
    for (const target of extra.targets) {
      if (!targets.some(current => pathKey(current.path) === pathKey(target.path)))
        targets.push({ ...target, source: 'temporary' })
    }
    if (targets.length > 512) throw new Error('Project exceeds 512 managed targets')
    return {
      ...base, targets,
      repositories: targets.filter(target => target.kind === 'git').map(target => ({
        ...target, state: target.state === 'kindMismatch' ? 'error' as const : target.state,
      })),
      roots: targets.filter(target => target.state === 'ready').map(target => target.path),
      workspaceRevision: createHash('sha256').update(JSON.stringify([targets, base.boundaries])).digest('hex'),
    }
  }

  async setTemporaryTargets(agent: Agent, entries: NamedManagedTarget[]): Promise<ManagedWorkspace> {
    const key = agentKey(agent)
    const version = ++this.temporaryRequestSequence
    this.temporaryVersions.set(key, { id: version, cwd: sessionCwd(agent) })
    const current = await this.project(agent)
    if (!current.configured) throw new Error('Enable this project before adding temporary targets')
    const normalized: NamedManagedTarget[] = []
    for (const entry of namedManagedTargetSchema.array().max(512).parse(entries)) {
      const path = await canonicalRepositoryPath(current.project.root, entry.path)
      if (!isAbsolute(entry.path) || !isAbsolute(path))
        throw new Error('Temporary targets must use absolute paths outside the project')
      normalized.push({ ...entry, path })
    }
    // Normalization can finish out of order. A released or superseded request cannot publish.
    if (this.temporaryVersions.get(key)?.id !== version) return this.workspace(agent)
    const previous = this.temporaryTargets.get(key)
    this.temporaryTargets.set(key, { root: current.project.root, entries: normalized })
    try { return await this.workspace(agent) }
    catch (error) {
      if (this.temporaryVersions.get(key)?.id === version) {
        if (previous) this.temporaryTargets.set(key, previous)
        else this.temporaryTargets.delete(key)
      }
      throw error
    }
  }

  async resolveTargetPaths(agent: Agent, paths: string[]): Promise<TargetPathResolution[]> {
    if (paths.length > 4096) throw new Error('Path batch exceeds 4096 files')
    return resolveTargetPaths(await this.workspace(agent), sessionCwd(agent), paths)
  }

  async discoverTargets(agent: Agent, project: ManagedProject): Promise<TargetDiscovery> {
    return discoverTargets((await this.preview(agent, project)).project!)
  }

  releaseSession(agent: Agent): void {
    this.temporaryTargets.delete(agentKey(agent))
    this.temporaryVersions.delete(agentKey(agent))
  }
}
