import type { ReactionProgram } from '../../../shared/programSchema';
import { aluminumReactionEnthalpy_J_mol, ALUMINUM_EQUILIBRIUM_SOURCES } from '../../../science/aluminumHydroxideEquilibrium';

export function aluminumThermochemistry(id: string) {
  return { deltaH_kJ_per_mol: aluminumReactionEnthalpy_J_mol(id, 25)! / 1000,
    deltaHSourceUrls: [...ALUMINUM_EQUILIBRIUM_SOURCES], deltaHReferenceTemperature_K: 298.15,
    deltaHNote_vi: 'Suy từ đường cân bằng ion WATEQ4F của Al(OH)3 vô định hình, thủy phân Al và Kw. Nhiệt pha loãng, gel già hóa và nhiệt tái phân bố phức theo nồng độ chưa hiệu chuẩn.' };
}

function aluminateProgram(sulfate: boolean): ReactionProgram {
  const id = sulfate ? 'al2so43_naoh_excess' : 'alcl3_naoh_excess';
  return {
    schema: 'chemdex.program/1', id, provenance: 'handcrafted',
    controller: sulfate ? 'al2so43_naoh_aluminate' : 'alcl3_naoh_aluminate',
    chemistry: {
      equation: sulfate ? 'Al2(SO4)3(aq) + 8NaOH(aq) -> 2Na[Al(OH)4](aq) + 3Na2SO4(aq)'
        : 'AlCl3(aq) + 4NaOH(aq) -> Na[Al(OH)4](aq) + 3NaCl(aq)',
      ionic: 'Al(3+)(aq) + 4OH-(aq) -> [Al(OH)4]-(aq)',
      species: [
        { formula: sulfate ? 'Al2(SO4)3' : 'AlCl3', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'NaOH', role: 'reactant', coeff: sulfate ? 8 : 4, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Na[Al(OH)4]', role: 'product', coeff: sulfate ? 2 : 1, phase: 'aq' },
        { formula: sulfate ? 'Na2SO4' : 'NaCl', role: 'product', coeff: 3, phase: 'aq' },
      ],
      ...aluminumThermochemistry(id), kinetics: { model: 'instant', halfTime_s: 0.15 }, hazards: ['GHS05_corrosive'],
    },
    visual: { duration_s: 5, timeline: [{ id: 'mix', atom: 'liquidSwirl', anchor: 'pourPoint',
      window: [0, 0.6], intensity: 0.4, params: { speed: 0.7, color: '#f8fafc' } }],
      after: { liquidColor: '#f8fafc', liquidOpacity: 0.95, turbidity: 0, gasesOffgassed: [] } },
    explain: {
      observation_vi: 'Khi kiềm đủ dư, nhôm tồn tại chủ yếu dưới dạng aluminate hòa tan. Không tự tạo đám keo trắng hoặc bọt khí.',
      observation_en: 'With sufficient excess base, dissolved aluminate dominates. No automatic white gel or gas bubbles.',
      why_vi: 'Lượng aluminate được giới hạn theo cân bằng nhôm và pH. Nếu còn quá bão hòa Al(OH)3, cần xét phần keo còn lại trước.',
      why_en: 'Aluminate quantity follows aluminum equilibrium and pH. Supersaturated samples require their remaining hydroxide phase first.',
    }, confidence: 1,
  };
}

export const ALUMINUM_HYDROXIDE_PROGRAMS: ReactionProgram[] = [
  {
    schema: 'chemdex.program/1', id: 'al2so43_naoh', provenance: 'handcrafted', controller: 'al2so4_naoh_amphoteric',
    chemistry: {
      equation: 'Al2(SO4)3(aq) + 6NaOH(aq) -> 2Al(OH)3(s) + 3Na2SO4(aq)',
      ionic: 'Al(3+)(aq) + 3OH-(aq) -> Al(OH)3(s)',
      species: [
        { formula: 'Al2(SO4)3', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'NaOH', role: 'reactant', coeff: 6, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Al(OH)3', role: 'product', coeff: 2, phase: 's', colorHex: '#ffffff' },
        { formula: 'Na2SO4', role: 'product', coeff: 3, phase: 'aq' },
      ],
      ...aluminumThermochemistry('al2so43_naoh'), kinetics: { model: 'instant', halfTime_s: 0.15 },
    },
    visual: { duration_s: 6.5, timeline: [{ id: 'mix', atom: 'liquidSwirl', anchor: 'pourPoint',
      window: [0, 0.6], intensity: 0.4, params: { speed: 0.7, color: '#f8fafc' } }],
      after: { liquidColor: '#f8fafc', liquidOpacity: 0.95, turbidity: 0.55,
        precipitate: { substance: 'Al(OH)3', morphology: 'gel', color: '#ffffff', mass_g: 'fromLedger' }, gasesOffgassed: [] } },
    explain: {
      observation_vi: 'Keo Al(OH)3 trắng xuất hiện khi dung dịch quá bão hòa. Lượng keo phụ thuộc pH và thuốc thử; kiềm dư có thể làm giảm phần rắn.',
      observation_en: 'White Al(OH)3 gel forms on supersaturation. Its quantity depends on pH and reagents; excess base can reduce the solid fraction.',
      why_vi: 'Sulfate vừa là ion nền vừa tạo phức nhôm hòa tan; phải tính phân bố ion trước khi xác định lượng kết tủa.',
      why_en: 'Sulfate forms dissolved aluminum complexes; aqueous speciation determines the precipitated amount.',
    }, confidence: 1,
  },
  aluminateProgram(false), aluminateProgram(true),
];
