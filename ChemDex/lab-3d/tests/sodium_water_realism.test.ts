import { afterEach, describe, expect, it } from 'vitest';
import { BoxGeometry } from 'three';
import { SCENE_GRAVITY } from '../src/science/sceneUnits';
import { useAppStore } from '../src/store/useAppStore';
import { useLabEnvironment } from '../src/store/useLabEnvironment';
import { DEFAULT_LAB_ENVIRONMENT, waterBoilingPointAtPressure } from '../src/science/labEnvironment';
import { sodiumReactionDuration, floatingPelletCenter, sodiumPelletThermal, sodiumCanBurn } from '../src/science/sodiumWater';
import { planSodiumWater, sodiumWaterGasMolesPerSecond } from '../src/engine/sodiumWaterPlan';
import { sodiumPelletShape, sodiumPelletPlacement, sodiumPelletRadius, submergedPelletVolume } from '../src/vfx/geometry/sodiumPellet';
import { aqueousConstantsAtTemperature } from '../src/science/aqueousTemperature';
import { reactAliquotMixture } from '../src/engine/aliquotReaction';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { aqueousBoilingPoint, stepVesselThermal } from '../src/engine/thermalState';
import { SodiumWaterController } from '../src/vfx/reactions/controllers/SodiumWaterController';
import { ReactionSimulationEngine } from '../src/vfx/reactions/ReactionSimulationEngine';
import { createStudioSample } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import { restingToolHeight } from '../src/handling/handheldRest';
import { restingVesselHeight } from '../src/handling/vesselRest';
import { LAB_PHYSICS } from '../src/engine/interactionEngine';
import { vesselLiquidSurfaceY, sodiumSurfaceRadius } from '../src/science/vesselGeometry';
import type { VesselState } from '../src/types/chemistry';
import type { ReactionContext } from '../src/vfx/reactions/types';
import { PourController } from '../src/pour/controller/PourController';
import { getWorldVesselProfile } from '../src/pour/physics/profiles';
import { getReactionController } from '../src/vfx/reactions/registry';
import { vfxBus } from '../src/vfx/bus';

const original = useAppStore.getState();
afterEach(async () => { await PourController.commitCurrentPour(); useAppStore.setState(original, true); useLabEnvironment.getState().setConditions(DEFAULT_LAB_ENVIRONMENT); ReactionSimulationEngine.getInstance().resetAll(); });
const amount = (formula: string, mass_g: number, phase: string) => ({ formula, mass_g, phase, moles: mass_g / computeMolarMass(formula) });
const specimen = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'sodium_test', name: 'Sodium contact', type: 'beaker', capacity_ml: 250,
  position: [0, -0.135, 0], rotationY: 0, isLocked: false,
  contents: [amount('Na', 0.1, 's'), amount('H2O', 50, 'l')], substances: ['Na', 'H2O'],
  volume_ml: 50, volume: 0.2, mass_g: 50.1, temperature_c: 25, ph: 7,
  liquidColor: '#f8fafc', hasPrecipitate: false, isBoiling: false, hasGas: false, ...patch,
});
const moles = (v: Partial<VesselState>, formula: string) => v.contents?.filter(item => item.formula === formula).reduce((sum, item) => sum + item.moles, 0) ?? 0;

