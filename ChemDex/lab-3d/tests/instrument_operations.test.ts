import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { useToolDockStore } from '../src/handling/toolDock';
import { aspiratePipette, dispensePipette, tareBalance, balanceReading, alignSelectedVessel, dispenseOneBuretteDrop,
  currentInstrumentPosition, positionInstrument, returnInstrumentHome, rinseInstrument, setBuretteValve } from '../src/handling/instrumentOperations';
import { readInstrument } from '../src/handling/instrumentReadings';
import { restingToolHeight } from '../src/handling/handheldRest';
import type { VesselState } from '../src/types/chemistry';
import { LAB_GEOMETRY } from '../src/core/labGeometry';
import { BURETTE_BASE_SIZE, BURETTE_HOME, BURETTE_MIN_Z, BURETTE_POST_Z, buretteStandSupport } from '../src/handling/burettePlacement';
import { vesselWorldDimensions } from '../src/science/vesselScale';

function vessel(id: string, x: number, volume = 20): VesselState {
  return {
    id, name: id, type: 'beaker', capacity_ml: 100,
    volume_ml: volume, volume: volume / 100, mass_g: volume,
    temperature_c: 25, ph: 7, position: [x, -0.135, 0],
    rotationY: 0, isLocked: false, substances: ['NaCl'],
    contents: [{ formula: 'NaCl', phase: 'aq', moles: volume * 0.0001, mass_g: volume * 0.0001 * 58.44 }],
    hasGas: false, hasPrecipitate: false, isBoiling: false,
  };
}

