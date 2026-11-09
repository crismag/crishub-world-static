/**
 * Serves dist/ the way Hostinger will: static files only, with the MIME types and cache
 * headers from public/.htaccess, and a real 404 for anything missing (no fallback to
 * index.html). For checking a production build locally:
 *
 *   npm run build && npm run serve:dist     → http://localhost:4732
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'

const root = join(import.meta.dirname, '..', 'dist')
const port = Number(process.env.PORT ?? 4732)

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm',
  '.ktx2': 'image/ktx2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
}

/** The same rules as public/.htaccess. */
function cacheControl(path: string): string {
  const name = path.split('/').at(-1) ?? ''
  if (/-[A-Za-z0-9_-]{8}\.(js|css|woff2)$/.test(name)) return 'public, max-age=31536000, immutable'
  if (name === 'index.html' || name === 'build-info.json') return 'no-cache'
  if (path.startsWith('/world-assets/') || path.startsWith('/decoders/')) return 'public, max-age=86400, must-revalidate'
  return 'no-cache'
}

if (!existsSync(join(root, 'index.html'))) {
  console.error('dist/ has no index.html: run `npm run build` first.')
  process.exit(1)
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  let path = decodeURIComponent(url.pathname)
  if (path.endsWith('/')) path += 'index.html'
  const file = normalize(join(root, path))
  const hidden = path.split('/').some((part) => part.startsWith('.'))
  if (!file.startsWith(root + sep) || hidden || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('404 Not Found')
    console.log(`404 ${path}`)
    return
  }
  response.writeHead(200, {
    'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': cacheControl(path),
    'X-Content-Type-Options': 'nosniff',
  })
  createReadStream(file).pipe(response)
}).listen(port, () => console.log(`dist/ served statically at http://localhost:${port}`))
