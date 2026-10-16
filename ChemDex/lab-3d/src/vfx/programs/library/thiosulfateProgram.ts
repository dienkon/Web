import type { ReactionProgram } from '../../../shared/programSchema';

export const THIOSULFATE_ACID_PROGRAM: ReactionProgram = {
  schema: 'chemdex.program/1', id: 'thiosulfate_acid_clock', provenance: 'handcrafted',
  chemistry: {
    equation: 'Na2S2O3(aq) + 2HCl(aq) -> 2NaCl(aq) + SO2(g) + S(s) + H2O(l)',
    ionic: 'S2O3(2-)(aq) + 2H+(aq) -> SO2(g) + S(s) + H2O(l)',
    species: [
      { formula: 'Na2S2O3', role: 'reactant', coeff: 1, phase: 'aq' },
      { formula: 'HCl', role: 'reactant', coeff: 2, phase: 'aq' },
      { formula: 'NaCl', role: 'product', coeff: 2, phase: 'aq' },
      { formula: 'SO2', role: 'product', coeff: 1, phase: 'g' },
      { formula: 'S', role: 'product', coeff: 1, phase: 's', colorHex: '#fef08a' },
      { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' },
    ],
    // Duration is illustrative; no measured rate or enthalpy is asserted.
    deltaH_kJ_per_mol: null, kinetics: { model: 'first_order', halfTime_s: 3 },
    hazards: ['GHS06_toxic'], warning_vi: 'Mô phỏng sinh SO2 độc, không nhận biết bằng ngửi khí.',
  },
  visual: {
    duration_s: 10,
    timeline: [
      { id: 'sulfur', atom: 'precipitateNucleation', anchor: 'bulk', window: [0.1, 0.9], intensity: 0.7,
        params: { morphology: 'fine_powder', color: '#fef08a', nucleationRate: 30 } },
      { id: 'cloud', atom: 'turbidityShift', anchor: 'bulk', window: [0.1, 1], intensity: 0.7,
        params: { maxTurbidity: 0.8, hazeColor: '#fff7c2' } },
    ],
    after: { liquidColor: '#f8fafc', liquidOpacity: 0.2, turbidity: 0.8,
      precipitate: { substance: 'S', morphology: 'fine_powder', color: '#fef08a', mass_g: 'fromLedger' },
      gasesOffgassed: [{ species: 'SO2', mol: 'fromLedger', escaped: true }] },
  },
  explain: {
    observation_vi: 'Lưu huỳnh keo làm dịch đục dần; SO2 sinh ra không màu, không phải khói trắng.',
    observation_en: 'Colloidal sulfur clouds the liquid; the sulfur dioxide by-product is colorless.',
    why_vi: 'Thiosulfate phân hủy trong axit, khác đồng hồ iot–tinh bột. Lượng S và SO2 bị chặn theo chất giới hạn; thời gian là minh họa.',
    why_en: 'Acid decomposes thiosulfate. Sulfur and sulfur dioxide are limited by reactant inventory; timing is illustrative.',
  }, confidence: 0.85,
};
