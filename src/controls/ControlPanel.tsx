import { useControls, folder } from 'leva'
import { useSceneStore, useGlobalStore, useEffectStore } from '../engine/store'
import { sceneRegistry } from '../engine/SceneRegistry'
import type { TransitionType } from '../types'

/**
 * ControlPanel — Leva-based live control interface.
 * Renders as a DOM overlay above the canvas.
 */
export function ControlPanel() {
    const showControls = useGlobalStore((s) => s.showControls)

    if (!showControls) return null

    return (
        <>
            <SceneControls />
            <GlobalControls />
            <EffectControls />
        </>
    )
}

function SceneControls() {
    const scenes = sceneRegistry.getAll()
    const sceneOptions = scenes.reduce<Record<string, string>>((acc, s) => {
        acc[s.name] = s.id
        return acc
    }, {})

    const activeSceneId = useSceneStore((s) => s.activeSceneId)

    useControls('Scene', () => ({
        'Active Scene': {
            value: activeSceneId,
            options: sceneOptions,
            onChange: (value: string) => {
                const store = useSceneStore.getState()
                if (value !== store.activeSceneId) {
                    store.startTransition(value)
                }
            },
        },
        'Transition Type': {
            value: useSceneStore.getState().transitionType,
            options: {
                'Crossfade': 'crossfade' as TransitionType,
                'Dissolve': 'dissolve' as TransitionType,
                'Glitch Cut': 'glitch-cut' as TransitionType,
                'Zoom Blur': 'zoom-blur' as TransitionType,
                'Instant': 'instant' as TransitionType,
            },
            onChange: (value: TransitionType) => {
                useSceneStore.setState({ transitionType: value })
            },
        },
        'Transition Duration': {
            value: useSceneStore.getState().transitionDuration,
            min: 0.1,
            max: 8.0,
            step: 0.1,
            onChange: (value: number) => {
                useSceneStore.setState({ transitionDuration: value })
            },
        },
    }))

    return null
}

function GlobalControls() {
    useControls('Global', () => ({
        'Master': folder({
            'Intensity': {
                value: useGlobalStore.getState().masterIntensity,
                min: 0,
                max: 3,
                step: 0.01,
                onChange: (v: number) => useGlobalStore.getState().setMasterIntensity(v),
            },
            'Hue Shift': {
                value: useGlobalStore.getState().masterHue,
                min: 0,
                max: 1,
                step: 0.01,
                onChange: (v: number) => useGlobalStore.getState().setMasterHue(v),
            },
            'Speed': {
                value: useGlobalStore.getState().masterSpeed,
                min: 0.1,
                max: 3,
                step: 0.01,
                onChange: (v: number) => useGlobalStore.getState().setMasterSpeed(v),
            },
        }),
        'Audio': folder({
            'Gain': {
                value: useGlobalStore.getState().audioGain,
                min: 0,
                max: 5,
                step: 0.1,
                onChange: (v: number) => useGlobalStore.getState().setAudioGain(v),
            },
            'Smoothing': {
                value: useGlobalStore.getState().audioSmoothing,
                min: 0,
                max: 0.99,
                step: 0.01,
                onChange: (v: number) => useGlobalStore.getState().setAudioSmoothing(v),
            },
            'Beat Sensitivity': {
                value: useGlobalStore.getState().beatSensitivity,
                min: 0.1,
                max: 1.0,
                step: 0.05,
                onChange: (v: number) => useGlobalStore.getState().setBeatSensitivity(v),
            },
        }),
    }))

    return null
}

function EffectControls() {
    useControls('Effects', () => ({
        'Bloom': folder({
            'Enabled': {
                value: useEffectStore.getState().bloom.enabled,
                onChange: (v: boolean) => useEffectStore.getState().setEffect('bloom', { enabled: v }),
            },
            'Intensity': {
                value: useEffectStore.getState().bloom.intensity,
                min: 0,
                max: 5,
                step: 0.1,
                onChange: (v: number) => useEffectStore.getState().setEffect('bloom', { intensity: v }),
            },
            'Threshold': {
                value: useEffectStore.getState().bloom.threshold,
                min: 0,
                max: 1,
                step: 0.01,
                onChange: (v: number) => useEffectStore.getState().setEffect('bloom', { threshold: v }),
            },
        }),
        'Chromatic Aberration': folder({
            'Enabled': {
                value: useEffectStore.getState().chromaticAberration.enabled,
                onChange: (v: boolean) => useEffectStore.getState().setEffect('chromaticAberration', { enabled: v }),
            },
            'Offset': {
                value: useEffectStore.getState().chromaticAberration.offset,
                min: 0,
                max: 0.05,
                step: 0.001,
                onChange: (v: number) => useEffectStore.getState().setEffect('chromaticAberration', { offset: v }),
            },
        }),
        'Vignette': folder({
            'Enabled': {
                value: useEffectStore.getState().vignette.enabled,
                onChange: (v: boolean) => useEffectStore.getState().setEffect('vignette', { enabled: v }),
            },
            'Darkness': {
                value: useEffectStore.getState().vignette.darkness,
                min: 0,
                max: 1,
                step: 0.01,
                onChange: (v: number) => useEffectStore.getState().setEffect('vignette', { darkness: v }),
            },
        }),
        'Noise': folder({
            'Enabled': {
                value: useEffectStore.getState().noise.enabled,
                onChange: (v: boolean) => useEffectStore.getState().setEffect('noise', { enabled: v }),
            },
            'Opacity': {
                value: useEffectStore.getState().noise.opacity,
                min: 0,
                max: 0.5,
                step: 0.01,
                onChange: (v: number) => useEffectStore.getState().setEffect('noise', { opacity: v }),
            },
        }),
    }))

    return null
}
