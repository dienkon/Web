import { afterEach, describe, expect, it } from 'vitest';
import { ambientGasPressure, captureHeadspace, ensureHeadspaceReference, freeGasMoles, gasPressurePatch,
  headspaceVolumeMl, IDEAL_GAS_R_L_ATM as R, sealedGasPressure } from '../src/engine/headspacePressure';
import { useAppStore } from '../src/store/useAppStore';
import { projectEscapedGas } from '../src/engine/gasInventory';
import { effects } from '../src/vfx/vesselEffects';
import type { VesselState } from '../src/types/chemistry';

const baseline = useAppStore.getState();
afterEach(() => useAppStore.setState(baseline, true));
const water = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'b', name: 'b', type: 'beaker',
  capacity_ml: 100, position: [0, 0, 0], rotationY: 0, isLocked: false, volume_ml: 40, volume: 0.4,
  mass_g: 40, temperature_c: 25, ph: 7, substances: ['H2O'],
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 40, moles: 40 / 18.015 }],
  hasGas: false, hasPrecipitate: false, isBoiling: false, ...patch });
const close = (v: VesselState) => ({ ...v, isSealed: true, sealedHeadspace: captureHeadspace(v) });
function setup(v: VesselState) { useAppStore.setState({ vessels: { b: v }, vesselIds: ['b'], burners: {}, spills: {},
  activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 }); }

describe('Captured ideal-gas headspace', () => {
  it.each([5, 25, 80])('starts at ambient when closed at %s C rather than pretending closure happened at 25 C', temperature_c => {
    const sealed = close(water({ temperature_c, effectsEnvironment: { pressure_atm: 0.8 } }));
    expect(sealedGasPressure(sealed)).toBeCloseTo(0.8, 12);
    expect(sealed.sealedHeadspace.referenceTemperature_c).toBe(temperature_c);
  });
  it('preserves background gas amount through temperature and volume changes', () => {
    const v = close(water({ temperature_c: 80 })), amount = v.sealedHeadspace.background_mol;
    const cooled = { ...v, temperature_c: 25 }, compressed = { ...cooled, volume_ml: 70 };
    expect(sealedGasPressure(cooled)).toBeCloseTo(298.15 / 353.15, 12);
    expect(sealedGasPressure(compressed)).toBeCloseTo(2 * 298.15 / 353.15, 12);
    expect(compressed.sealedHeadspace.background_mol).toBe(amount);
  });
  it('does not follow later ambient pressure changes while sealed', () => {
    const v = close(water({ effectsEnvironment: { pressure_atm: 0.8 } }));
    expect(sealedGasPressure({ ...v, effectsEnvironment: { pressure_atm: 1.2 } })).toBeCloseTo(0.8, 12);
    expect(sealedGasPressure({ ...v, isSealed: false, effectsEnvironment: { pressure_atm: 1.2 } })).toBe(1.2);
  });
  it('uses sub-millilitre free volume without imposing a fake 1 mL floor', () => {
    const v = close(water({ capacity_ml: 1, volume_ml: 0.9 }));
    const next = { ...v, contents: [...v.contents, { formula: 'H2', phase: 'g', mass_g: 0.00002016, moles: 1e-5 }] };
    expect(sealedGasPressure(next)).toBeCloseTo(1 + 1e-5 * R * 298.15 / 0.0001, 10);
  });
  it('does not double-count explicit free gas when capturing an ambient-pressure closure', () => {
    const original = water(); original.contents = [...original.contents, { formula: 'H2', phase: 'g', mass_g: 0.0002016, moles: 0.0001 }];
    const v = close(original);
    expect(sealedGasPressure(v)).toBeCloseTo(1, 12);
    const next = { ...v, contents: [...v.contents, { formula: 'H2', phase: 'g', mass_g: 0.0002016, moles: 0.0001 }] };
    expect(sealedGasPressure(next)).toBeCloseTo(1 + 0.0001 * R * 298.15 / 0.06, 12);
  });
  it('subtracts full solid volume and internal coatings, including solids above the liquid surface', () => {
    const v = water({ volume_ml: 0, mass_g: 89.6, contents: [{ formula: 'Cu', phase: 's', mass_g: 89.6, moles: 89.6 / 63.546 }] });
    expect(headspaceVolumeMl(v)).toBeCloseTo(90, 10);
    expect(headspaceVolumeMl({ ...v, wallCoating_ml: 5 })).toBeCloseTo(85, 10);
  });
  it('excludes gas in foam and recognizes free-gas state aliases', () => {
    const v = water({ contents: [{ formula: 'O2', phase: 'g', location: 'foam', mass_g: 0.32, moles: 0.01 },
      { formula: 'H2', state: 'gas', mass_g: 0.002016, moles: 0.001 }] });
    expect(freeGasMoles(v)).toBe(0.001);
    const projected = projectEscapedGas(v)!;
    expect(projected.contents).toHaveLength(1); expect(projected.contents![0].location).toBe('foam');
    expect(projected.escapedGas_g!.H2).toBe(0.002016);
  });
  it('marks a gas-law pressure unavailable at zero headspace or nonphysical temperature without serializing NaN', () => {
    for (const v of [close(water({ volume_ml: 100 })), close(water({ temperature_c: -273.15 }))]) {
      expect(sealedGasPressure(v)).toBeNaN();
      const patch = gasPressurePatch(v);
      expect(patch.internalPressureModel).toBe('unavailable'); expect(patch.internalPressure_atm).toBeUndefined();
      const saved = JSON.parse(JSON.stringify(patch)); expect(saved.internalPressure_atm).toBeUndefined();
    }
  });
  it('freezes an explicit legacy 25 C reference once instead of recapturing background amount after compression', () => {
    const old = water({ isSealed: true, temperature_c: 50 });
    const normalized = ensureHeadspaceReference(old);
    expect(normalized.sealedHeadspace!.model).toBe('legacy-25C');
    expect(sealedGasPressure(normalized)).toBeCloseTo(323.15 / 298.15, 12);
    expect(sealedGasPressure({ ...normalized, volume_ml: 70 })).toBeCloseTo(2 * 323.15 / 298.15, 12);
    expect(ensureHeadspaceReference(normalized)).toBe(normalized);
  });
});

