/**
 * CrisWorld configuration tool.
 *
 *   npm run world:validate   check every file in world/ and report problems
 *   npm run world:build      validate, then write src/generated/world.json and schemas/
 *
 * Exits with 1 if anything is wrong, so builds and CI stop on broken configuration.
 */
import { join } from 'node:path'
import { buildWorld, formatDiagnostics, validateWorld } from './world-build.ts'

const project = join(import.meta.dirname, '..')
const command = process.argv[2] ?? 'validate'
if (!['validate', 'build'].includes(command)) {
  console.error(`unknown command "${command}": use validate or build`)
  process.exit(2)
}

const started = performance.now()
const result = command === 'build' ? buildWorld(project) : validateWorld(project)
const errors = result.diagnostics.filter((item) => item.level === 'error')
const warnings = result.diagnostics.filter((item) => item.level === 'warning')
if (result.diagnostics.length) console.log(formatDiagnostics([...errors, ...warnings]))

if (errors.length || !result.registry) {
  console.log(`\n✗ ${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`)
  process.exit(1)
}
const { registry } = result
const summary = `${registry.locations.length} locations, ${registry.formations.length} formations, ${Object.keys(registry.assets).length} assets, ${registry.world.locales.length} locales`
const time = `${Math.round(performance.now() - started)} ms`
console.log(command === 'build' ? `✓ built ${summary} in ${time}` : `✓ valid: ${summary} (${time})`)
