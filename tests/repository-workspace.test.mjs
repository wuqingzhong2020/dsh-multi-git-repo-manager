import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { inside, previewProject, resolveManagedWorkspace } from '../src/repository-workspace.ts'
import { absoluteReviewPath, fileRepository, normalizeReviewPath, relativeProjectDirectory, repositoryProjectPath, repositoryRelativePath } from '../src/client/repository-paths.ts'
import { readProjectFile, writeProjectFile, PROJECT_FILE_NAME } from '../src/repository-project-file.ts'
import { managedWorkspaceSchema } from '../src/repository-schemas.ts'
import { MultiGitRepoManager, resolveTargetPaths } from '../lib/index.js'
import { Context } from '@deepseek-ai/cordis'

const sandbox = await mkdtemp(join(tmpdir(), 'dsh-managed-workspace-'))
const contexts = []
after(async () => {
  for (const ctx of contexts) await ctx.fiber.dispose()
  assert.ok(relative(tmpdir(), sandbox).startsWith('dsh-managed-workspace-'))
  await rm(sandbox, { recursive: true, force: true })
})
const project = (root, extra = {}) => ({
  name: '', root, enabled: true, includeProjectRoot: true,
  repositories: [], directories: [], discovery: { containers: [] }, ...extra,
})
async function directory(name, git = false) {
  const root = join(sandbox, name)
  await mkdir(root, { recursive: true })
  if (git) { await mkdir(join(root, '.git')); await writeFile(join(root, '.git', 'HEAD'), 'ref: refs/heads/main\n') }
  return root
}
const manager = store => {
  const ctx = new Context(); contexts.push(ctx)
  return new MultiGitRepoManager(ctx, store)
}
const agent = (cwd, id = cwd) => ({ id, session: { header: { cwd } } })

test('plain aggregate and file-style Git marker have distinct ownership', async () => {
  const root = await directory('worktree'); const worktree = await directory('worktree/child')
  const metadata = await directory('worktree/metadata')
  await writeFile(join(metadata, 'HEAD'), 'ref: refs/heads/main\n')
  await writeFile(join(worktree, '.git'), 'gitdir: ../metadata')
  const workspace = await previewProject(project(root, { repositories: [{ name: 'Child', path: 'child' }, { name: 'Duplicate', path: './child' }] }))
  assert.deepEqual(workspace.targets.map(target => [target.kind, target.state]), [['directory', 'ready'], ['git', 'ready']])
  assert.deepEqual(workspace.roots, [await realpath(root), await realpath(worktree)])
})

test('relative paths resolve independently in separate project files', async () => {
  const a = await directory('same-a'); const b = await directory('same-b')
  await directory('same-a/libs/core', true); await directory('same-b/libs/core', true)
  await writeProjectFile(project(a, { repositories: [{ name: 'A', path: 'libs/core' }] }), '')
  await writeProjectFile(project(b, { repositories: [{ name: 'B', path: 'libs/core' }] }), '')
  const index = [{ root: a }, { root: b }]
  const first = await resolveManagedWorkspace(join(a, 'libs/core'), index)
  const second = await resolveManagedWorkspace(b, index)
  assert.equal(first.repositories[0].name, 'A')
  assert.equal(second.repositories[0].name, 'B')
  assert.ok(!second.roots.includes(await realpath(join(a, 'libs/core'))))
})

test('preview canonicalizes interior paths and keeps exterior rows absolute', async () => {
  const root = await directory('preview', true); const outside = await directory('preview-outside', true)
  await directory('preview/core', true)
  const workspace = await previewProject(project(root, { repositories: [{ name: 'Core', path: join(root, 'core') }, { name: 'Outside', path: outside }] }))
  assert.deepEqual(workspace.project.repositories.map(entry => entry.path), ['core', normalizeReviewPath(outside)])
  assert.equal(workspace.repositories[2].path, await realpath(outside))
})

test('nearest configuration wins and an unrelated indexed project grants no scope', async () => {
  const root = await directory('nearest'); const nested = await directory('nearest/nested', true); const outside = await directory('nearest-outside', true)
  await writeProjectFile(project(root, { repositories: [{ name: 'Nested', path: 'nested' }] }), '')
  await writeProjectFile(project(nested), '')
  assert.equal((await resolveManagedWorkspace(nested, [{ root }])).project.root, await realpath(nested))
  assert.equal((await resolveManagedWorkspace(outside, [{ root }])).project, null)
})

