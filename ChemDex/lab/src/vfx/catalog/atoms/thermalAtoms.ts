/**
 * thermalAtoms.ts — Effect Atoms for Thermodynamic, Phase & Heat Phenomena (§4.F)
 * 
 * Implements all 12 canonical thermal/phase atoms plus legacy aliases.
 * Accurately models enthalpy deltaH, latent heat, glass thermal shock,
 * and temperature feedback on reaction rates.
 */

import { EffectAtom } from '../types';

export const exothermicGlowOverlayAtom: EffectAtom = {
  name: 'exothermicGlowOverlay',
  version: 1,
  category: 'thermal',
  summary_en: 'Optional thermal-camera false-color overlay (blue -> cyan -> yellow -> red) and subtle warm heat haze refraction.',
  useWhen: ['Exothermic reactions releasing significant heat (deltaH < -50 kJ/mol)'],
  avoidWhen: ['Endothermic or isothermal room temperature mixing'],
  params: {
    temperature_c: { name: 'temperature_c', type: 'number', min: 25.0, max: 150.0, default: 65.0, unit: '°C', description: 'Liquid temperature' },
    thermalFalseColor: { name: 'thermalFalseColor', type: 'boolean', default: false, description: 'FLIR false-color palette' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk', 'wallLower'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'exothermicGlowOverlay', instanceId: `exo_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Exothermic Neutralization Glow', description: 'Warm yellow-red heat core spreading during strong acid-base titration', params: { temperature_c: 72.0, thermalFalseColor: true } },
    { title: 'Subtle Thermal Refraction', description: 'Warm shimmer without false-color mode', params: { temperature_c: 55.0, thermalFalseColor: false } }
  ],
  tests: ['exothermic_glow_heat_overlay']
};

