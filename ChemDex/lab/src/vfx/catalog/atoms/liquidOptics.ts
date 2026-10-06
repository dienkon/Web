/**
 * liquidOptics.ts — Effect Atoms for Liquid Optics & Color Dynamics (§4.A)
 * 
 * Implements 18 canonical atoms plus backward-compatible legacy atoms.
 * Every atom adheres to the EffectAtom contract with >= 2 presets and tests.
 */

import { EffectAtom } from '../types';

export const colorFrontDiffusiveAtom: EffectAtom = {
  name: 'colorFrontDiffusive',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Molecular diffusion boundary slowly thickening with sqrt(t) across liquid layers.',
  useWhen: ['Unstirred contact between two miscible layers of different solute concentration', 'Slow diffusion demonstration'],
  avoidWhen: ['Vigorously stirred vessels', 'Instantaneous turbulent mixing'],
  params: {
    diffusivity_m2_s: { name: 'diffusivity_m2_s', type: 'number', min: 1e-10, max: 1e-8, default: 1e-9, unit: 'm²/s', description: 'Diffusion coefficient' },
    frontColor: { name: 'frontColor', type: 'color', default: '#3b82f6', description: 'Diffusing solute color' },
    thickness_mm: { name: 'thickness_mm', type: 'number', min: 0.5, max: 20.0, default: 2.0, unit: 'mm', description: 'Boundary boundary thickness' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk', 'meniscus'],
  mount(ctx, p) { return { atom: 'colorFrontDiffusive', instanceId: `diff_${Date.now()}`, alive: true, custom: { ...p, t: 0 } }; },
  update(h, dt) { if (h.custom) h.custom.t += dt; },
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Standard Diffusion', description: 'Slow Cu2+ diffusion in stationary water', params: { diffusivity_m2_s: 1e-9, frontColor: '#38bdf8', thickness_mm: 3.0 } },
    { title: 'Fast Diffusion', description: 'Rapid H+ proton diffusion front', params: { diffusivity_m2_s: 9e-9, frontColor: '#ef4444', thickness_mm: 6.0 } }
  ],
  tests: ['diffusion_front_sqrt_t']
};

export const colorFrontAdvectiveAtom: EffectAtom = {
  name: 'colorFrontAdvective',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Pour-driven advective plume; dense fluid sinks as a waterfall along wall, light floats.',
  useWhen: ['Pouring concentrated acid, syrup or brine into water', 'Buoyancy-driven plume descent'],
  avoidWhen: ['Identical density fluids mixing peacefully'],
  params: {
    fallSpeed: { name: 'fallSpeed', type: 'number', min: 0.1, max: 3.0, default: 1.0, unit: 'm/s', description: 'Plume downward advection speed' },
    plumeColor: { name: 'plumeColor', type: 'color', default: '#6366f1', description: 'Plume fluid color' },
    curlStrength: { name: 'curlStrength', type: 'number', min: 0.0, max: 2.0, default: 0.8, description: 'Turbulence swirl factor' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['pourPoint', 'stream', 'wallLower', 'bulk'],
  mount(ctx, p) { return { atom: 'colorFrontAdvective', instanceId: `adv_${Date.now()}`, alive: true, custom: { ...p } }; },
  update(h, dt) {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Dense Plume Sinking', description: 'Conc H2SO4 cascading to beaker bottom', params: { fallSpeed: 1.5, plumeColor: '#e0e7ff', curlStrength: 1.0 } },
    { title: 'Light Layer Floating', description: 'Ethanol spreading across water surface', params: { fallSpeed: 0.2, plumeColor: '#fbcfe8', curlStrength: 0.4 } }
  ],
  tests: ['advective_plume_density']
};

export const beerLambertBlendAtom: EffectAtom = {
  name: 'beerLambertBlend',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Subtractive RGB absorption spectrum computed per-species from Beer-Lambert law A=sum(eps*c*l).',
  useWhen: ['Colored transition metal ions or dyes mixing in solution', 'Color changes with path length variation'],
  avoidWhen: ['Pure scattering/turbidity without chromophores'],
  params: {
    primarySpecies: { name: 'primarySpecies', type: 'string', default: 'Cu2+', description: 'Dominant chromophore species' },
    pathLength_cm: { name: 'pathLength_cm', type: 'number', min: 0.5, max: 20.0, default: 4.0, unit: 'cm', description: 'Beaker diameter' },
    absorbanceScale: { name: 'absorbanceScale', type: 'number', min: 0.1, max: 5.0, default: 1.0, description: 'Extinction multiplier' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  ledgerInputs: ['amount:reactant', 'amount:product'],
  mount(ctx, p) { return { atom: 'beerLambertBlend', instanceId: `blb_${Date.now()}`, alive: true, custom: { ...p } }; },
  update(h, dt, s) {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Copper Sulfate Sky Blue', description: 'Aqueous [Cu(H2O)6]2+ absorption band', params: { primarySpecies: 'Cu2+', pathLength_cm: 5.0, absorbanceScale: 1.0 } },
    { title: 'Potassium Dichromate Orange', description: 'Cr2O7 2- intense UV/visible charge-transfer band', params: { primarySpecies: 'Cr2O7_2-', pathLength_cm: 4.0, absorbanceScale: 1.8 } }
  ],
  tests: ['beer_lambert_cmf_blend']
};

export const indicatorTransitionAtom: EffectAtom = {
  name: 'indicatorTransition',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Continuous acid-base indicator color shift governed by Henderson-Hasselbalch equation around pKa.',
  useWhen: ['Titrations near equivalence point', 'pH changes with phenolphthalein, litmus, methyl orange, bromothymol blue'],
  avoidWhen: ['Redox reactions without pH sensitivity'],
  params: {
    indicator: { name: 'indicator', type: 'string', default: 'phenolphthalein', description: 'Indicator type' },
    pKa: { name: 'pKa', type: 'number', min: 1.0, max: 13.0, default: 9.3, description: 'Transition midpoint pKa' },
    acidColor: { name: 'acidColor', type: 'color', default: '#ffffff', description: 'Color below pKa - 1' },
    baseColor: { name: 'baseColor', type: 'color', default: '#ec4899', description: 'Color above pKa + 1' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk', 'surface'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'indicatorTransition', instanceId: `ind_${Date.now()}`, alive: true, custom: { ...p } }; },
  update(h, dt, s) {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Phenolphthalein Endpoint', description: 'Sharp colorless to magenta pink transition at pH 8.2-10.0', params: { indicator: 'phenolphthalein', pKa: 9.3, acidColor: '#ffffff', baseColor: '#ec4899' } },
    { title: 'Bromothymol Blue', description: 'Yellow acid to deep royal blue base via green neutral', params: { indicator: 'bromothymol_blue', pKa: 7.0, acidColor: '#facc15', baseColor: '#2563eb' } }
  ],
  tests: ['henderson_hasselbalch_indicator']
};

export const fadeAbsorbanceAtom: EffectAtom = {
  name: 'fadeAbsorbance',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Chromophore absorbance intensity decays smoothly as species is consumed in the ledger.',
  useWhen: ['Permanganate decolorization in oxalic acid', 'Fe(SCN)2+ fading when Ag+ precipitates thiocyanate'],
  avoidWhen: ['Non-colored reactant depletion'],
  params: {
    chromophoreFormula: { name: 'chromophoreFormula', type: 'string', default: 'MnO4-', description: 'Decaying chromophore' },
    startColor: { name: 'startColor', type: 'color', default: '#581c87', description: 'Initial deep color' },
    fadeTargetColor: { name: 'fadeTargetColor', type: 'color', default: '#fdf2f8', description: 'Color when completely consumed' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  ledgerInputs: ['amount:reactant'],
  mount(ctx, p) { return { atom: 'fadeAbsorbance', instanceId: `fade_${Date.now()}`, alive: true, custom: { ...p } }; },
  update(h, dt, s) {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Permanganate Decolorization', description: 'Purple MnO4- fading to almost colorless Mn2+', params: { chromophoreFormula: 'MnO4-', startColor: '#6b21a8', fadeTargetColor: '#faf5ff' } },
    { title: 'Triiodide Decolorization', description: 'Brown I3- fading with thiosulfate', params: { chromophoreFormula: 'I3-', startColor: '#854d0e', fadeTargetColor: '#fefce8' } }
  ],
  tests: ['fade_absorbance_ledger']
};

export const multiStageColorLadderAtom: EffectAtom = {
  name: 'multiStageColorLadder',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Ordered sequence of distinct color states with threshold gates (e.g. chemical chameleon).',
  useWhen: ['Permanganate chameleon (purple -> green -> yellow-brown)', 'Vanadium oxidation states (+5 yellow -> +4 blue -> +3 green -> +2 violet)'],
  avoidWhen: ['Single-step color transitions'],
  params: {
    colorStages: { name: 'colorStages', type: 'string', default: '#6b21a8,#15803d,#a16207', description: 'Comma-separated hex colors in sequence' },
    transitionTimes_s: { name: 'transitionTimes_s', type: 'string', default: '2.0,5.0,10.0', description: 'Timestamps for each color gate' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'multiStageColorLadder', instanceId: `ladder_${Date.now()}`, alive: true, custom: { ...p, elapsed: 0 } }; },
  update(h, dt) { if (h.custom) h.custom.elapsed += dt; },
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Chemical Chameleon', description: 'Purple MnO4- to Green MnO4 2- to Brown MnO2 sol', params: { colorStages: '#7e22ce,#16a34a,#b45309', transitionTimes_s: '3.0,6.0,12.0' } },
    { title: 'Vanadium Rainbow', description: 'Yellow VO2+ -> Blue VO2+ -> Green V3+ -> Violet V2+', params: { colorStages: '#eab308,#0284c7,#16a34a,#7c3aed', transitionTimes_s: '2.0,5.0,9.0,14.0' } }
  ],
  tests: ['multistage_color_ladder']
};

export const schlierenStreaksAtom: EffectAtom = {
  name: 'schlierenStreaks',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Transparent wavy optical refraction streaks caused by localized refractive index gradients.',
  useWhen: ['Dissolving sugar or salt in water before color changes', 'Pouring dense colorless liquid into water'],
  avoidWhen: ['Dense opaque muddy suspensions'],
  params: {
    intensity: { name: 'intensity', type: 'number', min: 0.1, max: 2.0, default: 0.8, description: 'Refractive warp strength' },
    streakScale: { name: 'streakScale', type: 'number', min: 0.05, max: 0.5, default: 0.15, unit: 'm', description: 'Wavelength of wavy bands' },
    lifespan_s: { name: 'lifespan_s', type: 'number', min: 1.0, max: 15.0, default: 4.0, unit: 's', description: 'Streak dissipation time' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk', 'pourPoint', 'bottom'],
  mount(ctx, p) { return { atom: 'schlierenStreaks', instanceId: `sch_${Date.now()}`, alive: true, custom: { ...p, time: 0 } }; },
  update(h, dt) { if (h.custom) h.custom.time += dt; },
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Sugar Dissolution Schlieren', description: 'Transparent shadow ripples sinking from sugar cube', params: { intensity: 1.0, streakScale: 0.12, lifespan_s: 5.0 } },
    { title: 'Ethanol/Water Mixing', description: 'Vigorous optical distortion during solvent blending', params: { intensity: 1.5, streakScale: 0.20, lifespan_s: 3.5 } }
  ],
  tests: ['schlieren_refractive_streaks']
};

export const turbidityRiseAtom: EffectAtom = {
  name: 'turbidityRise',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Rayleigh and Mie scattering clouding the solution from transparent to milky to opaque.',
  useWhen: ['Precipitation onset', 'Colloidal sulfur formation', 'Limewater clouding with CO2'],
  avoidWhen: ['Clear true solutions with no particulate phases'],
  params: {
    targetTurbidity: { name: 'targetTurbidity', type: 'number', min: 0.0, max: 1.0, default: 0.9, description: 'Final optical opacity' },
    riseHalfTime_s: { name: 'riseHalfTime_s', type: 'number', min: 0.1, max: 30.0, default: 2.5, unit: 's', description: 'Kinetics half time' },
    hazeTint: { name: 'hazeTint', type: 'color', default: '#ffffff', description: 'Scatter albedo color' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  ledgerInputs: ['turbidity'],
  mount(ctx, p) { return { atom: 'turbidityRise', instanceId: `turb_${Date.now()}`, alive: true, custom: { ...p } }; },
  update(h, dt, s) {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'BaSO4 Rapid Clouding', description: 'Instant milky opaque precipitate', params: { targetTurbidity: 0.98, riseHalfTime_s: 0.8, hazeTint: '#ffffff' } },
    { title: 'Sulfur Induction Opalescence', description: 'Slow blue-white Tyndall haze progressing to yellow milk', params: { targetTurbidity: 0.85, riseHalfTime_s: 8.0, hazeTint: '#fef9c3' } }
  ],
  tests: ['turbidity_rise_kinetics']
};

export const tyndallBeamAtom: EffectAtom = {
  name: 'tyndallBeam',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Visible illuminated beam cone tracing through colloidal sols under laser or point light.',
  useWhen: ['Laser pointer shone through starch, Fe(OH)3 sol, or colloidal sulfur', 'Colloid vs true solution verification'],
  avoidWhen: ['True solutions with dissolved ions only'],
  params: {
    beamColor: { name: 'beamColor', type: 'color', default: '#ef4444', description: 'Laser pointer wavelength color' },
    beamWidth_mm: { name: 'beamWidth_mm', type: 'number', min: 1.0, max: 10.0, default: 3.0, unit: 'mm', description: 'Laser ray diameter' },
    scatterIntensity: { name: 'scatterIntensity', type: 'number', min: 0.2, max: 3.0, default: 1.5, description: 'Forward scatter brightness' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'tyndallBeam', instanceId: `tynd_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Red Laser through Starch Sol', description: 'Clear red track through colloidal starch, invisible in salt water', params: { beamColor: '#ef4444', beamWidth_mm: 2.5, scatterIntensity: 1.8 } },
    { title: 'Green Laser in Sulfur Sol', description: 'Luminous green ray tracing across sulfur haze', params: { beamColor: '#22c55e', beamWidth_mm: 3.0, scatterIntensity: 2.2 } }
  ],
  tests: ['tyndall_beam_scattering']
};

export const opalescenceNearCriticalAtom: EffectAtom = {
  name: 'opalescenceNearCritical',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Shimmering blue-white opalescence at low supersaturation or critical micelle transitions.',
  useWhen: ['Very dilute AgCl or BaSO4 near threshold', 'Sulfur sol early induction'],
  avoidWhen: ['Dense opaque precipitate beds'],
  params: {
    shimmerFrequency: { name: 'shimmerFrequency', type: 'number', min: 0.5, max: 4.0, default: 1.2, unit: 'Hz', description: 'Interference flicker' },
    iridescenceTint: { name: 'iridescenceTint', type: 'color', default: '#bae6fd', description: 'Forward blue scatter tint' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk', 'surface'],
  mount(ctx, p) { return { atom: 'opalescenceNearCritical', instanceId: `opal_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'AgCl Critical Opalescence', description: 'Delicate bluish shimmer before full curdy flocculation', params: { shimmerFrequency: 1.0, iridescenceTint: '#e0f2fe' } },
    { title: 'Colloidal Soap Micelles', description: 'Pearlized iridescent gleam under oblique light', params: { shimmerFrequency: 1.5, iridescenceTint: '#f0fdf4' } }
  ],
  tests: ['opalescence_interference']
};

export const thermochromicShiftAtom: EffectAtom = {
  name: 'thermochromicShift',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Reversible equilibrium color shift driven by temperature T (e.g. CoCl2 pink to blue).',
  useWhen: ['Heating or cooling cobalt(II) chloride equilibrium', 'Copper chloride chloro-complex heating'],
  avoidWhen: ['Irreversible chemical reactions'],
  params: {
    coldColor: { name: 'coldColor', type: 'color', default: '#f472b6', description: 'Color at 20 °C (octahedral pink)' },
    hotColor: { name: 'hotColor', type: 'color', default: '#2563eb', description: 'Color at 80 °C (tetrahedral blue)' },
    transitionTemp_c: { name: 'transitionTemp_c', type: 'number', min: 30.0, max: 90.0, default: 55.0, unit: '°C', description: 'Equilibrium T50' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'thermochromicShift', instanceId: `tc_${Date.now()}`, alive: true, custom: { ...p } }; },
  update(h, dt, s) {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Cobalt(II) Hexaaqua Pink to Tetrachloro Blue', description: '[Co(H2O)6]2+ pink turns deep blue [CoCl4]2- when heated', params: { coldColor: '#f472b6', hotColor: '#1d4ed8', transitionTemp_c: 50.0 } },
    { title: 'Copper Chloro-complex', description: 'Blue [Cu(H2O)6]2+ shifts to emerald green on warming with HCl', params: { coldColor: '#38bdf8', hotColor: '#15803d', transitionTemp_c: 65.0 } }
  ],
  tests: ['thermochromic_equilibrium_temperature']
};

export const equilibriumShiftLeChatelierAtom: EffectAtom = {
  name: 'equilibriumShiftLeChatelier',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Smooth, reversible migration between species colors governed by Le Chatelier stress.',
  useWhen: ['Fe(SCN)2+ blood-red complex perturbed with SCN- or Fe3+ or F-', 'Chromate-dichromate pH equilibrium'],
  avoidWhen: ['Precipitation that goes to 100% completion irreversibly'],
  params: {
    leftColor: { name: 'leftColor', type: 'color', default: '#facc15', description: 'Color of reactant side (CrO4 2- yellow)' },
    rightColor: { name: 'rightColor', type: 'color', default: '#ea580c', description: 'Color of product side (Cr2O7 2- orange)' },
    relaxationTime_s: { name: 'relaxationTime_s', type: 'number', min: 0.2, max: 10.0, default: 1.5, unit: 's', description: 'Equilibrium response time' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'equilibriumShiftLeChatelier', instanceId: `lechat_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Chromate/Dichromate pH Shift', description: 'Yellow CrO4 2- turns orange Cr2O7 2- upon adding acid, reverts with base', params: { leftColor: '#facc15', rightColor: '#ea580c', relaxationTime_s: 1.2 } },
    { title: 'Iron(III) Thiocyanate Perturbation', description: 'Blood-red [Fe(SCN)]2+ lightens when fluoride binds Fe3+', params: { leftColor: '#991b1b', rightColor: '#fef08a', relaxationTime_s: 0.8 } }
  ],
  tests: ['le_chatelier_equilibrium_shift']
};

export const pHGradientLayersAtom: EffectAtom = {
  name: 'pHGradientLayers',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Continuous 1D vertical spectrum of rainbow hues from acid to base with universal indicator.',
  useWhen: ['Carefully pouring acid onto base with universal indicator in a graduated cylinder'],
  avoidWhen: ['Homogeneously stirred indicator solutions'],
  params: {
    topPH: { name: 'topPH', type: 'number', min: 0.0, max: 14.0, default: 1.0, description: 'pH at top of cylinder' },
    bottomPH: { name: 'bottomPH', type: 'number', min: 0.0, max: 14.0, default: 13.0, description: 'pH at bottom of cylinder' },
    diffusionWidth: { name: 'diffusionWidth', type: 'number', min: 0.1, max: 1.0, default: 0.4, description: 'Transition zone spread' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'pHGradientLayers', instanceId: `phgrad_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Universal Indicator Rainbow Cylinder', description: 'Red (acid) top through yellow, green, blue, to purple (base) bottom', params: { topPH: 2.0, bottomPH: 12.0, diffusionWidth: 0.5 } },
    { title: 'Gentle Neutral Buffer Layer', description: 'Sharp green neutral band sandwiched between acid and base', params: { topPH: 4.0, bottomPH: 10.0, diffusionWidth: 0.25 } }
  ],
  tests: ['ph_gradient_layers_universal']
};

export const fluorescenceUVAtom: EffectAtom = {
  name: 'fluorescenceUV',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'High-intensity emissive luminescence visible only under ultraviolet excitation lamp.',
  useWhen: ['UV torch directed at fluorescein, quinine tonic water, or rhodamine'],
  avoidWhen: ['Standard white-light daylight illumination'],
  params: {
    emissionColor: { name: 'emissionColor', type: 'color', default: '#22c55e', description: 'Fluorescent wavelength' },
    emissionIntensity: { name: 'emissionIntensity', type: 'number', min: 0.5, max: 4.0, default: 2.0, description: 'Glow radiance' },
    quenchWithHalide: { name: 'quenchWithHalide', type: 'boolean', default: false, description: 'Whether Cl- quenches glow' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk', 'surface'],
  mount(ctx, p) { return { atom: 'fluorescenceUV', instanceId: `fuv_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Quinine Blue Fluorescence', description: 'Tonic water brilliant blue fluorescence under 365 nm UV lamp', params: { emissionColor: '#38bdf8', emissionIntensity: 1.8, quenchWithHalide: false } },
    { title: 'Fluorescein Intense Green', description: 'Blinding yellow-green glow even at micromolar dilution', params: { emissionColor: '#4ade80', emissionIntensity: 3.0, quenchWithHalide: false } }
  ],
  tests: ['fluorescence_uv_emission']
};

export const chemiluminescenceAtom: EffectAtom = {
  name: 'chemiluminescence',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Transient chemical emission of light decaying exponentially without thermal heating.',
  useWhen: ['Luminol oxidation with ferricyanide or bleach', 'Glowstick oxalate ester reaction'],
  avoidWhen: ['Combustion flames or incandescence'],
  params: {
    glowColor: { name: 'glowColor', type: 'color', default: '#0284c7', description: 'Photon emission hue' },
    decayHalfLife_s: { name: 'decayHalfLife_s', type: 'number', min: 1.0, max: 60.0, default: 8.0, unit: 's', description: 'Decay half life' },
    peakLuminance: { name: 'peakLuminance', type: 'number', min: 0.5, max: 5.0, default: 3.0, description: 'Initial peak intensity' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk', 'surface'],
  mount(ctx, p) { return { atom: 'chemiluminescence', instanceId: `chemilum_${Date.now()}`, alive: true, custom: { ...p, time: 0 } }; },
  update(h, dt) { if (h.custom) h.custom.time += dt; },
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Luminol Deep Blue Flash', description: 'Eerie blue luminescence illuminating darkened lab', params: { glowColor: '#0284c7', decayHalfLife_s: 6.0, peakLuminance: 3.5 } },
    { title: 'Green Glowstick Chemiluminescence', description: 'Steady green light from bis(2,4,6-trichlorophenyl)oxalate', params: { glowColor: '#22c55e', decayHalfLife_s: 30.0, peakLuminance: 2.0 } }
  ],
  tests: ['chemiluminescence_exponential_decay']
};

export const oscillatingColorAtom: EffectAtom = {
  name: 'oscillatingColor',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Nonlinear chemical limit-cycle periodic color oscillation (Belousov-Zhabotinsky, Briggs-Rauscher).',
  useWhen: ['Belousov-Zhabotinsky reaction (red ferroin <-> blue ferriin)', 'Briggs-Rauscher clock'],
  avoidWhen: ['Standard monotonic reactions heading straight to equilibrium'],
  params: {
    period_s: { name: 'period_s', type: 'number', min: 2.0, max: 60.0, default: 15.0, unit: 's', description: 'Oscillation cycle period' },
    stateAColor: { name: 'stateAColor', type: 'color', default: '#dc2626', description: 'Reduced state color (Ferroin red)' },
    stateBColor: { name: 'stateBColor', type: 'color', default: '#2563eb', description: 'Oxidized state color (Ferriin blue)' },
    dampingFactor: { name: 'dampingFactor', type: 'number', min: 0.0, max: 0.1, default: 0.01, description: 'Slow decay over cycles' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'oscillatingColor', instanceId: `osc_${Date.now()}`, alive: true, custom: { ...p, t: 0 } }; },
  update(h, dt) { if (h.custom) h.custom.t += dt; },
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Belousov-Zhabotinsky Wave', description: 'Periodic pulsation between deep red and sky blue', params: { period_s: 12.0, stateAColor: '#dc2626', stateBColor: '#38bdf8', dampingFactor: 0.005 } },
    { title: 'Briggs-Rauscher Oscillating Clock', description: 'Tri-state oscillation: colorless to amber to blue-black repeating', params: { period_s: 18.0, stateAColor: '#d97706', stateBColor: '#1e1b4b', dampingFactor: 0.01 } }
  ],
  tests: ['oscillating_color_limit_cycle']
};

export const liesegangRingsAtom: EffectAtom = {
  name: 'liesegangRings',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Periodic concentric precipitate bands in gel obeying Jablczynski spacing law.',
  useWhen: ['AgNO3 diffusing into gelatin containing K2Cr2O7 forming silver chromate rings'],
  avoidWhen: ['Free liquid bulk without gel matrix'],
  params: {
    bandSpacingRatio: { name: 'bandSpacingRatio', type: 'number', min: 1.05, max: 1.5, default: 1.25, description: 'Jablczynski spacing ratio x_{n+1}/x_n' },
    ringColor: { name: 'ringColor', type: 'color', default: '#991b1b', description: 'Precipitate band color' },
    maxBands: { name: 'maxBands', type: 'number', min: 3, max: 15, default: 8, description: 'Number of visible bands' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'liesegangRings', instanceId: `liese_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Silver Chromate Liesegang Rings', description: 'Concentric red-brown rings in agar gel', params: { bandSpacingRatio: 1.25, ringColor: '#991b1b', maxBands: 7 } },
    { title: 'Lead Iodide Gel Bands', description: 'Golden hexagonal precipitate rings with geometric spacing', params: { bandSpacingRatio: 1.30, ringColor: '#eab308', maxBands: 6 } }
  ],
  tests: ['liesegang_jablczynski_spacing']
};

export const liquidLayerStratificationAtom: EffectAtom = {
  name: 'liquidLayerStratification',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Sharp meniscus dividing immiscible liquid layers with distinct refractive indices and densities.',
  useWhen: ['Oil on water', 'Dichloromethane under water', 'Separatory funnel extraction'],
  avoidWhen: ['Miscible single-phase aqueous solutions'],
  params: {
    lowerDensityColor: { name: 'lowerDensityColor', type: 'color', default: '#fef08a', description: 'Upper floating phase color' },
    higherDensityColor: { name: 'higherDensityColor', type: 'color', default: '#38bdf8', description: 'Lower sinking phase color' },
    interfaceSharpness: { name: 'interfaceSharpness', type: 'number', min: 0.5, max: 1.0, default: 0.98, description: 'Meniscus clarity' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['meniscus', 'bulk'],
  mount(ctx, p) { return { atom: 'liquidLayerStratification', instanceId: `strat_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Oil over Water', description: 'Yellow organic layer resting atop clear aqueous layer', params: { lowerDensityColor: '#fef08a', higherDensityColor: '#e0f2fe', interfaceSharpness: 0.98 } },
    { title: 'Iodine Extraction into CH2Cl2', description: 'Dense violet DCM layer sinking below pale yellow water', params: { lowerDensityColor: '#fef9c3', higherDensityColor: '#7e22ce', interfaceSharpness: 0.99 } }
  ],
  tests: ['liquid_layer_stratification']
};

// Legacy backwards-compatible atoms
export const liquidSwirlAtom: EffectAtom = {
  name: 'liquidSwirl',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Localized turbulent swirl and color plume when two liquids meet.',
  useWhen: ['Reagents with differing colors mix', 'Stirring rod or pour stream impacts liquid'],
  avoidWhen: ['Completely unmixed separate phases'],
  params: {
    speed: { name: 'speed', type: 'number', min: 0.1, max: 5.0, default: 1.2, unit: 'rad/s', description: 'Vortex speed' },
    diffusionRadius: { name: 'diffusionRadius', type: 'number', min: 0.05, max: 1.0, default: 0.35, unit: 'm', description: 'Radial extent' },
    color: { name: 'color', type: 'color', default: '#38bdf8', description: 'Reagent color' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['pourPoint', 'bulk', 'surface'],
  mount(ctx, p) {
    return {
      atom: 'liquidSwirl',
      instanceId: `swirl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      alive: true,
      custom: {
        ...p,
        elapsed: 0,
        speed: p.speed ?? 1.2,
        color: p.color ?? '#38bdf8',
        diffusionRadius: p.diffusionRadius ?? 0.35,
        mixProgress: 0
      }
    };
  },
  update(h, dt, s) {
    if (!h.alive) return;
    h.custom.elapsed += dt;
    h.custom.mixProgress = Math.min(1.0, (h.custom.mixProgress || 0) + dt * 0.5 * (h.custom.speed || 1.2));
  },
  writeBack(h, vessel) {
    if (!h.alive) return;
    if (h.custom.color && (h.custom.mixProgress || 0) > 0.15) {
      vessel.liquidColor = h.custom.color;
    }
  },
  dispose(h) {
    h.alive = false;
  },
  gallery: [
    { title: 'Gentle Swirl', description: 'Slow indicator diffusion', params: { speed: 0.8, diffusionRadius: 0.25, color: '#f43f5e' } },
    { title: 'Vigorous Agitation', description: 'Fast magnetic stir vortex', params: { speed: 3.5, diffusionRadius: 0.6, color: '#8b5cf6' } }
  ],
  tests: ['liquid_swirl_diffusion']
};

export const beerLambertFadeAtom: EffectAtom = {
  name: 'beerLambertFade',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Absorbance fading driven by species consumption.',
  useWhen: ['Colored chromophore ion is consumed'],
  avoidWhen: ['Precipitate formation without chromophores'],
  params: {
    startColor: { name: 'startColor', type: 'color', default: '#7c3aed', description: 'Initial color' },
    endColor: { name: 'endColor', type: 'color', default: '#f8fafc', description: 'Final color' },
    opticalPath_cm: { name: 'opticalPath_cm', type: 'number', min: 0.5, max: 15.0, default: 4.5, unit: 'cm', description: 'Path length' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) {
    return {
      atom: 'beerLambertFade',
      instanceId: `blf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      alive: true,
      custom: {
        ...p,
        elapsed: 0,
        startColor: p.startColor ?? '#7c3aed',
        endColor: p.endColor ?? '#f8fafc',
        duration_s: 4.0,
        fadeProgress: 0
      }
    };
  },
  update(h, dt, s) {
    if (!h.alive) return;
    h.custom.elapsed += dt;
    h.custom.fadeProgress = Math.min(1.0, h.custom.elapsed / (h.custom.duration_s || 4.0));
  },
  writeBack(h, vessel) {
    if (!h.alive) return;
    const prog = h.custom.fadeProgress || 0;
    if (prog >= 0.99) {
      vessel.liquidColor = h.custom.endColor;
    } else if (prog > 0.01) {
      vessel.liquidColor = prog > 0.5 ? h.custom.endColor : h.custom.startColor;
    }
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
  summary_en: 'Loss of optical clarity due to colloidal scattering.',
  useWhen: ['Milkiness or haziness develops'],
  avoidWhen: ['Clear solution'],
  params: {
    maxTurbidity: { name: 'maxTurbidity', type: 'number', min: 0.0, max: 1.0, default: 0.85, description: 'Max opacity' },
    hazeColor: { name: 'hazeColor', type: 'color', default: '#ffffff', description: 'Scatter color' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) {
    return {
      atom: 'turbidityShift',
      instanceId: `ts_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      alive: true,
      custom: {
        ...p,
        elapsed: 0,
        currentTurbidity: 0,
        targetTurbidity: p.maxTurbidity ?? 0.85
      }
    };
  },
  update(h, dt, s) {
    if (!h.alive) return;
    h.custom.elapsed += dt;
    const target = h.custom.targetTurbidity ?? 0.85;
    h.custom.currentTurbidity = Math.min(target, (h.custom.currentTurbidity || 0) + dt * 0.45);
  },
  writeBack(h, vessel) {
    if (!h.alive) return;
    vessel.turbidity = Math.max(vessel.turbidity || 0, h.custom.currentTurbidity || 0);
    if (h.custom.hazeColor) {
      vessel.liquidColor = h.custom.hazeColor;
    }
  },
  dispose(h) {
    h.alive = false;
  },
  gallery: [
    { title: 'Milky Barium Sulfate', description: 'Dense white Tyndall scattering', params: { maxTurbidity: 0.95, hazeColor: '#ffffff' } },
    { title: 'Sulfur Sol', description: 'Pale cream turbidity', params: { maxTurbidity: 0.75, hazeColor: '#fef08a' } }
  ],
  tests: ['turbidity_shift_progression']
};

export const fluorescenceGlowAtom: EffectAtom = {
  name: 'fluorescenceGlow',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Fluorescent emissive photon glow under excitation light.',
  useWhen: ['Fluorescein or quinine under UV lamp'],
  avoidWhen: ['Standard daylight non-fluorescent reagents'],
  params: {
    emissionColor: { name: 'emissionColor', type: 'color', default: '#22c55e', description: 'Wavelength color' },
    intensity: { name: 'intensity', type: 'number', min: 0.1, max: 3.0, default: 1.5, description: 'Luminance multiplier' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bulk', 'surface'],
  mount(ctx, p) { return { atom: 'fluorescenceGlow', instanceId: `flg_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Fluorescein Green', description: 'Brilliant green emission', params: { emissionColor: '#4ade80', intensity: 2.0 } },
    { title: 'Quinine Blue Glow', description: 'Sky blue fluorescence under blacklight', params: { emissionColor: '#38bdf8', intensity: 1.6 } }
  ],
  tests: ['fluorescence_glow']
};

export const liquidPhaseSplitAtom: EffectAtom = {
  name: 'liquidPhaseSplit',
  version: 1,
  category: 'liquidOptics',
  summary_en: 'Biphasic liquid separation showing two distinct immiscible layers.',
  useWhen: ['Extraction with organic solvent over water'],
  avoidWhen: ['Miscible single-phase aqueous solutions'],
  params: {
    topPhaseColor: { name: 'topPhaseColor', type: 'color', default: '#fef08a', description: 'Upper phase color' },
    topPhaseFraction: { name: 'topPhaseFraction', type: 'number', min: 0.05, max: 0.95, default: 0.4, description: 'Volume fraction' },
    meniscusSharpness: { name: 'meniscusSharpness', type: 'number', min: 0.5, max: 1.0, default: 0.95, description: 'Interface clarity' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['meniscus', 'bulk'],
  mount(ctx, p) { return { atom: 'liquidPhaseSplit', instanceId: `lps_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Iodine Extraction in Hexane', description: 'Purple organic layer atop clear water', params: { topPhaseColor: '#c084fc', topPhaseFraction: 0.35, meniscusSharpness: 0.95 } },
    { title: 'Ether Layer over Copper Solution', description: 'Clear organic layer over blue aqueous copper', params: { topPhaseColor: '#fefce8', topPhaseFraction: 0.5, meniscusSharpness: 0.98 } }
  ],
  tests: ['phase_split_meniscus']
};
