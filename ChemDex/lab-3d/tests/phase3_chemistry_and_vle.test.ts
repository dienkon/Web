import { describe, expect, it } from 'vitest';
import {
  assessProgramConditions,
  bulkAcidMassFraction,
  isPassivatedMetalInColdConcentratedAcid,
} from '../src/science/conditions';
import {
  sulfuricDilutionEnthalpyKJPerMol,
  sulfuricDilutionHeatJ,
  assessAcidDilutionOrderHazard,
} from '../src/science/sulfuricDilutionEnthalpy';
import { equilibrateSealedWaterVapor } from '../src/engine/thermalState';
import { captureHeadspace } from '../src/engine/headspacePressure';
import { stepOpenMouthNoOxidation, oxidizeEscapedNoGas } from '../src/engine/headspaceGasOxidation';
import { getProgramById } from '../src/vfx/programs/library';
import { computeMolarMass } from '../src/engine/ledger';
import { waterSaturationPressurePa } from '../src/science/waterSaturation';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const row = (formula: string, moles: number, phase = 'aq'): SubstanceContent => ({
  formula,
  moles,
  phase,
  mass_g: moles * computeMolarMass(formula),
});

function sealedWaterVessel(temperature_c = 80, water_g = 40, capacity_ml = 100): VesselState {
  const base: VesselState = {
    id: 'vle_test',
    name: 'Flask',
    type: 'flask',
    position: [0, 0, 0],
    rotationY: 0,
    isLocked: false,
    capacity_ml,
    volume_ml: water_g,
    volume: water_g / capacity_ml,
    mass_g: water_g,
    temperature_c,
    ph: 7,
    substances: ['H2O'],
    contents: [{ formula: 'H2O', phase: 'l', mass_g: water_g, moles: water_g / 18.01528 }],
    hasGas: false,
    hasPrecipitate: false,
    isBoiling: false,
    isSealed: true,
  };
  return { ...base, sealedHeadspace: captureHeadspace(base) };
}

