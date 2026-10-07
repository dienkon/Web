/**
 * thermalDecompositionSafetyPrograms.ts — Thermal Decomposition & Hazardous Safety Programs
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const THERMAL_SAFETY_PROGRAMS: ReactionProgram[] = [
  // 1. Cu(OH)2 -> CuO + H2O (Thermal decomposition into black powder)
  {
    schema: 'chemdex.program/1',
    id: 'cuoh2_decomp',
    provenance: 'handcrafted',
    controller: 'cuoh2_thermal_decomposition',
    chemistry: {
      equation: 'Cu(OH)2(s) -> CuO(s) + H2O(l)',
      conditions: { minTemp_c: 60.0 },
      species: [
        { formula: 'Cu(OH)2', role: 'reactant', coeff: 1, phase: 's', colorHex: '#38bdf8' },
        { formula: 'CuO', role: 'product', coeff: 1, phase: 's', colorHex: '#18181b' }, // Pitch black powder
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' }
      ],
      deltaH_kJ_per_mol: 48.0, // Endothermic decomposition
      kinetics: { model: 'heat_activated', halfTime_s: 2.0 },
      hazards: []
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'boil', atom: 'boilingBumping', anchor: 'bottom', window: [0.1, 0.8], intensity: 0.8, params: { intensity: 1.5, bumpingShockwave: false } },
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0.2, 0.8], intensity: 1.2, params: { morphology: 'fine_powder', color: '#18181b', nucleationRate: 70 } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.4, 1.0], intensity: 1.2, params: { stokesRadius_um: 3.5, sedimentColor: '#18181b', bedHeight_mm: 5.5 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.7,
        precipitate: { substance: 'CuO', morphology: 'fine_powder', color: '#18181b', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Khi đun nóng trên 60 °C, kết tủa keo màu xanh lam Cu(OH)2 chuyển dần sang màu nâu rồi hóa thành bột oxit đồng(II) màu đen tuyền.',
      observation_en: 'Upon heating above 60 °C, sky-blue Cu(OH)2 decomposes into jet-black copper(II) oxide powder.',
      why_vi: 'Đồng(II) hidroxit không bền nhiệt, mất nước tạo đồng(II) oxit CuO màu đen.',
      why_en: 'Copper(II) hydroxide is thermally unstable, dehydrating endothermically to black copper(II) oxide.'
    },
    confidence: 1.0
  },

  // 2. 2NaHCO3 -> Na2CO3 + H2O + CO2 (Baking soda heat decomposition)
  {
    schema: 'chemdex.program/1',
    id: 'nahco3_heat',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2NaHCO3(s) -> Na2CO3(s) + H2O(g) + CO2(g)',
      conditions: { minTemp_c: 85.0 },
      species: [
        { formula: 'NaHCO3', role: 'reactant', coeff: 2, phase: 's' },
        { formula: 'Na2CO3', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'g' },
        { formula: 'CO2', role: 'product', coeff: 1, phase: 'g' }
      ],
      deltaH_kJ_per_mol: 129.0,
      kinetics: { model: 'heat_activated', halfTime_s: 3.0 },
      hazards: []
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'steam', atom: 'thermalSteam', anchor: 'rim', window: [0.15, 0.85], intensity: 0.9, params: { steamDensity: 0.8, temperature_c: 90 } },
        { id: 'fog', atom: 'wallCondensationDroplets', anchor: 'wallUpper', window: [0.2, 0.9], intensity: 1.0, params: { condensationRate: 0.8, maxDropletSize_mm: 2.2 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.0,
        turbidity: 0.0,
        solidsRemaining: [{ formula: 'Na2CO3', mass_g: 'fromLedger' }],
        gasesOffgassed: [{ species: 'CO2', mol: 'fromLedger', escaped: true }, { species: 'H2O', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Bột natri bicacbonat giải phóng hơi nước đọng thành giọt trên thành ống nghiệm và thoát khí CO2.',
      observation_en: 'Solid NaHCO3 decomposes, releasing water vapor condensing on tube walls and CO2 gas.',
      why_vi: 'Muối axit bicacbonat bị nhiệt phân hủy thành muối trung hòa cacbonat bền nhiệt hơn.',
      why_en: 'Hydrogen carbonate decomposes thermally into the more thermodynamically stable carbonate.'
    },
    confidence: 1.0
  },

  // 3. I2(s) -> I2(g) (Sublimation to rich violet vapor)
  {
    schema: 'chemdex.program/1',
    id: 'i2_sublimation',
    provenance: 'handcrafted',
    controller: 'iodine_sublimation',
    chemistry: {
      equation: 'I2(s) + heat -> I2(g)',
      conditions: { minTemp_c: 50.0 },
      species: [
        { formula: 'I2', role: 'reactant', coeff: 1, phase: 's', colorHex: '#18181b' },
        { formula: 'I2_gas', role: 'product', coeff: 1, phase: 'g', colorHex: '#7e22ce' } // Deep purple/violet vapor
      ],
      deltaH_kJ_per_mol: 62.4, // Endothermic sublimation
      kinetics: { model: 'heat_activated', halfTime_s: 2.0 },
      hazards: ['GHS07_harmful']
    },
    visual: {
      duration_s: 7.5,
      timeline: [
        { id: 'vapor', atom: 'heavyVaporPour', anchor: 'headspace', window: [0.1, 0.9], intensity: 1.4, params: { color: '#7e22ce', densityMultiplier: 8.7, spillRate: 35 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.0,
        turbidity: 0.0,
        residues: [{ where: 'wall', kind: 'crystals', color: '#581c87', amount: 0.08 }],
        gasesOffgassed: [{ species: 'I2', mol: 'fromLedger', escaped: false }]
      }
    },
    explain: {
      observation_vi: 'Các tinh thể iot màu tím đen thăng hoa trực tiếp thành luồng hơi màu tím biếc lãng mạn lơ lửng trong bình mà không qua trạng thái lỏng.',
      observation_en: 'Dark crystals sublime directly into magnificent dense violet vapor without melting into liquid.',
      why_vi: 'Iot có áp suất hơi bão hòa cao ở nhiệt độ phòng, dễ thăng hoa phá vỡ liên kết van der Waals.',
      why_en: 'Weak intermolecular van der Waals forces permit direct solid-to-gas phase sublimation.'
    },
    confidence: 1.0
  },

  // 4. Water into Conc. H2SO4 (Extreme Hazard: Thermal Boiling Splatter)
  {
    schema: 'chemdex.program/1',
    id: 'water_into_h2so4',
    provenance: 'handcrafted',
    controller: 'water_into_conc_h2so4_explosion',
    chemistry: {
      equation: 'H2SO4(conc) + H2O(l) -> H2SO4·H2O(aq) + HEAT!',
      species: [
        { formula: 'H2SO4_conc', role: 'reactant', coeff: 1, phase: 'l', hazards: ['GHS05_corrosive'] },
        { formula: 'H2O', role: 'reactant', coeff: 1, phase: 'l' },
        { formula: 'H2SO4·H2O', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -95.0,
      kinetics: { model: 'instant', halfTime_s: 0.05 },
      hazards: ['GHS05_corrosive'],
      warning_vi: 'CỰC KỲ NGUY HIỂM! Không bao giờ đổ nước vào axit đặc! Luôn rót từ từ axit vào nước!',
      warning_en: 'CRITICAL HAZARD! Never pour water into concentrated acid! Always pour acid into water!'
    },
    visual: {
      duration_s: 5.5,
      timeline: [
        { id: 'boil', atom: 'boilingBumping', anchor: 'surface', window: [0, 0.7], intensity: 2.5, params: { intensity: 3.5, bumpingShockwave: true } },
        { id: 'steam', atom: 'thermalSteam', anchor: 'rim', window: [0, 0.8], intensity: 2.0, params: { steamDensity: 2.0, temperature_c: 110 } },
        { id: 'shake', atom: 'cameraShake', anchor: 'outside', window: [0.05, 0.4], intensity: 1.2, params: { intensity: 1.0, decay_s: 0.6 } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { soundProfile: 'explosion', volume: 0.95 } }
      ],
      after: {
        liquidColor: '#f8fafc',
        liquidOpacity: 0.95,
        turbidity: 0.1,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Nước lập tức sôi bùng lên dữ dội tại mặt tiếp xúc, bắn tung tóe các giọt axit đặc nguy hiểm kèm theo khói hơi axit bốc mù mịt.',
      observation_en: 'Water flashes violently into steam at the boundary layer, explosively splattering boiling concentrated acid.',
      why_vi: 'Nước nhẹ hơn nằm trên mặt axit đặc; nhiệt hiđrat hóa tỏa ra cực lớn (> 100 °C) làm nước sôi tức thì gây nổ cơ học.',
      why_en: 'Low-density water floats atop dense acid; massive hydration enthalpy boils boundary water into explosive steam.'
    },
    confidence: 1.0
  },

  // 5. NaClO (Bleach) + HCl -> NaCl + H2O + Cl2 (Toxic chlorine gas emergency)
  {
    schema: 'chemdex.program/1',
    id: 'naclo_hcl_chlorine',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'NaClO(aq) + 2HCl(aq) -> NaCl(aq) + H2O(l) + Cl2(g)',
      species: [
        { formula: 'NaClO', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'HCl', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'NaCl', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' },
        { formula: 'Cl2', role: 'product', coeff: 1, phase: 'g', colorHex: '#d9f99d', hazards: ['GHS06_toxic'] }
      ],
      deltaH_kJ_per_mol: -85.0,
      kinetics: { model: 'instant', halfTime_s: 0.3 },
      hazards: ['GHS05_corrosive', 'GHS06_toxic'],
      warning_vi: 'NGUY HIỂM TỬ VONG! Trộn thuốc tẩy javel với axit sinh khí Clo (Cl2) màu vàng lục cực độc!',
      warning_en: 'LETHAL HAZARD! Mixing household bleach with acid releases highly toxic yellow-green chlorine gas!'
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'eff', atom: 'effervescenceBurst', anchor: 'bulk', window: [0, 0.65], intensity: 1.3, params: { intensity: 2.5, churnRadius: 0.45, gasSpecies: 'Cl2' } },
        { id: 'plume', atom: 'heavyVaporPour', anchor: 'rim', window: [0.1, 0.85], intensity: 1.6, params: { color: '#d9f99d', densityMultiplier: 2.45, spillRate: 38 } }
      ],
      after: {
        liquidColor: '#fef08a',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'Cl2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Sủi bọt dữ dội, giải phóng luồng khí màu vàng lục (yellow-green) nặng hơn không khí, có mùi hắc nồng nặc gây co thắt phế quản.',
      observation_en: 'Violent bubbling releases heavy yellow-green chlorine gas with an intensely suffocating, acrid bleach odor.',
      why_vi: 'Phản ứng comproporation giữa ion ClO- và Cl- trong môi trường axit sinh khí clo tự do Cl2.',
      why_en: 'Comproportionation between hypochlorite and chloride in acidic media generates toxic chlorine gas.'
    },
    confidence: 1.0
  }
];
