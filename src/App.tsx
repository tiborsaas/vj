import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Conductor } from './engine/Conductor'
import { EffectStack } from './effects/EffectStack'
import { KeyboardController } from './controls/KeyboardController'
import { useAudioInit } from './hooks/useAudio'
import { usePresetStore } from './engine/store'
import { SceneBar } from './ui/SceneBar'
import { SceneEditor } from './ui/SceneEditor'
import { AudioMonitor } from './ui/AudioMonitor'
import { factoryPresets } from './presets/factory'
import './ui/ui.css'

function AudioInitializer() {
  useAudioInit()
  return null
}

export default function App() {
  // Seed factory presets on mount — only add ones not already in the store
  // (persisted user edits to existing presets are preserved)
  useEffect(() => {
    const store = usePresetStore.getState()
    for (const preset of factoryPresets) {
      if (!store.presets[preset.id]) store.registerPreset(preset)
    }
  }, [])

  return (
    <>
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 5] }}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      >
        <AudioInitializer />
        <Conductor />
        <EffectStack />
      </Canvas>

      {/* DOM overlay — custom UI */}
      <SceneBar />
      <SceneEditor />
      <AudioMonitor />
      <KeyboardController />
    </>
  )
}
