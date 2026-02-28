/**
 * Factory Presets — decomposed from the original 8 monolithic scenes into
 * composable ScenePreset configs using the new layer system.
 */
import type { ScenePreset } from '../types/layers'
import type { EffectPreset } from '../types'

// Shader imports — vite-plugin-glsl resolves #include directives at build time
import NEURAL_VERTEX from '../shaders/scenes/neural-vertex.glsl'
import NEURAL_FRAGMENT from '../shaders/scenes/neural-fragment.glsl'
import LIQUID_VERTEX from '../shaders/scenes/liquid-vertex.glsl'
import LIQUID_FRAGMENT from '../shaders/scenes/liquid-fragment.glsl'
import VOID_TUNNEL_FRAGMENT from '../shaders/scenes/void-tunnel-fragment.glsl'
import TERRAIN_FRAGMENT from '../shaders/scenes/terrain-fragment.glsl'
import PASSTHROUGH_VERTEX from '../shaders/scenes/passthrough-vertex.glsl'

// ═══════════════════════════════════════════════════════════════════════
// Pure inline shaders (no #include — safe as template literals)
// ═══════════════════════════════════════════════════════════════════════







// --- GlitchMatrix Shader ---
const GLITCH_MATRIX_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uBass;
uniform float uTreble;
uniform float uAmplitude;
uniform float uBeat;
uniform float uHue;
uniform float uIntensity;
uniform float uSpeed;
uniform vec2 uResolution;
varying vec2 vUv;

