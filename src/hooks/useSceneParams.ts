import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSceneStore } from '../engine/store'

/**
 * useSceneParams — reads scene-specific parameters as a ref.
 * Updated every frame from the store without triggering re-renders.
 */
export function useSceneParams<T extends Record<string, unknown>>(
  sceneId: string,
  defaults: T,
): React.RefObject<T> {
  const ref = useRef<T>({ ...defaults })

  useFrame(() => {
    const storeParams = useSceneStore.getState().sceneParams[sceneId]
    if (storeParams) {
      Object.assign(ref.current, defaults, storeParams)
    }
  })

  return ref
}
