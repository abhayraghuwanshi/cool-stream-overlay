/**
 * Backend connection URLs — derived from the centralized port config.
 * 
 * Import this in any React component that needs to talk to the backend.
 * Change the port in /ports.config.js and it propagates here automatically.
 */

const BACKEND_PORT = 3388;

// Local sidecar — used only for inherently-local features (local LLM chat,
// OBS WebSocket control). The layout itself no longer depends on this.
export const BACKEND_HTTP = `http://127.0.0.1:${BACKEND_PORT}`;
export const BACKEND_WS = `ws://127.0.0.1:${BACKEND_PORT}`;

// The local sidecar only exists when you're running on your own machine. From a
// deployed (https) host or inside OBS it's both unreachable and blocked as mixed
// content, so don't even attempt to connect — that's what spams WS errors.
export function hasLocalSidecar() {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '';
}

// ── Hosted layout store ──────────────────────────────────────────────────────
// The overlay design lives in a serverless /api function (Vercel) backed by a
// small KV store — so OBS can load it from an always-on URL with nothing to
// start locally. Defaults to same-origin `/api`; override with VITE_LAYOUT_API
// when the frontend and API are deployed separately (or for `vite` dev).
export const LAYOUT_API = import.meta.env.VITE_LAYOUT_API ?? '/api';

// Which design slot to read/write. Shared between the editor and OBS via the
// `?room=` URL param so both sides talk to the same slot; add a hard-to-guess
// room for privacy since the endpoint is public. Falls back to a build-time
// default, then 'default'.
export function getRoom() {
    const fromUrl = new URLSearchParams(window.location.search).get('room');
    return (fromUrl || import.meta.env.VITE_ROOM || 'default').trim();
}

export function layoutUrl() {
    return `${LAYOUT_API}/layout?room=${encodeURIComponent(getRoom())}`;
}
