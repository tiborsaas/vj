import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { clock } from '../engine/Clock'
import { clockRefs, useGlobalStore } from '../engine/store'
import type { ClockData } from '../types'

/**
 * useClock — provides musical time data inside useFrame.
 * Returns a ref to ClockData that is updated every frame.
 * NEVER triggers re-renders.
 */
export function useClock(): React.RefObject<ClockData> {
  const ref = useRef<ClockData>({
    elapsed: 0,
    delta: 0,
    beat: 0,
    bar: 0,
    phrase: 0,
    beatProgress: 0,
  })

  useFrame((_state, delta) => {
    const speed = useGlobalStore.getState().masterSpeed
    clock.update(delta, speed)

    ref.current.elapsed = clockRefs.elapsed
    ref.current.delta = clockRefs.delta
    ref.current.beat = clockRefs.beat
    ref.current.bar = clockRefs.bar
    ref.current.phrase = clockRefs.phrase
    ref.current.beatProgress = clockRefs.beatProgress
  })

  return ref
}
