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

Plain `vite` does **not** serve `/api`. Two options:

- Run `vercel dev` — serves the Vite app and the `api/` functions together
  (needs the env vars above, e.g. via `vercel env pull`).
- Or keep using `vite` and point at your deployed API by creating `.env.local`:

  ```
  VITE_LAYOUT_API=https://<your-app>.vercel.app/api
  ```
