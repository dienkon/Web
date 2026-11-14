import { describe, expect, it } from 'vitest';
import { calculateMixtureOptics, computeLiquidOpacity } from '../chemistry/optics/liquidOptics';
import {
  computeContinuousIndicatorColor,
  computeIndicatorAbsorbanceRGB,
  hendersonHasselbalchFraction,
} from '../chemistry/optics/indicatorAppearance';
import {
  DEFAULT_LAB_ENVIRONMENT,
  convectiveCoolingCoefW_K,
  isOxygenSupportingAtmosphere,
  waterBoilingPointAtPressure,
  waterDewPointC,
} from '../chemistry/physical/environmentPhysics';
import {
  calculateMixturePhysicalProperties,
  solubilityAtTemperature_g_100ml,
} from '../chemistry/physical/substanceProps';
import {
  burnerHeatToVessel,
  getBurnerMaxDx,
  isVesselAlignedOverBurner,
  stepTemperatureSolubility,
  stepVesselThermal,
} from '../engine/simulationTick';
import { kineticRuntime2D } from '../chemistry/reactions/kineticsSolver';
import { loadReactionHubBundle } from '../data/reactionCatalogLoader';
import { runReactionOnWorkbench2D } from '../engine/workbenchReactionBridge';
import { runSimulationCycle } from '../chemistry/reactions/engine';
import { LiquidAppearanceField2D } from '../vfx/LiquidAppearanceField2D';
import { reactionRuntime2D } from '../vfx/ReactionRuntime2D';
import { useLabStore } from '../store/useLabStore';
import { EquipmentState } from '../types/equipment';

function makeBeaker(overrides: Partial<EquipmentState> = {}): EquipmentState {
  return {
    id: 'test-beaker',
    type: 'beaker',
    name: 'Beaker 250 mL',
    name_vi: 'Cốc thủy tinh 250 mL',
    x: 200,
    y: 250,
    width: 110,
    height: 135,
    isContainer: true,
    capacity_ml: 250,
    volume_ml: 100,
    mass_g: 210,
    tare_g: 110,
    temperature_c: 25,
    ph: 7,
    contents: [],
    liquidColorHex: '#f8fafc',
    liquidOpacity: 0.24,
    isBeingHeated: false,
    isStirred: false,
    hasGas: false,
    hasPrecipitate: false,
    isBoiling: false,
    ...overrides,
  };
}