test('disabled nearest file does not fall back to an enabled ancestor index', async () => {
  const root = await directory('disabled'); const child = await directory('disabled/child')
  await writeProjectFile(project(root, { directories: [{ name: 'Child', path: 'child' }] }), '')
  await writeProjectFile(project(child, { enabled: false }), '')
  const workspace = await resolveManagedWorkspace(child, [{ root }])
  assert.equal(workspace.project, null)
  assert.deepEqual(workspace.roots, [await realpath(child)])
})

test('unavailable declarations keep boundaries but never become trusted roots', async () => {
  const root = await directory('unavailable'); await directory('unavailable/core', true); await directory('unavailable/plain')
  const workspace = await previewProject(project(root, { includeProjectRoot: false,
    repositories: ['core', './core', 'missing', 'plain'].map(path => ({ name: path, path })) }))
  assert.deepEqual(workspace.repositories.map(repo => repo.state), ['ready', 'missing', 'notGit'])
  assert.deepEqual(workspace.roots, [await realpath(join(root, 'core'))])
})

test('an index alone cannot enable a missing project file', async () => {
  const root = await directory('index-only', true); const outside = await directory('index-external', true)
  const service = manager({ get: () => ({ projects: [{ root }], revision: 0 }) })
  const page = await service.project(agent(root))
  assert.equal(page.configured, false)
  assert.deepEqual(page.project.repositories, [])
  assert.equal((await service.workspace(agent(root))).project, null)
  await assert.rejects(service.setTemporaryTargets(agent(root), [{ name: 'Outside', path: outside, kind: 'git' }]), /Enable this project/)
})

test('saving fences file revisions, fixes project identity and writes an index of roots only', async () => {
  const a = await directory('save-a', true); const b = await directory('save-b', true)
  await directory('save-a/core', true)
  let settings = { projects: [], revision: 0 }
  const service = manager({ get: () => structuredClone(settings), save: async request => {
    assert.equal(request.revision, settings.revision)
    settings = { projects: request.projects, revision: settings.revision + 1 }; return settings
  } })
  const receiving = agent(a); const page = await service.project(receiving)
  const saved = await service.saveProject(receiving, { project: { ...page.project, name: 'Wire name', repositories: [{ name: 'Core', path: join(a, 'core') }] }, fileRevision: page.fileRevision, revision: page.revision })
  assert.equal(saved.project.name, 'save-a')
  assert.deepEqual(settings.projects, [{ root: await realpath(a) }])
  assert.equal(saved.project.repositories[0].path, 'core')
  assert.equal(JSON.parse(await readFile(join(a, PROJECT_FILE_NAME), 'utf8')).version, 2)
  await assert.rejects(service.saveProject(receiving, { project: saved.project, fileRevision: page.fileRevision, revision: page.revision }), /changed/)
  await assert.rejects(service.saveProject(agent(b), { project: saved.project, fileRevision: '', revision: 0 }), /does not belong/)
})

test('temporary Git targets remain session scoped across saves and explicit release', async () => {
  const root = await directory('temporary', true); const outside = await directory('temporary-external', true)
  await writeProjectFile(project(root), '')
  const service = manager(); const receiving = agent(root, 'A'); const other = agent(root, 'B')
  const entry = { name: 'External', path: outside, kind: 'git' }
  assert.equal((await service.setTemporaryTargets(receiving, [entry])).repositories.at(-1).source, 'temporary')
  assert.ok(!(await service.workspace(other)).roots.includes(await realpath(outside)))
  const page = await service.project(receiving)
  await service.saveProject(receiving, { project: { ...page.project, repositories: [{ name: entry.name, path: entry.path }] }, fileRevision: page.fileRevision, revision: page.revision })
  assert.deepEqual(JSON.parse(await readFile(join(root, PROJECT_FILE_NAME), 'utf8')).repositories, [])
  assert.equal((await service.project(receiving)).temporaryTargets[0].kind, 'git')
  await assert.rejects(service.setTemporaryTargets(receiving, [{ ...entry, path: root }]), /outside the project/)
  await assert.rejects(service.setTemporaryTargets(receiving, [{ ...entry, path: '../temporary-external' }]), /absolute paths/)
  service.releaseSession(receiving)
  assert.deepEqual((await service.project(receiving)).temporaryTargets, [])
  assert.equal(await realpath(outside), outside)
})

