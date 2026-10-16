/**
 * combustionPyrotechnicPrograms.ts — Combustion, Flame Tests & Pyrotechnic Programs
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const COMBUSTION_PYROTECHNIC_PROGRAMS: ReactionProgram[] = [
  // 1. 2Mg + O2 -> 2MgO (Blinding white light & white smoke)
  {
    schema: 'chemdex.program/1',
    id: 'mg_o2_burn',
    provenance: 'handcrafted',
    controller: 'magnesium_burn',
    chemistry: {
      equation: '2Mg(s) + O2(g) -> 2MgO(s)',
      species: [
        { formula: 'Mg', role: 'reactant', coeff: 2, phase: 's' },
        { formula: 'O2', role: 'reactant', coeff: 1, phase: 'g' },
        { formula: 'MgO', role: 'product', coeff: 2, phase: 's', colorHex: '#ffffff' }
      ],
      deltaH_kJ_per_mol: -1203.0,
      kinetics: { model: 'heat_activated', halfTime_s: 0.8 },
      hazards: ['GHS02_flammable']
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'glow', atom: 'incandescentGlow', anchor: 'flame', window: [0.1, 0.75], intensity: 2.0, params: { glowIntensity: 6.5, glowColor: '#ffffff' } },
        { id: 'sparks', atom: 'pyrotechnicSparks', anchor: 'flame', window: [0.1, 0.7], intensity: 1.5, params: { sparkCount: 80, sparkColor: '#ffffff', speed: 5.0 } },
        { id: 'smoke', atom: 'smokeBillow', anchor: 'rim', window: [0.2, 0.95], intensity: 1.8, params: { smokeColor: '#ffffff', density: 1.6 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.0,
        turbidity: 0.0,
        solidsRemaining: [{ formula: 'MgO', mass_g: 'fromLedger', morphologyChange: 'brittle_white_ash' }],
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Magie cháy bùng lên phát ra ánh sáng trắng chói lòa (3100 K) và khói trắng dày đặc của bột magie oxit.',
      observation_en: 'Magnesium burns with a blinding, intensely brilliant white flame (3100 K) and billowing white MgO smoke.',
      why_vi: 'Phản ứng giải phóng năng lượng cực lớn biến hạt rắn MgO thành nguồn phát bức xạ vật đen nhiệt độ cao.',
      why_en: 'Enormous enthalpy (-1203 kJ/mol) excites MgO micro-particles into intense Planck blackbody luminescence.'
    },
    confidence: 1.0
  },

  // 2. 2Na + 2H2O -> 2NaOH + H2 (Molten sphere, skittering, golden flame)
  {
    schema: 'chemdex.program/1',
    id: 'na_h2o',
    provenance: 'handcrafted',
    controller: 'sodium_water',
    chemistry: {
      equation: '2Na(s) + 2H2O(l) -> 2NaOH(aq) + H2(g)',
      species: [
        { formula: 'Na', role: 'reactant', coeff: 2, phase: 's' },
        { formula: 'H2O', role: 'reactant', coeff: 2, phase: 'l' },
        { formula: 'NaOH', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'H2', role: 'product', coeff: 1, phase: 'g', hazards: ['GHS02_flammable'] }
      ],
      deltaH_kJ_per_mol: -368.4,
      kinetics: { model: 'heat_activated', halfTime_s: 1.2 },
      hazards: ['GHS02_flammable', 'GHS05_corrosive']
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'meniscus', atom: 'meniscusDepression', anchor: 'surface', window: [0, 0.8], intensity: 1.0, params: { depth_mm: 3.0, radius_mm: 6.0 } },
        { id: 'sparks', atom: 'pyrotechnicSparks', anchor: 'surface', window: [0.1, 0.75], intensity: 1.4, params: { sparkCount: 35, sparkColor: '#f59e0b', speed: 3.2 } },
        { id: 'flame', atom: 'flameCone', anchor: 'surface', window: [0.25, 0.75], intensity: 1.2, params: { flameColor: '#f59e0b', tipColor: '#fbbf24', height_cm: 4.5, turbulent: true } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'surface', window: [0, 0.8], intensity: 1.0, params: { soundProfile: 'sodium_sizzle', volume: 0.85 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'H2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Mẩu natri nóng chảy vo tròn thành viên bi bạc lướt nhanh trên mặt nước, cháy với ngọn lửa màu vàng kim, có tiếng xèo xèo và nổ lép bép.',
      observation_en: 'Sodium melts into a silvery sphere skittering across surface, burning with a golden-yellow flame with popping sizzles.',
      why_vi: 'Nhiệt tỏa ra làm nóng chảy natri (nóng chảy ở 97.8 °C); luồng khí H2 đẩy viên bi trượt trên đệm khí Leidenfrost.',
      why_en: 'Reaction heat melts sodium into a sphere; asymmetric H2 jets propel it across a vapor cushion.'
    },
    confidence: 1.0
  },

  // 3. 2K + 2H2O -> 2KOH + H2 (Instant violent lilac flame)
  {
    schema: 'chemdex.program/1',
    id: 'k_h2o',
    provenance: 'handcrafted',
    controller: 'potassium_water_reaction',
    chemistry: {
      equation: '2K(s) + 2H2O(l) -> 2KOH(aq) + H2(g)',
      species: [
        { formula: 'K', role: 'reactant', coeff: 2, phase: 's' },
        { formula: 'H2O', role: 'reactant', coeff: 2, phase: 'l' },
        { formula: 'KOH', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'H2', role: 'product', coeff: 1, phase: 'g', hazards: ['GHS02_flammable'] }
      ],
      deltaH_kJ_per_mol: -392.0,
      kinetics: { model: 'heat_activated', halfTime_s: 0.5 },
      hazards: ['GHS02_flammable', 'GHS05_corrosive']
    },
    visual: {
      duration_s: 4.5,
      timeline: [
        { id: 'flame', atom: 'flameCone', anchor: 'surface', window: [0.05, 0.7], intensity: 1.5, params: { flameColor: '#c084fc', tipColor: '#e879f9', height_cm: 6.0, turbulent: true } },
        { id: 'sparks', atom: 'pyrotechnicSparks', anchor: 'surface', window: [0.05, 0.7], intensity: 1.8, params: { sparkCount: 50, sparkColor: '#c084fc', speed: 4.2 } },
        { id: 'shake', atom: 'cameraShake', anchor: 'outside', window: [0.65, 0.8], intensity: 0.6, params: { intensity: 0.5, decay_s: 0.4 } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'surface', window: [0, 0.7], intensity: 1.0, params: { soundProfile: 'pop_ignition', volume: 0.9 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'H2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Kali bốc cháy ngay lập tức với ngọn lửa màu tím hoa cà (lilac) rực rỡ, phản ứng dữ dội và kết thúc bằng tiếng nổ tách đanh gọn.',
      observation_en: 'Potassium ignites instantly with a brilliant violet/lilac flame, ending in a sharp energetic acoustic pop.',
      why_vi: 'Kali có bán kính nguyên tử lớn hơn natri, năng lượng ion hóa thấp hơn, tự bốc cháy gần như tức thì với nước.',
      why_en: 'Lower first ionization energy of potassium causes spontaneous ignition and characteristic 766 nm lilac emission.'
    },
    confidence: 1.0
  },

  // 4. Flame Test: Copper (Emerald green)
  {
    schema: 'chemdex.program/1',
    id: 'flame_cu',
    provenance: 'handcrafted',
    controller: 'flame_test_copper',
    chemistry: {
      equation: 'Cu(2+) + heat -> Cu* -> Cu(2+) + hv (510 nm)',
      species: [
        { formula: 'CuCl2', role: 'reactant', coeff: 1, phase: 's' }
      ],
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: []
    },
    visual: {
      duration_s: 5.0,
      timeline: [
        { id: 'flame', atom: 'flameCone', anchor: 'flame', window: [0.1, 0.85], intensity: 1.4, params: { flameColor: '#10b981', tipColor: '#06b6d4', height_cm: 8.0, turbulent: true } }
      ],
      after: { liquidColor: '#ffffff', liquidOpacity: 0.0, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Ngọn lửa đèn cồn lập tức đổi sang màu xanh lục lam (ngọc bích) rực rỡ tuyệt đẹp.',
      observation_en: 'Alcohol burner flame turns brilliant emerald blue-green upon introducing copper.',
      why_vi: 'Kích thích nhiệt đẩy electron của nguyên tử đồng lên mức năng lượng cao, khi trở về trạng thái cơ bản phát ra photon 510-535 nm.',
      why_en: 'Thermal excitation of copper atoms produces characteristic green spectral emission lines.'
    },
    confidence: 1.0
  },

  // 5. Flame Test: Sodium (Persistent yellow 589 nm)
  {
    schema: 'chemdex.program/1',
    id: 'flame_na',
    provenance: 'handcrafted',
    controller: 'flame_test_sodium',
    chemistry: {
      equation: 'Na+ + heat -> Na* -> Na+ + hv (589 nm)',
      species: [
        { formula: 'NaCl', role: 'reactant', coeff: 1, phase: 's' }
      ],
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: []
    },
    visual: {
      duration_s: 5.0,
      timeline: [
        { id: 'flame', atom: 'flameCone', anchor: 'flame', window: [0.1, 0.85], intensity: 1.6, params: { flameColor: '#f59e0b', tipColor: '#fbbf24', height_cm: 8.0, turbulent: false } }
      ],
      after: { liquidColor: '#ffffff', liquidOpacity: 0.0, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Ngọn lửa lập tức bùng sáng màu vàng kim chói lọi, che khuất mọi màu sắc khác.',
      observation_en: 'Flame turns intense, persistent golden yellow, completely dominating the spectrum.',
      why_vi: 'Vạch phát xạ kép Natri D (589.0 nm và 589.6 nm) có cường độ phát quang cực mạnh.',
      why_en: 'Sodium D-line emission doublet (589 nm) has tremendous optical oscillator strength.'
    },
    confidence: 1.0
  },

  // 6. Flame Test: Potassium (Lilac with cobalt glass)
  {
    schema: 'chemdex.program/1',
    id: 'flame_k',
    provenance: 'handcrafted',
    controller: 'flame_test_potassium',
    chemistry: {
      equation: 'K+ + heat -> K* -> K+ + hv (766 nm)',
      species: [
        { formula: 'KCl', role: 'reactant', coeff: 1, phase: 's' }
      ],
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: []
    },
    visual: {
      duration_s: 5.0,
      timeline: [
        { id: 'flame', atom: 'flameCone', anchor: 'flame', window: [0.1, 0.85], intensity: 1.1, params: { flameColor: '#c084fc', tipColor: '#e879f9', height_cm: 6.5, turbulent: false } }
      ],
      after: { liquidColor: '#ffffff', liquidOpacity: 0.0, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Ngọn lửa có màu tím hoa cà (lilac) thanh tao; nhìn qua kính coban để lọc bỏ ánh vàng của tạp chất natri.',
      observation_en: 'Flame exhibits a delicate lilac-violet tint; viewed through cobalt blue glass to filter sodium yellow.',
      why_vi: 'Kali phát xạ các vạch phổ màu tím (404.4 nm) và đỏ xa (766.5 nm).',
      why_en: 'Potassium atomic emission doublet at 766 nm produces a distinct lilac appearance.'
    },
    confidence: 1.0
  }
];
