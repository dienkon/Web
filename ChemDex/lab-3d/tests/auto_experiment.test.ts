import { describe, expect, it } from 'vitest';
import { AutoExperiment, AUTO_EXPERIMENTS } from '../src/vfx/autoplay/AutoExperiment';
import { useAppStore } from '../src/store/useAppStore';
import { solidAerosolVisuals } from '../src/vfx/solidAerosolVisuals';
import type { VesselState } from '../src/types/chemistry';

describe('Isolated automatic experiments for the system catalog', () => {
  it.each(AUTO_EXPERIMENTS.map(e => [e.id]))('%s completes its actual chemistry sequence without modifying the workbench', id => {
    const before = useAppStore.getState(), e = new AutoExperiment(id, false);
    const initialMass = e.sample.mass_g + e.donors.reduce((sum, d) => sum + d.remaining, 0);
    let sawDose = false;
    for (let i = 0; i < 2600 && !['complete', 'error'].includes(e.phase); i++) {
      e.tick(0.1);
      if (e.phase === 'dose') {
        sawDose = true;
        expect(e.sample.mass_g + Object.values(e.sample.escapedGas_g ?? {}).reduce((sum, g) => sum + g, 0)
          + (e.sample.evaporated_ml ?? 0) + e.donors.reduce((sum, d) => sum + d.remaining, 0), id).toBeCloseTo(initialMass, 7);
      }
    }
    expect(e.error, id).toBeNull(); expect(e.phase, id).toBe('complete');
    expect(e.progress, id).toBeGreaterThan(0.5);
    expect(sawDose || e.donors.length === 0).toBe(true);
    expect(e.donors.every(d => d.remaining === 0)).toBe(true);
    expect(useAppStore.getState()).toBe(before);
    const finalMass = e.sample.mass_g + Object.values(e.sample.escapedGas_g ?? {}).reduce((sum, g) => sum + g, 0) + (e.sample.evaporated_ml ?? 0);
    expect(finalMass, id).toBeCloseTo(initialMass, 5);
  }, 15000);
  it('freezes dosing, gas and camera decisions while paused; clocks agree across frame rates', () => {
    const e = new AutoExperiment('cu_hno3_conc');
    for (let i = 0; i < 110; i++) e.tick(0.1);
    e.paused = true;
    const before = JSON.stringify({ sample: e.sample, phase: e.phase, clock: e.elapsed, donors: e.donors, clouds: [...e.clouds.clouds.values()] });
    e.tick(0.1);
    expect(JSON.stringify({ sample: e.sample, phase: e.phase, clock: e.elapsed, donors: e.donors, clouds: [...e.clouds.clouds.values()] })).toBe(before);
    const a = new AutoExperiment('cuso4_naoh', false), b = new AutoExperiment('cuso4_naoh', false);
    for (let i = 0; i < 600; i++) a.tick(1 / 60);
    for (let i = 0; i < 100; i++) b.tick(0.1);
    expect(a.sample.contents).toEqual(b.sample.contents); expect(a.elapsed).toBe(b.elapsed);
  });
  it('emits solid smoke only from newly formed reviewed aerosol products', () => {
    const sample = { contents: [{ formula: 'MgO', phase: 's', solidOrigin: 'precipitate', moles: 0.001, mass_g: 0.0403 }] } as VesselState;
    const empty = { contents: [] } as unknown as VesselState;
    expect(solidAerosolVisuals(sample, empty, 'mg_o2_burn', 0.1)[0].rate).toBeGreaterThan(0);
    expect(solidAerosolVisuals(sample, sample, 'mg_o2_burn', 0.1)).toEqual([]);
    expect(solidAerosolVisuals(sample, empty, 'h2o2_mno2', 0.1)).toEqual([]);
    expect(solidAerosolVisuals({ ...sample, contents: sample.contents.map(c => ({ ...c, solidOrigin: undefined })) }, empty, 'mg_o2_burn', 0.1)).toEqual([]);
  });
  it('starts a contact reaction during the final dose rather than waiting for a cutscene', () => {
    const e = new AutoExperiment('cu_hno3_conc');
    // Solvent now has its own complete lift/tilt/pour/return sequence too.
    for (let i = 0; i < 60 * 60 && !(e.phase === 'dose' && e.progress > 0); i++) e.tick(1 / 60);
    expect(e.phase).toBe('dose'); expect(e.donors[e.donorIndex].remaining).toBeGreaterThan(0);
    expect(e.progress).toBeGreaterThan(0); expect(e.sample.escapedGas_g?.NO2).toBeGreaterThan(0);
  });
});
