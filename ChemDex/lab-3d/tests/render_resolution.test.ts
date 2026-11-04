import { expect, it } from 'vitest';
import { renderPixelRatio } from '../src/render/renderResolution';

it('bounds actual framebuffer allocation on large high-DPI displays', () => {
  const dpr = renderPixelRatio('high', 3840, 2160, 2);
  expect(3840 * 2160 * dpr ** 2).toBeCloseTo(2_800_000);
  expect(renderPixelRatio('ultra', 7680, 4320, 3)).toBeLessThan(dpr);
  expect(renderPixelRatio('low', 3840, 2160, 1)).toBeLessThan(1);
});
it('retains native detail on small canvases and safely handles hidden canvases', () => {
  expect(renderPixelRatio('high', 800, 600, 1)).toBe(1);
  expect(renderPixelRatio('high', 800, 600, 2)).toBe(1.5);
  expect(renderPixelRatio('potato', 800, 600, 2)).toBe(0.75);
  expect(renderPixelRatio('high', 0, 0, 2)).toBe(1);
  expect(renderPixelRatio('high', NaN, 500, NaN)).toBe(1);
});
