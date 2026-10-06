import { z } from 'zod'

const path = z.string().trim().min(1).max(4096)
export const namedTargetSchema = z.object({ name: z.string().trim().min(1).max(120), path }).strict()
export const namedManagedTargetSchema = namedTargetSchema.extend({ kind: z.enum(['git', 'directory']) })
export const managedTargetSchema = z.object({
  id: z.string(), name: z.string(), kind: z.enum(['git', 'directory']), path: z.string(),
  relativePath: z.string(), source: z.string(),
  state: z.enum(['ready', 'missing', 'notGit', 'error', 'kindMismatch']),
  capabilities: z.object({ git: z.boolean() }), reason: z.string().optional(),
})
export const targetPathResolutionSchema = z.object({
  input: z.string(), path: z.string(),
  state: z.enum(['managed', 'unmanaged', 'unavailable', 'outside', 'metadata', 'error']),
  target: managedTargetSchema.optional(), reason: z.string().optional(),
})
export const targetDiscoverySchema = z.object({ candidates: z.array(managedTargetSchema), warnings: z.array(z.string()) })
export const managedProjectSchema = z.object({
  name: z.string().trim().max(120), root: path, enabled: z.boolean(), includeProjectRoot: z.boolean(),
  repositories: z.array(namedTargetSchema).max(512), directories: z.array(namedTargetSchema).max(512),
  discovery: z.object({ containers: z.array(path).max(32) }).strict(),
}).strict()
export const projectIndexEntrySchema = z.object({ root: path }).strict()
export const projectIndexSettingsSchema = z.object({
  projects: z.array(projectIndexEntrySchema).max(64), revision: z.number().int().nonnegative(),
}).strict()
export const managedWorkspaceSchema = z.object({
  project: managedProjectSchema.nullable(),
  repositories: z.array(z.object({
    name: z.string(), path: z.string(), relativePath: z.string(), source: z.string(),
    state: z.enum(['ready', 'missing', 'notGit', 'error']), reason: z.string().optional(),
  })),
  warnings: z.array(z.string()), roots: z.array(z.string()),
  targets: z.array(managedTargetSchema), boundaries: z.array(z.string()), workspaceRevision: z.string(),
})
export const managedProjectPageSchema = z.object({
  project: managedProjectSchema, revision: z.number().int().nonnegative(), configured: z.boolean(),
  workspace: managedWorkspaceSchema, fileRevision: z.string(),
  temporaryTargets: z.array(namedManagedTargetSchema).max(512),
})
export const saveManagedProjectSchema = z.object({
  project: managedProjectSchema, revision: z.number().int().nonnegative(), fileRevision: z.string(),
}).strict()
