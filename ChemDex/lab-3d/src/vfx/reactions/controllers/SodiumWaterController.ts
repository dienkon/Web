import { ReactionVisualController, ReactionContext, ReactionZone } from '../types';
import { sodiumPelletThermal, sodiumMetalMass } from '../../../science/sodiumWater';
import { sodiumSurfaceRadius, vesselLiquidSurfaceY } from '../../../science/vesselGeometry';
import { sodiumPelletRadius, sodiumPelletShape } from '../../geometry/sodiumPellet';

/** Read-only contact dynamics for finite Na/H2O chemistry. Material failure,
 * burning, gas supply and heat require their own engine budgets; elapsed time
 * and metal mass alone cannot prescribe ignition, detonation or glass rupture. */
export class SodiumWaterController implements ReactionVisualController {
  public id = 'sodium_water_reaction';
  public name = 'Sodium + Water Reaction';

  public initialize({ vessel, runtime }: ReactionContext): void {
    const radius = sodiumSurfaceRadius(vessel);
    const initialMass = sodiumMetalMass(vessel);
    runtime.customData = {
      x: radius * 0.12,
      z: -radius * 0.08,
      vx: 0.14,
      vz: 0.09,
      angle: 0.6,
      angularVelocity: 0,
      mass_fraction: 1,
      meltFactor: 0,
      isMolten: false,
      localTemp_c: vessel.temperature_c,
      isIgnited: false,
      trailPoints: [],
      seed: 137,
      soundTimer: 0,
      initialMass_g: initialMass,
      circleAngle: 0.6,
      circleRadius: radius * 0.45,
      circleDirection: 1,
      orbitalSpeed: 3.2,
      radialPhase: 0,
    };
    runtime.duration = 7;
    runtime.currentColor = vessel.liquidColor ?? '#f8fafc';
    runtime.targetColor = runtime.currentColor;
  }