describe('Lab-3D Optical, Indicator & Physical Chemistry Parity (lab-2d)', () => {
  it('computes Beer-Lambert absorbance and concentration-scaled opacity', () => {
    const dilute = calculateMixtureOptics(
      [{ formula: 'KMnO4', moles: 0.0005, mass_g: 0.079, state: 'aq' }],
      100
    );
    const concentrated = calculateMixtureOptics(
      [{ formula: 'KMnO4', moles: 0.015, mass_g: 2.37, state: 'aq' }],
      100
    );
    const pureWater = calculateMixtureOptics([], 100);

    expect(pureWater.hasActiveChromophore).toBe(false);
    expect(pureWater.opacity).toBeLessThan(0.32);
    expect(dilute.hasActiveChromophore).toBe(true);
    expect(concentrated.totalAbsorbance).toBeGreaterThan(dilute.totalAbsorbance);
    expect(concentrated.opacity).toBeGreaterThan(dilute.opacity);
  });

  it('produces forward Tyndall scatter opacity for fine suspended precipitates', () => {
    const clearSalt = calculateMixtureOptics(
      [{ formula: 'NaCl', moles: 0.05, mass_g: 2.92, state: 'aq' }],
      100
    );
    const suspension = calculateMixtureOptics(
      [{ formula: 'BaSO4', moles: 0.02, mass_g: 4.66, state: 's' }],
      100
    );

    expect(suspension.turbidityScatter).toBeGreaterThan(0);
    expect(suspension.opacity).toBeGreaterThan(clearSalt.opacity);
    expect(computeLiquidOpacity('#ffffff', 0.8, 100)).toBeGreaterThan(0.65);
  });

  it('evaluates continuous Henderson-Hasselbalch indicator curves without harsh jumps', () => {
    expect(hendersonHasselbalchFraction(4.0, 9.2)).toBe(0);
    expect(hendersonHasselbalchFraction(11.5, 9.2)).toBe(1);
    const mid = hendersonHasselbalchFraction(9.2, 9.2);
    expect(mid).toBeCloseTo(0.5, 1);

    const acidicPhenol = computeContinuousIndicatorColor('phenolphthalein', 6.5);
    const transitionPhenol = computeContinuousIndicatorColor('phenolphthalein', 8.8);
    const basicPhenol = computeContinuousIndicatorColor('phenolphthalein', 10.2);

    expect(acidicPhenol).toBe('#f8fafc');
    expect(basicPhenol).toBe('#ec4899');
    expect(transitionPhenol).not.toBe(acidicPhenol);
    expect(transitionPhenol).not.toBe(basicPhenol);

    const abs = computeIndicatorAbsorbanceRGB(
      [{ formula: 'phenolphthalein', moles: 1e-6, mass_g: 0.0003, state: 'aq' }],
      10.5
    );
    expect(abs.indicator).toBe('phenolphthalein');
    expect(abs.absorbance_RGB[1]).toBeGreaterThan(1.0); // Strong green absorbance -> magenta
  });

  it('preserves 1e-7 mol trace indicator drops in stoichiometry & updates solution color cleanly', () => {
    const result = runSimulationCycle(
      [
        { formula: 'NaOH', moles: 0.01, mass_g: 0.4, state: 'aq' },
        { formula: 'phenolphthalein', moles: 1e-7, mass_g: 0.000032, state: 'aq' },
        { formula: 'H2O', moles: 5.55, mass_g: 100, state: 'l' },
      ],
      100,
      25,
      false,
      true
    );

    const indicator = result.updatedContents.find(c => c.formula === 'phenolphthalein');
    expect(indicator).toBeDefined();
    expect(indicator!.moles).toBeGreaterThan(0);
    expect(result.finalPh).toBeGreaterThan(11);
    expect(result.finalLiquidColorHex.toLowerCase()).not.toBe('#f8fafc');
  });

  it('couples atmospheric pressure, airflow cooling, and O2-gated burner combustion', () => {
    const lowP = waterBoilingPointAtPressure(0.6);
    const stdP = waterBoilingPointAtPressure(1.0);
    const highP = waterBoilingPointAtPressure(1.2);

    expect(lowP).toBeLessThan(90);
    expect(stdP).toBeCloseTo(100, 1);
    expect(highP).toBeGreaterThan(104);

    expect(waterDewPointC(25, 0.8)).toBeGreaterThan(waterDewPointC(25, 0.3));
    expect(convectiveCoolingCoefW_K(100, 1.5)).toBeGreaterThan(convectiveCoolingCoefW_K(100, 0.1));

    const burner: EquipmentState = {
      ...makeBeaker(),
      id: 'burner',
      type: 'bunsen_burner',
      isContainer: false,
      isOn: true,
      x: 200,
      y: 350,
      width: 80,
      height: 110,
      fuelLevel_ml: 80,
    };
    const vesselAbove = makeBeaker({ x: 185, y: 195 });

    const heatAir = burnerHeatToVessel(burner, vesselAbove, DEFAULT_LAB_ENVIRONMENT);
    const heatInert = burnerHeatToVessel(burner, vesselAbove, {
      ...DEFAULT_LAB_ENVIRONMENT,
      oxygenFraction: 0.0,
    });

    expect(isOxygenSupportingAtmosphere(DEFAULT_LAB_ENVIRONMENT)).toBe(true);
    expect(isOxygenSupportingAtmosphere({ ...DEFAULT_LAB_ENVIRONMENT, oxygenFraction: 0 })).toBe(false);
    expect(heatAir).toBeGreaterThan(50);
    expect(heatInert).toBe(0);

    // Lower pressure lowers boiling threshold during thermal step
    const hotWater = makeBeaker({
      temperature_c: 92,
      contents: [{ formula: 'H2O', moles: 5.55, mass_g: 100, state: 'l' }],
    });
    const tickLowP = stepVesselThermal(hotWater, 2.0, 260, 25, {
      ...DEFAULT_LAB_ENVIRONMENT,
      pressure_atm: 0.6,
    });
    expect(tickLowP.isBoiling).toBe(true);
  });

  it('dissolves PbI2 crystals on heating and recrystallizes Golden Rain on cooling', () => {
    const sol25 = solubilityAtTemperature_g_100ml('PbI2', 25)!;
    const sol90 = solubilityAtTemperature_g_100ml('PbI2', 90)!;
    expect(sol90).toBeGreaterThan(sol25 * 4);

    // Hot dissolution at 88 C
    const solidContents = [
      { formula: 'H2O', moles: 5.55, mass_g: 100, state: 'l' as const },
      { formula: 'PbI2', moles: 0.0008, mass_g: 0.3688, state: 's' as const },
    ];
    let heated = solidContents as ReturnType<typeof stepTemperatureSolubility>['contents'];
    let lastHot;
    for (let i = 0; i < 10; i++) {
      lastHot = stepTemperatureSolubility(heated, 100, 88, 1.0);
      heated = lastHot.contents;
    }
    const aqAfterHeat = heated.find(c => c.formula === 'PbI2' && c.state === 'aq');
    expect(aqAfterHeat).toBeDefined();
    expect(aqAfterHeat!.mass_g).toBeGreaterThan(0.25);

    // Cool recrystallization at 22 C
    let cooled = heated;
    let sawRecrystallize = false;
    for (let i = 0; i < 12; i++) {
      const res = stepTemperatureSolubility(cooled, 100, 22, 1.0);
      if (res.recrystallizedFormula === 'PbI2') sawRecrystallize = true;
      cooled = res.contents;
    }
    const solidAfterCool = cooled.find(c => c.formula === 'PbI2' && c.state === 's');
    expect(sawRecrystallize).toBe(true);
    expect(solidAfterCool).toBeDefined();
    expect(solidAfterCool!.mass_g).toBeGreaterThan(0.2);
  });

  it('models substance viscosity & Eulerian 2D spatial color spreading ("loang mau")', () => {
    const dilutePhys = calculateMixturePhysicalProperties(
      [{ formula: 'H2O', moles: 5.55, mass_g: 100, state: 'l' }],
      100,
      25
    );
    const acidPhys = calculateMixturePhysicalProperties(
      [
        { formula: 'H2O', moles: 1.0, mass_g: 18, state: 'l' },
        { formula: 'H2SO4', moles: 1.5, mass_g: 147, state: 'l' },
      ],
      100,
      25
    );
    expect(acidPhys.viscosity_mPa_s).toBeGreaterThan(dilutePhys.viscosity_mPa_s * 3);
    expect(acidPhys.density_g_ml).toBeGreaterThan(1.3);

    const fieldQuiet = new LiquidAppearanceField2D();
    fieldQuiet.seedMixingTransition('#f8fafc', '#ec4899', 0.72, 0.25, '#ec4899');
    const initialUniformity = fieldQuiet.getMixingUniformity();
    expect(initialUniformity).toBeLessThan(0.95);
    expect(fieldQuiet.activeDiffusing).toBe(true);

    const fieldStirred = new LiquidAppearanceField2D();
    fieldStirred.seedMixingTransition('#f8fafc', '#ec4899', 0.72, 0.25, '#ec4899');

    for (let i = 0; i < 30; i++) {
      fieldQuiet.step(0.033, {
        viscosity_mPa_s: 2.5,
        temperature_c: 25,
        stirIntensity: 0,
        isBoiling: false,
        isHeated: false,
      });
      fieldStirred.step(0.033, {
        viscosity_mPa_s: 0.89,
        temperature_c: 25,
        stirIntensity: 1,
        isBoiling: false,
        isHeated: false,
      });
    }

    expect(fieldQuiet.getMixingUniformity()).toBeGreaterThan(initialUniformity);
    expect(fieldStirred.getMixingUniformity()).toBeGreaterThan(fieldQuiet.getMixingUniformity());
  });

  it('triggers Tollens silver mirror with Glucose only at >= 50 C and emits proper controller IDs', () => {
    const tollensMix = [
      { formula: 'C6H12O6', moles: 0.02, mass_g: 3.6, state: 'aq' as const },
      { formula: 'AgNO3', moles: 0.04, mass_g: 6.79, state: 'aq' as const },
      { formula: 'NH3', moles: 0.06, mass_g: 1.02, state: 'aq' as const },
      { formula: 'H2O', moles: 5.55, mass_g: 100, state: 'l' as const },
    ];

    const cold = runSimulationCycle(tollensMix, 100, 25, false, true);
    expect(cold.hasSilverMirror).toBe(false);

    const warm = runSimulationCycle(tollensMix, 100, 58, false, true);
    expect(warm.hasSilverMirror).toBe(true);
    expect(warm.updatedContents.some(c => c.formula === 'Ag' && c.state === 's')).toBe(true);

    const sodiumWater = runSimulationCycle(
      [
        { formula: 'Na', moles: 0.05, mass_g: 1.15, state: 's' },
        { formula: 'H2O', moles: 5.55, mass_g: 100, state: 'l' },
      ],
      100,
      25,
      false,
      true
    );
    expect(sodiumWater.isExplosion).toBe(true);
    expect(sodiumWater.finalPh).toBeGreaterThan(11);
    expect(sodiumWater.activeControllerIds).toContain('na_water_skitter');

    const goldenRain = runSimulationCycle(
      [
        { formula: 'Pb(NO3)2', moles: 0.02, mass_g: 6.62, state: 'aq' },
        { formula: 'KI', moles: 0.04, mass_g: 6.64, state: 'aq' },
        { formula: 'H2O', moles: 5.55, mass_g: 100, state: 'l' },
      ],
      100,
      25,
      false,
      true
    );
    expect(goldenRain.hasPrecipitate).toBe(true);
    expect(goldenRain.precipitateInfo?.formula).toBe('PbI2');
    expect(goldenRain.activeControllerIds).toContain('pbi2_golden_rain');
  });

  it('spawns new workbench equipment centered within the 720x490 bench and syncs phenolphthalein mixing', () => {
    const store = useLabStore.getState();
    useLabStore.setState({ equipment: {}, selectedEquipmentId: null });

    const firstId = store.addEquipment('beaker');
    const firstBeaker = useLabStore.getState().equipment[firstId];
    expect(firstBeaker.x).toBe(290);
    expect(firstBeaker.y).toBe(165);
    expect(firstBeaker.x + firstBeaker.width).toBeLessThanOrEqual(720);
    expect(firstBeaker.y + firstBeaker.height).toBeLessThanOrEqual(490);

    // Acid + phenolphthalein + base neutralization should shift pH & solution color cleanly
    store.addChemicalToEquipment(firstId, 'chem-hcl', 25);
    store.addChemicalToEquipment(firstId, 'chem-phenolphthalein', 2);
    store.addChemicalToEquipment(firstId, 'chem-naoh', 40);
    const reacted = useLabStore.getState().equipment[firstId];
    expect(reacted.ph).toBeGreaterThan(9.5);
    expect((reacted.liquidColorHex ?? '').toLowerCase()).not.toBe('#f8fafc');

    useLabStore.setState({ equipment: {}, selectedEquipmentId: null });
    const burnerId = store.addEquipment('bunsen_burner');
    const burner = useLabStore.getState().equipment[burnerId];
    expect(burner.x).toBe(305);
    expect(burner.y).toBe(295);
    expect(burner.x + burner.width).toBeLessThanOrEqual(720);
    expect(burner.y + burner.height).toBeLessThanOrEqual(490);
  });
});

