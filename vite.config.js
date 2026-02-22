import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { PORTS } from './ports.config.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: PORTS.FRONTEND,
    strictPort: true, // Fail if port is already in use instead of silently picking another
  },
})
