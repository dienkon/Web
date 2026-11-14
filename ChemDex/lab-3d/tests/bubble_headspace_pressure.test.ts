import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VesselState } from '../src/types/chemistry';
import type { PhysicalBubble } from '../src/simulation/core/SimulationTypes';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { captureHeadspace, sealedGasPressure } from '../src/engine/headspacePressure';
import { bubbleMechanicalRadius } from '../src/science/bubblePhase';
import { metersPerModelUnit } from '../src/science/sceneUnits';
import { waterSurfaceTension } from '../src/science/wallDropletGeometry';
import { pointPlaneDepth } from '../src/simulation/effects/liquidParticleFrame';

const sample = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'pressure', name: 'pressure', type: 'beaker', capacity_ml: 100, position: [0, 0, 0], rotationY: 0,
  volume_ml: 50, volume: 0.5, mass_g: 50, temperature_c: 25, ph: 7, isLocked: false,
  hasGas: false, hasPrecipitate: false, isBoiling: false,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], substances: ['H2O'], ...patch,
});
const pressurized = () => {
  const vessel = sample({ isSealed: true });
  vessel.sealedHeadspace = captureHeadspace(vessel);
  vessel.contents.push({ formula: 'H2', phase: 'g', mass_g: 0.004 * 2.016, moles: 0.004 });
  vessel.mass_g += 0.004 * 2.016;
  return vessel;
};
const bubble = (): PhysicalBubble => ({ id: 1, x: 0, y: -0.5, z: 0, radius: 0.012, baseRadius: 0.012,
  source: 'reaction', gasPV_scene3_Pa: 102000 * 0.012 ** 3, nucleationPressure_Pa: 102000,
  vx: 0, vy: 0, vz: 0, buoyancy: 1, growthRate: 0, wobblePhase: 0, wobbleSpeed: 0, wobbleAmp: 0,
  aspectRatio: 1, life: 0, maxLife: 5, opacity: 1, temperature: 25, isPopping: false, popProgress: 0, merged: false });
afterEach(() => vi.restoreAllMocks());

describe('Immersed bubble pressure follows the actual headspace', () => {
  it('compresses the same noncondensable packet in a sealed gas-loaded vessel', () => {
    const closed = pressurized(), open = { ...closed, isSealed: false };
    const run = (vessel: VesselState) => {
      const manager = new VesselSimulationManager(vessel.id);
      manager.boilingSystem.bubbles = [bubble()];
      const update = vi.spyOn(manager.boilingSystem, 'update');
      manager.step(vessel, 1 / 120, { thermalStateAuthoritative: true });
      return { b: manager.boilingSystem.bubbles[0], input: update.mock.calls[0][1] };
    };
    const low = run(open), high = run(closed);
    expect(sealedGasPressure(closed)).toBeGreaterThan(2.9);
    expect(high.input.pressure_atm).toBe(sealedGasPressure(closed));
    expect(low.input.pressure_atm).toBe(1);
    expect(high.b.noncondensablePV_scene3_Pa).toBe(low.b.noncondensablePV_scene3_Pa);
    expect(high.b.physicalRadius_m!).toBeLessThan(low.b.physicalRadius_m! * 0.75);
    for (const { b, input } of [low, high]) {
      expect(b.isPopping).toBe(false);
      const scale = metersPerModelUnit(input.vesselProfile);
      const localPressure = input.pressure_atm! * 101325 + input.liquidDensity_kg_m3! * 9.80665
        * pointPlaneDepth(b, input.surfaceY, input.surfacePlane) * scale;
      const expected = bubbleMechanicalRadius(b.gasPV_scene3_Pa! * scale ** 3, localPressure, waterSurfaceTension(25));
      expect(b.physicalRadius_m).toBeCloseTo(expected, 13);
    }
  });
  it.each([0.6, 1.4])('uses the open room boundary at %s atm despite a stale internal readout', pressure => {
    const vessel = sample({ internalPressure_atm: 9, effectsEnvironment: { pressure_atm: pressure } });
    const manager = new VesselSimulationManager(vessel.id), update = vi.spyOn(manager.boilingSystem, 'update');
    manager.step(vessel, 1 / 120, { thermalStateAuthoritative: true, reactionGasRate: 120 });
    expect(update.mock.calls[0][1].pressure_atm).toBe(pressure);
  });
  it('recomputes sealed pressure after standalone heating without changing the external mist boundary', () => {
    const vessel = pressurized(); vessel.internalPressure_atm = 0.1;
    const manager = new VesselSimulationManager(vessel.id);
    manager.boilingSystem.bubbles = [bubble()];
    const bubbles = vi.spyOn(manager.boilingSystem, 'update'), mist = vi.spyOn(manager.evaporationSystem, 'update');
    const result = manager.step(vessel, 0.1, { heatPower_W: 100 });
    expect(result.temperature_c).toBeGreaterThan(25);
    expect(bubbles.mock.calls[0][1].pressure_atm).toBeCloseTo(sealedGasPressure({ ...vessel, ...result }), 12);
    expect(mist.mock.calls[0][1].pressure_atm).toBe(1);
    expect(mist.mock.calls[0][1].actualRate_g_s).toBe(0);
    expect(vessel.internalPressure_atm).toBe(0.1);
  });
  it('does not interpret stale open-vessel boiling/outflow flags as a sealed steam source', () => {
    const vessel = pressurized();
    Object.assign(vessel, { isBoiling: true, boilingIntensity: 1, evaporationRate_g_s: 1, temperature_c: 100 });
    const manager = new VesselSimulationManager(vessel.id), update = vi.spyOn(manager.boilingSystem, 'update');
    manager.step(vessel, 0.1, { thermalStateAuthoritative: true });
    expect(update.mock.calls[0][1].vaporRate_g_s).toBe(0);
    expect(manager.boilingSystem.sourceSampling.vaporGlyphsBorn).toBe(0);
    expect(manager.boilingSystem.bubbles).toHaveLength(0);
  });
  it('does not replace unavailable sealed headspace pressure with ambient pressure', () => {
    const vessel = pressurized(); vessel.capacity_ml = vessel.volume_ml;
    expect(Number.isFinite(sealedGasPressure(vessel))).toBe(false);
    const manager = new VesselSimulationManager(vessel.id), update = vi.spyOn(manager.boilingSystem, 'update');
    manager.step(vessel, 0.1, { thermalStateAuthoritative: true, reactionGasRate: 120 });
    expect(update).not.toHaveBeenCalled();
    expect(manager.boilingSystem.sourceSampling.reactionGlyphsBorn).toBe(0);
  });
});
