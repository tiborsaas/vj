'use no memo'
/* eslint-disable react-refresh/only-export-components */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneDescriptor, SceneProps } from '../../types'
import { registerScene } from '../../engine/SceneRegistry'
import { audioRefs } from '../../engine/store'
import { useGlobalStore } from '../../engine/store'
import vertexShader from './vertex.glsl'
import fragmentShader from './fragment.glsl'

function NeuralMeshScene(_props: SceneProps) {
    const meshRef = useRef<THREE.Mesh>(null)

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uBass: { value: 0 },
            uTreble: { value: 0 },
            uAmplitude: { value: 0 },
            uBeat: { value: 0 },
            uHue: { value: 0 },
            uIntensity: { value: 1 },
            uNoiseScale: { value: 1.5 },
            uDisplacement: { value: 1.0 },
        }),
        [],
    )

    const beatAccum = useRef(0)

    useFrame((_state, delta) => {
        const speed = useGlobalStore.getState().masterSpeed
        const hue = useGlobalStore.getState().masterHue
        const intensity = useGlobalStore.getState().masterIntensity

        uniforms.uTime.value += delta * speed
        uniforms.uBass.value += (audioRefs.bands[0] - uniforms.uBass.value) * 0.1
        uniforms.uTreble.value += (audioRefs.bands[4] - uniforms.uTreble.value) * 0.1
        uniforms.uAmplitude.value += (audioRefs.amplitude - uniforms.uAmplitude.value) * 0.1
        uniforms.uHue.value = hue
        uniforms.uIntensity.value = intensity

        // Beat pulse
        if (audioRefs.beat) {
            beatAccum.current = 1.0
        }
        beatAccum.current *= 0.92
        uniforms.uBeat.value = beatAccum.current

        // Slow rotation
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * 0.05 * speed
            meshRef.current.rotation.y += delta * 0.08 * speed
        }
    })

    return (
        <group>
            <mesh ref={meshRef} rotation={[-0.4, 0, 0]}>
                <planeGeometry args={[20, 20, 256, 256]} />
                <shaderMaterial
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                    uniforms={uniforms}
                    wireframe={true}
                    side={THREE.DoubleSide}
                    transparent={true}
                    depthWrite={false}
                />
            </mesh>
        </group>
    )
}

const descriptor: SceneDescriptor = {
    id: 'neural-mesh',
    name: 'Neural Mesh',
    component: NeuralMeshScene,
    defaultParams: {
        noiseScale: { type: 'number', default: 1.5, min: 0.1, max: 5.0, step: 0.1, label: 'Noise Scale' },
        displacement: { type: 'number', default: 1.0, min: 0, max: 3.0, step: 0.1, label: 'Displacement' },
        wireframe: { type: 'boolean', default: true, label: 'Wireframe' },
    },
    defaultEffects: [
        { name: 'bloom', enabled: true, params: { intensity: 2.0, threshold: 0.4 } },
    ],
    tags: ['geometric', 'organic', 'dark', 'mid-energy'],
}

registerScene(descriptor)
export default descriptor
