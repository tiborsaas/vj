'use no memo'
/* eslint-disable react-refresh/only-export-components */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneDescriptor, SceneProps } from '../../types'
import { registerScene } from '../../engine/SceneRegistry'
import { audioRefs, useGlobalStore } from '../../engine/store'

function createWireframeGeometry(geometry: THREE.BufferGeometry): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(geometry)
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
    return new THREE.LineSegments(edges, material)
}

function SacredGeometryScene(_props: SceneProps) {
    const groupRef = useRef<THREE.Group>(null)
    const innerRef = useRef<THREE.Group>(null)
    const midRef = useRef<THREE.Group>(null)
    const outerRef = useRef<THREE.Group>(null)
    const beatAccum = useRef(0)
    const scaleTarget = useRef({ inner: 1, mid: 1.8, outer: 2.8 })

    // Create wireframe solids
    const geometries = useMemo(() => {
        const inner = new THREE.IcosahedronGeometry(1, 0)
        const mid = new THREE.OctahedronGeometry(1, 0)
        const outer = new THREE.DodecahedronGeometry(1, 0)
        return { inner, mid, outer }
    }, [])

    const materials = useMemo(() => ({
        inner: new THREE.LineBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.9, linewidth: 1 }),
        mid: new THREE.LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.7, linewidth: 1 }),
        outer: new THREE.LineBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.5, linewidth: 1 }),
    }), [])

    const edges = useMemo(() => ({
        inner: new THREE.EdgesGeometry(geometries.inner),
        mid: new THREE.EdgesGeometry(geometries.mid),
        outer: new THREE.EdgesGeometry(geometries.outer),
    }), [geometries])

    useFrame((_state, delta) => {
        const speed = useGlobalStore.getState().masterSpeed
        const hue = useGlobalStore.getState().masterHue
        const intensity = useGlobalStore.getState().masterIntensity
        const bass = audioRefs.bands[0]
        const mid = audioRefs.bands[2]
        const treble = audioRefs.bands[4]

        if (audioRefs.beat) {
            beatAccum.current = 1.0
            // On beat: scales briefly match
            scaleTarget.current.inner = 1.8
            scaleTarget.current.mid = 1.8
            scaleTarget.current.outer = 1.8
        } else {
            // Return to natural scales
            scaleTarget.current.inner += (1.0 - scaleTarget.current.inner) * 0.05
            scaleTarget.current.mid += (1.8 - scaleTarget.current.mid) * 0.05
            scaleTarget.current.outer += (2.8 - scaleTarget.current.outer) * 0.05
        }
        beatAccum.current *= 0.92

        // Rotations
        if (innerRef.current) {
            innerRef.current.rotation.x += delta * 0.3 * speed * (1 + treble)
            innerRef.current.rotation.y += delta * 0.5 * speed
            innerRef.current.rotation.z += delta * 0.1 * speed
            const s = scaleTarget.current.inner + bass * 0.3
            innerRef.current.scale.setScalar(s)
        }
        if (midRef.current) {
            midRef.current.rotation.x -= delta * 0.2 * speed
            midRef.current.rotation.y += delta * 0.3 * speed * (1 + mid)
            midRef.current.rotation.z -= delta * 0.15 * speed
            const s = scaleTarget.current.mid + bass * 0.2
            midRef.current.scale.setScalar(s)
        }
        if (outerRef.current) {
            outerRef.current.rotation.x += delta * 0.1 * speed
            outerRef.current.rotation.y -= delta * 0.15 * speed
            outerRef.current.rotation.z += delta * 0.2 * speed * (1 + bass)
            const s = scaleTarget.current.outer + bass * 0.1
            outerRef.current.scale.setScalar(s)
        }

        // Update colors based on hue
        const h1 = (hue + 0.0) % 1.0
        const h2 = (hue + 0.33) % 1.0
        const h3 = (hue + 0.67) % 1.0
        materials.inner.color.setHSL(h1, 0.8, 0.5 + beatAccum.current * 0.3)
        materials.mid.color.setHSL(h2, 0.7, 0.4 + beatAccum.current * 0.2)
        materials.outer.color.setHSL(h3, 0.6, 0.3 + beatAccum.current * 0.15)

        materials.inner.opacity = (0.6 + intensity * 0.4) * (0.8 + beatAccum.current * 0.2)
        materials.mid.opacity = (0.4 + intensity * 0.3)
        materials.outer.opacity = (0.3 + intensity * 0.2)

        // Slow group rotation
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.05 * speed
        }
    })

    return (
        <group ref={groupRef}>
            <group ref={innerRef}>
                <lineSegments geometry={edges.inner} material={materials.inner} />
            </group>
            <group ref={midRef}>
                <lineSegments geometry={edges.mid} material={materials.mid} />
            </group>
            <group ref={outerRef}>
                <lineSegments geometry={edges.outer} material={materials.outer} />
            </group>
        </group>
    )
}

// Suppress unused function warning
void createWireframeGeometry

const descriptor: SceneDescriptor = {
    id: 'sacred-geometry',
    name: 'Sacred Geometry',
    component: SacredGeometryScene,
    defaultParams: {
        rotationSpeed: { type: 'number', default: 1.0, min: 0, max: 3.0, step: 0.1, label: 'Rotation Speed' },
    },
    defaultEffects: [
        { name: 'bloom', enabled: true, params: { intensity: 2.0, threshold: 0.3 } },
    ],
    tags: ['geometric', 'mystical', 'mid-energy', 'elegant'],
}

registerScene(descriptor)
export default descriptor
