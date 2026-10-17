/**
 * gasEvolutionPrograms.ts — Gas Evolution Reaction Programs
 * 
 * Accurately models effervescence, bubble generation rate proportional to stoichiometry,
 * gas density & buoyancy classes, and toxic/hazardous warnings.
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const GAS_EVOLUTION_PROGRAMS: ReactionProgram[] = [
  // 1. CaCO3 + 2HCl -> CaCl2 + H2O + CO2
  {
    schema: 'chemdex.program/1',
    id: 'caco3_hcl',
    provenance: 'handcrafted',
    controller: 'co2_gas_production',
    chemistry: {
      equation: 'CaCO3(s) + 2HCl(aq) -> CaCl2(aq) + H2O(l) + CO2(g)',
      species: [
        { formula: 'CaCO3', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'HCl', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'CaCl2', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' },
        { formula: 'CO2', role: 'product', coeff: 1, phase: 'g', colorHex: '#f1f5f9' }
      ],
      deltaH_kJ_per_mol: -15.0,
      kinetics: { model: 'surface_limited', halfTime_s: 2.0, stirSensitivity: 0.8 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bottom', window: [0, 0.7], intensity: 1.2, params: { intensity: 2.5, churnRadius: 0.45, gasSpecies: 'CO2' } },
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0, 0.85], intensity: 1.0, params: { bubbleRate: 45, meanRadius_mm: 2.2, color: '#f1f5f9', gasSpecies: 'CO2' } },
        { id: 'erosion', atom: 'solidErosion', anchor: 'bottom', window: [0, 1.0], intensity: 1.0, params: { initialShape: 'granule', erosionRate: 0.15 } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'bulk', window: [0, 0.8], intensity: 1.0, params: { soundProfile: 'fizz_effervescence', volume: 0.7 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.05,
        solidsRemaining: [{ formula: 'CaCO3', mass_g: 'fromLedger', morphologyChange: 'rounded_chips' }],
        gasesOffgassed: [{ species: 'CO2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Đá vôi sủi bọt mạnh mẽ, sinh khí CO2 không màu, viên đá vôi mòn dần.',
      observation_en: 'Limestone effervesces vigorously, releasing colorless CO2; chips gradually erode.',
      why_vi: 'Axit mạnh đẩy axit yếu H2CO3 không bền ra khỏi muối, phân hủy thành CO2 bay lên.',
      why_en: 'Strong acid displaces unstable carbonic acid, decomposing into CO2 gas and water.'
    },
    confidence: 1.0
  },

  // 2. Na2CO3 + 2HCl -> 2NaCl + H2O + CO2
  {
    schema: 'chemdex.program/1',
    id: 'na2co3_hcl',
    provenance: 'handcrafted',
    controller: 'carbonate_effervescence',
    chemistry: {
      equation: 'Na2CO3(aq) + 2HCl(aq) -> 2NaCl(aq) + H2O(l) + CO2(g)',
      species: [
        { formula: 'Na2CO3', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'HCl', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'NaCl', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' },
        { formula: 'CO2', role: 'product', coeff: 1, phase: 'g' }
      ],
      deltaH_kJ_per_mol: -28.0,
      kinetics: { model: 'instant', halfTime_s: 0.4 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 5.5,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'pourPoint', window: [0, 0.65], intensity: 1.5, params: { intensity: 3.0, churnRadius: 0.5, gasSpecies: 'CO2' } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'bulk', window: [0, 0.6], intensity: 1.0, params: { soundProfile: 'fizz_effervescence', volume: 0.8 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'CO2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Sủi bọt tức thì rất mạnh, khí CO2 thoát ra cuồn cuộn.',
      observation_en: 'Immediate vigorous bubbling effervescence as CO2 rapidly escapes.',
      why_vi: 'Phản ứng đồng pha giữa hai dung dịch diễn ra với tốc độ cực nhanh.',
      why_en: 'Homogeneous aqueous ionic reaction proceeds with high instantaneous rate.'
    },
    confidence: 1.0
  },

  // 3. NaHCO3 + HCl -> NaCl + H2O + CO2
  {
    schema: 'chemdex.program/1',
    id: 'nahco3_hcl',
    provenance: 'handcrafted',
    controller: 'nahco3_hcl_gas',
    chemistry: {
      equation: 'NaHCO3(s) + HCl(aq) -> NaCl(aq) + H2O(l) + CO2(g)',
      species: [
        { formula: 'NaHCO3', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'HCl', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'NaCl', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' },
        { formula: 'CO2', role: 'product', coeff: 1, phase: 'g' }
      ],
      deltaH_kJ_per_mol: 12.0, // Mildly endothermic
      kinetics: { model: 'instant', halfTime_s: 0.5 },
      hazards: []
    },
    visual: {
      duration_s: 5.0,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bulk', window: [0, 0.6], intensity: 1.2, params: { intensity: 2.2, churnRadius: 0.4, gasSpecies: 'CO2' } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'bulk', window: [0, 0.5], intensity: 0.9, params: { soundProfile: 'fizz_effervescence', volume: 0.7 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'CO2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Bột sủi bọt mạnh, dung dịch cảm giác mát lạnh hơn một chút do thu nhiệt nhẹ.',
      observation_en: 'Powder rapidly effervesces, solution feels slightly cooler due to mild endothermicity.',
      why_vi: 'Natri bicacbonat phản ứng 1:1 với axit, quá trình hòa tan và phân ly thu nhiệt.',
      why_en: '1:1 stoichiometric reaction with endothermic lattice dissolution enthalpy.'
    },
    confidence: 1.0
  },

  // 4. Zn + 2HCl -> ZnCl2 + H2
  {
    schema: 'chemdex.program/1',
    id: 'zn_hcl',
    provenance: 'handcrafted',
    controller: 'zn_hcl',
    chemistry: {
      equation: 'Zn(s) + 2HCl(aq) -> ZnCl2(aq) + H2(g)',
      species: [
        { formula: 'Zn', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'HCl', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'ZnCl2', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2', role: 'product', coeff: 1, phase: 'g', hazards: ['GHS02_flammable'] }
      ],
      deltaH_kJ_per_mol: -153.9,
      kinetics: { model: 'surface_limited', halfTime_s: 2.5, stirSensitivity: 0.7 },
      hazards: ['GHS05_corrosive', 'GHS02_flammable']
    },
    visual: {
      duration_s: 7.5,
      timeline: [
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0, 0.8], intensity: 1.2, params: { bubbleRate: 40, meanRadius_mm: 1.8, color: '#e0f2fe', gasSpecies: 'H2' } },
        { id: 'plume', atom: 'buoyantGasPlume', anchor: 'rim', window: [0.1, 0.9], intensity: 0.8, params: { riseSpeed: 2.0, color: '#f8fafc', opacity: 0.15 } },
        { id: 'erosion', atom: 'solidErosion', anchor: 'bottom', window: [0, 1.0], intensity: 1.0, params: { initialShape: 'granule', erosionRate: 0.12 } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'bulk', window: [0, 0.7], intensity: 0.8, params: { soundProfile: 'fizz_effervescence', volume: 0.6 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        solidsRemaining: [{ formula: 'Zn', mass_g: 'fromLedger', morphologyChange: 'pitted_granule' }],
        gasesOffgassed: [{ species: 'H2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Bọt khí không màu H2 thoát ra đều đặn từ bề mặt viên kẽm, viên kẽm mòn dần, dung dịch ấm lên.',
      observation_en: 'Steady stream of fine H2 bubbles nucleate from zinc surface; granule erodes as flask warms.',
      why_vi: 'Kẽm đứng trước hiđro trong dãy điện hóa, khử ion H+ thành khí H2.',
      why_en: 'Zinc reduces hydrogen ions into H2 gas with substantial exothermic enthalpy.'
    },
    confidence: 1.0
  },

  // 5. Mg + 2HCl -> MgCl2 + H2 (Very fast & hot)
  {
    schema: 'chemdex.program/1',
    id: 'mg_hcl',
    provenance: 'handcrafted',
    controller: 'mg_hcl',
    chemistry: {
      equation: 'Mg(s) + 2HCl(aq) -> MgCl2(aq) + H2(g)',
      species: [
        { formula: 'Mg', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'HCl', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'MgCl2', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2', role: 'product', coeff: 1, phase: 'g', hazards: ['GHS02_flammable'] }
      ],
      deltaH_kJ_per_mol: -466.8,
      kinetics: { model: 'heat_activated', halfTime_s: 0.8 },
      hazards: ['GHS05_corrosive', 'GHS02_flammable']
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bottom', window: [0, 0.7], intensity: 1.8, params: { intensity: 3.5, churnRadius: 0.5, gasSpecies: 'H2' } },
        { id: 'steam', atom: 'thermalSteam', anchor: 'rim', window: [0.15, 0.85], intensity: 1.0, params: { steamDensity: 0.9, temperature_c: 68 } },
        { id: 'erosion', atom: 'solidErosion', anchor: 'bottom', window: [0, 0.8], intensity: 1.5, params: { initialShape: 'ribbon', erosionRate: 0.35 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'H2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Dải magie tan rất nhanh, sủi bọt mãnh liệt, tỏa nhiệt nóng rực, hơi nước bốc lên.',
      observation_en: 'Magnesium ribbon dissolves extremely rapidly with vigorous effervescence and intense heat.',
      why_vi: 'Magie có tính khử rất mạnh, tỏa nhiệt ΔH = -466.8 kJ/mol làm tăng tốc độ phản ứng theo cấp số nhân.',
      why_en: 'Highly active metal with massive exothermic enthalpy accelerating reaction via Arrhenius thermal feedback.'
    },
    confidence: 1.0
  },

  // 6. Fe + 2HCl -> FeCl2 + H2
  {
    schema: 'chemdex.program/1',
    id: 'fe_hcl',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Fe(s) + 2HCl(aq) -> FeCl2(aq) + H2(g)',
      species: [
        { formula: 'Fe', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'HCl', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'FeCl2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#a7f3d0' }, // Pale green
        { formula: 'H2', role: 'product', coeff: 1, phase: 'g' }
      ],
      deltaH_kJ_per_mol: -87.9,
      kinetics: { model: 'surface_limited', halfTime_s: 5.0, stirSensitivity: 0.6 }
    },
    visual: {
      duration_s: 8.0,
      timeline: [
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0, 0.8], intensity: 0.9, params: { bubbleRate: 22, meanRadius_mm: 1.6, color: '#e0f2fe', gasSpecies: 'H2' } },
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0.2, 0.9], intensity: 0.8, params: { startColor: '#ffffff', endColor: '#d1fae5', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#d1fae5',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        solidsRemaining: [{ formula: 'Fe', mass_g: 'fromLedger', morphologyChange: 'corroded_nail' }],
        gasesOffgassed: [{ species: 'H2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Đinh sắt sủi bọt khí chậm rãi, dung dịch dần nhuốm màu xanh nhạt của ion Fe2+.',
      observation_en: 'Iron nail slowly evolves H2 bubbles; solution takes on a subtle pale green tint of Fe2+.',
      why_vi: 'Sắt có thế điện cực âm (-0.44V) phản ứng vừa phải với axit loãng.',
      why_en: 'Moderate standard reduction potential (-0.44V) produces steady hydrogen evolution.'
    },
    confidence: 1.0
  },

  // 7. 2Al + 6HCl -> 2AlCl3 + 3H2
  {
    schema: 'chemdex.program/1',
    id: 'al_hcl',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2Al(s) + 6HCl(aq) -> 2AlCl3(aq) + 3H2(g)',
      species: [
        { formula: 'Al', role: 'reactant', coeff: 2, phase: 's' },
        { formula: 'HCl', role: 'reactant', coeff: 6, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'AlCl3', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'H2', role: 'product', coeff: 3, phase: 'g' }
      ],
      deltaH_kJ_per_mol: -1004.0,
      kinetics: { model: 'induction_then_fast', halfTime_s: 1.5, induction_s: 3.0 },
      hazards: ['GHS05_corrosive', 'GHS02_flammable']
    },
    visual: {
      duration_s: 8.5,
      timeline: [
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0.1, 0.4], intensity: 0.5, params: { bubbleRate: 15, meanRadius_mm: 1.2, gasSpecies: 'H2' } },
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bottom', window: [0.4, 0.9], intensity: 2.0, params: { intensity: 3.8, churnRadius: 0.55, gasSpecies: 'H2' } },
        { id: 'steam', atom: 'thermalSteam', anchor: 'rim', window: [0.45, 0.95], intensity: 1.2, params: { steamDensity: 1.1, temperature_c: 75 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.05,
        gasesOffgassed: [{ species: 'H2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Ban đầu phản ứng chậm do màng oxit Al2O3 bảo vệ; sau vài giây sủi bọt bùng nổ dữ dội và cốc rất nóng.',
      observation_en: 'Induction delay as acid dissolves protective oxide film, followed by explosive foaming and boiling heat.',
      why_vi: 'Sau khi lớp màng Al2O3 bị phá hủy, kim loại Al tiếp xúc trực tiếp giải phóng năng lượng cực lớn.',
      why_en: 'Passivating oxide film dissolution is followed by rapid highly exothermic oxidation of raw aluminum.'
    },
    confidence: 1.0
  },

  // 8. Na2SO3 + 2HCl -> 2NaCl + H2O + SO2 (Choking sulfurous gas)
  {
    schema: 'chemdex.program/1',
    id: 'na2so3_hcl',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Na2SO3(aq) + 2HCl(aq) -> 2NaCl(aq) + H2O(l) + SO2(g)',
      species: [
        { formula: 'Na2SO3', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'HCl', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'NaCl', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' },
        { formula: 'SO2', role: 'product', coeff: 1, phase: 'g', hazards: ['GHS06_toxic'] }
      ],
      deltaH_kJ_per_mol: -18.0,
      kinetics: { model: 'instant', halfTime_s: 0.3 },
      hazards: ['GHS05_corrosive', 'GHS06_toxic'],
      warning_vi: 'Khí SO2 có mùi hắc nồng nặc (mùi diêm sinh cháy), gây co thắt đường hô hấp.',
      warning_en: 'SO2 has a suffocating burnt match odor; toxic irritant to respiratory tract.'
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bulk', window: [0, 0.6], intensity: 1.2, params: { intensity: 2.2, churnRadius: 0.45, gasSpecies: 'SO2' } },
        { id: 'plume', atom: 'heavyVaporPour', anchor: 'rim', window: [0.1, 0.8], intensity: 0.9, params: { color: '#f8fafc', densityMultiplier: 2.2, spillRate: 25 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'SO2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Sủi bọt sinh khí SO2 không màu, có mùi hắc nồng nặc của que diêm quẹt cháy.',
      observation_en: 'Effervescence evolving colorless SO2 gas with sharp, choking burnt-match odor.',
      why_vi: 'Axit sunfurơ H2SO3 kém bền phân hủy tức thì giải phóng khí SO2.',
      why_en: 'Unstable sulfurous acid decomposes instantaneously into sulfur dioxide gas.'
    },
    confidence: 1.0
  },

  // 9. FeS + 2HCl -> FeCl2 + H2S (Rotten egg gas)
  {
    schema: 'chemdex.program/1',
    id: 'fes_hcl',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'FeS(s) + 2HCl(aq) -> FeCl2(aq) + H2S(g)',
      species: [
        { formula: 'FeS', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'HCl', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'FeCl2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#a7f3d0' },
        { formula: 'H2S', role: 'product', coeff: 1, phase: 'g', hazards: ['GHS06_toxic', 'GHS02_flammable'] }
      ],
      deltaH_kJ_per_mol: -22.0,
      kinetics: { model: 'surface_limited', halfTime_s: 3.0 },
      hazards: ['GHS05_corrosive', 'GHS06_toxic'],
      warning_vi: 'Khí H2S cực kỳ độc, có mùi trứng thối nồng nặc. Cần thao tác trong tủ hút.',
      warning_en: 'Highly toxic H2S gas with intense rotten egg odor. Must use fume hood.'
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0, 0.75], intensity: 1.0, params: { bubbleRate: 30, meanRadius_mm: 1.8, gasSpecies: 'H2S' } },
        { id: 'erosion', atom: 'solidErosion', anchor: 'bottom', window: [0, 0.9], intensity: 1.0, params: { initialShape: 'granule', erosionRate: 0.15 } }
      ],
      after: {
        liquidColor: '#d1fae5',
        liquidOpacity: 0.95,
        turbidity: 0.05,
        gasesOffgassed: [{ species: 'H2S', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Hạt quặng FeS đen tan dần, sủi bọt khí H2S có mùi trứng thối nồng nặc.',
      observation_en: 'Black FeS particles dissolve steadily releasing H2S gas with pungent rotten-egg stench.',
      why_vi: 'HCl hòa tan quặng sunfua kim loại giải phóng khí hiđro sunfua.',
      why_en: 'Acid dissolution of metal sulfide produces hydrogen sulfide gas.'
    },
    confidence: 1.0
  },

  // 10. NH4Cl + NaOH -> NaCl + H2O + NH3 (Pungent ammonia gas)
  {
    schema: 'chemdex.program/1',
    id: 'nh4cl_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'NH4Cl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l) + NH3(g)',
      species: [
        { formula: 'NH4Cl', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'NaOH', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'NaCl', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' },
        { formula: 'NH3', role: 'product', coeff: 1, phase: 'g', hazards: ['GHS05_corrosive', 'GHS06_toxic'] }
      ],
      deltaH_kJ_per_mol: -5.0,
      kinetics: { model: 'first_order', halfTime_s: 1.2 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bulk', window: [0.1, 0.6], intensity: 0.7, params: { bubbleRate: 18, meanRadius_mm: 1.5, gasSpecies: 'NH3' } },
        { id: 'plume', atom: 'buoyantGasPlume', anchor: 'rim', window: [0.2, 0.8], intensity: 0.8, params: { riseSpeed: 1.4, color: '#ffffff', opacity: 0.2 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'NH3', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Dung dịch bốc mùi khai nồng nặc đặc trưng của amoniac, làm xanh giấy quỳ đỏ ẩm.',
      observation_en: 'Strong pungent ammonia smell evolves, turning moist red litmus paper blue.',
      why_vi: 'Bazơ mạnh đẩy bazơ yếu NH3 dễ bay hơi ra khỏi muối amoni.',
      why_en: 'Strong base displaces volatile weak ammonia base from ammonium salt.'
    },
    confidence: 1.0
  },

  // 11. 2H2O2 -> 2H2O + O2 (Catalytic MnO2)
  {
    schema: 'chemdex.program/1',
    id: 'h2o2_mno2',
    provenance: 'handcrafted',
    controller: 'catalytic_oxygen_prep',
    chemistry: {
      equation: '2H2O2(aq) -> 2H2O(l) + O2(g)',
      conditions: { catalyst: 'MnO2' },
      species: [
        { formula: 'H2O2', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS05_corrosive'] },
        { formula: 'MnO2', role: 'catalyst', coeff: 1, phase: 's', colorHex: '#18181b' },
        { formula: 'H2O', role: 'product', coeff: 2, phase: 'l' },
        { formula: 'O2', role: 'product', coeff: 1, phase: 'g' }
      ],
      deltaH_kJ_per_mol: -98.2,
      kinetics: { model: 'heat_activated', halfTime_s: 1.0 },
      hazards: ['GHS03_oxidizer']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bottom', window: [0, 0.75], intensity: 1.6, params: { intensity: 3.2, churnRadius: 0.5, gasSpecies: 'O2' } },
        { id: 'steam', atom: 'thermalSteam', anchor: 'rim', window: [0.15, 0.85], intensity: 0.8, params: { steamDensity: 0.7, temperature_c: 62 } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'bulk', window: [0, 0.75], intensity: 1.0, params: { soundProfile: 'fizz_effervescence', volume: 0.8 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.15,
        solidsRemaining: [{ formula: 'MnO2', mass_g: 'fromLedger' }],
        gasesOffgassed: [{ species: 'O2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Sủi bọt mãnh liệt sinh khí oxi duy trì sự cháy, tỏa nhiệt ấm, bột đen MnO2 đóng vai trò xúc tác không bị tiêu hao.',
      observation_en: 'Vigorous oxygen bubbling with heat; black MnO2 catalyst remains chemically unchanged.',
      why_vi: 'MnO2 hạ thấp năng lượng hoạt hóa của phản ứng phân hủy hiđro peoxit.',
      why_en: 'MnO2 lowers the activation energy for exothermic H2O2 decomposition.'
    },
    confidence: 1.0
  },

  // 12. Cu + 4HNO3(conc) -> Cu(NO3)2 + 2NO2 + 2H2O (Dense reddish-brown gas)
  {
    schema: 'chemdex.program/1',
    id: 'cu_hno3_conc',
    provenance: 'handcrafted',
    controller: 'cu_hno3_conc',
    chemistry: {
      equation: 'Cu(s) + 4HNO3(conc) -> Cu(NO3)2(aq) + 2NO2(g) + 2H2O(l)',
      species: [
        { formula: 'Cu', role: 'reactant', coeff: 1, phase: 's', colorHex: '#b45309' },
        { formula: 'HNO3', role: 'reactant', coeff: 4, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS05_corrosive'] },
        { formula: 'Cu(NO3)2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#0284c7' },
        { formula: 'NO2', role: 'product', coeff: 2, phase: 'g', colorHex: '#9a3412', hazards: ['GHS06_toxic'] },
        { formula: 'H2O', role: 'product', coeff: 2, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -136.0,
      kinetics: { model: 'heat_activated', halfTime_s: 1.2 },
      hazards: ['GHS03_oxidizer', 'GHS05_corrosive', 'GHS06_toxic'],
      warning_vi: 'Khí NO2 màu nâu đỏ cực kỳ độc, mùi hắc gắt gây bỏng phổi. Bắt buộc làm trong tủ hút!',
      warning_en: 'Dense reddish-brown NO2 gas is highly toxic and corrosive to lungs. Fume hood required!'
    },
    visual: {
      duration_s: 8.5,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bottom', window: [0, 0.7], intensity: 1.4, params: { intensity: 2.8, churnRadius: 0.45, gasSpecies: 'NO2' } },
        { id: 'plume', atom: 'heavyVaporPour', anchor: 'rim', window: [0.1, 0.9], intensity: 1.8, params: { color: '#9a3412', densityMultiplier: 1.58, spillRate: 40 } },
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0.2, 0.9], intensity: 1.3, params: { startColor: '#ffffff', endColor: '#0284c7', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#0284c7',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'NO2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Dung dịch sủi bọt dữ dội và chuyển dần sang màu xanh lam đậm; luồng khí màu nâu đỏ đặc quánh cuộn tràn qua miệng bình.',
      observation_en: 'Violent bubbling as solution turns deep blue; dense reddish-brown fumes cascade over the rim.',
      why_vi: 'Đồng bị axit nitric đặc oxi hóa mạnh sinh ion Cu2+ màu xanh và khí nitơ đioxit NO2 màu nâu đỏ nặng hơn không khí.',
      why_en: 'Concentrated HNO3 oxidizes copper into blue Cu2+ while reducing nitrate to heavy brown NO2 vapor.'
    },
    confidence: 1.0
  },

  // 13. 3Cu + 8HNO3(dil) -> 3Cu(NO3)2 + 2NO + 4H2O (Colorless NO turning brown in air)
  {
    schema: 'chemdex.program/1',
    id: 'cu_hno3_dil',
    provenance: 'handcrafted',
    chemistry: {
      equation: '3Cu(s) + 8HNO3(dil) -> 3Cu(NO3)2(aq) + 2NO(g) + 4H2O(l)',
      species: [
        { formula: 'Cu', role: 'reactant', coeff: 3, phase: 's', colorHex: '#b45309' },
        { formula: 'HNO3', role: 'reactant', coeff: 8, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Cu(NO3)2', role: 'product', coeff: 3, phase: 'aq', colorHex: '#0284c7' },
        { formula: 'NO', role: 'product', coeff: 2, phase: 'g', hazards: ['GHS06_toxic'] },
        { formula: 'H2O', role: 'product', coeff: 4, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -358.0,
      kinetics: { model: 'surface_limited', halfTime_s: 3.5 },
      hazards: ['GHS05_corrosive', 'GHS06_toxic']
    },
    visual: {
      duration_s: 8.0,
      timeline: [
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0, 0.75], intensity: 1.0, params: { bubbleRate: 25, meanRadius_mm: 1.8, gasSpecies: 'NO' } },
        { id: 'plume', atom: 'buoyantGasPlume', anchor: 'rim', window: [0.25, 0.85], intensity: 0.9, params: { riseSpeed: 1.2, color: '#b45309', opacity: 0.45 } },
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0.2, 0.9], intensity: 1.0, params: { startColor: '#ffffff', endColor: '#0284c7', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#0284c7',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'NO', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Khí thoát ra trong lòng chất lỏng không màu, nhưng khi lên đến miệng bình tiếp xúc không khí lập tức hóa nâu đỏ.',
      observation_en: 'Colorless bubbles in solution turn reddish-brown immediately upon contacting air at the mouth.',
      why_vi: 'Khí NO không màu tự phát kết hợp với oxi không khí (2NO + O2 -> 2NO2) tạo NO2 màu nâu đỏ.',
      why_en: 'Colorless nitric oxide NO spontaneously oxidizes in air to reddish-brown nitrogen dioxide NO2.'
    },
    confidence: 1.0
  }
];