describe('Volumetric fume VFX & auto-clearing safety alerts', () => {
  it('advances NO2 curl fumes smoothly across frames without stalling and lifts faster under fume hood', () => {
    reactionRuntime2D.resetAll();
    const calmEnv = { ...DEFAULT_LAB_ENVIRONMENT, airSpeed_m_s: 0.02 };
    const hoodEnv = { ...DEFAULT_LAB_ENVIRONMENT, airSpeed_m_s: 0.9 };

    const vesselA = makeBeaker({
      id: 'vfx-fume-calm',
      hasFumes: true,
      fumeType: 'no2',
      fumeColorHex: '#b45309',
    });
    for (let i = 0; i < 30; i += 1) {
      reactionRuntime2D.stepAll([vesselA], 0.016, calmEnv);
    }
    const stateA = reactionRuntime2D.getOrCreateState(vesselA);
    expect(stateA.fumes.length).toBeGreaterThan(0);

    const tracked = stateA.fumes[0];
    const startY = tracked.yOffsetPx;
    const startRot = tracked.rotation_rad;
    for (let i = 0; i < 15; i += 1) {
      reactionRuntime2D.stepAll([vesselA], 0.016, calmEnv);
    }
    expect(tracked.yOffsetPx).not.toBe(startY);
    expect(tracked.rotation_rad).not.toBe(startRot);
    expect(stateA.fumes.every((f) => Math.abs(f.vy) + Math.abs(f.vx) > 0.5)).toBe(true);

    reactionRuntime2D.resetAll();
    const vesselB = makeBeaker({
      id: 'vfx-fume-hood',
      hasFumes: true,
      fumeType: 'no2',
      fumeColorHex: '#b45309',
    });
    for (let i = 0; i < 30; i += 1) {
      reactionRuntime2D.stepAll([vesselB], 0.016, hoodEnv);
    }
    const stateB = reactionRuntime2D.getOrCreateState(vesselB);
    const meanVyCalm = stateA.fumes.reduce((acc, f) => acc + f.vy, 0) / stateA.fumes.length;
    const meanVyHood = stateB.fumes.reduce((acc, f) => acc + f.vy, 0) / stateB.fumes.length;
    expect(meanVyHood).toBeLessThan(meanVyCalm);
  });

  it('auto-clears resolved TOXIC_GAS_NO_HOOD warning when fume hood is turned on', () => {
    useLabStore.setState({
      equipment: {},
      selectedEquipmentId: null,
      safetyAlerts: [],
      ppe: { goggles: true, gloves: true, lab_coat: true, fume_hood: false },
    });
    const store = useLabStore.getState();
    const beakerId = store.addEquipment('beaker');
    useLabStore.setState((s) => ({
      equipment: {
        ...s.equipment,
        [beakerId]: {
          ...s.equipment[beakerId],
          hasFumes: true,
          fumeType: 'no2',
        },
      },
    }));

    store.tickSimulation(0.15);
    const activeCodes = useLabStore.getState().safetyAlerts.map((a) => a.code);
    expect(activeCodes).toContain('TOXIC_GAS_NO_HOOD');

    store.togglePpe('fume_hood');
    store.tickSimulation(0.15);
    const clearedCodes = useLabStore.getState().safetyAlerts.map((a) => a.code);
    expect(clearedCodes).not.toContain('TOXIC_GAS_NO_HOOD');
  });
});


