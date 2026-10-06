/**
 * cameraAtoms.ts — Effect Atoms for Viewport, Camera & Sensory Dynamics (§4.I)
 * 
 * Implements camera trauma shake, slow-mo cosmetic scaling,
 * haptic vibration pulses, observation toasts, and safety danger overlays.
 */

import { EffectAtom } from '../types';
import { vfxBus } from '../../bus';

export const cameraTraumaShakeAtom: EffectAtom = {
  name: 'cameraTraumaShake',
  version: 1,
  category: 'camera',
  summary_en: 'Ground-contact trauma rumble and camera rotational shake for violent deflagration or explosions (clamped for accessibility).',
  useWhen: ['Explosive gas pop, sudden vessel shatter, or violent bumping surge'],
  avoidWhen: ['Calm slow reactions; or when user has enabled reduce-motion'],
  params: {
    intensity: { name: 'intensity', type: 'number', min: 0.1, max: 2.5, default: 1.0, description: 'Shake amplitude' },
    decay_s: { name: 'decay_s', type: 'number', min: 0.2, max: 3.0, default: 0.8, unit: 's', description: 'Settling duration' },
    reduceMotionRespect: { name: 'reduceMotionRespect', type: 'boolean', default: true, description: 'Honor prefers-reduced-motion' }
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
    return { atom: 'cameraTraumaShake', instanceId: `traumashake_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Violent Detonation Shock', description: 'Intense rotational recoil and viewport jitter', params: { intensity: 1.8, decay_s: 1.0, reduceMotionRespect: true } },
    { title: 'Subtle Pop Jolt', description: 'Quick micro-shake on hydrogen squeaky pop', params: { intensity: 0.4, decay_s: 0.3, reduceMotionRespect: true } }
  ],
  tests: ['camera_trauma_shake_trauma']
};

export const slowMoLayerAtom: EffectAtom = {
  name: 'slowMoLayer',
  version: 1,
  category: 'camera',
  summary_en: 'Cosmetic slow-motion timescale multiplier on visual effects while physics conservation ledger steps at true dt.',
  useWhen: ['High-speed flash, splash impact Worthington jet, or rapid popping'],
  avoidWhen: ['Normal speed long-term observation'],
  params: {
    timeScaleMultiplier: { name: 'timeScaleMultiplier', type: 'number', min: 0.05, max: 0.5, default: 0.2, description: 'Slow-motion factor (0.2 = 5x slower)' },
    duration_s: { name: 'duration_s', type: 'number', min: 0.5, max: 5.0, default: 1.5, unit: 's', description: 'Slow-mo window length' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk', 'outside'],
  mount(ctx, p) { return { atom: 'slowMoLayer', instanceId: `slowmo_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: '5x Slow-Motion Splash Impact', description: 'Worthington crown droplet and cavity captured in majestic slow-mo', params: { timeScaleMultiplier: 0.2, duration_s: 2.0 } },
    { title: '10x Ultra Slow Pop', description: 'Hydrogen flame propagation slowed to visible expansion front', params: { timeScaleMultiplier: 0.1, duration_s: 1.0 } }
  ],
  tests: ['slow_mo_cosmetic_timescale']
};

