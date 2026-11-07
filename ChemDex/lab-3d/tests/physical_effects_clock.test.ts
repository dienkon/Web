import { describe, expect, it } from 'vitest';
import { PhysicalEffectsRuntime } from '../src/simulation/core/PhysicalEffectsRuntime';
describe('Physical effects use a simulation clock rather than draw callbacks', () => {
  it.each([20, 30, 60, 120])('accepts identical fixed steps at %i FPS', fps => {
    const runtime = new PhysicalEffectsRuntime(), dts: number[] = [];
    runtime.register('v', dt => dts.push(dt));
    for (let i = 0; i < fps; i++) runtime.advance(1 / fps, false, 1);
    expect(dts).toHaveLength(120); expect(new Set(dts)).toEqual(new Set([1 / 120]));
    runtime.advance(0.1, true, 8); expect(dts).toHaveLength(120);
  });
  it('identity-checked cleanup cannot remove a replacement renderer registration', () => {
    const runtime = new PhysicalEffectsRuntime(); let count = 0;
    const removeOld = runtime.register('same', () => { count += 100; });
    runtime.register('same', () => { count++; }); removeOld();
    runtime.advance(1 / 120, false, 1); expect(count).toBe(1);
  });
});
