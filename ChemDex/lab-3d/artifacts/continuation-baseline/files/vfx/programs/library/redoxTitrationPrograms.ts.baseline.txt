/**
 * redoxTitrationPrograms.ts — Redox Titrations, Halogen Displacements & Metal Trees
 * 
 * Accurately models electrochemical potentials, crystal dendritic plating,
 * autocatalytic kinetics, and quantitative titrimetric color endpoints.
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const REDOX_TITRATION_PROGRAMS: ReactionProgram[] = [
  // 1. Zn + 2AgNO3 -> Zn(NO3)2 + 2Ag (Silver Arbor / Dianas Tree)
  {
    schema: 'chemdex.program/1',
    id: 'zn_agno3',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Zn(s) + 2AgNO3(aq) -> Zn(NO3)2(aq) + 2Ag(s)',
      ionic: 'Zn(s) + 2Ag+(aq) -> Zn(2+)(aq) + 2Ag(s)',
      species: [
        { formula: 'Zn', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'AgNO3', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS05_corrosive', 'GHS09_environmental'] },
        { formula: 'Zn(NO3)2', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'Ag', role: 'product', coeff: 2, phase: 's', colorHex: '#cbd5e1' }
      ],
      deltaH_kJ_per_mol: -365.0,
      kinetics: { model: 'surface_limited', halfTime_s: 1.5 },
      hazards: ['GHS05_corrosive', 'GHS09_environmental']
    },
    visual: {
      duration_s: 8.0,
      timeWarp: { physical_s: 600, note_en: 'Silver crystal arbor grows over ~10 minutes', note_vi: 'Cây tinh thể bạc lớn dần trong ~10 phút' },
      timeline: [
        { id: 'plating', atom: 'surfaceDendriteGrowth', anchor: 'bottom', window: [0.1, 0.9], intensity: 1.3, params: { metalColor: '#cbd5e1', growthSpeed: 0.8 } },
        { id: 'erosion', atom: 'solidErosion', anchor: 'bottom', window: [0, 0.8], intensity: 0.9, params: { initialShape: 'granule', erosionRate: 0.25 } }
      ],
      after: {
        liquidColor: '#f8fafc',
        liquidOpacity: 0.95,
        turbidity: 0.05,
        precipitate: { substance: 'Ag', morphology: 'crystal_needle', color: '#cbd5e1', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Trên bề mặt kẽm mọc ra các chùm tinh thể bạc hình kim lấp lánh (cây bạc Diana).',
      observation_en: 'Glittering dendritic needles of pure metallic silver sprout from the zinc surface (Tree of Diana).',
      why_vi: 'Zn có thế khử chuẩn (-0.76V) âm hơn nhiều so với Ag+ (+0.80V), thế khử deltaE = +1.56V đẩy mạnh kết tinh bạc.',
      why_en: 'Electrochemical potential difference (+1.56V) drives rapid dendritic electrodeposition of silver.'
    },
    confidence: 1.0
  },

  // 2. 2KMnO4 + 5Na2C2O4 + 8H2SO4 -> K2SO4 + 2MnSO4 + 5Na2SO4 + 10CO2 + 8H2O (Permanganate Oxalate Titration)
  {
    schema: 'chemdex.program/1',
    id: 'kmno4_na2c2o4_titration',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2KMnO4(aq) + 5Na2C2O4(aq) + 8H2SO4(aq) -> K2SO4(aq) + 2MnSO4(aq) + 5Na2SO4(aq) + 10CO2(g) + 8H2O(l)',
      ionic: '2MnO4-(aq) + 5C2O4(2-)(aq) + 16H+(aq) -> 2Mn(2+)(aq) + 10CO2(g) + 8H2O(l)',
      species: [
        { formula: 'KMnO4', role: 'reactant', coeff: 2, phase: 'aq', colorHex: '#701a75', hazards: ['GHS03_oxidizer', 'GHS07_harmful'] },
        { formula: 'Na2C2O4', role: 'reactant', coeff: 5, phase: 'aq', hazards: ['GHS07_harmful'] },
        { formula: 'H2SO4', role: 'reactant', coeff: 8, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'K2SO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'MnSO4', role: 'product', coeff: 2, phase: 'aq', colorHex: '#fce7f3' },
        { formula: 'Na2SO4', role: 'product', coeff: 5, phase: 'aq' },
        { formula: 'CO2', role: 'product', coeff: 10, phase: 'g' },
        { formula: 'H2O', role: 'product', coeff: 8, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -280.0,
      kinetics: { model: 'heat_activated', halfTime_s: 0.8 },
      hazards: ['GHS03_oxidizer', 'GHS05_corrosive']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.75], intensity: 1.25, params: { startColor: '#701a75', endColor: '#fdf2f8', opticalPath_cm: 4.5 } },
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0.1, 0.8], intensity: 0.9, params: { bubbleRate: 25, meanRadius_mm: 1.4, gasSpecies: 'CO2' } }
      ],
      after: {
        liquidColor: '#fdf2f8',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'CO2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Màu tím sẫm của KMnO4 mất màu dần khi chuẩn độ trong dung dịch axit nóng, đồng thời sinh bọt khí CO2 li ti.',
      observation_en: 'Deep purple permanganate solution progressively decolorizes upon titration in warm acid, releasing fine CO2 bubbles.',
      why_vi: 'Phương pháp chuẩn độ pemanganat kinh điển chuẩn hóa nồng độ dung dịch KMnO4 bằng chất chuẩn gốc natri oxalat.',
      why_en: 'Classic permanganometric redox titration standardizing KMnO4 solution against primary standard sodium oxalate.'
    },
    confidence: 1.0
  },

  // 3. Mg + CuSO4 -> MgSO4 + Cu (Exothermic Plating & Hydrogen Bubbles)
  {
    schema: 'chemdex.program/1',
    id: 'mg_cuso4',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Mg(s) + CuSO4(aq) -> MgSO4(aq) + Cu(s)',
      ionic: 'Mg(s) + Cu(2+)(aq) -> Mg(2+)(aq) + Cu(s)',
      species: [
        { formula: 'Mg', role: 'reactant', coeff: 1, phase: 's', hazards: ['GHS02_flammable'] },
        { formula: 'CuSO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS07_harmful', 'GHS09_environmental'] },
        { formula: 'MgSO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'Cu', role: 'product', coeff: 1, phase: 's', colorHex: '#b45309' }
      ],
      deltaH_kJ_per_mol: -536.0,
      kinetics: { model: 'heat_activated', halfTime_s: 0.8 },
      hazards: ['GHS07_harmful', 'GHS09_environmental']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'plating', atom: 'surfaceDendriteGrowth', anchor: 'bottom', window: [0, 0.6], intensity: 1.3, params: { metalColor: '#b45309', growthSpeed: 1.0 } },
        { id: 'heat', atom: 'thermalSteam', anchor: 'surface', window: [0.1, 0.8], intensity: 1.2, params: { steamDensity: 0.9, temperature_c: 65 } },
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0.1, 0.75], intensity: 1.0, params: { startColor: '#38bdf8', endColor: '#f8fafc', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#f8fafc',
        liquidOpacity: 0.95,
        turbidity: 0.1,
        precipitate: { substance: 'Cu', morphology: 'fine_powder', color: '#b45309', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Bề mặt magie lập tức phủ lớp đồng đỏ nâu, tỏa nhiệt mạnh làm nóng cốc và dung dịch nhạt màu xanh.',
      observation_en: 'Spongy reddish-brown copper rapidly encrusts the magnesium ribbon with vigorous exothermic heat.',
      why_vi: 'Mg có thế điện cực cực âm (-2.37V) giải phóng nhiệt lượng khổng lồ (-536 kJ/mol) khi khử Cu2+.',
      why_en: 'Immense redox driving force (+2.71 V) creates highly exothermic displacement.'
    },
    confidence: 1.0
  },

  // 4. 2KI + Cl2 -> 2KCl + I2 (Colorless to Brown Iodine Extraction)
  {
    schema: 'chemdex.program/1',
    id: 'ki_cl2',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2KI(aq) + Cl2(aq) -> 2KCl(aq) + I2(aq)',
      ionic: '2I-(aq) + Cl2(aq) -> 2Cl-(aq) + I2(aq)',
      species: [
        { formula: 'KI', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'Cl2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS06_toxic'] },
        { formula: 'KCl', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'I2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#78350f' }
      ],
      deltaH_kJ_per_mol: -176.0,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: ['GHS06_toxic']
    },
    visual: {
      duration_s: 5.5,
      timeline: [
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.45], intensity: 1.3, params: { startColor: '#f8fafc', endColor: '#78350f', opticalPath_cm: 4.5 } },
        { id: 'diff', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.75], intensity: 1.1, params: { speed: 2.5, color: '#78350f' } }
      ],
      after: {
        liquidColor: '#78350f',
        liquidOpacity: 0.98,
        turbidity: 0.05,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch không màu lập tức đổi sang màu nâu đỏ thẫm do giải phóng iot tự do (tạo phức I3-).',
      observation_en: 'Colorless solution flashes dark reddish-amber as elemental iodine dissolves as triiodide.',
      why_vi: 'Clo có độ âm điện và thế oxy hóa (+1.36V) cao hơn iot (+0.54V), đẩy iot ra khỏi muối.',
      why_en: 'Stronger oxidizer chlorine (+1.36V) displaces iodide (+0.54V) to elemental iodine.'
    },
    confidence: 1.0
  },

  // 5. 2KBr + Cl2 -> 2KCl + Br2 (Colorless to Orange-Amber Bromine)
  {
    schema: 'chemdex.program/1',
    id: 'kbr_cl2',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2KBr(aq) + Cl2(aq) -> 2KCl(aq) + Br2(aq)',
      ionic: '2Br-(aq) + Cl2(aq) -> 2Cl-(aq) + Br2(aq)',
      species: [
        { formula: 'KBr', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'Cl2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS06_toxic'] },
        { formula: 'KCl', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'Br2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#c2410c' }
      ],
      deltaH_kJ_per_mol: -93.0,
      kinetics: { model: 'instant', halfTime_s: 0.15 },
      hazards: ['GHS05_corrosive', 'GHS06_toxic']
    },
    visual: {
      duration_s: 5.5,
      timeline: [
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.45], intensity: 1.2, params: { startColor: '#f8fafc', endColor: '#c2410c', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#c2410c',
        liquidOpacity: 0.96,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch lập tức chuyển sang màu vàng cam hổ phách đặc trưng của nước brom.',
      observation_en: 'Colorless solution flashes bright amber-orange due to dissolved molecular bromine.',
      why_vi: 'Clo đẩy brom ra khỏi dung dịch muối bromua theo quy luật tính phi kim halogen giảm dần.',
      why_en: 'Chlorine (+1.36V) oxidizes bromide (+1.07V) to elemental aqueous bromine.'
    },
    confidence: 1.0
  },

  // 6. 2Na2S2O3 + I2 -> Na2S4O6 + 2NaI (Iodometric Titration Decolorization)
  {
    schema: 'chemdex.program/1',
    id: 'na2s2o3_i2',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2Na2S2O3(aq) + I2(aq) -> Na2S4O6(aq) + 2NaI(aq)',
      ionic: '2S2O3(2-)(aq) + I2(aq) -> S4O6(2-)(aq) + 2I-(aq)',
      species: [
        { formula: 'Na2S2O3', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'I2', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#78350f' },
        { formula: 'Na2S4O6', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'NaI', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -68.0,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: []
    },
    visual: {
      duration_s: 5.0,
      timeline: [
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.4], intensity: 1.3, params: { startColor: '#78350f', endColor: '#f8fafc', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#f8fafc',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Màu nâu đỏ của iot bị mất màu nhanh chóng, dung dịch trở nên hoàn toàn trong suốt không màu.',
      observation_en: 'Dark brown iodine color instantly discharges to crystal-clear colorless solution (classic iodometric endpoint).',
      why_vi: 'Thiosunfat khử định lượng iot thành iotua không màu, bản thân bị oxy hóa thành tetrationat S4O6 2-.',
      why_en: 'Quantitative reduction of iodine to colorless iodide by thiosulfate oxidizing to tetrathionate.'
    },
    confidence: 1.0
  },

  // 7. H2O2 + 2KI + H2SO4 -> I2 + K2SO4 + 2H2O (Peroxide Oxidation of Iodide)
  {
    schema: 'chemdex.program/1',
    id: 'h2o2_ki_h2so4',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'H2O2(aq) + 2KI(aq) + H2SO4(aq) -> I2(aq) + K2SO4(aq) + 2H2O(l)',
      ionic: 'H2O2 + 2I- + 2H+ -> I2 + 2H2O',
      species: [
        { formula: 'H2O2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS05_corrosive'] },
        { formula: 'KI', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'H2SO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'I2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#78350f' },
        { formula: 'K2SO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 2, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -210.0,
      kinetics: { model: 'second_order', halfTime_s: 1.2 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0.1, 0.85], intensity: 1.2, params: { startColor: '#f8fafc', endColor: '#78350f', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#78350f',
        liquidOpacity: 0.98,
        turbidity: 0.05,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch không màu dần dần chuyển sang màu vàng rồi đậm dần thành nâu thẫm của iot tự do.',
      observation_en: 'Solution steadily deepens from pale yellow to rich reddish-brown as hydrogen peroxide oxidizes iodide.',
      why_vi: 'Hiđro peoxit trong môi trường axit là chất oxy hóa mạnh (E = +1.77V), oxy hóa chậm I- thành I2.',
      why_en: 'Acidic H2O2 (+1.77V) smoothly oxidizes iodide with second-order kinetics.'
    },
    confidence: 1.0
  },

  // 8. 10FeSO4 + 2KMnO4 + 8H2SO4 -> 5Fe2(SO4)3 + 2MnSO4 + K2SO4 + 8H2O (Permanganate Iron Titration)
  {
    schema: 'chemdex.program/1',
    id: 'feso4_kmno4_h2so4',
    provenance: 'handcrafted',
    chemistry: {
      equation: '10FeSO4(aq) + 2KMnO4(aq) + 8H2SO4(aq) -> 5Fe2(SO4)3(aq) + 2MnSO4(aq) + K2SO4(aq) + 8H2O(l)',
      ionic: '5Fe(2+) + MnO4- + 8H+ -> 5Fe(3+) + Mn(2+) + 4H2O',
      species: [
        { formula: 'FeSO4', role: 'reactant', coeff: 10, phase: 'aq', hazards: ['GHS07_harmful'] },
        { formula: 'KMnO4', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS07_harmful', 'GHS09_environmental'] },
        { formula: 'H2SO4', role: 'reactant', coeff: 8, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Fe2(SO4)3', role: 'product', coeff: 5, phase: 'aq', colorHex: '#fef08a' },
        { formula: 'MnSO4', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'K2SO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 8, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -690.0,
      kinetics: { model: 'instant', halfTime_s: 0.2 },
      hazards: ['GHS05_corrosive', 'GHS09_environmental']
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.5], intensity: 1.25, params: { startColor: '#7e22ce', endColor: '#fef08a', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#fef9c3',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Màu tím đặc trưng của thuốc tím KMnO4 bị mất màu ngay khi nhỏ vào, chuyển thành màu vàng rơm nhạt của Fe3+.',
      observation_en: 'Deep royal purple permanganate discharges instantaneously upon contact, leaving faint straw-yellow Fe(III).',
      why_vi: 'Fe2+ khử ion MnO4- trong môi trường axit về Mn2+ không màu, bản thân chuyển thành Fe3+ màu vàng.',
      why_en: 'Acidic permanganate (+1.51V) rapidly oxidizes Fe(II) (+0.77V) to Fe(III), discharging purple color.'
    },
    confidence: 1.0
  },

  // 9. K2Cr2O7 + 3C2H5OH + 4H2SO4 -> Cr2(SO4)3 + 3CH3CHO + K2SO4 + 7H2O (Breathalyzer Oxidation)
  {
    schema: 'chemdex.program/1',
    id: 'k2cr2o7_c2h5oh_h2so4',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'K2Cr2O7(aq) + 3C2H5OH(aq) + 4H2SO4(aq) -> Cr2(SO4)3(aq) + 3CH3CHO(aq) + K2SO4(aq) + 7H2O(l)',
      ionic: 'Cr2O7(2-) + 3CH3CH2OH + 8H+ -> 2Cr(3+) + 3CH3CHO + 7H2O',
      species: [
        { formula: 'K2Cr2O7', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS06_toxic', 'GHS08_health_hazard'] },
        { formula: 'C2H5OH', role: 'reactant', coeff: 3, phase: 'aq', hazards: ['GHS02_flammable'] },
        { formula: 'H2SO4', role: 'reactant', coeff: 4, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Cr2(SO4)3', role: 'product', coeff: 1, phase: 'aq', colorHex: '#059669' },
        { formula: 'CH3CHO', role: 'product', coeff: 3, phase: 'aq', hazards: ['GHS02_flammable', 'GHS07_harmful'] },
        { formula: 'K2SO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 7, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -450.0,
      kinetics: { model: 'first_order', halfTime_s: 1.0 },
      hazards: ['GHS05_corrosive', 'GHS08_health_hazard']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0.1, 0.85], intensity: 1.2, params: { startColor: '#ea580c', endColor: '#059669', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#047857',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch màu cam đỏ đicromat chuyển sang màu xanh lục ngọc của ion crom(III) Cr3+, tỏa mùi aldehyde đặc trưng.',
      observation_en: 'Bright orange dichromate transforms smoothly into deep emerald-green chromium(III), evolving pungent fruity aldehyde fumes.',
      why_vi: 'Cồn etanol bị đicromat oxy hóa thành axetanđehit, Cr(VI) màu cam bị khử về Cr(III) màu lục.',
      why_en: 'Dichromate oxidizes ethanol to acetaldehyde, reducing orange Cr(VI) to emerald green Cr(III).'
    },
    confidence: 1.0
  },

  // 10. 3H2O2 + 2KMnO4 -> 2MnO2 + 2KOH + 3O2 + 2H2O (Vigorous Oxygen Foam Decomposition)
  {
    schema: 'chemdex.program/1',
    id: 'h2o2_kmno4',
    provenance: 'handcrafted',
    chemistry: {
      equation: '3H2O2(aq) + 2KMnO4(aq) -> 2MnO2(s) + 2KOH(aq) + 3O2(g) + 2H2O(l)',
      ionic: '3H2O2 + 2MnO4- -> 2MnO2(s) + 2OH- + 3O2(g) + 2H2O',
      species: [
        { formula: 'H2O2', role: 'reactant', coeff: 3, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS05_corrosive'] },
        { formula: 'KMnO4', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS07_harmful', 'GHS09_environmental'] },
        { formula: 'MnO2', role: 'product', coeff: 2, phase: 's', colorHex: '#18181b' },
        { formula: 'KOH', role: 'product', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'O2', role: 'product', coeff: 3, phase: 'g', hazards: ['GHS03_oxidizer'] },
        { formula: 'H2O', role: 'product', coeff: 2, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -410.0,
      kinetics: { model: 'autocatalytic', halfTime_s: 0.6 },
      hazards: ['GHS03_oxidizer', 'GHS05_corrosive']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bottom', window: [0, 0.75], intensity: 1.3, params: { intensity: 3.2, churnRadius: 0.5, gasSpecies: 'O2' } },
        { id: 'foam', atom: 'cellularFoamGrowth', anchor: 'surface', window: [0.1, 0.85], intensity: 1.25, params: { growthRate_ml_s: 35.0, maxFoam_ml: 200, foamColor: '#ffffff' } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'bulk', window: [0, 0.7], intensity: 0.9, params: { soundProfile: 'fizz_effervescence', volume: 0.85 } }
      ],
      after: {
        liquidColor: '#27272a',
        liquidOpacity: 0.98,
        turbidity: 0.9,
        precipitate: { substance: 'MnO2', morphology: 'fine_powder', color: '#18181b', mass_g: 'fromLedger' },
        gasesOffgassed: [{ species: 'O2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Sủi bọt khí O2 dữ dội, dâng bọt khí cuồn cuộn và xuất hiện bột màu nâu đen MnO2.',
      observation_en: 'Violent effervescence erupting thick dense foam with copious oxygen gas and black MnO2 powder.',
      why_vi: 'Hiđro peoxit đóng vai trò chất khử đối với KMnO4, giải phóng O2 và MnO2 tự xúc tác.',
      why_en: 'H2O2 acts as a reducing agent toward permanganate, producing MnO2 which autocatalyzes further decomposition.'
    },
    confidence: 1.0
  }
];
