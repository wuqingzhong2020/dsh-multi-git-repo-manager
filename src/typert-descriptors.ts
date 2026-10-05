import { z } from 'zod'
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol'
import { namedManagedTargetSchema, namedReviewRepositorySchema, reviewProjectPageSchema, reviewProjectSchema, reviewWorkspaceSchema, saveReviewProjectSchema, targetDiscoverySchema, targetPathResolutionSchema } from './repository-schemas.ts'

export const PACKAGE_NAME = 'dsh-multi-git-repo-manager'

const agentCodec = {
  mode: 'strict' as const,
  typeSymbol: '@deepseek-ai/dsh-session/types#SessionId',
  create: () => z.intersection(z.string(), z.unknown()),
}

export const REPOSITORY_INVOCATIONS: readonly InvocationDescriptor[] = [
  ...[
    { method: 'setTemporaryTargets', parameter: 'entries', schema: z.array(namedManagedTargetSchema).max(512), result: reviewWorkspaceSchema },
    { method: 'resolveTargetPaths', parameter: 'paths', schema: z.array(z.string().min(1).max(4096)).max(4096), result: z.array(targetPathResolutionSchema) },
    { method: 'discoverTargets', parameter: 'project', schema: reviewProjectSchema, result: targetDiscoverySchema },
  ].map(({ method, parameter, schema, result }): InvocationDescriptor => ({
    id: `${PACKAGE_NAME}#multiGitRepoManager/${method}`, service: 'multiGitRepoManager', namespace: 'multiGitRepoManager',
    method, invocation: { kind: 'direct' }, scope: { context: 'agent', wire: 'agentId' },
    parameters: [
      { name: 'agent', wire: 'agentId', source: 'lookup', lookup: 'agent', codec: agentCodec },
      { name: parameter, wire: parameter, source: 'json', codec: { mode: 'strict', typeSymbol: `${PACKAGE_NAME}#${method}Request`, create: () => schema } },
    ],
    result: { mode: 'strict', typeSymbol: `${PACKAGE_NAME}#${method}Result`, create: () => result },
  })),
  {
    id: `${PACKAGE_NAME}#multiGitRepoManager/directoryStart`, service: 'multiGitRepoManager', namespace: 'multiGitRepoManager',
    method: 'directoryStart', invocation: { kind: 'direct' }, scope: { context: 'agent', wire: 'agentId' },
    parameters: [
      { name: 'agent', wire: 'agentId', source: 'lookup', lookup: 'agent', codec: agentCodec },
      { name: 'path', wire: 'path', source: 'json', codec: { mode: 'strict', typeSymbol: 'string', create: () => z.string().max(4096) } },
    ],
    result: { mode: 'strict', typeSymbol: 'string', create: () => z.string() },
  },
  {
    id: `${PACKAGE_NAME}#multiGitRepoManager/workspace`, service: 'multiGitRepoManager', namespace: 'multiGitRepoManager',
    method: 'workspace', invocation: { kind: 'direct' }, scope: { context: 'agent', wire: 'agentId' },
    parameters: [{ name: 'agent', wire: 'agentId', source: 'lookup', lookup: 'agent', codec: agentCodec }],
    result: { mode: 'strict', typeSymbol: `${PACKAGE_NAME}#ReviewWorkspace`, create: () => reviewWorkspaceSchema },
  },
  {
    id: `${PACKAGE_NAME}#multiGitRepoManager/project`, service: 'multiGitRepoManager', namespace: 'multiGitRepoManager',
    method: 'project', invocation: { kind: 'direct' }, scope: { context: 'agent', wire: 'agentId' },
    parameters: [{ name: 'agent', wire: 'agentId', source: 'lookup', lookup: 'agent', codec: agentCodec }],
    result: { mode: 'strict', typeSymbol: `${PACKAGE_NAME}#ReviewProjectPage`, create: () => reviewProjectPageSchema },
  },
  {
    id: `${PACKAGE_NAME}#multiGitRepoManager/saveProject`, service: 'multiGitRepoManager', namespace: 'multiGitRepoManager',
    method: 'saveProject', invocation: { kind: 'direct' }, scope: { context: 'agent', wire: 'agentId' },
    parameters: [
      { name: 'agent', wire: 'agentId', source: 'lookup', lookup: 'agent', codec: agentCodec },
      { name: 'request', wire: 'request', source: 'json', codec: {
        mode: 'strict', typeSymbol: `${PACKAGE_NAME}#SaveReviewProject`, create: () => saveReviewProjectSchema,
      } },
    ],
    result: { mode: 'strict', typeSymbol: `${PACKAGE_NAME}#ReviewProjectPage`, create: () => reviewProjectPageSchema },
  },
  {
    id: `${PACKAGE_NAME}#multiGitRepoManager/setTemporaryRepositories`, service: 'multiGitRepoManager', namespace: 'multiGitRepoManager',
    method: 'setTemporaryRepositories', invocation: { kind: 'direct' }, scope: { context: 'agent', wire: 'agentId' },
    parameters: [
      { name: 'agent', wire: 'agentId', source: 'lookup', lookup: 'agent', codec: agentCodec },
      { name: 'entries', wire: 'entries', source: 'json', codec: {
        mode: 'strict', typeSymbol: `${PACKAGE_NAME}#NamedReviewRepositories`, create: () => z.array(namedReviewRepositorySchema).max(512),
      } },
    ],
    result: { mode: 'strict', typeSymbol: `${PACKAGE_NAME}#ReviewWorkspace`, create: () => reviewWorkspaceSchema },
  },
]
