import { afterEach, describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { stockLocalMatrix } from '../src/physical/stockCoordinates';
import { clearStockPresentation, presentedStockLocalMatrix, presentedStockPose, publishStockPresentation } from '../src/physical/stockPresentation';
import { scenePointToSI } from '../src/science/sceneUnits';
import { vesselBodyTransform, vesselLocalToWorld } from '../src/science/vesselScale';
import type { StockContainerPose, StockGrainPose } from '../src/physical/stockTypes';
import type { VesselState } from '../src/types/chemistry';

afterEach(clearStockPresentation);
const vessel = (position: [number, number, number], rotationY = 0) => ({ id: 'sample', type: 'beaker', capacity_ml: 100,
  position, rotationY } as VesselState);
const bodyMatrix = (v: VesselState) => {
  const transform = vesselBodyTransform(v);
  return new Matrix4().compose(new Vector3(...v.position), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), v.rotationY), new Vector3(1, 1, 1))
    .multiply(new Matrix4().makeTranslation(0, transform.offsetY, 0)).scale(new Vector3().setScalar(transform.scale));
};
const container = (v: VesselState, carryStock = false): StockContainerPose => ({ id: v.id, position_m: scenePointToSI(v.position),
  rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), v.rotationY).toArray(), carryStock });
const grain = (v: VesselState): StockGrainPose => ({ id: 'stock:1', formula: 'Fe', mass_g: 1, scale_m: 0.002,
  position_m: scenePointToSI(vesselLocalToWorld(v, [0.12, -0.8, -0.2])),
  rotation: container(v).rotation, velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: true, powder: false });
const expectMatrix = (actual: Matrix4, expected: Matrix4) => actual.elements.forEach((value, index) => expect(value).toBeCloseTo(expected.elements[index], 10));

