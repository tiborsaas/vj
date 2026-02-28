import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { audioAnalyzer } from '../engine/AudioAnalyzer'
import { audioRefs, useGlobalStore } from '../engine/store'
import type { AudioData } from '../types'

/**
 * useAudio — provides audio-reactive data inside useFrame.
 * Returns a ref to AudioData that is updated every frame.
 * NEVER triggers re-renders.
 */
export function useAudio(): React.RefObject<AudioData> {
  const ref = useRef<AudioData>({
    bands: audioRefs.bands,
    amplitude: audioRefs.amplitude,
    beat: audioRefs.beat,
    waveform: audioRefs.waveform,
    kick: audioRefs.kick,
    snare: audioRefs.snare,
    hihat: audioRefs.hihat,
  })

  useFrame((_state, delta) => {
    // Sync global store settings to analyzer every frame (cheap, avoids subscriptions)
    const gs = useGlobalStore.getState()
    audioAnalyzer.setGain(gs.audioGain)
    audioAnalyzer.setSmoothing(gs.audioSmoothing)
    audioAnalyzer.setBeatSensitivity(gs.beatSensitivity)

    // Run analyzer (updates audioRefs)
    audioAnalyzer.analyze(delta)

    // Sync ref object (same Float32Array references, updated scalars)
    ref.current.amplitude = audioRefs.amplitude
    ref.current.beat = audioRefs.beat
    ref.current.kick = audioRefs.kick
    ref.current.snare = audioRefs.snare
    ref.current.hihat = audioRefs.hihat
  })

  return ref
}

/**
 * useAudioInit — initializes the audio analyzer.
 * Call once at app level.
 */
export function useAudioInit() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Initialize mic. Falls back to demo mode on denial.
    audioAnalyzer.initMicrophone()

    return () => {
      audioAnalyzer.dispose()
    }
  }, [])
}