describe('Sodium contact uses finite progressive chemistry', () => {
  it('starts only at visible contact and repeated contact events cannot add the dose twice', () => {
    const v = specimen({ contents: [amount('H2O', 50, 'l')], substances: ['H2O'], mass_g: 50 });
    useAppStore.setState({ vessels: { [v.id]: v }, activeKinetics: {}, burners: {} });
    useAppStore.getState().triggerPour('Na', v.id);
    expect(moles(useAppStore.getState().vessels[v.id], 'Na')).toBe(0);
    expect(useAppStore.getState().activeKinetics[v.id]).toBeUndefined();
    useAppStore.getState().contactPour();
    const initial = moles(useAppStore.getState().vessels[v.id], 'Na');
    expect(initial).toBeCloseTo(0.1 / 22.99, 10);
    useAppStore.getState().contactPour();
    expect(moles(useAppStore.getState().vessels[v.id], 'Na')).toBe(initial);
    expect(useAppStore.getState().activeKinetics[v.id].program?.id).toBe('na_h2o');
  });
  it('cancels a sodium addition before contact without adding invisible metal', () => {
    const v = specimen({ contents: [amount('H2O', 50, 'l')], substances: ['H2O'], mass_g: 50 });
    useAppStore.setState({ vessels: { [v.id]: v }, activeKinetics: {}, burners: {} });
    useAppStore.getState().triggerPour('Na', v.id, 0.1);
    useAppStore.getState().clearPour();
    useAppStore.getState().contactPour();
    expect(moles(useAppStore.getState().vessels[v.id], 'Na')).toBe(0);
  });
  it('keeps metal present at addition instead of consuming it before the first frame', () => {
    const v = specimen(), result = reactAliquotMixture(v, 'vi', false);
    expect(result.kinetics?.program?.id).toBe('na_h2o');
    expect(moles(result.vessel, 'Na')).toBe(moles(v, 'Na'));
    expect(moles(result.vessel, 'NaOH')).toBe(0);
    expect(result.vessel.temperature_c).toBe(25);
  });
  it('consumes Na and water 1:1, creates half as much H2, and conserves mass including escaped gas', () => {
    const v = specimen(), plan = planSodiumWater(v, 'vi')!;
    const halfway = applyProgramToLedger(plan.kinetics.program!, v, 0.5);
    const reactedNa = moles(v, 'Na') - moles(halfway, 'Na');
    expect(moles(v, 'H2O') - moles(halfway, 'H2O')).toBeCloseTo(reactedNa, 12);
    expect(moles(halfway, 'NaOH')).toBeCloseTo(reactedNa, 12);
    expect(halfway.escapedGas_g!.H2 / computeMolarMass('H2')).toBeCloseTo(reactedNa / 2, 12);
    expect(halfway.mass_g! + halfway.escapedGas_g!.H2).toBeCloseTo(v.mass_g, 10);
    expect(halfway.temperature_c).toBeLessThan(30);
    expect(halfway.isBoiling).toBe(false);
    expect(halfway.phModel).toBe('ideal_aqueous_temperature');
    const hydroxide = reactedNa / (halfway.volume_ml! / 1000);
    const kw = aqueousConstantsAtTemperature(halfway.temperature_c!)!.waterKw;
    expect(halfway.ph).toBeCloseTo(-Math.log10(kw / hydroxide), 6);
  });
  it('stops on limiting water and leaves excess sodium in the ledger', () => {
    const v = specimen({ contents: [amount('Na', 0.1, 's'), amount('H2O', 0.001, 'l')] });
    const final = applyProgramToLedger(getProgramById('na_h2o')!, v, 1);
    expect(moles(final, 'Na')).toBeGreaterThan(0);
    expect(moles(final, 'H2O')).toBeCloseTo(0, 12);
    expect(moles(final, 'NaOH')).toBeCloseTo(0.001 / computeMolarMass('H2O'), 12);
  });
  it('leaves colorless NaOH without indicator and changes color only with a real indicator dose', () => {
    const v = specimen(), program = getProgramById('na_h2o')!;
    const plain = applyProgramToLedger(program, v, 1);
    const dyed = applyProgramToLedger(program, { ...v, contents: [...v.contents, amount('Phenolphthalein', 0.00031832, 'aq')] }, 1);
    expect(plain.ph).toBeGreaterThan(12);
    expect(plain.liquidColor).not.toBe(dyed.liquidColor);
    expect(dyed.liquidColor).toBe('#ec4899');
  });
  it('does not replay heat when the same reaction extent is evaluated twice', () => {
    const v = specimen(), program = getProgramById('na_h2o')!;
    const step = applyProgramWithThermalSinks(program, v, v, 0.5);
    const repeated = applyProgramWithThermalSinks(program, v, { ...v, ...step }, 0.5);
    expect(repeated.temperature_c).toBeCloseTo(step.temperature_c!, 10);
  });
  it('requires liquid water; dry sodium and ice alone do not start this contact path', () => {
    expect(planSodiumWater(specimen({ volume_ml: 0, contents: [amount('Na', 0.1, 's')] }), 'vi')).toBeNull();
    expect(planSodiumWater(specimen({ contents: [amount('Na', 0.1, 's'), amount('H2O', 50, 's')] }), 'vi')).toBeNull();
  });
  it('prepares the library sample with excess water rather than a microscopic stoichiometric film', () => {
    const sample = createStudioSample(getProgramById('na_h2o')!, specimen());
    expect(sample.volume_ml).toBeCloseTo(30, 3);
    expect(moles(sample, 'H2O')).toBeGreaterThan(moles(sample, 'Na') * 100);
  });
  it('warmer water accelerates the visual timescale and a larger piece takes longer', () => {
    expect(sodiumReactionDuration(specimen({ temperature_c: 50 }))).toBeLessThan(sodiumReactionDuration(specimen()));
    expect(sodiumReactionDuration(specimen({ contents: [amount('Na', 0.8, 's'), amount('H2O', 50, 'l')] }))).toBeGreaterThan(sodiumReactionDuration(specimen()));
  });
  it('updates the live store progressively and retires emission at completion', () => {
    const v = specimen(), plan = planSodiumWater(v, 'vi')!;
    useAppStore.setState({ vessels: { [v.id]: plan.vessel }, activeKinetics: { [v.id]: plan.kinetics },
      burners: {}, pendingReactions: {}, isSimulationPaused: false, timeScale: 1 });
    useAppStore.getState().tickSimulation(0.05);
    const first = useAppStore.getState().vessels[v.id];
    expect(moles(first, 'Na')).toBeGreaterThan(0);
    expect(moles(first, 'Na')).toBeLessThan(moles(v, 'Na'));
    expect(first.phModel).toBe('ideal_aqueous_temperature');
    expect(first.ph).toBeGreaterThan(9);
    for (let i = 0; i < 160; i++) useAppStore.getState().tickSimulation(0.05);
    const state = useAppStore.getState();
    expect(moles(state.vessels[v.id], 'Na')).toBeCloseTo(0, 10);
    expect(state.activeKinetics[v.id]).toBeUndefined();
    expect(state.vessels[v.id].hasGas).toBe(false);
  });
});

