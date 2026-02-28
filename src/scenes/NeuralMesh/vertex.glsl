#include "../../shaders/noise.glsl"

uniform float uTime;
uniform float uBass;
uniform float uTreble;
uniform float uAmplitude;
uniform float uBeat;
uniform float uNoiseScale;
uniform float uDisplacement;

varying vec2 vUv;
varying float vDisplacement;
varying float vNoise;

void main() {
  vUv = uv;

  vec3 pos = position;

  // Layered noise displacement
  float noiseFreq = uNoiseScale + uTreble * 2.0;
  float n1 = snoise(vec3(pos.xy * noiseFreq, uTime * 0.3));
  float n2 = snoise(vec3(pos.xy * noiseFreq * 2.0, uTime * 0.5 + 100.0)) * 0.5;
  float n3 = snoise(vec3(pos.xy * noiseFreq * 4.0, uTime * 0.7 + 200.0)) * 0.25;

  float noise = (n1 + n2 + n3) * uDisplacement;

  // Bass drives amplitude, beat creates sharp spikes
  float bassDisplace = uBass * 2.0 + uBeat * 1.5;
  pos.z += noise * (1.0 + bassDisplace);

  vDisplacement = pos.z;
  vNoise = noise;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
