/**
 * GasEvolutionControllers.ts — Dedicated controllers for Gas Evolution Reactions
 * 
 * Implements:
 * - Reaction 08: CaCO3 + 2HCl -> CaCl2 + CO2 + H2O (Bubbles strictly from limestone surface)
 * - Reaction 09: Zn + 2HCl -> ZnCl2 + H2 (Fine continuous H2 microbubbles, metal pitting)
 * - Reaction 10: Mg + 2HCl -> MgCl2 + H2 (Rapid vigorous H2 bubbling, ribbon dissolution)
 * - Reaction 11: 2H2O2 -> 2H2O + O2 (Catalytic O2 from MnO2 surface, exothermic, no fake foam)
 * - Reaction 12: NH3 + HCl -> NH4Cl (Dense white aerosol at meeting vapor interface)
 * - Reaction 13: Na2CO3 + 2HCl -> CO2 (Effervescence from carbonate)
 * - Reaction 18: Cu + 4HNO3 -> 2NO2 (Red-brown NO2 gas plumes, solution turns emerald)
 * - Reaction 19: Cu + 2H2SO4 -> SO2 (Invisible SO2 gas, subtle refraction, heated solution turns blue)
 */

import { ReactionVisualController, ReactionContext, ReactionZone } from '../types';

/**
 * 08. CaCO3 + 2HCl -> CO2
 */
export class CaCo3HclGasController implements ReactionVisualController {
  public id = 'caco3_hcl_gas';
  public name = 'Calcium Carbonate + HCl Gas Evolution';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 6.0;
    runtime.gasGenerationRate = 0;
    runtime.currentColor = '#f8fafc';
    runtime.targetColor = '#f8fafc';
    context.playSound('fizz');
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Bubbles originate from solid CaCO3 chunks at bottom
    runtime.reactionRate = Math.max(0, 1.0 - Math.pow(runtime.progress, 1.4));
    runtime.gasGenerationRate = runtime.reactionRate * 40.0;
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'solidSurface', position: [0, -0.6, 0], radius: 0.25 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.gasGenerationRate = 0;
    runtime.reactionRate = 0;
  }
}

/**
 * 09. Zn + 2HCl -> H2
 */
export class ZnHclGasController implements ReactionVisualController {
  public id = 'zn_hcl_gas';
  public name = 'Zinc + HCl Hydrogen Gas Evolution';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 7.0;
    runtime.gasGenerationRate = 0;
    context.playSound('fizz');
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Fine, continuous microbubbles attached to zinc coupon surface
    runtime.reactionRate = Math.max(0, 1.0 - runtime.progress * 0.85);
    runtime.gasGenerationRate = runtime.reactionRate * 35.0;
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'metalSurface', position: [0, -0.5, 0], radius: 0.18 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.gasGenerationRate = 0;
  }
}

/**
 * 10. Mg + 2HCl -> H2
 */
export class MgHclGasController implements ReactionVisualController {
  public id = 'mg_hcl_gas';
  public name = 'Magnesium + HCl Vigorous Reaction';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 5.0;
    runtime.heatReleaseRate = 35.0;
    context.playSound('fizz');
  }

  public update(context: ReactionContext): void {
    const { runtime, dt, addSurfaceImpulse } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Vigorous rapid bubbling, exothermic warming
    runtime.reactionRate = Math.max(0, 1.0 - runtime.progress);
    runtime.gasGenerationRate = runtime.reactionRate * 75.0;
    runtime.temperature = 25.0 + 18.0 * Math.sin(runtime.progress * Math.PI * 0.7);

    if (runtime.reactionRate > 0.2) {
      addSurfaceImpulse(0, 0, 0.002 * runtime.reactionRate, 0.15);
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'metalSurface', position: [0, -0.3, 0], radius: 0.2 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.gasGenerationRate = 0;
  }
}

/**
 * 11. 2H2O2 -> 2H2O + O2 (MnO2 Catalyst)
 */
