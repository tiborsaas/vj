'use no memo'
import { useRef, useMemo, useState, useEffect, Suspense } from 'react'
import { useFrame, createPortal } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from './store'
import { sceneRegistry } from './SceneRegistry'
import { useAudio } from '../hooks/useAudio'
import { useClock } from '../hooks/useClock'

// ─── Transition Shader ───────────────────────────────────────────────

const transitionVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const transitionFragmentShader = /* glsl */ `
  uniform sampler2D tFrom;
  uniform sampler2D tTo;
  uniform float uProgress;
  uniform int uType; // 0=crossfade, 1=dissolve, 2=glitch-cut, 3=zoom-blur
  uniform float uTime;

  varying vec2 vUv;

  // Simple hash for dissolve
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec4 fromColor = texture2D(tFrom, vUv);
    vec4 toColor = texture2D(tTo, vUv);

    if (uType == 0) {
      // Crossfade
      gl_FragColor = mix(fromColor, toColor, uProgress);
    }
    else if (uType == 1) {
      // Dissolve — noise threshold
      float noise = hash(vUv * 100.0 + uTime);
      float threshold = uProgress;
      float edge = smoothstep(threshold - 0.05, threshold + 0.05, noise);
      gl_FragColor = mix(toColor, fromColor, edge);
    }
    else if (uType == 2) {
      // Glitch cut — scanline + RGB split
      float scanline = step(0.5, fract(vUv.y * 200.0 + uTime * 10.0));
      float glitchProgress = smoothstep(0.3, 0.7, uProgress);

      vec2 offset = vec2(
        (hash(vec2(floor(vUv.y * 30.0), uTime)) * 2.0 - 1.0) * 0.1 * (1.0 - abs(uProgress - 0.5) * 2.0),
        0.0
      );

      vec4 glitchFrom = texture2D(tFrom, vUv + offset);
      vec4 glitchTo = texture2D(tTo, vUv - offset);

      float rgbSplit = 0.01 * sin(uProgress * 3.14159);
      glitchFrom.r = texture2D(tFrom, vUv + offset + vec2(rgbSplit, 0.0)).r;
      glitchFrom.b = texture2D(tFrom, vUv + offset - vec2(rgbSplit, 0.0)).b;
      glitchTo.r = texture2D(tTo, vUv - offset + vec2(rgbSplit, 0.0)).r;
      glitchTo.b = texture2D(tTo, vUv - offset - vec2(rgbSplit, 0.0)).b;

      vec4 mixed = mix(glitchFrom, glitchTo, glitchProgress);
      mixed.rgb *= 0.9 + 0.1 * scanline;
      gl_FragColor = mixed;
    }
    else if (uType == 3) {
      // Zoom blur
      vec2 center = vec2(0.5);
      vec2 dir = vUv - center;
      float strength = sin(uProgress * 3.14159) * 0.1;

      vec4 blurred = vec4(0.0);
      for (int i = 0; i < 8; i++) {
        float t = float(i) / 8.0;
        vec2 sampleUV = vUv - dir * strength * t;
        blurred += mix(
          texture2D(tFrom, sampleUV),
          texture2D(tTo, sampleUV),
          uProgress
        );
      }
      gl_FragColor = blurred / 8.0;
    }
    else {
      // Instant
      gl_FragColor = uProgress > 0.5 ? toColor : fromColor;
    }
  }
`

const transitionTypeToInt: Record<string, number> = {
    crossfade: 0,
    dissolve: 1,
    'glitch-cut': 2,
    'zoom-blur': 3,
    instant: 4,
}

// ─── Conductor Component ─────────────────────────────────────────────