export const hapticPulsesAtom: EffectAtom = {
  name: 'hapticPulses',
  version: 1,
  category: 'camera',
  summary_en: 'Mobile tactile haptic vibration pulses (navigator.vibrate) triggered on pops, violent surges, and hazard events.',
  useWhen: ['Explosive gas pop, breaker trip, stopper pop on mobile devices'],
  avoidWhen: ['Desktop browser or silent smooth reactions'],
  params: {
    vibrateDuration_ms: { name: 'vibrateDuration_ms', type: 'number', min: 10, max: 300, default: 45, unit: 'ms', description: 'Haptic pulse length' },
    pulsePattern: { name: 'pulsePattern', type: 'select', default: 'single_pop', options: ['single_pop', 'double_tap', 'warning_buzz'], description: 'Vibration pattern' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['outside'],
  mount(ctx, p) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (p.pulsePattern === 'double_tap') navigator.vibrate([30, 40, 30]);
      else if (p.pulsePattern === 'warning_buzz') navigator.vibrate([100, 50, 100]);
      else navigator.vibrate(p.vibrateDuration_ms || 40);
    }
    return { atom: 'hapticPulses', instanceId: `haptic_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Single Pop Haptic Tap', description: 'Crisp 45 ms vibration pulse corresponding to acoustic pop', params: { vibrateDuration_ms: 45, pulsePattern: 'single_pop' } },
    { title: 'Hazard Warning Buzz', description: 'Urgent double vibration pattern for corrosive splash or overheat', params: { vibrateDuration_ms: 100, pulsePattern: 'warning_buzz' } }
  ],
  tests: ['haptic_pulses_mobile_vibrate']
};

export const hudObservationToastsAtom: EffectAtom = {
  name: 'hudObservationToasts',
  version: 1,
  category: 'camera',
  summary_en: 'Bilingual real-lab observational HUD toast messages ("White precipitate forms", "Pungent brown gas evolved").',
  useWhen: ['Significant visual change occurs requiring laboratory notebook documentation'],
  avoidWhen: ['Steady state undisturbed solution'],
  params: {
    observation_en: { name: 'observation_en', type: 'string', default: 'White precipitate forms at the interface.', description: 'English note' },
    observation_vi: { name: 'observation_vi', type: 'string', default: 'Kết tủa trắng xuất hiện tại mặt phân cách.', description: 'Vietnamese note' },
    duration_s: { name: 'duration_s', type: 'number', min: 1.0, max: 10.0, default: 4.0, unit: 's', description: 'Display time' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk', 'outside'],
  mount(ctx, p) { return { atom: 'hudObservationToasts', instanceId: `toast_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Precipitation Toast', description: 'Observational note describing white BaSO4 precipitation', params: { observation_en: 'Dense white precipitate forms instantly.', observation_vi: 'Kết tủa trắng đục xuất hiện ngay lập tức.', duration_s: 4.0 } },
    { title: 'Brown Toxic Gas Warning Toast', description: 'Warning observation for noxious NO2 gas', params: { observation_en: 'Pungent red-brown toxic gas evolves vigorously.', observation_vi: 'Khí nâu đỏ độc hại thoát ra mãnh liệt.', duration_s: 5.0 } }
  ],
  tests: ['hud_observation_toasts_bilingual']
};

export const dangerOverlayAtom: EffectAtom = {
  name: 'dangerOverlay',
  version: 1,
  category: 'camera',
  summary_en: 'GHS hazard pictogram badges and PPE penalty warnings (toxic gas, corrosive splash, thermal shock) on viewport HUD.',
  useWhen: ['Hazardous combination: acid splash, toxic gas without fume hood, flammable vapors'],
  avoidWhen: ['Safe non-hazardous benign student mixes'],
  params: {
    ghsCategory: { name: 'ghsCategory', type: 'select', default: 'GHS06_toxic', options: ['GHS05_corrosive', 'GHS06_toxic', 'GHS02_flammable', 'GHS08_health_hazard'], description: 'GHS class' },
    warningTitle_en: { name: 'warningTitle_en', type: 'string', default: 'Toxic Gas Evolution Hazard', description: 'English warning' },
    warningTitle_vi: { name: 'warningTitle_vi', type: 'string', default: 'Nguy cơ thoát khí độc hại', description: 'Vietnamese warning' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['outside'],
  mount(ctx, p) { return { atom: 'dangerOverlay', instanceId: `danger_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Toxic Gas Hazard Badge', description: 'Skull-and-crossbones GHS06 icon with warning to operate under fume hood', params: { ghsCategory: 'GHS06_toxic', warningTitle_en: 'Toxic Gas Evolution Hazard', warningTitle_vi: 'Nguy cơ sinh khí độc hại' } },
    { title: 'Corrosive Acid Splatter Badge', description: 'Corrosive GHS05 badge warning of skin/eye contact', params: { ghsCategory: 'GHS05_corrosive', warningTitle_en: 'Corrosive Splatter Risk', warningTitle_vi: 'Nguy cơ bắn axit ăn mòn' } }
  ],
  tests: ['danger_overlay_ghs_badges']
};

// Legacy backwards-compatible atom
export const cameraShakeAtom: EffectAtom = {
  name: 'cameraShake',
  version: 1,
  category: 'camera',
  summary_en: 'Impulsive camera viewport shake and motion dampening upon rapid energetic deflagration or explosion.',
  useWhen: ['Explosive gas pop (H2 + O2)', 'Acid splatter explosion', 'Sodium detonation'],
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
