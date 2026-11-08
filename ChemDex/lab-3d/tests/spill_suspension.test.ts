import { describe, expect, it } from 'vitest';
import { ConeGeometry } from 'three';
import type { SpillState, SubstanceContent } from '../src/types/chemistry';
import { reconcileSpillSuspension, stepSpillSuspension, spillSuspensionAppearance, spillVolumeBelow } from '../src/science/spillSuspension';
import { mergeWorkbenchSpill } from '../src/engine/spillInventory';
import { collectSpillPatch } from '../src/engine/spillCleanup';
import { stepWorkbenchSpills } from '../src/engine/spillChemistry';
import { computeMolarMass } from '../src/engine/ledger';
import { solveSessileDrop } from '../src/science/sessileDrop';
import { createSpillGeometry } from '../src/pour/render/spillGeometry';
import { geometryVolume } from '../src/components/three/stockSolidGeometry';
import { powderPileDimensions } from '../src/components/three/SpillPrecipitateBed';
import { METERS_PER_SCENE_UNIT as U } from '../src/science/sceneUnits';

const row = (formula: string, mass_g: number, phase: string): SubstanceContent => ({ formula, phase, mass_g, moles: mass_g / computeMolarMass(formula) });
function sample(formula = 'Ag2S', grams = 0.01): SpillState {
  const contents = [row('H2O', 10, 'l'), { ...row(formula, grams, 's'), solidOrigin: 'precipitate' as const }];
  const s: SpillState = { id: 'p', position: [0, -1.175, 0], volume_ml: 10, mass_g: 10 + grams, contents,
    substances: contents.map(c => c.formula), color: '#fff', radius: 1, isHazard: false, timestamp: 0, temperature_c: 25 };
  s.suspension = reconcileSpillSuspension(s, true); return s;
}
const fractions = (s: SpillState) => { const a = spillSuspensionAppearance(s); return { suspended: a.suspended_g, settled: a.settled_g }; };

