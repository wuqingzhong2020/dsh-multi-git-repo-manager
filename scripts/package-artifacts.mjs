import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'

function assertChild(root, target) {
  const child = relative(root, target)
  assert.ok(child && child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child), `Output escapes dist: ${target}`)
}

async function directory(root, child) {
  const target = resolve(root, child)
  await mkdir(target, { recursive: true })
  const canonical = await realpath(target)
  assertChild(root, canonical)
  return canonical
}

async function atomicWrite(path, data) {
  const marker = await lstat(path).catch(error => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  assert.ok(marker === null || (marker.isFile() && !marker.isSymbolicLink()), `Refusing non-regular output: ${path}`)
  const temporary = resolve(dirname(path), `.artifact-${randomUUID()}`)
  try {
    await writeFile(temporary, data, { flag: 'wx' })
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true })
  }
}

export async function withPackOutput(verify) {
  const packageRoot = await realpath(process.cwd())
  const projectRoot = basename(dirname(packageRoot)) === 'dsh-plugins' ? resolve(packageRoot, '../..') : dirname(packageRoot)
  const target = resolve(process.env.MRM_DIST_DIR || resolve(projectRoot, 'dist'))
  await mkdir(target, { recursive: true })
  const dist = await realpath(target)
  const parent = await directory(dist, '.staging')
  const staging = await mkdtemp(resolve(parent, 'pack-'))
  try {
    return await verify({ dist, staging })
  } finally {
    const canonical = await realpath(staging)
    assertChild(parent, canonical)
    await rm(canonical, { recursive: true, force: true })
  }
}

export async function publishPack(output, archive, pkg) {
  const canonical = await realpath(archive)
  assertChild(output.staging, canonical)
  assert.ok((await lstat(archive)).isFile() && !(await lstat(archive)).isSymbolicLink())
  assert.match(pkg.name, /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/)
  const bytes = await readFile(archive)
  const hash = createHash('sha256').update(bytes).digest('hex')
  const buildTime = (await stat('lib/client.js')).mtime.toISOString()
  const stem = pkg.name.replace(/^@/, '').replaceAll('/', '-')
  const filename = `${stem}-${pkg.version}.tgz`
  const history = resolve(output.dist, filename)
  const latestDirectory = await directory(output.dist, 'latest')
  const latest = resolve(latestDirectory, `${stem}.tgz`)
  await atomicWrite(history, bytes)
  await atomicWrite(history + '.sha256', `${hash}  ${filename}\n`)
  await atomicWrite(latest, bytes)
  await atomicWrite(latest + '.sha256', `${hash}  ${basename(latest)}\n`)
  // Commit the index last; installers verify both archives and the index revision.
  const index = { name: pkg.name, version: pkg.version, sha256: hash, history: filename, buildTime }
  await atomicWrite(resolve(latestDirectory, `${stem}.json`), JSON.stringify(index, null, 2) + '\n')
  assert.deepEqual(await readFile(history), await readFile(latest), 'History/latest bytes differ')
  return { history, latest, hash }
}