describe('Store closure and opening boundary', () => {
  it('captures through both the stopper action and direct state transition, and keeps the reference while heating', () => {
    setup(water({ temperature_c: 80 })); useAppStore.getState().sealVessel('b');
    const first = useAppStore.getState().vessels.b;
    expect(first.internalPressure_atm).toBeCloseTo(1, 12);
    useAppStore.getState().setVesselState('b', { temperature_c: 100 });
    const hot = useAppStore.getState().vessels.b;
    expect(hot.sealedHeadspace).toBe(first.sealedHeadspace); expect(hot.internalPressure_atm).toBeCloseTo(373.15 / 353.15, 12);
    useAppStore.getState().sealVessel('b');
    useAppStore.getState().setVesselState('b', { isSealed: true });
    expect(useAppStore.getState().vessels.b.sealedHeadspace!.referenceTemperature_c).toBe(100);
    expect(useAppStore.getState().vessels.b.internalPressure_atm).toBeCloseTo(1, 12);
  });
  it('vents finite retained species once when opened and updates the net water sink without changing total material', () => {
    const v = water({ mass_g: 40.002016 + 0.0018015, waterVaporReleased_g: 0.2 });
    v.contents.push({ formula: 'H2', phase: 'g', mass_g: 0.002016, moles: 0.001 },
      { formula: 'H2O', phase: 'g', mass_g: 0.0018015, moles: 0.0001 });
    setup(close(v));
    useAppStore.getState().sealVessel('b'); const opened = useAppStore.getState().vessels.b;
    expect(opened.mass_g).toBeCloseTo(40, 12); expect(opened.sealedHeadspace).toBeUndefined();
    expect(opened.internalPressure_atm).toBe(1); expect(opened.escapedGas_g!.H2).toBe(0.002016);
    expect(opened.waterVaporReleased_g).toBeCloseTo(0.2018015, 12);
    useAppStore.getState().setVesselState('b', { isSealed: false });
    expect(useAppStore.getState().vessels.b.escapedGas_g).toEqual(opened.escapedGas_g);
  });
  it('captures legacy reference in a simulation commit and retains it through later updates', () => {
    setup(water({ isSealed: true })); useAppStore.getState().tickSimulation(0.01);
    const first = useAppStore.getState().vessels.b;
    expect(first.sealedHeadspace).toBeDefined();
    useAppStore.getState().setVesselState('b', { volume_ml: 70 });
    expect(useAppStore.getState().vessels.b.internalPressure_atm).toBeCloseTo(2, 10);
  });
  it('keeps full-liquid pressure explicitly unavailable and respects the local environment on reopening', () => {
    setup(water({ volume_ml: 100, effectsEnvironment: { pressure_atm: 0.8 } })); useAppStore.getState().sealVessel('b');
    expect(useAppStore.getState().vessels.b.internalPressureModel).toBe('unavailable');
    expect(effects.forVessel('b').inspect().state!.pressure_atm).toBeNull();
    expect(effects.forVessel('b').inspect().state!.pressureModel).toBe('unavailable');
    useAppStore.getState().sealVessel('b'); const after = useAppStore.getState().vessels.b;
    expect(after.internalPressure_atm).toBe(0.8); expect(ambientGasPressure(after)).toBe(0.8);
    expect(effects.forVessel('b').inspect().state!.pressure_atm).toBe(0.8);
  });
});
