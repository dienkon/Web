import * as THREE from 'three';
import type { PhysicalEvaporationParticle } from '../core/SimulationTypes';

/** Optical packet size and opacity are separate. Dissipation must not collapse
 * an expanding mist puff to an ever-smaller opaque white dot. */
export function mistParticleAppearance(p: PhysicalEvaporationParticle) {
  const phase = p.life > 0 ? Math.max(0, Math.min(1, p.age / p.life)) : 1;
  return { diameter: Math.max(0, p.size * 2),
    opacity: Math.max(0, Math.min(1, p.opacity * Math.sin(Math.PI * phase))) };
}

/** Retain Three's texture, color-space, fog and tone-mapping pipeline while
 * applying each packet's measured display opacity to the fragment alpha. */
export function createInstancedMistMaterial(texture: THREE.Texture): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({ map: texture, color: '#f8fafc', transparent: true,
    opacity: 1, depthWrite: false, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      '#include <common>\nattribute float aMistOpacity;\nvarying float vMistOpacity;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMistOpacity = aMistOpacity;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying float vMistOpacity;')
      .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= clamp(vMistOpacity, 0.0, 1.0);');
  };
  material.customProgramCacheKey = () => 'instanced-water-mist-opacity-v1';
  return material;
}