describe('Finite suspended/deposited mass in open spills', () => {
  it('matches the independent uniform-column CDF, including zero and complete settling', () => {
    const drop = { radius_m: 0.01, height_m: 0.002, volume_m3: Math.PI * 1e-4 * 0.002, apexCurvature_m_inv: 0, contactAngle_deg: 90,
      profile: [{ radius_m: 0, height_m: 0.002 }, { radius_m: 0.01, height_m: 0.002 }, { radius_m: 0.01, height_m: 0 }] };
    expect(spillVolumeBelow(drop, 0)).toBe(0); expect(spillVolumeBelow(drop, 0.001)).toBeCloseTo(0.5, 12);
    expect(spillVolumeBelow(drop, 0.002)).toBe(1);
    const curved = solveSessileDrop(10)!;
    let previous = 0;
    for (let i = 0; i <= 100; i++) { const next = spillVolumeBelow(curved, curved.height_m * i / 100); expect(next).toBeGreaterThanOrEqual(previous - 1e-14); previous = next; }
  });
  it('partitions the same existing solid independently of 20/30/60/120 FPS and changes no atoms or inventory', () => {
    const results = [];
    for (const fps of [20, 30, 60, 120]) {
      let s = sample(); const contents = s.contents, before = structuredClone(s.contents);
      for (let i = 0; i < fps * 2; i++) s = stepSpillSuspension(s, s, 1 / fps);
      const f = fractions(s); results.push(f); expect(f.suspended).toBeGreaterThan(0); expect(f.settled).toBeGreaterThan(0);
      expect(f.suspended + f.settled).toBeCloseTo(0.01, 14); expect(s.contents).toBe(contents); expect(s.contents).toEqual(before);
    }
    for (const r of results) expect(r.suspended).toBeCloseTo(results[0].suspended, 12);
  });
  it('matches independent radial quadrature for curved drops across three volume scales', () => {
    for (const volume of [0.001, 1, 100]) {
      const drop = solveSessileDrop(volume)!;
      for (const fraction of [0.1, 0.5, 0.9]) {
        let total = 0, below = 0;
        for (let i = 0; i < 4000; i++) {
          const r = drop.radius_m * (i + 0.5) / 4000;
          let j = 1; while (j + 1 < drop.profile.length && drop.profile[j].radius_m < r) j++;
          const a = drop.profile[j - 1], b = drop.profile[j], t = (r - a.radius_m) / (b.radius_m - a.radius_m);
          const h = a.height_m + t * (b.height_m - a.height_m);
          total += r * h; below += r * Math.min(h, drop.height_m * fraction);
        }
        expect(spillVolumeBelow(drop, drop.height_m * fraction)).toBeCloseTo(below / total, 5);
      }
    }
  });
  it('does not age newborn chemical mass over time before its receipt', () => {
    const after = sample('BaSO4'), before = { ...after, contents: [row('H2O', 10, 'l')], mass_g: 10, substances: ['H2O'], suspension: undefined };
    const out = stepSpillSuspension(before, { ...after, suspension: undefined }, 1);
    expect(fractions(out)).toEqual({ suspended: 0.01, settled: 0 });
    const settled = stepSpillSuspension(out, out, 1);
    expect(fractions(settled)).toEqual({ suspended: 0, settled: 0.01 });
    expect(stepSpillSuspension(settled, settled, 1)).toBe(settled);
  });
  it('keeps the historical bed on legacy saves and resumes active cohorts after JSON restore', () => {
    const old = { ...sample(), suspension: undefined };
    expect(fractions(old)).toEqual({ suspended: 0, settled: 0.01 });
    const a = stepSpillSuspension(sample(), sample(), 0.2), saved = JSON.parse(JSON.stringify(a)) as SpillState;
    expect(stepSpillSuspension(a, a, 0.4).suspension).toEqual(stepSpillSuspension(saved, saved, 0.4).suspension);
    expect(stepSpillSuspension(a, a, 0)).toBe(a);
  });
  it('preserves a legacy solid-state precipitate without hiding it or changing its material row', () => {
    const original = sample('BaSO4'); const legacy = { ...original, suspension: undefined,
      contents: original.contents!.map(c => c.phase === 's' ? { ...c, phase: undefined, state: 'solid' } : c) };
    const before = structuredClone(legacy);
    expect(spillSuspensionAppearance(legacy).settled_g).toBeCloseTo(0.01, 14);
    expect(spillSuspensionAppearance(legacy).bedVolume_m3).toBeGreaterThan(0);
    expect(legacy).toEqual(before);
  });
  it('scales both reservoirs on dissolution without increasing any suspended fraction', () => {
    const s = sample('Ag2S'); s.suspension!.species[0].cohorts[0].mass_g = 0.006;
    const reduced = { ...s, contents: s.contents!.map(c => c.phase === 's' ? { ...c, mass_g: c.mass_g / 2, moles: c.moles / 2 } : c) };
    const out = { ...reduced, suspension: reconcileSpillSuspension(reduced) };
    expect(fractions(out)).toEqual({ suspended: 0.003, settled: 0.002 });
  });
  it('preserves an old bed on merging while only the incoming precipitate starts a new cloud', () => {
    const old = sample('Ag2S'); old.suspension!.species[0].cohorts = [];
    const incoming = [{ ...row('Ag2S', 0.002, 's'), solidOrigin: 'precipitate' as const }, row('H2O', 1, 'l')];
    const out = mergeWorkbenchSpill({ p: old }, [0, -1.175, 0], 1, ['H2O', 'Ag2S'], '#fff', undefined, 1.002, incoming).p;
    expect(fractions(out).suspended).toBeCloseTo(0.002, 14); expect(fractions(out).settled).toBeCloseTo(0.01, 14);
    expect(out.mass_g).toBeCloseTo(11.012, 12);
  });
  it('collects the same full-depth fraction of suspended and settled matter and preserves the remainder', () => {
    const s = sample(), first = s.suspension!.species[0]; first.cohorts[0].mass_g = 0.006;
    const out = collectSpillPatch(s, [0, -1.175, 0], 0.3)!;
    expect(out.fraction).toBeGreaterThan(0); expect(out.fraction).toBeLessThan(1);
    const a = fractions(out.collected), b = fractions(out.remaining!);
    expect(a.suspended + b.suspended).toBeCloseTo(0.006, 14); expect(a.settled + b.settled).toBeCloseTo(0.004, 14);
    expect(a.suspended / 0.006).toBeCloseTo(out.fraction, 12);
  });
  it('holds frozen cohorts and transfers an existing dry residue into its bed without consuming material', () => {
    const s = sample(), frozen = { ...s, volume_ml: 0, contents: s.contents!.map(c => c.formula === 'H2O' ? { ...c, phase: 's' } : c) };
    expect(stepSpillSuspension(frozen, frozen, 10).suspension).toEqual(frozen.suspension);
    const dry = { ...s, volume_ml: 0, contents: s.contents!.filter(c => c.formula !== 'H2O'), mass_g: 0.01 };
    expect(fractions(stepSpillSuspension(dry, dry, 1))).toEqual({ suspended: 0, settled: 0.01 });
  });
  it('bounds continuous production cohorts while conserving mass through hundreds of receipts', () => {
    let s = sample('Ag2S');
    for (let i = 0; i < 300; i++) {
      const c = s.contents![1], next = { ...s, mass_g: s.mass_g + 1e-5,
        contents: [s.contents![0], { ...c, mass_g: c.mass_g + 1e-5, moles: c.moles + 1e-5 / computeMolarMass(c.formula) }] };
      s = stepSpillSuspension(s, next, 0.01);
      expect(s.suspension!.species[0].cohorts.length).toBeLessThanOrEqual(24);
      expect(fractions(s).suspended + fractions(s).settled).toBeCloseTo(s.contents![1].mass_g, 13);
    }
  });
  it('uses the authoritative workbench tick for settling even after chemical sources stop', () => {
    const s = sample(), before = fractions(s);
    const out = stepWorkbenchSpills({ p: s }, 1).spills.p;
    expect(fractions(out).suspended).toBeLessThan(before.suspended); expect(out.contents).toBe(s.contents);
    expect(stepWorkbenchSpills({ p: out }, 0).spills.p).toBe(out);
  });
  it('represents bed and dry powder volumes without a grain-count scale factor', () => {
    const s = sample('BaSO4'); s.suspension!.species[0].cohorts = [];
    const appearance = spillSuspensionAppearance(s), drop = solveSessileDrop(10)!, geometry = createSpillGeometry(drop);
    expect(appearance.bedVolume_m3).toBeCloseTo(0.01 / 4.5 / 0.35 * 1e-6, 15);
    expect(geometryVolume(geometry) * U ** 3 * appearance.bedVolume_m3 / drop.volume_m3 / appearance.bedVolume_m3).toBeCloseTo(1, 2); geometry.dispose();
    const dimensions = powderPileDimensions(1e-6), cone = new ConeGeometry(dimensions.radius_m, dimensions.height_m, 48);
    expect(Math.abs(geometryVolume(cone) / 1e-6 - 1)).toBeLessThan(0.004); cone.dispose();
    expect(spillSuspensionAppearance(sample('Cu(OH)2', 10)).modelLimit).toBe('solid-displacement-unresolved');
  });
  it('preserves integrated optical strength when the same mass moves from cloud to a thin bed', () => {
    const s = sample('BaSO4'), cloud = spillSuspensionAppearance(s);
    s.suspension!.species[0].cohorts = [];
    const bed = spillSuspensionAppearance(s);
    expect(cloud.scattering_per_m * s.volume_ml * 1e-6).toBeCloseTo(bed.bedExtinction_per_m * bed.bedVolume_m3, 14);
    expect(bed.bedExtinction_per_m).toBeGreaterThan(0);
    const tiny = sample('BaSO4', 1e-10); tiny.suspension!.species[0].cohorts = [];
    expect(spillSuspensionAppearance(tiny).bedVolume_m3).toBeLessThan(bed.bedVolume_m3 * 1e-7);
  });
});
