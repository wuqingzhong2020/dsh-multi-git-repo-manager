import { MULTI_GIT_REPO_MANAGER_SERVICE_NAME } from './service-names.ts'
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
    id: `${PACKAGE_NAME}#${MULTI_GIT_REPO_MANAGER_SERVICE_NAME}/${method}`, service: MULTI_GIT_REPO_MANAGER_SERVICE_NAME, namespace: MULTI_GIT_REPO_MANAGER_SERVICE_NAME,
    method, invocation: { kind: 'direct' }, scope: { context: 'agent', wire: 'agentId' },
    parameters: [
      { name: 'agent', wire: 'agentId', source: 'lookup', lookup: 'agent', codec: agentCodec },
      { name: parameter, wire: parameter, source: 'json', codec: { mode: 'strict', typeSymbol: `${PACKAGE_NAME}#${method}Request`, create: () => schema } },
    ],
    result: { mode: 'strict', typeSymbol: `${PACKAGE_NAME}#${method}Result`, create: () => result },
  })),
  {
    id: `${PACKAGE_NAME}#${MULTI_GIT_REPO_MANAGER_SERVICE_NAME}/directoryStart`, service: MULTI_GIT_REPO_MANAGER_SERVICE_NAME, namespace: MULTI_GIT_REPO_MANAGER_SERVICE_NAME,
    method: 'directoryStart', invocation: { kind: 'direct' }, scope: { context: 'agent', wire: 'agentId' },
    parameters: [
      { name: 'agent', wire: 'agentId', source: 'lookup', lookup: 'agent', codec: agentCodec },
      { name: 'path', wire: 'path', source: 'json', codec: { mode: 'strict', typeSymbol: 'string', create: () => z.string().max(4096) } },
    ],
    result: { mode: 'strict', typeSymbol: 'string', create: () => z.string() },
  },
  {
    id: `${PACKAGE_NAME}#${MULTI_GIT_REPO_MANAGER_SERVICE_NAME}/workspace`, service: MULTI_GIT_REPO_MANAGER_SERVICE_NAME, namespace: MULTI_GIT_REPO_MANAGER_SERVICE_NAME,
    method: 'workspace', invocation: { kind: 'direct' }, scope: { context: 'agent', wire: 'agentId' },
    parameters: [{ name: 'agent', wire: 'agentId', source: 'lookup', lookup: 'agent', codec: agentCodec }],
    result: { mode: 'strict', typeSymbol: `${PACKAGE_NAME}#ReviewWorkspace`, create: () => reviewWorkspaceSchema },
  },
  {
    id: `${PACKAGE_NAME}#${MULTI_GIT_REPO_MANAGER_SERVICE_NAME}/project`, service: MULTI_GIT_REPO_MANAGER_SERVICE_NAME, namespace: MULTI_GIT_REPO_MANAGER_SERVICE_NAME,
    method: 'project', invocation: { kind: 'direct' }, scope: { context: 'agent', wire: 'agentId' },
    parameters: [{ name: 'agent', wire: 'agentId', source: 'lookup', lookup: 'agent', codec: agentCodec }],
    result: { mode: 'strict', typeSymbol: `${PACKAGE_NAME}#ReviewProjectPage`, create: () => reviewProjectPageSchema },
  },
  {
    id: `${PACKAGE_NAME}#${MULTI_GIT_REPO_MANAGER_SERVICE_NAME}/saveProject`, service: MULTI_GIT_REPO_MANAGER_SERVICE_NAME, namespace: MULTI_GIT_REPO_MANAGER_SERVICE_NAME,
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
    id: `${PACKAGE_NAME}#${MULTI_GIT_REPO_MANAGER_SERVICE_NAME}/setTemporaryRepositories`, service: MULTI_GIT_REPO_MANAGER_SERVICE_NAME, namespace: MULTI_GIT_REPO_MANAGER_SERVICE_NAME,
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
