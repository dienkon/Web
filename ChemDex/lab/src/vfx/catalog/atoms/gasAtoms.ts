/**
 * gasAtoms.ts — Effect Atoms for Gas & Bubble Phenomena (§4.B)
 * 
 * Implements all 20 canonical gas/bubble atoms plus legacy aliases.
 * Adheres to EffectAtom contract with >= 2 presets and tests.
 */

import { EffectAtom } from '../types';

export const nucleationSiteBubbleStreamAtom: EffectAtom = {
  name: 'nucleationSiteBubbleStream',
  version: 1,
  category: 'gas',
  summary_en: 'Chains of bubbles nucleating continuously from microscopic wall scratches or solid defects and rising with Minnaert burst sounds.',
  useWhen: ['Steady gas evolution at scratch sites in beaker', 'Effervescent liquid resting on glass'],
  avoidWhen: ['Violent explosive boiling'],
  params: {
    bubbleRate: { name: 'bubbleRate', type: 'number', min: 1.0, max: 50.0, default: 12.0, unit: 'bubbles/s', description: 'Stream frequency' },
    bubbleRadius_mm: { name: 'bubbleRadius_mm', type: 'number', min: 0.5, max: 4.0, default: 1.5, unit: 'mm', description: 'Detachment radius' },
    siteCount: { name: 'siteCount', type: 'number', min: 1, max: 10, default: 3, description: 'Active scratch sites' }
  },
  budget: { particles: 60, shaderCost: 1 },
  anchorsAllowed: ['bottom', 'wallLower', 'bulk'],
  mount(ctx, p) { return { atom: 'nucleationSiteBubbleStream', instanceId: `nuc_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Gentle Fizz Chain', description: 'Two steady streams rising from beaker base', params: { bubbleRate: 8.0, bubbleRadius_mm: 1.2, siteCount: 2 } },
    { title: 'Multiple Nucleation Sites', description: 'Dense streams from boiling chips', params: { bubbleRate: 25.0, bubbleRadius_mm: 2.0, siteCount: 5 } }
  ],
  tests: ['nucleation_stream_minnaert']
};

export const fineEffervescenceCloudAtom: EffectAtom = {
  name: 'fineEffervescenceCloud',
  version: 1,
  category: 'gas',
  summary_en: 'Thousands of micro-bubbles forming a fizzy milky champagne cloud throughout bulk volume.',
  useWhen: ['Carbonate + acid reaction', 'Alka-seltzer or antacid dissolving'],
  avoidWhen: ['Single slow bubble nucleation'],
  params: {
    intensity: { name: 'intensity', type: 'number', min: 0.1, max: 3.0, default: 1.5, description: 'Microbubble density multiplier' },
    bubbleRiseSpeed: { name: 'bubbleRiseSpeed', type: 'number', min: 0.05, max: 0.5, default: 0.15, unit: 'm/s', description: 'Stokes buoyancy drift' }
  },
  budget: { particles: 150, shaderCost: 1 },
  anchorsAllowed: ['bulk', 'surface'],
  ledgerInputs: ['rate:CO2'],
  mount(ctx, p) { return { atom: 'fineEffervescenceCloud', instanceId: `eff_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Carbonate + Acid Fizz', description: 'Milky column of rising CO2 microbubbles', params: { intensity: 1.8, bubbleRiseSpeed: 0.2 } },
    { title: 'Gentle Soda Effervescence', description: 'Slow champagne-like microbubble sparkle', params: { intensity: 0.6, bubbleRiseSpeed: 0.1 } }
  ],
  tests: ['fine_effervescence_co2']
};

export const vigorousBoilBubblesAtom: EffectAtom = {
  name: 'vigorousBoilBubbles',
  version: 1,
  category: 'gas',
  summary_en: 'Large vapor bubbles nucleating on hot vessel bottom, growing rapidly, and rolling the surface.',
  useWhen: ['Water or solvent heated past boiling point (T >= 99.5 °C)'],
  avoidWhen: ['Room temperature chemical gas generation'],
  params: {
    boilStage: { name: 'boilStage', type: 'select', default: 'rolling', options: ['onset', 'active', 'rolling'], description: 'Boiling intensity' },
    heatPower_W: { name: 'heatPower_W', type: 'number', min: 50.0, max: 1000.0, default: 500.0, unit: 'W', description: 'Burner heating power' }
  },
  budget: { particles: 100, shaderCost: 2 },
  anchorsAllowed: ['bottom', 'surface', 'bulk'],
  mount(ctx, p) { return { atom: 'vigorousBoilBubbles', instanceId: `boil_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Rolling Boil', description: 'Violent steam bubbles agitating meniscus', params: { boilStage: 'rolling', heatPower_W: 650.0 } },
    { title: 'Simmering Onset', description: 'Moderate steam bubbles rising steadily', params: { boilStage: 'active', heatPower_W: 250.0 } }
  ],
  tests: ['vigorous_boiling_thermodynamics']
};

export const bumpingSurgeAtom: EffectAtom = {
  name: 'bumpingSurge',
  version: 1,
  category: 'gas',
  summary_en: 'Sudden explosive vapor surge from superheated liquid without boiling chips, lifting the liquid.',
  useWhen: ['Superheating liquid in smooth test tube without boiling stones'],
  avoidWhen: ['Well-stirred or boiling-stone mitigated heating'],
  params: {
    surgeVolume_ml: { name: 'surgeVolume_ml', type: 'number', min: 1.0, max: 20.0, default: 5.0, unit: 'mL', description: 'Ejected surge volume' },
    hazardLevel: { name: 'hazardLevel', type: 'number', min: 1, max: 3, default: 2, description: 'Thermal shock severity' }
  },
  budget: { particles: 80, shaderCost: 2 },
  anchorsAllowed: ['bottom', 'surface', 'rim'],
  mount(ctx, p) { return { atom: 'bumpingSurge', instanceId: `bump_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Superheated Surge', description: 'Liquid piston erupts upward with bumping thump sound', params: { surgeVolume_ml: 6.0, hazardLevel: 2 } },
    { title: 'Mild Cavitation Bump', description: 'Sudden bubble pop shaking the tube', params: { surgeVolume_ml: 2.0, hazardLevel: 1 } }
  ],
  tests: ['bumping_surge_superheat']
};

export const bubblesClingToSolidAtom: EffectAtom = {
  name: 'bubblesClingToSolid',
  version: 1,
  category: 'gas',
  summary_en: 'H2 or CO2 bubbles adhering to solid reagent surface (Zn, Mg, marble chips), buoying and vibrating it.',
  useWhen: ['Zinc granules or magnesium ribbon in acid', 'Marble chips in hydrochloric acid'],
  avoidWhen: ['Homogeneous liquid reactions without solid reagents'],
  params: {
    solidReagent: { name: 'solidReagent', type: 'string', default: 'Zn(s)', description: 'Solid substrate formula' },
    adherenceFactor: { name: 'adherenceFactor', type: 'number', min: 0.1, max: 1.0, default: 0.7, description: 'Surface tension cling' },
    jitterStrength: { name: 'jitterStrength', type: 'number', min: 0.0, max: 1.0, default: 0.4, description: 'Solid piece vibration' }
  },
  budget: { particles: 50, shaderCost: 1 },
  anchorsAllowed: ['bottom', 'bulk'],
  mount(ctx, p) { return { atom: 'bubblesClingToSolid', instanceId: `cling_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Zinc Granule H2 Cloak', description: 'Zinc granules coated with silver bubbles fluttering in acid', params: { solidReagent: 'Zn(s)', adherenceFactor: 0.8, jitterStrength: 0.5 } },
    { title: 'Marble Chips CO2 Raft', description: 'Bubbles clinging to CaCO3 stone fragments', params: { solidReagent: 'CaCO3(s)', adherenceFactor: 0.6, jitterStrength: 0.3 } }
  ],
  tests: ['bubbles_cling_to_solid']
};

export const solidFlotationByGasAtom: EffectAtom = {
  name: 'solidFlotationByGas',
  version: 1,
  category: 'gas',
  summary_en: 'Light solids or metal turnings buoyed upward by attached gas bubbles, floating to surface then sinking.',
  useWhen: ['Magnesium ribbon or fine carbonate turnings buoyed by evolving gas bubbles'],
  avoidWhen: ['Heavy dense lead shot or iron nails'],
  params: {
    flotationThreshold: { name: 'flotationThreshold', type: 'number', min: 0.1, max: 0.9, default: 0.4, description: 'Gas volume ratio needed to float' },
    oscillationCycle_s: { name: 'oscillationCycle_s', type: 'number', min: 1.0, max: 10.0, default: 3.5, unit: 's', description: 'Rise and sink period' }
  },
  budget: { particles: 30, shaderCost: 1 },
  anchorsAllowed: ['bulk', 'surface', 'bottom'],
  mount(ctx, p) { return { atom: 'solidFlotationByGas', instanceId: `flot_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Dancing Mg Ribbon', description: 'Magnesium strip lifted by H2 bubbles, burps at surface, sinks', params: { flotationThreshold: 0.35, oscillationCycle_s: 3.0 } },
    { title: 'Mothball Gas Elevator', description: 'Carbonate solid bobbing up and down powered by CO2', params: { flotationThreshold: 0.50, oscillationCycle_s: 4.5 } }
  ],
  tests: ['solid_gas_flotation']
};

export const foamHeadAtom: EffectAtom = {
  name: 'foamHead',
  version: 1,
  category: 'gas',
  summary_en: 'Stable cellular bubble foam layer with Plateau borders forming on top of liquid and slowly draining.',
  useWhen: ['Carbonate + acid in detergent', 'Yeast + H2O2 enzyme foam', 'Beer or surfactant effervescence'],
  avoidWhen: ['Pure water where bubbles pop instantaneously at surface'],
  params: {
    foamHeight_mm: { name: 'foamHeight_mm', type: 'number', min: 5.0, max: 100.0, default: 25.0, unit: 'mm', description: 'Foam layer thickness' },
    drainageTime_s: { name: 'drainageTime_s', type: 'number', min: 5.0, max: 120.0, default: 45.0, unit: 's', description: 'Foam collapse time' },
    bubbleDiameter_mm: { name: 'bubbleDiameter_mm', type: 'number', min: 0.5, max: 5.0, default: 2.0, unit: 'mm', description: 'Cell diameter' }
  },
  budget: { particles: 80, shaderCost: 2 },
  anchorsAllowed: ['surface', 'rim'],
  ledgerInputs: ['foam_ml'],
  mount(ctx, p) { return { atom: 'foamHead', instanceId: `foam_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Acid-Carbonate Soap Foam', description: 'White cellular foam head rising 30 mm above liquid', params: { foamHeight_mm: 30.0, drainageTime_s: 60.0, bubbleDiameter_mm: 2.5 } },
    { title: 'Dense Microfoam', description: 'Fine shaving-cream-like microcellular foam', params: { foamHeight_mm: 15.0, drainageTime_s: 90.0, bubbleDiameter_mm: 0.8 } }
  ],
  tests: ['foam_head_plateau_drainage']
};

export const foamClimbRunawayAtom: EffectAtom = {
  name: 'foamClimbRunaway',
  version: 1,
  category: 'gas',
  summary_en: 'Rapid exothermic foam volume expansion extruding out of vessel neck (Elephant Toothpaste).',
  useWhen: ['H2O2 catalytic decomposition with KI/MnO2 + dish soap'],
  avoidWhen: ['Slow steady effervescence'],
  params: {
    riseSpeed_m_s: { name: 'riseSpeed_m_s', type: 'number', min: 0.05, max: 1.0, default: 0.25, unit: 'm/s', description: 'Extrusion velocity' },
    steamDensity: { name: 'steamDensity', type: 'number', min: 0.0, max: 1.0, default: 0.7, description: 'Exothermic steam copiousness' },
    stripeColor: { name: 'stripeColor', type: 'color', default: '#3b82f6', description: 'Food coloring stripe' }
  },
  budget: { particles: 120, shaderCost: 2 },
  anchorsAllowed: ['rim', 'outside'],
  mount(ctx, p) { return { atom: 'foamClimbRunaway', instanceId: `elephant_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Elephant Toothpaste Eruption', description: 'Hot colored foam cylinder erupting from conical flask neck', params: { riseSpeed_m_s: 0.35, steamDensity: 0.85, stripeColor: '#ec4899' } },
    { title: 'Vinegar-Baking Soda Volcano', description: 'Gentle bubbling foam overflowing beaker lip', params: { riseSpeed_m_s: 0.10, steamDensity: 0.10, stripeColor: '#ef4444' } }
  ],
  tests: ['foam_runaway_elephant_toothpaste']
};

export const viscousFoamRopeAtom: EffectAtom = {
  name: 'viscousFoamRope',
  version: 1,
  category: 'gas',
  summary_en: 'Viscous foam extrusion undergoing rope-coil instability when falling or expanding.',
  useWhen: ['Sugar + concentrated H2SO4 carbon foam', 'High-viscosity polymer foaming'],
  avoidWhen: ['Low viscosity watery bubbles'],
  params: {
    viscosity_Pa_s: { name: 'viscosity_Pa_s', type: 'number', min: 1.0, max: 100.0, default: 25.0, unit: 'Pa·s', description: 'Extrudate viscosity' },
    coilingRadius_mm: { name: 'coilingRadius_mm', type: 'number', min: 2.0, max: 20.0, default: 8.0, unit: 'mm', description: 'Rope coil diameter' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['rim', 'bulk'],
  mount(ctx, p) { return { atom: 'viscousFoamRope', instanceId: `vfoam_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Black Carbon Sugar Snake Extrusion', description: 'Steaming porous black carbon column rising from beaker', params: { viscosity_Pa_s: 40.0, coilingRadius_mm: 12.0 } },
    { title: 'Viscous Detergent Rope', description: 'Thick creamy foam folding upon itself', params: { viscosity_Pa_s: 15.0, coilingRadius_mm: 6.0 } }
  ],
  tests: ['viscous_foam_coiling']
};

export const burstAerosolSprayAtom: EffectAtom = {
  name: 'burstAerosolSpray',
  version: 1,
  category: 'gas',
  summary_en: 'Worthington micro-droplet jets and aerosol mist ejected upward by bursting surface bubbles.',
  useWhen: ['Vigorous acid gassing (acid mist hazard)', 'Effervescence splashing micro-droplets above rim'],
  avoidWhen: ['Calm non-gassing liquid'],
  params: {
    sprayHeight_mm: { name: 'sprayHeight_mm', type: 'number', min: 5.0, max: 60.0, default: 25.0, unit: 'mm', description: 'Ejection height' },
    corrosiveWarning: { name: 'corrosiveWarning', type: 'boolean', default: false, description: 'Corrosive aerosol hazard flag' }
  },
  budget: { particles: 70, shaderCost: 1 },
  anchorsAllowed: ['surface', 'rim'],
  mount(ctx, p) { return { atom: 'burstAerosolSpray', instanceId: `spray_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Acid Mist Ejection', description: 'Hazardous fine droplets projected above acid-metal reaction', params: { sprayHeight_mm: 35.0, corrosiveWarning: true } },
    { title: 'Champagne Droplet Spatter', description: 'Delicate fountain of bursting aerosol droplets', params: { sprayHeight_mm: 15.0, corrosiveWarning: false } }
  ],
  tests: ['burst_aerosol_worthington_droplets']
};

export const gasBalloonInflateAtom: EffectAtom = {
  name: 'gasBalloonInflate',
  version: 1,
  category: 'gas',
  summary_en: 'Rubber balloon mounted on flask neck stretching and inflating proportionally to evolved gas moles nRT/P.',
  useWhen: ['Gas generation demonstration in flask sealed with balloon (e.g. Zn + HCl)'],
  avoidWhen: ['Open beakers without neck attachments'],
  params: {
    balloonRadius_cm: { name: 'balloonRadius_cm', type: 'number', min: 2.0, max: 20.0, default: 8.0, unit: 'cm', description: 'Inflated sphere radius' },
    balloonColor: { name: 'balloonColor', type: 'color', default: '#ef4444', description: 'Latex balloon color' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['rim'],
  ledgerInputs: ['amount:product'],
  mount(ctx, p) { return { atom: 'gasBalloonInflate', instanceId: `bal_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Hydrogen Balloon Expansion', description: 'Red balloon expanding rapidly above Zn + HCl flask', params: { balloonRadius_cm: 10.0, balloonColor: '#ef4444' } },
    { title: 'Carbon Dioxide Gentle Fill', description: 'Yellow balloon slowly swelling with CO2', params: { balloonRadius_cm: 6.0, balloonColor: '#eab308' } }
  ],
  tests: ['balloon_inflation_ideal_gas']
};

export const gasSyringeCollectAtom: EffectAtom = {
  name: 'gasSyringeCollect',
  version: 1,
  category: 'gas',
  summary_en: 'Graduated gas syringe plunger pushed outward smoothly by gas evolution, measuring quantitative volume.',
  useWhen: ['Quantitative reaction kinetics measurement (volume vs time)'],
  avoidWhen: ['Open open-air reactions'],
  params: {
    plungerDisplacement_ml: { name: 'plungerDisplacement_ml', type: 'number', min: 0.0, max: 100.0, default: 45.0, unit: 'mL', description: 'Gas syringe reading' },
    frictionDrag: { name: 'frictionDrag', type: 'number', min: 0.01, max: 0.2, default: 0.05, description: 'Barrel friction' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['outside'],
  ledgerInputs: ['amount:product'],
  mount(ctx, p) { return { atom: 'gasSyringeCollect', instanceId: `syr_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Gas Syringe Kinetics', description: 'Plunger displaced smoothly from 0 to 50 mL during CaCO3 + HCl', params: { plungerDisplacement_ml: 50.0, frictionDrag: 0.05 } },
    { title: 'Slow Decomposition Measurement', description: 'Syringe collecting O2 from H2O2 + MnO2', params: { plungerDisplacement_ml: 30.0, frictionDrag: 0.08 } }
  ],
  tests: ['gas_syringe_quantitative_volume']
};

export const pneumaticTroughCollectionAtom: EffectAtom = {
  name: 'pneumaticTroughCollection',
  version: 1,
  category: 'gas',
  summary_en: 'Water displacement in inverted graduated cylinder over water trough collecting insoluble gas.',
  useWhen: ['Collecting O2 or H2 over water trough (downward displacement of water)'],
  avoidWhen: ['Highly soluble gases (NH3, HCl, SO2) which dissolve rather than collect'],
  params: {
    displacedWater_ml: { name: 'displacedWater_ml', type: 'number', min: 0.0, max: 250.0, default: 120.0, unit: 'mL', description: 'Collected gas volume' },
    gasBubblesPerSecond: { name: 'gasBubblesPerSecond', type: 'number', min: 1.0, max: 20.0, default: 6.0, description: 'Bubble arrival rate' }
  },
  budget: { particles: 40, shaderCost: 1 },
  anchorsAllowed: ['bulk', 'outside'],
  mount(ctx, p) { return { atom: 'pneumaticTroughCollection', instanceId: `pneu_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Oxygen Collection Over Water', description: 'Water level depressed as O2 bubbles collect in cylinder', params: { displacedWater_ml: 150.0, gasBubblesPerSecond: 8.0 } },
    { title: 'Hydrogen Upward Collection', description: 'Inverted tube filled with hydrogen gas', params: { displacedWater_ml: 80.0, gasBubblesPerSecond: 12.0 } }
  ],
  tests: ['pneumatic_trough_displacement']
};

export const gasJarFillByDisplacementAtom: EffectAtom = {
  name: 'gasJarFillByDisplacement',
  version: 1,
  category: 'gas',
  summary_en: 'Heavy gas filling a gas jar from bottom upward, creating a visible or invisible rising fill-line.',
  useWhen: ['Collecting Cl2, CO2, or NO2 by downward displacement of air'],
  avoidWhen: ['Lighter-than-air gases (H2, NH3)'],
  params: {
    fillFraction: { name: 'fillFraction', type: 'number', min: 0.0, max: 1.0, default: 0.85, description: 'Fraction of jar filled' },
    gasColor: { name: 'gasColor', type: 'color', default: '#d9f99d', description: 'Gas tint (e.g. yellow-green Cl2)' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bottom', 'headspace'],
  mount(ctx, p) { return { atom: 'gasJarFillByDisplacement', instanceId: `jar_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Chlorine Jar Filling', description: 'Yellow-green heavy Cl2 filling gas jar from base', params: { fillFraction: 0.9, gasColor: '#c6d84a' } },
    { title: 'Carbon Dioxide Air Displacement', description: 'Invisible heavy CO2 filling jar, proven by extinguishing flame', params: { fillFraction: 0.75, gasColor: '#ffffff' } }
  ],
  tests: ['gas_jar_downward_displacement']
};

export const splintTestSetAtom: EffectAtom = {
  name: 'splintTestSet',
  version: 1,
  category: 'gas',
  summary_en: 'Wooden splint test: glowing splint relights (O2), burning splint pops (H2), or extinguishes (CO2/N2).',
  useWhen: ['Testing headspace of test tube with wooden splint probe'],
  avoidWhen: ['Liquid without gas in headspace'],
  params: {
    splintState: { name: 'splintState', type: 'select', default: 'relight', options: ['relight', 'squeaky_pop', 'extinguish'], description: 'Outcome' },
    flashIntensity: { name: 'flashIntensity', type: 'number', min: 0.5, max: 3.0, default: 1.8, description: 'Flame brighten/pop flash' }
  },
  budget: { particles: 30, shaderCost: 1 },
  anchorsAllowed: ['rim', 'headspace'],
  mount(ctx, p) { return { atom: 'splintTestSet', instanceId: `splint_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Glowing Splint Relights (O2)', description: 'Dull red ember bursts into bright yellow flame in oxygen', params: { splintState: 'relight', flashIntensity: 2.2 } },
    { title: 'Burning Splint Squeaky Pop (H2)', description: 'Burning splint ignites hydrogen with sharp pop', params: { splintState: 'squeaky_pop', flashIntensity: 2.5 } }
  ],
  tests: ['splint_test_gas_identification']
};

export const limewaterCloudingAtom: EffectAtom = {
  name: 'limewaterClouding',
  version: 1,
  category: 'gas',
  summary_en: 'Two-stage limewater test: Ca(OH)2 turns milky with CO2, then clears again with excess CO2 as Ca(HCO3)2.',
  useWhen: ['Bubbling CO2 gas through clear calcium hydroxide solution'],
  avoidWhen: ['Non-carbonate gases like H2 or O2'],
  params: {
    stage: { name: 'stage', type: 'select', default: 'milky', options: ['clear_initial', 'milky', 'cleared_excess'], description: 'Reaction stage' },
    turbidityLevel: { name: 'turbidityLevel', type: 'number', min: 0.0, max: 1.0, default: 0.85, description: 'Milkiness' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'limewaterClouding', instanceId: `lime_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Limewater Turns Milky', description: 'Fine white CaCO3 cloudiness upon CO2 delivery', params: { stage: 'milky', turbidityLevel: 0.9 } },
    { title: 'Limewater Clears with Excess CO2', description: 'Solution turns completely transparent as Ca(HCO3)2 forms', params: { stage: 'cleared_excess', turbidityLevel: 0.05 } }
  ],
  tests: ['limewater_two_stage_turbidity']
};

export const indicatorPaperTestsAtom: EffectAtom = {
  name: 'indicatorPaperTests',
  version: 1,
  category: 'gas',
  summary_en: 'Damp test paper changing color in gas mouth: litmus (red/blue), starch-iodide (blue-black), lead acetate (black).',
  useWhen: ['Holding damp test paper strip over flask neck to detect gas'],
  avoidWhen: ['No vapor evolution'],
  params: {
    paperType: { name: 'paperType', type: 'select', default: 'red_litmus_to_blue', options: ['red_litmus_to_blue', 'blue_litmus_to_red', 'starch_iodide_blue_black', 'lead_acetate_black'], description: 'Paper chemical' },
    exposureTime_s: { name: 'exposureTime_s', type: 'number', min: 0.5, max: 10.0, default: 2.0, unit: 's', description: 'Reaction time' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['rim'],
  mount(ctx, p) { return { atom: 'indicatorPaperTests', instanceId: `paper_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Ammonia Litmus Test', description: 'Damp red litmus paper turns royal blue in NH3 gas', params: { paperType: 'red_litmus_to_blue', exposureTime_s: 1.5 } },
    { title: 'Hydrogen Sulfide Lead Acetate Test', description: 'White lead acetate paper blackens instantly in H2S', params: { paperType: 'lead_acetate_black', exposureTime_s: 1.0 } }
  ],
  tests: ['indicator_paper_gas_tests']
};

export const gasDissolutionHenryAtom: EffectAtom = {
  name: 'gasDissolutionHenry',
  version: 1,
  category: 'gas',
  summary_en: 'Gas dissolving into liquid according to Henry law; bubbling suppressed until supersaturated or heated.',
  useWhen: ['Dissolving NH3, HCl, or SO2 into cold water; soda degassing on warming'],
  avoidWhen: ['Insoluble gases like H2 or N2'],
  params: {
    henryConstant_mol_L_atm: { name: 'henryConstant_mol_L_atm', type: 'number', min: 0.01, max: 50.0, default: 0.034, description: 'Solubility constant kH' },
    temperature_c: { name: 'temperature_c', type: 'number', min: 5.0, max: 95.0, default: 25.0, unit: '°C', description: 'Liquid temperature' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk', 'surface'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'gasDissolutionHenry', instanceId: `henry_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Cold Water Dissolves CO2', description: 'Bubbling suppressed in cold water until saturated', params: { henryConstant_mol_L_atm: 0.045, temperature_c: 10.0 } },
    { title: 'Warm Water Degassing', description: 'Fine bubbles erupt as temperature rises and gas solubility drops', params: { henryConstant_mol_L_atm: 0.015, temperature_c: 65.0 } }
  ],
  tests: ['henrys_law_gas_solubility']
};

export const suckBackReverseFlowAtom: EffectAtom = {
  name: 'suckBackReverseFlow',
  version: 1,
  category: 'gas',
  summary_en: 'Cooling gas flask creates vacuum sucking cold water back through delivery tube, risking thermal shock shatter.',
  useWhen: ['Turning off burner while gas delivery tube remains submerged in water bath'],
  avoidWhen: ['Open vessels without delivery tubes'],
  params: {
    reverseFlowRate_ml_s: { name: 'reverseFlowRate_ml_s', type: 'number', min: 1.0, max: 20.0, default: 8.0, unit: 'mL/s', description: 'Suckback speed' },
    thermalShockRisk: { name: 'thermalShockRisk', type: 'boolean', default: true, description: 'Glass crack hazard' }
  },
  budget: { particles: 30, shaderCost: 1 },
  anchorsAllowed: ['outside', 'rim'],
  mount(ctx, p) { return { atom: 'suckBackReverseFlow', instanceId: `suck_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Suck-back Hazard', description: 'Cold water column surges backwards into hot test tube', params: { reverseFlowRate_ml_s: 10.0, thermalShockRisk: true } },
    { title: 'Safety Trap Intervention', description: 'Suckback captured by empty safety bottle trap', params: { reverseFlowRate_ml_s: 5.0, thermalShockRisk: false } }
  ],
  tests: ['suck_back_thermal_shock']
};

export const pressureBuildupAtom: EffectAtom = {
  name: 'pressureBuildup',
  version: 1,
  category: 'gas',
  summary_en: 'Gas accumulation in sealed vessel building pressure P=nRT/V, causing stopper bulge, hiss, or burst > 2.5 atm.',
  useWhen: ['Reaction generating gas in a sealed stoppered flask'],
  avoidWhen: ['Open beakers'],
  params: {
    headspacePressure_atm: { name: 'headspacePressure_atm', type: 'number', min: 1.0, max: 5.0, default: 1.8, unit: 'atm', description: 'Internal pressure' },
    burstThreshold_atm: { name: 'burstThreshold_atm', type: 'number', min: 2.0, max: 4.0, default: 2.5, unit: 'atm', description: 'Safety threshold' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['rim', 'headspace'],
  ledgerInputs: ['pressure'],
  mount(ctx, p) { return { atom: 'pressureBuildup', instanceId: `press_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Stopper Pop Under Pressure', description: 'Rubber stopper shoots off with loud pop at 1.8 atm', params: { headspacePressure_atm: 1.8, burstThreshold_atm: 2.5 } },
    { title: 'Glass Overpressure Hazard', description: 'Sealed vessel exceeding 2.5 atm with glass stress warning', params: { headspacePressure_atm: 2.8, burstThreshold_atm: 2.5 } }
  ],
  tests: ['sealed_pressure_buildup']
};

// Legacy backwards-compatible atoms
export const nucleateBubblesAtom: EffectAtom = {
  name: 'nucleateBubbles',
  version: 1,
  category: 'gas',
  summary_en: 'Chains of discrete bubbles rising from vessel wall scratches.',
  useWhen: ['Gas generation in liquid'],
  avoidWhen: ['Non-gas reactions'],
  params: {
    bubbleRate: { name: 'bubbleRate', type: 'number', min: 1.0, max: 40.0, default: 10.0, description: 'Bubbles per second' }
  },
  budget: { particles: 50, shaderCost: 1 },
  anchorsAllowed: ['bottom', 'bulk'],
  mount(ctx, p) { return { atom: 'nucleateBubbles', instanceId: `nb_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Standard Bubbles', description: 'Steady bubble streams', params: { bubbleRate: 12.0 } },
    { title: 'Vigorous Fizz', description: 'Fast bubble generation', params: { bubbleRate: 35.0 } }
  ],
  tests: ['nucleate_bubbles_legacy']
};

export const effervescenceBurstAtom: EffectAtom = {
  name: 'effervescenceBurst',
  version: 1,
  category: 'gas',
  summary_en: 'Dense cloud of fine fizzing micro-bubbles.',
  useWhen: ['Rapid effervescence'],
  avoidWhen: ['Slow reactions'],
  params: {
    intensity: { name: 'intensity', type: 'number', min: 0.1, max: 3.0, default: 1.5, description: 'Intensity multiplier' }
  },
  budget: { particles: 120, shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'effervescenceBurst', instanceId: `eb_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Intense Effervescence', description: 'Dense micro-bubbles throughout liquid', params: { intensity: 2.0 } },
    { title: 'Mild Fizz', description: 'Gentle bubbling', params: { intensity: 0.8 } }
  ],
  tests: ['effervescence_burst_legacy']
};

export const buoyantGasPlumeAtom: EffectAtom = {
  name: 'buoyantGasPlume',
  version: 1,
  category: 'gas',
  summary_en: 'Hot lighter-than-air vapor plume rising upward into air.',
  useWhen: ['Hot steam or light gas rising'],
  avoidWhen: ['Dense heavy gas sinking'],
  params: {
    plumeSpeed: { name: 'plumeSpeed', type: 'number', min: 0.1, max: 2.0, default: 0.6, description: 'Rise speed' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['rim'],
  mount(ctx, p) { return { atom: 'buoyantGasPlume', instanceId: `bgp_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Rising Warm Plume', description: 'Vapor curling upward', params: { plumeSpeed: 0.8 } },
    { title: 'Gentle Drift', description: 'Slow rising wisp', params: { plumeSpeed: 0.3 } }
  ],
  tests: ['buoyant_gas_plume_legacy']
};

export const heavyVaporPourAtom: EffectAtom = {
  name: 'heavyVaporPour',
  version: 1,
  category: 'gas',
  summary_en: 'Dense cold or heavy vapor spilling over vessel lip and hugging workbench.',
  useWhen: ['Dry ice sublimation, CO2 pouring, Cl2, Br2 vapors'],
  avoidWhen: ['Lighter-than-air rising gases'],
  params: {
    pourRate: { name: 'pourRate', type: 'number', min: 0.2, max: 3.0, default: 1.2, description: 'Spill rate' }
  },
  budget: { particles: 80, shaderCost: 2 },
  anchorsAllowed: ['rim', 'outside'],
  mount(ctx, p) { return { atom: 'heavyVaporPour', instanceId: `hvp_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Heavy Fog Spill', description: 'Dry ice fog cascading over beaker rim', params: { pourRate: 1.5 } },
    { title: 'Subtle Dense Vapor', description: 'Thin heavy gas creep along table', params: { pourRate: 0.5 } }
  ],
  tests: ['heavy_vapor_pour_legacy']
};

export const headspaceFogAtom: EffectAtom = {
  name: 'headspaceFog',
  version: 1,
  category: 'gas',
  summary_en: 'Haze or vapor gathering in vessel neck and headspace above liquid.',
  useWhen: ['Fuming acids or warming solvents'],
  avoidWhen: ['Completely full vessels'],
  params: {
    opacity: { name: 'opacity', type: 'number', min: 0.1, max: 1.0, default: 0.5, description: 'Fog opacity' }
  },
  budget: { particles: 40, shaderCost: 1 },
  anchorsAllowed: ['headspace'],
  mount(ctx, p) { return { atom: 'headspaceFog', instanceId: `hsf_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Acid Headspace Fume', description: 'White misty aerosol inside neck', params: { opacity: 0.6 } },
    { title: 'Faint Headspace Haze', description: 'Thin vapor collecting under stopper', params: { opacity: 0.25 } }
  ],
  tests: ['headspace_fog_legacy']
};
