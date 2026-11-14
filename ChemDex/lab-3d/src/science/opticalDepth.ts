/** A display calibration, not an NTU or measured species coefficient. Keeping
 * one physical reference length makes changing vessel size change attenuation.
 * T = exp(-integral(sigma ds)); see PBRT 4e, Volume Scattering / Transmittance. */
export const SUSPENSION_REFERENCE_PATH_M = 0.01;

export function opacityFromOpticalDepth(depth: number) {
  return Number.isFinite(depth) && depth > 0 ? -Math.expm1(-depth) : depth === Infinity ? 1 : 0;
}
export function opticalDepthFromOpacity(opacity: number) {
  return Number.isFinite(opacity) && opacity > 0 ? -Math.log1p(-Math.min(1 - 1e-7, opacity)) : 0;
}

/** Ordered front-to-back, piecewise-constant extinction. RGB is illustrative
 * single-scattering color; the transmittance is exact for these input segments. */
export function integrateOpticalSegments(segments: Iterable<{ depth: number; color: readonly number[] }>) {
  let transmission = 1;
  const color = [0, 0, 0];
  for (const segment of segments) {
    const alpha = opacityFromOpticalDepth(segment.depth);
    for (let channel = 0; channel < 3; channel++) color[channel] += transmission * alpha * segment.color[channel];
    transmission *= 1 - alpha;
  }
  const opacity = 1 - transmission;
  return { opacity, transmission, color: color.map(c => opacity > 0 ? c / opacity : 0) };
}
