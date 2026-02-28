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

// Gray-Scott Reaction Diffusion — compute shader as fragment
const computeShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uPrevState;
  uniform vec2 uResolution;
  uniform float uFeedRate;
  uniform float uKillRate;
  uniform float uDiffuseA;
  uniform float uDiffuseB;
  uniform float uDeltaTime;
  uniform vec2 uAudioInject[4]; // positions to inject chemical B
  uniform float uInjectStrength;

  varying vec2 vUv;

  vec2 laplacian(sampler2D tex, vec2 uv, vec2 texelSize) {
    vec2 sum = vec2(0.0);
    sum += texture2D(tex, uv + vec2(-texelSize.x, 0.0)).rg * 0.2;
    sum += texture2D(tex, uv + vec2(texelSize.x, 0.0)).rg * 0.2;
    sum += texture2D(tex, uv + vec2(0.0, -texelSize.y)).rg * 0.2;
    sum += texture2D(tex, uv + vec2(0.0, texelSize.y)).rg * 0.2;
    sum += texture2D(tex, uv + vec2(-texelSize.x, -texelSize.y)).rg * 0.05;
    sum += texture2D(tex, uv + vec2(texelSize.x, -texelSize.y)).rg * 0.05;
    sum += texture2D(tex, uv + vec2(-texelSize.x, texelSize.y)).rg * 0.05;
    sum += texture2D(tex, uv + vec2(texelSize.x, texelSize.y)).rg * 0.05;
    sum -= texture2D(tex, uv).rg;
    return sum;
  }

  void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec2 state = texture2D(uPrevState, vUv).rg;

    float a = state.r;
    float b = state.g;

    vec2 lap = laplacian(uPrevState, vUv, texelSize);

    float reaction = a * b * b;
    float newA = a + (uDiffuseA * lap.r - reaction + uFeedRate * (1.0 - a)) * uDeltaTime;
    float newB = b + (uDiffuseB * lap.g + reaction - (uKillRate + uFeedRate) * b) * uDeltaTime;

    // Audio injection points
    for (int i = 0; i < 4; i++) {
      float dist = distance(vUv, uAudioInject[i]);
      if (dist < 0.03) {
        newB += uInjectStrength * smoothstep(0.03, 0.0, dist);
      }
    }

    gl_FragColor = vec4(clamp(newA, 0.0, 1.0), clamp(newB, 0.0, 1.0), 0.0, 1.0);
  }
`

const displayShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uState;
  uniform float uHue;
  uniform float uIntensity;
  uniform float uBeat;

  varying vec2 vUv;

  void main() {
    vec2 state = texture2D(uState, vUv).rg;

    float b = state.g;

    // Color mapping: dark palette
    vec3 col1 = vec3(0.01, 0.01, 0.03); // Deep navy (low b)
    vec3 col2 = vec3(0.05, 0.15, 0.4);  // Dark blue
    vec3 col3 = vec3(0.1, 0.4, 0.8);    // Electric blue
    vec3 col4 = vec3(0.9, 0.95, 1.0);   // White (high b)

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
    float cosH = cos(hueAngle);
    float sinH = sin(hueAngle);
    mat3 hueRot = mat3(
      0.299 + 0.701 * cosH + 0.168 * sinH,
      0.587 - 0.587 * cosH + 0.330 * sinH,
      0.114 - 0.114 * cosH - 0.497 * sinH,
      0.299 - 0.299 * cosH - 0.328 * sinH,
      0.587 + 0.413 * cosH + 0.035 * sinH,
      0.114 - 0.114 * cosH + 0.292 * sinH,
      0.299 - 0.300 * cosH + 1.250 * sinH,
      0.587 - 0.588 * cosH - 1.050 * sinH,
      0.114 + 0.886 * cosH - 0.203 * sinH
    );
    col = hueRot * col;

    // Beat flash
    col += uBeat * vec3(0.1, 0.05, 0.15);

    col *= uIntensity;

    gl_FragColor = vec4(col, 1.0);
  }
`

