import { describe, expect, it } from 'vitest';
import { partitionLeadIodide } from '../src/engine/leadIodidePhase';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import type { VesselState } from '../src/types/chemistry';

const sample = (temperature_c = 25) => ({ type: 'flask', temperature_c,
  volume_ml: 100, capacity_ml: 250, contents: [{ formula: 'PbI2', phase: 's', mass_g: 0.2, moles: 0.2 / 461.01 }],
  precipitateAmount_g: 0.2, precipitateSubstance: 'PbI2' } as VesselState);
const step = (v: VesselState) => ({ ...v, ...partitionLeadIodide(v, 0.1) });

describe('PbI2 direct precipitation and cooling crystallization', () => {
  it('does not infer golden rain from formula, yellow color, or a fresh cold mixture', () => {
    expect(getPrecipitateProfile('PbI2').morphology).toBe('fine_powder');
    expect(getPrecipitateProfile('PbI₂(s)', 'CRYSTAL_PLATE').morphology).toBe('crystalline');
    expect(getPrecipitateProfile('Cu(OH)₂(s)').id).toBe('Cu(OH)2');
    expect(getPrecipitateProfile('yellow').morphology).toBe('fine_powder');
    expect(step(sample()).precipitateMorphology).toBe('FINE_POWDER');
  });
  it('requires cooling and growth from dissolved material, preserves the observation through serialization', () => {
    let v = sample(95);
    for (let i = 0; i < 600; i++) v = step(v);
    expect(v.precipitateAmount_g).toBeLessThan(1e-8);
    v = JSON.parse(JSON.stringify(v));
    v.temperature_c = 20;
    v = step(v);
    expect(v.precipitateMorphology).toBe('CRYSTAL_PLATE');
    for (let i = 0; i < 20; i++) v = step(v);
    expect(v.precipitateMorphology).toBe('CRYSTAL_PLATE');
    expect(v.contents.reduce((s, x) => s + x.mass_g, 0)).toBeCloseTo(0.2, 12);
    const system = new PrecipitationSystem();
    system.update(0.1, { temp_c: 20, viscosity_mPa_s: 1, density_g_ml: 1, radius: 1,
      liquidBottomY: 0, surfaceY: 1, precipitateAmount_g: v.precipitateAmount_g!,
      substance: 'PbI2', formation: v.precipitateMorphology });
    expect(system.profile.morphology).toBe('crystalline');
    expect(system.representedMass_g).toBeCloseTo(v.precipitateAmount_g!, 12);
  });
  it('does not interpret added solid during cooling as recrystallization evidence', () => {
    let v = step(sample(95));
    v.temperature_c = 20;
    v.contents.push({ formula: 'PbI2', phase: 's', mass_g: 0.1, moles: 0.1 / 461.01 });
    v = step(v);
    expect(v.precipitateMorphology).toBe('FINE_POWDER');
  });
  it('clears thermal history when the species is removed', () => {
    const v = step(sample());
    v.contents = [];
    expect(step(v).leadIodidePhaseHistory).toBeUndefined();
  });
});
