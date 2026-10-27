import { describe, expect, it } from 'vitest';
import { CENTIMETERS_PER_SCENE_UNIT, METERS_PER_SCENE_UNIT, SCENE_GRAVITY,
  descendingFlightTime, streamRadiusForFlow, liquidDropRadius } from '../src/science/sceneUnits';
import { calculateStreamBallistics } from '../src/pour/physics/ballistics';
import { getVesselProfile, type VesselProfile } from '../src/pour/physics/profiles';
import { fallingContactTime } from '../src/handling/doseTiming';

const nozzle: VesselProfile = { ...getVesselProfile('beaker'), lipLocal: [0, 1, 0] };
const tube: VesselProfile = { type: 'test-tube', baseY: 0, H: 1, r: () => 0.1,
  lipLocal: [0.11, 1, 0], mouthR: 0.1, spoutWidth: 0.05, capacity_ml: 10, sceneScale: 3.5 };
const target = (profile = tube) => ({ id: 'target', position: [0, 0, 0] as [number, number, number],
  mouthY: 1, mouthR: profile.mouthR, liquidSurfaceY: 0, profile });
function endpoint(result: ReturnType<typeof calculateStreamBallistics>) {
  const time = result.timeOfFlight;
  expect(result.exitPos[0] + result.exitVel[0] * time).toBeCloseTo(result.impactPos[0], 10);
  expect(result.exitPos[1] + result.exitVel[1] * time - 0.5 * SCENE_GRAVITY * time * time).toBeCloseTo(result.impactPos[1], 10);
  expect(result.exitPos[2] + result.exitVel[2] * time).toBeCloseTo(result.impactPos[2], 10);
}
describe('Scene coordinates retain SI flight and volume units', () => {
  it('takes the physical free-fall time over one meter and keeps small-height roots stable', () => {
    expect(fallingContactTime(1 / METERS_PER_SCENE_UNIT)).toBeCloseTo(Math.sqrt(2 / 9.8), 12);
    expect(descendingFlightTime(1, -1e6, 0)).toBeCloseTo(1e-6, 12);
    expect(descendingFlightTime(0, 0, 1)).toBeNull();
    expect(descendingFlightTime(NaN, 0, 0)).toBeNull();
  });
  it('uses Torricelli speed in meters per second before conversion to scene velocity', () => {
    const result = calculateStreamBallistics([0, 3, 0], -0.8, nozzle, 2, null, -1.175);
    const speed_m_s = Math.hypot(...result.exitVel) * METERS_PER_SCENE_UNIT;
    expect(speed_m_s ** 2 / (2 * 9.8)).toBeCloseTo(0.02, 12);
    endpoint(result);
  });
  it('retains Q=A*v across stream narrowing and the actual volume of a nominal drop', () => {
    const radius = streamRadiusForFlow(5, 0.5 / METERS_PER_SCENE_UNIT) * CENTIMETERS_PER_SCENE_UNIT;
    expect(Math.PI * radius * radius * 50).toBeCloseTo(5, 12);
    expect(streamRadiusForFlow(5, 40) / streamRadiusForFlow(5, 10)).toBeCloseTo(0.5, 12);
    const drop_cm = liquidDropRadius(0.05) * CENTIMETERS_PER_SCENE_UNIT;
    expect(4 / 3 * Math.PI * drop_cm ** 3).toBeCloseTo(0.05, 12);
    expect(streamRadiusForFlow(0, 10)).toBe(0);
    expect(liquidDropRadius(NaN)).toBe(0);
    expect(liquidDropRadius(Infinity)).toBe(0);
  });
});
describe('A stream must pass through the real opening', () => {
  it('lands a missed opening on the bench instead of the target liquid plane', () => {
    const result = calculateStreamBallistics([-0.16, 1.5, 0], 0, nozzle, 0, target(), -1.175);
    expect(result.landingKind).toBe('table');
    expect(result.targetVesselId).toBeNull();
    expect(result.impactPos[1]).toBeCloseTo(-1.175, 10); endpoint(result);
  });
  it('classifies the actual rim separately from accepted liquid', () => {
    const result = calculateStreamBallistics([-0.105, 1.5, 0], 0, nozzle, 0, target(), -1.175);
    expect(result.landingKind).toBe('rim');
    expect(result.impactPos[1]).toBeCloseTo(1, 10); endpoint(result);
  });
  it('uses the drawn outer glass rim instead of the pouring-spout center', () => {
    const profile = getVesselProfile('beaker');
    const actual = { ...target(profile), liquidSurfaceY: -0.4 };
    const result = calculateStreamBallistics([1.02, 1.5, 0], 0, nozzle, 0, actual, -1.175);
    expect(result.landingKind).toBe('rim'); endpoint(result);
  });
  it('stops at the first inner-wall intersection after guided entry through a tapered opening', () => {
    const tapered = { ...tube, mouthR: 0.3, lipLocal: [0.31, 1, 0] as [number, number, number],
      r: (y: number) => 0.1 + 0.2 * Math.max(0, Math.min(1, y)) };
    const result = calculateStreamBallistics([-0.6, 1, 0], 0, nozzle, 1, target(tapered), -1.175, 0, 'high');
    expect(result.landingKind).toBe('inside');
    expect(result.detailKind).toBe('wall_inner');
    expect(result.impactPos[1]).toBeGreaterThan(0);
    expect(Math.hypot(result.impactPos[0], result.impactPos[2])).toBeCloseTo(tapered.r(result.impactPos[1]), 6);
    endpoint(result);
  });
  it('supports a nozzle already inside the headspace but rejects one outside the sidewall below the rim', () => {
    const inside = calculateStreamBallistics([0, -0.5, 0], 0, nozzle, 0, target(), -1.175);
    expect(inside.detailKind).toBe('liquid'); endpoint(inside);
    const outside = calculateStreamBallistics([0.2, -0.5, 0], 0, nozzle, 0, target(), -1.175);
    expect(outside.landingKind).toBe('table'); endpoint(outside);
  });
});
