import { describe, expect, it } from 'vitest';
import { partitionSodiumChloride } from '../src/engine/sodiumChloridePhase';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { readablePrecipitateRadius } from '../src/simulation/render/precipitateReadability';
import { createPrecipitateGeometry } from '../src/simulation/render/precipitateGeometry';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { precipitateCohorts } from '../src/science/precipitateInventory';
import { sodiumChlorideSolubilityRatio } from '../src/science/sodiumChlorideSolubility';
import type { VesselState } from '../src/types/chemistry';

const sample = (water_g: number, salt_g: number): VesselState => ({ id: 'salt-crystals', name: 'Salt', type: 'beaker',
  position: [0, 0, 0], rotationY: 0, isLocked: true, capacity_ml: 100, volume_ml: water_g, volume: water_g / 100,
  temperature_c: 25, ph: 7, hasPrecipitate: false, hasGas: false, isBoiling: false, mass_g: water_g + salt_g, substances: ['H2O', 'NaCl'],
  contents: [{ formula: 'H2O', phase: 'l', mass_g: water_g, moles: water_g / 18.015 },
    { formula: 'NaCl', phase: 'aq', mass_g: salt_g, moles: salt_g / 58.44 }] });
const mass = (v: VesselState, phase: string) => v.contents.filter(row => row.formula === 'NaCl' && row.phase === phase)
  .reduce((sum, row) => sum + row.mass_g, 0);
const phaseStep = (v: VesselState, dt: number) => ({ ...v, ...partitionSodiumChloride(v, dt) });

describe('halite crystals from the finite salt inventory', () => {
  it('stays clear below saturation; solvent removal creates a distinct solid population', () => {
    const dissolved = sample(20, 4);
    expect(partitionSodiumChloride(dissolved, 1)).toBeNull();
    const concentrated = phaseStep(sample(10, 4), 1);
    expect(mass(concentrated, 's')).toBeGreaterThan(0);
    expect(mass(concentrated, 's')).toBeLessThan(4 - 10 * sodiumChlorideSolubilityRatio(25)!);
    expect(precipitateCohorts(concentrated.contents).map(cohort => cohort.formula)).toEqual(['NaCl']);
    expect(concentrated.contents.reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(14, 12);
  });

  it('grows and redissolves continuously from the same mass budget when water is restored', () => {
    let v = sample(10, 4), last = 0;
    for (let i = 0; i < 40; i++) {
      v = phaseStep(v, 0.1);
      expect(mass(v, 's')).toBeGreaterThan(last);
      expect(mass(v, 's') + mass(v, 'aq')).toBeCloseTo(4, 12);
      last = mass(v, 's');
    }
    v = { ...v, volume_ml: 20, volume: 0.2, mass_g: 24, contents: v.contents.map(row => row.formula === 'H2O'
      ? { ...row, mass_g: 20, moles: 20 / 18.015 } : row) };
    for (let i = 0; i < 40; i++) {
      v = phaseStep(v, 0.1);
      expect(mass(v, 's')).toBeLessThan(last);
      expect(v.contents.reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(24, 12);
      last = mass(v, 's');
    }
  });

  it('uses cubic dielectric geometry and the salt density, without the unknown-material fallback', () => {
    const profile = getPrecipitateProfile('NaCl(s)');
    expect(profile.modelBasis).toBe('uncalibrated_transport');
    expect(profile.particleDensity_g_cm3).toBe(2.16);
    expect(profile.metalness ?? 0).toBe(0);
    const geometry = createPrecipitateGeometry(profile), p = geometry.getAttribute('position');
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.max.x - box.min.x).toBe(box.max.y - box.min.y);
    expect(box.max.y - box.min.y).toBe(box.max.z - box.min.z);
    for (let i = 0; i < p.count; i++) {
      expect(Math.abs(p.getX(i))).toBe(0.5);
      expect(Math.abs(p.getY(i))).toBe(0.5);
      expect(Math.abs(p.getZ(i))).toBe(0.5);
      expect(Math.hypot(p.getX(i), p.getY(i), p.getZ(i))).toBeLessThan(1);
    }
    geometry.dispose();
  });

  it('makes crystal facets readable without changing particle mass, physical motion or wall clearance', () => {
    const particle = { x: 0, y: 0.5, z: 0, radius: 0.001 }, snapshot = { ...particle };
    const bounds = { radius: 1, liquidBottomY: 0, surfaceY: 1 };
    const profile = getPrecipitateProfile('NaCl');
    expect(readablePrecipitateRadius(particle, profile, bounds)).toBeGreaterThan(particle.radius);
    expect(readablePrecipitateRadius(particle, profile, bounds, false)).toBe(particle.radius);
    for (const nearBoundary of [{ ...particle, y: 0.999 }, { ...particle, x: 0.999 }]) {
      const radius = readablePrecipitateRadius(nearBoundary, profile, bounds);
      expect(radius + Math.hypot(nearBoundary.x, nearBoundary.z)).toBeLessThanOrEqual(1);
      expect(radius + nearBoundary.y).toBeLessThanOrEqual(1);
    }
    expect(particle).toEqual(snapshot);
    expect(readablePrecipitateRadius(particle, getPrecipitateProfile('PbI2'), bounds)).toBe(particle.radius);
  });

  it('hands phase growth and dissolution to transport without creating or losing visible solid mass', () => {
    let v = phaseStep(sample(10, 4), 1);
    const manager = new VesselSimulationManager(v.id, 'low');
    for (let i = 0; i < 12; i++) {
      if (i === 6) v = { ...v, volume_ml: 20, volume: 0.2, mass_g: 24, contents: v.contents.map(row => row.formula === 'H2O'
        ? { ...row, mass_g: 20, moles: 20 / 18.015 } : row) };
      v = phaseStep(v, 0.1);
      manager.step(v, 0.1, { thermalStateAuthoritative: true });
      const system = manager.precipitationSystems.get('NaCl')!;
      expect(system.profile.id).toBe('NaCl');
      expect(system.profile.morphology).toBe('crystalline');
      expect(system.representedMass_g).toBeCloseTo(mass(v, 's'), 11);
    }
    manager.reset();
  });
});
