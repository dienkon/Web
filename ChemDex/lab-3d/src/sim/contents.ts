/**
 * MULTI-PHASE VESSEL CONTENTS MODEL AND CONSERVATION TRACKER (§5.1)
 * Rule 3 & 10: All internal quantities strictly in SI units.
 * - Liquid phase: volume (m^3), solvent mass (kg), species moles (mol), T (K), density, viscosity
 * - Solids: array of solid items with mass, surface area, particle count
 * - Gas headspace: composition, temperature, produced moles
 * - Sediment bed: height, mass, porosity, compaction
 * - Suspended precipitate population: N (m^-3), mean radius r (m)
 * - Conservation invariant telemetry: relative mass error target < 1e-3
 */

import { CONSTANTS, kelvinToCelsius, m3ToMl, kgToGrams, gramsToKg } from '../core/units';
import { SUBSTANCE_DATABASE, PhysicalSubstance } from '../chem/substances';
import { calculateWaterDensity, calculateWaterViscosity } from '../chem/thermo';

export interface SolidContentItem {
  id: string;
  substanceId: string;
  mass_kg: number;
  surfaceArea_m2: number;
  particleCount: number;
  morphology: 'crystal' | 'powder' | 'granular' | 'ribbon' | 'chunk' | 'floc';
  isSubmerged: boolean;
}

export interface SuspendedPrecipitatePopulation {
  substanceId: string;
  numberDensity_m3: number;  // N nuclei/m^3
  meanRadius_m: number;      // r_bar
  totalMass_kg: number;
  turbidityScatter: number;  // Optical scattering factor
}

export interface SedimentBedModel {
  substanceId: string;
  mass_kg: number;
  thickness_m: number;       // Layer height on bottom
  porosity: number;          // 0.4 (dense crystals) to 0.95 (fluffy flocs)
  color: string;
}

export interface GasHeadspaceModel {
  moles: Record<string, number>;
  totalMolesProduced: number;
  temperature_K: number;
  displacedVolume_m3: number; // Volume displaced by evolved gas (nRT/P)
}

export interface ConservationTelemetry {
  initialTotalMass_kg: number;
  currentTotalMass_kg: number;
  massError_rel: number;      // |m_curr - m_init| / m_init
  netIonicCharge: number;     // sum(z_i * n_i)
  accumulatedEnergy_J: number;
}

export class MultiPhaseContents {
  public vesselId: string;

  // Liquid Phase
  public volume_m3: number = 0;
  public solventMass_kg: number = 0; // Liquid water solvent mass
  public dissolvedMoles: Record<string, number> = {}; // mol of each dissolved species
  public temperature_K: number = CONSTANTS.T_ROOM;
  public glassTemp_K: number = CONSTANTS.T_ROOM;
  public ph: number = 7.0;

  // Multi-Phase Entities
  public solids: SolidContentItem[] = [];
  public sediment: SedimentBedModel | null = null;
  public suspended: SuspendedPrecipitatePopulation | null = null;
  public gasHeadspace: GasHeadspaceModel = {
    moles: {},
    totalMolesProduced: 0,
    temperature_K: CONSTANTS.T_ROOM,
    displacedVolume_m3: 0
  };

  // Conservation Bookkeeping
  public initialMass_kg: number = 0;
  public cumulativeMassAdded_kg: number = 0;
  public cumulativeMassLost_kg: number = 0; // Via evaporation/boiling/gas release

  constructor(vesselId: string) {
    this.vesselId = vesselId;
  }

  /**
   * Resets contents to clean empty vessel
   */
  public clear(): void {
    this.volume_m3 = 0;
    this.solventMass_kg = 0;
    this.dissolvedMoles = {};
    this.temperature_K = CONSTANTS.T_ROOM;
    this.glassTemp_K = CONSTANTS.T_ROOM;
    this.ph = 7.0;
    this.solids = [];
    this.sediment = null;
    this.suspended = null;
    this.gasHeadspace = {
      moles: {},
      totalMolesProduced: 0,
      temperature_K: CONSTANTS.T_ROOM,
      displacedVolume_m3: 0
    };
    this.initialMass_kg = 0;
    this.cumulativeMassAdded_kg = 0;
    this.cumulativeMassLost_kg = 0;
  }

  /**
   * Computes bulk liquid density (kg/m^3) including dissolved solute mass and thermal expansion
   */
  public getDensity_kg_m3(): number {
    const rho_water = calculateWaterDensity(this.temperature_K);
    if (this.volume_m3 <= 1e-8) return rho_water;

    let totalSoluteMass_kg = 0;
    for (const [subId, moles] of Object.entries(this.dissolvedMoles)) {
      const sub = SUBSTANCE_DATABASE[subId];
      if (sub && moles > 0) {
        totalSoluteMass_kg += moles * sub.molarMass;
      }
    }

    const totalLiquidMass = this.solventMass_kg + totalSoluteMass_kg;
    return Math.max(900.0, totalLiquidMass / this.volume_m3);
  }

