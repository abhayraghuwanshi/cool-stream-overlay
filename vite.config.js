import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import { PORTS } from './ports.config.js'
import { SAMPLE_MATCHES, fetchMatches } from './scores.data.js'

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

// Dev-only stand-in for api/scores.js — same reason as localLayoutApi: Vite's
// dev server doesn't run `/api` functions. Fetches live matches when a token is
// set (FOOTBALL_DATA_TOKEN in .env.local), else serves the sample fixtures so
// the match picker works fully offline.
function localScoresApi(token, competition) {
  let cache = null // { at, payload } — shared 10s snapshot, mirrors api/scores.js KV cache
  const TTL = 10_000
  return {
    name: 'local-scores-api',
    configureServer(server) {
      server.middlewares.use('/api/scores', async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }
        if (req.method !== 'GET') return next()
        res.setHeader('Content-Type', 'application/json')
        if (!token) {
          return res.end(JSON.stringify({ configured: false, updatedAt: Date.now(), matches: SAMPLE_MATCHES }))
        }
        const now = Date.now()
        if (cache && now - cache.at < TTL) return res.end(JSON.stringify(cache.payload))
        try {
          const matches = await fetchMatches(token, competition)
          const payload = { configured: true, updatedAt: now, matches }
          cache = { at: now, payload }
          res.end(JSON.stringify(payload))
        } catch (e) {
          if (cache) return res.end(JSON.stringify(cache.payload)) // serve stale on error
          res.end(JSON.stringify({ configured: true, error: e.message, updatedAt: now, matches: [] }))
        }
      })
    },
  }
}

// Dev-only stand-in for api/usage.js — same reason as the others. File-backed
// (.dev-usage.json) so `npm run dev` counts work offline without touching the
// production KV; uniques use a plain id set here instead of HyperLogLog.
function localUsageApi() {
  const file = path.resolve('.dev-usage.json')
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return { loads: {}, uniq: {}, rooms: [] } } }
  const write = (d) => { try { fs.writeFileSync(file, JSON.stringify(d, null, 2)) } catch { /* ignore */ } }
  const clean = (r) => String(r || 'default').slice(0, 64).replace(/[^\w.-]/g, '_')
  const day = () => new Date().toISOString().slice(0, 10)
  return {
    name: 'local-usage-api',
    configureServer(server) {
      server.middlewares.use('/api/usage', (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }
        res.setHeader('Content-Type', 'application/json')
        const store = read()
        store.loads ??= {}; store.uniq ??= {}; store.rooms ??= []

        if (req.method === 'POST') {
          let body = ''
          req.on('data', c => { body += c })
          req.on('end', () => {
            let d = {}; try { d = JSON.parse(body || '{}') } catch { /* ignore */ }
            const room = clean(d.room), today = day()
            for (const scope of [room, '_all']) {
              const lk = `${scope}:${today}`
              store.loads[lk] = (store.loads[lk] || 0) + 1
              if (d.uid) { store.uniq[lk] ??= []; if (!store.uniq[lk].includes(d.uid)) store.uniq[lk].push(d.uid) }
            }
            if (!store.rooms.includes(room)) store.rooms.push(room)
            write(store)
            res.end(JSON.stringify({ ok: true }))
          })
          return
        }

        if (req.method === 'GET') {
          const url = new URL(req.url, 'http://localhost')
          const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days'), 10) || 14))
          const dates = []
          for (let i = days - 1; i >= 0; i--) { const dt = new Date(); dt.setUTCDate(dt.getUTCDate() - i); dates.push(dt.toISOString().slice(0, 10)) }
          if (url.searchParams.has('summary')) {
            let totalLoads = 0; const byDay = {}
            for (const d of dates) {
              const loads = store.loads[`_all:${d}`] || 0
              byDay[d] = { loads, uniques: (store.uniq[`_all:${d}`] || []).length }
              totalLoads += loads
            }
            res.end(JSON.stringify({ rooms: store.rooms.length, days, totalLoads, today: byDay[dates[dates.length - 1]], byDay }))
            return
          }
          const targets = ['_all', ...store.rooms.filter(r => r !== '_all')]
          const rooms = {}
          for (const room of targets) {
            const byDay = {}; let total = 0
            for (const d of dates) {
              const lk = `${room}:${d}`
              const loads = store.loads[lk] || 0
              byDay[d] = { loads, uniques: (store.uniq[lk] || []).length }
              total += loads
            }
            rooms[room] = { total, byDay }
          }
          res.end(JSON.stringify({ days: dates, rooms }))
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      localLayoutApi(),
      localScoresApi(env.FOOTBALL_DATA_TOKEN, env.FOOTBALL_DATA_COMPETITION || 'WC'),
      localUsageApi(),
    ],
    server: {
      port: PORTS.FRONTEND,
      strictPort: true, // Fail if port is already in use instead of silently picking another
      watch: {
        ignored: ['**/backend/layout-settings.json', '**/.dev-layouts.json', '**/.dev-usage.json'],
      },
    },
  }
})
