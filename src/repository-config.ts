import schema from '@deepseek-ai/schemastery'
import type { ReviewProject } from './repository-types.ts'
import type { Volatile } from '@deepseek-ai/cordis'

export interface MultiGitRepoManagerConfig { projects: ReviewProject[] | Volatile<ReviewProject[]> }

export const Config: schema = schema.object({
  projects: schema.array(schema.object({
    name: schema.string().default(''),
    root: schema.string().required(),
    enabled: schema.boolean().default(true).i18n({ zh: '是否启用该项目的多代码仓管理', en: 'Enable multi-repository management for this project' }),
    includeProjectRoot: schema.boolean().default(true),
    configFiles: schema.array(schema.string()).default([]),
    repositories: schema.array(schema.string()).default([]),
    namedRepositories: schema.array(schema.object({ name: schema.string(), path: schema.string() })).default([]),
    directories: schema.array(schema.object({ name: schema.string(), path: schema.string() })).default([]),
    discovery: schema.object({ containers: schema.array(schema.string()).default([]) }).default({}),
  })).default([]).volatile(),
})
