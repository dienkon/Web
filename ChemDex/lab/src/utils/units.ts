// Centralized Unit Conversion & Measurement Utility

export type VolumeUnit = 'mL' | 'L' | 'drops';
export type MassUnit = 'g' | 'mg' | 'kg';
export type AmountUnit = 'mol' | 'mmol';
export type ConcentrationUnit = 'M' | 'mM' | '%';
export type TemperatureUnit = '°C' | 'K' | '°F';

export function convertVolume(value: number, from: VolumeUnit, to: VolumeUnit): number {
  if (from === to) return value;
  // base unit: mL
  let ml = value;
  if (from === 'L') ml = value * 1000;
  else if (from === 'drops') ml = value / 20; // standard 20 drops = 1 mL

  if (to === 'mL') return ml;
  if (to === 'L') return ml / 1000;
  if (to === 'drops') return ml * 20;
  return ml;
}

export function convertMass(value: number, from: MassUnit, to: MassUnit): number {
  if (from === to) return value;
  // base unit: g
  let g = value;
  if (from === 'mg') g = value / 1000;
  else if (from === 'kg') g = value * 1000;

  if (to === 'g') return g;
  if (to === 'mg') return g * 1000;
  if (to === 'kg') return g / 1000;
  return g;
}

export function convertAmount(value: number, from: AmountUnit, to: AmountUnit): number {
  if (from === to) return value;
  // base unit: mol
  let mol = value;
  if (from === 'mmol') mol = value / 1000;

  if (to === 'mol') return mol;
  if (to === 'mmol') return mol * 1000;
  return mol;
}

export function convertTemperature(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
  if (from === to) return value;
  // base unit: Celsius
  let c = value;
  if (from === 'K') c = value - 273.15;
  else if (from === '°F') c = (value - 32) * (5 / 9);

  if (to === '°C') return c;
  if (to === 'K') return c + 273.15;
  if (to === '°F') return (c * (9 / 5)) + 32;
  return c;
}

export function formatMeasurement(value: number, unit: string, precision: number = 2): string {
  if (isNaN(value) || !isFinite(value)) return `0.00 ${unit}`;
  return `${Number(value.toFixed(precision))} ${unit}`;
}

export function formatTemperature(value_c: number, unit: 'C' | 'F' | 'K' = 'C'): string {
  if (isNaN(value_c) || !isFinite(value_c)) return '25.0°C';
  if (unit === 'F') return `${((value_c * 9) / 5 + 32).toFixed(1)}°F`;
  if (unit === 'K') return `${(value_c + 273.15).toFixed(1)} K`;
  return `${value_c.toFixed(1)}°C`;
}

export function formatPH(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '7.00';
  return Math.min(14, Math.max(0, value)).toFixed(2);
}

export function formatMass(value_g: number, unit: 'g' | 'mg' | 'kg' = 'g'): string {
  if (isNaN(value_g) || !isFinite(value_g)) return '0.00 g';
  if (unit === 'mg') return `${(value_g * 1000).toFixed(1)} mg`;
  if (unit === 'kg') return `${(value_g / 1000).toFixed(3)} kg`;
  return `${value_g.toFixed(2)} g`;
}

export function formatVolume(value_ml: number, unit: 'mL' | 'L' = 'mL'): string {
  if (isNaN(value_ml) || !isFinite(value_ml)) return '0.0 mL';
  if (unit === 'L') return `${(value_ml / 1000).toFixed(3)} L`;
  return `${value_ml.toFixed(1)} mL`;
}

export function calculateMassFromMoles(moles: number, molarMass: number): number {
  return moles * molarMass;
}

export function calculateMolesFromMass(mass_g: number, molarMass: number): number {
  if (molarMass <= 0) return 0;
  return mass_g / molarMass;
}

export function calculateMolarity(moles: number, volume_ml: number): number {
  if (volume_ml <= 0) return 0;
  const volume_L = volume_ml / 1000;
  return moles / volume_L;
}

export function calculatePhFromHPlus(hPlusConcentration_M: number): number {
  if (hPlusConcentration_M <= 0) return 14;
  const ph = -Math.log10(hPlusConcentration_M);
  return Math.min(14, Math.max(0, Number(ph.toFixed(2))));
}

export function calculateHPlusFromPh(ph: number): number {
  return Math.pow(10, -ph);
}
