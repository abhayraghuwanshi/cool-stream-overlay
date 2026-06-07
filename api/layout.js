import { Redis } from '@upstash/redis';

// One small KV store holds the overlay design, keyed per `room`. This replaces
// the old local Node server's layout-settings.json so OBS can load the design
// from an always-on URL with nothing running on your machine.
//
// Env vars (set in the Vercel dashboard — both Upstash-direct and Vercel-KV
// marketplace naming are accepted):
//   UPSTASH_REDIS_REST_URL / KV_REST_API_URL
//   UPSTASH_REDIS_REST_TOKEN / KV_REST_API_TOKEN
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

const keyFor = (room) =>
    `layout:${String(room || 'default').slice(0, 64).replace(/[^\w.-]/g, '_')}`;

export default async function handler(req, res) {
    // The overlay and editor are same-origin in production, but keep CORS open
    // so a separately-hosted frontend (or `vite` dev) can talk to this too.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    const key = keyFor(req.query.room);

    try {
        if (req.method === 'GET') {
            const data = await redis.get(key); // @upstash/redis returns parsed JSON
            res.status(200).json(data || {});
            return;
        }

        if (req.method === 'POST') {
            const body =
                typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
            // `_clientId` was only used to de-dupe WebSocket echoes; drop it.
            const { _clientId, ...patch } = body;
            const existing = (await redis.get(key)) || {};
            const merged = { ...existing, ...patch };
            await redis.set(key, merged);
            res.status(200).json({ ok: true });
            return;
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
