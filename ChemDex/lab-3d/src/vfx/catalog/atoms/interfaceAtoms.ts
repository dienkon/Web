/**
 * interfaceAtoms.ts — Effect Atoms for Liquid-Air & Solid-Liquid Interfaces
 */

import { EffectAtom } from '../types';

export const surfaceRippleAtom: EffectAtom = {
  name: 'surfaceRipple',
  version: 1,
  category: 'interface',
  summary_en: 'Circular capillary wave ripples radiating outward from an impact, burst, or stirring disturbance.',
  useWhen: ['Liquid drop falls onto surface', 'Bubble bursts at free-surface', 'Floating pellet moves'],
  avoidWhen: ['Completely static unperturbed liquid surface'],
  params: {
    amplitude: { name: 'amplitude', type: 'number', min: 0.01, max: 0.5, default: 0.12, unit: 'm', description: 'Wave peak height' },
    frequency: { name: 'frequency', type: 'number', min: 1.0, max: 15.0, default: 6.0, unit: 'Hz', description: 'Ripple oscillation frequency' },
    decayTime_s: { name: 'decayTime_s', type: 'number', min: 0.2, max: 3.0, default: 1.2, unit: 's', description: 'Viscous damping duration' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['surface', 'meniscus', 'pourPoint'],
  mount(ctx, p) {
    return { atom: 'surfaceRipple', instanceId: `rip_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Gentle Drop Ripple', description: 'Delicate circular capillary rings', params: { amplitude: 0.08, frequency: 5.0, decayTime_s: 1.0 } },
    { title: 'Vigorous Bubble Burst Ripples', description: 'High-frequency choppy waves', params: { amplitude: 0.22, frequency: 10.0, decayTime_s: 1.5 } }
  ],
  tests: ['surface_ripple_propagation']
};

export const meniscusDepressionAtom: EffectAtom = {
  name: 'meniscusDepression',
  version: 1,
  category: 'interface',
  summary_en: 'Capillary indentation and contact angle wetting depression under a floating solid piece or pellet.',
  useWhen: ['Sodium pellet floating on water (density 0.968 g/cm3)'],
  avoidWhen: ['Dense sunken solids resting on beaker bottom'],
  params: {
    depth_mm: { name: 'depth_mm', type: 'number', min: 0.5, max: 8.0, default: 2.5, unit: 'mm', description: 'Meniscus indentation depth' },
    radius_mm: { name: 'radius_mm', type: 'number', min: 1.0, max: 15.0, default: 5.0, unit: 'mm', description: 'Depression radius' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['surface', 'meniscus'],
  mount(ctx, p) {
    return { atom: 'meniscusDepression', instanceId: `men_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Sodium Floating Dimple', description: 'Surface tension depression holding floating metallic sphere', params: { depth_mm: 3.0, radius_mm: 6.0 } },
    { title: 'Wax Raft Indentation', description: 'Broad shallow capillary curvature under floating wax disc', params: { depth_mm: 1.2, radius_mm: 8.0 } }
  ],
  tests: ['meniscus_depression_capillary']
};

export const cellularFoamGrowthAtom: EffectAtom = {
  name: 'cellularFoamGrowth',
  version: 1,
  category: 'interface',
  summary_en: 'Thick expanding Voronoi cellular foam layer with polyhedral liquid film drainage.',
  useWhen: ["Elephant's toothpaste (H2O2 + MnO2/KI + dish soap)", 'High-viscosity foaming effervescence'],
  avoidWhen: ['Clean rapid gas bubbling with no foam stabilizer'],
  params: {
    growthRate_ml_s: { name: 'growthRate_ml_s', type: 'number', min: 1.0, max: 80.0, default: 22.0, unit: 'mL/s', description: 'Foam volume generation rate' },
    maxFoam_ml: { name: 'maxFoam_ml', type: 'number', min: 5, max: 500, default: 150, unit: 'mL', description: 'Maximum stable foam volume' },
    foamColor: { name: 'foamColor', type: 'color', default: '#ffffff', description: 'Foam surface color' }
  },
  budget: { particles: 48, shaderCost: 1 },
  anchorsAllowed: ['surface', 'rim'],
  ledgerInputs: ['foam_ml'],
  mount(ctx, p) {
    return { atom: 'cellularFoamGrowth', instanceId: `foam_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Elephants Toothpaste Column', description: 'Violent steaming foam erupting out of cylinder', params: { growthRate_ml_s: 45.0, maxFoam_ml: 250, foamColor: '#fef08a' } },
    { title: 'Gentle Soap Foam Head', description: 'Fine dense cellular foam rising slowly', params: { growthRate_ml_s: 10.0, maxFoam_ml: 60, foamColor: '#ffffff' } }
  ],
  tests: ['cellular_foam_expansion']
};

export const worthingtonMicroJetAtom: EffectAtom = {
  name: 'worthingtonMicroJet',
  version: 1,
  category: 'interface',
  summary_en: 'Worthington micro-jet liquid droplet ejecta flung upward when a surface bubble dome ruptures.',
  useWhen: ['Boiling bubble burst at surface', 'Vigorous gas evolution popping'],
  avoidWhen: ['Sub-surface non-bursting bubbles'],
  params: {
    jetVelocity: { name: 'jetVelocity', type: 'number', min: 0.5, max: 3.0, default: 1.2, unit: 'm/s', description: 'Ejecta vertical speed' },
    dropletCount: { name: 'dropletCount', type: 'number', min: 1, max: 12, default: 4, description: 'Micro-droplets per burst' }
  },
  budget: { particles: 32, shaderCost: 1 },
  anchorsAllowed: ['surface'],
  mount(ctx, p) {
    return { atom: 'worthingtonMicroJet', instanceId: `worth_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Bubble Burst Droplet Jet', description: 'Fine vertical central spike ejecting satellite droplets', params: { jetVelocity: 1.5, dropletCount: 5 } },
    { title: 'Mild Cavitation Splash', description: 'Small low-velocity micro-droplet burst', params: { jetVelocity: 0.8, dropletCount: 2 } }
  ],
  tests: ['worthington_micro_jet_burst']
};
