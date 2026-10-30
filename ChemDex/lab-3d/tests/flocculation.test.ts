import { describe, expect, it } from 'vitest';
import { FlocculationPopulation, brownianCollisionKernel, shearCollisionKernel, stirringShear,
  type FlocculationModel } from '../src/science/flocculation';
import { getFlocculationModel } from '../src/science/flocculationModels';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { PRNG } from '../src/core/rng';
import { vesselAgitation } from '../src/science/stirring';
import { VesselSimulationManager, SimulationEngine } from '../src/simulation/core/SimulationEngine';

const model: FlocculationModel = { basis: 'illustrative-mean-population', collisionEfficiency: 0.5,
  fractalDimension: 2.2, maxPrimaryCount: 32, criticalShear_s_1: 35, breakageRate_s_1: 0.25 };
const fresh = () => { const p = new FlocculationPopulation(3370); p.addPrimarySolid(0.1, 1e-7); return p; };

describe('Physical population moments, independent of display sampling', () => {
  it('recovers the analytic constant Brownian-kernel number balance', () => {
    const p = fresh(), initial = p.snapshot, seconds = 5;
    const kernel = 8 * 1.380649e-23 * 298.15 / (3 * 0.001);
    expect(brownianCollisionKernel(25, 0.001)).toBeCloseTo(kernel, 28);
    for (let i = 0; i < 600; i++) p.step(1 / 120, 100, 25, 0.001, 0, model);
    const expectedMean = 1 + model.collisionEfficiency * kernel * initial.primaryCount / 1e-4 * seconds / 2;
    expect(p.meanPrimaryCount).toBeCloseTo(expectedMean, 10);
    expect(p.snapshot.solidMass_g).toBe(0.1);
    expect(p.snapshot.primaryCount).toBe(initial.primaryCount);
    expect(p.snapshot.clusterCount).toBeCloseTo(initial.clusterCount / expectedMean, 2);
  });
  it('uses concentration and viscosity, never a renderer particle count', () => {
    const concentrated = fresh(), diluted = fresh(), viscous = fresh();
    for (let i = 0; i < 120; i++) {
      concentrated.step(1 / 120, 100, 25, 0.001, 0, model);
      diluted.step(1 / 120, 200, 25, 0.001, 0, model);
      viscous.step(1 / 120, 100, 25, 0.002, 0, model);
    }
    expect(concentrated.meanPrimaryCount - 1).toBeCloseTo(2 * (diluted.meanPrimaryCount - 1), 12);
    expect(viscous.meanPrimaryCount).toBeCloseTo(diluted.meanPrimaryCount, 12);
  });
  it('links porous radius and effective buoyancy without changing solid mass', () => {
    const p = fresh(); p.step(5, 100, 25, 0.001, 0, model);
    const a = p.properties(model, 1000), initialVolume = p.snapshot.solidMass_g * 1e-3 / 3370;
    expect(a.radius_m).toBeGreaterThan(p.primaryRadius_m);
    expect(a.effectiveDensity_kg_m3).toBeGreaterThan(1000);
    expect(a.effectiveDensity_kg_m3).toBeLessThan(3370);
    const clusterVolume = 4 * Math.PI / 3 * a.radius_m ** 3 * p.snapshot.clusterCount;
    expect(clusterVolume * a.solidFraction).toBeCloseTo(initialVolume, 16);
  });
  it('strong shear breaks an existing floc population and conserves mass/count of constituents', () => {
    const p = fresh(); p.step(30, 10, 25, 0.001, 0, model);
    const before = p.meanPrimaryCount, moments = p.snapshot;
    const noCapture = { ...model, collisionEfficiency: 0 };
    for (let i = 0; i < 1200; i++) p.step(1 / 120, 100, 25, 0.001, 100, noCapture);
    expect(p.meanPrimaryCount).toBeLessThan(before);
    expect(p.meanPrimaryCount).toBeGreaterThanOrEqual(1);
    expect(p.snapshot.primaryCount).toBe(moments.primaryCount);
    expect(p.snapshot.solidMass_g).toBe(moments.solidMass_g);
    expect(shearCollisionKernel(2e-6, 10)).toBeCloseTo(32 / 3 * 10 * (2e-6) ** 3, 27);
  });
  it('moves aggregate history through settling and resuspension, rather than creating fresh nuclei', () => {
    const suspended = fresh(), bed = new FlocculationPopulation(3370);
    suspended.step(20, 100, 25, 0.001, 0, model);
    const original = suspended.snapshot, mean = suspended.meanPrimaryCount;
    bed.receive(suspended.withdraw(0.04));
    expect(suspended.snapshot.solidMass_g).toBeCloseTo(0.06, 12);
    expect(bed.meanPrimaryCount).toBeCloseTo(mean, 12);
    suspended.receive(bed.withdraw(0.04));
    expect(suspended.snapshot.solidMass_g).toBeCloseTo(original.solidMass_g, 12);
    expect(suspended.snapshot.primaryCount / original.primaryCount).toBeCloseTo(1, 12);
    expect(suspended.meanPrimaryCount).toBeCloseTo(mean, 12);
    expect(bed.snapshot.solidMass_g).toBe(0);
  });
  it('dissolution shrinks constituents; fresh precipitation increases their number and dilutes old floc history', () => {
    const p = fresh(); p.step(5, 100, 25, 0.001, 0, model);
    const count = p.snapshot.primaryCount, radius = p.primaryRadius_m, mean = p.meanPrimaryCount;
    p.dissolve(0.125);
    expect(p.primaryRadius_m).toBeCloseTo(radius / 2, 16);
    expect(p.snapshot.primaryCount).toBe(count);
    expect(p.meanPrimaryCount).toBe(mean);
    p.addPrimarySolid(0.1, 1e-7);
    expect(p.meanPrimaryCount).toBeLessThan(mean);
    expect(p.snapshot.primaryCount).toBeCloseTo(2 * count, 2);
    p.dissolve(0); expect(p.snapshot).toEqual({ solidMass_g: 0, primaryCount: 0, clusterCount: 0 });
  });
});