describe('Sodium shape, buoyancy and finite gas emission', () => {
  it('integrates an independently constructed cube below arbitrary horizontal planes', () => {
    const geometry = new BoxGeometry(2, 2, 2).toNonIndexed();
    const positions = geometry.attributes.position.array as Float32Array;
    for (const height of [-2, -1, -0.75, -0.25, 0, 0.25, 0.75, 1, 2]) {
      expect(submergedPelletVolume(positions, height)).toBeCloseTo(4 * Math.max(0, Math.min(2, height + 1)), 10);
    }
    geometry.dispose();
  });
  it.each([0, 0.25, 0.5, 0.75, 1])('preserves metal volume through melt fraction %s', melt => {
    const shape = sodiumPelletShape(melt);
    expect(shape.volume).toBeCloseTo(4 * Math.PI / 3, 5);
    expect(submergedPelletVolume(shape.positions, shape.bottom - 0.01)).toBe(0);
    expect(submergedPelletVolume(shape.positions, 0)).toBeCloseTo(shape.volume / 2, 6);
    const small = sodiumPelletRadius(specimen(), 0.1), large = sodiumPelletRadius(specimen(), 0.8);
    expect(large / small).toBeCloseTo(2, 10);
  });
  it.each([0, 0.5, 1])('displaces its own mass in deep water for shape %s', melt => {
    const v = specimen(), body = sodiumPelletPlacement(v, 0.1, melt);
    const plane = (body.surface - body.centerY) / body.radius;
    const fraction = submergedPelletVolume(body.shape.positions, plane) / body.shape.volume;
    expect(fraction).toBeCloseTo(0.971, 5);
    expect(body.bottomY).toBeGreaterThan(body.floor);
    expect(body.centerY + body.shape.top * body.radius).toBeGreaterThan(body.surface);
  });
  it.each([0, 0.5, 1])('rests its actual lowest vertex on a dry or shallow floor for shape %s', melt => {
    const dry = specimen({ volume_ml: 0, contents: [amount('Na', 0.1, 's')] });
    const shallow = specimen({ volume_ml: 0.01, contents: [amount('Na', 0.1, 's'), amount('H2O', 0.01, 'l')] });
    for (const v of [dry, shallow]) {
      const body = sodiumPelletPlacement(v, 0.1, melt);
      expect(body.bottomY).toBeCloseTo(body.floor, 8);
    }
  });
  it('floats higher in a denser liquid and does not mutate inventory', () => {
    const dense = specimen({ contents: [amount('Na', 0.1, 's'), amount('H2O', 60, 'l')] });
    const before = structuredClone(dense);
    const water = sodiumPelletPlacement(specimen(), 0.1, 1), saline = sodiumPelletPlacement(dense, 0.1, 1);
    expect(saline.centerY - saline.surface).toBeGreaterThan(water.centerY - water.surface);
    expect(dense).toEqual(before);
  });
  it('meters exactly the limiting H2 amount across the illustrative duration', () => {
    for (const v of [specimen(), specimen({ contents: [amount('Na', 0.1, 's'), amount('H2O', 0.001, 'l')] })]) {
      const plan = planSodiumWater(v, 'vi')!;
      const total = sodiumWaterGasMolesPerSecond(plan.kinetics) * plan.kinetics.duration;
      expect(total).toBeCloseTo(Math.min(moles(v, 'Na'), moles(v, 'H2O')) / 2, 12);
      expect(sodiumWaterGasMolesPerSecond({ ...plan.kinetics, progress: 1 })).toBe(0);
    }
  });
  it('does not melt the whole sodium piece on the heat from a trace of limiting water', () => {
    const initial = specimen({ volume_ml: 0.001, contents: [amount('Na', 0.1, 's'), amount('H2O', 0.001, 'l')] });
    useAppStore.setState({ vessels: { [initial.id]: initial } });
    const engine = ReactionSimulationEngine.getInstance();
    const runtime = engine.startReaction(initial.id, 'na_h2o', { duration: 7 })!;
    const plan = planSodiumWater(initial, 'vi')!;
    const step = applyProgramToLedger(plan.kinetics.program!, initial, 0.9);
    useAppStore.setState({ vessels: { [initial.id]: { ...initial, ...step } } });
    runtime.customData.chemistryProgress = 0.9;
    runtime.customData.gasMolesPerSecond = sodiumWaterGasMolesPerSecond(plan.kinetics);
    engine.update(1 / 60);
    expect(runtime.customData.mass_fraction).toBeGreaterThan(0.98);
    expect(runtime.customData.meltFactor).toBe(0);
    expect(runtime.customData.localTemp_c).toBeLessThan(40);
  });
  it('never advances past supplied chemical progress and stops emission at zero molar flux', () => {
    const v = specimen({ type: 'cylinder', capacity_ml: 100 });
    useAppStore.setState({ vessels: { [v.id]: v } });
    const engine = ReactionSimulationEngine.getInstance();
    const runtime = engine.startReaction(v.id, 'na_h2o', { duration: 15 })!;
    runtime.customData.chemistryProgress = 0.25;
    runtime.customData.gasMolesPerSecond = 1e-4;
    for (let i = 0; i < 200; i++) {
      engine.update(1 / 60);
      expect(runtime.progress).toBe(0.25);
      const body = sodiumPelletPlacement(v, 0.1, runtime.customData.meltFactor);
      expect(Math.hypot(runtime.customData.x, runtime.customData.z) + body.horizontalRadius)
        .toBeLessThanOrEqual(sodiumSurfaceRadius(v) + 1e-10);
    }
    const expected = 1e-4 * 82.057 * (25 + 273.15) / 0.05;
    expect(runtime.gasGenerationRate).toBeCloseTo(expected, 10);
    runtime.customData.gasMolesPerSecond = 0;
    engine.update(1 / 60);
    expect(runtime.gasGenerationRate).toBe(0);
    expect(runtime.surfaceActivity).toBe(0);
    expect(runtime.customData.isIgnited).toBe(false);
  });
});

