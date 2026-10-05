import { realpath, rm } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'

const root = await realpath(process.cwd())
const output = resolve(root, 'lib')
const target = await realpath(output).catch(error => {
  if (error.code === 'ENOENT') return output
  throw error
})
const child = relative(root, target)
if (!child || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) {
  throw new Error('Refusing to clean build output outside this package')
}
await rm(output, { recursive: true, force: true })
