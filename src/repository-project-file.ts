/** The project-local v2 file is the sole persisted target configuration. */
import { createHash } from 'node:crypto'
import { lstat, readFile, realpath } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join } from 'node:path'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { z } from 'zod'
import type { ManagedProject } from './repository-types.ts'
import { namedTargetSchema } from './repository-schemas.ts'
import { canonicalRepositoryPath } from './repository-path-policy.ts'

export const PROJECT_FILE_NAME = 'dsh-file-review-repositories.json'

const fileSchema = z.object({
  version: z.literal(2),
  enabled: z.boolean().optional(),
  includeProjectRoot: z.boolean(),
  repositories: z.array(namedTargetSchema).max(512),
  directories: z.array(namedTargetSchema).max(512),
  discovery: z.object({ containers: z.array(z.string().trim().min(1).max(4096)).max(32) }).strict().optional(),
}).strict().refine(data => data.repositories.length + data.directories.length <= 512, 'Project exceeds 512 managed targets')

function revision(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export async function readProjectFile(root: string): Promise<{ project: ManagedProject; revision: string } | null> {
  const filename = join(root, PROJECT_FILE_NAME)
  const marker = await lstat(filename).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  if (marker === null) return null
  if (!marker.isFile() || marker.isSymbolicLink()) throw new Error(`${PROJECT_FILE_NAME} must be a regular file`)
  if (marker.size > 1024 * 1024) throw new Error(`${PROJECT_FILE_NAME} exceeds 1 MiB`)
  const bytes = await readFile(filename)
  const json: unknown = JSON.parse(bytes.toString('utf8'))
  if (typeof json !== 'object' || json === null || !('version' in json) || json.version !== 2)
    throw new Error(`${PROJECT_FILE_NAME} requires configuration version 2`)
  const data = fileSchema.parse(json)
  const canonicalRoot = await realpath(root)
  const normalize = async (entry: { name: string; path: string }) => ({
    ...entry, path: await canonicalRepositoryPath(canonicalRoot, entry.path),
  })
  const repositories = await Promise.all(data.repositories.map(normalize))
  const directories = await Promise.all(data.directories.map(normalize))
  const containers = await Promise.all((data.discovery?.containers ?? []).map(path => canonicalRepositoryPath(canonicalRoot, path)))
  if ([...repositories, ...directories].some(entry => isAbsolute(entry.path)))
    throw new Error('Persisted targets must be inside the project')
  if (containers.some(isAbsolute)) throw new Error('Discovery containers must be inside the project')
  return {
    project: {
      name: basename(canonicalRoot), root: canonicalRoot,
      enabled: data.enabled ?? true, includeProjectRoot: data.includeProjectRoot,
      repositories, directories, discovery: { containers },
    },
    revision: revision(bytes),
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

export async function writeProjectFile(project: ManagedProject, expectedRevision: string): Promise<string> {
  const current = await readProjectFile(project.root)
  if ((current?.revision ?? '') !== expectedRevision) throw new Error('Project configuration file changed; reload before saving')
  const root = await realpath(project.root)
  const normalize = async (entry: { name: string; path: string }) => ({
    ...entry, path: await canonicalRepositoryPath(root, entry.path),
  })
  const repositories = await Promise.all(project.repositories.map(normalize))
  const directories = await Promise.all(project.directories.map(normalize))
  const containers = await Promise.all(project.discovery.containers.map(path => canonicalRepositoryPath(root, path)))
  if (containers.some(isAbsolute)) throw new Error('Discovery containers must be inside the project')
  // External draft rows are explicit session targets and never become persisted scope.
  const data = fileSchema.parse({
    version: 2, enabled: project.enabled, includeProjectRoot: project.includeProjectRoot,
    repositories: repositories.filter(entry => !isAbsolute(entry.path)),
    directories: directories.filter(entry => !isAbsolute(entry.path)),
    ...(containers.length ? { discovery: { containers } } : {}),
  })
  const filename = join(root, PROJECT_FILE_NAME)
  const bytes = Buffer.from(`${JSON.stringify(data, null, 2)}\n`, 'utf8')
  if (bytes.length > 1024 * 1024) throw new Error(`${PROJECT_FILE_NAME} exceeds 1 MiB`)
  await writeFileAtomic(filename, bytes.toString('utf8'), { mode: 0o644 })
  return revision(bytes)
}
