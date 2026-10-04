/**
 * GEOMETRIC PROFILES FOR LABORATORY GLASSWARE
 * Defines internal radii r(y), rim heights, pouring lips, and weir spout widths.
 */

export interface VesselProfile {
  type: 'beaker' | 'flask' | 'cylinder' | 'test_tube' | 'reagent_bottle';
  H: number;                       // Total internal height (scene units)
  baseY: number;                   // Y coordinate of inner floor
  r: (y: number) => number;        // Internal radius as function of height y
  lipLocal: [number, number, number]; // Spout / pouring lip in local coordinates
  mouthR: number;                  // Mouth radius for receiving stream
  spoutWidth: number;              // Effective spout weir width
  capacity_ml: number;             // Maximum volume capacity in mL
  sceneScale: number;              // Scene units to cm conversion factor
}

export const VESSEL_PROFILES: Record<string, VesselProfile> = {
  beaker: {
    type: 'beaker',
    H: 2.0,
    baseY: -0.96,
    r: () => 0.965,
    lipLocal: [0.98, 1.0, 0],
    mouthR: 0.965,
    spoutWidth: 0.28,
    capacity_ml: 250,
    sceneScale: 3.5, // 1 scene unit ≈ 3.5 cm
  },
  flask: {
    type: 'flask',
    H: 2.45,
    baseY: -0.96,
    r: (y: number) => {
      // Conical profile from baseY (-0.96) up to neck (0.7), then straight cylindrical neck up to 1.48
      const hBase = -0.96;
      const hNeck = 0.7;
      const rBase = 1.215;
      const rNeck = 0.35;
      if (y <= hBase) return rBase;
      if (y >= hNeck) return rNeck;
      const frac = (y - hBase) / (hNeck - hBase);
      return rBase - frac * (rBase - rNeck);
    },
    lipLocal: [0.38, 1.48, 0],
    mouthR: 0.35,
    spoutWidth: 0.16,
    capacity_ml: 250,
    sceneScale: 3.2,
  },
  cylinder: {
    type: 'cylinder',
    H: 2.55,
    baseY: -0.87,
    r: () => 0.325,
    lipLocal: [0.34, 1.68, 0],
    mouthR: 0.325,
    spoutWidth: 0.14,
    capacity_ml: 100,
    sceneScale: 2.8,
  },
  test_tube: {
    type: 'test_tube',
    H: 1.85,
    baseY: -0.78,
    r: (y: number) => {
      const rTube = 0.20;
      const domeCenterY = -0.6;
      if (y >= domeCenterY) return rTube;
      // Hemispherical bottom cap
      const dy = domeCenterY - y;
      if (dy >= rTube) return 0.01;
      return Math.sqrt(Math.max(0.001, rTube * rTube - dy * dy));
    },
    lipLocal: [0.21, 1.18, 0],
    mouthR: 0.20,
    spoutWidth: 0.12,
    capacity_ml: 50,
    sceneScale: 2.2,
  },
  reagent_bottle: {
    type: 'reagent_bottle',
    H: 2.1,
    baseY: -0.92,
    r: (y: number) => {
      if (y >= 0.5) return 0.14; // Bottle neck
      if (y >= 0.2) return 0.14 + (0.5 - y) / 0.3 * (0.35 - 0.14); // Shoulder
      return 0.35; // Bottle body
    },
    lipLocal: [0.15, 0.95, 0],
    mouthR: 0.14,
    spoutWidth: 0.11,
    capacity_ml: 150,
    sceneScale: 3.0,
  }
};

export function getVesselProfile(type: string): VesselProfile {
  if (type in VESSEL_PROFILES) {
    return VESSEL_PROFILES[type];
  }
  return VESSEL_PROFILES.beaker;
}
