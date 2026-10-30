import { afterEach, describe, expect, it, vi } from 'vitest';
import { EFFECT_ATOM_CATALOG, getEffectAtom } from '../src/vfx/catalog';
import { studioAtomAction, runStudioAtomContext } from '../src/engine/studioAtom';
import { useAppStore } from '../src/store/useAppStore';
import { vfxBus } from '../src/vfx/bus';
import { labSound } from '../src/utils/audio';
import type { VesselState } from '../src/types/chemistry';

const existing: VesselState = { id: 'existing', name: 'Existing sample', type: 'beaker', capacity_ml: 100,
  position: [0, 0, 0], rotationY: 0, isLocked: false, contents: [{ formula: 'H2O', phase: 'l', mass_g: 10, moles: 10 / 18.015 }],
  substances: ['H2O'], volume_ml: 10, volume: 0.1, mass_g: 10, temperature_c: 25, ph: 7,
  hasPrecipitate: false, hasGas: false, isBoiling: false };
const before = useAppStore.getState();
afterEach(() => { vi.restoreAllMocks(); useAppStore.setState(before); });
function setup() {
  useAppStore.setState({ vessels: { existing }, vesselIds: ['existing'], activeKinetics: {}, burners: {},
    pendingReactions: {}, isSimulationPaused: true, selectedVesselId: 'existing' });
}