function MembraneScene(_props: SceneProps) {
    const displayRef = useRef<THREE.Mesh>(null)
    const beatAccum = useRef(0)

    // FBO ping-pong for reaction-diffusion
    const size = 512
    const renderTargets = useMemo(() => {
        const options: THREE.RenderTargetOptions = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        }
        return [
            new THREE.WebGLRenderTarget(size, size, options),
            new THREE.WebGLRenderTarget(size, size, options),
        ]
    }, [])

    const computeScene = useMemo(() => new THREE.Scene(), [])
    const computeCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])

    const computeUniforms = useMemo(() => ({
        uPrevState: { value: null as THREE.Texture | null },
        uResolution: { value: new THREE.Vector2(size, size) },
        uFeedRate: { value: 0.055 },
        uKillRate: { value: 0.062 },
        uDiffuseA: { value: 1.0 },
        uDiffuseB: { value: 0.5 },
        uDeltaTime: { value: 1.0 },
        uAudioInject: {
            value: [
                new THREE.Vector2(0.5, 0.5),
                new THREE.Vector2(0.3, 0.3),
                new THREE.Vector2(0.7, 0.7),
                new THREE.Vector2(0.5, 0.3),
            ]
        },
        uInjectStrength: { value: 0.5 },
    }), [])

    const displayUniforms = useMemo(() => ({
        uState: { value: null as THREE.Texture | null },
        uHue: { value: 0 },
        uIntensity: { value: 1 },
        uBeat: { value: 0 },
    }), [])

    // Initialize compute scene
    const computeMesh = useMemo(() => {
        const geo = new THREE.PlaneGeometry(2, 2)
        const mat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader: computeShader,
            uniforms: computeUniforms,
        })
        const mesh = new THREE.Mesh(geo, mat)
        computeScene.add(mesh)
        return mesh
    }, [computeScene, computeUniforms])

    // Initialize state with seed
    const initialized = useRef(false)
    const frameIndex = useRef(0)

    useFrame((state, delta) => {
        const { gl } = state
        const speed = useGlobalStore.getState().masterSpeed
        const hue = useGlobalStore.getState().masterHue
        const intensity = useGlobalStore.getState().masterIntensity
        const bass = audioRefs.bands[0]
        const treble = audioRefs.bands[4]

        // Initialize with seed data
        if (!initialized.current) {
            const data = new Float32Array(size * size * 4)
            for (let i = 0; i < size * size; i++) {
                data[i * 4] = 1.0 // A = 1
                data[i * 4 + 1] = 0.0 // B = 0
                data[i * 4 + 2] = 0.0
                data[i * 4 + 3] = 1.0
            }
            // Seed a few spots with B
            for (let s = 0; s < 20; s++) {
                const cx = Math.floor(Math.random() * size)
                const cy = Math.floor(Math.random() * size)
                const r = 5
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        if (dx * dx + dy * dy < r * r) {
                            const x = (cx + dx + size) % size
                            const y = (cy + dy + size) % size
                            const idx = (y * size + x) * 4
                            data[idx + 1] = 1.0
                        }
                    }
                }
            }
            const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType)
            texture.needsUpdate = true

            // Write to first render target
            const tmpScene = new THREE.Scene()
            const tmpGeo = new THREE.PlaneGeometry(2, 2)
            const tmpMat = new THREE.MeshBasicMaterial({ map: texture })
            const tmpMesh = new THREE.Mesh(tmpGeo, tmpMat)
            tmpScene.add(tmpMesh)
            gl.setRenderTarget(renderTargets[0])
            gl.render(tmpScene, computeCamera)
            gl.setRenderTarget(null)
            tmpGeo.dispose()
            tmpMat.dispose()
            texture.dispose()
            initialized.current = true
        }

        // Audio-reactive feed/kill rates
        computeUniforms.uFeedRate.value = 0.04 + bass * 0.03
        computeUniforms.uKillRate.value = 0.06 + treble * 0.01
        computeUniforms.uDeltaTime.value = Math.min(delta * speed * 60, 3.0) // Substeps

        // Move injection points based on audio
        const t = state.clock.elapsedTime
        computeUniforms.uAudioInject.value[0].set(
            0.5 + Math.sin(t * 0.5) * 0.3,
            0.5 + Math.cos(t * 0.7) * 0.3,
        )
        computeUniforms.uAudioInject.value[1].set(
            0.5 + Math.cos(t * 0.3) * audioRefs.amplitude * 0.4,
            0.5 + Math.sin(t * 0.4) * audioRefs.amplitude * 0.4,
        )

        computeUniforms.uInjectStrength.value = audioRefs.beat ? 2.0 : 0.3

        // Ping-pong compute
        const steps = 4
        for (let i = 0; i < steps; i++) {
            const readIdx = (frameIndex.current + i) % 2
            const writeIdx = 1 - readIdx
            computeUniforms.uPrevState.value = renderTargets[readIdx].texture
            gl.setRenderTarget(renderTargets[writeIdx])
            gl.render(computeScene, computeCamera)
        }
        frameIndex.current = (frameIndex.current + steps) % 2

        gl.setRenderTarget(null)

        // Display
        const displayIdx = frameIndex.current
        displayUniforms.uState.value = renderTargets[displayIdx].texture
        displayUniforms.uHue.value = hue
        displayUniforms.uIntensity.value = intensity

        if (audioRefs.beat) {
            beatAccum.current = 1.0
        }
        beatAccum.current *= 0.9
        displayUniforms.uBeat.value = beatAccum.current
    })

    // Keep computeMesh reference alive
    void computeMesh

    return (
        <mesh ref={displayRef}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={displayShader}
                uniforms={displayUniforms}
                depthTest={false}
                depthWrite={false}
            />
        </mesh>
    )
}

const descriptor: SceneDescriptor = {
    id: 'membrane',
    name: 'Membrane',
    component: MembraneScene,
    defaultParams: {
        feedRate: { type: 'number', default: 0.055, min: 0.01, max: 0.1, step: 0.001, label: 'Feed Rate' },
        killRate: { type: 'number', default: 0.062, min: 0.04, max: 0.08, step: 0.001, label: 'Kill Rate' },
    },
    defaultEffects: [
        { name: 'bloom', enabled: true, params: { intensity: 1.0, threshold: 0.6 } },
    ],
    tags: ['biological', 'emergent', 'organic', 'atmospheric'],
}

registerScene(descriptor)
export default descriptor
