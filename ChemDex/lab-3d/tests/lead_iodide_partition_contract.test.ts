import { describe, expect, it } from 'vitest';
import { partitionLeadIodide } from '../src/engine/leadIodidePhase';
import type { VesselState } from '../src/types/chemistry';
import { vesselLocalToWorld } from '../src/science/vesselScale';

const solid = { formula: 'PbI2', phase: 's', mass_g: 0.2, moles: 0.2 / 461.01 };
const water = { formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 };
const sample = (contents = [solid, water]) => ({ type: 'beaker', temperature_c: 95,
  volume_ml: 100, capacity_ml: 250, contents: structuredClone(contents),
  precipitateAmount_g: 0.2, precipitateSubstance: 'PbI2' } as VesselState);

describe('PbI2 phase partition time and carrier', () => {
  it('uses all accepted time for hot dissolution and cold growth', () => {
    for (const hot of [true, false]) {
      const results = [1, 2, 8, 80].map(steps => {
        let vessel = sample();
        if (!hot) { vessel.temperature_c = 20; vessel.contents[0].phase = 'aq'; vessel.precipitateAmount_g = 0; }
        for (let i = 0; i < steps; i++) vessel = { ...vessel, ...partitionLeadIodide(vessel, 0.8 / steps) };
        expect(vessel.contents.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(100.2, 12);
        expect(vessel.contents.filter(item => item.formula === 'PbI2').reduce((sum, item) => sum + item.moles, 0)).toBeCloseTo(solid.moles, 14);
        return vessel.precipitateAmount_g!;
      });
      for (const mass of results) expect(mass).toBeCloseTo(results[0], 13);
      if (hot) expect(results[0]).toBeCloseTo(0.2 * Math.exp(-1.2 * 0.8), 14);
    }
  });
  it('rejects organic, mixed-solvent, frozen, dry and retained-solid carriers without mutation', () => {
    for (const contents of [[solid], [solid, { ...water, phase: 's' }],
      [solid, { formula: 'C6H14', phase: 'l', mass_g: 66, moles: 66 / 86.18 }],
      [solid, water, { formula: 'C2H5OH', phase: 'l', mass_g: 5, moles: 5 / 46.07 }]]) {
      const vessel = sample(contents), before = structuredClone(vessel);
      expect(partitionLeadIodide(vessel, 0.8)).toBeNull(); expect(vessel).toEqual(before);
    }
    for (const location of ['filter', 'foam'] as const) {
      const vessel = sample(); vessel.contents[0].location = location;
      expect(partitionLeadIodide(vessel, 0.8)).toBeNull();
    }
  });
  it('retains aqueous spectator salts while applying the declared water-curve proxy', () => {
    const nitrate = { formula: 'KNO3', phase: 'aq', mass_g: 0.1, moles: 0.1 / 101.1 };
    const result = partitionLeadIodide(sample([solid, water, nitrate]), 0.8)!;
    expect(result.contents).toContainEqual(nitrate);
    expect(result.precipitateAmount_g).toBeCloseTo(0.2 * Math.exp(-1.2 * 0.8), 14);
  });
  it('keeps airborne PbI2 stock unchanged and preserves stock identity after immersion and lifting', () => {
    const vessel = { ...sample(), position: [0, 0, 0], rotationY: 0,
      volume_ml: 30, capacity_ml: 100, leadIodidePhaseHistory: { temperature_c: 80, totalMass_g: 0.2 } } as VesselState;
    const at = (height: number) => vesselLocalToWorld(vessel, [0, height, 0]).map(x => x * 0.035) as [number, number, number];
    vessel.stockMotion = { tick: 1, grains: [{ id: 'stock', formula: 'PbI2', mass_g: 0.2, scale_m: 0.001,
      position_m: at(0.7), rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0],
      angularVelocity_rad_s: [0, 0, 0], sleeping: false, powder: false }] };
    const before = structuredClone(vessel);
    expect(partitionLeadIodide(vessel, 0.5)).toBeNull(); expect(vessel).toEqual(before);
    vessel.stockMotion.grains[0].position_m = at(-0.75);
    const wet = { ...vessel, ...partitionLeadIodide(vessel, 0.1) };
    const remaining = wet.contents.find(row => row.phase === 's')!;
    expect(remaining.mass_g).toBeLessThan(0.2); expect(remaining.solidOrigin).toBeUndefined();
    wet.stockMotion!.grains[0].position_m = at(0.7);
    const lifted = { ...wet, ...partitionLeadIodide(wet, 0.5) };
    expect(lifted.contents.find(row => row.phase === 's' && !row.solidOrigin)).toEqual(remaining);
    expect(lifted.contents.reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(100.2, 12);
  });
  it('allows dissolved-phase crystal growth beside a protected dry stock', () => {
    const vessel = { ...sample(), position: [0, 0, 0], rotationY: 0, volume_ml: 30, capacity_ml: 100,
      temperature_c: 20, leadIodidePhaseHistory: { temperature_c: 95, totalMass_g: 0.4 } } as VesselState;
    vessel.contents.push({ formula: 'PbI2', phase: 'aq', mass_g: 0.2, moles: 0.2 / 461.01 });
    const dry = vessel.contents[0];
    vessel.stockMotion = { tick: 1, grains: [{ id: 'stock', formula: 'PbI2', mass_g: 0.2, scale_m: 0.001,
      position_m: vesselLocalToWorld(vessel, [0, 0.7, 0]).map(x => x * 0.035) as [number, number, number],
      rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: false, powder: false }] };
    const result = partitionLeadIodide(vessel, 0.5)!;
    expect(result.contents).toContainEqual(dry);
    expect(result.contents!.find(row => row.solidOrigin === 'precipitate')!.mass_g).toBeGreaterThan(0);
    expect(result.contents!.reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(100.4, 12);
    expect(result.leadIodidePhaseHistory!.totalMass_g).toBeCloseTo(0.4, 12);
    expect(result.precipitateMorphology).toBe('CRYSTAL_PLATE');
  });
});