  public update(context: ReactionContext): void {
    const { vessel, runtime, dt } = context;
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    if (vessel.isShattered) {
      runtime.reactionRate = 0;
      runtime.gasGenerationRate = 0;
      runtime.surfaceActivity = 0;
      if (runtime.customData) {
        runtime.customData.vx = 0;
        runtime.customData.vz = 0;
        runtime.customData.isIgnited = false;
      }
      return;
    }

    runtime.elapsed += dt;
    const data = runtime.customData;
    const metered = typeof data.chemistryProgress === 'number';
    runtime.progress = metered ? Math.max(0, Math.min(1, data.chemistryProgress))
      : Math.min(1, Math.max(runtime.progress, runtime.elapsed / runtime.duration));
    const mass = sodiumMetalMass(vessel);
    const initialMass = Math.max(1e-12, data.initialMass_g ?? mass);
    data.mass_fraction = metered ? Math.min(1, mass / initialMass) : Math.max(0, 1 - runtime.progress);
    const water = (vessel.contents ?? []).find(item => item.formula === 'H2O' && item.phase !== 'g' && item.phase !== 's');
    const contact = vessel.volume_ml > 0 && !!water && water.moles > 1e-12;
    const active = contact && data.mass_fraction > 1e-9 && runtime.progress < 1
      && (!metered || data.gasMolesPerSecond > 0);

    const thermal = sodiumPelletThermal(1 - data.mass_fraction, vessel.temperature_c, vessel.environment?.airSpeed_m_s);
    data.localTemp_c = thermal.temperature_c;
    data.meltFactor = thermal.meltFactor;
    data.isMolten = thermal.meltFactor > 0;
    const burning = active && vessel.hydrogenCombustion?.burning === true
      && vessel.hydrogenCombustion.power_W > 0;
    if (burning && !data.isIgnited) context.playSound('ignite');
    data.isIgnited = burning;
    runtime.temperature = vessel.temperature_c;
    const gasMl_s = Math.max(0, data.gasMolesPerSecond ?? 0) * 82.057 * (vessel.temperature_c + 273.15)
      / (vessel.environment?.pressure_atm ?? 1);
    runtime.reactionRate = active ? metered ? Math.min(4, gasMl_s / 5) : Math.pow(data.mass_fraction, 2 / 3) : 0;
    runtime.gasGenerationRate = active ? metered ? Math.min(180, gasMl_s / 0.05)
      : runtime.reactionRate * 40 / (vessel.environment?.pressure_atm ?? 1) : 0;
    runtime.surfaceActivity = active ? Math.min(1, 0.35 + runtime.reactionRate * 0.5) : 0;
    if (!active) {
      data.vx = 0;
      data.vz = 0;
      return;
    }

    const radius = sodiumSurfaceRadius(vessel);

    // Smooth, energetic circular skittering ("chạy vòng vòng")
    if (data.circleAngle === undefined) {
      data.circleAngle = Math.atan2(data.z, data.x) || 0.6;
      data.circleRadius = Math.hypot(data.x, data.z) || radius * 0.45;
      data.circleDirection = 1;
      data.orbitalSpeed = 3.2;
      data.radialPhase = 0;
    }

    const bodyRadius = sodiumPelletRadius(vessel, mass) * sodiumPelletShape(data.meltFactor).horizontalRadius;
    const boundary = Math.max(0, radius - bodyRadius);

    data.orbitalSpeed = (2.8 + 1.8 * data.meltFactor) * (0.8 + 0.4 * Math.max(0.5, runtime.reactionRate));
    data.circleAngle += data.circleDirection * data.orbitalSpeed * dt;
    data.radialPhase += dt * 1.6;

    // Organic spiraling: sweeps in wide loops between center and rim
    const targetRadius = boundary * (0.55 + 0.40 * Math.sin(data.radialPhase));
    const minR = Math.min(0.005, boundary);
    data.circleRadius = Math.max(minR, Math.min(boundary, data.circleRadius + (targetRadius - data.circleRadius) * (1 - Math.exp(-dt * 2.5))));

    data.x = Math.cos(data.circleAngle) * data.circleRadius;
    data.z = Math.sin(data.circleAngle) * data.circleRadius;

    const speed = (0.22 + 0.28 * data.meltFactor) * Math.max(0.6, runtime.reactionRate);
    data.vx = -Math.sin(data.circleAngle) * speed * data.circleDirection;
    data.vz = Math.cos(data.circleAngle) * speed * data.circleDirection;

    const distance = Math.hypot(data.x, data.z);
    if (boundary <= 0) {
      data.x = 0;
      data.z = 0;
      data.circleRadius = 0;
    } else if (distance > boundary) {
      data.x = (data.x / distance) * boundary;
      data.z = (data.z / distance) * boundary;
      data.circleRadius = boundary;
    }

    context.addSurfaceImpulse(data.x / radius, data.z / radius, -0.0025 * runtime.reactionRate, 0.06);

    const indicator = (vessel.contents ?? []).some(item => item.formula === 'Phenolphthalein' && item.moles > 1e-12);
    data.trailPoints = data.trailPoints.filter((point: { age: number }) => (point.age += dt) < 2.2);
    if (indicator) data.trailPoints.push({ x: data.x, z: data.z, age: 0 });
    if (data.trailPoints.length > 60) data.trailPoints.shift();

    data.soundTimer += dt;
    if (data.soundTimer >= 0.4) {
      context.playSound('sodium_sizzle');
      data.soundTimer = 0;
    }
  }

  public getReactionZone({ vessel, runtime }: ReactionContext): ReactionZone {
    const data = runtime.customData ?? {};
    return {
      origin: 'airLiquidInterface',
      position: [data.x ?? 0, vesselLiquidSurfaceY(vessel), data.z ?? 0],
      radius: sodiumPelletRadius(vessel, sodiumMetalMass(vessel))
        * sodiumPelletShape(data.meltFactor ?? 0).horizontalRadius,
      direction: [data.vx ?? 0, 0, data.vz ?? 0],
    };
  }

  public updateSurface({ runtime, vessel, addSurfaceImpulse }: ReactionContext): void {
    if (runtime.reactionRate <= 0) return;
    const data = runtime.customData, radius = sodiumSurfaceRadius(vessel);
    if (!data || !(radius > 0)) return;
    addSurfaceImpulse((data.x ?? 0) / radius, (data.z ?? 0) / radius, 0.001 * runtime.reactionRate, 0.05);
  }

  public finalize({ runtime }: ReactionContext): void {
    runtime.reactionRate = 0;
    runtime.gasGenerationRate = 0;
    runtime.surfaceActivity = 0;
    if (runtime.customData) {
      runtime.customData.isIgnited = false;
      runtime.customData.vx = 0;
      runtime.customData.vz = 0;
    }
  }
}
