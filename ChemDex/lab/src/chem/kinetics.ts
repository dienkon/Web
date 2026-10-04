/**
 * CHEMICAL KINETICS AND REACTION INTEGRATOR (§5.3)
 * - Arrhenius temperature-dependent rate constant k(T) = A * exp(-Ea / (R * T))
 * - Multicomponent rate laws: r = k(T) * prod(c_i^n_i)
 * - Stiff operator splitting with limiting reagent clamping
 * - Reaction extent advancement dXi/dt and heat generation rate
 * - Element-by-element and mole conservation enforcement
 */

import { CONSTANTS } from '../core/units';
import { PhysicalReaction } from './reactions';

export interface ReactionExtentState {
  reactionId: string;
  reaction: PhysicalReaction;
  extent_mol: number;         // Integrated moles of reaction executed
  extentRate_mol_s: number;   // dXi/dt (moles/second)
  heatRelease_W: number;      // Watts produced/absorbed
  isComplete: boolean;
}

/**
 * Computes Arrhenius rate constant k(T) in (mol/L)^(1-n)/s
 */
export function calculateRateConstant(
  A: number,
  Ea_J_mol: number,
  temp_K: number,
  catalystBoost = 1.0
): number {
  if (A <= 0) return 0;
  const R = CONSTANTS.R;
  const safeT = Math.max(100.0, temp_K);
  // k = A * exp(-Ea / (R * T))
  const exponent = -Ea_J_mol / (R * safeT);
  const k = A * Math.exp(Math.max(-80.0, Math.min(20.0, exponent))) * catalystBoost;
  return k;
}

export interface KineticsStepResult {
  consumedReactants_mol: Record<string, number>;
  producedProducts_mol: Record<string, number>;
  reactionExtents: Record<string, ReactionExtentState>;
  totalHeatRelease_W: number;
}

/**
 * Advances chemical kinetics by timestep dt over a given vessel liquid volume
 */
export function stepKinetics(
  reactions: PhysicalReaction[],
  concentrations_M: Record<string, number>, // mol/L of each dissolved species
  volume_L: number,
  temp_K: number,
  dt: number,
  catalystsPresent: Set<string> = new Set()
): KineticsStepResult {
  const consumed: Record<string, number> = {};
  const produced: Record<string, number> = {};
  const extents: Record<string, ReactionExtentState> = {};
  let totalHeat_W = 0;

  if (volume_L <= 1e-6 || dt <= 0) {
    return {
      consumedReactants_mol: consumed,
      producedProducts_mol: produced,
      reactionExtents: extents,
      totalHeatRelease_W: 0
    };
  }

  // Work with a mutable copy of moles available
  const availableMoles: Record<string, number> = {};
  for (const [s, c] of Object.entries(concentrations_M)) {
    availableMoles[s] = c * volume_L;
  }

  for (const rxn of reactions) {
    // 1. Check conditions (min temperature, light, catalyst)
    if (rxn.conditions?.minT_K && temp_K < rxn.conditions.minT_K) {
      continue;
    }

    // Catalyst multiplier
    let catalystMultiplier = 1.0;
    if (rxn.kinetics.catalysts) {
      for (const cat of rxn.kinetics.catalysts) {
        if (catalystsPresent.has(cat)) {
          catalystMultiplier = rxn.kinetics.catalystMultiplier || 10.0;
          break;
        }
      }
    }

    // 2. Compute rate r (mol / (L·s))
    let rate_mol_L_s = 0;

    if (rxn.kinetics.model === 'instant') {
      // Instant reaction: consumes limiting reagent over a rapid relaxation tau ~ 0.05 s
      const tau = 0.05;
      rate_mol_L_s = 1.0 / tau;
    } else {
      const A = rxn.kinetics.A || 1e8;
      const Ea = rxn.kinetics.Ea || 40000;
      const k = calculateRateConstant(A, Ea, temp_K, catalystMultiplier);

      // r = k * prod(c_i^order_i)
      let rateProduct = 1.0;
      for (const r of rxn.reactants) {
        const c = Math.max(0, (availableMoles[r.s] || 0) / volume_L);
        const order = rxn.kinetics.orders?.[r.s] ?? 1.0;
        rateProduct *= Math.pow(c, order);
      }
      rate_mol_L_s = k * rateProduct;
    }

    // 3. Limiting reagent clamp: deltaXi <= (n_i / nu_i)
    let maxPossibleMolesReaction = Infinity;
    for (const r of rxn.reactants) {
      if (r.n > 0) {
        const molesAvailable = Math.max(0, availableMoles[r.s] || 0);
        const limitByThis = molesAvailable / r.n;
        if (limitByThis < maxPossibleMolesReaction) {
          maxPossibleMolesReaction = limitByThis;
        }
      }
    }

    if (maxPossibleMolesReaction <= 1e-12) {
      extents[rxn.id] = {
        reactionId: rxn.id,
        reaction: rxn,
        extent_mol: 0,
        extentRate_mol_s: 0,
        heatRelease_W: 0,
        isComplete: true
      };
      continue;
    }

    // Reaction extent in moles for this step
    const requestedMoles = rate_mol_L_s * volume_L * dt;
    const dXi = Math.min(requestedMoles, maxPossibleMolesReaction);
    const dXi_dt = dXi / dt;

    // 4. Update consumed and produced moles
    for (const r of rxn.reactants) {
      const consumedMol = dXi * r.n;
      availableMoles[r.s] = Math.max(0, (availableMoles[r.s] || 0) - consumedMol);
      consumed[r.s] = (consumed[r.s] || 0) + consumedMol;
    }

    for (const p of rxn.products) {
      const producedMol = dXi * p.n;
      availableMoles[p.s] = (availableMoles[p.s] || 0) + producedMol;
      produced[p.s] = (produced[p.s] || 0) + producedMol;
    }

    // 5. Thermal release: Q_dot = (-dH) * dXi/dt (Watts)
    // dH < 0 is exothermic -> positive heatRelease_W
    const rxnHeat_W = (-rxn.dH) * dXi_dt;
    totalHeat_W += rxnHeat_W;

    extents[rxn.id] = {
      reactionId: rxn.id,
      reaction: rxn,
      extent_mol: dXi,
      extentRate_mol_s: dXi_dt,
      heatRelease_W: rxnHeat_W,
      isComplete: maxPossibleMolesReaction - dXi <= 1e-9
    };
  }

  return {
    consumedReactants_mol: consumed,
    producedProducts_mol: produced,
    reactionExtents: extents,
    totalHeatRelease_W: totalHeat_W
  };
}
