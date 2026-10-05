import { MULTI_GIT_REPO_MANAGER_SERVICE_NAME } from './service-names.ts'
/** Shared session-scoped repository management; never executes Git mutations. */
import { realpath } from 'node:fs/promises'
import { basename, isAbsolute } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { NamedManagedTarget, TargetDiscovery, TargetPathResolution, ReviewProjectSettings, SaveReviewProjects, NamedReviewRepository, ReviewProject, ReviewProjectPage, ReviewWorkspace, SaveReviewProject } from './repository-types.ts'
import { discoverTargets } from './target-discovery.ts'
import { resolveTargetPaths } from './target-ownership.ts'
import { createHash } from 'node:crypto'
import { pathKey, previewProject, resolveReviewWorkspace } from './repository-workspace.ts'
import { findProjectFile, PROJECT_FILE_NAME, readProjectFile, writeProjectFile } from './repository-project-file.ts'
import { canonicalRepositoryPath } from './repository-path-policy.ts'
import { resolveDirectoryStart } from './repository-directory.ts'
import { reviewProjectSchema } from './repository-schemas.ts'

export interface ProjectSettingsStore {
  get(): ReviewProjectSettings
  save(request: SaveReviewProjects): Promise<ReviewProjectSettings>
  adoptLegacyProjects?(projects: ReviewProject[]): void
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

export class MultiGitRepoManager extends TypertRemoteService {
  private readonly temporaryTargets = new Map<string, NamedManagedTarget[]>()
  constructor(ctx: Context, private readonly projectSettings?: ProjectSettingsStore) {
    super(ctx, MULTI_GIT_REPO_MANAGER_SERVICE_NAME)
    ctx.on('agent/disposed', ({ agent }) => { this.releaseSession(agent) })
    ctx.effect(() => () => this.temporaryTargets.clear())
  }

  /** Import the previous consumer's Profile index without overwriting manager settings. */
  adoptLegacyProjects(projects: unknown): void {
    this.projectSettings?.adoptLegacyProjects?.(reviewProjectSchema.array().parse(projects))
  }

  /** Read only the project selected by this Agent's authoritative directory. */
  async project(agent: Agent): Promise<ReviewProjectPage> {
    const settings = this.projectSettings?.get() ?? { projects: [], revision: 0 }
    const cwd = sessionCwd(agent)
    const root = await realpath(cwd)
    const localFile = await findProjectFile(root)
    const matched = await resolveReviewWorkspace(cwd, settings.projects)
    let project: ReviewProject
    if (localFile !== null) {
      project = localFile.project
    } else if (matched.project !== null) {
      project = { ...matched.project, name: basename(matched.project.root) }
    } else {
      project = {
        name: basename(root),
        root,
        includeProjectRoot: true,
        configFiles: [],
        repositories: [],
        enabled: true,
      }
    }
    const workspace =
      localFile !== null && project.enabled !== false
        ? await this.workspace(agent)
        : await previewProject(project)
    return {
      project,
      revision: settings.revision,
      configured: localFile !== null,
      workspace,
      fileRevision: localFile?.revision ?? '',
      temporaryRepositories:
        localFile !== null
          ? (this.temporaryTargets.get(agentKey(agent))?.filter(entry => entry.kind === 'git').map(({ name, path }) => ({ name, path })) ?? localFile.temporaryRepositories)
          : [],
      temporaryTargets: this.temporaryTargets.get(agentKey(agent)) ?? localFile?.temporaryRepositories.map(entry => ({ ...entry, kind: 'git' as const })) ?? [],
    }
  }

  async directoryStart(agent: Agent, path: string): Promise<string> {
    const current = await this.project(agent)
    return resolveDirectoryStart(current.project.root, path)
  }

  /** Preview and save cannot choose another project's root through the wire. */
  async preview(agent: Agent, project: ReviewProject): Promise<ReviewWorkspace> {
    const current = await this.project(agent)
    if (pathKey(await realpath(project.root)) !== pathKey(current.project.root)) {
      throw new Error('Project root does not belong to this session')
    }
    return previewProject({ ...project, name: current.project.name, root: current.project.root })
  }

