/**
 * DisambiguatedControllers.ts — Dedicated Controllers Resolving F4 Collisions
 * 
 * Replaces incorrect alias mappings with physically authentic controllers:
 * 1. CaCl2 + Na2CO3 -> CaCO3 (Chalky fine powder, milky suspension, NO gas)
 * 2. AgNO3 + KI -> AgI (Pale yellow curdy precipitate, NOT golden rain glints)
 * 3. FeCl3 + NaOH -> Fe(OH)3 (Rust-brown feathery flocs, NOT cyan Cu(OH)2 gel)
 * 4. Zn + CuSO4 -> Cu + ZnSO4 (Zinc eroding, coated with dark spongy copper, blue fades)
 * 5. K + H2O -> KOH + H2 (Instant violent lilac flame, hydrogen crackle, faster than Na)
 * 6. NaHCO3 + HCl -> CO2 (1:1 stoichiometry effervescence, rapid cooling)
 */

import { ReactionVisualController, ReactionContext, ReactionZone } from '../types';

/**
 * 1. CaCl2 + Na2CO3 -> CaCO3(s) + 2NaCl(aq)
 * Chalky fine powder precipitate, high initial turbidity, zero gas generation.
 */
export class CaCo3PrecipitationController implements ReactionVisualController {
  public id = 'cacl2_na2co3_precipitate';
  public name = 'Calcium Carbonate Chalky Precipitation';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 8.0;
    runtime.currentColor = '#ffffff';
    runtime.targetColor = '#ffffff';
    runtime.turbidity = 0.0;
    runtime.precipitateRate = 0.0;
    runtime.gasGenerationRate = 0.0; // Strictly zero gas!
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    if (runtime.progress < 0.35) {
      runtime.precipitateRate = (1.0 - runtime.progress / 0.35) * 2.2;
      runtime.turbidity = Math.min(0.92, runtime.progress * 3.0);
    } else {
      runtime.precipitateRate = 0.02;
      runtime.turbidity = Math.max(0.60, 0.92 - (runtime.progress - 0.35) * 0.45);
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'liquidInterface', position: [0, 0.1, 0], radius: 0.25 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.turbidity = 0.65;
    runtime.precipitateRate = 0;
    runtime.gasGenerationRate = 0;
  }
}

/**
 * 2. AgNO3 + KI -> AgI(s) + KNO3(aq)
 * Pale yellow curdy precipitate, cottage-cheese clumping, not golden glints.
 */
export class AgIPrecipitationController implements ReactionVisualController {
  public id = 'agno3_ki_precipitate';
  public name = 'Silver Iodide Pale Yellow Curdy Precipitation';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 7.0;
    runtime.currentColor = '#fef08a'; // Pale yellow curd
    runtime.targetColor = '#fef08a';
    runtime.turbidity = 0.0;
    runtime.precipitateRate = 0.0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    if (runtime.progress < 0.4) {
      runtime.precipitateRate = 2.4;
      runtime.turbidity = Math.min(0.85, runtime.progress * 2.5);
    } else {
      runtime.precipitateRate = 0;
      runtime.turbidity = Math.max(0.40, 0.85 - (runtime.progress - 0.4) * 0.8);
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'pourPoint', position: [0, 0.25, 0], radius: 0.22 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.turbidity = 0.45;
    runtime.precipitateRate = 0;
  }
}

/**
 * 3. FeCl3 + 3NaOH -> Fe(OH)3(s) + 3NaCl(aq)
 * Rust-brown flocculent precipitate, distinct from cyan copper gel.
 */
export class FeOH3FlocPrecipitationController implements ReactionVisualController {
  public id = 'fecl3_naoh_precipitate';
  public name = 'Iron(III) Hydroxide Rust-Brown Flocculent Precipitation';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 7.5;
    runtime.currentColor = '#9a3412'; // Rust-brown
    runtime.targetColor = '#7c2d12';
    runtime.turbidity = 0.0;
    runtime.precipitateRate = 0.0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    if (runtime.progress < 0.45) {
      runtime.precipitateRate = (1.0 - runtime.progress / 0.45) * 2.6;
      runtime.turbidity = Math.min(0.90, runtime.progress * 2.5);
    } else {
      runtime.precipitateRate = 0.05;
      // Flocs settle slowly with loose voluminous porosity
      runtime.turbidity = Math.max(0.55, 0.90 - (runtime.progress - 0.45) * 0.55);
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'liquidInterface', position: [0, 0.15, 0], radius: 0.26 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.turbidity = 0.60;
    runtime.precipitateRate = 0;
  }
}

