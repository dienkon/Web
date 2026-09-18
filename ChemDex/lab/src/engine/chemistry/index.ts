import { ChemicalColor, SubstanceQuantity } from '../../types/chemistry';
import { CHEMICAL_LIBRARY } from '../../data/chemicals';
import { ReactionResult } from '../../types/reaction';

export class ChemistryEngine {
  /**
   * Calculates optical liquid color after adding substances or mixing
   */
  public static calculateMixedColor(
    contents: SubstanceQuantity[],
    currentPh: number | null,
    activeIndicator: string | null
  ): ChemicalColor {
    // If indicator is present, it dictates the primary indicator color band
    if (activeIndicator === 'Phenolphthalein') {
      const ph = currentPh ?? 7.0;
      if (ph >= 8.2) {
        // Vibrant magenta pink
        const intensity = Math.min(1.0, 0.3 + (ph - 8.2) * 0.4);
        return { r: 236, g: 72, b: 153, a: intensity, hex: '#ec4899' };
      } else {
        // Colorless
        return { r: 245, g: 250, b: 255, a: 0.08, hex: '#f5faff' };
      }
    }

    if (activeIndicator === 'Litmus') {
      const ph = currentPh ?? 7.0;
      if (ph < 4.5) {
        // Red
        return { r: 239, g: 68, b: 68, a: 0.65, hex: '#ef4444' };
      } else if (ph > 8.3) {
        // Blue
        return { r: 59, g: 130, b: 246, a: 0.65, hex: '#3b82f6' };
      } else {
        // Neutral purple
        return { r: 168, g: 85, b: 247, a: 0.5, hex: '#a855f7' };
      }
    }

    // Default: Weighted average based on volumes and intrinsic chemical color
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let maxA = 0.08;
    let totalWeight = 0;

    for (const item of contents) {
      const def = CHEMICAL_LIBRARY[item.chemicalId];
      if (!def) continue;

      const weight = item.amount * (def.defaultColor.a > 0.2 ? 3 : 1);
      totalR += def.defaultColor.r * weight;
      totalG += def.defaultColor.g * weight;
      totalB += def.defaultColor.b * weight;
      totalWeight += weight;
      if (def.defaultColor.a > maxA) {
        maxA = def.defaultColor.a;
      }
    }

    if (totalWeight === 0) {
      return { r: 245, g: 250, b: 255, a: 0.08, hex: '#f5faff' };
    }

    const r = Math.round(totalR / totalWeight);
    const g = Math.round(totalG / totalWeight);
    const b = Math.round(totalB / totalWeight);

    return {
      r,
      g,
      b,
      a: maxA,
      hex: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
    };
  }

  /**
   * Calculates the resulting stoichiometric equilibrium and concentrations
   */
  public static solveStoichiometry(
    contents: SubstanceQuantity[],
    reaction: ReactionResult
  ): {
    remainingContents: SubstanceQuantity[];
    limitingReagentId: string | null;
    resultingPh: number;
    tempChange: number;
  } {
    const reactants = reaction.reactants;
    let limitingReagentId: string | null = null;
    let maxExtents: { chemicalId: string; maxExtent: number }[] = [];

    // Find available moles for each reactant
    for (const reactant of reactants) {
      const substance = contents.find(c => c.chemicalId === reactant.chemicalId);
      const moles = substance ? substance.moles : 0;
      const maxExtent = moles / reactant.coefficient;
      maxExtents.push({ chemicalId: reactant.chemicalId, maxExtent });
    }

    // Smallest extent determines limiting reagent
    maxExtents.sort((a, b) => a.maxExtent - b.maxExtent);
    const minExtent = Math.max(0, maxExtents[0]?.maxExtent ?? 0);
    limitingReagentId = maxExtents[0]?.chemicalId ?? null;

    // Update quantities
    const updatedContents: SubstanceQuantity[] = [];

    // Copy non-reactants
    for (const item of contents) {
      const isReactant = reactants.some(r => r.chemicalId === item.chemicalId);
      if (!isReactant) {
        updatedContents.push({ ...item });
      }
    }

    // Deduct reactants
    for (const reactant of reactants) {
      const item = contents.find(c => c.chemicalId === reactant.chemicalId);
      if (!item) continue;
      const consumedMoles = minExtent * reactant.coefficient;
      const remainingMoles = Math.max(0, item.moles - consumedMoles);
      if (remainingMoles > 0.00001) {
        const ratio = remainingMoles / item.moles;
        updatedContents.push({
          ...item,
          moles: remainingMoles,
          amount: item.amount * ratio,
          concentrationM: item.concentrationM ? item.concentrationM * ratio : undefined
        });
      }
    }

    // Add products
    for (const product of reaction.products) {
      const def = CHEMICAL_LIBRARY[product.chemicalId];
      const producedMoles = minExtent * product.coefficient;
      if (producedMoles > 0.00001) {
        const mass = producedMoles * (def?.molarMass ?? 50);
        const volume = def?.phase === 'aqueous' || def?.phase === 'liquid' ? mass : 0;
        updatedContents.push({
          chemicalId: product.chemicalId,
          amount: volume > 0 ? volume : mass,
          unit: volume > 0 ? 'mL' : 'g',
          moles: producedMoles,
          concentrationM: volume > 0 ? (producedMoles / (volume / 1000)) : undefined,
          addedAt: Date.now()
        });
      }
    }

    // Estimate pH
    const totalVolumeMl = updatedContents.reduce((sum, c) => {
      const def = CHEMICAL_LIBRARY[c.chemicalId];
      return def?.phase === 'aqueous' || def?.phase === 'liquid' ? sum + c.amount : sum;
    }, 0);

    let resultingPh = reaction.observations.resultingPhEstimate ?? 7.0;

    if (totalVolumeMl > 0) {
      // Check if strong acid remains
      const remainingAcid = updatedContents.find(c => c.chemicalId === 'HCl' || c.chemicalId === 'H2SO4');
      const remainingBase = updatedContents.find(c => c.chemicalId === 'NaOH' || c.chemicalId === 'KOH');

      if (remainingAcid && remainingAcid.moles > 0.0001) {
        const hMoles = remainingAcid.moles * (remainingAcid.chemicalId === 'H2SO4' ? 2 : 1);
        const molarityH = hMoles / (totalVolumeMl / 1000);
        resultingPh = Math.max(0, Math.min(6.5, -Math.log10(Math.max(0.000001, molarityH))));
      } else if (remainingBase && remainingBase.moles > 0.0001) {
        const ohMoles = remainingBase.moles;
        const molarityOH = ohMoles / (totalVolumeMl / 1000);
        const pOH = -Math.log10(Math.max(0.000001, molarityOH));
        resultingPh = Math.max(7.5, Math.min(14, 14 - pOH));
      }
    }

    return {
      remainingContents: updatedContents,
      limitingReagentId,
      resultingPh: Number(resultingPh.toFixed(2)),
      tempChange: reaction.observations.temperatureChangeC
    };
  }
}