test('switching project identity for the same Agent releases its old temporary targets', async () => {
  const a = await directory('switch-a'); const b = await directory('switch-b'); const outside = await directory('switch-external')
  await writeProjectFile(project(a), ''); await writeProjectFile(project(b), '')
  const service = manager(); const receiving = agent(a, 'same-agent')
  await service.setTemporaryTargets(receiving, [{ name: 'External', path: outside, kind: 'directory' }])
  receiving.session.header.cwd = b
  assert.ok(!(await service.workspace(receiving)).roots.includes(await realpath(outside)))
  receiving.session.header.cwd = a
  assert.deepEqual((await service.project(receiving)).temporaryTargets, [])
  const unconfigured = await directory('switch-unconfigured')
  await service.setTemporaryTargets(receiving, [{ name: 'External', path: outside, kind: 'directory' }])
  receiving.session.header.cwd = unconfigured
  assert.equal((await service.workspace(receiving)).project, null)
  receiving.session.header.cwd = a
  assert.deepEqual((await service.project(receiving)).temporaryTargets, [])
})

test('late temporary updates cannot replace the latest set or resurrect released scope', async () => {
  const root = await directory('late-update'); const outside = await directory('late-external')
  await writeProjectFile(project(root), '')
  const service = manager(); const receiving = agent(root, 'late')
  const readProject = service.project.bind(service)
  let resume
  service.project = async current => {
    const page = await readProject(current)
    if (resume === undefined) await new Promise(resolve => { resume = resolve })
    return page
  }
  const old = service.setTemporaryTargets(receiving, [{ name: 'Old', path: outside, kind: 'directory' }])
  // Wait until the old request has read its scope, without changing the manager algorithm.
  while (resume === undefined) await new Promise(resolve => setTimeout(resolve, 1))
  await service.setTemporaryTargets(receiving, [])
  resume(); await old
  assert.deepEqual((await readProject(receiving)).temporaryTargets, [])
  resume = undefined
  const released = service.setTemporaryTargets(receiving, [{ name: 'Released', path: outside, kind: 'directory' }])
  while (resume === undefined) await new Promise(resolve => setTimeout(resolve, 1))
  service.releaseSession(receiving)
  resume(); await released
  assert.deepEqual((await readProject(receiving)).temporaryTargets, [])
})

