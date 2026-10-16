import type { BurnerState, VesselState } from '../types/chemistry';

// DOE AFDC: E100 lower heating value 76,330 Btu per US gallon.
// https://afdc.energy.gov/fuels/properties
export const ETHANOL_LHV_J_ML = 76_330 * 1055.05585262 / 3785.411784;
export const DEFAULT_ETHANOL_VOLUME_FRACTION = 0.96;
// Wick consumption and coupling remain illustrative until measured for this lamp.
export const NOMINAL_FUEL_RATE_ML_S = 0.02;
export const MAX_CAPTURE_FRACTION = 0.65;

export function burnerIntensity(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(5, Math.round(value))) : 3;
}
const finiteNonnegative = (value: number | undefined, fallback = 0) => value === undefined ? fallback
  : Number.isFinite(value) ? Math.max(0, value) : 0;

/** Fuel remains full precision. A partial final burn emits only the energy of
 * the fuel actually consumed, even when the lamp goes out inside this step. */
export function stepAlcoholBurner(burner: BurnerState, dt: number) {
  const fuel = finiteNonnegative(burner.fuelLevel_ml, 120);
  const intensity = burnerIntensity(burner.intensity);
  const fraction = burner.ethanolVolumeFraction === undefined ? DEFAULT_ETHANOL_VOLUME_FRACTION
    : Number.isFinite(burner.ethanolVolumeFraction) ? Math.max(0, Math.min(1, burner.ethanolVolumeFraction)) : 0;
  const active = burner.isOn && fuel > 0 && fraction > 0;
  const burned_ml = active && Number.isFinite(dt) && dt > 0
    ? Math.min(fuel, NOMINAL_FUEL_RATE_ML_S * intensity / 3 * dt) : 0;
  const remaining = fuel - burned_ml;
  const isOn = active && remaining > 0;
  const energy_J = burned_ml * fraction * ETHANOL_LHV_J_ML;
  const next: BurnerState = { ...burner, intensity, fuelLevel_ml: remaining,
    ethanolVolumeFraction: fraction, isOn,
    flameState: remaining <= 0 || fraction <= 0 ? 'OUT_OF_FUEL'
      : isOn ? intensity === 1 ? 'LOW_FLAME' : intensity >= 4 ? 'HIGH_FLAME' : 'MEDIUM_FLAME'
      : burner.flameState === 'OUT_OF_FUEL' ? 'UNLIT' : burner.flameState ?? 'UNLIT',
    tempOutput_c: isOn ? 320 + intensity * 45 : 25,
    burnedFuel_ml: finiteNonnegative(burner.burnedFuel_ml) + burned_ml,
    releasedHeat_J: finiteNonnegative(burner.releasedHeat_J) + energy_J,
  };
  return { burner: next, burned_ml, energy_J, capturableHeat_J: energy_J * MAX_CAPTURE_FRACTION };
}

/** Existing scene geometry is only a coupling approximation, not a calibrated
 * distance law. Normalize all receivers against ONE finite source heat budget. */
export function allocateBurnerHeat(burner: BurnerState, capturableHeat_J: number, vessels: VesselState[]) {
  const weights = vessels.filter(v => !v.isShattered && !v.id.startsWith('lesson_vessel_')).map(v => {
    const horizontal = Math.hypot(burner.position[0] - v.position[0], burner.position[2] - v.position[2]);
    const height = v.position[1] - burner.position[1];
    const distance = Math.hypot(horizontal, burner.position[1] + 1.25 - v.position[1]);
    const radius = Number.isFinite(burner.heatRadius) && burner.heatRadius! > 0 ? burner.heatRadius! : 1.8;
    const weight = horizontal < 0.85 && height >= 0.6 && height <= 2.8 ? 1
      : distance < radius ? Math.max(0, 1 - (distance / radius) ** 1.8) * 0.35 : 0;
    return { id: v.id, weight };
  });
  const normalization = Math.max(1, weights.reduce((sum, entry) => sum + entry.weight, 0));
  const energy = Number.isFinite(capturableHeat_J) ? Math.max(0, capturableHeat_J) : 0;
  const energyByVessel_J = new Map(weights.filter(entry => entry.weight > 0)
    .map(entry => [entry.id, energy * entry.weight / normalization]));
  return { energyByVessel_J, deliveredHeat_J: [...energyByVessel_J.values()].reduce((sum, value) => sum + value, 0) };
}
