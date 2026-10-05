/** Browser event shared by independently loaded plugin bundles, including HMR. */
const EVENT = 'dsh-multi-git-repo-manager:repositories-changed'
const KEY = Symbol.for('dsh-multi-git-repo-manager:events')
function target(): EventTarget {
  const shared = globalThis as typeof globalThis & { [KEY]?: EventTarget }
  return shared[KEY] ??= new EventTarget()
}
export function repositoriesChanged(): void { target().dispatchEvent(new Event(EVENT)) }
export function subscribeRepositories(listener: () => void): () => void {
  const bus = target()
  bus.addEventListener(EVENT, listener)
  return () => bus.removeEventListener(EVENT, listener)
}
