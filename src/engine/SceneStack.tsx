import type { ScenePreset } from '../types/layers'
import { LayerRenderer } from '../layers/LayerRenderer'

interface Props {
  preset: ScenePreset
}

/**
 * SceneStack — renders all layers from a scene preset in stack order.
 * Each layer is rendered by LayerRenderer based on its type.
 * Layers are rendered bottom-to-top (index 0 = bottom).
 */
export function SceneStack({ preset }: Props) {
  return (
    <>
      {preset.layers.map((layer) => (
        <LayerRenderer key={layer.id} layer={layer} />
      ))}
    </>
  )
}