describe('carried stock display', () => {
  it('follows a moved glass before its worker reply without moving the authoritative grain', () => {
    const original = vessel([1, 0, 2]), moved = vessel([5, 0.35, -1], 0.75), pose = grain(original);
    const canonical = structuredClone(pose), expected = stockLocalMatrix(original, pose);
    publishStockPresentation([pose], 1 / 30, 100, [container(original)]);
    expectMatrix(presentedStockLocalMatrix(moved, pose, bodyMatrix(moved), true, 105), expected);
    expect(pose).toEqual(canonical);
    // Ordinary/free motion remains in world space instead of attaching to a moved glass.
    clearStockPresentation(); publishStockPresentation([pose], 1 / 30, 100, [container(original)]);
    const ordinary = presentedStockLocalMatrix(moved, pose, bodyMatrix(moved), false, 105);
    expectMatrix(bodyMatrix(moved).multiply(ordinary), bodyMatrix(original).multiply(expected));
  });

  it('keeps drop placement and the release reply in the same local frame', () => {
    const raised = vessel([4, 0.35, -1], 0.75), lowered = vessel([4, 0, -1], 0.75);
    const raisedPose = grain(raised), releasePose = grain(lowered), expected = stockLocalMatrix(raised, raisedPose);
    const before = structuredClone(raisedPose), after = structuredClone(releasePose);
    publishStockPresentation([raisedPose], 1 / 30, 100, [container(raised, true)]);
    // The pointer is already released; the old worker snapshot still says carried.
    expectMatrix(presentedStockLocalMatrix(lowered, raisedPose, bodyMatrix(lowered), false, 140), expected);
    publishStockPresentation([releasePose], 1 / 30, 200, [container(lowered)]);
    // Interpolate local coordinates, never an old elevated world coordinate.
    expectMatrix(presentedStockLocalMatrix(lowered, releasePose, bodyMatrix(lowered), false, 200 + 1000 / 60), expected);
    expectMatrix(presentedStockLocalMatrix(lowered, releasePose, bodyMatrix(lowered), false, 240), expected);
    expect(raisedPose).toEqual(before); expect(releasePose).toEqual(after);
  });

  it('preserves world-space interpolation for a genuine tilt or pour', () => {
    const initial = vessel([0, 0, 0]), tilted = vessel([1, 0.6, 0], 0.9);
    const first = grain(initial), second = grain(tilted);
    publishStockPresentation([first], 1 / 30, 0, [container(initial)]);
    publishStockPresentation([second], 1 / 30, 100, [container(tilted)]);
    const now = 100 + 1000 / 60;
    expectMatrix(presentedStockLocalMatrix(tilted, second, bodyMatrix(tilted), false, now),
      stockLocalMatrix(tilted, presentedStockPose(second, now), bodyMatrix(tilted)));
    expect(second.position_m).not.toEqual(presentedStockPose(second, now).position_m);
  });

  it('keeps the old matching container frame when chemistry or reply rejection retains a grain pose', () => {
    const original = vessel([0, 0, 0]), moved = vessel([4, 0.35, -2], 0.75), pose = grain(original);
    publishStockPresentation([pose], 1 / 30, 100, [container(original)]);
    const consumed = { ...pose, mass_g: 0.5, scale_m: pose.scale_m * Math.cbrt(0.5) };
    // This vessel did not accept the new mechanics reply; its canonical arrays
    // still refer to the original coordinates while chemistry spent some mass.
    publishStockPresentation([consumed], 1 / 30, 200, [container(moved, true)]);
    expectMatrix(presentedStockLocalMatrix(moved, consumed, bodyMatrix(moved), true, 220),
      stockLocalMatrix(original, consumed));
    expect(consumed.position_m).toBe(pose.position_m);
  });

  it('carries a complete rapid drag before its first reply, then releases normal world motion', () => {
    const initial = vessel([0, 0, 0]), raised = vessel([4, 0.35, -1]), placed = vessel([4, 0, -1]);
    const initialPose = grain(initial), placedPose = grain(placed), expected = stockLocalMatrix(initial, initialPose);
    publishStockPresentation([initialPose], 1 / 30, 100, [container(initial)]);
    expectMatrix(presentedStockLocalMatrix(raised, initialPose, bodyMatrix(raised), true, 140), expected);
    // Pointer-up happens while the only accepted reply predates the entire drag.
    expectMatrix(presentedStockLocalMatrix(placed, initialPose, bodyMatrix(placed), false, 150), expected);
    publishStockPresentation([placedPose], 1 / 30, 200, [container(placed)]);
    expectMatrix(presentedStockLocalMatrix(placed, placedPose, bodyMatrix(placed), false, 210), expected);
    expectMatrix(presentedStockLocalMatrix(placed, placedPose, bodyMatrix(placed), false, 240), expected);
    // Once the released frame catches up, a later physical movement/pour must
    // not retain the move-tool attachment while waiting for another reply.
    const later = vessel([4, 0.6, -1], 0.8);
    expectMatrix(presentedStockLocalMatrix(later, placedPose, bodyMatrix(later), false, 250),
      stockLocalMatrix(later, placedPose, bodyMatrix(later)));
  });

  it('releases after float32 worker coordinates catch an exact nonbinary glass position', () => {
    const initial = vessel([0.12345, -0.13579, 0.54321]);
    const placed = vessel([12.3456789, -0.135791113, 4.56789123], 0.713456);
    const initialPose = grain(initial);
    const quantized = { ...grain(placed), position_m: grain(placed).position_m.map(Math.fround) as [number, number, number] };
    const exactFrame = container(placed), workerFrame = { ...exactFrame,
      position_m: exactFrame.position_m.map(Math.fround) as [number, number, number],
      rotation: exactFrame.rotation.map(Math.fround) as [number, number, number, number] };
    publishStockPresentation([initialPose], 1 / 30, 100, [container(initial)]);
    presentedStockLocalMatrix(placed, initialPose, bodyMatrix(placed), true, 140);
    publishStockPresentation([quantized], 1 / 30, 200, [workerFrame]);
    presentedStockLocalMatrix(placed, quantized, bodyMatrix(placed), false, 240);
    const pouring = vessel([12.5, 0.6, 4.8], 1.3);
    expectMatrix(presentedStockLocalMatrix(pouring, quantized, bodyMatrix(pouring), false, 250),
      stockLocalMatrix(pouring, quantized, bodyMatrix(pouring)));
  });

  it('handles repeated rapid drags and a restored coordinate branch without keeping a carry latch', () => {
    const initial = vessel([0, 0, 0]), first = vessel([2, 0, 1]), second = vessel([-3, 0, -2]);
    const initialPose = grain(initial), firstPose = grain(first), secondPose = grain(second);
    publishStockPresentation([initialPose], 1 / 30, 100, [container(initial)]);
    presentedStockLocalMatrix(first, initialPose, bodyMatrix(first), true, 140);
    presentedStockLocalMatrix(first, initialPose, bodyMatrix(first), false, 150);
    presentedStockLocalMatrix(second, initialPose, bodyMatrix(second), true, 160);
    // The first release is now stale; it must not detach the second gesture.
    publishStockPresentation([firstPose], 1 / 30, 200, [container(first)]);
    expectMatrix(presentedStockLocalMatrix(second, firstPose, bodyMatrix(second), false, 240), stockLocalMatrix(first, firstPose));
    publishStockPresentation([secondPose], 1 / 30, 300, [container(second)]);
    presentedStockLocalMatrix(second, secondPose, bodyMatrix(second), false, 340);
    const pouring = vessel([-2.8, 0.8, -1.9], 1.1);
    expectMatrix(presentedStockLocalMatrix(pouring, secondPose, bodyMatrix(pouring), false, 350),
      stockLocalMatrix(pouring, secondPose, bodyMatrix(pouring)));

    // A restore can replace the canonical pose before its worker reply arrives.
    presentedStockLocalMatrix(first, secondPose, bodyMatrix(first), true, 360);
    const restored = grain(initial);
    expectMatrix(presentedStockLocalMatrix(initial, restored, bodyMatrix(initial), false, 370), stockLocalMatrix(initial, restored));
    publishStockPresentation([restored], 1 / 30, 400, [container(initial)]);
    expectMatrix(presentedStockLocalMatrix(pouring, restored, bodyMatrix(pouring), false, 440), stockLocalMatrix(pouring, restored, bodyMatrix(pouring)));
  });
});
