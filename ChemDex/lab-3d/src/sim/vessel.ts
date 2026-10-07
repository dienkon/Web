/**
 * VESSEL GEOMETRY AND THERMAL PROPERTIES (§3.3)
 * Provides:
 * - Lathe profile r(y)
 * - Numerical integration of volume: V(h) = integral_0^h (pi * r^2(y) dy)
 * - Cached monotonic LUT (256 samples) for instant volume <-> height queries
 * - Surface area at height h: A_surface = pi * r^2(h)
 * - Inner wetted area A_in(h) and outer glass heat-transfer area A_out
 * - Glass thermal mass C_glass = m_glass * Cp_glass
 */

import { mlToM3, m3ToMl, CONSTANTS } from '../core/units';

export type VesselGeometryType =
  | 'beaker'
  | 'flask'
  | 'test_tube'
  | 'cylinder'
  | 'evaporating_dish'
  | 'watch_glass'
  | 'crucible'
  | 'petri_dish'
  | 'volumetric_flask'
  | 'separatory_funnel'
  | 'filter_funnel'
  | 'mortar_pestle'
  | 'condenser'
  | 'test_tube_rack'
  | 'wash_bottle'
  | 'tongs';

export interface VesselGeometryConfig {
  type: VesselGeometryType;
  name: string;
  nominalCapacity_m3: number;   // SI m^3 (e.g. 250 mL = 2.5e-4 m^3)
  height_m: number;             // Total vessel height in meters
  baseY_m: number;
  glassThickness_m: number;     // Typical borosilicate wall thickness ~ 1.5 - 2.5 mm
  glassMass_kg: number;         // Mass of glass vessel in kg
  glassCp_J_kgK: number;        // Borosilicate glass Cp ~ 830 J/(kg·K)
  outerHeatTransferCoeff: number; // h ~ 10-15 W/(m^2·K)
  mouthRadius_m: number;
  lipPosition_m: [number, number, number]; // World offset for pouring spout
  radiusProfile: (y_m: number) => number;  // r(y) in meters
}

export class PhysicalVesselGeometry {
  public readonly config: VesselGeometryConfig;
  private readonly samplesCount = 256;
  private volumeLUT: Float32Array;   // volume at sample index
  private heightLUT: Float32Array;   // height at sample index
  private maxIntegratedVolume_m3: number;

  constructor(config: VesselGeometryConfig) {
    this.config = config;
    this.volumeLUT = new Float32Array(this.samplesCount);
    this.heightLUT = new Float32Array(this.samplesCount);

    // Precompute numerical quadrature of volume V(h) = integral_0^h pi * r^2(y) dy
    const dy = config.height_m / (this.samplesCount - 1);
    let cumulativeVol = 0;

    for (let i = 0; i < this.samplesCount; i++) {
      const y = i * dy;
      this.heightLUT[i] = y;

      if (i > 0) {
        const yPrev = (i - 1) * dy;
        const rPrev = config.radiusProfile(yPrev);
        const rCurr = config.radiusProfile(y);
        // Trapezoidal integration slice
        const sliceVol = Math.PI * 0.5 * (rPrev * rPrev + rCurr * rCurr) * dy;
        cumulativeVol += sliceVol;
      }
      this.volumeLUT[i] = cumulativeVol;
    }

    this.maxIntegratedVolume_m3 = cumulativeVol;
  }

  /**
   * Returns radius r(y) at height y relative to vessel base
   */
  public radiusAtHeight(y_m: number): number {
    const clampedY = Math.max(0, Math.min(this.config.height_m, y_m));
    return this.config.radiusProfile(clampedY);
  }

  /**
   * Returns surface area of fluid meniscus at liquid height h
   */
  public surfaceAreaAtHeight(h_m: number): number {
    const r = this.radiusAtHeight(h_m);
    return Math.PI * r * r;
  }

  /**
   * Returns liquid volume (m^3) contained up to height h_m
   */
  public volumeAtHeight(h_m: number): number {
    if (h_m <= 0) return 0;
    if (h_m >= this.config.height_m) return this.maxIntegratedVolume_m3;

    // Linear interpolation in height LUT
    const norm = h_m / this.config.height_m;
    const samplePos = norm * (this.samplesCount - 1);
    const idx = Math.floor(samplePos);
    const frac = samplePos - idx;

    if (idx >= this.samplesCount - 1) return this.volumeLUT[this.samplesCount - 1];
    return this.volumeLUT[idx] + frac * (this.volumeLUT[idx + 1] - this.volumeLUT[idx]);
  }

