/**
 * solidAtoms.ts — Effect Atoms for Solid Phase, Precipitates, Crystals & Erosion
 */

import { EffectAtom } from '../types';

export const precipitateNucleationAtom: EffectAtom = {
  name: 'precipitateNucleation',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Spontaneous homogeneous or heterogeneous nucleation of solid particles from supersaturated solution.',
  useWhen: ['Ionic product Q > Ksp', 'Insoluble salt forms upon mixing'],
  avoidWhen: ['Soluble salts remaining in solution', 'Gas-only reactions'],
  params: {
    morphology: { name: 'morphology', type: 'string', default: 'fine_powder', description: 'Precipitate morphology class' },
    color: { name: 'color', type: 'color', default: '#ffffff', description: 'Precipitate solid color' },
    nucleationRate: { name: 'nucleationRate', type: 'number', min: 10, max: 200, default: 80, unit: 'particles/s', description: 'Spawn burst intensity' }
  },
  budget: { particles: 96, shaderCost: 1 },
  anchorsAllowed: ['bulk', 'pourPoint'],
  ledgerInputs: ['supersaturation:product', 'rate:product'],
  mount(ctx, p) {
    return { atom: 'precipitateNucleation', instanceId: `nuc_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Silver Chloride Curds', description: 'AgCl white curdy clumping', params: { morphology: 'curd', color: '#ffffff', nucleationRate: 90 } },
    { title: 'Copper Hydroxide Gel', description: 'Cu(OH)2 light cyan gel flakes', params: { morphology: 'gel', color: '#38bdf8', nucleationRate: 60 } }
  ],
  tests: ['precipitate_nucleation_burst']
};

export const stokesSedimentationAtom: EffectAtom = {
  name: 'stokesSedimentation',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Stokes terminal settling velocity v = 2/9 * r^2 * g * (rho_p - rho_f) / mu, accumulating a bottom sediment bed.',
  useWhen: ['Precipitate particles settle downwards over time', 'Centrifugation or gravity settling'],
  avoidWhen: ['Colloids with Brownian motion preventing settling', 'Buoyant floating solids'],
  params: {
    stokesRadius_um: { name: 'stokesRadius_um', type: 'number', min: 0.1, max: 50.0, default: 4.5, unit: 'µm', description: 'Particle hydrodynamic radius' },
    sedimentColor: { name: 'sedimentColor', type: 'color', default: '#ffffff', description: 'Bed color' },
    bedHeight_mm: { name: 'bedHeight_mm', type: 'number', min: 0.5, max: 30.0, default: 6.0, unit: 'mm', description: 'Final settled bed height' }
  },
  budget: { particles: 64, shaderCost: 1 },
  anchorsAllowed: ['bulk', 'bottom'],
  ledgerInputs: ['amount:precipitate'],
  mount(ctx, p) {
    return { atom: 'stokesSedimentation', instanceId: `stokes_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Heavy Lead Iodide Bed', description: 'Rapid settling of dense golden flakes', params: { stokesRadius_um: 12.0, sedimentColor: '#facc15', bedHeight_mm: 8.0 } }
  ],
  tests: ['stokes_settling_rate']
};

export const crystalGlitterAtom: EffectAtom = {
  name: 'crystalGlitter',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Scintillating specular glints and anisotropic highlights from reflective crystalline facets.',
  useWhen: ['Golden rain PbI2 flakes rotating in solution', 'Crystalline precipitates with lustrous faces'],
  avoidWhen: ['Amorphous matte powders', 'Gelatinous flocculent precipitates'],
  params: {
    glintFrequency: { name: 'glintFrequency', type: 'number', min: 1, max: 20, default: 8, unit: 'Hz', description: 'Tumbling flash frequency' },
    glintColor: { name: 'glintColor', type: 'color', default: '#fef08a', description: 'Specular glint highlight color' },
    facetSize_mm: { name: 'facetSize_mm', type: 'number', min: 0.2, max: 3.0, default: 0.8, unit: 'mm', description: 'Crystal plate size' }
  },
  budget: { particles: 48, shaderCost: 2 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) {
    return { atom: 'crystalGlitter', instanceId: `glit_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Golden Rain Glints', description: 'Hexagonal PbI2 plates sparkling like gold dust', params: { glintFrequency: 10, glintColor: '#fef08a', facetSize_mm: 1.0 } }
  ],
  tests: ['crystal_glitter_sparkle']
};

export const surfaceDendriteGrowthAtom: EffectAtom = {
  name: 'surfaceDendriteGrowth',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Branching metallic tree (dendrite) fractal crystallization on metal surfaces.',
  useWhen: ['Single displacement (Cu wire in AgNO3, Zn in SnCl2, Zn in Pb(NO3)2)'],
  avoidWhen: ['Precipitation from homogeneous ionic solution'],
  params: {
    metalColor: { name: 'metalColor', type: 'color', default: '#e2e8f0', description: 'Deposited metal luster color' },
    growthSpeed: { name: 'growthSpeed', type: 'number', min: 0.1, max: 2.0, default: 0.5, unit: 'mm/s', description: 'Tree elongation rate' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bottom', 'bulk'],
  mount(ctx, p) {
    return { atom: 'surfaceDendriteGrowth', instanceId: `dend_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Silver Tree on Copper', description: 'Brilliant needle-like silver dendrites branching on copper surface', params: { metalColor: '#f1f5f9', growthSpeed: 0.8 } }
  ],
  tests: ['dendrite_fractal_growth']
};

export const metallicMirrorDepositAtom: EffectAtom = {
  name: 'metallicMirrorDeposit',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Deposition of a continuous, specular metallic silver or copper mirror on the inner glass wall.',
  useWhen: ['Tollens aldehyde silver mirror test', 'Fehling glucose reduction to Cu2O/Cu mirror'],
  avoidWhen: ['Suspensions that do not adhere to glass'],
  params: {
    mirrorReflectance: { name: 'mirrorReflectance', type: 'number', min: 0.2, max: 1.0, default: 0.95, description: 'Specular reflectivity' },
    metalTint: { name: 'metalTint', type: 'color', default: '#e2e8f0', description: 'Lustrous metal tint' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['wall', 'wallLower'],
  mount(ctx, p) {
    return { atom: 'metallicMirrorDeposit', instanceId: `mirr_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Tollens Silver Mirror', description: 'Flawless silver mirror lining inner test tube wall', params: { mirrorReflectance: 0.98, metalTint: '#f8fafc' } }
  ],
  tests: ['metallic_mirror_coverage']
};

export const solidErosionAtom: EffectAtom = {
  name: 'solidErosion',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Shrinking, pitting, and thinning of solid reagent granules, nails, or ribbons as they are chemically consumed.',
  useWhen: ['Metal ribbon burning or dissolving in acid', 'CaCO3 marble chips reacting with acid'],
  avoidWhen: ['Insoluble catalyst remaining constant (MnO2)'],
  params: {
    initialShape: { name: 'initialShape', type: 'select', options: ['granule', 'ribbon', 'nail', 'sheet'], default: 'granule', description: 'Geometry type' },
    erosionRate: { name: 'erosionRate', type: 'number', min: 0.01, max: 1.0, default: 0.2, description: 'Scale contraction per second' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bottom', 'surface', 'bulk'],
  ledgerInputs: ['rate:solid', 'amount:solid'],
  mount(ctx, p) {
    return { atom: 'solidErosion', instanceId: `ero_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Zinc Granule Dissolving', description: 'Granule rounding and shrinking with surface pitting', params: { initialShape: 'granule', erosionRate: 0.15 } }
  ],
  tests: ['solid_erosion_shrinking']
};
