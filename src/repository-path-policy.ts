import { realpath } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'

export function inside(root: string, candidate: string): boolean {
  const child = relative(root, candidate)
  return child === '' || (child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child))
}

/** Only directories contained by the project are portable configuration paths. */
export function projectRepositoryPath(root: string, input: string): string {
  const target = resolve(root, input)
  const path = inside(root, target) ? relative(root, target) || '.' : target
  return path.split(sep).join('/')
}

/** A junction to an external directory is temporary too. Missing paths remain editable. */
export async function canonicalRepositoryPath(root: string, input: string): Promise<string> {
  const target = resolve(root, input)
  const canonical = await realpath(target).catch(() => target)
  return projectRepositoryPath(root, canonical)
}
