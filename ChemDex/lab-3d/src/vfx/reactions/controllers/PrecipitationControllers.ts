/**
 * PrecipitationControllers.ts — Dedicated controllers for Precipitation Reactions
 * 
 * Implements:
 * - Reaction 03: BaCl2 + H2SO4 -> BaSO4 (Fine micro-crystalline milky haze, high turbidity)
 * - Reaction 04: AgNO3 + NaCl -> AgCl (Soft curdy cottage-cheese clumps, rapid flocculation)
 * - Reaction 05: Pb(NO3)2 + 2KI -> PbI2 (Golden Rain, hexagonal platelets, glittering facets)
 * - Reaction 06: CuSO4 + 2NaOH -> Cu(OH)2 (Gelatinous hydrated sky-blue flocs)
 * - Reaction 24: Na2S2O3 + 2HCl -> S (Colloidal sulfur, induction haze, progressive turbidity)
 * - Reaction 25: CuSO4 + NH3 (Multi-stage: pale blue Cu(OH)2 gel -> deep royal blue complex)
 * - Reaction 26: Al2(SO4)3 + NaOH (Multi-stage: amphoteric white gel -> soluble clear aluminate)
 */

import { ReactionVisualController, ReactionContext, ReactionZone } from '../types';

/**
 * 03. BaCl2 + H2SO4 -> BaSO4
 */
export class BaSO4PrecipitationController implements ReactionVisualController {
  public id = 'bacl2_h2so4_precipitate';
  public name = 'Barium Sulfate Milky Precipitation';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 9.0;
    runtime.currentColor = '#ffffff';
    runtime.targetColor = '#ffffff';
    runtime.turbidity = 0.0;
    runtime.precipitateRate = 0.0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Instantaneous supersaturation at contact boundary layer
    if (runtime.progress < 0.3) {
      runtime.precipitateRate = (1.0 - runtime.progress / 0.3) * 2.5;
      runtime.turbidity = Math.min(0.95, runtime.progress * 3.5);
    } else {
      runtime.precipitateRate = 0.05;
      // Very slow clearing of upper liquid as fine powder settles (Stokes vs = 0.04 m/s)
      runtime.turbidity = Math.max(0.65, 0.95 - (runtime.progress - 0.3) * 0.4);
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'liquidInterface', position: [0, 0.1, 0], radius: 0.28 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.turbidity = 0.7;
    runtime.precipitateRate = 0;
  }
}

/**
 * 04. AgNO3 + NaCl -> AgCl
 */
export class AgClCurdyPrecipitationController implements ReactionVisualController {
  public id = 'agno3_nacl_precipitate';
  public name = 'Silver Chloride Curdy Precipitation';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 7.0;
    runtime.currentColor = '#f8fafc';
    runtime.targetColor = '#f8fafc';
    runtime.turbidity = 0.0;
    runtime.precipitateRate = 0.0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Fast coagulation into chunky cottage-cheese curds
    if (runtime.progress < 0.4) {
      runtime.precipitateRate = 2.8;
      runtime.turbidity = Math.min(0.88, runtime.progress * 2.8);
    } else {
      runtime.precipitateRate = 0;
      // Curds settle rapidly (Stokes vs = 0.22 m/s), leaving clearer supernatant above
      runtime.turbidity = Math.max(0.35, 0.88 - (runtime.progress - 0.4) * 0.9);
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'pourPoint', position: [0, 0.3, 0], radius: 0.22 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.turbidity = 0.35;
  }
}

/**
 * 05. Pb(NO3)2 + 2KI -> PbI2 (Golden Rain)
 */
export class PbI2GoldenRainController implements ReactionVisualController {
  public id = 'golden_rain_pbi2';
  public name = 'Lead Iodide Golden Rain Synthesis';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 10.0;
    runtime.currentColor = '#facc15';
    runtime.targetColor = '#eab308';
    runtime.turbidity = 0.0;
    runtime.precipitateRate = 0.0;
    runtime.customData = { crystalCount: 0 };
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Progressive crystal growth: anisotropic hexagonal platelets nucleating and fluttering downward
    if (runtime.progress < 0.5) {
      runtime.precipitateRate = 1.8;
      runtime.turbidity = Math.min(0.85, runtime.progress * 2.0);
    } else {
      // Platelets slowly rain down (vs = 0.08 m/s), shimmering as they tilt
      runtime.precipitateRate = 0.2;
      runtime.turbidity = Math.max(0.45, 0.85 - (runtime.progress - 0.5) * 0.65);
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'liquidInterface', position: [0, 0.15, 0], radius: 0.25 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.turbidity = 0.45;
  }
}

