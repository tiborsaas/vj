// ─── Color Space Conversion ─────────────────────────────────────────

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// ─── Inigo Quilez Cosine Palette ─────────────────────────────────────
// palette(t) = a + b * cos(TAU * (c * t + d))
// See: https://iquilezles.org/articles/palettes/

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318530718 * (c * t + d));
}

// Preset: neon cyberpunk (deep purple → cyan → hot pink)
vec3 paletteNeon(float t) {
  return palette(t,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 1.0, 1.0),
    vec3(0.00, 0.10, 0.20)
  );
}

// Preset: void (deep blue → black → white → faint purple)
vec3 paletteVoid(float t) {
  return palette(t,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 0.7, 0.4),
    vec3(0.00, 0.15, 0.20)
  );
}

// Preset: fire (black → red → orange → white)
vec3 paletteFire(float t) {
  return palette(t,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(2.0, 1.0, 0.0),
    vec3(0.50, 0.20, 0.25)
  );
}

// Preset: acid (lime → electric blue → black)
vec3 paletteAcid(float t) {
  return palette(t,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 1.0, 0.5),
    vec3(0.80, 0.90, 0.30)
  );
}

// ─── Tone Mapping ────────────────────────────────────────────────────

vec3 aces(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// ─── Gamma ───────────────────────────────────────────────────────────

vec3 gammaCorrect(vec3 color, float gamma) {
  return pow(color, vec3(1.0 / gamma));
}

vec3 linearToSRGB(vec3 color) {
  return pow(color, vec3(1.0 / 2.2));
}

vec3 sRGBToLinear(vec3 color) {
  return pow(color, vec3(2.2));
}
