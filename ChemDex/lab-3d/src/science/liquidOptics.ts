/** Alpha compositing approximation, not Beer–Lambert absorption. Clear stocks
 * must reveal submerged solids. Particle scattering increases opacity using
 * suspended mass, independently of whether any sediment remains on the floor.
 */
export function liquidOpacity(hex: string, turbidity: number, surface = false): number {
  const rgb = /^#[0-9a-f]{6}$/i.test(hex) ? [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) : [1, 1, 1];
  const chroma = Math.max(...rgb) - Math.min(...rgb);
  const absorption = Math.max(chroma, 1 - Math.max(...rgb));
  const clear = (surface ? 0.18 : 0.12) + absorption * 0.65;
  const scattering = Math.min(1, Math.max(0, Number.isFinite(turbidity) ? turbidity : 0));
  return clear + (0.96 - clear) * scattering;
}

/** Match color weights to the same alpha budget. Mixing opaque white water
 * into a pigment and then reducing alpha dilutes its chroma twice. This is
 * an alpha-compositing approximation, not measured spectral scattering. */
export function suspensionColorWeight(hex: string, turbidity: number, surface = false): number {
  const fraction = Math.min(1, Math.max(0, Number.isFinite(turbidity) ? turbidity : 0));
  const total = liquidOpacity(hex, fraction, surface);
  return total > 0 ? 0.96 * fraction / total : 0;
}
