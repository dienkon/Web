/** Optical displacement only. Height and normal share exactly the same
 * bounded surface, so reflections follow waves and thin films stay bounded. */
export const LIQUID_SURFACE_GLSL = `
float liquidSurfaceHeight(vec2 point) {
  float r = clamp(length(point), 0.0, 1.0);
  float height = pow(r, 5.0) * 0.024;
  if (uSloshSpeed > 0.001) {
    height += sin(r * 26.0 - uTime * 15.0) * (1.0 - r) * min(0.045, uSloshSpeed * 0.1);
    // A dot product remains defined at the centre (unlike atan(0, 0)).
    height += dot(point, vec2(cos(uSloshAngle), sin(uSloshAngle))) * min(0.05, uSloshSpeed * 0.12);
  }
  if (uPourAgitation > 0.01) {
    height += sin(r * 32.0 - uTime * 18.0) * (1.0 - r) * uPourAgitation * 0.035;
  }
  if (uBoilingIntensity > 0.05 || uDynamicRipple > 0.01) {
    height += snoise(vec3(point * 8.0, uTime * 6.0)) * (uBoilingIntensity + uDynamicRipple * 0.8) * 0.035;
  }
  return clamp(height, -uSurfaceWaveLimit, uSurfaceWaveLimit);
}
vec3 liquidSurfaceNormal(vec2 point) {
  const float e = 0.003;
  float dx = liquidSurfaceHeight(point + vec2(e, 0.0)) - liquidSurfaceHeight(point - vec2(e, 0.0));
  float dy = liquidSurfaceHeight(point + vec2(0.0, e)) - liquidSurfaceHeight(point - vec2(0.0, e));
  return normalize(vec3(-dx, -dy, 2.0 * e));
}
`;
