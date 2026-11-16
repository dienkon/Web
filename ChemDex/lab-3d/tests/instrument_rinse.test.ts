import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { experimentEngine } from '../src/engine/experimentEngine';
import { aspiratePipette, rinseInstrument } from '../src/handling/instrumentOperations';
import { useToolDockStore } from '../src/handling/toolDockState';
import { clearHistory } from '../src/store/persistence';
import { pendingStockContacts, acknowledgeStockContacts } from '../src/physical/stockContacts';
import type { VesselState } from '../src/types/chemistry';
import { withdrawAliquot } from '../src/handling/aliquot';

const original = useAppStore.getState();
const waterBottle = (volume_ml = 25): VesselState => ({ id: 'rinse_water', name: 'Nước cất', type: 'wash_bottle',
  position: [-3, -0.135, 0], rotationY: 0, isLocked: false, capacity_ml: 250,
  mass_g: volume_ml, volume_ml, volume: volume_ml / 250, temperature_c: 25, ph: 7,
  substances: ['H2O'], contents: [{ formula: 'H2O', phase: 'l', mass_g: volume_ml, moles: volume_ml / 18.015 }],
  hasGas: false, hasPrecipitate: false, isBoiling: false });
const receiver = (): VesselState => ({ ...waterBottle(0), id: 'rinse_receiver', name: 'Receiver', type: 'beaker',
  position: [2, -0.135, 0], capacity_ml: 100, contents: [], substances: [] });
const state = () => useAppStore.getState();
const engineDirty = () => experimentEngine.getContaminatedTools();
const wasteWater = () => state().wasteContents.filter(row => row.formula === 'H2O').reduce((sum, row) => sum + row.mass_g, 0);
function advance(seconds: number, frameDt = 0.05) {
  for (let elapsed = 0; elapsed < seconds - 1e-10; elapsed += frameDt) state().tickInstrumentRinse(Math.min(frameDt, seconds - elapsed));
}
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }

beforeEach(() => {
  state().resetWorkbench();
  clearHistory();
  experimentEngine.resetContamination();
  useToolDockStore.setState({ positions: {}, deployed: {}, dragging: null });
  const bottle = waterBottle(), target = receiver();
  useAppStore.setState({ ...original, vessels: { [bottle.id]: bottle, [target.id]: target }, vesselIds: [bottle.id, target.id],
    selectedVesselId: target.id, burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
    instrumentRinse: null, pouringChemical: null, stockDosePending: false, isMixing: false, inFlightPours: [],
    spatulaState: { chemical: null, mass_g: 0, color: '#777' }, pipetteSample: null,
    wasteMass_g: 0, wasteContents: [], spills: {}, toolContamination: engineDirty(),
    isSimulationPaused: false, moveMode: false, timeScale: 1, activeTool: 'none' });
  state().touchToolChemical('pipette', 'NaCl');
  state().touchToolChemical('stirring_rod', 'CuSO4');
  state().touchToolChemical('spatula', 'Fe');
});
afterEach(() => {
  state().resetWorkbench();
  acknowledgeStockContacts(pendingStockContacts().map(contact => contact.id));
  experimentEngine.restoreContamination(original.toolContamination);
  useAppStore.setState(original, true);
  clearHistory();
});

