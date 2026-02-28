import { create } from 'zustand'
import type { TransitionType } from '../types'

// ─── Audio Refs (mutable, never triggers re-render) ──────────────────
// These are READ via refs in useFrame, WRITTEN by AudioAnalyzer

export const audioRefs = {
  bands: new Float32Array(5),      // bass, lowMid, mid, highMid, treble
  amplitude: 0,
  beat: false,
  kick: false,
  snare: false,
  hihat: false,
  waveform: new Float32Array(256),
}

// ─── Clock Refs ──────────────────────────────────────────────────────

export const clockRefs = {
  elapsed: 0,
  delta: 0,
  beat: 0,
  bar: 0,
  phrase: 0,
  beatProgress: 0,
}

// ─── Scene Store ─────────────────────────────────────────────────────

interface SceneState {
  activeSceneId: string
  nextSceneId: string | null
  transitionProgress: number
  transitionType: TransitionType
  transitionDuration: number
  isTransitioning: boolean
  sceneParams: Record<string, Record<string, unknown>>

  // Actions
  setActiveScene: (id: string) => void
  startTransition: (nextId: string, type?: TransitionType, duration?: number) => void
  updateTransitionProgress: (progress: number) => void
  completeTransition: () => void
  setSceneParam: (sceneId: string, key: string, value: unknown) => void
  setSceneParams: (sceneId: string, params: Record<string, unknown>) => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  activeSceneId: 'neural-mesh',
  nextSceneId: null,
  transitionProgress: 0,
  transitionType: 'crossfade',
  transitionDuration: 2.0,
  isTransitioning: false,
  sceneParams: {},

  setActiveScene: (id) => set({ activeSceneId: id }),

  startTransition: (nextId, type, duration) => {
    const state = get()
    if (state.isTransitioning || nextId === state.activeSceneId) return
    set({
      nextSceneId: nextId,
      transitionProgress: 0,
      transitionType: type ?? state.transitionType,
      transitionDuration: duration ?? state.transitionDuration,
      isTransitioning: true,
    })
  },

  updateTransitionProgress: (progress) => set({ transitionProgress: progress }),

  completeTransition: () => {
    const state = get()
    set({
      activeSceneId: state.nextSceneId ?? state.activeSceneId,
      nextSceneId: null,
      transitionProgress: 0,
      isTransitioning: false,
    })
  },

  setSceneParam: (sceneId, key, value) =>
    set((state) => ({
      sceneParams: {
        ...state.sceneParams,
        [sceneId]: { ...state.sceneParams[sceneId], [key]: value },
      },
    })),

  setSceneParams: (sceneId, params) =>
    set((state) => ({
      sceneParams: {
        ...state.sceneParams,
        [sceneId]: { ...state.sceneParams[sceneId], ...params },
      },
    })),
}))

// ─── Global Control Store ────────────────────────────────────────────

interface GlobalState {
  masterIntensity: number
  masterHue: number
  masterSpeed: number
  bpmOverride: number | null
  isFullscreen: boolean
  showControls: boolean
  showHelp: boolean
  audioSource: 'microphone' | 'file'
  audioGain: number
  audioSmoothing: number
  beatSensitivity: number

  // Actions
  setMasterIntensity: (v: number) => void
  setMasterHue: (v: number) => void
  setMasterSpeed: (v: number) => void
  setBpmOverride: (v: number | null) => void
  setIsFullscreen: (v: boolean) => void
  toggleControls: () => void
  toggleHelp: () => void
  setAudioSource: (v: 'microphone' | 'file') => void
  setAudioGain: (v: number) => void
  setAudioSmoothing: (v: number) => void
  setBeatSensitivity: (v: number) => void
}

export const useGlobalStore = create<GlobalState>((set) => ({
  masterIntensity: 1.0,
  masterHue: 0.0,
  masterSpeed: 1.0,
  bpmOverride: null,
  isFullscreen: false,
  showControls: true,
  showHelp: true,
  audioSource: 'microphone',
  audioGain: 1.0,
  audioSmoothing: 0.8,
  beatSensitivity: 0.6,

  setMasterIntensity: (v) => set({ masterIntensity: v }),
  setMasterHue: (v) => set({ masterHue: v }),
  setMasterSpeed: (v) => set({ masterSpeed: v }),
  setBpmOverride: (v) => set({ bpmOverride: v }),
  setIsFullscreen: (v) => set({ isFullscreen: v }),
  toggleControls: () => set((s) => ({ showControls: !s.showControls })),
  toggleHelp: () => set((s) => ({ showHelp: !s.showHelp })),
  setAudioSource: (v) => set({ audioSource: v }),
  setAudioGain: (v) => set({ audioGain: v }),
  setAudioSmoothing: (v) => set({ audioSmoothing: v }),
  setBeatSensitivity: (v) => set({ beatSensitivity: v }),
}))

// ─── Effect Store ────────────────────────────────────────────────────

interface EffectState {
  bloom: { enabled: boolean; intensity: number; threshold: number; radius: number }
  chromaticAberration: { enabled: boolean; offset: number }
  vignette: { enabled: boolean; darkness: number; offset: number }
  noise: { enabled: boolean; opacity: number }
  scanlines: { enabled: boolean; count: number; opacity: number }
  glitch: { enabled: boolean; strength: number }

  setEffect: <K extends keyof EffectState>(
    effect: K,
    params: Partial<EffectState[K]>
  ) => void
  toggleEffect: (effect: keyof Omit<EffectState, 'setEffect' | 'toggleEffect'>) => void
}

export const useEffectStore = create<EffectState>((set) => ({
  bloom: { enabled: true, intensity: 1.5, threshold: 0.6, radius: 0.8 },
  chromaticAberration: { enabled: true, offset: 0.002 },
  vignette: { enabled: true, darkness: 0.7, offset: 0.3 },
  noise: { enabled: true, opacity: 0.08 },
  scanlines: { enabled: false, count: 800, opacity: 0.1 },
  glitch: { enabled: false, strength: 0.3 },

  setEffect: (effect, params) =>
    set((state) => ({
      [effect]: { ...state[effect], ...params },
    })),

  toggleEffect: (effect) =>
    set((state) => {
      const current = state[effect] as { enabled: boolean }
      return {
        [effect]: { ...state[effect], enabled: !current.enabled },
      }
    }),
}))
