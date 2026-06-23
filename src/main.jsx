import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { track } from '@vercel/analytics'
import './index.css'
import App from './App.jsx'
import { getRoom } from './config'

// One usage event per page load so the Vercel Analytics dashboard can break
// usage down by room and by surface — the OBS browser source (?obs/?clean) vs
// the interactive editor page. track() is a no-op in dev / on localhost, so this
// only reports from the deployed site. (Enable Web Analytics in the Vercel
// dashboard to see both this and the built-in visitor/page-view counts.)
const _params = new URLSearchParams(window.location.search)
const _surface = _params.has('obs') || _params.has('clean') ? 'obs' : 'editor'
track('overlay_open', { room: getRoom(), surface: _surface })

createRoot(document.getElementById('root')).render(
  <>
    <App />
    <Analytics />
  </>
)

