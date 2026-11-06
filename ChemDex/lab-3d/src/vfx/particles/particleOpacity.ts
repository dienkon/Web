/** Shared instance opacity for pooled particle materials. Three's ordinary
 * instanceColor is RGB-only; writing ParticleState.alpha alone cannot fade a glyph. */
export function particleOpacityShader(shader: { vertexShader: string; fragmentShader: string }) {
  shader.vertexShader = shader.vertexShader.replace('#include <common>',
    '#include <common>\nattribute float instanceOpacity;\nvarying float vInstanceOpacity;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInstanceOpacity = instanceOpacity;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
    '#include <common>\nvarying float vInstanceOpacity;')
    .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= clamp(vInstanceOpacity, 0.0, 1.0);');
}
