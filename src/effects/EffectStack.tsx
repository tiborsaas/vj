import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
    EffectComposer,
    Bloom,
    ChromaticAberration,
    Vignette,
    Noise,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { usePresetStore, audioRefs } from '../engine/store'
import * as THREE from 'three'

/**
 * EffectStack — composable post-processing chain.
 * Now reads effects from the active preset instead of a global effect store.
 */
export function EffectStack() {
    const activePreset = usePresetStore((s) => s.presets[s.activePresetId])
    const presetEffects = activePreset?.effects ?? []

    const chromaticOffset = useRef(new THREE.Vector2(0.002, 0.002))
    const bloomIntensityRef = useRef(1.5)

    // Find effects by name
    const bloomCfg = presetEffects.find((e) => e.name === 'bloom')
    const chromaticCfg = presetEffects.find((e) => e.name === 'chromatic')
    const vignetteCfg = presetEffects.find((e) => e.name === 'vignette')
    const noiseCfg = presetEffects.find((e) => e.name === 'noise')

    useFrame(() => {
        // Audio-modulate chromatic aberration
        if (chromaticCfg?.enabled) {
            const baseOffset = ((chromaticCfg.params.offset as number) ?? 0.002) + audioRefs.amplitude * 0.005 + (audioRefs.beat ? 0.01 : 0)
            chromaticOffset.current.set(baseOffset, baseOffset)
        }
        // Audio-modulate bloom
        if (bloomCfg?.enabled) {
            bloomIntensityRef.current = ((bloomCfg.params.intensity as number) ?? 1.5) + audioRefs.amplitude * 0.5
        }
    })

    const effects: React.JSX.Element[] = []

    if (bloomCfg?.enabled) {
        effects.push(
            <Bloom
                key="bloom"
                intensity={bloomIntensityRef.current}
                luminanceThreshold={(bloomCfg.params.threshold as number) ?? 0.6}
                luminanceSmoothing={(bloomCfg.params.radius as number) ?? 0.8}
                mipmapBlur
            />,
        )
    }
    if (chromaticCfg?.enabled) {
        effects.push(
            <ChromaticAberration
                key="chromatic"
                offset={chromaticOffset.current}
                radialModulation={false}
                modulationOffset={0}
                blendFunction={BlendFunction.NORMAL}
            />,
        )
    }
    if (vignetteCfg?.enabled) {
        effects.push(
            <Vignette
                key="vignette"
                darkness={(vignetteCfg.params.darkness as number) ?? 0.7}
                offset={(vignetteCfg.params.offset as number) ?? 0.3}
                blendFunction={BlendFunction.NORMAL}
            />,
        )
    }
    if (noiseCfg?.enabled) {
        effects.push(
            <Noise
                key="noise"
                premultiply
                blendFunction={BlendFunction.ADD}
                opacity={(noiseCfg.params.opacity as number) ?? 0.08}
            />,
        )
    }

    if (effects.length === 0) return null

    return (
        <EffectComposer multisampling={0}>
            {effects}
        </EffectComposer>
    )
}
