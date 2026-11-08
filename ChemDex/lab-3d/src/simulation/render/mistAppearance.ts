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
      '#include <common>\nattribute float aMistOpacity;\nattribute vec2 aMistStructure;\nvarying float vMistOpacity;\nvarying vec2 vMistStructure;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMistOpacity = aMistOpacity;\nvMistStructure = aMistStructure;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      `#include <common>
      varying float vMistOpacity;
      varying vec2 vMistStructure;
      float mistHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float mistNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mistHash(i), mistHash(i + vec2(1.0, 0.0)), f.x),
          mix(mistHash(i + vec2(0.0, 1.0)), mistHash(i + vec2(1.0)), f.x), f.y);
      }`)
      .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
        // A bounded optical density pattern carried by each retained puff.
        // Age is simulation time: pause and time scale cannot drift the noise.
        vec2 mistPoint = vMapUv * 3.8 + vec2(vMistStructure.x * 7.3, -vMistStructure.y * 0.35);
        float density = 0.62 + 0.38 * mistNoise(mistPoint);
        diffuseColor.a *= clamp(vMistOpacity, 0.0, 1.0) * density;`);
  };
  material.customProgramCacheKey = () => 'instanced-water-mist-structure-v2';
  return material;
}
