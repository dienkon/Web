import { describe, expect, it } from 'vitest';
import { AutoExperiment, AUTO_TIMING } from '../src/vfx/autoplay/AutoExperiment';
import { autoSolid, autoSolidGravity, AUTO_DONOR_SCALE, createAutoSolidDose, solidFlightPosition } from '../src/vfx/autoplay/autoSolid';
import { AutoStockDynamics } from '../src/vfx/autoplay/AutoStockDynamics';
import { StockWorld } from '../src/physical/StockWorld';
import { stockContainer } from '../src/physical/stockAdapter';
import { getSolidMorphology, findChemical } from '../src/data/chemicals';
import { stockSolidMaterial } from '../src/science/stockAppearance';
import { solidSceneVolume } from '../src/science/vesselDimensions';
import { vesselWorldToLocal } from '../src/science/vesselScale';
import { siPointToScene } from '../src/science/sceneUnits';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';
import type { VesselState } from '../src/types/chemistry';

const vessel = (formula: string, wet = false): VesselState => ({ id: 'parity', type: 'beaker', capacity_ml: 100,
  name: 'test', position: [0, 1.04, 0], rotationY: 0, isLocked: false, temperature_c: 25, ph: 7,
  contents: [{ formula, phase: 's', mass_g: 0.1, moles: 0.1 / findChemical(formula).molarMass },
    ...(wet ? [{ formula: 'H2O', phase: 'l' as const, mass_g: 50, moles: 50 / 18.015 }] : [])],
  substances: [formula], mass_g: wet ? 50.1 : 0.1, volume_ml: wet ? 50 : 0, volume: wet ? 0.5 : 0,
  hasGas: false, hasPrecipitate: false, isBoiling: false });

