/**
 * complexationEquilibriaPrograms.ts — Complexation & Chemical Equilibrium Programs
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const COMPLEXATION_EQUILIBRIA_PROGRAMS: ReactionProgram[] = [
  // 1. FeCl3 + KSCN -> [Fe(SCN)]2+ (Blood red complex)
  {
    schema: 'chemdex.program/1',
    id: 'fecl3_kscn',
    provenance: 'handcrafted',
    controller: 'fecl3_kscn_complex',
    chemistry: {
      equation: 'FeCl3(aq) + KSCN(aq) <-> [Fe(SCN)]Cl2(aq) + KCl(aq)',
      ionic: 'Fe(3+)(aq) + SCN-(aq) <-> [Fe(SCN)](2+)(aq)',
      species: [
        { formula: 'FeCl3', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ca8a04' },
        { formula: 'KSCN', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: '[Fe(SCN)]Cl2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#7f1d1d' }, // Blood red
        { formula: 'KCl', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -24.0,
      kinetics: { model: 'instant', halfTime_s: 0.05 },
      hazards: []
    },
    visual: {
      duration_s: 4.5,
      timeline: [
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.55], intensity: 1.5, params: { startColor: '#ca8a04', endColor: '#7f1d1d', opticalPath_cm: 4.5 } },
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.45], intensity: 1.2, params: { speed: 1.6, color: '#991b1b' } }
      ],
      after: {
        liquidColor: '#7f1d1d',
        liquidOpacity: 0.96,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch màu vàng rơm lập tức chuyển sang màu đỏ máu (blood red) cực kỳ đậm đà và rực rỡ.',
      observation_en: 'Pale yellow solution instantly turns deep, intense blood-red upon contact.',
      why_vi: 'Ion Fe3+ và SCN- tạo phức cation pentaaquathiocyanatoiron(III) có hệ số hấp thụ quang học cực lớn.',
      why_en: 'Charge-transfer complex [Fe(SCN)]2+ possesses a massive molar absorptivity at 447 nm.'
    },
    confidence: 1.0
  },

  // 2. CuSO4 + 4NH3 -> [Cu(NH3)4]SO4 (Deep royal blue tetraamminecopper)
  {
    schema: 'chemdex.program/1',
    id: 'cuso4_nh3',
    provenance: 'handcrafted',
    controller: 'copper_ammonia_complex',
    chemistry: {
      equation: 'CuSO4(aq) + 4NH3(aq) -> [Cu(NH3)4]SO4(aq)',
      ionic: 'Cu(2+)(aq) + 4NH3(aq) -> [Cu(NH3)4](2+)(aq)',
      species: [
        { formula: 'CuSO4', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#0284c7' },
        { formula: 'NH3', role: 'reactant', coeff: 4, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: '[Cu(NH3)4]SO4', role: 'product', coeff: 1, phase: 'aq', colorHex: '#1e3a8a' } // Deep royal azure blue
      ],
      deltaH_kJ_per_mol: -88.0,
      kinetics: { model: 'first_order', halfTime_s: 0.4 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0.1, 0.7], intensity: 1.4, params: { startColor: '#0284c7', endColor: '#1e3a8a', opticalPath_cm: 5.0 } },
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.5], intensity: 1.2, params: { speed: 1.5, color: '#172554' } }
      ],
      after: {
        liquidColor: '#1e3a8a',
        liquidOpacity: 0.98,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Ban đầu tạo kết tủa Cu(OH)2 xanh nhạt, sau đó kết tủa tan biến hoàn toàn thành dung dịch màu xanh lam thẫm (xanh hoàng gia / nước Schweizer) trong suốt.',
      observation_en: 'Initial pale blue gel dissolves completely into a deep, intense royal azure blue solution.',
      why_vi: 'Phân tử amoniac đóng vai trò phối tử thay thế nước tạo phức chất bền [Cu(NH3)4]2+.',
      why_en: 'NH3 ligands displace water in the copper coordination sphere, splitting d-orbitals to absorb in deep royal blue.'
    },
    confidence: 1.0
  },

  // 3. K2Cr2O7 + 2NaOH <-> 2KNaCrO4 + H2O (Orange to Yellow equilibrium)
  {
    schema: 'chemdex.program/1',
    id: 'k2cr2o7_naoh',
    provenance: 'handcrafted',
    controller: 'cr2o7_cro4',
    chemistry: {
      equation: 'K2Cr2O7(aq) + 2NaOH(aq) <-> 2KNaCrO4(aq) + H2O(l)',
      ionic: 'Cr2O7(2-)(orange) + 2OH-(aq) <-> 2CrO4(2-)(yellow) + H2O(l)',
      species: [
        { formula: 'K2Cr2O7', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ea580c' },
        { formula: 'NaOH', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'KNaCrO4', role: 'product', coeff: 2, phase: 'aq', colorHex: '#facc15' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -14.0,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: ['GHS08_health_hazard', 'GHS06_toxic']
    },
    visual: {
      duration_s: 4.5,
      timeline: [
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.6], intensity: 1.2, params: { startColor: '#ea580c', endColor: '#facc15', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#facc15',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch màu cam rực rỡ của ion đicromat lập tức chuyển sang màu vàng tươi chanh của ion cromat.',
      observation_en: 'Bright orange dichromate shifts cleanly to lemon-yellow chromate.',
      why_vi: 'Môi trường kiềm làm dịch chuyển cân bằng theo nguyên lý Le Chatelier từ Cr2O7(2-) sang CrO4(2-).',
      why_en: 'Hydroxide ions consume H+, shifting the equilibrium toward the yellow chromate ion according to Le Chatelier.'
    },
    confidence: 1.0
  },

  // 4. 2K2CrO4 + H2SO4 <-> K2Cr2O7 + K2SO4 + H2O (Yellow back to Orange)
  {
    schema: 'chemdex.program/1',
    id: 'k2cro4_h2so4',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2K2CrO4(aq) + H2SO4(aq) <-> K2Cr2O7(aq) + K2SO4(aq) + H2O(l)',
      ionic: '2CrO4(2-)(yellow) + 2H+(aq) <-> Cr2O7(2-)(orange) + H2O(l)',
      species: [
        { formula: 'K2CrO4', role: 'reactant', coeff: 2, phase: 'aq', colorHex: '#facc15' },
        { formula: 'H2SO4', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'K2Cr2O7', role: 'product', coeff: 1, phase: 'aq', colorHex: '#ea580c' },
        { formula: 'K2SO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -14.0,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: ['GHS08_health_hazard', 'GHS06_toxic']
    },
    visual: {
      duration_s: 4.5,
      timeline: [
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.6], intensity: 1.2, params: { startColor: '#facc15', endColor: '#ea580c', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#ea580c',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch màu vàng chanh lập tức đổi ngược lại thành màu da cam rực rỡ.',
      observation_en: 'Yellow solution instantly reverses back to brilliant orange.',
      why_vi: 'Tăng nồng độ ion H+ làm dịch chuyển cân bằng tái tạo ion đicromat Cr2O7(2-).',
      why_en: 'Acidification shifts the dynamic equilibrium back to orange dichromate.'
    },
    confidence: 1.0
  },

  // 5. Al(OH)3 + NaOH -> Na[Al(OH)4] (Amphoteric gel dissolution into clear)
  {
    schema: 'chemdex.program/1',
    id: 'aloh3_naoh',
    provenance: 'handcrafted',
    controller: 'al_naoh_amphoteric',
    chemistry: {
      equation: 'Al(OH)3(s) + NaOH(aq) -> Na[Al(OH)4](aq)',
      ionic: 'Al(OH)3(s) + OH-(aq) -> [Al(OH)4]-(aq)',
      species: [
        { formula: 'Al(OH)3', role: 'reactant', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'NaOH', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Na[Al(OH)4]', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -31.0,
      kinetics: { model: 'first_order', halfTime_s: 1.2 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.8], intensity: 1.0, params: { maxTurbidity: 0.05, hazeColor: '#ffffff' } },
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.5], intensity: 1.0, params: { speed: 1.4, color: '#f8fafc' } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa keo trắng đục tan biến dần, dung dịch trở nên trong suốt hoàn toàn.',
      observation_en: 'Opaque white gel clears completely into transparent solution.',
      why_vi: 'Nhôm hidroxit lưỡng tính tan trong kiềm mạnh tạo ion phức tan tetrahydroxoaluminat.',
      why_en: 'Amphoteric Al(OH)3 dissolves in excess hydroxide forming soluble aluminate complex [Al(OH)4]-.'
    },
    confidence: 1.0
  }
];