  /**
   * Computes dynamic fluid viscosity in Pa·s
   */
  public getViscosity_Pa_s(): number {
    const baseViscosity = calculateWaterViscosity(this.temperature_K);
    // Solute concentration viscosity boost (Jones-Dole equation approximation: eta = eta0 * (1 + A*sqrt(c) + B*c))
    let totalConcentration_M = 0;
    const vol_L = Math.max(1e-4, this.volume_m3 * 1000.0);
    for (const moles of Object.values(this.dissolvedMoles)) {
      totalConcentration_M += moles / vol_L;
    }
    const B_visc = 0.085;
    return baseViscosity * (1.0 + B_visc * totalConcentration_M);
  }

  /**
   * Computes authoritative total mass of the contents (solvent + solutes + solids + sediment) in kg
   */
  public getTotalMass_kg(): number {
    let mass = this.solventMass_kg;

    // Dissolved solutes
    for (const [subId, moles] of Object.entries(this.dissolvedMoles)) {
      const sub = SUBSTANCE_DATABASE[subId];
      if (sub && moles > 0) {
        mass += moles * sub.molarMass;
      }
    }

    // Solids
    for (const s of this.solids) {
      mass += s.mass_kg;
    }

    // Sediment bed
    if (this.sediment) {
      mass += this.sediment.mass_kg;
    }

    // Suspended particles
    if (this.suspended) {
      mass += this.suspended.totalMass_kg;
    }

    return mass;
  }

  /**
   * Adds solvent (water) in kg and updates volume based on density
   */
  public addSolventWater(mass_kg: number, temp_K = CONSTANTS.T_ROOM): void {
    if (mass_kg <= 0) return;
    const rho = calculateWaterDensity(temp_K);
    const addedVol_m3 = mass_kg / rho;

    // Thermal mixing: (m1*T1 + m2*T2) / (m1 + m2)
    const totalMass = this.solventMass_kg + mass_kg;
    this.temperature_K = (this.solventMass_kg * this.temperature_K + mass_kg * temp_K) / totalMass;
    this.solventMass_kg += mass_kg;
    this.volume_m3 += addedVol_m3;
    this.cumulativeMassAdded_kg += mass_kg;
  }

  /**
   * Adds a dissolved species directly to the liquid phase
   */
  public addDissolvedSpecies(substanceId: string, moles: number): void {
    if (moles <= 0) return;
    const sub = SUBSTANCE_DATABASE[substanceId];
    this.dissolvedMoles[substanceId] = (this.dissolvedMoles[substanceId] || 0) + moles;
    if (sub) {
      this.cumulativeMassAdded_kg += moles * sub.molarMass;
    }
  }

  /**
   * Adds a solid object (powder, crystals, metal piece) to the vessel
   */
  public addSolid(substanceId: string, mass_kg: number, morphology: SolidContentItem['morphology'] = 'powder'): void {
    if (mass_kg <= 0) return;
    const sub = SUBSTANCE_DATABASE[substanceId];
    const density = sub ? sub.density : 3000.0;
    const vol_m3 = mass_kg / density;

    // Approximate specific surface area (m^2)
    const particleRadius_m = morphology === 'powder' ? 20e-6 : (morphology === 'ribbon' ? 2e-3 : 500e-6);
    const area_m2 = (3.0 * vol_m3) / particleRadius_m;

    this.solids.push({
      id: `solid_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      substanceId,
      mass_kg,
      surfaceArea_m2: area_m2,
      particleCount: Math.max(1, Math.round(vol_m3 / ((4 / 3) * Math.PI * Math.pow(particleRadius_m, 3)))),
      morphology,
      isSubmerged: this.volume_m3 > 1e-6
    });

    this.cumulativeMassAdded_kg += mass_kg;
  }

  /**
   * Returns molar concentration vector in mol/L (M)
   */
  public getConcentrations_M(): Record<string, number> {
    const vol_L = Math.max(1e-5, this.volume_m3 * 1000.0);
    const concs: Record<string, number> = {};
    for (const [subId, moles] of Object.entries(this.dissolvedMoles)) {
      concs[subId] = moles / vol_L;
    }
    return concs;
  }

  /**
   * Computes conservation error metrics (§0 Rule 3)
   */
  public getConservationTelemetry(): ConservationTelemetry {
    const currentMass = this.getTotalMass_kg();
    const expectedMass = this.initialMass_kg + this.cumulativeMassAdded_kg - this.cumulativeMassLost_kg;
    const massDiff = Math.abs(currentMass - expectedMass);
    const massError_rel = expectedMass > 1e-6 ? massDiff / expectedMass : 0;

    // Net ionic charge check: sum(z_i * n_i)
    let netCharge = 0;
    for (const [subId, moles] of Object.entries(this.dissolvedMoles)) {
      const sub = SUBSTANCE_DATABASE[subId];
      if (sub && sub.ions) {
        for (const ion of sub.ions) {
          netCharge += moles * ion.n * ion.charge;
        }
      }
    }

    return {
      initialTotalMass_kg: this.initialMass_kg,
      currentTotalMass_kg: currentMass,
      massError_rel,
      netIonicCharge: netCharge,
      accumulatedEnergy_J: 0
    };
  }
}
