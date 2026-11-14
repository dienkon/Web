import { describe, it, expect, vi } from 'vitest';
import { stepLabWorld, LabWorldEffects, LabWorldStepInput } from '../labWorldStep';
import { DEFAULT_LAB_ENVIRONMENT } from '../../chemistry/physical/environmentPhysics';
import { DEFAULT_PPE_STATE } from '../safetyEngine2D';
import { EquipmentState } from '../../types/equipment';

function makeNoopEffects(): LabWorldEffects {
  return {
    sound: {
      ignite: vi.fn(),
      fizz: vi.fn(),
      success: vi.fn(),
      playWarningAlarm: vi.fn(),
      playExplosion: vi.fn(),
      playSolidDrop: vi.fn(),
      drip: vi.fn(),
      pour: vi.fn(),
      click: vi.fn(),
      playCorkPop: vi.fn(),
      playBumpingSurge: vi.fn(),
      playSpongeWipe: vi.fn(),
    },
    vfx: {
      triggerColorMixing: vi.fn(),
      triggerController: vi.fn(),
      triggerGlassShatter: vi.fn(),
    },
  };
}

function makeBaseInput(equipment: Record<string, EquipmentState>): LabWorldStepInput {
  return {
    equipment,
    realtimeKinetics: false,
    simTimeScale: 1,
    activePour: null,
    activePourVfx: null,
    activeExternalDoses: [],
    workbenchEscapedGas_g: {},
    spillPuddles: [],
    safetyAlerts: [],
    ppe: { ...DEFAULT_PPE_STATE },
  };
}

describe('stepLabWorld pure simulation kernel', () => {
  it('returns shouldApplyPatch = false when vessels are equilibrated at ambient temperature', () => {
    const beaker: EquipmentState = {
      id: 'b1',
      name: '250 mL Beaker',
      name_vi: 'Cốc 250 mL',
      type: 'beaker',
      x: 200,
      y: 200,
      width: 140,
      height: 160,
      capacity_ml: 250,
      isContainer: true,
      temperature_c: 25,
      contents: [{ formula: 'H2O', moles: 50 / 18.015, mass_g: 50, state: 'l' }],
      volume_ml: 50,
      mass_g: 145,
      tare_g: 95,
      ph: 7,
      isSealed: false,
      internalPressure_atm: 1.0,
      mixedness: 1,
    };

    const res = stepLabWorld(makeBaseInput({ b1: beaker }), 0.08, DEFAULT_LAB_ENVIRONMENT, makeNoopEffects(), 1000);
    expect(res.shouldApplyPatch).toBe(false);
    expect(res.spillsOnlyChanged).toBe(false);
    expect(res.newLogs).toHaveLength(0);
  });

  it('heats an aligned beaker above an active Bunsen burner', () => {
    const burner: EquipmentState = {
      id: 'burn1',
      name: 'Bunsen Burner',
      name_vi: 'Đèn Bunsen',
      type: 'bunsen_burner',
      x: 220,
      y: 310,
      width: 100,
      height: 140,
      capacity_ml: 0,
      isContainer: false,
      temperature_c: 25,
      contents: [],
      volume_ml: 0,
      mass_g: 250,
      ph: 7,
      isOn: true,
      fuelLevel_ml: 100,
    };
    const beaker: EquipmentState = {
      id: 'b1',
      name: '250 mL Beaker',
      name_vi: 'Cốc 250 mL',
      type: 'beaker',
      x: 200,
      y: 160,
      width: 140,
      height: 160,
      capacity_ml: 250,
      isContainer: true,
      temperature_c: 25,
      contents: [{ formula: 'H2O', moles: 50 / 18.015, mass_g: 50, state: 'l' }],
      volume_ml: 50,
      mass_g: 145,
      tare_g: 95,
      ph: 7,
      mixedness: 1,
    };

    const res = stepLabWorld(
      makeBaseInput({ burn1: burner, b1: beaker }),
      0.5,
      DEFAULT_LAB_ENVIRONMENT,
      makeNoopEffects(),
      2000
    );
    expect(res.shouldApplyPatch).toBe(true);
    expect(res.patch.equipment.b1.temperature_c).toBeGreaterThan(25);
    expect(res.patch.equipment.b1.isBeingHeated).toBe(true);
    expect(res.patch.equipment.burn1.fuelLevel_ml).toBeLessThan(100);
  });

  it('automatically extinguishes active Bunsen burners in inert (0% O2) atmosphere', () => {
    const burner: EquipmentState = {
      id: 'burn1',
      name: 'Bunsen Burner',
      name_vi: 'Đèn Bunsen',
      type: 'bunsen_burner',
      x: 200,
      y: 300,
      width: 100,
      height: 140,
      capacity_ml: 0,
      isContainer: false,
      temperature_c: 25,
      contents: [],
      volume_ml: 0,
      mass_g: 250,
      ph: 7,
      isOn: true,
    };

    const res = stepLabWorld(
      makeBaseInput({ burn1: burner }),
      0.08,
      { ...DEFAULT_LAB_ENVIRONMENT, oxygenFraction: 0 },
      makeNoopEffects(),
      3000
    );
    expect(res.shouldApplyPatch).toBe(true);
    expect(res.patch.equipment.burn1.isOn).toBe(false);
  });
});
