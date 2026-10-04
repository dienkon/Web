import * as THREE from 'three';
import { QualityTier } from '../quality';

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
    // Physical borosilicate glass with authentic clearcoat and edge reflection without depth occlusion
    const front = new THREE.MeshPhysicalMaterial({
      roughness: 0.03,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.8,
      specularIntensity: 1.0,
      color: new THREE.Color('#f0f9ff'),
      transparent: true,
      opacity: 0.26,
      side: THREE.FrontSide,
      depthWrite: false, // Ensures liquid inside is 100% visible from all horizontal angles!
    });

    front.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        vec3 vDir = normalize(vViewPosition);
        float fresnel = 1.0 - abs(dot(vDir, normal));
        fresnel = pow(fresnel, 2.6);
        gl_FragColor.rgb += vec3(0.92, 0.97, 1.0) * fresnel * 0.85;
        gl_FragColor.a = max(gl_FragColor.a, fresnel * 0.65);
        `
      );
    };

    const back = new THREE.MeshPhysicalMaterial({
      roughness: 0.06,
      metalness: 0.05,
      clearcoat: 0.6,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.1,
      color: new THREE.Color('#e0f2fe'),
      transparent: true,
      opacity: 0.18,
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
 * Creates authentic 2D profile points for LatheGeometry of laboratory vessels
 */
export function createVesselLatheGeometry(
  type: 'beaker' | 'flask' | 'test_tube' | 'cylinder',
  segments = 36
): { outer: THREE.BufferGeometry; inner: THREE.BufferGeometry } {
  const outerPoints: THREE.Vector2[] = [];
  const innerPoints: THREE.Vector2[] = [];

  if (type === 'beaker') {
    // Beaker: y from -1.0 to 1.0, r = 1.0
    outerPoints.push(new THREE.Vector2(0, -1.0));
    outerPoints.push(new THREE.Vector2(0.92, -1.0));
    outerPoints.push(new THREE.Vector2(1.0, -0.95));
    outerPoints.push(new THREE.Vector2(1.0, 0.95));
    outerPoints.push(new THREE.Vector2(1.04, 1.0)); // Rim bead

    innerPoints.push(new THREE.Vector2(0, -0.96));
    innerPoints.push(new THREE.Vector2(0.965, -0.96));
    innerPoints.push(new THREE.Vector2(0.965, 0.98));
  } else if (type === 'flask') {
    // Erlenmeyer Flask: y from -1.0 to 1.5, rBase = 1.25, rNeck = 0.38
    outerPoints.push(new THREE.Vector2(0, -1.0));
    outerPoints.push(new THREE.Vector2(1.16, -1.0));
    outerPoints.push(new THREE.Vector2(1.25, -0.95));
    outerPoints.push(new THREE.Vector2(0.38, 0.7));
    outerPoints.push(new THREE.Vector2(0.38, 1.45));
    outerPoints.push(new THREE.Vector2(0.42, 1.5)); // Flared rim bead

    innerPoints.push(new THREE.Vector2(0, -0.96));
    innerPoints.push(new THREE.Vector2(1.215, -0.96));
    innerPoints.push(new THREE.Vector2(0.35, 0.7));
    innerPoints.push(new THREE.Vector2(0.35, 1.48));
  } else if (type === 'test_tube') {
    // Test Tube: radius 0.22, bottom dome around (0, -0.6), cylinder up to 1.2
    const r = 0.22;
    const domeSamples = 12;

    for (let i = 0; i <= domeSamples; i++) {
      const angle = (i / domeSamples) * (Math.PI / 2);
      const px = Math.sin(angle) * r;
      const py = -0.6 - Math.cos(angle) * r;
      outerPoints.push(new THREE.Vector2(px, py));
    }
    outerPoints.push(new THREE.Vector2(r, 1.16));
    outerPoints.push(new THREE.Vector2(r + 0.025, 1.2));

    const rIn = 0.20;
    for (let i = 0; i <= domeSamples; i++) {
      const angle = (i / domeSamples) * (Math.PI / 2);
      const px = Math.sin(angle) * rIn;
      const py = -0.6 - Math.cos(angle) * rIn + 0.02;
      innerPoints.push(new THREE.Vector2(px, py));
    }
    innerPoints.push(new THREE.Vector2(rIn, 1.18));
  } else {

    // Graduated Cylinder: y from -0.9 to 1.7, r = 0.35
    const r = 0.35;
    outerPoints.push(new THREE.Vector2(0, -0.9));
    outerPoints.push(new THREE.Vector2(r - 0.04, -0.9));
    outerPoints.push(new THREE.Vector2(r, -0.86));
    outerPoints.push(new THREE.Vector2(r, 1.65));
    outerPoints.push(new THREE.Vector2(r + 0.035, 1.7));

    const rIn = 0.325;
    innerPoints.push(new THREE.Vector2(0, -0.87));
    innerPoints.push(new THREE.Vector2(rIn, -0.87));
    innerPoints.push(new THREE.Vector2(rIn, 1.68));
  }

  const outer = new THREE.LatheGeometry(outerPoints, segments);
  const inner = new THREE.LatheGeometry(innerPoints, segments);

  return { outer, inner };
}

/**
 * Returns the internal radius of the vessel at height y
 */
export function getVesselInnerRadius(
  type: 'beaker' | 'flask' | 'test_tube' | 'cylinder',
  heightAboveBase: number
): number {
  if (type === 'beaker') {
    return 0.965;
  }
  if (type === 'test_tube') {
    return 0.20;
  }

  if (type === 'cylinder') {
    return 0.325;
  }
  // Flask: conical profile
  const rBase = 1.215;
  const rNeck = 0.35;
  const hConical = 1.66;
  if (heightAboveBase <= 0) return rBase;
  if (heightAboveBase >= hConical) return rNeck;
  const frac = heightAboveBase / hConical;
  return rBase - frac * (rBase - rNeck);
}