test('writer omits external absolute, parent and escaping junction declarations', async () => {
  const root = await directory('portable'); const outside = await directory('portable-outside')
  await directory('portable/child', true)
  await symlink(outside, join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
  await writeProjectFile(project(root, { repositories: [
    { name: 'Inside', path: join(root, 'child') }, { name: 'External', path: outside },
    { name: 'Parent', path: '..' }, { name: 'Junction', path: 'linked' },
  ] }), '')
  const loaded = await readProjectFile(root)
  assert.deepEqual(loaded.project.repositories, [{ name: 'Inside', path: 'child' }])
  assert.ok(!('temporaryRepositories' in loaded))
})

test('persisted external targets and invalid configuration fail closed without overwriting', async () => {
  const root = await directory('invalid-file'); const outside = await directory('invalid-external')
  for (const data of [
    { version: 2, includeProjectRoot: true, repositories: [{ name: 'External', path: outside }], directories: [] },
    { version: 2, includeProjectRoot: true, repositories: [], directories: [], discovery: { containers: [outside] } },
    { version: 1, includeProjectRoot: true, repositories: [] },
    { version: 3, includeProjectRoot: true, repositories: [], directories: [] },
    { version: 2, includeProjectRoot: true, repositories: [], directories: [], unknown: true },
  ]) {
    const bytes = JSON.stringify(data)
    await writeFile(join(root, PROJECT_FILE_NAME), bytes)
    await assert.rejects(resolveManagedWorkspace(root, [{ root }]))
    await assert.rejects(writeProjectFile(project(root), ''))
    assert.equal(await readFile(join(root, PROJECT_FILE_NAME), 'utf8'), bytes)
  }
})

test('incomplete snapshots never grant ownership through roots', async () => {
  const root = await directory('incomplete')
  const incomplete = { project: null, repositories: [], roots: [root], warnings: [] }
  assert.equal(managedWorkspaceSchema.safeParse(incomplete).success, false)
  await assert.rejects(resolveTargetPaths(incomplete, root, ['file.txt']))
  const complete = await resolveManagedWorkspace(root, [])
  assert.equal(managedWorkspaceSchema.safeParse(complete).success, true)
  assert.equal((await resolveTargetPaths(complete, root, ['file.txt']))[0].state, 'managed')
})

test('configuration size and aggregate target limits are enforced', async () => {
  const root = await directory('limits')
  await writeFile(join(root, PROJECT_FILE_NAME), ' '.repeat(1024 * 1024 + 1))
  await assert.rejects(readProjectFile(root), /1 MiB/)
  await rm(join(root, PROJECT_FILE_NAME))
  const repositories = Array.from({ length: 512 }, (_, index) => ({ name: String(index), path: String(index) }))
  await assert.rejects(previewProject(project(root, { repositories })), /512/)
  await assert.rejects(writeProjectFile(project(root, { repositories, directories: [{ name: 'Extra', path: 'extra' }] }), ''), /512/)
})

test('containment accepts dot-prefixed names but rejects parent traversal and sibling prefixes', () => {
  assert.equal(inside(join(sandbox, 'a'), join(join(sandbox, 'a'), '..notes', 'file')), true)
  assert.equal(inside(join(sandbox, 'a'), join(sandbox, 'b')), false)
  assert.equal(inside(join(sandbox, 'a'), `${join(sandbox, 'a')}-other`), false)
  assert.equal(inside(join(sandbox, 'a'), join(join(sandbox, 'a'), '..', 'file')), false)
})

test('Windows paths choose the closest repository and disambiguate matching basenames', () => {
  const repos = [
    { name: 'Project', path: 'D:\\Projects\\App', source: 'project', state: 'ready' },
    { name: 'Core', path: 'D:\\Projects\\App\\libs\\core', source: 'manual', state: 'ready' },
  ]
  const path = 'd:/projects/app/libs/core/src/../README.md'
  const owner = fileRepository(path, repos)
  assert.equal(owner.name, 'Core')
  assert.equal(repositoryRelativePath(path, owner), 'README.md')
  assert.equal(fileRepository('D:/Projects/App-other/README.md', repos), undefined)
  assert.equal(normalizeReviewPath('\\\\server\\share\\repo\\./file'), '//server/share/repo/file')
  assert.equal(relativeProjectDirectory('D:\\Projects\\App', 'd:\\projects\\App\\libs\\core'), 'libs/core')
  assert.equal(relativeProjectDirectory('D:\\Projects\\App', 'D:\\Projects\\Shared'), null)
  assert.equal(relativeProjectDirectory('D:\\Projects\\App', 'E:\\Repos\\Core'), null)
  assert.equal(relativeProjectDirectory('\\\\server\\share\\App', '\\\\SERVER\\share\\Core'), null)
  assert.equal(relativeProjectDirectory('\\\\server\\share\\App', '\\\\SERVER\\share\\App\\Core'), 'Core')
  assert.equal(relativeProjectDirectory('D:/Projects/App', 'D:/Projects/App-other'), null)
  assert.equal(relativeProjectDirectory('D:/Projects/App', 'D:/Projects/App/..notes'), '..notes')
  assert.equal(repositoryProjectPath('D:/Projects/App', '../Shared'), 'D:/Projects/Shared')
  assert.equal(repositoryProjectPath('D:/Projects/App', 'D:/Projects/App/./libs/core'), 'libs/core')
  assert.equal(repositoryProjectPath('D:/Projects/App', ''), '')
  assert.equal(repositoryProjectPath('D:/Projects/App', '.'), '.')
  assert.equal(absoluteReviewPath('E:\\Repos\\Core'), true)
  assert.equal(absoluteReviewPath('E:\\'), true)
  assert.equal(absoluteReviewPath('project/PluginManager'), false)
})