describe('Shared keyboard and 3D instrument operations', () => {
  beforeEach(() => {
    useAppStore.setState({ vessels: { source: vessel('source', -2), receiver: vessel('receiver', 2, 0) }, vesselIds: ['source', 'receiver'], selectedVesselId: 'source', moveMode: false, isSimulationPaused: false, draggingVesselId: null, activeKinetics: {}, burners: {} });
    useInstrumentStore.setState({ balanceTare_g: 0, notices: [], sequence: 0 });
    useInstrumentStore.getState().clearPipettePresentations();
    useAppStore.getState().setPipetteSample(null);
    useToolDockStore.setState({ positions: {}, dragging: null });
  });

  it('keeps each solute and sample mass across vessel and tool changes', () => {
    expect(aspiratePipette(10).ok).toBe(true);
    expect(useAppStore.getState().vessels.source.volume_ml).toBe(10);
    expect(rinseInstrument('pipette').ok).toBe(false);
    useAppStore.getState().setActiveTool('thermometer');
    useAppStore.getState().setSelectedVesselId('receiver');
    expect(dispensePipette(2.5).ok).toBe(true);
    expect(useAppStore.getState().vessels.receiver.contents.find(item => item.formula === 'NaCl')?.moles).toBeCloseTo(0.00025, 10);
    const state = useAppStore.getState();
    expect(state.vessels.source.mass_g + state.vessels.receiver.mass_g + state.pipetteSample!.mass_g).toBeCloseTo(20, 8);
    expect(state.pipetteSample?.volume_ml).toBe(7.5);
  });

  it('dispenses finite Studio doses into the explicit target while preserving the selected source', () => {
    expect(dispensePipette(0.05, 'receiver').ok).toBe(false);
    expect(useAppStore.getState().vessels.receiver.volume_ml).toBe(0);
    expect(aspiratePipette(0.12).ok).toBe(true);
    const source = useAppStore.getState().vessels.source;
    const beforeMass = source.mass_g + useAppStore.getState().pipetteSample!.mass_g;
    for (const expected of [0.05, 0.05, 0.02]) {
      expect(dispensePipette(0.05, 'receiver').transferred_ml).toBeCloseTo(expected, 10);
    }
    expect(dispensePipette(0.05, 'receiver').ok).toBe(false);
    const state = useAppStore.getState();
    expect(state.selectedVesselId).toBe('source');
    expect(state.vessels.source).toBe(source);
    expect(state.vessels.receiver.volume_ml).toBeCloseTo(0.12, 10);
    expect(state.vessels.receiver.contents.find(item => item.formula === 'NaCl')!.moles).toBeCloseTo(0.000012, 10);
    expect(source.mass_g + state.vessels.receiver.mass_g).toBeCloseTo(beforeMass, 10);
  });

  it('rejects an invalid explicit target without falling back to the selected vessel', () => {
    expect(aspiratePipette(1).ok).toBe(true);
    const sample = useAppStore.getState().pipetteSample;
    const source = useAppStore.getState().vessels.source;
    expect(dispensePipette(0.05, 'missing').ok).toBe(false);
    expect(dispensePipette(0.05, '').ok).toBe(false);
    expect(useAppStore.getState().pipetteSample).toBe(sample);
    expect(useAppStore.getState().vessels.source).toBe(source);
  });

  it('does not create liquid when source is empty, inputs invalid, or target is a lesson', () => {
    useAppStore.getState().setSelectedVesselId('receiver');
    expect(aspiratePipette().ok).toBe(false);
    useAppStore.getState().setSelectedVesselId('source');
    expect(aspiratePipette(Number.NaN).ok).toBe(false);
    useAppStore.setState({ vessels: { lesson_vessel_test: vessel('lesson_vessel_test', 0) }, selectedVesselId: 'lesson_vessel_test' });
    expect(aspiratePipette().ok).toBe(false);
    expect(useAppStore.getState().pipetteSample).toBeNull();
  });

  it('shares TARE and shows a negative reading after the tared vessel is removed', () => {
    positionInstrument('balance', [-2, -0.3, 0]);
    expect(balanceReading()).toBe(105);
    expect(tareBalance().ok).toBe(true);
    expect(balanceReading()).toBe(0);
    useAppStore.getState().setVesselState('source', { position: [-5, -0.135, 0] });
    expect(balanceReading()).toBe(-105);
    expect(readInstrument('balance').value).toBe('-105.000');
  });

  it('aligns the receiver and dispenses a conserved drop at actual concentration', () => {
    useAppStore.getState().setSelectedVesselId('receiver');
    positionInstrument('burette', [4, 0, 2]);
    useAppStore.getState().updateBurette({ reagentFormula: 'NaCl', concentration_M: 0.2, currentVolume_ml: 1 });
    expect(alignSelectedVessel('burette').ok).toBe(true);
    expect(dispenseOneBuretteDrop().transferred_ml).toBeCloseTo(0.05, 8);
    expect(useAppStore.getState().vessels.receiver.contents.find(item => item.formula === 'NaCl')?.moles).toBeCloseTo(0.00001, 10);
  });

  it('raises the tip over a tall flask without lifting or disconnecting the stand', () => {
    const flask = { ...vessel('receiver', 2, 0), type: 'flask' as const, capacity_ml: 250 };
    useAppStore.setState(state => ({ vessels: { ...state.vessels, receiver: flask }, selectedVesselId: flask.id }));
    expect(positionInstrument('burette', [4, 0, 2]).ok).toBe(true);
    expect(alignSelectedVessel('burette').ok).toBe(true);
    const state = useAppStore.getState(), stand = currentInstrumentPosition('burette');
    const support = buretteStandSupport(stand[1]), glass = state.vessels.receiver;
    const { topY, bottomY } = vesselWorldDimensions(glass);
    expect(glass.position[1] + bottomY).toBeCloseTo(LAB_GEOMETRY.tableTop_scene, 12);
    expect(stand[1] - 0.1).toBeGreaterThan(glass.position[1] + topY);
    expect(stand[1] + support.baseCenterY - BURETTE_BASE_SIZE[1] / 2).toBeCloseTo(LAB_GEOMETRY.tableTop_scene, 12);
    expect(support.postCenterY - support.postHeight / 2).toBeLessThan(support.baseCenterY + BURETTE_BASE_SIZE[1] / 2);
    expect(dispenseOneBuretteDrop().ok).toBe(true);
  });

  it('uses the same stand position for drag updates, placement and return home within the tabletop', () => {
    useToolDockStore.setState({ positions: { burette: [9, 0, 0] } });
    useAppStore.getState().updateBurette({ position: [3, 2, -20] });
    const position = currentInstrumentPosition('burette');
    expect(position).toEqual([3, 2, BURETTE_MIN_Z]);
    expect(position[2] + BURETTE_POST_Z - BURETTE_BASE_SIZE[2] / 2).toBeGreaterThan(-LAB_GEOMETRY.tableHalfDepth_scene);
    expect(returnInstrumentHome('burette').ok).toBe(true);
    expect(currentInstrumentPosition('burette')).toEqual(BURETTE_HOME);
  });

  it('blocks every direct burette dispensing path while paused or moving a receiver', () => {
    useAppStore.getState().setSelectedVesselId('receiver');
    positionInstrument('burette', [4, 0, 2]);
    useAppStore.getState().updateBurette({ reagentFormula: 'NaCl', concentration_M: 0.2, currentVolume_ml: 1 });
    expect(alignSelectedVessel('burette').ok).toBe(true);
    const before = useAppStore.getState().burette.currentVolume_ml;
    useAppStore.setState({ isSimulationPaused: true });
    expect(dispenseOneBuretteDrop().ok).toBe(false);
    expect(setBuretteValve(true).ok).toBe(false);
    useAppStore.getState().toggleBuretteStopcock();
    expect(useAppStore.getState().burette.currentVolume_ml).toBe(before);
    expect(useAppStore.getState().burette.isDispensing).toBe(false);
    useAppStore.setState({ isSimulationPaused: false, draggingVesselId: 'receiver' });
    expect(dispenseOneBuretteDrop().ok).toBe(false);
    expect(setBuretteValve(true).ok).toBe(false);
    useAppStore.getState().dispenseBuretteDrop('receiver');
    expect(useAppStore.getState().burette.currentVolume_ml).toBe(before);
  });

  it('rejects nonfinite placement and preserves each fixed resting height', () => {
    expect(positionInstrument('pipette', [NaN, 0, 0]).ok).toBe(false);
    expect(positionInstrument('pipette', [100, 999, -100]).ok).toBe(true);
    expect(useToolDockStore.getState().positions.pipette).toEqual([10, restingToolHeight('pipette', 0), -4.5]);
  });

  it('reports dry pH as unavailable', () => {
    useAppStore.getState().setSelectedVesselId('receiver');
    expect(readInstrument('ph_meter').valid).toBe(false);
    expect(readInstrument('ph_meter').value).toBe('---');
  });
});
