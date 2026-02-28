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

  #define MAX_STEPS 80
  #define MAX_DIST 50.0
  #define SURF_DIST 0.002
  #define PI 3.14159265359

  // Hash
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Simplex-like noise
  vec3 mod289_3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289_4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 perm(vec4 x) { return mod289_4(((x*34.0)+1.0)*x); }

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

  float fbm(vec3 p) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
      val += amp * noise3D(p * freq);
      freq *= 2.0;
      amp *= 0.5;
    }
    return val;
  }

  // 2D rotation
  mat2 rot2(float a) {
    float s = sin(a); float c = cos(a);
    return mat2(c, -s, s, c);
  }

  // SDF: column
  float sdColumn(vec3 p, float r) {
    return length(p.xz) - r;
  }

  // Scene SDF
  float map(vec3 p) {
    // Infinite repetition
    vec3 rep = vec3(4.0, 100.0, 4.0);
    vec3 q = p - rep * round(p / rep);

    // Column with audio-reactive radius
    float r = 0.3 + uBass * 0.3;
    float col = sdColumn(q, r);

    // Twist columns with treble
    q.xz *= rot2(p.y * 0.3 * (1.0 + uTreble * 2.0) + uTime * 0.1);
    float twistedCol = sdColumn(q, r * 0.8);

    float d = min(col, twistedCol);

    // Domain warping with FBM for organic feel
    float warp = fbm(p * 0.2 + uTime * 0.05) * (1.0 + uAmplitude);
    d += warp * 0.3;

    // Tunnel: subtract a cylinder along Z
    float tunnelR = 1.5 + uAmplitude * 1.0;
    float tunnel = -(length(p.xy) - tunnelR);
    d = max(d, tunnel);

    return d;
  }

  // Normal estimation
  vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.005, 0.0);
    return normalize(vec3(
      map(p + e.xyy) - map(p - e.xyy),
      map(p + e.yxy) - map(p - e.yxy),
      map(p + e.yyx) - map(p - e.yyx)
    ));
  }

  // Raymarching
  float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < MAX_STEPS; i++) {
      vec3 p = ro + rd * t;
      float d = map(p);
      if (d < SURF_DIST) return t;
      if (t > MAX_DIST) break;
      t += d * 0.8;
    }
    return -1.0;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

    // Camera
    vec3 ro = vec3(0.0, 0.0, uCameraZ);
    vec3 rd = normalize(vec3(uv, 1.0));

    // Slight camera sway
    rd.xy *= rot2(sin(uTime * 0.3) * 0.05);

    float t = rayMarch(ro, rd);

    vec3 col = vec3(0.0); // Pure black background

    if (t > 0.0) {
      vec3 p = ro + rd * t;
      vec3 n = getNormal(p);

      // Harsh monochrome lighting
      vec3 lightDir = normalize(vec3(0.0, 0.0, -1.0));
      float diff = max(dot(n, lightDir), 0.0);

      // Edge detection for harsh white edges
      float edge = 1.0 - smoothstep(0.0, 0.03, abs(map(p + n * 0.01)));

      // Distance fog
      float fog = exp(-t * 0.08);

      // Base monochrome with subtle hue tint
      vec3 baseCol = vec3(diff * 0.6 + edge * 0.8) * fog;

      // Subtle color tint based on depth + hue
      float hueT = fract(t * 0.05 + uHue + uTime * 0.01);
      vec3 tint = 0.5 + 0.5 * cos(6.28318 * (hueT + vec3(0.0, 0.33, 0.67)));
      baseCol *= mix(vec3(1.0), tint, 0.15 + uBeat * 0.3);

      col = baseCol * uIntensity;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`

function VoidTunnelScene(_props: SceneProps) {
    const meshRef = useRef<THREE.Mesh>(null)
    const cameraZ = useRef(0)

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

        // Move forward, beat = velocity spike
        const baseSpeed = 2.0 * speed
        const beatBoost = audioRefs.beat ? 8.0 : 0
        cameraZ.current += (baseSpeed + beatBoost) * delta
        uniforms.uCameraZ.value = cameraZ.current

        // Beat pulse
        if (audioRefs.beat) {
            uniforms.uBeat.value = 1.0
        }
        uniforms.uBeat.value *= 0.9
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
    id: 'void-tunnel',
    name: 'Void Tunnel',
    component: VoidTunnelScene,
    defaultParams: {
        speed: { type: 'number', default: 2.0, min: 0, max: 10, step: 0.1, label: 'Speed' },
        tunnelRadius: { type: 'number', default: 1.5, min: 0.5, max: 4.0, step: 0.1, label: 'Tunnel Radius' },
    },
    defaultEffects: [
        { name: 'bloom', enabled: true, params: { intensity: 1.0, threshold: 0.8 } },
        { name: 'vignette', enabled: true, params: { darkness: 0.9 } },
    ],
    tags: ['raymarched', 'brutalist', 'dark', 'high-energy'],
}

registerScene(descriptor)
export default descriptor
