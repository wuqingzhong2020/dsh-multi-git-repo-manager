import type { Context } from '@deepseek-ai/cordis'
import { NativeRepositoryTab, NativeRepositoryTitle, RepositoryIcon } from './NativeRepositoryTab.tsx'
import { registrationLifetime } from './registration-lifetime.ts'
import { t } from './locales.ts'

export const REPOSITORY_MANAGER_KIND = 'multi-git-repo-manager'
export const REPOSITORY_MANAGER_IMPLEMENTATION = 'dsh-multi-git-repo-manager:repositories'

/** Register the same native type/body/title/guide contract used by File Review. */
export function registerNativeSidebar(ctx: Context): () => void {
  const lifetime = registrationLifetime(error => {
    console.error('[dsh-multi-git-repo-manager] native sidebar registration failed:', error)
  })
  lifetime.register(() => ctx.sidebarRightTabs.register({
    id: REPOSITORY_MANAGER_IMPLEMENTATION, kind: REPOSITORY_MANAGER_KIND,
    priority: 'extension', keepMounted: true,
    title: () => t('projectTab'),
    guide: [{ id: 'repositories', order: 40, title: () => t('projectTab'),
      description: () => t('sidebarGuideDescription'), icon: RepositoryIcon }],
  }))
  const inject = (sessionId: string) => ({ ctx, sessionId })
  for (const [name, component] of [
    ['sidebar.right.pane.tab', NativeRepositoryTab],
    ['sidebar.right.pane.tab.title', NativeRepositoryTitle],
  ] as const) {
    lifetime.register(() => ctx.slots.inject(name, () => {
      const seats = registrationLifetime(error => {
        lifetime.release()
        console.error('[dsh-multi-git-repo-manager] native slot registration failed:', error)
      })
      seats.register(() => ctx.slots.register({ name, key: REPOSITORY_MANAGER_IMPLEMENTATION, inject }, component))
      return seats.release
    }))
  }
  return lifetime.release
}