describe('Flocculation participates in the live finite-mass simulation', () => {
  const params = { temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1, volume_ml: 100,
    radius: 10, liquidBottomY: 0, surfaceY: 100, substance: 'Cu(OH)2', precipitateAmount_g: 0.1,
    velocityGradient_s_1: 20 };
  it('allocates a distinct model only to supported floc/gel species', () => {
    expect(getFlocculationModel(getPrecipitateProfile('AgCl'))).not.toBeNull();
    expect(getFlocculationModel(getPrecipitateProfile('Cu(OH)2'))).not.toBeNull();
    for (const formula of ['BaSO4', 'PbI2', 'Cu', 'UnknownX']) expect(getFlocculationModel(getPrecipitateProfile(formula))).toBeNull();
    const colorAlias = new PrecipitationSystem(20, 'BLUE');
    colorAlias.update(0.1, { ...params, substance: 'BLUE' });
    expect(colorAlias.flocculation.enabled).toBe(false);
  });
  it('evolves the same population under 20 or 200 glyphs and conserves all three mass compartments', () => {
    const low = new PrecipitationSystem(20, 'Cu(OH)2', new PRNG(4));
    const high = new PrecipitationSystem(200, 'Cu(OH)2', new PRNG(4));
    for (let i = 0; i < 240; i++) { low.update(1 / 120, params); high.update(1 / 120, params); }
    expect(low.flocculation.properties!.meanPrimaryCount).toBeGreaterThan(1);
    expect(low.flocculation).toEqual(high.flocculation);
    expect(low.particles[0].aggregationLevel).toBeGreaterThan(1);
    expect(low.particles[0].physicalRadius_m).toBeCloseTo(high.particles[0].physicalRadius_m!, 15);
    expect(low.representedMass_g).toBeCloseTo(0.1, 12);
    expect(low.flocculation.suspended.solidMass_g + low.flocculation.settled.solidMass_g).toBeCloseTo(0.1, 12);
    low.update(0.1, { ...params, precipitateAmount_g: 0 });
    expect(low.flocculation.suspended.solidMass_g).toBe(0);
    expect(low.flocculation.settled.solidMass_g).toBe(0);
  });
  it('settles, entrains and withdraws existing populations without resampling their history', () => {
    const system = new PrecipitationSystem(20, 'AgCl', new PRNG(5));
    for (let i = 0; i < 120; i++) system.update(1 / 120, { ...params, substance: 'AgCl', surfaceY: 0 });
    expect(system.flocculation.settled.solidMass_g).toBeCloseTo(0.1, 12);
    system.update(0.2, { ...params, substance: 'AgCl', agitation: 0.8 });
    expect(system.flocculation.suspended.solidMass_g).toBeGreaterThan(0);
    expect(system.flocculation.suspended.solidMass_g + system.flocculation.settled.solidMass_g).toBeCloseTo(0.1, 12);
    system.update(0.1, { ...params, substance: 'AgCl', precipitateAmount_g: 0.099, withdrawnSuspension_g: 0.001 });
    expect(system.representedMass_g).toBeCloseTo(0.099, 12);
    expect(system.flocculation.suspended.solidMass_g + system.flocculation.settled.solidMass_g).toBeCloseTo(0.099, 12);
  });
  it('freezes aggregation in an ice matrix and restores the liquid history on thaw', () => {
    const system = new PrecipitationSystem(20, 'Cu(OH)2', new PRNG(7));
    system.update(0.2, params); const before = system.flocculation;
    system.update(0.5, { ...params, carrierMode: 'frozen-matrix' });
    expect(system.flocculation).toEqual(before);
    system.update(0.2, { ...params, carrierMode: 'liquid' });
    expect(system.flocculation.properties!.meanPrimaryCount).toBeGreaterThan(before.properties!.meanPrimaryCount);
  });
  it('preserves active floc growth and seeded trajectories across frame rates', () => {
    const reference = new PrecipitationSystem(20, 'Cu(OH)2', new PRNG(73));
    for (let i = 0; i < 120; i++) reference.update(1 / 120, params);
    for (const hz of [10, 30, 60]) {
      const s = new PrecipitationSystem(20, 'Cu(OH)2', new PRNG(73));
      for (let i = 0; i < hz; i++) s.update(1 / hz, params);
      expect(s.flocculation.properties!.meanPrimaryCount).toBeCloseTo(reference.flocculation.properties!.meanPrimaryCount, 12);
      expect(s.particles.length).toBe(reference.particles.length);
      for (let i = 0; i < s.particles.length; i++) {
        for (const key of ['x', 'y', 'z', 'physicalRadius_m', 'density', 'mass_ug'] as const)
          expect(s.particles[i][key]).toBeCloseTo(reference.particles[i][key]!, 9);
      }
    }
  });
  it('reduces the renderer budget without resetting either population or represented mass', () => {
    const manager = new VesselSimulationManager('quality-history');
    const system = manager.getPrecipitationSystem('Cu(OH)2');
    system.update(0.5, params);
    const before = system.flocculation, clock = system.clock;
    manager.setPrecipitateBudget(3);
    expect(system.particles.length).toBeLessThanOrEqual(3);
    expect(system.representedMass_g).toBeCloseTo(0.1, 12);
    expect(system.flocculation).toEqual(before);
    expect(system.clock).toEqual(clock);
    manager.setPrecipitateBudget(0);
    expect(system.representedMass_g).toBeCloseTo(0.1, 12);
    expect(system.flocculation).toEqual(before);
  });
  it('retires a deleted vessel while retaining a surviving sample manager', () => {
    const keep = SimulationEngine.getManager('floc-keep'), removed = SimulationEngine.getManager('floc-remove');
    removed.getPrecipitationSystem('Cu(OH)2').update(0.2, params);
    SimulationEngine.pruneManagers(new Set(['floc-keep']));
    expect(SimulationEngine.findManager('floc-keep')).toBe(keep);
    expect(SimulationEngine.findManager('floc-remove')).toBeUndefined();
    expect(removed.precipitationSystem.representedMass_g).toBe(0);
    SimulationEngine.removeManager('floc-keep');
  });
});

describe('Stirring actions drive the fluid in the intended vessel', () => {
  const vessel = { id: 'a', stirringIntensity: 0.3 };
  const idle = { stirringVesselId: null, activeTool: null, selectedVesselId: 'a' };
  it('supports the inspector pulse as well as the held rod, with three ordered strengths', () => {
    expect(vesselAgitation(vessel, idle)).toBe(0);
    expect(vesselAgitation(vessel, { ...idle, stirringVesselId: 'a' })).toBe(0.3);
    expect(vesselAgitation(vessel, { ...idle, activeTool: 'stirring_rod' })).toBe(0.3);
    expect(vesselAgitation(vessel, { ...idle, activeTool: 'stirring_rod', selectedVesselId: 'b' })).toBe(0);
    expect(stirringShear(0.3)).toBeLessThan(stirringShear(0.65));
    expect(stirringShear(0.65)).toBeLessThan(stirringShear(0.95));
  });
});
