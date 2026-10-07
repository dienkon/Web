import { describe, it, expect } from 'vitest';
import { stepPourSimulation, SimVessel, PourPhysicsSession } from '../src/pour/physics/step';
import { calculateStreamBallistics } from '../src/pour/physics/ballistics';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { findPouringTilt } from '../src/pour/physics/retained';
import { useAppStore } from '../src/store/useAppStore';
import { PourController } from '../src/pour/controller/PourController';

describe('Phase A — Guaranteed Controlled Pouring & Liquid Conservation (§3.7)', () => {
  const vesselTypes = ['beaker', 'flask', 'cylinder', 'test_tube', 'reagent_bottle'];
  const startingVolumes = [15, 30, 60, 100, 150, 200];
  const positionOffsets: Array<[number, number, number]> = [
    [-0.35, 0.45, 0.0],
    [-0.45, 0.55, 0.05],
    [-0.25, 0.40, -0.05],
    [-0.50, 0.60, 0.0],
    [-0.30, 0.50, 0.02]
  ];

  it('executes >= 100 controlled pours with 100% success rate, 0 spills, 0 liquid lost', () => {
    let successfulPours = 0;
    let accidentalSpills = 0;
    let targetMisses = 0;
    let totalPoursExecuted = 0;

    // Run matrix of test cases covering all vessel types, starting volumes, positions, and tilt angles
    for (let testIdx = 0; testIdx < 120; testIdx++) {
      totalPoursExecuted++;

      const srcType = vesselTypes[testIdx % vesselTypes.length];
      const tgtType = vesselTypes[(testIdx + 1) % vesselTypes.length];
      const startVol = startingVolumes[testIdx % startingVolumes.length];
      const offset = positionOffsets[testIdx % positionOffsets.length];

      const tgtProfile = getVesselProfile(tgtType);
      const srcProfile = getVesselProfile(srcType);

      const targetPos: [number, number, number] = [0.0, -0.135, 0.0];
      const sourcePos: [number, number, number] = [
        targetPos[0] + offset[0],
        targetPos[1] + offset[1] + tgtProfile.lipLocal[1],
        targetPos[2] + offset[2]
      ];

      const initialSourceVol = Math.min(startVol, srcProfile.capacity_ml * 0.9);
      const tiltRad = findPouringTilt(srcProfile, initialSourceVol);
      const initialTargetVol = 10; // 10 mL initial liquid in recipient
      const targetCapacity = tgtProfile.capacity_ml;

      const sourceVessel: SimVessel = {
        id: `src_${testIdx}`,
        type: srcType,
        position: [...sourcePos],
        rotationZ: -tiltRad,
        volume_ml: initialSourceVol,
        capacity_ml: srcProfile.capacity_ml,
        mass_g: initialSourceVol * 1.0,
        density_g_ml: 1.0,
        temperature_c: 25.0,
        colorHex: '#38bdf8',
        substances: ['H2O']
      };

      const targetVessel: SimVessel = {
        id: `tgt_${testIdx}`,
        type: tgtType,
        position: [...targetPos],
        rotationZ: 0,
        volume_ml: initialTargetVol,
        capacity_ml: targetCapacity,
        mass_g: initialTargetVol * 1.0,
        density_g_ml: 1.0,
        temperature_c: 25.0,
        colorHex: '#38bdf8',
        substances: ['H2O']
      };

      const vesselsMap: Record<string, SimVessel> = {
        [sourceVessel.id]: sourceVessel,
        [targetVessel.id]: targetVessel
      };

      let session: PourPhysicsSession = {
        sourceId: sourceVessel.id,
        targetId: targetVessel.id,
        sourcePos: [...sourcePos],
        tilt: tiltRad,
        sourceRotationZ: -tiltRad,
        isStreaming: true,
        totalTransferred_ml: 0,
        totalSpilled_ml: 0,
        lastFlowRate: 0,
        assist: 'high'
      };

      // Verify ballistics target acquisition
      const targetMetrics = {
        id: targetVessel.id,
        position: targetVessel.position,
        mouthR: tgtProfile.mouthR,
        mouthY: targetVessel.position[1] + tgtProfile.lipLocal[1],
        liquidSurfaceY: targetVessel.position[1] - 0.92 + 0.5
      };

      const ballistics = calculateStreamBallistics(
        sourcePos,
        -tiltRad,
        srcProfile,
        0.5,
        targetMetrics,
        -0.135,
        0,
        'high'
      );

      if (ballistics.landingKind !== 'inside') {
        targetMisses++;
      }

      // Simulate 30 fixed frames of pouring (0.5 seconds of physical transfer)
      const DT = 1 / 60;
      for (let f = 0; f < 30; f++) {
        const step = stepPourSimulation(session, vesselsMap, DT, f * DT);
        session = step.nextSession;
        vesselsMap[sourceVessel.id] = step.updatedSource;
        if (step.updatedTarget) {
          vesselsMap[targetVessel.id] = step.updatedTarget;
        }

        for (const evt of step.events) {
          if (evt.type === 'spill') {
            accidentalSpills++;
          }
        }
      }

      const finalSource = vesselsMap[sourceVessel.id];
      const finalTarget = vesselsMap[targetVessel.id];

      const transferred = session.totalTransferred_ml;
      const sourceDecrease = initialSourceVol - finalSource.volume_ml;
      const targetIncrease = finalTarget.volume_ml - initialTargetVol;

      // Transfer must have occurred because vessel is tilted above weir threshold
      expect(transferred).toBeGreaterThan(0);

      // Exact numerical conservation: source decrease == target increase
      expect(Math.abs(sourceDecrease - targetIncrease)).toBeLessThan(1e-4);
      expect(Math.abs(sourceDecrease - transferred)).toBeLessThan(1e-4);

      // No lost liquid
      const totalMatterInitial = initialSourceVol + initialTargetVol;
      const totalMatterFinal = finalSource.volume_ml + finalTarget.volume_ml + session.totalSpilled_ml;
      expect(Math.abs(totalMatterInitial - totalMatterFinal)).toBeLessThan(1e-4);

      successfulPours++;
    }

    expect(totalPoursExecuted).toBeGreaterThanOrEqual(100);
    expect(successfulPours).toBe(totalPoursExecuted);
    expect(targetMisses).toBe(0);
    expect(accidentalSpills).toBe(0);
  });

  it('guarantees commitCurrentPour does not double-count volume in useAppStore', async () => {
    const store = useAppStore.getState();
    store.resetWorkbench();

    // Fill beaker_1 with 50mL H2O and flask_1 with 20mL H2O
    await useAppStore.getState().mixSubstances('beaker_1', 'H2O', 50);
    await useAppStore.getState().mixSubstances('flask_1', 'H2O', 20);

    const b1Init = useAppStore.getState().vessels['beaker_1'].volume_ml;
    const f1Init = useAppStore.getState().vessels['flask_1'].volume_ml;
    expect(b1Init).toBeCloseTo(50, 1);
    expect(f1Init).toBeCloseTo(20, 1);

    const pourCtrl = PourController;
    pourCtrl.beginPour({
      mode: 'ASSIST',
      sourceId: 'beaker_1',
      targetId: 'flask_1',
      requestedVolume_ml: 15
    });

    // Advance physical transfer through lift, tilt, and pouring phases
    pourCtrl.setTilt(1.25);
    for (let i = 0; i < 100; i++) {
      pourCtrl.tick(0.016);
    }

    const session = pourCtrl.getSession();
    expect(session).toBeDefined();
    const transferred = session!.transferred_ml;
    expect(transferred).toBeGreaterThan(0);

    // Commit current pour through storeBridge
    await pourCtrl.commitCurrentPour();

    const b1Final = useAppStore.getState().vessels['beaker_1'].volume_ml;
    const f1Final = useAppStore.getState().vessels['flask_1'].volume_ml;

    // Total volume before and after must be strictly conserved without double addition
    expect(b1Final + f1Final).toBeCloseTo(b1Init + f1Init, 1);
    expect(f1Final).toBeCloseTo(f1Init + transferred, 1);
    expect(b1Final).toBeCloseTo(b1Init - transferred, 1);
  });
});