describe('Lab-3D Parity: Burner Alignment, Gradual Kinetics & Reaction Library', () => {
  it('denies heat, tripod, and side flames when Bunsen burner is horizontally off-center (dx = 75px)', () => {
    const store = useLabStore.getState();
    store.resetWorkbench();
    store.setRealtimeKinetics(false);

    const beakerId = store.addEquipment('beaker', 200, 120);
    store.addDistilledWater(beakerId, 100);
    const beakerBefore = useLabStore.getState().equipment[beakerId];

    // Place burner 75 px to the right of beaker center (matches bug screenshot offset)
    const alignedX = beakerBefore.x + beakerBefore.width / 2 - 50;
    const alignedY = beakerBefore.y + beakerBefore.height + 36 - 42;
    const burnerId = store.addEquipment('bunsen_burner', alignedX + 75, alignedY);
    store.toggleHeat(burnerId);

    const offBurner = useLabStore.getState().equipment[burnerId];
    expect(getBurnerMaxDx(beakerBefore)).toBeLessThanOrEqual(36);
    expect(burnerHeatToVessel(offBurner, beakerBefore)).toBe(0);
    expect(isVesselAlignedOverBurner(offBurner, beakerBefore)).toBe(false);

    useLabStore.getState().tickSimulation(1.0);
    const beakerOffTick = useLabStore.getState().equipment[beakerId];
    expect(Boolean(beakerOffTick.isBeingHeated)).toBe(false);
    expect(Boolean(beakerOffTick.hasTripod)).toBe(false);
    expect(Boolean(beakerOffTick.hasOpenFlame)).toBe(false);
    expect(beakerOffTick.temperature_c).toBeLessThanOrEqual(25.1);

    // Now center the burner cleanly beneath the beaker (dx = 0)
    useLabStore.getState().updatePosition(burnerId, alignedX, alignedY);
    const centeredBurner = useLabStore.getState().equipment[burnerId];
    const currentBeaker = useLabStore.getState().equipment[beakerId];
    expect(burnerHeatToVessel(centeredBurner, currentBeaker)).toBeGreaterThan(25);
    expect(isVesselAlignedOverBurner(centeredBurner, currentBeaker)).toBe(true);

    useLabStore.getState().tickSimulation(1.0);
    const heatedBeaker = useLabStore.getState().equipment[beakerId];
    expect(heatedBeaker.isBeingHeated).toBe(true);
    expect(heatedBeaker.hasTripod).toBe(true);
    expect(heatedBeaker.hasOpenFlame).toBe(true);
    expect(heatedBeaker.temperature_c).toBeGreaterThan(25.2);

    // Drag burner off-center again -> tripod, open flame, and heating immediately shut off
    useLabStore.getState().updatePosition(burnerId, alignedX + 75, alignedY);
    useLabStore.getState().tickSimulation(0.5);
    const pulledAway = useLabStore.getState().equipment[beakerId];
    expect(pulledAway.isBeingHeated).toBe(false);
    expect(pulledAway.hasTripod).toBe(false);
    expect(pulledAway.hasOpenFlame).toBe(false);

    useLabStore.getState().resetWorkbench();
  });

  it('progresses precipitation and Tollens silver mirror gradually when realtimeKinetics is active', () => {
    const store = useLabStore.getState();
    store.resetWorkbench();
    store.setRealtimeKinetics(true);

    const beakerId = store.addEquipment('beaker', 220, 140);
    store.addChemicalToEquipment(beakerId, 'chem-pbno32', 25);
    store.addChemicalToEquipment(beakerId, 'chem-ki', 25);

    // At t = 0, reaction is queued rather than teleporting straight to 100% completion
    const atZero = useLabStore.getState().equipment[beakerId];
    expect(atZero.activeReactionProgress).toBe(0);
    expect(atZero.activeReactionLabel).toBeTruthy();
    expect(kineticRuntime2D.getJob(beakerId)).toBeDefined();

    // After 1 second, reaction is in mid-flight (0 < progress < 1)
    useLabStore.getState().tickSimulation(1.0);
    const mid = useLabStore.getState().equipment[beakerId];
    expect(mid.activeReactionProgress).toBeGreaterThan(0);
    expect(mid.activeReactionProgress).toBeLessThan(1);

    for (let i = 0; i < 12; i++) {
      useLabStore.getState().tickSimulation(1.0);
    }
    const donePb = useLabStore.getState().equipment[beakerId];
    expect(donePb.activeReactionProgress).toBeUndefined();
    expect(kineticRuntime2D.getJob(beakerId)?.completed).toBe(true);
    expect(donePb.hasPrecipitate).toBe(true);
    expect(donePb.precipitateSubstance).toBe('PbI2');

    // Now verify Tollens silver mirror: never golden yellow (#facc15), requires heating, smooth silverMirrorProgress
    store.resetWorkbench();
    store.setRealtimeKinetics(true);
    const tubeId = store.addEquipment('test_tube', 300, 110);
    store.addChemicalToEquipment(tubeId, 'chem-agno3', 15);
    store.addChemicalToEquipment(tubeId, 'chem-nh3', 15);
    store.addChemicalToEquipment(tubeId, 'chem-c6h12o6', 15);

    useLabStore.getState().tickSimulation(1.0);
    const coldTube = useLabStore.getState().equipment[tubeId];
    expect(coldTube.hasSilverMirror).toBeFalsy();
    expect(coldTube.precipitateColorHex).not.toBe('#facc15');
    expect(coldTube.activeReactionLabel).toContain('Cần đun');

    // Align heated burner underneath test tube
    const burnerX = coldTube.x + coldTube.width / 2 - 50;
    const burnerY = coldTube.y + coldTube.height + 36 - 42;
    const burnerId = store.addEquipment('bunsen_burner', burnerX, burnerY);
    store.toggleHeat(burnerId);

    let sawPartialSilver = false;
    for (let i = 0; i < 40; i++) {
      useLabStore.getState().tickSimulation(1.0);
      const cur = useLabStore.getState().equipment[tubeId];
      const sm = cur.silverMirrorProgress ?? 0;
      if (sm > 0.05 && sm < 0.95) {
        sawPartialSilver = true;
      }
    }

    const finishedTube = useLabStore.getState().equipment[tubeId];
    expect(finishedTube.hasSilverMirror).toBe(true);
    expect(finishedTube.silverMirrorProgress ?? 0).toBeGreaterThan(0.85);
    expect(finishedTube.precipitateColorHex).not.toBe('#facc15');
    expect(sawPartialSilver).toBe(true);

    // resetWorkbench cleans kinetic & VFX runtime registries
    useLabStore.getState().resetWorkbench();
    expect(kineticRuntime2D.getJob(tubeId)).toBeUndefined();
    useLabStore.getState().setRealtimeKinetics(false);
  });

  it('loads 131 curriculum + 1,300 shared reactions, analyzes chains, and runs reactions on 2D bench', async () => {
    const bundle = await loadReactionHubBundle();
    expect(bundle.curriculum.length).toBeGreaterThanOrEqual(131);
    expect(bundle.catalog.entries.length).toBeGreaterThanOrEqual(1300);
    expect(bundle.chains.length).toBeGreaterThan(0);

    const hits = bundle.searchReactions(bundle.index, 'AgNO3');
    expect(hits.entries.length).toBeGreaterThan(0);

    const chainResult = bundle.analyzeChain(bundle.index, 'Cu -> CuSO4 -> Cu(OH)2 -> CuO -> Cu');
    expect(chainResult.steps.length).toBeGreaterThanOrEqual(3);

    const guide = bundle.reactionGuide(bundle.catalog.entries[0]);
    expect(guide).toBeDefined();

    const heatedCurriculum =
      bundle.curriculum.find((entry) => entry.conditions?.heating) ?? bundle.curriculum[0];
    const launched = runReactionOnWorkbench2D(heatedCurriculum);
    expect(launched.vesselId).toBeTruthy();
    expect(launched.equation).toBe(heatedCurriculum.equation);
    expect(useLabStore.getState().realtimeKinetics).toBe(true);
    if (heatedCurriculum.conditions?.heating) {
      expect(launched.heated).toBe(true);
      expect(launched.burnerId).toBeTruthy();
      const vessel = useLabStore.getState().equipment[launched.vesselId];
      const burner = useLabStore.getState().equipment[launched.burnerId!];
      expect(isVesselAlignedOverBurner(burner, vessel)).toBe(true);
    }

    useLabStore.getState().resetWorkbench();
    useLabStore.getState().setRealtimeKinetics(false);
  });
});
