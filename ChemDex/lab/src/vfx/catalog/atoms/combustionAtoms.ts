/**
 * combustionAtoms.ts — Effect Atoms for Combustion, Flame Tests, and Pyrotechnics
 */

import { EffectAtom } from '../types';

export const flameConeAtom: EffectAtom = {
  name: 'flameCone',
  version: 1,
  category: 'combustion',
  summary_en: 'Premixed or diffusion laminar/turbulent flame cone with Blackbody Planck radiation or atomic emission spectrum.',
  useWhen: ['Bunsen burner or alcohol lamp ignited', 'Flame emission test (Na yellow, K lilac, Cu green, Li carmine)', 'Ignited hydrogen pop'],
  avoidWhen: ['Flameless aqueous reactions at room temperature'],
  params: {
    flameColor: { name: 'flameColor', type: 'color', default: '#38bdf8', description: 'Base flame emission color' },
    tipColor: { name: 'tipColor', type: 'color', default: '#f59e0b', description: 'Outer flame envelope color' },
    height_cm: { name: 'height_cm', type: 'number', min: 2.0, max: 20.0, default: 6.5, unit: 'cm', description: 'Flame cone height' },
    turbulent: { name: 'turbulent', type: 'boolean', default: false, description: 'Turbulence flicker' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['flame', 'surface', 'rim'],
  mount(ctx, p) {
    return { atom: 'flameCone', instanceId: `flame_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Premixed Blue Burner', description: 'Clean blue non-luminous Bunsen flame', params: { flameColor: '#0284c7', tipColor: '#38bdf8', height_cm: 6.0, turbulent: false } },
    { title: 'Copper Flame Test', description: 'Brilliant emerald blue-green atomic emission', params: { flameColor: '#10b981', tipColor: '#06b6d4', height_cm: 7.5, turbulent: true } },
    { title: 'Potassium Flame Test', description: 'Faint delicate lilac-violet flame', params: { flameColor: '#c084fc', tipColor: '#e879f9', height_cm: 5.5, turbulent: false } }
  ],
  tests: ['flame_cone_spectrum']
};

export const pyrotechnicSparksAtom: EffectAtom = {
  name: 'pyrotechnicSparks',
  version: 1,
  category: 'combustion',
  summary_en: 'Incandescent ballistic spark bursts ejected by rapid exothermic deflagration or alkali metal oxidation.',
  useWhen: ['Sodium or potassium on water', 'Burning magnesium ribbon in air', 'Thermite reaction'],
  avoidWhen: ['Calm non-pyrotechnic reactions'],
  params: {
    sparkCount: { name: 'sparkCount', type: 'number', min: 5, max: 150, default: 30, description: 'Spark particle count' },
    sparkColor: { name: 'sparkColor', type: 'color', default: '#fbbf24', description: 'Incandescence color' },
    speed: { name: 'speed', type: 'number', min: 1.0, max: 8.0, default: 3.5, unit: 'm/s', description: 'Ejection initial velocity' }
  },
  budget: { particles: 64, shaderCost: 1 },
  anchorsAllowed: ['surface', 'rim', 'bulk'],
  mount(ctx, p) {
    return { atom: 'pyrotechnicSparks', instanceId: `sparks_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Sodium Skittering Sparks', description: 'Golden yellow sparks bursting as sodium skitters', params: { sparkCount: 40, sparkColor: '#f59e0b', speed: 3.2 } },
    { title: 'Magnesium Flash Sparks', description: 'Blinding white-hot spark shower', params: { sparkCount: 90, sparkColor: '#ffffff', speed: 5.5 } }
  ],
  tests: ['pyrotechnic_sparks_trajectory']
};

export const incandescentGlowAtom: EffectAtom = {
  name: 'incandescentGlow',
  version: 1,
  category: 'combustion',
  summary_en: 'Intense blinding white or red-hot radiation glow lighting up the surroundings.',
  useWhen: ['Burning magnesium ribbon (3100 K)', 'Water into concentrated sulfuric acid flash'],
  avoidWhen: ['Mild room-temperature reactions'],
  params: {
    glowIntensity: { name: 'glowIntensity', type: 'number', min: 1.0, max: 10.0, default: 4.0, description: 'Point light luminance' },
    glowColor: { name: 'glowColor', type: 'color', default: '#ffffff', description: 'Emitted light color' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk', 'surface', 'flame'],
  mount(ctx, p) {
    return { atom: 'incandescentGlow', instanceId: `glow_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Blinding Magnesium Core', description: 'White-hot 3100 K thermal emission', params: { glowIntensity: 6.0, glowColor: '#ffffff' } }
  ],
  tests: ['incandescent_glow_lighting']
};

export const smokeBillowAtom: EffectAtom = {
  name: 'smokeBillow',
  version: 1,
  category: 'combustion',
  summary_en: 'Dense white or dark aerosol smoke billow dispersing into the surrounding air.',
  useWhen: ['Dense white MgO smoke from magnesium combustion', 'Carbon soot smoke'],
  avoidWhen: ['Transparent clean gas evolution'],
  params: {
    smokeColor: { name: 'smokeColor', type: 'color', default: '#f8fafc', description: 'Aerosol color' },
    density: { name: 'density', type: 'number', min: 0.2, max: 2.0, default: 1.2, description: 'Aerosol volume density' }
  },
  budget: { particles: 48, shaderCost: 1 },
  anchorsAllowed: ['rim', 'flame'],
  mount(ctx, p) {
    return { atom: 'smokeBillow', instanceId: `smoke_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'MgO White Smoke', description: 'Chalky white solid aerosol', params: { smokeColor: '#ffffff', density: 1.5 } }
  ],
  tests: ['smoke_billow_dispersion']
};
