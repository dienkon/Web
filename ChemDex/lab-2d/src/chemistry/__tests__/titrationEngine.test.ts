import { describe, expect, it } from 'vitest';
import {
  buildPresetSimulationInput,
  simulateEquilibriumTitration,
  TITRATION_PRESETS,
} from '../equilibrium/titrationEngine';
import { useLabStore } from '../../store/useLabStore';

describe('Dynamic Equilibrium Titration Engine', () => {
  it('simulates strong acid + strong base (HCl 0.1M 25 mL + NaOH 0.1M) with exact V_eq=25 mL, pH=7.00', () => {
    const preset = TITRATION_PRESETS.find((p) => p.id === 'hcl_naoh')!;
    const res = simulateEquilibriumTitration(buildPresetSimulationInput(preset));

    expect(res.equivalencePoints).toHaveLength(1);
    expect(Math.abs(res.equivalencePoints[0].volume_ml - 25.0)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(res.equivalencePoints[0].ph - 7.0)).toBeLessThan(0.5);
    expect(res.initialPh).toBeCloseTo(1.0, 1);
    expect(res.finalPh).toBeGreaterThan(12.2);

    // Conductometric minimum occurs right at V = 25 mL
    const minCondPoint = res.points.reduce((best, p) =>
      p.conductivity_mS_cm < best.conductivity_mS_cm ? p : best
    );
    expect(Math.abs(minCondPoint.volumeAdded_ml - 25.0)).toBeLessThanOrEqual(0.5);
  });

  it('captures weak acid + strong base (CH3COOH + NaOH) buffer plateau at V1/2 and alkaline equivalence pH ~8.7', () => {
    const preset = TITRATION_PRESETS.find((p) => p.id === 'ch3cooh_naoh')!;
    const res = simulateEquilibriumTitration(buildPresetSimulationInput(preset));

    expect(res.equivalencePoints).toHaveLength(1);
    expect(Math.abs(res.equivalencePoints[0].volume_ml - 25.0)).toBeLessThanOrEqual(0.25);
    expect(res.equivalencePoints[0].ph).toBeGreaterThan(8.0);
    expect(res.equivalencePoints[0].ph).toBeLessThan(9.3);

    expect(res.halfEquivalence).not.toBeNull();
    expect(Math.abs(res.halfEquivalence!.halfEquivalenceVolume_ml - 12.5)).toBeLessThan(0.25);
    expect(Math.abs(res.halfEquivalence!.phAtHalfEq - 4.74)).toBeLessThan(0.15);
  });

  it('captures weak base + strong acid (NH3 + HCl) acidic equivalence pH ~5.3', () => {
    const preset = TITRATION_PRESETS.find((p) => p.id === 'nh3_hcl')!;
    const res = simulateEquilibriumTitration(buildPresetSimulationInput(preset));

    expect(res.equivalencePoints).toHaveLength(1);
    expect(Math.abs(res.equivalencePoints[0].volume_ml - 25.0)).toBeLessThanOrEqual(0.25);
    expect(res.equivalencePoints[0].ph).toBeGreaterThan(4.7);
    expect(res.equivalencePoints[0].ph).toBeLessThan(6.0);
    expect(res.initialPh).toBeGreaterThan(11.0);
    expect(res.finalPh).toBeLessThan(2.0);
  });

  it('resolves two equivalence peaks for diprotic Na2CO3 (0.1M 25 mL) titrated with HCl (0.1M)', () => {
    const preset = TITRATION_PRESETS.find((p) => p.id === 'na2co3_hcl')!;
    const res = simulateEquilibriumTitration(buildPresetSimulationInput(preset));

    expect(res.equivalencePoints.length).toBeGreaterThanOrEqual(2);
    expect(Math.abs(res.equivalencePoints[0].volume_ml - 25.0)).toBeLessThanOrEqual(0.6);
    expect(res.equivalencePoints[0].ph).toBeGreaterThan(7.5);
    expect(res.equivalencePoints[0].ph).toBeLessThan(9.0);

    expect(Math.abs(res.equivalencePoints[1].volume_ml - 50.0)).toBeLessThanOrEqual(0.6);
    expect(res.equivalencePoints[1].ph).toBeGreaterThan(3.0);
    expect(res.equivalencePoints[1].ph).toBeLessThan(5.0);
  });

  it('resolves two equivalence peaks for polyprotic H3PO4 (0.1M 25 mL) titrated with NaOH (0.1M)', () => {
    const preset = TITRATION_PRESETS.find((p) => p.id === 'h3po4_naoh')!;
    const res = simulateEquilibriumTitration(buildPresetSimulationInput(preset));

    expect(res.equivalencePoints.length).toBeGreaterThanOrEqual(2);
    expect(Math.abs(res.equivalencePoints[0].volume_ml - 25.0)).toBeLessThanOrEqual(0.6);
    expect(res.equivalencePoints[0].ph).toBeGreaterThan(4.0);
    expect(res.equivalencePoints[0].ph).toBeLessThan(5.5);

    expect(Math.abs(res.equivalencePoints[1].volume_ml - 50.0)).toBeLessThanOrEqual(0.6);
    expect(res.equivalencePoints[1].ph).toBeGreaterThan(9.0);
    expect(res.equivalencePoints[1].ph).toBeLessThan(10.5);
  });

  it('sets up bench preset cleanly and records live burette titrationTrace points', () => {
    const store = useLabStore.getState();
    store.setupTitrationPreset('hcl_naoh');
    const afterSetup = useLabStore.getState();
    const eqList = Object.values(afterSetup.equipment);
    const burette = eqList.find((e) => e.type === 'burette')!;
    const flask = eqList.find((e) => e.type === 'erlenmeyer_flask')!;

    expect(burette).toBeDefined();
    expect(flask).toBeDefined();
    expect(flask.ph).toBeLessThan(1.5);
    expect(afterSetup.titrationTrace).toHaveLength(0);

    // Open stopcock (1.0 mL aliquot) and dispense past equivalence point (25.0 mL)
    afterSetup.setSimTimeScale(5);
    afterSetup.toggleBuretteStopcock(burette.id);
    for (let i = 0; i < 32; i++) {
      useLabStore.getState().tickSimulation(0.5);
    }

    const recorded = useLabStore.getState().titrationTrace;
    expect(recorded.length).toBeGreaterThanOrEqual(20);
    expect(recorded[0].volumeAdded_ml).toBe(0);
    expect(recorded[0].ph).toBeLessThan(1.5);
    expect(recorded[recorded.length - 1].volumeAdded_ml).toBeGreaterThan(26);
    expect(recorded[recorded.length - 1].ph).toBeGreaterThan(10.5);
    expect(recorded[recorded.length - 1].conductivity_mS_cm).toBeGreaterThan(0);

    // Midpoint salt equivalence conductivity should dip below both acidic start and basic excess
    const eqSample = recorded.reduce((best, pt) =>
      Math.abs(pt.volumeAdded_ml - 25) < Math.abs(best.volumeAdded_ml - 25) ? pt : best
    );
    expect(eqSample.conductivity_mS_cm).toBeLessThan(recorded[0].conductivity_mS_cm);

    useLabStore.getState().setSimTimeScale(1);
    useLabStore.getState().clearTitrationTrace();
    expect(useLabStore.getState().titrationTrace).toHaveLength(0);
  });
});
