/**
 * gasAtoms.ts — Effect Atoms for Gas Evolution, Plumes, and Bubbles
 */

import { EffectAtom } from '../types';

export const nucleateBubblesAtom: EffectAtom = {
  name: 'nucleateBubbles',
  version: 1,
  category: 'gas',
  summary_en: 'Stream of discrete buoyancy-driven bubbles rising from nucleating surface sites.',
  useWhen: ['Gentle gas generation (metal in dilute acid, heating degassing)'],
  avoidWhen: ['Violent explosive eruptions', 'Non-gas precipitation reactions'],
  params: {
    bubbleRate: { name: 'bubbleRate', type: 'number', min: 1, max: 120, default: 25, unit: 'bubbles/s', description: 'Bubble emission rate' },
    meanRadius_mm: { name: 'meanRadius_mm', type: 'number', min: 0.5, max: 6.0, default: 2.2, unit: 'mm', description: 'Mean bubble radius' },
    color: { name: 'color', type: 'color', default: '#e0f2fe', description: 'Bubble refraction highlight color' },
    gasSpecies: { name: 'gasSpecies', type: 'string', default: 'H2', description: 'Gas chemical species' }
  },
  budget: { particles: 64, shaderCost: 1 },
  anchorsAllowed: ['bottom', 'bulk', 'surface'],
  ledgerInputs: ['rate:H2', 'rate:O2', 'gasHoldup'],
  mount(ctx, p) {
    return { atom: 'nucleateBubbles', instanceId: `nb_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Zinc in Dilute Acid', description: 'Steady H2 bubble columns', params: { bubbleRate: 35, meanRadius_mm: 1.8, color: '#e0f2fe', gasSpecies: 'H2' } },
    { title: 'Degassing Warm Water', description: 'Sparse micro-bubbles on glass bottom', params: { bubbleRate: 8, meanRadius_mm: 1.0, color: '#ffffff', gasSpecies: 'air' } }
  ],
  tests: ['nucleate_bubbles_rate']
};

export const effervescenceBurstAtom: EffectAtom = {
  name: 'effervescenceBurst',
  version: 1,
  category: 'gas',
  summary_en: 'Vigorous effervescent froth with multi-bubble churn and rapid surface popping.',
  useWhen: ['Carbonate + acid (CaCO3, Na2CO3, NaHCO3)', 'Magnesium or sodium rapid effervescence'],
  avoidWhen: ['Slow diffusion-limited dissolution without gas'],
  params: {
    intensity: { name: 'intensity', type: 'number', min: 0.1, max: 5.0, default: 2.0, description: 'Effervescence churn intensity' },
    churnRadius: { name: 'churnRadius', type: 'number', min: 0.1, max: 0.8, default: 0.45, unit: 'm', description: 'Horizontal spread of boiling froth' },
    gasSpecies: { name: 'gasSpecies', type: 'string', default: 'CO2', description: 'Generated gas species' }
  },
  budget: { particles: 120, shaderCost: 2 },
  anchorsAllowed: ['bulk', 'surface', 'bottom'],
  ledgerInputs: ['rate:CO2', 'rate:H2'],
  mount(ctx, p) {
    return { atom: 'effervescenceBurst', instanceId: `eff_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Marble Chips in HCl', description: 'Violent CO2 fizzing froth', params: { intensity: 3.0, churnRadius: 0.5, gasSpecies: 'CO2' } }
  ],
  tests: ['effervescence_churn']
};

export const buoyantGasPlumeAtom: EffectAtom = {
  name: 'buoyantGasPlume',
  version: 1,
  category: 'gas',
  summary_en: 'Upwardly buoyant billowy gas cloud rising from vessel rim into the laboratory atmosphere.',
  useWhen: ['Gas density is lighter than air (H2, NH3, steam)', 'Warm convective gases'],
  avoidWhen: ['Dense gases heavier than air that spill downwards'],
  params: {
    riseSpeed: { name: 'riseSpeed', type: 'number', min: 0.2, max: 3.0, default: 1.2, unit: 'm/s', description: 'Thermal/buoyancy ascent velocity' },
    color: { name: 'color', type: 'color', default: '#ffffff', description: 'Plume optical color' },
    opacity: { name: 'opacity', type: 'number', min: 0.05, max: 1.0, default: 0.35, description: 'Vapor cloud opacity' }
  },
  budget: { particles: 48, shaderCost: 1 },
  anchorsAllowed: ['rim', 'headspace'],
  ledgerInputs: ['rate:H2', 'rate:NH3'],
  mount(ctx, p) {
    return { atom: 'buoyantGasPlume', instanceId: `bgp_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Hydrogen Plume', description: 'Faint fast-rising transparent cloud', params: { riseSpeed: 2.2, color: '#f8fafc', opacity: 0.15 } }
  ],
  tests: ['buoyant_plume_ascent']
};

export const heavyVaporPourAtom: EffectAtom = {
  name: 'heavyVaporPour',
  version: 1,
  category: 'gas',
  summary_en: 'Dense, heavier-than-air vapor that rolls down over the vessel lip and cascades onto the benchtop.',
  useWhen: ['Dense colored gas (NO2 reddish-brown, Br2 dark vapor, Cl2 yellow-green, concentrated cold CO2)'],
  avoidWhen: ['Light buoyant gases (H2, CH4, hot steam)'],
  params: {
    color: { name: 'color', type: 'color', default: '#9a3412', description: 'Gas color (e.g. #9a3412 for NO2)' },
    densityMultiplier: { name: 'densityMultiplier', type: 'number', min: 1.2, max: 4.5, default: 1.6, description: 'Density relative to air' },
    spillRate: { name: 'spillRate', type: 'number', min: 5, max: 60, default: 28, unit: 'particles/s', description: 'Cascade density' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['rim', 'outside'],
  ledgerInputs: ['rate:NO2', 'rate:Cl2'],
  mount(ctx, p) {
    return { atom: 'heavyVaporPour', instanceId: `hvp_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Nitrogen Dioxide Cascade', description: 'Heavy reddish-brown NO2 gas rolling over rim', params: { color: '#9a3412', densityMultiplier: 1.58, spillRate: 35 } },
    { title: 'Bromine Fumes', description: 'Dense dark red-brown bromine vapor', params: { color: '#7f1d1d', densityMultiplier: 3.5, spillRate: 45 } }
  ],
  tests: ['heavy_vapor_pour_gravity']
};

export const headspaceFogAtom: EffectAtom = {
  name: 'headspaceFog',
  version: 1,
  category: 'gas',
  summary_en: 'Dense micro-particulate aerosol or fog filling the vessel headspace.',
  useWhen: ['Fuming acids (concentrated HCl, HNO3)', 'Gas reaction forming airborne smoke (NH3 + HCl -> NH4Cl solid smoke)'],
  avoidWhen: ['Clear odorless non-fuming solutions'],
  params: {
    fogColor: { name: 'fogColor', type: 'color', default: '#f8fafc', description: 'Aerosol smoke color' },
    density: { name: 'density', type: 'number', min: 0.1, max: 1.0, default: 0.75, description: 'Fog thickness' }
  },
  budget: { particles: 36, shaderCost: 1 },
  anchorsAllowed: ['headspace', 'rim'],
  mount(ctx, p) {
    return { atom: 'headspaceFog', instanceId: `fog_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Ammonium Chloride White Fumes', description: 'Dense billowing white smoke in neck', params: { fogColor: '#ffffff', density: 0.95 } }
  ],
  tests: ['headspace_fog_density']
};