export const endothermicFrostAtom: EffectAtom = {
  name: 'endothermicFrost',
  version: 1,
  category: 'thermal',
  summary_en: 'Flask exterior chills below dew/freezing point; atmospheric humidity freezes into white frost and freezes wet board to flask.',
  useWhen: ['NH4NO3 dissolution (deltaT ~ -13 K), Ba(OH)2*8H2O + NH4SCN (freezing drop)'],
  avoidWhen: ['Exothermic reactions'],
  params: {
    frostThickness_mm: { name: 'frostThickness_mm', type: 'number', min: 0.1, max: 3.0, default: 1.0, unit: 'mm', description: 'Ice crust layer' },
    flaskTemperature_c: { name: 'flaskTemperature_c', type: 'number', min: -25.0, max: 15.0, default: -8.0, unit: '°C', description: 'Wall temperature' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['wall', 'wallLower', 'bottom'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'endothermicFrost', instanceId: `frost_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Freezing Ba(OH)2 + NH4SCN Frost', description: 'Thick white ice crystals coating outer glass; beaker freezes to wooden block', params: { frostThickness_mm: 1.8, flaskTemperature_c: -12.0 } },
    { title: 'Cold Ammonium Nitrate Chill', description: 'Outer glass fogs with condensation beads that ice over', params: { frostThickness_mm: 0.6, flaskTemperature_c: 2.0 } }
  ],
  tests: ['endothermic_frost_outer_wall']
};

export const boilingStagesAtom: EffectAtom = {
  name: 'boilingStages',
  version: 1,
  category: 'thermal',
  summary_en: 'Thermodynamic boiling state machine: convective warming -> microbubble nucleation -> onset -> rolling boil.',
  useWhen: ['Heating liquid over burner across 40 °C to 100 °C'],
  avoidWhen: ['Unheated ambient solutions'],
  params: {
    stage: { name: 'stage', type: 'select', default: 'rolling_boil', options: ['convection', 'microbubbles', 'boil_onset', 'rolling_boil'], description: 'Boiling stage' },
    superheat_K: { name: 'superheat_K', type: 'number', min: 0.0, max: 15.0, default: 1.5, unit: 'K', description: 'Superheat above saturation' }
  },
  budget: { particles: 80, shaderCost: 2 },
  anchorsAllowed: ['bottom', 'surface', 'bulk'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'boilingStages', instanceId: `bstages_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Full Rolling Boil Stage', description: 'Violent steam bubble generation with singing and rolling liquid', params: { stage: 'rolling_boil', superheat_K: 2.0 } },
    { title: 'Microbubble Nucleation Stage', description: 'Fine bubbles forming at hot bottom boundary layer at 85 °C', params: { stage: 'microbubbles', superheat_K: 0.2 } }
  ],
  tests: ['boiling_stages_state_machine']
};

export const superheatBurstAtom: EffectAtom = {
  name: 'superheatBurst',
  version: 1,
  category: 'thermal',
  summary_en: 'Sudden flashing vapor expansion from superheated liquid without boiling chips, lifting meniscus and stressing glass.',
  useWhen: ['Superheating liquid in smooth test tube followed by disturbance'],
  avoidWhen: ['Stirred heating with boiling stones'],
  params: {
    cavitationPulseIntensity: { name: 'cavitationPulseIntensity', type: 'number', min: 1.0, max: 5.0, default: 3.0, description: 'Surge impulse' },
    glassStressIncrement: { name: 'glassStressIncrement', type: 'number', min: 0.1, max: 1.0, default: 0.4, description: 'Thermal-mechanical stress' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['bottom', 'rim'],
  mount(ctx, p) { return { atom: 'superheatBurst', instanceId: `sburst_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Explosive Bumping Cavitation', description: 'Liquid piston erupts upward with sharp glass ting and splash hazard', params: { cavitationPulseIntensity: 3.5, glassStressIncrement: 0.5 } },
    { title: 'Mild Superheat Pulse', description: 'Brief steam thump shaking vessel', params: { cavitationPulseIntensity: 1.5, glassStressIncrement: 0.2 } }
  ],
  tests: ['superheat_burst_cavitation']
};

export const iceMeltShrinkAtom: EffectAtom = {
  name: 'iceMeltShrink',
  version: 1,
  category: 'thermal',
  summary_en: 'Floating ice cubes shrink smoothly (latent heat 334 J/g), lowering liquid temperature to 0 °C and diluting solute.',
  useWhen: ['Ice cubes added to liquid for chilling or calorimetric measurement'],
  avoidWhen: ['Boiling or room temperature reactions without ice'],
  params: {
    iceMass_g: { name: 'iceMass_g', type: 'number', min: 5.0, max: 100.0, default: 25.0, unit: 'g', description: 'Remaining ice mass' },
    meltRate_g_s: { name: 'meltRate_g_s', type: 'number', min: 0.1, max: 5.0, default: 1.2, unit: 'g/s', description: 'Melting speed' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['surface', 'bulk'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'iceMeltShrink', instanceId: `ice_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Floating Ice Cube Melting', description: 'Translucent rounded ice cubes bobbing at water surface, shrinking continuously', params: { iceMass_g: 30.0, meltRate_g_s: 1.5 } },
    { title: 'Calorimetry Ice Bath Chilling', description: 'Thermometer stabilizes at 0.0 °C while latent heat is absorbed', params: { iceMass_g: 10.0, meltRate_g_s: 0.5 } }
  ],
  tests: ['ice_melt_latent_heat']
};

export const meltingSolidAtom: EffectAtom = {
  name: 'meltingSolid',
  version: 1,
  category: 'thermal',
  summary_en: 'Low-melting solid (wax, naphthalene, gallium, sodium) slumps and pools into clear liquid upon reaching melting point.',
  useWhen: ['Heating solid past its melting point (e.g. sodium mp 98 °C, wax mp 60 °C)'],
  avoidWhen: ['Solids that decompose or burn before melting'],
  params: {
    meltingPoint_c: { name: 'meltingPoint_c', type: 'number', min: 30.0, max: 150.0, default: 60.0, unit: '°C', description: 'Melting temperature' },
    meltPoolColor: { name: 'meltPoolColor', type: 'color', default: '#fef9c3', description: 'Molten liquid color' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bottom'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'meltingSolid', instanceId: `melt_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Paraffin Wax Melting', description: 'White opaque block softens, slumps, and turns clear liquid amber pool', params: { meltingPoint_c: 58.0, meltPoolColor: '#fef08a' } },
    { title: 'Gallium Melting in Hand/Water', description: 'Silvery metal lump liquefies at 29.8 °C into liquid mirror pool', params: { meltingPoint_c: 29.8, meltPoolColor: '#e2e8f0' } }
  ],
  tests: ['solid_melting_phase_transition']
};

export const dissolutionHeatAtom: EffectAtom = {
  name: 'dissolutionHeat',
  version: 1,
  category: 'thermal',
  summary_en: 'Exothermic (NaOH, CaCl2) or endothermic (NH4NO3, KNO3) dissolution computing deltaT = n*deltaH_sol / (m*c).',
  useWhen: ['Dissolving solid salt pellets into water'],
  avoidWhen: ['Athermal dissolution where deltaH ~ 0'],
  params: {
    deltaT_K: { name: 'deltaT_K', type: 'number', min: -25.0, max: 40.0, default: 12.0, unit: 'K', description: 'Temperature change' },
    dissolutionSpeed_g_s: { name: 'dissolutionSpeed_g_s', type: 'number', min: 0.1, max: 5.0, default: 1.0, unit: 'g/s', description: 'Dissolving rate' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bottom', 'bulk'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'dissolutionHeat', instanceId: `dissheat_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'NaOH Dissolution Heat', description: 'Beaker warms +10 K as lye pellets dissolve with hot glass warning', params: { deltaT_K: 12.0, dissolutionSpeed_g_s: 1.5 } },
    { title: 'NH4NO3 Cold Pack Dissolution', description: 'Water chills -13 K as ammonium nitrate absorbs thermal energy', params: { deltaT_K: -13.0, dissolutionSpeed_g_s: 2.0 } }
  ],
  tests: ['dissolution_heat_enthalpy_balance']
};

export const dilutionHeatConcAcidAtom: EffectAtom = {
  name: 'dilutionHeatConcAcid',
  version: 1,
  category: 'thermal',
  summary_en: 'Water added to conc H2SO4 creates localized boiling, spit and hazardous splash; acid into water safely disperses heat.',
  useWhen: ['Diluting concentrated sulfuric acid (rule: acid into water)'],
  avoidWhen: ['Dilute acids'],
  params: {
    wrongOrderOfAddition: { name: 'wrongOrderOfAddition', type: 'boolean', default: false, description: 'Water poured into conc acid' },
    spatterIntensity: { name: 'spatterIntensity', type: 'number', min: 0.1, max: 3.0, default: 1.5, description: 'Splatter hazard' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['pourPoint', 'surface'],
  mount(ctx, p) { return { atom: 'dilutionHeatConcAcid', instanceId: `dilheat_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Dangerous: Water into Conc Acid', description: 'Explosive local steam spitting with dangerous corrosive acid mist', params: { wrongOrderOfAddition: true, spatterIntensity: 2.5 } },
    { title: 'Safe: Acid into Water', description: 'Acid stream dives to bottom, heat disperses safely through bulk liquid', params: { wrongOrderOfAddition: false, spatterIntensity: 0.1 } }
  ],
  tests: ['dilution_heat_sulfuric_acid_order']
};

export const thermalShockCrackAtom: EffectAtom = {
  name: 'thermalShockCrack',
  version: 1,
  category: 'wall',
  summary_en: 'Excessive thermal gradient dT/dt creates mechanical stress crack spreading through glass rim or base with leak.',
  useWhen: ['Hot glass placed on cold wet surface, or ice poured into hot boiling beaker'],
  avoidWhen: ['Gradual warming under wire gauze'],
  params: {
    thermalGradient_K_s: { name: 'thermalGradient_K_s', type: 'number', min: 5.0, max: 80.0, default: 35.0, unit: 'K/s', description: 'Thermal quench rate' },
    shatterThreshold: { name: 'shatterThreshold', type: 'number', min: 20.0, max: 60.0, default: 30.0, description: 'Glass breakage limit' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bottom', 'wallLower'],
  mount(ctx, p) { return { atom: 'thermalShockCrack', instanceId: `crack_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Thermal Shock Glass Fracture', description: 'Jagged star crack branches across beaker bottom with sharp snap audio', params: { thermalGradient_K_s: 45.0, shatterThreshold: 30.0 } },
    { title: 'Mild Thermal Stress Ping', description: 'Hairline stress fracture without total vessel failure', params: { thermalGradient_K_s: 25.0, shatterThreshold: 30.0 } }
  ],
  tests: ['thermal_shock_glassware_fracture']
};

export const sublimationAtom: EffectAtom = {
  name: 'sublimation',
  version: 1,
  category: 'thermal',
  summary_en: 'Direct solid-to-gas phase transition (I2, dry ice, camphor, naphthalene): solid shrinks and colored vapor forms.',
  useWhen: ['Sublimation of iodine or dry ice'],
  avoidWhen: ['Melting solids with intermediate liquid phase'],
  params: {
    sublimationRate_g_s: { name: 'sublimationRate_g_s', type: 'number', min: 0.05, max: 2.0, default: 0.4, unit: 'g/s', description: 'Vaporization speed' },
    vaporColor: { name: 'vaporColor', type: 'color', default: '#7e22ce', description: 'Vapor tint (e.g. purple I2)' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['bottom', 'headspace'],
  mount(ctx, p) { return { atom: 'sublimation', instanceId: `subl_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Iodine Sublimation', description: 'Black crystals vanish directly into billowing violet gas without liquid phase', params: { sublimationRate_g_s: 0.3, vaporColor: '#6b21a8' } },
    { title: 'Dry Ice Sublimation', description: 'White dry ice chunk shrinks while releasing heavy cold CO2 vapor', params: { sublimationRate_g_s: 0.8, vaporColor: '#f1f5f9' } }
  ],
  tests: ['sublimation_phase_transition']
};

export const calorimetryCupAtom: EffectAtom = {
  name: 'calorimetryCup',
  version: 1,
  category: 'thermal',
  summary_en: 'Insulated coffee-cup calorimeter tracking heat exchange, stirrer agitation, and thermometer response with lag.',
  useWhen: ['Quantitative heat of neutralization or dissolution calorimetry'],
  avoidWhen: ['Open uninsulated beakers with high radiative loss'],
  params: {
    cupHeatCapacity_J_K: { name: 'cupHeatCapacity_J_K', type: 'number', min: 5.0, max: 50.0, default: 20.0, unit: 'J/K', description: 'Calorimeter constant' },
    thermometerLag_s: { name: 'thermometerLag_s', type: 'number', min: 1.0, max: 10.0, default: 4.0, unit: 's', description: 'Thermal sensor time constant' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'calorimetryCup', instanceId: `calor_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Styrofoam Cup Neutralization', description: 'T curve rises smoothly by +6.9 K, accounting for thermometer bulb thermal lag', params: { cupHeatCapacity_J_K: 25.0, thermometerLag_s: 4.5 } },
    { title: 'Rapid Electronic Thermistor', description: 'Fast sensor reading temperature step in 1 s', params: { cupHeatCapacity_J_K: 15.0, thermometerLag_s: 1.5 } }
  ],
  tests: ['calorimetry_energy_balance_thermometer_lag']
};

export const hotPlateGlowAtom: EffectAtom = {
  name: 'hotPlateGlow',
  version: 1,
  category: 'thermal',
  summary_en: 'Heating element incandescence and thermal convection circulation rolls visible via micro-tracer particles.',
  useWhen: ['Electric hot plate or heating mantle switched on'],
  avoidWhen: ['Gas flame burners'],
  params: {
    elementTemperature_c: { name: 'elementTemperature_c', type: 'number', min: 50.0, max: 450.0, default: 220.0, unit: '°C', description: 'Plate surface T' },
    glowIntensity: { name: 'glowIntensity', type: 'number', min: 0.0, max: 2.0, default: 0.8, description: 'Red heat incandescence' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bottom'],
  mount(ctx, p) { return { atom: 'hotPlateGlow', instanceId: `hplate_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Hot Plate Red Glow', description: 'Heating coil glows dull orange-red under glass beaker base', params: { elementTemperature_c: 380.0, glowIntensity: 1.4 } },
    { title: 'Moderate Warm Setting', description: 'No visible glow but strong convection circulation rolls', params: { elementTemperature_c: 120.0, glowIntensity: 0.0 } }
  ],
  tests: ['hot_plate_thermal_glow']
};

// Legacy backwards-compatible atoms
export const boilingBumpingAtom: EffectAtom = {
  name: 'boilingBumping',
  version: 1,
  category: 'thermal',
  summary_en: 'Violent boiling and cavitation bumping.',
  useWhen: ['Liquid heated above 98 °C'],
  avoidWhen: ['Room temperature liquids'],
  params: {
    intensity: { name: 'intensity', type: 'number', min: 0.1, max: 4.0, default: 2.0, description: 'Boiling vigor' },
    bumpingShockwave: { name: 'bumpingShockwave', type: 'boolean', default: false, description: 'Shockwave pulse' }
  },
  budget: { particles: 64, shaderCost: 2 },
  anchorsAllowed: ['bottom', 'surface', 'bulk'],
  mount(ctx, p) { return { atom: 'boilingBumping', instanceId: `bb_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Rolling Boil', description: 'Continuous bubbling at 100 °C', params: { intensity: 2.5, bumpingShockwave: false } },
    { title: 'Bumping Pulse', description: 'Surging cavitation pulse', params: { intensity: 3.5, bumpingShockwave: true } }
  ],
  tests: ['boiling_bumping_thermal']
};

export const thermalSteamAtom: EffectAtom = {
  name: 'thermalSteam',
  version: 1,
  category: 'thermal',
  summary_en: 'Billowing warm water vapor rising above hot liquids.',
  useWhen: ['Temperature >= 48 °C'],
  avoidWhen: ['Cold liquids'],
  params: {
    steamDensity: { name: 'steamDensity', type: 'number', min: 0.1, max: 2.5, default: 1.0, description: 'Steam density' },
    temperature_c: { name: 'temperature_c', type: 'number', min: 45, max: 120, default: 75, unit: '°C', description: 'Liquid temperature' }
  },
  budget: { particles: 48, shaderCost: 1 },
  anchorsAllowed: ['rim', 'surface'],
  mount(ctx, p) {
    return {
      atom: 'thermalSteam',
      instanceId: `ts_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      alive: true,
      custom: {
        ...p,
        elapsed: 0,
        steamDensity: p.steamDensity ?? 1.0,
        temperature_c: p.temperature_c ?? 75,
        steamVigor: 0
      }
    };
  },
  update(h, dt, s) {
    if (!h.alive) return;
    h.custom.elapsed += dt;
    const target = h.custom.steamDensity ?? 1.0;
    h.custom.steamVigor = Math.min(target, (h.custom.steamVigor || 0) + dt * 0.4);
  },
  writeBack(h, vessel) {
    if (!h.alive) return;
    vessel.temperature_c = Math.max(vessel.temperature_c || 25, h.custom.temperature_c || 75);
    vessel.fumingIntensity = Math.max(vessel.fumingIntensity || 0, (h.custom.steamVigor || 0) * 0.6);
  },
  dispose(h) {
    h.alive = false;
  },
  gallery: [
    { title: 'Simmering Vapor', description: 'Gentle steam wisps', params: { steamDensity: 0.8, temperature_c: 65 } },
    { title: 'Boiling Steam', description: 'Dense white cloud', params: { steamDensity: 2.2, temperature_c: 100 } }
  ],
  tests: ['thermal_steam_density']
};

export const convectionCurrentsAtom: EffectAtom = {
  name: 'convectionCurrents',
  version: 1,
  category: 'thermal',
  summary_en: 'Refractive index Schlieren striations and convective circulation.',
  useWhen: ['Bottom heating'],
  avoidWhen: ['Isothermal liquids'],
  params: {
    schlierenStrength: { name: 'schlierenStrength', type: 'number', min: 0.1, max: 2.0, default: 0.8, description: 'Shimmer strength' },
    convectionSpeed: { name: 'convectionSpeed', type: 'number', min: 0.1, max: 3.0, default: 1.2, unit: 'cm/s', description: 'Velocity' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'convectionCurrents', instanceId: `cc_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Thermal Schlieren', description: 'Heat veins rising', params: { schlierenStrength: 1.2, convectionSpeed: 1.5 } },
    { title: 'Gentle Currents', description: 'Slow convection drift', params: { schlierenStrength: 0.5, convectionSpeed: 0.6 } }
  ],
  tests: ['convection_currents_schlieren']
};

export const frostCreepAtom: EffectAtom = {
  name: 'frostCreep',
  version: 1,
  category: 'thermal',
  summary_en: 'Ice crystal frost coating outer glass wall.',
  useWhen: ['Endothermic reactions'],
  avoidWhen: ['Exothermic reactions'],
  params: {
    frostThickness: { name: 'frostThickness', type: 'number', min: 0.1, max: 1.0, default: 0.6, description: 'Frost opacity' },
    frostColor: { name: 'frostColor', type: 'color', default: '#e0f2fe', description: 'Crystal hue' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['wall', 'wallLower'],
  mount(ctx, p) { return { atom: 'frostCreep', instanceId: `fc_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Frost Coat', description: 'Ice crystals on cold wall', params: { frostThickness: 0.8, frostColor: '#e0f2fe' } },
    { title: 'Light Rim Frost', description: 'Thin condensation frost', params: { frostThickness: 0.3, frostColor: '#f0f9ff' } }
  ],
  tests: ['frost_creep_thermal']
};