export function Conductor() {

    // Two persistent FBOs and virtual scenes — they never get recreated.
    // We alternate which slot is "active" after each transition so that
    // the winning scene component is never unmounted/remounted.
    const fboA = useFBO(1920, 1080, { samples: 0 })
    const fboB = useFBO(1920, 1080, { samples: 0 })
    const sceneA = useMemo(() => new THREE.Scene(), [])
    const sceneB = useMemo(() => new THREE.Scene(), [])

    // Tracks which slot currently holds the active (visible) scene.
    // Flips on every completed transition.
    const activeSlot = useRef<'a' | 'b'>('a')

    // The scene ID rendered inside each slot. Set via useState so React
    // re-renders the portals when the IDs change.
    const [slotAId, setSlotAId] = useState<string>(() => useSceneStore.getState().activeSceneId)
    const [slotBId, setSlotBId] = useState<string | null>(null)

    // Camera shared by both portals
    const sceneCamera = useMemo(() => {
        const cam = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000)
        cam.position.set(0, 0, 5)
        return cam
    }, [])

    // Fullscreen quad — always used so we never switch between FBO and direct render
    const quadGeometry = useMemo(() => new THREE.PlaneGeometry(2, 2), [])
    const transitionMaterial = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: transitionVertexShader,
                fragmentShader: transitionFragmentShader,
                uniforms: {
                    tFrom: { value: null },
                    tTo: { value: null },
                    uProgress: { value: 0 },
                    uType: { value: 0 },
                    uTime: { value: 0 },
                },
                depthTest: false,
                depthWrite: false,
            }),
        [],
    )

    // Transition timing
    const transitionRef = useRef({ startTime: 0, active: false })

    // Audio & clock
    useAudio()
    useClock()

    // Store subscriptions
    const isTransitioning = useSceneStore((s) => s.isTransitioning)
    const nextSceneId = useSceneStore((s) => s.nextSceneId)
    const transitionType = useSceneStore((s) => s.transitionType)
    const transitionDuration = useSceneStore((s) => s.transitionDuration)

    // When a transition starts, load the incoming scene into the INACTIVE slot
    // so it begins accumulating time while the fade runs. This fully eliminates
    // the jump because the "to" component is never unmounted afterward.
    useEffect(() => {
        if (isTransitioning && nextSceneId) {
            if (activeSlot.current === 'a') {
                setSlotBId(nextSceneId)
            } else {
                setSlotAId(nextSceneId)
            }
            transitionRef.current.active = false // reset so startTime is captured fresh
        }
    }, [isTransitioning, nextSceneId])

    // Resolve scene components from IDs
    const SlotAComp = useMemo(() => {
        if (!slotAId) return null
        return sceneRegistry.get(slotAId)?.component ?? null
    }, [slotAId])

    const SlotBComp = useMemo(() => {
        if (!slotBId) return null
        return sceneRegistry.get(slotBId)?.component ?? null
    }, [slotBId])

    useFrame((state) => {
        const { gl, camera } = state

        // Sync camera aspect
        if ('aspect' in camera && camera.aspect !== sceneCamera.aspect) {
            sceneCamera.aspect = camera.aspect as number
            sceneCamera.updateProjectionMatrix()
        }

        const isActive = activeSlot.current
        const activeScene = isActive === 'a' ? sceneA : sceneB
        const inactiveScene = isActive === 'a' ? sceneB : sceneA
        const activeFbo = isActive === 'a' ? fboA : fboB
        const inactiveFbo = isActive === 'a' ? fboB : fboA

        // Always render the active slot
        gl.setRenderTarget(activeFbo)
        gl.clear()
        gl.render(activeScene, sceneCamera)

        let progress = 0
        if (isTransitioning) {
            // Capture start time on first transitioning frame
            if (!transitionRef.current.active) {
                transitionRef.current.active = true
                transitionRef.current.startTime = state.clock.elapsedTime
            }

            const elapsed = state.clock.elapsedTime - transitionRef.current.startTime
            progress = Math.min(elapsed / transitionDuration, 1.0)
            useSceneStore.getState().updateTransitionProgress(progress)

            // Only render inactive slot during transition
            gl.setRenderTarget(inactiveFbo)
            gl.clear()
            gl.render(inactiveScene, sceneCamera)

            if (progress >= 1.0) {
                // Flip the active slot — the winner (inactive) becomes active.
                // The component instance stays mounted in its portal untouched.
                activeSlot.current = activeSlot.current === 'a' ? 'b' : 'a'
                transitionRef.current.active = false
                useSceneStore.getState().completeTransition()
            }
        }

        gl.setRenderTarget(null)

        // Update quad: tFrom = current active, tTo = incoming (or same when idle)
        transitionMaterial.uniforms.tFrom.value = activeFbo.texture
        transitionMaterial.uniforms.tTo.value = isTransitioning ? inactiveFbo.texture : activeFbo.texture
        transitionMaterial.uniforms.uProgress.value = progress
        transitionMaterial.uniforms.uType.value = transitionTypeToInt[transitionType] ?? 0
        transitionMaterial.uniforms.uTime.value = state.clock.elapsedTime
    })

    return (
        <>
            {/* Slot A — always mounted */}
            {createPortal(
                <Suspense fallback={null}>
                    {SlotAComp && <SlotAComp isActive={activeSlot.current === 'a' && !isTransitioning} />}
                </Suspense>,
                sceneA,
            )}

            {/* Slot B — mounted as soon as a target scene is assigned */}
            {slotBId && SlotBComp && createPortal(
                <Suspense fallback={null}>
                    <SlotBComp isActive={activeSlot.current === 'b' && !isTransitioning} />
                </Suspense>,
                sceneB,
            )}

            {/* Single fullscreen quad — replaces direct scene rendering to avoid remounts */}
            <mesh geometry={quadGeometry} material={transitionMaterial} frustumCulled={false} renderOrder={999} />
        </>
    )
}
