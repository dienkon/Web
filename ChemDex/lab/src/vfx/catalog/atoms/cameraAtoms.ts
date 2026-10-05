/**
 * cameraAtoms.ts — Effect Atoms for Viewport & Camera Dynamics
 */

import { EffectAtom } from '../types';
import { vfxBus } from '../../bus';

export const cameraShakeAtom: EffectAtom = {
  name: 'cameraShake',
  version: 1,
  category: 'camera',
  summary_en: 'Impulsive camera viewport shake and motion dampening upon rapid energetic deflagration or explosion.',
  useWhen: ['Explosive gas pop (H2 + O2)', 'Acid splatter explosion (water into conc. H2SO4)', 'Vigorous sodium detonation'],
  avoidWhen: ['Smooth calm reactions'],
  params: {
    intensity: { name: 'intensity', type: 'number', min: 0.1, max: 2.0, default: 0.8, description: 'Shake displacement magnitude' },
    decay_s: { name: 'decay_s', type: 'number', min: 0.1, max: 2.0, default: 0.6, unit: 's', description: 'Duration to return to rest' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk', 'outside'],
  mount(ctx, p) {
    vfxBus.emit('explosion', {
      vesselId: ctx.vesselId,
      position: ctx.position,
      intensity: p.intensity || 1.0,
      isDangerous: true
    });
    return { atom: 'cameraShake', instanceId: `shake_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Subtle Pop Jolt', description: 'Quick micro-shake on small hydrogen pop', params: { intensity: 0.3, decay_s: 0.3 } },
    { title: 'Violent Detonation Shock', description: 'Intense viewport recoil and ripple', params: { intensity: 1.5, decay_s: 0.9 } }
  ],
  tests: ['camera_shake_impulse']
};
