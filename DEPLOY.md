# Deploying the overlay (Vercel, no local server)

The overlay design used to require the local Node backend (`backend/server.js`)
to be running — if it wasn't, OBS loaded the **default** layout. The design now
lives in a serverless function (`api/layout.js`) backed by a small KV store, so
OBS loads it from an always-on URL with nothing running on your machine.

> The local `backend/` is still used for the **local LLM chat** and **OBS
> WebSocket control** only. Those are inherently local and unaffected.

## One-time setup

1. **Push the repo to GitHub** and import it into Vercel
   (vercel.com → Add New → Project). Vercel auto-detects Vite + the `api/` folder.

2. **Add a Redis KV store** for layout storage:
   - In the Vercel project → **Storage** → create an **Upstash Redis** database
     (free tier is fine), or create one at upstash.com.
   - Connect it to the project. Vercel injects the credentials as env vars.
     `api/layout.js` accepts either naming:
     - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, or
     - `KV_REST_API_URL` / `KV_REST_API_TOKEN`

3. **Deploy.** You'll get a URL like `https://stream-overlay.vercel.app`.

## Using it

- **OBS Browser Source URL:** `https://<your-app>.vercel.app/?room=<your-room>`
- **Editor:** open the same URL in your browser, switch to edit mode, design.
  Every change POSTs to `/api/layout`; OBS polls `GET /api/layout` every ~2s and
  picks it up.

The `?room=` value is a private slot id. The editor and OBS **must use the same
room** to share a design. Pick something hard to guess (e.g. `?room=abhay-x9f2`)
since the endpoint is public — anyone with the exact room URL can read/overwrite
that slot. No `?room=` ⇒ the shared `default` slot.

> **Cameras / screen feeds** still can't render inside an OBS *browser* source —
> they're captured in your editing tab's context. Add those as native OBS
> sources (Video Capture / Display Capture); the browser overlay carries your
> graphics (text, clock, logo, tasks, social, background).

## Local development

Plain `vite` does **not** run the Vercel `/api` functions, so without help every
save would 404 and state would be lost on reload. Pick one:

- **`npm run dev` (default, offline)** — `vite.config.js` includes a dev-only
  middleware that emulates `/api/layout`, persisting to a local `.dev-layouts.json`
  (per `room`, gitignored). No Upstash/Vercel needed. State survives reloads.
  Use a consistent `?room=` across reloads (no param ⇒ the `default` room).
  This local store is separate from production KV.
- **`vercel dev`** — runs the real `api/` functions against the real KV
  (production-accurate; needs the env vars above via `vercel env pull`).
- **`vite` against the deployed API** — create `.env.local` with
  `VITE_LAYOUT_API=https://<your-app>.vercel.app/api` to read/write cloud KV
  from a local frontend.
