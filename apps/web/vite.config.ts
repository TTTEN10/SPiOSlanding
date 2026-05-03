// @ts-nocheck — duplicate Vite typings from hoisted vs apps/web node_modules (monorepo)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Vite injects `<script type="module">` before extracted CSS; that ordering causes FOUC / “unstyled” first paint. */
function cssBeforeModuleScriptPlugin() {
  return {
    name: 'css-before-module-script',
    enforce: 'post',
    transformIndexHtml(html: string) {
      const linkTag = html.match(
        /<link\s+rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"[^>]*\/?>/i
      )
      const scriptTag = html.match(
        /<script\s+type="module"[^>]*src="\/assets\/[^"]+\.js"[^>]*>\s*<\/script>/i
      )
      if (!linkTag || !scriptTag || linkTag.index === undefined || scriptTag.index === undefined) {
        return html
      }
      if (linkTag.index < scriptTag.index) return html
      let out = html.replace(linkTag[0], '').replace(scriptTag[0], '')
      out = out.replace(/<\/head>/i, `    ${linkTag[0]}\n    ${scriptTag[0]}\n  </head>`)
      return out
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react(), cssBeforeModuleScriptPlugin()],
  ssr: {
    // Ensure SSR bundle uses the ESM build (avoids Node ESM/CJS interop issues).
    noExternal: ['react-helmet-async'],
  },
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
  server: {
    port: 3000,
    host: true,
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
