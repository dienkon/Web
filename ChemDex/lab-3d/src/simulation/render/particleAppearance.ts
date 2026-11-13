import * as THREE from 'three';
import type { PhysicalBubble, PhysicalPrecipitateParticle, PrecipitateProfile } from '../core/SimulationTypes';
import { pointPlaneDepth } from '../effects/liquidParticleFrame';
import type { ParticleBounds } from '../effects/particleBounds';

const opacity = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

/** The simulation owns burst drainage and the gas envelope. Rendering only
 * uploads its opacity; there is no second lifetime or visual source of gas. */
export function bubbleOpacity(bubble: Pick<PhysicalBubble, 'opacity'>) {
  return opacity(bubble.opacity);
}

export function precipitateOpacity(particle: Pick<PhysicalPrecipitateParticle, 'opacity'>, profile: PrecipitateProfile) {
  return opacity(particle.opacity) * (profile.morphology === 'gel_like' ? 0.68 : 1);
}
/** Representative flocs below a cloudy surface fade with optical depth rather
 * than being composited on top of the water as a floating gravel layer. */
export function immersedPrecipitateOpacity(particle: PhysicalPrecipitateParticle, profile: PrecipitateProfile, bounds?: ParticleBounds, haze = 0) {
  const depth = bounds ? Math.max(0, pointPlaneDepth(particle, bounds.surfaceY, bounds.surfacePlane))
    / Math.max(0.02, bounds.surfaceY - bounds.liquidBottomY) : 0;
  return precipitateOpacity(particle, profile) * Math.exp(-depth * Math.max(0, haze) * 4);
}

/** One attribute is shared by all instanced optical packets. Keep Three's
 * standard lighting, fog, tone mapping and output color transform. */
export function withParticleOpacity<T extends THREE.Material>(material: T): T {
  const original = material.onBeforeCompile.bind(material);
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    original(shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      '#include <common>\nattribute float aParticleOpacity;\nvarying float vParticleOpacity;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvParticleOpacity = aParticleOpacity;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying float vParticleOpacity;')
      .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= clamp(vParticleOpacity, 0.0, 1.0);');
  };
  material.customProgramCacheKey = () => `${key}:packet-opacity-v1`;
  return material;
}

/** Optical finish follows the species profile. Dielectric crystals can glint
 * without being colored as metal or emitting their own light. */
export function precipitateFinish(profile: PrecipitateProfile) {
  const crystalline = profile.morphology === 'crystalline';
  return { roughness: profile.roughness, metalness: profile.metalness ?? 0,
    specularIntensity: profile.specularReflectivity,
    clearcoat: crystalline ? 0.65 : profile.morphology === 'gel_like' ? 0.2 : 0,
    clearcoatRoughness: crystalline ? 0.1 : 0.3 };
}
