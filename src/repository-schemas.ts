import { z } from 'zod'

const path = z.string().trim().min(1).max(4096)
export const namedReviewRepositorySchema = z.object({ name: z.string().trim().min(1).max(120), path })
export const namedManagedTargetSchema = namedReviewRepositorySchema.extend({ kind: z.enum(['git', 'directory']) })
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
export const reviewProjectSchema = z.object({
  name: z.string().trim().max(120),
  root: path,
  includeProjectRoot: z.boolean(),
  configFiles: z.array(path).max(32),
  repositories: z.array(path).max(512),
  namedRepositories: z.array(namedReviewRepositorySchema).max(512).optional(),
  directories: z.array(namedReviewRepositorySchema).max(512).optional(),
  discovery: z.object({ containers: z.array(path).max(32) }).optional(),
  enabled: z.boolean().optional(),
})
export const reviewSettingsSchema = z.object({
  projects: z.array(reviewProjectSchema).max(64),
  revision: z.number().int().nonnegative(),
})
export const reviewWorkspaceSchema = z.object({
  project: reviewProjectSchema.nullable(),
  repositories: z.array(z.object({
    name: z.string(), path: z.string(), relativePath: z.string(), source: z.string(),
    state: z.enum(['ready', 'missing', 'notGit', 'error']), reason: z.string().optional(),
  })),
  warnings: z.array(z.string()),
  roots: z.array(z.string()),
  targets: z.array(managedTargetSchema).optional(),
  boundaries: z.array(z.string()).optional(),
  workspaceRevision: z.string().optional(),
})
export const reviewProjectPageSchema = z.object({
  project: reviewProjectSchema,
  revision: z.number().int().nonnegative(),
  configured: z.boolean(),
  workspace: reviewWorkspaceSchema,
  fileRevision: z.string(),
  temporaryRepositories: z.array(namedReviewRepositorySchema).max(512),
  temporaryTargets: z.array(namedManagedTargetSchema).max(512).optional(),
})
export const saveReviewProjectSchema = z.object({
  project: reviewProjectSchema,
  revision: z.number().int().nonnegative(),
  fileRevision: z.string(),
})
