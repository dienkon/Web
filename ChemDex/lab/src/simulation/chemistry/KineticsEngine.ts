import { VesselState } from '../../types/chemistry';
import { DETERMINISTIC_REACTIONS, DeterministicReaction } from '../../engine/chemistryEngine';
import { findChemical } from '../../data/chemicals';

export interface ReactionProgressState {
  reactionId: string;
  reaction: DeterministicReaction;
  progress: number; // 0 to 1
  rateConstant: number;
  initialMoles: Record<string, number>;
  currentMoles: Record<string, number>;
  productMoles: Record<string, number>;
  totalMolesToReact: number;
  isComplete: boolean;
  gasGenerationRate_ml_s: number;
  precipitateGenerationRate_g_s: number;
  heatReleaseRate_W: number;
  localMixingPlume: {
    x: number;
    y: number;
    z: number;
    radius: number;
    intensity: number;
  };
}

/**
 * Real-time chemical kinetics engine.
 * Computes non-instantaneous reaction rates, continuous reactant depletion,
 * dynamic product formation, enthalpy temperature shifts, and local mixing plumes.
 */
export class KineticsEngine {
  private activeReactions: Map<string, ReactionProgressState[]> = new Map();

  /**
   * Initializes or refreshes reactions for a vessel based on its current substances and physical conditions.
   */
  public syncVesselReactions(vessel: VesselState, isHeated: boolean = false): void {
    const vesselId = vessel.id;
    if (!vessel.substances || vessel.substances.length < 1 || vessel.volume_ml <= 0.05) {
      this.activeReactions.delete(vesselId);
      return;
    }

    const currentList = this.activeReactions.get(vesselId) || [];
    const activeIds = new Set(currentList.map(r => r.reactionId));

    // Check all deterministic reactions
    for (const rxn of DETERMINISTIC_REACTIONS) {
      // Check if all reactants are present in vessel
      const hasAllReactants = rxn.reactants.every(req => 
        vessel.substances.some(sub => sub.toLowerCase().includes(req.toLowerCase()))
      );

      if (!hasAllReactants) continue;

      // Check temperature / heating prerequisites
      if (rxn.requiresHeating && !isHeated && (vessel.temperature_c ?? 25) < (rxn.minTemp_c || 60)) {
        continue;
      }

      if (activeIds.has(rxn.id)) continue; // Already tracking this reaction

      // Estimate initial moles based on volume and average 1.0 M concentration
      const volume_L = Math.max(0.001, vessel.volume_ml / 1000);
      const initialMoles: Record<string, number> = {};
      let minMoles = Infinity;

      for (const r of rxn.reactants) {
        const coeff = rxn.stoichiometry[r] || 1;
        const moles = volume_L * 0.8; // Baseline 0.8 mol/L
        initialMoles[r] = moles;
        const normalized = moles / coeff;
        if (normalized < minMoles) minMoles = normalized;
      }

      const totalMolesToReact = Math.max(0.001, minMoles);
      const temp_K = (vessel.temperature_c ?? 25) + 273.15;
      // Arrhenius rate scaling: faster at higher temperature
      const rateConstant = 0.45 * Math.exp(-1200 / temp_K) * 55.0; // Typical aqueous ion kinetics rate

      const newState: ReactionProgressState = {
        reactionId: rxn.id,
        reaction: rxn,
        progress: 0,
        rateConstant,
        initialMoles,
        currentMoles: { ...initialMoles },
        productMoles: {},
        totalMolesToReact,
        isComplete: false,
        gasGenerationRate_ml_s: 0,
        precipitateGenerationRate_g_s: 0,
        heatReleaseRate_W: 0,
        localMixingPlume: {
          x: 0,
          y: 0,
          z: 0,
          radius: 0.05,
          intensity: 1.0
        }
      };

      currentList.push(newState);
      activeIds.add(rxn.id);
    }

    this.activeReactions.set(vesselId, currentList);
  }

