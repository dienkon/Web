import type { VesselState } from '../types/chemistry';
import { projectAqueousSolution } from '../engine/aqueousProjection';
import { identifySpecies, sameMolecularFormula } from './speciesIdentity';
import { vesselLiquidSurfaceY } from './vesselGeometry';
import { liquidGeometry, vesselInnerRadius } from './vesselDimensions';
import { vesselBodyTransform, vesselLocalToWorld } from './vesselScale';

export function probePoint(vessel: VesselState | null | undefined, radius_scene: number): [number, number, number] | null {
  if (!vessel || vessel.isShattered || vessel.isSealed || !(vessel.capacity_ml > 0) || !(vessel.volume_ml > 0.05)
    || !Number.isFinite(vessel.volume_ml) || !Number.isFinite(vessel.capacity_ml) || !(radius_scene > 0)
    || !vessel.contents.some(c => c.mass_g > 0 && (['l', 'liquid', 'aq'].includes(c.phase ?? c.state ?? identifySpecies(c.formula).phase ?? '')
      || sameMolecularFormula(c.formula, 'H2O') && !c.phase && !c.state))) return null;
  const { scale } = vesselBodyTransform(vessel), radius = radius_scene / scale;
  const floor = liquidGeometry(vessel.type).floorY, surface = vesselLiquidSurfaceY(vessel);
  if (![floor, surface, radius].every(Number.isFinite) || surface - floor < 2 * radius) return null;
  const y = (surface + floor) / 2;
  if ([-radius, 0, radius].some(dy => vesselInnerRadius(vessel.type, y + dy - floor) < radius)) return null;
  return vesselLocalToWorld(vessel, [0, y, 0]);
}

export function sampleMeasurement(vessel: VesselState | null | undefined, scenarioPh?: number) {
  const temperature_c = vessel && !vessel.isShattered && vessel.capacity_ml > 0 && Number.isFinite(vessel.temperature_c)
    && vessel.temperature_c > -273.15 ? vessel.temperature_c : null;
  const thermometerPoint = probePoint(vessel, 0.09), phPoint = probePoint(vessel, 0.065);
  let ph: number | null = null, referenceTemperature_c: number | null = null;
  let basis: 'scenario' | 'ideal_aqueous_25c' | 'ideal_aqueous_temperature' | null = null;
  let reason = !vessel ? 'Chọn bình cần đo' : vessel.isShattered ? 'Bình đã vỡ' : vessel.isSealed ? 'Mở nút bình trước khi đo'
    : !phPoint ? 'Chưa có đủ dung dịch để ngập đầu đo' : 'Chưa có mô hình pH cho thành phần hoặc nhiệt độ này';
  if (vessel && phPoint) {
    if (scenarioPh !== undefined && Number.isFinite(scenarioPh)) { ph = scenarioPh; basis = 'scenario'; }
    else {
      // Recompute from the current inventory without waiting for a simulation
      // tick or trusting a stale/default pH left by another specimen.
      const current = { ...vessel, ...projectAqueousSolution(vessel) };
      if (current.phModel && Number.isFinite(current.ph)) {
        ph = current.ph; basis = current.phModel;
        referenceTemperature_c = current.phReferenceTemperature_c ?? current.temperature_c;
      }
    }
    if (ph !== null) reason = '';
  }
  return { temperature_c, thermometerPoint, phPoint, ph, basis, referenceTemperature_c, reason };
}
