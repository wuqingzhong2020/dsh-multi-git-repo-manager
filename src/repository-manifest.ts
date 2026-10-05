import { basename } from 'node:path'
import type { NamedReviewRepository } from './repository-types.ts'

function unquote(value: string): string {
  return /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value
}

function parseJsonManifest(text: string): NamedReviewRepository[] {
  const value: unknown = JSON.parse(text)
  let entries: unknown = value
  if (!Array.isArray(value) && value !== null && typeof value === 'object') {
    entries = (value as { repositories?: unknown }).repositories
  }
  if (!Array.isArray(entries)) {
    throw new Error('JSON must contain an array or a repositories array')
  }
  return entries.map((entry: unknown, index) => {
    if (typeof entry === 'string' && entry.trim() !== '') {
      return { name: basename(entry), path: entry.trim() }
    }
    if (entry !== null && typeof entry === 'object') {
      const item = entry as { name?: unknown; path?: unknown }
      if (typeof item.path === 'string' && item.path.trim() !== '') {
        return {
          name: typeof item.name === 'string' ? item.name : basename(item.path),
          path: item.path.trim(),
        }
      }
    }
    throw new Error(`repository ${index + 1} has no path`)
  })
}

function parseIniManifest(text: string): NamedReviewRepository[] {
  const entries: NamedReviewRepository[] = []
  let section = ''
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith(';')) continue
    if (line.startsWith('[') && line.endsWith(']')) {
      section = unquote(line.slice(1, -1).replace(/^submodule\s+/, ''))
      continue
    }
    const match = /^path\s*[=:]\s*(.+)$/i.exec(line)
    if (section && match?.[1]) {
      entries.push({ name: section, path: unquote(match[1].trim()) })
    }
  }
  if (entries.length === 0) throw new Error('No section with a path field was found')
  return entries
}

/** Read names and paths from supported manifests without touching the filesystem. */
export function parseRepositoryManifest(text: string, filename: string): NamedReviewRepository[] {
  const content = text.replace(/^\uFEFF/, '')
  const lowerFilename = filename.toLowerCase()
  if (lowerFilename.endsWith('.json')) return parseJsonManifest(content)
  if (lowerFilename.endsWith('.ini') || basename(filename).toLowerCase() === '.gitmodules') {
    return parseIniManifest(content)
  }
  throw new Error('Supported formats: .ini, .gitmodules, .json')
}
