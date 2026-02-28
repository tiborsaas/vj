#include "../noise.glsl"
#include "../common.glsl"
uniform float uTime;
uniform float uBass;
uniform float uAmplitude;
uniform float uBeat;
uniform float uHue;
uniform float uIntensity;
uniform float uSpeed;
uniform vec2 uResolution;
varying vec2 vUv;

float terrain(vec2 p) {
  return fbm(p * 0.3, 6, 2.0, 0.5) * 4.0;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / uResolution.y;
  float t = uTime;
  vec3 ro = vec3(t * 2.0, 3.0 + uBass * 2.0, t * 2.0);
  float yaw = sin(t * 0.2) * 0.3;
  float pitch = -0.3 + uAmplitude * 0.2;
  vec3 fw = normalize(vec3(sin(yaw), pitch, cos(yaw)));
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(fw + uv.x * rt + uv.y * up);
  float tRay = 0.0;
  vec3 p;
  bool hit = false;
  for (int i = 0; i < 100; i++) {
    p = ro + rd * tRay;
    float h = terrain(p.xz);
    if (p.y < h) { hit = true; break; }
    tRay += max(0.1, (p.y - h) * 0.5);
    if (tRay > 100.0) break;
  }
  vec3 col;
  if (hit) {
    vec2 e = vec2(0.1, 0.0);
    float h0 = terrain(p.xz);
    float hx = terrain(p.xz + e);
    float hz = terrain(p.xz + e.yx);
    vec3 n = normalize(vec3(h0 - hx, 0.2, h0 - hz));
    vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
    float diff = max(dot(n, lightDir), 0.0);
    float heightNorm = clamp(p.y / 4.0, 0.0, 1.0);
    vec3 lowCol = vec3(0.05, 0.1, 0.15);
    vec3 highCol = vec3(0.8, 0.7, 0.6);
    col = mix(lowCol, highCol, heightNorm);
    float hueAngle = uHue * TAU;
    float c = cos(hueAngle); float s = sin(hueAngle);
    mat3 hueRot = mat3(
      0.299+0.701*c+0.168*s, 0.587-0.587*c+0.330*s, 0.114-0.114*c-0.497*s,
      0.299-0.299*c-0.328*s, 0.587+0.413*c+0.035*s, 0.114-0.114*c+0.292*s,
      0.299-0.300*c+1.250*s, 0.587-0.588*c-1.050*s, 0.114+0.886*c-0.203*s
    );
    col = hueRot * col;
    col *= 0.3 + diff * 0.7;
    float fog = exp(-tRay * 0.03);
    col = mix(vec3(0.0), col, fog);
    col += uBeat * vec3(0.5, 0.5, 0.7) * fog;
  } else {
    col = vec3(0.0, 0.0, 0.02);
  }
  col *= uIntensity;
  gl_FragColor = vec4(col, 1.0);
}
