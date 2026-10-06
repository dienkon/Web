/**
 * precipitationPrograms.ts — Precipitation Reaction Programs
 * 
 * Accurately models supersaturation, nucleation, particle morphologies,
 * colors, Stokes settling drag, and bottom sediment bed accumulation.
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const PRECIPITATION_PROGRAMS: ReactionProgram[] = [
  // 1. BaCl2 + Na2SO4 -> BaSO4 + 2NaCl
  {
    schema: 'chemdex.program/1',
    id: 'bacl2_na2so4',
    provenance: 'handcrafted',
    controller: 'bacl2_na2so4_precipitate',
    chemistry: {
      equation: 'BaCl2(aq) + Na2SO4(aq) -> BaSO4(s) + 2NaCl(aq)',
      ionic: 'Ba(2+)(aq) + SO4(2-)(aq) -> BaSO4(s)',
      species: [
        { formula: 'BaCl2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS06_toxic'] },
        { formula: 'Na2SO4', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'BaSO4', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'NaCl', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -26.0,
      kinetics: { model: 'instant', halfTime_s: 0.15 },
      hazards: ['GHS06_toxic']
    },
    visual: {
      duration_s: 8.0,
      timeWarp: { physical_s: 1800, note_en: 'BaSO4 micro-crystals take ~30 min to settle in reality', note_vi: 'Hạt BaSO4 siêu mịn mất ~30 phút để lắng hoàn toàn' },
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.35], intensity: 1.2, params: { morphology: 'fine_powder', color: '#ffffff', nucleationRate: 90 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.45], intensity: 1.0, params: { maxTurbidity: 0.95, hazeColor: '#ffffff' } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.3, 1.0], intensity: 1.0, params: { stokesRadius_um: 0.5, sedimentColor: '#ffffff', bedHeight_mm: 5.5 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.7,
        precipitate: { substance: 'BaSO4', morphology: 'fine_powder', color: '#ffffff', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Xuất hiện kết tủa trắng mịn như sữa ngay khi nhỏ vào nhau, không tan trong axit dư.',
      observation_en: 'Dense milky white precipitate forms instantaneously, insoluble in dilute acids.',
      why_vi: 'Tích số tan BaSO4 cực nhỏ (Ksp = 1.1 x 10^-10), muối kết tinh dạng vi tinh thể huyền phù.',
      why_en: 'Extremely low solubility product (Ksp = 1.1 x 10^-10) drives rapid micro-crystalline nucleation.'
    },
    confidence: 1.0
  },

  // 2. BaCl2 + H2SO4 -> BaSO4 + 2HCl
  {
    schema: 'chemdex.program/1',
    id: 'bacl2_h2so4',
    provenance: 'handcrafted',
    controller: 'bacl2_h2so4_precipitate',
    chemistry: {
      equation: 'BaCl2(aq) + H2SO4(aq) -> BaSO4(s) + 2HCl(aq)',
      ionic: 'Ba(2+)(aq) + SO4(2-)(aq) -> BaSO4(s)',
      species: [
        { formula: 'BaCl2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS06_toxic'] },
        { formula: 'H2SO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'BaSO4', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'HCl', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -28.0,
      kinetics: { model: 'instant', halfTime_s: 0.15 },
      hazards: ['GHS06_toxic', 'GHS05_corrosive']
    },
    visual: {
      duration_s: 7.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.1, params: { morphology: 'fine_powder', color: '#ffffff', nucleationRate: 85 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { maxTurbidity: 0.95, hazeColor: '#ffffff' } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.0, params: { stokesRadius_um: 0.5, sedimentColor: '#ffffff', bedHeight_mm: 5.0 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.7,
        precipitate: { substance: 'BaSO4', morphology: 'fine_powder', color: '#ffffff', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa trắng đục sữa hình thành ngay lập tức.',
      observation_en: 'Immediate dense milky white precipitate.',
      why_vi: 'Phản ứng nhận biết gốc sunfat bằng bari clorua.',
      why_en: 'Standard qualitative test for sulfate ions using barium chloride.'
    },
    confidence: 1.0
  },

  // 3. AgNO3 + NaCl -> AgCl + NaNO3
  {
    schema: 'chemdex.program/1',
    id: 'agno3_nacl',
    provenance: 'handcrafted',
    controller: 'agno3_nacl_precipitate',
    chemistry: {
      equation: 'AgNO3(aq) + NaCl(aq) -> AgCl(s) + NaNO3(aq)',
      ionic: 'Ag+(aq) + Cl-(aq) -> AgCl(s)',
      species: [
        { formula: 'AgNO3', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive', 'GHS09_environmental'] },
        { formula: 'NaCl', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'AgCl', role: 'product', coeff: 1, phase: 's', colorHex: '#f8fafc' },
        { formula: 'NaNO3', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -65.7,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: ['GHS05_corrosive', 'GHS09_environmental']
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.3, params: { morphology: 'curd', color: '#f8fafc', nucleationRate: 95 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.4], intensity: 1.0, params: { maxTurbidity: 0.88, hazeColor: '#f8fafc' } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.2, params: { stokesRadius_um: 4.5, sedimentColor: '#f1f5f9', bedHeight_mm: 7.0 } }
      ],
      after: {
        liquidColor: '#f8fafc',
        liquidOpacity: 0.95,
        turbidity: 0.35,
        precipitate: { substance: 'AgCl', morphology: 'curd', color: '#f8fafc', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa trắng vón cục dạng phô mai (curdy), lắng nhanh để lại dung dịch trong phía trên.',
      observation_en: 'Curdy, cottage-cheese white clumps form and settle rapidly, leaving clear supernatant.',
      why_vi: 'AgCl có Ksp = 1.8 x 10^-10, ion Ag+ và Cl- keo tụ thành mảng vón cục lớn.',
      why_en: 'Low Ksp causes AgCl to coagulate into macroscopic curdy aggregates.'
    },
    confidence: 1.0
  },

  // 4. AgNO3 + KBr -> AgBr + KNO3 (Pale cream curd)
  {
    schema: 'chemdex.program/1',
    id: 'agno3_kbr',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'AgNO3(aq) + KBr(aq) -> AgBr(s) + KNO3(aq)',
      ionic: 'Ag+(aq) + Br-(aq) -> AgBr(s)',
      species: [
        { formula: 'AgNO3', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'KBr', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'AgBr', role: 'product', coeff: 1, phase: 's', colorHex: '#fef3c7' }, // Pale cream yellow
        { formula: 'KNO3', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -84.4,
      kinetics: { model: 'instant', halfTime_s: 0.1 }
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.2, params: { morphology: 'curd', color: '#fef3c7', nucleationRate: 90 } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.1, params: { stokesRadius_um: 4.0, sedimentColor: '#fef3c7', bedHeight_mm: 6.5 } }
      ],
      after: {
        liquidColor: '#fef3c7',
        liquidOpacity: 0.95,
        turbidity: 0.4,
        precipitate: { substance: 'AgBr', morphology: 'curd', color: '#fef3c7', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa màu vàng nhạt (kem), vón cục, nhạy sáng.',
      observation_en: 'Pale cream-yellow curdy precipitate forms rapidly.',
      why_vi: 'AgBr có độ tan bé hơn AgCl (Ksp = 5.4 x 10^-13), tinh thể có màu vàng ngà đặc trưng.',
      why_en: 'AgBr is less soluble than AgCl (Ksp = 5.4 x 10^-13) and exhibits distinct pale cream tint.'
    },
    confidence: 1.0
  },

  // 5. AgNO3 + KI -> AgI + KNO3 (Pale yellow curd, NOT golden flakes)
  {
    schema: 'chemdex.program/1',
    id: 'agno3_ki',
    provenance: 'handcrafted',
    controller: 'agno3_ki_precipitate',
    chemistry: {
      equation: 'AgNO3(aq) + KI(aq) -> AgI(s) + KNO3(aq)',
      ionic: 'Ag+(aq) + I-(aq) -> AgI(s)',
      species: [
        { formula: 'AgNO3', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'KI', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'AgI', role: 'product', coeff: 1, phase: 's', colorHex: '#fef08a' }, // Distinct yellow curd
        { formula: 'KNO3', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -112.0,
      kinetics: { model: 'instant', halfTime_s: 0.08 }
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.3, params: { morphology: 'curd', color: '#fef08a', nucleationRate: 95 } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.2, params: { stokesRadius_um: 5.0, sedimentColor: '#fde047', bedHeight_mm: 7.0 } }
      ],
      after: {
        liquidColor: '#fef08a',
        liquidOpacity: 0.95,
        turbidity: 0.45,
        precipitate: { substance: 'AgI', morphology: 'curd', color: '#fef08a', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa màu vàng đậm vón cục (curd), không tan trong axit và amoniac.',
      observation_en: 'Bright yellow curdy precipitate forms instantly, insoluble in NH3.',
      why_vi: 'AgI có Ksp cực bé (8.5 x 10^-17), liên kết đồng hóa trị cao tạo màu vàng đậm.',
      why_en: 'Extremely insoluble (Ksp = 8.5 x 10^-17) with strong covalent character producing deep yellow hue.'
    },
    confidence: 1.0
  },

  // 6. Pb(NO3)2 + 2KI -> PbI2 + 2KNO3 ("Golden Rain" sparkling hexagonal flakes)
  {
    schema: 'chemdex.program/1',
    id: 'pbno32_ki',
    provenance: 'handcrafted',
    controller: 'golden_rain',
    chemistry: {
      equation: 'Pb(NO3)2(aq) + 2KI(aq) -> PbI2(s) + 2KNO3(aq)',
      ionic: 'Pb(2+)(aq) + 2I-(aq) -> PbI2(s)',
      species: [
        { formula: 'Pb(NO3)2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS08_health_hazard', 'GHS06_toxic'] },
        { formula: 'KI', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'PbI2', role: 'product', coeff: 1, phase: 's', colorHex: '#facc15' },
        { formula: 'KNO3', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -63.0,
      kinetics: { model: 'instant', halfTime_s: 0.2 },
      hazards: ['GHS08_health_hazard', 'GHS06_toxic']
    },
    visual: {
      duration_s: 8.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.2, params: { morphology: 'crystal_plate', color: '#facc15', nucleationRate: 90 } },
        { id: 'glitter', atom: 'crystalGlitter', anchor: 'bulk', window: [0.1, 0.9], intensity: 1.5, params: { glintFrequency: 12, glintColor: '#fef08a', facetSize_mm: 1.2 } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.3, params: { stokesRadius_um: 12.0, sedimentColor: '#eab308', bedHeight_mm: 7.5 } }
      ],
      after: {
        liquidColor: '#fef08a',
        liquidOpacity: 0.92,
        turbidity: 0.5,
        precipitate: { substance: 'PbI2', morphology: 'crystal_plate', color: '#facc15', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa màu vàng lấp lánh như vảy vàng ("Mưa Vàng"), các tinh thể xoay tròn phản chiếu ánh sáng.',
      observation_en: 'Glittering golden hexagonal flakes sparkle in liquid ("Golden Rain"), reflecting light as they tumble.',
      why_vi: 'PbI2 kết tinh thành các phiến lục giác phẳng mỏng có độ phản xạ gương cao.',
      why_en: 'PbI2 crystallizes into thin hexagonal platelets with highly reflective planar faces.'
    },
    confidence: 1.0
  },

  // 7. CaCl2 + Na2CO3 -> CaCO3 + 2NaCl (Chalky fine powder, NO gas)
  {
    schema: 'chemdex.program/1',
    id: 'cacl2_na2co3',
    provenance: 'handcrafted',
    controller: 'cacl2_na2co3_precipitate',
    chemistry: {
      equation: 'CaCl2(aq) + Na2CO3(aq) -> CaCO3(s) + 2NaCl(aq)',
      ionic: 'Ca(2+)(aq) + CO3(2-)(aq) -> CaCO3(s)',
      species: [
        { formula: 'CaCl2', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'Na2CO3', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'CaCO3', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'NaCl', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -12.5,
      kinetics: { model: 'instant', halfTime_s: 0.2 }
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.1, params: { morphology: 'fine_powder', color: '#ffffff', nucleationRate: 80 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { maxTurbidity: 0.90, hazeColor: '#ffffff' } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.0, params: { stokesRadius_um: 1.5, sedimentColor: '#ffffff', bedHeight_mm: 5.0 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.65,
        precipitate: { substance: 'CaCO3', morphology: 'fine_powder', color: '#ffffff', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch chuyển đục màu phấn trắng, lắng dần tạo cặn canxi cacbonat ở đáy. Hoàn toàn không có bọt khí.',
      observation_en: 'Chalky white suspension forms and gradually settles to bottom. Zero gas evolved.',
      why_vi: 'Ca2+ và CO3(2-) tạo canxi cacbonat ít tan (Ksp = 3.3 x 10^-9).',
      why_en: 'Precipitation of insoluble calcium carbonate (Ksp = 3.3 x 10^-9).'
    },
    confidence: 1.0
  },

  // 8. Ca(OH)2 + CO2 -> CaCO3 + H2O (Limewater turns milky)
  {
    schema: 'chemdex.program/1',
    id: 'caoh2_co2',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Ca(OH)2(aq) + CO2(g) -> CaCO3(s) + H2O(l)',
      species: [
        { formula: 'Ca(OH)2', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'CO2', role: 'reactant', coeff: 1, phase: 'g' },
        { formula: 'CaCO3', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -113.0,
      kinetics: { model: 'diffusion_limited', halfTime_s: 1.8 }
    },
    visual: {
      duration_s: 7.5,
      timeline: [
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bottom', window: [0, 0.6], intensity: 0.8, params: { bubbleRate: 20, meanRadius_mm: 1.5, color: '#f1f5f9', gasSpecies: 'CO2' } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0.15, 0.8], intensity: 1.2, params: { maxTurbidity: 0.92, hazeColor: '#ffffff' } },
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0.2, 0.7], intensity: 1.0, params: { morphology: 'fine_powder', color: '#ffffff', nucleationRate: 75 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.85,
        precipitate: { substance: 'CaCO3', morphology: 'fine_powder', color: '#ffffff', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Nước vôi trong dần hóa đục như nước vo gạo khi sục khí CO2 vào.',
      observation_en: 'Clear limewater turns progressively milky white as CO2 bubbles through.',
      why_vi: 'Khí CO2 hấp thụ vào dung dịch kiềm Ca(OH)2 tạo hạt CaCO3 mịn phân tán đều.',
      why_en: 'Dissolved CO2 reacts with Ca(OH)2 producing a fine milky colloidal suspension of CaCO3.'
    },
    confidence: 1.0
  },

  // 9. CuSO4 + 2NaOH -> Cu(OH)2 + Na2SO4 (Cyan blue gel)
  {
    schema: 'chemdex.program/1',
    id: 'cuso4_naoh',
    provenance: 'handcrafted',
    controller: 'cuso4_naoh_precipitate',
    chemistry: {
      equation: 'CuSO4(aq) + 2NaOH(aq) -> Cu(OH)2(s) + Na2SO4(aq)',
      ionic: 'Cu(2+)(aq) + 2OH-(aq) -> Cu(OH)2(s)',
      species: [
        { formula: 'CuSO4', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#0284c7' },
        { formula: 'NaOH', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'Cu(OH)2', role: 'product', coeff: 1, phase: 's', colorHex: '#38bdf8' },
        { formula: 'Na2SO4', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -52.0,
      kinetics: { model: 'instant', halfTime_s: 0.15 }
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'pourPoint', window: [0, 0.45], intensity: 1.3, params: { morphology: 'gel', color: '#38bdf8', nucleationRate: 85 } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.0, params: { stokesRadius_um: 6.0, sedimentColor: '#0284c7', bedHeight_mm: 8.5 } }
      ],
      after: {
        liquidColor: '#e0f2fe',
        liquidOpacity: 0.92,
        turbidity: 0.55,
        precipitate: { substance: 'Cu(OH)2', morphology: 'gel', color: '#38bdf8', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Xuất hiện kết tủa dạng keo màu xanh lam sáng đặc trưng, chiếm thể tích lớn.',
      observation_en: 'Distinct bright sky-blue gelatinous precipitate forms, creating a voluminous hydrated bed.',
      why_vi: 'Ion Cu2+ liên kết với OH- tạo mạng lưới polymer đồng(II) hidroxit ngậm nước.',
      why_en: 'Cu2+ and OH- form a highly hydrated, voluminous gelatinous network of copper(II) hydroxide.'
    },
    confidence: 1.0
  },

  // 10. FeCl3 + 3NaOH -> Fe(OH)3 + 3NaCl (Rust-brown floc)
  {
    schema: 'chemdex.program/1',
    id: 'fecl3_naoh',
    provenance: 'handcrafted',
    controller: 'fecl3_naoh_precipitate',
    chemistry: {
      equation: 'FeCl3(aq) + 3NaOH(aq) -> Fe(OH)3(s) + 3NaCl(aq)',
      ionic: 'Fe(3+)(aq) + 3OH-(aq) -> Fe(OH)3(s)',
      species: [
        { formula: 'FeCl3', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ca8a04' },
        { formula: 'NaOH', role: 'reactant', coeff: 3, phase: 'aq' },
        { formula: 'Fe(OH)3', role: 'product', coeff: 1, phase: 's', colorHex: '#9a3412' },
        { formula: 'NaCl', role: 'product', coeff: 3, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -105.0,
      kinetics: { model: 'instant', halfTime_s: 0.1 }
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'pourPoint', window: [0, 0.45], intensity: 1.3, params: { morphology: 'floc', color: '#9a3412', nucleationRate: 90 } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.1, params: { stokesRadius_um: 3.5, sedimentColor: '#7c2d12', bedHeight_mm: 7.5 } }
      ],
      after: {
        liquidColor: '#fef3c7',
        liquidOpacity: 0.95,
        turbidity: 0.60,
        precipitate: { substance: 'Fe(OH)3', morphology: 'floc', color: '#9a3412', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa dạng bông cặn màu nâu đỏ (màu gỉ sắt) lắng xuống đáy cốc.',
      observation_en: 'Feathery rust-brown flocculent precipitate forms and settles to bottom.',
      why_vi: 'Sắt(III) hidroxit là bazơ không tan màu nâu đỏ có Ksp = 2.8 x 10^-39 cực kỳ nhỏ.',
      why_en: 'Iron(III) hydroxide is extremely insoluble (Ksp = 2.8 x 10^-39) forming feathery rust flocs.'
    },
    confidence: 1.0
  },

  // 11. FeSO4 + 2NaOH -> Fe(OH)2 + Na2SO4 (Dirty green turning brown)
  {
    schema: 'chemdex.program/1',
    id: 'feso4_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'FeSO4(aq) + 2NaOH(aq) -> Fe(OH)2(s) + Na2SO4(aq)',
      ionic: 'Fe(2+)(aq) + 2OH-(aq) -> Fe(OH)2(s)',
      species: [
        { formula: 'FeSO4', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#a7f3d0' },
        { formula: 'NaOH', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'Fe(OH)2', role: 'product', coeff: 1, phase: 's', colorHex: '#065f46' }, // Dirty green
        { formula: 'Na2SO4', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -45.0,
      kinetics: { model: 'instant', halfTime_s: 0.2 }
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'pourPoint', window: [0, 0.45], intensity: 1.2, params: { morphology: 'gel', color: '#065f46', nucleationRate: 80 } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.0, params: { stokesRadius_um: 4.5, sedimentColor: '#064e3b', bedHeight_mm: 6.5 } }
      ],
      after: {
        liquidColor: '#d1fae5',
        liquidOpacity: 0.95,
        turbidity: 0.55,
        precipitate: { substance: 'Fe(OH)2', morphology: 'gel', color: '#065f46', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa màu trắng xanh / xanh rêu bẩn (dirty green), khi để lâu trong không khí sẽ chuyển dần sang nâu đỏ.',
      observation_en: 'Dirty green gelatinous precipitate forms; slowly oxidizes to red-brown Fe(OH)3 in air.',
      why_vi: 'Fe(OH)2 có màu trắng xanh, dễ bị oxi hòa tan trong nước oxi hóa thành Fe(OH)3.',
      why_en: 'Fe(OH)2 forms a dirty green precipitate that readily aerial-oxidizes to Fe(OH)3.'
    },
    confidence: 1.0
  },

  // 12. AlCl3 + 3NaOH -> Al(OH)3 + 3NaCl (White gelatinous)
  {
    schema: 'chemdex.program/1',
    id: 'alcl3_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'AlCl3(aq) + 3NaOH(aq) -> Al(OH)3(s) + 3NaCl(aq)',
      ionic: 'Al(3+)(aq) + 3OH-(aq) -> Al(OH)3(s)',
      species: [
        { formula: 'AlCl3', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'NaOH', role: 'reactant', coeff: 3, phase: 'aq' },
        { formula: 'Al(OH)3', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'NaCl', role: 'product', coeff: 3, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -90.0,
      kinetics: { model: 'instant', halfTime_s: 0.15 }
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'pourPoint', window: [0, 0.45], intensity: 1.2, params: { morphology: 'gel', color: '#ffffff', nucleationRate: 85 } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.0, params: { stokesRadius_um: 5.5, sedimentColor: '#f1f5f9', bedHeight_mm: 7.0 } }
      ],
      after: {
        liquidColor: '#f8fafc',
        liquidOpacity: 0.95,
        turbidity: 0.55,
        precipitate: { substance: 'Al(OH)3', morphology: 'gel', color: '#ffffff', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa keo trắng Al(OH)3 xuất hiện, nếu thêm dư NaOH kết tủa sẽ tan.',
      observation_en: 'White gelatinous precipitate forms; dissolves if excess NaOH is added.',
      why_vi: 'Nhôm hidroxit là bazơ lưỡng tính không tan trong nước.',
      why_en: 'Amphoteric aluminum hydroxide precipitates as a translucent white gel.'
    },
    confidence: 1.0
  },

  // 13. Na2S + CuSO4 -> CuS + Na2SO4 (Dense amorphous black)
  {
    schema: 'chemdex.program/1',
    id: 'na2s_cuso4',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Na2S(aq) + CuSO4(aq) -> CuS(s) + Na2SO4(aq)',
      ionic: 'Cu(2+)(aq) + S(2-)(aq) -> CuS(s)',
      species: [
        { formula: 'Na2S', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'CuSO4', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#0284c7' },
        { formula: 'CuS', role: 'product', coeff: 1, phase: 's', colorHex: '#18181b' }, // Pitch black
        { formula: 'Na2SO4', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -128.0,
      kinetics: { model: 'instant', halfTime_s: 0.05 }
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.5, params: { morphology: 'amorphous_black', color: '#18181b', nucleationRate: 110 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.4], intensity: 1.2, params: { maxTurbidity: 0.99, hazeColor: '#09090b' } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.3, 1.0], intensity: 1.2, params: { stokesRadius_um: 5.0, sedimentColor: '#18181b', bedHeight_mm: 6.5 } }
      ],
      after: {
        liquidColor: '#27272a',
        liquidOpacity: 0.98,
        turbidity: 0.9,
        precipitate: { substance: 'CuS', morphology: 'amorphous_black', color: '#18181b', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Lập tức xuất hiện vệt đen tuyền và kết tủa đen đặc CuS, dung dịch mất màu xanh.',
      observation_en: 'Immediate pitch-black precipitate of CuS blankets the solution.',
      why_vi: 'Đồng(II) sunfua có Ksp = 6 x 10^-36 cực kỳ nhỏ, không tan cả trong axit loãng.',
      why_en: 'Extremely insoluble copper(II) sulfide (Ksp = 6 x 10^-36) precipitates as dense black solid.'
    },
    confidence: 1.0
  },

  // 14. Na2S + Pb(NO3)2 -> PbS + 2NaNO3 (Dense black PbS)
  {
    schema: 'chemdex.program/1',
    id: 'na2s_pbno32',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Na2S(aq) + Pb(NO3)2(aq) -> PbS(s) + 2NaNO3(aq)',
      ionic: 'Pb(2+)(aq) + S(2-)(aq) -> PbS(s)',
      species: [
        { formula: 'Na2S', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'Pb(NO3)2', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'PbS', role: 'product', coeff: 1, phase: 's', colorHex: '#18181b' },
        { formula: 'NaNO3', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -100.0,
      kinetics: { model: 'instant', halfTime_s: 0.05 }
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.4, params: { morphology: 'amorphous_black', color: '#18181b', nucleationRate: 100 } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.3, 1.0], intensity: 1.2, params: { stokesRadius_um: 6.0, sedimentColor: '#18181b', bedHeight_mm: 7.0 } }
      ],
      after: {
        liquidColor: '#27272a',
        liquidOpacity: 0.98,
        turbidity: 0.85,
        precipitate: { substance: 'PbS', morphology: 'amorphous_black', color: '#18181b', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa đen kịt tạo thành lập tức (phản ứng nhận biết ion chì hoặc sunfua).',
      observation_en: 'Immediate pitch-black precipitate of lead sulfide.',
      why_vi: 'PbS có độ tan cực thấp (Ksp = 3 x 10^-28).',
      why_en: 'Extremely insoluble lead(II) sulfide (Ksp = 3 x 10^-28).'
    },
    confidence: 1.0
  },

  // 15. K2CrO4 + BaCl2 -> BaCrO4 + 2KCl (Lemon yellow precipitate)
  {
    schema: 'chemdex.program/1',
    id: 'k2cro4_bacl2',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'K2CrO4(aq) + BaCl2(aq) -> BaCrO4(s) + 2KCl(aq)',
      ionic: 'Ba(2+)(aq) + CrO4(2-)(aq) -> BaCrO4(s)',
      species: [
        { formula: 'K2CrO4', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#facc15' },
        { formula: 'BaCl2', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'BaCrO4', role: 'product', coeff: 1, phase: 's', colorHex: '#fef08a' }, // Lemon yellow
        { formula: 'KCl', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -24.0,
      kinetics: { model: 'instant', halfTime_s: 0.15 }
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.2, params: { morphology: 'fine_powder', color: '#fef08a', nucleationRate: 85 } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.0, params: { stokesRadius_um: 2.0, sedimentColor: '#facc15', bedHeight_mm: 5.5 } }
      ],
      after: {
        liquidColor: '#fef9c3',
        liquidOpacity: 0.95,
        turbidity: 0.65,
        precipitate: { substance: 'BaCrO4', morphology: 'fine_powder', color: '#fef08a', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa màu vàng chanh tươi sáng xuất hiện nhanh chóng.',
      observation_en: 'Bright lemon-yellow precipitate forms rapidly.',
      why_vi: 'Bari cromat ít tan (Ksp = 1.2 x 10^-10), kết tinh màu vàng chanh đặc trưng.',
      why_en: 'Barium chromate is insoluble (Ksp = 1.2 x 10^-10) precipitating as vibrant lemon-yellow solid.'
    },
    confidence: 1.0
  },

  // 16. K2CrO4 + 2AgNO3 -> Ag2CrO4 + 2KNO3 (Brick-red precipitate)
  {
    schema: 'chemdex.program/1',
    id: 'k2cro4_agno3',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'K2CrO4(aq) + 2AgNO3(aq) -> Ag2CrO4(s) + 2KNO3(aq)',
      ionic: '2Ag+(aq) + CrO4(2-)(aq) -> Ag2CrO4(s)',
      species: [
        { formula: 'K2CrO4', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#facc15' },
        { formula: 'AgNO3', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'Ag2CrO4', role: 'product', coeff: 1, phase: 's', colorHex: '#991b1b' }, // Brick red
        { formula: 'KNO3', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -61.0,
      kinetics: { model: 'instant', halfTime_s: 0.1 }
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.3, params: { morphology: 'fine_powder', color: '#991b1b', nucleationRate: 90 } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.1, params: { stokesRadius_um: 3.5, sedimentColor: '#7f1d1d', bedHeight_mm: 6.0 } }
      ],
      after: {
        liquidColor: '#fef08a',
        liquidOpacity: 0.95,
        turbidity: 0.70,
        precipitate: { substance: 'Ag2CrO4', morphology: 'fine_powder', color: '#991b1b', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa màu đỏ gạch (brick-red) hình thành ngay lập tức (phương pháp Mohr chuẩn độ Cl-).',
      observation_en: 'Immediate brick-red precipitate forms (Mohr method endpoint indicator).',
      why_vi: 'Bạc cromat có Ksp = 1.1 x 10^-12, có màu đỏ gạch tương phản rõ nét với kết tủa trắng AgCl.',
      why_en: 'Silver chromate (Ksp = 1.1 x 10^-12) forms a characteristic brick-red precipitate.'
    },
    confidence: 1.0
  }
];
