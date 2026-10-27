import { describe, it, expect } from 'vitest';
import { createGelGeometry } from '../src/simulation/render/gelGeometry';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { resolveMorphology } from '../src/vfx/particles/Precipitate';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import type { VesselState } from '../src/types/chemistry';

describe('Hydroxide gel appearance', () => {
  it.each(['Al(OH)3', 'Zn(OH)2', 'Cu(OH)2'])('%s has its own gel profile and clears when the solid inventory dissolves', formula => {
    const profile = getPrecipitateProfile(formula);
    expect(profile.id).toBe(formula);
    expect(profile.morphology).toBe('gel_like');
    expect(resolveMorphology(formula + '(s)')).toBe('GEL');
    const manager = new VesselSimulationManager(formula);
    const vessel = { type: 'beaker', capacity_ml: 250, volume_ml: 100,
      temperature_c: 25, mass_g: 100.1, precipitateSubstance: formula,
      contents: [{ formula, phase: 's', mass_g: 0.1, moles: 0.001 }] } as VesselState;
    manager.step(vessel, 0.1, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystem.profile.morphology).toBe('gel_like');
    expect(manager.precipitationSystem.representedMass_g).toBeCloseTo(0.1, 12);
    vessel.contents = [];
    manager.step(vessel, 0.1, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystem.particles).toHaveLength(0);
    expect(manager.precipitationSystem.cloudiness).toBe(0);
  });
  it('uses a finite irregular 3D mesh within the particle collision envelope', () => {
    const geometry = createGelGeometry();
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    let min = Infinity, max = 0;
    for (let i = 0; i < positions.count; i++) {
      const r = Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i));
      min = Math.min(min, r); max = Math.max(max, r);
      expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 5);
    }
    expect(max).toBeLessThan(0.9);
    expect(max - min).toBeGreaterThan(0.1);
    geometry.dispose();
  });
});
