import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text3D as DreiText3D, Center } from '@react-three/drei'
import * as THREE from 'three'
import { useGlobalStore, audioRefs } from '../engine/store'
import { getBlendJSXProps } from '../utils/blendUtils'
import type { Text3DLayer } from '../types/layers'

interface Props {
  config: Text3DLayer
}

/**
 * Text3D — extruded 3D text with optional rotation and audio reactivity.
 * Requires a font to be available (uses drei's built-in helvetiker by default).
 */
export function Text3D({ config }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const beatAccum = useRef(0)

  useFrame((state) => {
    if (!groupRef.current) return

    const speed = useGlobalStore.getState().masterSpeed
    const hue = useGlobalStore.getState().masterHue
    const intensity = useGlobalStore.getState().masterIntensity

    if (audioRefs.beat) beatAccum.current = 1.0
    beatAccum.current *= 0.9

    // Auto-rotation
    groupRef.current.rotation.x += config.rotationSpeed[0] * speed * 0.01
    groupRef.current.rotation.y += config.rotationSpeed[1] * speed * 0.01
    groupRef.current.rotation.z += config.rotationSpeed[2] * speed * 0.01

    // Audio-reactive scale
    if (config.audioReactive) {
      const s = 1 + beatAccum.current * 0.3 + audioRefs.amplitude * 0.2
      groupRef.current.scale.setScalar(s)
    }

    // Update emissive color with hue shift
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const emissiveColor = new THREE.Color(config.emissive)
        emissiveColor.offsetHSL(hue, 0, 0)
        child.material.emissive = emissiveColor
        child.material.emissiveIntensity = config.emissiveIntensity * intensity * config.opacity
      }
    })

    void state // used above
  })

  return (
    <group
      ref={groupRef}
      position={config.position}
      rotation={config.rotation}
    >
      <Center>
        <DreiText3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={config.fontSize}
          height={config.depth}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.01}
          bevelSegments={5}
        >
          {config.text}
          <meshStandardMaterial
            key={config.blendMode}
            color={config.color}
            emissive={config.emissive}
            emissiveIntensity={config.emissiveIntensity}
            transparent
            opacity={config.opacity}
            {...(getBlendJSXProps(config.blendMode) as object)}
          />
        </DreiText3D>
      </Center>
    </group>
  )
}
