import { describe, it, expect } from 'vitest';
import { coverageInventory, vesselDefinition, VESSEL_IDS, sampleDefinition } from '../src/physical/catalog';
import { MATERIALS } from '../src/physical/materials';
import { HeldObjectController } from '../src/handling/HeldObjectController';
import { sceneToMeters, scenePointToSI, siPointToScene } from '../src/science/sceneUnits';
import { CONSTANTS } from '../src/core/units';
import { vesselTareG } from '../src/core/labGeometry';

describe('Physical foundation with explicit units and provenance', () => {
  it('matches SI free fall before contact and preserves release momentum', () => {
    const c = new HeldObjectController('body', 'beaker', [0, 10, 0]);
    c.state.velocity = [2, 0, -1]; c.release();
    for (let i = 0; i < 12; i++) c.update(1 / 120);
    expect(sceneToMeters(10 - c.state.position[1])).toBeCloseTo(0.5 * CONSTANTS.g * 0.1 ** 2, 10);
    expect(c.state.position[0]).toBeCloseTo(0.2, 10);
    expect(c.state.position[2]).toBeCloseTo(-0.1, 10);
    expect(siPointToScene(scenePointToSI([2, -3, 7]))).toEqual([2, -3, 7]);
  });
  it('covers stock chemicals, products, apparatus, scene and both expansion packages without false certification', () => {
    const entries = coverageInventory();
    expect(new Set(entries.map(e => e.id)).size).toBe(entries.length);
    for (const kind of ['chemical', 'product', 'vessel', 'tool', 'sample', 'environment']) expect(entries.some(e => e.kind === kind)).toBe(true);
    for (const e of entries) {
      expect(e.validation.scenarios.length).toBeGreaterThan(0);
      expect(e.validation.limitations.length).toBeGreaterThan(0);
      expect(e.validation.status).toBe('estimated');
    }
  });
  it.each(VESSEL_IDS)('%s has a finite hollow shell and consistent tare/positive inertia', type => {
    const d = vesselDefinition(type);
    expect(d.mass_kg).toBe(vesselTareG(type) / 1000);
    expect(d.colliders.length).toBeGreaterThan(24);
    expect(d.dimensions_m.every(v => v > 0 && Number.isFinite(v))).toBe(true);
    expect(d.inertia_kg_m2.every(v => v > 0 && Number.isFinite(v))).toBe(true);
    expect(d.colliders.every(c => c.kind === 'hull' ? c.vertices_m.every(Number.isFinite)
      : c.kind === 'cylinder' && c.radius_m > 0 && c.halfHeight_m > 0 && c.center_m.every(Number.isFinite))).toBe(true);
  });
  it('samples derive mass and inertia from their real volume, not display particle count', () => {
    const d = sampleDefinition('aluminum', 8e-6);
    expect(d.mass_kg).toBeCloseTo(0.0216, 12);
    expect(d.dimensions_m).toEqual([0.02, 0.02, 0.02]);
    expect(d.inertia_kg_m2[0]).toBeCloseTo(d.mass_kg * 0.02 ** 2 / 6, 12);
    expect(MATERIALS.silicone_oil.viscosity_Pas).toBeCloseTo(100e-6 * 965, 12);
  });
});
