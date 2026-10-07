/**
 * RedoxComplexControllers.ts — Dedicated controllers for Redox, Complexes & Thermal Transformations
 * 
 * Implements:
 * - Reaction 07: Fe + CuSO4 -> FeSO4 + Cu (Copper surface plating directly on iron)
 * - Reaction 14: Cu(OH)2 -> CuO + H2O (Thermal decomposition from hot bottom first, turns black)
 * - Reaction 15: I2(s) <=> I2(g) (Dense purple sublimated vapor & crystal condensation)
 * - Reaction 16: Water + conc. H2SO4 (Safety simulation: local thermal impulse & splatter)
 * - Reaction 20: FeCl3 + KSCN -> [Fe(SCN)]2+ (Deep blood-red complex concentration plume)
 * - Reaction 21: KMnO4 + Oxalate (Autocatalytic decolorization with induction lag)
 * - Reaction 22: Cr2O7(2-) + 2OH- <=> 2CrO4(2-) (Orange <-> Yellow equilibrium shift)
 * - Reaction 23: Iodine Clock (Sudden blue-black color burst after induction threshold)
 */

import { ReactionVisualController, ReactionContext, ReactionZone } from '../types';
import { vfxBus } from '../../bus';

/**
 * 07. Fe + CuSO4 -> Cu Plating
 */
export class FeCuSo4DisplacementController implements ReactionVisualController {
  public id = 'fe_cuso4_displacement';
  public name = 'Iron in Copper Sulfate Displacement (Copper Plating)';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 8.0;
    runtime.currentColor = '#0284c7'; // Royal blue
    runtime.targetColor = '#86efac'; // Pale ferrous green
    runtime.precipitateRate = 0; // No floating precipitate!
    runtime.gasGenerationRate = 0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);
    runtime.reactionRate = Math.max(0, 1.0 - runtime.progress);
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'metalSurface', position: [0, -0.6, 0], radius: 0.15 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.currentColor = '#86efac';
  }
}

/**
 * 14. Cu(OH)2 -> CuO + H2O Thermal Decomposition
 */
export class CuOh2ThermalDecompositionController implements ReactionVisualController {
  public id = 'cuoh2_thermal_decomposition';
  public name = 'Copper(II) Hydroxide Thermal Decomposition';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 7.0;
    runtime.currentColor = '#38bdf8';
    runtime.targetColor = '#18181b'; // Black CuO powder
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Starts decomposing from hottest bottom zone as T > 60°C
    runtime.reactionRate = Math.min(1.0, runtime.progress * 1.5);
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'bottom', position: [0, -0.85, 0], radius: 0.3 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.currentColor = '#18181b';
  }
}

/**
 * 15. I2 Sublimation
 */
export class IodineSublimationController implements ReactionVisualController {
  public id = 'iodine_sublimation';
  public name = 'Iodine Sublimation & Condensation';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 8.5;
    runtime.currentColor = '#581c87';
    runtime.targetColor = '#7e22ce'; // Dense purple vapor
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);
    runtime.reactionRate = Math.sin(runtime.progress * Math.PI) * 1.2;
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'bottom', position: [0, -0.8, 0], radius: 0.25, direction: [0, 1, 0] };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.reactionRate = 0;
  }
}

/**
 * 16. Water into Conc. H2SO4 (Safety Simulation)
 */
export class WaterIntoConcH2so4ExplosionController implements ReactionVisualController {
  public id = 'water_into_conc_h2so4_explosion';
  public name = 'Water into Concentrated Sulfuric Acid Hazard Event';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 4.0;
    runtime.heatReleaseRate = 120.0;
    context.playSound('alarm');
  }

  public update(context: ReactionContext): void {
    const { runtime, dt, addSurfaceImpulse, emitBurst } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Sharp thermal flash and violent ballistic acid splatter eruption
    if (runtime.elapsed < 0.8) {
      runtime.reactionRate = 3.0;
      addSurfaceImpulse(0, 0, 0.008, 0.25);
      if (Math.random() < 0.35) {
        emitBurst([0, 0.2, 0], 25, '#fee2e2', 2.8);
      }
      if (runtime.elapsed <= dt * 1.5) {
        // Immediate violent ballistic acid eruption arcing onto workbench
        vfxBus.emit('acid:splatter', {
          vesselId: context.vessel.id,
          position: [context.vessel.position[0], context.vessel.position[1] + 0.85, context.vessel.position[2]],
          count: 90,
          speed: 5.4,
          color: '#fca5a5',
          isAcid: true,
          substances: ['H2SO4']
        });
      }
    } else {
      runtime.reactionRate = Math.max(0, 1.0 - (runtime.elapsed - 0.8) / 3.2);
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'pourPoint', position: [0, 0.2, 0], radius: 0.18 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.reactionRate = 0;
  }
}