  async saveProject(agent: Agent, request: SaveReviewProject): Promise<ReviewProjectPage> {
    const preview = await this.preview(agent, {
      ...request.project,
      configFiles: [],
      repositories: [],
    })
    const project = preview.project!
    await writeProjectFile(
      {
        ...project,
        enabled: request.project.enabled ?? project.enabled ?? true,
        namedRepositories: project.namedRepositories?.filter(entry => !isAbsolute(entry.path)),
      },
      request.fileRevision,
    )
    if (this.projectSettings !== undefined) {
      const settings = this.projectSettings.get()
      const index = settings.projects.findIndex(
        item => pathKey(item.root) === pathKey(project.root),
      )
      const projects = [...settings.projects]
      const indexEntry = {
        name: project.name,
        root: project.root,
        includeProjectRoot: project.includeProjectRoot,
        configFiles: [PROJECT_FILE_NAME],
        repositories: [],
        enabled: request.project.enabled ?? project.enabled ?? true,
      }
      if (index === -1) {
        projects.push(indexEntry)
      } else {
        projects[index] = indexEntry
      }
      // The project-local file is authoritative; the profile keeps its index.
      try {
        await this.projectSettings.save({ projects, revision: settings.revision })
      } catch {
        // The local file remains usable if updating the profile index fails.
      }
    }
    return this.project(agent)
  }

  async workspace(agent: Agent): Promise<ReviewWorkspace> {
    const indexed = this.projectSettings?.get().projects ?? []
    const active: ReviewProject[] = []
    for (const project of indexed) {
      if (!project.configFiles.includes(PROJECT_FILE_NAME) || project.enabled === false) continue
      try {
        const local = await readProjectFile(project.root)
        if (local !== null && local.project.enabled !== false) active.push(local.project)
      } catch {
        // Invalid or unavailable project files never expand another session's scope.
      }
    }
    const base = await resolveReviewWorkspace(sessionCwd(agent), active)
    const temporary = this.temporaryTargets.get(agentKey(agent)) ?? []
    if (base.project === null || temporary.length === 0) return base
    const extra = await previewProject({
      name: base.project.name,
      root: base.project.root,
      includeProjectRoot: false,
      configFiles: [],
      repositories: [],
      namedRepositories: temporary.filter(entry => entry.kind === 'git'),
      directories: temporary.filter(entry => entry.kind === 'directory'),
    })
    const repositories = [...base.repositories]
    const targets = [...(base.targets ?? [])]
    for (const target of extra.targets ?? []) {
      if (!targets.some(current => pathKey(current.path) === pathKey(target.path))) targets.push({ ...target, source: 'temporary' })
    }
    if (targets.length > 512) throw new Error('Project exceeds 512 managed targets')
    const seen = new Set(repositories.map(repo => pathKey(repo.path)))
    for (const repo of extra.repositories) {
      if (seen.has(pathKey(repo.path))) continue
      seen.add(pathKey(repo.path))
      repositories.push({ ...repo, source: 'temporary' })
    }
    return {
      ...base,
      repositories,
      targets,
      workspaceRevision: createHash('sha256').update(JSON.stringify([targets, base.boundaries])).digest('hex'),
      warnings: [...base.warnings, ...extra.warnings],
      roots: [
        ...new Map([...base.roots, ...extra.roots].map(root => [pathKey(root), root])).values(),
      ],
    }
  }

  /** All repositories outside the project live only in this agent's session. */
  async setTemporaryRepositories(
    agent: Agent,
    entries: NamedReviewRepository[],
  ): Promise<ReviewWorkspace> {
    const directories = (this.temporaryTargets.get(agentKey(agent)) ?? []).filter(entry => entry.kind === 'directory')
    return this.setTemporaryTargets(agent, [...directories, ...entries.map(entry => ({ ...entry, kind: 'git' as const }))])
  }

  async setTemporaryTargets(agent: Agent, entries: NamedManagedTarget[]): Promise<ReviewWorkspace> {
    const current = await this.project(agent)
    if (!current.configured) {
      throw new Error('Enable this project before adding temporary repositories')
    }
    const root = current.project.root
    if (entries.length > 512) throw new Error('Project exceeds 512 managed targets')
    const normalized: NamedManagedTarget[] = []
    for (const entry of entries) {
      const path = await canonicalRepositoryPath(root, entry.path)
      if (!isAbsolute(entry.path) || !isAbsolute(path)) {
        throw new Error('Temporary repositories must use absolute paths outside the project')
      }
      normalized.push({ ...entry, path })
    }
    this.temporaryTargets.set(agentKey(agent), normalized)
    return this.workspace(agent)
  }

  async resolveTargetPaths(agent: Agent, paths: string[]): Promise<TargetPathResolution[]> {
    if (paths.length > 4096) throw new Error('Path batch exceeds 4096 files')
    return resolveTargetPaths(await this.workspace(agent), sessionCwd(agent), paths)
  }

  async discoverTargets(agent: Agent, project: ReviewProject): Promise<TargetDiscovery> {
    const preview = await this.preview(agent, project)
    return discoverTargets(preview.project!)
  }

  /** Called by session owners on disposal; process restart also releases all entries. */
  releaseSession(agent: Agent): void { this.temporaryTargets.delete(agentKey(agent)) }

}
