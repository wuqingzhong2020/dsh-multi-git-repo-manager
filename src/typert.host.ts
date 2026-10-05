import { MULTI_GIT_REPO_MANAGER_SERVICE_NAME } from './service-names.ts'
/** Host Typert contribution discovered through the package's `./typert` export. */

import type { TypertContribution } from '@deepseek-ai/dsh-typert-registry/types'
import { REPOSITORY_INVOCATIONS, PACKAGE_NAME } from './typert-descriptors.ts'

export const TYPERT: TypertContribution = {
  package: PACKAGE_NAME,
  face: 'host',
  schemas: [],
  invocations: REPOSITORY_INVOCATIONS,
  model: {
    services: [{
      key: MULTI_GIT_REPO_MANAGER_SERVICE_NAME,
      exportName: 'MultiGitRepoManager',
      summary: 'Manage shared project repositories and resolve trusted session roots.',
      tags: [],
      members: [],
      types: [],
    }],
    events: [],
    objects: [],
  },
}

export default TYPERT
