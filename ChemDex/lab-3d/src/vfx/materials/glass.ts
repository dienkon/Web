import { vesselContours } from '../../science/vesselContours';
import * as THREE from 'three';
import { QualityTier } from '../quality';
import { VesselType } from '../../types/chemistry';

export interface GlassMaterialSet {
  front: THREE.Material;
  back: THREE.Material;
}

const glassCache = new Map<QualityTier, GlassMaterialSet>();

/**
 * Creates or retrieves cached glass materials for each quality tier
 */
export function getGlassMaterials(tier: QualityTier): GlassMaterialSet {
  if (glassCache.has(tier)) {
    return glassCache.get(tier)!;
  }

  if (tier === 'high' || tier === 'medium') {
    // Ultra-clear laboratory borosilicate glass (Pyrex/Duran quality)
    // Highly transparent from side view with crisp edge Fresnel rim highlights
    const front = new THREE.MeshPhysicalMaterial({
      roughness: 0.015,
      metalness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.2,
      specularIntensity: 1.0,
      color: new THREE.Color('#ffffff'), // Neutral clear, no cloudy cyan cast
      transparent: true,
      opacity: 0.08, // Crystal clear looking directly into vessel from side
      side: THREE.FrontSide,
      depthWrite: false, // Ensures liquid, plumes, and precipitate inside are 100% visible
    });

    front.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        vec3 vDir = normalize(vViewPosition);
        float fresnel = 1.0 - abs(dot(vDir, normal));
        // High power (3.5) keeps central line-of-sight crystal clear, shining only at silhouette edges
        fresnel = pow(fresnel, 3.5);
        gl_FragColor.rgb += vec3(1.0, 1.0, 1.0) * fresnel * 0.95;
        gl_FragColor.a = mix(0.06, 0.68, fresnel);
        `
      );
    };

    const back = new THREE.MeshPhysicalMaterial({
      roughness: 0.03,
      metalness: 0.02,
      clearcoat: 0.5,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.0,
      color: new THREE.Color('#ffffff'),
      transparent: true,
      opacity: 0.05, // Subtle rear reflection
      side: THREE.BackSide,
      depthWrite: false,
    });

    const set = { front, back };
    glassCache.set(tier, set);
    return set;
  }

  // Low Tier: Lightweight fake glass with alpha + Fresnel onBeforeCompile
  const lowMat = new THREE.MeshStandardMaterial({
    color: '#e6f4ef',
    transparent: true,
    opacity: 0.16,
    roughness: 0.05,
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  lowMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      // Enhanced Fresnel edge highlight for glass reflection on low tier
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = 1.0 - abs(dot(viewDir, normal));
      fresnel = pow(fresnel, 2.8);
      gl_FragColor.rgb += vec3(0.9, 0.96, 1.0) * fresnel * 0.85;
      gl_FragColor.a = max(gl_FragColor.a, fresnel * 0.7);
      `
    );
  };

  const set = { front: lowMat, back: lowMat };
  glassCache.set(tier, set);
  return set;
}

/**
 * Glazed ceramic porcelain materials for crucibles and evaporating dishes
 */
const ceramicCache = new Map<QualityTier, GlassMaterialSet>();

export function getCeramicMaterials(tier: QualityTier): GlassMaterialSet {
  if (ceramicCache.has(tier)) {
    return ceramicCache.get(tier)!;
  }

  const porcelain = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f8fafc'),
    roughness: tier === 'low' ? 0.25 : 0.16,
    metalness: 0.03,
    clearcoat: tier === 'low' ? 0.3 : 0.92,
    clearcoatRoughness: 0.06,
    side: THREE.DoubleSide,
    reflectivity: 0.7,
  });

  const set = { front: porcelain, back: porcelain };
  ceramicCache.set(tier, set);
  return set;
}

/**
 * Creates authentic 2D profile points for LatheGeometry of laboratory vessels
 */
export function createVesselLatheGeometry(
  type: VesselType,
  segments = 36
): { outer: THREE.BufferGeometry; inner: THREE.BufferGeometry } {
  const contours = vesselContours(type);
  return {
    outer: new THREE.LatheGeometry(contours.outer.map(([r, y]) => new THREE.Vector2(r, y)), segments),
    inner: new THREE.LatheGeometry(contours.inner.map(([r, y]) => new THREE.Vector2(r, y)), segments),
  };
}

/**
 * Returns the internal radius of the vessel at height y
 */
export { vesselInnerRadius as getVesselInnerRadius } from '../../science/vesselDimensions';
