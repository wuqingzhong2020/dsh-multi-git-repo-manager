import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, posix, resolve } from 'node:path'

const pkg = JSON.parse(await readFile('package.json', 'utf8'))
await mkdir('dist', { recursive: true })
const npm = execFileSync(process.platform === 'win32' ? 'where.exe' : 'which', ['npm'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0].replace(/npm(?:\.cmd)?$/, 'node_modules/npm/bin/npm-cli.js')
const packed = JSON.parse(execFileSync(process.execPath, [npm, 'pack', '--json', '--pack-destination', 'dist'], { encoding: 'utf8' }))[0]
const files = new Set(packed.files.map(file => file.path))
assert.equal(pkg.version, '0.1.4')
for (const target of Object.values(pkg.exports)) {
  for (const path of typeof target === 'string' ? [target] : Object.values(target)) {
    assert.ok(files.has(path.replace(/^\.\//, '')), `Missing export: ${path}`)
  }
}
for (const path of ['LICENSE', 'cordis.patch.yml', 'README.md', 'README.en.md']) assert.ok(files.has(path), path)
assert.ok(![...files].some(path => path.startsWith('node_modules/') || path.startsWith('tests/') || path.includes('pnpm-workspace')))
assert.ok(!files.has('docs/MULTI_PLUGIN_INTEGRATION_PLAN.md'), 'Temporary plan must not ship')
assert.ok(![...files].some(path => path.includes('repository-manifest')), 'Removed legacy parser must not ship')
assert.ok(!Object.keys(pkg.dependencies).some(name => name.includes('file-review')))
const client = await readFile('lib/client.js', 'utf8')
const imports = [...client.matchAll(/require\("([^"]+)"\)/g)].map(match => match[1])
assert.ok(imports.every(name => ['react', 'react/jsx-runtime', '@deepseek-ai/dsh-client-ui-primitives'].includes(name)), `Unexpected browser imports: ${imports}`)
for (const file of files) {
  if (!file.endsWith('.js') || file === 'lib/client.js') continue
  const source = await readFile(file, 'utf8')
  for (const match of source.matchAll(/(?:from|import)\s*["'](\.[^"']+)["']/g)) {
    assert.ok(files.has(posix.normalize(posix.join(dirname(file).replaceAll('\\', '/'), match[1]))), `Missing chunk: ${file} -> ${match[1]}`)
  }
}
const archive = resolve('dist', packed.filename)
const actual = new Set(execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split(/\r?\n/).map(path => path.replace(/^package\//, '')))
assert.deepEqual(actual, files)
const hash = createHash('sha256').update(await readFile(archive)).digest('hex')
await writeFile(archive + '.sha256', `${hash}  ${packed.filename}\n`)
console.log(`PASS: ${files.size} package entries, all exports and internal chunks verified.\n${archive}\nSHA256 ${hash}`)