/**
 * 06. CuSO4 + 2NaOH -> Cu(OH)2
 */
export class CuOH2GelPrecipitationController implements ReactionVisualController {
  public id = 'cuso4_naoh_precipitate';
  public name = 'Copper(II) Hydroxide Gelatinous Precipitation';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 6.5;
    runtime.currentColor = '#38bdf8';
    runtime.targetColor = '#0284c7';
    runtime.turbidity = 0.0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Amorphous hydrated gel network: slow aggregation, viscous suspension
    runtime.precipitateRate = Math.max(0, 1.0 - runtime.progress) * 2.2;
    runtime.turbidity = Math.min(0.9, runtime.progress * 1.6);
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'pourPoint', position: [0, 0.25, 0], radius: 0.2 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.turbidity = 0.8;
  }
}

/**
 * 24. Na2S2O3 + 2HCl -> S (Colloidal Sulfur)
 */
export class ColloidalSulfurController implements ReactionVisualController {
  public id = 'na2s2o3_hcl_turbidity';
  public name = 'Sodium Thiosulfate Colloidal Sulfur Precipitation';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 8.5;
    runtime.currentColor = '#f8fafc';
    runtime.targetColor = '#fef08a';
    runtime.turbidity = 0.0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Distinct Induction Period: first 25% remains completely clear!
    if (runtime.progress < 0.25) {
      runtime.turbidity = 0.0;
      runtime.precipitateRate = 0.0;
    } else {
      // Rapid colloidal population explosion after nucleation threshold
      const activeFrac = (runtime.progress - 0.25) / 0.75;
      runtime.precipitateRate = Math.sin(activeFrac * Math.PI) * 3.0;
      runtime.turbidity = Math.min(0.96, activeFrac * 1.2);
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'uniform', position: [0, 0, 0], radius: 0.4 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.turbidity = 0.96;
  }
}

/**
 * 25. CuSO4 + NH3 (Multi-stage Complexation)
 */
export class CuSo4Nh3MultiStageController implements ReactionVisualController {
  public id = 'cuso4_nh3_complex';
  public name = 'Copper(II) Sulfate + Ammonia Multi-stage Complexation';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 9.0;
    runtime.currentColor = '#38bdf8';
    runtime.targetColor = '#1d4ed8'; // Deep royal blue
    runtime.turbidity = 0.0;
    runtime.customData = { stage: 1 };
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    if (runtime.progress < 0.4) {
      // STAGE 1: Pale blue Cu(OH)2 gel precipitates
      runtime.customData.stage = 1;
      runtime.precipitateRate = 2.0;
      runtime.turbidity = Math.min(0.75, (runtime.progress / 0.4) * 0.75);
      runtime.targetColor = '#bae6fd';
    } else {
      // STAGE 2: Excess NH3 redissolves precipitate into transparent royal blue [Cu(NH3)4]2+
      runtime.customData.stage = 2;
      runtime.precipitateRate = 0;
      const stage2Progress = (runtime.progress - 0.4) / 0.6;
      runtime.turbidity = Math.max(0.0, 0.75 * (1.0 - stage2Progress));
      runtime.targetColor = '#1d4ed8';
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'liquidInterface', position: [0, 0.2, 0], radius: 0.25 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.turbidity = 0.0;
    runtime.currentColor = '#1d4ed8';
  }
}

/**
 * 26. Al2(SO4)3 + NaOH (Amphoteric Multi-stage)
 */
export class Al2So43NaOhAmphotericController implements ReactionVisualController {
  public id = 'al2so4_naoh_amphoteric';
  public name = 'Aluminium Sulfate Amphoteric Dissolution';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 8.0;
    runtime.currentColor = '#f8fafc';
    runtime.targetColor = '#f8fafc';
    runtime.turbidity = 0.0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    if (runtime.progress < 0.45) {
      // Stage 1: Gelatinous white Al(OH)3 precipitate forms
      runtime.precipitateRate = 2.4;
      runtime.turbidity = Math.min(0.82, (runtime.progress / 0.45) * 0.82);
    } else {
      // Stage 2: Excess OH- redissolves Al(OH)3 into clear soluble aluminate [Al(OH)4]-
      const stage2Progress = (runtime.progress - 0.45) / 0.55;
      runtime.precipitateRate = 0;
      runtime.turbidity = Math.max(0.0, 0.82 * (1.0 - stage2Progress));
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'pourPoint', position: [0, 0.3, 0], radius: 0.2 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.turbidity = 0.0;
  }
}
