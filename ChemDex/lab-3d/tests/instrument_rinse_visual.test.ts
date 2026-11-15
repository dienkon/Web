import { describe, expect, it } from 'vitest';
import { Euler, Group, Vector3 } from 'three';
import type { VesselState } from '../src/types/chemistry';
import type { RinseSession } from '../src/handling/instrumentRinse';
import { HANDHELD_PIPETTE_TIP_LOCAL_Y } from '../src/handling/dropFlight';
import { vesselBodyTransform } from '../src/science/vesselScale';
import { RinsePoseMotion, WASH_BOTTLE_NOZZLE_LOCAL, rinseBottlePose, rinseNozzleTarget,
  rinseToolContact, rinseToolPose, rinseStationRadius, type RinseVisualPose } from '../src/handling/instrumentRinseVisual';

const session = (overrides: Partial<RinseSession> = {}): RinseSession => ({ id: 1, epoch: 2, tool: 'pipette',
  bottleId: 'water', elapsed_s: 0, target_ml: 5, dispensed_ml: 0, phase: 'positioning', anchor: [1.2, 0.2, 2.5], ...overrides });
const rest: RinseVisualPose = { position: [-3, 0.3, 1], rotation: [-Math.PI / 2, 0, 0] };

describe('finite rinse presentation', () => {
  it.each(['pipette', 'stirring_rod', 'spatula'] as const)('places the existing %s working end exactly over the collection tray', tool => {
    const rinse = session({ tool }), pose = rinseToolPose(rinse);
    const localTip = new Vector3(0, tool === 'pipette' ? HANDHELD_PIPETTE_TIP_LOCAL_Y : tool === 'spatula' ? -0.58 : 0, 0);
    localTip.applyEuler(new Euler(...pose.rotation)).add(new Vector3(...pose.position));
    expect(localTip.distanceTo(new Vector3(...rinseToolContact(rinse)))).toBeLessThan(1e-12);
  });

  it.each([25, 250, 500])('keeps the real %s mL bottle nozzle on the stream origin without moving its inventory pose', capacity_ml => {
    const bottle = { type: 'wash_bottle', capacity_ml, position: [-7, -0.135, -2], rotationY: 1 } as VesselState;
    const rinse = session(), pose = rinseBottlePose(rinse, bottle), { scale, offsetY } = vesselBodyTransform(bottle);
    const actual = new Vector3(WASH_BOTTLE_NOZZLE_LOCAL[0] * scale,
      WASH_BOTTLE_NOZZLE_LOCAL[1] * scale + offsetY, WASH_BOTTLE_NOZZLE_LOCAL[2] * scale)
      .applyEuler(new Euler(...pose.rotation)).add(new Vector3(...pose.position));
    expect(actual.distanceTo(new Vector3(...rinseNozzleTarget(rinse, bottle)))).toBeLessThan(1e-12);
    expect(bottle.position).toEqual([-7, -0.135, -2]);
  });

  it('uses only session elapsed time while approaching and reaches the exact contact by washing', () => {
    const motion = new RinsePoseMotion(), group = new Group();
    group.position.set(...rest.position); group.rotation.set(...rest.rotation);
    motion.apply(group, session(), rinseToolPose(session()), rest, 0.1, 2);
    const intermediate = session({ elapsed_s: 0.15 });
    motion.apply(group, intermediate, rinseToolPose(intermediate), rest, 0.1, 2);
    group.updateMatrix(); const fixed = group.matrix.clone();
    for (let i = 0; i < 50; i++) motion.apply(group, intermediate, rinseToolPose(intermediate), rest, 0, 2);
    group.updateMatrix(); expect(group.matrix.elements).toEqual(fixed.elements);
    const washing = session({ elapsed_s: 0.5, phase: 'washing', dispensed_ml: 0.3 });
    motion.apply(group, washing, rinseToolPose(washing), rest, 0.1, 2);
    expect(group.position.distanceTo(new Vector3(...rinseToolPose(washing).position))).toBeLessThan(1e-12);
  });

  it('freezes a cancelled return while paused, then returns to the current dock exactly', () => {
    const motion = new RinsePoseMotion(), group = new Group(), washing = session({ elapsed_s: 1, phase: 'washing' });
    motion.apply(group, washing, rinseToolPose(washing), rest, 0.1, 2);
    expect(motion.hasPose).toBe(true);
    const start = group.position.clone();
    motion.apply(group, null, null, rest, 0, 2); expect(group.position.equals(start)).toBe(true);
    for (let i = 0; i < 100; i++) motion.apply(group, null, null, rest, 1 / 60, 2);
    expect(group.position.toArray()).toEqual(rest.position);
    expect(motion.hasPose).toBe(false);
    expect(motion.apply(group, null, null, rest, 1 / 60, 2)).toBe(false);
  });

  it('reserves the bottle and long rod footprint, including different bottle capacities', () => {
    for (const capacity_ml of [25, 250, 500]) {
      const bottle = { type: 'wash_bottle', capacity_ml } as VesselState;
      const rinse = session({ tool: 'stirring_rod' }), pose = rinseToolPose(rinse);
      const end = new Vector3(0, 4.8, 0).applyEuler(new Euler(...pose.rotation)).add(new Vector3(...pose.position));
      const radius = rinseStationRadius(bottle);
      expect(Math.hypot(end.x - rinse.anchor[0], end.z - rinse.anchor[2])).toBeLessThan(radius);
      expect(radius).toBeGreaterThan(1);
    }
  });

  it('drops the old visual pose after reset and can start a fresh rinse', () => {
    const motion = new RinsePoseMotion(), group = new Group(), washing = session({ elapsed_s: 1, phase: 'washing' });
    motion.apply(group, washing, rinseToolPose(washing), rest, 0.1, 2);
    const newDock: RinseVisualPose = { position: [5, 0.3, -2], rotation: [0, 0, 0] };
    expect(motion.apply(group, null, null, newDock, 0, 3)).toBe(false);
    expect(group.position.toArray()).toEqual(newDock.position);
    const next = session({ id: 2, epoch: 3, elapsed_s: 0 });
    motion.apply(group, next, rinseToolPose(next), newDock, 0.1, 3);
    expect(group.position.toArray()).toEqual(newDock.position);
  });
});
