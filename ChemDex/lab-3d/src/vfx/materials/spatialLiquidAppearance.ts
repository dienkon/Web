import * as THREE from 'three';
import { LiquidAppearanceField } from '../../simulation/effects/LiquidAppearanceField';
import type { ParticleBounds } from '../../simulation/effects/particleBounds';
import { metersPerModelUnit } from '../../science/sceneUnits';
import { SUSPENSION_REFERENCE_PATH_M } from '../../science/opticalDepth';

export function createSpatialLiquidAppearance(field: LiquidAppearanceField) {
  const texture = new THREE.DataTexture(field.pixels, field.size ** 2, field.size, THREE.RGBAFormat);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false; texture.needsUpdate = true;
  const opticalPixels = new Uint16Array(field.suspensionOptics.length);
  const opticalTexture = new THREE.DataTexture(opticalPixels, field.size ** 2, field.size, THREE.RGBAFormat, THREE.HalfFloatType);
  opticalTexture.minFilter = opticalTexture.magFilter = THREE.LinearFilter;
  opticalTexture.generateMipmaps = false; opticalTexture.needsUpdate = true;
  const uniforms = { uAppearanceAtlas: { value: texture }, uAppearanceMin: { value: new THREE.Vector3() },
    uAppearanceSize: { value: new THREE.Vector3(2, 1, 2) }, uAppearanceSuspension: { value: new THREE.Color('white') },
    uAppearanceWorldToLocal: { value: new THREE.Matrix4() },
    uAppearanceRadii: { value: new Float32Array(32).fill(1) },
    uAppearanceSurface: { value: new THREE.Vector4(0, 1, 0, 1e6) },
    uAppearanceVortex: { value: new THREE.Vector4(1, 0, 0, 0) },
    uSuspensionAtlas: { value: opticalTexture }, uHasSuspensionAtlas: { value: false },
    uOpticalPathScale: { value: 1 } };
  let revision = -1;
  let suspensionRevision = -1;
  let contourKey: string | undefined;
  return { uniforms, texture, opticalTexture, dispose() { texture.dispose(); opticalTexture.dispose(); },
    update(suspension: string, matrixWorld?: THREE.Matrix4, bounds?: ParticleBounds) {
    uniforms.uAppearanceMin.value.set(-field.radius, field.baseY, -field.radius);
    uniforms.uAppearanceSize.value.set(2 * field.radius, field.depth, 2 * field.radius);
    uniforms.uAppearanceSuspension.value.set(suspension);
    uniforms.uHasSuspensionAtlas.value = field.usesSpatialSuspension;
    uniforms.uOpticalPathScale.value = metersPerModelUnit(bounds?.vesselProfile) / SUSPENSION_REFERENCE_PATH_M;
    if (suspensionRevision !== field.suspensionRevision) {
      for (let i = 0; i < opticalPixels.length; i += 4) {
        // Preserve chromatic ratios even beyond half-float's depth range.
        const scale = Math.min(1, 65504 / Math.max(1, field.suspensionOptics[i + 3]));
        for (let c = 0; c < 4; c++) opticalPixels[i + c] = THREE.DataUtils.toHalfFloat(field.suspensionOptics[i + c] * scale);
      }
      opticalTexture.needsUpdate = true; suspensionRevision = field.suspensionRevision;
    }
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
    uniform sampler2D uAppearanceAtlas, uSuspensionAtlas;
    uniform bool uHasSuspensionAtlas;
    uniform float uOpticalPathScale;
    uniform vec3 uAppearanceMin, uAppearanceSize, uAppearanceSuspension;
    uniform mat4 uAppearanceWorldToLocal;
    uniform float uAppearanceRadii[32];
    uniform vec4 uAppearanceSurface, uAppearanceVortex;
    vec4 sampleAppearanceAtlas(sampler2D atlas, vec3 p) {
      vec3 g = clamp((p - uAppearanceMin) / uAppearanceSize, 0.0, 1.0) * 11.0;
      float z = floor(g.z);
      vec2 a = vec2((g.x + z * 12.0 + 0.5) / 144.0, (g.y + 0.5) / 12.0);
      vec2 b = vec2((g.x + min(11.0, z + 1.0) * 12.0 + 0.5) / 144.0, a.y);
      return mix(texture2D(atlas, a), texture2D(atlas, b), fract(g.z));
    }
    vec4 sampleLiquidAppearance(vec3 p) { return sampleAppearanceAtlas(uAppearanceAtlas, p); }
    vec4 suspendedOptics(vec3 p) {
      vec3 eye = (uAppearanceWorldToLocal * vec4(cameraPosition, 1.0)).xyz;
      // Orthographic rays are parallel; camera position is not their origin.
      vec3 cameraForward = -vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
      vec3 ray = isOrthographic ? normalize(mat3(uAppearanceWorldToLocal) * cameraForward) : normalize(p - eye);
      vec3 safeRay = mix(mix(vec3(-0.00001), vec3(0.00001), step(vec3(0.0), ray)), ray, step(vec3(0.00001), abs(ray)));
      vec3 a = (uAppearanceMin - p) / safeRay;
      vec3 b = (uAppearanceMin + uAppearanceSize - p) / safeRay;
      vec3 nearBox = min(a, b), farBox = max(a, b);
      float enter = max(0.0, max(nearBox.x, max(nearBox.y, nearBox.z)));
      float leave = min(farBox.x, min(farBox.y, farBox.z));
      float stepLength = max(0.0, leave - enter) / 12.0;
      float transmission = 1.0;
      vec3 scattered = vec3(0.0);
      // Integrate the coarse suspended-solid field through the vessel. Sampling
      // only the glass wall would hide a plume in the middle and paint its cap.
      for (int i = 0; i < 12; i++) {
        float start = enter + float(i) * stepLength;
        vec3 q = p + ray * (start + 0.5 * stepLength);
        float height = clamp((q.y - uAppearanceMin.y) / uAppearanceSize.y, 0.0, 1.0) * 31.0;
        int low = int(floor(height));
        float wall = mix(uAppearanceRadii[low], uAppearanceRadii[min(31, low + 1)], fract(height));
        // Fractional segment/chord overlap avoids binary edge aliasing. This
        // is exact for a cylinder; a tapered wall is locally cylindrical over
        // this height interval, consistent with the coarse density quadrature.
        vec3 segment = p + ray * start;
        float segmentNear = 0.0, segmentFar = stepLength;
        float radialA = dot(ray.xz, ray.xz), radialB = dot(segment.xz, ray.xz);
        float radialC = dot(segment.xz, segment.xz) - wall * wall;
        if (radialA > 0.00000001) {
          float discriminant = radialB * radialB - radialA * radialC;
          if (discriminant <= 0.0) continue;
          float root = sqrt(discriminant);
          segmentNear = max(segmentNear, (-radialB - root) / radialA);
          segmentFar = min(segmentFar, (-radialB + root) / radialA);
        } else if (radialC > 0.0) continue;
        if (uAppearanceVortex.w < 0.5) {
          float planeDepth = uAppearanceSurface.w - dot(uAppearanceSurface.xyz, segment);
          float planeSlope = dot(uAppearanceSurface.xyz, ray);
          if (planeSlope > 0.00000001) segmentFar = min(segmentFar, planeDepth / planeSlope);
          else if (planeSlope < -0.00000001) segmentNear = max(segmentNear, planeDepth / planeSlope);
          else if (planeDepth < 0.0) continue;
        }
        float wetLength = max(0.0, segmentFar - segmentNear);
        if (wetLength <= 0.0) continue;
        q = segment + ray * (0.5 * (segmentNear + segmentFar));
        float r2 = dot(q.xz, q.xz);
        float surfaceDepth = uAppearanceSurface.w - dot(uAppearanceSurface.xyz, q);
        if (uAppearanceVortex.w > 0.5) surfaceDepth = uAppearanceVortex.z
          + uAppearanceVortex.y * r2 / (uAppearanceVortex.x + r2) - q.y;
        if (surfaceDepth >= -0.000001) {
          vec4 optics = uHasSuspensionAtlas ? sampleAppearanceAtlas(uSuspensionAtlas, q)
            : vec4(uAppearanceSuspension, 1.0) * -log(max(0.0001, 1.0 - sampleLiquidAppearance(q).a));
          float alpha = 1.0 - exp(-optics.a * wetLength * uOpticalPathScale);
          scattered += transmission * alpha * optics.rgb / max(0.000001, optics.a);
          transmission *= 1.0 - alpha;
        }
      }
      return vec4(scattered / max(0.000001, 1.0 - transmission), 1.0 - transmission);
    }
  ` + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
    vec4 localAppearance = sampleLiquidAppearance(${position});
    vec4 suspension = suspendedOptics(${position});
    localAppearance.a = suspension.a;
    float chroma = max(localAppearance.r, max(localAppearance.g, localAppearance.b)) - min(localAppearance.r, min(localAppearance.g, localAppearance.b));
    float absorption = max(chroma, 1.0 - max(localAppearance.r, max(localAppearance.g, localAppearance.b)));
    float clearAlpha = ${surface ? '0.18' : '0.12'} + absorption * 0.65;
    float localAlpha = mix(clearAlpha, 0.96, localAppearance.a);
    diffuseColor.rgb = mix(localAppearance.rgb, suspension.rgb, 0.96 * localAppearance.a / max(0.001, localAlpha));
    diffuseColor.a = localAlpha;
  `);
}
