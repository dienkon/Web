import * as THREE from 'three';
import { LiquidAppearanceField } from '../../simulation/effects/LiquidAppearanceField';

export function createSpatialLiquidAppearance(field: LiquidAppearanceField) {
  const texture = new THREE.DataTexture(field.pixels, field.size ** 2, field.size, THREE.RGBAFormat);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false; texture.needsUpdate = true;
  const uniforms = { uAppearanceAtlas: { value: texture }, uAppearanceMin: { value: new THREE.Vector3() },
    uAppearanceSize: { value: new THREE.Vector3(2, 1, 2) }, uAppearanceSuspension: { value: new THREE.Color('white') } };
  let revision = -1;
  return { uniforms, texture, update(suspension: string) {
    uniforms.uAppearanceMin.value.set(-field.radius, field.baseY, -field.radius);
    uniforms.uAppearanceSize.value.set(2 * field.radius, field.depth, 2 * field.radius);
    uniforms.uAppearanceSuspension.value.set(suspension);
    if (revision !== field.revision) { texture.needsUpdate = true; revision = field.revision; }
  } };
}
export function shadeSpatialLiquid(shader: THREE.WebGLProgramParametersWithUniforms,
  uniforms: ReturnType<typeof createSpatialLiquidAppearance>['uniforms'], position: string, surface: boolean) {
  Object.assign(shader.uniforms, uniforms);
  shader.fragmentShader = `
    uniform sampler2D uAppearanceAtlas;
    uniform vec3 uAppearanceMin, uAppearanceSize, uAppearanceSuspension;
    vec4 sampleLiquidAppearance(vec3 p) {
      vec3 g = clamp((p - uAppearanceMin) / uAppearanceSize, 0.0, 1.0) * 11.0;
      float z = floor(g.z);
      vec2 a = vec2((g.x + z * 12.0 + 0.5) / 144.0, (g.y + 0.5) / 12.0);
      vec2 b = vec2((g.x + min(11.0, z + 1.0) * 12.0 + 0.5) / 144.0, a.y);
      return mix(texture2D(uAppearanceAtlas, a), texture2D(uAppearanceAtlas, b), fract(g.z));
    }
  ` + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
    vec4 localAppearance = sampleLiquidAppearance(${position});
    float chroma = max(localAppearance.r, max(localAppearance.g, localAppearance.b)) - min(localAppearance.r, min(localAppearance.g, localAppearance.b));
    float absorption = max(chroma, 1.0 - max(localAppearance.r, max(localAppearance.g, localAppearance.b)));
    float clearAlpha = ${surface ? '0.18' : '0.12'} + absorption * 0.65;
    float localAlpha = mix(clearAlpha, 0.96, localAppearance.a);
    diffuseColor.rgb = mix(localAppearance.rgb, uAppearanceSuspension, 0.96 * localAppearance.a / max(0.001, localAlpha));
    diffuseColor.a = localAlpha;
  `);
}
