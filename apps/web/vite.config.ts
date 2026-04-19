// @ts-nocheck — duplicate Vite typings from hoisted vs apps/web node_modules (monorepo)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    // Resolve modules from workspace root for hoisted dependencies
    preserveSymlinks: true,
    alias: {
      buffer: 'buffer',
      // Map process/browser imports to process (which uses browser.js via package.json browser field)
      'process/browser': 'process',
      stream: 'stream-browserify',
      events: 'events',
    },
    conditions: ['browser', 'module', 'import'],
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['process', 'buffer', 'stream-browserify', 'events'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  // Pin PostCSS explicitly so Tailwind runs reliably when the dev server is started
  // from different working directories or after hoisted dependency layout changes.
  css: {
    postcss: path.resolve(__dirname, 'postcss.config.cjs'),
  },
  server: {
    port: 3000,
    host: true,
    fs: {
      allow: [__dirname, path.resolve(__dirname, '../..')],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
