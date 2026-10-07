/**
 * acidBasePrograms.ts — Neutralization, Acid-Base & Indicator Reaction Programs
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const ACID_BASE_PROGRAMS: ReactionProgram[] = [
  // 1. HCl + NaOH
  {
    schema: 'chemdex.program/1',
    id: 'hcl_naoh',
    provenance: 'handcrafted',
    controller: 'hcl_naoh',
    chemistry: {
      equation: 'HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)',
      ionic: 'H+(aq) + OH-(aq) -> H2O(l)',
      species: [
        { formula: 'HCl', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#f8fafc', hazards: ['GHS05_corrosive'] },
        { formula: 'NaOH', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#f8fafc', hazards: ['GHS05_corrosive'] },
        { formula: 'NaCl', role: 'product', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l', colorHex: '#ffffff' }
      ],
      deltaH_kJ_per_mol: -57.3,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: ['GHS05_corrosive'],
      warning_vi: 'Phản ứng tỏa nhiệt trung hòa axit mạnh - bazơ mạnh.',
      warning_en: 'Exothermic strong acid-strong base neutralization.'
    },
    visual: {
      duration_s: 4.0,
      timeline: [
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.0, params: { speed: 1.5, color: '#e0f2fe' } },
        { id: 'steam', atom: 'thermalSteam', anchor: 'rim', window: [0.2, 0.8], intensity: 0.6, params: { steamDensity: 0.5, temperature_c: 42 } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'bulk', window: [0, 0.2], intensity: 0.5, params: { soundProfile: 'fizz_effervescence', volume: 0.4 } }
      ],
      after: { liquidColor: '#f8fafc', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Dung dịch trong suốt, nhiệt độ tăng nhẹ do tỏa nhiệt.',
      observation_en: 'Clear solution, slight temperature rise due to exothermic neutralization.',
      why_vi: 'Ion H+ và OH- kết hợp tạo thành phân tử nước ổn định.',
      why_en: 'H+ and OH- ions combine to form stable water molecules.'
    },
    confidence: 1.0
  },

  // 2. H2SO4 + 2NaOH
  {
    schema: 'chemdex.program/1',
    id: 'h2so4_naoh',
    provenance: 'handcrafted',
    controller: 'h2so4_naoh',
    chemistry: {
      equation: 'H2SO4(aq) + 2NaOH(aq) -> Na2SO4(aq) + 2H2O(l)',
      ionic: '2H+(aq) + 2OH-(aq) -> 2H2O(l)',
      species: [
        { formula: 'H2SO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'NaOH', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Na2SO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 2, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -114.6,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 5.0,
      timeline: [
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.5], intensity: 1.2, params: { speed: 1.8, color: '#e0f2fe' } },
        { id: 'steam', atom: 'thermalSteam', anchor: 'rim', window: [0.1, 0.9], intensity: 1.0, params: { steamDensity: 0.9, temperature_c: 58 } }
      ],
      after: { liquidColor: '#f8fafc', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Cốc nóng lên rõ rệt, bốc hơi nước nhẹ, dung dịch vẫn trong suốt.',
      observation_en: 'Beaker warms noticeably, gentle water vapor, liquid remains clear.',
      why_vi: 'Phản ứng trung hòa bậc hai tỏa nhiệt mạnh.',
      why_en: 'Diprotic acid neutralization releases significant enthalpy.'
    },
    confidence: 1.0
  },

  // 3. HNO3 + KOH
  {
    schema: 'chemdex.program/1',
    id: 'hno3_koh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'HNO3(aq) + KOH(aq) -> KNO3(aq) + H2O(l)',
      ionic: 'H+(aq) + OH-(aq) -> H2O(l)',
      species: [
        { formula: 'HNO3', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive', 'GHS03_oxidizer'] },
        { formula: 'KOH', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'KNO3', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -57.3,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 4.0,
      timeline: [
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.0, params: { speed: 1.4, color: '#ffffff' } },
        { id: 'steam', atom: 'thermalSteam', anchor: 'rim', window: [0.2, 0.7], intensity: 0.5, params: { steamDensity: 0.4, temperature_c: 40 } }
      ],
      after: { liquidColor: '#ffffff', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Dung dịch trong suốt không màu, tỏa nhiệt nhẹ.',
      observation_en: 'Clear colorless solution, mild temperature increase.',
      why_vi: 'Tạo muối tan kali nitrat và nước.',
      why_en: 'Forms soluble potassium nitrate salt and water.'
    },
    confidence: 1.0
  },

  // 4. CH3COOH + NaOH
  {
    schema: 'chemdex.program/1',
    id: 'ch3cooh_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'CH3COOH(aq) + NaOH(aq) -> CH3COONa(aq) + H2O(l)',
      ionic: 'CH3COOH(aq) + OH-(aq) -> CH3COO-(aq) + H2O(l)',
      species: [
        { formula: 'CH3COOH', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'NaOH', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'CH3COONa', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -55.8,
      kinetics: { model: 'first_order', halfTime_s: 0.3 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 4.0,
      timeline: [
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.45], intensity: 1.0, params: { speed: 1.2, color: '#f1f5f9' } }
      ],
      after: { liquidColor: '#f8fafc', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Mùi giấm chua biến mất, dung dịch hơi ấm.',
      observation_en: 'Vinegar odor neutralizes, solution turns mildly warm.',
      why_vi: 'Axit axetic bị bazơ mạnh trung hòa hoàn toàn.',
      why_en: 'Acetic acid completely neutralizes into sodium acetate.'
    },
    confidence: 1.0
  },

  // 5. HCl + NH3 -> NH4Cl (fuming gas phase or solution)
  {
    schema: 'chemdex.program/1',
    id: 'nh3_hcl',
    provenance: 'handcrafted',
    controller: 'nh3_hcl',
    chemistry: {
      equation: 'NH3(g) + HCl(g) -> NH4Cl(s)',
      species: [
        { formula: 'NH3', role: 'reactant', coeff: 1, phase: 'g', hazards: ['GHS05_corrosive', 'GHS06_toxic'] },
        { formula: 'HCl', role: 'reactant', coeff: 1, phase: 'g', hazards: ['GHS05_corrosive', 'GHS06_toxic'] },
        { formula: 'NH4Cl', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' }
      ],
      deltaH_kJ_per_mol: -176.0,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: ['GHS05_corrosive', 'GHS06_toxic']
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'fumes', atom: 'headspaceFog', anchor: 'headspace', window: [0, 0.9], intensity: 1.5, params: { fogColor: '#ffffff', density: 0.95 } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'rim', window: [0, 0.2], intensity: 0.4, params: { soundProfile: 'fizz_effervescence', volume: 0.3 } }
      ],
      after: { liquidColor: '#ffffff', liquidOpacity: 0.9, turbidity: 0.5, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Khói trắng dày đặc xuất hiện ngay tại miệng bình khi hai hơi khí gặp nhau.',
      observation_en: 'Thick white smoke billows immediately where the two invisible vapors meet.',
      why_vi: 'Khí NH3 và HCl phản ứng tạo tinh thể muối rắn NH4Cl lơ lửng như khói.',
      why_en: 'Gaseous NH3 and HCl react to form airborne solid ammonium chloride micro-crystals.'
    },
    confidence: 1.0
  },

  // 6. H2SO4 + 2NH3 -> (NH4)2SO4
  {
    schema: 'chemdex.program/1',
    id: 'h2so4_nh3',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'H2SO4(aq) + 2NH3(aq) -> (NH4)2SO4(aq)',
      species: [
        { formula: 'H2SO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'NH3', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: ' (NH4)2SO4', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -108.0,
      kinetics: { model: 'instant', halfTime_s: 0.2 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 4.5,
      timeline: [
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.0, params: { speed: 1.3, color: '#f8fafc' } },
        { id: 'steam', atom: 'thermalSteam', anchor: 'rim', window: [0.2, 0.8], intensity: 0.7, params: { steamDensity: 0.6, temperature_c: 50 } }
      ],
      after: { liquidColor: '#ffffff', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Dung dịch tỏa nhiệt, mùi khai amoniac biến mất.',
      observation_en: 'Solution warms up, pungent ammonia odor disappears.',
      why_vi: 'Tạo muối amoni sunfat tan trong nước.',
      why_en: 'Forms soluble ammonium sulfate salt.'
    },
    confidence: 1.0
  },

  // 7. H3PO4 + 3NaOH -> Na3PO4 + 3H2O
  {
    schema: 'chemdex.program/1',
    id: 'h3po4_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'H3PO4(aq) + 3NaOH(aq) -> Na3PO4(aq) + 3H2O(l)',
      species: [
        { formula: 'H3PO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'NaOH', role: 'reactant', coeff: 3, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Na3PO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 3, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -160.0,
      kinetics: { model: 'first_order', halfTime_s: 0.4 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 4.5,
      timeline: [
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.5], intensity: 1.1, params: { speed: 1.4, color: '#f8fafc' } }
      ],
      after: { liquidColor: '#ffffff', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Dung dịch tỏa nhiệt mạnh, trong suốt không màu.',
      observation_en: 'Solution warms significantly, remains clear and colorless.',
      why_vi: 'Axit photphoric ba nấc bị trung hòa hoàn toàn.',
      why_en: 'Triprotic phosphoric acid undergoes complete neutralization.'
    },
    confidence: 1.0
  },

  // 8. HCl + Ca(OH)2 -> CaCl2 + 2H2O
  {
    schema: 'chemdex.program/1',
    id: 'hcl_caoh2',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2HCl(aq) + Ca(OH)2(aq) -> CaCl2(aq) + 2H2O(l)',
      species: [
        { formula: 'HCl', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Ca(OH)2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'CaCl2', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 2, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -112.0,
      kinetics: { model: 'instant', halfTime_s: 0.2 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 4.0,
      timeline: [
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.0, params: { speed: 1.3, color: '#f8fafc' } }
      ],
      after: { liquidColor: '#ffffff', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Nước vôi trong phản ứng với axit tạo dung dịch canxi clorua trong suốt.',
      observation_en: 'Limewater reacts with acid yielding a clear calcium chloride solution.',
      why_vi: 'Bazơ canxi hidroxit bị trung hòa thành muối tan.',
      why_en: 'Calcium hydroxide is neutralized into highly soluble calcium chloride.'
    },
    confidence: 1.0
  },

  // 9. H2SO4 + Ba(OH)2 -> BaSO4(s) + 2H2O (Simultaneous neutralization AND precipitation!)
  {
    schema: 'chemdex.program/1',
    id: 'h2so4_baoh2',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'H2SO4(aq) + Ba(OH)2(aq) -> BaSO4(s) + 2H2O(l)',
      ionic: '2H+(aq) + SO4(2-)(aq) + Ba(2+)(aq) + 2OH-(aq) -> BaSO4(s) + 2H2O(l)',
      species: [
        { formula: 'H2SO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Ba(OH)2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive', 'GHS06_toxic'] },
        { formula: 'BaSO4', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'H2O', role: 'product', coeff: 2, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -140.0,
      kinetics: { model: 'instant', halfTime_s: 0.15 },
      hazards: ['GHS05_corrosive', 'GHS06_toxic']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.2, params: { morphology: 'fine_powder', color: '#ffffff', nucleationRate: 95 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { maxTurbidity: 0.98, hazeColor: '#ffffff' } },
        { id: 'stokes', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.3, 1.0], intensity: 1.0, params: { stokesRadius_um: 0.5, sedimentColor: '#ffffff', bedHeight_mm: 5.0 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.75,
        precipitate: { substance: 'BaSO4', morphology: 'fine_powder', color: '#ffffff', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Vừa tỏa nhiệt vừa tạo kết tủa trắng đục như sữa; độ dẫn điện của dung dịch giảm gần bằng 0 tại điểm tương đương.',
      observation_en: 'Exothermic with dense milky white precipitate; electrical conductivity drops to near zero at equivalence.',
      why_vi: 'Cả hai ion H+ và OH- kết hợp thành H2O, đồng thời Ba2+ và SO4(2-) tạo kết tủa BaSO4 không tan.',
      why_en: 'Both sets of ions are simultaneously removed as water and insoluble barium sulfate precipitate.'
    },
    confidence: 1.0
  },

  // 10. HNO3 + NaOH -> NaNO3 + H2O
  {
    schema: 'chemdex.program/1',
    id: 'hno3_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'HNO3(aq) + NaOH(aq) -> NaNO3(aq) + H2O(l)',
      species: [
        { formula: 'HNO3', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive', 'GHS03_oxidizer'] },
        { formula: 'NaOH', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'NaNO3', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -57.3,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 4.0,
      timeline: [
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.4], intensity: 1.0, params: { speed: 1.3, color: '#f8fafc' } }
      ],
      after: { liquidColor: '#f8fafc', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Dung dịch trong suốt, tỏa nhiệt trung hòa.',
      observation_en: 'Clear solution, typical neutralization heat release.',
      why_vi: 'Tạo natri nitrat và nước.',
      why_en: 'Produces soluble sodium nitrate and water.'
    },
    confidence: 1.0
  },

  // 11. Phenolphthalein + NaOH (Indicator basic turn)
  {
    schema: 'chemdex.program/1',
    id: 'phenolphthalein_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'HIn(colorless) + OH-(aq) -> In-(magenta) + H2O(l)',
      species: [
        { formula: 'Phenolphthalein', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ffffff' },
        { formula: 'NaOH', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'In_basic', role: 'product', coeff: 1, phase: 'aq', colorHex: '#f43f5e' }
      ],
      kinetics: { model: 'instant', halfTime_s: 0.05 },
      hazards: []
    },
    visual: {
      duration_s: 3.5,
      timeline: [
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.6], intensity: 1.2, params: { startColor: '#ffffff', endColor: '#f43f5e', opticalPath_cm: 5.0 } },
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.5], intensity: 1.0, params: { speed: 1.6, color: '#fb7185' } }
      ],
      after: { liquidColor: '#f43f5e', liquidOpacity: 0.92, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Dung dịch không màu lập tức chuyển sang màu hồng cánh sen / đỏ tím rực rỡ.',
      observation_en: 'Colorless solution instantly shifts to vivid magenta/pink.',
      why_vi: 'Phenolphthalein mất proton trong môi trường kiềm (pH > 8.2), tạo hệ liên hợp mở vòng hút ánh sáng.',
      why_en: 'Phenolphthalein deprotonates at pH > 8.2, opening its quinoid ring to form a vivid chromophore.'
    },
    confidence: 1.0
  },

  // 12. Methyl Orange + Acid
  {
    schema: 'chemdex.program/1',
    id: 'methyl_orange_hcl',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'In-(yellow) + H+(aq) -> HIn(red)',
      species: [
        { formula: 'Methyl_Orange', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#facc15' },
        { formula: 'HCl', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'HIn_acidic', role: 'product', coeff: 1, phase: 'aq', colorHex: '#ef4444' }
      ],
      kinetics: { model: 'instant', halfTime_s: 0.05 },
      hazards: []
    },
    visual: {
      duration_s: 3.5,
      timeline: [
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.6], intensity: 1.0, params: { startColor: '#facc15', endColor: '#ef4444', opticalPath_cm: 4.5 } }
      ],
      after: { liquidColor: '#ef4444', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Dung dịch chuyển từ màu vàng cam sang màu đỏ tươi rực rỡ.',
      observation_en: 'Solution transitions from yellow-orange to bright crimson red.',
      why_vi: 'Metyl da cam nhận proton tại pH < 3.1 chuyển thành dạng cation quinoid màu đỏ.',
      why_en: 'Methyl orange protonates at pH < 3.1 into a red quinoid resonant form.'
    },
    confidence: 1.0
  },

  // 13. Bromothymol Blue + Base
  {
    schema: 'chemdex.program/1',
    id: 'bromothymol_blue_base',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'HIn(yellow/green) + OH-(aq) -> In-(deep blue) + H2O(l)',
      species: [
        { formula: 'Bromothymol_Blue', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#22c55e' },
        { formula: 'NaOH', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'In_blue', role: 'product', coeff: 1, phase: 'aq', colorHex: '#1d4ed8' }
      ],
      kinetics: { model: 'instant', halfTime_s: 0.05 },
      hazards: []
    },
    visual: {
      duration_s: 3.5,
      timeline: [
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.6], intensity: 1.0, params: { startColor: '#22c55e', endColor: '#1d4ed8', opticalPath_cm: 4.5 } }
      ],
      after: { liquidColor: '#1d4ed8', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [] }
    },
    explain: {
      observation_vi: 'Dung dịch chuyển từ màu vàng/xanh lá sang màu xanh lam đậm tuyệt đẹp.',
      observation_en: 'Solution transitions from green to magnificent deep royal blue.',
      why_vi: 'Bromothymol xanh deproton hóa tại pH > 7.6 thành dạng bazơ màu xanh dương.',
      why_en: 'Bromothymol blue deprotonates at pH > 7.6 into its deep blue basic form.'
    },
    confidence: 1.0
  }
];
