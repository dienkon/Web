import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { getProgramById } from '../src/vfx/programs/library';
import { planStudioProgram } from '../src/engine/studioProgram';
import { computeMolarMass } from '../src/engine/ledger';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));

const row = (formula: string, moles: number, phase = 'aq'): SubstanceContent => ({
  formula,
  moles,
  phase,
  mass_g: moles * computeMolarMass(formula),
});

describe('removeVessel cleanup while active or paused', () => {
  it('clears active kinetics, pending reactions, stirring, and litmus state immediately even when paused', () => {
    const program = getProgramById('cuso4_naoh')!;
    const contents = [row('CuSO4', 0.01), row('NaOH', 0.02), row('H2O', 30 / 18.015, 'l')];
    const vessel: VesselState = {
      id: 'v_remove_test',
      name: 'Beaker',
      type: 'beaker',
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      capacity_ml: 250,
      volume_ml: 30,
      volume: 30 / 250,
      contents,
      substances: contents.map(c => c.formula),
      mass_g: contents.reduce((sum, c) => sum + c.mass_g, 0),
      temperature_c: 25,
      ph: 7,
      hasGas: false,
      hasPrecipitate: false,
      isBoiling: false,
      liquidColor: '#93c5fd',
    };
    const planned = planStudioProgram(program, vessel, 'vi');
    expect(planned.kinetics).not.toBeNull();

    useAppStore.setState({
      vessels: { [vessel.id]: vessel },
      vesselIds: [vessel.id],
      selectedVesselId: vessel.id,
      stirringVesselId: vessel.id,
      activeLitmusVesselId: vessel.id,
      activeKinetics: { [vessel.id]: planned.kinetics! },
      pendingReactions: {
        [vessel.id]: {
          vesselId: vessel.id,
          equation: program.chemistry.equation,
          minTemp_c: 80,
          createdAt: 1,
        } as any,
      },
      dissolvingSubstances: { [vessel.id]: { CuSO4: 0.5 } },
      isSimulationPaused: true,
    });

    useAppStore.getState().removeVessel(vessel.id);

    const state = useAppStore.getState();
    expect(state.vessels[vessel.id]).toBeUndefined();
    expect(state.vesselIds).not.toContain(vessel.id);
    expect(state.selectedVesselId).toBeNull();
    expect(state.stirringVesselId).toBeNull();
    expect(state.activeLitmusVesselId).toBeNull();
    expect(state.activeKinetics[vessel.id]).toBeUndefined();
    expect(state.pendingReactions[vessel.id]).toBeUndefined();
    expect(state.dissolvingSubstances[vessel.id]).toBeUndefined();
  });

  it('ignores removal of a non-existent vessel without modifying state', () => {
    useAppStore.setState({ vessels: {}, vesselIds: [], selectedVesselId: null });
    const before = useAppStore.getState().vessels;
    useAppStore.getState().removeVessel('missing_id');
    expect(useAppStore.getState().vessels).toBe(before);
  });
});
