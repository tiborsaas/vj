import { usePresetStore, useGlobalStore } from '../engine/store'
import type { TransitionType } from '../types'
import '../ui/ui.css'

const TRANSITION_TYPES: TransitionType[] = ['crossfade', 'dissolve', 'glitch-cut', 'zoom-blur', 'instant']

/**
 * SceneBar — bottom bar showing all presets as selectable cards.
 * Number keys shown as shortcuts.
 */
export function SceneBar() {
  const presets = usePresetStore((s) => s.presets)
  const activePresetId = usePresetStore((s) => s.activePresetId)
  const nextPresetId = usePresetStore((s) => s.nextPresetId)
  const isTransitioning = usePresetStore((s) => s.isTransitioning)
  const startTransition = usePresetStore((s) => s.startTransition)
  const transitionType = usePresetStore((s) => s.transitionType)
  const editorOpen = useGlobalStore((s) => s.editorOpen)
  const audioMonitorOpen = useGlobalStore((s) => s.audioMonitorOpen)
  const toggleEditor = useGlobalStore((s) => s.toggleEditor)
  const toggleAudioMonitor = useGlobalStore((s) => s.toggleAudioMonitor)

  const presetList = Object.values(presets)

  const cycleTransition = () => {
    const currentIdx = TRANSITION_TYPES.indexOf(transitionType)
    const nextIdx = (currentIdx + 1) % TRANSITION_TYPES.length
    usePresetStore.setState({ transitionType: TRANSITION_TYPES[nextIdx] })
  }

  return (
    <div className="scene-bar">
      {presetList.map((preset, index) => {
        const isActive = preset.id === activePresetId
        const isNext = preset.id === nextPresetId
        let className = 'scene-bar__item'
        if (isActive) className += ' scene-bar__item--active'
        if (isNext && isTransitioning) className += ' scene-bar__item--transitioning'

        return (
          <button
            key={preset.id}
            className={className}
            onClick={() => {
              if (!isActive) startTransition(preset.id)
            }}
          >
            <span className="scene-bar__key">{index + 1}</span>
            <span className="scene-bar__name">{preset.name}</span>
            {preset.tags.length > 0 && (
              <span className="scene-bar__tags">{preset.tags.slice(0, 3).join(' · ')}</span>
            )}
          </button>
        )
      })}

      <div className="scene-bar__controls">
        <button
          className={`scene-bar__btn ${editorOpen ? 'scene-bar__btn--active' : ''}`}
          onClick={toggleEditor}
          title="Scene Editor (E)"
        >
          ✎
        </button>
        <button
          className={`scene-bar__btn ${audioMonitorOpen ? 'scene-bar__btn--active' : ''}`}
          onClick={toggleAudioMonitor}
          title="Audio Monitor (A)"
        >
          ♫
        </button>
        <button
          className="scene-bar__btn"
          onClick={cycleTransition}
          title={`Transition: ${transitionType}`}
        >
          ⇌
        </button>
        <button
          className="scene-bar__btn"
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {})
            } else {
              document.exitFullscreen()
            }
          }}
          title="Fullscreen (F)"
        >
          ⛶
        </button>
      </div>
    </div>
  )
}
