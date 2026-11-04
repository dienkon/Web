import { expect, it, vi } from 'vitest';
import { createContactShadowResources } from '../src/render/ContactShadows';

it('releases both framebuffers, geometry and every owned material exactly once', () => {
  const resources = createContactShadowResources(128, 24, '#0f172a');
  const disposers = [resources.target, resources.blurTarget, resources.geometry,
    resources.depth, resources.horizontal, resources.vertical, resources.material].map(resource => vi.spyOn(resource, 'dispose'));
  resources.dispose(); resources.dispose();
  for (const dispose of disposers) expect(dispose).toHaveBeenCalledTimes(1);
  const next = createContactShadowResources(256, 24, '#0f172a');
  expect(next.target.width).toBe(256);
  expect(next.target).not.toBe(resources.target);
  next.dispose();
});
