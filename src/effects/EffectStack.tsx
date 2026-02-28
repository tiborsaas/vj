'use no memo'
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
import { useEffectStore } from '../engine/store'
import { audioRefs } from '../engine/store'
import * as THREE from 'three'

/**
 * EffectStack — composable post-processing chain with audio reactivity.
 * Reads from effectStore for configuration, audioRefs for real-time modulation.
 */
export function EffectStack() {
    const bloom = useEffectStore((s) => s.bloom)
    const chromatic = useEffectStore((s) => s.chromaticAberration)
    const vignette = useEffectStore((s) => s.vignette)
    const noise = useEffectStore((s) => s.noise)

    const chromaticOffset = useRef(new THREE.Vector2(0.002, 0.002))
    const bloomIntensity = useRef(bloom.intensity)

    useFrame(() => {
        // Audio-modulate chromatic aberration
        const beatBoost = audioRefs.beat ? 0.01 : 0
        const baseOffset = chromatic.offset + audioRefs.amplitude * 0.005 + beatBoost
        chromaticOffset.current.set(baseOffset, baseOffset)

        // Audio-modulate bloom
        bloomIntensity.current = bloom.intensity + audioRefs.amplitude * 0.5
    })

    // Build effects array — EffectComposer needs non-conditional children
    const effects: React.JSX.Element[] = []

    if (bloom.enabled) {
        effects.push(
            <Bloom
                key="bloom"
                intensity={bloomIntensity.current}
                luminanceThreshold={bloom.threshold}
                luminanceSmoothing={bloom.radius}
                mipmapBlur
            />,
        )
    }
    if (chromatic.enabled) {
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
    if (vignette.enabled) {
        effects.push(
            <Vignette
                key="vignette"
                darkness={vignette.darkness}
                offset={vignette.offset}
                blendFunction={BlendFunction.NORMAL}
            />,
        )
    }
    if (noise.enabled) {
        effects.push(
            <Noise
                key="noise"
                premultiply
                blendFunction={BlendFunction.ADD}
                opacity={noise.opacity}
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