  /**
   * Advances chemical kinetics for vessel by dt seconds.
   */
  public step(
    vessel: VesselState,
    dt: number,
    options: {
      isHeated?: boolean;
      inflowRate_ml_s?: number;
      impactPoint?: [number, number, number];
      incomingColor?: string;
    } = {}
  ): {
    gasRate_ml_s: number;
    precipitateRate_g_s: number;
    precipitateTotal_g: number;
    hasPrecipitate: boolean;
    precipitateColor?: string;
    precipitateSubstance?: string;
    hasGas: boolean;
    gasColor?: string;
    targetLiquidColor?: string;
    colorBlendProgress: number;
    tempChange_c: number;
    mixingRadius: number;
    mixingIntensity: number;
  } {
    const vesselId = vessel.id;
    this.syncVesselReactions(vessel, options.isHeated);

    const list = this.activeReactions.get(vesselId);
    let totalGasRate = 0;
    let totalPrecipRate = 0;
    let totalPrecipMass = vessel.precipitateAmount_g || 0;
    let totalHeatW = 0;
    let hasPrecip = vessel.hasPrecipitate || false;
    let precipColor = vessel.precipitateColor;
    let precipSubstance = undefined;
    let hasGas = vessel.hasGas || false;
    let gasColor = vessel.gasColor;
    let targetLiquidColor = vessel.liquidColor;
    let maxProgress = 0;
    let mixingRadius = 0.08;
    let mixingIntensity = 0.0;

    if (!list || list.length === 0) {
      return {
        gasRate_ml_s: 0,
        precipitateRate_g_s: 0,
        precipitateTotal_g: totalPrecipMass,
        hasPrecipitate: hasPrecip,
        precipitateColor,
        precipitateSubstance,
        hasGas,
        gasColor,
        targetLiquidColor,
        colorBlendProgress: 1.0,
        tempChange_c: 0,
        mixingRadius,
        mixingIntensity
      };
    }

    const volume_L = Math.max(0.001, vessel.volume_ml / 1000);
    const temp_K = (vessel.temperature_c ?? 25) + 273.15;

    for (const item of list) {
      if (item.isComplete) continue;

      const rxn = item.reaction;

      // Reaction rate r = k * [A]^a * [B]^b
      let concProduct = 1.0;
      for (const [r, moles] of Object.entries(item.currentMoles)) {
        const conc = Math.max(0, moles / volume_L);
        concProduct *= Math.min(2.5, conc);
      }

      // Inflow momentum boosts reaction speed (agitation / mixing zone)
      const inflowBoost = options.inflowRate_ml_s ? 1.0 + Math.min(3.0, options.inflowRate_ml_s * 0.15) : 1.0;
      const rate_mol_s = item.rateConstant * concProduct * volume_L * inflowBoost;
      const dMoles = Math.min(item.totalMolesToReact * (1 - item.progress), rate_mol_s * dt);

      if (dMoles > 0) {
        // Advance progress
        item.progress = Math.min(1.0, item.progress + dMoles / item.totalMolesToReact);
        maxProgress = Math.max(maxProgress, item.progress);

        // Deduct reactants
        for (const [r, moles] of Object.entries(item.currentMoles)) {
          const coeff = rxn.stoichiometry[r] || 1;
          item.currentMoles[r] = Math.max(0, moles - dMoles * coeff);
        }

        // Add products & calculate observable physical consequences
        for (const [pFormula, pInfo] of Object.entries(rxn.products)) {
          const pMoles = dMoles * pInfo.coeff;
          item.productMoles[pFormula] = (item.productMoles[pFormula] || 0) + pMoles;

          // Precipitate formation
          if (pInfo.state === 's' || rxn.hasPrecipitate) {
            hasPrecip = true;
            precipColor = rxn.precipitateColor || '#ffffff';
            precipSubstance = rxn.precipitateFormula || pFormula;
            const molWeight_g_mol = 120.0; // Approximation
            const dMass_g = pMoles * molWeight_g_mol;
            item.precipitateGenerationRate_g_s = dMass_g / Math.max(0.001, dt);
            totalPrecipRate += item.precipitateGenerationRate_g_s;
            totalPrecipMass += dMass_g;
          }

          // Gas formation (effervescence)
          if (pInfo.state === 'g' || rxn.hasGas) {
            hasGas = true;
            gasColor = rxn.gasColor || '#ffffff';
            // Ideal gas: V = nRT/P -> ~24,000 mL/mol at room temperature
            const dVolGas_ml = pMoles * (0.0821 * temp_K) * 1000;
            item.gasGenerationRate_ml_s = dVolGas_ml / Math.max(0.001, dt);
            totalGasRate += item.gasGenerationRate_ml_s;
          }
        }

        // Enthalpy / Exothermic heating
        if (rxn.deltaH_kJ) {
          // Heat released (Joules) = -deltaH (kJ) * 1000 * dMoles
          const heat_J = -rxn.deltaH_kJ * 1000 * dMoles;
          const power_W = heat_J / Math.max(0.001, dt);
          totalHeatW += power_W;
        }

        if (rxn.resultingLiquidColor) {
          targetLiquidColor = rxn.resultingLiquidColor;
        }

        // Plume diffusion
        item.localMixingPlume.radius = Math.min(0.45, item.localMixingPlume.radius + dt * 0.12);
        item.localMixingPlume.intensity = Math.max(0, 1.0 - item.progress);
        mixingRadius = Math.max(mixingRadius, item.localMixingPlume.radius);
        mixingIntensity = Math.max(mixingIntensity, item.localMixingPlume.intensity);

        if (item.progress >= 0.99) {
          item.isComplete = true;
        }
      }
    }

    // Heat capacity of water: 4.184 J / (g · K)
    const mass_g = vessel.mass_g || Math.max(1, vessel.volume_ml);
    const dT = (totalHeatW * dt) / (mass_g * 4.184);

    return {
      gasRate_ml_s: totalGasRate,
      precipitateRate_g_s: totalPrecipRate,
      precipitateTotal_g: totalPrecipMass,
      hasPrecipitate: hasPrecip,
      precipitateColor,
      precipitateSubstance,
      hasGas,
      gasColor,
      targetLiquidColor,
      colorBlendProgress: maxProgress,
      tempChange_c: dT,
      mixingRadius,
      mixingIntensity
    };
  }

  public getVesselReactions(vesselId: string): ReactionProgressState[] {
    return this.activeReactions.get(vesselId) || [];
  }

  public reset(vesselId?: string): void {
    if (vesselId) {
      this.activeReactions.delete(vesselId);
    } else {
      this.activeReactions.clear();
    }
  }
}

export const kineticsEngine = new KineticsEngine();
