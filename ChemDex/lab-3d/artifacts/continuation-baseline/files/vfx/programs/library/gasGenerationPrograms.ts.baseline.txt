/**
 * gasGenerationPrograms.ts — Inorganic Gas Generation Reactions
 * 
 * Accurately models gas species properties (density, color, odor/hazard, Henry solubility),
 * nucleation sites, interfacial mass transfer, and headspace gas buildup.
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const GAS_GENERATION_PROGRAMS: ReactionProgram[] = [
  // 1. Zn + H2SO4(dil) -> ZnSO4 + H2 (Kipp Generator Hydrogen Gas Generation)
  {
    schema: 'chemdex.program/1',
    id: 'zn_h2so4_dilute',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Zn(s) + H2SO4(aq) -> ZnSO4(aq) + H2(g)',
      ionic: 'Zn(s) + 2H+(aq) -> Zn(2+)(aq) + H2(g)',
      species: [
        { formula: 'Zn', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'H2SO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'ZnSO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2', role: 'product', coeff: 1, phase: 'g', hazards: ['GHS02_flammable'] }
      ],
      deltaH_kJ_per_mol: -152.0,
      kinetics: { model: 'surface_limited', halfTime_s: 1.5 },
      hazards: ['GHS02_flammable', 'GHS05_corrosive']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bottom', window: [0, 0.8], intensity: 1.25, params: { intensity: 3.0, churnRadius: 0.45, gasSpecies: 'H2' } },
        { id: 'erosion', atom: 'solidErosion', anchor: 'bottom', window: [0, 0.85], intensity: 0.9, params: { initialShape: 'granule', erosionRate: 0.2 } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'bulk', window: [0, 0.75], intensity: 0.8, params: { soundProfile: 'fizz_effervescence', volume: 0.7 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'H2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Hạt kẽm tan dần, sủi bọt khí hiđro H2 đều đặn và liên tục từ bề mặt hạt kim loại.',
      observation_en: 'Zinc granules effervesce steadily, evolving flammable hydrogen gas bubbles continuously from metal nucleation sites.',
      why_vi: 'Kẽm khử ion H+ của axit sunfuric loãng giải phóng khí H2 trong bình Kipp.',
      why_en: 'Standard Kipp generator reaction where zinc displaces hydronium ions into gaseous hydrogen.'
    },
    confidence: 1.0
  },

  // 2. CaCO3 + 2HNO3 -> Ca(NO3)2 + H2O + CO2 (Nitric Acid Limestone Digestion)
  {
    schema: 'chemdex.program/1',
    id: 'caco3_hno3',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'CaCO3(s) + 2HNO3(aq) -> Ca(NO3)2(aq) + H2O(l) + CO2(g)',
      ionic: 'CaCO3(s) + 2H+(aq) -> Ca(2+)(aq) + H2O(l) + CO2(g)',
      species: [
        { formula: 'CaCO3', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'HNO3', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS05_corrosive'] },
        { formula: 'Ca(NO3)2', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' },
        { formula: 'CO2', role: 'product', coeff: 1, phase: 'g' }
      ],
      deltaH_kJ_per_mol: -21.0,
      kinetics: { model: 'instant', halfTime_s: 0.4 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bottom', window: [0, 0.75], intensity: 1.3, params: { intensity: 3.2, churnRadius: 0.45, gasSpecies: 'CO2' } },
        { id: 'erosion', atom: 'solidErosion', anchor: 'bottom', window: [0, 0.8], intensity: 0.95, params: { initialShape: 'chip', erosionRate: 0.25 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'CO2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Mẩu đá vôi tan mạnh, sủi bọt khí cacbonic CO2 nhanh chóng làm đục nước vôi trong.',
      observation_en: 'Limestone chip dissolves rapidly with vigorous carbon dioxide gas effervescence.',
      why_vi: 'Axit nitric mạnh đẩy axit cacbonic yếu ra khỏi muối, sinh khí CO2 và muối tan canxi nitrat.',
      why_en: 'Nitric acid protonates insoluble calcium carbonate, liberating soluble Ca(2+) and volatile CO2 gas.'
    },
    confidence: 1.0
  },

  // 3. Cu + 2H2SO4(conc) -> CuSO4 + 2H2O + SO2 (Hot Concentrated Acid Oxidation)
  {
    schema: 'chemdex.program/1',
    id: 'cu_conc_h2so4',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Cu(s) + 2H2SO4(aq) -> CuSO4(aq) + 2H2O(l) + SO2(g)',
      ionic: 'Cu(s) + 4H+(aq) + 2SO4(2-)(aq) -> Cu(2+)(aq) + SO4(2-)(aq) + 2H2O(l) + SO2(g)',
      species: [
        { formula: 'Cu', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'H2SO4', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'CuSO4', role: 'product', coeff: 1, phase: 'aq', colorHex: '#0284c7' },
        { formula: 'H2O', role: 'product', coeff: 2, phase: 'l' },
        { formula: 'SO2', role: 'product', coeff: 1, phase: 'g', hazards: ['GHS05_corrosive', 'GHS06_toxic'] }
      ],
      deltaH_kJ_per_mol: -65.0,
      kinetics: { model: 'heat_activated', halfTime_s: 2.0 },
      hazards: ['GHS05_corrosive', 'GHS06_toxic']
    },
    visual: {
      duration_s: 8.0,
      timeline: [
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0.1, 0.85], intensity: 1.1, params: { bubbleRate: 35, meanRadius_mm: 1.8, gasSpecies: 'SO2' } },
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0.2, 0.9], intensity: 1.1, params: { startColor: '#ffffff', endColor: '#0284c7', opticalPath_cm: 4.5 } },
        { id: 'steam', atom: 'thermalSteam', anchor: 'surface', window: [0.2, 0.85], intensity: 1.0, params: { steamDensity: 0.9, temperature_c: 85 } }
      ],
      after: {
        liquidColor: '#0284c7',
        liquidOpacity: 0.95,
        turbidity: 0.05,
        gasesOffgassed: [{ species: 'SO2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Khi đun nóng, phôi đồng tan dần, sủi bọt khí SO2 mùi hắc và dung dịch chuyển sang màu xanh lam ngọc.',
      observation_en: 'Upon heating, copper metal dissolves evolving pungent SO2 gas while solution turns rich azure blue.',
      why_vi: 'Axit sunfuric đặc nóng thể hiện tính oxi hóa mạnh, oxi hóa Cu kim loại lên Cu2+ và sinh SO2.',
      why_en: 'Hot concentrated sulfuric acid oxidizes copper metal to blue hydrated Cu(II) with reduction to sulfur dioxide gas.'
    },
    confidence: 1.0
  },

  // 4. (NH4)2SO4 + 2NaOH -> Na2SO4 + 2H2O + 2NH3 (Ammonium Sulfate Base Test)
  {
    schema: 'chemdex.program/1',
    id: 'nh42so4_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: '(NH4)2SO4(aq) + 2NaOH(aq) -> Na2SO4(aq) + 2H2O(l) + 2NH3(g)',
      ionic: '2NH4+(aq) + 2OH-(aq) -> 2NH3(g) + 2H2O(l)',
      species: [
        { formula: '(NH4)2SO4', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'NaOH', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Na2SO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 2, phase: 'l' },
        { formula: 'NH3', role: 'product', coeff: 2, phase: 'g', hazards: ['GHS05_corrosive', 'GHS06_toxic'] }
      ],
      deltaH_kJ_per_mol: 8.0,
      kinetics: { model: 'instant', halfTime_s: 0.4 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0, 0.75], intensity: 1.05, params: { bubbleRate: 35, meanRadius_mm: 1.6, gasSpecies: 'NH3' } },
        { id: 'fume', atom: 'buoyantGasPlume', anchor: 'rim', window: [0.1, 0.85], intensity: 0.9, params: { riseSpeed: 1.2, color: '#f8fafc', opacity: 0.45 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'NH3', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Tỏa khí amoniac NH3 mùi khai mạnh, khói mỏng bốc lên từ bề mặt khi để gần đũa thủy tinh nhúng HCl đặc.',
      observation_en: 'Releases strong pungent ammonia gas; produces dense white ammonium chloride fumes near HCl rod.',
      why_vi: 'Phản ứng đặc trưng dùng để nhận biết ion amoni trong phân bón đạm sunfat.',
      why_en: 'Standard qualitative analytical test for ammonium fertilizer cations.'
    },
    confidence: 1.0
  },

  // 5. CaC2 + 2H2O -> Ca(OH)2 + C2H2 (Acetylene Gas Evolution)
  {
    schema: 'chemdex.program/1',
    id: 'cac2_h2o',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'CaC2(s) + 2H2O(l) -> Ca(OH)2(s) + C2H2(g)',
      ionic: 'CaC2(s) + 2H2O(l) -> Ca(OH)2(s) + C2H2(g)',
      species: [
        { formula: 'CaC2', role: 'reactant', coeff: 1, phase: 's', hazards: ['GHS02_flammable'] },
        { formula: 'H2O', role: 'reactant', coeff: 2, phase: 'l' },
        { formula: 'Ca(OH)2', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'C2H2', role: 'product', coeff: 1, phase: 'g', hazards: ['GHS02_flammable'] }
      ],
      deltaH_kJ_per_mol: -128.0,
      kinetics: { model: 'heat_activated', halfTime_s: 0.5 },
      hazards: ['GHS02_flammable']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bottom', window: [0, 0.8], intensity: 1.35, params: { intensity: 3.5, churnRadius: 0.5, gasSpecies: 'C2H2' } },
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0.1, 0.7], intensity: 1.1, params: { morphology: 'fine_powder', color: '#ffffff', nucleationRate: 70 } },
        { id: 'heat', atom: 'thermalSteam', anchor: 'surface', window: [0.1, 0.8], intensity: 1.1, params: { steamDensity: 0.8, temperature_c: 65 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.8,
        precipitate: { substance: 'Ca(OH)2', morphology: 'fine_powder', color: '#ffffff', mass_g: 'fromLedger' },
        gasesOffgassed: [{ species: 'C2H2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Mẩu đất đèn CaC2 sủi bọt khí axetilen C2H2 cực kỳ dữ dội, tỏa nhiệt nóng và để lại vôi tôi Ca(OH)2 trắng đục.',
      observation_en: 'Calcium carbide vigorously effervesces acetylene gas (C2H2) exothermically, leaving a milky slaked lime suspension.',
      why_vi: 'Muối cacbua kim loại bị thủy phân mạnh mẽ tạo khí hidrocacbon không no axetilen.',
      why_en: 'Hydrolysis of calcium carbide liberating acetylene gas and calcium hydroxide.'
    },
    confidence: 1.0
  },

  // 6. 2Al + 2NaOH + 2H2O -> 2NaAlO2 + 3H2 (Amphoteric Hydrogen Gas Generation)
  {
    schema: 'chemdex.program/1',
    id: 'al_naoh_h2',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2Al(s) + 2NaOH(aq) + 2H2O(l) -> 2NaAlO2(aq) + 3H2(g)',
      ionic: '2Al(s) + 2OH-(aq) + 2H2O(l) -> 2AlO2-(aq) + 3H2(g)',
      species: [
        { formula: 'Al', role: 'reactant', coeff: 2, phase: 's' },
        { formula: 'NaOH', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'H2O', role: 'reactant', coeff: 2, phase: 'l' },
        { formula: 'NaAlO2', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'H2', role: 'product', coeff: 3, phase: 'g', hazards: ['GHS02_flammable'] }
      ],
      deltaH_kJ_per_mol: -415.0,
      kinetics: { model: 'heat_activated', halfTime_s: 1.2 },
      hazards: ['GHS02_flammable', 'GHS05_corrosive']
    },
    visual: {
      duration_s: 8.0,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bottom', window: [0.1, 0.95], intensity: 1.35, params: { intensity: 3.5, churnRadius: 0.5, gasSpecies: 'H2' } },
        { id: 'erosion', atom: 'solidErosion', anchor: 'bottom', window: [0.1, 0.9], intensity: 1.1, params: { initialShape: 'sheet', erosionRate: 0.35 } },
        { id: 'heat', atom: 'thermalSteam', anchor: 'surface', window: [0.2, 0.9], intensity: 1.2, params: { steamDensity: 1.2, temperature_c: 82 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'H2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Nhôm tan mạnh trong dung dịch kiềm nóng, sủi bọt khí H2 dữ dội và dung dịch nóng lên rất nhanh.',
      observation_en: 'Aluminum foil dissolves violently in hot alkaline solution with furious hydrogen effervescence and strong heating.',
      why_vi: 'Nhôm có tính khử mạnh và tính lưỡng tính, tan được cả trong axit lẫn bazơ mạnh giải phóng khí H2.',
      why_en: 'Amphoteric behavior of aluminum reacting with strong hydroxide solution to evolve hydrogen gas and soluble aluminate.'
    },
    confidence: 1.0
  },

  // 7. KCl + H2SO4(conc) -> KHSO4 + HCl (Choking Acidic Fuming Gas Generation)
  {
    schema: 'chemdex.program/1',
    id: 'kcl_conc_h2so4',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'KCl(s) + H2SO4(aq) -> KHSO4(aq) + HCl(g)',
      ionic: 'Cl-(s) + H2SO4(l) -> HSO4-(aq) + HCl(g)',
      species: [
        { formula: 'KCl', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'H2SO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'KHSO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'HCl', role: 'product', coeff: 1, phase: 'g', hazards: ['GHS05_corrosive', 'GHS06_toxic'] }
      ],
      deltaH_kJ_per_mol: -14.0,
      kinetics: { model: 'heat_activated', halfTime_s: 1.5 },
      hazards: ['GHS05_corrosive', 'GHS06_toxic']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'fume', atom: 'buoyantGasPlume', anchor: 'rim', window: [0.1, 0.9], intensity: 1.25, params: { riseSpeed: 1.4, color: '#f1f5f9', opacity: 0.65 } },
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0, 0.8], intensity: 1.0, params: { bubbleRate: 30, meanRadius_mm: 1.5, gasSpecies: 'HCl' } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'HCl', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Muối KCl phản ứng với H2SO4 đặc tạo khói trắng mờ đục của khí hiđro clorua HCl bốc nghi ngút trong không khí ẩm.',
      observation_en: 'Solid KCl reacts with concentrated sulfuric acid evolving choking acidic HCl gas that fumes thickly in moist air.',
      why_vi: 'Phương pháp sunfat điều chế khí hiđro clorua khô: axit khó bay hơi đẩy axit dễ bay hơi ra khỏi muối.',
      why_en: 'Classic sulfate process displacing volatile hydrogen chloride gas using non-volatile concentrated sulfuric acid.'
    },
    confidence: 1.0
  },

  // 8. NaNO2 + NH4Cl -> NaCl + 2H2O + N2 (Pure Nitrogen Gas Prep)
  {
    schema: 'chemdex.program/1',
    id: 'nano2_nh4cl',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'NaNO2(aq) + NH4Cl(aq) -> NaCl(aq) + 2H2O(l) + N2(g)',
      ionic: 'NO2-(aq) + NH4+(aq) -> N2(g) + 2H2O(l)',
      species: [
        { formula: 'NaNO2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS06_toxic'] },
        { formula: 'NH4Cl', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'NaCl', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 2, phase: 'l' },
        { formula: 'N2', role: 'product', coeff: 1, phase: 'g' }
      ],
      deltaH_kJ_per_mol: -332.0,
      kinetics: { model: 'heat_activated', halfTime_s: 1.2 },
      hazards: ['GHS06_toxic']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bulk', window: [0.1, 0.85], intensity: 1.1, params: { intensity: 2.2, churnRadius: 0.4, gasSpecies: 'N2' } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'bulk', window: [0.1, 0.8], intensity: 0.8, params: { soundProfile: 'fizz_effervescence', volume: 0.65 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'N2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Khi đun nhẹ, xuất hiện bọt khí nitơ N2 li ti sủi đều khắp toàn bộ thể tích dung dịch.',
      observation_en: 'Gentle warming produces steady stream of fine nitrogen gas bubbles evenly across the solution.',
      why_vi: 'Phân hủy amoni nitrit NH4NO2 tạo khí nitơ tinh khiết dùng trong phòng thí nghiệm.',
      why_en: 'Comproportionation decomposition of ammonium nitrite into pure nitrogen gas and water.'
    },
    confidence: 1.0
  },

  // 9. 3Cu + 8HNO3(dil) -> 3Cu(NO3)2 + 2NO + 4H2O (Colorless NO turning Brown in Air)
  {
    schema: 'chemdex.program/1',
    id: 'cu_hno3_dilute',
    provenance: 'handcrafted',
    chemistry: {
      equation: '3Cu(s) + 8HNO3(aq) -> 3Cu(NO3)2(aq) + 2NO(g) + 4H2O(l)',
      ionic: '3Cu(s) + 8H+ + 2NO3- -> 3Cu(2+) + 2NO(g) + 4H2O',
      species: [
        { formula: 'Cu', role: 'reactant', coeff: 3, phase: 's' },
        { formula: 'HNO3', role: 'reactant', coeff: 8, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS05_corrosive'] },
        { formula: 'Cu(NO3)2', role: 'product', coeff: 3, phase: 'aq', colorHex: '#0284c7' },
        { formula: 'NO', role: 'product', coeff: 2, phase: 'g', hazards: ['GHS06_toxic'] },
        { formula: 'H2O', role: 'product', coeff: 4, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -212.0,
      kinetics: { model: 'surface_limited', halfTime_s: 1.6 },
      hazards: ['GHS05_corrosive', 'GHS06_toxic']
    },
    visual: {
      duration_s: 8.0,
      timeline: [
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0, 0.75], intensity: 1.1, params: { bubbleRate: 40, meanRadius_mm: 1.7, gasSpecies: 'NO' } },
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0.1, 0.85], intensity: 1.15, params: { startColor: '#f8fafc', endColor: '#0284c7', opticalPath_cm: 4.5 } },
        { id: 'fume', atom: 'heavyVaporPour', anchor: 'rim', window: [0.3, 0.95], intensity: 1.0, params: { color: '#9a3412', densityMultiplier: 1.58, spillRate: 25 } }
      ],
      after: {
        liquidColor: '#0284c7',
        liquidOpacity: 0.95,
        turbidity: 0.05,
        gasesOffgassed: [{ species: 'NO', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Đồng tan sinh khí không màu NO, khi chạm không khí ở miệng bình lập tức hóa màu nâu đỏ NO2, dung dịch chuyển xanh lam.',
      observation_en: 'Copper dissolves generating colorless NO gas that turns red-brown NO2 at the vessel mouth on contact with air.',
      why_vi: 'Axit nitric loãng oxy hóa Cu sinh khí NO; khí NO phản ứng với O2 không khí tạo NO2 nâu đỏ.',
      why_en: 'Dilute nitric acid oxidizes copper to NO, which immediately reacts with atmospheric O2 to form brown NO2.'
    },
    confidence: 1.0
  },

  // 10. 2KMnO4 + 16HCl -> 2KCl + 2MnCl2 + 5Cl2 + 8H2O (Greenish-Yellow Chlorine Gas Preparation)
  {
    schema: 'chemdex.program/1',
    id: 'kmno4_hcl',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2KMnO4(s) + 16HCl(aq) -> 2KCl(aq) + 2MnCl2(aq) + 5Cl2(g) + 8H2O(l)',
      ionic: '2MnO4- + 10Cl- + 16H+ -> 2Mn(2+) + 5Cl2(g) + 8H2O',
      species: [
        { formula: 'KMnO4', role: 'reactant', coeff: 2, phase: 's', hazards: ['GHS03_oxidizer', 'GHS07_harmful', 'GHS09_environmental'] },
        { formula: 'HCl', role: 'reactant', coeff: 16, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'KCl', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'MnCl2', role: 'product', coeff: 2, phase: 'aq', colorHex: '#fbcfe8' },
        { formula: 'Cl2', role: 'product', coeff: 5, phase: 'g', hazards: ['GHS03_oxidizer', 'GHS06_toxic', 'GHS09_environmental'] },
        { formula: 'H2O', role: 'product', coeff: 8, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -440.0,
      kinetics: { model: 'heat_activated', halfTime_s: 0.6 },
      hazards: ['GHS03_oxidizer', 'GHS05_corrosive', 'GHS06_toxic', 'GHS09_environmental']
    },
    visual: {
      duration_s: 7.5,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bottom', window: [0, 0.8], intensity: 1.3, params: { intensity: 3.5, churnRadius: 0.5, gasSpecies: 'Cl2' } },
        { id: 'plume', atom: 'heavyVaporPour', anchor: 'rim', window: [0.15, 0.95], intensity: 1.25, params: { color: '#bef264', densityMultiplier: 2.5, spillRate: 35 } },
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.6], intensity: 1.2, params: { startColor: '#7e22ce', endColor: '#fbcfe8', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#fce7f3',
        liquidOpacity: 0.95,
        turbidity: 0.05,
        gasesOffgassed: [{ species: 'Cl2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Sủi bọt dữ dội, thoát ra dòng khí màu vàng lục Cl2 mùi hắc nồng cực độc, dung dịch mất màu tím thuốc tím.',
      observation_en: 'Furious effervescence liberating dense greenish-yellow chlorine gas with suffocating odor; purple permanganate discharges.',
      why_vi: 'Thuốc tím KMnO4 oxy hóa mạnh mẽ ion clorua Cl- trong axit đặc tạo khí clo tự do.',
      why_en: 'Potassium permanganate vigorously oxidizes chloride to toxic elemental chlorine gas.'
    },
    confidence: 1.0
  }
];
