import * as THREE from 'three';
import { LiquidAppearanceField } from '../../simulation/effects/LiquidAppearanceField';
import type { ParticleBounds } from '../../simulation/effects/particleBounds';
import { metersPerModelUnit } from '../../science/sceneUnits';
import { SUSPENSION_REFERENCE_PATH_M } from '../../science/opticalDepth';
import { SUSPENSION_RAY_GEOMETRY } from './suspensionRayGeometry';

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
    uAppearanceContour: { value: Array.from({ length: 32 }, () => new THREE.Vector2()) },
    uAppearanceContourCount: { value: 0 },
    uAppearanceSurface: { value: new THREE.Vector4(0, 1, 0, 1e6) },
    uAppearanceVortex: { value: new THREE.Vector4(1, 0, 0, 0) },
    uSuspensionAtlas: { value: opticalTexture }, uHasSuspensionAtlas: { value: false },
    uHasVisibleSuspension: { value: false },
    uOpticalPathScale: { value: 1 } };
  let revision = -1;
  let suspensionRevision = -1;
  let spatialVisible = false, fallbackVisible = false;
  let contourProfile: ParticleBounds['vesselProfile'];
  let contourKey: string | undefined;
  return { uniforms, texture, opticalTexture, dispose() { texture.dispose(); opticalTexture.dispose(); },
    update(suspension: string, matrixWorld?: THREE.Matrix4, bounds?: ParticleBounds) {
    uniforms.uAppearanceMin.value.set(-field.radius, field.baseY, -field.radius);
    uniforms.uAppearanceSize.value.set(2 * field.radius, field.depth, 2 * field.radius);
    uniforms.uAppearanceSuspension.value.set(suspension);
    uniforms.uHasSuspensionAtlas.value = field.usesSpatialSuspension;
    uniforms.uOpticalPathScale.value = metersPerModelUnit(bounds?.vesselProfile) / SUSPENSION_REFERENCE_PATH_M;
    if (suspensionRevision !== field.suspensionRevision) {
      spatialVisible = false;
      for (let i = 0; i < opticalPixels.length; i += 4) {
        // Preserve chromatic ratios even beyond half-float's depth range.
        const scale = Math.min(1, 65504 / Math.max(1, field.suspensionOptics[i + 3]));
        spatialVisible ||= field.suspensionOptics[i + 3] > 0;
        for (let c = 0; c < 4; c++) opticalPixels[i + c] = THREE.DataUtils.toHalfFloat(field.suspensionOptics[i + c] * scale);
      }
      opticalTexture.needsUpdate = true; suspensionRevision = field.suspensionRevision;
    }
    if (matrixWorld) uniforms.uAppearanceWorldToLocal.value.copy(matrixWorld).invert();
    const key = `${bounds?.vesselProfile?.type}:${field.radius}:${field.baseY}:${field.depth}`;
    if (key !== contourKey || contourProfile !== bounds?.vesselProfile) {
      const points = bounds?.vesselProfile?.contour ?? (bounds?.vesselProfile
        ? Array.from({ length: 32 }, (_, i) => {
          const y = field.baseY + field.depth * i / 31;
          return [bounds.vesselProfile!.r(y), y];
        }) : [[field.radius, field.baseY], [field.radius, field.baseY + field.depth]]);
      // Catalog contours currently have at most 18 nodes. Do not resample away
      // sharp shoulders/corners; the same polyline defines the glass geometry.
      if (points.length > 32) throw new Error('Liquid optical contour exceeds 32 nodes');
      points.forEach(([r, y], i) => uniforms.uAppearanceContour.value[i].set(r, y));
      uniforms.uAppearanceContourCount.value = points.length;
      contourKey = key; contourProfile = bounds?.vesselProfile;
    }
    const plane = bounds?.surfacePlane, vortex = plane?.vortex;
    uniforms.uAppearanceSurface.value.set(plane?.normal[0] ?? 0, plane?.normal[1] ?? 1, plane?.normal[2] ?? 0,
      plane?.offset ?? bounds?.surfaceY ?? field.baseY + field.depth);
    uniforms.uAppearanceVortex.value.set((vortex?.coreRadius ?? 1) ** 2, vortex?.amplitude ?? 0, vortex?.offset ?? 0, vortex ? 1 : 0);
    if (revision !== field.revision) {
      texture.needsUpdate = true; revision = field.revision;
      fallbackVisible = false;
      for (let i = 3; i < field.pixels.length && !fallbackVisible; i += 4) fallbackVisible = field.pixels[i] > 0;
    }
    uniforms.uHasVisibleSuspension.value = field.usesSpatialSuspension ? spatialVisible : fallbackVisible;
  } };
}
export function shadeSpatialLiquid(shader: THREE.WebGLProgramParametersWithUniforms,
  uniforms: ReturnType<typeof createSpatialLiquidAppearance>['uniforms'], position: string, surface: boolean) {
  Object.assign(shader.uniforms, uniforms);
  shader.fragmentShader = `
    uniform sampler2D uAppearanceAtlas, uSuspensionAtlas;
    uniform bool uHasSuspensionAtlas, uHasVisibleSuspension;
    uniform float uOpticalPathScale;
    uniform vec3 uAppearanceMin, uAppearanceSize, uAppearanceSuspension;
    uniform mat4 uAppearanceWorldToLocal;
    uniform vec2 uAppearanceContour[32];
    uniform int uAppearanceContourCount;
    uniform vec4 uAppearanceSurface, uAppearanceVortex;
    vec4 sampleAppearanceAtlas(sampler2D atlas, vec3 p) {
      vec3 g = clamp((p - uAppearanceMin) / uAppearanceSize, 0.0, 1.0) * 11.0;
      float z = floor(g.z);
      vec2 a = vec2((g.x + z * 12.0 + 0.5) / 144.0, (g.y + 0.5) / 12.0);
      vec2 b = vec2((g.x + min(11.0, z + 1.0) * 12.0 + 0.5) / 144.0, a.y);
      return mix(texture2D(atlas, a), texture2D(atlas, b), fract(g.z));
    }
    vec4 sampleLiquidAppearance(vec3 p) { return sampleAppearanceAtlas(uAppearanceAtlas, p); }
    ${SUSPENSION_RAY_GEOMETRY}
    vec4 suspendedOptics(vec3 p) {
      if (!uHasVisibleSuspension) return vec4(0.0);
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
      if (leave <= enter) return vec4(0.0);
      return integrateVesselSuspension(p, ray, enter, leave);
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
