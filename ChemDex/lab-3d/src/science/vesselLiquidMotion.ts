import { Euler, Quaternion, Vector3 } from 'three';
import type { VesselState } from '../types/chemistry';
import { getVesselProfile } from '../pour/physics/profiles';
import { liquidInventoryMass } from '../handling/solidOccupancy';
import { phaseVolumes } from './liquidLayers';
import { LiquidVortex, type VortexSurface } from './liquidVortex';
import { solveStockLiquidSurface } from './stockLiquidSurface';
import { suspensionFluidProperties } from './suspensionFluid';
import { vesselLiquidSurfaceY } from './vesselGeometry';

/** Accepted liquid motion belongs to the specimen, independent of renderer
 * lifetime and quality. The remainder retains accepted time at fixed 120 Hz. */
export interface VesselLiquidMotionState {
  angularSpeed_rad_s: number;
  phase_rad: number;
  remainder_s: number;
}
const DT = 1 / 120, MAX_STEPS = 240;

export function supportsVesselVortex(vessel: VesselState): boolean {
  if (vessel.isShattered || !(vessel.volume_ml > 0.05)) return false;
  const rotation = vessel.physicalMotion?.rotation ? new Quaternion(...vessel.physicalMotion.rotation)
    : new Quaternion().setFromEuler(new Euler(0, vessel.rotationY ?? 0, vessel.rotationZ ?? 0, 'YXZ'));
  // The present reduced model has a vertical symmetry axis. Tilted pools and
  // two immiscible layers retain the shared hydrostatic boundary instead.
  const up = new Vector3(0, 1, 0).applyQuaternion(rotation).y;
  if (!Number.isFinite(up) || up < 1 - 1e-8) return false;
  const layers = phaseVolumes(vessel);
  return !(layers.aqueous > 1e-10 && layers.organic > 1e-10);
}

const fillLevel = (vessel: VesselState) => solveStockLiquidSurface(vessel, [0, 1, 0],
  liquidInventoryMass(vessel) / vessel.volume_ml)?.c ?? vesselLiquidSurfaceY(vessel);

/** Read the current geometry at accepted angular motion. A pour, moving grain
 * or changed capacity updates the boundary without inventing elapsed time. */
export function vesselVortexSurface(vessel: VesselState, fluid?: ReturnType<typeof suspensionFluidProperties>): VortexSurface | undefined {
  const motion = vessel.liquidMotion;
  if (!motion || !Number.isFinite(motion.angularSpeed_rad_s) || Math.abs(motion.angularSpeed_rad_s) < 0.005
    || !supportsVesselVortex(vessel)) return undefined;
  if ((fluid ?? suspensionFluidProperties(vessel.contents, vessel.volume_ml, vessel.temperature_c)).carrierMode !== 'liquid') return undefined;
  const vortex = new LiquidVortex();
  vortex.setMotion(motion.angularSpeed_rad_s, motion.phase_rad, getVesselProfile(vessel.type, vessel.capacity_ml), fillLevel(vessel));
  return vortex.surface;
}

export function hasVesselLiquidMotion(vessel: VesselState): boolean {
  return Math.abs(vessel.liquidMotion?.angularSpeed_rad_s ?? 0) > 0
    || (vessel.liquidMotion?.remainder_s ?? 0) >= DT;
}

/** The chemistry clock calls this once, before contact/kinetics. Consumers
 * only read the accepted state; pause and remount never advance it. */
export function advanceVesselLiquidMotion(vessel: VesselState, dt: number, intensity: number): VesselLiquidMotionState | undefined {
  const old = vessel.liquidMotion;
  if (!(dt > 0) || !Number.isFinite(dt)) return old;
  const drive = Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 0;
  if (!old && drive === 0) return undefined;
  const phase = Number.isFinite(old?.phase_rad) ? old!.phase_rad : 0;
  const empty = { angularSpeed_rad_s: 0, phase_rad: phase, remainder_s: 0 };
  const fluid = suspensionFluidProperties(vessel.contents, vessel.volume_ml, vessel.temperature_c);
  if (!supportsVesselVortex(vessel) || fluid.carrierMode !== 'liquid')
    return old?.angularSpeed_rad_s === 0 && old.remainder_s === 0 && old.phase_rad === phase ? old : empty;
  if (!drive && !hasVesselLiquidMotion(vessel)) return old && Number.isFinite(old.angularSpeed_rad_s)
    && Number.isFinite(old.phase_rad) && Number.isFinite(old.remainder_s) ? old : empty;
  const profile = getVesselProfile(vessel.type, vessel.capacity_ml), fill = fillLevel(vessel), vortex = new LiquidVortex();
  vortex.setMotion(old?.angularSpeed_rad_s ?? 0, old?.phase_rad ?? 0, profile, fill);
  let remainder_s = (Number.isFinite(old?.remainder_s) ? Math.max(0, old!.remainder_s) : 0) + dt, steps = 0;
  while (remainder_s + 1e-12 >= DT && steps++ < MAX_STEPS) {
    vortex.advance(DT, drive, profile, fill, fluid.viscosity_mPa_s, fluid.density_g_ml, vessel.stirringDirection ?? 1);
    remainder_s = Math.max(0, remainder_s - DT);
  }
  if (!drive && vortex.angularSpeed_rad_s === 0 && remainder_s < DT) remainder_s = 0;
  return { angularSpeed_rad_s: vortex.angularSpeed_rad_s, phase_rad: vortex.phase_rad, remainder_s };
}
