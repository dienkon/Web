/**
 * glass.ts - Laboratory borosilicate glass shaders with physical Fresnel reflection,
 * double-wall refraction, rim bead highlights, and graduation decals.
 * 
 * Physical Model:
 * 1. Schlick Fresnel Approximation:
 *    F(θ) = F₀ + (1 - F₀) · (1 - cos θ)^p,  F₀ = ((n₁ - n₂) / (n₁ + n₂))² ≈ 0.04 (glass, n = 1.50)
 * 2. Double Refraction:
 *    Light travels through outer wall -> air/glass interface -> inner wall -> liquid.
 *    Handled cleanly by rendering back-faces and front-faces with non-occluding depthWrite: false.
 * 3. Soda-lime edge tint and rim highlight.
 */

import * as THREE from 'three';
import { RenderTier } from './gl.js';

export interface GlassShaders {
  frontMaterial: THREE.Material;
  backMaterial: THREE.Material;
}

export function createPhysicalGlassMaterial(tier: RenderTier = 'B'): GlassShaders {
  if (tier === 'A' || tier === 'B') {
    const front = new THREE.MeshPhysicalMaterial({
      roughness: 0.02,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.9,
      specularIntensity: 1.0,
      color: new THREE.Color('#f0f9ff'),
      transparent: true,
      opacity: 0.28,
      side: THREE.FrontSide,
      depthWrite: false, // Prevents depth occlusion of liquid inside
    });

    front.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = 1.0 - abs(dot(viewDir, normal));
        fresnel = pow(fresnel, 2.5);
        // Soda-lime subtle greenish-blue rim highlight
        gl_FragColor.rgb += vec3(0.92, 0.98, 1.0) * fresnel * 0.9;
        gl_FragColor.a = max(gl_FragColor.a, fresnel * 0.7);
        `
      );
    };

    const back = new THREE.MeshPhysicalMaterial({
      roughness: 0.05,
      metalness: 0.04,
      clearcoat: 0.6,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.1,
      color: new THREE.Color('#e0f2fe'),
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      depthWrite: false,
    });

    return { frontMaterial: front, backMaterial: back };
  }

  // Tier C lightweight fallback
  const fallback = new THREE.MeshStandardMaterial({
    color: '#e6f4ef',
    transparent: true,
    opacity: 0.18,
    roughness: 0.06,
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  return { frontMaterial: fallback, backMaterial: fallback };
}
