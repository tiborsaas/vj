#include "../noise.glsl"
uniform float uTime;
uniform float uBass;
uniform float uTreble;
uniform float uAmplitude;
uniform float uBeat;
uniform float uNoiseScale;
uniform float uDisplacement;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vDisplacement;
void main() {
  vec3 pos = position;
  float n = snoise(pos * uNoiseScale + uTime * 0.4) * 0.3;
  n += snoise(pos * (uNoiseScale * 2.0) + uTime * 0.6) * 0.15;
  n += snoise(pos * (uNoiseScale * 4.0) + uTime * 0.8) * 0.075;
  float bassBoost = uBass * 0.5 + uBeat * 0.3;
  float disp = n * uDisplacement * (1.0 + bassBoost + uAmplitude * 0.3);
  pos += normal * disp;
  vDisplacement = disp;
  vNormal = normalize(normalMatrix * normal);
  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