describe('Phase 3: Real bulk acid concentration, passivation, sealed VLE, H2SO4 dilution & NO oxidation', () => {
  it('re-routes Cu + HNO3(conc) to Cu + HNO3(dilute) once diluted with real liquid water', () => {
    const pConc = getProgramById('cu_hno3_conc')!;
    const pDil = getProgramById('cu_hno3_dilute')!;

    // Concentrated stock (~68% w/w HNO3)
    const concContents = [row('Cu', 0.01, 's'), row('HNO3 (conc)', 0.04, 'aq'), row('H2O', 1.186 / 18.015, 'l')];
    expect(bulkAcidMassFraction(concContents, 'HNO3')).toBeCloseTo(0.68, 2);
    expect(assessProgramConditions(pConc, concContents, { volume_ml: 2.6, temperature_c: 25 }).ready).toBe(true);
    expect(assessProgramConditions(pDil, concContents, { volume_ml: 2.6, temperature_c: 25 }).ready).toBe(false);

    // Dilute by adding 100 g water (~2.46% w/w HNO3)
    const dilutedContents = [row('Cu', 0.01, 's'), row('HNO3 (conc)', 0.04, 'aq'), row('H2O', 100 / 18.015, 'l')];
    expect(bulkAcidMassFraction(dilutedContents, 'HNO3')!).toBeLessThan(0.05);
    expect(assessProgramConditions(pConc, dilutedContents, { volume_ml: 102, temperature_c: 25 }).ready).toBe(false);
    expect(assessProgramConditions(pDil, dilutedContents, { volume_ml: 102, temperature_c: 25 }).ready).toBe(true);
  });

  it('detects cold concentrated acid passivation for Fe, Al, Cr and lifts passivation on heating or dilution', () => {
    const coldFeConc = [row('Fe', 0.01, 's'), row('HNO3 (conc)', 0.05, 'aq'), row('H2O', 1.5 / 18.015, 'l')];
    expect(isPassivatedMetalInColdConcentratedAcid(coldFeConc, 25)).toEqual({
      passivated: true,
      metal: 'Fe',
      acid: 'HNO3',
    });
    expect(isPassivatedMetalInColdConcentratedAcid(coldFeConc, 70).passivated).toBe(false);

    const dilutedFe = [row('Fe', 0.01, 's'), row('HNO3 (conc)', 0.05, 'aq'), row('H2O', 100 / 18.015, 'l')];
    expect(isPassivatedMetalInColdConcentratedAcid(dilutedFe, 25).passivated).toBe(false);

    // Hypothetical program consuming Fe + HNO3(conc) must be gated at 25 °C
    const mockProgram = structuredClone(getProgramById('cu_hno3_conc')!);
    mockProgram.id = 'fe_hno3_conc_test';
    mockProgram.chemistry.species = mockProgram.chemistry.species.map(s =>
      s.formula === 'Cu' ? { ...s, formula: 'Fe' } : s,
    );
    const assessedCold = assessProgramConditions(mockProgram, coldFeConc, { temperature_c: 25, volume_ml: 4 });
    expect(assessedCold.ready).toBe(false);
    expect(assessedCold.unmet.some(u => u.includes('thụ động hóa'))).toBe(true);
    const assessedHot = assessProgramConditions(mockProgram, coldFeConc, { temperature_c: 75, volume_ml: 4 });
    expect(assessedHot.ready).toBe(true);
  });

  it('equilibrates sealed-vessel water vapor to IAPWS P_sat(T) while conserving mass and stopping net evaporation at saturation', () => {
    const vessel = sealedWaterVessel(80, 40, 100);
    const first = equilibrateSealedWaterVapor(vessel)!;
    expect(first).not.toBeNull();
    expect(first.saturated).toBe(true);
    expect(first.vaporTransfer_g).toBeGreaterThan(0);
    expect(first.saturationPressure_atm).toBeCloseTo(waterSaturationPressurePa(80) / 101325, 10);
    // Total mass inside closed vessel is strictly conserved
    const totalMass = first.vessel.contents.reduce((s, c) => s + c.mass_g, 0);
    expect(totalMass).toBeCloseTo(40, 10);
    // Re-running at same temperature causes zero further net transfer
    const second = equilibrateSealedWaterVapor(first.vessel)!;
    expect(Math.abs(second.vaporTransfer_g)).toBeLessThan(1e-10);
    // Cooling down to 25 °C condenses excess vapor back to liquid
    const cooled = equilibrateSealedWaterVapor({ ...first.vessel, temperature_c: 25 })!;
    expect(cooled.vaporTransfer_g).toBeLessThan(0);
    expect(cooled.vessel.contents.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(40, 10);
  });

  it('models differential sulfuric acid dilution enthalpy and quantifies water-into-acid hazard', () => {
    expect(sulfuricDilutionEnthalpyKJPerMol(1)).toBeGreaterThan(25);
    expect(sulfuricDilutionEnthalpyKJPerMol(10)).toBeGreaterThan(60);
    expect(sulfuricDilutionHeatJ(0.1, 0, 0.5)).toBeGreaterThan(5000);

    const concAcid = [row('H2SO4', 0.5, 'l'), row('H2O', 0.05, 'l')];
    const smallWater = [row('H2O', 0.5, 'l')];
    const largeWater = [row('H2O', 10, 'l')];

    const wrongOrder = assessAcidDilutionOrderHazard(concAcid, smallWater);
    const safeOrder = assessAcidDilutionOrderHazard(largeWater, [row('H2SO4', 0.05, 'l')]);
    expect(wrongOrder.waterIntoConcentratedAcid).toBe(true);
    expect(wrongOrder.localContactDeltaT_K).toBeGreaterThan(safeOrder.localContactDeltaT_K * 5);
    expect(wrongOrder.warning_vi).toBeDefined();
    expect(safeOrder.waterIntoConcentratedAcid).toBe(false);
  });

  it('oxidizes colorless NO to reddish-brown NO2 in air with exact mass and nitrogen balance, and stays zero when sealed', () => {
    const sealed = stepOpenMouthNoOxidation(0.002, 5, { isSealed: true });
    expect(sealed.no2Formed_mol).toBe(0);
    expect(sealed.noRemaining_mol).toBe(0.002);

    const open = stepOpenMouthNoOxidation(0.002, 2, { isSealed: false, plumeVolume_L: 0.05 });
    expect(open.no2Formed_mol).toBeGreaterThan(0);
    expect(open.noRemaining_mol + open.no2Formed_mol).toBeCloseTo(0.002, 12);
    expect(open.noInitial_mol * 30.0061 + open.ambientO2Consumed_g).toBeCloseTo(open.noRemaining_g + open.no2Formed_g, 10);

    const vessel = { ...sealedWaterVessel(25), isSealed: false, escapedGas_g: { NO: 0.06 } };
    const oxidized = oxidizeEscapedNoGas(vessel, 2)!;
    expect(oxidized).not.toBeNull();
    expect(oxidized.patch.escapedGas_g!.NO2).toBeGreaterThan(0);
    expect(oxidized.patch.escapedGas_g!.NO).toBeLessThan(0.06);
    expect(oxidized.patch.gasColor).toBe('#b45309');
  });
});
