import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir as fsMkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { inside, parseRepositoryManifest, previewProject, resolveReviewWorkspace } from '../src/repository-workspace.ts'
import { absoluteReviewPath, fileRepository, normalizeReviewPath, relativeProjectDirectory, repositoryProjectPath, repositoryRelativePath } from '../src/client/repository-paths.ts'
import { readProjectFile, writeProjectFile, PROJECT_FILE_NAME } from '../src/repository-project-file.ts'
import { MultiGitRepoManager } from '../lib/index.js'

// Fixtures contain valid minimal Git metadata; broken markers are covered separately.
async function mkdir(path, options) {
  const result = await fsMkdir(path, options)
  if (path.endsWith('.git')) await writeFile(join(path, 'HEAD'), 'ref: refs/heads/main\n')
  return result
}
const directory = await mkdtemp(join(tmpdir(), 'dsh-review-repositories-'))
after(async () => {
  const child = relative(tmpdir(), directory)
  assert.ok(child.startsWith('dsh-review-repositories-') && !child.includes(sep))
  await rm(directory, { recursive: true, force: true })
})
const rootA = join(directory, 'project-a')
const rootB = join(directory, 'project-b')
const external = join(directory, 'external')
const unrelated = join(directory, 'unrelated')
for (const repo of [rootA, rootB, external, unrelated, join(rootA, 'libs', 'core'), join(rootB, 'libs', 'core')]) {
  await mkdir(join(repo, '.git'), { recursive: true })
}
const project = (root, extra = {}) => ({ name: '', root, includeProjectRoot: true, configFiles: [], repositories: [], ...extra })

test('INI and .gitmodules import only repository names and paths', () => {
  assert.deepEqual(parseRepositoryManifest('\uFEFF[Core]\r\nurl=private\r\nbranch=main\r\nPATH = libs/core\r\n[submodule "Editor"]\npath="plugins/editor"', 'repos.ini'), [
    { name: 'Core', path: 'libs/core' }, { name: 'Editor', path: 'plugins/editor' },
  ])
  assert.deepEqual(parseRepositoryManifest('[submodule "Tools"]\npath = tools', '.gitmodules'), [{ name: 'Tools', path: 'tools' }])
  assert.throws(() => parseRepositoryManifest('[Core]\nurl=private', 'repos.ini'), /path/)
})

test('JSON repository arrays validate each path and preserve optional names', () => {
  assert.deepEqual(parseRepositoryManifest('{"repositories":[{"name":"Core","path":"libs/core"},"plugins/editor"]}', 'repos.json'), [
    { name: 'Core', path: 'libs/core' }, { name: 'editor', path: 'plugins/editor' },
  ])
  assert.throws(() => parseRepositoryManifest('{"repositories":[{"url":"private"}]}', 'repos.json'), /no path/)
  assert.throws(() => parseRepositoryManifest('arbitrary', 'repos.yaml'), /Supported formats/)
})

test('manifest limits produce warnings without suppressing later valid manifests', async () => {
  const root = join(directory, 'manifest-limits')
  await mkdir(join(root, 'core', '.git'), { recursive: true })
  await writeFile(join(root, 'oversized.ini'), ' '.repeat(1024 * 1024 + 1))
  await writeFile(join(root, 'too-many.json'), JSON.stringify(Array(513).fill('core')))
  await writeFile(join(root, 'invalid.json'), '{"repositories":false}')
  await writeFile(join(root, 'valid.ini'), '[Core]\npath=core')
  const preview = await previewProject(project(root, {
    includeProjectRoot: false,
    configFiles: ['oversized.ini', 'too-many.json', 'invalid.json', 'valid.ini'],
  }))
  assert.deepEqual(preview.warnings, [
    'oversized.ini: Configuration file exceeds 1 MiB',
    'too-many.json: Configuration file exceeds 512 repositories',
    'invalid.json: JSON must contain an array or a repositories array',
  ])
  assert.equal(preview.repositories.length, 1)
  assert.equal(preview.repositories[0].source, 'valid.ini')
  assert.deepEqual(preview.roots, [await realpath(join(root, 'core'))])
})

