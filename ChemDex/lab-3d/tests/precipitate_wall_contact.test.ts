import { describe, expect, it } from 'vitest';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { liquidParticlePlane, pointPlaneDepth } from '../src/simulation/effects/liquidParticleFrame';
import { metersPerModelUnit } from '../src/science/sceneUnits';
import { PRNG } from '../src/core/rng';
import type { VesselState } from '../src/types/chemistry';

describe('Gravity contact follows tilted glass', () => {
  it('deposits a grain at the lower side of a horizontal beaker without waiting for its local floor', () => {
    const profile = getVesselProfile('beaker', 100), system = new PrecipitationSystem(1, 'PbI2', new PRNG(17));
    const params = { temp_c: 25, ambientTemp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
      radius: profile.r(0), liquidBottomY: profile.baseY, surfaceY: 0.5, vesselProfile: profile,
      volume_ml: 70, precipitateAmount_g: 0.01, substance: 'PbI2', formation: 'CRYSTAL_PLATE',
      surfacePlane: liquidParticlePlane(profile, 70, [1, 0, 0]) };
    system.update(0.02, params);
    const p = system.particles[0]; expect(p).toBeDefined();
    const extent = p.physicalRadius_m! / metersPerModelUnit(profile);
    for (const grain of system.particles) { grain.x = -profile.r(0) + extent + 1e-5; grain.y = 0; grain.z = 0; }
    system.update(0.1, params);
    expect(system.particles).toHaveLength(0);
    expect(system.sedimentBed.amount_g).toBeCloseTo(0.01, 12);
    expect(system.representedMass_g).toBeCloseTo(0.01, 12);
  });

  it('slides a grain down the sloping wall of a horizontal flask instead of pinning it at one height', () => {
    const profile = getVesselProfile('flask', 100), system = new PrecipitationSystem(1, 'PbI2', new PRNG(17));
    const params = { temp_c: 25, ambientTemp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
      radius: profile.r(0), liquidBottomY: profile.baseY, surfaceY: 0.5, vesselProfile: profile,
      volume_ml: 70, precipitateAmount_g: 0.01, substance: 'PbI2', formation: 'CRYSTAL_PLATE',
      surfacePlane: liquidParticlePlane(profile, 70, [1, 0, 0]) };
    system.update(0.02, params);
    const p = system.particles[0]; expect(p).toBeDefined();
    const extent = p.physicalRadius_m! / metersPerModelUnit(profile);
    p.x = -profile.r(0) + extent * 2; p.y = 0; p.z = 0;
    system.update(0.5, params);
    expect(p.y).toBeLessThan(-0.01);
    for (let i = 0; i < 120; i++) system.update(0.5, params);
    expect(system.particles).toHaveLength(0);
    expect(system.sedimentBed.amount_g).toBeCloseTo(0.01, 12);
    expect(system.representedMass_g).toBeCloseTo(0.01, 12);
  });

  it('seeds a new sediment bed on the supporting wall in the vessel manager', () => {
    const vessel = { id: 'side-deposit', type: 'beaker', capacity_ml: 100, volume_ml: 70,
      mass_g: 70.01, temperature_c: 25, position: [0, 0, 0], rotationZ: Math.PI / 2,
      precipitateSubstance: 'PbI2', precipitateMorphology: 'CRYSTAL_PLATE',
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 70, moles: 70 / 18.015 },
        { formula: 'PbI2', phase: 's', mass_g: 0.01, moles: 0.01 / 461.01, solidOrigin: 'precipitate' }] } as VesselState;
    const manager = new VesselSimulationManager(vessel.id); manager.setPrecipitateBudget(1);
    manager.step(vessel, 0.02, { thermalStateAuthoritative: true });
    const system = manager.precipitationSystem, p = system.particles[0]; expect(p).toBeDefined();
    const profile = getVesselProfile('beaker', 100), extent = p.physicalRadius_m! / metersPerModelUnit(profile);
    for (const grain of system.particles) { grain.x = -profile.r(0) + extent + 1e-5; grain.y = 0; grain.z = 0; }
    manager.step(vessel, 0.1, { thermalStateAuthoritative: true });
    expect(manager.sedimentBed.amount_g).toBeCloseTo(0.01, 12);
    expect(manager.sedimentBed.surfacePlane!.normal[0]).toBeCloseTo(1, 12);
    expect(manager.sedimentBed.surfacePlane!.normal[1]).toBeCloseTo(0, 12);
    expect(manager.sedimentBed.surfacePlane!.offset).toBeLessThan(-0.9);
  });

  it('deposits a microscopic grain at the closed corner without relying on a large timestep to cross the wall gap', () => {
    const profile = getVesselProfile('flask', 100), system = new PrecipitationSystem(1, 'BaSO4', new PRNG(17));
    const params = { temp_c: 25, ambientTemp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
      radius: profile.r(0), liquidBottomY: profile.baseY, surfaceY: 0.5, vesselProfile: profile,
      volume_ml: 70, precipitateAmount_g: 0.01, substance: 'BaSO4',
      surfacePlane: liquidParticlePlane(profile, 70, [1, 0, 0]) };
    system.update(0.02, params);
    const p = system.particles[0]; expect(p).toBeDefined();
    const extent = p.physicalRadius_m! / metersPerModelUnit(profile);
    for (const grain of system.particles) {
      grain.y = profile.baseY + extent; grain.x = -profile.r(grain.y + extent) + extent + 1e-6; grain.z = 0;
    }
    system.update(0.1, params);
    expect(system.particles).toHaveLength(0);
    expect(system.representedMass_g).toBeCloseTo(0.01, 12);
  });

  it('keeps the stirring mixing layer when a shared bed plane is supplied', () => {
    const system = new PrecipitationSystem(20, 'BaSO4', new PRNG(17));
    const params = { temp_c: 25, ambientTemp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
      radius: 1, liquidBottomY: 0, surfaceY: 2, volume_ml: 100,
      precipitateAmount_g: 0.01, substance: 'BaSO4' };
    system.update(0.1, { ...params, volume_ml: 0 });
    const plane = { normal: [0, 1, 0] as [number, number, number], offset: system.sedimentBed.thickness };
    system.update(0.1, { ...params, agitation: 1, sharedSedimentPlane: plane });
    expect(system.particles.length).toBeGreaterThan(0);
    expect(system.particles.every(p => -pointPlaneDepth(p, params.surfaceY, plane) > 0.1)).toBe(true);
    expect(system.representedMass_g).toBeCloseTo(0.01, 12);
  });
});
