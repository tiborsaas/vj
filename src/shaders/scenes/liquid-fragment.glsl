uniform float uTime;
uniform float uHue;
uniform float uIntensity;
uniform float uBeat;
uniform float uFresnelPower;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vDisplacement;
void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), uFresnelPower);
  vec3 baseColor = vec3(0.8, 0.85, 0.9);
  float hueAngle = uHue * 6.28318;
  float c = cos(hueAngle);
  float s = sin(hueAngle);
  mat3 hueRot = mat3(
    0.299+0.701*c+0.168*s, 0.587-0.587*c+0.330*s, 0.114-0.114*c-0.497*s,
    0.299-0.299*c-0.328*s, 0.587+0.413*c+0.035*s, 0.114-0.114*c+0.292*s,
    0.299-0.300*c+1.250*s, 0.587-0.588*c-1.050*s, 0.114+0.886*c-0.203*s
  );
  vec3 col = hueRot * baseColor;
  col = mix(col, vec3(1.0), fresnel * 0.8);
  col += vDisplacement * 0.5;
  col += uBeat * vec3(0.2, 0.1, 0.3);
  col *= uIntensity;
  gl_FragColor = vec4(col, 1.0);
}
