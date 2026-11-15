import { Vector3 } from "three";

const STEP = 1 / 120;
const GRAVITY = 9.81;
const DENSITY = 0.45;
const MAX_THROW_SPEED = 18;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * A fixed-step sphere simulation. All distances are metres and velocities m/s.
 * Buoyancy uses the volume of the sphere's submerged spherical cap.
 */
export class BallPhysics {
  constructor({
    radius = 0.32,
    waterLevel = 0.12,
    groundHeight = () => 0.3,
    isWater = () => false,
    onImpact = () => {},
  } = {}) {
    this.radius = radius;
    this.waterLevel = waterLevel;
    this.groundHeight = groundHeight;
    this.isWater = isWater;
    this.onImpact = onImpact;
    this.position = new Vector3();
    this.velocity = new Vector3();
    this.held = false;
    this.submerged = 0;
    this._accumulator = 0;
    this._inWater = false;
    this._wakeElapsed = 0;
    this.reset();
  }

  reset() {
    this.position.set(
      -4.7,
      Math.max(0.8, this.groundHeight(-4.7, 2.3) + this.radius),
      2.3,
    );
    this.velocity.set(0, 0, 0);
    this.held = false;
    this.submerged = 0;
    this._inWater = false;
    this._wakeElapsed = 0;
    this._heldTravel = 0;
    this._accumulator = 0;
  }

  dropIntoPond() {
    this.position.set(-0.65, this.waterLevel + 3.2, 0.35);
    this.velocity.set(0.65, -0.3, -0.15);
    this.held = false;
    this.submerged = 0;
    this._inWater = false;
    this._wakeElapsed = 0;
    this._heldTravel = 0;
    this._accumulator = 0;
  }

  grab() {
    this.held = true;
    this.velocity.set(0, 0, 0);
    this._accumulator = 0;
    this._heldTravel = 0;
  }

  moveHeld(position) {
    if (
      !this.held ||
      ![position.x, position.y, position.z].every(Number.isFinite)
    )
      return;
    const x = clamp(position.x, -8 + this.radius, 8 - this.radius);
    const z = clamp(position.z, -6 + this.radius, 6 - this.radius);
    const oldY = this.position.y;
    const distance = Math.hypot(x - this.position.x, z - this.position.z);
    this.position.set(
      x,
      clamp(position.y, this.groundHeight(x, z) + this.radius, 10),
      z,
    );
    this.submerged = this._fractionSubmerged();
    const touching =
      this.isWater(x, z) &&
      this.waterLevel - this.position.y + this.radius >
        (this._inWater ? -0.015 : 0);
    if (touching && !this._inWater) {
      this.onImpact(
        x,
        z,
        clamp(0.13 + Math.max(0, oldY - this.position.y) * 0.6, 0.13, 0.55),
      );
      this._heldTravel = 0;
      this._wakeElapsed = 0;
    } else if (touching) {
      this._heldTravel += distance;
      if (this._heldTravel > this.radius * 0.5) {
        this.onImpact(x, z, 0.035);
        this._heldTravel = 0;
        this._wakeElapsed = 0;
      }
    } else {
      if (this._inWater && this.position.y - oldY > 0.025)
        this.onImpact(x, z, 0.06);
      this._heldTravel = 0;
    }
    this._inWater = touching;
  }

  release(velocity = new Vector3()) {
    this.held = false;
    this._accumulator = 0;
    if ([velocity.x, velocity.y, velocity.z].every(Number.isFinite)) {
      this.velocity.copy(velocity).clampLength(0, MAX_THROW_SPEED);
    } else {
      this.velocity.set(0, 0, 0);
    }
  }

  update(delta) {
    if (this.held || !Number.isFinite(delta) || delta <= 0) return;
    // A returning background tab cannot inject several seconds of simulation.
    this._accumulator += Math.min(delta, 0.1);
    while (this._accumulator >= STEP - 1e-10) {
      this._step(STEP);
      this._accumulator -= STEP;
    }
  }

  _fractionSubmerged() {
    if (!this.isWater(this.position.x, this.position.z)) return 0;
    const h = clamp(
      this.waterLevel - this.position.y + this.radius,
      0,
      this.radius * 2,
    );
    return (h * h * (3 * this.radius - h)) / (4 * this.radius ** 3);
  }

  _step(dt) {
    const fraction = this._fractionSubmerged();
    this.velocity.y += GRAVITY * (fraction / DENSITY - 1) * dt;

    // Water drag damps bobbing as well as the ball's horizontal wake.
    const horizontalDrag = Math.exp(-(0.07 + fraction * 3.8) * dt);
    this.velocity.x *= horizontalDrag;
    this.velocity.z *= horizontalDrag;
    this.velocity.y *= Math.exp(-(0.015 + fraction * 5.2) * dt);
    const impactSpeed = Math.max(0, -this.velocity.y);
    this.position.addScaledVector(this.velocity, dt);

    const floor =
      this.groundHeight(this.position.x, this.position.z) + this.radius;
    if (this.position.y <= floor) {
      this.position.y = floor;
      if (this.velocity.y < 0) {
        this.velocity.y = this.velocity.y < -0.55 ? -this.velocity.y * 0.55 : 0;
      }
      const friction = Math.exp(-4.5 * dt);
      this.velocity.x *= friction;
      this.velocity.z *= friction;
      if (Math.hypot(this.velocity.x, this.velocity.z) < 0.025) {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }

    this._constrainBounds("x", 8);
    this._constrainBounds("z", 6);
    this.submerged = this._fractionSubmerged();
    const waterHere = this.isWater(this.position.x, this.position.z);
    const depth = this.waterLevel - this.position.y + this.radius;
    const touching = waterHere && depth > (this._inWater ? -0.015 : 0);
    this._wakeElapsed += dt;

    if (touching && !this._inWater) {
      this.onImpact(
        this.position.x,
        this.position.z,
        clamp(0.13 + impactSpeed * 0.12, 0.13, 1.4),
      );
      this._wakeElapsed = 0;
    } else if (!touching && this._inWater && this.velocity.y > 0.6) {
      this.onImpact(
        this.position.x,
        this.position.z,
        clamp(this.velocity.y * 0.035, 0.04, 0.25),
      );
      this._wakeElapsed = 0;
    } else if (touching && this._wakeElapsed > 0.22) {
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      if (speed > 0.16) {
        this.onImpact(
          this.position.x,
          this.position.z,
          clamp(speed * 0.035, 0.025, 0.19),
        );
        this._wakeElapsed = 0;
      }
    }
    this._inWater = touching;
  }

  _constrainBounds(axis, extent) {
    const bound = extent - this.radius;
    if (Math.abs(this.position[axis]) > bound) {
      this.position[axis] = clamp(this.position[axis], -bound, bound);
      this.velocity[axis] *= -0.42;
    }
  }
}
