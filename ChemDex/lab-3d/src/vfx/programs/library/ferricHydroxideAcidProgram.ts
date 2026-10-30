import type { ReactionProgram } from '../../../shared/programSchema';

export const FERRIC_HYDROXIDE_ACID_PROGRAM: ReactionProgram = {
  schema: 'chemdex.program/1', id: 'feoh3_hcl', provenance: 'handcrafted', controller: 'feoh3_hcl_dissolution',
  chemistry: {
    equation: 'Fe(OH)3(s) + 3HCl(aq) -> FeCl3(aq) + 3H2O(l)',
    ionic: 'Fe(OH)3(s) + 3H+(aq) -> Fe(3+)(aq) + 3H2O(l)',
    species: [
      { formula: 'Fe(OH)3', role: 'reactant', coeff: 1, phase: 's', colorHex: '#9a3412' },
      { formula: 'HCl', role: 'reactant', coeff: 3, phase: 'aq', hazards: ['GHS05_corrosive'] },
      { formula: 'FeCl3', role: 'product', coeff: 1, phase: 'aq', colorHex: '#fef3c7' },
      { formula: 'H2O', role: 'product', coeff: 3, phase: 'l' },
    ],
    kinetics: { model: 'first_order', halfTime_s: 1.2 },
    hazards: ['GHS05_corrosive'],
  },
  visual: {
    duration_s: 6,
    timeline: [{ id: 'mix', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.6],
      intensity: 0.4, params: { speed: 0.7, color: '#fef3c7' } }],
    after: { liquidColor: '#fef3c7', liquidOpacity: 0.95, turbidity: 0, gasesOffgassed: [] },
  },
  explain: {
    observation_vi: 'Bông Fe(OH)₃ nâu giảm khi thêm HCl. Nếu acid thiếu hoặc dung dịch đạt bão hòa, vẫn còn kết tủa; không sinh khí.',
    observation_en: 'Brown Fe(OH)3 floc decreases with HCl. Insufficient acid or saturation leaves solid; no gas forms.',
    why_vi: 'Acid tiêu thụ theo lượng chất rắn thực sự hòa tan. Bộ tính xét thủy phân, phức chloride và độ bão hòa của pha vô định hình; thời gian hoạt ảnh chưa hiệu chuẩn thực nghiệm.',
    why_en: 'Acid consumption follows actual solid dissolution. Hydrolysis, chloride complexes and amorphous-phase saturation bound the extent; animation timing is not experimentally calibrated.',
  },
  confidence: 1,
};
