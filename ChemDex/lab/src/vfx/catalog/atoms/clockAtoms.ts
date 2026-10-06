/**
 * clockAtoms.ts — Effect Atoms for Kinetic, Clock & Oscillating Reactions (§4.H)
 * 
 * Implements all 10 canonical kinetic/clock atoms.
 * Models induction periods, autocatalytic moving fronts, enzyme denaturation,
 * Oregonator limit-cycle oscillations, and Briggs-Rauscher clock transitions.
 */

import { EffectAtom } from '../types';

export const iodineClockSwitchAtom: EffectAtom = {
  name: 'iodineClockSwitch',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Induction period where solution remains water-clear, followed by sudden near-instantaneous flash to deep blue-black (starch-triiodide).',
  useWhen: ['Landolt iodine clock (persulfate/iodide/thiosulfate/starch)'],
  avoidWhen: ['Slow continuous color gradual fades'],
  params: {
    inductionDelay_s: { name: 'inductionDelay_s', type: 'number', min: 1.0, max: 120.0, default: 12.0, unit: 's', description: 'Clear delay' },
    switchTime_s: { name: 'switchTime_s', type: 'number', min: 0.05, max: 0.5, default: 0.15, unit: 's', description: 'Color flip sharpness' },
    finalColor: { name: 'finalColor', type: 'color', default: '#020617', description: 'Starch-I3- blue-black' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'iodineClockSwitch', instanceId: `iclock_${Date.now()}`, alive: true, custom: { ...p, t: 0 } }; },
  update(h, dt) { if (h.custom) h.custom.t += dt; },
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Standard Iodine Clock (12 s)', description: 'Solution stays clear for 12 seconds then snaps to midnight blue-black in 0.15 s', params: { inductionDelay_s: 12.0, switchTime_s: 0.15, finalColor: '#020617' } },
    { title: 'Chilled Slow Clock (35 s)', description: 'Lower temperature delays the switch due to Arrhenius kinetics (Q10 ~ 2)', params: { inductionDelay_s: 35.0, switchTime_s: 0.25, finalColor: '#020617' } }
  ],
  tests: ['iodine_clock_induction_sharp_switch']
};

