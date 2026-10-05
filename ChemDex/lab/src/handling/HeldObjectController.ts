/**
 * CHEMDEX LAB - HeldObjectController (K1.1)
 * Unified physics-based hand manipulation controller with critically-damped spring,
 * inertial smoothing, soft table collision, and quaternion posture tracking.
 */

import { GripKind } from './gripPoints';
import { clampLift, clampTilt } from './limits';

export type HandlingPhase = 'idle' | 'hover' | 'grabbing' | 'carrying' | 'placing' | 'released';

export interface HeldObjectState {
  id: string;
  type: string;
  held: boolean;
  phase: HandlingPhase;
  position: [number, number, number];
  velocity: [number, number, number];
  targetPosition: [number, number, number];
  quaternion: [number, number, number, number]; // [x, y, z, w]
  targetQuaternion: [number, number, number, number];
  lift: number;
  tiltX: number;
  tiltZ: number;
  yaw: number;
  grip: GripKind;
  speed: number;
}

export class HeldObjectController {
  public state: HeldObjectState;
  private readonly maxSpeed: number = 1.5; // max hand speed in scene units/s (~1.5 m/s)
  private readonly omega: number = 18.0;   // natural frequency of critically damped spring
  private readonly tableY: number = -0.135; // table surface height

  constructor(id: string, type: string, initialPos: [number, number, number] = [0, -0.135, 0]) {
    this.state = {
      id,
      type,
      held: false,
      phase: 'idle',
      position: [...initialPos],
      velocity: [0, 0, 0],
      targetPosition: [...initialPos],
      quaternion: [0, 0, 0, 1],
      targetQuaternion: [0, 0, 0, 1],
      lift: initialPos[1],
      tiltX: 0,
      tiltZ: 0,
      yaw: 0,
      grip: 'body',
      speed: 0
    };
  }

  public grab(grip: GripKind = 'body'): void {
    this.state.held = true;
    this.state.phase = 'grabbing';
    this.state.grip = grip;
  }

  public setTargetPosition(pos: [number, number, number]): void {
    const clampedY = clampLift(this.state.type, pos[1]);
    this.state.targetPosition = [pos[0], clampedY, pos[2]];
    if (this.state.phase === 'grabbing') {
      this.state.phase = 'carrying';
    }
  }

  public setTilt(radZ: number, radX: number = 0): void {
    this.state.tiltZ = clampTilt(this.state.type, radZ);
    this.state.tiltX = radX;
    this.updateTargetQuaternion();
  }

  public setYaw(radY: number): void {
    this.state.yaw = radY;
    this.updateTargetQuaternion();
  }

  public release(fallIfAir: boolean = true): void {
    this.state.held = false;
    this.state.phase = 'released';
  }

  private updateTargetQuaternion(): void {
    // Construct quaternion from Euler angles: Yaw (Y) * Pitch (X) * Roll/Tilt (Z)
    const c1 = Math.cos(this.state.yaw / 2);
    const s1 = Math.sin(this.state.yaw / 2);
    const c2 = Math.cos(this.state.tiltX / 2);
    const s2 = Math.sin(this.state.tiltX / 2);
    const c3 = Math.cos(this.state.tiltZ / 2);
    const s3 = Math.sin(this.state.tiltZ / 2);

    const x = s1 * s2 * c3 + c1 * c2 * s3;
    const y = s1 * c2 * c3 + c1 * s2 * s3;
    const z = c1 * s2 * c3 - s1 * c2 * s3;
    const w = c1 * c2 * c3 - s1 * s2 * s3;

    // Normalize
    const len = Math.hypot(x, y, z, w) || 1;
    this.state.targetQuaternion = [x / len, y / len, z / len, w / len];
  }

  /**
   * Physics step for 1 time increment dt using critically damped spring.
   * f = -2 * omega * v - omega^2 * (x - x_target)
   */
  public update(dt: number): void {
    if (dt <= 0) return;
    const clampedDt = Math.min(dt, 0.1); // Prevent explosion at frame spikes

    if (this.state.held) {
      // Critically-damped spring towards targetPosition
      for (let i = 0; i < 3; i++) {
        const delta = this.state.position[i] - this.state.targetPosition[i];
        const accel = -2 * this.omega * this.state.velocity[i] - this.omega * this.omega * delta;
        this.state.velocity[i] += accel * clampedDt;

        // Soft speed clamp
        const v = this.state.velocity[i];
        if (Math.abs(v) > this.maxSpeed) {
          this.state.velocity[i] = Math.sign(v) * this.maxSpeed;
        }

        this.state.position[i] += this.state.velocity[i] * clampedDt;
      }

      // Soft table collision constraint
      if (this.state.position[1] < this.tableY) {
        this.state.position[1] = this.tableY;
        this.state.velocity[1] = 0;
      }
    } else if (this.state.phase === 'released') {
      // Gravity fall if released above table
      if (this.state.position[1] > this.tableY) {
        const gravity = -9.8;
        this.state.velocity[1] += gravity * clampedDt;
        this.state.position[1] += this.state.velocity[1] * clampedDt;

        // Table contact bounce / settle
        if (this.state.position[1] <= this.tableY) {
          this.state.position[1] = this.tableY;
          this.state.velocity = [0, 0, 0];
          this.state.phase = 'idle';
        }
      } else {
        this.state.position[1] = this.tableY;
        this.state.phase = 'idle';
      }
    }

    // Slerp orientation towards targetQuaternion
    const qA = this.state.quaternion;
    const qB = this.state.targetQuaternion;
    const slerpFactor = Math.min(1.0, clampedDt * 12.0);

    let dot = qA[0] * qB[0] + qA[1] * qB[1] + qA[2] * qB[2] + qA[3] * qB[3];
    const sign = dot < 0 ? -1 : 1;
    dot = Math.abs(dot);

    let x = (1 - slerpFactor) * qA[0] + slerpFactor * sign * qB[0];
    let y = (1 - slerpFactor) * qA[1] + slerpFactor * sign * qB[1];
    let z = (1 - slerpFactor) * qA[2] + slerpFactor * sign * qB[2];
    let w = (1 - slerpFactor) * qA[3] + slerpFactor * sign * qB[3];

    // Re-normalize to guarantee exact unit length
    const len = Math.hypot(x, y, z, w) || 1;
    this.state.quaternion = [x / len, y / len, z / len, w / len];

    this.state.speed = Math.hypot(...this.state.velocity);
    this.state.lift = this.state.position[1];
  }
}
