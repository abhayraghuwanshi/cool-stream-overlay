import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import { PORTS } from './ports.config.js'

// Dev-only stand-in for the Vercel serverless function `api/layout.js`. Vite's
// dev server doesn't run `/api` functions, so without this every save 404s and
// state is lost on reload. This middleware mirrors the function's behaviour but
// persists to a local JSON file (per `room`) — so `npm run dev` works fully
// offline, no Upstash/Vercel needed. Production still uses api/layout.js.
function localLayoutApi() {
  const file = path.resolve('.dev-layouts.json')
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return {} } }
  const write = (data) => { try { fs.writeFileSync(file, JSON.stringify(data, null, 2)) } catch { /* ignore */ } }
  const roomOf = (url) => {
    const raw = new URL(url || '/', 'http://localhost').searchParams.get('room') || 'default'
    return raw.slice(0, 64).replace(/[^\w.-]/g, '_')
  }
  return {
    name: 'local-layout-api',
    configureServer(server) {
      server.middlewares.use('/api/layout', (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }

        const store = read()
        const room = roomOf(req.originalUrl || req.url)

        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify(store[room] || {}))
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', c => { body += c })
          req.on('end', () => {
            let data = {}
            try { data = JSON.parse(body || '{}') } catch { /* ignore */ }
            const { _clientId, ...patch } = data
            store[room] = { ...(store[room] || {}), ...patch }
            write(store)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          })
          return
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localLayoutApi()],
  server: {
    port: PORTS.FRONTEND,
    strictPort: true, // Fail if port is already in use instead of silently picking another
    watch: {
      ignored: ['**/backend/layout-settings.json', '**/.dev-layouts.json'],
    },
  },
})