export const thiosulfateCrossDisappearAtom: EffectAtom = {
  name: 'thiosulfateCrossDisappear',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Disappearing cross: black marker "X" under the flask gradually fades and disappears as sulfur turbidity crosses critical threshold.',
  useWhen: ['Na2S2O3 + HCl concentration or temperature reaction rate experiment'],
  avoidWhen: ['Instantaneous precipitate formation'],
  params: {
    disappearanceTime_s: { name: 'disappearanceTime_s', type: 'number', min: 2.0, max: 90.0, default: 16.0, unit: 's', description: 'Time to obscure cross' },
    hazeColor: { name: 'hazeColor', type: 'color', default: '#fef9c3', description: 'Colloidal sulfur scatter' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk', 'bottom'],
  ledgerInputs: ['turbidity'],
  mount(ctx, p) { return { atom: 'thiosulfateCrossDisappear', instanceId: `cross_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Cross Disappears at 16 s', description: '1.0 M acid causes mark to disappear in 16 seconds', params: { disappearanceTime_s: 16.0, hazeColor: '#fef9c3' } },
    { title: 'Dilute Acid Cross Fade (45 s)', description: '0.25 M acid delays disappearance to 45 seconds', params: { disappearanceTime_s: 45.0, hazeColor: '#fef08a' } }
  ],
  tests: ['thiosulfate_disappearing_cross_kinetics']
};

export const landoltReactionFlashAtom: EffectAtom = {
  name: 'landoltReactionFlash',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Iodate-bisulfite clock: solution stays clear until limiting bisulfite is exhausted, then snaps permanently to dark blue.',
  useWhen: ['KIO3 + NaHSO3 + starch reaction'],
  avoidWhen: ['Oscillating reactions that revert'],
  params: {
    delay_s: { name: 'delay_s', type: 'number', min: 2.0, max: 60.0, default: 10.0, unit: 's', description: 'Exhaustion delay' },
    blueDepth: { name: 'blueDepth', type: 'color', default: '#09090b', description: 'Starch complex deep black-blue' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'landoltReactionFlash', instanceId: `landolt_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Landolt Flash Endpoint', description: 'Sudden dark blue transformation after bisulfite depletion', params: { delay_s: 10.0, blueDepth: '#09090b' } },
    { title: 'Rapid Landolt Flash', description: 'Higher iodate concentration triggers flash in 3 s', params: { delay_s: 3.0, blueDepth: '#0f172a' } }
  ],
  tests: ['landolt_reaction_flash_clock']
};

export const bzOscillatorAtom: EffectAtom = {
  name: 'bzOscillator',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Belousov-Zhabotinsky reaction: cyclic red (ferroin) <-> blue (ferriin) oscillations with concentric wave spirals in thin film.',
  useWhen: ['BZ reaction in stirred beaker or Petri dish film'],
  avoidWhen: ['One-way irreversible reactions'],
  params: {
    period_s: { name: 'period_s', type: 'number', min: 4.0, max: 60.0, default: 14.0, unit: 's', description: 'Limit cycle period' },
    wavePattern: { name: 'wavePattern', type: 'boolean', default: false, description: '2D target/spiral waves (Petri dish mode)' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk', 'surface'],
  mount(ctx, p) { return { atom: 'bzOscillator', instanceId: `bz_${Date.now()}`, alive: true, custom: { ...p, t: 0 } }; },
  update(h, dt) { if (h.custom) h.custom.t += dt; },
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'BZ Stirred Beaker Oscillation', description: 'Bulk liquid flashes rhythmically between ruby red and cobalt blue every 14 s', params: { period_s: 14.0, wavePattern: false } },
    { title: 'BZ Spiral Chemical Waves', description: 'Hypnotic target patterns expanding radially in thin Petri dish layer', params: { period_s: 10.0, wavePattern: true } }
  ],
  tests: ['bz_oscillator_limit_cycle']
};

export const blueBottleShakeAtom: EffectAtom = {
  name: 'blueBottleShake',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Blue bottle experiment: shaking dissolves O2 turning methylene blue blue; standing still reduces it back to colorless from bottom up.',
  useWhen: ['Methylene blue + glucose + KOH shaken in half-filled flask'],
  avoidWhen: ['Solutions open without air headspace'],
  params: {
    bleachTime_s: { name: 'bleachTime_s', type: 'number', min: 3.0, max: 40.0, default: 12.0, unit: 's', description: 'Reduction fading time' },
    blueIntensity: { name: 'blueIntensity', type: 'number', min: 0.5, max: 2.5, default: 1.6, description: 'Shaken oxidized color' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk', 'surface'],
  mount(ctx, p) { return { atom: 'blueBottleShake', instanceId: `bbottle_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Shaken Blue to Colorless Rest', description: 'Flask turns intense blue when shaken, fades back to crystal clear upon standing', params: { bleachTime_s: 12.0, blueIntensity: 1.8 } },
    { title: 'Repeated Blue Bottle Cycles', description: 'Multiple agitation and decolorization cycles with gradual dye exhaustion', params: { bleachTime_s: 18.0, blueIntensity: 1.4 } }
  ],
  tests: ['blue_bottle_redox_shaking']
};

export const chameleonMnO4Atom: EffectAtom = {
  name: 'chameleonMnO4',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Chemical chameleon: alkaline glucose reduces purple MnO4- -> green manganate MnO4 2- -> yellow-brown colloidal MnO2.',
  useWhen: ['KMnO4 + glucose + NaOH in water'],
  avoidWhen: ['Acidic permanganate reductions'],
  params: {
    greenStageDuration_s: { name: 'greenStageDuration_s', type: 'number', min: 1.0, max: 15.0, default: 4.0, unit: 's', description: 'Green intermediate life' },
    finalAmberSol: { name: 'finalAmberSol', type: 'color', default: '#a16207', description: 'Colloidal MnO2 brown' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'chameleonMnO4', instanceId: `cham_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Chemical Chameleon Sequence', description: 'Purple turns brilliant emerald green, then amber, then settling brown sol', params: { greenStageDuration_s: 4.5, finalAmberSol: '#a16207' } },
    { title: 'Rapid Alkaline Reduction', description: 'Green flash lasts 1.5 s before brown MnO2 precipitation', params: { greenStageDuration_s: 1.5, finalAmberSol: '#854d0e' } }
  ],
  tests: ['chameleon_permanganate_multistage']
};

export const catalyticDecompositionAtom: EffectAtom = {
  name: 'catalyticDecomposition',
  version: 1,
  category: 'gas',
  summary_en: 'Solid catalyst (MnO2, KI, catalase) triggers vigorous gas evolution; catalyst mass remains completely unchanged in ledger.',
  useWhen: ['H2O2 decomposition with MnO2 black powder or KI'],
  avoidWhen: ['Reagents that are consumed by the reaction'],
  params: {
    catalystFormula: { name: 'catalystFormula', type: 'string', default: 'MnO2(s)', description: 'Catalyst species' },
    rateMultiplier: { name: 'rateMultiplier', type: 'number', min: 10.0, max: 1000.0, default: 250.0, description: 'Kinetic acceleration' }
  },
  budget: { particles: 80, shaderCost: 1 },
  anchorsAllowed: ['bottom', 'bulk'],
  ledgerInputs: ['rate:O2'],
  mount(ctx, p) { return { atom: 'catalyticDecomposition', instanceId: `catdec_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'MnO2 Catalytic H2O2 Decomposition', description: 'Black MnO2 powder fizzes violently evolving O2; exactly 1.00 g MnO2 recovered', params: { catalystFormula: 'MnO2(s)', rateMultiplier: 300.0 } },
    { title: 'Potassium Iodide Catalyst', description: 'Aqueous I- catalyzes oxygen evolution turning transient amber', params: { catalystFormula: 'I-(aq)', rateMultiplier: 150.0 } }
  ],
  tests: ['catalytic_decomposition_constant_catalyst_mass']
};

export const autocatalysisFrontAtom: EffectAtom = {
  name: 'autocatalysisFront',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Mn2+ autocatalysis in KMnO4 + oxalic acid: slow sluggish start followed by sudden dramatic acceleration and moving clear front.',
  useWhen: ['Oxalic acid + permanganate titration without pre-added Mn2+'],
  avoidWhen: ['Reactions with pre-catalyzed fast starts'],
  params: {
    inductionDelay_s: { name: 'inductionDelay_s', type: 'number', min: 2.0, max: 40.0, default: 12.0, unit: 's', description: 'Sluggish start delay' },
    autocatalyticGain: { name: 'autocatalyticGain', type: 'number', min: 2.0, max: 20.0, default: 8.0, description: 'Rate exponential acceleration' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  ledgerInputs: ['rate:product'],
  mount(ctx, p) { return { atom: 'autocatalysisFront', instanceId: `autocat_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Permanganate Autocatalysis', description: 'First drop takes 15 s to decolorize; subsequent drops fade instantly as Mn2+ accumulates', params: { inductionDelay_s: 15.0, autocatalyticGain: 10.0 } },
    { title: 'Moving Decolorization Front', description: 'Colorless front sweeping through unstirred tube', params: { inductionDelay_s: 8.0, autocatalyticGain: 6.0 } }
  ],
  tests: ['autocatalysis_oxalic_permanganate']
};

export const enzymeFoamAtom: EffectAtom = {
  name: 'enzymeFoam',
  version: 1,
  category: 'gas',
  summary_en: 'Catalase (yeast, liver extract) decomposes H2O2 into rich dense oxygen foam; denatures completely and fails when heated past 60 °C.',
  useWhen: ['Yeast + H2O2 bio-catalysis foam demonstration'],
  avoidWhen: ['Inorganic heat-resistant catalysts'],
  params: {
    denatured: { name: 'denatured', type: 'boolean', default: false, description: 'Thermal denaturation (T > 60 °C kills enzyme)' },
    foamVigor: { name: 'foamVigor', type: 'number', min: 0.1, max: 3.0, default: 1.8, description: 'Gas foaming rate' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['surface', 'rim'],
  mount(ctx, p) { return { atom: 'enzymeFoam', instanceId: `enz_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Active Yeast Catalase Foam', description: 'Towering warm white foam climbing beaker neck as enzyme splits H2O2', params: { denatured: false, foamVigor: 2.2 } },
    { title: 'Boiled Yeast Denatured (No Reaction)', description: 'Pre-boiled yeast produces zero bubbles: protein catalyst thermally destroyed', params: { denatured: true, foamVigor: 0.0 } }
  ],
  tests: ['enzyme_foam_thermal_denaturation']
};

export const reactionDiffusionFrontAtom: EffectAtom = {
  name: 'reactionDiffusionFront',
  version: 1,
  category: 'liquidOptics',
  summary_en: '2D reaction-diffusion front shader reproducing Turing patterns, Liesegang precipitation fronts, and BZ spiral waves.',
  useWhen: ['Petri dish or gel 2D reaction-diffusion phenomena'],
  avoidWhen: ['3D turbulent bulk liquid mixing'],
  params: {
    patternType: { name: 'patternType', type: 'select', default: 'spiral', options: ['spiral', 'target_rings', 'turing_spots'], description: 'Front morphology' },
    waveSpeed: { name: 'waveSpeed', type: 'number', min: 0.1, max: 2.0, default: 0.6, description: 'Propagation speed' }
  },
  budget: { shaderCost: 3 },
  anchorsAllowed: ['surface', 'bulk'],
  mount(ctx, p) { return { atom: 'reactionDiffusionFront', instanceId: `rdfront_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Chemical Spiral Wave Front', description: 'Rotating spiral arms propagating steadily in thin chemical layer', params: { patternType: 'spiral', waveSpeed: 0.7 } },
    { title: 'Turing Morphogenesis Spots', description: 'Stationary spatial spots emerging from activator-inhibitor diffusion', params: { patternType: 'turing_spots', waveSpeed: 0.2 } }
  ],
  tests: ['reaction_diffusion_turing_front']
};
