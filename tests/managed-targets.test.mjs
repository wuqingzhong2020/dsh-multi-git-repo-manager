import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import { previewProject, resolveTargetPaths, discoverTargets, MultiGitRepoManager } from '../lib/index.js'
import { readProjectFile, writeProjectFile, PROJECT_FILE_NAME } from '../src/repository-project-file.ts'
import { reviewProjectPageSchema } from '../src/repository-schemas.ts'

const sandbox = await mkdtemp(join(tmpdir(), 'dsh-managed-targets-'))
after(async () => { assert.ok(relative(tmpdir(), sandbox).startsWith('dsh-managed-targets-')); await rm(sandbox, { recursive: true, force: true }) })
const project = (root, patch = {}) => ({ name: 'Targets', root, enabled: true, includeProjectRoot: true, configFiles: [], repositories: [], ...patch })
async function directory(name) { const path = join(sandbox, name); await mkdir(path, { recursive: true }); return path }
function git(path) { execFileSync('git', ['init', '-q', path]) }

test('plain root and explicit directories are ready targets and never Git projections', async () => {
  const root = await directory('plain'); await directory('plain/component')
  const workspace = await previewProject(project(root, { directories: [{ name: 'Component', path: 'component' }] }))
  assert.deepEqual(workspace.targets.map(target => [target.kind, target.state, target.capabilities.git]), [['directory', 'ready', false], ['directory', 'ready', false]])
  assert.deepEqual(workspace.repositories, [])
  const [owner] = await resolveTargetPaths(workspace, root, ['component/new.txt'])
  assert.equal(owner.state, 'managed'); assert.equal(owner.target.name, 'Component')
})

test('type declarations do not silently change when Git metadata appears or disappears', async () => {
  const root = await directory('types'); const plain = await directory('types/plain'); const broken = await directory('types/broken')
  git(plain); await mkdir(join(broken, '.git'))
  const workspace = await previewProject(project(root, { includeProjectRoot: false,
    namedRepositories: [{ name: 'Lost Git', path: 'lost' }, { name: 'Broken', path: 'broken' }],
    directories: [{ name: 'Now Git', path: 'plain' }] }))
  assert.deepEqual(workspace.targets.map(target => target.state), ['missing', 'error', 'kindMismatch'])
  assert.deepEqual(workspace.roots, [])
  await directory('types/lost')
  assert.equal((await previewProject(workspace.project)).targets[0].state, 'notGit')
})

test('a missing or mismatched child target blocks its ready parent, including nonexistent files', async () => {
  const root = await directory('blocked'); await directory('blocked/lost')
  const workspace = await previewProject(project(root, { namedRepositories: [{ name: 'Lost', path: 'lost' }] }))
  const owners = await resolveTargetPaths(workspace, root, ['lost/new.txt', 'root.txt', '.git/config'])
  assert.deepEqual(owners.map(owner => owner.state), ['unavailable', 'managed', 'metadata'])
})

test('discovery is direct, deduplicated and does not admit candidates until explicitly saved', async () => {
  const root = await directory('discovery'); await directory('discovery/project/local/deep'); const gitPath = await directory('discovery/project/plugins/git'); git(gitPath)
  await directory('discovery/project/plugins/plain')
  const configuration = project(root, { discovery: { containers: ['project', 'project/plugins'] } })
  const found = await discoverTargets(configuration)
  assert.deepEqual(found.candidates.map(target => [target.relativePath, target.kind]).sort(), [['project/local', 'directory'], ['project/plugins/git', 'git'], ['project/plugins/plain', 'directory']])
  const before = await previewProject(configuration)
  assert.equal((await resolveTargetPaths(before, root, ['project/local/file.txt']))[0].state, 'unmanaged')
  const after = await previewProject({ ...configuration, directories: [{ name: 'Local', path: 'project/local' }] })
  assert.equal((await resolveTargetPaths(after, root, ['project/local/file.txt']))[0].state, 'managed')
  assert.equal((await resolveTargetPaths(after, root, ['project/plugins/plain/file.txt']))[0].state, 'unmanaged')
  assert.equal((await resolveTargetPaths(after, root, ['project/loose.txt']))[0].state, 'unmanaged')
})

test('nested undisclosed Git roots and external junctions never inherit a parent target', async () => {
  const root = await directory('nested'); const nested = await directory('nested/child'); git(nested)
  const external = await directory('outside'); await writeFile(join(external, 'file.txt'), 'outside')
  await symlink(external, join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
  const workspace = await previewProject(project(root))
  const owners = await resolveTargetPaths(workspace, root, ['child/file.txt', 'linked/file.txt'])
  assert.deepEqual(owners.map(owner => owner.state), ['unmanaged', 'outside'])
  await assert.rejects(discoverTargets(project(root, { discovery: { containers: ['linked'] } })), /inside/)
})

test('v1 upgrades atomically to v2 with an exact backup, a conflict fence and portable directory paths', async () => {
  const root = await directory('migration'); await directory('migration/local')
  const v1 = await writeProjectFile(project(root), '')
  const original = await readFile(join(root, PROJECT_FILE_NAME))
  assert.equal(JSON.parse(original).version, 1)
  const v2 = await writeProjectFile(project(root, { directories: [{ name: 'Local', path: join(root, 'local') }], discovery: { containers: ['local'] } }), v1)
  assert.deepEqual(await readFile(join(root, `${PROJECT_FILE_NAME}.v1.bak`)), original)
  const loaded = await readProjectFile(root)
  assert.deepEqual(loaded.project.directories, [{ name: 'Local', path: 'local' }])
  assert.deepEqual(loaded.project.discovery, { containers: ['local'] })
  await assert.rejects(writeProjectFile(project(root), v1), /changed/)
  await writeProjectFile({ ...loaded.project, directories: [] }, v2)
  assert.equal(JSON.parse(await readFile(join(root, PROJECT_FILE_NAME), 'utf8')).version, 2)
})

test('future versions and unknown fields fail before overwriting configuration', async () => {
  const root = await directory('future')
  const text = JSON.stringify({ version: 3, includeProjectRoot: true, repositories: [], future: true })
  await writeFile(join(root, PROJECT_FILE_NAME), text)
  await assert.rejects(writeProjectFile(project(root), ''))
  assert.equal(await readFile(join(root, PROJECT_FILE_NAME), 'utf8'), text)
})

test('ordinary external targets are isolated by session and absent from portable JSON', async () => {
  const root = await directory('temporary'); const external = await directory('external-directory')
  await writeProjectFile(project(root), '')
  const manager = Object.assign(Object.create(MultiGitRepoManager.prototype), { temporaryTargets: new Map() })
  const agent = { id: 'a', session: { header: { cwd: root } } }; const other = { ...agent, id: 'b' }
  await manager.setTemporaryTargets(agent, [{ name: 'External', path: external, kind: 'directory' }])
  assert.equal((await manager.resolveTargetPaths(agent, [join(external, 'new.txt')]))[0].state, 'managed')
  assert.equal((await manager.resolveTargetPaths(other, [join(external, 'new.txt')]))[0].state, 'outside')
  const page = reviewProjectPageSchema.parse(await manager.project(agent))
  assert.equal(page.temporaryTargets[0].kind, 'directory'); assert.deepEqual(page.temporaryRepositories, [])
  assert.deepEqual(JSON.parse(await readFile(join(root, PROJECT_FILE_NAME), 'utf8')).repositories, [])
  manager.releaseSession(agent)
  assert.equal((await manager.resolveTargetPaths(agent, [join(external, 'new.txt')]))[0].state, 'outside')
  assert.equal(await realpath(external), external)
})
