/**
 * exemplars/index.ts — 10 Verified Exemplar Programs for AI Effect Director
 * 
 * Satisfies §7.3 & §7.9: Handcrafted, diverse exemplars covering:
 * (a) Zn + Pb(NO3)2(aq) => Lead tree dendrite
 * (b) Na2S + CuSO4 => Black CuS colloid (neutral pH, no gas)
 * (c) NaCl + KNO3 => No reaction (mixing swirl, Beer-Lambert)
 * (d) CaCl2 + Na2CO3 => Fine white CaCO3 powder, no gas
 * (e) Cu + conc. HNO3 => Dense brown NO2 plume, green->blue solution
 * (f) NH3(g) + HCl(g) => Graham's diffusion ring (1.46 distance ratio)
 * (g) Supersaturated sodium acetate => Rapid crystallization bloom
 * (h) BaCl2 + Na2SO4 => Slow Stokes settling BaSO4 (hours timeWarp)
 * (i) HCl + NaOH => Equimolar neutralization with indicator
 * (j) 2Na + 2H2O => Floating sodium skitter, H2 bubbles, alkaline trail
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const EXEMPLAR_ZN_PBNO32: ReactionProgram = {
  schema: 'chemdex.program/1',
  id: 'zn+pb(no3)2',
  provenance: 'handcrafted',
  chemistry: {
    equation: 'Zn(s) + Pb(NO3)2(aq) -> Zn(NO3)2(aq) + Pb(s)',
    ionic: 'Zn(s) + Pb2+(aq) -> Zn2+(aq) + Pb(s)',
    species: [
      { formula: 'Zn', role: 'reactant', coeff: 1, phase: 's', colorHex: '#808790' },
      { formula: 'Pb(NO3)2', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'Zn(NO3)2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'Pb', role: 'product', coeff: 1, phase: 's', colorHex: '#4a4e54' }
    ],
    deltaH_kJ_per_mol: -156.0,
    kinetics: { model: 'surface_limited', halfTime_s: 15.0 },
    hazards: ['GHS08_health_hazard', 'GHS09_environmental']
  },
  visual: {
    duration_s: 12.0,
    timeWarp: { physical_s: 300.0, note_vi: 'Cây chì phát triển trong 5 phút', note_en: 'Lead tree grows over 5 minutes' },
    timeline: [
      {
        id: 'dendrite_lead',
        atom: 'dendriticMetalTree',
        anchor: 'bottom',
        window: [0.0, 1.0],
        intensity: { bind: 'rate:Pb(s)', gain: 1.0 },
        params: { branchiness: 0.85, metalLuster: 0.9, growthSpeed: 1.2 }
      },
      {
        id: 'zinc_etch',
        atom: 'metalDissolveWithBubbles',
        anchor: 'bottom',
        window: [0.0, 0.9],
        intensity: 0.5,
        params: { bubbleRate: 0.05, surfaceRoughness: 0.7 }
      }
    ],
    after: {
      liquidColor: '#ffffff',
      liquidOpacity: 0.95,
      turbidity: 0.0,
      solidsRemaining: [{ formula: 'Pb', mass_g: 'fromLedger', morphologyChange: 'dendritic' }],
      gasesOffgassed: []
    }
  },
  explain: {
    observation_vi: 'Kẽm kim loại bị ăn mòn xám đen, các tinh thể chì hình lông chim/cành cây lấp lánh mọc tỏa ra quanh kẽm.',
    observation_en: 'Zinc surface etches dull gray as glittering feather-like dendritic lead crystals branch outward.',
    why_vi: 'Kẽm có thế khử chuẩn âm hơn chì (hoạt động hóa học mạnh hơn) nên đẩy ion Pb2+ ra khỏi dung dịch tạo tinh thể kim loại chì.',
    why_en: 'Zinc has a more negative standard reduction potential than lead, displacing aqueous Pb2+ into metallic crystalline lead trees.'
  },
  confidence: 1.0
};

export const EXEMPLAR_NA2S_CUSO4: ReactionProgram = {
  schema: 'chemdex.program/1',
  id: 'na2s+cuso4',
  provenance: 'handcrafted',
  chemistry: {
    equation: 'Na2S(aq) + CuSO4(aq) -> CuS(s) + Na2SO4(aq)',
    ionic: 'Cu2+(aq) + S2-(aq) -> CuS(s)',
    species: [
      { formula: 'CuSO4', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#3b82f6' },
      { formula: 'Na2S', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'CuS', role: 'product', coeff: 1, phase: 's', colorHex: '#111317' },
      { formula: 'Na2SO4', role: 'product', coeff: 1, phase: 'aq', colorHex: '#ffffff' }
    ],
    deltaH_kJ_per_mol: -130.5,
    kinetics: { model: 'instant', halfTime_s: 0.3 },
    hazards: ['GHS09_environmental']
  },
  visual: {
    duration_s: 5.0,
    timeline: [
      {
        id: 'cus_colloid',
        atom: 'blackFineColloid',
        anchor: 'pourPoint',
        window: [0.0, 0.8],
        intensity: { bind: 'rate:CuS(s)', gain: 1.5 },
        params: { opacity: 0.98, particleSize_um: 0.05, settleHalfLife_s: 600.0 }
      },
      {
        id: 'fade_blue',
        atom: 'fadeAbsorbance',
        anchor: 'bulk',
        window: [0.0, 0.6],
        intensity: 1.0,
        params: { species: 'Cu2+', initialAbsorbance: 0.8 }
      }
    ],
    after: {
      liquidColor: '#181a1f',
      liquidOpacity: 0.98,
      turbidity: 0.95,
      precipitate: { substance: 'CuS', morphology: 'amorphous_black', color: '#111317', mass_g: 'fromLedger' },
      gasesOffgassed: []
    }
  },
  explain: {
    observation_vi: 'Dung dịch màu xanh lam lập tức xuất hiện kết tủa keo màu đen tuyền CuS, không sủi bọt khí ở môi trường trung tính.',
    observation_en: 'Deep blue solution immediately forms an intense jet-black colloidal precipitate of CuS; no gas evolves at neutral pH.',
    why_vi: 'Độ tan của CuS cực kỳ bé (Ksp ~ 6x10^-36), phản ứng trao đổi ion diễn ra tức thời.',
    why_en: 'Extremely low solubility product of CuS (Ksp ~ 6e-36) precipitates Cu2+ instantaneously.'
  },
  confidence: 1.0
};

export const EXEMPLAR_NACL_KNO3: ReactionProgram = {
  schema: 'chemdex.program/1',
  id: 'nacl+kno3',
  provenance: 'handcrafted',
  chemistry: {
    equation: 'NaCl(aq) + KNO3(aq) -> NaCl(aq) + KNO3(aq)',
    ionic: 'Na+(aq) + Cl-(aq) + K+(aq) + NO3-(aq) (no reaction)',
    species: [
      { formula: 'NaCl', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'KNO3', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ffffff' }
    ],
    deltaH_kJ_per_mol: 0.0,
    kinetics: { model: 'instant', halfTime_s: 1.0 },
    hazards: []
  },
  visual: {
    duration_s: 4.0,
    timeline: [
      {
        id: 'beer_mix',
        atom: 'beerLambertBlend',
        anchor: 'bulk',
        window: [0.0, 0.7],
        intensity: 1.0,
        params: { opticalPath_cm: 2.5 }
      },
      {
        id: 'schlieren_mixing',
        atom: 'schlierenStreaks',
        anchor: 'pourPoint',
        window: [0.0, 0.5],
        intensity: 0.6,
        params: { refractionDelta: 0.012, swirlDecay_s: 2.0 }
      }
    ],
    after: {
      liquidColor: '#ffffff',
      liquidOpacity: 0.95,
      turbidity: 0.0,
      gasesOffgassed: []
    }
  },
  explain: {
    observation_vi: 'Không có hiện tượng gì xảy ra; dung dịch vẫn trong suốt không màu, chỉ quan sát thấy các vệt gợn khúc xạ trộn lẫn ban đầu.',
    observation_en: 'No observable reaction; solution remains crystal clear with brief refractive schlieren swirls during mixing.',
    why_vi: 'Tất cả các ion Na+, Cl-, K+, NO3- đều tan hoàn toàn trong nước, không tạo kết tủa, chất bay hơi hay chất điện ly yếu.',
    why_en: 'All constituent ions (Na+, K+, Cl-, NO3-) are highly soluble spectators; no precipitate, weak electrolyte or gas is formed.'
  },
  confidence: 1.0
};

export const EXEMPLAR_CACL2_NA2CO3: ReactionProgram = {
  schema: 'chemdex.program/1',
  id: 'cacl2+na2co3',
  provenance: 'handcrafted',
  chemistry: {
    equation: 'CaCl2(aq) + Na2CO3(aq) -> CaCO3(s) + 2NaCl(aq)',
    ionic: 'Ca2+(aq) + CO3 2-(aq) -> CaCO3(s)',
    species: [
      { formula: 'CaCl2', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'Na2CO3', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'CaCO3', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
      { formula: 'NaCl', role: 'product', coeff: 2, phase: 'aq', colorHex: '#ffffff' }
    ],
    deltaH_kJ_per_mol: -12.5,
    kinetics: { model: 'instant', halfTime_s: 0.5 },
    hazards: []
  },
  visual: {
    duration_s: 6.0,
    timeline: [
      {
        id: 'caco3_powder',
        atom: 'fineMilkyPowder',
        anchor: 'pourPoint',
        window: [0.0, 0.8],
        intensity: { bind: 'rate:CaCO3(s)', gain: 1.0 },
        params: { crystalSize_um: 5.0, milkiness: 0.9 }
      },
      {
        id: 'turbidity_caco3',
        atom: 'turbidityRise',
        anchor: 'bulk',
        window: [0.0, 0.7],
        intensity: 1.0,
        params: { peakNTU: 450.0, hazeColor: '#ffffff' }
      }
    ],
    after: {
      liquidColor: '#f1f5f9',
      liquidOpacity: 0.95,
      turbidity: 0.85,
      precipitate: { substance: 'CaCO3', morphology: 'fine_powder', color: '#ffffff', mass_g: 'fromLedger' },
      gasesOffgassed: []
    }
  },
  explain: {
    observation_vi: 'Xuất hiện kết tủa trắng dạng bột mịn làm đục dung dịch như sữa, hoàn toàn không sinh bọt khí.',
    observation_en: 'A fine white milky precipitate of calcium carbonate forms rapidly; no gas bubbles evolve.',
    why_vi: 'Ion Ca2+ và CO3 2- kết hợp tạo CaCO3 ít tan (Ksp ~ 3.4x10^-9). Lưu ý không nhầm với phản ứng Na2CO3 + axit.',
    why_en: 'Calcium ions and carbonate ions combine to precipitate insoluble CaCO3 (Ksp ~ 3.4e-9).'
  },
  confidence: 1.0
};

export const EXEMPLAR_CU_HNO3: ReactionProgram = {
  schema: 'chemdex.program/1',
  id: 'cu+hno3_conc',
  provenance: 'handcrafted',
  chemistry: {
    equation: 'Cu(s) + 4HNO3(aq) -> Cu(NO3)2(aq) + 2NO2(g) + 2H2O(l)',
    species: [
      { formula: 'Cu', role: 'reactant', coeff: 1, phase: 's', colorHex: '#b87333' },
      { formula: 'HNO3', role: 'reactant', coeff: 4, phase: 'aq', colorHex: '#e2e8f0' },
      { formula: 'Cu(NO3)2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#0284c7' },
      { formula: 'NO2', role: 'product', coeff: 2, phase: 'g', colorHex: '#b8501a' },
      { formula: 'H2O', role: 'product', coeff: 2, phase: 'l', colorHex: '#ffffff' }
    ],
    deltaH_kJ_per_mol: -136.0,
    kinetics: { model: 'surface_limited', halfTime_s: 4.0 },
    hazards: ['GHS05_corrosive', 'GHS06_toxic', 'GHS03_oxidizer'],
    warning_vi: 'ĐỘC: Khí NO2 màu nâu đỏ cực kỳ độc hại và ăn mòn đường hô hấp. Phải tiến hành trong tủ hút!',
    warning_en: 'DANGER: Highly toxic and corrosive red-brown NO2 gas evolved. Must be conducted in a fume hood!'
  },
  visual: {
    duration_s: 10.0,
    timeline: [
      {
        id: 'no2_plume',
        atom: 'no2BrownPlume',
        anchor: 'headspace',
        window: [0.05, 1.0],
        intensity: { bind: 'rate:NO2', gain: 1.5 },
        params: { opticalDensity: 1.4, brownHue: '#b8501a', temperatureKelvin: 330.0 }
      },
      {
        id: 'cu_fizz',
        atom: 'metalDissolveWithBubbles',
        anchor: 'bottom',
        window: [0.0, 0.85],
        intensity: 1.2,
        params: { bubbleRate: 1.8, surfaceRoughness: 0.95 }
      },
      {
        id: 'solution_color_shift',
        atom: 'multiStageColorLadder',
        anchor: 'bulk',
        window: [0.1, 0.9],
        intensity: 1.0,
        params: { stages: 3, finalHex: '#0284c7' }
      }
    ],
    after: {
      liquidColor: '#0284c7',
      liquidOpacity: 0.95,
      turbidity: 0.05,
      gasesOffgassed: [{ species: 'NO2', mol: 'fromLedger', escaped: true }]
    }
  },
  explain: {
    observation_vi: 'Mảnh đồng tan nhanh sủi bọt mạnh, dung dịch chuyển từ không màu sang xanh lục đậm rồi xanh lam, khí màu nâu đỏ NO2 đậm đặc tỏa ra.',
    observation_en: 'Copper dissolves vigorously with effervescence; liquid turns deep green then vibrant blue, with dense red-brown NO2 choking fumes.',
    why_vi: 'Axit nitric đặc có tính oxi hóa rất mạnh, oxi hóa đồng kim loại lên Cu2+ và bị khử thành khí nitơ đioxit NO2.',
    why_en: 'Concentrated nitric acid is a strong oxidizer, oxidizing copper to Cu2+ while reducing nitrate to dense nitrogen dioxide (NO2).'
  },
  confidence: 1.0
};

export const EXEMPLAR_NH3_HCL: ReactionProgram = {
  schema: 'chemdex.program/1',
  id: 'nh3+hcl',
  provenance: 'handcrafted',
  chemistry: {
    equation: 'NH3(g) + HCl(g) -> NH4Cl(s)',
    species: [
      { formula: 'NH3', role: 'reactant', coeff: 1, phase: 'g', colorHex: '#ffffff' },
      { formula: 'HCl', role: 'reactant', coeff: 1, phase: 'g', colorHex: '#ffffff' },
      { formula: 'NH4Cl', role: 'product', coeff: 1, phase: 's', colorHex: '#f8fafc' }
    ],
    deltaH_kJ_per_mol: -176.0,
    kinetics: { model: 'diffusion_limited', halfTime_s: 3.0 },
    hazards: ['GHS05_corrosive', 'GHS07_harmful']
  },
  visual: {
    duration_s: 8.0,
    timeline: [
      {
        id: 'nh4cl_smoke_ring',
        atom: 'ammoniumChlorideSmoke',
        anchor: 'headspace',
        window: [0.1, 1.0],
        intensity: 1.0,
        params: { smokeDensity: 1.8, ringLocation_ratio: 0.59 }
      }
    ],
    after: {
      liquidColor: '#ffffff',
      liquidOpacity: 0.95,
      turbidity: 0.0,
      residues: [{ where: 'wall', kind: 'nh4cl_white_crust', color: '#f8fafc', amount: 0.5 }],
      gasesOffgassed: []
    }
  },
  explain: {
    observation_vi: 'Tại vị trí hai dòng khí gặp nhau xuất hiện vòng khói trắng đục NH4Cl, vị trí khói lệch gần về phía đầu ống chứa HCl (tỷ lệ Graham 1.46).',
    observation_en: 'Dense white smoke ring of NH4Cl forms where the gases meet, positioned closer to the HCl source (Graham ratio 1.46).',
    why_vi: 'NH3 nhẹ hơn HCl nên khuếch tán nhanh hơn theo định luật Graham (tốc độ tỷ lệ nghịch căn bậc hai khối lượng mol: sqrt(36.46/17.03) = 1.46).',
    why_en: "Lighter NH3 diffuses faster than heavier HCl following Graham's law: distance ratio = sqrt(36.46/17.03) = 1.46."
  },
  confidence: 1.0
};

export const EXEMPLAR_CH3COONA_CRYSTALLIZE: ReactionProgram = {
  schema: 'chemdex.program/1',
  id: 'ch3coona_crystallization',
  provenance: 'handcrafted',
  chemistry: {
    equation: 'CH3COONa(aq, supersat) -> CH3COONa.3H2O(s)',
    species: [
      { formula: 'CH3COONa', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'CH3COONa.3H2O', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' }
    ],
    deltaH_kJ_per_mol: -19.7,
    kinetics: { model: 'induction_then_fast', halfTime_s: 1.0, induction_s: 0.2 },
    hazards: []
  },
  visual: {
    duration_s: 6.0,
    timeline: [
      {
        id: 'spike_bloom',
        atom: 'crystalSpikeBloom',
        anchor: 'bulk',
        window: [0.05, 0.7],
        intensity: 1.2,
        params: { propagationSpeed: 2.5, needleSharpness: 0.85, opacity: 0.95 }
      },
      {
        id: 'exo_glow',
        atom: 'exothermicGlowOverlay',
        anchor: 'bulk',
        window: [0.1, 0.8],
        intensity: 0.7,
        params: { deltaT_celsius: 12.0, glowRadius: 0.6 }
      }
    ],
    after: {
      liquidColor: '#ffffff',
      liquidOpacity: 0.2,
      turbidity: 1.0,
      solidsRemaining: [{ formula: 'CH3COONa.3H2O', mass_g: 'fromLedger', morphologyChange: 'crystalline_spikes' }],
      gasesOffgassed: []
    }
  },
  explain: {
    observation_vi: 'Khi chạm mầm tinh thể, toàn bộ dung dịch lập tức đóng băng trắng xóa thành các trụ gai tinh thể lấp lánh và tỏa nhiệt nóng rực (băng nóng).',
    observation_en: 'Upon introducing a seed crystal, rapid crystallization sweeps through the liquid forming white crystalline spikes and releasing heat (hot ice).',
    why_vi: 'Dung dịch natri axetat quá bão hòa không bền; mầm tinh thể kích hoạt sự kết tinh dây chuyền giải phóng entanpi kết tinh.',
    why_en: 'Supersaturated sodium acetate is metastable; nucleation triggers rapid exothermic lattice formation.'
  },
  confidence: 1.0
};

export const EXEMPLAR_BACL2_NA2SO4: ReactionProgram = {
  schema: 'chemdex.program/1',
  id: 'bacl2+na2so4',
  provenance: 'handcrafted',
  chemistry: {
    equation: 'BaCl2(aq) + Na2SO4(aq) -> BaSO4(s) + 2NaCl(aq)',
    ionic: 'Ba2+(aq) + SO4 2-(aq) -> BaSO4(s)',
    species: [
      { formula: 'BaCl2', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'Na2SO4', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'BaSO4', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
      { formula: 'NaCl', role: 'product', coeff: 2, phase: 'aq', colorHex: '#ffffff' }
    ],
    deltaH_kJ_per_mol: -26.0,
    kinetics: { model: 'instant', halfTime_s: 0.4 },
    hazards: ['GHS07_harmful']
  },
  visual: {
    duration_s: 8.0,
    timeWarp: { physical_s: 25200.0, note_vi: 'Lắng hoàn toàn mất ~7 giờ theo định luật Stokes', note_en: 'Settles over ~7 hours per Stokes law' },
    timeline: [
      {
        id: 'baso4_powder',
        atom: 'fineMilkyPowder',
        anchor: 'pourPoint',
        window: [0.0, 0.7],
        intensity: { bind: 'rate:BaSO4(s)', gain: 1.0 },
        params: { crystalSize_um: 0.5, milkiness: 1.0 }
      },
      {
        id: 'settling_front',
        atom: 'settlingFrontInterface',
        anchor: 'bulk',
        window: [0.3, 1.0],
        intensity: 0.6,
        params: { settlingVelocity_cms: 0.0002, interfaceSharpness: 0.8 }
      }
    ],
    after: {
      liquidColor: '#ffffff',
      liquidOpacity: 0.95,
      turbidity: 0.9,
      precipitate: { substance: 'BaSO4', morphology: 'fine_powder', color: '#ffffff', mass_g: 'fromLedger' },
      gasesOffgassed: []
    }
  },
  explain: {
    observation_vi: 'Xuất hiện kết tủa trắng đục sữa rất mịn BaSO4, các hạt siêu nhỏ lơ lửng rất lâu nhiều giờ mới lắng xuống đáy.',
    observation_en: 'Heavy white milky suspension of micro-crystalline BaSO4 forms; tiny crystallites remain suspended for hours before settling.',
    why_vi: 'Độ tan của BaSO4 cực nhỏ (Ksp ~ 1.1x10^-10), bán kính hạt r ~ 0.5 um làm tốc độ lắng Stokes rất chậm (v ~ 2x10^-6 m/s).',
    why_en: 'Tiny crystallite radius (r ~ 0.5 um) yields extremely slow Stokes sedimentation settling velocity (~1.9e-6 m/s).'
  },
  confidence: 1.0
};

export const EXEMPLAR_HCL_NAOH: ReactionProgram = {
  schema: 'chemdex.program/1',
  id: 'hcl+naoh',
  provenance: 'handcrafted',
  chemistry: {
    equation: 'HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)',
    ionic: 'H+(aq) + OH-(aq) -> H2O(l)',
    species: [
      { formula: 'HCl', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'NaOH', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'NaCl', role: 'product', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'H2O', role: 'product', coeff: 1, phase: 'l', colorHex: '#ffffff' }
    ],
    deltaH_kJ_per_mol: -57.3,
    kinetics: { model: 'instant', halfTime_s: 0.2 },
    hazards: []
  },
  visual: {
    duration_s: 5.0,
    timeline: [
      {
        id: 'pp_indicator',
        atom: 'indicatorTransition',
        anchor: 'bulk',
        window: [0.0, 0.8],
        intensity: 1.0,
        params: { indicatorName: 'phenolphthalein', startPh: 13.0, endPh: 7.0 }
      },
      {
        id: 'neutralize_heat',
        atom: 'dissolutionHeat',
        anchor: 'bulk',
        window: [0.0, 0.6],
        intensity: 0.8,
        params: { deltaT_celsius: 6.9 }
      }
    ],
    after: {
      liquidColor: '#ffffff',
      liquidOpacity: 0.95,
      turbidity: 0.0,
      gasesOffgassed: []
    }
  },
  explain: {
    observation_vi: 'Dung dịch màu hồng tím phenolphthalein lập tức mất màu trở nên trong suốt, bình ấm lên đáng kể do tỏa nhiệt.',
    observation_en: 'Magenta phenolphthalein solution abruptly turns clear and colorless at the equivalence point, warming noticeably.',
    why_vi: 'Phản ứng trung hòa axit-bazơ mạnh tỏa nhiệt deltaH = -57.3 kJ/mol, pH chuyển dịch về 7 khiến chỉ thị chuyển sang dạng không màu.',
    why_en: 'Strong acid-base neutralization releases 57.3 kJ/mol heat, lowering pH past the phenolphthalein transition zone.'
  },
  confidence: 1.0
};

export const EXEMPLAR_NA_H2O: ReactionProgram = {
  schema: 'chemdex.program/1',
  id: 'na+h2o',
  provenance: 'handcrafted',
  chemistry: {
    equation: '2Na(s) + 2H2O(l) -> 2NaOH(aq) + H2(g)',
    species: [
      { formula: 'Na', role: 'reactant', coeff: 2, phase: 's', colorHex: '#c0c8d0' },
      { formula: 'H2O', role: 'reactant', coeff: 2, phase: 'l', colorHex: '#ffffff' },
      { formula: 'NaOH', role: 'product', coeff: 2, phase: 'aq', colorHex: '#ffffff' },
      { formula: 'H2', role: 'product', coeff: 1, phase: 'g', colorHex: '#ffffff' }
    ],
    deltaH_kJ_per_mol: -368.0,
    kinetics: { model: 'surface_limited', halfTime_s: 3.0 },
    hazards: ['GHS02_flammable', 'GHS05_corrosive'],
    warning_vi: 'NGUY HIỂM: Natri phản ứng mãnh liệt sinh khí H2 dễ cháy nổ và dung dịch kiềm ăn da.',
    warning_en: 'DANGER: Sodium reacts violently evolving flammable H2 gas and corrosive caustic alkali.'
  },
  visual: {
    duration_s: 7.0,
    timeline: [
      {
        id: 'na_skitter',
        atom: 'sodiumDartRun',
        anchor: 'surface',
        window: [0.0, 0.9],
        intensity: 1.2,
        params: { sphereRadius_mm: 3.5, moltenLuster: 0.95, skitterSpeed: 2.0 }
      },
      {
        id: 'h2_bubbles',
        atom: 'metalDissolveWithBubbles',
        anchor: 'surface',
        window: [0.0, 0.9],
        intensity: { bind: 'rate:H2', gain: 1.5 },
        params: { bubbleRate: 2.5, surfaceRoughness: 0.9 }
      },
      {
        id: 'steam_haze',
        atom: 'hotSteamPlume',
        anchor: 'surface',
        window: [0.2, 0.9],
        intensity: 0.6,
        params: { plumeHeight_m: 0.15, steamOpacity: 0.4 }
      }
    ],
    after: {
      liquidColor: '#ffffff',
      liquidOpacity: 0.95,
      turbidity: 0.0,
      gasesOffgassed: [{ species: 'H2', mol: 'fromLedger', escaped: true }]
    }
  },
  explain: {
    observation_vi: 'Mẩu natri nóng chảy vo tròn thành viên bi bạc sáng bóng chạy tròn xèo xèo trên mặt nước, sủi bọt khí H2 rồi biến mất.',
    observation_en: 'Sodium melts into a bright silver sphere skittering rapidly across the water surface with hissing H2 bubbles.',
    why_vi: 'Nhiệt tỏa ra từ phản ứng làm nóng chảy natri (nóng chảy ở 98°C); phản ứng sinh khí H2 nâng mẩu natri lướt trên đệm khí.',
    why_en: 'Exothermic heat melts sodium (mp 98 C); escaping hydrogen gas forms a cushion that propels the molten droplet.'
  },
  confidence: 1.0
};

export const ALL_EXEMPLAR_PROGRAMS: ReactionProgram[] = [
  EXEMPLAR_ZN_PBNO32,
  EXEMPLAR_NA2S_CUSO4,
  EXEMPLAR_NACL_KNO3,
  EXEMPLAR_CACL2_NA2CO3,
  EXEMPLAR_CU_HNO3,
  EXEMPLAR_NH3_HCL,
  EXEMPLAR_CH3COONA_CRYSTALLIZE,
  EXEMPLAR_BACL2_NA2SO4,
  EXEMPLAR_HCL_NAOH,
  EXEMPLAR_NA_H2O
];
