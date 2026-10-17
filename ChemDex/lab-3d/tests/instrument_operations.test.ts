import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { useToolDockStore } from '../src/handling/toolDock';
import { aspiratePipette, dispensePipette, tareBalance, balanceReading, alignSelectedVessel, dispenseOneBuretteDrop, positionInstrument, rinseInstrument } from '../src/handling/instrumentOperations';
import { readInstrument } from '../src/handling/instrumentReadings';
import { restingToolHeight } from '../src/handling/handheldRest';
import type { VesselState } from '../src/types/chemistry';

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
    useAppStore.setState({ vessels: { source: vessel('source', -2), receiver: vessel('receiver', 2, 0) }, vesselIds: ['source', 'receiver'], selectedVesselId: 'source', moveMode: false, activeKinetics: {}, burners: {} });
    useInstrumentStore.setState({ pipetteSample: null, balanceTare_g: 0, notices: [], sequence: 0 });
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
    expect(state.vessels.source.mass_g + state.vessels.receiver.mass_g + useInstrumentStore.getState().pipetteSample!.mass_g).toBeCloseTo(20, 8);
    expect(useInstrumentStore.getState().pipetteSample?.volume_ml).toBe(7.5);
  });

  it('dispenses finite Studio doses into the explicit target while preserving the selected source', () => {
    expect(dispensePipette(0.05, 'receiver').ok).toBe(false);
    expect(useAppStore.getState().vessels.receiver.volume_ml).toBe(0);
    expect(aspiratePipette(0.12).ok).toBe(true);
    const source = useAppStore.getState().vessels.source;
    const beforeMass = source.mass_g + useInstrumentStore.getState().pipetteSample!.mass_g;
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
    const sample = useInstrumentStore.getState().pipetteSample;
    const source = useAppStore.getState().vessels.source;
    expect(dispensePipette(0.05, 'missing').ok).toBe(false);
    expect(dispensePipette(0.05, '').ok).toBe(false);
    expect(useInstrumentStore.getState().pipetteSample).toBe(sample);
    expect(useAppStore.getState().vessels.source).toBe(source);
  });

  it('does not create liquid when source is empty, inputs invalid, or target is a lesson', () => {
    useAppStore.getState().setSelectedVesselId('receiver');
    expect(aspiratePipette().ok).toBe(false);
    useAppStore.getState().setSelectedVesselId('source');
    expect(aspiratePipette(Number.NaN).ok).toBe(false);
    useAppStore.setState({ vessels: { lesson_vessel_test: vessel('lesson_vessel_test', 0) }, selectedVesselId: 'lesson_vessel_test' });
    expect(aspiratePipette().ok).toBe(false);
    expect(useInstrumentStore.getState().pipetteSample).toBeNull();
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
