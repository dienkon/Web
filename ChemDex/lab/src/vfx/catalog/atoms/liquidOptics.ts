/**
 * liquidOptics.ts — Effect Atoms for Liquid Optics & Color Dynamics
 */

import { EffectAtom } from '../types';

export const liquidSwirlAtom: EffectAtom = {
  name: 'liquidSwirl',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Localized turbulent swirl and color plume when two liquids or solutions meet.',
  useWhen: ['Reagents with differing colors or densities mix', 'Stirring rod or pour stream impacts liquid'],
  avoidWhen: ['Completely unmixed separate phases', 'Dry solids without liquid'],
  params: {
    speed: { name: 'speed', type: 'number', min: 0.1, max: 5.0, default: 1.2, unit: 'rad/s', description: 'Rotational vortex speed' },
    diffusionRadius: { name: 'diffusionRadius', type: 'number', min: 0.05, max: 1.0, default: 0.35, unit: 'm', description: 'Radial extent of color plume' },
    color: { name: 'color', type: 'color', default: '#38bdf8', description: 'Incoming reagent dye color' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['pourPoint', 'bulk', 'surface'],
  ledgerInputs: ['gasHoldup'],
  mount(ctx, p) {
    return { atom: 'liquidSwirl', instanceId: `swirl_${Date.now()}`, alive: true, custom: { ...p, phase: 0 } };
  },
  update(h, dt) {
    if (h.custom) h.custom.phase += dt * (h.custom.speed || 1.0);
  },
  dispose(h) {
    h.alive = false;
  },
  gallery: [
    { title: 'Gentle Swirl', description: 'Slow diffusion of dilute indicator', params: { speed: 0.8, diffusionRadius: 0.25, color: '#f43f5e' } },
    { title: 'Vigorous Agitation', description: 'Rapid vortex created by magnetic stirrer', params: { speed: 3.5, diffusionRadius: 0.6, color: '#8b5cf6' } }
  ],
  tests: ['liquid_swirl_diffusion']
};

export const beerLambertFadeAtom: EffectAtom = {
  name: 'beerLambertFade',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Physical spectrophotometric absorbance fading or deepening driven by species concentration.',
  useWhen: ['Colored chromophore ion is consumed or formed', 'Titration endpoint color transition'],
  avoidWhen: ['Gas generation without color change', 'Color change caused purely by suspended precipitate'],
  params: {
    startColor: { name: 'startColor', type: 'color', default: '#7c3aed', description: 'Initial solution color' },
    endColor: { name: 'endColor', type: 'color', default: '#f8fafc', description: 'Final bleached solution color' },
    opticalPath_cm: { name: 'opticalPath_cm', type: 'number', min: 0.5, max: 15.0, default: 4.5, unit: 'cm', description: 'Cuvette or vessel diameter' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  ledgerInputs: ['rate:reactant', 'amount:product'],
  mount(ctx, p) {
    return { atom: 'beerLambertFade', instanceId: `bl_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update(h, dt, s) {
    // Follows ledger rates directly
  },
  dispose(h) {
    h.alive = false;
  },
  gallery: [
    { title: 'Permanganate Bleach', description: 'KMnO4 decolorize into Mn2+', params: { startColor: '#581c87', endColor: '#fdf2f8', opticalPath_cm: 5.0 } },
    { title: 'Iodine Fading', description: 'Iodine brown fading with thiosulfate', params: { startColor: '#78350f', endColor: '#fefce8', opticalPath_cm: 4.0 } }
  ],
  tests: ['beer_lambert_stoich']
};

export const turbidityShiftAtom: EffectAtom = {
  name: 'turbidityShift',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Loss of optical clarity due to colloidal Tyndall scattering or fine micro-crystals.',
  useWhen: ['Milkiness or haziness develops (BaSO4, sulfur sol)', 'Emulsion formation'],
  avoidWhen: ['Clear solution remaining transparent', 'Large chunks settling immediately without haze'],
  params: {
    maxTurbidity: { name: 'maxTurbidity', type: 'number', min: 0.0, max: 1.0, default: 0.85, description: 'Maximum opacity (1 = fully opaque milk)' },
    hazeColor: { name: 'hazeColor', type: 'color', default: '#ffffff', description: 'Scatter color' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  ledgerInputs: ['turbidity'],
  mount(ctx, p) {
    return { atom: 'turbidityShift', instanceId: `turb_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update(h, dt, s) {
    if (h.custom) h.custom.currentTurbidity = s.turbidity;
  },
  dispose(h) {
    h.alive = false;
  },
  gallery: [
    { title: 'Milky Barium Sulfate', description: 'Dense white Tyndall scattering', params: { maxTurbidity: 0.95, hazeColor: '#ffffff' } },
    { title: 'Sulfur Sol', description: 'Slowly developing pale cream turbidity', params: { maxTurbidity: 0.75, hazeColor: '#fef08a' } }
  ],
  tests: ['turbidity_shift_progression']
};

export const fluorescenceGlowAtom: EffectAtom = {
  name: 'fluorescenceGlow',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Fluorescent emissive photon glow under excitation light.',
  useWhen: ['Fluorescein or quinine under UV lamp', 'Chemiluminescent reactions like luminol'],
  avoidWhen: ['Standard daylight non-fluorescent reagents'],
  params: {
    emissionColor: { name: 'emissionColor', type: 'color', default: '#22c55e', description: 'Fluorescent wavelength color' },
    intensity: { name: 'intensity', type: 'number', min: 0.1, max: 3.0, default: 1.5, description: 'Luminance multiplier' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk', 'surface'],
  mount(ctx, p) {
    return { atom: 'fluorescenceGlow', instanceId: `fl_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Fluorescein Green', description: 'Brilliant green emission', params: { emissionColor: '#4ade80', intensity: 2.0 } }
  ],
  tests: ['fluorescence_glow']
};

export const liquidPhaseSplitAtom: EffectAtom = {
  name: 'liquidPhaseSplit',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Biphasic liquid separation showing two distinct immiscible layers and sharp boundary meniscus.',
  useWhen: ['Extraction with ether, hexane, or ethyl acetate over water'],
  avoidWhen: ['Miscible single-phase aqueous solutions'],
  params: {
    topPhaseColor: { name: 'topPhaseColor', type: 'color', default: '#fef08a', description: 'Upper organic phase color' },
    topPhaseFraction: { name: 'topPhaseFraction', type: 'number', min: 0.05, max: 0.95, default: 0.4, description: 'Fraction of total liquid volume' },
    meniscusSharpness: { name: 'meniscusSharpness', type: 'number', min: 0.5, max: 1.0, default: 0.95, description: 'Interfacial clarity' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['meniscus', 'bulk'],
  mount(ctx, p) {
    return { atom: 'liquidPhaseSplit', instanceId: `split_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Iodine Extraction in Hexane', description: 'Purple organic layer atop clear water', params: { topPhaseColor: '#c084fc', topPhaseFraction: 0.35, meniscusSharpness: 0.95 } }
  ],
  tests: ['phase_split_meniscus']
};
