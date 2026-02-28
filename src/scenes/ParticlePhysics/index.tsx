'use no memo'
/* eslint-disable react-refresh/only-export-components */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneDescriptor, SceneProps } from '../../types'
import { registerScene } from '../../engine/SceneRegistry'
import { audioRefs, useGlobalStore } from '../../engine/store'

const PARTICLE_COUNT = 50000

function ParticlePhysicsScene(_props: SceneProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null)
    const dummy = useMemo(() => new THREE.Object3D(), [])

    // Particle state stored in typed arrays for performance
    const particleState = useMemo(() => {
        const positions = new Float32Array(PARTICLE_COUNT * 3)
        const velocities = new Float32Array(PARTICLE_COUNT * 3)
        const colors = new Float32Array(PARTICLE_COUNT * 3)

        // Initial sphere distribution
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)
            const r = 2 + Math.random() * 2

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
            positions[i * 3 + 2] = r * Math.cos(phi)

            velocities[i * 3] = (Math.random() - 0.5) * 0.02
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02

            colors[i * 3] = 0.5
            colors[i * 3 + 1] = 0.2
            colors[i * 3 + 2] = 0.8
        }

        return { positions, velocities, colors }
    }, [])

    // Attractor positions
    const attractors = useRef([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2, 1, -1),
        new THREE.Vector3(-2, -1, 1),
    ])

    const beatAccum = useRef(0)

    useFrame((_state, delta) => {
        if (!meshRef.current) return

        const speed = useGlobalStore.getState().masterSpeed
        const intensity = useGlobalStore.getState().masterIntensity
        const bass = audioRefs.bands[0]
        const amplitude = audioRefs.amplitude
        const dt = Math.min(delta * speed, 0.05) // cap delta to avoid explosions

        // Beat: randomize attractor positions
        if (audioRefs.beat) {
            beatAccum.current = 1.0
            for (const a of attractors.current) {
                a.set(
                    (Math.random() - 0.5) * 6,
                    (Math.random() - 0.5) * 6,
                    (Math.random() - 0.5) * 6,
                )
            }
        }
        beatAccum.current *= 0.95

        const gravity = (0.5 + bass * 3.0) * intensity
        const { positions, velocities, colors } = particleState

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const ix = i * 3
            const iy = ix + 1
            const iz = ix + 2

            // Gravitational pull toward attractors
            for (const attractor of attractors.current) {
                const dx = attractor.x - positions[ix]
                const dy = attractor.y - positions[iy]
                const dz = attractor.z - positions[iz]
                const distSq = dx * dx + dy * dy + dz * dz + 0.1
                const force = gravity / distSq

                velocities[ix] += dx * force * dt
                velocities[iy] += dy * force * dt
                velocities[iz] += dz * force * dt
            }

            // Damping
            const damping = 0.98
            velocities[ix] *= damping
            velocities[iy] *= damping
            velocities[iz] *= damping

            // Update position
            positions[ix] += velocities[ix] * dt * 60
            positions[iy] += velocities[iy] * dt * 60
            positions[iz] += velocities[iz] * dt * 60

            // Color from velocity magnitude
            const velMag = Math.sqrt(
                velocities[ix] * velocities[ix] +
                velocities[iy] * velocities[iy] +
                velocities[iz] * velocities[iz],
            )
            const colorT = Math.min(velMag * 20, 1.0)
            colors[ix] = 0.1 + colorT * 0.9 // R
            colors[iy] = 0.05 + colorT * 0.3 // G
            colors[iz] = 0.8 - colorT * 0.4 // B

            // Update instance
            dummy.position.set(positions[ix], positions[iy], positions[iz])
            const scale = (0.01 + velMag * 0.5 + amplitude * 0.02) * intensity
            dummy.scale.setScalar(scale)
            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)

            // Set instance color
            meshRef.current.setColorAt(
                i,
                new THREE.Color(colors[ix], colors[iy], colors[iz]),
            )
        }

        meshRef.current.instanceMatrix.needsUpdate = true
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true
        }
    })

    return (
        <group>
            <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
                <sphereGeometry args={[1, 4, 4]} />
                <meshBasicMaterial
                    toneMapped={false}
                    transparent
                    opacity={0.8}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>
        </group>
    )
}

const descriptor: SceneDescriptor = {
    id: 'particle-physics',
    name: 'Particle Physics',
    component: ParticlePhysicsScene,
    defaultParams: {
        particleCount: { type: 'number', default: 50000, min: 10000, max: 100000, step: 1000, label: 'Particles' },
        gravity: { type: 'number', default: 1.0, min: 0, max: 5.0, step: 0.1, label: 'Gravity' },
    },
    defaultEffects: [
        { name: 'bloom', enabled: true, params: { intensity: 2.5, threshold: 0.2 } },
    ],
    tags: ['particles', 'physics', 'high-energy', 'dark'],
}

registerScene(descriptor)
export default descriptor
