import './styles/globals.css'
import './styles/print.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { settingsFromQuery } from '@shared/domain/settings/settings.theme'
import { App } from './App'
import { applyTheme } from './app/theme/apply-theme'

// Thème connu dès le chargement (transmis par main dans l'URL) : pas de flash avant l'IPC.
applyTheme(settingsFromQuery(window.location.search))

const root = document.getElementById('root')
if (!root) throw new Error('#root introuvable dans index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
