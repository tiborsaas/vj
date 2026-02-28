#define PI 3.14159265359
#define TAU 6.28318530718
#define HALF_PI 1.57079632679
#define E 2.71828182846

// Remap value from one range to another
float remap(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

// Smooth remap with clamping
float remapClamped(float value, float inMin, float inMax, float outMin, float outMax) {
  float t = clamp((value - inMin) / (inMax - inMin), 0.0, 1.0);
  return mix(outMin, outMax, t);
}

// 2D rotation matrix
mat2 rot2(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

// 3D rotation around X axis
mat3 rotX(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
}

// 3D rotation around Y axis
mat3 rotY(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}

// 3D rotation around Z axis
mat3 rotZ(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);
}

// Quintic smoothstep
float smootherstep(float edge0, float edge1, float x) {
  x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

// Exponential impulse
float expImpulse(float x, float k) {
  float h = k * x;
  return h * exp(1.0 - h);
}

// Parabola
float parabola(float x, float k) {
  return pow(4.0 * x * (1.0 - x), k);
}

// Power curve
float pcurve(float x, float a, float b) {
  float k = pow(a + b, a + b) / (pow(a, a) * pow(b, b));
  return k * pow(x, a) * pow(1.0 - x, b);
}
