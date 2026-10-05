import type { Context } from '@deepseek-ai/cordis'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { RepositorySettings } from './RepositorySettings.tsx'
import { t } from './locales.ts'
import { useReviewLocale } from './use-review-locale.ts'

interface RepositoryScope { readonly ctx: Context; readonly sessionId: string }
type BodyProps = PropsRuntime<'sidebar.right.pane.tab'> & RepositoryScope

export function RepositoryIcon({ size = 16 }: { readonly size?: number | undefined }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="4" r="2" /><circle cx="5" cy="16" r="2" /><circle cx="15" cy="4" r="2" />
    <path d="M5 6v8m10-8v1a5 5 0 0 1-5 5H5" />
  </svg>
}

/** The slot injects the owning session; keepMounted preserves drafts between native tabs. */
export function NativeRepositoryTab({ ctx, sessionId }: BodyProps) {
  return <RepositorySettings key={sessionId} ctx={ctx} sessionId={sessionId} />
}

/** The title remains reactive to the host language while the body is hidden. */
export function NativeRepositoryTitle() {
  useReviewLocale()
  const title = t('projectTab')
  return <span title={title} aria-label={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <RepositoryIcon /><span>{title}</span>
  </span>
}
