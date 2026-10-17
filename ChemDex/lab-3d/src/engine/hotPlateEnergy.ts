import type { VesselState } from '../types/chemistry';
import { sampleHeatCapacity } from './thermalState';

// Illustrative lumped plate/contact parameters, not calibration for a specific unit.
export const PLATE_HEAT_CAPACITY_J_K = 400;
export const PLATE_POWER_W = 600;
export const PLATE_TOP_Y = 0.27;
const PLATE_LOSS_W_K = 1.2;
const CONTACT_W_K = 4;
export const HOT_PLATE_RECEIVERS = ['beaker', 'flask', 'watch_glass', 'evaporating_dish', 'crucible'];

export function hotPlateSetpoint(value: number): number {
  return Number.isFinite(value) ? Math.max(25, Math.min(350, value)) : 100;
}

export function onHotPlate(plate: VesselState, receiver: VesselState): boolean {
  return plate.type === 'hot_plate' && !plate.isShattered && !receiver.isShattered
    && HOT_PLATE_RECEIVERS.includes(receiver.type) && !receiver.id.startsWith('lesson_vessel_')
    && Math.abs(receiver.position[1] - plate.position[1] - PLATE_TOP_Y) < 0.06
    && Math.hypot(receiver.position[0] - plate.position[0], receiver.position[2] - plate.position[2]) < 0.55
    && Math.abs(receiver.rotationZ ?? 0) < 0.1;
}

/** A metered electrical input heats the plate reservoir, then contact transfers
 * a bounded share to samples. Turning off retains the plate's residual heat.
 * Cooling from a hotter sample back into the plate is not represented yet. */
export function stepHotPlate(plate: VesselState, receivers: VesselState[], dt: number) {
  const energyByVessel_J = new Map<string, number>();
  if (plate.type !== 'hot_plate' || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(plate.temperature_c)) {
    return { plate, energyByVessel_J };
  }
  const settings = plate.hotPlate ?? { isOn: false, setPoint_c: 100 };
  const setpoint = hotPlateSetpoint(settings.setPoint_c);
  const isOn = settings.isOn && !plate.isShattered;
  if (!isOn && plate.temperature_c === 25) return { plate, energyByVessel_J };
  const electrical = isOn ? Math.min(PLATE_POWER_W * dt, Math.max(0, setpoint - plate.temperature_c) * PLATE_HEAT_CAPACITY_J_K) : 0;
  const warmed = plate.temperature_c + electrical / PLATE_HEAT_CAPACITY_J_K;
  const cooled = 25 + (warmed - 25) * Math.exp(-PLATE_LOSS_W_K * dt / PLATE_HEAT_CAPACITY_J_K);
  const lost = (warmed - cooled) * PLATE_HEAT_CAPACITY_J_K;
  const targets = receivers.filter(receiver => onHotPlate(plate, receiver) && cooled > receiver.temperature_c);
  let requested = 0;
  const requests = targets.map(receiver => {
    const capacity = sampleHeatCapacity(receiver);
    const difference = cooled - receiver.temperature_c;
    const equilibrium = difference / (1 / PLATE_HEAT_CAPACITY_J_K + 1 / capacity);
    const energy = Math.min(CONTACT_W_K * difference * dt, equilibrium);
    requested += energy;
    return { id: receiver.id, energy };
  });
  const available = Math.max(0, cooled - Math.min(cooled, ...targets.map(receiver => receiver.temperature_c))) * PLATE_HEAT_CAPACITY_J_K;
  const fraction = requested > 0 ? Math.min(1, available / requested) : 0;
  let delivered = 0;
  for (const request of requests) {
    const energy = request.energy * fraction;
    energyByVessel_J.set(request.id, energy);
    delivered += energy;
  }
  const next: VesselState = { ...plate, temperature_c: cooled - delivered / PLATE_HEAT_CAPACITY_J_K,
    hotPlate: { isOn, setPoint_c: setpoint,
      electricalEnergy_J: (settings.electricalEnergy_J ?? 0) + electrical,
      deliveredHeat_J: (settings.deliveredHeat_J ?? 0) + delivered,
      heatLost_J: (settings.heatLost_J ?? 0) + lost } };
  return { plate: next, energyByVessel_J };
}