test('a plain aggregate root and a file-style Git marker retain their distinct ownership rules', async () => {
  const root = join(directory, 'plain-aggregate')
  const worktree = join(root, 'worktree')
  await mkdir(worktree, { recursive: true })
  const gitDir = join(root, 'git-metadata')
  await mkdir(gitDir, { recursive: true })
  await writeFile(join(gitDir, 'HEAD'), 'ref: refs/heads/main\n')
  await writeFile(join(worktree, '.git'), 'gitdir: ../git-metadata')
  const preview = await previewProject(project(root, { repositories: ['worktree', './worktree'] }))
  assert.deepEqual(preview.targets.map(target => [target.kind, target.state]), [['directory', 'ready'], ['git', 'ready']])
  assert.deepEqual(preview.roots, [await realpath(root), await realpath(worktree)])
  const withoutRoot = await previewProject(project(root, {
    includeProjectRoot: false, repositories: ['worktree'],
  }))
  assert.deepEqual(withoutRoot.roots, [await realpath(worktree)])
})

test('different projects resolve identical relative repo paths independently', async () => {
  await writeFile(join(rootA, 'repos.ini'), '[A-Core]\npath=libs/core\n')
  await writeFile(join(rootB, 'repos.json'), '[{"name":"B-Core","path":"libs/core"}]')
  const projects = [project(rootA, { configFiles: ['repos.ini'] }), project(rootB, { configFiles: ['repos.json'] })]
  const a = await resolveReviewWorkspace(join(rootA, 'libs', 'core'), projects)
  const b = await resolveReviewWorkspace(rootB, projects)
  assert.equal(a.repositories[1].name, 'A-Core')
  assert.equal(a.repositories[1].relativePath, 'libs/core')
  assert.equal(a.repositories[1].source, 'repos.ini')
  assert.equal(b.repositories[1].name, 'B-Core')
  assert.equal(b.repositories[1].path, await realpath(join(rootB, 'libs', 'core')))
  assert.ok(!b.roots.includes(await realpath(join(rootA, 'libs', 'core'))))
})

test('preview uses relative paths only inside the project and absolute paths outside', async () => {
  const preview = await previewProject(project(rootA, {
    configFiles: [join(rootA, 'repos.ini')],
    repositories: [join(rootA, 'libs', 'core'), external],
  }))
  assert.deepEqual(preview.project.configFiles, ['repos.ini'])
  assert.deepEqual(preview.project.repositories, ['libs/core', normalizeReviewPath(external)])
  assert.equal(preview.repositories[0].relativePath, '.')
  assert.equal(preview.repositories[1].relativePath, 'libs/core')
  assert.equal(preview.repositories[2].relativePath, normalizeReviewPath(await realpath(external)))
  assert.equal(preview.repositories[2].path, await realpath(external))
  assert.equal(preview.repositories[2].source, 'manual')
})

test('most specific project wins, and configured external-repo sessions find their project', async () => {
  const nested = project(join(rootA, 'libs', 'core'), { name: 'Nested' })
  const aggregate = project(rootA, { repositories: [external] })
  assert.equal((await resolveReviewWorkspace(nested.root, [aggregate, nested])).project.name, 'Nested')
  assert.equal((await resolveReviewWorkspace(external, [aggregate])).project.root, await realpath(rootA))
  assert.equal((await resolveReviewWorkspace(unrelated, [aggregate])).project, null)
})

test('preview deduplicates manifests/manual paths and reports unavailable entries without adding roots', async () => {
  const preview = await previewProject(project(rootA, {
    includeProjectRoot: false, configFiles: ['repos.ini', 'missing.ini'],
    repositories: ['libs/core', 'libs/../libs/core', 'missing', 'libs'],
  }))
  assert.equal(preview.repositories.length, 3)
  assert.equal(preview.repositories.filter(repo => repo.state === 'ready').length, 1)
  assert.equal(preview.repositories.filter(repo => repo.state === 'missing').length, 1)
  assert.equal(preview.repositories.filter(repo => repo.state === 'notGit').length, 1)
  assert.deepEqual(preview.roots, [await realpath(join(rootA, 'libs', 'core'))])
  assert.equal(preview.warnings.length, 1)
})

