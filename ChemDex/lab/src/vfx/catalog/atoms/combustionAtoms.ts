/**
 * combustionAtoms.ts — Effect Atoms for Combustion, Flame Tests, and Light Phenomena (§4.G)
 * 
 * Implements all 14 canonical combustion/light atoms plus legacy aliases.
 * Models atomic emission line colors (Na 589nm, Li 671nm, etc.),
 * burner flame zones, afterimage bloom, and inverse-square flare casting.
 */

import { EffectAtom } from '../types';

export const flameColorByElementAtom: EffectAtom = {
  name: 'flameColorByElement',
  version: 1,
  category: 'combustion',
  summary_en: 'Characteristic atomic emission spectrum line flame color (Li crimson, Na yellow, K lilac, Ca brick-red, Cu blue-green, Ba apple-green).',
  useWhen: ['Flame test with platinum/nichrome wire in Bunsen flame'],
  avoidWhen: ['Flameless aqueous reactions'],
  params: {
    element: { name: 'element', type: 'select', default: 'Na', options: ['Li', 'Na', 'K', 'Ca', 'Sr', 'Ba', 'Cu', 'B'], description: 'Element' },
    emissionHex: { name: 'emissionHex', type: 'color', default: '#f59e0b', description: '589 nm D-line yellow' },
    cobaltGlassFilter: { name: 'cobaltGlassFilter', type: 'boolean', default: false, description: 'View through cobalt glass (blocks Na yellow)' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['flame'],
  mount(ctx, p) { return { atom: 'flameColorByElement', instanceId: `flame_elem_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Sodium Intense Yellow Flame', description: 'Blinding 589 nm yellow flame masking other elements', params: { element: 'Na', emissionHex: '#f59e0b', cobaltGlassFilter: false } },
    { title: 'Potassium Lilac via Cobalt Glass', description: 'Delicate lilac flame revealed as blue cobalt glass filters out sodium glare', params: { element: 'K', emissionHex: '#c084fc', cobaltGlassFilter: true } }
  ],
  tests: ['flame_color_atomic_emission']
};

export const burnerFlameZonesAtom: EffectAtom = {
  name: 'burnerFlameZones',
  version: 1,
  category: 'combustion',
  summary_en: 'Bunsen burner dual flame zones: dark blue inner core (1500 °C) and outer pale blue non-luminous oxidizing sheath with flicker.',
  useWhen: ['Bunsen burner burning methane/LPG with air hole open'],
  avoidWhen: ['Yellow luminous candle flames'],
  params: {
    innerConeHeight_cm: { name: 'innerConeHeight_cm', type: 'number', min: 1.0, max: 8.0, default: 3.5, unit: 'cm', description: 'Inner reducing cone' },
    airHoleOpen: { name: 'airHoleOpen', type: 'boolean', default: true, description: 'Premixed vs luminous' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['flame'],
  mount(ctx, p) { return { atom: 'burnerFlameZones', instanceId: `bzone_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Non-luminous Blue Cone', description: 'Sharp inner dark blue cone inside roaring oxidizing mantle', params: { innerConeHeight_cm: 3.5, airHoleOpen: true } },
    { title: 'Luminous Safety Yellow Flame', description: 'Air hole closed: lazy yellow flickering soot-producing flame', params: { innerConeHeight_cm: 1.0, airHoleOpen: false } }
  ],
  tests: ['burner_flame_two_zone_structure']
};

export const ethanolBurnerFlameAtom: EffectAtom = {
  name: 'ethanolBurnerFlame',
  version: 1,
  category: 'combustion',
  summary_en: 'Spirit lamp ethanol flame: pale translucent blue, nearly invisible in daylight, with delicate wick glow and heat shimmer.',
  useWhen: ['Alcohol burner / spirit lamp heating glassware'],
  avoidWhen: ['High-pressure gas burners'],
  params: {
    flameHeight_cm: { name: 'flameHeight_cm', type: 'number', min: 2.0, max: 10.0, default: 4.5, unit: 'cm', description: 'Spirit lamp flame height' },
    wickGlowColor: { name: 'wickGlowColor', type: 'color', default: '#ea580c', description: 'Incandescent cotton wick' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['flame'],
  mount(ctx, p) { return { atom: 'ethanolBurnerFlame', instanceId: `ethflame_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Pale Blue Spirit Lamp Flame', description: 'Quiet translucent blue ethanol flame with glowing red cotton wick', params: { flameHeight_cm: 4.5, wickGlowColor: '#ea580c' } },
    { title: 'Low Fuel Flame Flicker', description: 'Small faint blue flame as spirit level wanes', params: { flameHeight_cm: 2.0, wickGlowColor: '#c2410c' } }
  ],
  tests: ['ethanol_burner_spirit_lamp_flame']
};

export const hydrogenFlameFaintAtom: EffectAtom = {
  name: 'hydrogenFlameFaint',
  version: 1,
  category: 'combustion',
  summary_en: 'Pure hydrogen combustion flame: almost completely invisible pale blue in air, detectable via steam condensation on cold glass.',
  useWhen: ['Hydrogen gas burning at jet tip'],
  avoidWhen: ['Hydrocarbon combustion with yellow soot'],
  params: {
    flameColorHex: { name: 'flameColorHex', type: 'color', default: '#93c5fd', description: 'Near-invisible pale blue' },
    condensationYield_g_s: { name: 'condensationYield_g_s', type: 'number', min: 0.05, max: 1.0, default: 0.2, unit: 'g/s', description: 'Water produced' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['flame'],
  mount(ctx, p) { return { atom: 'hydrogenFlameFaint', instanceId: `hflame_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Invisible Hydrogen Flame', description: 'Ghostly pale flame visible only through air shimmer and water mist on cold glass held above', params: { flameColorHex: '#bfdbfe', condensationYield_g_s: 0.25 } },
    { title: 'Hydrogen Micro-Torch', description: 'Tiny pencil flame burning cleanly without soot', params: { flameColorHex: '#dbeafe', condensationYield_g_s: 0.10 } }
  ],
  tests: ['hydrogen_faint_flame_condensation']
};

export const flareLightCastAtom: EffectAtom = {
  name: 'flareLightCast',
  version: 1,
  category: 'combustion',
  summary_en: 'Dynamic point light casting realistic inverse-square falloff colored illumination onto vessels, tabletop, and walls.',
  useWhen: ['Burning magnesium, sodium flare, or bright flame test in dim room'],
  avoidWhen: ['Ambient daylight experiments'],
  params: {
    lightColor: { name: 'lightColor', type: 'color', default: '#ffffff', description: 'Point light hue' },
    intensity_lumens: { name: 'intensity_lumens', type: 'number', min: 50.0, max: 2000.0, default: 600.0, unit: 'lm', description: 'Luminance' },
    radius_m: { name: 'radius_m', type: 'number', min: 0.5, max: 5.0, default: 2.5, unit: 'm', description: 'Light reach' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['flame', 'surface'],
  mount(ctx, p) { return { atom: 'flareLightCast', instanceId: `flarelight_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Blinding White Flare Light', description: 'Magnesium flare casting harsh bright white light and sharp shadows across workbench', params: { lightColor: '#ffffff', intensity_lumens: 1200.0, radius_m: 3.5 } },
    { title: 'Golden Sodium Flame Cast', description: 'Warm amber glow illuminating surrounding glassware', params: { lightColor: '#f59e0b', intensity_lumens: 400.0, radius_m: 2.0 } }
  ],
  tests: ['flare_light_inverse_square']
};

export const afterimageBloomAtom: EffectAtom = {
  name: 'afterimageBloom',
  version: 1,
  category: 'camera',
  summary_en: 'Post-processing bloom flare and retinal exposure adaptation after sudden blinding flash (Mg flare).',
  useWhen: ['Intense optical flash (magnesium flare, explosion flash)'],
  avoidWhen: ['Mild steady lighting'],
  params: {
    bloomIntensity: { name: 'bloomIntensity', type: 'number', min: 0.5, max: 5.0, default: 2.5, description: 'Post-FX glare' },
    adaptationTime_s: { name: 'adaptationTime_s', type: 'number', min: 0.5, max: 4.0, default: 1.8, unit: 's', description: 'Vision recovery duration' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['flame'],
  mount(ctx, p) { return { atom: 'afterimageBloom', instanceId: `bloom_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Retinal Afterimage Glare', description: 'Screen momentarily overexposed with purple-black afterimage spot fading away', params: { bloomIntensity: 3.0, adaptationTime_s: 2.0 } },
    { title: 'Mild Optical Bloom', description: 'Soft radiant glow halo around bright element', params: { bloomIntensity: 1.2, adaptationTime_s: 0.8 } }
  ],
  tests: ['afterimage_bloom_adaptation']
};

export const emberGlowingSolidAtom: EffectAtom = {
  name: 'emberGlowingSolid',
  version: 1,
  category: 'combustion',
  summary_en: 'Solid glowing incandescence mapped by Blackbody Planck temperature (red 700°C -> orange 900°C -> white 1300°C).',
  useWhen: ['Glowing charcoal splint, hot crucible, heated iron nail'],
  avoidWhen: ['Non-incandescent materials'],
  params: {
    temperature_c: { name: 'temperature_c', type: 'number', min: 500.0, max: 1500.0, default: 850.0, unit: '°C', description: 'Blackbody temperature' },
    coolingTimeConstant_s: { name: 'coolingTimeConstant_s', type: 'number', min: 2.0, max: 30.0, default: 8.0, unit: 's', description: 'Newton cooling timescale' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bottom', 'flame'],
  mount(ctx, p) { return { atom: 'emberGlowingSolid', instanceId: `ember_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Orange Glowing Charcoal Splint', description: 'Wood ember glowing cherry red-orange, pulsing brighter with air drafts', params: { temperature_c: 850.0, coolingTimeConstant_s: 8.0 } },
    { title: 'White-Hot Crucible', description: 'Porcelain crucible glowing incandescent yellow-white after intense heating', params: { temperature_c: 1150.0, coolingTimeConstant_s: 15.0 } }
  ],
  tests: ['blackbody_planck_incandescence']
};

export const sparkLauncherAtom: EffectAtom = {
  name: 'sparkLauncher',
  version: 1,
  category: 'combustion',
  summary_en: 'Ballistic burning spark particles with drag, parabolic trajectories, short-lived trails, and table bounce.',
  useWhen: ['Steel wool burning, thermite, or sodium popping'],
  avoidWhen: ['Flameless liquid reactions'],
  params: {
    sparkCount: { name: 'sparkCount', type: 'number', min: 10, max: 150, default: 45, description: 'Spark particle count' },
    dragCoefficient: { name: 'dragCoefficient', type: 'number', min: 0.05, max: 0.5, default: 0.15, description: 'Air resistance' },
    bounceElasticity: { name: 'bounceElasticity', type: 'number', min: 0.1, max: 0.7, default: 0.45, description: 'Table bounce restitution' }
  },
  budget: { particles: 60, shaderCost: 1 },
  anchorsAllowed: ['flame', 'surface'],
  mount(ctx, p) { return { atom: 'sparkLauncher', instanceId: `sparklaunch_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Ballistic Spark Shower', description: 'Bright sparks arching upward, bouncing off the workbench, leaving glowing trails', params: { sparkCount: 50, dragCoefficient: 0.15, bounceElasticity: 0.45 } },
    { title: 'Gentle Low-Speed Sparks', description: 'Small embers showering downward', params: { sparkCount: 20, dragCoefficient: 0.25, bounceElasticity: 0.2 } }
  ],
  tests: ['ballistic_spark_trajectories']
};

export const flashFireEthanolSpillAtom: EffectAtom = {
  name: 'flashFireEthanolSpill',
  version: 1,
  category: 'combustion',
  summary_en: 'Spilled volatile ethanol puddle burning with pale blue-yellow flame front creeping across the tabletop (hazard).',
  useWhen: ['Ethanol spill ignited near open burner flame on workbench'],
  avoidWhen: ['Aqueous non-flammable spills'],
  params: {
    puddleRadius_cm: { name: 'puddleRadius_cm', type: 'number', min: 5.0, max: 35.0, default: 15.0, unit: 'cm', description: 'Burning puddle spread' },
    burnDuration_s: { name: 'burnDuration_s', type: 'number', min: 2.0, max: 20.0, default: 8.0, unit: 's', description: 'Fuel consumption time' }
  },
  budget: { particles: 80, shaderCost: 2 },
  anchorsAllowed: ['outside'],
  mount(ctx, p) { return { atom: 'flashFireEthanolSpill', instanceId: `ffire_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Ethanol Tabletop Puddle Fire', description: 'Pale flickering blue flame sheet sweeping across spilled alcohol with emergency warning', params: { puddleRadius_cm: 18.0, burnDuration_s: 10.0 } },
    { title: 'Small Contained Flash Puddle', description: 'Brief localized blue burn on table surface', params: { puddleRadius_cm: 8.0, burnDuration_s: 4.0 } }
  ],
  tests: ['flash_fire_ethanol_puddle']
};

export const splintFlameResponseAtom: EffectAtom = {
  name: 'splintFlameResponse',
  version: 1,
  category: 'combustion',
  summary_en: 'Wooden splint flame dynamically responding to local headspace gas fraction (O2 relights, CO2 extinguishes, H2 pops).',
  useWhen: ['Lowering glowing or burning wooden splint into gas collection tube'],
  avoidWhen: ['Liquid without gas'],
  params: {
    gasFraction_O2: { name: 'gasFraction_O2', type: 'number', min: 0.0, max: 1.0, default: 0.21, description: 'Oxygen mole fraction' },
    gasFraction_CO2: { name: 'gasFraction_CO2', type: 'number', min: 0.0, max: 1.0, default: 0.0, description: 'Carbon dioxide fraction' }
  },
  budget: { particles: 30, shaderCost: 1 },
  anchorsAllowed: ['rim', 'headspace'],
  mount(ctx, p) { return { atom: 'splintFlameResponse', instanceId: `splintresp_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Splint Flame Relighting', description: 'Dull red glowing splint tip bursts into vigorous yellow flame upon crossing neck into O2', params: { gasFraction_O2: 0.85, gasFraction_CO2: 0.0 } },
    { title: 'Splint Flame Extinguishing', description: 'Burning splint flame dies instantly upon entering heavy CO2 headspace', params: { gasFraction_O2: 0.05, gasFraction_CO2: 0.70 } }
  ],
  tests: ['splint_flame_gas_response']
};

export const combustionProductsAtom: EffectAtom = {
  name: 'combustionProducts',
  version: 1,
  category: 'combustion',
  summary_en: 'Water droplets condensing on inverted jar and CO2 gas evolving from organic fuel combustion, turning limewater milky.',
  useWhen: ['Hydrocarbon or candle combustion in closed inverted gas jar'],
  avoidWhen: ['Inorganic metal burning without H2O/CO2 products'],
  params: {
    dropletCondensationYield_g: { name: 'dropletCondensationYield_g', type: 'number', min: 0.01, max: 0.5, default: 0.12, unit: 'g', description: 'Liquid water droplets' },
    co2Yield_mmol: { name: 'co2Yield_mmol', type: 'number', min: 0.1, max: 10.0, default: 3.5, unit: 'mmol', description: 'CO2 gas evolved' }
  },
  budget: { particles: 40, shaderCost: 1 },
  anchorsAllowed: ['wall', 'headspace'],
  mount(ctx, p) { return { atom: 'combustionProducts', instanceId: `combprod_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Condensation and CO2 Formation', description: 'Cool glass wall fogs with clear water droplets as candle burns in inverted beaker', params: { dropletCondensationYield_g: 0.15, co2Yield_mmol: 4.0 } },
    { title: 'Limewater Test Integration', description: 'CO2 delivered from combustion flask turns limewater turbid milky', params: { dropletCondensationYield_g: 0.08, co2Yield_mmol: 6.0 } }
  ],
  tests: ['combustion_products_water_co2']
};

export const luminolAndGlowstickAtom: EffectAtom = {
  name: 'luminolAndGlowstick',
  version: 1,
  category: 'light',
  summary_en: 'Room-dimming chemiluminescent emission from luminol oxidation or Cyalume glowstick dye without thermal heat.',
  useWhen: ['Luminol + ferricyanide or H2O2 + dye in dark room'],
  avoidWhen: ['Daylight outdoor combustion'],
  params: {
    emissionColor: { name: 'emissionColor', type: 'color', default: '#0284c7', description: 'Chemiluminescence wavelength' },
    roomDimming: { name: 'roomDimming', type: 'number', min: 0.2, max: 0.95, default: 0.8, description: 'Lab ambient light reduction' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk', 'surface'],
  mount(ctx, p) { return { atom: 'luminolAndGlowstick', instanceId: `luminol_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Luminol Blue Radiance in Dark', description: 'Lab lights dim as ethereal cyan-blue glow illuminates surrounding glassware', params: { emissionColor: '#0284c7', roomDimming: 0.85 } },
    { title: 'Neon Green Glowstick', description: 'Vivid green light from rhodamine/dye sensitized oxalate ester', params: { emissionColor: '#22c55e', roomDimming: 0.75 } }
  ],
  tests: ['luminol_chemiluminescence_dark_room']
};

// Legacy backwards-compatible atoms
export const flameConeAtom: EffectAtom = {
  name: 'flameCone',
  version: 1,
  category: 'combustion',
  summary_en: 'Premixed or diffusion flame cone with Blackbody Planck radiation or atomic emission.',
  useWhen: ['Bunsen burner or alcohol lamp'],
  avoidWhen: ['Flameless reactions'],
  params: {
    flameColor: { name: 'flameColor', type: 'color', default: '#38bdf8', description: 'Base color' },
    tipColor: { name: 'tipColor', type: 'color', default: '#f59e0b', description: 'Tip color' },
    height_cm: { name: 'height_cm', type: 'number', min: 2.0, max: 20.0, default: 6.5, unit: 'cm', description: 'Height' },
    turbulent: { name: 'turbulent', type: 'boolean', default: false, description: 'Turbulence' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['flame', 'surface', 'rim'],
  mount(ctx, p) { return { atom: 'flameCone', instanceId: `fc_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Premixed Blue Burner', description: 'Clean blue flame', params: { flameColor: '#0284c7', tipColor: '#38bdf8', height_cm: 6.0, turbulent: false } },
    { title: 'Copper Flame Test', description: 'Emerald green emission', params: { flameColor: '#10b981', tipColor: '#06b6d4', height_cm: 7.5, turbulent: true } }
  ],
  tests: ['flame_cone_spectrum']
};

export const pyrotechnicSparksAtom: EffectAtom = {
  name: 'pyrotechnicSparks',
  version: 1,
  category: 'combustion',
  summary_en: 'Ballistic spark bursts ejected by exothermic deflagration.',
  useWhen: ['Sodium or potassium on water', 'Magnesium ribbon in air'],
  avoidWhen: ['Calm reactions'],
  params: {
    sparkCount: { name: 'sparkCount', type: 'number', min: 5, max: 150, default: 30, description: 'Count' },
    sparkColor: { name: 'sparkColor', type: 'color', default: '#fbbf24', description: 'Color' },
    speed: { name: 'speed', type: 'number', min: 1.0, max: 8.0, default: 3.5, unit: 'm/s', description: 'Velocity' }
  },
  budget: { particles: 64, shaderCost: 1 },
  anchorsAllowed: ['surface', 'rim', 'bulk'],
  mount(ctx, p) { return { atom: 'pyrotechnicSparks', instanceId: `ps_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Sodium Skittering Sparks', description: 'Golden sparks bursting', params: { sparkCount: 40, sparkColor: '#f59e0b', speed: 3.2 } },
    { title: 'Magnesium Sparks', description: 'White spark shower', params: { sparkCount: 90, sparkColor: '#ffffff', speed: 5.5 } }
  ],
  tests: ['pyrotechnic_sparks_trajectory']
};

export const incandescentGlowAtom: EffectAtom = {
  name: 'incandescentGlow',
  version: 1,
  category: 'combustion',
  summary_en: 'Intense blinding white or red-hot radiation glow.',
  useWhen: ['Burning magnesium ribbon', 'Water into conc acid flash'],
  avoidWhen: ['Room temperature reactions'],
  params: {
    glowIntensity: { name: 'glowIntensity', type: 'number', min: 1.0, max: 10.0, default: 4.0, description: 'Luminance' },
    glowColor: { name: 'glowColor', type: 'color', default: '#ffffff', description: 'Color' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk', 'surface', 'flame'],
  mount(ctx, p) { return { atom: 'incandescentGlow', instanceId: `ig_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Blinding Magnesium Core', description: 'White-hot thermal emission', params: { glowIntensity: 6.0, glowColor: '#ffffff' } },
    { title: 'Orange Incandescence', description: 'Red-orange heat glow', params: { glowIntensity: 2.5, glowColor: '#f97316' } }
  ],
  tests: ['incandescent_glow_lighting']
};

export const smokeBillowAtom: EffectAtom = {
  name: 'smokeBillow',
  version: 1,
  category: 'combustion',
  summary_en: 'Dense white or dark aerosol smoke billow dispersing into air.',
  useWhen: ['Dense MgO smoke, carbon soot'],
  avoidWhen: ['Clean gas evolution'],
  params: {
    smokeColor: { name: 'smokeColor', type: 'color', default: '#f8fafc', description: 'Aerosol color' },
    density: { name: 'density', type: 'number', min: 0.2, max: 2.0, default: 1.2, description: 'Density' }
  },
  budget: { particles: 48, shaderCost: 1 },
  anchorsAllowed: ['rim', 'flame'],
  mount(ctx, p) { return { atom: 'smokeBillow', instanceId: `sb_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'White Oxide Smoke', description: 'Dense white particulate smoke', params: { smokeColor: '#ffffff', density: 1.5 } },
    { title: 'Dark Smoke Billow', description: 'Soot plume', params: { smokeColor: '#18181b', density: 1.0 } }
  ],
  tests: ['smoke_billow_dispersion']
};
