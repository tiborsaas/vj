import { useRef, useEffect, useState } from 'react'
import { useGlobalStore, useSceneStore } from '../engine/store'
import { sceneRegistry } from '../engine/SceneRegistry'

/**
 * HelpOverlay — shows keyboard shortcuts and current state.
 * Auto-hides in fullscreen after idle.
 */
export function HelpOverlay() {
    const showHelp = useGlobalStore((s) => s.showHelp)
    const transitionType = useSceneStore((s) => s.transitionType)
    const activeSceneId = useSceneStore((s) => s.activeSceneId)
    const [visible, setVisible] = useState(true)
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    const scene = sceneRegistry.get(activeSceneId)

    useEffect(() => {
        const handleMove = () => {
            setVisible(true)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            if (document.fullscreenElement) {
                timeoutRef.current = setTimeout(() => setVisible(false), 3000)
            }
        }

        window.addEventListener('mousemove', handleMove)
        return () => {
            window.removeEventListener('mousemove', handleMove)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    if (!showHelp || !visible) return null

    return (
        <>
            <div className="scene-label">
                {scene?.name ?? activeSceneId} — {transitionType}
            </div>
            <div className="help-overlay">
                <div><kbd>1</kbd>-<kbd>8</kbd> Switch scene</div>
                <div><kbd>F</kbd> Fullscreen</div>
                <div><kbd>H</kbd> Toggle controls</div>
                <div><kbd>T</kbd> Cycle transition</div>
                <div><kbd>[</kbd> <kbd>]</kbd> Intensity</div>
                <div><kbd>←</kbd> <kbd>→</kbd> Hue shift</div>
                <div><kbd>↑</kbd> <kbd>↓</kbd> Speed</div>
                <div><kbd>?</kbd> Toggle help</div>
            </div>
        </>
    )
}