/**
 * 4. Zn(s) + CuSO4(aq) -> ZnSO4(aq) + Cu(s)
 * Blue CuSO4 solution decolorizes into colorless ZnSO4, zinc granule gets coated with dark spongy copper.
 */
export class ZnCuSo4DisplacementController implements ReactionVisualController {
  public id = 'zn_cuso4_displacement';
  public name = 'Zinc Copper Sulfate Single Displacement';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 10.0;
    runtime.currentColor = '#0284c7'; // Sky blue Cu2+
    runtime.targetColor = '#f8fafc';  // Colorless Zn2+
    runtime.turbidity = 0.0;
    runtime.precipitateRate = 0.0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Spongy reddish-black copper deposition on zinc surface
    if (runtime.progress < 0.6) {
      runtime.precipitateRate = (1.0 - runtime.progress / 0.6) * 1.5;
    } else {
      runtime.precipitateRate = 0;
    }

    // Color transition from blue to colorless
    const t = runtime.progress;
    const r = Math.round(2 + t * (248 - 2));
    const g = Math.round(132 + t * (250 - 132));
    const b = Math.round(199 + t * (252 - 199));
    runtime.currentColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'bottom', position: [0, -0.4, 0], radius: 0.18 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.currentColor = '#f8fafc';
    runtime.precipitateRate = 0;
  }
}

/**
 * 5. 2K(s) + 2H2O(l) -> 2KOH(aq) + H2(g)
 * Extremely violent, autoignites with characteristic lilac/violet flame (#c084fc), sharp acoustic pop.
 */
export class PotassiumWaterController implements ReactionVisualController {
  public id = 'potassium_water_reaction';
  public name = 'Potassium Water Violent Lilac Flame Reaction';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 3.5; // Fast, violent
    runtime.currentColor = '#ffffff';
    runtime.targetColor = '#ffffff';
    runtime.gasGenerationRate = 0.0;
    runtime.temperature = 25.0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt, emitSparks, playSound } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    if (runtime.progress < 0.8) {
      runtime.gasGenerationRate = 3.5 * (1.0 - runtime.progress / 0.8);
      runtime.temperature = 25.0 + 85.0 * runtime.progress;

      // Lilac sparks & crackling hiss
      if (Math.random() < 0.65) {
        emitSparks([0, 0.05, 0], 12, '#c084fc');
      }
      if (Math.random() < 0.25) {
        playSound('pop');
      }
    } else {
      runtime.gasGenerationRate = 0;
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'airLiquidInterface', position: [0, 0.05, 0], radius: 0.35 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.gasGenerationRate = 0;
  }
}

/**
 * 6. NaHCO3 + HCl -> NaCl + H2O + CO2(g)
 * Rapid 1:1 effervescence with mild endothermic chilling.
 */
export class NaHCo3HclGasController implements ReactionVisualController {
  public id = 'nahco3_hcl_gas';
  public name = 'Sodium Bicarbonate Acid Gas Evolution';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 5.0;
    runtime.currentColor = '#ffffff';
    runtime.targetColor = '#ffffff';
    runtime.gasGenerationRate = 0.0;
  }

  public update(context: ReactionContext): void {
    const { runtime, dt, playSound } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    if (runtime.progress < 0.65) {
      runtime.gasGenerationRate = 2.8 * (1.0 - runtime.progress / 0.65);
      if (Math.random() < 0.3) {
        playSound('fizz');
      }
    } else {
      runtime.gasGenerationRate = 0;
    }
  }

  public getReactionZone(): ReactionZone {
    return { origin: 'bottom', position: [0, -0.3, 0], radius: 0.28 };
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.gasGenerationRate = 0;
  }
}
