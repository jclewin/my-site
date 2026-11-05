import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installViewport } from './utils/viewport'
import './styles/globals.css'
import App from './App.tsx'

installViewport()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
