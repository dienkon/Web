/**
 * NeutralizationControllers.ts — Dedicated controllers for Acid-Base Neutralizations
 * 
 * Reaction 1: HCl + NaOH -> NaCl + H2O
 * - Visually subtle, zero fake smoke/steam under normal room temperatures.
 * - Gentle Rayleigh-Taylor mixing plume, clear solution remains transparent.
 * 
 * Reaction 2: H2SO4 + 2NaOH -> Na2SO4 + 2H2O
 * - High enthalpy of neutralization (Delta H = -114 kJ/mol).
 * - Convective mixing front, heat shimmer, elevated temperature rise without arbitrary fake clouds.
 */

import { ReactionVisualController, ReactionContext, ReactionZone } from '../types';

export class HclNaohNeutralizationController implements ReactionVisualController {
  public id = 'hcl_naoh_neutralization';
  public name = 'HCl + NaOH Neutralization';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 4.5;
    runtime.currentColor = '#f8fafc';
    runtime.targetColor = '#f8fafc'; // Remains crystal clear
    runtime.gasGenerationRate = 0; // Zero bubbles!
    runtime.precipitateRate = 0; // Zero precipitate!
    runtime.turbidity = 0.0; // Completely transparent!
    runtime.heatReleaseRate = 12.0; // Mild exothermic
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    // Arrhenius-like kinetic progression: rapid mixing front decaying smoothly
    runtime.reactionRate = Math.max(0, 1.0 - runtime.progress) * 1.2;
    runtime.mixingIntensity = runtime.reactionRate;

    // Subtle thermal rise (+4 to +8 °C)
    const deltaT = 6.0 * Math.sin(runtime.progress * Math.PI * 0.5);
    runtime.temperature = 25.0 + deltaT;
  }

  public getReactionZone(): ReactionZone {
    return {
      origin: 'pourPoint',
      position: [0, 0.4, 0],
      radius: 0.15,
      direction: [0, -1, 0],
    };
  }

  public updateSurface(context: ReactionContext): void {
    const { runtime, addSurfaceImpulse } = context;
    // Gentle surface ripple only during initial addition
    if (runtime.progress < 0.25) {
      addSurfaceImpulse(0, 0, 0.0008 * runtime.reactionRate, 0.12);
    }
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.reactionRate = 0;
    runtime.mixingIntensity = 0;
  }
}

export class H2so4NaohNeutralizationController implements ReactionVisualController {
  public id = 'h2so4_naoh_neutralization';
  public name = 'H2SO4 + NaOH Exothermic Neutralization';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.duration = 5.2;
    runtime.currentColor = '#f8fafc';
    runtime.targetColor = '#f8fafc';
    runtime.gasGenerationRate = 0;
    runtime.precipitateRate = 0;
    runtime.turbidity = 0.0;
    runtime.heatReleaseRate = 48.0; // Strong enthalpy of neutralization
  }

  public update(context: ReactionContext): void {
    const { runtime, dt } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

    runtime.reactionRate = Math.max(0, 1.0 - Math.pow(runtime.progress, 1.2)) * 1.8;
    runtime.mixingIntensity = runtime.reactionRate * 1.5;

    // Substantial thermal rise (+18 to +24 °C)
    const deltaT = 22.0 * Math.sin(runtime.progress * Math.PI * 0.5);
    runtime.temperature = 25.0 + deltaT;
  }

  public getReactionZone(): ReactionZone {
    return {
      origin: 'liquidInterface',
      position: [0, 0.2, 0],
      radius: 0.22,
      direction: [0, -1, 0],
    };
  }

  public updateSurface(context: ReactionContext): void {
    const { runtime, addSurfaceImpulse } = context;
    // Convective surface disturbance proportional to thermal gradient
    if (runtime.reactionRate > 0.1) {
      addSurfaceImpulse(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        0.0016 * runtime.reactionRate,
        0.14
      );
    }
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.reactionRate = 0;
    runtime.mixingIntensity = 0;
  }
}
