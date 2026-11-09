import { execSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { buildWorld, formatDiagnostics } from './scripts/world-build.ts'

const project = import.meta.dirname

/**
 * Keeps src/generated/world.json in step with world/: compiles it when the dev server or a
 * build starts, and again whenever a file under world/ changes. Broken configuration stops
 * a build and shows its problems in the dev server's terminal and overlay.
 */
function crisWorld(): Plugin {
  const compile = () => {
    const result = buildWorld(project)
    if (result.errors.length) throw new Error(`world/ has problems:\n${formatDiagnostics(result.errors)}`)
    return result
  }
  return {
    name: 'crisworld-config',
    buildStart() {
      compile()
    },
    configureServer(server) {
      const worldDir = path.join(project, 'world')
      server.watcher.add(worldDir)
      const onChange = (file: string) => {
        if (!file.startsWith(worldDir)) return
        try {
          const result = compile()
          server.config.logger.info(`world/ rebuilt (${result.registry?.locations.length ?? 0} locations)`, { timestamp: true })
        } catch (cause) {
          server.config.logger.error((cause as Error).message, { timestamp: true })
          server.ws.send({ type: 'error', err: { message: (cause as Error).message, stack: '' } })
        }
      }
      server.watcher.on('change', onChange)
      server.watcher.on('add', onChange)
      server.watcher.on('unlink', onChange)
    },
  }
}

/** Three.js's Draco decoder, served from this site instead of Google's CDN. */
const DRACO_DIR = path.join(project, 'node_modules/three/examples/jsm/libs/draco/gltf')
const DRACO_FILES = ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']

/**
 * Everything the static site needs beyond the app bundle:
 * - the Draco decoder at decoders/draco/, fetched only if a compressed 3D model is shown;
 * - build-info.json, a small stamp saying what was built and when, for checking a deployment.
 */
function staticSite(): Plugin {
  return {
    name: 'crisworld-static-site',
    configureServer(server) {
      server.middlewares.use('/decoders/draco/', (request, response, next) => {
        const name = (request.url ?? '').replace(/^\//, '').split('?')[0] ?? ''
        if (!DRACO_FILES.includes(name)) return next()
        response.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript')
        response.end(readFileSync(path.join(DRACO_DIR, name)))
      })
    },
    generateBundle() {
      for (const name of DRACO_FILES) {
        this.emitFile({ type: 'asset', fileName: `decoders/draco/${name}`, source: readFileSync(path.join(DRACO_DIR, name)) })
      }
      const git = (command: string) => {
        try {
          return execSync(command, { cwd: project, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
        } catch {
          return null
        }
      }
      const pkg = JSON.parse(readFileSync(path.join(project, 'package.json'), 'utf8')) as { version: string }
      const contentDir = path.join(project, 'src/generated/content')
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.json',
        source: `${JSON.stringify(
          {
            app: 'crisworld',
            version: pkg.version,
            commit: git('git rev-parse --short HEAD'),
            uncommittedChanges: git('git status --porcelain') ? true : false,
            builtAt: new Date().toISOString(),
            contentBundles: readdirSync(contentDir).length,
          },
          null,
          2,
        )}\n`,
      })
    },
  }
}

export default defineConfig({
  plugins: [crisWorld(), staticSite(), react(), tailwindcss()],
  build: {
    // The globe's libraries are large but rarely change. Splitting them out lets browsers keep
    // them cached across content and app updates, which then download only the small app file.
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-three', test: /node_modules[\\/]three[\\/]/, priority: 30 },
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(project, './src'),
    },
  },
  base: './',
  server: {
    host: '0.0.0.0',
    port: 4731,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4731,
    strictPort: true,
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    testTimeout: 30000,
  },
})
