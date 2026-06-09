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

// True when no explicit room was chosen — i.e. we're on the shared default slot
// that every fresh visitor lands on. "Go Live" mints a private room from here.
export function isDefaultRoom() {
    return getRoom() === 'default';
}

// Meeting-style, hard-to-guess, easy-to-say id, e.g. "swift-otter-4821".
const ROOM_ADJECTIVES = ['swift', 'calm', 'bold', 'bright', 'keen', 'brave', 'lucky', 'clever', 'mellow', 'noble', 'quiet', 'rapid', 'sunny', 'vivid', 'witty', 'cosmic'];
const ROOM_NOUNS = ['otter', 'falcon', 'panda', 'tiger', 'heron', 'lynx', 'comet', 'maple', 'river', 'ember', 'pixel', 'cobra', 'raven', 'koala', 'badger', 'nebula'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function newRoomId() {
    return `${pick(ROOM_ADJECTIVES)}-${pick(ROOM_NOUNS)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Write a room id into the current URL without reloading, preserving other
// params (e.g. ?obs). getRoom()/layoutUrl() read it live, so the next save and
// the next poll automatically target the new slot.
export function setRoomInUrl(room) {
    const url = new URL(window.location.href);
    url.searchParams.set('room', room);
    window.history.replaceState(null, '', url);
}

// Editor + OBS links for a given room, absolute so they're copy-pasteable.
export function shareLinks(room) {
    const base = `${window.location.origin}${window.location.pathname}`;
    const q = `room=${encodeURIComponent(room)}`;
    return { editor: `${base}?${q}`, obs: `${base}?obs&${q}` };
}
