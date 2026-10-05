/**
 * CombustionFlameControllers.ts — Dedicated controllers for Pyrotechnic & Flame Emission Reactions
 * 
 * Implements:
 * - Reaction 27: 2Mg + O2 -> 2MgO (Blinding white Planck emission light & MgO aerosol)
 * - Reaction 28: Copper flame test (Blue-green atomic emission)
 * - Reaction 29: Sodium flame test (Dominant 589nm intense yellow doublet emission)
 * - Reaction 30: Potassium flame test (Lilac/violet emission, sensitive to sodium contamination)
 */

import { ReactionVisualController, ReactionContext, ReactionZone } from '../types';

/**
 * 27. Magnesium Combustion
 */
export class BurnMagnesiumController implements ReactionVisualController {
  public id = 'burn_magnesium';
  public name = 'Magnesium Ribbon Combustion';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 5.5;
    runtime.heatReleaseRate = 180.0;
    runtime.customData = { colorTemperature_K: 3100 };
    context.playSound('ignite');
  }

  public update(context: ReactionContext): void {
    const { runtime, dt, emitSparks } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Blinding white intensity profile peaking in the middle
    runtime.reactionRate = Math.sin(runtime.progress * Math.PI) * 2.8;
    runtime.temperature = 25.0 + 1200.0 * runtime.reactionRate;

    if (runtime.reactionRate > 0.4) {
      emitSparks([0, 0.4, 0], 6, '#ffffff');
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'flameContact', position: [0, 0.4, 0], radius: 0.15 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.reactionRate = 0;
  }
}

/**
 * 28. Copper Flame Test (Blue-Green)
 */
export class FlameTestCopperController implements ReactionVisualController {
  public id = 'flame_test_copper';
  public name = 'Copper Wire Atomic Emission Flame Test';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 4.0;
    runtime.currentColor = '#10b981'; // Emerald blue-green
    runtime.targetColor = '#10b981';
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);
    runtime.reactionRate = Math.sin(runtime.progress * Math.PI) * 1.5;
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'flameContact', position: [0, 0.2, 0], radius: 0.1 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.reactionRate = 0;
  }
}

/**
 * 29. Sodium Flame Test (Intense 589nm Yellow)
 */
export class FlameTestSodiumController implements ReactionVisualController {
  public id = 'flame_test_sodium';
  public name = 'Sodium Atomic Emission Flame Test (589nm)';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 4.5;
    runtime.currentColor = '#facc15';
    runtime.targetColor = '#facc15';
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);
    runtime.reactionRate = Math.sin(runtime.progress * Math.PI) * 2.2;
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'flameContact', position: [0, 0.2, 0], radius: 0.12 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.reactionRate = 0;
  }
}

/**
 * 30. Potassium Flame Test (Lilac)
 */
export class FlameTestPotassiumController implements ReactionVisualController {
  public id = 'flame_test_potassium';
  public name = 'Potassium Atomic Emission Flame Test (Lilac)';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 4.0;
    runtime.currentColor = '#c084fc'; // Soft lilac
    runtime.targetColor = '#c084fc';
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);
    runtime.reactionRate = Math.sin(runtime.progress * Math.PI) * 1.1;
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'flameContact', position: [0, 0.2, 0], radius: 0.1 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.reactionRate = 0;
  }
}
