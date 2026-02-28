import { useRef, useState, useEffect, Suspense } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useGlobalStore, audioRefs } from '../engine/store'
import { applyBlendToMaterial } from '../utils/blendUtils'
import type { Model3DLayer } from '../types/layers'
import { modelStorage } from '../engine/ModelStorage'

interface Props {
  config: Model3DLayer
}

/**
 * Model3DInner — renders a loaded GLB model with audio reactivity.
 */
function Model3DInner({ config, url }: Props & { url: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const beatAccum = useRef(0)
  const gltf = useLoader(GLTFLoader, url)

  useFrame((state) => {
    if (!groupRef.current) return

    const speed = useGlobalStore.getState().masterSpeed
    const intensity = useGlobalStore.getState().masterIntensity

    if (audioRefs.beat) beatAccum.current = 1.0
    beatAccum.current *= 0.9

    // Auto-rotation
    if (config.autoRotate) {
      groupRef.current.rotation.x += config.rotationSpeed[0] * speed * 0.01
      groupRef.current.rotation.y += config.rotationSpeed[1] * speed * 0.01
      groupRef.current.rotation.z += config.rotationSpeed[2] * speed * 0.01
    }

    // Audio-reactive scale
    if (config.audioReactive) {
      const s = config.scale * (1 + beatAccum.current * 0.2 + audioRefs.amplitude * 0.1)
      groupRef.current.scale.setScalar(s)
    } else {
      groupRef.current.scale.setScalar(config.scale)
    }

    // Apply opacity/intensity and blend mode to all meshes
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        if (mat.opacity !== undefined) {
          mat.transparent = true
          mat.opacity = config.opacity * intensity
        }
        applyBlendToMaterial(mat, config.blendMode)
      }
    })

    void state
  })

  return (
    <group
      ref={groupRef}
      position={config.position}
      rotation={config.rotation}
      scale={config.scale}
    >
      <primitive object={gltf.scene.clone()} />
    </group>
  )
}

/**
 * Model3D — loads a GLB model from IndexedDB and renders it.
 */
export function Model3D({ config }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let url: string | null = null

    modelStorage.getModel(config.modelKey).then((blob) => {
      if (blob) {
        url = URL.createObjectURL(blob)
        setBlobUrl(url)
      } else {
        setError(true)
      }
    }).catch(() => setError(true))

    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [config.modelKey])

  if (error || !blobUrl) return null

  return (
    <Suspense fallback={null}>
      <Model3DInner config={config} url={blobUrl} />
    </Suspense>
  )
}