describe('Contact geometry and laboratory environment', () => {
  it('publishes pressure and inert atmosphere changes even when the sample is at room temperature', () => {
    const v = specimen();
    useAppStore.setState({ vessels: { [v.id]: v }, activeKinetics: {}, burners: {}, pendingReactions: {}, isSimulationPaused: false });
    useLabEnvironment.getState().setConditions({ pressure_atm: 0.8, oxygenFraction: 0 });
    useAppStore.getState().tickSimulation(0.05);
    expect(useAppStore.getState().vessels[v.id].environment?.pressure_atm).toBe(0.8);
    expect(useAppStore.getState().vessels[v.id].environment?.oxygenFraction).toBe(0);
  });
  it('shares an exact ballistic endpoint and yaw-rotated lip with the displayed pour', () => {
    const source = specimen({ id: 'source', rotationY: Math.PI / 2, contents: [amount('H2O', 50, 'l')], substances: ['H2O'], mass_g: 50 });
    const target = specimen({ id: 'target', position: [3, -0.135, 1], contents: [amount('H2O', 10, 'l')],
      substances: ['H2O'], mass_g: 10, volume_ml: 10 });
    useAppStore.setState({ vessels: { source, target }, activeKinetics: {}, burners: {}, isSimulationPaused: false });
    PourController.beginPour({ mode: 'ASSIST', sourceId: 'source', targetId: 'target' });
    PourController.setTilt(1.5);
    for (let i = 0; i < 45; i++) PourController.tick(1 / 60);
    const session = PourController.getSession()!, trajectory = session.trajectory!;
    const t = trajectory.timeOfFlight;
    expect(trajectory.exitPos[0] + trajectory.exitVel[0] * t).toBeCloseTo(trajectory.impactPos[0], 10);
    expect(trajectory.exitPos[1] + trajectory.exitVel[1] * t - 0.5 * SCENE_GRAVITY * t * t).toBeCloseTo(trajectory.impactPos[1], 10);
    expect(session.aim.landing).toEqual(trajectory.impactPos);
    const profile = getWorldVesselProfile(source.type, source.capacity_ml), angle = session.sourceRotationZ!;
    const tiltedX = profile.lipLocal[0] * Math.cos(angle) - profile.lipLocal[1] * Math.sin(angle);
    expect(trajectory.exitPos[2]).toBeCloseTo(session.sourcePos![2] - tiltedX, 10);
  });
  it('partly immerses the sphere and supports it on the floor in shallow water', () => {
    const y = floatingPelletCenter(0, -1, 0.1);
    expect(y).toBeLessThan(0);
    expect(y + 0.1).toBeGreaterThan(0);
    expect(floatingPelletCenter(-0.99, -1, 0.1)).toBeCloseTo(-0.9, 10);
  });
  it('separates local melting from bulk boiling and does not infer an ignition point from melting', () => {
    expect(sodiumPelletThermal(0, 25).meltFactor).toBe(0);
    expect(sodiumPelletThermal(0.9, 25).meltFactor).toBeGreaterThan(0.5);
    expect(sodiumCanBurn(specimen())).toBe(false);
    expect(sodiumCanBurn(specimen(), true)).toBe(true);
    expect(sodiumCanBurn(specimen({ environment: { ...DEFAULT_LAB_ENVIRONMENT, oxygenFraction: 0 } }), true)).toBe(false);
  });
  it('reduces the open-water boiling point at reduced pressure and cools toward the actual room temperature', () => {
    expect(waterBoilingPointAtPressure(1)).toBeCloseTo(99.9743, 4);
    expect(waterBoilingPointAtPressure(0.8)).toBeGreaterThan(93);
    expect(waterBoilingPointAtPressure(0.8)).toBeLessThan(95);
    const v = specimen({ environment: { ...DEFAULT_LAB_ENVIRONMENT, pressure_atm: 0.8, temperature_c: 15 } });
    expect(aqueousBoilingPoint(v)).toBeLessThan(100);
    expect(stepVesselThermal(v, 30).temperature_c).toBeLessThan(25);
  });
  it('rests handheld instruments and shallow vessels on the actual visible bench', () => {
    expect(restingToolHeight('pipette', 100) - 0.135).toBeCloseTo(LAB_PHYSICS.TABLE_SURFACE_Y, 10);
    expect(restingVesselHeight('petri_dish') - 0.22).toBeCloseTo(LAB_PHYSICS.TABLE_SURFACE_Y, 10);
    expect(restingVesselHeight('hot_plate')).toBe(LAB_PHYSICS.TABLE_SURFACE_Y);
  });
  it('keeps sodium recoil inside narrow cylinders and does not invent pink trails', () => {
    const v = specimen({ type: 'cylinder', capacity_ml: 100 });
    useAppStore.setState({ vessels: { [v.id]: v } });
    const engine = ReactionSimulationEngine.getInstance();
    const runtime = engine.startReaction(v.id, 'na_h2o', { duration: 15 })!;
    for (let i = 0; i < 300; i++) {
      engine.update(1 / 60);
      expect(Math.hypot(runtime.customData.x, runtime.customData.z)).toBeLessThanOrEqual(sodiumSurfaceRadius(v) + 1e-10);
    }
    expect(runtime.customData.trailPoints).toHaveLength(0);
    expect(runtime.customData.isIgnited).toBe(false);
    const context = { vessel: v, runtime } as ReactionContext;
    expect(new SodiumWaterController().getReactionZone(context).position[1]).toBe(vesselLiquidSurfaceY(v));
    expect(runtime.temperature).toBe(25);
  });
});

