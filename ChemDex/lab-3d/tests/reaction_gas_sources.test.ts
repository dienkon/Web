import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import { reactionGasSources } from '../src/science/reactionGasSources';
import { getProgramById } from '../src/vfx/programs/library';
import type { VesselState } from '../src/types/chemistry';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';
import { vesselBodyTransform, vesselLocalToWorld } from '../src/science/vesselScale';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import { pointPlaneDepth } from '../src/simulation/effects/liquidParticleFrame';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { vesselInterior } from '../src/science/vesselDimensions';
import { measureGasFlux } from '../src/engine/gasFlux';

const vessel = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'gas-source', name: 'gas source', type: 'beaker', capacity_ml: 100, position: [0, 0, 0], rotationY: 0,
  volume_ml: 30, volume: 0.3, contents: [{ formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 }],
  substances: ['H2O'], mass_g: 30, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false,
  isBoiling: false, isShattered: false, isSealed: false, isLocked: false, ...patch,
});
const zinc = () => vessel({ contents: [...vessel().contents, { formula: 'Zn', phase: 's', mass_g: 0.5, moles: 0.5 / 65.38 }] });

describe('reaction gas nucleation source placement', () => {
  it('uses only live aqueous contact plumes, then distributes generation in the liquid volume', () => {
    const program = getProgramById('na2co3_hcl')!;
    const sample = vessel({ recentPourContact: { point: [0.3, -0.2, -0.1], remaining_s: 0.5, expiresAt_ms: 0 } });
    const sources = reactionGasSources(sample, program)!;
    expect(sources).toHaveLength(1);
    expect(sources[0].point[0]).toBeCloseTo(0.3);
    expect(sources[0].point[1]).toBeLessThan(vesselLiquidSurfaceY(sample));
    sample.recentPourContact!.remaining_s = 0;
    expect(reactionGasSources(sample, program)).toBeUndefined();
    expect(reactionGasSources(sample)).toBeUndefined();
  });

  it('starts Zn/HCl bubbles on wetted stock surfaces, without requiring dynamic grain poses', () => {
    const sample = zinc(), sources = reactionGasSources(sample, getProgramById('zn_hcl'))!;
    expect(sources.length).toBeGreaterThan(20);
    expect(sources.length).toBeLessThanOrEqual(128);
    for (const source of sources) {
      expect(source.point[1]).toBeLessThan(vesselLiquidSurfaceY(sample));
      expect(source.point[1]).toBeGreaterThan(vesselInterior(sample.type).floorY);
      expect(source.weight).toBeGreaterThan(0);
      expect(Math.hypot(...source.normal!)).toBeCloseTo(1);
    }
    const unrelated = vessel({ contents: [...vessel().contents, { formula: 'Cu', phase: 's', mass_g: 0.5, moles: 0.5 / 63.546 }] });
    expect(reactionGasSources(unrelated, getProgramById('zn_hcl'))).toEqual([]);
    expect(reactionGasSources(vessel(), getProgramById('zn_hcl'))).toEqual([]);
  });

  it('follows moving grains through the rendered vessel transform and excludes dry faces', () => {
    const sample = zinc(), body = vesselBodyTransform(sample);
    const local = new Vector3(0.3, -0.55, 0.1), world = vesselLocalToWorld(sample, local.toArray() as [number, number, number]);
    const pose = { id: 'zn-1', formula: 'Zn', mass_g: 0.5, scale_m: 0.08 * METERS_PER_SCENE_UNIT * body.scale,
      position_m: world.map(x => x * METERS_PER_SCENE_UNIT) as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number],
      velocity_m_s: [0, 0, 0] as [number, number, number], angularVelocity_rad_s: [0, 0, 0] as [number, number, number], sleeping: false, powder: false };
    sample.stockMotion = { grains: [pose], tick: 1 } as VesselState['stockMotion'];
    const sources = reactionGasSources(sample, getProgramById('zn_hcl'))!;
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every(source => Math.abs(source.point[0] - local.x) < 0.15)).toBe(true);
    const matrix = new Matrix4().makeTranslation(0.2, body.offsetY, 0).scale(new Vector3(body.scale, body.scale, body.scale));
    const shifted = reactionGasSources(sample, getProgramById('zn_hcl'), { bodyMatrixWorld: matrix })!;
    expect(shifted[0].point[0] - sources[0].point[0]).toBeCloseTo(-0.2 / body.scale);
    const plane = { normal: [0.6, 0.8, 0] as const, offset: -0.2 };
    const tilted = reactionGasSources(sample, getProgramById('zn_hcl'), { surfacePlane: plane })!;
    expect(tilted.length).toBeGreaterThan(0);
    expect(tilted.every(source => pointPlaneDepth(new Vector3(...source.point), 0, plane) > 0.002)).toBe(true);
    pose.position_m[1] += 0.1;
    expect(reactionGasSources(sample, getProgramById('zn_hcl'))).toEqual([]);
  });

  it('uses wetted catalyst powder for peroxide, without emitting from unrelated solid inventory', () => {
    const sample = vessel({ contents: [...vessel().contents, { formula: 'MnO2', phase: 's', mass_g: 0.2, moles: 0.2 / 86.94 }] });
    const sources = reactionGasSources(sample, getProgramById('h2o2_mno2'))!;
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every(source => source.point[1] > vesselInterior(sample.type).floorY && source.point[1] < vesselLiquidSurfaceY(sample))).toBe(true);
  });

  it('the shared physical manager does not invent floor emission when the required solid is absent', () => {
    const manager = new VesselSimulationManager('gas-source');
    for (let i = 0; i < 12; i++) manager.step(vessel(), 1 / 60,
      { thermalStateAuthoritative: true, reactionGasRate: 30, reactionProgram: getProgramById('zn_hcl') });
    expect(manager.boilingSystem.sourceSampling.reactionGlyphsBorn).toBe(0);
    for (let i = 0; i < 12; i++) manager.step(zinc(), 1 / 60,
      { thermalStateAuthoritative: true, reactionGasRate: 30, reactionProgram: getProgramById('zn_hcl') });
    const beforeFinalPulse = manager.boilingSystem.sourceSampling.reactionGlyphsBorn;
    expect(beforeFinalPulse).toBeGreaterThan(0);
    // The final receipt can outlive its now exhausted zinc; copper residue
    // must not take over as a fictitious H2-generating surface.
    const residue = vessel({ contents: [...vessel().contents, { formula: 'Cu', phase: 's', mass_g: 0.1, moles: 0.1 / 63.546 }], escapedGas_g: { H2: 0.001 } });
    residue.gasFlux = measureGasFlux(residue, zinc(), 1 / 30);
    manager.step(residue, 1 / 30, { thermalStateAuthoritative: true, reactionGasRate: 30, reactionProgram: getProgramById('zn_hcl') });
    expect(manager.boilingSystem.sourceSampling.reactionGlyphsBorn).toBeGreaterThan(beforeFinalPulse);
    residue.gasFlux = measureGasFlux(residue, residue, 1 / 60);
    manager.step(residue, 1 / 60, { thermalStateAuthoritative: true, reactionGasRate: 0, reactionProgram: getProgramById('zn_hcl') });
    const completed = manager.boilingSystem.sourceSampling.reactionGlyphsBorn;
    manager.step(residue, 1 / 30, { thermalStateAuthoritative: true, reactionGasRate: 30, reactionProgram: getProgramById('zn_hcl') });
    expect(manager.boilingSystem.sourceSampling.reactionGlyphsBorn).toBe(completed);
  });

  it('renders the first and final pulse of a tiny completely consumed solid from its one-step receipt', () => {
    const before = zinc(); before.contents[1].mass_g = 0.0001; before.contents[1].moles = 0.0001 / 65.38;
    const after = vessel({ escapedGas_g: { H2: before.contents[1].moles * 2.016 } });
    after.gasFlux = measureGasFlux(after, before, 1 / 60);
    expect(after.gasFlux.sourceSolids?.contents).toHaveLength(1);
    expect(after.contents.some(row => row.formula === 'Zn')).toBe(false);
    expect(reactionGasSources(after, getProgramById('zn_hcl'))!.length).toBeGreaterThan(0);
    before.contents[1].mass_g = 0;
    expect(after.gasFlux.sourceSolids!.contents[0].mass_g).toBe(0.0001);
    after.gasFlux = measureGasFlux(after, after, 1 / 60);
    expect(after.gasFlux.sourceSolids).toBeUndefined();
    expect(reactionGasSources(after, getProgramById('zn_hcl'))).toEqual([]);
  });
});
