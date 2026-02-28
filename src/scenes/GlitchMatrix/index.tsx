'use no memo'
/* eslint-disable react-refresh/only-export-components */
import { useRef, useMemo } from 'react'
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
  uniform float uAmplitude;
  uniform float uBeat;
  uniform float uHue;
  uniform float uIntensity;
  uniform vec2 uResolution;

  varying vec2 vUv;

  float hash(float n) { return fract(sin(n) * 43758.5453); }

  float randomChar(vec2 grid, float time) {
    float h = hash(dot(grid, vec2(127.1, 311.7)) + floor(time * (3.0 + uAmplitude * 10.0)));
    return step(0.3, h);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    
    // Grid
    float columns = 60.0;
    float rows = columns * (uResolution.y / uResolution.x);
    vec2 grid = floor(uv * vec2(columns, rows));
    vec2 cellUV = fract(uv * vec2(columns, rows));

    // Streaming effect — each column has a phase
    float columnPhase = hash(grid.x * 73.1) * 20.0;
    float streamPos = fract(uTime * (0.5 + hash(grid.x * 31.7) * 0.5) + columnPhase);
    float streamY = grid.y / rows;

    // Characters appear and fade based on stream position
    float dist = abs(streamY - streamPos);
    float trail = smoothstep(0.3, 0.0, dist);
    float head = smoothstep(0.02, 0.0, dist);

    // Random character presence
    float charPresent = randomChar(grid, uTime);

    // Base color — deep green/cyan void aesthetic
    float hueT = fract(uHue + grid.x * 0.01);
    vec3 trailColor = 0.5 + 0.5 * cos(6.28318 * (hueT + vec3(0.3, 0.5, 0.6)));
    trailColor *= 0.4; // Keep it dark

    vec3 headColor = vec3(1.0); // White flash at head

    vec3 col = vec3(0.0);

    // Trail
    col += trailColor * trail * charPresent * 0.6;

    // Head (bright)
    col += headColor * head * charPresent;

    // Beat flash — entire rows
    float rowFlash = step(0.97, hash(grid.y * 17.1 + floor(uTime * 4.0)));
    col += vec3(0.8) * rowFlash * uBeat * charPresent;

    // Scanline effect
    float scanline = 0.9 + 0.1 * sin(gl_FragCoord.y * 2.0);
    col *= scanline;

    // RGB split based on amplitude
    float rgbOffset = uAmplitude * 0.005;
    vec3 splitCol;
    vec2 uvR = uv + vec2(rgbOffset, 0.0);
    vec2 uvB = uv - vec2(rgbOffset, 0.0);
    vec2 gridR = floor(uvR * vec2(columns, rows));
    vec2 gridB = floor(uvB * vec2(columns, rows));
    float charR = randomChar(gridR, uTime);
    float charB = randomChar(gridB, uTime);
    splitCol.r = col.r + charR * trail * 0.1;
    splitCol.g = col.g;
    splitCol.b = col.b + charB * trail * 0.1;
    col = splitCol;

    // Vignette
    vec2 vigUV = uv - 0.5;
    float vig = 1.0 - dot(vigUV, vigUV) * 1.5;
    col *= vig;

    col *= uIntensity;

    gl_FragColor = vec4(col, 1.0);
  }
`

function GlitchMatrixScene(_props: SceneProps) {
    const meshRef = useRef<THREE.Mesh>(null)
    const beatAccum = useRef(0)

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uAmplitude: { value: 0 },
            uBeat: { value: 0 },
            uHue: { value: 0 },
            uIntensity: { value: 1 },
            uResolution: { value: new THREE.Vector2(1920, 1080) },
        }),
        [],
    )

    useFrame((state, delta) => {
        const speed = useGlobalStore.getState().masterSpeed
        const hue = useGlobalStore.getState().masterHue
        const intensity = useGlobalStore.getState().masterIntensity

        uniforms.uTime.value += delta * speed
        uniforms.uAmplitude.value += (audioRefs.amplitude - uniforms.uAmplitude.value) * 0.1
        uniforms.uHue.value = hue
        uniforms.uIntensity.value = intensity
        uniforms.uResolution.value.set(state.size.width, state.size.height)

        if (audioRefs.beat) {
            beatAccum.current = 1.0
        }
        beatAccum.current *= 0.88
        uniforms.uBeat.value = beatAccum.current
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
    id: 'glitch-matrix',
    name: 'Glitch Matrix',
    component: GlitchMatrixScene,
    defaultParams: {
        streamSpeed: { type: 'number', default: 0.5, min: 0, max: 2.0, step: 0.1, label: 'Stream Speed' },
        columns: { type: 'number', default: 60, min: 20, max: 120, step: 1, label: 'Columns' },
    },
    defaultEffects: [
        { name: 'bloom', enabled: true, params: { intensity: 0.8, threshold: 0.7 } },
        { name: 'scanlines', enabled: true, params: { count: 800, opacity: 0.15 } },
    ],
    tags: ['digital', 'culture', 'data', 'dark'],
}

registerScene(descriptor)
export default descriptor
