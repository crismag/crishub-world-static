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

export default defineConfig({
  plugins: [crisWorld(), react(), tailwindcss()],
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
