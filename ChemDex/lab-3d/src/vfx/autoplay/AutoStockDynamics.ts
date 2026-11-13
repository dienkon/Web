import type { VesselState } from '../../types/chemistry';
import { findChemical } from '../../data/chemicals';
import { isSuspensionRow } from '../../science/precipitateInventory';
import { getVesselProfile } from '../../pour/physics/profiles';
import { metersPerModelUnit, GRAVITY_M_S2 } from '../../science/sceneUnits';
import { vortexHeight, type VortexSurface } from '../../science/liquidVortex';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { LiquidMotionSystem } from '../../simulation/effects/LiquidMotionSystem';

export interface AutoStockPiece {
  formula: string; mass_g: number; radius: number; density_kg_m3: number;
  x: number; y: number; z: number; vx: number; vy: number; vz: number; angle: number; spin: number;
}
/** Coarse equivalent spheres for the isolated bench. Finite chemistry owns
 * their mass; immersed slip drag, buoyancy and floor friction own their motion.
 * The hands-on bench uses its existing Rapier rigid-contact worker instead. */
export class AutoStockDynamics {
  readonly pieces = new Map<string, AutoStockPiece>();
  advance(vessel: VesselState, dt: number, vortex?: VortexSurface) {
    const profile = getVesselProfile(vessel.type, vessel.capacity_ml), scale = metersPerModelUnit(profile);
    const masses = new Map<string, number>();
    for (const row of vessel.contents) if (row.phase === 's' && row.mass_g > 1e-10 && (!row.location || row.location === 'bulk')
      && !isSuspensionRow(row, vessel.contents, vessel.precipitateSubstance)) masses.set(row.formula, (masses.get(row.formula) ?? 0) + row.mass_g);
    for (const formula of this.pieces.keys()) if (!masses.has(formula)) this.pieces.delete(formula);
    for (const [formula, mass_g] of masses) {
      const chemical = findChemical(`${formula} (s)`) ?? findChemical(formula);
      const density = Math.max(100, (chemical?.density ?? 2.5) * 1000);
      const r_m = Math.cbrt(3 * mass_g / 1000 / density / (4 * Math.PI)), radius = r_m / scale;
      let p = this.pieces.get(formula);
      if (!p) {
        const angle = this.pieces.size * 2.4, spread = Math.min(0.3, profile.r(profile.baseY + radius) * 0.3);
        p = { formula, mass_g, density_kg_m3: density, radius, x: Math.cos(angle) * spread, z: Math.sin(angle) * spread,
          y: profile.baseY + radius, vx: 0, vy: 0, vz: 0, angle: 0, spin: 0 }; this.pieces.set(formula, p);
      }
      p.mass_g = mass_g; p.radius = radius;
      const flat = vesselLiquidSurfaceY(vessel), surface = vortex ? vortexHeight(p.x, p.z, vortex) : flat;
      const submerged = vessel.volume_ml > 0.05 ? Math.max(0, Math.min(1, (surface - p.y + radius) / (2 * radius))) : 0;
      const [ux, , uz] = submerged > 0 ? LiquidMotionSystem.sampleVelocity(p.x, Math.min(p.y, surface - 1e-5), p.z, {
        temp_c: vessel.temperature_c, ambientTemp_c: vessel.temperature_c, heatPower_W: 0,
        viscosity_mPa_s: vessel.viscosity_mPa_s ?? 1, radius: profile.r(flat), liquidBottomY: profile.baseY,
        surfaceY: flat, vesselProfile: profile, vortex,
      }) : [0, 0, 0];
      const slip_m_s = Math.hypot(p.vx - ux, p.vy, p.vz - uz) * scale;
      const rho = (vessel.density_g_ml ?? 1) * 1000, mu = (vessel.viscosity_mPa_s ?? 1) * 0.001;
      const drag = (6 * Math.PI * mu * r_m + 0.4 * rho * Math.PI * r_m ** 2 * slip_m_s) * submerged;
      const mass_kg = mass_g / 1000, rate = drag / mass_kg, decay = Math.exp(-rate * dt);
      const gravity = -GRAVITY_M_S2 / scale * (1 - rho / density * submerged);
      p.vx = ux + (p.vx - ux) * decay; p.vz = uz + (p.vz - uz) * decay;
      p.vy = p.vy * decay + gravity * (rate > 1e-8 ? (1 - decay) / rate : dt);
      p.y += p.vy * dt;
      const onFloor = p.y <= profile.baseY + radius;
      if (onFloor) {
        p.y = profile.baseY + radius; p.vy = Math.max(0, p.vy);
        const speed = Math.hypot(p.vx, p.vz), friction = 0.18 * Math.max(0, -gravity) * dt;
        const retained = speed > 0 ? Math.max(0, 1 - friction / speed) : 0;
        p.vx *= retained; p.vz *= retained;
      }
      p.x += p.vx * dt; p.z += p.vz * dt;
      const available = Math.max(0, profile.r(Math.min(profile.baseY + profile.H, p.y)) - radius), radial = Math.hypot(p.x, p.z);
      if (radial > available && radial > 0) { p.x *= available / radial; p.z *= available / radial; p.vx *= 0.2; p.vz *= 0.2; }
      const fluidSpin = vortex ? vortex.angularSpeed_rad_s / (1 + (p.x * p.x + p.z * p.z) / vortex.coreRadius ** 2) ** 2 : 0;
      const inertia = 0.4 * mass_kg * r_m ** 2;
      p.spin += (fluidSpin - p.spin) * -Math.expm1(-8 * Math.PI * mu * r_m ** 3 * submerged * dt / Math.max(1e-20, inertia));
      if (onFloor) p.spin *= Math.exp(-dt * 8);
      p.angle += p.spin * dt;
    }
  }
}
