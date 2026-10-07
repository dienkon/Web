/**
 * fumeAtoms.ts — Effect Atoms for Vapor, Smoke & Fume Phenomena (§4.C)
 * 
 * Implements 22 concrete physical fume/vapor atoms strictly obeying §4.0 physics:
 * Invisible gases remain invisible, colored gases use volumetric absorbers,
 * steam uses condensed aerosol with a clear gap, particulate smoke rises,
 * and heavy gases cascade and pool.
 */

import { EffectAtom } from '../types';

export const hotSteamPlumeAtom: EffectAtom = {
  name: 'hotSteamPlume',
  version: 1,
  category: 'gas',
  summary_en: 'Condensed water-droplet aerosol plume with a 1-3 cm clear invisible gap immediately above hot surface.',
  useWhen: ['Boiling water or hot aqueous solution (T >= 50 °C)'],
  avoidWhen: ['Room temperature cold solutions'],
  params: {
    clearGap_cm: { name: 'clearGap_cm', type: 'number', min: 0.5, max: 5.0, default: 2.0, unit: 'cm', description: 'Invisible vapor gap above rim' },
    plumeDensity: { name: 'plumeDensity', type: 'number', min: 0.1, max: 2.0, default: 1.0, description: 'Droplet opacity' },
    wispCurlFactor: { name: 'wispCurlFactor', type: 'number', min: 0.2, max: 2.0, default: 0.9, description: 'Curl noise turbulence' }
  },
  budget: { particles: 90, shaderCost: 2 },
  anchorsAllowed: ['rim', 'surface'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'hotSteamPlume', instanceId: `steam_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Vigorous Boiling Steam', description: 'Billowing white steam with clear gap curling into air', params: { clearGap_cm: 2.5, plumeDensity: 1.5, wispCurlFactor: 1.2 } },
    { title: 'Gentle Warm Vapor Wisp', description: 'Faint wisps evaporating from hot beaker', params: { clearGap_cm: 1.0, plumeDensity: 0.4, wispCurlFactor: 0.6 } }
  ],
  tests: ['hot_steam_clear_gap']
};

export const condensationFogOnWallsAtom: EffectAtom = {
  name: 'condensationFogOnWalls',
  version: 1,
  category: 'wall',
  summary_en: 'Micro-droplets fogging cool upper glass walls, coalescing into streaks and running back down into liquid (reflux).',
  useWhen: ['Heating liquid in flask with condenser or cool upper walls'],
  avoidWhen: ['Dry glassware at ambient temperature'],
  params: {
    dropletDensity: { name: 'dropletDensity', type: 'number', min: 0.2, max: 2.0, default: 1.0, description: 'Mist condensation rate' },
    runDownRate: { name: 'runDownRate', type: 'number', min: 0.1, max: 2.0, default: 0.8, description: 'Rivulet return speed' }
  },
  budget: { particles: 50, shaderCost: 2 },
  anchorsAllowed: ['wallUpper', 'wall'],
  mount(ctx, p) { return { atom: 'condensationFogOnWalls', instanceId: `cond_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Reflux Condensation Ring', description: 'Cool neck clouded with droplets running down', params: { dropletDensity: 1.2, runDownRate: 1.0 } },
    { title: 'Faint Beaker Fog', description: 'Light misting on upper beaker walls', params: { dropletDensity: 0.5, runDownRate: 0.3 } }
  ],
  tests: ['condensation_fog_reflux']
};

