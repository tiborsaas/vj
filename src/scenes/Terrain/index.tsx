'use no memo'
/* eslint-disable react-refresh/only-export-components */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneDescriptor, SceneProps } from '../../types'
import { registerScene } from '../../engine/SceneRegistry'
import { audioRefs, useGlobalStore } from '../../engine/store'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uBass;
  uniform float uTreble;
  uniform float uAmplitude;
  uniform float uBeat;
  uniform float uHue;
  uniform float uIntensity;
  uniform vec2 uResolution;
  uniform float uCameraZ;
  uniform float uSeed;

  #define PI 3.14159265359

  // Noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 perm(vec4 x) { return mod289(((x*34.0)+1.0)*x); }

  float noise3D(vec3 p) {
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);
    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);
    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);
    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));
    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);
    return o4.y * d.y + o4.x * (1.0 - d.y);
  }

  float fbm(vec3 p, int oct) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 6; i++) {
      if (i >= oct) break;
      val += amp * noise3D(p * freq);
      freq *= 2.0;
      amp *= 0.5;
    }
    return val;
  }

  float terrain(vec2 p) {
    // Bass drives peak height, treble adds detail
    float baseHeight = fbm(vec3(p * 0.3 + uSeed, uTime * 0.02), 5);
    float detail = fbm(vec3(p * 1.5 + uSeed * 2.0, uTime * 0.05), 4) * 0.3;
    float ripple = sin(p.x * 3.0 + uTime) * sin(p.y * 3.0 + uTime * 0.7) * uTreble * 0.15;

    return (baseHeight + detail + ripple) * (1.0 + uBass * 2.0);
  }

  vec3 getTerrainNormal(vec2 p) {
    float eps = 0.05;
    float h = terrain(p);
    float hx = terrain(p + vec2(eps, 0.0));
    float hy = terrain(p + vec2(0.0, eps));
    return normalize(vec3(h - hx, eps, h - hy));
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

    // First person flying camera
    vec3 ro = vec3(0.0, 1.5 + uAmplitude * 0.5, uCameraZ);
    vec3 rd = normalize(vec3(uv.x, uv.y - 0.2, 1.0));

    // Raycast against terrain (simple stepping)
    vec3 col = vec3(0.0);
    float t = 0.0;
    bool hit = false;

    for (int i = 0; i < 80; i++) {
      vec3 p = ro + rd * t;
      float h = terrain(p.xz);

      if (p.y < h) {
        // Hit terrain
        hit = true;

        // Normal and lighting
        vec3 n = getTerrainNormal(p.xz);
        vec3 lightDir = normalize(vec3(0.3, 1.0, 0.5));
        float diff = max(dot(n, lightDir), 0.0);

        // Dark earth tones
        float elevation = h;
        vec3 groundCol = mix(
          vec3(0.02, 0.015, 0.01), // Dark earth
          vec3(0.08, 0.06, 0.04),  // Lighter ridge
          smoothstep(0.3, 0.8, elevation)
        );

        // Depth-based fog coloring
        float fog = exp(-t * 0.04);
        vec3 fogColor = mix(
          vec3(0.01, 0.01, 0.02),  // Near: near-black
          vec3(0.05 + uHue * 0.02, 0.03, 0.06), // Far: tinted
          1.0 - fog
        );

        col = groundCol * (diff * 0.5 + 0.1) * fog + fogColor * (1.0 - fog);

        // Lightning flash on snare/beat
        col += uBeat * vec3(0.8, 0.85, 1.0) * smoothstep(0.5, 0.0, t / 30.0);

        break;
      }

      t += max(0.1, (p.y - h) * 0.5);
      if (t > 50.0) break;
    }

    if (!hit) {
      // Sky — mirrored terrain above
      vec3 p = ro + rd * 30.0;
      float skyTerrain = terrain(p.xz * 0.5) * 0.3;
      float skyFade = smoothstep(0.0, 0.3, uv.y + 0.2);
      col = vec3(0.01, 0.01, 0.02) + skyFade * vec3(0.02, 0.015, 0.03);
      col += skyTerrain * vec3(0.02, 0.01, 0.03) * skyFade;
    }

    col *= uIntensity;

    gl_FragColor = vec4(col, 1.0);
  }
`

function TerrainScene(_props: SceneProps) {
    const meshRef = useRef<THREE.Mesh>(null)
    const cameraZ = useRef(0)
    const seed = useRef(42.7)

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uBass: { value: 0 },
            uTreble: { value: 0 },
            uAmplitude: { value: 0 },
            uBeat: { value: 0 },
            uHue: { value: 0 },
            uIntensity: { value: 1 },
            uResolution: { value: new THREE.Vector2(1920, 1080) },
            uCameraZ: { value: 0 },
            uSeed: { value: seed.current },
        }),
        [],
    )

    useFrame((state, delta) => {
        const speed = useGlobalStore.getState().masterSpeed
        const hue = useGlobalStore.getState().masterHue
        const intensity = useGlobalStore.getState().masterIntensity

        uniforms.uTime.value += delta * speed
        uniforms.uBass.value += (audioRefs.bands[0] - uniforms.uBass.value) * 0.1
        uniforms.uTreble.value += (audioRefs.bands[4] - uniforms.uTreble.value) * 0.1
        uniforms.uAmplitude.value += (audioRefs.amplitude - uniforms.uAmplitude.value) * 0.1
        uniforms.uHue.value = hue
        uniforms.uIntensity.value = intensity
        uniforms.uResolution.value.set(state.size.width, state.size.height)

        // Fly forward
        cameraZ.current += delta * speed * 1.5
        uniforms.uCameraZ.value = cameraZ.current

        // Beat effects
        if (audioRefs.beat) {
            uniforms.uBeat.value = 1.0
            // Occasionally shift terrain on strong beats
            if (audioRefs.kick && Math.random() > 0.7) {
                seed.current += 0.1
                uniforms.uSeed.value = seed.current
            }
        }
        uniforms.uBeat.value *= 0.85
    })

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                depthTest={false}
                depthWrite={false}
            />
        </mesh>
    )
}

const descriptor: SceneDescriptor = {
    id: 'terrain',
    name: 'Terrain',
    component: TerrainScene,
    defaultParams: {
        flySpeed: { type: 'number', default: 1.5, min: 0, max: 5.0, step: 0.1, label: 'Fly Speed' },
        fogDensity: { type: 'number', default: 0.04, min: 0.01, max: 0.2, step: 0.01, label: 'Fog Density' },
    },
    defaultEffects: [
        { name: 'bloom', enabled: true, params: { intensity: 0.5, threshold: 0.9 } },
        { name: 'vignette', enabled: true, params: { darkness: 0.9 } },
    ],
    tags: ['landscape', 'nature', 'dark', 'atmospheric'],
}

registerScene(descriptor)
export default descriptor
