import { Euler, Quaternion, Vector3, type Group } from 'three';
import type { VesselState } from '../types/chemistry';
import { vesselBodyTransform } from '../science/vesselScale';
import { vesselContours } from '../science/vesselContours';
import { STIRRING_ROD_LENGTH, STIRRING_ROD_RADIUS } from '../science/stirringRodPose';
import { HANDHELD_PIPETTE_TIP_LOCAL_Y } from './dropFlight';
import { RINSE_POSITION_S, type RinseSession } from './instrumentRinse';

export type RinseVisualPose = { position: [number, number, number]; rotation: [number, number, number] };

// The apex of the existing WashBottle cone, including its swan-neck parent.
export const WASH_BOTTLE_NOZZLE_LOCAL: [number, number, number] = [
  0.06 + 0.34 + Math.sin(Math.PI / 2.5) * 0.09,
  1.48 + 0.48 + Math.cos(Math.PI / 2.5) * 0.09,
  0,
];

export function rinseToolContact(session: RinseSession): [number, number, number] {
  return [session.anchor[0], session.anchor[1] + 0.15, session.anchor[2]];
}

/** Hold the same tool by its handle, with its working end over the tray. */
export function rinseToolPose(session: RinseSession): RinseVisualPose {
  const localTipY = session.tool === 'pipette' ? HANDHELD_PIPETTE_TIP_LOCAL_Y
    : session.tool === 'spatula' ? -0.58 : 0;
  const contact = rinseToolContact(session);
  const rotation: [number, number, number] = [0, 0, -Math.PI / 12];
  const tip = new Vector3(0, localTipY, 0).applyEuler(new Euler(...rotation));
  return { position: [contact[0] - tip.x, contact[1] - tip.y, contact[2] - tip.z], rotation };
}

/** The real bottle is held over the tray, without changing its inventory pose. */
export function rinseBottlePose(session: RinseSession, bottle: VesselState): RinseVisualPose {
  const geometry = rinseBottleGeometry(bottle), contact = rinseToolContact(session);
  return { position: [contact[0] - 0.15 - geometry.nozzle.x, session.anchor[1] + 0.01 - geometry.bottomY, contact[2]],
    rotation: [0, 0, -0.15] };
}

export function rinseNozzleTarget(session: RinseSession, bottle: VesselState): [number, number, number] {
  const geometry = rinseBottleGeometry(bottle), pose = rinseBottlePose(session, bottle);
  return [pose.position[0] + geometry.nozzle.x, pose.position[1] + geometry.nozzle.y, pose.position[2] + geometry.nozzle.z];
}

function rinseBottleGeometry(bottle: VesselState) {
  const { scale, offsetY } = vesselBodyTransform(bottle), tilt = new Euler(0, 0, -0.15);
  const convert = (x: number, y: number, z = 0) => new Vector3(x * scale, y * scale + offsetY, z * scale).applyEuler(tilt);
  const corners = vesselContours('wash_bottle').outer.flatMap(([r, y]) => [convert(r, y), convert(-r, y)]);
  return { nozzle: convert(...WASH_BOTTLE_NOZZLE_LOCAL), bottomY: Math.min(...corners.map(p => p.y)),
    corners, radiusZ: 0.74 * scale };
}

/** A conservative circle for the complete held bottle, tool and tray. */
export function rinseStationRadius(bottle: VesselState): number {
  const geometry = rinseBottleGeometry(bottle), centerX = -0.15 - geometry.nozzle.x;
  const bottleExtent = Math.max(...geometry.corners.map(p => Math.hypot(centerX + p.x, geometry.radiusZ)));
  return Math.max(bottleExtent, STIRRING_ROD_LENGTH * Math.sin(Math.PI / 12) + STIRRING_ROD_RADIUS, 0.8) + 0.1;
}

/** Presentation follows the session clock, so pause also freezes positioning.
 * A normal finish returns to the current dock; an epoch reset drops old poses. */
export class RinsePoseMotion {
  private active: { id: number; epoch: number; from: Vector3; rotation: Quaternion } | null = null;
  private readonly target = new Vector3();
  private readonly rotation = new Quaternion();
  get hasPose(): boolean { return this.active !== null; }

  apply(group: Group, session: RinseSession | null, pose: RinseVisualPose | null,
    returnPose: RinseVisualPose, dt: number, epoch: number): boolean {
    if (session && pose) {
      if (this.active?.id !== session.id) this.active = { id: session.id, epoch: session.epoch,
        from: group.position.clone(), rotation: group.quaternion.clone() };
      const t = Math.min(1, Math.max(0, session.elapsed_s / RINSE_POSITION_S));
      const progress = t * t * (3 - 2 * t);
      this.target.set(...pose.position);
      this.rotation.setFromEuler(new Euler(...pose.rotation));
      group.position.lerpVectors(this.active.from, this.target, progress);
      group.quaternion.slerpQuaternions(this.active.rotation, this.rotation, progress);
      return true;
    }
    if (!this.active) return false;
    this.target.set(...returnPose.position);
    this.rotation.setFromEuler(new Euler(...returnPose.rotation));
    if (this.active.epoch !== epoch) {
      this.active = null;
      group.position.copy(this.target); group.quaternion.copy(this.rotation);
      return false;
    }
    if (dt > 0) {
      const fraction = 1 - Math.exp(-dt * 14);
      group.position.lerp(this.target, fraction); group.quaternion.slerp(this.rotation, fraction);
      if (group.position.distanceToSquared(this.target) < 1e-7 && group.quaternion.angleTo(this.rotation) < 1e-4) {
        group.position.copy(this.target); group.quaternion.copy(this.rotation); this.active = null;
      }
    }
    return true;
  }
}
