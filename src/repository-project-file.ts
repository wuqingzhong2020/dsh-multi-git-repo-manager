/** Portable repository configuration owned by each project directory. */
import { createHash } from 'node:crypto'
import { copyFile, lstat, readFile, realpath } from 'node:fs/promises'
import { constants } from 'node:fs'
import { basename, dirname, isAbsolute, join } from 'node:path'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { z } from 'zod'
import type { NamedReviewRepository, ReviewProject } from './repository-types.ts'
import { canonicalRepositoryPath } from './repository-path-policy.ts'

export const PROJECT_FILE_NAME = 'dsh-file-review-repositories.json'

const entrySchema = z.object({ name: z.string().trim().min(1).max(120), path: z.string().trim().min(1).max(4096) })
const commonSchema = z.object({
  enabled: z.boolean().optional(),
  includeProjectRoot: z.boolean(),
  repositories: z.array(entrySchema).max(512),
})
const fileSchema = z.discriminatedUnion('version', [
  commonSchema.extend({ version: z.literal(1) }).strict(),
  commonSchema.extend({ version: z.literal(2), directories: z.array(entrySchema).max(512), discovery: z.object({ containers: z.array(z.string().trim().min(1).max(4096)).max(32) }).optional() }).strict(),
]).refine(data => data.repositories.length + (data.version === 2 ? data.directories.length : 0) <= 512, 'Project exceeds 512 managed targets')

function revision(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export async function readProjectFile(root: string): Promise<{ project: ReviewProject; revision: string; temporaryRepositories: NamedReviewRepository[] } | null> {
  const filename = join(root, PROJECT_FILE_NAME)
  const marker = await lstat(filename).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  if (marker === null) return null
  if (!marker.isFile() || marker.isSymbolicLink()) throw new Error(`${PROJECT_FILE_NAME} must be a regular file`)
  if (marker.size > 1024 * 1024) throw new Error(`${PROJECT_FILE_NAME} exceeds 1 MiB`)
  const bytes = await readFile(filename)
  const data = fileSchema.parse(JSON.parse(bytes.toString('utf8')))
  const canonicalRoot = await realpath(root)
  const entries = await Promise.all(data.repositories.map(async entry => ({
    ...entry, path: await canonicalRepositoryPath(canonicalRoot, entry.path),
  })))
  const directories = await Promise.all((data.version === 2 ? data.directories : []).map(async entry => ({ ...entry, path: await canonicalRepositoryPath(canonicalRoot, entry.path) })))
  if (directories.some(entry => isAbsolute(entry.path))) throw new Error('Persisted directories must be inside the project')
  return {
    project: {
      name: basename(canonicalRoot), root: canonicalRoot,
      enabled: data.enabled ?? true,
      includeProjectRoot: data.includeProjectRoot,
      configFiles: [], repositories: [], namedRepositories: entries.filter(entry => !isAbsolute(entry.path)),
      ...(data.version === 2 ? { directories, discovery: data.discovery } : {}),
    },
    revision: revision(bytes),
    // Legacy external entries are offered for migration only by the editor.
    temporaryRepositories: entries.filter(entry => isAbsolute(entry.path)),
  }
}

export async function findProjectFile(cwd: string): ReturnType<typeof readProjectFile> {
  let directory = await realpath(cwd)
  while (true) {
    const found = await readProjectFile(directory)
    if (found !== null) return found
    const parent = dirname(directory)
    if (parent === directory) return null
    directory = parent
  }
}

export async function writeProjectFile(project: ReviewProject, expectedRevision: string): Promise<string> {
  const current = await readProjectFile(project.root)
  if ((current?.revision ?? '') !== expectedRevision) throw new Error('Project configuration file changed; reload before saving')
  const root = await realpath(project.root)
  const entries = await Promise.all((project.namedRepositories ?? []).map(async entry => ({
    ...entry, path: await canonicalRepositoryPath(root, entry.path),
  })))
  const directories = await Promise.all((project.directories ?? []).map(async entry => ({ ...entry, path: await canonicalRepositoryPath(root, entry.path) })))
  const containers = await Promise.all((project.discovery?.containers ?? []).map(path => canonicalRepositoryPath(root, path)))
  if (containers.some(isAbsolute)) throw new Error('Discovery containers must be inside the project')
  const version = directories.length || containers.length || current?.project.directories !== undefined ? 2 : 1
  const data = fileSchema.parse({
    version,
    enabled: project.enabled ?? true,
    includeProjectRoot: project.includeProjectRoot,
    repositories: entries.filter(entry => !isAbsolute(entry.path)),
    ...(version === 2 ? { directories: directories.filter(entry => !isAbsolute(entry.path)), ...(containers.length ? { discovery: { containers } } : {}) } : {}),
  })
  const filename = join(project.root, PROJECT_FILE_NAME)
  const bytes = Buffer.from(`${JSON.stringify(data, null, 2)}\n`, 'utf8')
  if (bytes.length > 1024 * 1024) throw new Error(`${PROJECT_FILE_NAME} exceeds 1 MiB`)
  if (version === 2 && current !== null && current.project.directories === undefined) {
    // Preserve the exact v1 file once; existing backups are never overwritten.
    await copyFile(filename, `${filename}.v1.bak`, constants.COPYFILE_EXCL).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'EEXIST') throw error })
  }
  await writeFileAtomic(filename, bytes.toString('utf8'), { mode: 0o644 })
  return revision(bytes)
}
