/**
 * inorganicAnalysisPrograms.ts — Qualitative Analysis Cations & Anions
 * 
 * Accurately models textbook analytical chemistry tests, characteristic precipitate colors,
 * amphoterism, oxidation states, and crystal habits.
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const INORGANIC_ANALYSIS_PROGRAMS: ReactionProgram[] = [
  // 1. NiSO4 + 2NaOH -> Ni(OH)2 + Na2SO4 (Apple Green Gel)
  {
    schema: 'chemdex.program/1',
    id: 'niso4_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'NiSO4(aq) + 2NaOH(aq) -> Ni(OH)2(s) + Na2SO4(aq)',
      ionic: 'Ni(2+)(aq) + 2OH-(aq) -> Ni(OH)2(s)',
      species: [
        { formula: 'NiSO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS08_health_hazard'] },
        { formula: 'NaOH', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Ni(OH)2', role: 'product', coeff: 1, phase: 's', colorHex: '#4ade80' },
        { formula: 'Na2SO4', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -32.0,
      kinetics: { model: 'instant', halfTime_s: 0.2 },
      hazards: ['GHS05_corrosive', 'GHS08_health_hazard']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.1, params: { morphology: 'gel', color: '#4ade80', nucleationRate: 75 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { maxTurbidity: 0.92, hazeColor: '#86efac' } }
      ],
      after: {
        liquidColor: '#86efac',
        liquidOpacity: 0.95,
        turbidity: 0.85,
        precipitate: { substance: 'Ni(OH)2', morphology: 'gel', color: '#4ade80', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Tạo kết tủa keo màu xanh lục táo (apple green) không tan trong kiềm dư.',
      observation_en: 'Distinctive apple-green gelatinous nickel(II) hydroxide precipitate forms, insoluble in excess NaOH.',
      why_vi: 'Ni2+ tạo hydroxit kết tủa có Ksp = 5.5 x 10^-16, không có tính lưỡng tính.',
      why_en: 'Precipitation of non-amphoteric nickel(II) hydroxide with Ksp = 5.5 x 10^-16.'
    },
    confidence: 1.0
  },

  // 2. CoCl2 + 2NaOH -> Co(OH)2 + 2NaCl (Blue turning Rose Pink)
  {
    schema: 'chemdex.program/1',
    id: 'cocl2_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'CoCl2(aq) + 2NaOH(aq) -> Co(OH)2(s) + 2NaCl(aq)',
      ionic: 'Co(2+)(aq) + 2OH-(aq) -> Co(OH)2(s)',
      species: [
        { formula: 'CoCl2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS07_harmful', 'GHS08_health_hazard'] },
        { formula: 'NaOH', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Co(OH)2', role: 'product', coeff: 1, phase: 's', colorHex: '#f472b6' },
        { formula: 'NaCl', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -28.0,
      kinetics: { model: 'first_order', halfTime_s: 0.5 },
      hazards: ['GHS05_corrosive', 'GHS08_health_hazard']
    },
    visual: {
      duration_s: 7.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.35], intensity: 1.2, params: { morphology: 'gel', color: '#0284c7', nucleationRate: 80 } },
        { id: 'shift', atom: 'beerLambertFade', anchor: 'bulk', window: [0.35, 0.85], intensity: 1.0, params: { startColor: '#0284c7', endColor: '#f472b6', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#fbcfe8',
        liquidOpacity: 0.95,
        turbidity: 0.8,
        precipitate: { substance: 'Co(OH)2', morphology: 'gel', color: '#f472b6', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Ban đầu tạo kết tủa xanh lam của muối bazơ Co(OH)Cl, sau đó nhanh chóng chuyển sang màu hồng đào Co(OH)2.',
      observation_en: 'Initial blue basic salt Co(OH)Cl precipitate shifts to stable peach-pink Co(OH)2.',
      why_vi: 'Giai đoạn đầu tạo muối bazơ tứ diện xanh, sau đó chuyển thành hydroxit bát diện ổn định màu hồng.',
      why_en: 'Initial blue tetrahedral basic salt converts to thermodynamically stable pink octahedral hydroxide.'
    },
    confidence: 1.0
  },

  // 3. ZnSO4 + 2NaOH -> Zn(OH)2 + Na2SO4 (White Gelatinous Amphoteric)
  {
    schema: 'chemdex.program/1',
    id: 'znso4_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'ZnSO4(aq) + 2NaOH(aq) -> Zn(OH)2(s) + Na2SO4(aq)',
      ionic: 'Zn(2+)(aq) + 2OH-(aq) -> Zn(OH)2(s)',
      species: [
        { formula: 'ZnSO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS07_harmful', 'GHS09_environmental'] },
        { formula: 'NaOH', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Zn(OH)2', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'Na2SO4', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -30.0,
      kinetics: { model: 'instant', halfTime_s: 0.2 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.15, params: { morphology: 'gel', color: '#ffffff', nucleationRate: 85 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { maxTurbidity: 0.9, hazeColor: '#ffffff' } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.75,
        precipitate: { substance: 'Zn(OH)2', morphology: 'gel', color: '#ffffff', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Tạo kết tủa keo trắng Zn(OH)2 đặc trưng, tan được trong kiềm dư tạo dung dịch trong suốt.',
      observation_en: 'White gelatinous Zn(OH)2 forms, which redissolves in excess NaOH as zincate [Zn(OH)4]2-.',
      why_vi: 'Zn(OH)2 là hydroxit lưỡng tính kinh điển, tan trong kiềm dư tạo phức tetrahidroxozincat.',
      why_en: 'Amphoteric Zn(OH)2 precipitates at neutral/mild basic pH and redissolves in excess base.'
    },
    confidence: 1.0
  },

  // 4. MgCl2 + 2NaOH -> Mg(OH)2 + 2NaCl (Milk of Magnesia Precipitate)
  {
    schema: 'chemdex.program/1',
    id: 'mgcl2_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'MgCl2(aq) + 2NaOH(aq) -> Mg(OH)2(s) + 2NaCl(aq)',
      ionic: 'Mg(2+)(aq) + 2OH-(aq) -> Mg(OH)2(s)',
      species: [
        { formula: 'MgCl2', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'NaOH', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Mg(OH)2', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'NaCl', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -22.0,
      kinetics: { model: 'instant', halfTime_s: 0.25 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.45], intensity: 1.1, params: { morphology: 'gel', color: '#ffffff', nucleationRate: 75 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.55], intensity: 1.0, params: { maxTurbidity: 0.88, hazeColor: '#f8fafc' } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.7,
        precipitate: { substance: 'Mg(OH)2', morphology: 'gel', color: '#ffffff', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Tạo huyền phù kết tủa trắng đục (sữa magie - milk of magnesia) không tan trong kiềm dư.',
      observation_en: 'Gelatinous white magnesium hydroxide (milk of magnesia) suspension forms, insoluble in excess NaOH.',
      why_vi: 'Tích số tan Ksp = 5.6 x 10^-12, ion Mg2+ không có tính lưỡng tính.',
      why_en: 'Magnesium lacks amphoterism, leaving stable white Mg(OH)2 precipitate.'
    },
    confidence: 1.0
  },

  // 5. MnSO4 + 2NaOH -> Mn(OH)2 + Na2SO4 (White turning Brown via Oxidation)
  {
    schema: 'chemdex.program/1',
    id: 'mnso4_naoh',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'MnSO4(aq) + 2NaOH(aq) -> Mn(OH)2(s) + Na2SO4(aq)',
      ionic: 'Mn(2+)(aq) + 2OH-(aq) -> Mn(OH)2(s)',
      species: [
        { formula: 'MnSO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS08_health_hazard'] },
        { formula: 'NaOH', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Mn(OH)2', role: 'product', coeff: 1, phase: 's', colorHex: '#fef08a' },
        { formula: 'Na2SO4', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -25.0,
      kinetics: { model: 'first_order', halfTime_s: 0.8 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 7.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.35], intensity: 1.15, params: { morphology: 'floc', color: '#fef3c7', nucleationRate: 75 } },
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0.35, 0.95], intensity: 1.2, params: { startColor: '#fef3c7', endColor: '#78350f', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#78350f',
        liquidOpacity: 0.95,
        turbidity: 0.85,
        precipitate: { substance: 'MnO(OH)2', morphology: 'floc', color: '#78350f', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa trắng ngà Mn(OH)2 mới sinh nhanh chóng bị oxy hóa bởi không khí thành màu nâu đen MnO(OH)2.',
      observation_en: 'Initial off-white Mn(OH)2 rapidly oxidizes at surface with aerial oxygen to dark brown MnO(OH)2.',
      why_vi: 'Mn(II) có thế khử thấp trong môi trường kiềm, dễ bị oxi hòa tan oxy hóa lên Mn(IV).',
      why_en: 'Mn(II) is readily oxidized by dissolved atmospheric O2 under alkaline conditions to brown Mn(IV) oxyhydroxide.'
    },
    confidence: 1.0
  },

  // 6. Bi(NO3)3 + 3KI -> BiI3 + 3KNO3 (Dark Brown Bismuth Iodide)
  {
    schema: 'chemdex.program/1',
    id: 'bino33_ki',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Bi(NO3)3(aq) + 3KI(aq) -> BiI3(s) + 3KNO3(aq)',
      ionic: 'Bi(3+)(aq) + 3I-(aq) -> BiI3(s)',
      species: [
        { formula: 'Bi(NO3)3', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS03_oxidizer'] },
        { formula: 'KI', role: 'reactant', coeff: 3, phase: 'aq' },
        { formula: 'BiI3', role: 'product', coeff: 1, phase: 's', colorHex: '#18181b' },
        { formula: 'KNO3', role: 'product', coeff: 3, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -45.0,
      kinetics: { model: 'instant', halfTime_s: 0.2 },
      hazards: []
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.25, params: { morphology: 'fine_powder', color: '#27272a', nucleationRate: 90 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { maxTurbidity: 0.96, hazeColor: '#3f3f46' } }
      ],
      after: {
        liquidColor: '#27272a',
        liquidOpacity: 0.98,
        turbidity: 0.9,
        precipitate: { substance: 'BiI3', morphology: 'fine_powder', color: '#18181b', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Tạo kết tủa màu nâu đen đặc trưng của bismut(III) iotua BiI3.',
      observation_en: 'Jet-black to dark chocolate brown bismuth(III) iodide precipitates instantly.',
      why_vi: 'Tích số tan Ksp = 7.7 x 10^-19 rất nhỏ, tan trong KI dư tạo phức [BiI4]- màu vàng cam.',
      why_en: 'Extremely insoluble BiI3 (Ksp = 7.7 x 10^-19) dissolves in excess iodide to form orange tetraiodobismuthate.'
    },
    confidence: 1.0
  },

  // 7. ZnSO4 + Na2S -> ZnS + Na2SO4 (White Zinc Sulfide Qualitative Analysis)
  {
    schema: 'chemdex.program/1',
    id: 'znso4_na2s',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'ZnSO4(aq) + Na2S(aq) -> ZnS(s) + Na2SO4(aq)',
      ionic: 'Zn(2+)(aq) + S(2-)(aq) -> ZnS(s)',
      species: [
        { formula: 'ZnSO4', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'Na2S', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive', 'GHS06_toxic'] },
        { formula: 'ZnS', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'Na2SO4', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -42.0,
      kinetics: { model: 'instant', halfTime_s: 0.15 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.25, params: { morphology: 'fine_powder', color: '#ffffff', nucleationRate: 90 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { maxTurbidity: 0.95, hazeColor: '#f1f5f9' } },
        { id: 'sed', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.0, params: { stokesRadius_um: 1.5, sedimentColor: '#ffffff', bedHeight_mm: 5.0 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.75,
        precipitate: { substance: 'ZnS', morphology: 'fine_powder', color: '#ffffff', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Tạo kết tủa trắng của kẽm sunfua ZnS (muối sunfua duy nhất của kim loại chuyển tiếp có màu trắng).',
      observation_en: 'White precipitate of zinc sulfide ZnS forms (the only white transition-metal sulfide in qualitative analysis).',
      why_vi: 'Zn2+ phản ứng với ion sunfua S 2- tạo kết tủa ZnS có Ksp = 1.6 x 10^-24.',
      why_en: 'Precipitation of zinc sulfide driven by low solubility product Ksp = 1.6 x 10^-24.'
    },
    confidence: 1.0
  },

  // 8. 2AgNO3 + K2CrO4 -> Ag2CrO4 + 2KNO3 (Brick-Red Silver Chromate)
  {
    schema: 'chemdex.program/1',
    id: 'agno3_k2cro4',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2AgNO3(aq) + K2CrO4(aq) -> Ag2CrO4(s) + 2KNO3(aq)',
      ionic: '2Ag+(aq) + CrO4(2-)(aq) -> Ag2CrO4(s)',
      species: [
        { formula: 'AgNO3', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS03_oxidizer', 'GHS05_corrosive', 'GHS09_environmental'] },
        { formula: 'K2CrO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS06_toxic', 'GHS08_health_hazard'] },
        { formula: 'Ag2CrO4', role: 'product', coeff: 1, phase: 's', colorHex: '#991b1b' },
        { formula: 'KNO3', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -34.0,
      kinetics: { model: 'instant', halfTime_s: 0.15 },
      hazards: ['GHS05_corrosive', 'GHS08_health_hazard', 'GHS09_environmental']
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.35], intensity: 1.3, params: { morphology: 'crystal_plate', color: '#991b1b', nucleationRate: 90 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.45], intensity: 1.0, params: { maxTurbidity: 0.95, hazeColor: '#b91c1c' } }
      ],
      after: {
        liquidColor: '#991b1b',
        liquidOpacity: 0.96,
        turbidity: 0.8,
        precipitate: { substance: 'Ag2CrO4', morphology: 'crystal_plate', color: '#991b1b', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Tạo kết tủa màu đỏ gạch (brick-red) đặc trưng của bạc cromat, chỉ thị phương pháp chuẩn độ Mohr.',
      observation_en: 'Distinctive brick-red silver chromate precipitate forms (the classic endpoint indicator in Mohr titration).',
      why_vi: 'Tích số tan Ksp = 1.1 x 10^-12, kết tủa đỏ gạch xuất hiện ngay sau khi toàn bộ ion halogen kết tủa.',
      why_en: 'Low solubility product Ksp = 1.1 x 10^-12 yields characteristic brick-red crystals.'
    },
    confidence: 1.0
  },

  // 9. BaCl2 + K2CrO4 -> BaCrO4 + 2KCl (Pale Yellow Barium Chromate)
  {
    schema: 'chemdex.program/1',
    id: 'bacl2_k2cro4',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'BaCl2(aq) + K2CrO4(aq) -> BaCrO4(s) + 2KCl(aq)',
      ionic: 'Ba(2+)(aq) + CrO4(2-)(aq) -> BaCrO4(s)',
      species: [
        { formula: 'BaCl2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS06_toxic'] },
        { formula: 'K2CrO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS06_toxic', 'GHS08_health_hazard'] },
        { formula: 'BaCrO4', role: 'product', coeff: 1, phase: 's', colorHex: '#facc15' },
        { formula: 'KCl', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -28.0,
      kinetics: { model: 'instant', halfTime_s: 0.2 },
      hazards: ['GHS06_toxic', 'GHS08_health_hazard']
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.2, params: { morphology: 'fine_powder', color: '#facc15', nucleationRate: 85 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { maxTurbidity: 0.92, hazeColor: '#fde047' } }
      ],
      after: {
        liquidColor: '#facc15',
        liquidOpacity: 0.95,
        turbidity: 0.75,
        precipitate: { substance: 'BaCrO4', morphology: 'fine_powder', color: '#facc15', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Tạo kết tủa màu vàng chanh mịn của bari cromat, không tan trong axit axetic.',
      observation_en: 'Pale lemon-yellow barium chromate precipitate forms, insoluble in dilute acetic acid.',
      why_vi: 'Ksp = 1.2 x 10^-10 cho phép phân biệt Ba2+ với Sr2+ và Ca2+ trong phân tích định tính.',
      why_en: 'Low Ksp (1.2 x 10^-10) enables selective separation of Ba2+ from other alkaline earths.'
    },
    confidence: 1.0
  },

  // 10. Pb(NO3)2 + K2CrO4 -> PbCrO4 + 2KNO3 (Chrome Yellow Precipitate)
  {
    schema: 'chemdex.program/1',
    id: 'pbno32_k2cro4',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Pb(NO3)2(aq) + K2CrO4(aq) -> PbCrO4(s) + 2KNO3(aq)',
      ionic: 'Pb(2+)(aq) + CrO4(2-)(aq) -> PbCrO4(s)',
      species: [
        { formula: 'Pb(NO3)2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS06_toxic', 'GHS08_health_hazard'] },
        { formula: 'K2CrO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS06_toxic', 'GHS08_health_hazard'] },
        { formula: 'PbCrO4', role: 'product', coeff: 1, phase: 's', colorHex: '#eab308' },
        { formula: 'KNO3', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -35.0,
      kinetics: { model: 'instant', halfTime_s: 0.15 },
      hazards: ['GHS06_toxic', 'GHS08_health_hazard', 'GHS09_environmental']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.25, params: { morphology: 'fine_powder', color: '#eab308', nucleationRate: 90 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { maxTurbidity: 0.95, hazeColor: '#facc15' } }
      ],
      after: {
        liquidColor: '#eab308',
        liquidOpacity: 0.96,
        turbidity: 0.8,
        precipitate: { substance: 'PbCrO4', morphology: 'fine_powder', color: '#eab308', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Tạo kết tủa màu vàng tươi rực rỡ (vàng crom - chrome yellow), phẩm màu họa sĩ cổ điển.',
      observation_en: 'Vibrant bright chrome yellow lead(II) chromate precipitate forms (historic artists pigment).',
      why_vi: 'Tích số tan Ksp = 2.8 x 10^-13 cực nhỏ, tan trong kiềm đặc do tính lưỡng tính.',
      why_en: 'Extremely insoluble lead chromate (Ksp = 2.8 x 10^-13) dissolves in strong alkali as plumbite.'
    },
    confidence: 1.0
  },

  // 11. Pb(NO3)2 + Na2SO4 -> PbSO4 + 2NaNO3 (Dense White Lead Sulfate)
  {
    schema: 'chemdex.program/1',
    id: 'pbno32_na2so4',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Pb(NO3)2(aq) + Na2SO4(aq) -> PbSO4(s) + 2NaNO3(aq)',
      ionic: 'Pb(2+)(aq) + SO4(2-)(aq) -> PbSO4(s)',
      species: [
        { formula: 'Pb(NO3)2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS06_toxic', 'GHS08_health_hazard'] },
        { formula: 'Na2SO4', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'PbSO4', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'NaNO3', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -20.0,
      kinetics: { model: 'instant', halfTime_s: 0.2 },
      hazards: ['GHS06_toxic', 'GHS08_health_hazard']
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.2, params: { morphology: 'fine_powder', color: '#ffffff', nucleationRate: 85 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { maxTurbidity: 0.9, hazeColor: '#ffffff' } },
        { id: 'sed', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.1, params: { stokesRadius_um: 1.4, sedimentColor: '#ffffff', bedHeight_mm: 5.0 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.75,
        precipitate: { substance: 'PbSO4', morphology: 'fine_powder', color: '#ffffff', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Tạo kết tủa trắng nặng của chì sunfat, tan trong amoni axetat đặc.',
      observation_en: 'Heavy white precipitate of lead(II) sulfate forms, soluble in concentrated ammonium acetate.',
      why_vi: 'Tích số tan Ksp = 1.6 x 10^-8, chì sunfat là chất điện cực trong ắc quy chì-axit.',
      why_en: 'Lead sulfate forms insoluble lattice (Ksp = 1.6 x 10^-8), key active material in lead-acid batteries.'
    },
    confidence: 1.0
  },

  // 12. 2CuSO4 + 4KI -> 2CuI + I2 + 2K2SO4 (Copper Iodide White Precipitate in Brown Iodine Slurry)
  {
    schema: 'chemdex.program/1',
    id: 'cuso4_ki',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2CuSO4(aq) + 4KI(aq) -> 2CuI(s) + I2(aq) + 2K2SO4(aq)',
      ionic: '2Cu(2+)(aq) + 4I-(aq) -> 2CuI(s) + I2(aq)',
      species: [
        { formula: 'CuSO4', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS07_harmful', 'GHS09_environmental'] },
        { formula: 'KI', role: 'reactant', coeff: 4, phase: 'aq' },
        { formula: 'CuI', role: 'product', coeff: 2, phase: 's', colorHex: '#fef08a' },
        { formula: 'I2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#78350f' },
        { formula: 'K2SO4', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -48.0,
      kinetics: { model: 'instant', halfTime_s: 0.2 },
      hazards: ['GHS07_harmful']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.25, params: { morphology: 'curd', color: '#fef08a', nucleationRate: 85 } },
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.5], intensity: 1.2, params: { startColor: '#38bdf8', endColor: '#78350f', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#78350f',
        liquidOpacity: 0.98,
        turbidity: 0.85,
        precipitate: { substance: 'CuI', morphology: 'curd', color: '#fef08a', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch màu xanh lam lập tức chuyển thành huyền phù màu nâu thẫm gồm kết tủa trắng ngà CuI lẫn trong dung dịch iot I2.',
      observation_en: 'Blue copper solution instantly turns murky dark reddish-brown slurry of off-white CuI precipitate masked by liberated iodine.',
      why_vi: 'Cu2+ oxy hóa I- thành I2 tự do đồng thời bị khử thành kết tủa đồng(I) iotua CuI không tan.',
      why_en: 'Cu(II) oxidizes iodide to free iodine (forming brown triiodide) while reducing itself to insoluble Cu(I) iodide.'
    },
    confidence: 1.0
  }
];
