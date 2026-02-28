import { useCallback, useEffect } from 'react'
import { useGlobalStore } from '../engine/store'

/**
 * useFullscreen — manages fullscreen state via the Fullscreen API.
 */
export function useFullscreen() {
  const isFullscreen = useGlobalStore((s) => s.isFullscreen)
  const setIsFullscreen = useGlobalStore((s) => s.setIsFullscreen)

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen denied
      })
    } else {
      document.exitFullscreen()
    }
  }, [])

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [setIsFullscreen])

  return { isFullscreen, toggleFullscreen }
}
