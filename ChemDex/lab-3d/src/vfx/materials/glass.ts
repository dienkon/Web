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
  } else if (type === 'volumetric_flask') {
    // Volumetric Flask: pear/bulbous bottom with very tall, narrow neck
    outerPoints.push(new THREE.Vector2(0, -0.95));
    outerPoints.push(new THREE.Vector2(0.65, -0.95));
    outerPoints.push(new THREE.Vector2(1.05, -0.65));
    outerPoints.push(new THREE.Vector2(1.08, -0.2));
    outerPoints.push(new THREE.Vector2(0.65, 0.35));
    outerPoints.push(new THREE.Vector2(0.19, 0.65));
    outerPoints.push(new THREE.Vector2(0.18, 1.85));
    outerPoints.push(new THREE.Vector2(0.24, 1.95)); // Flared ground glass mouth

    innerPoints.push(new THREE.Vector2(0, -0.91));
    innerPoints.push(new THREE.Vector2(0.62, -0.91));
    innerPoints.push(new THREE.Vector2(1.01, -0.63));
    innerPoints.push(new THREE.Vector2(1.04, -0.2));
    innerPoints.push(new THREE.Vector2(0.62, 0.35));
    innerPoints.push(new THREE.Vector2(0.16, 0.65));
    innerPoints.push(new THREE.Vector2(0.15, 1.92));
  } else if (type === 'separatory_funnel') {
    // Separatory Funnel: conical pear-shaped body tapering to narrow stopcock stem
    outerPoints.push(new THREE.Vector2(0.09, -1.25)); // Lower drip stem
    outerPoints.push(new THREE.Vector2(0.09, -0.55));
    outerPoints.push(new THREE.Vector2(0.18, -0.45)); // Stopcock bulge
    outerPoints.push(new THREE.Vector2(0.22, -0.25));
    outerPoints.push(new THREE.Vector2(0.92, 0.45));  // Conical flare
    outerPoints.push(new THREE.Vector2(0.96, 0.85));  // Bulb curve
    outerPoints.push(new THREE.Vector2(0.32, 1.40));  // Shoulder
    outerPoints.push(new THREE.Vector2(0.26, 1.70));  // Neck
    outerPoints.push(new THREE.Vector2(0.32, 1.78));  // Rim

    innerPoints.push(new THREE.Vector2(0.06, -1.25));
    innerPoints.push(new THREE.Vector2(0.06, -0.55));
    innerPoints.push(new THREE.Vector2(0.14, -0.45));
    innerPoints.push(new THREE.Vector2(0.18, -0.25));
    innerPoints.push(new THREE.Vector2(0.88, 0.45));
    innerPoints.push(new THREE.Vector2(0.92, 0.85));
    innerPoints.push(new THREE.Vector2(0.28, 1.40));
    innerPoints.push(new THREE.Vector2(0.22, 1.76));
  } else if (type === 'filter_funnel') {
    // Filter Funnel: 60° conical funnel bowl on top of narrow delivery stem
    outerPoints.push(new THREE.Vector2(0.10, -1.15));
    outerPoints.push(new THREE.Vector2(0.10, -0.15));
    outerPoints.push(new THREE.Vector2(0.18, -0.05));
    outerPoints.push(new THREE.Vector2(0.96, 0.85));
    outerPoints.push(new THREE.Vector2(1.02, 0.92));

    innerPoints.push(new THREE.Vector2(0.07, -1.15));
    innerPoints.push(new THREE.Vector2(0.07, -0.15));
    innerPoints.push(new THREE.Vector2(0.14, -0.05));
    innerPoints.push(new THREE.Vector2(0.92, 0.85));
    innerPoints.push(new THREE.Vector2(0.96, 0.90));
  } else if (type === 'mortar_pestle') {
    // Mortar: heavy thick-walled ceramic hemispherical basin
    outerPoints.push(new THREE.Vector2(0, -0.65));
    outerPoints.push(new THREE.Vector2(0.72, -0.65));
    outerPoints.push(new THREE.Vector2(0.85, -0.55));
    outerPoints.push(new THREE.Vector2(1.02, 0.20));
    outerPoints.push(new THREE.Vector2(1.06, 0.32)); // Heavy rim

    innerPoints.push(new THREE.Vector2(0, -0.42));
    innerPoints.push(new THREE.Vector2(0.55, -0.38));
    innerPoints.push(new THREE.Vector2(0.78, 0.05));
    innerPoints.push(new THREE.Vector2(0.84, 0.30));
  } else if (type === 'condenser') {
    // Liebig Condenser: outer water cooling sleeve with inner straight vapor tube
    outerPoints.push(new THREE.Vector2(0.16, -1.25));
    outerPoints.push(new THREE.Vector2(0.16, -0.90));
    outerPoints.push(new THREE.Vector2(0.38, -0.80));
    outerPoints.push(new THREE.Vector2(0.38, 1.25));
    outerPoints.push(new THREE.Vector2(0.16, 1.35));
    outerPoints.push(new THREE.Vector2(0.16, 1.65));
    outerPoints.push(new THREE.Vector2(0.20, 1.70));

    innerPoints.push(new THREE.Vector2(0.12, -1.25));
    innerPoints.push(new THREE.Vector2(0.12, 1.68));
  } else if (type === 'wash_bottle') {
    // Wash bottle: flexible translucent PE bottle body
    outerPoints.push(new THREE.Vector2(0, -0.95));
    outerPoints.push(new THREE.Vector2(0.68, -0.95));
    outerPoints.push(new THREE.Vector2(0.74, -0.85));
    outerPoints.push(new THREE.Vector2(0.74, 0.75));
    outerPoints.push(new THREE.Vector2(0.30, 1.15));
    outerPoints.push(new THREE.Vector2(0.28, 1.35));
    outerPoints.push(new THREE.Vector2(0.32, 1.40));

    innerPoints.push(new THREE.Vector2(0, -0.91));
    innerPoints.push(new THREE.Vector2(0.65, -0.91));
    innerPoints.push(new THREE.Vector2(0.70, -0.83));
    innerPoints.push(new THREE.Vector2(0.70, 0.74));
    innerPoints.push(new THREE.Vector2(0.26, 1.14));
    innerPoints.push(new THREE.Vector2(0.24, 1.38));
  } else if (type === 'test_tube_rack' || type === 'tongs') {
    // Cylindrical base profile for rack/tongs mount
    outerPoints.push(new THREE.Vector2(0, -0.2));
    outerPoints.push(new THREE.Vector2(0.85, -0.2));
    outerPoints.push(new THREE.Vector2(0.85, 0.2));
    innerPoints.push(new THREE.Vector2(0, -0.15));
    innerPoints.push(new THREE.Vector2(0.8, -0.15));
    innerPoints.push(new THREE.Vector2(0.8, 0.18));
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
  } else if (type === 'watch_glass') {
    // Watch Glass: shallow spherical cap, r ~ 1.05, slight curvature
    const samples = 14;
    const maxR = 1.05;
    const depth = 0.18;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const r = t * maxR;
      const y = -depth * (1.0 - t * t);
      outerPoints.push(new THREE.Vector2(r, y));
    }
    outerPoints.push(new THREE.Vector2(maxR + 0.025, 0.02));

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const r = t * (maxR - 0.02);
      const y = -depth * (1.0 - t * t) + 0.025;
      innerPoints.push(new THREE.Vector2(r, y));
    }
  } else if (type === 'evaporating_dish') {
    // Evaporating Dish: spherical porcelain bowl with wide open mouth
    const samples = 16;
    for (let i = 0; i <= samples; i++) {
      const theta = (i / samples) * (Math.PI * 0.44); // ~80 degrees
      const r = Math.sin(theta) * 1.12;
      const y = -0.42 + (1.0 - Math.cos(theta)) * 0.72;
      outerPoints.push(new THREE.Vector2(r, y));
    }
    outerPoints.push(new THREE.Vector2(1.16, 0.35)); // Pour rim

    for (let i = 0; i <= samples; i++) {
      const theta = (i / samples) * (Math.PI * 0.43);
      const r = Math.sin(theta) * 1.06;
      const y = -0.38 + (1.0 - Math.cos(theta)) * 0.69;
      innerPoints.push(new THREE.Vector2(r, y));
    }
  } else if (type === 'crucible') {
    // Porcelain Crucible: tapered tall ceramic cup
    outerPoints.push(new THREE.Vector2(0, -0.65));
    outerPoints.push(new THREE.Vector2(0.38, -0.65));
    outerPoints.push(new THREE.Vector2(0.44, -0.58));
    outerPoints.push(new THREE.Vector2(0.68, 0.48));
    outerPoints.push(new THREE.Vector2(0.72, 0.52)); // Top lip

    innerPoints.push(new THREE.Vector2(0, -0.60));
    innerPoints.push(new THREE.Vector2(0.34, -0.60));
    innerPoints.push(new THREE.Vector2(0.40, -0.55));
    innerPoints.push(new THREE.Vector2(0.64, 0.50));
  } else if (type === 'petri_dish') {
    // Petri Dish: shallow flat glass dish with vertical rim
    outerPoints.push(new THREE.Vector2(0, -0.22));
    outerPoints.push(new THREE.Vector2(1.10, -0.22));
    outerPoints.push(new THREE.Vector2(1.15, -0.18));
    outerPoints.push(new THREE.Vector2(1.15, 0.20));
    outerPoints.push(new THREE.Vector2(1.18, 0.22));

    innerPoints.push(new THREE.Vector2(0, -0.18));
    innerPoints.push(new THREE.Vector2(1.08, -0.18));
    innerPoints.push(new THREE.Vector2(1.10, -0.15));
    innerPoints.push(new THREE.Vector2(1.10, 0.21));
  } else if (type === 'burette') {
    // Burette: long narrow glass tube, r = 0.14
    const r = 0.14;
    outerPoints.push(new THREE.Vector2(0, -1.8));
    outerPoints.push(new THREE.Vector2(r - 0.02, -1.8));
    outerPoints.push(new THREE.Vector2(r, -1.78));
    outerPoints.push(new THREE.Vector2(r, 1.8));
    outerPoints.push(new THREE.Vector2(r + 0.02, 1.82));

    const rIn = 0.12;
    innerPoints.push(new THREE.Vector2(0, -1.78));
    innerPoints.push(new THREE.Vector2(rIn, -1.78));
    innerPoints.push(new THREE.Vector2(rIn, 1.82));
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
  type: VesselType,
  heightAboveBase: number
): number {
  if (type === 'burette') {
    return 0.12;
  }
  if (type === 'beaker') {
    return 0.965;
  }
  if (type === 'test_tube') {
    return 0.20;
  }
  if (type === 'cylinder') {
    return 0.325;
  }
  if (type === 'watch_glass') {
    return 0.98;
  }
  if (type === 'evaporating_dish') {
    const frac = Math.max(0, Math.min(1, heightAboveBase / 0.72));
    return 0.45 + frac * 0.61;
  }
  if (type === 'crucible') {
    const frac = Math.max(0, Math.min(1, heightAboveBase / 1.1));
    return 0.38 + frac * 0.26;
  }
  if (type === 'petri_dish') {
    return 1.08;
  }
  if (type === 'volumetric_flask') {
    if (heightAboveBase <= 1.2) {
      const frac = Math.max(0, Math.min(1, heightAboveBase / 1.2));
      return 1.02 * (1.0 - Math.pow(frac - 0.4, 2));
    }
    return 0.16;
  }
  if (type === 'separatory_funnel') {
    if (heightAboveBase <= 0.6) return 0.16 + (heightAboveBase / 0.6) * 0.72;
    if (heightAboveBase <= 1.4) return 0.88 - ((heightAboveBase - 0.6) / 0.8) * 0.62;
    return 0.22;
  }
  if (type === 'filter_funnel') {
    if (heightAboveBase <= 0.8) return 0.12;
    return 0.12 + ((heightAboveBase - 0.8) / 1.0) * 0.82;
  }
  if (type === 'mortar_pestle') {
    const frac = Math.max(0, Math.min(1, heightAboveBase / 0.75));
    return 0.55 + frac * 0.30;
  }
  if (type === 'condenser') {
    return 0.14;
  }
  if (type === 'wash_bottle') {
    if (heightAboveBase <= 1.6) return 0.70;
    return 0.26;
  }
  if (type === 'test_tube_rack' || type === 'tongs') {
    return 0.80;
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


