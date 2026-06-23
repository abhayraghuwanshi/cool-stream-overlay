import { Redis } from '@upstash/redis';

// Free per-room usage tracking in the same Upstash KV as layouts — Vercel's own
// custom-event analytics are Pro-only, so we count it ourselves.
//   POST { room, uid }  → bump today's load + unique-visitor counters for the room
//   GET  ?days=14[&room=x] → daily { loads, uniques } per room (+ "_all" site total)
// Unique visitors use Redis HyperLogLog (PFADD/PFCOUNT): ~exact, tiny, no PII.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const TTL = 100 * 24 * 60 * 60; // keep ~100 days of daily counters, then auto-expire

let _redis;
function getRedis() {
    if (!REDIS_URL || !REDIS_TOKEN) throw new Error('KV not configured');
    if (!_redis) _redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
    return _redis;
}

const cleanRoom = (r) => String(r || 'default').slice(0, 64).replace(/[^\w.-]/g, '_');
const dayUTC = (d = new Date()) => d.toISOString().slice(0, 10);
const lastNDays = (n) => {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        out.push(dayUTC(d));
    }
    return out;
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }

    try {
        const redis = getRedis();

        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
            const room = cleanRoom(body.room);
            const day = dayUTC();
            const p = redis.pipeline();
            for (const scope of [room, '_all']) {
                const lk = `u:loads:${scope}:${day}`;
                p.incr(lk); p.expire(lk, TTL);
                if (body.uid) {
                    const uk = `u:uniq:${scope}:${day}`;
                    p.pfadd(uk, String(body.uid).slice(0, 64)); p.expire(uk, TTL);
                }
            }
            p.sadd('u:rooms', room);
            await p.exec();
            res.status(200).json({ ok: true });
            return;
        }

        if (req.method === 'GET') {
            // Public aggregate for the landing page — site totals only, never the
            // per-room breakdown or room ids, so no key is required.
            if (req.query.summary !== undefined) {
                const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 14));
                const dates = lastNDays(days);
                const p = redis.pipeline();
                p.scard('u:rooms');
                for (const d of dates) { p.get(`u:loads:_all:${d}`); p.pfcount(`u:uniq:_all:${d}`); }
                const flat = await p.exec();
                const rooms = Number(flat[0]) || 0;
                let i = 1, totalLoads = 0; const byDay = {};
                for (const d of dates) {
                    const loads = Number(flat[i++]) || 0;
                    const uniques = Number(flat[i++]) || 0;
                    byDay[d] = { loads, uniques };
                    totalLoads += loads;
                }
                res.status(200).json({ rooms, days, totalLoads, today: byDay[dates[dates.length - 1]], byDay });
                return;
            }

            // Room ids are meant to be hard to guess, so don't expose the stats
            // (and the room list) to anyone. If USAGE_KEY is set, require it as
            // ?key=…; if it's unset, the endpoint stays open (simple default).
            if (process.env.USAGE_KEY && req.query.key !== process.env.USAGE_KEY) {
                res.status(401).json({ error: 'unauthorized — pass ?key=' });
                return;
            }
            const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 14));
            const dates = lastNDays(days);
            const roomSet = await redis.smembers('u:rooms');
            const only = req.query.room ? cleanRoom(req.query.room) : null;
            const targets = ['_all', ...(only ? [only] : roomSet.filter(r => r !== '_all'))];

            const p = redis.pipeline();
            for (const room of targets) for (const d of dates) {
                p.get(`u:loads:${room}:${d}`);
                p.pfcount(`u:uniq:${room}:${d}`);
            }
            const flat = await p.exec();

            const rooms = {};
            let idx = 0;
            for (const room of targets) {
                const byDay = {};
                let loadsTotal = 0;
                for (const d of dates) {
                    const loads = Number(flat[idx++]) || 0;
                    const uniques = Number(flat[idx++]) || 0;
                    byDay[d] = { loads, uniques };
                    loadsTotal += loads;
                }
                rooms[room] = { total: loadsTotal, byDay };
            }
            res.status(200).json({ days: dates, rooms });
            return;
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
