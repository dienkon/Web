/**
 * metalAtoms.ts — Effect Atoms for Metal & Solid-Surface Reactions (§4.E)
 * 
 * Implements 14 concrete physical metal/surface atoms.
 * Models shrinking core surface area (A ∝ n^(2/3)), passivation oxide barriers,
 * alkali metal molten sphere kinematics, and galvanic displacement.
 */

import { EffectAtom } from '../types';

export const metalDissolveWithBubblesAtom: EffectAtom = {
  name: 'metalDissolveWithBubbles',
  version: 1,
  category: 'metal',
  summary_en: 'Acid attacks metal surface (Zn, Mg, Al): surface roughens, shrinks, and releases vigorous H2 bubble streams.',
  useWhen: ['Metals reacting with acid evolving hydrogen gas'],
  avoidWhen: ['Noble metals (Cu, Ag, Au) in non-oxidizing acid'],
  params: {
    metalFormula: { name: 'metalFormula', type: 'string', default: 'Zn(s)', description: 'Metal reagent' },
    bubbleIntensity: { name: 'bubbleIntensity', type: 'number', min: 0.2, max: 3.0, default: 1.5, description: 'Gas vigor' }
  },
  budget: { particles: 60, shaderCost: 1 },
  anchorsAllowed: ['bottom', 'bulk'],
  ledgerInputs: ['amount:reactant'],
  mount(ctx, p) { return { atom: 'metalDissolveWithBubbles', instanceId: `mdiss_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Zinc Granule in HCl', description: 'Zinc surface grey and pitted, releasing continuous streams of H2 bubbles', params: { metalFormula: 'Zn(s)', bubbleIntensity: 1.4 } },
    { title: 'Magnesium Ribbon Fizzing', description: 'Mg strip fluttering vigorously as bubbles detach', params: { metalFormula: 'Mg(s)', bubbleIntensity: 2.5 } }
  ],
  tests: ['metal_dissolve_bubbles_h2']
};

export const pittingAndEtchingAtom: EffectAtom = {
  name: 'pittingAndEtching',
  version: 1,
  category: 'metal',
  summary_en: 'Microscopic surface roughening, dark etch pit nucleation, and edge rounding on metal surface.',
  useWhen: ['Initial stages of acid attack on polished metal sheets or nails'],
  avoidWhen: ['Unreactive metals or rapid full dissolution'],
  params: {
    pitDensity: { name: 'pitDensity', type: 'number', min: 0.1, max: 2.0, default: 0.9, description: 'Pitting frequency' },
    edgeRoundingSpeed: { name: 'edgeRoundingSpeed', type: 'number', min: 0.1, max: 1.0, default: 0.4, description: 'Geometry erosion' }
  },
  budget: { shaderCost: 2 },
  anchorsAllowed: ['bottom'],
  mount(ctx, p) { return { atom: 'pittingAndEtching', instanceId: `pit_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Steel Nail Acid Etching', description: 'Polished silver iron nail turns dull gray with micro-pitting in acid', params: { pitDensity: 1.0, edgeRoundingSpeed: 0.3 } },
    { title: 'Aluminum Foil Local Pitting', description: 'Dark pinholes forming through aluminum foil sheet', params: { pitDensity: 1.8, edgeRoundingSpeed: 0.7 } }
  ],
  tests: ['metal_pitting_and_etching']
};

export const sodiumDartRunAtom: EffectAtom = {
  name: 'sodiumDartRun',
  version: 1,
  category: 'metal',
  summary_en: 'Sodium metal melts into a shiny silvery sphere (mp 98 °C), skitters rapidly on water on a H2 gas cushion, hissing with phenolphthalein trails.',
  useWhen: ['Sodium piece dropped into water'],
  avoidWhen: ['Heavy non-melting metals'],
  params: {
    pieceMass_g: { name: 'pieceMass_g', type: 'number', min: 0.05, max: 1.0, default: 0.2, unit: 'g', description: 'Sodium piece size' },
    phenolphthaleinTrail: { name: 'phenolphthaleinTrail', type: 'boolean', default: true, description: 'Pink trail in basic water' }
  },
  budget: { particles: 60, shaderCost: 2 },
  anchorsAllowed: ['surface'],
  ledgerInputs: ['temperature'],
  mount(ctx, p) { return { atom: 'sodiumDartRun', instanceId: `nadart_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Molten Sodium Skittering', description: 'Silvery sphere racing across surface leaving vibrant magenta swirls in phenolphthalein', params: { pieceMass_g: 0.2, phenolphthaleinTrail: true } },
    { title: 'Small Sodium Darting Bead', description: 'Tiny rapid molten bead hissing with white H2 smoke trail', params: { pieceMass_g: 0.08, phenolphthaleinTrail: false } }
  ],
  tests: ['sodium_dart_run_molten_sphere']
};

export const potassiumLilacFlameAtom: EffectAtom = {
  name: 'potassiumLilacFlame',
  version: 1,
  category: 'combustion',
  summary_en: 'Potassium reacts violently with water, melting instantly and igniting with a vivid lilac/violet flame and vigorous crackling spray.',
  useWhen: ['Potassium metal piece dropped into water'],
  avoidWhen: ['Sodium (which burns yellow only when trapped) or Lithium'],
  params: {
    flameColorHex: { name: 'flameColorHex', type: 'color', default: '#c084fc', description: 'Lilac emission flame' },
    violenceFactor: { name: 'violenceFactor', type: 'number', min: 1.0, max: 4.0, default: 2.8, description: 'Reaction vigor' }
  },
  budget: { particles: 80, shaderCost: 2 },
  anchorsAllowed: ['surface', 'flame'],
  mount(ctx, p) { return { atom: 'potassiumLilacFlame', instanceId: `kflame_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Potassium Violent Lilac Fire', description: 'Instant ignition upon water contact with brilliant violet-lilac flame and pop', params: { flameColorHex: '#c084fc', violenceFactor: 3.0 } },
    { title: 'Mild Potassium Sizzle', description: 'Micro-fragment skating with lavender spark spray', params: { flameColorHex: '#d8b4fe', violenceFactor: 1.8 } }
  ],
  tests: ['potassium_lilac_flame_water']
};

export const calciumSlowGasMilkyAtom: EffectAtom = {
  name: 'calciumSlowGasMilky',
  version: 1,
  category: 'metal',
  summary_en: 'Calcium metal sinks to bottom, evolves steady H2 bubbles, warms moderately, and turns water milky with Ca(OH)2 suspension.',
  useWhen: ['Calcium metal turnings placed into water'],
  avoidWhen: ['Floating alkali metals'],
  params: {
    bubbleRate: { name: 'bubbleRate', type: 'number', min: 2.0, max: 30.0, default: 12.0, description: 'Hydrogen evolution' },
    milkinessRate: { name: 'milkinessRate', type: 'number', min: 0.1, max: 1.0, default: 0.6, description: 'Ca(OH)2 turbidity' }
  },
  budget: { particles: 60, shaderCost: 1 },
  anchorsAllowed: ['bottom', 'bulk'],
  mount(ctx, p) { return { atom: 'calciumSlowGasMilky', instanceId: `camilk_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Calcium in Water', description: 'Gray granule sitting on bottom effervescing steadily into warm milky limewater', params: { bubbleRate: 15.0, milkinessRate: 0.7 } },
    { title: 'Mild Calcium Effervescence', description: 'Slow bubbling with gradual white turbidity onset', params: { bubbleRate: 6.0, milkinessRate: 0.3 } }
  ],
  tests: ['calcium_metal_slow_gas_milky']
};

export const aluminumFoilInNaOHAtom: EffectAtom = {
  name: 'aluminumFoilInNaOH',
  version: 1,
  category: 'metal',
  summary_en: 'Induction period while protective Al2O3 layer dissolves, followed by vigorous exothermic H2 gas, tearing foil into shreds.',
  useWhen: ['Aluminum foil in concentrated sodium hydroxide solution'],
  avoidWhen: ['Aluminum without oxide stripping'],
  params: {
    inductionTime_s: { name: 'inductionTime_s', type: 'number', min: 2.0, max: 30.0, default: 6.0, unit: 's', description: 'Oxide film dissolution delay' },
    peakGasVigor: { name: 'peakGasVigor', type: 'number', min: 1.0, max: 5.0, default: 3.5, description: 'Maximum boiling-like gas rate' }
  },
  budget: { particles: 90, shaderCost: 2 },
  anchorsAllowed: ['bottom', 'bulk'],
  mount(ctx, p) { return { atom: 'aluminumFoilInNaOH', instanceId: `alnaoh_${Date.now()}`, alive: true, custom: { ...p, t: 0 } }; },
  update(h, dt) { if (h.custom) h.custom.t += dt; },
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Aluminum Foil Eruption in Lye', description: 'Foil sits quiet for 6 s, then violently boils with white foam and shreds apart', params: { inductionTime_s: 6.0, peakGasVigor: 4.0 } },
    { title: 'Dilute NaOH Induction Delay', description: 'Long 15 s quiet induction before steady effervescence begins', params: { inductionTime_s: 15.0, peakGasVigor: 2.0 } }
  ],
  tests: ['aluminum_naoh_induction_delay']
};

export const aluminumCopperChlorideDisplacementAtom: EffectAtom = {
  name: 'aluminumCopperChlorideDisplacement',
  version: 1,
  category: 'metal',
  summary_en: 'Al in CuCl2: chloride attacks oxide, liberating intense exothermic reaction with red-brown spongy copper deposit and boiling H2.',
  useWhen: ['Al foil placed in aqueous copper(II) chloride'],
  avoidWhen: ['CuSO4 where sulfate fails to pit the aluminum oxide layer'],
  params: {
    copperPlumeSpreading: { name: 'copperPlumeSpreading', type: 'number', min: 0.2, max: 2.0, default: 1.2, description: 'Spongy copper accumulation' },
    boilingIntensity: { name: 'boilingIntensity', type: 'number', min: 0.5, max: 3.0, default: 2.0, description: 'Exothermic heat & bubbles' }
  },
  budget: { particles: 80, shaderCost: 2 },
  anchorsAllowed: ['bottom', 'bulk'],
  mount(ctx, p) { return { atom: 'aluminumCopperChlorideDisplacement', instanceId: `alcucl2_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Violent Al + CuCl2 Displacement', description: 'Spongy red copper erupts as foil dissolves furiously and steam boils', params: { copperPlumeSpreading: 1.4, boilingIntensity: 2.5 } },
    { title: 'Moderate CuCl2 Etching', description: 'Steady copper deposition with warm bubbles', params: { copperPlumeSpreading: 0.8, boilingIntensity: 1.2 } }
  ],
  tests: ['aluminum_cucl2_chloride_pitting']
};

export const coppernitricMetalConsumeAtom: EffectAtom = {
  name: 'coppernitricMetalConsume',
  version: 1,
  category: 'metal',
  summary_en: 'Copper metal wire shrinks smoothly while solution turns deep green-blue and brown NO2 gas evolves furiously.',
  useWhen: ['Cu wire or turnings in conc. HNO3'],
  avoidWhen: ['Non-oxidizing acids where copper does not react'],
  params: {
    wireShrinkRate_mm_s: { name: 'wireShrinkRate_mm_s', type: 'number', min: 0.05, max: 1.0, default: 0.25, unit: 'mm/s', description: 'Diameter reduction rate' },
    solutionGreenDepth: { name: 'solutionGreenDepth', type: 'number', min: 0.2, max: 2.0, default: 1.4, description: 'Aqueous Cu(NO3)2 green color' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bottom', 'bulk'],
  ledgerInputs: ['amount:reactant'],
  mount(ctx, p) { return { atom: 'coppernitricMetalConsume', instanceId: `cuhno3_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Copper Wire Consumption in Conc HNO3', description: 'Wire thins rapidly, turning solution deep emerald green under brown fume plume', params: { wireShrinkRate_mm_s: 0.3, solutionGreenDepth: 1.5 } },
    { title: 'Dilute Nitric Copper Dissolution', description: 'Slower wire shrinking turning solution sky blue', params: { wireShrinkRate_mm_s: 0.08, solutionGreenDepth: 0.7 } }
  ],
  tests: ['copper_conc_nitric_consumption']
};

export const passivationAtom: EffectAtom = {
  name: 'passivation',
  version: 1,
  category: 'metal',
  summary_en: 'Passivation of Fe or Al in concentrated HNO3: brief microscopic fizz then complete cessation of reaction due to dense oxide film.',
  useWhen: ['Iron or aluminum immersed in cold concentrated nitric acid'],
  avoidWhen: ['Dilute acids or reactive metals like magnesium'],
  params: {
    initialFizzDuration_s: { name: 'initialFizzDuration_s', type: 'number', min: 0.2, max: 3.0, default: 1.0, unit: 's', description: 'Brief initial bubble burst' },
    passivatedLuster: { name: 'passivatedLuster', type: 'color', default: '#94a3b8', description: 'Dull passivated film luster' }
  },
  budget: { particles: 20, shaderCost: 1 },
  anchorsAllowed: ['bottom'],
  mount(ctx, p) { return { atom: 'passivation', instanceId: `pass_${Date.now()}`, alive: true, custom: { ...p, t: 0 } }; },
  update(h, dt) { if (h.custom) h.custom.t += dt; },
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Iron Passivation in Conc HNO3', description: 'Tiny 1-second fizz then absolute stillness: metal is chemically shielded', params: { initialFizzDuration_s: 1.0, passivatedLuster: '#94a3b8' } },
    { title: 'Aluminum Passivation', description: 'Barely perceptible micro-bubbles before impenetrable oxide forms', params: { initialFizzDuration_s: 0.5, passivatedLuster: '#cbd5e1' } }
  ],
  tests: ['passivation_iron_aluminum_nitric']
};

export const tarnishAndPatinaAtom: EffectAtom = {
  name: 'tarnishAndPatina',
  version: 1,
  category: 'metal',
  summary_en: 'Slow surface corrosion film forming on metal: black Ag2S on silver or green verdigris (basic copper carbonate) on copper.',
  useWhen: ['Silver tarnishing in H2S or copper weathering in moist CO2'],
  avoidWhen: ['Rapid liquid reactions (accelerated through time-lapse only)'],
  params: {
    patinaColor: { name: 'patinaColor', type: 'color', default: '#15803d', description: 'Green verdigris or black tarnish' },
    filmThickness_um: { name: 'filmThickness_um', type: 'number', min: 0.1, max: 20.0, default: 5.0, unit: 'µm', description: 'Patina depth' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bottom', 'wall'],
  mount(ctx, p) { return { atom: 'tarnishAndPatina', instanceId: `patina_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Copper Green Verdigris Patina', description: 'Malachite-green protective patina film coating copper coin', params: { patinaColor: '#16a34a', filmThickness_um: 6.0 } },
    { title: 'Silver Sulfide Black Tarnish', description: 'Velvety dark Ag2S film tarnishing shiny silver spoon', params: { patinaColor: '#18181b', filmThickness_um: 2.0 } }
  ],
  tests: ['tarnish_patina_surface_film']
};

export const rustFormationAtom: EffectAtom = {
  name: 'rustFormation',
  version: 1,
  category: 'metal',
  summary_en: 'Hydrated iron(III) oxide Fe2O3*nH2O rust forming on iron nail in moist air; mass increases with oxygen absorption.',
  useWhen: ['Iron rusting experiment in air and saltwater'],
  avoidWhen: ['Passivated or stainless metals'],
  params: {
    rustColor: { name: 'rustColor', type: 'color', default: '#ea580c', description: 'Orange-brown flaky rust' },
    flakingSeverity: { name: 'flakingSeverity', type: 'number', min: 0.1, max: 1.0, default: 0.5, description: 'Brittle spallation' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bottom'],
  ledgerInputs: ['amount:reactant'],
  mount(ctx, p) { return { atom: 'rustFormation', instanceId: `rust_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Orange Rust Bloom on Iron Nail', description: 'Rough flaky reddish-orange rust coating with brown sediment in water', params: { rustColor: '#ea580c', flakingSeverity: 0.6 } },
    { title: 'Subtle Pitting Rust in Saltwater', description: 'Fast electrochemical rust nodules forming at stress points', params: { rustColor: '#c2410c', flakingSeverity: 0.3 } }
  ],
  tests: ['rust_formation_oxygen_mass_gain']
};

export const steelWoolBurnAtom: EffectAtom = {
  name: 'steelWoolBurn',
  version: 1,
  category: 'combustion',
  summary_en: 'Steel wool ignited on electronic balance: orange combustion front spreads through fibers and scale mass increases.',
  useWhen: ['Steel wool burning demonstration on balance verifying conservation of mass with air O2'],
  avoidWhen: ['Combustion that loses volatile mass (paper, wood)'],
  params: {
    glowTemperature_c: { name: 'glowTemperature_c', type: 'number', min: 600.0, max: 1200.0, default: 850.0, unit: '°C', description: 'Orange-hot filament T' },
    oxygenAbsorbed_g: { name: 'oxygenAbsorbed_g', type: 'number', min: 0.1, max: 2.0, default: 0.38, unit: 'g', description: 'Mass gain from atmosphere' }
  },
  budget: { particles: 50, shaderCost: 2 },
  anchorsAllowed: ['flame', 'bulk'],
  mount(ctx, p) { return { atom: 'steelWoolBurn', instanceId: `wool_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Steel Wool Burning on Balance', description: 'Orange incandescence spreading across wool, balance display counts UP from 5.00 g to 6.90 g', params: { glowTemperature_c: 900.0, oxygenAbsorbed_g: 0.45 } },
    { title: 'Battery Terminal Ignition', description: '9V battery touches steel wool, sparking instant combustion wave', params: { glowTemperature_c: 800.0, oxygenAbsorbed_g: 0.25 } }
  ],
  tests: ['steel_wool_burning_balance_mass_increase']
};

export const magnesiumRibbonBurnAtom: EffectAtom = {
  name: 'magnesiumRibbonBurn',
  version: 1,
  category: 'combustion',
  summary_en: 'Magnesium ribbon burning from ignition tip with blinding white glare, white MgO smoke, and brittle white ash.',
  useWhen: ['Igniting magnesium ribbon with burner flame or tongs'],
  avoidWhen: ['Low temperature non-combustion experiments'],
  params: {
    ribbonLength_cm: { name: 'ribbonLength_cm', type: 'number', min: 1.0, max: 10.0, default: 3.5, unit: 'cm', description: 'Ribbon length' },
    burnDuration_s: { name: 'burnDuration_s', type: 'number', min: 1.0, max: 6.0, default: 3.0, unit: 's', description: 'Time to consume ribbon' }
  },
  budget: { particles: 120, shaderCost: 3 },
  anchorsAllowed: ['flame', 'rim'],
  mount(ctx, p) { return { atom: 'magnesiumRibbonBurn', instanceId: `mgburn_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Blinding Magnesium Flare', description: 'White-hot 3000 K flare consuming ribbon from bottom up, dropping white MgO ash', params: { ribbonLength_cm: 3.5, burnDuration_s: 2.8 } },
    { title: 'Short Ribbon Flash', description: 'Quick intense 1.5 s flare with white smoke trail', params: { ribbonLength_cm: 1.8, burnDuration_s: 1.5 } }
  ],
  tests: ['magnesium_ribbon_burn_photometry']
};

export const zincGranuleConsumptionAtom: EffectAtom = {
  name: 'zincGranuleConsumption',
  version: 1,
  category: 'metal',
  summary_en: 'Zinc granules erode and round off; gas rate decreases smoothly as surface area drops with A ∝ n^(2/3).',
  useWhen: ['Granular zinc dissolving in dilute hydrochloric or sulfuric acid'],
  avoidWhen: ['Flat foil with constant area'],
  params: {
    initialDiameter_mm: { name: 'initialDiameter_mm', type: 'number', min: 1.0, max: 8.0, default: 4.0, unit: 'mm', description: 'Granule pellet size' },
    granuleCount: { name: 'granuleCount', type: 'number', min: 1, max: 20, default: 5, description: 'Number of granules' }
  },
  budget: { particles: 50, shaderCost: 1 },
  anchorsAllowed: ['bottom'],
  ledgerInputs: ['amount:reactant'],
  mount(ctx, p) { return { atom: 'zincGranuleConsumption', instanceId: `zngran_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Zinc Granules Shrinking Core', description: '5 silver pellets gradually thinning to tiny beads as H2 gas slows', params: { initialDiameter_mm: 4.5, granuleCount: 5 } },
    { title: 'Single Zinc Pellet Decay', description: 'Individual zinc sphere slowly vanishing into clear solution', params: { initialDiameter_mm: 3.0, granuleCount: 1 } }
  ],
  tests: ['zinc_granule_shrinking_core_area']
};

export const coupledGalvanicCellAtom: EffectAtom = {
  name: 'coupledGalvanicCell',
  version: 1,
  category: 'metal',
  summary_en: 'Daniell galvanic cell: Zn electrode erodes while Cu electrode thickens; voltmeter needle deflects to +1.10 V.',
  useWhen: ['Zn-Cu galvanic electrochemical cell with salt bridge'],
  avoidWhen: ['Single vessel without separate half-cells'],
  params: {
    cellPotential_V: { name: 'cellPotential_V', type: 'number', min: 0.1, max: 2.5, default: 1.10, unit: 'V', description: 'Cell voltage' },
    currentDensity_mA: { name: 'currentDensity_mA', type: 'number', min: 1.0, max: 100.0, default: 25.0, unit: 'mA', description: 'Current draw' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk', 'bottom'],
  mount(ctx, p) { return { atom: 'coupledGalvanicCell', instanceId: `galv_${Date.now()}`, alive: true, custom: { ...p } }; },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Daniell Cell (1.10 V)', description: 'Zinc anode erodes, copper cathode plates out with 1.10 V reading on meter', params: { cellPotential_V: 1.10, currentDensity_mA: 30.0 } },
    { title: 'Discharged Galvanic Cell', description: 'Voltage drops to zero as reagents deplete', params: { cellPotential_V: 0.05, currentDensity_mA: 1.0 } }
  ],
  tests: ['galvanic_cell_daniell_potentiometry']
};