describe('Pellet contact motion does not prescribe vessel failure from mass', () => {
  it('a small sodium piece follows contact motion without inventing vessel failure', () => {
    const v = specimen({
      id: 'small_na_vessel',
      contents: [amount('Na', 0.1, 's'), amount('H2O', 50, 'l')],
      substances: ['Na', 'H2O'],
    });
    useAppStore.setState({ vessels: { [v.id]: v } });
    const engine = ReactionSimulationEngine.getInstance();
    const runtime = engine.startReaction(v.id, 'na_h2o', { duration: 10 })!;

    // Simulate multiple frames of motion
    for (let i = 0; i < 60; i++) {
      engine.update(1 / 60);
    }

    expect(runtime.customData.hasExploded).toBeUndefined();
    expect(runtime.customData.isOversized).toBeUndefined();
    expect(runtime.customData.circleRadius).toBeGreaterThan(0);
    expect(useAppStore.getState().vessels[v.id].isShattered).toBeFalsy();
  });

  it('a larger sodium piece does not imply a timed detonation or fabricate spills', () => {
    const v = specimen({
      id: 'big_na_vessel',
      contents: [amount('Na', 0.8, 's'), amount('H2O', 50, 'l')],
      substances: ['Na', 'H2O'],
      volume_ml: 50,
      mass_g: 50.8,
    });
    const plan = planSodiumWater(v, 'vi')!;
    useAppStore.setState({
      vessels: { [v.id]: plan.vessel },
      activeKinetics: { [v.id]: plan.kinetics },
      burners: {},
      spills: {},
      isSimulationPaused: false,
    });

    // Advance physical chemistry beyond the old hard-coded detonation time.
    for (let i = 0; i < 30; i++) {
      useAppStore.getState().tickSimulation(0.05);
      if (useAppStore.getState().vessels[v.id]?.isShattered) break;
    }

    const state = useAppStore.getState();
    const current = state.vessels[v.id];
    expect(current.isShattered).toBeFalsy();
    expect(current.shatterReason).toBeUndefined();
    expect(state.activeKinetics[v.id]).toBeDefined();
    expect(current.contents.find(c => c.formula === 'Na')!.mass_g).toBeLessThan(0.8);
    expect(current.escapedGas_g?.H2).toBeGreaterThan(0);
    expect(current.hydrogenCombustion?.burning).toBe(false);
    expect(Object.values(state.spills)).toHaveLength(0);
    expect(current.mass_g + Object.values(current.escapedGas_g ?? {}).reduce((sum, g) => sum + g, 0)
      + (current.evaporated_ml ?? 0) - (current.wallCondensation?.returned_g ?? 0)).toBeCloseTo(50.8, 8);

  });

  it('resolves na_h2o directly in getReactionController registry', () => {
    const controller = getReactionController('na_h2o');
    expect(controller).not.toBeNull();
    expect(controller).toBeInstanceOf(SodiumWaterController);
  });

  it('defaults spatula sodium scoop to safe 0.1g rather than dangerous 0.5g', () => {
    useAppStore.getState().setSpatulaScoop('Na');
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0.1);

    // Non-sodium chemicals still default to 0.5g
    useAppStore.getState().setSpatulaScoop('NaCl');
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0.5);
  });

  it('triggers sodium water reaction when pouring water onto dry sodium metal', async () => {
    const dryVessel = specimen({
      id: 'dry_na_vessel',
      contents: [amount('Na', 0.1, 's')],
      substances: ['Na'],
      volume_ml: 0,
      mass_g: 0.1,
    });
    useAppStore.setState({
      vessels: { [dryVessel.id]: dryVessel },
      activeKinetics: {},
      burners: {},
      spills: {},
    });

    // Add 40 mL of water onto the dry sodium
    await useAppStore.getState().mixSubstances(dryVessel.id, 'H2O', 40);

    const kinetics = useAppStore.getState().activeKinetics[dryVessel.id];
    expect(kinetics).toBeDefined();
    expect(kinetics.reactionName).toMatch(/natri|sodium/i);
    expect(useAppStore.getState().vessels[dryVessel.id].volume_ml).toBe(40);
  });

  it('emits realistic liquid explosion and water splatter events matching vessel liquid color and substances', () => {
    const v = specimen({
      id: 'splatter_vessel',
      contents: [amount('Na', 0.8, 's'), amount('H2O', 50, 'l')],
      substances: ['Na', 'H2O'],
      liquidColor: '#38bdf8',
      volume_ml: 50,
      mass_g: 50.8,
    });
    useAppStore.setState({ vessels: { [v.id]: v } });

    let receivedExplosion: any = null;
    let receivedSplatter: any = null;
    const unsubExp = vfxBus.on('explosion', e => { receivedExplosion = e; });
    const unsubSpl = vfxBus.on('acid:splatter', e => { receivedSplatter = e; });

    useAppStore.getState().shatterVessel(v.id, 'Nổ natri');

    unsubExp();
    unsubSpl();

    expect(receivedExplosion).not.toBeNull();
    expect(receivedExplosion.liquidColor).toBe('#38bdf8');
    expect(receivedExplosion.substances).toContain('H2O');
    expect(receivedExplosion.isAcid).toBe(false);

    expect(receivedSplatter).not.toBeNull();
    expect(receivedSplatter.color).toBe('#38bdf8');
    expect(receivedSplatter.isAcid).toBe(false);
    expect(receivedSplatter.count).toBeGreaterThan(40);
  });
});