describe('Studio atom contexts never fabricate inventory', () => {
  it('reuses the target for every supported context and conserves its finite sample', () => {
    let covered = 0;
    for (const atom of EFFECT_ATOM_CATALOG) for (let index = 0; index < atom.gallery.length; index++) {
      const action = studioAtomAction(atom, index);
      if (action.kind !== 'program') continue;
      setup();
      const result = runStudioAtomContext(atom, index, existing.id);
      expect(result.ok, atom.name).toBe(true);
      expect(result.vesselId, atom.name).toBeTruthy();
      const id = result.vesselId!;
      const initial = useAppStore.getState().vessels[id];
      expect(id, atom.name).toBe(existing.id);
      expect(Object.keys(useAppStore.getState().vessels)).toEqual([existing.id]);
      expect(initial.position).toEqual(existing.position);
      expect(initial.capacity_ml).toBe(existing.capacity_ml);
      expect(initial.mass_g, atom.name).toBeCloseTo(initial.contents.reduce((sum, item) => sum + item.mass_g, 0), 8);
      if (result.started) {
        expect(useAppStore.getState().seekStudioProgram(id, 1), atom.name).toBe(true);
        const end = useAppStore.getState().vessels[id];
        const escaped = Object.values(end.escapedGas_g ?? {}).reduce((sum, mass) => sum + mass, 0);
        expect(end.mass_g + escaped, atom.name).toBeCloseTo(initial.mass_g, 7);
        expect(end.contents.reduce((sum, item) => sum + item.mass_g, 0), atom.name).toBeCloseTo(end.mass_g, 7);
        expect(end.contents.every(item => item.moles >= 0 && Number.isFinite(item.moles)), atom.name).toBe(true);
        expect(useAppStore.getState().activeKinetics[id], atom.name).toBeUndefined();
        expect(end.hasGas, atom.name).toBe(false);
      }
      covered++;
    }
    expect(covered).toBeGreaterThan(50);
  });
  it('keeps unimplemented presets and invalid indices read-only', () => {
    setup();
    const atom = getEffectAtom('bumpingSurge')!;
    const initial = useAppStore.getState();
    for (const index of [0, 1, -1, 2, NaN]) {
      expect(runStudioAtomContext(atom, index, existing.id).action.kind).toBe('inspect');
      expect(useAppStore.getState()).toBe(initial);
    }
    for (const candidate of EFFECT_ATOM_CATALOG) for (let i = 0; i < candidate.gallery.length; i++) {
      if (studioAtomAction(candidate, i).kind !== 'inspect') continue;
      runStudioAtomContext(candidate, i, existing.id);
      expect(useAppStore.getState()).toBe(initial);
    }
  });
  it('does not interpret arbitrary color/quantity/substance parameters as chemistry', () => {
    setup();
    const atom = getEffectAtom('precipitateNucleation')!;
    const forged = { ...atom, gallery: atom.gallery.map(p => ({ ...p, params: { color: '#ff00ff', substance: 'Au', mass_g: 999, volume_ml: 999 } })) };
    const result = runStudioAtomContext(forged, 0, existing.id);
    const sample = useAppStore.getState().vessels[result.vesselId!];
    expect(sample.contents.some(item => item.formula === 'Au')).toBe(false);
    expect(sample.volume_ml).toBe(30);
    expect(sample.hasPrecipitate).toBe(false);
    expect(sample.precipitateAmount_g).toBe(0);
    expect(result.vesselId).toBe(existing.id);
  });
  it('does not bypass thermal or ignition conditions when opening atom contexts', () => {
    setup();
    for (const [name, index] of [['blueGel', 1], ['magnesiumRibbonBurn', 0], ['sublimation', 0]] as const) {
      setup();
      const result = runStudioAtomContext(getEffectAtom(name)!, index, existing.id);
      expect(result.started, name).toBe(false);
      const sample = useAppStore.getState().vessels[result.vesselId!];
      expect(sample.temperature_c, name).toBe(25);
      expect(sample.hasGas, name).toBe(false);
      expect(useAppStore.getState().activeKinetics[sample.id], name).toBeUndefined();
    }
  });
  it('requires real liquid for a ripple and emits one scoped impulse without changing the sample', () => {
    setup();
    const atom = getEffectAtom('surfaceRipple')!, emit = vi.spyOn(vfxBus, 'emit');
    const initial = useAppStore.getState();
    expect(runStudioAtomContext(atom, 0, existing.id).ok).toBe(true);
    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith('surface:ripple', expect.objectContaining({ vesselId: existing.id, intensity: 0.2 }));
    expect(useAppStore.getState()).toBe(initial);
    for (const patch of [{ volume_ml: 0 }, { isSealed: true }, { isShattered: true }, { isLocked: true }]) {
      useAppStore.setState({ vessels: { existing: { ...existing, ...patch } } });
      expect(runStudioAtomContext(atom, 0, existing.id).ok).toBe(false);
    }
    expect(emit).toHaveBeenCalledOnce();
  });
  it('opens heating controls without creating a sample or forcing boiling', () => {
    setup();
    const initial = useAppStore.getState();
    const result = runStudioAtomContext(getEffectAtom('vigorousBoilBubbles')!, 0, existing.id);
    expect(result.action.kind).toBe('heating');
    expect(useAppStore.getState()).toBe(initial);
  });
  it('uses bounded audio clips without changing physical state', () => {
    setup();
    const fizz = vi.spyOn(labSound, 'playFizz').mockImplementation(() => {});
    const pop = vi.spyOn(labSound, 'playPop').mockImplementation(() => {});
    const initial = useAppStore.getState();
    const atom = getEffectAtom('proceduralAcoustics')!;
    runStudioAtomContext(atom, 0);
    runStudioAtomContext(atom, 1);
    expect(fizz).toHaveBeenCalledWith(1);
    expect(pop).toHaveBeenCalledOnce();
    expect(useAppStore.getState()).toBe(initial);
  });
  it('rejects flame color without actual fuel instead of launching arbitrary sparks', () => {
    setup();
    useAppStore.setState({ burners: { empty: { id: 'empty', position: [0, 0, 0], isOn: false, intensity: 3, fuelLevel_ml: 0 } } });
    const emit = vi.spyOn(vfxBus, 'emit');
    expect(runStudioAtomContext(getEffectAtom('flameColorByElement')!, 0).ok).toBe(false);
    expect(emit).not.toHaveBeenCalled();
    expect(useAppStore.getState().vessels.existing).toBe(existing);
  });
});
