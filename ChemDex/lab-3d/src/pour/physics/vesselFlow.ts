import type { VesselState } from '../../types/chemistry';
import type { MobileSolidInventory } from '../../science/suspensionTransport';
import { liquidInventoryMass, occupiedLiquidVolume, solidDisplacementAtSurface, solidMaximumDisplacementMl } from '../../handling/solidOccupancy';
import { withdrawAliquot } from '../../handling/aliquot';
import { getWorldVesselProfile } from './profiles';
import { findPouringTilt, retainedVolume } from './retained';
import { calculateWeirFlow, type FlowResult } from './flow';
import { stockImmersion } from '../../science/stockImmersion';
import { solveStockLiquidSurface } from '../../science/stockLiquidSurface';
import { getVesselProfile } from './profiles';

export interface VesselFlowResult extends FlowResult {
  surfaceVolume_ml: number;
  retainedLiquidVolume_ml: number;
  retainedGrossVolume_ml: number;
  displacementBasis: 'liquid-only' | 'upright-compact-reference' | 'stock-mesh-envelope-reference';
}

/** Dense separated stock meshes use their actual tilted halfspace immersion.
 * Unsupported solids retain the explicitly named compact upright reference.
 * Neither basis models moving grain contact or calibrates the flow closure. */
export function calculateVesselWeirFlow(vessel: VesselState, tilt: number, simTime = 0,
  viscosity = 1, mobileSolids: MobileSolidInventory = {}): VesselFlowResult {
  const profile = getWorldVesselProfile(vessel.type, vessel.capacity_ml);
  const density = vessel.volume_ml > 0 ? liquidInventoryMass(vessel) / vessel.volume_ml : 1;
  const normal = [-Math.sin(tilt), Math.cos(tilt), 0] as const;
  const actualSurface = solveStockLiquidSurface(vessel, normal, density);
  const surfaceVolume_ml = actualSurface?.grossVolume_ml ?? occupiedLiquidVolume(vessel);
  const retainedGrossVolume_ml = retainedVolume(profile, tilt);
  const local = getVesselProfile(vessel.type, vessel.capacity_ml);
  const lip = normal[0] * local.lipLocal[0] + normal[1] * local.lipLocal[1];
  const displacementAtLip = (v: VesselState) => actualSurface
    ? stockImmersion(v, density)?.displacementMl(normal, lip) ?? solidDisplacementAtSurface(v, retainedGrossVolume_ml, density)
    : solidDisplacementAtSurface(v, retainedGrossVolume_ml, density);
  const initialDisplacement = displacementAtLip(vessel);
  let retainedLiquidVolume_ml = Math.max(0, retainedGrossVolume_ml - initialDisplacement);
  if (Object.keys(mobileSolids).length && surfaceVolume_ml > retainedGrossVolume_ml && retainedGrossVolume_ml > 0) {
    // Suspended solids can leave with the carrier. Find the residual LIQUID
    // after that withdrawal, at a fixed geometric lip plane. Never cap a
    // suspension release using the false assumption that all its solids stay.
    const maximum = solidMaximumDisplacementMl(vessel, density);
    if (Math.abs(initialDisplacement - maximum) <= Math.max(1e-12, maximum * 1e-12)) {
      // All known solids already achieve their displacement bound. Shrinking
      // a sampled body cannot make its immersion fraction smaller here.
      const fixed = withdrawAliquot(vessel, vessel.volume_ml, mobileSolids).vessel;
      const fixedDisplacement = displacementAtLip(fixed);
      const mobileDisplacement = Math.max(0, initialDisplacement - fixedDisplacement);
      retainedLiquidVolume_ml = Math.max(0, (retainedGrossVolume_ml - fixedDisplacement)
        / (1 + mobileDisplacement / vessel.volume_ml));
    } else {
      const residual = (remaining: number) => {
        const preview = withdrawAliquot(vessel, vessel.volume_ml - remaining, mobileSolids).vessel;
        return remaining + displacementAtLip(preview) - retainedGrossVolume_ml;
      };
      // D_remaining <= D_initial and D_remaining >= 0 give a much tighter
      // liquid bracket. Alternate secants with bisection to preserve the
      // original worst-case bracket reduction without 40 expensive previews
      // for a nearly linear shallow-sphere equation.
      let low = Math.max(0, retainedGrossVolume_ml - initialDisplacement), high = Math.min(vessel.volume_ml, retainedGrossVolume_ml);
      let fLow = residual(low), fHigh = residual(high);
      const tolerance = Math.max(1e-13, vessel.volume_ml * 1e-12);
      retainedLiquidVolume_ml = fHigh <= tolerance ? high : low;
      if (fLow < -tolerance && fHigh > tolerance) for (let i = 0; i < 80; i++) {
        const secant = low - fLow * (high - low) / (fHigh - fLow);
        const remaining = i % 2 === 0 && Number.isFinite(secant) && secant > low && secant < high
          ? secant : low + (high - low) / 2;
        const value = residual(remaining); retainedLiquidVolume_ml = remaining;
        if (Math.abs(value) <= tolerance || high - low <= tolerance) break;
        if (value < 0) { low = remaining; fLow = value; }
        else { high = remaining; fHigh = value; }
      }
    }
  }
  const occupancy = { surfaceVolume_ml, retainedLiquidVolume_ml };
  const validCapacity = Number.isFinite(vessel.capacity_ml) && vessel.capacity_ml > 0;
  return { ...calculateWeirFlow(profile, validCapacity ? vessel.volume_ml : 0, tilt, simTime, viscosity, 1, occupancy),
    ...occupancy, retainedGrossVolume_ml,
    displacementBasis: actualSurface ? actualSurface.basis : surfaceVolume_ml > vessel.volume_ml ? 'upright-compact-reference' : 'liquid-only' };
}

/** Assist chooses an angle for the geometric occupied volume. The actual
 * release still uses finite liquid inventory and the current retention solve. */
export function findVesselPouringTilt(vessel: VesselState): number {
  const density = vessel.volume_ml > 0 ? liquidInventoryMass(vessel) / vessel.volume_ml : 1;
  const model = stockImmersion(vessel, density);
  if (model && vessel.volume_ml > 0) {
    const raw = getVesselProfile(vessel.type, vessel.capacity_ml), world = getWorldVesselProfile(vessel.type, vessel.capacity_ml);
    for (let i = 0; i < 64; i++) {
      const angle = i / 63 * Math.PI, n = [-Math.sin(angle), Math.cos(angle), 0] as const;
      const c = n[0] * raw.lipLocal[0] + n[1] * raw.lipLocal[1];
      if (retainedVolume(world, angle) - model.displacementMl(n, c) <= vessel.volume_ml * 0.85)
        return Math.max(0.55, Math.min(2.1, angle + 0.12));
    }
    return 1.65;
  }
  return findPouringTilt(getWorldVesselProfile(vessel.type, vessel.capacity_ml), occupiedLiquidVolume(vessel));
}
