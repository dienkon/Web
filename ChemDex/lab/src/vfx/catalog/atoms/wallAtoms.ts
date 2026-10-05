/**
 * wallAtoms.ts — Effect Atoms for Glass Vessel Wall Condensation & Residue
 */

import { EffectAtom } from '../types';

export const wallCondensationDropletsAtom: EffectAtom = {
  name: 'wallCondensationDroplets',
  version: 1,
  category: 'wall',
  summary_en: 'Microscopic dew film and discrete droplets condensing on the inner glass vessel wall, sliding down above pinning radius.',
  useWhen: ['Warm vapor enters cooler vessel headspace', 'Distillation or boiling in Erlenmeyer flask'],
  avoidWhen: ['Completely dry glassware at uniform room temperature'],
  params: {
    condensationRate: { name: 'condensationRate', type: 'number', min: 0.1, max: 2.0, default: 0.75, description: 'Droplet accumulation rate' },
    maxDropletSize_mm: { name: 'maxDropletSize_mm', type: 'number', min: 0.5, max: 4.0, default: 2.2, unit: 'mm', description: 'Pinning slide threshold' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['wall', 'wallUpper', 'headspace'],
  mount(ctx, p) {
    return { atom: 'wallCondensationDroplets', instanceId: `wall_cond_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Flask Headspace Condensation', description: 'Beaded water dew droplets sliding down neck', params: { condensationRate: 0.8, maxDropletSize_mm: 2.5 } }
  ],
  tests: ['wall_condensation_droplets']
};

export const residueStainAtom: EffectAtom = {
  name: 'residueStain',
  version: 1,
  category: 'wall',
  summary_en: 'Persistent chemical residue ring, meniscus dried salt crust, or brown MnO2/Fe3+ glass stain.',
  useWhen: ['Liquid evaporates leaving behind solute', 'KMnO4 or FeCl3 stains glassware'],
  avoidWhen: ['Pure distilled water evaporation without non-volatile solutes'],
  params: {
    stainColor: { name: 'stainColor', type: 'color', default: '#78350f', description: 'Residue color' },
    opacity: { name: 'opacity', type: 'number', min: 0.1, max: 1.0, default: 0.85, description: 'Stain film opacity' },
    ringThickness_mm: { name: 'ringThickness_mm', type: 'number', min: 0.5, max: 6.0, default: 2.0, unit: 'mm', description: 'Evaporated meniscus ring width' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['wall', 'wallLower', 'meniscus', 'bottom'],
  mount(ctx, p) {
    return { atom: 'residueStain', instanceId: `stain_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  writeBack(h, vessel) {
    if (!vessel.residues) vessel.residues = [];
    vessel.residues.push({ where: 'wall', kind: 'stain', color: h.custom?.stainColor || '#78350f', amount: 0.05 });
  },
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Permanganate Brown Stain', description: 'Persistent brown MnO2 ring on glass meniscus', params: { stainColor: '#451a03', opacity: 0.9, ringThickness_mm: 2.5 } }
  ],
  tests: ['residue_stain_persistence']
};
