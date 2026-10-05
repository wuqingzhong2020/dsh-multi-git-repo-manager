import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  collectTemporaryRepositories,
  createRepositoryDraft,
  prepareProjectForSave,
} from '../src/client/repository-settings-model.ts'
import { relativeProjectDirectory } from '../src/client/repository-paths.ts'

const project = extra => ({
  name: 'App', root: 'D:/Projects/App', includeProjectRoot: true,
  configFiles: ['legacy.ini'], repositories: ['legacy'], ...extra,
})
const workspace = repositories => ({ project: null, repositories, roots: [], warnings: [] })
const repository = extra => ({
  name: 'Core', path: 'D:/Projects/App/libs/core', relativePath: 'libs/core',
  source: 'manual', state: 'ready', ...extra,
})

function freeze(value) {
  if (value === null || typeof value !== 'object') return value
  Object.values(value).forEach(freeze)
  return Object.freeze(value)
}

test('saving drops incomplete rows, normalizes paths, and leaves the editable draft intact', () => {
  const draft = freeze(project({ name: ' App ', namedRepositories: [
    { name: ' Core ', path: ' d:\\projects\\app\\libs\\core ' },
    { name: ' Outside ', path: '../Shared' },
    { name: '', path: 'libs/unnamed' },
    { name: 'Missing path', path: '  ' },
  ] }))
  const saved = prepareProjectForSave(draft)
  assert.deepEqual(saved, {
    ...project({ name: 'App', enabled: true, configFiles: [], repositories: [] }),
    namedRepositories: [
      { name: 'Core', path: 'libs/core' },
      { name: 'Outside', path: 'D:/Projects/Shared' },
    ],
  })
  assert.equal(draft.name, ' App ')
  assert.equal(draft.namedRepositories.length, 4)
})

test('saving preserves explicit project toggles and supports an empty repository list', () => {
  const draft = project({ enabled: false, includeProjectRoot: false })
  const saved = prepareProjectForSave(draft)
  assert.equal(saved.enabled, false)
  assert.equal(saved.includeProjectRoot, false)
  assert.deepEqual(saved.namedRepositories, [])
  assert.deepEqual(collectTemporaryRepositories(draft), [])
})

test('drafts keep unavailable repositories and source order while excluding the project root', () => {
  const resolved = freeze(workspace([
    repository({ name: 'App', source: 'project', relativePath: '.' }),
    repository({ name: 'Missing', relativePath: 'missing', state: 'missing' }),
    repository({ name: 'Plain directory', relativePath: 'plain', state: 'notGit' }),
    repository({ name: 'Imported', relativePath: 'imported', source: 'legacy.ini' }),
  ]))
  const draft = createRepositoryDraft(freeze(project()), resolved, [])
  assert.deepEqual(draft.namedRepositories, [
    { name: 'Missing', path: 'missing' },
    { name: 'Plain directory', path: 'plain' },
    { name: 'Imported', path: 'imported' },
  ])
  assert.deepEqual(draft.configFiles, [])
  assert.deepEqual(draft.repositories, [])
  assert.equal(draft.enabled, true)
})

test('temporary rows merge by normalized path, retaining the existing displayed name', () => {
  const resolved = freeze(workspace([repository({ name: 'First name', relativePath: 'E:/Shared' })]))
  const temporary = freeze([
    { name: 'Duplicate', path: 'e:\\shared\\.\\' },
    { name: 'New row', path: 'F:/Tools' },
    { name: 'Another duplicate', path: 'f:/tools' },
  ])
  const draft = createRepositoryDraft(project({ enabled: false }), resolved, temporary)
  assert.equal(draft.enabled, false)
  assert.deepEqual(draft.namedRepositories, [
    { name: 'First name', path: 'E:/Shared' },
    { name: 'New row', path: 'F:/Tools' },
  ])
  assert.equal(temporary.length, 3)
  assert.equal(resolved.repositories.length, 1)
})

test('only named external repositories are sent to the session, including parent and other-drive paths', () => {
  const draft = freeze(project({ namedRepositories: [
    { name: 'Root', path: '.' },
    { name: 'Relative child', path: 'libs/core' },
    { name: 'Absolute child', path: 'd:/projects/APP/libs/core' },
    { name: ' Parent ', path: '../Shared' },
    { name: 'Other drive', path: 'E:\\Tools\\.\\' },
    { name: 'Network', path: '\\\\server\\share\\repo' },
    { name: ' ', path: 'E:/Unnamed' },
    { name: 'Empty', path: '' },
  ] }))
  assert.deepEqual(collectTemporaryRepositories(draft), [
    { name: 'Parent', path: 'D:/Projects/Shared' },
    { name: 'Other drive', path: 'E:/Tools' },
    { name: 'Network', path: '//server/share/repo' },
  ])
})

test('POSIX case and sibling prefixes remain outside the project', () => {
  const draft = project({ root: '/work/App', namedRepositories: [
    { name: 'Inside', path: '/work/App/lib' },
    { name: 'Case differs', path: '/work/app/lib' },
    { name: 'Sibling', path: '/work/App-other/lib' },
  ] })
  assert.deepEqual(collectTemporaryRepositories(draft), [
    { name: 'Case differs', path: '/work/app/lib' },
    { name: 'Sibling', path: '/work/App-other/lib' },
  ])
  assert.equal(relativeProjectDirectory('/work/App', '/work/App'), '.')
  assert.equal(relativeProjectDirectory('/work/App', '/work'), null)
})

test('UNC containment respects share boundaries and preserves child spelling', () => {
  assert.equal(relativeProjectDirectory('\\\\server\\share\\App', '//SERVER/SHARE/app/Lib'), 'Lib')
  assert.equal(relativeProjectDirectory('//server/share/App', '//server/other/App/Lib'), null)
  assert.equal(relativeProjectDirectory('//server/share/App', '//other/share/App/Lib'), null)
  assert.equal(relativeProjectDirectory('//server/share/App', '//server/share/App-other/Lib'), null)
  assert.equal(relativeProjectDirectory('App', 'App/Lib'), null)
})
