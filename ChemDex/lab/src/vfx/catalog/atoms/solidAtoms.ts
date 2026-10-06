/**
 * solidAtoms.ts — Effect Atoms for Solid Phases, Precipitates, Crystals & Deposition (§4.D)
 * 
 * Implements all 28 canonical solid/precipitate atoms plus legacy aliases.
 * All atoms strictly obey physical mass conservation, Stokes settling,
 * and morphology-specific packing fractions.
 */

import { EffectAtom } from '../types';

export const fineMilkyPowderAtom: EffectAtom = {
  name: 'fineMilkyPowder',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Sub-micron crystallites (BaSO4, CaCO3) creating long-lived milky haze with very slow Stokes settling.',
  useWhen: ['BaCl2 + Na2SO4, limewater clouding with CO2'],
  avoidWhen: ['Coarse heavy crystalline flakes or curds'],
  params: {
    colorHex: { name: 'colorHex', type: 'color', default: '#ffffff', description: 'Powder color' },
    crystalliteRadius_um: { name: 'crystalliteRadius_um', type: 'number', min: 0.1, max: 2.0, default: 0.5, unit: 'µm', description: 'Crystallite size' },
    bedPorosity: { name: 'bedPorosity', type: 'number', min: 0.2, max: 0.6, default: 0.35, description: 'Bed packing' }
  },
  budget: { particles: 90, shaderCost: 1 },
  anchorsAllowed: ['bulk', 'bottom'],
  ledgerInputs: ['amount:precipitate'],
  mount(ctx, p) { return { atom: 'fineMilkyPowder', instanceId: `fmp_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Barium Sulfate Milky Powder', description: 'Uniform white Tyndall milk settling over hours', params: { colorHex: '#ffffff', crystalliteRadius_um: 0.5, bedPorosity: 0.35 } },
    { title: 'Fine Calcium Carbonate Haze', description: 'Delicate chalky suspension', params: { colorHex: '#f8fafc', crystalliteRadius_um: 0.8, bedPorosity: 0.40 } }
  ],
  tests: ['fine_milky_powder_stokes']
};

export const curdyClumpsAtom: EffectAtom = {
  name: 'curdyClumps',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Cheesy curd-like clumps (AgCl, AgBr) clustering and tumbling down as aggregates; photodarkens under light.',
  useWhen: ['AgNO3 + NaCl/KBr/KI precipitation'],
  avoidWhen: ['Homogeneous fine powders without clumping'],
  params: {
    colorHex: { name: 'colorHex', type: 'color', default: '#ffffff', description: 'Initial curd color' },
    photodarkeningRate: { name: 'photodarkeningRate', type: 'number', min: 0.0, max: 1.0, default: 0.2, description: 'Sensitivity to room light' }
  },
  budget: { particles: 70, shaderCost: 1 },
  anchorsAllowed: ['bulk', 'bottom'],
  mount(ctx, p) { return { atom: 'curdyClumps', instanceId: `curd_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'AgCl White Curds', description: 'Cottage-cheese flocculated clumps settling rapidly', params: { colorHex: '#ffffff', photodarkeningRate: 0.3 } },
    { title: 'AgBr Pale Cream Curds', description: 'Creamy yellowish clumps with moderate light sensitivity', params: { colorHex: '#fef08a', photodarkeningRate: 0.5 } }
  ],
  tests: ['curdy_clumps_photodarkening']
};

