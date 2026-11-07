/**
 * CHEMDEX LAB - RigidBodyLite (K5.1)
 * Lightweight physics body simulating table sliding, bench edges, gravity falls,
 * friction (dry vs wet bench), and floor impacts without heavy physics engines.
 */

import { LAB_GEOMETRY } from '../core/labGeometry';
import { SCENE_GRAVITY, metersToScene, sceneToMeters } from '../science/sceneUnits';

export interface MaterialPairProperties {
  friction: number;
  restitution: number;
}

/** Legacy body-origin heights, NOT the geometric support planes. */
export const TABLE_TOP_Y = LAB_GEOMETRY.defaultVesselOrigin_scene;
export const TABLE_HALF_WIDTH = LAB_GEOMETRY.tableHalfWidth_scene;
export const TABLE_HALF_DEPTH = LAB_GEOMETRY.tableHalfDepth_scene;
export const FLOOR_Y = LAB_GEOMETRY.floor_scene + (TABLE_TOP_Y - LAB_GEOMETRY.tableTop_scene);

export interface RigidBodyState {
  id: string;
  type: string;
  position: [number, number, number];
  velocity: [number, number, number];
  rotationZ: number;
  angularVelocityZ: number;
  mass_kg: number;
  isGrounded: boolean;
  isOnTable: boolean;
  isOnFloor: boolean;
  fallDistance_m: number;
  isWetSurface: boolean;
}

export class RigidBodyLite {
  public state: RigidBodyState;
  private readonly gravity: number = -SCENE_GRAVITY;

  constructor(
    id: string,
    type: string,
    initialPos: [number, number, number],
    mass_kg: number = 0.15
  ) {
    this.state = {
      id,
      type,
      position: [...initialPos],
      velocity: [0, 0, 0],
      rotationZ: 0,
      angularVelocityZ: 0,
      mass_kg,
      isGrounded: initialPos[1] <= TABLE_TOP_Y,
      isOnTable: true,
      isOnFloor: false,
      fallDistance_m: 0,
      isWetSurface: false
    };
  }

  public applyImpulse(impulse: [number, number, number]): void {
    if (!impulse.every(Number.isFinite) || !(this.state.mass_kg > 0)) return;
    this.state.velocity[0] += metersToScene(impulse[0] / this.state.mass_kg);
    this.state.velocity[1] += metersToScene(impulse[1] / this.state.mass_kg);
    this.state.velocity[2] += metersToScene(impulse[2] / this.state.mass_kg);
  }

  public setWetSurface(wet: boolean): void {
    this.state.isWetSurface = wet;
  }

  /**
   * Fixed-timestep integrator (e.g. 1/60s or 1/120s).
   * Fully deterministic: zero Math.random() or Date.now().
   */
  public step(dt: number): { hasLandedOnFloor: boolean; impactEnergy_J: number } {
    if (!Number.isFinite(dt) || dt <= 0) return { hasLandedOnFloor: false, impactEnergy_J: 0 };
    let hasLandedOnFloor = false;
    let impactEnergy_J = 0;

    const [x, y, z] = this.state.position;
    const isOverTable = Math.abs(x) <= TABLE_HALF_WIDTH && Math.abs(z) <= TABLE_HALF_DEPTH;

    if (isOverTable) {
      this.state.isOnTable = true;
      // Object is over table slab
      if (y > TABLE_TOP_Y) {
        // Free fall towards table
        this.state.velocity[1] += this.gravity * dt;
        this.state.fallDistance_m += sceneToMeters(Math.abs(this.state.velocity[1] * dt));
        this.state.isGrounded = false;
      } else {
        // Resting / sliding on table
        this.state.position[1] = TABLE_TOP_Y;
        this.state.velocity[1] = 0;
        this.state.isGrounded = true;
        this.state.fallDistance_m = 0;

        // Friction: wet bench has ~0.15 friction, dry bench ~0.65
        const frictionCoeff = this.state.isWetSurface ? 0.15 : 0.65;
        const normalForce = this.state.mass_kg * Math.abs(this.gravity);
        const frictionDecel = (frictionCoeff * normalForce) / this.state.mass_kg;

        const currentSpeedH = Math.hypot(this.state.velocity[0], this.state.velocity[2]);
        if (currentSpeedH > 0.001) {
          const newSpeedH = Math.max(0, currentSpeedH - frictionDecel * dt);
          const ratio = newSpeedH / currentSpeedH;
          this.state.velocity[0] *= ratio;
          this.state.velocity[2] *= ratio;
        } else {
          this.state.velocity[0] = 0;
          this.state.velocity[2] = 0;
        }
      }
    } else {
      // Over table edge -> fall to floor
      this.state.isOnTable = false;
      if (y > FLOOR_Y) {
        this.state.velocity[1] += this.gravity * dt;
        this.state.fallDistance_m += sceneToMeters(Math.abs(this.state.velocity[1] * dt));
        this.state.isGrounded = false;
      } else {
        // Impact on floor
        this.state.position[1] = FLOOR_Y;
        const vImpact = sceneToMeters(Math.abs(this.state.velocity[1]));
        impactEnergy_J = 0.5 * this.state.mass_kg * vImpact * vImpact;

        this.state.velocity = [0, 0, 0];
        this.state.isGrounded = true;
        hasLandedOnFloor = !this.state.isOnFloor;
        this.state.isOnFloor = true;
      }
    }

    // Update position from velocity
    this.state.position[0] += this.state.velocity[0] * dt;
    this.state.position[1] += this.state.velocity[1] * dt;
    this.state.position[2] += this.state.velocity[2] * dt;

    // Angular damping
    this.state.rotationZ += this.state.angularVelocityZ * dt;
    this.state.angularVelocityZ *= (1 - 5.0 * dt);

    return { hasLandedOnFloor, impactEnergy_J };
  }
}
