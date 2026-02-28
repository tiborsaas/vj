// ─── Layer System Types ──────────────────────────────────────────────
// Composable visual layer architecture for VOID VJ

import type { TransitionType, EffectPreset } from './index'

// ─── Layer Types ─────────────────────────────────────────────────────

export type LayerType =
  | 'shader-plane'
  | 'displaced-mesh'
  | 'instanced-particles'
  | 'wireframe-geometry'
  | 'fbo-simulation'
  | 'text-2d'
  | 'text-3d'
  | 'model-3d'
  | 'primitive-3d'

// ─── Blend Modes ─────────────────────────────────────────────────────

export type LayerBlendMode =
  | 'normal'
  | 'additive'
  | 'multiply'
  | 'screen'

// ─── Base Layer Config ───────────────────────────────────────────────

export interface LayerBase {
  id: string
  type: LayerType
  name: string
  visible: boolean
  opacity: number
  blendMode: LayerBlendMode
}

// ─── Shader Plane ────────────────────────────────────────────────────
// Fullscreen quad with custom fragment shader (raymarching, effects, etc.)

export interface ShaderPlaneLayer extends LayerBase {
  type: 'shader-plane'
  vertexShader: string
  fragmentShader: string
  uniforms: Record<string, ShaderUniformDef>
}

export interface ShaderUniformDef {
  value: number | number[] | boolean | string
  min?: number
  max?: number
  step?: number
  label?: string
}

// ─── Displaced Mesh ──────────────────────────────────────────────────
// Mesh with vertex displacement (noise-based) + custom fragment

export type MeshGeometryType =
  | 'sphere'
  | 'icosahedron'
  | 'torus'
  | 'torusKnot'
  | 'box'
  | 'plane'
  | 'cylinder'

export interface DisplacedMeshLayer extends LayerBase {
  type: 'displaced-mesh'
  geometry: MeshGeometryType
  geometryArgs: number[]
  vertexShader: string
  fragmentShader: string
  uniforms: Record<string, ShaderUniformDef>
  wireframe: boolean
  rotation: [number, number, number]
  rotationSpeed: [number, number, number]
}

// ─── Instanced Particles ────────────────────────────────────────────
// Instanced mesh particle system with CPU or GPU simulation

export interface InstancedParticlesLayer extends LayerBase {
  type: 'instanced-particles'
  count: number
  size: number
  geometry: 'sphere' | 'box' | 'custom'
  colorMode: 'velocity' | 'position' | 'age' | 'solid'
  color: string
  attractors: Array<{ position: [number, number, number]; strength: number; radius: number }>
  damping: number
  maxSpeed: number
  audioReactive: boolean
}

// ─── Wireframe Geometry ──────────────────────────────────────────────
// Wireframe/edge polyhedra with rotation and beat-sync

export type WireframeShape =
  | 'icosahedron'
  | 'octahedron'
  | 'dodecahedron'
  | 'tetrahedron'
  | 'cube'

export interface WireframeGeometryLayer extends LayerBase {
  type: 'wireframe-geometry'
  shapes: Array<{
    shape: WireframeShape
    radius: number
    detail: number
    color: string
    rotationSpeed: [number, number, number]
  }>
  beatScale: number
  audioReactive: boolean
}

// ─── FBO Simulation ──────────────────────────────────────────────────
// Ping-pong FBO simulation (reaction-diffusion, fluid, etc.)

export interface FBOSimulationLayer extends LayerBase {
  type: 'fbo-simulation'
  size: number
  computeShader: string
  displayShader: string
  computeUniforms: Record<string, ShaderUniformDef>
  displayUniforms: Record<string, ShaderUniformDef>
  stepsPerFrame: number
  audioInject: boolean
}

// ─── Text 2D ─────────────────────────────────────────────────────────
// HTML-overlay or sprite-based 2D text

export interface Text2DLayer extends LayerBase {
  type: 'text-2d'
  text: string
  fontSize: number
  fontFamily: string
  color: string
  position: [number, number]
  rotation: number
  audioReactive: boolean
  audioProperty: 'scale' | 'opacity' | 'position' | 'rotation'
}

// ─── Text 3D ─────────────────────────────────────────────────────────
// 3D extruded text using drei's Text3D

export interface Text3DLayer extends LayerBase {
  type: 'text-3d'
  text: string
  fontSize: number
  color: string
  emissive: string
  emissiveIntensity: number
  depth: number
  position: [number, number, number]
  rotation: [number, number, number]
  rotationSpeed: [number, number, number]
  audioReactive: boolean
}

// ─── Model 3D ────────────────────────────────────────────────────────
// Imported GLB/GLTF model

export interface Model3DLayer extends LayerBase {
  type: 'model-3d'
  /** IndexedDB key for stored model */
  modelKey: string
  /** Original filename */
  filename: string
  scale: number
  position: [number, number, number]
  rotation: [number, number, number]
  rotationSpeed: [number, number, number]
  autoRotate: boolean
  audioReactive: boolean
}

// ─── Primitive 3D ────────────────────────────────────────────────────
// Basic Three.js geometry with material

export type PrimitiveShape =
  | 'sphere'
  | 'box'
  | 'torus'
  | 'torusKnot'
  | 'cylinder'
  | 'cone'
  | 'icosahedron'
  | 'octahedron'
  | 'dodecahedron'

export interface Primitive3DLayer extends LayerBase {
  type: 'primitive-3d'
  shape: PrimitiveShape
  shapeArgs: number[]
  materialType: 'standard' | 'physical' | 'wireframe' | 'emissive'
  color: string
  emissive: string
  emissiveIntensity: number
  metalness: number
  roughness: number
  wireframe: boolean
  position: [number, number, number]
  rotation: [number, number, number]
  rotationSpeed: [number, number, number]
  scale: number
  audioReactive: boolean
}

// ─── Union Layer Config ──────────────────────────────────────────────

export type LayerConfig =
  | ShaderPlaneLayer
  | DisplacedMeshLayer
  | InstancedParticlesLayer
  | WireframeGeometryLayer
  | FBOSimulationLayer
  | Text2DLayer
  | Text3DLayer
  | Model3DLayer
  | Primitive3DLayer

// ─── Scene Preset ────────────────────────────────────────────────────

export interface ScenePreset {
  id: string
  name: string
  layers: LayerConfig[]
  effects: EffectPreset[]
  transition: {
    type: TransitionType
    duration: number
  }
  tags: string[]
  /** True for built-in presets that cannot be deleted */
  builtIn?: boolean
}

// ─── Editor State ────────────────────────────────────────────────────

export interface EditorState {
  selectedLayerId: string | null
}
