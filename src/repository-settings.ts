import type { Context } from '@deepseek-ai/cordis'
import type { SettingsForms } from '@deepseek-ai/dsh-settings'
import { projectIndexEntrySchema, projectIndexSettingsSchema } from './repository-schemas.ts'
import type { ProjectIndexEntry, ProjectIndexSettings, SaveProjectIndex } from './repository-types.ts'
import { PACKAGE_NAME } from './typert-descriptors.ts'

/** Native revision-fenced Profile index; target declarations live only on disk. */
export class RepositorySettings {
  private settings: SettingsForms | undefined

  constructor(private readonly ctx: Context, private initial: ProjectIndexEntry[] = []) {
    ctx.inject(['settings'], (sctx) => {
      this.settings = sctx.settings
      ctx.effect(() => sctx.settings.configure({ auto: false }, ctx.fiber), 'multi-git-repo-manager: custom settings')
      return () => { this.settings = undefined }
    })
  }

  get(): ProjectIndexSettings {
    const entry = this.entry()
    const descriptor = this.settings?.describe({ redactSecrets: true }).find(item => item.ns === entry?.options.id)
    const value = descriptor?.value as { projects?: unknown } | undefined
    return {
      projects: projectIndexEntrySchema.array().max(64).parse(value?.projects ?? this.initial),
      revision: descriptor?.revision ?? 0,
    }
  }

  async save(request: SaveProjectIndex): Promise<ProjectIndexSettings> {
    const validated = projectIndexSettingsSchema.parse(request)
    const entry = this.entry()
    if (this.settings === undefined || typeof entry?.options.id !== 'string') throw new Error('Native project settings are unavailable')
    await this.settings.update(entry.options.id, { projects: validated.projects }, validated.revision)
    this.initial = validated.projects
    return this.get()
  }

  private entry() {
    const loader = this.ctx.get('loader') as { entries(): Iterable<{ fiber?: unknown; options: { id?: string; name?: string } }> } | undefined
    return [...(loader?.entries() ?? [])].find(entry => entry.fiber === this.ctx.fiber && entry.options.name === PACKAGE_NAME)
  }
}
