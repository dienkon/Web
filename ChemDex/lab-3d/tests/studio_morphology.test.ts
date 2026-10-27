import { afterEach, describe, expect, it } from 'vitest';
import { createStudioMorphologySample, PRECIPITATE_MORPHOLOGIES } from '../src/engine/studioMorphology';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { getProgramById } from '../src/vfx/programs/library';
import { useAppStore } from '../src/store/useAppStore';
import { readComposition } from '../src/science/balance';
import type { VesselState } from '../src/types/chemistry';

const shell: VesselState = { id: 'existing', name: 'Existing', type: 'beaker', capacity_ml: 100,
  position: [0, 0, 0], rotationY: 0, isLocked: false, contents: [], substances: [],
  volume_ml: 0, volume: 0, mass_g: 0, temperature_c: 25, ph: 7,
  hasPrecipitate: false, hasGas: false, isBoiling: false };
const before = useAppStore.getState();
afterEach(() => useAppStore.setState(before));
function atoms(vessel: VesselState) {
  const result: Record<string, number> = {};
  for (const item of vessel.contents) for (const [element, count] of Object.entries(readComposition(item.formula).atoms)) {
    result[element] = (result[element] ?? 0) + count * item.moles;
  }
  return result;
}

describe('Studio morphology specimens use finite inventory', () => {
  it('creates each reaction specimen without preassigning its product mass', () => {
    for (const entry of PRECIPITATE_MORPHOLOGIES) {
      if (!entry.programId) continue;
      const initial = createStudioMorphologySample(entry.type, shell);
      expect(initial.precipitateAmount_g, entry.type).toBe(0);
      expect(initial.contents.some(item => item.formula === entry.substance), entry.type).toBe(false);
      const program = getProgramById(entry.programId)!;
      const patch = applyProgramToLedger(program, initial, 1, { deferThermal: true });
      const end = { ...initial, ...patch };
      const solid = end.contents.filter(item => item.formula === entry.substance && item.phase === 's');
      expect(solid.reduce((sum, item) => sum + item.moles, 0), entry.type).toBeGreaterThan(0);
      expect(end.precipitateAmount_g, entry.type).toBeCloseTo(solid.reduce((sum, item) => sum + item.mass_g, 0), 9);
      expect(end.mass_g, entry.type).toBeCloseTo(initial.mass_g, 8);
      for (const [element, amount] of Object.entries(atoms(initial))) expect(atoms(end)[element], entry.type + element).toBeCloseTo(amount, 10);
      expect(applyProgramToLedger(program, end, 1).contents, entry.type).toEqual(end.contents);
    }
  });
  it('records gypsum hydrate water inside the crystal, separately from liquid water', () => {
    const sample = createStudioMorphologySample('CRYSTAL_ROD', shell);
    const gypsum = sample.contents.find(item => item.formula === 'CaSO4·2H2O')!;
    expect(gypsum.phase).toBe('s');
    expect(gypsum.mass_g).toBe(0.5);
    expect(gypsum.moles).toBeCloseTo(0.5 / computeMolarMass('CaSO4·2H2O'), 12);
    expect(sample.contents.find(item => item.formula === 'H2O')!.mass_g).toBe(30);
    expect(sample.mass_g).toBe(30.5);
    expect(sample.volume_ml).toBe(30);
    expect(sample.studioProgramId).toBeUndefined();
    expect(sample.hasGas).toBe(false);
    expect(sample.isBoiling).toBe(false);
  });
  it('rejects unsupported morphology and insufficient capacity without mutating the shell', () => {
    expect(() => createStudioMorphologySample('invented', shell)).toThrow();
    for (const entry of PRECIPITATE_MORPHOLOGIES) expect(() => createStudioMorphologySample(entry.type, { ...shell, capacity_ml: 1 })).toThrow();
    expect(shell.contents).toEqual([]);
  });
  it('prepares all eight samples in separate vessels and completes seven finite runs', () => {
    useAppStore.setState({ vessels: { existing: shell }, vesselIds: ['existing'],
      activeKinetics: {}, pendingReactions: {}, isSimulationPaused: true });
    const ids = new Set<string>();
    for (const entry of PRECIPITATE_MORPHOLOGIES) {
      const id = useAppStore.getState().prepareStudioMorphology(entry.type)!;
      expect(id).toBeTruthy();
      ids.add(id);
      expect(useAppStore.getState().selectedVesselId).toBe(id);
      expect(useAppStore.getState().vessels.existing).toBe(shell);
      if (entry.programId) {
        expect(useAppStore.getState().runStudioProgram(id)).toBe(true);
        expect(useAppStore.getState().seekStudioProgram(id, 1)).toBe(true);
        expect(useAppStore.getState().activeKinetics[id]).toBeUndefined();
        // Heat can shift a hydrolysis-coupled endpoint: further finite growth
        // is valid until the sample reaches its new temperature equilibrium.
        if (entry.type === 'GEL') {
          for (let i = 0; i < 8 && useAppStore.getState().runStudioProgram(id); i++) {
            expect(useAppStore.getState().seekStudioProgram(id, 1)).toBe(true);
          }
          expect(useAppStore.getState().runStudioProgram(id)).toBe(false);
        } else expect(useAppStore.getState().runStudioProgram(id)).toBe(false);
      } else expect(useAppStore.getState().runStudioProgram(id)).toBe(false);
    }
    expect(ids.size).toBe(8);
    expect(useAppStore.getState().vesselIds).toHaveLength(9);
    expect(useAppStore.getState().prepareStudioMorphology('unknown')).toBeNull();
    expect(useAppStore.getState().vesselIds).toHaveLength(9);
  });
});
