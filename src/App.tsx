import { Canvas } from '@react-three/fiber'
import { Conductor } from './engine/Conductor'
import { EffectStack } from './effects/EffectStack'
import { ControlPanel } from './controls/ControlPanel'
import { KeyboardController } from './controls/KeyboardController'
import { HelpOverlay } from './controls/HelpOverlay'
import { useAudioInit } from './hooks/useAudio'
import { Leva } from 'leva'
import { useGlobalStore } from './engine/store'

function AudioInitializer() {
  useAudioInit()
  return null
}

export default function App() {
  const showControls = useGlobalStore((s) => s.showControls)

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

      {/* DOM overlay */}
      <Leva
        hidden={!showControls}
        collapsed={false}
        titleBar={{ title: 'VOID Controls' }}
        theme={{
          sizes: { rootWidth: '320px' },
          colors: {
            elevation1: 'rgba(0, 0, 0, 0.85)',
            elevation2: 'rgba(10, 10, 10, 0.9)',
            elevation3: 'rgba(20, 20, 20, 0.9)',
          },
        }}
      />
      <ControlPanel />
      <KeyboardController />
      <HelpOverlay />
    </>
  )
}
