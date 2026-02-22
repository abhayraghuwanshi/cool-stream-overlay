/**
 * Centralized port configuration for Stream Overlay.
 * 
 * Change ports HERE and they propagate everywhere:
 *   - Vite dev server (frontend)
 *   - Node.js backend (HTTP + WebSocket)
 * 
 * Pick uncommon ports to avoid conflicts with other local services.
 * Range 30000-39999 is rarely used by common apps.
 */

export const PORTS = {
    /** Vite dev server — the OBS Browser Source URL */
    FRONTEND: 3377,

    /** Node.js backend — HTTP API + WebSocket server */
    BACKEND: 3388,
};

export default PORTS;