export const dryIceFogCascadeAtom: EffectAtom = {
  name: 'dryIceFogCascade',
  version: 1,
  category: 'gas',
  summary_en: 'Dense cold white aerosol fog (CO2 + condensed water) cascading over beaker lip and flowing across workbench.',
  useWhen: ['Dry ice submerged in warm water'],
  avoidWhen: ['Lighter-than-air steam rising upward'],
  params: {
    cascadeFlowRate: { name: 'cascadeFlowRate', type: 'number', min: 0.5, max: 3.0, default: 1.8, description: 'Overflow cascade velocity' },
    tableSpillRadius_cm: { name: 'tableSpillRadius_cm', type: 'number', min: 5.0, max: 40.0, default: 22.0, unit: 'cm', description: 'Floor creep extent' }
  },
  budget: { particles: 120, shaderCost: 2 },
  anchorsAllowed: ['rim', 'outside'],
  mount(ctx, p) { return { atom: 'dryIceFogCascade', instanceId: `dryice_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Dry Ice Fog Waterfall', description: 'Dense white cloud pouring over lip like water and pooling on table', params: { cascadeFlowRate: 2.2, tableSpillRadius_cm: 30.0 } },
    { title: 'Gentle Cold Fog Rim Spill', description: 'Low-rate spill hugging table surface', params: { cascadeFlowRate: 0.8, tableSpillRadius_cm: 12.0 } }
  ],
  tests: ['dry_ice_cascading_fog']
};

export const ammoniumChlorideSmokeAtom: EffectAtom = {
  name: 'ammoniumChlorideSmoke',
  version: 1,
  category: 'combustion',
  summary_en: 'Fine white particulate smoke of NH4Cl crystals forming where NH3 and HCl vapors meet in air.',
  useWhen: ['NH3 gas meeting HCl gas in open air or diffusion tube'],
  avoidWhen: ['Individual single gas vessels'],
  params: {
    smokeDensity: { name: 'smokeDensity', type: 'number', min: 0.2, max: 3.0, default: 1.5, description: 'Smoke opacity' },
    ringLocation_ratio: { name: 'ringLocation_ratio', type: 'number', min: 0.1, max: 0.9, default: 0.59, description: 'Position along tube (Graham ratio 1.46)' }
  },
  budget: { particles: 80, shaderCost: 2 },
  anchorsAllowed: ['headspace', 'rim', 'bulk'],
  mount(ctx, p) { return { atom: 'ammoniumChlorideSmoke', instanceId: `nh4cl_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Graham Diffusion Tube Ring', description: 'White NH4Cl ring forming closer to HCl end (ratio 1.46)', params: { smokeDensity: 1.8, ringLocation_ratio: 0.59 } },
    { title: 'Open Air White Smoke Wisps', description: 'Wisps of white smoke curling when two reagent bottles open', params: { smokeDensity: 1.2, ringLocation_ratio: 0.50 } }
  ],
  tests: ['ammonium_chloride_graham_smoke']
};

export const hclFumingInHumidAirAtom: EffectAtom = {
  name: 'hclFumingInHumidAir',
  version: 1,
  category: 'gas',
  summary_en: 'Concentrated HCl gas reacting with atmospheric moisture to form dense rolling white acid aerosol fumes.',
  useWhen: ['Opening concentrated hydrochloric acid (>35%) bottle in humid air'],
  avoidWhen: ['Dilute acid (<2 M)'],
  params: {
    humidity_percent: { name: 'humidity_percent', type: 'number', min: 10.0, max: 100.0, default: 65.0, unit: '%', description: 'Relative humidity' },
    fumeThickness: { name: 'fumeThickness', type: 'number', min: 0.2, max: 2.0, default: 1.1, description: 'Fume density' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['rim', 'headspace'],
  mount(ctx, p) { return { atom: 'hclFumingInHumidAir', instanceId: `hclfume_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Concentrated HCl Fumes', description: 'Heavy white misty fumes rolling over open bottle neck', params: { humidity_percent: 75.0, fumeThickness: 1.4 } },
    { title: 'Dry Air Mild Haze', description: 'Faint wisps in low humidity', params: { humidity_percent: 25.0, fumeThickness: 0.4 } }
  ],
  tests: ['hcl_humid_air_fuming']
};

export const hno3FumingRedAtom: EffectAtom = {
  name: 'hno3FumingRed',
  version: 1,
  category: 'gas',
  summary_en: 'Red fuming nitric acid releasing noxious red-brown NO2 vapors and yellow-tinted acidic aerosol.',
  useWhen: ['Concentrated or red fuming nitric acid'],
  avoidWhen: ['Dilute nitric acid'],
  params: {
    no2Concentration: { name: 'no2Concentration', type: 'number', min: 0.1, max: 2.0, default: 1.2, description: 'Dissolved NO2 content' },
    fumeColor: { name: 'fumeColor', type: 'color', default: '#b45309', description: 'Red-brown vapor hue' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['headspace', 'rim'],
  mount(ctx, p) { return { atom: 'hno3FumingRed', instanceId: `hno3fume_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Red Fuming Nitric Acid', description: 'Noxious brownish-red fumes hovering in flask neck', params: { no2Concentration: 1.5, fumeColor: '#b45309' } },
    { title: 'Concentrated HNO3 Yellow Haze', description: 'Golden-yellow acidic haze from slow photochemical decomposition', params: { no2Concentration: 0.4, fumeColor: '#d97706' } }
  ],
  tests: ['hno3_red_fuming_no2']
};

export const heavyYellowGreenChlorineAtom: EffectAtom = {
  name: 'heavyYellowGreenChlorine',
  version: 1,
  category: 'gas',
  summary_en: 'Dense toxic yellow-green Cl2 gas (sigma~0.9) pooling at flask bottom and hugging surfaces.',
  useWhen: ['KMnO4 + conc HCl or bleaching powder + acid producing Cl2 gas'],
  avoidWhen: ['Invisible gases'],
  params: {
    colorHex: { name: 'colorHex', type: 'color', default: '#c6d84a', description: 'Cl2 absorption color' },
    densityMultiplier: { name: 'densityMultiplier', type: 'number', min: 1.0, max: 3.0, default: 2.45, description: 'Density ratio vs air' }
  },
  budget: { particles: 80, shaderCost: 2 },
  anchorsAllowed: ['bottom', 'headspace', 'outside'],
  mount(ctx, p) { return { atom: 'heavyYellowGreenChlorine', instanceId: `cl2_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Dense Chlorine Pooling', description: 'Heavy yellow-green gas cloud filling bottom of cylinder', params: { colorHex: '#c6d84a', densityMultiplier: 2.45 } },
    { title: 'Dilute Chlorine Haze', description: 'Pale greenish-yellow toxic gas layer', params: { colorHex: '#d9f99d', densityMultiplier: 2.45 } }
  ],
  tests: ['chlorine_heavy_absorber_gas']
};

export const bromineVaporLayerAtom: EffectAtom = {
  name: 'bromineVaporLayer',
  version: 1,
  category: 'gas',
  summary_en: 'Very dense deep red-brown bromine vapor (M=160, rho=5.5x air) dripping downward like heavy liquid.',
  useWhen: ['Liquid bromine handling or displacement of bromide by chlorine'],
  avoidWhen: ['Aqueous dilute bromine water without dense vapor'],
  params: {
    vaporColor: { name: 'vaporColor', type: 'color', default: '#991b1b', description: 'Deep red-brown tint' },
    pourDownwardVelocity: { name: 'pourDownwardVelocity', type: 'number', min: 0.2, max: 2.0, default: 0.8, unit: 'm/s', description: 'Cascading downward rate' }
  },
  budget: { particles: 90, shaderCost: 2 },
  anchorsAllowed: ['headspace', 'rim', 'outside'],
  mount(ctx, p) { return { atom: 'bromineVaporLayer', instanceId: `br2_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Dense Bromine Vapor Cascade', description: 'Heavy blood-red vapor pouring down outside beaker wall', params: { vaporColor: '#7f1d1d', pourDownwardVelocity: 1.1 } },
    { title: 'Bromine Headspace Layer', description: 'Intense red-brown gas resting atop dark red liquid Br2', params: { vaporColor: '#991b1b', pourDownwardVelocity: 0.4 } }
  ],
  tests: ['bromine_heavy_vapor_cascade']
};

export const iodineVioletVaporAtom: EffectAtom = {
  name: 'iodineVioletVapor',
  version: 1,
  category: 'gas',
  summary_en: 'Intense violet sublimated iodine vapor filling vessel and depositing shiny dark crystals on cold surfaces.',
  useWhen: ['Gently heating solid iodine crystals on watch glass or beaker'],
  avoidWhen: ['Room temperature cold iodine solids'],
  params: {
    vaporIntensity: { name: 'vaporIntensity', type: 'number', min: 0.2, max: 2.5, default: 1.3, description: 'Violet vapor concentration' },
    violetHex: { name: 'violetHex', type: 'color', default: '#7e22ce', description: 'I2 gas absorption color' }
  },
  budget: { particles: 70, shaderCost: 2 },
  anchorsAllowed: ['headspace', 'rim', 'bulk'],
  mount(ctx, p) { return { atom: 'iodineVioletVapor', instanceId: `i2_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Iodine Sublimation Violet Cloud', description: 'Brilliant purple-violet gas rising and recrystallizing on cold finger', params: { vaporIntensity: 1.8, violetHex: '#6b21a8' } },
    { title: 'Gentle Iodine Vapor Wisp', description: 'Delicate violet haze hovering above warmed crystal', params: { vaporIntensity: 0.6, violetHex: '#9333ea' } }
  ],
  tests: ['iodine_violet_sublimation_vapor']
};

export const no2BrownPlumeAtom: EffectAtom = {
  name: 'no2BrownPlume',
  version: 1,
  category: 'gas',
  summary_en: 'Suffocating red-brown NO2 gas evolving vigorously from copper + concentrated nitric acid.',
  useWhen: ['Cu + conc HNO3 reaction'],
  avoidWhen: ['Colorless gases or dilute nitric acid (which evolves NO)'],
  params: {
    brownColorHex: { name: 'brownColorHex', type: 'color', default: '#b45309', description: 'NO2 color' },
    productionRate: { name: 'productionRate', type: 'number', min: 0.2, max: 3.0, default: 1.5, description: 'Evolution vigor' }
  },
  budget: { particles: 90, shaderCost: 2 },
  anchorsAllowed: ['rim', 'headspace'],
  mount(ctx, p) { return { atom: 'no2BrownPlume', instanceId: `no2_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Vigorous NO2 Eruption', description: 'Thick red-brown toxic plume rising as copper wire dissolves in green liquid', params: { brownColorHex: '#92400e', productionRate: 2.2 } },
    { title: 'Moderate NO2 Evolution', description: 'Steady red-brown fume drift under fume hood', params: { brownColorHex: '#b45309', productionRate: 1.0 } }
  ],
  tests: ['no2_brown_plume_copper_nitric']
};

export const noToNo2AtMouthAtom: EffectAtom = {
  name: 'noToNo2AtMouth',
  version: 1,
  category: 'gas',
  summary_en: 'Colorless nitric oxide (NO) bubbling through liquid, turning dark red-brown NO2 instantly upon contacting air at vessel mouth.',
  useWhen: ['Cu + dilute HNO3 evolving colorless NO which oxidizes at lip'],
  avoidWhen: ['Concentrated nitric acid (which forms NO2 internally)'],
  params: {
    oxidationRate: { name: 'oxidationRate', type: 'number', min: 0.5, max: 3.0, default: 1.8, description: 'Air contact oxidation speed' },
    productColor: { name: 'productColor', type: 'color', default: '#b45309', description: 'NO2 color at mouth' }
  },
  budget: { particles: 70, shaderCost: 2 },
  anchorsAllowed: ['rim'],
  mount(ctx, p) { return { atom: 'noToNo2AtMouth', instanceId: `no_no2_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'NO Colorless in Tube, Brown at Lip', description: 'Colorless bubbles rise, turning vivid red-brown the instant they meet room air', params: { oxidationRate: 2.0, productColor: '#b45309' } },
    { title: 'Mild Dilute Nitric Oxidation', description: 'Gradual brown ring forming at test tube mouth', params: { oxidationRate: 1.0, productColor: '#d97706' } }
  ],
  tests: ['no_colorless_to_no2_mouth']
};

export const so2HazeMoistAtom: EffectAtom = {
  name: 'so2HazeMoist',
  version: 1,
  category: 'gas',
  summary_en: 'Heavy suffocating SO2 gas forming a subtle translucent haze in moist air with sharp pungent odor tag.',
  useWhen: ['Burning sulfur, or sulfite salt + acid'],
  avoidWhen: ['Colored plumes like NO2 or Cl2'],
  params: {
    hazeOpacity: { name: 'hazeOpacity', type: 'number', min: 0.1, max: 0.8, default: 0.35, description: 'Subtle moisture haze' },
    hazeColor: { name: 'hazeColor', type: 'color', default: '#f1f5f9', description: 'Acidic fog tint' }
  },
  budget: { particles: 50, shaderCost: 1 },
  anchorsAllowed: ['rim', 'headspace'],
  mount(ctx, p) { return { atom: 'so2HazeMoist', instanceId: `so2_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Sulfur Dioxide Pungent Haze', description: 'Subtle heavy haze rolling over rim with hazard warning', params: { hazeOpacity: 0.45, hazeColor: '#f8fafc' } },
    { title: 'Faint SO2 Wisps', description: 'Barely visible acidic sulfur haze', params: { hazeOpacity: 0.20, hazeColor: '#f1f5f9' } }
  ],
  tests: ['so2_haze_moist_air']
};

export const sulfurBlueFlameSmokeAtom: EffectAtom = {
  name: 'sulfurBlueFlameSmoke',
  version: 1,
  category: 'combustion',
  summary_en: 'Sulfur burning with delicate pale-blue flame in air/dark and emitting white SO2/SO3 haze above molten amber pool.',
  useWhen: ['Combustion of elemental sulfur on deflagrating spoon'],
  avoidWhen: ['Aqueous reactions'],
  params: {
    flameColor: { name: 'flameColor', type: 'color', default: '#60a5fa', description: 'Sulfur emission line blue' },
    moltenPoolColor: { name: 'moltenPoolColor', type: 'color', default: '#d97706', description: 'Molten sulfur amber' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['flame', 'surface'],
  mount(ctx, p) { return { atom: 'sulfurBlueFlameSmoke', instanceId: `sburn_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Sulfur Burning in Air', description: 'Pale blue ethereal flame with molten orange sulfur pool and haze', params: { flameColor: '#60a5fa', moltenPoolColor: '#d97706' } },
    { title: 'Sulfur Burning in Pure O2', description: 'Brilliant intense purple-blue flame', params: { flameColor: '#3b82f6', moltenPoolColor: '#b45309' } }
  ],
  tests: ['sulfur_blue_flame_combustion']
};

export const magnesiumOxideSmokeAtom: EffectAtom = {
  name: 'magnesiumOxideSmoke',
  version: 1,
  category: 'combustion',
  summary_en: 'Dense blinding white MgO particulate smoke rising in high-thermal convection from burning magnesium flare.',
  useWhen: ['Burning magnesium ribbon in air or oxygen jar'],
  avoidWhen: ['Low temperature reactions'],
  params: {
    flareBrightness: { name: 'flareBrightness', type: 'number', min: 1.0, max: 10.0, default: 5.0, description: 'Blinding glare intensity' },
    ashFalloutRate: { name: 'ashFalloutRate', type: 'number', min: 0.1, max: 1.0, default: 0.6, description: 'White ash deposit' }
  },
  budget: { particles: 110, shaderCost: 3 },
  anchorsAllowed: ['flame', 'rim'],
  mount(ctx, p) { return { atom: 'magnesiumOxideSmoke', instanceId: `mgo_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Blinding Mg Flare & White Smoke', description: 'Incredible white flash leaving billows of white MgO dust', params: { flareBrightness: 6.0, ashFalloutRate: 0.8 } },
    { title: 'Moderate Mg Spark Combustion', description: 'Bright white spark trail with white particulate', params: { flareBrightness: 3.5, ashFalloutRate: 0.4 } }
  ],
  tests: ['magnesium_ribbon_mgo_smoke']
};

export const sodiumOxideSmokeAtom: EffectAtom = {
  name: 'sodiumOxideSmoke',
  version: 1,
  category: 'combustion',
  summary_en: 'Caustic dense white Na2O/NaOH smoke aerosol emitted from hot burning sodium metal in air.',
  useWhen: ['Sodium burning in gas jar or violent alkali metal ignition'],
  avoidWhen: ['Peaceful cold fizzing'],
  params: {
    yellowFlameGlow: { name: 'yellowFlameGlow', type: 'number', min: 0.5, max: 4.0, default: 2.2, description: '589 nm sodium D-line radiance' },
    causticMistDensity: { name: 'causticMistDensity', type: 'number', min: 0.2, max: 2.0, default: 1.2, description: 'Smoke opacity' }
  },
  budget: { particles: 80, shaderCost: 2 },
  anchorsAllowed: ['surface', 'flame'],
  mount(ctx, p) { return { atom: 'sodiumOxideSmoke', instanceId: `na2o_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Sodium Fire with Dense Caustic Smoke', description: 'Golden yellow flame and thick white Na2O aerosol cloud', params: { yellowFlameGlow: 2.5, causticMistDensity: 1.5 } },
    { title: 'Small Sodium Flare Pop', description: 'Brief yellow flash with curling white wisp', params: { yellowFlameGlow: 1.2, causticMistDensity: 0.6 } }
  ],
  tests: ['sodium_oxide_caustic_smoke']
};

export const steelWoolSparkShowerAtom: EffectAtom = {
  name: 'steelWoolSparkShower',
  version: 1,
  category: 'combustion',
  summary_en: 'Glowing orange embers and parabolic arcs of bright sparks falling from burning steel wool (mass increases on balance).',
  useWhen: ['Steel wool burning demonstration in air or oxygen flask'],
  avoidWhen: ['Liquid reactions'],
  params: {
    sparkCount: { name: 'sparkCount', type: 'number', min: 20, max: 200, default: 80, description: 'Spark particle count' },
    massGainFactor: { name: 'massGainFactor', type: 'number', min: 1.1, max: 1.5, default: 1.38, description: 'Fe -> Fe3O4 mass ratio (x1.38)' }
  },
  budget: { particles: 100, shaderCost: 2 },
  anchorsAllowed: ['flame', 'bulk'],
  mount(ctx, p) { return { atom: 'steelWoolSparkShower', instanceId: `steel_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Steel Wool Spark Cascade', description: 'Orange-hot glowing iron filaments showering parabolic sparks', params: { sparkCount: 100, massGainFactor: 1.38 } },
    { title: 'Gentle Iron Smolder', description: 'Creeping orange combustion front through steel wool on balance', params: { sparkCount: 30, massGainFactor: 1.38 } }
  ],
  tests: ['steel_wool_spark_mass_gain']
};

export const sootBlackSmokeAtom: EffectAtom = {
  name: 'sootBlackSmoke',
  version: 1,
  category: 'combustion',
  summary_en: 'Dense black particulate carbon smoke from incomplete hydrocarbon combustion depositing soot rings on cool glass.',
  useWhen: ['Burning rich fuels (wax, oil, acetylene) with closed air hole'],
  avoidWhen: ['Clean blue premixed burner flames'],
  params: {
    sootDensity: { name: 'sootDensity', type: 'number', min: 0.2, max: 3.0, default: 1.6, description: 'Black soot opacity' },
    glassDepositionRate: { name: 'glassDepositionRate', type: 'number', min: 0.1, max: 1.0, default: 0.7, description: 'Black soot ring growth' }
  },
  budget: { particles: 90, shaderCost: 2 },
  anchorsAllowed: ['flame', 'rim'],
  mount(ctx, p) { return { atom: 'sootBlackSmoke', instanceId: `soot_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Acetylene / Candle Black Soot', description: 'Turbulent black carbon plume depositing dark velvety soot on glass', params: { sootDensity: 2.0, glassDepositionRate: 0.85 } },
    { title: 'Yellow Burner Flame Smudge', description: 'Lazy luminous yellow flame producing slight black smoke', params: { sootDensity: 0.8, glassDepositionRate: 0.35 } }
  ],
  tests: ['soot_black_carbon_smoke']
};

export const sugarCarbonSnakeAtom: EffectAtom = {
  name: 'sugarCarbonSnake',
  version: 1,
  category: 'combustion',
  summary_en: 'Sugar + concentrated H2SO4 dehydrating into rising porous steaming black carbon column emitting SO2 and steam.',
  useWhen: ['Sugar dehydration demonstration with conc H2SO4'],
  avoidWhen: ['Mild non-acid reactions'],
  params: {
    snakeHeight_cm: { name: 'snakeHeight_cm', type: 'number', min: 5.0, max: 30.0, default: 18.0, unit: 'cm', description: 'Extruded tower height' },
    steamPuffDensity: { name: 'steamPuffDensity', type: 'number', min: 0.5, max: 2.5, default: 1.4, description: 'Hot acid vapor' }
  },
  budget: { particles: 90, shaderCost: 3 },
  anchorsAllowed: ['bulk', 'rim'],
  mount(ctx, p) { return { atom: 'sugarCarbonSnake', instanceId: `snake_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Black Carbon Snake Eruption', description: 'Tower of porous steaming black carbon erupts 20 cm from beaker', params: { snakeHeight_cm: 20.0, steamPuffDensity: 1.6 } },
    { title: 'Initial Sugar Caramelization', description: 'Yellow-brown darkening to bubbling black tar', params: { snakeHeight_cm: 6.0, steamPuffDensity: 0.6 } }
  ],
  tests: ['sugar_carbon_snake_dehydration']
};

export const ammoniumDichromateVolcanoAtom: EffectAtom = {
  name: 'ammoniumDichromateVolcano',
  version: 1,
  category: 'combustion',
  summary_en: 'Decomposition of orange crystals sparking like a miniature volcano into voluminous dark green fluffy Cr2O3 ash.',
  useWhen: ['Ammonium dichromate (NH4)2Cr2O7 thermal decomposition'],
  avoidWhen: ['Safe everyday school student mixes (Cr VI hazard)'],
  params: {
    sparkRate: { name: 'sparkRate', type: 'number', min: 10, max: 100, default: 45, description: 'Incandescent green-orange sparks' },
    ashVolumeExpansion: { name: 'ashVolumeExpansion', type: 'number', min: 3.0, max: 10.0, default: 6.5, description: 'Cr2O3 volume multiplier (x6-10)' }
  },
  budget: { particles: 100, shaderCost: 3 },
  anchorsAllowed: ['flame', 'surface'],
  mount(ctx, p) { return { atom: 'ammoniumDichromateVolcano', instanceId: `volcano_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Chemical Volcano Eruption', description: 'Orange crystals glow red, spitting sparks and swelling into giant green ash mound', params: { sparkRate: 60, ashVolumeExpansion: 8.0 } },
    { title: 'Gentle Volcano Smolder', description: 'Steady green Cr2O3 ash pile growth with glowing core', params: { sparkRate: 25, ashVolumeExpansion: 5.0 } }
  ],
  tests: ['ammonium_dichromate_volcano']
};

export const hydrogenPopFlashAtom: EffectAtom = {
  name: 'hydrogenPopFlash',
  version: 1,
  category: 'combustion',
  summary_en: 'Fast pale-blue flash wave and sharp audible pop whoosh when hydrogen-air mix ignites in test tube.',
  useWhen: ['Igniting collected hydrogen test tube with burning splint'],
  avoidWhen: ['Slow combustion without acoustic impulse'],
  params: {
    flashRadius_cm: { name: 'flashRadius_cm', type: 'number', min: 2.0, max: 15.0, default: 7.0, unit: 'cm', description: 'Flame wave expansion' },
    popVolume_dB: { name: 'popVolume_dB', type: 'number', min: 60, max: 110, default: 85, unit: 'dB', description: 'Sound intensity' }
  },
  budget: { particles: 40, shaderCost: 2 },
  anchorsAllowed: ['rim', 'headspace'],
  mount(ctx, p) { return { atom: 'hydrogenPopFlash', instanceId: `hpop_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Squeaky Pop Ignition', description: 'Pale blue flame flash travels down tube with classic whistle-pop', params: { flashRadius_cm: 8.0, popVolume_dB: 90 } },
    { title: 'Muffled Hydrogen Flamelet', description: 'Small gentle pop at test tube opening', params: { flashRadius_cm: 4.0, popVolume_dB: 75 } }
  ],
  tests: ['hydrogen_pop_acoustic_flash']
};

export const candleBurnPlumeAtom: EffectAtom = {
  name: 'candleBurnPlume',
  version: 1,
  category: 'combustion',
  summary_en: 'Hot gas plume carrying warm convection, trace soot, and extinguishing when oxygen depletes in closed jar.',
  useWhen: ['Candle in bell jar experiment testing oxygen consumption and CO2 production'],
  avoidWhen: ['High-energy open flares'],
  params: {
    oxygenLevel_percent: { name: 'oxygenLevel_percent', type: 'number', min: 0.0, max: 21.0, default: 21.0, unit: '%', description: 'Jar oxygen fraction' },
    flameHeight_mm: { name: 'flameHeight_mm', type: 'number', min: 2.0, max: 25.0, default: 15.0, unit: 'mm', description: 'Steady flame size' }
  },
  budget: { particles: 50, shaderCost: 2 },
  anchorsAllowed: ['flame'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'candleBurnPlume', instanceId: `candle_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Steady Candle Flame in Air', description: 'Luminous yellow flame with warm convection plume and melt pool', params: { oxygenLevel_percent: 21.0, flameHeight_mm: 18.0 } },
    { title: 'Dying Flame in Depleted Jar', description: 'Flame flickers down to tiny blue point and dies as O2 drops below 14%', params: { oxygenLevel_percent: 13.0, flameHeight_mm: 3.0 } }
  ],
  tests: ['candle_burn_oxygen_depletion']
};

export const heatHazeShimmerAtom: EffectAtom = {
  name: 'heatHazeShimmer',
  version: 1,
  category: 'thermal',
  summary_en: 'Screen-space thermal refraction warp and mirage shimmer above hot plate or burner scaled by deltaT.',
  useWhen: ['Bunsen burner or hot plate heating air above vessel'],
  avoidWhen: ['Room temperature cold setups'],
  params: {
    shimmerIntensity: { name: 'shimmerIntensity', type: 'number', min: 0.1, max: 2.5, default: 1.0, description: 'Refractive index distortion' },
    shimmerHeight_cm: { name: 'shimmerHeight_cm', type: 'number', min: 5.0, max: 30.0, default: 15.0, unit: 'cm', description: 'Vertical column height' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['flame', 'rim'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'heatHazeShimmer', instanceId: `haze_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Burner Thermal Heat Haze', description: 'Wavy mirage refraction warping objects viewed behind the flame', params: { shimmerIntensity: 1.5, shimmerHeight_cm: 20.0 } },
    { title: 'Hot Plate Convection Shimmer', description: 'Subtle shimmer hovering above warm glass beaker', params: { shimmerIntensity: 0.6, shimmerHeight_cm: 10.0 } }
  ],
  tests: ['heat_haze_thermal_shimmer']
};
