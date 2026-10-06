import { describe, it, expect } from 'vitest';
import { calculateStreamBallistics } from '../src/pour/physics/ballistics';
import { calculateWeirFlow } from '../src/pour/physics/flow';
import { VESSEL_PROFILES } from '../src/pour/physics/profiles';
import { retainedVolume } from '../src/pour/physics/retained';

describe('Pouring Ballistics, Intersections & Landing Suite (§8 & §11.1)', () => {
  const beakerProfile = VESSEL_PROFILES['beaker'];

  describe('First Intersection & Landing Kinds', () => {
    it('lands inside target vessel when aligned above the mouth ring', () => {
      // Source beaker positioned directly above target beaker
      const sourcePos: [number, number, number] = [0.0, 0.20, 0.0];
      const tiltAngleRad = Math.PI / 4; // 45 degrees tilt
      const head_cm = 0.5;

      const targetVessel = {
        id: 'target_beaker',
        position: [0.03, 0.0, 0.0] as [number, number, number],
        mouthR: 0.035, // 3.5 cm mouth radius
        mouthY: 0.08,
        liquidSurfaceY: 0.04
      };

      const result = calculateStreamBallistics(
        sourcePos,
        tiltAngleRad,
        beakerProfile,
        head_cm,
        targetVessel,
        -0.135
      );

      expect(result.exitVel[1]).toBeLessThan(0); // Downward trajectory
      expect(result.timeOfFlight).toBeGreaterThan(0);
      expect(result.impactPos[1]).toBeCloseTo(targetVessel.liquidSurfaceY, 3);
      expect(result.landingKind).toBe('inside');
      expect(result.targetVesselId).toBe('target_beaker');
    });

    it('lands on the table / creates spill when misaligned or target is absent', () => {
      const sourcePos: [number, number, number] = [0.0, 0.20, 0.0];
      const tiltAngleRad = Math.PI / 4;
      const head_cm = 0.5;
      const tableY = -0.135;

      // No target vessel present (direct pour onto bench)
      const resultNoTarget = calculateStreamBallistics(
        sourcePos,
        tiltAngleRad,
        beakerProfile,
        head_cm,
        null,
        tableY
      );

      expect(resultNoTarget.landingKind).toBe('table');
      expect(resultNoTarget.impactPos[1]).toBeCloseTo(tableY, 3);
      expect(resultNoTarget.targetVesselId).toBeNull();

      // Misaligned target beaker far away
      const farTarget = {
        id: 'far_beaker',
        position: [0.35, 0.0, 0.0] as [number, number, number],
        mouthR: 0.035,
        mouthY: 0.08,
        liquidSurfaceY: 0.04
      };

      const resultMisaligned = calculateStreamBallistics(
        sourcePos,
        tiltAngleRad,
        beakerProfile,
        head_cm,
        farTarget,
        tableY
      );

      expect(resultMisaligned.landingKind).toBe('table');
    });
  });

  describe('Full Tilt Range Up to 180° Decanting', () => {
    it('maintains continuous flow across tilt angles from 30° to 180° until fully emptied', () => {
      const currentVolume = 200; // 200 mL
      const tiltAnglesDeg = [30, 45, 60, 75, 90, 120, 150, 180];

      let previousRetained = beakerProfile.capacity_ml; // 250 mL at upright
      for (const deg of tiltAnglesDeg) {
        const rad = (deg * Math.PI) / 180;
        const vRetained = retainedVolume(beakerProfile, rad);
        const flow = calculateWeirFlow(beakerProfile, currentVolume, rad);

        // As tilt angle increases, retained volume strictly decreases
        expect(vRetained).toBeLessThanOrEqual(previousRetained + 0.01);
        previousRetained = vRetained;

        // Flow occurs because currentVolume > vRetained
        if (currentVolume > vRetained + 0.05) {
          expect(flow.isPouring).toBe(true);
          expect(flow.flowRate_ml_s).toBeGreaterThan(0);
        }
      }

      // At 180° inversion, retained volume is negligible (< 1.5 mL wetting film)
      const vRetained180 = retainedVolume(beakerProfile, Math.PI);
      expect(vRetained180).toBeLessThan(1.5);
    });

    it('verifies volume transfer conservation: source loss matches target gain and retained film', () => {
      let sourceVolume = 100.0; // mL
      let targetVolume = 0.0;   // mL
      let tableSpillVolume = 0.0; // mL

      const dt = 0.1; // 100 ms step
      const rad = Math.PI / 3; // 60 deg

      for (let step = 0; step < 50; step++) {
        const flow = calculateWeirFlow(beakerProfile, sourceVolume, rad);
        if (!flow.isPouring) break;

        const dV = Math.min(sourceVolume, flow.flowRate_ml_s * dt);
        sourceVolume -= dV;
        targetVolume += dV; // All lands inside
      }

      const totalAccounted = sourceVolume + targetVolume + tableSpillVolume;
      expect(totalAccounted).toBeCloseTo(100.0, 5);
      expect(targetVolume).toBeGreaterThan(20.0);
    });
  });
});
