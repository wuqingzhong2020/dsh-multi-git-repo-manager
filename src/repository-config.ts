import schema from '@deepseek-ai/schemastery'
import type { ProjectIndexEntry } from './repository-types.ts'
import type { Volatile } from '@deepseek-ai/cordis'

/** Native settings only locate the authoritative project-local v2 files. */
export interface MultiGitRepoManagerConfig { projects: ProjectIndexEntry[] | Volatile<ProjectIndexEntry[]> }

export const Config: schema = schema.object({
  projects: schema.array(schema.object({
    root: schema.string().required(),
  })).default([]).volatile(),
})