  /**
   * Returns liquid height h_m for a given volume (m^3) using binary search + interpolation in LUT
   */
  public heightAtVolume(vol_m3: number): number {
    if (vol_m3 <= 0) return 0;
    if (vol_m3 >= this.maxIntegratedVolume_m3) return this.config.height_m;

    // Binary search in monotonic volumeLUT
    let low = 0;
    let high = this.samplesCount - 1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (this.volumeLUT[mid] < vol_m3) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idx = Math.max(0, Math.min(this.samplesCount - 2, high));
    const v0 = this.volumeLUT[idx];
    const v1 = this.volumeLUT[idx + 1];
    const frac = v1 > v0 ? (vol_m3 - v0) / (v1 - v0) : 0;

    const h0 = this.heightLUT[idx];
    const h1 = this.heightLUT[idx + 1];
    return h0 + frac * (h1 - h0);
  }

  /**
   * Computes wetted inner surface area A_in(h) in m^2
   */
  public wettedInnerArea(h_m: number): number {
    const baseR = this.radiusAtHeight(0);
    let area = Math.PI * baseR * baseR; // Base disk
    const steps = 32;
    const dy = h_m / steps;
    for (let i = 0; i < steps; i++) {
      const y = (i + 0.5) * dy;
      const r = this.radiusAtHeight(y);
      area += 2 * Math.PI * r * dy;
    }
    return area;
  }

  /**
   * Outer glass surface area for convective heat dissipation
   */
  public totalOuterArea(): number {
    let area = Math.PI * Math.pow(this.radiusAtHeight(0), 2);
    const steps = 32;
    const dy = this.config.height_m / steps;
    for (let i = 0; i < steps; i++) {
      const y = (i + 0.5) * dy;
      const r = this.radiusAtHeight(y) + this.config.glassThickness_m;
      area += 2 * Math.PI * r * dy;
    }
    return area;
  }
}

