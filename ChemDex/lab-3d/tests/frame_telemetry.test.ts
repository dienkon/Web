import { afterEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({ frame: null as null | ((state: unknown, dt: number) => void),
  after: null as null | (() => void), priority: 0, cleanups: [] as (() => void)[],
  info: { autoReset: true, render: { calls: 0, triangles: 0 }, reset() { this.render.calls = 0; this.render.triangles = 0; } } }));
vi.mock('react', async () => ({ ...await vi.importActual('react'),
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => (() => void)) => { harness.cleanups.push(effect()); } }));
vi.mock('@react-three/fiber', () => ({
  useThree: (selector: (state: unknown) => unknown) => selector({ gl: { info: harness.info } }),
  useFrame: (frame: typeof harness.frame, priority: number) => { harness.frame = frame; harness.priority = priority; },
  addAfterEffect: (after: typeof harness.after) => { harness.after = after; return () => { harness.after = null; }; },
}));
import { FrameTelemetry, useFrameStats } from '../src/render/FrameTelemetry';
const original = useFrameStats.getState();
afterEach(() => { harness.cleanups.splice(0).forEach(cleanup => cleanup()); vi.unstubAllGlobals(); useFrameStats.setState(original); });
describe('Complete-frame telemetry', () => {
  it('counts scene and postprocessing together, without accumulating previous frames', () => {
    vi.stubGlobal('document', { hidden: false });
    FrameTelemetry();
    expect(harness.info.autoReset).toBe(false);
    expect(harness.priority).toBeLessThan(0);
    harness.frame!({}, 0.5);
    harness.info.render.calls += 240; harness.info.render.triangles += 18000;
    harness.after!();
    expect(useFrameStats.getState().samples).toBe(0);
    harness.frame!({}, 0.5);
    expect(harness.info.render.calls).toBe(0);
    harness.info.render.calls += 240; harness.info.render.triangles += 18000; // scene
    harness.info.render.calls += 1; harness.info.render.triangles += 2; // final quad
    harness.after!();
    expect(useFrameStats.getState()).toMatchObject({ drawCalls: 241, triangles: 18002, samples: 2, fps: 2 });
    harness.cleanups.splice(0).forEach(cleanup => cleanup());
    expect(harness.info.autoReset).toBe(true);
    expect(harness.after).toBeNull();
  });
  it('discards hidden intervals and waits for a new visible sampling window', () => {
    const document = { hidden: false }; vi.stubGlobal('document', document);
    FrameTelemetry();
    harness.frame!({}, 0.5); harness.after!();
    document.hidden = true;
    harness.frame!({}, 20); harness.after!();
    document.hidden = false;
    harness.frame!({}, 0.5); harness.after!();
    expect(useFrameStats.getState().samples).toBe(0);
    harness.frame!({}, 0.5); harness.after!();
    expect(useFrameStats.getState()).toMatchObject({ samples: 2, ms: 500 });
  });
});
