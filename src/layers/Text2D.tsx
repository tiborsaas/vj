import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useGlobalStore, audioRefs } from '../engine/store'
import { getThreeBlending } from '../utils/blendUtils'
import type { Text2DLayer } from '../types/layers'

interface Props {
  config: Text2DLayer
}

/**
 * Text2D — screen-space text rendered via drei's Text (SDF/MSDF).
 * Supports audio-reactive scale, opacity, position, and rotation.
 */
export function Text2D({ config }: Props) {
  const textRef = useRef<THREE.Mesh>(null)
  const beatAccum = useRef(0)

  useFrame(() => {
    if (!textRef.current) return

    const intensity = useGlobalStore.getState().masterIntensity

    if (audioRefs.beat) beatAccum.current = 1.0
    beatAccum.current *= 0.9

    if (config.audioReactive) {
      switch (config.audioProperty) {
        case 'scale': {
          const s = 1 + audioRefs.amplitude * 0.5 + beatAccum.current * 0.3
          textRef.current.scale.setScalar(s)
          break
        }
        case 'opacity': {
          const mat = textRef.current.material as THREE.MeshBasicMaterial
          if (mat && 'opacity' in mat) {
            mat.opacity = config.opacity * (0.3 + audioRefs.amplitude * 0.7)
          }
          break
        }
        case 'position': {
          textRef.current.position.x = config.position[0] + Math.sin(audioRefs.amplitude * Math.PI) * 0.2
          textRef.current.position.y = config.position[1] + beatAccum.current * 0.1
          break
        }
        case 'rotation': {
          textRef.current.rotation.z = config.rotation + audioRefs.amplitude * 0.5
          break
        }
      }
    }

    // Always apply intensity and ensure correct blend mode
    const mat = textRef.current.material as THREE.MeshBasicMaterial
    if (mat) {
      if (config.audioProperty !== 'opacity') {
        mat.opacity = config.opacity * intensity
      }
      // Lazily sync blend mode (cheap comparison, no shader recompile needed)
      const targetBlending = getThreeBlending(config.blendMode)
      if (mat.blending !== targetBlending) {
        mat.blending = targetBlending
        mat.transparent = config.blendMode !== 'normal'
        mat.needsUpdate = true
      }
    }
  })

  return (
    <Text
      ref={textRef}
      position={[config.position[0], config.position[1], 0]}
      rotation={[0, 0, config.rotation]}
      fontSize={config.fontSize}
      color={config.color}
      anchorX="center"
      anchorY="middle"
      font={config.fontFamily || undefined}
      material-transparent
      material-opacity={config.opacity}
      material-depthTest={false}
    >
      {config.text}
    </Text>
  )
}
