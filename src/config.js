/**
 * Backend connection URLs — derived from the centralized port config.
 * 
 * Import this in any React component that needs to talk to the backend.
 * Change the port in /ports.config.js and it propagates here automatically.
 */

const BACKEND_PORT = 3388;

export const BACKEND_HTTP = `http://127.0.0.1:${BACKEND_PORT}`;
export const BACKEND_WS = `ws://127.0.0.1:${BACKEND_PORT}`;
