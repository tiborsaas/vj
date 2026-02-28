// ─── Domain Warping ──────────────────────────────────────────────────
// Requires: noise.glsl (snoise, fbm)

vec2 domainWarp(vec2 p, float strength, float time) {
  float n1 = snoise(p + vec2(time * 0.1, 0.0));
  float n2 = snoise(p + vec2(0.0, time * 0.1) + 5.2);
  return p + vec2(n1, n2) * strength;
}

vec3 domainWarp3D(vec3 p, float strength, float time) {
  float n1 = snoise(p + vec3(time * 0.1, 0.0, 0.0));
  float n2 = snoise(p + vec3(0.0, time * 0.1, 0.0) + 5.2);
  float n3 = snoise(p + vec3(0.0, 0.0, time * 0.1) + 9.7);
  return p + vec3(n1, n2, n3) * strength;
}

// ─── Barrel Distortion ───────────────────────────────────────────────

vec2 barrelDistortion(vec2 uv, float amount) {
  vec2 cc = uv - 0.5;
  float dist = dot(cc, cc);
  return uv + cc * dist * amount;
}

// ─── Kaleidoscope ────────────────────────────────────────────────────

vec2 kaleidoscope(vec2 uv, float segments) {
  vec2 centered = uv - 0.5;
  float angle = atan(centered.y, centered.x);
  float radius = length(centered);
  float segAngle = 6.28318530718 / segments;
  angle = mod(angle, segAngle);
  angle = abs(angle - segAngle * 0.5);
  return vec2(cos(angle), sin(angle)) * radius + 0.5;
}

// ─── Polar Coordinates ───────────────────────────────────────────────

vec2 toPolar(vec2 uv) {
  vec2 centered = uv - 0.5;
  float angle = atan(centered.y, centered.x) / 6.28318530718 + 0.5;
  float radius = length(centered) * 2.0;
  return vec2(angle, radius);
}

vec2 fromPolar(vec2 polar) {
  float angle = (polar.x - 0.5) * 6.28318530718;
  float radius = polar.y * 0.5;
  return vec2(cos(angle), sin(angle)) * radius + 0.5;
}

// ─── Feedback UV Offset ──────────────────────────────────────────────

vec2 feedbackUV(vec2 uv, float zoom, float rotation) {
  vec2 centered = uv - 0.5;
  float c = cos(rotation);
  float s = sin(rotation);
  centered = mat2(c, -s, s, c) * centered;
  centered *= zoom;
  return centered + 0.5;
}

// ─── Chromatic Split ─────────────────────────────────────────────────

vec3 chromaticSplit(sampler2D tex, vec2 uv, float amount) {
  float r = texture(tex, uv + vec2(amount, 0.0)).r;
  float g = texture(tex, uv).g;
  float b = texture(tex, uv - vec2(amount, 0.0)).b;
  return vec3(r, g, b);
}

// ─── Scanlines ───────────────────────────────────────────────────────

float scanlines(vec2 uv, float count, float intensity) {
  return 1.0 - intensity * (0.5 + 0.5 * sin(uv.y * count * 3.14159265359));
}

// ─── Glitch Offset ──────────────────────────────────────────────────

vec2 glitchOffset(vec2 uv, float time, float intensity) {
  float line = floor(uv.y * 50.0);
  float offset = step(0.95, fract(sin(line * 43758.5453 + time) * 0.5 + 0.5)) * intensity;
  return uv + vec2(offset * (fract(sin(time * 100.0 + line) * 43758.5453) * 2.0 - 1.0), 0.0);
}
