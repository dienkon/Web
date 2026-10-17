/**
 * Unit tests for the continuous simulation tick engine.
 * Verifies physics invariants: cooling to ambient, boiling point, evaporation
 * mass loss, pour rate with spillage, hot-plate coupling distance.
 */

import { describe, it, expect } from 'vitest';
import {
  stepVesselThermal,
  aqueousBoilingPoint,
  burnerHeatToVessel,
  hotPlateHeatToVessel,
  stepMixing,
  stepPour,
  AMBIENT_TEMP_C,
  BURNER_FUEL_CAPACITY_ML,
} from '../simulationTick';
import { EquipmentState } from '../../types/equipment';

const baseEq = (overrides: Partial<EquipmentState> = {}): EquipmentState => ({
  id: 'eq_1',
  name: 'Beaker',
  name_vi: 'Cốc',
  type: 'beaker',
  x: 0,
  y: 0,
  width: 140,
  height: 160,
  capacity_ml: 250,
  isContainer: true,
  temperature_c: 25,
  contents: [],
  volume_ml: 0,
  mass_g: 95,
  tare_g: 95,
  ph: 7,
  ...overrides,
});

const withWater = (vol_ml: number): EquipmentState =>
  baseEq({
    volume_ml: vol_ml,
    mass_g: 95 + vol_ml,
    contents: [
      { formula: 'H2O', moles: vol_ml / 18.015, mass_g: vol_ml, state: 'l' as const },
    ],
  });

describe('aqueousBoilingPoint', () => {
  it('pure water boils at ~100 °C', () => {
    const bp = aqueousBoilingPoint(withWater(100).contents, 100);
    expect(bp).toBeCloseTo(100, 0);
  });

  it('dissolved NaCl elevates the boiling point', () => {
    const contents = [
      { formula: 'H2O', moles: 5.55, mass_g: 100, state: 'l' as const },
      { formula: 'NaCl', moles: 1, mass_g: 58.44, state: 'aq' as const },
    ];
    const bp = aqueousBoilingPoint(contents, 100);
    expect(bp).toBeGreaterThan(100);
    expect(bp).toBeLessThan(118);
  });
});

describe('stepVesselThermal', () => {
  it('cools toward ambient when no power applied', () => {
    const hot = withWater(100);
    hot.temperature_c = 80;
    const r = stepVesselThermal(hot, 1, 0);
    expect(r.temperature_c).toBeLessThan(80);
    expect(r.temperature_c).toBeGreaterThan(AMBIENT_TEMP_C);
  });

  it('heats up under absorbed power', () => {
    const v = withWater(100);
    const r = stepVesselThermal(v, 1, 200);
    expect(r.temperature_c).toBeGreaterThan(25);
  });

  it('does not exceed boiling point in an open vessel — boils off water instead', () => {
    const v = withWater(100);
    v.temperature_c = 99.9;
    const r = stepVesselThermal(v, 5, 1000);
    expect(r.temperature_c).toBeLessThanOrEqual(102);
    expect(r.isBoiling).toBe(true);
    expect(r.evaporatedStep_g).toBeGreaterThan(0);
    expect(r.volume_ml).toBeLessThan(100);
  });

  it('sealed vessel does not boil off', () => {
    const v = withWater(100);
    v.temperature_c = 99.9;
    v.isSealed = true;
    const r = stepVesselThermal(v, 5, 1000);
    expect(r.isBoiling).toBe(false);
    expect(r.evaporatedStep_g).toBe(0);
  });
});

describe('burnerHeatToVessel', () => {
  const burner = baseEq({
    id: 'b1',
    type: 'bunsen_burner',
    isContainer: false,
    x: 100,
    y: 300,
    width: 100,
    height: 140,
    isOn: true,
    fuelLevel_ml: BURNER_FUEL_CAPACITY_ML,
    heatIntensity: 1,
  });

  it('delivers heat when vessel is overhead', () => {
    const v = baseEq({ x: 80, y: 180 }); // right above burner
    expect(burnerHeatToVessel(burner, v)).toBeGreaterThan(0);
  });

  it('zero heat when vessel is far away', () => {
    const v = baseEq({ x: 900, y: 800 });
    expect(burnerHeatToVessel(burner, v)).toBe(0);
  });

  it('zero heat when off or out of fuel', () => {
    expect(burnerHeatToVessel({ ...burner, isOn: false }, baseEq())).toBe(0);
    expect(burnerHeatToVessel({ ...burner, fuelLevel_ml: 0 }, baseEq())).toBe(0);
  });
});

describe('hotPlateHeatToVessel', () => {
  const plate = baseEq({
    id: 'hp1',
    type: 'hot_plate',
    isContainer: false,
    x: 200,
    y: 400,
    width: 180,
    height: 100,
    isOn: true,
    setPoint_c: 150,
  });
  const beaker = baseEq({ x: 230, y: 240, height: 160, temperature_c: 25 });

  it('delivers heat when beaker sits on the plate', () => {
    expect(hotPlateHeatToVessel(plate, beaker)).toBeGreaterThan(0);
  });

  it('no heat when beaker is displaced', () => {
    expect(hotPlateHeatToVessel(plate, { ...beaker, x: 800 })).toBe(0);
  });

  it('no heat when plate is off', () => {
    expect(hotPlateHeatToVessel({ ...plate, isOn: false }, beaker)).toBe(0);
  });
});

describe('stepPour', () => {
  const src = withWater(50);
  const tgt = withWater(0);

  it('moves liquid at the requested rate', () => {
    const { moved_ml } = stepPour(
      { ...src, x: 0, width: 140 },
      { ...tgt, x: 60, width: 140, capacity_ml: 250 },
      1,
      10,
    );
    expect(moved_ml).toBeGreaterThan(0);
    expect(moved_ml).toBeLessThanOrEqual(10);
  });

  it('spills when mouths are misaligned', () => {
    const aligned = stepPour({ ...src, x: 100 }, { ...tgt, x: 100 }, 1, 10);
    const offset = stepPour({ ...src, x: 0 }, { ...tgt, x: 600 }, 1, 10);
    expect(offset.spill_ml).toBeGreaterThan(aligned.spill_ml);
  });

  it('caps at target capacity and reports done when empty', () => {
    const full = { ...tgt, volume_ml: 250, mass_g: 345, capacity_ml: 250 };
    const { moved_ml, spill_ml } = stepPour(src, full, 1, 10);
    expect(moved_ml).toBe(0);
    expect(spill_ml).toBeGreaterThan(0);
    const done = stepPour({ ...src, volume_ml: 0 }, tgt, 1, 10);
    expect(done.done).toBe(true);
  });
});

describe('stepMixing', () => {
  it('homogenizes faster when stirred', () => {
    const v = withWater(50);
    v.mixedness = 0;
    const unstirred = stepMixing(v, 1);
    const stirred = stepMixing({ ...v, stirringSpeed: 1, isStirred: true }, 1);
    expect(stirred.mixedness!).toBeGreaterThan(unstirred.mixedness!);
  });
});
