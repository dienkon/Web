/**
 * redoxDisplacementPrograms.ts — Redox & Metal Displacement Reaction Programs
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const REDOX_DISPLACEMENT_PROGRAMS: ReactionProgram[] = [
  // 1. Fe + CuSO4 -> FeSO4 + Cu
  {
    schema: 'chemdex.program/1',
    id: 'fe_cuso4',
    provenance: 'handcrafted',
    controller: 'single_displacement_copper',
    chemistry: {
      equation: 'Fe(s) + CuSO4(aq) -> FeSO4(aq) + Cu(s)',
      ionic: 'Fe(s) + Cu(2+)(aq) -> Fe(2+)(aq) + Cu(s)',
      species: [
        { formula: 'Fe', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'CuSO4', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#0284c7' },
        { formula: 'FeSO4', role: 'product', coeff: 1, phase: 'aq', colorHex: '#a7f3d0' },
        { formula: 'Cu', role: 'product', coeff: 1, phase: 's', colorHex: '#b45309' }
      ],
      deltaH_kJ_per_mol: -152.0,
      kinetics: { model: 'diffusion_limited', halfTime_s: 4.5, stirSensitivity: 0.8 }
    },
    visual: {
      duration_s: 8.5,
      timeline: [
        { id: 'dendrite', atom: 'surfaceDendriteGrowth', anchor: 'bottom', window: [0.1, 0.9], intensity: 1.2, params: { metalColor: '#b45309', growthSpeed: 0.6 } },
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0.1, 0.95], intensity: 1.0, params: { startColor: '#0284c7', endColor: '#d1fae5', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#d1fae5',
        liquidOpacity: 0.95,
        turbidity: 0.05,
        solidsRemaining: [{ formula: 'Fe', mass_g: 'fromLedger', morphologyChange: 'copper_plated_nail' }],
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Đinh sắt được phủ một lớp đồng màu đỏ cam sáng bóng, màu xanh lam của dung dịch nhạt dần chuyển sang xanh rêu nhạt.',
      observation_en: 'Bright reddish-orange copper plates onto iron surface; blue solution fades to faint pale green.',
      why_vi: 'Sắt có tính khử mạnh hơn đồng, khử ion Cu2+ thành kim loại đồng bám trên bề mặt.',
      why_en: 'Iron has a more negative reduction potential than copper, displacing Cu2+ as metallic copper.'
    },
    confidence: 1.0
  },

  // 2. Zn + CuSO4 -> ZnSO4 + Cu
  {
    schema: 'chemdex.program/1',
    id: 'zn_cuso4',
    provenance: 'handcrafted',
    controller: 'zn_cuso4_displacement',
    chemistry: {
      equation: 'Zn(s) + CuSO4(aq) -> ZnSO4(aq) + Cu(s)',
      ionic: 'Zn(s) + Cu(2+)(aq) -> Zn(2+)(aq) + Cu(s)',
      species: [
        { formula: 'Zn', role: 'reactant', coeff: 1, phase: 's' },
        { formula: 'CuSO4', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#0284c7' },
        { formula: 'ZnSO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'Cu', role: 'product', coeff: 1, phase: 's', colorHex: '#78350f' } // Spongy dark copper
      ],
      deltaH_kJ_per_mol: -218.7,
      kinetics: { model: 'surface_limited', halfTime_s: 2.0, stirSensitivity: 0.85 }
    },
    visual: {
      duration_s: 8.0,
      timeline: [
        { id: 'erosion', atom: 'solidErosion', anchor: 'bottom', window: [0, 0.9], intensity: 1.2, params: { initialShape: 'granule', erosionRate: 0.2 } },
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0.1, 0.85], intensity: 1.2, params: { startColor: '#0284c7', endColor: '#ffffff', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.1,
        solidsRemaining: [{ formula: 'Zn', mass_g: 'fromLedger', morphologyChange: 'spongy_copper_coated' }],
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kẽm tan nhanh, bị phủ một lớp đồng xốp màu nâu đen, dung dịch xanh lam mất màu hoàn toàn thành không màu.',
      observation_en: 'Zinc erodes quickly, coated with spongy dark reddish-black copper; blue color completely disappears.',
      why_vi: 'Kẽm có thế điện cực chuẩn rất âm (-0.76V) so với Cu (+0.34V), phản ứng thế diễn ra mãnh liệt hơn sắt.',
      why_en: 'Zinc (-0.76V) displaces Cu (+0.34V) with greater electromotive force and faster kinetics than iron.'
    },
    confidence: 1.0
  },

  // 3. Cu + 2AgNO3 -> Cu(NO3)2 + 2Ag ("Silver Tree" crystal growth)
  {
    schema: 'chemdex.program/1',
    id: 'cu_agno3',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Cu(s) + 2AgNO3(aq) -> Cu(NO3)2(aq) + 2Ag(s)',
      ionic: 'Cu(s) + 2Ag+(aq) -> Cu(2+)(aq) + 2Ag(s)',
      species: [
        { formula: 'Cu', role: 'reactant', coeff: 1, phase: 's', colorHex: '#b45309' },
        { formula: 'AgNO3', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'Cu(NO3)2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#0284c7' },
        { formula: 'Ag', role: 'product', coeff: 2, phase: 's', colorHex: '#f1f5f9' }
      ],
      deltaH_kJ_per_mol: -147.0,
      kinetics: { model: 'diffusion_limited', halfTime_s: 5.0 }
    },
    visual: {
      duration_s: 9.0,
      timeWarp: { physical_s: 3600, note_en: 'Silver arbor tree grows over 1–2 hours in lab', note_vi: 'Cây bạc pha lê phát triển tinh thể trong 1–2 giờ' },
      timeline: [
        { id: 'tree', atom: 'surfaceDendriteGrowth', anchor: 'bottom', window: [0.1, 0.95], intensity: 1.5, params: { metalColor: '#f1f5f9', growthSpeed: 0.9 } },
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0.2, 0.95], intensity: 1.0, params: { startColor: '#ffffff', endColor: '#38bdf8', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#38bdf8',
        liquidOpacity: 0.95,
        turbidity: 0.05,
        solidsRemaining: [{ formula: 'Ag', mass_g: 'fromLedger', morphologyChange: 'silver_dendrite_tree' }],
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Cành cây bạc lấp lánh (dendrite) mọc tủa gai trên dây đồng, dung dịch từ không màu dần chuyển sang màu xanh lam ngọc.',
      observation_en: 'Brilliant needle-like silver dendrite tree branches out on copper wire; clear solution turns azure blue.',
      why_vi: 'Đồng khử Ag+ thành các tinh thể bạc hình nhánh cây; ion Cu2+ sinh ra làm dung dịch hóa xanh.',
      why_en: 'Copper displaces silver ions into shimmering metallic dendrites while dissolved Cu2+ imparts an azure blue hue.'
    },
    confidence: 1.0
  },

  // 4. 2KMnO4 + 5H2C2O4 + 3H2SO4 -> K2SO4 + 2MnSO4 + 10CO2 + 8H2O (Permanganate bleaching with autocatalytic Mn2+)
  {
    schema: 'chemdex.program/1',
    id: 'kmno4_oxalic',
    provenance: 'handcrafted',
    controller: 'permanganate_oxalate',
    chemistry: {
      equation: '2KMnO4(aq) + 5H2C2O4(aq) + 3H2SO4(aq) -> K2SO4(aq) + 2MnSO4(aq) + 10CO2(g) + 8H2O(l)',
      species: [
        { formula: 'KMnO4', role: 'reactant', coeff: 2, phase: 'aq', colorHex: '#581c87' }, // Deep violet purple
        { formula: 'H2C2O4', role: 'reactant', coeff: 5, phase: 'aq' },
        { formula: 'H2SO4', role: 'reactant', coeff: 3, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'MnSO4', role: 'product', coeff: 2, phase: 'aq', colorHex: '#fdf2f8' }, // Nearly colorless faint pink
        { formula: 'CO2', role: 'product', coeff: 10, phase: 'g' },
        { formula: 'K2SO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 8, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -680.0,
      kinetics: { model: 'autocatalytic', halfTime_s: 2.5, induction_s: 2.0 },
      hazards: ['GHS03_oxidizer', 'GHS05_corrosive']
    },
    visual: {
      duration_s: 8.5,
      timeline: [
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0.25, 0.85], intensity: 1.4, params: { startColor: '#581c87', endColor: '#fdf2f8', opticalPath_cm: 5.0 } },
        { id: 'bubbles', atom: 'nucleateBubbles', anchor: 'bulk', window: [0.3, 0.85], intensity: 0.9, params: { bubbleRate: 35, meanRadius_mm: 1.5, gasSpecies: 'CO2' } }
      ],
      after: {
        liquidColor: '#fdf2f8',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: [{ species: 'CO2', mol: 'fromLedger', escaped: true }]
      }
    },
    explain: {
      observation_vi: 'Màu tím đậm của KMnO4 thoạt đầu mất rất chậm (giai đoạn cảm ứng), sau đó bỗng nhiên mất màu rất nhanh thành dung dịch không màu kèm bọt khí CO2.',
      observation_en: 'Deep purple KMnO4 fades slowly at first (induction period), then bleaches rapidly with effervescent CO2.',
      why_vi: 'Phản ứng tự xúc tác: ion Mn2+ sinh ra hoạt động như một chất xúc tác cực mạnh thúc đẩy phản ứng.',
      why_en: 'Classic autocatalytic reaction: generated Mn2+ acts as a homogeneous catalyst accelerating subsequent steps.'
    },
    confidence: 1.0
  },

  // 5. K2Cr2O7 + 6FeSO4 + 7H2SO4 -> K2SO4 + Cr2(SO4)3 + 3Fe2(SO4)3 + 7H2O (Orange Cr(VI) to Green Cr(III))
  {
    schema: 'chemdex.program/1',
    id: 'k2cr2o7_feso4',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'K2Cr2O7(aq) + 6FeSO4(aq) + 7H2SO4(aq) -> K2SO4(aq) + Cr2(SO4)3(aq) + 3Fe2(SO4)3(aq) + 7H2O(l)',
      species: [
        { formula: 'K2Cr2O7', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#ea580c' }, // Bright orange
        { formula: 'FeSO4', role: 'reactant', coeff: 6, phase: 'aq', colorHex: '#a7f3d0' },
        { formula: 'H2SO4', role: 'reactant', coeff: 7, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'Cr2(SO4)3', role: 'product', coeff: 1, phase: 'aq', colorHex: '#15803d' }, // Emerald green Cr3+
        { formula: 'Fe2(SO4)3', role: 'product', coeff: 3, phase: 'aq', colorHex: '#fef08a' },
        { formula: 'K2SO4', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'H2O', role: 'product', coeff: 7, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -490.0,
      kinetics: { model: 'second_order', halfTime_s: 1.0 },
      hazards: ['GHS08_health_hazard', 'GHS06_toxic']
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.7], intensity: 1.2, params: { startColor: '#ea580c', endColor: '#166534', opticalPath_cm: 4.5 } },
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.5], intensity: 1.0, params: { speed: 1.5, color: '#15803d' } }
      ],
      after: {
        liquidColor: '#166534',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch màu da cam rực rỡ của đicromat chuyển nhanh chóng sang màu xanh lục thẫm của ion Cr3+.',
      observation_en: 'Vibrant orange dichromate solution transitions rapidly into deep bottle-green chromium(III).',
      why_vi: 'Crom(VI) bị ion sắt(II) khử xuống crom(III) trong môi trường axit.',
      why_en: 'Hexavalent chromium (+6, orange) is reduced to trivalent chromium (+3, green) by iron(II).'
    },
    confidence: 1.0
  },

  // 6. 2FeCl3 + 2KI -> 2FeCl2 + 2KCl + I2 (Iodine brown generation)
  {
    schema: 'chemdex.program/1',
    id: 'fecl3_ki',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2FeCl3(aq) + 2KI(aq) -> 2FeCl2(aq) + 2KCl(aq) + I2(aq)',
      species: [
        { formula: 'FeCl3', role: 'reactant', coeff: 2, phase: 'aq', colorHex: '#ca8a04' },
        { formula: 'KI', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'FeCl2', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'KCl', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'I2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#78350f' } // Dark brown triiodide
      ],
      deltaH_kJ_per_mol: -58.0,
      kinetics: { model: 'second_order', halfTime_s: 1.2 }
    },
    visual: {
      duration_s: 5.5,
      timeline: [
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.65], intensity: 1.2, params: { startColor: '#ca8a04', endColor: '#78350f', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#78350f',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch màu vàng nâu nhạt nhanh chóng sẫm lại thành màu nâu đen của iot tự do tan trong KI (ion I3-).',
      observation_en: 'Light yellow-brown solution rapidly darkens to deep amber-brown triiodide (I3-).',
      why_vi: 'Fe3+ oxi hóa I- thành I2 tự do.',
      why_en: 'Iron(III) oxidizes iodide ions into elemental iodine.'
    },
    confidence: 1.0
  },

  // 7. Cl2 + 2KBr -> 2KCl + Br2 (Orange-red bromine displacement)
  {
    schema: 'chemdex.program/1',
    id: 'cl2_kbr',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'Cl2(aq) + 2KBr(aq) -> 2KCl(aq) + Br2(aq)',
      species: [
        { formula: 'Cl2', role: 'reactant', coeff: 1, phase: 'aq', colorHex: '#d9f99d', hazards: ['GHS06_toxic'] },
        { formula: 'KBr', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'KCl', role: 'product', coeff: 2, phase: 'aq' },
        { formula: 'Br2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#b45309' } // Orange-red bromine water
      ],
      deltaH_kJ_per_mol: -93.0,
      kinetics: { model: 'instant', halfTime_s: 0.1 }
    },
    visual: {
      duration_s: 4.5,
      timeline: [
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.6], intensity: 1.2, params: { startColor: '#ffffff', endColor: '#b45309', opticalPath_cm: 4.5 } }
      ],
      after: {
        liquidColor: '#b45309',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch không màu lập tức chuyển sang màu vàng cam rồi đỏ nâu của brom lỏng tan.',
      observation_en: 'Colorless solution instantly shifts to vibrant orange-red of dissolved elemental bromine.',
      why_vi: 'Clo có tính oxi hóa mạnh hơn brom, đẩy brom ra khỏi dung dịch muối bromua.',
      why_en: 'Chlorine is a stronger halogen oxidizer than bromine, displacing bromide ions.'
    },
    confidence: 1.0
  },

  // 8. Landolt Iodine Clock (Starch Dark Blue Turn)
  {
    schema: 'chemdex.program/1',
    id: 'iodine_clock',
    provenance: 'handcrafted',
    controller: 'iodine_clock',
    chemistry: {
      equation: 'IO3-(aq) + 3HSO3-(aq) -> I-(aq) + 3SO4(2-)(aq) + 3H+(aq)',
      species: [
        { formula: 'KIO3', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'NaHSO3', role: 'reactant', coeff: 3, phase: 'aq' },
        { formula: 'Starch', role: 'spectator', coeff: 1, phase: 'aq' },
        { formula: 'I_starch', role: 'product', coeff: 1, phase: 'aq', colorHex: '#1e1b4b' } // Deep midnight blue-black
      ],
      kinetics: { model: 'induction_then_fast', halfTime_s: 0.2, induction_s: 4.5 },
      hazards: []
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        // Induction silence for 4.5s then sudden dramatic snap to dark blue-black!
        { id: 'fade', atom: 'beerLambertFade', anchor: 'bulk', window: [0.65, 0.72], intensity: 2.0, params: { startColor: '#ffffff', endColor: '#0f172a', opticalPath_cm: 5.0 } },
        { id: 'sound', atom: 'proceduralAcoustics', anchor: 'bulk', window: [0.65, 0.75], intensity: 0.8, params: { soundProfile: 'pop_ignition', volume: 0.6 } }
      ],
      after: {
        liquidColor: '#0f172a',
        liquidOpacity: 0.99,
        turbidity: 0.2,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch hoàn toàn trong suốt không đổi màu trong vài giây (thời gian trễ), sau đó đột ngột chớp nhoáng hóa đen tuyền / xanh đen mực trong tích tắc!',
      observation_en: 'Solution stays clear for several seconds, then suddenly flashes to deep ink-black blue in an instant!',
      why_vi: 'Khi bisulfit bị tiêu thụ hết, iot tự do tích tụ lập tức tạo phức hợp màu xanh đen với tinh bột.',
      why_en: 'Once bisulfite is exhausted, unconsumed iodine accumulates and binds into starch-iodine blue complex.'
    },
    confidence: 1.0
  }
];
