/**
 * Asset audit: `npm run assets:audit`
 *
 * Checks the asset manifest against the files on disk and the world that uses them:
 * missing files, files nobody registered, duplicate IDs, unsupported formats, oversized files,
 * missing attribution, filename conventions, and assets nothing refers to.
 * It reports only; it never changes or optimizes an asset.
 *
 * Exits with 1 on errors. Warnings (such as an unused asset) do not fail it.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { AssetManifest } from '../src/runtime/configuration/schema.ts'
import { validateWorld } from './world-build.ts'

const project = join(import.meta.dirname, '..')

/** Formats each asset type may use. */
const FORMATS: Record<string, string[]> = {
  model: ['.glb', '.gltf'],
  texture: ['.webp', '.png', '.jpg', '.jpeg', '.ktx2'],
  image: ['.webp', '.png', '.jpg', '.jpeg', '.svg', '.avif'],
  icon: ['.svg', '.png', '.ico'],
  audio: ['.mp3', '.ogg', '.m4a', '.wav'],
  thumbnail: ['.webp', '.png', '.jpg', '.jpeg', '.avif'],
  environment: ['.hdr', '.webp', '.ktx2'],
  animation: ['.glb', '.json'],
}

/** Size budgets, in kilobytes. Over budget is a warning; far over is an error. */
const BUDGET_KB: Record<string, number> = {
  model: 1500,
  texture: 1024,
  image: 600,
  icon: 64,
  audio: 1500,
  thumbnail: 120,
  environment: 2048,
  animation: 512,
}

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+$/

type Finding = { level: 'error' | 'warning'; message: string }
const findings: Finding[] = []
const error = (message: string) => findings.push({ level: 'error', message })
const warn = (message: string) => findings.push({ level: 'warning', message })

const manifestFile = join(project, 'world/assets/manifest.json')
const parsed = AssetManifest.safeParse(JSON.parse(readFileSync(manifestFile, 'utf8')))
if (!parsed.success) {
  for (const issue of parsed.error.issues) error(`manifest ${issue.path.join('.')}: ${issue.message}`)
  report()
}
const manifest = parsed.data!
const root = join(project, manifest.root)

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  // Server configuration (.htaccess) lives beside the assets but is not an asset.
  return readdirSync(dir).filter((name) => !name.startsWith('.')).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const ids = new Set<string>()
const registered = new Set<string>()
let totalBytes = 0
for (const asset of manifest.assets) {
  if (ids.has(asset.id)) error(`duplicate asset id "${asset.id}"`)
  ids.add(asset.id)
  const file = join(root, asset.path)
  registered.add(file)
  const extension = extname(asset.path).toLowerCase()
  if (!FORMATS[asset.type]?.includes(extension)) error(`${asset.id}: ${extension} is not a supported ${asset.type} format (${FORMATS[asset.type]?.join(', ')})`)
  const name = asset.path.split('/').at(-1) ?? ''
  if (!NAME.test(name)) error(`${asset.id}: "${name}" should be lowercase words joined by hyphens`)
  if (/(?:^|-)(?:final|new|copy|old|\d+)(?:-|\.)/.test(name)) warn(`${asset.id}: "${name}" looks like a version name; describe what it shows instead`)
  if (!existsSync(file)) {
    error(`${asset.id}: file not found at ${relative(project, file)}`)
    continue
  }
  const bytes = statSync(file).size
  totalBytes += bytes
  const budget = (BUDGET_KB[asset.type] ?? 1024) * 1024
  if (bytes > budget * 3) error(`${asset.id}: ${(bytes / 1024).toFixed(0)} KB is far over the ${asset.type} budget of ${budget / 1024} KB`)
  else if (bytes > budget) warn(`${asset.id}: ${(bytes / 1024).toFixed(0)} KB is over the ${asset.type} budget of ${budget / 1024} KB`)
  if (asset.status === 'active' && asset.license !== 'original' && !asset.attribution) error(`${asset.id}: license "${asset.license}" needs an attribution`)
  if (asset.status === 'deprecated') warn(`${asset.id}: deprecated; replace its uses and remove it`)
}

for (const file of walk(root)) {
  if (!registered.has(file)) warn(`${relative(project, file)} is not in the asset manifest`)
}

// Which assets the world actually uses (the compiler warns about unused ones).
const { diagnostics } = validateWorld(project)
for (const item of diagnostics) {
  if (item.file.endsWith('manifest.json') || item.message.startsWith('asset ')) findings.push({ level: item.level, message: item.message })
}

console.log(`${manifest.assets.length} assets, ${(totalBytes / 1024).toFixed(1)} KB, in ${manifest.root}`)
report()

function report(): never {
  for (const item of findings) console.log(`${item.level === 'error' ? 'error  ' : 'warning'} ${item.message}`)
  const errors = findings.filter((item) => item.level === 'error').length
  console.log(errors ? `✗ ${errors} error${errors === 1 ? '' : 's'}` : '✓ assets are in order')
  process.exit(errors ? 1 : 0)
}
