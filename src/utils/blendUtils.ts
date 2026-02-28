import * as THREE from 'three'
import type { LayerBlendMode } from '../types/layers'

// ─── Blend Mode Utilities ─────────────────────────────────────────────

/**
 * Map a LayerBlendMode to the corresponding Three.js Blending constant.
 * 'screen' uses CustomBlending — pair with applyBlendToMaterial or getBlendJSXProps
 * to also set blendSrc / blendDst for the screen formula.
 */
export function getThreeBlending(mode: LayerBlendMode): THREE.Blending {
  switch (mode) {
    case 'additive': return THREE.AdditiveBlending
    case 'multiply': return THREE.MultiplyBlending
    case 'screen':   return THREE.CustomBlending
    default:         return THREE.NormalBlending
  }
}

/**
 * Returns JSX-spreadable material props for a given blend mode.
 * Spread these onto any R3F JSX material element, and add
 * key={config.blendMode} to the material so it re-creates when mode changes.
 */
export function getBlendJSXProps(mode: LayerBlendMode): Record<string, unknown> {
  const blending   = getThreeBlending(mode)
  const transparent = mode !== 'normal'

  if (mode === 'screen') {
    return {
      blending,
      transparent,
      blendSrc:      THREE.OneFactor,
      blendDst:      THREE.OneMinusSrcColorFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcColorFactor,
    }
  }

  return { blending, transparent }
}

/**
 * Imperatively apply a blend mode to a Three.js Material instance.
 * Use this when traversing child materials (e.g. loaded GLTF meshes).
 */
export function applyBlendToMaterial(mat: THREE.Material, mode: LayerBlendMode): void {
  mat.blending   = getThreeBlending(mode)
  mat.transparent = mode !== 'normal'

  if (mode === 'screen') {
    mat.blendSrc      = THREE.OneFactor
    mat.blendDst      = THREE.OneMinusSrcColorFactor
    mat.blendSrcAlpha = THREE.OneFactor
    mat.blendDstAlpha = THREE.OneMinusSrcColorFactor
  }

  mat.needsUpdate = true
}
