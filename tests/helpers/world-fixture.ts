import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { compileWorld } from '../../src/runtime/configuration/compile.ts'
import { checkTerrain } from '../../src/engine/terrain/checks.ts'

const project = join(import.meta.dirname, '..', '..')

/**
 * A scratch copy of the real world/ (and its assets) that a test can change freely, then
 * compile. Each test gets its own copy, so they never affect each other or the real files.
 */
export function scratchWorld() {
  const root = mkdtempSync(join(tmpdir(), 'crisworld-'))
  cpSync(join(project, 'world'), join(root, 'world'), { recursive: true })
  cpSync(join(project, 'public/world-assets'), join(root, 'public/world-assets'), { recursive: true })
  const path = (file: string) => join(root, 'world', file)
  return {
    root,
    read: <T = unknown>(file: string): T => JSON.parse(readFileSync(path(file), 'utf8')) as T,
    write(file: string, content: unknown) {
      mkdirSync(dirname(path(file)), { recursive: true })
      writeFileSync(path(file), typeof content === 'string' ? content : JSON.stringify(content, null, 2))
    },
    edit<T = Record<string, unknown>>(file: string, change: (data: T) => void) {
      const data = JSON.parse(readFileSync(path(file), 'utf8')) as T
      change(data)
      writeFileSync(path(file), JSON.stringify(data, null, 2))
    },
    remove(file: string) {
      rmSync(path(file), { recursive: true, force: true })
    },
    compile() {
      const result = compileWorld(join(root, 'world'), root)
      const errors = result.diagnostics.filter((item) => item.level === 'error')
      const warnings = result.diagnostics.filter((item) => item.level === 'warning')
      return { ...result, errors, warnings, messages: errors.map((item) => item.message).join('\n') }
    },
    geography() {
      const { registry } = compileWorld(join(root, 'world'), root)
      return registry ? checkTerrain(registry) : null
    },
    dispose() {
      rmSync(root, { recursive: true, force: true })
    },
  }
}

export type ScratchWorld = ReturnType<typeof scratchWorld>