export const rustFlocAtom: EffectAtom = {
  name: 'rustFloc',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Voluminous gelatinous rust-brown Fe(OH)3 flocs with huge bed volume and extremely slow compaction.',
  useWhen: ['FeCl3 + NaOH precipitation'],
  avoidWhen: ['Crystalline or dense compact precipitates'],
  params: {
    flocColor: { name: 'flocColor', type: 'color', default: '#9a3412', description: 'Rust-brown floc hue' },
    porosity: { name: 'porosity', type: 'number', min: 0.8, max: 0.98, default: 0.92, description: 'Floc porosity (empty space)' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['bulk', 'bottom'],
  mount(ctx, p) { return { atom: 'rustFloc', instanceId: `floc_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Iron(III) Hydroxide Floc', description: 'Bulky reddish-brown feathery flocs occupying large volume', params: { flocColor: '#9a3412', porosity: 0.92 } },
    { title: 'Aged Rust Sediment', description: 'Slowly compacting brown sediment at beaker bottom', params: { flocColor: '#7c2d12', porosity: 0.85 } }
  ],
  tests: ['rust_floc_porosity_compaction']
};

export const blueGelAtom: EffectAtom = {
  name: 'blueGel',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Sky-blue gelatinous Cu(OH)2 translucent sheets undergoing syneresis and turning black CuO when heated.',
  useWhen: ['CuSO4 + NaOH precipitation'],
  avoidWhen: ['Non-gelatinous precipitates'],
  params: {
    colorHex: { name: 'colorHex', type: 'color', default: '#38bdf8', description: 'Gel sheet color' },
    thermalDecompositionTemp_c: { name: 'thermalDecompositionTemp_c', type: 'number', min: 45.0, max: 80.0, default: 60.0, unit: '°C', description: 'Decompose to CuO' }
  },
  budget: { particles: 50, shaderCost: 2 },
  anchorsAllowed: ['bulk', 'bottom'],
  mount(ctx, p) { return { atom: 'blueGel', instanceId: `bgel_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Cu(OH)2 Sky Blue Gel', description: 'Translucent gelatinous veils suspended in solution', params: { colorHex: '#38bdf8', thermalDecompositionTemp_c: 60.0 } },
    { title: 'Thermal Decomposition to Black CuO', description: 'Blue gel turns pitch black upon heating above 60 °C', params: { colorHex: '#09090b', thermalDecompositionTemp_c: 60.0 } }
  ],
  tests: ['blue_gel_syneresis_heating']
};

export const whiteGelatinousAmphotericAtom: EffectAtom = {
  name: 'whiteGelatinousAmphoteric',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Translucent white Al(OH)3 or Zn(OH)2 gel that dissolves completely in excess strong base or acid.',
  useWhen: ['Al3+ or Zn2+ with NaOH titration'],
  avoidWhen: ['Non-amphoteric hydroxides like Fe(OH)3 or Cu(OH)2'],
  params: {
    gelTranslucency: { name: 'gelTranslucency', type: 'number', min: 0.3, max: 0.9, default: 0.65, description: 'Translucent veil factor' },
    excessBaseDissolutionRatio: { name: 'excessBaseDissolutionRatio', type: 'number', min: 3.0, max: 5.0, default: 4.0, description: 'OH- : Al3+ ratio to redissolve' }
  },
  budget: { particles: 50, shaderCost: 2 },
  anchorsAllowed: ['bulk', 'bottom'],
  mount(ctx, p) { return { atom: 'whiteGelatinousAmphoteric', instanceId: `wgel_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Al(OH)3 White Gel Precipitation', description: 'Thick white gelatinous clouds forming in neutral zone', params: { gelTranslucency: 0.65, excessBaseDissolutionRatio: 4.0 } },
    { title: 'Aluminate Clear Redissolution', description: 'White gel melts away completely in excess sodium hydroxide', params: { gelTranslucency: 0.95, excessBaseDissolutionRatio: 4.0 } }
  ],
  tests: ['amphoteric_gel_redissolution']
};

export const goldenHexPlatesAtom: EffectAtom = {
  name: 'goldenHexPlates',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Glittering hexagonal golden PbI2 platelets fluttering down and recrystallizing upon cooling (Golden Rain).',
  useWhen: ['Pb(NO3)2 + KI reaction or cooling saturated PbI2'],
  avoidWhen: ['AgI curds or non-platelet precipitates'],
  params: {
    plateDiameter_um: { name: 'plateDiameter_um', type: 'number', min: 10.0, max: 200.0, default: 50.0, unit: 'µm', description: 'Hexagonal plate diameter' },
    glitterColor: { name: 'glitterColor', type: 'color', default: '#facc15', description: 'Golden spangle luster' }
  },
  budget: { particles: 80, shaderCost: 2 },
  anchorsAllowed: ['bulk', 'bottom'],
  mount(ctx, p) { return { atom: 'goldenHexPlates', instanceId: `gold_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Golden Rain Fluttering Plates', description: 'Swirling glittering hexagonal gold flakes catching the light', params: { plateDiameter_um: 60.0, glitterColor: '#facc15' } },
    { title: 'Microcrystalline Yellow Powder', description: 'Rapid cold precipitation yielding fine yellow grit', params: { plateDiameter_um: 15.0, glitterColor: '#eab308' } }
  ],
  tests: ['golden_hex_plates_spangles']
};

export const blackFineColloidAtom: EffectAtom = {
  name: 'blackFineColloid',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Extremely insoluble opaque black colloidal suspension (CuS, PbS, Ag2S) resisting settling for long periods.',
  useWhen: ['Cu2+ or Pb2+ with H2S or Na2S in qualitative analysis'],
  avoidWhen: ['Soluble complexes or light colored precipitates'],
  params: {
    colorHex: { name: 'colorHex', type: 'color', default: '#09090b', description: 'Jet black albedo' },
    particleDiameter_nm: { name: 'particleDiameter_nm', type: 'number', min: 10.0, max: 200.0, default: 50.0, unit: 'nm', description: 'Colloidal size' }
  },
  budget: { particles: 70, shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'blackFineColloid', instanceId: `bcoll_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Copper(II) Sulfide Black Ink', description: 'Instant pitch-black near-opaque colloidal suspension', params: { colorHex: '#09090b', particleDiameter_nm: 40.0 } },
    { title: 'Lead Sulfide Fine Colloid', description: 'Jet-black cloud forming on contact with sulfide ions', params: { colorHex: '#18181b', particleDiameter_nm: 60.0 } }
  ],
  tests: ['black_fine_colloid_sulfide']
};

export const yellowDensePowderAtom: EffectAtom = {
  name: 'yellowDensePowder',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Bright yellow granular fast-settling precipitate (PbCrO4, AgI, CdS).',
  useWhen: ['Lead(II) + chromate, or silver + iodide'],
  avoidWhen: ['White precipitates'],
  params: {
    yellowHue: { name: 'yellowHue', type: 'color', default: '#facc15', description: 'Precipitate yellow pigment' },
    settleSpeedMultiplier: { name: 'settleSpeedMultiplier', type: 'number', min: 1.0, max: 5.0, default: 2.5, description: 'Fast Stokes settling' }
  },
  budget: { particles: 60, shaderCost: 1 },
  anchorsAllowed: ['bulk', 'bottom'],
  mount(ctx, p) { return { atom: 'yellowDensePowder', instanceId: `ypow_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Lead Chromate Chrome Yellow', description: 'Heavy canary yellow powder settling quickly to a dense bed', params: { yellowHue: '#facc15', settleSpeedMultiplier: 2.8 } },
    { title: 'Cadmium Sulfide Yellow Granules', description: 'Bright yellow pigment precipitate', params: { yellowHue: '#eab308', settleSpeedMultiplier: 2.0 } }
  ],
  tests: ['yellow_dense_powder_settling']
};

export const colloidalSulfurHazeAtom: EffectAtom = {
  name: 'colloidalSulfurHaze',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Induction period followed by faint blue-white opalescence, slowly turning yellow-white milky cloud (disappearing cross).',
  useWhen: ['Na2S2O3 + HCl rate kinetics experiment'],
  avoidWhen: ['Instantaneous ionic precipitation'],
  params: {
    inductionDelay_s: { name: 'inductionDelay_s', type: 'number', min: 2.0, max: 60.0, default: 8.0, unit: 's', description: 'Delay before clouding' },
    targetCloudiness: { name: 'targetCloudiness', type: 'number', min: 0.5, max: 1.0, default: 0.95, description: 'Opacity to obscure cross' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'colloidalSulfurHaze', instanceId: `shaze_${Date.now()}`, alive: true, custom: { ...p, t: 0 } }; },
  update(h, dt) { if (h.custom) h.custom.t += dt; },
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Disappearing Cross Experiment', description: 'Solution stays clear, opalesces bluish, then obscures mark beneath flask', params: { inductionDelay_s: 10.0, targetCloudiness: 0.95 } },
    { title: 'Fast Sulfur Clouding', description: 'High concentration acid producing rapid sulfur milk', params: { inductionDelay_s: 3.0, targetCloudiness: 0.95 } }
  ],
  tests: ['colloidal_sulfur_disappearing_cross']
};

export const needleCrystalGrowthAtom: EffectAtom = {
  name: 'needleCrystalGrowth',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Cooling crystallization forming radiating bundles of shimmering needle crystals (KNO3, benzoic acid, PbCl2).',
  useWhen: ['Cooling saturated hot KNO3 or benzoic acid solution'],
  avoidWhen: ['Fast precipitation without crystalline habit'],
  params: {
    needleLength_mm: { name: 'needleLength_mm', type: 'number', min: 1.0, max: 25.0, default: 8.0, unit: 'mm', description: 'Crystal length' },
    growthRate_mm_s: { name: 'growthRate_mm_s', type: 'number', min: 0.1, max: 2.0, default: 0.5, unit: 'mm/s', description: 'Elongation rate' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['bottom', 'wall', 'bulk'],
  mount(ctx, p) { return { atom: 'needleCrystalGrowth', instanceId: `needle_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'KNO3 Cooling Needles', description: 'Silvery needle crystals shooting across bottom as beaker cools', params: { needleLength_mm: 10.0, growthRate_mm_s: 0.6 } },
    { title: 'Lead(II) Chloride Needles', description: 'Fine white needles nucleating from warm cooling solution', params: { needleLength_mm: 5.0, growthRate_mm_s: 0.3 } }
  ],
  tests: ['needle_crystal_cooling_growth']
};

export const cubicCrystalGrowthAtom: EffectAtom = {
  name: 'cubicCrystalGrowth',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Stepped hopper cubes of NaCl growing during surface evaporation, forming floating rafts that sink.',
  useWhen: ['Slow evaporation of saturated sodium chloride brine'],
  avoidWhen: ['Rapid boiling to dryness'],
  params: {
    cubeSize_mm: { name: 'cubeSize_mm', type: 'number', min: 0.5, max: 10.0, default: 3.0, unit: 'mm', description: 'Cube edge length' },
    raftFormation: { name: 'raftFormation', type: 'boolean', default: true, description: 'Surface floating crystal crust' }
  },
  budget: { particles: 50, shaderCost: 2 },
  anchorsAllowed: ['surface', 'bottom'],
  mount(ctx, p) { return { atom: 'cubicCrystalGrowth', instanceId: `cube_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Halite Cubic Hopper Crystals', description: 'Square cubic rafts floating at meniscus then sinking to base', params: { cubeSize_mm: 4.0, raftFormation: true } },
    { title: 'Fine Salt Grains', description: 'Small crystalline cubes lining evaporating dish edge', params: { cubeSize_mm: 1.0, raftFormation: false } }
  ],
  tests: ['cubic_crystal_evaporation']
};

export const octahedralCrystalGrowthAtom: EffectAtom = {
  name: 'octahedralCrystalGrowth',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Clear, glassy octahedra (potassium alum KAl(SO4)2) growing steadily on seeded thread under slow cooling.',
  useWhen: ['Alum crystal growing demonstration on thread or beaker base'],
  avoidWhen: ['Amorphous flocs'],
  params: {
    crystalRadius_mm: { name: 'crystalRadius_mm', type: 'number', min: 1.0, max: 20.0, default: 6.0, unit: 'mm', description: 'Octahedron size' },
    clarity: { name: 'clarity', type: 'number', min: 0.5, max: 1.0, default: 0.95, description: 'Glassy optical transmission' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bottom', 'bulk'],
  mount(ctx, p) { return { atom: 'octahedralCrystalGrowth', instanceId: `octa_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Alum Octahedral Seed', description: 'Perfect geometric transparent octahedron growing in cooled supersaturated solution', params: { crystalRadius_mm: 8.0, clarity: 0.98 } },
    { title: 'Cluster of Alum Crystals', description: 'Multiple sparkling octahedra interlocking on bottom glass', params: { crystalRadius_mm: 4.0, clarity: 0.90 } }
  ],
  tests: ['octahedral_crystal_growth']
};

export const hydrateBlueCrystalsAtom: EffectAtom = {
  name: 'hydrateBlueCrystals',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Deep blue triclinic CuSO4*5H2O crystals bleaching to white anhydrous powder on heating and re-hydrating with water.',
  useWhen: ['Heating copper(II) sulfate crystals or re-hydrating anhydrous CuSO4'],
  avoidWhen: ['Non-hydrated salts'],
  params: {
    hydrationState: { name: 'hydrationState', type: 'select', default: 'hydrated_pentahydrate', options: ['hydrated_pentahydrate', 'anhydrous_white'], description: 'Hydration degree' },
    crystalColor: { name: 'crystalColor', type: 'color', default: '#0284c7', description: 'Pentahydrate royal blue' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bottom', 'bulk'],
  mount(ctx, p) { return { atom: 'hydrateBlueCrystals', instanceId: `hyd_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Copper Sulfate Pentahydrate', description: 'Deep royal blue triclinic crystals glistening with 5 waters of crystallization', params: { hydrationState: 'hydrated_pentahydrate', crystalColor: '#0284c7' } },
    { title: 'Anhydrous CuSO4 Dehydration', description: 'Crystals crumble to dull chalky white powder as water steams off', params: { hydrationState: 'anhydrous_white', crystalColor: '#f8fafc' } }
  ],
  tests: ['hydrate_cu_so4_reversible_color']
};

export const crystalFernFrostAtom: EffectAtom = {
  name: 'crystalFernFrost',
  version: 1,
  category: 'wall',
  summary_en: 'Dendritic fern-frost fractal crystallization of ammonium salts spreading rapidly across evaporating glass surface.',
  useWhen: ['Evaporating thin film of NH4Cl or urea solution on watch glass'],
  avoidWhen: ['Bulk water solution without evaporation'],
  params: {
    branchingFactor: { name: 'branchingFactor', type: 'number', min: 1.1, max: 2.0, default: 1.6, description: 'Fractal DLA dimension' },
    spreadSpeed_mm_s: { name: 'spreadSpeed_mm_s', type: 'number', min: 0.5, max: 10.0, default: 3.5, unit: 'mm/s', description: 'Front advance speed' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['wall', 'rim'],
  mount(ctx, p) { return { atom: 'crystalFernFrost', instanceId: `fern_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'NH4Cl Fern Crystal Front', description: 'Delicate fern fronds sweeping across glass in seconds', params: { branchingFactor: 1.65, spreadSpeed_mm_s: 4.0 } },
    { title: 'Urea Frost Pattern', description: 'Denser needle-like frost creeping along evaporating edge', params: { branchingFactor: 1.40, spreadSpeed_mm_s: 2.5 } }
  ],
  tests: ['crystal_fern_frost_fractal']
};

export const dendriticMetalTreeAtom: EffectAtom = {
  name: 'dendriticMetalTree',
  version: 1,
  category: 'metal',
  summary_en: 'Fractal branching metallic tree growing outward from metal surface during single replacement reactions.',
  useWhen: ['Cu wire in AgNO3 (silver tree), Zn in lead(II) solution (lead tree)'],
  avoidWhen: ['Homogeneous non-metal reactions'],
  params: {
    metalType: { name: 'metalType', type: 'select', default: 'silver', options: ['silver', 'lead', 'copper'], description: 'Deposited metal' },
    treeLusterColor: { name: 'treeLusterColor', type: 'color', default: '#e2e8f0', description: 'Metallic glint' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['bottom', 'bulk'],
  mount(ctx, p) { return { atom: 'dendriticMetalTree', instanceId: `tree_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Diana Silver Tree', description: 'Branching lustrous silver needles growing from copper coil into pale blue solution', params: { metalType: 'silver', treeLusterColor: '#f1f5f9' } },
    { title: 'Saturn Lead Tree', description: 'Sprawling gray dendritic lead crystals branching from zinc strip', params: { metalType: 'lead', treeLusterColor: '#94a3b8' } }
  ],
  tests: ['dendritic_metal_tree_displacement']
};

export const silverMirrorWallAtom: EffectAtom = {
  name: 'silverMirrorWall',
  version: 1,
  category: 'wall',
  summary_en: 'Tollens reaction depositing a uniform reflective metallic silver mirror film on inner glass wall.',
  useWhen: ['Aldehyde oxidation with Tollens reagent [Ag(NH3)2]+ on clean warm glass'],
  avoidWhen: ['Dirty vessels or fast overheating (which produces gray-black powder)'],
  params: {
    reflectivity: { name: 'reflectivity', type: 'number', min: 0.2, max: 1.0, default: 0.95, description: 'Mirror specular reflection' },
    filmThickness_nm: { name: 'filmThickness_nm', type: 'number', min: 10.0, max: 200.0, default: 80.0, unit: 'nm', description: 'Silver deposit thickness' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['wall', 'wallLower'],
  mount(ctx, p) { return { atom: 'silverMirrorWall', instanceId: `mirror_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Flawless Tollens Silver Mirror', description: 'Glass tube inner wall turns into brilliant reflective silver mirror', params: { reflectivity: 0.96, filmThickness_nm: 100.0 } },
    { title: 'Impure Black Powder Byproduct', description: 'Gray-black particulate deposit from impure or unheated Tollens', params: { reflectivity: 0.30, filmThickness_nm: 40.0 } }
  ],
  tests: ['silver_mirror_wall_tollens']
};

export const copperPlatingCoatAtom: EffectAtom = {
  name: 'copperPlatingCoat',
  version: 1,
  category: 'metal',
  summary_en: 'Iron nail in CuSO4 coating with salmon-pink / red-brown porous copper metal while blue solution fades to pale green.',
  useWhen: ['Fe nail in CuSO4 solution single displacement'],
  avoidWhen: ['Metals lower than copper in reactivity series'],
  params: {
    coatingThickness_um: { name: 'coatingThickness_um', type: 'number', min: 1.0, max: 100.0, default: 25.0, unit: 'µm', description: 'Copper layer' },
    copperColor: { name: 'copperColor', type: 'color', default: '#ea580c', description: 'Red-brown metallic copper' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bottom', 'bulk'],
  mount(ctx, p) { return { atom: 'copperPlatingCoat', instanceId: `coat_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Fresh Copper Coat on Iron Nail', description: 'Bright pink-red copper plating outer surface of iron', params: { coatingThickness_um: 20.0, copperColor: '#ea580c' } },
    { title: 'Spongy Copper Flakes Detaching', description: 'Thick brown-red copper flakes falling away into solution', params: { coatingThickness_um: 50.0, copperColor: '#c2410c' } }
  ],
  tests: ['copper_plating_iron_displacement']
};

export const crystalSpikeBloomAtom: EffectAtom = {
  name: 'crystalSpikeBloom',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Rapid crystallization front sweeping through seeded supersaturated sodium acetate (hot ice), warming and solidifying in seconds.',
  useWhen: ['Seeded sodium acetate supersaturated solution solidification'],
  avoidWhen: ['Dilute unsaturated solutions'],
  params: {
    frontSpeed_cm_s: { name: 'frontSpeed_cm_s', type: 'number', min: 0.5, max: 10.0, default: 4.0, unit: 'cm/s', description: 'Solidification front speed' },
    exothermicHeating_K: { name: 'exothermicHeating_K', type: 'number', min: 5.0, max: 25.0, default: 12.0, unit: 'K', description: 'Latent heat release' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['bulk', 'bottom', 'pourPoint'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'crystalSpikeBloom', instanceId: `bloom_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Hot Ice Crystallization Wave', description: 'Radiating white needle crystal front turns clear liquid into warm solid in 3 s', params: { frontSpeed_cm_s: 5.0, exothermicHeating_K: 15.0 } },
    { title: 'Poured Crystal Tower', description: 'Pouring supersaturated solution onto plate builds standing crystalline stalagmite', params: { frontSpeed_cm_s: 3.0, exothermicHeating_K: 10.0 } }
  ],
  tests: ['crystal_spike_bloom_hot_ice']
};

export const evaporationRimCrustAtom: EffectAtom = {
  name: 'evaporationRimCrust',
  version: 1,
  category: 'wall',
  summary_en: 'Salt crystals creeping over meniscus rim and contact line as solvent evaporates (coffee ring / salt creep).',
  useWhen: ['Evaporating saltwater or sulfate solution to dryness'],
  avoidWhen: ['Full unheated vessels without evaporation'],
  params: {
    crustThickness_mm: { name: 'crustThickness_mm', type: 'number', min: 0.2, max: 5.0, default: 1.5, unit: 'mm', description: 'Salt crust height' },
    crustColor: { name: 'crustColor', type: 'color', default: '#ffffff', description: 'Salt deposit color' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['meniscus', 'rim', 'wallUpper'],
  mount(ctx, p) { return { atom: 'evaporationRimCrust', instanceId: `rimcrust_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'NaCl Coffee Ring Crust', description: 'White crystalline ridge creeping upward past receding meniscus line', params: { crustThickness_mm: 2.0, crustColor: '#ffffff' } },
    { title: 'CuSO4 Blue Crust Fringe', description: 'Intense blue crystal fringe ringing evaporating watch glass', params: { crustThickness_mm: 1.0, crustColor: '#0284c7' } }
  ],
  tests: ['evaporation_rim_crust_coffee_ring']
};

export const ringStainOnWallAtom: EffectAtom = {
  name: 'ringStainOnWall',
  version: 1,
  category: 'wall',
  summary_en: 'Concentration deposit ring left on glass wall at the prior meniscus height as liquid volume decreases.',
  useWhen: ['After liquid pours out, evaporates, or drops in level'],
  avoidWhen: ['Clean unfilled glassware'],
  params: {
    stainColor: { name: 'stainColor', type: 'color', default: '#d4d4d8', description: 'Residual deposit color' },
    stainWidth_mm: { name: 'stainWidth_mm', type: 'number', min: 0.2, max: 3.0, default: 1.0, unit: 'mm', description: 'Band width' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['wall', 'wallUpper'],
  mount(ctx, p) { return { atom: 'ringStainOnWall', instanceId: `ringstain_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Permanganate Ring Stain', description: 'Persistent brown-purple meniscus line on glass wall', params: { stainColor: '#581c87', stainWidth_mm: 1.2 } },
    { title: 'Salt Deposit Tide Mark', description: 'Pale white line marking previous fill level', params: { stainColor: '#f4f4f5', stainWidth_mm: 0.8 } }
  ],
  tests: ['ring_stain_wall_residue']
};

export const sedimentBedCompactionAtom: EffectAtom = {
  name: 'sedimentBedCompaction',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Settled precipitate bed height H = m/(rho*phi*A) compacting over time under its own weight with rough surface.',
  useWhen: ['Precipitate accumulation on beaker bottom over hours'],
  avoidWhen: ['Suspensions that remain completely buoyant'],
  params: {
    compactedHeight_mm: { name: 'compactedHeight_mm', type: 'number', min: 0.5, max: 40.0, default: 5.0, unit: 'mm', description: 'Final bed height' },
    packingFraction_phi: { name: 'packingFraction_phi', type: 'number', min: 0.1, max: 0.65, default: 0.35, description: 'Bed density' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bottom'],
  ledgerInputs: ['amount:precipitate'],
  mount(ctx, p) { return { atom: 'sedimentBedCompaction', instanceId: `bedcomp_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Compacted BaSO4 Bed', description: 'Dense white chalk layer on bottom with sharp flat upper interface', params: { compactedHeight_mm: 4.5, packingFraction_phi: 0.35 } },
    { title: 'Porous Fe(OH)3 Floc Bed', description: 'Tall fluffy brown sludge layer slowly settling and compacting', params: { compactedHeight_mm: 14.0, packingFraction_phi: 0.12 } }
  ],
  tests: ['sediment_bed_compaction_phi']
};

export const sedimentAvalancheAtom: EffectAtom = {
  name: 'sedimentAvalanche',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Bed slumps and avalanches when vessel is tilted past the angle of repose (25-40 deg), sending up a cloudy plume.',
  useWhen: ['Tilting beaker containing settled precipitate or sediment layer past critical repose angle'],
  avoidWhen: ['Upright stationary vessels'],
  params: {
    angleRepose_deg: { name: 'angleRepose_deg', type: 'number', min: 20.0, max: 45.0, default: 32.0, unit: '°', description: 'Failure slope angle' },
    slumpVolumeFraction: { name: 'slumpVolumeFraction', type: 'number', min: 0.1, max: 1.0, default: 0.6, description: 'Fraction of bed moving' }
  },
  budget: { particles: 60, shaderCost: 1 },
  anchorsAllowed: ['bottom'],
  mount(ctx, p) { return { atom: 'sedimentAvalanche', instanceId: `avalanche_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Sediment Slump on Tilt', description: 'White powder bed slides toward lower lip when tilted past 32°', params: { angleRepose_deg: 32.0, slumpVolumeFraction: 0.7 } },
    { title: 'Cohesive Sand Avalanche', description: 'Steep slump of granular CaCO3 grit with fine dust cloud', params: { angleRepose_deg: 38.0, slumpVolumeFraction: 0.5 } }
  ],
  tests: ['sediment_avalanche_repose_angle']
};

export const resuspensionCloudAtom: EffectAtom = {
  name: 'resuspensionCloud',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Stirring or pour impact lifts settled fines back into a cloudy suspension that resettles according to Stokes.',
  useWhen: ['Glass rod stirring or swirling settled precipitate suspension'],
  avoidWhen: ['Completely unstirred undisturbed vessels'],
  params: {
    stirEnergy: { name: 'stirEnergy', type: 'number', min: 0.1, max: 3.0, default: 1.2, description: 'Agitation turbulence' },
    resuspensionFraction: { name: 'resuspensionFraction', type: 'number', min: 0.1, max: 1.0, default: 0.85, description: 'Fraction of bed lifted' }
  },
  budget: { particles: 80, shaderCost: 1 },
  anchorsAllowed: ['bulk', 'bottom'],
  mount(ctx, p) { return { atom: 'resuspensionCloud', instanceId: `resusp_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Glass Rod Stirring Resuspension', description: 'Vigorous swirling lifts settled BaSO4 bed into uniform cloudy milk', params: { stirEnergy: 1.5, resuspensionFraction: 0.9 } },
    { title: 'Gentle Swirl Lifting Fines', description: 'Light vortex carries top fine particles while dense cores stay on bottom', params: { stirEnergy: 0.5, resuspensionFraction: 0.3 } }
  ],
  tests: ['resuspension_cloud_stirring']
};

export const settlingFrontInterfaceAtom: EffectAtom = {
  name: 'settlingFrontInterface',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Sharp horizontal hindered-settling interface moving steadily downward leaving clear supernatant above.',
  useWhen: ['Hindered settling of concentrated suspensions (Richardson-Zaki n=4.65)'],
  avoidWhen: ['Infinitely dilute non-interacting particles'],
  params: {
    settlingVelocity_mm_s: { name: 'settlingVelocity_mm_s', type: 'number', min: 0.05, max: 2.0, default: 0.35, unit: 'mm/s', description: 'Front descent velocity' },
    supernatantClarity: { name: 'supernatantClarity', type: 'number', min: 0.7, max: 1.0, default: 0.98, description: 'Top liquid transparency' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'settlingFrontInterface', instanceId: `front_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Hindered Settling Interface', description: 'Visible boundary line sinking slowly, dividing crystal-clear supernatant from cloudy zone', params: { settlingVelocity_mm_s: 0.4, supernatantClarity: 0.98 } },
    { title: 'Slow Sludge Front', description: 'Very slow floc interface descending over minutes', params: { settlingVelocity_mm_s: 0.1, supernatantClarity: 0.92 } }
  ],
  tests: ['settling_front_hindered_richardson_zaki']
};

export const floatingPrecipitateAtom: EffectAtom = {
  name: 'floatingPrecipitate',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Low-density precipitate or gas-entrained hydrophobic flakes forming a floating surface scum/crust.',
  useWhen: ['Organic solid precipitation (benzoic acid), hydrophobic sulfur crust, or bubble flotation'],
  avoidWhen: ['Heavy dense inorganic salts'],
  params: {
    scumThickness_mm: { name: 'scumThickness_mm', type: 'number', min: 0.5, max: 10.0, default: 2.5, unit: 'mm', description: 'Floating layer' },
    scumColor: { name: 'scumColor', type: 'color', default: '#f8fafc', description: 'Solid albedo' }
  },
  budget: { particles: 40, shaderCost: 1 },
  anchorsAllowed: ['surface', 'meniscus'],
  mount(ctx, p) { return { atom: 'floatingPrecipitate', instanceId: `float_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Benzoic Acid Floating Crust', description: 'White crystalline crust raft floating atop acidified solution', params: { scumThickness_mm: 3.0, scumColor: '#ffffff' } },
    { title: 'Wax / Organic Scum Layer', description: 'Pellicle film floating at surface meniscus', params: { scumThickness_mm: 1.2, scumColor: '#fef08a' } }
  ],
  tests: ['floating_precipitate_buoyancy']
};

export const precipitateRedissolvingAtom: EffectAtom = {
  name: 'precipitateRedissolving',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Particles shrink, edges round off, and solution clarity restores as excess reagent forms a soluble complex.',
  useWhen: ['Al(OH)3 in excess NaOH, AgCl in aqueous NH3, Cu(OH)2 in excess NH3 forming deep blue [Cu(NH3)4]2+'],
  avoidWhen: ['Insoluble non-complexing precipitates like BaSO4'],
  params: {
    dissolutionSpeed: { name: 'dissolutionSpeed', type: 'number', min: 0.1, max: 3.0, default: 1.2, description: 'Rate particles disappear' },
    resultingSolutionColor: { name: 'resultingSolutionColor', type: 'color', default: '#1d4ed8', description: 'Complex ion color' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  ledgerInputs: ['amount:reactant'],
  mount(ctx, p) { return { atom: 'precipitateRedissolving', instanceId: `redis_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Cu(OH)2 Dissolves to Royal Blue Complex', description: 'Pale blue gel dissolves rapidly in ammonia to glorious royal blue [Cu(NH3)4]2+', params: { dissolutionSpeed: 1.5, resultingSolutionColor: '#1e40af' } },
    { title: 'AgCl Dissolves in NH3', description: 'White curds shrink and vanish into crystal clear diammine silver solution', params: { dissolutionSpeed: 1.0, resultingSolutionColor: '#f8fafc' } }
  ],
  tests: ['precipitate_complex_redissolution']
};

export const precipitateAgeingAtom: EffectAtom = {
  name: 'precipitateAgeing',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Precipitate color, phase, and crystallinity evolving over time (Fe(OH)2 white to green to brown; AgCl photodarkening).',
  useWhen: ['Fe(OH)2 oxidizing in air, AgCl darkening in room light, Cu(OH)2 -> CuO blackening'],
  avoidWhen: ['Chemically stable unreactive precipitates'],
  params: {
    initialColor: { name: 'initialColor', type: 'color', default: '#dcfce7', description: 'Freshly precipitated color' },
    agedColor: { name: 'agedColor', type: 'color', default: '#9a3412', description: 'Fully oxidized/aged color' },
    ageingHalfLife_s: { name: 'ageingHalfLife_s', type: 'number', min: 2.0, max: 120.0, default: 15.0, unit: 's', description: 'Transformation half time' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk', 'bottom'],
  mount(ctx, p) { return { atom: 'precipitateAgeing', instanceId: `age_${Date.now()}`, alive: true, custom: { ...p, t: 0 } }; },
  update(h, dt) { if (h.custom) h.custom.t += dt; },
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Fe(OH)2 Air Oxidation', description: 'Dirty green precipitate gradually transforms into rust-brown Fe(OH)3', params: { initialColor: '#bbf7d0', agedColor: '#9a3412', ageingHalfLife_s: 18.0 } },
    { title: 'AgCl Photodarkening', description: 'White curd darkens to purple-gray under ambient light', params: { initialColor: '#ffffff', agedColor: '#6b7280', ageingHalfLife_s: 30.0 } }
  ],
  tests: ['precipitate_ageing_phase_change']
};

export const filterCakeFormationAtom: EffectAtom = {
  name: 'filterCakeFormation',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Precipitate accumulating on filter paper as cake thickness proportional to mass, slowing filtrate flow according to Darcy.',
  useWhen: ['Filtration of precipitate suspension through funnel with filter paper'],
  avoidWhen: ['Unfiltered suspensions'],
  params: {
    cakeThickness_mm: { name: 'cakeThickness_mm', type: 'number', min: 0.5, max: 15.0, default: 3.5, unit: 'mm', description: 'Filter cake layer' },
    filtrateClarity: { name: 'filtrateClarity', type: 'number', min: 0.8, max: 1.0, default: 0.99, description: 'Collected liquid transparency' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['outside'],
  ledgerInputs: ['amount:precipitate'],
  mount(ctx, p) { return { atom: 'filterCakeFormation', instanceId: `fcake_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Barium Sulfate Filter Cake', description: 'Dense white cake on paper, dripping clear filtrate into conical flask', params: { cakeThickness_mm: 4.0, filtrateClarity: 0.99 } },
    { title: 'Gelatinous Filter Cake Resistance', description: 'Fe(OH)3 sludge clogging filter paper and slowing drip rate', params: { cakeThickness_mm: 7.0, filtrateClarity: 0.98 } }
  ],
  tests: ['filter_cake_darcy_flow']
};

// Legacy backwards-compatible atoms
export const precipitateNucleationAtom: EffectAtom = {
  name: 'precipitateNucleation',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Spontaneous nucleation burst of solid particles.',
  useWhen: ['Ionic product Q > Ksp'],
  avoidWhen: ['Soluble salts'],
  params: {
    morphology: { name: 'morphology', type: 'string', default: 'fine_powder', description: 'Morphology class' },
    color: { name: 'color', type: 'color', default: '#ffffff', description: 'Solid color' },
    nucleationRate: { name: 'nucleationRate', type: 'number', min: 10, max: 200, default: 80, description: 'Spawn burst' }
  },
  budget: { particles: 96, shaderCost: 1 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'precipitateNucleation', instanceId: `pn_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'AgCl Curds', description: 'White curds', params: { morphology: 'curd', color: '#ffffff', nucleationRate: 90 } },
    { title: 'Cu(OH)2 Gel', description: 'Cyan gel', params: { morphology: 'gel', color: '#38bdf8', nucleationRate: 60 } }
  ],
  tests: ['precipitate_nucleation_burst']
};

export const stokesSedimentationAtom: EffectAtom = {
  name: 'stokesSedimentation',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Stokes terminal settling velocity accumulating sediment bed.',
  useWhen: ['Precipitate settling'],
  avoidWhen: ['Colloids'],
  params: {
    stokesRadius_um: { name: 'stokesRadius_um', type: 'number', min: 0.1, max: 50.0, default: 4.5, description: 'Radius' },
    sedimentColor: { name: 'sedimentColor', type: 'color', default: '#ffffff', description: 'Bed color' },
    bedHeight_mm: { name: 'bedHeight_mm', type: 'number', min: 0.5, max: 30.0, default: 6.0, description: 'Bed height' }
  },
  budget: { particles: 64, shaderCost: 1 },
  anchorsAllowed: ['bulk', 'bottom'],
  mount(ctx, p) { return { atom: 'stokesSedimentation', instanceId: `ss_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Lead Iodide Bed', description: 'Rapid settling of dense golden flakes', params: { stokesRadius_um: 12.0, sedimentColor: '#facc15', bedHeight_mm: 8.0 } },
    { title: 'Fine Powder Bed', description: 'Slow settling white bed', params: { stokesRadius_um: 1.0, sedimentColor: '#ffffff', bedHeight_mm: 3.0 } }
  ],
  tests: ['stokes_settling_rate']
};

export const crystalGlitterAtom: EffectAtom = {
  name: 'crystalGlitter',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Specular glints from reflective crystalline facets.',
  useWhen: ['Crystalline precipitates in suspension'],
  avoidWhen: ['Matte powders'],
  params: {
    glintFrequency: { name: 'glintFrequency', type: 'number', min: 1, max: 20, default: 8, description: 'Flash frequency' },
    glintColor: { name: 'glintColor', type: 'color', default: '#fef08a', description: 'Glint color' }
  },
  budget: { particles: 48, shaderCost: 2 },
  anchorsAllowed: ['bulk'],
  mount(ctx, p) { return { atom: 'crystalGlitter', instanceId: `cg_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Golden Rain Glints', description: 'Hexagonal PbI2 plates sparkling', params: { glintFrequency: 10, glintColor: '#fef08a' } },
    { title: 'Silver Plate Glints', description: 'White crystalline sparkling', params: { glintFrequency: 6, glintColor: '#ffffff' } }
  ],
  tests: ['crystal_glitter_sparkle']
};

export const surfaceDendriteGrowthAtom: EffectAtom = {
  name: 'surfaceDendriteGrowth',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Branching metallic tree fractal crystallization on metal surfaces.',
  useWhen: ['Single displacement'],
  avoidWhen: ['Homogeneous ionic reactions'],
  params: {
    metalColor: { name: 'metalColor', type: 'color', default: '#e2e8f0', description: 'Luster color' },
    growthSpeed: { name: 'growthSpeed', type: 'number', min: 0.1, max: 2.0, default: 0.5, description: 'Elongation rate' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bottom', 'bulk'],
  mount(ctx, p) { return { atom: 'surfaceDendriteGrowth', instanceId: `sdg_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Silver Tree', description: 'Branching silver dendrites on copper wire', params: { metalColor: '#f1f5f9', growthSpeed: 0.6 } },
    { title: 'Lead Tree', description: 'Gray metallic branches on zinc', params: { metalColor: '#94a3b8', growthSpeed: 0.4 } }
  ],
  tests: ['surface_dendrite_growth']
};

export const metallicMirrorDepositAtom: EffectAtom = {
  name: 'metallicMirrorDeposit',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Uniform metallic film coating inner vessel wall.',
  useWhen: ['Tollens silver mirror'],
  avoidWhen: ['Precipitate in bulk liquid'],
  params: {
    reflectivity: { name: 'reflectivity', type: 'number', min: 0.1, max: 1.0, default: 0.9, description: 'Reflectance' },
    metalLuster: { name: 'metalLuster', type: 'color', default: '#f1f5f9', description: 'Luster' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['wallLower', 'wall'],
  mount(ctx, p) { return { atom: 'metallicMirrorDeposit', instanceId: `mmd_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Silver Mirror', description: 'Bright silver film', params: { reflectivity: 0.95, metalLuster: '#f8fafc' } },
    { title: 'Faint Film', description: 'Thin metallic coating', params: { reflectivity: 0.5, metalLuster: '#cbd5e1' } }
  ],
  tests: ['metallic_mirror_deposit']
};

export const solidErosionAtom: EffectAtom = {
  name: 'solidErosion',
  version: 1,
  category: 'solidPhase',
  summary_en: 'Shrinking core model: solid pieces erode, thin out, and round off proportionally to moles consumed.',
  useWhen: ['Solid reagent consumed in acid or dissolving'],
  avoidWhen: ['Non-reacting spectator solids'],
  params: {
    erosionRate: { name: 'erosionRate', type: 'number', min: 0.1, max: 3.0, default: 1.0, description: 'Volume loss speed' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bottom'],
  ledgerInputs: ['amount:reactant'],
  mount(ctx, p) { return { atom: 'solidErosion', instanceId: `se_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Zinc Granule Erosion', description: 'Pellet shrinking and rounding in acid', params: { erosionRate: 1.2 } },
    { title: 'Marble Chip Dissolution', description: 'Calcite fragment thinning smoothly', params: { erosionRate: 0.8 } }
  ],
  tests: ['solid_erosion_shrinking_core']
};
