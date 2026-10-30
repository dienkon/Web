import { describe, expect, it } from 'vitest';
import { rectangularWeirDischarge, circularOrificeDischarge } from '../src/science/discharge';
import { overflowDropFlight } from '../src/science/overflowFlight';
import { METERS_PER_SCENE_UNIT, SCENE_GRAVITY } from '../src/science/sceneUnits';
import { calculateWeirFlow } from '../src/pour/physics/flow';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { solveLevel, retainedVolume } from '../src/pour/physics/retained';

describe('SI discharge and detached overflow drops', () => {
  it('recovers theoretical h^(3/2), width and area scaling without rate clamps', () => {
    const q = rectangularWeirDischarge(0.01, 0.02);
    expect(q).toBeCloseTo(0.62 * 2 / 3 * Math.sqrt(19.6) * 0.01 * 0.02 ** 1.5, 16);
    expect(rectangularWeirDischarge(0.02, 0.08) / q).toBeCloseTo(16, 12);
    expect(circularOrificeDischarge(0.002, 0.04) / circularOrificeDischarge(0.001, 0.01)).toBeCloseTo(8, 12);
  });
  it('uses solved free-surface head above the lip, not excess divided by area', () => {
    const profile = getVesselProfile('flask'), angle = 1.2, volume = 180;
    const level = solveLevel(profile, angle, volume);
    const lip = -Math.sin(angle) * profile.lipLocal[0] + Math.cos(angle) * profile.lipLocal[1];
    const flow = calculateWeirFlow(profile, volume, angle);
    expect(flow.head_cm).toBeCloseTo(Math.max(0, level.c - lip) * profile.sceneScale, 12);
    expect(flow.flowRate_ml_s).toBeGreaterThan(0);
  });
  it('does not manufacture a minimum 0.15 mL/s trickle or periodic discharge', () => {
    const p = getVesselProfile('beaker'), angle = 0.8;
    const flow = calculateWeirFlow(p, retainedVolume(p, angle) + 0.01, angle);
    expect(flow.flowRate_ml_s).toBeGreaterThan(0);
    expect(flow.flowRate_ml_s).toBeLessThan(0.15);
    const flask = getVesselProfile('flask');
    expect(calculateWeirFlow(flask, 200, 2.2, 0.1).flowRate_ml_s).toBe(calculateWeirFlow(flask, 200, 2.2, 0.7).flowRate_ml_s);
  });
  it('uses mouth area and the hydrostatic column when fully inverted', () => {
    const profile = getVesselProfile('beaker'), volume = 200;
    const c = solveLevel(profile, Math.PI, volume).c;
    const head_m = (c + profile.lipLocal[1]) * profile.sceneScale / 100;
    const expected = 0.62 * Math.PI * (profile.mouthR * profile.sceneScale / 100) ** 2 * Math.sqrt(19.6 * head_m) * 1e6;
    expect(calculateWeirFlow(profile, volume, Math.PI).flowRate_ml_s).toBeCloseTo(expected, 8);
  });
  it('matches a one-metre free fall and gives the same positions at every sample rate', () => {
    const from = 1 / METERS_PER_SCENE_UNIT;
    const flight = overflowDropFlight(from, 0, 0)!;
    expect(flight.flightTime_s).toBeCloseTo(Math.sqrt(2 / 9.8), 14);
    for (const fps of [30, 60, 120]) {
      const pose = overflowDropFlight(from, 0, (fps / 5) / fps)!;
      expect(pose.y).toBeCloseTo(from - 0.5 * SCENE_GRAVITY * 0.2 ** 2, 13);
      expect(pose.vy).toBeCloseTo(-SCENE_GRAVITY * 0.2, 13);
    }
    expect(overflowDropFlight(from, 0, 100)).toMatchObject({ arrived: true, y: 0 });
    for (const args of [[0, 1, 0], [1, 0, -1], [NaN, 0, 0]]) expect(overflowDropFlight(...args as [number, number, number])).toBeNull();
  });
});
