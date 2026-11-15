import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { BallPhysics } from "../src/physics.js";
import {
  BALL_RADIUS,
  WATER_LEVEL,
  groundHeight,
  physicalGroundHeight,
  isWater,
} from "../src/environment.js";

function advance(ball, seconds, dt = 1 / 60) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) ball.update(dt);
}

test("a dropped sphere bounces and settles on the ground without tunneling", () => {
  const ball = new BallPhysics({ groundHeight: () => 0.3 });
  ball.position.set(0, 4, 0);
  let bounced = false;
  for (let i = 0; i < 1200; i++) {
    ball.update(1 / 120);
    assert.ok(ball.position.y >= 0.62 - 1e-9);
    if (ball.velocity.y > 1) bounced = true;
  }
  assert.ok(bounced);
  assert.ok(Math.abs(ball.position.y - 0.62) < 1e-6);
  assert.equal(ball.velocity.y, 0);
});

test("buoyancy settles at the displaced volume for a floating rubber ball", () => {
  const ball = new BallPhysics({
    groundHeight: () => -1.3,
    isWater: () => true,
  });
  ball.position.set(0, 3, 0);
  advance(ball, 15);
  assert.ok(ball.position.y > ball.waterLevel);
  assert.ok(
    Math.abs(ball.submerged - 0.45) < 0.005,
    `displaced volume ${ball.submerged}`,
  );
  assert.ok(Math.abs(ball.velocity.y) < 0.01);
  assert.ok(ball.position.y < ball.waterLevel + ball.radius);
});

test("water entry produces a strong splash and settling does not spam impacts", () => {
  const impacts = [];
  const ball = new BallPhysics({
    groundHeight: () => -1.3,
    isWater: () => true,
    onImpact: (x, z, strength) => impacts.push({ x, z, strength }),
  });
  ball.position.set(0, 3, 0);
  advance(ball, 10);
  assert.ok(impacts.length >= 1);
  assert.ok(impacts[0].strength > 0.6);
  const count = impacts.length;
  advance(ball, 5);
  assert.equal(impacts.length, count);
});

test("grab holds the sphere, release transfers finite bounded velocity, reset restores it", () => {
  const ball = new BallPhysics();
  ball.grab();
  ball.moveHeld(new Vector3(1, 2, 1));
  advance(ball, 2);
  assert.deepEqual(ball.position.toArray(), [1, 2, 1]);
  ball.release(new Vector3(100, 50, 0));
  assert.ok(Math.abs(ball.velocity.length() - 18) < 1e-8);
  ball.update(1 / 60);
  assert.ok(ball.position.x > 1);
  ball.reset();
  assert.deepEqual(ball.position.toArray(), [-4.7, 0.8, 2.3]);
  assert.equal(ball.velocity.length(), 0);
  assert.equal(ball.held, false);
});

test("fixed steps give the same motion at 30 and 120 fps", () => {
  const a = new BallPhysics();
  const b = new BallPhysics();
  a.position.set(0, 5, 0);
  b.position.copy(a.position);
  a.velocity.set(3, 1, 2);
  b.velocity.copy(a.velocity);
  advance(a, 2, 1 / 30);
  advance(b, 2, 1 / 120);
  assert.ok(a.position.distanceTo(b.position) < 1e-8);
  assert.ok(a.velocity.distanceTo(b.velocity) < 1e-8);
});

test("dragging into water makes a ripple before release and sustained motion makes a wake", () => {
  const impacts = [];
  const ball = new BallPhysics({
    groundHeight: () => -1.3,
    isWater: () => true,
    onImpact: (...impact) => impacts.push(impact),
  });
  ball.grab();
  ball.moveHeld(new Vector3(0, 1, 0));
  assert.equal(impacts.length, 0);
  ball.moveHeld(new Vector3(0, 0.2, 0));
  assert.equal(impacts.length, 1);
  assert.ok(ball.submerged > 0);
  ball.moveHeld(new Vector3(0.3, 0.2, 0));
  assert.equal(impacts.length, 2);
  assert.ok(impacts[1][2] < impacts[0][2]);
  ball.moveHeld(new Vector3(0.3, 0.2, 0));
  assert.equal(impacts.length, 2);
});

test("large tab-return deltas and invalid inputs remain bounded and finite", () => {
  const ball = new BallPhysics();
  ball.position.set(0, 5, 0);
  ball.update(500);
  assert.ok(ball.position.y > 4.9);
  ball.update(NaN);
  ball.release(new Vector3(NaN, 0, 0));
  assert.equal(ball.velocity.length(), 0);
  ball.grab();
  ball.moveHeld(new Vector3(1e9, -100, 1e9));
  assert.ok(ball.position.x <= 8 - ball.radius);
  assert.ok(ball.position.z <= 6 - ball.radius);
  assert.ok(ball.position.y >= 0.3 + ball.radius);
});

test("integrated terrain: spawn settles on the meadow and a pond drop floats above its bed", () => {
  const ball = new BallPhysics({
    radius: BALL_RADIUS,
    waterLevel: WATER_LEVEL,
    groundHeight: physicalGroundHeight,
    isWater,
  });
  advance(ball, 5);
  assert.ok(
    Math.abs(ball.position.y - groundHeight(-4.7, 2.3) - BALL_RADIUS) < 1e-6,
  );
  assert.equal(ball.submerged, 0);
  ball.dropIntoPond();
  advance(ball, 15);
  assert.ok(isWater(ball.position.x, ball.position.z));
  assert.ok(Math.abs(ball.submerged - 0.45) < 0.005);
  assert.ok(
    ball.position.y - BALL_RADIUS >
      physicalGroundHeight(ball.position.x, ball.position.z),
  );
});

test("integrated terrain: a ball beyond the island falls to the visible lower floor", () => {
  const ball = new BallPhysics({
    radius: BALL_RADIUS,
    waterLevel: WATER_LEVEL,
    groundHeight: physicalGroundHeight,
    isWater,
  });
  ball.position.set(7.5, 1, 0);
  advance(ball, 8);
  assert.ok(Math.abs(ball.position.y - (-1.02 + BALL_RADIUS)) < 1e-6);
  assert.equal(ball.submerged, 0);
  assert.equal(ball.velocity.y, 0);
});
