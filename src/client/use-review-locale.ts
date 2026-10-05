import { useSyncExternalStore } from 'react'
import { getLocaleSnapshot, subscribeLocale } from './locales.ts'

/** Re-render on the host language preference, keeping component state intact. */
export function useReviewLocale() {
  return useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getLocaleSnapshot)
}