export class H2o2Mno2CatalyticController implements ReactionVisualController {
  public id = 'h2o2_mno2_decomposition';
  public name = 'Hydrogen Peroxide Catalytic Decomposition (MnO2)';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 6.5;
    runtime.heatReleaseRate = 45.0;
    context.playSound('boil');
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Oxygen bubbles nucleate strictly from black MnO2 powder surface
    runtime.reactionRate = Math.max(0, 1.0 - runtime.progress);
    runtime.gasGenerationRate = runtime.reactionRate * 60.0;
    runtime.temperature = 25.0 + 22.0 * runtime.progress;
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'solidSurface', position: [0, -0.7, 0], radius: 0.22 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.gasGenerationRate = 0;
  }
}

/**
 * 12. NH3(g) + HCl(g) -> NH4Cl(s) (Fuming Aerosol)
 */
export class Nh3HclFumesController implements ReactionVisualController {
  public id = 'nh3_hcl_fumes';
  public name = 'Ammonia + HCl Dense White Aerosol Smoke';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 6.0;
    runtime.gasGenerationRate = 0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);
    runtime.reactionRate = Math.sin(runtime.progress * Math.PI) * 1.5;
    runtime.gasGenerationRate = runtime.reactionRate * 15.0;
    runtime.customData = { fumeDensity: runtime.reactionRate * 0.7 };
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'airLiquidInterface', position: [0, 0.8, 0], radius: 0.35 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.reactionRate = 0;
  }
}

/**
 * 13. Na2CO3 + 2HCl -> CO2
 */
export class Na2Co3HclGasController implements ReactionVisualController {
  public id = 'na2co3_hcl_gas';
  public name = 'Sodium Carbonate + HCl Effervescence';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 5.5;
    context.playSound('fizz');
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);
    runtime.reactionRate = Math.max(0, 1.0 - runtime.progress);
    runtime.gasGenerationRate = runtime.reactionRate * 42.0;
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'pourPoint', position: [0, 0.1, 0], radius: 0.25 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.gasGenerationRate = 0;
  }
}

/**
 * 18. Cu + 4HNO3 -> 2NO2 (Red-Brown Gas & Emerald Solution)
 */
export class CuHno3ConcController implements ReactionVisualController {
  public id = 'cu_hno3_conc';
  public name = 'Copper + Concentrated Nitric Acid (NO2 Gas)';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 8.0;
    runtime.currentColor = '#f8fafc';
    runtime.targetColor = '#065f46'; // Emerald blue-green
    runtime.customData = { gasColor: '#78350f' };
    context.playSound('fizz');
  }

  public update(context: ReactionContext): void {
    const { runtime, dt, addSurfaceImpulse } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Vigorous red-brown NO2 gas billowing upward
    runtime.reactionRate = Math.max(0, 1.0 - Math.pow(runtime.progress, 1.5));
    runtime.gasGenerationRate = runtime.reactionRate * 50.0;
    runtime.temperature = 25.0 + 35.0 * runtime.progress;

    if (runtime.reactionRate > 0.15) {
      addSurfaceImpulse(0, 0, 0.0022 * runtime.reactionRate, 0.16);
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'metalSurface', position: [0, -0.6, 0], radius: 0.2 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.gasGenerationRate = 0;
    runtime.currentColor = '#065f46';
  }
}

/**
 * 19. Cu + 2H2SO4 -> SO2 (Invisible Gas, Blue Solution)
 */
export class CuConcH2so4HeatedController implements ReactionVisualController {
  public id = 'cu_conc_h2so4_heated';
  public name = 'Copper + Hot Concentrated H2SO4 (Colorless SO2)';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 8.0;
    runtime.currentColor = '#f8fafc';
    runtime.targetColor = '#0284c7';
    context.playSound('boil');
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // SO2 gas is invisible in bulk air! Emits small transparent bubbles in liquid
    runtime.reactionRate = Math.max(0, 1.0 - runtime.progress);
    runtime.gasGenerationRate = runtime.reactionRate * 25.0;
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'metalSurface', position: [0, -0.55, 0], radius: 0.2 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.gasGenerationRate = 0;
    runtime.currentColor = '#0284c7';
  }
}
