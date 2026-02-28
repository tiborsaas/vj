'use no memo'
/* eslint-disable react-refresh/only-export-components */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneDescriptor, SceneProps } from '../../types'
import { registerScene } from '../../engine/SceneRegistry'
import { audioRefs, useGlobalStore } from '../../engine/store'

const vertexShader = /* glsl */ `
  #define PI 3.14159265359

  // Inline noise functions for vertex shader
  vec3 mod289v(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289v(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permutev(vec4 x) { return mod289v(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrtv(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289v(i);
    vec4 p = permutev(permutev(permutev(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrtv(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  uniform float uTime;
  uniform float uBass;
  uniform float uBeat;
  uniform float uDisplacementScale;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    vNormal = normal;

    // Multi-octave noise displacement
    float n1 = snoise(normal * 2.0 + uTime * 0.3) * 0.5;
    float n2 = snoise(normal * 4.0 + uTime * 0.5 + 100.0) * 0.25;
    float n3 = snoise(normal * 8.0 + uTime * 0.8 + 200.0) * 0.125;
    float noise = (n1 + n2 + n3);

    // Bass and beat drive displacement
    float displace = noise * uDisplacementScale * (1.0 + uBass * 2.0 + uBeat * 1.5);

    vec3 pos = position + normal * displace;
    vDisplacement = displace;
    vPosition = pos;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uBeat;
  uniform float uHue;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    // Fresnel effect for chrome/liquid look
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);

    // Dark chrome base
    vec3 col = vec3(0.02);

    // Reflection-like highlights
    col += fresnel * vec3(0.8, 0.85, 0.9) * uIntensity;

    // Displacement-based highlights
    float disp = abs(vDisplacement);
    col += disp * vec3(0.4, 0.5, 0.6) * 0.5;

    // Subtle hue tint on high displacement
    float hueT = fract(uHue + disp * 2.0 + uTime * 0.02);
    vec3 tint = 0.5 + 0.5 * cos(6.28318 * (hueT + vec3(0.0, 0.33, 0.67)));
    col += tint * disp * 0.3;

    // Beat flash
    col += uBeat * vec3(0.5) * fresnel;

    gl_FragColor = vec4(col, 1.0);
  }
`

function LiquidMetalScene(_props: SceneProps) {
    const meshRef = useRef<THREE.Mesh>(null)
    const beatAccum = useRef(0)

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uBass: { value: 0 },
            uBeat: { value: 0 },
            uHue: { value: 0 },
            uIntensity: { value: 1 },
            uDisplacementScale: { value: 0.5 },
        }),
        [],
    )

    useFrame((_state, delta) => {
        const speed = useGlobalStore.getState().masterSpeed
        const hue = useGlobalStore.getState().masterHue
        const intensity = useGlobalStore.getState().masterIntensity

        uniforms.uTime.value += delta * speed
        uniforms.uBass.value += (audioRefs.bands[0] - uniforms.uBass.value) * 0.08
        uniforms.uHue.value = hue
        uniforms.uIntensity.value = intensity

        if (audioRefs.beat) {
            beatAccum.current = 1.0
        }
        beatAccum.current *= 0.9
        uniforms.uBeat.value = beatAccum.current

        // Slow rotation
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.15 * speed
            meshRef.current.rotation.x += delta * 0.05 * speed
        }
    })

    return (
        <group>
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[2, 64]} />
                <shaderMaterial
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                    uniforms={uniforms}
                />
            </mesh>
            {/* Ambient environment light */}
            <ambientLight intensity={0.1} />
            <pointLight position={[5, 5, 5]} intensity={0.5} color="#8888ff" />
            <pointLight position={[-5, -3, -5]} intensity={0.3} color="#ff4488" />
        </group>
    )
}

const descriptor: SceneDescriptor = {
    id: 'liquid-metal',
    name: 'Liquid Metal',
    component: LiquidMetalScene,
    defaultParams: {
        displacementScale: { type: 'number', default: 0.5, min: 0, max: 2.0, step: 0.05, label: 'Displacement' },
        rotationSpeed: { type: 'number', default: 0.15, min: 0, max: 1.0, step: 0.01, label: 'Rotation' },
    },
    defaultEffects: [
        { name: 'bloom', enabled: true, params: { intensity: 1.5, threshold: 0.5 } },
    ],
    tags: ['organic', 'material', 'mid-energy', 'chrome'],
}

registerScene(descriptor)
export default descriptor
