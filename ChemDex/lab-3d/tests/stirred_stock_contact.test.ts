import { afterEach, describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import type { VesselState } from '../src/types/chemistry';
import { advanceVesselLiquidMotion, vesselVortexSurface } from '../src/science/vesselLiquidMotion';
import { vortexHeight } from '../src/science/liquidVortex';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { stockContainer } from '../src/physical/stockAdapter';
import { stockFluidAt } from '../src/physical/stockFluidMotion';
import { stockGrainContacts, stockLiquidContactFraction, stockPointInAqueousLiquid } from '../src/physical/stockLiquidContact';
import { planMetalAcid } from '../src/engine/metalAcidPlan';
import { advanceReaction } from '../src/engine/advanceReaction';
import { partitionSodiumChloride } from '../src/engine/sodiumChloridePhase';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { getProgramById } from '../src/vfx/programs/library';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { useAppStore } from '../src/store/useAppStore';
import { useLabEnvironment } from '../src/store/useLabEnvironment';

const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
const amount = (formula: string, phase: string, mass_g: number) => ({ formula, phase, mass_g, moles: mass_g / computeMolarMass(formula) });
function sample(formula = 'Zn'): VesselState {
  return { id: 'stirred-contact', name: 'stirred contact', type: 'beaker', capacity_ml: 100,
    position: [0, 0, 0], rotationY: 0, isLocked: false, volume_ml: 30, volume: 0.3,
    mass_g: 30.0001, temperature_c: 25, ph: 1, hasGas: false, hasPrecipitate: false, isBoiling: false,
    contents: [amount(formula, 's', 0.0001), amount('HCl', 'aq', 0.3646), amount('H2O', 'l', 29.6354)],
    substances: [formula, 'HCl', 'H2O'], liquidMotion: { angularSpeed_rad_s: 47.9, phase_rad: 1, remainder_s: 0 } };
}
function pose(vessel: VesselState, id: string, x: number, y: number) {
  const formula = vessel.contents[0].formula;
  return { id, formula, mass_g: 0.0001, scale_m: Math.cbrt(0.0001 / (formula === 'Zn' ? 7.14 : 2.165) * 1e-6),
    position_m: vesselLocalToWorld(vessel, [x, y, 0]).map(n => n * 0.035) as [number, number, number],
    rotation: [0, 0, 0, 1] as [number, number, number, number], velocity_m_s: [0, -0.1, 0] as [number, number, number],
    angularVelocity_rad_s: [0, 0, 0] as [number, number, number], sleeping: false, powder: false };
}
function nearSurface(formula = 'Zn') {
  const vessel = sample(formula), surface = vesselVortexSurface(vessel)!, flat = vesselLiquidSurfaceY(vessel);
  const centreY = (flat + vortexHeight(0, 0, surface)) / 2;
  const rimY = (flat + vortexHeight(0.85, 0, surface)) / 2;
  return { vessel, centreY, rimY };
}

describe('the accepted stirring surface gates chemistry and rigid stock together', () => {
  it('blocks a dry falling centre grain and enables an immersed rim grain above the old flat level', () => {
    const { vessel, centreY, rimY } = nearSurface();
    for (const [x, y, wet] of [[0, centreY, false], [0.85, rimY, true]] as const) {
      const current = { ...vessel, stockMotion: { tick: 1, grains: [pose(vessel, 'grain', x, y)] } };
      expect(stockFluidAt(current.stockMotion.grains[0].position_m, stockContainer(current, false)!.fluid!).depth_m > 0).toBe(wet);
      expect(stockPointInAqueousLiquid(current)(new Vector3(x, y, 0))).toBe(wet);
      expect(stockLiquidContactFraction(current, 'Zn')).toBe(wet ? 1 : 0);
      const progress = advanceReaction(planMetalAcid(current, 'vi')!.kinetics, current, 0.1);
      expect(progress > 0).toBe(wet);
    }
  });

  it('caps reaction yield and per-ID consumption at the wet rim carrier', () => {
    const { vessel, centreY, rimY } = nearSurface();
    vessel.contents[0] = { ...vessel.contents[0], mass_g: 0.0002, moles: 0.0002 / computeMolarMass('Zn') };
    vessel.stockMotion = { tick: 1, grains: [pose(vessel, 'centre-dry', 0, centreY), pose(vessel, 'rim-wet', 0.85, rimY)] };
    expect(stockGrainContacts(vessel, 'Zn').map(c => c.wetFraction)).toEqual([0, 1]);
    const result = applyProgramToLedger(getProgramById('zn_hcl')!, vessel, 1, { deferThermal: true });
    expect(result.stockMotion!.grains[0]).toEqual(vessel.stockMotion.grains[0]);
    expect(result.stockMotion!.grains[1].mass_g).toBe(0);
    expect(result.contents!.find(row => row.formula === 'Zn')!.mass_g).toBeCloseTo(0.0001, 12);
  });

  it('phase dissolution preserves the dry centre while spending the wet rim and free precipitate pools', () => {
    const { vessel, centreY, rimY } = nearSurface('NaCl');
    vessel.contents = [amount('NaCl', 's', 0.0002), amount('H2O', 'l', 30),
      { ...amount('NaCl', 's', 0.0001), solidOrigin: 'precipitate' }];
    vessel.stockMotion = { tick: 1, grains: [pose(vessel, 'centre-dry', 0, centreY), pose(vessel, 'rim-wet', 0.85, rimY)] };
    const after = { ...vessel, ...partitionSodiumChloride(vessel, 30) };
    expect(after.stockMotion!.grains[0]).toEqual(vessel.stockMotion.grains[0]);
    expect(after.stockMotion!.grains[1].mass_g).toBeLessThan(0.0001);
    expect(after.contents.filter(r => r.formula === 'NaCl' && r.phase === 'aq').reduce((n, r) => n + r.mass_g, 0)).toBeGreaterThan(0.0001);
  });
});

describe('accepted liquid motion clock and consumer lifecycle', () => {
  const spin = (hz: number) => {
    let vessel: VesselState = { ...sample(), contents: [amount('H2O', 'l', 30)], liquidMotion: undefined };
    for (let i = 0; i < hz * 4; i++) vessel = { ...vessel, liquidMotion: advanceVesselLiquidMotion(vessel, 1 / hz, 1) };
    return vessel;
  };
  it('integrates the same accepted elapsed time at different frame cadences', () => {
    const reference = spin(120).liquidMotion!;
    for (const hz of [30, 60, 144]) {
      const actual = spin(hz).liquidMotion!;
      expect(actual.angularSpeed_rad_s).toBeCloseTo(reference.angularSpeed_rad_s, 10);
      expect(actual.phase_rad).toBeCloseTo(reference.phase_rad, 10);
      expect(actual.remainder_s).toBeCloseTo(0, 10);
    }
  });

  it('hydrates before any step, survives save/load and never advances on extra renderer steps', () => {
    const vessel = JSON.parse(JSON.stringify(spin(60))) as VesselState, saved = structuredClone(vessel.liquidMotion);
    const manager = new VesselSimulationManager(vessel.id, 'low');
    manager.syncLiquidMotion(vessel);
    expect(manager.vortex.surface).toEqual(vesselVortexSurface(vessel));
    for (let i = 0; i < 7; i++) manager.step(vessel, 1 / 60, { agitation: 1, thermalStateAuthoritative: true, liquidMotionAuthoritative: true });
    expect(vessel.liquidMotion).toEqual(saved);
    expect(manager.vortex.surface).toEqual(vesselVortexSurface(vessel));
    manager.reset(); manager.syncLiquidMotion(vessel);
    expect(manager.vortex.surface).toEqual(vesselVortexSurface(vessel));
  });

  it('does not invent motion when a production renderer runs before the first chemistry tick', () => {
    const vessel = { ...sample(), liquidMotion: undefined }, manager = new VesselSimulationManager(vessel.id, 'low');
    manager.step(vessel, 1 / 60, { agitation: 1, thermalStateAuthoritative: true, liquidMotionAuthoritative: true });
    expect(manager.vortex.angularSpeed_rad_s).toBe(0);
    expect(manager.vortex.surface).toBeUndefined();
  });

  it('re-derives the boundary immediately after volume changes without advancing saved motion', () => {
    const vessel = spin(60), before = vesselVortexSurface(vessel)!, saved = structuredClone(vessel.liquidMotion);
    const filled = { ...vessel, volume_ml: 45, contents: [amount('H2O', 'l', 45)] };
    const after = vesselVortexSurface(filled)!;
    expect(after.meanLevel).toBeGreaterThan(before.meanLevel);
    expect(filled.liquidMotion).toEqual(saved);
    const manager = new VesselSimulationManager(vessel.id, 'low'); manager.syncLiquidMotion(filled);
    expect(manager.vortex.surface).toEqual(after);
  });

  it.each(['tilted', 'quaternion', 'layers', 'no-liquid'])('uses one hydrostatic fallback for %s specimens', kind => {
    const vessel = spin(60);
    if (kind === 'tilted') vessel.rotationZ = 0.02;
    if (kind === 'quaternion') vessel.physicalMotion = { rotation: [Math.sin(0.01), 0, 0, Math.cos(0.01)],
      velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], tick: 1 };
    if (kind === 'layers') { vessel.volume_ml = 60; vessel.immiscibleOrganicVolume_ml = 30;
      vessel.contents.push({ ...amount('C6H14', 'l', 19.8), liquidLayer: 'organic' }); }
    if (kind === 'no-liquid') vessel.contents = [amount('NaCl', 's', 30)];
    expect(vesselVortexSurface(vessel)).toBeUndefined();
    expect(stockContainer(vessel, false)!.fluid?.vortex).toBeUndefined();
    const manager = new VesselSimulationManager(vessel.id, 'low'); manager.syncLiquidMotion(vessel);
    expect(manager.vortex.surface).toBeUndefined();
  });

  it('rejects invalid saved motion without propagating non-finite uniforms', () => {
    const vessel = { ...sample(), liquidMotion: { angularSpeed_rad_s: NaN, phase_rad: Infinity, remainder_s: NaN } };
    expect(vesselVortexSurface(vessel)).toBeUndefined();
    expect(advanceVesselLiquidMotion(vessel, 1 / 60, 0)).toEqual({ angularSpeed_rad_s: 0, phase_rad: 0, remainder_s: 0 });
  });

  it('store pause freezes accepted motion, time scaling advances it, and idle chemistry still spins down', () => {
    const vessel = { ...sample(), contents: [amount('H2O', 'l', 30)], liquidMotion: undefined, stirringIntensity: 1,
      environment: useLabEnvironment.getState().conditions };
    useAppStore.setState({ vessels: { [vessel.id]: vessel }, burners: {}, activeKinetics: {}, pendingReactions: {},
      stirringVesselId: vessel.id, selectedVesselId: vessel.id, activeTool: 'stirring_rod', moveMode: false,
      draggingVesselId: null, isSimulationPaused: false, timeScale: 2 });
    useAppStore.getState().tickSimulation(0.1);
    const driven = useAppStore.getState().vessels[vessel.id];
    expect(driven.liquidMotion!.angularSpeed_rad_s).toBeCloseTo(advanceVesselLiquidMotion(vessel, 0.2, 1)!.angularSpeed_rad_s, 10);
    useAppStore.setState({ isSimulationPaused: true }); useAppStore.getState().tickSimulation(2);
    expect(useAppStore.getState().vessels[vessel.id].liquidMotion).toBe(driven.liquidMotion);
    useAppStore.setState({ isSimulationPaused: false, stirringVesselId: null, activeTool: 'none', timeScale: 1 });
    useAppStore.getState().tickSimulation(0.2);
    expect(useAppStore.getState().vessels[vessel.id].liquidMotion!.angularSpeed_rad_s).toBeLessThan(driven.liquidMotion!.angularSpeed_rad_s);
  });
});