describe('automatic and manual solid parity', () => {
  it.each(['Fe', 'Cu', 'Mg', 'Al', 'Zn', 'NaCl', 'CuSO4·5H2O'])('preserves %s form, finish and material volume in the donor', formula => {
    const solid = autoSolid(formula), dose = createAutoSolidDose(formula, 0.5);
    expect(solid.morphology).toBe(getSolidMorphology(formula));
    expect(solid.material).toEqual(stockSolidMaterial(findChemical(formula), getSolidMorphology(formula)));
    const volume = dose.pieces.reduce((sum, matrix) => sum + matrix.determinant() * AUTO_DONOR_SCALE ** 3, 0);
    expect(volume).toBeCloseTo(solidSceneVolume(vessel(formula), 0.5 / solid.density), 8);
  });
  it('uses the solid phase density even when the default stock is a solution', () => {
    expect(findChemical('NaOH').type).toBe('liquid');
    expect(autoSolid('NaOH').density).toBe(findChemical('NaOH (s)').density);
    expect(autoSolid('NaOH').material.metalness).toBe(0);
  });
  it.each(['Na', 'K'])('keeps %s as one finite pellet like the manual bench', formula => {
    expect(createAutoSolidDose(formula, 0.1).pieces.length).toBe(1);
  });
  it('rights the donor continuously after a single pellet arrives early', () => {
    const e = new AutoExperiment('na_h2o', false);
    let lastTilt = 0, sawReturn = false;
    for (let i = 0; i < 3600 && !sawReturn; i++) {
      const dosingSolid = e.phase === 'dose' && e.donors[e.donorIndex]?.solid;
      if (dosingSolid) lastTilt = e.donorPose.tilt;
      e.tick(1 / 60);
      if (dosingSolid && e.phase === 'return') {
        expect(Math.abs(e.donorPose.tilt - lastTilt)).toBeLessThan(0.1);
        sawReturn = true;
      }
    }
    expect(sawReturn).toBe(true);
  });
  it('delivers whole finite pieces only after physical flight and freezes in flight when paused', () => {
    const e = new AutoExperiment('mg_o2_burn', false), donor = e.donors.find(d => d.row.formula === 'Mg')!;
    const total = e.donors.reduce((sum, d) => sum + d.remaining, 0);
    let sawFlight = false;
    for (let i = 0; i < 3600 && !sawFlight; i++) {
      e.tick(1 / 60);
      if (e.inFlightMass_g <= 0) continue;
      sawFlight = true;
      expect(e.sample.contents.find(c => c.formula === 'Mg')?.mass_g ?? 0).toBe(0);
      expect(e.sample.mass_g + e.inFlightMass_g + e.donors.reduce((sum, d) => sum + d.remaining, 0)).toBeCloseTo(total, 10);
      const f = donor.solid!.flights[0], dt = 0.01;
      const a = solidFlightPosition(f, f.releaseAt), b = solidFlightPosition(f, f.releaseAt + dt), c = solidFlightPosition(f, f.releaseAt + 2 * dt);
      expect((c.y - 2 * b.y + a.y) / dt ** 2).toBeCloseTo(-autoSolidGravity, 7);
      expect(f.arrivalAt - f.releaseAt).toBeLessThan(AUTO_TIMING.flight);
      const before = JSON.stringify(donor.solid);
      e.paused = true; e.tick(0.1);
      expect(JSON.stringify(donor.solid)).toBe(before);
    }
    expect(sawFlight).toBe(true);
    e.paused = false;
    for (let i = 0; i < 600 && e.donors[e.donorIndex] === donor; i++) e.tick(0.1);
    expect(donor.solid!.released).toBe(donor.solid!.pieces.length);
    expect(donor.solid!.arrived).toBe(donor.solid!.pieces.length);
    expect(donor.remaining).toBe(0); expect(e.inFlightMass_g).toBe(0);
  });
  it.each(['Cu', 'Mg', 'Fe'])('uses the manual contact solver for %s without a second physics approximation', async formula => {
    const motion = new AutoStockDynamics(), manual = await StockWorld.create(), v = vessel(formula);
    await motion.initialize();
    try {
      manual.sync({ containers: [stockContainer(v, false)!], contacts: [], spills: [] });
      for (let i = 0; i < 60; i++) { motion.advance(v, 1 / 60); manual.advance(1 / 60, false); }
      const expected = manual.snapshot().grains.map(g => g.pose);
      expect(motion.grains.length).toBe(expected.length);
      motion.grains.forEach((p, i) => {
        expect(p.mass_g).toBeCloseTo(expected[i].mass_g, 10);
        p.position_m.forEach((x, j) => expect(x).toBeCloseTo(expected[i].position_m[j], 7));
      });
      const ids = motion.grains.map(p => p.id);
      v.contents[0].mass_g /= 2; v.contents[0].moles /= 2; motion.advance(v, 1 / 60);
      expect(motion.grains.map(p => p.id)).toEqual(ids);
      expect(motion.grains.reduce((sum, p) => sum + p.mass_g, 0)).toBeCloseTo(0.05, 9);
      v.contents = []; motion.advance(v, 1 / 60); expect(motion.grains).toEqual([]);
    } finally { manual.free(); motion.dispose(); }
  });
  it('floats low-density sodium and sinks zinc in the same water', async () => {
    const motion = new AutoStockDynamics(); await motion.initialize();
    try {
      const v = vessel('Na', true);
      v.contents.push({ formula: 'Zn', phase: 's', mass_g: 0.1, moles: 0.1 / 65.38 });
      for (let i = 0; i < 240; i++) motion.advance(v, 1 / 60);
      const height = (formula: string) => {
        const poses = motion.grains.filter(p => p.formula === formula);
        return poses.reduce((sum, p) => sum + vesselWorldToLocal(v, siPointToScene(p.position_m))[1], 0) / poses.length;
      };
      expect(height('Na')).toBeGreaterThan(vesselLiquidSurfaceY(v) - 0.1);
      expect(height('Zn')).toBeLessThan(vesselLiquidSurfaceY(v) - 0.5);
    } finally { motion.dispose(); }
  });
});
