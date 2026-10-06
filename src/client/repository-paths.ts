import type { ManagedRepository } from '../repository-types.ts'

/** Browser-side path labels; the Host independently enforces canonical roots. */
export function normalizeReviewPath(path: string): string {
  const slash = path.replace(/\\/g, '/')
  const prefix = slash.startsWith('//') ? '//' : slash.startsWith('/') ? '/' : ''
  const segments: string[] = []
  for (const segment of slash.slice(prefix.length).split('/')) {
    if (!segment || segment === '.') continue
    const parent = segments.at(-1)
    const canResolveParent =
      segment === '..' && parent !== undefined && parent !== '..' && !parent.endsWith(':')
    if (canResolveParent) segments.pop()
    else segments.push(segment)
  }
  return prefix + segments.join('/')
}

function repositoryPathKey(path: string): string {
  const normalized = normalizeReviewPath(path)
  const isWindowsPath = /^[A-Za-z]:/.test(normalized) || normalized.startsWith('//')
  return isWindowsPath ? normalized.toLowerCase() : normalized
}

export function absoluteReviewPath(path: string): boolean {
  const normalized = normalizeReviewPath(path)
  return (
    /^[A-Za-z]:(?:\/|$)/.test(normalized) ||
    normalized.startsWith('//') ||
    normalized.startsWith('/')
  )
}

interface AbsolutePathParts {
  volume: string
  segments: string[]
  caseInsensitive: boolean
}

/** Windows drives and UNC shares compare without case; POSIX paths retain case. */
function parseAbsolutePath(value: string): AbsolutePathParts | null {
  const path = normalizeReviewPath(value)
  const drive = /^([A-Za-z]:)(?:\/|$)/.exec(path)
  if (drive !== null)
    return {
      volume: drive[1]!.toLowerCase(),
      segments: path.slice(drive[1]!.length).split('/').filter(Boolean),
      caseInsensitive: true,
    }
  const share = /^(\/\/[^/]+\/[^/]+)(?:\/|$)/.exec(path)
  if (share !== null)
    return {
      volume: share[1]!.toLowerCase(),
      segments: path.slice(share[1]!.length).split('/').filter(Boolean),
      caseInsensitive: true,
    }
  if (path.startsWith('/'))
    return {
      volume: '/',
      segments: path.slice(1).split('/').filter(Boolean),
      caseInsensitive: false,
    }
  return null
}

/** Return a portable path only for the project itself or its descendants. */
export function relativeProjectDirectory(root: string, selected: string): string | null {
  const project = parseAbsolutePath(root)
  const target = parseAbsolutePath(selected)
  if (project === null || target === null || project.volume !== target.volume) return null
  if (target.segments.length < project.segments.length) return null
  for (let index = 0; index < project.segments.length; index += 1) {
    const parent = project.segments[index]!
    const child = target.segments[index]!
    const matches = project.caseInsensitive
      ? parent.toLowerCase() === child.toLowerCase()
      : parent === child
    if (!matches) return null
  }
  return target.segments.slice(project.segments.length).join('/') || '.'
}

/** Normalize manual ../ entries to absolute temporary paths outside the project. */
export function repositoryProjectPath(root: string, input: string): string {
  const path = input.trim()
  if (path === '') return ''
  const target = absoluteReviewPath(path)
    ? normalizeReviewPath(path)
    : normalizeReviewPath(`${root}/${path}`)
  return relativeProjectDirectory(root, target) ?? target
}

export function fileRepository<T extends Pick<ManagedRepository, 'name' | 'path' | 'source'> & { state: string }>(
  path: string,
  repositories: readonly T[],
): T | undefined {
  const candidate = repositoryPathKey(path)
  const mostSpecificFirst = [...repositories].sort(
    (left, right) => right.path.length - left.path.length,
  )
  const owner = mostSpecificFirst.find(repo => {
    const root = repositoryPathKey(repo.path)
    return candidate === root || candidate.startsWith(`${root}/`)
  })
  return owner?.state === 'ready' ? owner : undefined
}

export function repositoryRelativePath(path: string, repo: Pick<ManagedRepository, 'path' | 'name'>): string {
  return (
    normalizeReviewPath(path).slice(normalizeReviewPath(repo.path).length).replace(/^\//, '') ||
    repo.name
  )
}
