import type { LayerConfig } from '../types/layers'
import { ShaderPlane } from './ShaderPlane'
import { DisplacedMesh } from './DisplacedMesh'
import { InstancedParticles } from './InstancedParticles'
import { WireframeGeometry } from './WireframeGeometry'
import { FBOSimulation } from './FBOSimulation'
import { Text2D } from './Text2D'
import { Text3D } from './Text3D'
import { Model3D } from './Model3D'
import { Primitive3D } from './Primitive3D'

interface Props {
  layer: LayerConfig
}

/**
 * LayerRenderer — dispatches a LayerConfig to the correct layer component.
 */
export function LayerRenderer({ layer }: Props) {
  if (!layer.visible) return null

  switch (layer.type) {
    case 'shader-plane':
      return <ShaderPlane config={layer} />
    case 'displaced-mesh':
      return <DisplacedMesh config={layer} />
    case 'instanced-particles':
      return <InstancedParticles config={layer} />
    case 'wireframe-geometry':
      return <WireframeGeometry config={layer} />
    case 'fbo-simulation':
      return <FBOSimulation config={layer} />
    case 'text-2d':
      return <Text2D config={layer} />
    case 'text-3d':
      return <Text3D config={layer} />
    case 'model-3d':
      return <Model3D config={layer} />
    case 'primitive-3d':
      return <Primitive3D config={layer} />
    default:
      return null
  }
}
