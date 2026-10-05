/**
 * SodiumWaterController.ts — Dedicated reaction controller for 2Na + 2H2O -> 2NaOH + H2
 * 
 * Satisfies Sections 17.1 - 17.18 and Section 94:
 * - Irregular metallic sodium piece floating at liquid-air interface.
 * - Directional H2 jet recoil impulses driving authentic stochastic skittering.
 * - Thermal accumulation causing melting into a molten silvery sphere at 97.8°C.
 * - Surface depression ripples following movement.
 * - Localized 589nm yellow flame cone during thermal ignition.
 * - Swirling alkaline phenolphthalein trail and smooth consumption to 0%.
 */

import { ReactionVisualController, ReactionContext, ReactionZone } from '../types';

export class SodiumWaterController implements ReactionVisualController {
  public id = 'sodium_water_reaction';
  public name = 'Sodium + Water Reaction';

  public initialize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.customData = {
      // Sodium pellet position relative to vessel center [-0.6, 0.6]
      x: (Math.random() - 0.5) * 0.4,
      z: (Math.random() - 0.5) * 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vz: (Math.random() - 0.5) * 0.3,
      angle: Math.random() * Math.PI * 2,
      angularVelocity: 0,
      mass_fraction: 1.0,
      meltFactor: 0.0, // 0 = irregular solid, 1 = molten sphere
      isMolten: false,
      localTemp_c: 25.0,
      isIgnited: false,
      bubbleTimer: 0,
      trailPoints: [] as Array<{ x: number; z: number; age: number }>,
    };

    runtime.duration = 6.0;
    runtime.currentColor = '#e0f2fe';
    runtime.targetColor = '#f43f5e'; // Vibrant alkaline pink with phenolphthalein
    context.playSound('fizz');
  }

  public update(context: ReactionContext): void {
    const { runtime, dt, addSurfaceImpulse, playSound } = context;
    runtime.elapsed += dt;
    runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);
    const data = runtime.customData;
    if (data.mass_fraction <= 0.01) {
      runtime.progress = 1.0;
      runtime.reactionRate = 0.0;
      return;
    }

    // 1. Kinetic rate and heat generation
    // Exothermic warming: Delta H = -368 kJ/mol proportional to reaction progress
    data.localTemp_c = Math.min(125.0, 25.0 + Math.min(1.0, runtime.progress / 0.35) * 85.0);
    runtime.temperature = data.localTemp_c;

    // Melting transition around mp = 97.8°C
    if (data.localTemp_c >= 97.8) {
      data.meltFactor = Math.min(1.0, Math.max(data.meltFactor, (runtime.progress - 0.28) / 0.2));
    }
    data.isMolten = data.meltFactor >= 0.5 || data.localTemp_c >= 97.8;

    // Ignition condition: molten sodium + high local heat -> 589nm flame
    if (data.localTemp_c >= 105.0 && !data.isIgnited && Math.random() < 0.15) {
      data.isIgnited = true;
      playSound('ignite');
    }

    // 2. Procedural Asymmetric H2 Jet Recoil Motion with Leidenfrost Gas Cushion
    const vesselRadius = 0.55;
    const currentDist = Math.hypot(data.x, data.z);

    // Directional thrust from hydrogen ejection with chaotic stochastic perturbations
    // Leidenfrost hydrogen/steam cushion drastically reduces surface skin friction
    const isVigorous = data.mass_fraction > 0.05;
    const recoilImpulse = (1.2 + Math.random() * 1.4) * (data.isIgnited ? 1.8 : 1.0) * (data.isMolten ? 1.3 : 0.85);
    const thrustAngle = data.angle + (Math.random() - 0.5) * 2.1;
    data.vx += Math.cos(thrustAngle) * recoilImpulse * dt;
    data.vz += Math.sin(thrustAngle) * recoilImpulse * dt;

    // Fluid drag damping (Reduced by ~70% due to micro-vapor cushion beneath pellet)
    const effectiveDrag = isVigorous ? 0.85 : 2.6;
    data.vx *= Math.exp(-effectiveDrag * dt);
    data.vz *= Math.exp(-effectiveDrag * dt);

    // Tangential moment causing rapid droplet spin
    data.angularVelocity = (data.angularVelocity || 0) + (Math.random() - 0.5) * 45.0 * dt;
    data.angularVelocity *= Math.exp(-2.5 * dt);
    data.angle += data.angularVelocity * dt;

    data.x += data.vx * dt;
    data.z += data.vz * dt;

    // Boundary collision reflection against beaker wall
    if (currentDist > vesselRadius) {
      const nx = data.x / currentDist;
      const nz = data.z / currentDist;
      const dot = data.vx * nx + data.vz * nz;
      if (dot > 0) {
        data.vx -= 1.85 * dot * nx;
        data.vz -= 1.85 * dot * nz;
      }
      data.x = nx * (vesselRadius - 0.02);
      data.z = nz * (vesselRadius - 0.02);
      data.angle = Math.atan2(data.vz, data.vx);
    }

    // 3. Progressive Consumption & Erosion
    const consumptionRate = (data.isIgnited ? 0.22 : 0.14) * (1.0 + data.meltFactor * 0.5);
    data.mass_fraction = Math.max(0, data.mass_fraction - consumptionRate * dt);
    runtime.progress = 1.0 - data.mass_fraction;
    runtime.reactionRate = data.mass_fraction * (data.isIgnited ? 1.8 : 1.0);
    runtime.gasGenerationRate = runtime.reactionRate * 45.0;
    runtime.surfaceActivity = Math.min(1.0, 0.35 + runtime.reactionRate * 0.5);

    // 4. Local surface depression & ripple impulse
    const normX = data.x / vesselRadius;
    const normZ = data.z / vesselRadius;
    addSurfaceImpulse(normX, normZ, -0.004 * data.mass_fraction, 0.08);

    // 5. Phenolphthalein indicator trail
    data.trailPoints.push({ x: data.x, z: data.z, age: 0 });
    data.trailPoints.forEach((p: any) => { p.age += dt; });
    if (data.trailPoints.length > 40) data.trailPoints.shift();

    // Occasional tiny hydrogen bubble pop and micro-explosions
    if (data.isIgnited && Math.random() < dt * 6.0) {
      context.emitSparks([data.x, 0.04, data.z], 4, '#fbbf24');
      playSound('pop');
    } else if (Math.random() < dt * 4.5) {
      playSound('pop');
    }
  }

  public getReactionZone(context: ReactionContext): ReactionZone {
    const data = context.runtime.customData;
    return {
      origin: 'airLiquidInterface',
      position: [data.x || 0, 0, data.z || 0],
      radius: 0.04 * (data.mass_fraction || 1.0),
      direction: [data.vx || 0, 0, data.vz || 0],
    };
  }

  public updateSurface(context: ReactionContext): void {
    const { runtime, addSurfaceImpulse } = context;
    const data = runtime.customData;
    if (data.mass_fraction > 0.05) {
      const normX = data.x / 0.6;
      const normZ = data.z / 0.6;
      addSurfaceImpulse(normX, normZ, 0.0015 * runtime.reactionRate, 0.06);
    }
  }

  public finalize(context: ReactionContext): void {
    const { runtime } = context;
    runtime.currentColor = runtime.targetColor;
    runtime.reactionRate = 0;
    runtime.gasGenerationRate = 0;
    context.playSound('fizz');
  }
}