test('containment accepts dot-prefixed names but rejects parent traversal and sibling prefixes', () => {
  assert.equal(inside(rootA, join(rootA, '..notes', 'file')), true)
  assert.equal(inside(rootA, rootB), false)
  assert.equal(inside(rootA, `${rootA}-other`), false)
  assert.equal(inside(rootA, join(rootA, '..', 'file')), false)
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

test('a legacy profile entry does not enable multi-repository scope without the project file', async () => {
  const agent = { session: { header: { cwd: rootB } } }
  const receiver = Object.create(MultiGitRepoManager.prototype)
  receiver.temporaryTargets = new Map()
  receiver.projectSettings = { get: () => ({ projects: [project(rootB, { repositories: ['libs/core'] })], revision: 0 }) }
  const page = await receiver.project(agent)
  assert.equal(page.configured, false)
  assert.equal(page.workspace.repositories.length, 2) // available for explicit migration
  const active = await receiver.workspace(agent)
  assert.equal(active.project, null)
  assert.equal(active.repositories.length, 0)
  assert.deepEqual(active.roots, [await realpath(rootB)])
  await assert.rejects(receiver.setTemporaryRepositories(agent, [{ name: 'Outside', path: external }]), /Enable this project/)
})

test('the page saves only the receiving session project and cannot change its identity', async () => {
  let settings = { projects: [], revision: 0 }
  const receiver = Object.create(MultiGitRepoManager.prototype)
  receiver.temporaryTargets = new Map()
  receiver.projectSettings = {
    get: () => structuredClone(settings),
    save: async request => {
      assert.equal(request.revision, settings.revision)
      settings = { projects: structuredClone(request.projects), revision: settings.revision + 1 }
      return settings
    },
  }
  const agentA = { id: 'a', session: { header: { cwd: rootA } } }
  const agentB = { id: 'b', session: { header: { cwd: rootB } } }
  const initial = await receiver.project(agentA)
  assert.equal(initial.configured, false)
  assert.equal(initial.workspace.repositories[0].state, 'ready')
  const configuredA = await receiver.saveProject(agentA, {
    revision: initial.revision, fileRevision: initial.fileRevision,
    project: { ...initial.project, name: 'Project A', namedRepositories: [
      { name: 'A-Core', path: join(rootA, 'libs', 'core') }, { name: 'External', path: external },
    ] },
  })
  assert.equal(configuredA.configured, true)
  assert.equal(configuredA.workspace.repositories[1].name, 'A-Core')
  assert.deepEqual(settings.projects[0].configFiles, ['dsh-file-review-repositories.json'])
  assert.equal(configuredA.project.namedRepositories[0].path, 'libs/core')
  assert.deepEqual(JSON.parse(await readFile(join(rootA, 'dsh-file-review-repositories.json'), 'utf8')), {
    version: 1, enabled: true, includeProjectRoot: true, repositories: [
      { name: 'A-Core', path: 'libs/core' },
    ],
  })
  assert.equal((await resolveReviewWorkspace(rootA, [])).repositories[1].name, 'A-Core')
  assert.equal((await receiver.workspace({ id: 'external-session', session: { header: { cwd: external } } })).project, null)
  const beforeB = await receiver.project(agentB)
  assert.equal(beforeB.configured, false)
  await assert.rejects(receiver.saveProject(agentB, {
    revision: beforeB.revision, fileRevision: beforeB.fileRevision, project: configuredA.project,
  }), /does not belong/)
  await receiver.saveProject(agentB, {
    revision: beforeB.revision, fileRevision: beforeB.fileRevision,
    project: { ...beforeB.project, name: 'Project B', namedRepositories: [{ name: 'B-Core', path: 'libs/core' }] },
  })
  assert.equal(settings.projects.length, 2)
  assert.equal((await receiver.project(agentA)).project.name, 'project-a')
  assert.equal((await receiver.project(agentB)).project.name, 'project-b')
  const beforeEdit = await receiver.project(agentA)
  const edited = await receiver.saveProject(agentA, {
    revision: beforeEdit.revision, fileRevision: beforeEdit.fileRevision,
    project: { ...beforeEdit.project, namedRepositories: [{ name: 'Renamed Core', path: 'libs/core' }] },
  })
  assert.equal(edited.workspace.repositories.length, 2)
  assert.equal(edited.workspace.repositories[1].name, 'Renamed Core')
  assert.deepEqual(JSON.parse(await readFile(join(rootA, 'dsh-file-review-repositories.json'), 'utf8')).repositories, [
    { name: 'Renamed Core', path: 'libs/core' },
  ])
  await assert.rejects(receiver.saveProject(agentA, {
    revision: beforeEdit.revision, fileRevision: beforeEdit.fileRevision,
    project: beforeEdit.project,
  }), /changed/)
  const siblingTemporary = { name: 'Temporary sibling', path: external }
  const added = await receiver.setTemporaryRepositories(agentA, [siblingTemporary])
  assert.equal(added.repositories.at(-1).source, 'temporary')
  assert.equal(added.repositories.at(-1).relativePath, normalizeReviewPath(await realpath(external)))
  assert.deepEqual((await receiver.project(agentA)).temporaryRepositories, [{
    name: siblingTemporary.name, path: normalizeReviewPath(await realpath(external)),
  }])
  assert.ok(!(await receiver.workspace(agentB)).roots.includes(await realpath(external)))
  assert.deepEqual((await receiver.project({ ...agentA, id: 'other-a' })).temporaryRepositories, [])
  const currentA = await receiver.project(agentA)
  const savedTemporary = await receiver.saveProject(agentA, {
    revision: currentA.revision, fileRevision: currentA.fileRevision,
    project: { ...currentA.project, namedRepositories: [...currentA.project.namedRepositories, siblingTemporary] },
  })
  assert.equal(savedTemporary.workspace.repositories.at(-1).source, 'temporary')
  assert.deepEqual(JSON.parse(await readFile(join(rootA, PROJECT_FILE_NAME), 'utf8')).repositories, [
    { name: 'Renamed Core', path: 'libs/core' },
  ])
  await assert.rejects(receiver.setTemporaryRepositories(agentA, [{ name: 'Interior', path: join(rootA, 'libs/core') }]), /outside the project/)
  await assert.rejects(receiver.setTemporaryRepositories(agentA, [{ name: 'Relative exterior', path: '../external' }]), /absolute paths/)
  if (process.platform === 'win32') {
    const temporary = { name: 'Temporary', path: 'Z:/repositories/temporary' }
    const withTemporary = await receiver.setTemporaryRepositories(agentA, [temporary])
    assert.equal(withTemporary.repositories.at(-1).source, 'temporary')
    const current = await receiver.project(agentA)
    await receiver.saveProject(agentA, {
      revision: current.revision, fileRevision: current.fileRevision,
      project: { ...current.project, namedRepositories: [...current.project.namedRepositories, temporary] },
    })
    assert.deepEqual(JSON.parse(await readFile(join(rootA, 'dsh-file-review-repositories.json'), 'utf8')).repositories, [
      { name: 'Renamed Core', path: 'libs/core' },
    ])
  }
})

test('directory picker keeps parent, sibling, and other-volume directories absolute', async () => {
  const projectRoot = rootA
  const subRepo = join(rootA, 'libs', 'core')
  const crossVolumeRepo = process.platform === 'win32'
    ? (rootA.toUpperCase().startsWith('Z:') ? 'Y:' : 'Z:') + '\\external\\repo'
    : '/other-volume/external/repo'

  // Relative conversion
  const relSub = relativeProjectDirectory(projectRoot, subRepo)
  assert.equal(relSub, 'libs/core')
  assert.equal(relativeProjectDirectory(projectRoot, external), null)
  assert.equal(relativeProjectDirectory(projectRoot, directory), null)
  assert.equal(repositoryProjectPath(projectRoot, '../external'), normalizeReviewPath(external))

  // Cannot convert to relative cross-drive / cross-volume
  if (process.platform === 'win32') {
    const relCross = relativeProjectDirectory(projectRoot, crossVolumeRepo)
    assert.equal(relCross, null)

    const finalCrossPath = relCross ?? normalizeReviewPath(crossVolumeRepo)
    assert.equal(absoluteReviewPath(finalCrossPath), true)
  }
})

test('configuration writer omits external absolute, parent traversal, and junction paths', async () => {
  const root = join(directory, 'portable-project')
  await mkdir(join(root, 'child', '.git'), { recursive: true })
  await symlink(external, join(root, 'linked-external'), process.platform === 'win32' ? 'junction' : 'dir')
  const repositories = [
    { name: 'Inside absolute', path: join(root, 'child') },
    { name: 'Outside absolute', path: external },
    { name: 'Outside relative', path: '../external' },
    { name: 'Parent', path: '..' },
    { name: 'External junction', path: 'linked-external' },
  ]
  await writeProjectFile(project(root, { namedRepositories: repositories }), '')
  const data = JSON.parse(await readFile(join(root, PROJECT_FILE_NAME), 'utf8'))
  assert.deepEqual(data.repositories, [{ name: 'Inside absolute', path: 'child' }])
  const read = await readProjectFile(root)
  assert.deepEqual(read.temporaryRepositories, [])
  assert.deepEqual(read.project.namedRepositories, data.repositories)
})

test('legacy external entries migrate as temporary rows without enabling external scope', async () => {
  const root = join(directory, 'legacy-file')
  await mkdir(join(root, '.git'), { recursive: true })
  await writeFile(join(root, PROJECT_FILE_NAME), JSON.stringify({
    version: 1, includeProjectRoot: true,
    repositories: [{ name: 'Old external', path: '../external' }],
  }))
  const receiver = Object.create(MultiGitRepoManager.prototype)
  receiver.temporaryTargets = new Map()
  receiver.projectSettings = { get: () => ({
    revision: 0, projects: [project(root, { configFiles: [PROJECT_FILE_NAME] })],
  }) }
  const agent = { id: 'legacy', session: { header: { cwd: root } } }
  const page = await receiver.project(agent)
  assert.equal(page.configured, true)
  assert.deepEqual(page.project.namedRepositories, [])
  assert.deepEqual(page.temporaryRepositories, [{ name: 'Old external', path: normalizeReviewPath(await realpath(external)) }])
  assert.ok(!page.workspace.roots.includes(await realpath(external)))
  const separate = { id: 'separate', session: { header: { cwd: external } } }
  assert.equal((await receiver.workspace(separate)).project, null)
  const saved = await receiver.saveProject(agent, { project: page.project, revision: page.revision, fileRevision: page.fileRevision })
  assert.deepEqual(JSON.parse(await readFile(join(root, PROJECT_FILE_NAME), 'utf8')).repositories, [])
  assert.deepEqual(saved.temporaryRepositories, [])
})

test('nested conversations load and update the nearest project configuration', async () => {
  const root = join(directory, 'nested-project')
  const child = join(root, 'nested', 'repo')
  await mkdir(join(child, '.git'), { recursive: true })
  await writeProjectFile(project(root, { namedRepositories: [{ name: 'Child', path: 'nested/repo' }] }), '')
  const receiver = Object.create(MultiGitRepoManager.prototype)
  receiver.temporaryTargets = new Map()
  const agent = { id: 'nested', session: { header: { cwd: child } } }
  const page = await receiver.project(agent)
  assert.equal(page.configured, true)
  assert.equal(page.project.root, await realpath(root))
  assert.equal(page.project.name, 'nested-project')
  const saved = await receiver.saveProject(agent, {
    project: { ...page.project, namedRepositories: [{ name: 'Renamed', path: 'nested/repo' }] },
    revision: page.revision, fileRevision: page.fileRevision,
  })
  assert.equal(saved.configured, true)
  assert.equal((await readProjectFile(root)).project.namedRepositories[0].name, 'Renamed')
  assert.equal(await readProjectFile(child), null)
})

test('enabled variable in configuration file decides whether multi-repository is active', async () => {
  const { readProjectFile, writeProjectFile } = await import('../src/repository-project-file.ts')
  const testRoot = join(directory, 'project-enabled-test')
  await mkdir(join(testRoot, '.git'), { recursive: true })
  await mkdir(join(testRoot, 'sub', '.git'), { recursive: true })

  // 1. Initial write with enabled: true
  const initialProject = {
    name: 'TestProject',
    root: testRoot,
    enabled: true,
    includeProjectRoot: true,
    configFiles: [],
    repositories: [],
    namedRepositories: [{ name: 'Sub', path: 'sub' }],
  }
  const rev1 = await writeProjectFile(initialProject, '')
  const read1 = await readProjectFile(testRoot)
  assert.equal(read1.project.enabled, true)

  const activeWs = await resolveReviewWorkspace(testRoot, [])
  assert.equal(activeWs.repositories.length, 2) // root + sub

  // 2. Disable multi-repository management with enabled: false
  const rev2 = await writeProjectFile({ ...initialProject, enabled: false }, rev1)
  const read2 = await readProjectFile(testRoot)
  assert.equal(read2.project.enabled, false)

  // With enabled: false, resolveReviewWorkspace falls back to single-directory
  const inactiveWs = await resolveReviewWorkspace(testRoot, [])
  assert.equal(inactiveWs.project, null)
  assert.equal(inactiveWs.repositories.length, 0)
  assert.deepEqual(inactiveWs.roots, [await realpath(testRoot)])
})
