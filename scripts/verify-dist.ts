/**
 * Checks that dist/ is a self-contained static site, and reports what visitors download.
 *
 *   npm run build && npm run verify:dist
 *
 * - every file index.html and the CSS refer to exists, with relative paths;
 * - no file refers to localhost, a dev server, or source files;
 * - nothing is fetched from another site at runtime (only well-known library strings);
 * - the Hostinger configuration and build stamp are present;
 * - no server-side code (PHP, Node entry points) is in the output.
 * Exits with 1 if anything is wrong.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const root = join(import.meta.dirname, '..', 'dist')
const problems: string[] = []

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}
const files = walk(root)
const rel = (file: string) => relative(root, file).replace(/\\/g, '/')
const text = (file: string) => readFileSync(file, 'utf8')

// Required files.
for (const required of ['index.html', '.htaccess', 'build-info.json', 'decoders/draco/draco_wasm_wrapper.js', 'decoders/draco/draco_decoder.wasm']) {
  if (!files.some((file) => rel(file) === required)) problems.push(`missing ${required}`)
}

// No server-side code.
for (const file of files) {
  if (/\.(php|phtml|cgi|py|rb)$/.test(file) || /(^|\/)(server|api)\.(js|mjs|cjs)$/.test(rel(file))) problems.push(`server-side file in the build: ${rel(file)}`)
}

// References from index.html and CSS resolve, and are relative.
const html = text(join(root, 'index.html'))
for (const [, ref] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (!ref || /^https?:/.test(ref)) continue
  if (ref.startsWith('/')) problems.push(`index.html uses an absolute path (${ref}); the site would break in a subfolder`)
  if (!files.some((file) => rel(file) === ref.replace(/^\.\//, '').replace(/^\//, ''))) problems.push(`index.html refers to a missing file: ${ref}`)
}
for (const css of files.filter((file) => file.endsWith('.css'))) {
  for (const [, ref] of text(css).matchAll(/url\(([^)]+)\)/g)) {
    const clean = (ref ?? '').replace(/["']/g, '')
    if (clean.startsWith('data:') || clean.startsWith('#')) continue
    if (!files.some((file) => rel(file) === join('assets', clean).replace(/\\/g, '/').replace('assets/./', 'assets/'))) {
      if (!files.some((file) => rel(file).endsWith(clean.replace(/^\.\//, '')))) problems.push(`${rel(css)} refers to a missing file: ${clean}`)
    }
  }
}

// No development-only or local references.
const code = files.filter((file) => /\.(js|html|css|json)$/.test(file) && !rel(file).startsWith('decoders/'))
for (const file of code) {
  const body = text(file)
  for (const pattern of [/\blocalhost\b/, /127\.0\.0\.1/, /\/@vite\/client/, /\/src\/[a-z]/, /\/@react-refresh/]) {
    if (pattern.test(body)) problems.push(`${rel(file)} mentions ${pattern.source}`)
  }
  for (const [url] of body.matchAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`)]*/gi)) {
    // Library documentation, error-message, license-banner, and XML namespace strings are not requests.
    if (/^https?:\/\/(www\.w3\.org|react\.dev|github\.com|opencollective\.com|reactjs\.org|threejs\.org|tailwindcss\.com|docs\.pmnd\.rs)/.test(url)) continue
    // drei's built-in Draco decoder default. It is never used: src/engine/landmarks/model.tsx always
    // passes the copy this site serves (decoders/draco/), and a test checks that it does.
    if (rel(file).startsWith('assets/model-') && url.startsWith('https://www.gstatic.com/draco/')) continue
    problems.push(`${rel(file)} refers to another site: ${url}`)
  }
}

// What visitors download.
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`
const gz = (file: string) => gzipSync(readFileSync(file)).length
const entryScripts = [...html.matchAll(/<script[^>]+src="\.\/([^"]+)"/g)].map((match) => match[1]!)
const preloads = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\.\/([^"]+)"/g)].map((match) => match[1]!)
const styles = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\.\/([^"]+)"/g)].map((match) => match[1]!)
const upFront = [...new Set([...entryScripts, ...preloads, ...styles, 'index.html'])]
const sizeOf = (names: string[]) => names.reduce((sum, name) => sum + gz(join(root, name)), 0)
const contentFiles = files.filter((file) => /assets\/[a-z0-9-]+-[A-Za-z0-9_-]{8}\.js$/.test(rel(file)) && !upFront.includes(rel(file)) && !/\/(index|vendor-|model|rolldown)/.test(rel(file)))
const model = files.filter((file) => /assets\/model-/.test(rel(file)))

console.log('Up front (gzipped):')
for (const name of upFront) console.log(`  ${name.padEnd(42)} ${kb(gz(join(root, name)))}`)
console.log(`  ${'total'.padEnd(42)} ${kb(sizeOf(upFront))}`)
console.log(`On demand: ${contentFiles.length} content files, ${kb(contentFiles.reduce((sum, file) => sum + gz(file), 0))} gzipped in all`)
console.log(`Only if a 3D model is shown: model loader ${kb(model.reduce((sum, file) => sum + gz(file), 0))}, Draco decoder ${kb(statSync(join(root, 'decoders/draco/draco_decoder.wasm')).size)}`)
console.log(`Whole site on disk: ${kb(files.reduce((sum, file) => sum + statSync(file).size, 0))} in ${files.length} files`)

if (problems.length) {
  for (const problem of problems) console.log(`✗ ${problem}`)
  process.exit(1)
}
console.log('✓ dist/ is a self-contained static site')
