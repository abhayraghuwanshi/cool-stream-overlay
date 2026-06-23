import { Redis } from '@upstash/redis';
import { SAMPLE_MATCHES, fetchMatches } from '../scores.data.js';

// Read-only score feed for the scoreboard's match picker. Fetches the
// competition's matches from football-data.org, caches the normalized list in
// the same Upstash KV used for layouts (short TTL so live scores stay fresh
// without hammering the 10 req/min free tier), and serves it to the overlay.
//
// Env vars (Vercel dashboard):
//   FOOTBALL_DATA_TOKEN        — your football-data.org API token (required for live data)
//   FOOTBALL_DATA_COMPETITION  — competition code, defaults to WC (World Cup)
//   KV_REST_API_URL / _TOKEN   — same KV as api/layout.js (optional; just disables caching if absent)
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const COMPETITION = process.env.FOOTBALL_DATA_COMPETITION || 'WC';
// Shared snapshot TTL. The KV cache means every viewer reads the same data and
// the upstream feed is hit at most once per TTL no matter how many viewers —
// 10s = up to 6 calls/min, safely under the free tier's 10/min.
const CACHE_TTL = 10; // seconds

let _redis;
function getRedis() {
    if (!REDIS_URL || !REDIS_TOKEN) return null;
    if (!_redis) _redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
    return _redis;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }

    // No token configured → serve sample fixtures so the picker still works.
    if (!TOKEN) {
        res.status(200).json({ configured: false, updatedAt: Date.now(), matches: SAMPLE_MATCHES });
        return;
    }

    const cacheKey = `scores:${COMPETITION}`;
    try {
        const redis = getRedis();
        if (redis) {
            const cached = await redis.get(cacheKey); // parsed JSON
            if (cached) { res.status(200).json(cached); return; }
        }
        const matches = await fetchMatches(TOKEN, COMPETITION);
        const payload = { configured: true, updatedAt: Date.now(), matches };
        if (redis) await redis.set(cacheKey, payload, { ex: CACHE_TTL });
        res.status(200).json(payload);
    } catch (e) {
        // Surface the error but keep the response shape so the UI degrades cleanly.
        res.status(200).json({ configured: true, error: e.message, updatedAt: Date.now(), matches: [] });
    }
}