/**
 * 20. FeCl3 + KSCN -> [Fe(SCN)]2+ (Blood-Red Complex)
 */
export class FeCl3KscnComplexController implements ReactionVisualController {
  public id = 'fecl3_kscn_complex';
  public name = 'Iron(III) Thiocyanate Blood-Red Complex';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 5.0;
    runtime.currentColor = '#fef08a';
    runtime.targetColor = '#881337'; // Deep blood red
    runtime.precipitateRate = 0; // Pure liquid complex, no particles!
    runtime.turbidity = 0.0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);
    runtime.reactionRate = Math.max(0, 1.0 - runtime.progress) * 1.5;
    runtime.mixingIntensity = runtime.reactionRate;
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'pourPoint', position: [0, 0.3, 0], radius: 0.2 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.currentColor = '#881337';
  }
}

/**
 * 21. KMnO4 + Oxalate (Autocatalytic Decolorization)
 */
export class Kmno4OxalicRedoxController implements ReactionVisualController {
  public id = 'kmno4_oxalic_redox';
  public name = 'Permanganate Autocatalytic Decolorization';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 7.5;
    runtime.currentColor = '#701a75'; // Vivid purple
    runtime.targetColor = '#f8fafc'; // Colorless Mn2+
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Classic S-curve autocatalytic rate: slow induction then sudden acceleration!
    // rate proportional to [Mn2+] formed
    if (runtime.progress < 0.35) {
      runtime.reactionRate = 0.15;
    } else {
      runtime.reactionRate = Math.sin(((runtime.progress - 0.35) / 0.65) * Math.PI) * 2.2;
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'uniform', position: [0, 0, 0], radius: 0.4 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.currentColor = '#f8fafc';
  }
}

/**
 * 22. Cr2O7(2-) <=> 2CrO4(2-) Equilibrium
 */
export class K2Cr2O7NaOhEquilibriumController implements ReactionVisualController {
  public id = 'k2cr2o7_naoh_equilibrium';
  public name = 'Dichromate - Chromate Equilibrium Shift';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 4.5;
    runtime.currentColor = '#ea580c'; // Orange dichromate
    runtime.targetColor = '#facc15'; // Yellow chromate
    runtime.precipitateRate = 0;
    runtime.turbidity = 0.0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);
    runtime.reactionRate = Math.max(0, 1.0 - runtime.progress);
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'liquidInterface', position: [0, 0.2, 0], radius: 0.3 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.currentColor = '#facc15';
  }
}

/**
 * 23. Iodine Clock Reaction
 */
export class IodineClockController implements ReactionVisualController {
  public id = 'iodine_clock';
  public name = 'Iodine Clock Sudden Threshold Transition';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 7.0;
    runtime.currentColor = '#f8fafc';
    runtime.targetColor = '#0f172a'; // Deep blue-black
    runtime.customData = { hasFlipped: false };
  }

  public update(context: ReactionContext): void {
    const { runtime, dt, playSound } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Induction period: zero color change until 70% threshold is reached!
    if (runtime.progress < 0.7) {
      runtime.reactionRate = 0.1;
      runtime.currentColor = '#f8fafc';
    } else {
      if (!runtime.customData.hasFlipped) {
        runtime.customData.hasFlipped = true;
        playSound('pop');
      }
      // Instantaneous flash into dark blue-black
      runtime.reactionRate = 3.0;
      runtime.currentColor = '#0f172a';
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'uniform', position: [0, 0, 0], radius: 0.4 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.currentColor = '#0f172a';
  }
}
