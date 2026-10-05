import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { TYPERT_REMOTE } from '../remote.ts'
import { registerNativeSidebar } from './native-sidebar.ts'
import { attachLocale, en, LOCALE_NS, zh } from './locales.ts'

export { RepositorySettings } from './RepositorySettings.tsx'
export { repositoriesChanged, subscribeRepositories } from './repository-events.ts'
export { REPOSITORY_MANAGER_KIND, REPOSITORY_MANAGER_IMPLEMENTATION } from './native-sidebar.ts'
export const inject = ['sessions', 'locale', 'remote', 'slots', 'sidebarRight', 'sidebarRightTabs']

export function apply(ctx: Context): void {
  ctx.effect(() => attachLocale(ctx.locale), 'multi-git-repo-manager: language')
  ctx.effect(() => {
    const zhOff = ctx.locale.register(LOCALE_NS, 'zh', zh)
    const enOff = ctx.locale.register(LOCALE_NS, 'en', en)
    return () => { zhOff(); enOff() }
  }, 'multi-git-repo-manager: dictionaries')
  ctx.effect(() => {
    let disposed = false
    let unmount: (() => Promise<void>) | undefined
    void ctx.remote.$mount(TYPERT_REMOTE).then(dispose => {
      if (disposed) void dispose()
      else unmount = dispose
    }).catch((error: unknown) => console.error('[dsh-multi-git-repo-manager] remote mount error:', error))
    return () => { disposed = true; if (unmount) void unmount() }
  }, 'multi-git-repo-manager: remote')
  ctx.effect(() => registerNativeSidebar(ctx), 'multi-git-repo-manager: native sidebar')
}
