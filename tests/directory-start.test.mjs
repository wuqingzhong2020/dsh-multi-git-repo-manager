import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { resolveDirectoryStart } from '../src/repository-directory.ts'
import { MultiGitRepoManager } from '../lib/index.js'

const directory = await mkdtemp(join(tmpdir(), 'dsh-directory-start-'))
after(async () => {
  const child = relative(tmpdir(), directory)
  assert.ok(child.startsWith('dsh-directory-start-') && !child.includes(sep))
  await rm(directory, { recursive: true, force: true })
})
const root = join(directory, 'project')
const repo = join(root, 'repos', 'core')
const external = join(directory, 'external')
await mkdir(repo, { recursive: true })
await mkdir(external)
await writeFile(join(root, 'file.txt'), 'file')

test('Existing relative and absolute directories become the picker starting directory', async () => {
  assert.equal(await resolveDirectoryStart(root, 'repos/core'), repo)
  assert.equal(await resolveDirectoryStart(root, ' repos/core '), repo)
  assert.equal(await resolveDirectoryStart(root, repo), repo)
  assert.equal(await resolveDirectoryStart(root, external), external)
  assert.equal(await resolveDirectoryStart(root, '.'), root)
})

test('Empty, missing, malformed and file paths open at the current project', async () => {
  for (const value of ['', '  ', 'missing', join(directory, 'missing'), '\0bad', 'file.txt']) {
    assert.equal(await resolveDirectoryStart(root, value), root, JSON.stringify(value))
  }
})

test('The Host derives the fallback root from the receiving session project', async () => {
  const agent = { id: 'session' }
  const service = { project(received) { assert.equal(received, agent); return { project: { root } } } }
  assert.equal(await MultiGitRepoManager.prototype.directoryStart.call(service, agent, 'repos/core'), repo)
  assert.equal(await MultiGitRepoManager.prototype.directoryStart.call(service, agent, ''), root)
})
