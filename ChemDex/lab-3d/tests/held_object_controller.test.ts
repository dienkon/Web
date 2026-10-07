import { describe, it, expect } from 'vitest';
import { HeldObjectController } from '../src/handling/HeldObjectController';

describe('HeldObjectController Physics & Robustness (K1.1)', () => {
  it('converges smoothly to target position via critically-damped spring', () => {
    const ctrl = new HeldObjectController('test_beaker', 'beaker', [0, -0.135, 0]);
    ctrl.grab('body');
    ctrl.setTargetPosition([2.0, 1.5, -1.0]);

    // Step at 60 fps for 2.0 seconds (120 frames)
    const dt = 1 / 60;
    for (let frame = 0; frame < 120; frame++) {
      ctrl.update(dt);
    }

    // Position must have converged to target within tiny tolerance
    expect(ctrl.state.position[0]).toBeCloseTo(2.0, 2);
    expect(ctrl.state.position[1]).toBeCloseTo(1.5, 2);
    expect(ctrl.state.position[2]).toBeCloseTo(-1.0, 2);
    expect(ctrl.state.velocity[0]).toBeCloseTo(0, 1);
  });

  it('guarantees no tunneling through table at 60 fps and low 20 fps', () => {
    const frameRates = [60, 20];

    for (const fps of frameRates) {
      const dt = 1 / fps;
      const ctrl = new HeldObjectController('beaker', 'beaker', [0, 1.0, 0]);
      ctrl.grab('body');

      // Command a target deep below the table
      ctrl.setTargetPosition([0, -5.0, 0]);

      for (let f = 0; f < 50; f++) {
        ctrl.update(dt);
        // Table surface is at Y = -0.135; must NEVER tunnel below table
        expect(ctrl.state.position[1]).toBeGreaterThanOrEqual(-0.135 - 1e-4);
      }
    }
  });

  it('preserves unit-length quaternion after 10,000 updates', () => {
    const ctrl = new HeldObjectController('flask', 'flask', [0, 0, 0]);
    ctrl.grab('neck');
    ctrl.setTilt(1.2, 0.4);
    ctrl.setYaw(0.8);

    const dt = 1 / 60;
    for (let step = 0; step < 10000; step++) {
      ctrl.update(dt);
    }

    const [x, y, z, w] = ctrl.state.quaternion;
    const norm = Math.hypot(x, y, z, w);
    expect(norm).toBeCloseTo(1.0, 5);
  });

  it('simulates gravity fall when released over air', () => {
    const ctrl = new HeldObjectController('tube', 'test_tube', [0, 1.5, 0]);
    ctrl.release();

    const dt = 1 / 60;
    for (let f = 0; f < 60; f++) {
      ctrl.update(dt);
    }

    // Object falls and lands on the table
    expect(ctrl.state.position[1]).toBeCloseTo(-0.135, 2);
    expect(ctrl.state.phase).toBe('idle');
  });
});
