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
  | 'watch_glass';

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
  })
};
