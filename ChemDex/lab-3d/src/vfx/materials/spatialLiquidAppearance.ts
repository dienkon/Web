import * as THREE from 'three';
import { LiquidAppearanceField } from '../../simulation/effects/LiquidAppearanceField';
import type { ParticleBounds } from '../../simulation/effects/particleBounds';

export function createSpatialLiquidAppearance(field: LiquidAppearanceField) {
  const texture = new THREE.DataTexture(field.pixels, field.size ** 2, field.size, THREE.RGBAFormat);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false; texture.needsUpdate = true;
  const uniforms = { uAppearanceAtlas: { value: texture }, uAppearanceMin: { value: new THREE.Vector3() },
    uAppearanceSize: { value: new THREE.Vector3(2, 1, 2) }, uAppearanceSuspension: { value: new THREE.Color('white') },
    uAppearanceWorldToLocal: { value: new THREE.Matrix4() },
    uAppearanceRadii: { value: new Float32Array(32).fill(1) },
    uAppearanceSurface: { value: new THREE.Vector4(0, 1, 0, 1e6) },
    uAppearanceVortex: { value: new THREE.Vector4(1, 0, 0, 0) } };
  let revision = -1;
  let contourKey: string | undefined;
  return { uniforms, texture, update(suspension: string, matrixWorld?: THREE.Matrix4, bounds?: ParticleBounds) {
    uniforms.uAppearanceMin.value.set(-field.radius, field.baseY, -field.radius);
    uniforms.uAppearanceSize.value.set(2 * field.radius, field.depth, 2 * field.radius);
    uniforms.uAppearanceSuspension.value.set(suspension);
    if (matrixWorld) uniforms.uAppearanceWorldToLocal.value.copy(matrixWorld).invert();
    const key = `${bounds?.vesselProfile?.type}:${field.radius}:${field.baseY}:${field.depth}`;
    if (key !== contourKey) {
      for (let i = 0; i < 32; i++) uniforms.uAppearanceRadii.value[i] =
        bounds?.vesselProfile?.r(field.baseY + field.depth * i / 31) ?? field.radius;
      contourKey = key;
    }
    const plane = bounds?.surfacePlane, vortex = plane?.vortex;
    uniforms.uAppearanceSurface.value.set(plane?.normal[0] ?? 0, plane?.normal[1] ?? 1, plane?.normal[2] ?? 0,
      plane?.offset ?? bounds?.surfaceY ?? field.baseY + field.depth);
    uniforms.uAppearanceVortex.value.set((vortex?.coreRadius ?? 1) ** 2, vortex?.amplitude ?? 0, vortex?.offset ?? 0, vortex ? 1 : 0);
    if (revision !== field.revision) { texture.needsUpdate = true; revision = field.revision; }
  } };
}
export function shadeSpatialLiquid(shader: THREE.WebGLProgramParametersWithUniforms,
  uniforms: ReturnType<typeof createSpatialLiquidAppearance>['uniforms'], position: string, surface: boolean) {
  Object.assign(shader.uniforms, uniforms);
  shader.fragmentShader = `
    uniform sampler2D uAppearanceAtlas;
    uniform vec3 uAppearanceMin, uAppearanceSize, uAppearanceSuspension;
    uniform mat4 uAppearanceWorldToLocal;
    uniform float uAppearanceRadii[32];
    uniform vec4 uAppearanceSurface, uAppearanceVortex;
    vec4 sampleLiquidAppearance(vec3 p) {
      vec3 g = clamp((p - uAppearanceMin) / uAppearanceSize, 0.0, 1.0) * 11.0;
      float z = floor(g.z);
      vec2 a = vec2((g.x + z * 12.0 + 0.5) / 144.0, (g.y + 0.5) / 12.0);
      vec2 b = vec2((g.x + min(11.0, z + 1.0) * 12.0 + 0.5) / 144.0, a.y);
      return mix(texture2D(uAppearanceAtlas, a), texture2D(uAppearanceAtlas, b), fract(g.z));
    }
    float suspendedOpticalDepth(vec3 p) {
      vec3 eye = (uAppearanceWorldToLocal * vec4(cameraPosition, 1.0)).xyz;
      vec3 ray = normalize(p - eye);
      vec3 safeRay = mix(vec3(0.00001), ray, step(vec3(0.00001), abs(ray)));
      vec3 a = (uAppearanceMin - p) / safeRay;
      vec3 b = (uAppearanceMin + uAppearanceSize - p) / safeRay;
      vec3 nearBox = min(a, b), farBox = max(a, b);
      float enter = max(0.0, max(nearBox.x, max(nearBox.y, nearBox.z)));
      float leave = min(farBox.x, min(farBox.y, farBox.z));
      float stepLength = max(0.0, leave - enter) / 6.0;
      float opticalDepth = 0.0;
      // Integrate the coarse suspended-solid field through the vessel. Sampling
      // only the glass wall would hide a plume in the middle and paint its cap.
      for (int i = 0; i < 6; i++) {
        vec3 q = p + ray * (enter + (float(i) + 0.5) * stepLength);
        float height = clamp((q.y - uAppearanceMin.y) / uAppearanceSize.y, 0.0, 1.0) * 31.0;
        int low = int(floor(height));
        float wall = mix(uAppearanceRadii[low], uAppearanceRadii[min(31, low + 1)], fract(height));
        float r2 = dot(q.xz, q.xz);
        float surfaceDepth = uAppearanceSurface.w - dot(uAppearanceSurface.xyz, q);
        if (uAppearanceVortex.w > 0.5) surfaceDepth = uAppearanceVortex.z
          + uAppearanceVortex.y * r2 / (uAppearanceVortex.x + r2) - q.y;
        if (r2 <= wall * wall && surfaceDepth >= 0.0) {
          float alpha = sampleLiquidAppearance(q).a;
          opticalDepth += -log(max(0.0001, 1.0 - alpha)) * stepLength / uAppearanceSize.x;
        }
      }
      return 1.0 - exp(-opticalDepth);
    }
  ` + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
    vec4 localAppearance = sampleLiquidAppearance(${position});
    localAppearance.a = suspendedOpticalDepth(${position});
    float chroma = max(localAppearance.r, max(localAppearance.g, localAppearance.b)) - min(localAppearance.r, min(localAppearance.g, localAppearance.b));
    float absorption = max(chroma, 1.0 - max(localAppearance.r, max(localAppearance.g, localAppearance.b)));
    float clearAlpha = ${surface ? '0.18' : '0.12'} + absorption * 0.65;
    float localAlpha = mix(clearAlpha, 0.96, localAppearance.a);
    diffuseColor.rgb = mix(localAppearance.rgb, uAppearanceSuspension, 0.96 * localAppearance.a / max(0.001, localAlpha));
    diffuseColor.a = localAlpha;
  `);
}
