import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'

const project = join(import.meta.dirname, '..', '..')
const read = (file: string) => readFileSync(join(project, file), 'utf8')

test('3D models decode with the Draco copy this site serves, never a CDN', () => {
  const model = read('src/engine/landmarks/model.tsx')
  expect(model).toMatch(/useGLTF\(path, DRACO_DECODERS\)/)
  expect(model).toMatch(/BASE_URL\}decoders\/draco\//)
  expect(read('vite.config.ts')).toMatch(/fileName: `decoders\/draco\/\$\{name\}`/)
})

test('the hosting configuration never falls back to index.html', () => {
  const htaccess = read('public/.htaccess')
  expect(htaccess).not.toMatch(/RewriteRule|FallbackResource|ErrorDocument\s+404\s+\/?index\.html/i)
  expect(htaccess).toMatch(/index\\\.html\|build-info\\\.json\)\$">\s*\n\s*Header set Cache-Control "no-cache"/)
  expect(htaccess).toMatch(/max-age=31536000, immutable/)
  expect(htaccess).toMatch(/AddType application\/wasm \.wasm/)
  expect(htaccess).toMatch(/AddType model\/gltf-binary \.glb/)
})

test('nothing in the app needs a server: no API calls, no environment secrets', () => {
  const hits = execSync(`grep -rlE "fetch\\(|XMLHttpRequest|WebSocket|EventSource|process\\.env" src --include=*.ts --include=*.tsx || true`, {
    cwd: project,
  })
    .toString()
    .trim()
  expect(hits).toBe('')
})