describe('finite instrument rinsing through the live store', () => {
  it('transfers exactly 5 mL to waste and cleans only after the final drain', () => {
    expect(rinseInstrument('pipette').ok).toBe(true);
    expect(state().instrumentRinse?.phase).toBe('positioning');
    expect(state().toolContamination.pipette).toBe('NaCl');
    expect(state().cleanTool('stirring_rod').ok).toBe(false);
    advance(0.2);
    expect(state().vessels.rinse_water.volume_ml).toBe(25);
    expect(state().wasteMass_g).toBe(0);
    advance(2.7);
    expect(state().instrumentRinse?.phase).toBe('draining');
    expect(state().instrumentRinse?.dispensed_ml).toBeCloseTo(5, 12);
    expect(state().vessels.rinse_water.volume_ml).toBeCloseTo(20, 12);
    expect(state().wasteMass_g).toBeCloseTo(5, 12);
    expect(wasteWater()).toBeCloseTo(5, 12);
    expect(state().toolContamination.pipette).toBe('NaCl');
    expect(engineDirty().pipette).toBe('NaCl');
    advance(0.2);
    expect(state().instrumentRinse).not.toBeNull();
    advance(0.2);
    expect(state().instrumentRinse).toBeNull();
    expect(state().toolContamination.pipette).toBeNull();
    expect(engineDirty()).toEqual(state().toolContamination);
    expect(state().vessels.rinse_water.mass_g + state().wasteMass_g).toBeCloseTo(25, 12);
    expect(state().wasteContents.reduce((sum, row) => sum + row.moles, 0)).toBeCloseTo(5 / 18.015, 12);
    advance(1);
    expect(state().wasteMass_g).toBeCloseTo(5, 12);
  });

  it('preserves partial wastewater on pause and cancellation without cleaning or refunding it', () => {
    expect(state().cleanTool('stirring_rod').ok).toBe(true);
    advance(1);
    const paused = { session: state().instrumentRinse, bottle: state().vessels.rinse_water,
      wasteMass: state().wasteMass_g, waste: state().wasteContents };
    expect(paused.wasteMass).toBeGreaterThan(0); expect(paused.wasteMass).toBeLessThan(5);
    useAppStore.setState({ isSimulationPaused: true });
    advance(10);
    expect(state().instrumentRinse).toBe(paused.session);
    expect(state().vessels.rinse_water).toBe(paused.bottle);
    expect(state().wasteContents).toBe(paused.waste);
    state().cancelInstrumentRinse();
    expect(state().instrumentRinse).toBeNull();
    expect(state().wasteMass_g).toBe(paused.wasteMass);
    expect(state().toolContamination.stirring_rod).toBe('CuSO4');
    expect(engineDirty()).toEqual(state().toolContamination);
    expect(state().vessels.rinse_water.mass_g + state().wasteMass_g).toBeCloseTo(25, 12);
  });

  it('uses the simulation clock including time scale and rejects invalid frame times', () => {
    state().cleanTool('pipette');
    for (const dt of [NaN, Infinity, -1, 0]) state().tickInstrumentRinse(dt);
    expect(state().instrumentRinse?.elapsed_s).toBe(0);
    state().tickInstrumentRinse(100); // one frame is clamped, not a hundred-second rinse
    expect(state().instrumentRinse?.elapsed_s).toBeCloseTo(0.1, 12);
    useAppStore.setState({ timeScale: 2 });
    state().tickInstrumentRinse(0.1);
    expect(state().instrumentRinse?.elapsed_s).toBeCloseTo(0.3, 12);
    state().tickInstrumentRinse(0.1);
    expect(state().instrumentRinse?.elapsed_s).toBeCloseTo(0.5, 12);
    expect(state().wasteMass_g).toBeCloseTo(0.3, 12);
  });

  it('allows an exactly 5 mL source to empty completely while the tool finishes draining', () => {
    useAppStore.setState(s => ({ vessels: { ...s.vessels, rinse_water: waterBottle(5) } }));
    expect(state().cleanTool('pipette').ok).toBe(true);
    advance(2.9);
    expect(state().instrumentRinse?.phase).toBe('draining');
    expect(state().vessels.rinse_water.volume_ml).toBeCloseTo(0, 12);
    expect(state().toolContamination.pipette).toBe('NaCl');
    advance(0.5);
    expect(state().instrumentRinse).toBeNull();
    expect(state().wasteMass_g).toBeCloseTo(5, 12);
    expect(engineDirty().pipette).toBeNull();
  });

  it.each(['missing', 'empty-ledger', 'impure', 'solid-water', 'qualified-solid', 'qualified-gas',
    'contradictory-liquid-metadata', 'zero-water-mass', 'zero-water-moles', 'insufficient', 'sealed', 'locked', 'wrong-vessel'] as const)(
    'rejects %s water without creating a session or changing material', kind => {
      const bottle = waterBottle(kind === 'insufficient' ? 4.999 : 25);
      if (kind === 'empty-ledger') bottle.contents = [];
      if (kind === 'impure') bottle.contents.push({ formula: 'UnknownSolute', phase: 'aq', mass_g: 0.001, moles: 0.001 });
      if (kind === 'solid-water') bottle.contents[0].phase = 's';
      if (kind === 'qualified-solid') { bottle.contents[0].formula = 'H2O(s)'; bottle.contents[0].phase = undefined; }
      if (kind === 'qualified-gas') { bottle.contents[0].formula = 'H2O(g)'; bottle.contents[0].phase = undefined; }
      if (kind === 'contradictory-liquid-metadata') { bottle.contents[0].formula = 'H2O(s)'; bottle.contents[0].state = 'liquid'; }
      if (kind === 'zero-water-mass') bottle.contents[0].mass_g = 0;
      if (kind === 'zero-water-moles') bottle.contents[0].moles = 0;
      if (kind === 'sealed') bottle.isSealed = true;
      if (kind === 'locked') bottle.isLocked = true;
      if (kind === 'wrong-vessel') bottle.type = 'beaker';
      useAppStore.setState({ vessels: kind === 'missing' ? { rinse_receiver: receiver() } : { rinse_water: bottle, rinse_receiver: receiver() } });
      const before = state().vessels;
      expect(rinseInstrument('pipette').ok).toBe(false);
      expect(state().instrumentRinse).toBeNull();
      expect(state().vessels).toBe(before); expect(state().wasteMass_g).toBe(0);
      expect(state().toolContamination.pipette).toBe('NaCl');
    });

  it('requires an empty sample and running stationary tools, then blocks competing operations while rinsing', () => {
    for (const patch of [{ isSimulationPaused: true }, { moveMode: true }]) {
      useAppStore.setState(patch); expect(state().cleanTool('pipette').ok).toBe(false);
      useAppStore.setState({ isSimulationPaused: false, moveMode: false });
    }
    state().setPipetteSample({ volume_ml: 1, mass_g: 1, temperature_c: 25, color: '#fff', substances: ['H2O'],
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 1, moles: 1 / 18.015 }] });
    expect(state().cleanTool('pipette').ok).toBe(false);
    state().setPipetteSample(null);
    state().setSpatulaScoop('Fe', 0.1, '#777');
    expect(state().cleanTool('spatula').ok).toBe(false);
    state().setSpatulaScoop(null);
    expect(state().cleanTool('pipette').ok).toBe(true);
    useAppStore.setState({ selectedVesselId: 'rinse_water' });
    expect(aspiratePipette(1).ok).toBe(false);
    expect(state().vessels.rinse_water.volume_ml).toBe(25);
    expect(state().pipetteSample).toBeNull();
  });

  it('rejects a reserved spatula even when its visible scoop is empty and a delayed rejected contact will refund it', async () => {
    const gate = deferred();
    useAppStore.setState({ mixSubstances: async () => { await gate.promise; throw new Error('Deferred rejection'); } });
    state().setSpatulaScoop('Fe', 1, '#777');
    expect(state().beginSpatulaDose('rinse_receiver')).toBe(true);
    const dose = state().pouringChemical!;
    expect(state().spatulaState.mass_g).toBe(0);
    expect(state().cleanTool('spatula').ok).toBe(false);
    const pending = state().advancePourContact(dose.id, 1);
    state().clearPour(dose.id);
    expect(state().pouringChemical).toBeNull(); expect(state().stockDosePending).toBe(true);
    expect(state().spatulaState.mass_g).toBe(0);
    expect(state().cleanTool('spatula').ok).toBe(false);
    gate.resolve(); await pending;
    expect(state().stockDosePending).toBe(false);
    expect(state().spatulaState.mass_g).toBeCloseTo(1, 12);
    expect(state().vessels.rinse_receiver.mass_g).toBe(0);
    expect(state().cleanTool('spatula').ok).toBe(false);
    expect(state().instrumentRinse).toBeNull(); expect(state().wasteMass_g).toBe(0);
  });

  it('stops an invalidated water source with conserved collected water and unchanged contamination', () => {
    state().cleanTool('pipette'); advance(1);
    const used = state().wasteMass_g;
    useAppStore.setState(s => ({ vessels: { ...s.vessels, rinse_water: { ...s.vessels.rinse_water, isSealed: true } } }));
    advance(0.1);
    expect(state().instrumentRinse).toBeNull();
    expect(state().wasteMass_g).toBe(used);
    expect(state().vessels.rinse_water.mass_g + used).toBeCloseTo(25, 12);
    expect(engineDirty().pipette).toBe('NaCl');
  });

  it('cancels before accepting an incoming pipette sample even if its volume is zero', () => {
    state().cleanTool('pipette'); advance(1);
    const used = state().wasteMass_g;
    state().setPipetteSample({ volume_ml: 0, mass_g: 0.001, temperature_c: 25, color: '#fff', substances: ['NaCl'],
      contents: [{ formula: 'NaCl', phase: 'aq', mass_g: 0.001, moles: 0.001 / 58.44 }] });
    expect(state().instrumentRinse).toBeNull();
    expect(state().pipetteSample?.mass_g).toBe(0.001);
    expect(state().pipetteSample?.contents[0].moles).toBeCloseTo(0.001 / 58.44, 12);
    expect(state().wasteMass_g).toBe(used);
    expect(engineDirty().pipette).toBe('NaCl');
    advance(5);
    expect(state().cleanTool('pipette').ok).toBe(false);
    expect(state().pipetteSample?.mass_g).toBe(0.001);
  });

  it('cancels before a pipette material transaction while preserving both source and arriving aliquot', () => {
    state().cleanTool('pipette'); advance(1);
    const used = state().wasteMass_g;
    const transfer = withdrawAliquot(state().vessels.rinse_water, 2);
    state().commitPipetteTransfer({ vessel: transfer.vessel, sample: transfer.sample, withdrawal: true });
    expect(state().instrumentRinse).toBeNull();
    expect(state().pipetteSample?.mass_g).toBeCloseTo(2, 12);
    expect(state().wasteMass_g).toBe(used);
    expect(state().vessels.rinse_water.mass_g + state().wasteMass_g + state().pipetteSample!.mass_g).toBeCloseTo(25, 12);
    expect(engineDirty().pipette).toBe('NaCl');
    advance(5);
    expect(state().wasteMass_g).toBe(used);
  });

  it('blocks history while washing, then restores both engine hygiene and finite water on undo/redo', () => {
    state().cleanTool('pipette'); advance(1);
    const session = state().instrumentRinse, water = state().vessels.rinse_water.volume_ml, waste = state().wasteMass_g;
    state().undo(); state().redo();
    expect(state().instrumentRinse).toBe(session);
    expect(state().vessels.rinse_water.volume_ml).toBe(water); expect(state().wasteMass_g).toBe(waste);
    advance(3);
    expect(engineDirty().pipette).toBeNull();
    state().undo();
    expect(state().vessels.rinse_water.volume_ml).toBe(25); expect(state().wasteMass_g).toBe(0);
    expect(state().toolContamination.pipette).toBe('NaCl'); expect(engineDirty()).toEqual(state().toolContamination);
    state().redo();
    expect(state().vessels.rinse_water.volume_ml).toBeCloseTo(20, 12); expect(state().wasteMass_g).toBeCloseTo(5, 12);
    expect(state().toolContamination.pipette).toBeNull(); expect(engineDirty()).toEqual(state().toolContamination);
  });

  it('checkpoints cancellation and resets without allowing an old rinse tick to write into the new bench', () => {
    state().cleanTool('stirring_rod'); advance(1);
    const used = state().wasteMass_g;
    state().cancelInstrumentRinse();
    state().undo();
    expect(state().vessels.rinse_water.volume_ml).toBe(25); expect(state().wasteMass_g).toBe(0);
    state().redo();
    expect(state().wasteMass_g).toBe(used); expect(engineDirty().stirring_rod).toBe('CuSO4');
    state().cleanTool('stirring_rod'); advance(0.5);
    const oldTick = state().tickInstrumentRinse;
    state().resetWorkbench();
    const reset = JSON.stringify({ vessels: state().vessels, waste: state().wasteContents });
    expect(state().instrumentRinse).toBeNull();
    expect(Object.values(engineDirty()).every(value => value === null)).toBe(true);
    expect(engineDirty()).toEqual(state().toolContamination);
    for (let frame = 0; frame < 100; frame++) oldTick(0.1);
    expect(JSON.stringify({ vessels: state().vessels, waste: state().wasteContents })).toBe(reset);
  });

  it('removes the old rinse immediately when a paused workbench loads a new preset', () => {
    expect(state().cleanTool('pipette').ok).toBe(true); advance(1);
    const usedWater = state().wasteMass_g, usedContents = structuredClone(state().wasteContents), epoch = state().pourEpoch;
    expect(usedWater).toBeGreaterThan(0);
    state().setSimulationPaused(true);
    state().setupExperimentPreset('acid_base_titration');
    expect(state().pourEpoch).toBe(epoch + 1);
    expect(state().instrumentRinse).toBeNull();
    expect(state().isSimulationPaused).toBe(true);
    expect(state().vessels.rinse_water).toBeUndefined();
    expect(state().wasteMass_g).toBe(usedWater); expect(state().wasteContents).toEqual(usedContents);
    expect(engineDirty().pipette).toBe('NaCl');
    state().tickInstrumentRinse(.1);
    expect(state().wasteMass_g).toBe(usedWater);
    expect(state().instrumentRinse).toBeNull();
  });
});
