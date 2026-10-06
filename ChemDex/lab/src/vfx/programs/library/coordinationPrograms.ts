/**
 * coordinationPrograms.ts — Coordination Complexes & Qualitative Tests
 * 
 * Accurately models transition metal coordination chemistry, Jahn-Teller distortion,
 * crystal field splitting color changes, and insoluble coordination polymers.
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const COORDINATION_PROGRAMS: ReactionProgram[] = [
  // 1. CoCl2 + 4HCl <-> [CoCl4]2- (Pink to Deep Blue Coordination)
  {
    schema: 'chemdex.program/1',
    id: 'cocl2_hcl',
    provenance: 'handcrafted',
    chemistry: {
      equation: '[Co(H2O)6]2+(aq) + 4Cl-(aq) <-> [CoCl4]2-(aq) + 6H2O(l)',
      ionic: '[Co(H2O)6]2+ + 4Cl- <-> [CoCl4]2- + 6H2O',
      species: [
        { formula: 'CoCl2', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS07_harmful', 'GHS08_health_hazard'] },
        { formula: 'HCl', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'H2[CoCl4]', role: 'product', coeff: 1, phase: 'aq', colorHex: '#1d4ed8' }
      ],
      deltaH_kJ_per_mol: 50.0, // Endothermic, shifts blue on heating
      kinetics: { model: 'instant', halfTime_s: 0.4 },
      hazards: ['GHS05_corrosive', 'GHS08_health_hazard']
    },
    visual: {
      duration_s: 5.0,
      timeline: [
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.7], intensity: 1.2, params: { startColor: '#f472b6', endColor: '#1d4ed8', opticalPath_cm: 4.5 } },
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'bulk', window: [0, 0.6], intensity: 0.9, params: { speed: 1.5, color: '#2563eb' } }
      ],
      after: {
        liquidColor: '#1e40af',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch chuyển từ màu hồng cánh sen sang màu xanh lam đậm coban đặc trưng.',
      observation_en: 'Solution shifts dramatically from pink octahedral [Co(H2O)6]2+ to royal blue tetrahedral [CoCl4]2-.',
      why_vi: 'Sự thay đổi cấu hình từ bát diện d2sp3 (hồng) sang tứ diện sp3 (lam) làm thay đổi năng lượng tách trường phối tử Delta.',
      why_en: 'Coordination change from octahedral to tetrahedral alters ligand-field splitting energy delta_t < delta_o.'
    },
    confidence: 1.0
  },

  // 2. NiSO4 + 6NH3 -> [Ni(NH3)6]SO4 (Emerald Green to Deep Blue-Violet)
  {
    schema: 'chemdex.program/1',
    id: 'niso4_nh3',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'NiSO4(aq) + 6NH3(aq) -> [Ni(NH3)6]SO4(aq)',
      ionic: '[Ni(H2O)6]2+ + 6NH3 -> [Ni(NH3)6]2+ + 6H2O',
      species: [
        { formula: 'NiSO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS08_health_hazard'] },
        { formula: 'NH3', role: 'reactant', coeff: 6, phase: 'aq', hazards: ['GHS05_corrosive', 'GHS06_toxic'] },
        { formula: '[Ni(NH3)6]SO4', role: 'product', coeff: 1, phase: 'aq', colorHex: '#4338ca' }
      ],
      deltaH_kJ_per_mol: -78.0,
      kinetics: { model: 'first_order', halfTime_s: 0.6 },
      hazards: ['GHS05_corrosive', 'GHS08_health_hazard']
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.75], intensity: 1.1, params: { startColor: '#10b981', endColor: '#4338ca', opticalPath_cm: 4.5 } },
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'bulk', window: [0, 0.5], intensity: 0.8, params: { speed: 1.2, color: '#6366f1' } }
      ],
      after: {
        liquidColor: '#3730a3',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch niken màu xanh lục bảo chuyển thành phức chất màu xanh tím đậm đà.',
      observation_en: 'Solution transforms from emerald green hexaaqua nickel(II) to rich royal violet-blue hexaammine nickel(II).',
      why_vi: 'Phối tử NH3 có trường tinh thể mạnh hơn H2O trong dãy quang phổ hóa học, làm tăng năng lượng Delta_o.',
      why_en: 'Ammonia is a stronger-field ligand than water, widening octahedral d-d splitting energy.'
    },
    confidence: 1.0
  },

  // 3. FeCl3 + 3KSCN -> Fe(SCN)3 + 3KCl (Blood-Red Complexation)
  {
    schema: 'chemdex.program/1',
    id: 'fecl3_3kscn',
    provenance: 'handcrafted',
    controller: 'fecl3_3kscn_complex',
    chemistry: {
      equation: 'FeCl3(aq) + 3KSCN(aq) <-> Fe(SCN)3(aq) + 3KCl(aq)',
      ionic: 'Fe(3+)(aq) + 3SCN-(aq) <-> Fe(SCN)3(aq)',
      species: [
        { formula: 'FeCl3', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'KSCN', role: 'reactant', coeff: 3, phase: 'aq', hazards: ['GHS07_harmful'] },
        { formula: 'Fe(SCN)3', role: 'product', coeff: 1, phase: 'aq', colorHex: '#991b1b' },
        { formula: 'KCl', role: 'product', coeff: 3, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -24.0,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: ['GHS07_harmful']
    },
    visual: {
      duration_s: 5.5,
      timeline: [
        { id: 'chroma', atom: 'beerLambertFade', anchor: 'bulk', window: [0, 0.4], intensity: 1.3, params: { startColor: '#fbbf24', endColor: '#7f1d1d', opticalPath_cm: 4.5 } },
        { id: 'diffusion', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.8], intensity: 1.1, params: { speed: 2.8, color: '#991b1b' } }
      ],
      after: {
        liquidColor: '#7f1d1d',
        liquidOpacity: 0.98,
        turbidity: 0.05,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Dung dịch lập tức chuyển sang màu đỏ máu đậm (blood-red) cực kỳ nhạy.',
      observation_en: 'Instantaneous shift to intense blood-red thiocyanatoiron(III) complex.',
      why_vi: 'Phản ứng tạo phức chuyển điện tích phối tử-kim loại (LMCT) giữa Fe3+ và anion SCN-.',
      why_en: 'Ligand-to-metal charge transfer (LMCT) absorption in the visible spectrum gives rise to intense crimson color.'
    },
    confidence: 1.0
  },

  // 4. FeCl3 + K4[Fe(CN)6] -> KFe[Fe(CN)6] + 3KCl (Prussian Blue Insoluble Colloid)
  {
    schema: 'chemdex.program/1',
    id: 'fecl3_k4fecn6',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'FeCl3(aq) + K4[Fe(CN)6](aq) -> KFe[Fe(CN)6](s) + 3KCl(aq)',
      ionic: 'Fe(3+)(aq) + K+(aq) + [Fe(CN)6](4-)(aq) -> KFe[Fe(CN)6](s)',
      species: [
        { formula: 'FeCl3', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'K4[Fe(CN)6]', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'KFe[Fe(CN)6]', role: 'product', coeff: 1, phase: 's', colorHex: '#0c4a6e' },
        { formula: 'KCl', role: 'product', coeff: 3, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -42.0,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: ['GHS07_harmful']
    },
    visual: {
      duration_s: 7.5,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.25, params: { morphology: 'colloidal', color: '#0c4a6e', nucleationRate: 95 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.1, params: { maxTurbidity: 0.98, hazeColor: '#0369a1' } },
        { id: 'sed', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.3, 1.0], intensity: 0.9, params: { stokesRadius_um: 0.8, sedimentColor: '#075985', bedHeight_mm: 6.0 } }
      ],
      after: {
        liquidColor: '#0c4a6e',
        liquidOpacity: 0.98,
        turbidity: 0.85,
        precipitate: { substance: 'KFe[Fe(CN)6]', morphology: 'colloid', color: '#0c4a6e', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Tạo huyền phù kết tủa keo màu xanh Phổ (Prussian blue) đậm tuyệt đẹp.',
      observation_en: 'Dense, intensely dark Prussian blue colloid precipitates instantaneously.',
      why_vi: 'Tạo phức polyme phối trí hỗn hợp hóa trị Fe(II)-CN-Fe(III) với hiện tượng truyền điện tích ion.',
      why_en: 'Intervalence charge-transfer between Fe(II) and Fe(III) sites produces deep blue absorption.'
    },
    confidence: 1.0
  },

  // 5. FeSO4 + K3[Fe(CN)6] -> KFe[Fe(CN)6] + K2SO4 (Turnbull's Blue)
  {
    schema: 'chemdex.program/1',
    id: 'feso4_k3fecn6',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'FeSO4(aq) + K3[Fe(CN)6](aq) -> KFe[Fe(CN)6](s) + K2SO4(aq)',
      ionic: 'Fe(2+)(aq) + K+(aq) + [Fe(CN)6](3-)(aq) -> KFe[Fe(CN)6](s)',
      species: [
        { formula: 'FeSO4', role: 'reactant', coeff: 1, phase: 'aq', hazards: ['GHS07_harmful'] },
        { formula: 'K3[Fe(CN)6]', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'KFe[Fe(CN)6]', role: 'product', coeff: 1, phase: 's', colorHex: '#0369a1' },
        { formula: 'K2SO4', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -38.0,
      kinetics: { model: 'instant', halfTime_s: 0.15 },
      hazards: ['GHS07_harmful']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.2, params: { morphology: 'colloid', color: '#0369a1', nucleationRate: 90 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { maxTurbidity: 0.95, hazeColor: '#0284c7' } }
      ],
      after: {
        liquidColor: '#0369a1',
        liquidOpacity: 0.98,
        turbidity: 0.8,
        precipitate: { substance: 'KFe[Fe(CN)6]', morphology: 'colloid', color: '#0369a1', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Tạo kết tủa xanh Turnbull (Turnbull blue) tương đương cấu trúc với xanh Phổ.',
      observation_en: 'Forms intense Turnbull blue precipitate, structurally identical to Prussian blue due to rapid electron transfer.',
      why_vi: 'Fe(2+) chuyển nhanh electron cho [Fe(CN)6]3- tạo mạng tinh thể polyme phối trí đồng nhất.',
      why_en: 'Rapid electron transfer between Fe(II) and ferricyanide generates identical mixed-valence lattice.'
    },
    confidence: 1.0
  },

  // 6. 2CuSO4 + K4[Fe(CN)6] -> Cu2[Fe(CN)6] + 2K2SO4 (Hatchett's Brown Precipitate)
  {
    schema: 'chemdex.program/1',
    id: 'cuso4_k4fecn6',
    provenance: 'handcrafted',
    chemistry: {
      equation: '2CuSO4(aq) + K4[Fe(CN)6](aq) -> Cu2[Fe(CN)6](s) + 2K2SO4(aq)',
      ionic: '2Cu(2+)(aq) + [Fe(CN)6](4-)(aq) -> Cu2[Fe(CN)6](s)',
      species: [
        { formula: 'CuSO4', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS07_harmful', 'GHS09_environmental'] },
        { formula: 'K4[Fe(CN)6]', role: 'reactant', coeff: 1, phase: 'aq' },
        { formula: 'Cu2[Fe(CN)6]', role: 'product', coeff: 1, phase: 's', colorHex: '#451a03' },
        { formula: 'K2SO4', role: 'product', coeff: 2, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -35.0,
      kinetics: { model: 'instant', halfTime_s: 0.2 },
      hazards: ['GHS07_harmful', 'GHS09_environmental']
    },
    visual: {
      duration_s: 7.0,
      timeline: [
        { id: 'precip', atom: 'precipitateNucleation', anchor: 'bulk', window: [0, 0.4], intensity: 1.2, params: { morphology: 'curd', color: '#451a03', nucleationRate: 85 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0, 0.5], intensity: 1.0, params: { maxTurbidity: 0.95, hazeColor: '#78350f' } },
        { id: 'sed', atom: 'stokesSedimentation', anchor: 'bottom', window: [0.35, 1.0], intensity: 1.0, params: { stokesRadius_um: 1.2, sedimentColor: '#451a03', bedHeight_mm: 5.0 } }
      ],
      after: {
        liquidColor: '#78350f',
        liquidOpacity: 0.95,
        turbidity: 0.8,
        precipitate: { substance: 'Cu2[Fe(CN)6]', morphology: 'curd', color: '#451a03', mass_g: 'fromLedger' },
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Tạo kết tủa màu nâu đỏ sô-cô-la đặc trưng (Hatchett brown), thuốc thử định tính Cu2+ cực nhạy.',
      observation_en: 'Distinctive chocolate-red-brown Hatchett brown precipitate forms, highly sensitive qualitative test for Cu2+.',
      why_vi: 'Ion Cu2+ liên kết bền vững với cầu xyanua tạo màng bán thấm đồng ferroxianua nổi tiếng.',
      why_en: 'Copper(II) ions crosslink hexacyanoferrate into insoluble semipermeable membrane.'
    },
    confidence: 1.0
  },

  // 7. AgCl + 2NH3 -> [Ag(NH3)2]Cl (Dissolution of Curdy AgCl)
  {
    schema: 'chemdex.program/1',
    id: 'agcl_nh3',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'AgCl(s) + 2NH3(aq) -> [Ag(NH3)2]Cl(aq)',
      ionic: 'AgCl(s) + 2NH3(aq) -> [Ag(NH3)2]+(aq) + Cl-(aq)',
      species: [
        { formula: 'AgCl', role: 'reactant', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'NH3', role: 'reactant', coeff: 2, phase: 'aq', hazards: ['GHS05_corrosive', 'GHS06_toxic'] },
        { formula: '[Ag(NH3)2]Cl', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -12.0,
      kinetics: { model: 'surface_limited', halfTime_s: 1.2 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 6.0,
      timeline: [
        { id: 'erosion', atom: 'solidErosion', anchor: 'bottom', window: [0, 0.8], intensity: 1.1, params: { initialShape: 'sediment', erosionRate: 0.4 } },
        { id: 'turb_clear', atom: 'turbidityShift', anchor: 'bulk', window: [0.1, 0.9], intensity: 1.0, params: { maxTurbidity: 0.05, hazeColor: '#ffffff' } }
      ],
      after: {
        liquidColor: '#f8fafc',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa vón trắng AgCl tan hoàn toàn thành dung dịch không màu trong suốt.',
      observation_en: 'Curdy white silver chloride dissolves completely into a clear colorless solution.',
      why_vi: 'Phức điamminbạc(I) có hằng số bền Kf rất lớn (1.7 x 10^7), hòa tan kết tủa AgCl.',
      why_en: 'Diamminesilver(I) complex formation constant Kf = 1.7 x 10^7 pulls Ag+ from the precipitate lattice.'
    },
    confidence: 1.0
  },

  // 8. AgI + 2Na2S2O3 -> Na3[Ag(S2O3)2] + NaI (Photographic Fixer Dissolution)
  {
    schema: 'chemdex.program/1',
    id: 'agi_na2s2o3',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'AgI(s) + 2Na2S2O3(aq) -> Na3[Ag(S2O3)2](aq) + NaI(aq)',
      ionic: 'AgI(s) + 2S2O3(2-)(aq) -> [Ag(S2O3)2](3-)(aq) + I-(aq)',
      species: [
        { formula: 'AgI', role: 'reactant', coeff: 1, phase: 's', colorHex: '#fef08a' },
        { formula: 'Na2S2O3', role: 'reactant', coeff: 2, phase: 'aq' },
        { formula: 'Na3[Ag(S2O3)2]', role: 'product', coeff: 1, phase: 'aq' },
        { formula: 'NaI', role: 'product', coeff: 1, phase: 'aq' }
      ],
      deltaH_kJ_per_mol: -15.0,
      kinetics: { model: 'surface_limited', halfTime_s: 1.5 },
      hazards: []
    },
    visual: {
      duration_s: 6.5,
      timeline: [
        { id: 'erosion', atom: 'solidErosion', anchor: 'bottom', window: [0, 0.85], intensity: 1.0, params: { initialShape: 'sediment', erosionRate: 0.35 } },
        { id: 'turb', atom: 'turbidityShift', anchor: 'bulk', window: [0.1, 0.95], intensity: 0.9, params: { maxTurbidity: 0.05, hazeColor: '#fef08a' } }
      ],
      after: {
        liquidColor: '#f8fafc',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Kết tủa vàng AgI tan dần trong dung dịch thiosunfat, cơ sở của quá trình định hình phim ảnh.',
      observation_en: 'Pale yellow silver iodide dissolves slowly in thiosulfate solution (classic photographic fixing process).',
      why_vi: 'Phối tử thiosunfat tạo phức bis(thiosulfato)argentate(I) cực bền với Kf = 2.9 x 10^13.',
      why_en: 'Extremely high stability constant of dithiosulfatoargentate(I) (Kf = 2.9 x 10^13) overcomes AgI low solubility.'
    },
    confidence: 1.0
  }
];
