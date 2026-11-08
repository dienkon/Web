import { describe, it, expect } from 'vitest';
import { runSimulationCycle } from '../chemistry/reactions/engine';
import { stepVesselPressureAndDamage } from '../engine/headspacePressure2D';
import { mergeAndReactSpills, neutralizeSpillWithNaHCO3 } from '../engine/spillChemistry2D';
import { checkAcidDilutionHazard, evaluateWorkbenchSafety, DEFAULT_PPE_STATE } from '../engine/safetyEngine2D';
import { EquipmentState, SpillPuddle } from '../types/equipment';

describe('ChemDex 2D — Lab-3D Reaction & Physics Parity Suite', () => {
  it('resolves PbI2 Golden Rain precipitation with hexagonal plates morphology and pbi2_golden_rain controller', () => {
    const res = runSimulationCycle(
      [
        { formula: 'Pb(NO3)2', moles: 0.02, mass_g: 6.62, state: 'aq' },
        { formula: 'KI', moles: 0.04, mass_g: 6.64, state: 'aq' },
        { formula: 'H2O', moles: 2.5, mass_g: 45, state: 'l' },
      ],
      50,
      25
    );

    expect(res.hasPrecipitate).toBe(true);
    expect(res.precipitateInfo?.formula).toBe('PbI2');
    expect(['plates', 'crystalline']).toContain(res.precipitateInfo?.morphology);
    expect(res.activeControllerIds).toContain('pbi2_golden_rain');
    expect(res.precipitateLayers?.find(l => l.formula === 'PbI2')?.morphology).toBe('plates');
  });

  it('resolves multi-stage amphoteric Al(OH)3 precipitation and redissolution in excess NaOH', () => {
    // Stage 1: Stoichiometric OH- produces Al(OH)3 gelatinous precipitate
    const stage1 = runSimulationCycle(
      [
        { formula: 'AlCl3', moles: 0.02, mass_g: 2.66, state: 'aq' },
        { formula: 'NaOH', moles: 0.06, mass_g: 2.4, state: 'aq' },
        { formula: 'H2O', moles: 2.5, mass_g: 45, state: 'l' },
      ],
      50,
      25
    );
    expect(stage1.hasPrecipitate).toBe(true);
    expect(stage1.precipitateInfo?.formula).toBe('Al(OH)3');

    // Stage 2: Adding excess NaOH dissolves Al(OH)3 into soluble Na[Al(OH)4]
    const stage2Contents = [
      ...stage1.updatedContents,
      { formula: 'NaOH', moles: 0.03, mass_g: 1.2, state: 'aq' as const },
    ];
    const stage2 = runSimulationCycle(stage2Contents, 60, stage1.finalTemperature_c);
    expect(stage2.updatedContents.some(c => c.formula === 'Na[Al(OH)4]')).toBe(true);
    expect(stage2.hasPrecipitate).toBe(false);
    expect(stage2.activeControllerIds).toContain('aloh3_amphoteric');
  });

  it('resolves multi-stage Cu(OH)2 precipitation and royal-blue [Cu(NH3)4]2+ complexation in excess NH3', () => {
    const res = runSimulationCycle(
      [
        { formula: 'Cu(OH)2', moles: 0.01, mass_g: 0.975, state: 's' },
        { formula: 'NH3', moles: 0.06, mass_g: 1.02, state: 'aq' },
        { formula: 'H2O', moles: 2.5, mass_g: 45, state: 'l' },
      ],
      50,
      25
    );

    expect(res.hasPrecipitate).toBe(false);
    expect(res.finalLiquidColorHex).toBe('#1d4ed8');
    expect(res.activeControllerIds).toContain('cuso4_nh3_multistage');
  });

  it('models direct copper surface plating (#b85d3b) onto submerged Iron nail in Fe + CuSO4', () => {
    const res = runSimulationCycle(
      [
        { formula: 'Fe', moles: 0.03, mass_g: 1.68, state: 's' },
        { formula: 'CuSO4', moles: 0.015, mass_g: 2.4, state: 'aq' },
        { formula: 'H2O', moles: 2.5, mass_g: 45, state: 'l' },
      ],
      50,
      25
    );

    expect(res.surfacePlating).toBeDefined();
    expect(res.surfacePlating?.substrateFormula).toBe('Fe');
    expect(res.surfacePlating?.coatingColorHex).toBe('#b85d3b');
    const feNail = res.solidChunks?.find(c => c.morphology === 'nail');
    expect(feNail).toBeDefined();
    expect(feNail?.coatingColorHex).toBe('#b85d3b');
  });

  it('triggers Potassium + Water pyrotechnic skittering with lilac flame and alkaline pH', () => {
    const res = runSimulationCycle(
      [
        { formula: 'K', moles: 0.02, mass_g: 0.78, state: 's' },
        { formula: 'H2O', moles: 3.0, mass_g: 54, state: 'l' },
      ],
      55,
      25
    );

    expect(res.isExplosion).toBe(true);
    expect(res.hasGas).toBe(true);
    expect(res.gasInfo?.formula).toBe('H2');
    expect(res.finalPh).toBeGreaterThan(12);
    expect(res.activeControllerIds).toContain('k_water_skitter');
    expect(res.flameTestColorHex).toBe('#c084fc');
  });

  it('triggers thermal sublimation of solid Iodine (I2) when heated', () => {
    const res = runSimulationCycle(
      [{ formula: 'I2', moles: 0.01, mass_g: 2.54, state: 's' }],
      10,
      65,
      true
    );

    expect(res.hasSublimation).toBe(true);
    expect(res.fumeType).toBe('iodine');
    expect(res.activeControllerIds).toContain('iodine_sublimation');
  });

  it('computes Ideal Gas Law headspace pressure PV=nRT, popping cork at >1.8 atm and shattering glass on thermal shock', () => {
    const baseVessel: EquipmentState = {
      id: 'flask_1',
      name: '250 mL Flask',
      name_vi: 'Bình tam giác',
      type: 'erlenmeyer_flask',
      x: 100,
      y: 100,
      width: 150,
      height: 180,
      capacity_ml: 250,
      isContainer: true,
      temperature_c: 60,
      volume_ml: 150, // 100 mL headspace
      mass_g: 260,
      ph: 7,
      isSealed: true,
      contents: [
        { formula: 'H2O', moles: 8.3, mass_g: 150, state: 'l' },
        { formula: 'CO2', moles: 0.004, mass_g: 0.176, state: 'g' },
      ],
    };

    // 1. Cork pop when internal pressure exceeds 1.8 atm
    const popRes = stepVesselPressureAndDamage(baseVessel, 0.1, 58, 100);
    expect(popRes.corkPopped).toBe(true);
    expect(popRes.isSealed).toBe(false);

    // 2. Thermal shock shatter when ΔT >= 120°C
    const hotVessel: EquipmentState = { ...baseVessel, isSealed: false, temperature_c: 180 };
    const shatterRes = stepVesselPressureAndDamage(hotVessel, 0.1, 25, 100);
    expect(shatterRes.isShattered).toBe(true);
    expect(shatterRes.spillCreated).toBeDefined();
    expect(shatterRes.spillCreated?.hasGlassShards).toBe(true);
    expect(shatterRes.spillCreated?.volume_ml).toBe(150);
  });

  it('executes active spill chemistry when two spills merge or when neutralized with NaHCO3', () => {
    const acidSpill: SpillPuddle = {
      id: 'spill_a',
      x: 200,
      y: 300,
      colorHex: '#f8fafc',
      volume_ml: 20,
      formula: 'HCl',
      contents: [
        { formula: 'HCl', moles: 0.02, mass_g: 0.73, state: 'aq' },
        { formula: 'H2O', moles: 1.1, mass_g: 20, state: 'l' },
      ],
      ph: 1.0,
      timestamp: Date.now(),
    };

    const neutralized = neutralizeSpillWithNaHCO3(acidSpill, 2.5);
    expect(neutralized.isEffervescing).toBe(true);
    expect(neutralized.ph).toBeGreaterThan(acidSpill.ph!);

    const baseSpill: SpillPuddle = {
      id: 'spill_b',
      x: 210,
      y: 300,
      colorHex: '#f8fafc',
      volume_ml: 20,
      formula: 'NaOH',
      contents: [
        { formula: 'NaOH', moles: 0.02, mass_g: 0.8, state: 'aq' },
        { formula: 'H2O', moles: 1.1, mass_g: 20, state: 'l' },
      ],
      ph: 13.0,
      timestamp: Date.now(),
    };

    const merged = mergeAndReactSpills(acidSpill, baseSpill);
    expect(merged.volume_ml).toBe(40);
    expect(merged.isNeutralized).toBe(true);
  });

  it('detects SAFE_ACID_DILUTION and CLOSED_VESSEL_HEATING safety violations', () => {
    const concAcidBeaker: EquipmentState = {
      id: 'beaker_acid',
      name: 'Beaker',
      name_vi: 'Cốc thủy tinh',
      type: 'beaker',
      x: 100,
      y: 100,
      width: 140,
      height: 160,
      capacity_ml: 250,
      isContainer: true,
      temperature_c: 25,
      volume_ml: 30,
      mass_g: 150,
      ph: 0.1,
      contents: [{ formula: 'H2SO4', moles: 0.3, mass_g: 29.4, state: 'aq' }],
    };

    const alert = checkAcidDilutionHazard('H2O', concAcidBeaker);
    expect(alert).not.toBeNull();
    expect(alert?.code).toBe('SAFE_ACID_DILUTION');

    const sealedHeated: EquipmentState = {
      ...concAcidBeaker,
      isSealed: true,
      isBeingHeated: true,
      temperature_c: 80,
    };
    const workbenchAlerts = evaluateWorkbenchSafety([sealedHeated], DEFAULT_PPE_STATE);
    expect(workbenchAlerts.some(a => a.code === 'CLOSED_VESSEL_HEATING')).toBe(true);
  });
});