float hash(float n) { return fract(sin(n) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = vUv;
  vec2 res = uResolution;
  float aspect = res.x / res.y;
  float t = uTime;

  // Matrix rain columns
  float columns = 60.0;
  float colIdx = floor(uv.x * columns);
  float colPhase = hash(colIdx * 13.7) * 100.0;
  float speed = 0.5 + hash(colIdx * 7.3) * 1.5;
  float charY = fract(uv.y + t * speed + colPhase);
  float charIdx = floor(charY * 40.0);
  float charBright = pow(1.0 - charY, 3.0);

  // Random character flicker
  float flicker = step(0.5, hash2(vec2(colIdx, charIdx + floor(t * 10.0))));
  charBright *= 0.3 + flicker * 0.7;

  // Base green
  vec3 col = vec3(0.1, 0.8, 0.2) * charBright;

  // Hue shift
  float hueAngle = uHue * 6.28318;
  float cosH = cos(hueAngle);
  float sinH = sin(hueAngle);
  mat3 hueRot = mat3(
    0.299+0.701*cosH+0.168*sinH, 0.587-0.587*cosH+0.330*sinH, 0.114-0.114*cosH-0.497*sinH,
    0.299-0.299*cosH-0.328*sinH, 0.587+0.413*cosH+0.035*sinH, 0.114-0.114*cosH+0.292*sinH,
    0.299-0.300*cosH+1.250*sinH, 0.587-0.588*cosH-1.050*sinH, 0.114+0.886*cosH-0.203*sinH
  );
  col = hueRot * col;

  // RGB split on beat
  float split = uBeat * 0.01 + uAmplitude * 0.003;
  float r = col.r;
  if (split > 0.001) {
    vec2 uvR = uv + vec2(split, 0.0);
    float colIdxR = floor(uvR.x * columns);
    float charYR = fract(uvR.y + t * (0.5 + hash(colIdxR * 7.3) * 1.5) + hash(colIdxR * 13.7) * 100.0);
    r = pow(1.0 - charYR, 3.0) * 0.8;
  }
  col.r = r;

  // Scanlines
  float scan = 0.9 + 0.1 * sin(uv.y * res.y * 1.5);
  col *= scan;

  // Beat row flash
  float bassRow = step(0.98, hash2(vec2(floor(uv.y * 30.0), floor(t * 4.0)))) * uBass * 2.0;
  col += vec3(0.1, 0.5, 0.1) * bassRow;

  col *= uIntensity;
  gl_FragColor = vec4(col, 1.0);
}
`



// --- Membrane Shaders (FBO reaction-diffusion) ---
const MEMBRANE_COMPUTE = /* glsl */ `
uniform sampler2D uPrevState;
uniform vec2 uResolution;
uniform float uFeedRate;
uniform float uKillRate;
uniform float uDiffuseA;
uniform float uDiffuseB;
uniform float uDeltaTime;
uniform vec2 uAudioInject[4];
uniform float uInjectStrength;
varying vec2 vUv;
void main() {
  vec2 texel = 1.0 / uResolution;
  vec4 state = texture2D(uPrevState, vUv);
  float a = state.r;
  float b = state.g;
  // Laplacian
  float lapA = 0.0;
  float lapB = 0.0;
  lapA += texture2D(uPrevState, vUv + vec2(texel.x, 0.0)).r * 0.25;
  lapA += texture2D(uPrevState, vUv - vec2(texel.x, 0.0)).r * 0.25;
  lapA += texture2D(uPrevState, vUv + vec2(0.0, texel.y)).r * 0.25;
  lapA += texture2D(uPrevState, vUv - vec2(0.0, texel.y)).r * 0.25;
  lapA -= a;
  lapB += texture2D(uPrevState, vUv + vec2(texel.x, 0.0)).g * 0.25;
  lapB += texture2D(uPrevState, vUv - vec2(texel.x, 0.0)).g * 0.25;
  lapB += texture2D(uPrevState, vUv + vec2(0.0, texel.y)).g * 0.25;
  lapB += texture2D(uPrevState, vUv - vec2(0.0, texel.y)).g * 0.25;
  lapB -= b;
  float abb = a * b * b;
  float reaction = uFeedRate * (1.0 - a) - abb;
  float reactionB = abb - (uFeedRate + uKillRate) * b;
  float newA = a + (uDiffuseA * lapA + reaction) * uDeltaTime;
  float newB = b + (uDiffuseB * lapB + reactionB) * uDeltaTime;
  // Audio injection points
  for (int i = 0; i < 4; i++) {
    float dist = length(vUv - uAudioInject[i]);
    if (dist < 0.03) {
      newB += uInjectStrength * (0.03 - dist) / 0.03;
    }
  }
  newA = clamp(newA, 0.0, 1.0);
  newB = clamp(newB, 0.0, 1.0);
  gl_FragColor = vec4(newA, newB, 0.0, 1.0);
}
`

const MEMBRANE_DISPLAY = /* glsl */ `
uniform sampler2D uState;
uniform float uHue;
uniform float uIntensity;
uniform float uBeat;
varying vec2 vUv;
void main() {
  vec4 state = texture2D(uState, vUv);
  float b = state.g;
  // 4-color gradient
  vec3 col1 = vec3(0.05, 0.0, 0.1);
  vec3 col2 = vec3(0.2, 0.0, 0.5);
  vec3 col3 = vec3(0.0, 0.7, 0.9);
  vec3 col4 = vec3(1.0, 0.9, 0.7);
  vec3 col;
  if (b < 0.33) {
    col = mix(col1, col2, b / 0.33);
  } else if (b < 0.66) {
    col = mix(col2, col3, (b - 0.33) / 0.33);
  } else {
    col = mix(col3, col4, (b - 0.66) / 0.34);
  }
  // Hue shift
  float hueAngle = uHue * 6.28318;
  float cosH = cos(hueAngle); float sinH = sin(hueAngle);
  mat3 hueRot = mat3(
    0.299+0.701*cosH+0.168*sinH, 0.587-0.587*cosH+0.330*sinH, 0.114-0.114*cosH-0.497*sinH,
    0.299-0.299*cosH-0.328*sinH, 0.587+0.413*cosH+0.035*sinH, 0.114-0.114*cosH+0.292*sinH,
    0.299-0.300*cosH+1.250*sinH, 0.587-0.588*cosH-1.050*sinH, 0.114+0.886*cosH-0.203*sinH
  );
  col = hueRot * col;
  col += uBeat * vec3(0.1, 0.05, 0.15);
  col *= uIntensity;
  gl_FragColor = vec4(col, 1.0);
}
`



// ═══════════════════════════════════════════════════════════════════════
// Factory Presets
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_EFFECTS: EffectPreset[] = [
  { name: 'bloom', enabled: true, params: { intensity: 1.5, threshold: 0.6, radius: 0.8 } },
  { name: 'chromatic', enabled: true, params: { offset: 0.002 } },
  { name: 'vignette', enabled: true, params: { darkness: 0.7, offset: 0.3 } },
  { name: 'noise', enabled: true, params: { opacity: 0.08 } },
]

export const factoryPresets: ScenePreset[] = [
  // 1. Neural Mesh
  {
    id: 'neural-mesh',
    name: 'Neural Mesh',
    layers: [
      {
        id: 'neural-mesh-plane',
        type: 'displaced-mesh',
        name: 'Neural Grid',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        geometry: 'plane',
        geometryArgs: [8, 8, 128, 128],
        vertexShader: NEURAL_VERTEX,
        fragmentShader: NEURAL_FRAGMENT,
        uniforms: {
          uNoiseScale: { value: 1.5, min: 0.1, max: 5, step: 0.1, label: 'Noise Scale' },
          uDisplacement: { value: 0.8, min: 0, max: 3, step: 0.05, label: 'Displacement' },
        },
        wireframe: false,
        rotation: [-0.5, 0, 0],
        rotationSpeed: [0, 0, 0],
      },
      {
        id: 'neural-mesh-wire',
        type: 'displaced-mesh',
        name: 'Neural Wireframe',
        visible: true,
        opacity: 0.6,
        blendMode: 'additive',
        geometry: 'plane',
        geometryArgs: [8, 8, 128, 128],
        vertexShader: NEURAL_VERTEX,
        fragmentShader: NEURAL_FRAGMENT,
        uniforms: {
          uNoiseScale: { value: 1.5, min: 0.1, max: 5, step: 0.1, label: 'Noise Scale' },
          uDisplacement: { value: 0.8, min: 0, max: 3, step: 0.05, label: 'Displacement' },
        },
        wireframe: true,
        rotation: [-0.5, 0, 0],
        rotationSpeed: [0, 0, 0],
      },
    ],
    effects: DEFAULT_EFFECTS,
    transition: { type: 'crossfade', duration: 2.0 },
    tags: ['geometric', 'organic', 'hypnotic'],
    builtIn: true,
  },

  // 2. Particle Physics
  {
    id: 'particle-physics',
    name: 'Particle Physics',
    layers: [
      {
        id: 'particles-main',
        type: 'instanced-particles',
        name: 'Particle Swarm',
        visible: true,
        opacity: 1,
        blendMode: 'additive',
        count: 50000,
        size: 0.015,
        geometry: 'sphere',
        colorMode: 'velocity',
        color: '#ffffff',
        attractors: [
          { position: [0, 0, 0], strength: 0.5, radius: 2 },
          { position: [2, 1, -1], strength: 0.3, radius: 1.5 },
          { position: [-1, -2, 1], strength: 0.4, radius: 2 },
        ],
        damping: 0.02,
        maxSpeed: 0.5,
        audioReactive: true,
      },
    ],
    effects: [
      { name: 'bloom', enabled: true, params: { intensity: 2.0, threshold: 0.3, radius: 0.9 } },
      ...DEFAULT_EFFECTS.slice(1),
    ],
    transition: { type: 'dissolve', duration: 2.0 },
    tags: ['particles', 'physics', 'kinetic'],
    builtIn: true,
  },

  // 3. Void Tunnel
  {
    id: 'void-tunnel',
    name: 'Void Tunnel',
    layers: [
      {
        id: 'tunnel-shader',
        type: 'shader-plane',
        name: 'Raymarched Tunnel',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        vertexShader: PASSTHROUGH_VERTEX,
        fragmentShader: VOID_TUNNEL_FRAGMENT,
        uniforms: {},
      },
    ],
    effects: [
      { name: 'bloom', enabled: true, params: { intensity: 2.0, threshold: 0.5, radius: 0.8 } },
      { name: 'chromatic', enabled: true, params: { offset: 0.003 } },
      { name: 'vignette', enabled: true, params: { darkness: 0.8, offset: 0.2 } },
      { name: 'noise', enabled: true, params: { opacity: 0.06 } },
    ],
    transition: { type: 'zoom-blur', duration: 2.5 },
    tags: ['tunnel', 'raymarching', 'immersive', 'deep'],
    builtIn: true,
  },

  // 4. Liquid Metal
  {
    id: 'liquid-metal',
    name: 'Liquid Metal',
    layers: [
      {
        id: 'liquid-mesh',
        type: 'displaced-mesh',
        name: 'Chrome Blob',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        geometry: 'icosahedron',
        geometryArgs: [2, 64],
        vertexShader: LIQUID_VERTEX,
        fragmentShader: LIQUID_FRAGMENT,
        uniforms: {},
        wireframe: false,
        rotation: [0, 0, 0],
        rotationSpeed: [0.1, 0.15, 0.05],
      },
    ],
    effects: [
      { name: 'bloom', enabled: true, params: { intensity: 1.0, threshold: 0.7, radius: 0.6 } },
      { name: 'chromatic', enabled: true, params: { offset: 0.001 } },
      { name: 'vignette', enabled: true, params: { darkness: 0.5, offset: 0.3 } },
      { name: 'noise', enabled: true, params: { opacity: 0.04 } },
    ],
    transition: { type: 'crossfade', duration: 2.0 },
    tags: ['chrome', 'metallic', 'organic', 'smooth'],
    builtIn: true,
  },

  // 5. Glitch Matrix
  {
    id: 'glitch-matrix',
    name: 'Glitch Matrix',
    layers: [
      {
        id: 'matrix-shader',
        type: 'shader-plane',
        name: 'Matrix Rain',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        vertexShader: PASSTHROUGH_VERTEX,
        fragmentShader: GLITCH_MATRIX_FRAGMENT,
        uniforms: {},
      },
    ],
    effects: [
      { name: 'bloom', enabled: true, params: { intensity: 1.5, threshold: 0.4, radius: 0.7 } },
      { name: 'chromatic', enabled: true, params: { offset: 0.004 } },
      { name: 'noise', enabled: true, params: { opacity: 0.12 } },
    ],
    transition: { type: 'glitch-cut', duration: 1.0 },
    tags: ['digital', 'glitch', 'matrix', 'retro'],
    builtIn: true,
  },

  // 6. Sacred Geometry
  {
    id: 'sacred-geometry',
    name: 'Sacred Geometry',
    layers: [
      {
        id: 'sacred-wireframes',
        type: 'wireframe-geometry',
        name: 'Sacred Polyhedra',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        shapes: [
          { shape: 'icosahedron', radius: 2.5, detail: 1, color: '#7b5cff', rotationSpeed: [0.15, 0.2, 0.05] },
          { shape: 'octahedron', radius: 1.8, detail: 0, color: '#ff5cab', rotationSpeed: [-0.1, 0.15, -0.08] },
          { shape: 'dodecahedron', radius: 1.2, detail: 0, color: '#5cffab', rotationSpeed: [0.08, -0.12, 0.15] },
        ],
        beatScale: 0.4,
        audioReactive: true,
      },
    ],
    effects: [
      { name: 'bloom', enabled: true, params: { intensity: 2.0, threshold: 0.3, radius: 0.9 } },
      { name: 'chromatic', enabled: true, params: { offset: 0.002 } },
      { name: 'vignette', enabled: true, params: { darkness: 0.6, offset: 0.3 } },
      { name: 'noise', enabled: true, params: { opacity: 0.06 } },
    ],
    transition: { type: 'dissolve', duration: 2.5 },
    tags: ['geometric', 'sacred', 'wireframe', 'minimal'],
    builtIn: true,
  },

  // 7. Terrain
  {
    id: 'terrain',
    name: 'Terrain',
    layers: [
      {
        id: 'terrain-shader',
        type: 'shader-plane',
        name: 'Terrain Flyover',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        vertexShader: PASSTHROUGH_VERTEX,
        fragmentShader: TERRAIN_FRAGMENT,
        uniforms: {},
      },
    ],
    effects: [
      { name: 'bloom', enabled: true, params: { intensity: 0.8, threshold: 0.7, radius: 0.5 } },
      { name: 'vignette', enabled: true, params: { darkness: 0.8, offset: 0.2 } },
      { name: 'noise', enabled: true, params: { opacity: 0.05 } },
    ],
    transition: { type: 'crossfade', duration: 3.0 },
    tags: ['landscape', 'terrain', 'atmospheric', 'epic'],
    builtIn: true,
  },

  // 8. Membrane
  {
    id: 'membrane',
    name: 'Membrane',
    layers: [
      {
        id: 'membrane-fbo',
        type: 'fbo-simulation',
        name: 'Reaction-Diffusion',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        size: 512,
        computeShader: MEMBRANE_COMPUTE,
        displayShader: MEMBRANE_DISPLAY,
        computeUniforms: {
          uFeedRate: { value: 0.055, min: 0.01, max: 0.1, step: 0.001, label: 'Feed Rate' },
          uKillRate: { value: 0.062, min: 0.04, max: 0.08, step: 0.001, label: 'Kill Rate' },
          uDiffuseA: { value: 1.0 },
          uDiffuseB: { value: 0.5 },
          uInjectStrength: { value: 0.5 },
        },
        displayUniforms: {},
        stepsPerFrame: 4,
        audioInject: true,
        seedPattern: 'random-spots',
      },
    ],
    effects: [
      { name: 'bloom', enabled: true, params: { intensity: 1.0, threshold: 0.6, radius: 0.7 } },
      { name: 'vignette', enabled: true, params: { darkness: 0.5, offset: 0.3 } },
    ],
    transition: { type: 'dissolve', duration: 3.0 },
    tags: ['biological', 'emergent', 'organic', 'atmospheric'],
    builtIn: true,
  },
]
