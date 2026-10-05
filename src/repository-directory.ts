import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'

/** An empty, malformed, inaccessible or non-directory entry opens at the project. */
export async function resolveDirectoryStart(projectRoot: string, requestedPath: string): Promise<string> {
  const root = resolve(projectRoot)
  const input = requestedPath.trim()
  if (input === '' || input.includes('\0')) return root
  try {
    const candidate = resolve(root, input)
    if ((await stat(candidate)).isDirectory()) return candidate
  } catch { /* fall back to the authoritative project root */ }
  return root
}
