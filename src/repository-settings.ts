import type { Context } from '@deepseek-ai/cordis'
import type { SettingsForms } from '@deepseek-ai/dsh-settings'
import { reviewProjectSchema, reviewSettingsSchema } from './repository-schemas.ts'
import type { ReviewProject, ReviewProjectSettings, SaveReviewProjects } from './repository-types.ts'
import { PACKAGE_NAME } from './typert-descriptors.ts'

/** All writes go through the Desktop profile's native revision-fenced settings. */
export class RepositorySettings {
  private settings: SettingsForms | undefined
  private legacyProjects: ReviewProject[] = []

  constructor(private readonly ctx: Context, private initial: ReviewProject[] = []) {
    ctx.inject(['settings'], (sctx) => {
      this.settings = sctx.settings
      ctx.effect(() => sctx.settings.configure({ auto: false }, ctx.fiber), 'multi-git-repo-manager: custom settings')
      return () => { this.settings = undefined }
    })
  }

  adoptLegacyProjects(projects: ReviewProject[]): void {
    this.legacyProjects = [...new Map([...projects, ...this.legacyProjects].map(project => [project.root, project])).values()]
  }

  get(): ReviewProjectSettings {
    const entry = this.entry()
    const descriptor = this.settings?.describe({ redactSecrets: true }).find(item => item.ns === entry?.options.id)
    const value = descriptor?.value as { projects?: unknown } | undefined
    return {
      projects: reviewProjectSchema.array().parse([
        ...new Map([...this.legacyProjects, ...reviewProjectSchema.array().parse(value?.projects ?? this.initial)]
          .map(project => [project.root, project])).values(),
      ]),
      revision: descriptor?.revision ?? 0,
    }
  }

  async save(request: SaveReviewProjects): Promise<ReviewProjectSettings> {
    const validated = reviewSettingsSchema.parse(request)
    const entry = this.entry()
    if (this.settings === undefined || typeof entry?.options.id !== 'string') throw new Error('Native project settings are unavailable')
    await this.settings.update(entry.options.id, { projects: validated.projects }, validated.revision)
    this.initial = validated.projects
    this.legacyProjects = []
    return this.get()
  }

  private entry() {
    const loader = this.ctx.get('loader') as { entries(): Iterable<{ fiber?: unknown; options: { id?: string; name?: string } }> } | undefined
    return [...(loader?.entries() ?? [])].find(entry => entry.fiber === this.ctx.fiber && entry.options.name === PACKAGE_NAME)
  }
}
