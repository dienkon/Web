import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const directory = path.resolve('.browser-review/movement-tests');
await mkdir(directory, { recursive: true });
await build({
  entryPoints: ['src/core/simulation/PlayerMotion.ts', 'src/core/simulation/CollisionSystem.ts', 'src/systems/input/InputManager.ts'],
  outdir: directory, outbase: 'src', bundle: true, platform: 'node', format: 'esm', logLevel: 'warning',
});
const { advancePlayerMotion } = await import(pathToFileURL(path.join(directory, 'core/simulation/PlayerMotion.js')));
const { resolveCapsuleMovement, INITIAL_COLLIDER_CYLINDERS } = await import(pathToFileURL(path.join(directory, 'core/simulation/CollisionSystem.js')));
const { InputManager } = await import(pathToFileURL(path.join(directory, 'systems/input/InputManager.js')));

const simulate = (fps, input = { x: 0, y: 1 }) => {
  const position = [0, 0, 0], velocity = { x: 0, z: 0 };
  for (let frame = 0; frame < fps; frame++) advancePlayerMotion(position, velocity, input, 0, 1.6, 1 / fps);
  const walkingDistance = -position[2];
  for (let frame = 0; frame < fps / 2; frame++) advancePlayerMotion(position, velocity, { x: 0, y: 0 }, 0, 1.6, 1 / fps);
  return { position, velocity, walkingDistance };
};
const samples = [20, 30, 60, 120].map(fps => ({ fps, ...simulate(fps) }));
for (const sample of samples) {
  assert(Math.abs(sample.walkingDistance - samples[0].walkingDistance) < 1e-9, `acceleration distance varies at ${sample.fps} FPS`);
  assert(Math.abs(sample.position[2] - samples[0].position[2]) < 2e-5, `stopping distance varies at ${sample.fps} FPS`);
}
const slow = simulate(60, { x: 0, y: .2 });
assert(Math.abs(slow.walkingDistance / samples[2].walkingDistance - .2) < 1e-9, 'partial joystick must retain analog speed');
const diagonal = simulate(60, { x: 1, y: 1 });
assert(Math.abs(Math.hypot(diagonal.position[0], diagonal.position[2]) - Math.abs(samples[2].position[2])) < 1e-9, 'diagonal movement must not be faster');

const box = { id: 'bench', minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
const contact = resolveCapsuleMovement([-1.4, 0, 0], -1.1, .1, .28, [box], []);
assert(Math.abs(contact.x + 1.28) < 1e-9 && contact.z === .1, 'box contact should reach the exact face and preserve wall sliding');
const sweep = resolveCapsuleMovement([-2, 0, 0], 2, 0, .28, [box], []);
assert(Math.abs(sweep.x + 1.28) < 1e-9, 'box sweep must not tunnel through an entire obstacle');

const position = [-6.4, 0, -3.65], velocity = { x: 0, z: 0 };
let lastX = position[0];
for (let frame = 0; frame < 90; frame++) {
  advancePlayerMotion(position, velocity, { x: 1, y: 0 }, 0, 1.6, 1 / 30);
  assert(position[0] >= lastX - 1e-8, 'stool slide must not reverse forward progress');
  for (const cylinder of INITIAL_COLLIDER_CYLINDERS) {
    assert(Math.hypot(position[0] - cylinder.x, position[2] - cylinder.z) >= cylinder.radius + .28 - 1e-8, 'stool contact must not penetrate');
  }
  lastX = position[0];
}
assert(position[0] > -2.5, 'player should slide past a grazing stool rather than repeatedly stop');

const input = new InputManager();
input.beginJoystick(1, 0, 0);
input.updateJoystick(1, 0, -56 * .91);
assert(input.buttons.run, 'outer joystick ring should sprint');
input.updateJoystick(1, 0, -56 * .89);
assert(input.buttons.run, 'small thumb jitter should not toggle sprint off');
input.updateJoystick(1, 0, -56 * .81);
assert(!input.buttons.run, 'moving inward should leave sprint');
input.resetAll();
assert.equal(input.move.y, 0);
assert(!input.buttons.run);

console.log('PASS movement: frame-rate consistency, analog speed, diagonal speed, wall contact, obstacle sweep, stool sliding, sprint hysteresis');
