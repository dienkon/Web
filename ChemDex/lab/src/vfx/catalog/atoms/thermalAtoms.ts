/**
 * thermalAtoms.ts — Effect Atoms for Thermodynamic & Thermal Visuals
 */

import { EffectAtom } from '../types';

export const boilingBumpingAtom: EffectAtom = {
  name: 'boilingBumping',
  version: 1,
  category: 'thermal',
  summary_en: 'Violent nucleate and film boiling, bubble surging, and cavitation bumping when liquid exceeds saturation temperature.',
  useWhen: ['Liquid heated above 98 °C', 'Superheated boiling bumping without boiling chips'],
  avoidWhen: ['Room temperature liquids'],
  params: {
    intensity: { name: 'intensity', type: 'number', min: 0.1, max: 4.0, default: 2.0, description: 'Vigor of boiling' },
    bumpingShockwave: { name: 'bumpingShockwave', type: 'boolean', default: false, description: 'Intermittent bumping shockwave' }
  },
  budget: { particles: 64, shaderCost: 2 },
  anchorsAllowed: ['bottom', 'surface', 'bulk'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) {
    return { atom: 'boilingBumping', instanceId: `boil_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Saturated Rolling Boil', description: 'Continuous vigorous bubbling at 100 °C', params: { intensity: 2.5, bumpingShockwave: false } },
    { title: 'Superheated Bumping', description: 'Explosive surging pulse', params: { intensity: 3.5, bumpingShockwave: true } }
  ],
  tests: ['boiling_bumping_thermal']
};

export const thermalSteamAtom: EffectAtom = {
  name: 'thermalSteam',
  version: 1,
  category: 'thermal',
  summary_en: 'Billowing warm condensing water vapor rising above warm or hot liquids.',
  useWhen: ['Liquid temperature >= 48 °C', 'Exothermic dissolution or neutralization heating'],
  avoidWhen: ['Cold or room-temperature liquids'],
  params: {
    steamDensity: { name: 'steamDensity', type: 'number', min: 0.1, max: 2.5, default: 1.0, description: 'Steam cloud density' },
    temperature_c: { name: 'temperature_c', type: 'number', min: 45, max: 120, default: 75, unit: '°C', description: 'Liquid temperature' }
  },
  budget: { particles: 48, shaderCost: 1 },
  anchorsAllowed: ['rim', 'surface'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) {
    return { atom: 'thermalSteam', instanceId: `steam_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Simmering Vapor', description: 'Gentle steam wisps from warm beaker', params: { steamDensity: 0.8, temperature_c: 65 } },
    { title: 'Vigorous Boiling Steam', description: 'Dense white cloud billowing from boiling flask', params: { steamDensity: 2.2, temperature_c: 100 } }
  ],
  tests: ['thermal_steam_density']
};

export const convectionCurrentsAtom: EffectAtom = {
  name: 'convectionCurrents',
  version: 1,
  category: 'thermal',
  summary_en: 'Refractive index Schlieren striations and toroidal convective circulation within the fluid.',
  useWhen: ['Heating from bottom burner', 'Mixing liquids of vastly different densities (glycerol and water)'],
  avoidWhen: ['Stagnant isothermal liquids'],
  params: {
    schlierenStrength: { name: 'schlierenStrength', type: 'number', min: 0.1, max: 2.0, default: 0.8, description: 'Optical refractive shimmer' },
    convectionSpeed: { name: 'convectionSpeed', type: 'number', min: 0.1, max: 3.0, default: 1.2, unit: 'cm/s', description: 'Circulation velocity' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) {
    return { atom: 'convectionCurrents', instanceId: `conv_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Thermal Schlieren', description: 'Wavy heat distortion veins rising through solution', params: { schlierenStrength: 1.2, convectionSpeed: 1.5 } }
  ],
  tests: ['convection_currents_schlieren']
};

export const frostCreepAtom: EffectAtom = {
  name: 'frostCreep',
  version: 1,
  category: 'thermal',
  summary_en: 'Ice crystal frost creep and cold condensation mist coating the outer glass vessel wall.',
  useWhen: ['Endothermic dissolution with ΔT < 0 (Ba(OH)2 + NH4SCN, urea in water)', 'Freezing mixtures'],
  avoidWhen: ['Exothermic reactions releasing heat'],
  params: {
    frostThickness: { name: 'frostThickness', type: 'number', min: 0.1, max: 1.0, default: 0.6, description: 'Frost coating opacity' },
    frostColor: { name: 'frostColor', type: 'color', default: '#e0f2fe', description: 'Frost crystal hue' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['wall', 'wallLower'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) {
    return { atom: 'frostCreep', instanceId: `frost_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Endothermic Freezing Frost', description: 'Dense ice frost freezing the beaker to a wooden block', params: { frostThickness: 0.85, frostColor: '#e0f2fe' } }
  ],
  tests: ['frost_creep_endothermic']
};
