import type { SpillState, VesselState } from '../types/chemistry';
import type { StockGrainPose } from './stockTypes';
import { siPointToScene } from '../science/sceneUnits';
import { findChemical } from '../data/chemicals';

/** One idempotent inventory transfer. The physical pose carries no second
 * stock mass: this removes the very same solid rows from its source. */
export function escapeStockGrain(vessel: VesselState, spills: Record<string, SpillState>, pose: StockGrainPose) {
  const id = `stock_spill_${pose.id}`;
  if (spills[id]) return null;
  const candidates = vessel.contents.filter(c => c.formula === pose.formula && c.phase === 's' && c.mass_g > 0 && c.location !== 'filter' && c.location !== 'foam');
  const available = candidates.reduce((sum, c) => sum + c.mass_g, 0), mass = Math.min(available, pose.mass_g);
  if (!(mass > 1e-10)) return null;
  const fraction = mass / available;
  const contents = candidates.map(c => ({ ...c, mass_g: c.mass_g * fraction, moles: c.moles * fraction, initialMass_g: c.mass_g * fraction }));
  const source = vessel.contents.map(c => candidates.includes(c) ? { ...c, mass_g: c.mass_g * (1 - fraction), moles: c.moles * (1 - fraction) } : c)
    .filter(c => c.mass_g > 1e-12);
  const grain = { ...pose, mass_g: mass, scale_m: pose.scale_m * Math.cbrt(mass / pose.mass_g), vesselId: vessel.id };
  const spill: SpillState = { id, stockMotion: grain, position: siPointToScene(pose.position_m), contents,
    substances: [pose.formula], color: findChemical(pose.formula)?.color ?? '#d1d5db', volume_ml: 0, mass_g: mass,
    radius: Math.max(0.015, pose.scale_m / 0.035), isHazard: !!findChemical(pose.formula)?.hazards.length, temperature_c: vessel.temperature_c,
    sourceVesselName: vessel.name, timestamp: 0 };
  return { vessel: { ...vessel, contents: source, substances: [...new Set(source.map(c => c.formula))], mass_g: Math.max(0, vessel.mass_g - mass),
    stockMotion: vessel.stockMotion ? { ...vessel.stockMotion, grains: vessel.stockMotion.grains.filter(p => p.id !== pose.id) } : undefined },
    spill };
}
