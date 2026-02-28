import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// ─── Register all scenes ─────────────────────────────────────────────
// Each scene self-registers via registerScene() at import time.
import './scenes/NeuralMesh'
import './scenes/ParticlePhysics'
import './scenes/VoidTunnel'
import './scenes/LiquidMetal'
import './scenes/GlitchMatrix'
import './scenes/SacredGeometry'
import './scenes/Terrain'
import './scenes/Membrane'

// ─── Mount App ───────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
