uniform float uTime;
uniform float uBass;
uniform float uAmplitude;
uniform float uBeat;
uniform float uHue;
uniform float uIntensity;

varying vec2 vUv;
varying float vDisplacement;
varying float vNoise;

// Inigo Quilez cosine palette
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  // Color from displacement + hue shift
  float t = vDisplacement * 0.3 + uTime * 0.05 + uHue;

  vec3 col = palette(t,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 0.7, 0.4),
    vec3(0.00, 0.15, 0.20)
  );

  // Brighten on beat
  col += uBeat * vec3(0.3, 0.1, 0.5);

  // Emissive glow based on displacement
  float glow = abs(vDisplacement) * 0.5 * uIntensity;
  col *= 0.4 + glow;

  // Edge fade
  float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x)
                 * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);

  // Amplitude-based alpha
  float alpha = (0.3 + uAmplitude * 0.7) * edgeFade * uIntensity;

  gl_FragColor = vec4(col, alpha);
}