// Factory profiles for standard laboratory vessels
export const VESSEL_GEOMETRIES: Record<VesselGeometryType, PhysicalVesselGeometry> = {
  // 1. Standard Beaker 250 mL (diameter ~ 7 cm, height ~ 9.5 cm)
  'beaker': new PhysicalVesselGeometry({
    type: 'beaker',
    name: '250mL Griffin Beaker',
    nominalCapacity_m3: mlToM3(250),
    height_m: 0.095,
    baseY_m: 0,
    glassThickness_m: 0.0018,
    glassMass_kg: 0.110,
    glassCp_J_kgK: CONSTANTS.BOROSILICATE_CP,
    outerHeatTransferCoeff: 12.0,
    mouthRadius_m: 0.035,
    lipPosition_m: [0.035, 0.095, 0],
    radiusProfile: (y) => {
      // Cylindrical body with slight mouth flare
      const r0 = 0.034;
      if (y > 0.085) {
        return r0 + (y - 0.085) * 0.15;
      }
      return r0;
    }
  }),

  // 2. Erlenmeyer Flask 250 mL
  'flask': new PhysicalVesselGeometry({
    type: 'flask',
    name: '250mL Erlenmeyer Flask',
    nominalCapacity_m3: mlToM3(250),
    height_m: 0.140,
    baseY_m: 0,
    glassThickness_m: 0.0018,
    glassMass_kg: 0.130,
    glassCp_J_kgK: CONSTANTS.BOROSILICATE_CP,
    outerHeatTransferCoeff: 12.0,
    mouthRadius_m: 0.017,
    lipPosition_m: [0.017, 0.140, 0],
    radiusProfile: (y) => {
      // Conical lower body up to y = 0.09m, then cylindrical neck
      if (y <= 0.09) {
        const t = y / 0.09;
        return 0.0425 * (1.0 - t) + 0.017 * t;
      }
      return 0.017;
    }
  }),

  // 3. Test Tube (50 mL, diameter ~ 2.5 cm, height ~ 15 cm)
  'test_tube': new PhysicalVesselGeometry({
    type: 'test_tube',
    name: '50mL Borosilicate Test Tube',
    nominalCapacity_m3: mlToM3(50),
    height_m: 0.150,
    baseY_m: 0,
    glassThickness_m: 0.0014,
    glassMass_kg: 0.035,
    glassCp_J_kgK: CONSTANTS.BOROSILICATE_CP,
    outerHeatTransferCoeff: 15.0,
    mouthRadius_m: 0.0125,
    lipPosition_m: [0.0125, 0.150, 0],
    radiusProfile: (y) => {
      const r = 0.0125;
      // Hemispherical bottom cap
      if (y < r) {
        return Math.sqrt(Math.max(0.001, r * r - Math.pow(r - y, 2)));
      }
      return r;
    }
  }),

  // 4. Graduated Cylinder (100 mL, tall slender tube)
  'cylinder': new PhysicalVesselGeometry({
    type: 'cylinder',
    name: '100mL Graduated Cylinder',
    nominalCapacity_m3: mlToM3(100),
    height_m: 0.240,
    baseY_m: 0,
    glassThickness_m: 0.0020,
    glassMass_kg: 0.160,
    glassCp_J_kgK: CONSTANTS.BOROSILICATE_CP,
    outerHeatTransferCoeff: 14.0,
    mouthRadius_m: 0.015,
    lipPosition_m: [0.016, 0.240, 0],
    radiusProfile: (_y) => 0.0145
  }),

  // 5. Evaporating Dish
  'evaporating_dish': new PhysicalVesselGeometry({
    type: 'evaporating_dish',
    name: 'Porcelain Evaporating Dish',
    nominalCapacity_m3: mlToM3(80),
    height_m: 0.040,
    baseY_m: 0,
    glassThickness_m: 0.003,
    glassMass_kg: 0.090,
    glassCp_J_kgK: 900.0,
    outerHeatTransferCoeff: 15.0,
    mouthRadius_m: 0.045,
    lipPosition_m: [0.045, 0.040, 0],
    radiusProfile: (y) => {
      // Shallow spherical dome
      const t = y / 0.040;
      return 0.025 + Math.sqrt(t) * 0.020;
    }
  }),

  // 6. Watch Glass
  'watch_glass': new PhysicalVesselGeometry({
    type: 'watch_glass',
    name: 'Watch Glass (10cm)',
    nominalCapacity_m3: mlToM3(20),
    height_m: 0.012,
    baseY_m: 0,
    glassThickness_m: 0.002,
    glassMass_kg: 0.040,
    glassCp_J_kgK: CONSTANTS.BOROSILICATE_CP,
    outerHeatTransferCoeff: 16.0,
    mouthRadius_m: 0.050,
    lipPosition_m: [0.050, 0.012, 0],
    radiusProfile: (y) => {
      const t = y / 0.012;
      return 0.015 + Math.sqrt(t) * 0.035;
    }
  }),

  // 7. Porcelain Crucible
  'crucible': new PhysicalVesselGeometry({
    type: 'crucible',
    name: 'Porcelain Crucible (50mL)',
    nominalCapacity_m3: mlToM3(50),
    height_m: 0.065,
    baseY_m: 0,
    glassThickness_m: 0.0035,
    glassMass_kg: 0.065,
    glassCp_J_kgK: 920.0,
    outerHeatTransferCoeff: 18.0,
    mouthRadius_m: 0.025,
    lipPosition_m: [0.025, 0.065, 0],
    radiusProfile: (y) => 0.015 + (y / 0.065) * 0.010
  }),

  // 8. Petri Dish
  'petri_dish': new PhysicalVesselGeometry({
    type: 'petri_dish',
    name: 'Glass Petri Dish (60mL)',
    nominalCapacity_m3: mlToM3(60),
    height_m: 0.018,
    baseY_m: 0,
    glassThickness_m: 0.0018,
    glassMass_kg: 0.050,
    glassCp_J_kgK: CONSTANTS.BOROSILICATE_CP,
    outerHeatTransferCoeff: 15.0,
    mouthRadius_m: 0.048,
    lipPosition_m: [0.048, 0.018, 0],
    radiusProfile: (_y) => 0.048
  }),

  // 9. Volumetric Flask
  'volumetric_flask': new PhysicalVesselGeometry({
    type: 'volumetric_flask',
    name: '100mL Volumetric Flask',
    nominalCapacity_m3: mlToM3(100),
    height_m: 0.180,
    baseY_m: 0,
    glassThickness_m: 0.0018,
    glassMass_kg: 0.095,
    glassCp_J_kgK: CONSTANTS.BOROSILICATE_CP,
    outerHeatTransferCoeff: 12.0,
    mouthRadius_m: 0.009,
    lipPosition_m: [0.009, 0.180, 0],
    radiusProfile: (y) => {
      if (y <= 0.08) {
        const t = y / 0.08;
        return 0.015 + Math.sin(t * Math.PI) * 0.025;
      }
      return 0.008;
    }
  }),

  // 10. Separatory Funnel
  'separatory_funnel': new PhysicalVesselGeometry({
    type: 'separatory_funnel',
    name: '150mL Separatory Funnel',
    nominalCapacity_m3: mlToM3(150),
    height_m: 0.220,
    baseY_m: 0,
    glassThickness_m: 0.0022,
    glassMass_kg: 0.140,
    glassCp_J_kgK: CONSTANTS.BOROSILICATE_CP,
    outerHeatTransferCoeff: 13.0,
    mouthRadius_m: 0.014,
    lipPosition_m: [0.005, 0, 0], // Drains from bottom stopcock tip
    radiusProfile: (y) => {
      if (y <= 0.05) return 0.005;
      if (y <= 0.16) return 0.008 + ((y - 0.05) / 0.11) * 0.032;
      return 0.040 - ((y - 0.16) / 0.06) * 0.026;
    }
  }),

  // 11. Filter Funnel
  'filter_funnel': new PhysicalVesselGeometry({
    type: 'filter_funnel',
    name: 'Glass Filter Funnel (75mL)',
    nominalCapacity_m3: mlToM3(75),
    height_m: 0.150,
    baseY_m: 0,
    glassThickness_m: 0.0020,
    glassMass_kg: 0.060,
    glassCp_J_kgK: CONSTANTS.BOROSILICATE_CP,
    outerHeatTransferCoeff: 15.0,
    mouthRadius_m: 0.038,
    lipPosition_m: [0.006, 0, 0],
    radiusProfile: (y) => (y <= 0.07 ? 0.006 : 0.006 + ((y - 0.07) / 0.08) * 0.032)
  }),

  // 12. Mortar & Pestle
  'mortar_pestle': new PhysicalVesselGeometry({
    type: 'mortar_pestle',
    name: 'Porcelain Mortar (80mL)',
    nominalCapacity_m3: mlToM3(80),
    height_m: 0.055,
    baseY_m: 0,
    glassThickness_m: 0.0060,
    glassMass_kg: 0.280,
    glassCp_J_kgK: 940.0,
    outerHeatTransferCoeff: 16.0,
    mouthRadius_m: 0.042,
    lipPosition_m: [0.045, 0.055, 0],
    radiusProfile: (y) => 0.025 + Math.sqrt(y / 0.055) * 0.017
  }),

  // 13. Liebig Condenser
  'condenser': new PhysicalVesselGeometry({
    type: 'condenser',
    name: 'Liebig Condenser (120mL)',
    nominalCapacity_m3: mlToM3(120),
    height_m: 0.280,
    baseY_m: 0,
    glassThickness_m: 0.0025,
    glassMass_kg: 0.220,
    glassCp_J_kgK: CONSTANTS.BOROSILICATE_CP,
    outerHeatTransferCoeff: 22.0,
    mouthRadius_m: 0.010,
    lipPosition_m: [0.010, 0.280, 0],
    radiusProfile: (_y) => 0.008
  }),

  // 14. Wash Bottle
  'wash_bottle': new PhysicalVesselGeometry({
    type: 'wash_bottle',
    name: 'PE Wash Bottle (250mL)',
    nominalCapacity_m3: mlToM3(250),
    height_m: 0.190,
    baseY_m: 0,
    glassThickness_m: 0.0015,
    glassMass_kg: 0.045,
    glassCp_J_kgK: 1800.0,
    outerHeatTransferCoeff: 10.0,
    mouthRadius_m: 0.004,
    lipPosition_m: [0.035, 0.210, 0],
    radiusProfile: (y) => (y <= 0.14 ? 0.032 : 0.032 - ((y - 0.14) / 0.05) * 0.020)
  }),

  // 15. Test Tube Rack
  'test_tube_rack': new PhysicalVesselGeometry({
    type: 'test_tube_rack',
    name: 'Test Tube Rack (60mL)',
    nominalCapacity_m3: mlToM3(60),
    height_m: 0.120,
    baseY_m: 0,
    glassThickness_m: 0.003,
    glassMass_kg: 0.180,
    glassCp_J_kgK: 1500.0,
    outerHeatTransferCoeff: 8.0,
    mouthRadius_m: 0.020,
    lipPosition_m: [0.020, 0.120, 0],
    radiusProfile: (_y) => 0.020
  }),

  // 16. Crucible Tongs
  'tongs': new PhysicalVesselGeometry({
    type: 'tongs',
    name: 'Laboratory Crucible Tongs',
    nominalCapacity_m3: mlToM3(20),
    height_m: 0.220,
    baseY_m: 0,
    glassThickness_m: 0.004,
    glassMass_kg: 0.160,
    glassCp_J_kgK: 460.0,
    outerHeatTransferCoeff: 25.0,
    mouthRadius_m: 0.015,
    lipPosition_m: [0.015, 0.220, 0],
    radiusProfile: (_y) => 0.012
  })
};
