import { ProceduralActionType } from '../engine/experimentEngine';

export interface LabStep {
  stepNumber: number;
  action?: ProceduralActionType;
  title_en: string;
  title_vi: string;
  instruction_en: string;
  instruction_vi: string;
  expectedResult_en: string;
  expectedResult_vi: string;
  targetVesselType?: 'beaker' | 'flask' | 'test_tube' | 'cylinder';
  targetChemical?: string;
  targetAmount?: number;
  tolerance?: number;
  unit?: string;
  requiredTool?: 'none' | 'thermometer' | 'ph_meter' | 'balance' | 'pipette' | 'stirring_rod' | 'spatula';
  chemicalRequired?: string[];
  equipmentRequired?: string[];
  validationCheck?: (vessels: Record<string, any>) => boolean;
}

export interface ExperimentQuiz {
  question_en: string;
  question_vi: string;
  options_en: string[];
  options_vi: string[];
  correctAnswer: number;
  explanation_en: string;
  explanation_vi: string;
}

export interface PhenomenologyCase {
  id: string;
  name_en: string;
  name_vi: string;
  description_en: string;
  description_vi: string;
  algorithm: string;
}

export interface ExperimentGuide {
  id: string;
  title_en: string;
  title_vi: string;
  category: 'acid_base' | 'precipitation' | 'gas' | 'redox' | 'thermal' | 'safety' | 'combustion';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  objective_en: string;
  objective_vi: string;
  theory_en: string;
  theory_vi: string;
  safetyAdvisory_en: string;
  safetyAdvisory_vi: string;
  requiredEquipment: string[];
  allowedChemicals: string[];
  steps: LabStep[];
  quizzes: ExperimentQuiz[];
  simulationAlgorithm_en?: string;
  simulationAlgorithm_vi?: string;
  phenomenologyCases?: PhenomenologyCase[];
}

export const EXPERIMENT_CURRICULUM: ExperimentGuide[] = [
  {
    id: 'acid_base_titration',
    title_en: 'Acid-Base Titration (HCl + NaOH)',
    title_vi: 'Chuẩn độ Axit - Bazơ (HCl + NaOH)',
    category: 'acid_base',
    difficulty: 'basic',
    objective_en: 'Determine the exact neutralization point of Hydrochloric Acid using Sodium Hydroxide with Phenolphthalein indicator.',
    objective_vi: 'Xác định điểm tương đương của phản ứng trung hòa axit clohiđric bằng dung dịch natri hiđroxit với chỉ thị phenolphtalein.',
    theory_en: 'In acid-base titration, H⁺ from strong acid reacts with OH⁻ from strong base in 1:1 mole ratio: H⁺ + OH⁻ → H₂O. At equivalence point (pH = 7), adding a single drop of excess NaOH raises pH above 8.2, turning phenolphthalein vivid pink.',
    theory_vi: 'Trong phép chuẩn độ axit - bazơ, ion H⁺ phản ứng vừa đủ với ion OH⁻ theo tỉ lệ mol 1:1: H⁺ + OH⁻ → H₂O. Tại điểm tương đương (pH = 7), chỉ cần thêm 1 giọt NaOH dư sẽ làm pH tăng trên 8.2, làm phenolphtalein chuyển sang màu hồng đậm.',
    safetyAdvisory_en: 'NaOH is caustic and HCl is corrosive. Wear eye goggles and disposable gloves.',
    safetyAdvisory_vi: 'NaOH gây ăn mòn da và HCl có tính axit mạnh. Luôn đeo kính bảo hộ và găng tay cao su.',
    requiredEquipment: ['Erlenmeyer Flask', 'Burette', 'Graduated Cylinder'],
    allowedChemicals: ['HCl (dil)', 'NaOH', 'Phenolphthalein', 'H2O'],
    simulationAlgorithm_en: `Charge-Balance & Indicator Equilibrium Solver:
1. Exact Charge Neutrality: [H+] - Kw/[H+] + (C_b*V_b - C_a*V_a) / (V_a + V_b) = 0.
2. Henderson-Hasselbalch Indicator Deprotonation:
   fraction_pink = 1 / (1 + 10^(pK_in - pH)) with pK_in = 9.3.
3. Optical Chromophore Absorbance:
   A(550nm) = epsilon * [In2-] * l; smooth transition from clear (A < 0.01) to permanent pink (A > 0.08).`,
    simulationAlgorithm_vi: `Thuật toán Giải Cân Bằng Điện Tích & Chỉ Thị Màu:
1. Phương trình bảo toàn điện tích giải chính xác [H+] và pH tại mọi thể tích chuẩn độ.
2. Phương trình Henderson-Hasselbalch tính tỉ lệ phân ly dạng hồng In2- của phenolphtalein (pK_in = 9.3).
3. Độ hấp thụ quang A(550nm) chuyển đổi từ không màu sang hồng nhạt bền vững tại điểm tương đương.`,
    phenomenologyCases: [
      {
        id: 'titration_sub_equivalence',
        name_en: 'Case 1: Acidic Excess (Sub-Equivalence)',
        name_vi: 'Trường hợp 1: Axit dư trước điểm tương đương',
        description_en: 'Bulk solution has pH < 7. Local pink droplets from the burette instantly decolorize upon stirring as OH- is consumed by excess H+.',
        description_vi: 'Dung dịch có pH < 7. Từng giọt kiềm rơi xuống chỉ làm hồng cục bộ rồi tan biến ngay khi khuấy do ion H+ còn dư nhiều.',
        algorithm: '[H+] = (n_acid - n_base)/V_total; fraction_pink < 0.01; transparent clear liquid.'
      },
      {
        id: 'titration_equivalence_jump',
        name_en: 'Case 2: Equivalence pH Jump & Permanent Pale Pink',
        name_vi: 'Trường hợp 2: Bước nhảy pH & chuyển màu hồng nhạt bền vững',
        description_en: 'At the stoichiometric equivalence point, a single micro-drop drives pH across 7.0 to ~8.5, stably opening the indicator lactone ring into a persistent faint pink.',
        description_vi: 'Tại điểm tương đương, chỉ 1 giọt nhỏ làm pH nhảy vọt qua 7.0 lên ~8.5, phenolphtalein mở vòng lacton chuyển sang màu hồng nhạt bền vững khắp dung dịch.',
        algorithm: 'Steep inflection dpH/dV -> max; fraction_pink ≈ 0.05-0.15; A(550nm) ≈ 0.08.'
      },
      {
        id: 'titration_hyper_alkaline',
        name_en: 'Case 3: Excess Base (Hyper-Alkaline)',
        name_vi: 'Trường hợp 3: Kiềm dư sau điểm tương đương',
        description_en: 'Further addition of NaOH pushes pH > 11, saturating indicator deprotonation into an intense deep fuchsia/magenta hue.',
        description_vi: 'Rót quá nhiều NaOH làm pH tăng trên 11, toàn bộ chỉ thị chuyển thành dạng In2- tạo màu hồng cánh sen / đỏ tươi đậm đặc.',
        algorithm: '[OH-] = (n_base - n_acid)/V_total; fraction_pink > 0.95; A(550nm) > 1.2.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Add Acid to Flask',
        title_vi: 'Cho axit vào bình tam giác',
        instruction_en: 'Add 20 mL of dilute HCl into Flask 1.',
        instruction_vi: 'Cho 20 mL dung dịch HCl loãng vào Bình tam giác 1.',
        expectedResult_en: 'Clear colorless solution at pH ~ 1.',
        expectedResult_vi: 'Dung dịch trong suốt không màu, pH khoảng 1.'
      },
      {
        stepNumber: 2,
        title_en: 'Add Indicator',
        title_vi: 'Thêm chất chỉ thị màu',
        instruction_en: 'Add 2-3 drops of Phenolphthalein into the flask.',
        instruction_vi: 'Nhỏ 2-3 giọt dung dịch Phenolphtalein vào bình tam giác.',
        expectedResult_en: 'Solution remains colorless because pH < 8.2.',
        expectedResult_vi: 'Dung dịch vẫn không màu do môi trường axit (pH < 8.2).'
      },
      {
        stepNumber: 3,
        title_en: 'Titrate with NaOH',
        title_vi: 'Chuẩn độ với dung dịch NaOH',
        instruction_en: 'Slowly pour NaOH solution drop by drop into the flask while observing the color.',
        instruction_vi: 'Rót từ từ từng giọt dung dịch NaOH vào bình tam giác và quan sát sự chuyển màu.',
        expectedResult_en: 'A fleeting pink color appears where drops hit, and finally the entire solution turns permanent pale pink at equivalence point!',
        expectedResult_vi: 'Vệt màu hồng xuất hiện tại điểm tiếp xúc rồi tan biến; khi đến điểm tương đương, toàn bộ dung dịch chuyển sang màu hồng nhạt bền vững!'
      }
    ],
    quizzes: [
      {
        question_en: 'What is the color of phenolphthalein in a neutral solution at pH 7.0?',
        question_vi: 'Chỉ thị phenolphtalein có màu gì trong dung dịch trung tính ở pH = 7.0?',
        options_en: ['Colorless', 'Pink', 'Blue', 'Yellow'],
        options_vi: ['Không màu', 'Màu hồng', 'Màu xanh lam', 'Màu vàng'],
        correctAnswer: 0,
        explanation_en: 'Phenolphthalein remains colorless in acidic and neutral solutions (pH < 8.2) and turns pink/fuchsia only in alkaline conditions (pH > 8.2).',
        explanation_vi: 'Phenolphtalein không màu trong môi trường axit và trung tính (pH < 8.2) và chỉ đổi sang màu hồng trong môi trường kiềm (pH > 8.2).'
      }
    ]
  },
  {
    id: 'golden_rain_synthesis',
    title_en: 'Golden Rain Synthesis (PbI2 Precipitation)',
    title_vi: 'Tổng hợp "Mưa Vàng" (Kết tủa Chì Iotua PbI2)',
    category: 'precipitation',
    difficulty: 'intermediate',
    objective_en: 'Synthesize glittering golden-yellow crystals of lead(II) iodide through double displacement precipitation.',
    objective_vi: 'Thực hiện phản ứng trao đổi tạo kết tủa chì(II) iotua lấp lánh như những hạt mưa vàng kim óng ánh.',
    theory_en: 'Lead(II) nitrate reacts with potassium iodide: Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃. Lead iodide has low solubility at room temperature, precipitating as hexagonal golden flakes.',
    theory_vi: 'Chì(II) nitrat phản ứng với kali iotua: Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃. Muối PbI2 ít tan trong nước lạnh tạo thành các vi tinh thể màu vàng kim óng ánh.',
    safetyAdvisory_en: 'Lead compounds are toxic heavy metals. Never ingest or dump down municipal drain.',
    safetyAdvisory_vi: 'Muối chì là kim loại nặng độc hại. Thu gom vào bình chất thải nguy hại chuyên dụng.',
    requiredEquipment: ['Beaker', 'Test Tube', 'Bunsen Burner'],
    allowedChemicals: ['KI', 'Pb(NO3)2', 'H2O'],
    simulationAlgorithm_en: `Classical Nucleation & Micro-Platelet Crystallization:
1. Supersaturation Ratio: S = ([Pb2+][I-]^2 / Ksp)^(1/3) with Ksp = 9.8e-9.
2. Homogeneous Nucleation Rate: J = J0 * exp(-16π*gamma^3*v_m^2 / (3*(k_B*T)^3*(ln S)^2)).
3. Anisotropic Hexagonal Growth & Stokes Settling:
   Platelet aspect ratio ~ 1:8, terminal settling velocity v_t = 2*r^2*(rho_p - rho_f)*g / (9*mu).
   Specular glitter: normal vector alignment with specular highlight reflection.`,
    simulationAlgorithm_vi: `Thuật toán Tạo Mầm Cổ Điển & Tinh Thể Bản Lục Giác:
1. Độ quá bão hòa S kích hoạt tạo mầm đồng thể bùng nổ khi tích số ion vượt Ksp = 9.8e-9.
2. Tinh thể PbI2 phát triển dị hướng dạng phiến lục giác lấp lánh (tỉ lệ cạnh/dày ~ 8:1).
3. Vận tốc lắng trọng trường Stokes kết hợp hiệu ứng phản xạ ánh sáng lấp lánh như mưa vàng kim.`,
    phenomenologyCases: [
      {
        id: 'golden_rain_instant_yellow_burst',
        name_en: 'Case 1: Explosive Supersaturation Flash',
        name_vi: 'Trường hợp 1: Chớp bùng phát kết tủa vàng quá bão hòa',
        description_en: 'Contact interface explodes into a bright opaque canary yellow cloud as billions of sub-micron nuclei form instantaneously.',
        description_vi: 'Vùng tiếp xúc giữa 2 dung dịch bùng nổ tức thì một đám mây màu vàng chanh rực rỡ do hàng tỉ mầm vi tinh thể sinh ra.',
        algorithm: 'Instant supersaturation S >> 100; burst nucleation rate J -> max; high optical scattering.'
      },
      {
        id: 'golden_rain_glittering_hexagonal_floc',
        name_en: 'Case 2: Hexagonal Platelet Ripening & Golden Glitter',
        name_vi: 'Trường hợp 2: Tinh thể bản lục giác lớn dần & lấp lánh như mưa vàng',
        description_en: 'Ostwald ripening grows flat hexagonal platelets (~10-15 µm). As they flutter through water, specular reflections create the famed glittering golden rain effect.',
        description_vi: 'Quá trình Ostwald làm các phiến tinh thể lục giác lớn dần; khi chao liệng trong nước, mặt phẳng tinh thể phản xạ ánh sáng lấp lánh như mưa vàng óng ánh.',
        algorithm: 'Platelet rotation matrix dot light vector; dynamic specular glitter highlights.'
      },
      {
        id: 'golden_rain_compact_sedimentation',
        name_en: 'Case 3: Quiescent Stokes Sedimentation Bed',
        name_vi: 'Trường hợp 3: Lắng đọng trọng trường tạo lớp trầm tích đáy vàng rực',
        description_en: 'Dense lead iodide (rho = 6.16 g/cm³) gently settles to the bottom, leaving a transparent colorless supernatant above a glittering golden bed.',
        description_vi: 'Do tỉ trọng lớn (6.16 g/cm³), các hạt PbI2 từ từ lắng xuống đáy theo định luật Stokes, tạo một lớp trầm tích vàng kim lộng lẫy dưới đáy cốc.',
        algorithm: 'Stokes settling velocity v_t ~ 0.12 mm/s; liquid transmittance returns to 1.0.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Prepare Lead Nitrate',
        title_vi: 'Lấy dung dịch Chì Nitrat',
        instruction_en: 'Add Pb(NO3)2 solution into Beaker 1.',
        instruction_vi: 'Rót dung dịch Pb(NO3)2 vào Cốc mỏ 1.',
        expectedResult_en: 'Colorless liquid.',
        expectedResult_vi: 'Dung dịch trong suốt không màu.'
      },
      {
        stepNumber: 2,
        title_en: 'Add Potassium Iodide',
        title_vi: 'Thêm Kali Iotua',
        instruction_en: 'Pour KI solution into the beaker with Pb(NO3)2.',
        instruction_vi: 'Đổ dung dịch KI vào cốc chứa Pb(NO3)2.',
        expectedResult_en: 'Instant explosion of brilliant canary yellow precipitate!',
        expectedResult_vi: 'Xuất hiện tức thì kết tủa màu vàng tươi rực rỡ!'
      }
    ],
    quizzes: [
      {
        question_en: 'What type of chemical reaction occurs between Pb(NO3)2 and KI?',
        question_vi: 'Phản ứng giữa Pb(NO3)2 và KI thuộc loại phản ứng hóa học nào?',
        options_en: ['Precipitation (Double Displacement)', 'Redox', 'Thermal Decomposition', 'Combustion'],
        options_vi: ['Phản ứng trao đổi tạo kết tủa', 'Phản ứng oxi hóa - khử', 'Nhiệt phân', 'Phản ứng cháy'],
        correctAnswer: 0,
        explanation_en: 'It is a classic double displacement (precipitation) reaction.',
        explanation_vi: 'Đây là phản ứng trao đổi ion trong dung dịch tạo kết tủa muối không tan PbI2.'
      }
    ]
  },
  {
    id: 'co2_gas_production',
    title_en: 'Carbon Dioxide Gas Generation (CaCO3 + HCl)',
    title_vi: 'Điều chế Khí Cacbonic (Đá vôi CaCO3 + HCl)',
    category: 'gas',
    difficulty: 'basic',
    objective_en: 'Demonstrate gas evolution and effervescence of CO2 from marble chips and hydrochloric acid.',
    objective_vi: 'Quan sát hiện tượng sủi bọt khí CO2 khi cho axit clohiđric tác dụng với đá vôi canxi cacbonat.',
    theory_en: 'Carbonates react with strong acids: CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + CO₂(g)↑ + H₂O(l). The unbonded carbonic acid quickly dissociates into water and gaseous CO₂.',
    theory_vi: 'Muối cacbonat bị axit mạnh đẩy: CaCO₃ + 2HCl → CaCl₂ + CO₂↑ + H₂O. Axit cacbonic không bền phân hủy tức thì thành nước và khí cacbonic thoát ra ào ạt.',
    safetyAdvisory_en: 'Ensure adequate ventilation. Do not block container openings tightly.',
    safetyAdvisory_vi: 'Thực hiện ở nơi thoáng khí. Không đậy kín nút khi đang sinh khí mạnh để tránh áp suất cao.',
    requiredEquipment: ['Flask', 'Beaker', 'Test Tube'],
    allowedChemicals: ['CaCO3', 'HCl (dil)', 'H2O'],
    simulationAlgorithm_en: `Heterogeneous Solid-Liquid Effervescence Dynamics:
1. Heterogeneous Dissolution Flux: j = k_diss * A_solid * ([H+] / (1 + K_ads*[H+])).
2. Henry Dissolved Gas Supersaturation & Nucleation:
   Bubbles nucleate at micro-cavities on CaCO3 solid grains when C_CO2 > k_H * P_ambient.
3. Detachment & Oblate Rise:
   Buoyant detachment radius R_det = (3*r_cav*sigma / (2*rho_l*g))^(1/3).
   Rise with Wellek oblate deformation (We, Eo) and Minnaert acoustic popping at surface.`,
    simulationAlgorithm_vi: `Thuật toán Động Học Thoát Khí Dị Thể:
1. Dòng hòa tan dị thể trên bề mặt hạt đá vôi phụ thuộc diện tích tiếp xúc và nồng độ H+.
2. Tạo mầm bọt khí CO2 tại các vi hốc khi nồng độ CO2 hòa tan vượt bão hòa theo định luật Henry.
3. Bọt khí bứt ra bay lên, biến dạng hình elip dẹt (Wellek Eo/We) và vỡ phát âm thanh Minnaert.`,
    phenomenologyCases: [
      {
        id: 'co2_nucleate_effervescence',
        name_en: 'Case 1: Solid Grain Boundary Effervescence',
        name_vi: 'Trường hợp 1: Sủi bọt khí dày đặc từ bề mặt đá vôi',
        description_en: 'Acid contacts CaCO3 chips; thousands of tiny carbon dioxide bubbles nucleate instantaneously on rock surfaces and stream upward.',
        description_vi: 'Axit tiếp xúc với đá vôi; hàng ngàn bọt khí CO2 nhỏ li ti lập tức xuất hiện bám trên bề mặt đá rồi bay thẳng lên mặt nước.',
        algorithm: 'Cavity nucleation rate N_dot = k_nuc * (C - C_sat); bubble detachment radius R ≈ 0.4-1.2 mm.'
      },
      {
        id: 'co2_turbulent_churn_fizz',
        name_en: 'Case 2: Convective Bubble Churn & Acoustic Fizz',
        name_vi: 'Trường hợp 2: Đối lưu bọt khí cuồn cuộn & tiếng xèo xèo',
        description_en: 'Dense upward bubble swarms drag liquid in convective updrafts, accompanied by turbulent acoustic fizzing and surface agitation.',
        description_vi: 'Đàn bọt khí bay lên cuồn cuộn cuốn theo dòng chất lỏng đối lưu, phát ra tiếng xèo xèo sủi bọt rộn rã đặc trưng.',
        algorithm: 'Multi-bubble acoustic power P_acoustic ~ V_gas_dot * rho * u^2; high-frequency white hiss.'
      },
      {
        id: 'co2_surface_dome_burst',
        name_en: 'Case 3: Surface Film Drainage & Micro-Jet Bursting',
        name_vi: 'Trường hợp 3: Nổi vòm màng mỏng bề mặt & vỡ bọt kèm tia vi mô',
        description_en: 'Bubbles linger briefly at liquid surface forming hemispherical domes, draining thin film before bursting with audible Minnaert clicks and capillary ripples.',
        description_vi: 'Bọt nổi lên mặt nước tạo các vòm bán cầu mỏng, màng chất lỏng rút nước rồi vỡ tạo tiếng nổ vi mô Minnaert và sóng gợn mao dẫn.',
        algorithm: 'Dome drainage tau ~ 0.12 s; Minnaert rupture f = 3260 / R_mm (Hz); Worthington micro-jet droplet ejecta.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Place Marble Chips',
        title_vi: 'Cho đá vôi vào bình',
        instruction_en: 'Add solid CaCO3 (marble / limestone) into the flask.',
        instruction_vi: 'Cho bột hoặc mẩu đá vôi CaCO3 vào bình tam giác.',
        expectedResult_en: 'White solid at the bottom.',
        expectedResult_vi: 'Chất rắn màu trắng ở đáy bình.'
      },
      {
        stepNumber: 2,
        title_en: 'Pour Hydrochloric Acid',
        title_vi: 'Rót axit clohiđric',
        instruction_en: 'Add dilute HCl into the flask.',
        instruction_vi: 'Rót dung dịch HCl loãng vào bình.',
        expectedResult_en: 'Vigorous bubbling and stream of CO2 gas bubbles rising.',
        expectedResult_vi: 'Sủi bọt khí mãnh liệt, các bọt khí CO2 không màu dâng lên cuồn cuộn.'
      }
    ],
    quizzes: [
      {
        question_en: 'How can you experimentally confirm that the evolved gas is CO2?',
        question_vi: 'Làm thế nào để nhận biết khí sinh ra là CO2 trong phòng thí nghiệm?',
        options_en: ['Pass it into limewater (Ca(OH)2); it turns milky', 'Test with glowing splint (relights)', 'Smell pungent aroma', 'Burn with blue flame'],
        options_vi: ['Dẫn qua nước vôi trong Ca(OH)2 thấy bị vẩn đục', 'Dùng que đóm còn tàn đỏ bùng cháy', 'Ngửi thấy mùi khai', 'Cháy với ngọn lửa xanh lam'],
        correctAnswer: 0,
        explanation_en: 'CO2 reacts with Ca(OH)2 to precipitate insoluble calcium carbonate: CO2 + Ca(OH)2 → CaCO3↓ + H2O, turning limewater milky.',
        explanation_vi: 'Khí CO2 tác dụng với dung dịch nước vôi trong Ca(OH)2 tạo kết tủa canxi cacbonat làm vẩn đục nước vôi.'
      }
    ]
  },
  {
    id: 'single_displacement_copper',
    title_en: 'Single Displacement: Iron (Fe) in Copper Sulfate (CuSO4)',
    title_vi: 'Phản ứng thế kim loại: Sắt (Fe) trong Đồng Sunfat (CuSO4)',
    category: 'redox',
    difficulty: 'basic',
    objective_en: 'Observe single displacement redox reaction where iron reduces copper ions in aqueous solution.',
    objective_vi: 'Khảo sát phản ứng thế trong dãy hoạt động hóa học của kim loại: Sắt khử ion Cu2+ trong dung dịch CuSO4.',
    theory_en: 'Iron is more active than copper in electrochemical series: Fe + CuSO₄ → FeSO₄ + Cu↓. Iron oxidizes from 0 to +2, while copper reduces from +2 to 0 forming a reddish copper coating.',
    theory_vi: 'Sắt đứng trước đồng trong dãy điện hóa kim loại: Fe + CuSO₄ → FeSO₄ + Cu↓. Kim loại đồng màu đỏ giải phóng bám ngoài thanh sắt, màu xanh lam của Cu2+ nhạt dần.',
    safetyAdvisory_en: 'CuSO4 is an environmental irritant. Dispose properly.',
    safetyAdvisory_vi: 'Dung dịch đồng sunfat có hại cho môi trường, rửa tay sau khi làm thí nghiệm.',
    requiredEquipment: ['Beaker', 'Test Tube'],
    allowedChemicals: ['CuSO4', 'Fe', 'H2O'],
    simulationAlgorithm_en: `Electrochemical Displacement & Dendritic Crystal Deposition:
1. Mixed-Potential Cementation: Fe + Cu2+ -> Fe2+ + Cu (Delta E° = +0.78 V).
2. Diffusion-Limited Aggregation (DLA):
   Cu atoms aggregate on the Fe surface forming a porous, fractal red-orange crust.
3. Chromatic Solution Transition:
   Beer-Lambert absorption shift from Cu2+ blue (lambda_max = 810 nm) to pale green hydrated Fe2+.`,
    simulationAlgorithm_vi: `Thuật toán Thế Điện Hóa & Kết Tủa Tinh Thể Nhánh:
1. Phản ứng thế điện hóa tự phát với suất điện động tiêu chuẩn Delta E° = +0.78 V.
2. Mô hình tập hợp giới hạn khuếch tán (DLA) hình thành lớp đồng xốp màu đỏ cam bám quanh sắt.
3. Chuyển dịch quang phổ dung dịch từ xanh lam đậm của Cu2+ sang xanh lục nhạt của Fe2+.`,
    phenomenologyCases: [
      {
        id: 'copper_cementation_coating',
        name_en: 'Case 1: Spontaneous Metallic Copper Coating',
        name_vi: 'Trường hợp 1: Đồng kim loại kết tủa bám phủ ngoài mặt sắt',
        description_en: 'Submerged iron surfaces instantaneously darken and turn reddish-brown as high-affinity copper atoms electroplate across the iron surface.',
        description_vi: 'Bề mặt thanh sắt sẫm màu tức thì rồi chuyển sang màu đỏ gạch do đồng kim loại sinh ra bám chặt bên ngoài.',
        algorithm: 'Electrodeposition current i_corr = n*F*k_mass*([Cu2+] - [Cu2+]_surf); rapid dendritic deposition.'
      },
      {
        id: 'copper_solution_bleaching',
        name_en: 'Case 2: Chromatic Fading to Pale Green FeSO4',
        name_vi: 'Trường hợp 2: Dung dịch nhạt màu xanh lam hóa xanh lục rêu',
        description_en: 'As Cu2+ is depleted and Fe2+ dissolves into solution, the azure-blue color fades steadily into a pale translucent green.',
        description_vi: 'Khi Cu2+ bị tiêu thụ hết và Fe2+ tan vào nước, màu xanh lam nhạt dần rồi chuyển sang màu xanh rêu nhạt của FeSO4.',
        algorithm: 'Absorbance A_total = eps_Cu*[Cu2+] + eps_Fe*[Fe2+]; smooth color gradient.'
      },
      {
        id: 'copper_spongy_crust_flaking',
        name_en: 'Case 3: Porous Flake Detachment & Sedimentation',
        name_vi: 'Trường hợp 3: Lớp đồng xốp bong tróc và lắng xuống đáy',
        description_en: 'As the copper deposit thickens, structural stress detaches porous spongy copper flakes which drift down to form a red sediment bed.',
        description_vi: 'Khi lớp đồng bám dày lên, màng kim loại xốp bong ra thành từng vảy nhỏ và rơi xuống lắng đọng dưới đáy cốc.',
        algorithm: 'Mechanical shear stress threshold; solid particle detachment and gravity settling.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Add Blue CuSO4 Solution',
        title_vi: 'Rót dung dịch Đồng Sunfat',
        instruction_en: 'Pour 30 mL of blue CuSO4 solution into Beaker 1.',
        instruction_vi: 'Rót 30 mL dung dịch CuSO4 màu xanh lam vào Cốc mỏ 1.',
        expectedResult_en: 'Deep royal blue solution.',
        expectedResult_vi: 'Dung dịch có màu xanh lam trong suốt đặc trưng.'
      },
      {
        stepNumber: 2,
        title_en: 'Add Iron Filings',
        title_vi: 'Cho bột hoặc đinh Sắt vào',
        instruction_en: 'Add iron (Fe) into the copper sulfate solution.',
        instruction_vi: 'Cho bột sắt (Fe) vào cốc chứa dung dịch CuSO4.',
        expectedResult_en: 'Reddish-brown copper coats the iron; solution color fades to pale green.',
        expectedResult_vi: 'Lớp đồng màu đỏ cam bám quanh hạt sắt; dung dịch chuyển sang xanh rêu nhạt của FeSO4.'
      }
    ],
    quizzes: [
      {
        question_en: 'Which element is oxidized in the reaction Fe + CuSO4 → FeSO4 + Cu?',
        question_vi: 'Chất nào đóng vai trò là chất khử (bị oxi hóa) trong phản ứng Fe + CuSO4 → FeSO4 + Cu?',
        options_en: ['Iron (Fe)', 'Copper ion (Cu2+)', 'Sulfate ion (SO4 2-)', 'Water (H2O)'],
        options_vi: ['Sắt (Fe)', 'Ion đồng (Cu2+)', 'Ion sunfat (SO4 2-)', 'Nước (H2O)'],
        correctAnswer: 0,
        explanation_en: 'Fe loses 2 electrons (Fe → Fe2+ + 2e-), so iron is oxidized.',
        explanation_vi: 'Nguyên tử Fe nhường 2 electron để chuyển thành ion Fe2+ nên sắt là chất bị oxi hóa.'
      }
    ]
  },
  {
    id: 'acid_safety_dilution',
    title_en: 'Acid Dilution Safety Protocol (H2SO4 Hazard)',
    title_vi: 'Quy tắc an toàn pha loãng Axit (Hiểm họa H2SO4)',
    category: 'safety',
    difficulty: 'advanced',
    objective_en: 'Learn the life-saving Golden Rule of chemical laboratory safety: Always Add Acid to Water, Never Water to Acid.',
    objective_vi: 'Học nguyên tắc sống còn khi làm việc trong phòng thí nghiệm: Luôn rót axit từ từ vào nước, KHÔNG BAO GIỜ làm ngược lại.',
    theory_en: 'Concentrated sulfuric acid hydration is overwhelmingly exothermic (ΔH = -95 kJ/mol). Water has a lower density than concentrated acid (1.0 vs 1.84 g/mL). If water is poured on acid, it floats and superheats into boiling steam instantly, violently projecting corrosive acid droplets into the user face!',
    theory_vi: 'Sự hydrat hóa H2SO4 đặc tỏa nhiệt cực lớn. Nước nhẹ hơn axit đặc (1.0 so với 1.84 g/mL). Nếu đổ nước vào axit, nước nổi lên trên bề mặt và sôi bùng tức thì thành hơi nước, tạo áp suất bắn axit đặc vào mặt!',
    safetyAdvisory_en: 'HIGH VOLATILITY RISK: Wear face shield, heavy neoprene gloves, and perform in fume hood.',
    safetyAdvisory_vi: 'NGUY CƠ BỎNG HÓA CHẤT NẶNG: Đeo mặt nạ chống bắn tóe, găng tay cao su dày và làm trong tủ hút.',
    requiredEquipment: ['Beaker', 'Flask', 'Glass Stirring Rod'],
    allowedChemicals: ['H2SO4 (conc)', 'H2O'],
    simulationAlgorithm_en: `Enthalpy of Hydration & Thermal Stratification Model:
1. Hydration Exotherm: H2SO4 + n*H2O -> H2SO4(aq) (Delta H = -95.3 kJ/mol).
2. Density Stratification & Heat Dissipation:
   rho_acid = 1.84 g/cm3 vs rho_water = 1.00 g/cm3.
   Acid sinks to the bottom; heat diffuses into bulk water (C_p = 4.18 J/g*K).
3. Hazardous Inversion (Water into Acid):
   Low density water stays at surface, superheats above 100°C within 0.05s, flashing explosive steam droplets.`,
    simulationAlgorithm_vi: `Thuật toán Nhiệt Hydrat Hóa & Phân Tầng Trọng Lực:
1. Phản ứng hydrat hóa H2SO4 đặc tỏa nhiệt cực lớn (Delta H = -95.3 kJ/mol).
2. Axit nặng hơn nước (1.84 so với 1.00 g/cm3) nên khi rót axit vào nước, axit chìm xuống đáy và nhiệt tản đều vào khối nước lớn.
3. Nếu đổ ngược nước vào axit, nước nổi trên mặt bị sôi bùng trong 0.05s, tạo áp suất hơi nước nổ bắn giọt axit nguy hiểm.`,
    phenomenologyCases: [
      {
        id: 'dilution_safe_schlieren_plume',
        name_en: 'Case 1: Safe Plume Sinking & Schlieren Ribbons',
        name_vi: 'Trường hợp 1: Rót axit vào nước an toàn, vệt vân quang học chìm xuống',
        description_en: 'Dense viscous acid streams downward to the beaker bottom, forming distinct refractive index schlieren ribbons and gently dissipating heat.',
        description_vi: 'Dòng axit đặc sánh chìm thẳng xuống đáy cốc tạo các vệt vân quang học lượn sóng (hiệu ứng Schlieren) và tỏa nhiệt êm dịu.',
        algorithm: 'Negative buoyancy settling: F_b = (rho_acid - rho_water)*V*g; gentle laminar mixing.'
      },
      {
        id: 'dilution_thermal_equilibrium',
        name_en: 'Case 2: Bulk Fluid Thermal Rise & Newton Cooling',
        name_vi: 'Trường hợp 2: Nhiệt độ tăng đều an toàn & tản nhiệt tự nhiên',
        description_en: 'Bulk liquid temperature climbs smoothly to ~45-55°C without boiling; heat dissipates gradually via Newton cooling.',
        description_vi: 'Nhiệt độ toàn bộ cốc nước tăng đều lên khoảng 45-55°C an toàn không bị sôi, sau đó nguội dần theo định luật Newton.',
        algorithm: 'Lumped thermal balance: m*Cp*dT/dt = r*(-Delta H) - U*A*(T - T_amb).'
      },
      {
        id: 'dilution_flash_steam_hazard',
        name_en: 'Case 3: Inversion Steam Flash Hazard (Water to Acid)',
        name_vi: 'Trường hợp 3: Hiểm họa nổ bùng hơi nước khi rót nước vào axit',
        description_en: 'Catastrophic simulation case: water droplet flashes into high-pressure vapor, ejecting corrosive aerosol droplets violently upward.',
        description_vi: 'Trường hợp nguy hiểm: giọt nước nổi trên mặt axit đặc bị sôi bùng nổ tức thì, bắn các giọt sol khí axit ăn mòn ra ngoài.',
        algorithm: 'Superheat flashing: T_interface > 120°C; vapor expansion ratio 1600x; acoustic crack.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Put Water First',
        title_vi: 'Lấy nước trước',
        instruction_en: 'Pour 50 mL of distilled water into the beaker first.',
        instruction_vi: 'Cho 50 mL nước cất vào cốc trước.',
        expectedResult_en: 'Cool water reservoir.',
        expectedResult_vi: 'Lượng nước ban đầu để hấp thụ nhiệt lượng an toàn.'
      },
      {
        stepNumber: 2,
        title_en: 'Add Acid Slowly',
        title_vi: 'Rót axit từ từ dọc theo thành',
        instruction_en: 'Carefully add sulfuric acid drop by drop into the water with stirring.',
        instruction_vi: 'Rót từ từ từng giọt axit sunfuric vào nước và khuấy đều.',
        expectedResult_en: 'Water safely absorbs the generated heat with steady, controlled warming.',
        expectedResult_vi: 'Nước hấp thụ lượng nhiệt tỏa ra một cách êm dịu và an toàn.'
      }
    ],
    quizzes: [
      {
        question_en: 'What is the mnemonic rule for safely diluting concentrated sulfuric acid?',
        question_vi: 'Quy tắc vàng khi pha loãng axit sunfuric đặc là gì?',
        options_en: ['Always Add Acid to water (AAA)', 'Always Add Water to acid', 'Mix equal volumes quickly', 'Heat the acid first'],
        options_vi: ['Rót từ từ axit vào nước dọc đũa thủy tinh', 'Đổ ào nước vào axit', 'Trộn nhanh hai cốc', 'Đun nóng axit trước'],
        correctAnswer: 0,
        explanation_en: 'AAA: Always Add Acid to water! Water has high specific heat capacity and absorbs heat without boiling.',
        explanation_vi: 'Luôn rót từ từ axit vào nước để lượng nước lớn hấp thụ nhiệt tỏa ra, không làm sôi cục bộ.'
      }
    ]
  },
  {
    id: 'mass_conservation_bacl2_na2so4',
    title_en: 'Verification of Law of Conservation of Mass (BaCl2 + Na2SO4)',
    title_vi: 'Kiểm chứng Định luật Bảo toàn Khối lượng (BaCl2 + Na2SO4)',
    category: 'precipitation',
    difficulty: 'basic',
    objective_en: 'Prove Lavoisier-Lomonosov Law of Conservation of Mass using the digital analytical balance.',
    objective_vi: 'Kiểm chứng thực nghiệm Định luật Bảo toàn Khối lượng Lomonosov - Lavoisier trên cân điện tử phân tích.',
    theory_en: 'In a chemical reaction, the total mass of the products is strictly equal to the total mass of the reactants: m_reactants = m_products. Barium chloride reacts with sodium sulfate: BaCl₂ + Na₂SO₄ → BaSO₄↓ + 2NaCl. The white insoluble BaSO4 settles, but the balance reading remains unchanged.',
    theory_vi: 'Trong một phản ứng hóa học, tổng khối lượng các chất sản phẩm bằng tổng khối lượng các chất tham gia phản ứng: m(trước) = m(sau). Bari clorua phản ứng với natri sunfat: BaCl₂ + Na₂SO₄ → BaSO₄↓ + 2NaCl. Dù xuất hiện kết tủa trắng, tổng khối lượng trên đĩa cân hoàn toàn không thay đổi.',
    safetyAdvisory_en: 'Barium chloride is toxic. Do not ingest and wear protective gloves.',
    safetyAdvisory_vi: 'Bari clorua là muối kim loại độc hại. Không nếm thử và đeo găng tay bảo hộ.',
    requiredEquipment: ['Digital Balance', 'Beaker (x2)'],
    allowedChemicals: ['BaCl2', 'Na2SO4', 'H2O'],
    simulationAlgorithm_en: `Conservation Law & Precipitate Scattering Model:
1. Exact Mass Invariance: sum(m_initial) = sum(m_final) to +/- 0.001 g.
2. Rapid Ionic Precipitation: Ba2+ + SO4(2-) -> BaSO4(s) (Ksp = 1.08e-10).
3. Turbidity Scattering: tau = (24*pi^3 * N * V_p^2 / lambda^4) * ((m^2 - 1)/(m^2 + 2))^2.
   Zero mass loss as system is non-volatile; digital analytical balance displays steady invariant reading.`,
    simulationAlgorithm_vi: `Thuật toán Định Luật Bảo Toàn & Tán Xạ Ánh Sáng:
1. Bảo toàn khối lượng tuyệt đối: tổng khối lượng trước và sau phản ứng sai số < 0.001 g.
2. Kết tủa ion tức thì Ba2+ + SO4(2-) -> BaSO4(s) với độ tan cực bé Ksp = 1.08e-10.
3. Độ đục tán xạ Rayleigh tăng vọt tạo màu trắng đục như sữa mà không làm thất thoát vật chất ra môi trường.`,
    phenomenologyCases: [
      {
        id: 'mass_conservation_pre_tare',
        name_en: 'Case 1: Quiescent Pre-Reaction Tare Equilibrium',
        name_vi: 'Trường hợp 1: Cân bằng trước phản ứng với số đo khối lượng tĩnh',
        description_en: 'Separate transparent colorless solutions rest on the analytical balance pan; digital reading is perfectly motionless at m_initial.',
        description_vi: 'Hai dung dịch trong suốt riêng biệt được đặt trên đĩa cân điện tử; chỉ số khối lượng hiển thị ổn định tuyệt đối.',
        algorithm: 'Balance readout m = m_beaker + m_sol1 + m_sol2; noise filter sigma < 0.002 g.'
      },
      {
        id: 'mass_conservation_curdy_flash',
        name_en: 'Case 2: Flash Precipitation with Zero Mass Delta',
        name_vi: 'Trường hợp 2: Kết tủa trắng bùng phát tức thì với biến thiên khối lượng bằng 0',
        description_en: 'Upon mixing, a dense milky white opaque suspension erupts instantaneously, yet the analytical balance reading remains strictly identical: Delta m = 0.00 g.',
        description_vi: 'Khi đổ 2 chất vào nhau, kết tủa trắng đục BaSO4 bùng phát ngay tức khắc, chỉ số cân điện tử giữ nguyên 100% không đổi: Delta m = 0.00 g.',
        algorithm: 'Instantaneous Ksp saturation; mass conservation dm/dt = 0; turbidity tau -> 0.95.'
      },
      {
        id: 'mass_conservation_dense_sediment',
        name_en: 'Case 3: Dense Gravitational Sediment Bed Formation',
        name_vi: 'Trường hợp 3: Kết tủa BaSO4 nặng lắng dần xuống đáy cốc',
        description_en: 'Heavy barium sulfate particles (rho = 4.50 g/cm³) gently precipitate toward the beaker floor, leaving a crystal-clear supernatant.',
        description_vi: 'Các hạt BaSO4 nặng (tỉ trọng 4.50 g/cm³) từ từ lắng xuống tạo lớp cặn trắng dày dưới đáy, lớp nước phía trên trở nên trong veo.',
        algorithm: 'Stokes settling: v = 2*r^2*(rho_BaSO4 - rho_w)*g / (9*mu); balance reading invariant.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Weigh Initial Reactants on Balance',
        title_vi: 'Cân dung dịch ban đầu trên cân điện tử',
        instruction_en: 'Place Beaker 1 containing 25 mL BaCl2 on the balance pan. Note the initial mass reading m1.',
        instruction_vi: 'Đặt Cốc 1 chứa 25 mL dung dịch BaCl2 lên đĩa cân điện tử. Quan sát và ghi lại khối lượng ban đầu m1.',
        expectedResult_en: 'Digital balance shows tare + liquid mass stably.',
        expectedResult_vi: 'Đồng hồ cân điện tử hiển thị giá trị khối lượng ổn định.'
      },
      {
        stepNumber: 2,
        title_en: 'Mix Reactants and Confirm Invariant Mass',
        title_vi: 'Trộn dung dịch và kiểm chứng khối lượng',
        instruction_en: 'Pour 25 mL Na2SO4 into Beaker 1 on the balance pan.',
        instruction_vi: 'Rót tiếp 25 mL dung dịch Na2SO4 vào Cốc 1 trên đĩa cân.',
        expectedResult_en: 'Instant dense milky-white precipitate of BaSO4 forms. Total mass exactly equals the sum of both masses (m1 + m2 = m_final)!',
        expectedResult_vi: 'Kết tủa trắng đục BaSO4 xuất hiện ngay lập tức. Tổng khối lượng sau phản ứng hoàn toàn bằng tổng khối lượng ban đầu!'
      }
    ],
    quizzes: [
      {
        question_en: 'Why does the total mass remain unchanged during precipitation of BaSO4?',
        question_vi: 'Tại sao tổng khối lượng không thay đổi khi kết tủa BaSO4 xuất hiện?',
        options_en: ['Atoms are conserved, only rearranged into new bonds', 'Precipitates have zero mass', 'Water absorbs the mass difference', 'Mass converts into light'],
        options_vi: ['Số lượng nguyên tử được bảo toàn, chỉ sắp xếp lại liên kết', 'Chất kết tủa không có khối lượng', 'Nước hấp thụ khối lượng thừa', 'Khối lượng biến đổi thành ánh sáng'],
        correctAnswer: 0,
        explanation_en: 'According to the Law of Conservation of Mass, matter is neither created nor destroyed in chemical reactions; atoms are merely rearranged.',
        explanation_vi: 'Theo Định luật bảo toàn khối lượng, các nguyên tử được bảo toàn về số lượng và loại nguyên tố, chỉ thay đổi liên kết hóa học giữa chúng.'
      }
    ]
  },
  {
    id: 'catalytic_oxygen_prep',
    title_en: 'Catalytic Oxygen Gas Preparation (H2O2 + MnO2)',
    title_vi: 'Điều chế Khí Oxi bằng Phân hủy H2O2 (Xúc tác MnO2)',
    category: 'gas',
    difficulty: 'intermediate',
    objective_en: 'Observe catalytic decomposition of hydrogen peroxide and understand how catalysts speed up reactions without being consumed.',
    objective_vi: 'Khảo sát sự phân hủy oxy già H2O2 khi có mặt xúc tác mangan đioxit MnO2 để điều chế khí oxi trong phòng thí nghiệm.',
    theory_en: 'Hydrogen peroxide slowly decomposes at room temperature: 2H₂O₂ → 2H₂O + O₂↑. Adding black MnO2 catalyst drastically lowers the activation energy, causing instantaneous vigorous foaming of hot oxygen gas.',
    theory_vi: 'Oxy già H2O2 tự phân hủy rất chậm ở nhiệt độ thường. Khi thêm bột màu đen MnO2 đóng vai trò xúc tác, phản ứng xảy ra tức thì với tốc độ cực nhanh, sủi bọt khí O2 cuồn cuộn.',
    safetyAdvisory_en: 'Exothermic reaction; the flask can get warm. Keep away from flammable materials.',
    safetyAdvisory_vi: 'Phản ứng tỏa nhiệt ấm bình. Khí oxi duy trì sự cháy, tránh xa các vật liệu dễ bắt lửa.',
    requiredEquipment: ['Erlenmeyer Flask', 'Spatula'],
    allowedChemicals: ['H2O2', 'MnO2', 'H2O'],
    simulationAlgorithm_en: `Heterogeneous Catalytic Decomposition & Steam Eruption Model:
1. Catalytic Surface Rate Law: r = k_cat * A_MnO2 * [H2O2] / (1 + K_ads * [H2O2]) with Ea = 23 kJ/mol.
2. Exothermic Reaction Heating:
   Delta H° = -98.2 kJ/mol. Heat accumulation raises local fluid temperature, accelerating gas evolution.
3. Oxygen Effervescence & Reignition Kinetics:
   Dense foam layer with high oxygen partial pressure (P_O2 > 0.9 atm), dramatically boosting charcoal/splint combustion rate.`,
    simulationAlgorithm_vi: `Thuật toán Phân Hủy Xúc Tác Dị Thể & Thoát Hơi Nước Nóng:
1. Tốc độ xúc tác bề mặt MnO2 làm giảm mạnh năng lượng hoạt hóa từ 75 kJ/mol xuống còn 23 kJ/mol.
2. Nhiệt phản ứng tỏa ra (Delta H° = -98.2 kJ/mol) làm ấm dung dịch và sinh luồng hơi nước bốc lên.
3. Luồng khí O2 tinh khiết (nồng độ > 90%) làm bùng cháy mãnh liệt tàn đóm đỏ khi đưa vào miệng bình.`,
    phenomenologyCases: [
      {
        id: 'catalytic_oxygen_effervescent_froth',
        name_en: 'Case 1: Explosive Oxygen Effervescence & Black Churn',
        name_vi: 'Trường hợp 1: Sủi bọt khí O2 bùng nổ cuồn cuộn cùng bột MnO2',
        description_en: 'Adding black MnO2 triggers instant violent churning and thick foam bubbling as millions of oxygen bubbles detach from catalyst surfaces.',
        description_vi: 'Thả bột MnO2 vào làm dung dịch sôi bùng lên tức thì, bọt khí O2 sinh ra cuồn cuộn cuốn theo các hạt MnO2 màu đen chuyển động mãnh liệt.',
        algorithm: 'Catalytic gas flux Q_gas = r * V_m_gas; two-phase hydrodynamic churn.'
      },
      {
        id: 'catalytic_oxygen_thermal_steam',
        name_en: 'Case 2: Exothermic Thermal Rise & Water Vapor Mist',
        name_vi: 'Trường hợp 2: Nhiệt độ tăng cao & hơi nước bốc lên mù mịt',
        description_en: 'Reaction heat warms the flask significantly to ~60-70°C; warm humid oxygen gas condenses into a visible white steam mist plume at the flask neck.',
        description_vi: 'Phản ứng tỏa nhiệt làm ấm bình lên 60-70°C, hơi nước bốc lên ngưng tụ thành dải khói hơi nước màu trắng ở cổ bình.',
        algorithm: 'Latent heat vaporization balance; aerosol fog condensation threshold.'
      },
      {
        id: 'catalytic_oxygen_splint_reignition',
        name_en: 'Case 3: Glowing Splint Rekindling Flare',
        name_vi: 'Trường hợp 3: Bùng cháy que đóm tàn đỏ thành ngọn lửa sáng chói',
        description_en: 'Inserting a glowing wood splint into the neck of the flask reignites it instantaneously into an intense, bright yellow flame supported by pure O2.',
        description_vi: 'Đưa tàn đóm đỏ vào bình, nồng độ O2 cao làm tốc độ oxy hóa tăng vọt, tàn đóm bùng cháy thành ngọn lửa vàng rực rỡ.',
        algorithm: 'Combustion velocity v_comb ~ [O2]^0.8; thermal runaway flame ignition.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Add Hydrogen Peroxide',
        title_vi: 'Rót dung dịch oxy già',
        instruction_en: 'Add 30 mL of H2O2 solution into the Erlenmeyer flask.',
        instruction_vi: 'Rót 30 mL dung dịch oxy già H2O2 vào bình tam giác.',
        expectedResult_en: 'Clear colorless solution with barely any bubbles.',
        expectedResult_vi: 'Dung dịch trong suốt không màu, hầu như không có bọt khí.'
      },
      {
        stepNumber: 2,
        title_en: 'Add Manganese Dioxide Catalyst',
        title_vi: 'Thêm bột xúc tác MnO2',
        instruction_en: 'Add a small amount of solid black MnO2 powder into the flask.',
        instruction_vi: 'Cho một thìa nhỏ bột mangan đioxit MnO2 màu đen vào bình.',
        expectedResult_en: 'Vigorous bubbling and stream of oxygen gas froth with gentle steam release!',
        expectedResult_vi: 'Sủi bọt khí O2 mãnh liệt cuồn cuộn, bình nghiệm nóng lên rõ rệt.'
      }
    ],
    quizzes: [
      {
        question_en: 'What happens to the mass and chemical nature of the MnO2 catalyst after the reaction?',
        question_vi: 'Khối lượng và bản chất hóa học của chất xúc tác MnO2 sau phản ứng thay đổi như thế nào?',
        options_en: ['Mass and chemical composition remain completely unchanged', 'It is fully consumed', 'It turns into liquid', 'Its mass doubles'],
        options_vi: ['Khối lượng và bản chất hóa học được giữ nguyên vẹn', 'Bị tiêu hao hoàn toàn', 'Bị hòa tan biến thành chất lỏng', 'Khối lượng tăng gấp đôi'],
        correctAnswer: 0,
        explanation_en: 'A catalyst increases reaction rate by providing an alternative pathway with lower activation energy, without being consumed in the reaction.',
        explanation_vi: 'Chất xúc tác làm tăng tốc độ phản ứng hóa học nhưng không bị tiêu hao hay biến đổi về lượng và chất sau phản ứng.'
      }
    ]
  },
  {
    id: 'thermal_decomp_cuoh2',
    title_en: 'Thermal Decomposition of Insoluble Base (Cu(OH)2 → CuO)',
    title_vi: 'Nhiệt phân Bazơ không tan (Cu(OH)2 → CuO)',
    category: 'thermal',
    difficulty: 'intermediate',
    objective_en: 'Investigate the thermal instability of insoluble metal hydroxides upon Bunsen burner heating.',
    objective_vi: 'Khảo sát tính chất kém bền nhiệt của bazơ không tan khi nung nóng trên ngọn lửa đèn cồn.',
    theory_en: 'Insoluble metal hydroxides decompose when heated: Cu(OH)₂ ⎯⎯t°⎯→ CuO↓ + H₂O. The sky-blue gelatinous copper(II) hydroxide transforms into fine black copper(II) oxide powder.',
    theory_vi: 'Các bazơ không tan bị nhiệt phân hủy tạo oxit bazơ tương ứng và nước: Cu(OH)₂ ⎯⎯t°⎯→ CuO↓ + H₂O. Kết tủa màu xanh lam chuyển thành bột màu đen của đồng(II) oxit.',
    safetyAdvisory_en: 'Use test tube holder or tongs when heating over the alcohol burner flame.',
    safetyAdvisory_vi: 'Dùng kẹp gỗ hoặc gắp khi đun nóng trên ngọn lửa đèn cồn để tránh bị bỏng.',
    requiredEquipment: ['Alcohol Burner', 'Tripod & Wire Gauze', 'Beaker / Test Tube'],
    allowedChemicals: ['CuSO4', 'NaOH', 'H2O'],
    simulationAlgorithm_en: `Solid-State Dehydroxylation & Nucleation Kinetics:
1. Solid Phase Dehydration: Cu(OH)2(s) -> CuO(s) + H2O (Delta H° = +8.6 kJ/mol).
2. Avrami-Erofeev Nucleation & Growth Rate:
   alpha(t, T) = 1 - exp(-(k(T)*t)^n) with Arrhenius rate k(T) = A * exp(-Ea / (R*T)) (Ea = 78 kJ/mol).
3. Chromatic Morphological Inversion:
   Particle color morphs continuously from sky-blue (#38bdf8) to pitch tenorite black (#0f172a) above 60°C.
   Dense CuO (rho = 6.31 g/cm³) flocculates and settles rapidly.`,
    simulationAlgorithm_vi: `Thuật toán Nhiệt Phân Rắn & Chuyển Pha Avrami:
1. Khử nước pha rắn Cu(OH)2(s) -> CuO(s) + H2O cần nhiệt độ kích hoạt trên 60°C.
2. Mô hình mầm tinh thể Avrami-Erofeev mô tả động học biến đổi từ từ rồi tăng tốc khi mạng lưới CuO lan tỏa.
3. Hạt kết tủa đổi màu liên tục từ xanh lam nhạt sang đen tuyền của oxit đồng CuO (tỉ trọng 6.31 g/cm³) và lắng nhanh xuống đáy.`,
    phenomenologyCases: [
      {
        id: 'thermal_cuoh2_gel_formation',
        name_en: 'Case 1: Ambient Gelatinous Blue Floc Suspension',
        name_vi: 'Trường hợp 1: Kết tủa keo Cu(OH)2 màu xanh lam ở nhiệt độ phòng',
        description_en: 'Mixing room-temperature CuSO4 and NaOH produces bulky, highly hydrated sky-blue gelatinous flakes suspended in water.',
        description_vi: 'Trộn CuSO4 và NaOH ở nhiệt độ phòng tạo kết tủa keo Cu(OH)2 màu xanh da trời ngậm nhiều phân tử nước lơ lửng.',
        algorithm: 'Precipitation Ksp = 2.2e-20; hydration shell index n ≈ 4-6; sky-blue diffuse scattering.'
      },
      {
        id: 'thermal_cuoh2_phase_blackening',
        name_en: 'Case 2: Thermal Dehydroxylation & Nucleation Blackening',
        name_vi: 'Trường hợp 2: Nhiệt phân khử nước chuyển sang các đốm đen CuO',
        description_en: 'As heat brings the temperature above 60-70°C, solid dehydration nucleates dark speckles which rapidly merge into jet-black tenorite CuO particles.',
        description_vi: 'Khi nhiệt độ vượt quá 60-70°C, các đốm màu nâu đen CuO bắt đầu xuất hiện rải rác rồi lan tỏa nhanh chóng, nhuộm đen toàn bộ kết tủa.',
        algorithm: 'Avrami phase fraction alpha(T) > 0.5 above 65°C; RGB interpolation to tenorite black.'
      },
      {
        id: 'thermal_cuoh2_rapid_sedimentation',
        name_en: 'Case 3: Dense Tenorite Sedimentation & Clear Water',
        name_vi: 'Trường hợp 3: Kết tủa oxit đồng nặng lắng nhanh, nước trong veo',
        description_en: 'Crystalline CuO has a much higher density (6.31 g/cm³) than the parent hydroxide, rapidly settling into a compact black bed beneath crystal-clear liquid.',
        description_vi: 'Tinh thể CuO có tỉ trọng rất cao (6.31 g/cm³), nhanh chóng chìm xuống đáy cốc tạo lớp bột đen mịn, để lại lớp nước trong suốt phía trên.',
        algorithm: 'Stokes settling acceleration due to 3x density increase; supernatant turbidity tau -> 0.0.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Prepare Sky-Blue Cu(OH)2 Precipitate',
        title_vi: 'Tạo kết tủa xanh lam Cu(OH)2',
        instruction_en: 'Mix CuSO4 solution and NaOH solution in the beaker to form blue gelatinous Cu(OH)2.',
        instruction_vi: 'Trộn dung dịch CuSO4 và NaOH vào cốc để tạo kết tủa Cu(OH)2 màu xanh lam dạng keo.',
        expectedResult_en: 'Abundant sky-blue precipitate.',
        expectedResult_vi: 'Xuất hiện kết tủa màu xanh da trời đặc trưng.'
      },
      {
        stepNumber: 2,
        title_en: 'Heat over Alcohol Burner',
        title_vi: 'Đun nóng trên đèn cồn',
        instruction_en: 'Place the beaker on the wire gauze above the alcohol burner and ignite the flame.',
        instruction_vi: 'Đặt cốc lên lưới amiăng giá kiềng trên đèn cồn và bật lửa đun nóng.',
        expectedResult_en: 'As temperature passes 60°C, the blue precipitate turns completely black (CuO)!',
        expectedResult_vi: 'Khi nhiệt độ vượt quá 60°C, kết tủa xanh lam chuyển dần sang màu đen tuyền của đồng(II) oxit CuO!'
      }
    ],
    quizzes: [
      {
        question_en: 'What is the color and chemical formula of the solid produced after heating Cu(OH)2?',
        question_vi: 'Chất rắn thu được sau khi nung Cu(OH)2 có màu gì và công thức là gì?',
        options_en: ['Black, CuO', 'Red, Cu2O', 'White, CuSO4', 'Green, CuCO3'],
        options_vi: ['Màu đen, CuO', 'Màu đỏ gạch, Cu2O', 'Màu trắng, CuSO4', 'Màu xanh lục, CuCO3'],
        correctAnswer: 0,
        explanation_en: 'Thermal decomposition of Cu(OH)2 yields black copper(II) oxide (CuO) and water vapor.',
        explanation_vi: 'Cu(OH)2 bị nhiệt phân tạo thành bột đồng(II) oxit CuO màu đen và hơi nước.'
      }
    ]
  },
  {
    id: 'redox_gas_cu_hno3',
    title_en: 'Redox Gas Evolution: Copper with Concentrated HNO3 (NO2 Gas)',
    title_vi: 'Đồng tác dụng với Axit Nitric đặc (Khí NO2 màu nâu đỏ)',
    category: 'gas',
    difficulty: 'advanced',
    objective_en: 'Demonstrate the powerful oxidizing nature of nitric acid reacting with unreactive copper to produce nitrogen dioxide gas.',
    objective_vi: 'Chứng minh tính oxi hóa mạnh của axit nitric đặc khi tác dụng với kim loại đồng, sinh khí nitơ đioxit màu nâu đỏ đặc trưng.',
    theory_en: 'Concentrated nitric acid oxidizes copper metal: Cu + 4HNO₃(conc) → Cu(NO₃)₂ + 2NO₂↑ + 2H₂O. The solution turns emerald turquoise/blue while dense, pungent reddish-brown NO2 gas billows out.',
    theory_vi: 'Axit nitric đặc oxi hóa kim loại đồng: Cu + 4HNO₃(đặc) → Cu(NO₃)₂ + 2NO₂↑ + 2H₂O. Dung dịch chuyển sang màu xanh ngọc lam và giải phóng khí NO2 màu nâu đỏ nặng hơn không khí tràn qua miệng bình.',
    safetyAdvisory_en: 'TOXIC GAS: Nitrogen dioxide (NO2) is a respiratory irritant. Perform in fume hood.',
    safetyAdvisory_vi: 'KHÍ ĐỘC: Khí NO2 có mùi hắc, gây kích ứng đường hô hấp. Phải thực hiện trong tủ hút hoặc nơi thông gió tốt.',
    requiredEquipment: ['Erlenmeyer Flask', 'Fume Hood'],
    allowedChemicals: ['Cu', 'HNO3 (conc)'],
    simulationAlgorithm_en: `Strong Oxidative Dissolution & NO2 Heavy Plume Dynamics:
1. Heterogeneous Nitric Oxidation: Cu + 4HNO3 -> Cu(NO3)2 + 2NO2 + 2H2O (Delta H° = -136 kJ/mol).
2. Dimerization Gas Equilibrium: 2NO2(g) ⇌ N2O4(g) (Delta H° = -57.2 kJ/mol).
   Dense, pungent reddish-brown NO2 (rho_rel = 1.58) blankets the surface and billows out.
3. Chromophore Shift:
   High ionic strength and dissolved NO2 create dark emerald green [Cu(NO2)x] complexes, turning cyan-blue upon dilution.`,
    simulationAlgorithm_vi: `Thuật toán Oxy Hóa Khử Axit Nitric & Khí Nâu Đỏ NO2 Nặng:
1. Axit nitric đặc hòa tan kim loại đồng tỏa nhiệt cực mạnh (Delta H° = -136 kJ/mol).
2. Cân bằng hóa nâu khí NO2 và đime không màu N2O4; khí NO2 nặng hơn không khí (tỉ khối 1.58) tràn trề miệng bình.
3. Dung dịch chuyển sang màu xanh ngọc bích đậm do tạo phức trung gian giữa Cu2+ và NO2 hòa tan.`,
    phenomenologyCases: [
      {
        id: 'cu_hno3_foaming_eruption',
        name_en: 'Case 1: Autocatalytic Foaming & Emerald Green Shift',
        name_vi: 'Trường hợp 1: Sủi bọt mãnh liệt & dung dịch hóa xanh ngọc bích',
        description_en: 'Contact with concentrated acid triggers violent bubbling on copper turnings; liquid swiftly darkens into an intense emerald forest green.',
        description_vi: 'Tiếp xúc với axit đặc làm các mẩu đồng sủi bọt cuồn cuộn; dung dịch nhanh chóng chuyển sang màu xanh lục ngọc bích đậm đặc.',
        algorithm: 'Autocatalytic HNO2 mediation; dissolution rate r = k * [HNO3]^2 * [HNO2]; emerald green absorption band.'
      },
      {
        id: 'cu_hno3_dense_brown_fumes',
        name_en: 'Case 2: Dense Reddish-Brown NO2 Plume Billow',
        name_vi: 'Trường hợp 2: Khói NO2 màu nâu đỏ đặc quánh cuộn trào',
        description_en: 'Thick, choking reddish-brown nitrogen dioxide gas fills the headspace and billows out of the neck like heavy volcanic smoke.',
        description_vi: 'Luồng khí NO2 màu nâu đỏ đậm đặc cuồn cuộn dâng đầy bình rồi tràn qua miệng như một cột khói núi lửa nặng nề.',
        algorithm: 'Gas density rho = 1.58 * rho_air; convective plume dispersion with NO2 absorption spectrum (400-500 nm).'
      },
      {
        id: 'cu_hno3_thermal_exotherm_drainage',
        name_en: 'Case 3: Vigorous Exothermic Boiling & Blue Dilution',
        name_vi: 'Trường hợp 3: Tỏa nhiệt sôi sùng sục & pha loãng hóa xanh lam',
        description_en: 'Reaction self-heats past 80°C, causing boiling agitation; once copper finishes dissolving, residual solution clarifies to deep azure copper nitrate.',
        description_vi: 'Nhiệt độ dung dịch tự tăng vọt vượt 80°C sôi sùng sục; khi đồng tan hết, dung dịch chuyển sang màu xanh lam đậm trong suốt của Cu(NO3)2.',
        algorithm: 'Adiabatic temperature rise Delta T > 50°C; terminal copper consumption dm_Cu/dt -> 0.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Place Copper Foil',
        title_vi: 'Cho phoi đồng vào bình',
        instruction_en: 'Place shiny copper metal turnings into the Erlenmeyer flask.',
        instruction_vi: 'Cho vài mẩu hoặc phoi đồng kim loại màu đỏ vào bình tam giác.',
        expectedResult_en: 'Reddish metallic copper at the bottom.',
        expectedResult_vi: 'Mẩu kim loại đồng sáng bóng ở đáy bình.'
      },
      {
        stepNumber: 2,
        title_en: 'Add Concentrated HNO3',
        title_vi: 'Rót axit nitric đặc',
        instruction_en: 'Carefully pour concentrated HNO3 into the flask with copper.',
        instruction_vi: 'Cẩn thận rót dung dịch HNO3 đặc vào bình chứa đồng.',
        expectedResult_en: 'Vigorous foaming, emerald green solution, and magnificent plumes of dense reddish-brown NO2 gas!',
        expectedResult_vi: 'Sủi bọt mãnh liệt, dung dịch hóa xanh ngọc và khói màu nâu đỏ đặc quánh cuộn trào bốc lên!'
      }
    ],
    quizzes: [
      {
        question_en: 'What gas gives the dense reddish-brown color in this reaction?',
        question_vi: 'Khí nào làm cho luồng khói có màu nâu đỏ đặc trưng trong phản ứng này?',
        options_en: ['Nitrogen dioxide (NO2)', 'Nitric oxide (NO)', 'Nitrogen (N2)', 'Chlorine (Cl2)'],
        options_vi: ['Khí Nitơ đioxit (NO2)', 'Khí Nitơ monoxit (NO)', 'Khí Nitơ (N2)', 'Khí Clo (Cl2)'],
        correctAnswer: 0,
        explanation_en: 'NO2 is a reddish-brown toxic paramagnetic gas produced when conc. HNO3 oxidizes copper.',
        explanation_vi: 'Khí NO2 có màu nâu đỏ đặc trưng, độc hại và nặng hơn không khí.'
      }
    ]
  },
  {
    id: 'alkali_metal_water_na',
    title_en: 'Alkali Metal Reaction: Sodium Skittering on Water with Indicator',
    title_vi: 'Thí nghiệm Kim loại kiềm: Viên Natri chạy trên mặt nước có chỉ thị màu',
    category: 'redox',
    difficulty: 'intermediate',
    objective_en: 'Investigate the dramatic reactivity of elemental sodium on water: floating buoyancy, hydrogen jet recoil skittering, melting at 97.8°C into a spherical molten bead, 589nm yellow flame ignition, and swirling phenolphthalein trails.',
    objective_vi: 'Khảo sát hiện tượng phản ứng mãnh liệt đặc trưng của kim loại natri với nước: nổi trên mặt nước, chạy lướt hỗn loạn do phản lực tia khí H2, nóng chảy vo tròn thành viên bi bạc ở 97.8°C, bốc cháy ngọn lửa màu vàng 589nm và để lại vệt màu hồng phenolphtalein xoáy theo dòng nước.',
    theory_en: 'Sodium is a group 1 alkali metal with low density (ρ = 0.968 g/cm³) and low melting point (mp = 97.8 °C). The oxidation-reduction reaction with water is strongly exothermic: 2Na(s) + 2H₂O(l) → 2NaOH(aq) + H₂(g)↑ (ΔH° = -368.4 kJ/mol). The released heat rapidly melts the metal into a spherical liquid drop due to high liquid-metal surface tension (σ ≈ 0.19 N/m). Directional venting of evolved hydrogen gas creates asymmetric jet recoil propulsion that drives chaotic skittering across the water surface on a microscopic Leidenfrost vapor cushion.',
    theory_vi: 'Natri là kim loại kiềm nhóm IA có khối lượng riêng nhỏ hơn nước (ρ = 0.968 g/cm³) và nhiệt độ nóng chảy thấp (tnc = 97.8 °C). Phản ứng oxi hóa - khử với nước tỏa nhiệt cực mạnh: 2Na(r) + 2H₂O(l) → 2NaOH(dd) + H₂(k)↑ (ΔH° = -368.4 kJ/mol). Nhiệt lượng giải phóng làm nóng chảy mẩu kim loại thành giọt chất lỏng hình cầu do lực căng bề mặt lớn của natri lỏng (σ ≈ 0.19 N/m). Khí hiđro thoát ra bất đối xứng tạo phản lực đẩy viên natri chạy lướt hỗn loạn trên mặt nước nhờ lớp đệm khí vi mô kiểu hiệu ứng Leidenfrost.',
    safetyAdvisory_en: 'EXPLOSION & FIRE HAZARD: Use only a small piece of sodium (~0.1 g). Keep tweezers dry. Never handle sodium with bare fingers. Wear safety splash goggles and face shield.',
    safetyAdvisory_vi: 'NGUY CƠ CHÁY NỔ NGUY HIỂM: Chỉ dùng mẩu natri nhỏ cỡ hạt đậu xanh (~0.1 g). Kẹp gắp phải tuyệt đối khô ráo. Không cầm trực tiếp bằng tay. Luôn đeo kính bảo hộ chống hóa chất và làm trong tủ hút.',
    requiredEquipment: ['Beaker', 'Forceps / Tweezers', 'Filter Paper'],
    allowedChemicals: ['Na', 'H2O', 'Phenolphthalein'],
    simulationAlgorithm_en: `Sodium on Water Mathematical & Physical Simulation Architecture:
1. Floating Interface & Meniscus Depression:
   Density ratio ρ_Na / ρ_H2O = 0.968 < 1.0 (positive buoyancy). Low freeboard creates a surface meniscus indentation ring modeled by static Young-Laplace curvature: Δz_m = -m*g / (2π*R*σ).
2. Asymmetric Hydrogen Jet Recoil & Leidenfrost Cushion:
   Reaction rate r = k(T) * A_wetted * [H2O]. Directional hydrogen evolution creates recoil thrust:
   m_pellet * (dv/dt) = -dm_gas/dt * u_exhaust - γ_eff * v + F_wall_elastic.
   Underneath the pellet, a microscopic cushion of H2 gas and water vapor forms (Leidenfrost phenomenon), reducing hydrodynamic friction damping γ_eff by ~75-85%.
3. Phase Transition & Spherical Rounding at 97.8 °C:
   Pellet internal thermal energy: Cp * (dT/dt) = r * (-ΔH_rxn) - h * A * (T - T_water).
   When T >= 97.8 °C, meltFactor smoothly transitions 0 -> 1. Irregular dodecahedral mesh morphs into an oblate molten sphere, with centrifugal flattening: a = R / (ar)^(1/3), b = R * (ar)^(2/3).
4. Autoignition & 589nm Flame Doublet:
   When T >= 115 °C, H2/air mixture with vaporized Na ignites. Atomic 3p -> 3s transition produces yellow D-line emission (λ = 589.0 nm, 589.6 nm). Luminous cone and spark bursts are rendered at the pellet center.
5. Alkaline Wake & Phenolphthalein Indicator Ribbon:
   Lagrangian trail points track OH- diffusion wake. In2- chromophore (R=244, G=63, B=94) renders fading, expanding circular discs on the liquid surface.
6. Acoustic Profile:
   Continuous hydrogen cavitation hiss combined with discrete Minnaert bubble pops f = 3260 / R_mm (Hz).`,
    simulationAlgorithm_vi: `Kiến trúc Thuật toán và Mô hình Vật lý của Viên Natri trên Nước:
1. Nổi bề mặt & Vết lõm Meniscus:
   Tỉ trọng ρ_Na / ρ_H2O = 0.968 < 1.0 (lực đẩy Archimedes thắng trọng lực). Độ nổi thấp tạo vết lõm mặt nước dạng lòng chảo theo phương trình Young-Laplace: Δz_m = -m*g / (2π*R*σ).
2. Phản lực luồng khí H2 & Đệm khí Leidenfrost:
   Tốc độ phản ứng r = k(T) * A_tiếp_xúc. Dòng khí H2 phụt ra bất đối xứng sinh lực đẩy phản lực:
   m * (dv/dt) = -dm_k/dt * u_thoát - γ_cản * v + F_va_chạm.
   Bên dưới viên natri hình thành lớp đệm khí H2 và hơi nước mỏng (hiệu ứng Leidenfrost) triệt tiêu ~75-85% lực cản ma sát thủy động lực học, khiến viên natri lướt nhanh như trượt băng!
3. Chuyển pha & Vo tròn thành viên bi bạc ở 97.8 °C:
   Phương trình cân bằng nhiệt: Cp * (dT/dt) = r * (-ΔH) - h * A * (T - T_nước).
   Khi T >= 97.8 °C, natri rắn nóng chảy; lực căng bề mặt kim loại lỏng cực lớn (σ ≈ 0.19 N/m) ép viên natri vo tròn thành hình cầu bóng loáng như thủy ngân. Momen quay bất đối xứng làm viên bi xoay tròn quanh trục.
4. Bốc cháy ngọn lửa màu vàng 589nm:
   Khi nhiệt độ vượt quá 115 °C, hỗn hợp H2 - không khí cùng hơi natri tự bốc cháy với ngọn lửa hình nón màu vàng rực rỡ đặc trưng của vạch quang phổ phát xạ natri D-line (589.0 nm và 589.6 nm), kèm các tia lửa bắn ra.
5. Vệt kiềm Phenolphtalein xoáy màu hồng fuchsia:
   Dung dịch NaOH hòa tan phía sau đuôi viên natri làm pH tăng vọt > 8.2; chỉ thị phenolphtalein mở vòng lactone chuyển thành dianion In2- màu hồng cánh sen, uốn lượn theo dòng xoáy thủy động học.
6. Âm thanh Minnaert & Tiếng xèo xèo nổ lách tách:
   Bộ tổng hợp âm thanh WebAudio API mô phỏng tiếng xèo xèo liên tục cùng các tiếng nổ bọt khí Minnaert f = 3260 / R_mm (Hz).`,
    phenomenologyCases: [
      {
        id: 'case_1_float_meniscus',
        name_en: 'Case 1: Surface Meniscus Floatation',
        name_vi: 'Trường hợp 1: Thả vào và Nổi lõm mặt nước',
        description_en: 'Solid irregular metallic block floats due to low density (0.97 g/cm³), indenting a visible capillary meniscus depression ring on water.',
        description_vi: 'Mẩu natri kim loại góc cạnh nổi trên mặt nước do khối lượng riêng nhỏ hơn nước (0.97 g/cm³), tạo một vành khuyên lõm mặt cong mao dẫn rõ rệt.',
        algorithm: 'Young-Laplace boundary condition Δz_m = -mg / (2πRσ); initial faceted dodecahedral mesh geometry.'
      },
      {
        id: 'case_2_recoil_skittering',
        name_en: 'Case 2: Leidenfrost Asymmetric H2 Recoil Darting',
        name_vi: 'Trường hợp 2: Lướt phản lực khí H2 trên đệm khí Leidenfrost',
        description_en: 'Asymmetric venting of hydrogen jet shoots the pellet across water on a low-friction vapor cushion with erratic Brownian turns and wall bounces.',
        description_vi: 'Khí hiđro thoát ra bất đối xứng sinh phản lực đẩy viên natri phóng vụt trên lớp đệm khí giảm ma sát, đổi hướng ngẫu nhiên và va chạm đàn hồi vào thành cốc.',
        algorithm: 'm(dv/dt) = -dm_gas/dt * u_gas - γ_eff * v; friction damping reduced by 80% under vapor cushion.'
      },
      {
        id: 'case_3_molten_silver_bead',
        name_en: 'Case 3: Molten Silvery Sphere Transition at 97.8°C',
        name_vi: 'Trường hợp 3: Nóng chảy vo tròn thành viên bi bạc ở 97.8°C',
        description_en: 'Exothermic heat accumulation melts the faceted solid block at 97.8°C into an ultra-shiny liquid mercury-like droplet, spinning from jet torques.',
        description_vi: 'Nhiệt tỏa ra từ phản ứng làm mẩu natri nóng chảy tại 97.8°C, lực căng bề mặt vo tròn thành giọt kim loại lỏng bóng loáng xoay tít quanh trục.',
        algorithm: 'Continuous meltFactor interpolation 0 -> 1; surface tension energy minimization; centrifugal oblate flattening.'
      },
      {
        id: 'case_4_flame_ignition_589nm',
        name_en: 'Case 4: 589nm Golden Yellow Flame Cone',
        name_vi: 'Trường hợp 4: Bốc cháy ngọn lửa màu vàng 589nm & tia lửa',
        description_en: 'At T >= 115°C, thermal autoignition of hydrogen enriched with vaporized sodium produces an intense 589nm yellow flame cone and bright sparks.',
        description_vi: 'Khi nhiệt độ vượt 115°C, hiđro cùng hơi natri bốc cháy với ngọn lửa hình nón màu vàng rực rỡ và phát ra các tia lửa vi mô.',
        algorithm: 'Planck blackbody radiation combined with 3p -> 3s atomic emission at 589 nm; localized point light and spark particle emitter.'
      },
      {
        id: 'case_5_phenolphthalein_trail',
        name_en: 'Case 5: Swirling Alkaline Phenolphthalein Trail',
        name_vi: 'Trường hợp 5: Vệt hồng Phenolphtalein xoáy theo dòng nước',
        description_en: 'NaOH produced in the wake turns phenolphthalein into a vivid magenta-pink ribbon curling in hydrodynamic vortices behind the darting droplet.',
        description_vi: 'Kiềm NaOH sinh ra làm đổi màu phenolphtalein thành dải lụa màu hồng tươi fuchsia uốn lượn theo các xoáy nước phía sau viên natri.',
        algorithm: 'Lagrangian trail point buffer; Henderson-Hasselbalch indicator deprotonation; expanding Gaussian blur discs.'
      },
      {
        id: 'case_6_micro_pop_exhaustion',
        name_en: 'Case 6: Micro-Explosion Pop and Complete Exhaustion',
        name_vi: 'Trường hợp 6: Tiếng nổ lách tách và tan biến hoàn toàn',
        description_en: 'As mass drops below 0.01 g, rapid boiling and hydrogen cavity collapse trigger a sharp acoustic pop, leaving a calm, transparent magenta solution.',
        description_vi: 'Khi khối lượng giảm dần đến hết, bọt khí hiđro vỡ tạo tiếng nổ lách tách vui tai, viên natri biến mất hoàn toàn để lại dung dịch kiềm màu hồng trong suốt.',
        algorithm: 'Minnaert acoustic burst formula f = 3260 / R_mm (Hz); consumption rate dm/dt ~ mass_fraction.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Prepare Water with Phenolphthalein',
        title_vi: 'Chuẩn bị nước cất có phenolphtalein',
        instruction_en: 'Pour 60 mL of distilled water into Beaker 1 and add 2-3 drops of Phenolphthalein indicator.',
        instruction_vi: 'Rót 60 mL nước cất vào Cốc 1 và nhỏ 2-3 giọt dung dịch phenolphtalein.',
        expectedResult_en: 'Colorless, transparent liquid at pH ~ 7.0.',
        expectedResult_vi: 'Dung dịch trong suốt không màu ở pH ~ 7.0.'
      },
      {
        stepNumber: 2,
        title_en: 'Drop Sodium Metal Piece into Water',
        title_vi: 'Thả mẩu natri vào cốc nước',
        instruction_en: 'Using dry forceps, drop a small metallic sodium piece into the beaker and observe immediately.',
        instruction_vi: 'Dùng kẹp gắp khô thả một mẩu natri nhỏ vào cốc nước và quan sát kỹ hiện tượng.',
        expectedResult_en: 'Sodium immediately floats, melts at 97.8°C into a shimmering silvery liquid ball, darts across the surface on a hydrogen gas cushion, ignites with a golden 589nm yellow flame, and leaves a gorgeous swirling fuchsia pink trail!',
        expectedResult_vi: 'Mẩu natri nổi trên mặt nước, nóng chảy ở 97.8°C vo tròn thành viên bi bạc lỏng, chạy lướt hỗn loạn trên đệm khí H2, bốc cháy với ngọn lửa màu vàng 589nm rực rỡ và để lại vệt màu hồng fuchsia xoáy cuộn tuyệt đẹp!'
      }
    ],
    quizzes: [
      {
        question_en: 'Why does sodium float and melt into a silvery sphere on water?',
        question_vi: 'Tại sao mẩu natri lại nổi và nóng chảy vo tròn thành viên bi bạc trên mặt nước?',
        options_en: ['Density is lower than water (0.97 g/cm³) and reaction heat exceeds its 97.8°C melting point', 'Sodium is hollow inside', 'Water repels sodium magnetically', 'It reacts with air pressure'],
        options_vi: ['Khối lượng riêng nhẹ hơn nước (0.97 g/cm³) và nhiệt phản ứng lớn hơn điểm nóng chảy 97.8°C', 'Natri có ruột rỗng', 'Nước đẩy natri bằng từ tính', 'Do áp suất không khí nén lại'],
        correctAnswer: 0,
        explanation_en: 'Sodium is less dense than water (floats). The highly exothermic reaction melts the metal (melting point 97.8°C), and surface tension pulls it into a sphere.',
        explanation_vi: 'Natri nhẹ hơn nước (0.97 g/cm³) nên nổi. Phản ứng tỏa nhiệt mạnh làm nóng chảy mẩu kim loại và lực căng bề mặt kéo nó thành hình cầu lăn tròn.'
      },
      {
        question_en: 'What causes the sodium pellet to dart rapidly and erratically across the water surface?',
        question_vi: 'Nguyên nhân chính khiến viên natri chạy lướt nhanh và hỗn loạn trên mặt nước là gì?',
        options_en: ['Directional recoil propulsion from hydrogen gas ejection and Leidenfrost vapor cushion', 'Magnetic repulsion from glass beaker', 'Convective water boiling waves only', 'Surface tension pulling it toward dry air'],
        options_vi: ['Phản lực từ luồng khí hiđro thoát ra bất đối xứng và đệm khí Leidenfrost giảm ma sát', 'Lực đẩy từ tính từ cốc thủy tinh', 'Do sóng nước sôi đẩy', 'Lực căng bề mặt hút về phía không khí khô'],
        correctAnswer: 0,
        explanation_en: 'Hydrogen gas venting from localized contact points acts like a miniature rocket thruster, while the vapor cushion eliminates hydrodynamic friction.',
        explanation_vi: 'Khí hiđro thoát ra từ các điểm tiếp xúc đóng vai trò như động cơ phản lực mini, cùng lớp đệm khí loại bỏ ma sát thủy động học.'
      }
    ]
  },
  {
    id: 'agcl_curdy_precipitation',
    title_en: 'Curdy Precipitation of Silver Chloride (AgNO3 + NaCl)',
    title_vi: 'Kết tủa Dạng Vón Bã Đậu của Bạc Clorua (AgNO3 + NaCl)',
    category: 'precipitation',
    difficulty: 'intermediate',
    objective_en: 'Observe the formation of authentic curd-like (flocculated cheese curds) precipitate of AgCl and test its coordination dissolution in aqueous ammonia.',
    objective_vi: 'Quan sát hiện tượng tạo kết tủa dạng bã đậu đặc trưng của AgCl và khảo sát sự hòa tan tạo phức chất tan với dung dịch amoniac.',
    theory_en: 'Silver ions react with chloride: Ag⁺ + Cl⁻ → AgCl↓. AgCl forms dense, clumping curd-like masses (Ksp = 1.8 × 10⁻¹⁰). Upon adding ammonia (NH3), AgCl dissolves by forming the soluble diamminesilver(I) complex: AgCl + 2NH₃ → [Ag(NH₃)₂]⁺ + Cl⁻.',
    theory_vi: 'Ion bạc kết hợp với ion clorua: Ag⁺ + Cl⁻ → AgCl↓. AgCl tạo kết tủa dạng vón cục bã đậu màu trắng đục. Khi thêm amoniac dư, kết tủa tan hoàn toàn tạo phức chất tan [Ag(NH₃)₂]⁺.',
    safetyAdvisory_en: 'AgNO3 causes black silver stains on skin upon light exposure. Wear nitrile gloves.',
    safetyAdvisory_vi: 'Dung dịch bạc nitrat làm đen da tay khi tiếp xúc với ánh sáng. Luôn đeo găng tay.',
    requiredEquipment: ['Graduated Cylinder', 'Beaker', 'Glass Stirring Rod'],
    allowedChemicals: ['AgNO3', 'NaCl', 'NH3', 'H2O'],
    simulationAlgorithm_en: `Flocculation Coagulation & Photolytic Disproportionation Model:
1. Fast Diffusion-Controlled Precipitation: Ag+ + Cl- -> AgCl(s) (Ksp = 1.77e-10).
2. Curdy DLVO Flocculation:
   Van der Waals attractive forces dominate electrostatic double-layer repulsion, forming chunky cheese-curd flocs.
3. Photolytic Darkening & Ammonia Redissolution:
   Photolysis under light 2AgCl + h*nu -> 2Ag(colloid) + Cl2 (purplish graying).
   Diammine complexation AgCl + 2NH3 -> [Ag(NH3)2]+ + Cl- (beta_2 = 1.7e7) clears turbidity to zero.`,
    simulationAlgorithm_vi: `Thuật toán Vón Cục DLVO & Phân Hủy Quang Hóa:
1. Kết tủa khuếch tán cực nhanh khi tích số ion Ag+ và Cl- vượt Ksp = 1.77e-10.
2. Lực hút Van der Waals thắng lực đẩy tĩnh điện kép tạo các khối kết tủa vón bã đậu (chunky curds).
3. Quang hóa dưới ánh sáng tạo hạt nano bạc Ag xám tím; hòa tan hoàn toàn tạo phức [Ag(NH3)2]+ khi thêm NH3.`,
    phenomenologyCases: [
      {
        id: 'agcl_curd_flocculation',
        name_en: 'Case 1: Thick Curd-like (Cheese Curd) Clumping',
        name_vi: 'Trường hợp 1: Kết tủa trắng vón cục bã đậu đặc trưng',
        description_en: 'Instant contact yields thick, chunky flocculated white curd masses reminiscent of cottage cheese, clustering together upon swirling.',
        description_vi: 'Vùng tiếp xúc xuất hiện ngay các khối kết tủa trắng vón cục dày xốp như bã đậu / phô mai tươi, tụ lại khi khuấy nhẹ.',
        algorithm: 'DLVO coagulation rate k_coag = 8*pi*D*R_agg; chunky morphology index.'
      },
      {
        id: 'agcl_ammonia_clearing',
        name_en: 'Case 2: Diamminesilver(I) Complex Dissolution',
        name_vi: 'Trường hợp 2: Hòa tan tạo phức chất tan diamminbạc(I) trong amoniac',
        description_en: 'Adding aqueous ammonia rapidly strips Ag+ from solid lattice, completely dissolving the thick curds into a crystal-clear solution.',
        description_vi: 'Rót dung dịch NH3 vào, các mảng kết tủa bã đậu tan biến hoàn toàn, dung dịch trở lại trong suốt không màu.',
        algorithm: 'Equilibrium dissolution: K_overall = Ksp * beta_2 ≈ 3.0e-3; turbidity tau -> 0.0.'
      },
      {
        id: 'agcl_photolytic_graying',
        name_en: 'Case 3: Ambient Photolytic Gray-Purple Tinting',
        name_vi: 'Trường hợp 3: Hóa tím xám do quang hóa dưới ánh sáng',
        description_en: 'Exposed to light, surface silver chloride undergoes photolytic reduction to metallic silver nanoparticles, tinting the curd surface purplish gray.',
        description_vi: 'Để ngoài ánh sáng, AgCl trên bề mặt bị khử quang hóa thành các hạt nano bạc kim loại làm kết tủa chuyển dần sang màu xám tím.',
        algorithm: 'Photochemical quantum yield Phi ≈ 0.2; surface chromophore darkening.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        action: 'MEASURE_VOLUME',
        targetVesselType: 'cylinder',
        targetChemical: 'AgNO3',
        targetAmount: 25,
        tolerance: 1.0,
        title_en: 'Measure Silver Nitrate in Cylinder',
        title_vi: 'Đong dung dịch Bạc Nitrat vào ống đong',
        instruction_en: 'Measure accurately 25.0 mL of AgNO3 solution into the graduated cylinder.',
        instruction_vi: 'Dùng ống đong đo chính xác 25.0 mL dung dịch AgNO3.',
        expectedResult_en: 'Clear colorless solution exactly at 25 mL mark.',
        expectedResult_vi: 'Dung dịch trong suốt không màu chạm vạch 25 mL.'
      },
      {
        stepNumber: 2,
        action: 'POUR',
        targetChemical: 'NaCl',
        targetAmount: 25,
        tolerance: 2.0,
        title_en: 'Add Sodium Chloride Reagent',
        title_vi: 'Thêm dung dịch Natri Clorua',
        instruction_en: 'Pour 25 mL of NaCl solution into the beaker containing AgNO3.',
        instruction_vi: 'Rót 25 mL dung dịch NaCl vào cốc chứa AgNO3.',
        expectedResult_en: 'Immediate spontaneous formation of thick, chunky white curds of AgCl precipitate!',
        expectedResult_vi: 'Xuất hiện tức thì các khối kết tủa trắng vón cục dạng bã đậu đặc trưng của AgCl!'
      },
      {
        stepNumber: 3,
        action: 'STIR',
        requiredTool: 'stirring_rod',
        title_en: 'Stir and Observe Curd Flocculation',
        title_vi: 'Khuấy và quan sát vón cục kết tủa',
        instruction_en: 'Use the glass stirring rod to agitate the curdy precipitate.',
        instruction_vi: 'Dùng đũa thủy tinh khuấy đều hỗn hợp kết tủa vón bã đậu.',
        expectedResult_en: 'The curd clusters swirl together into larger aggregates and slowly settle toward the beaker base.',
        expectedResult_vi: 'Các mảng kết tủa bã đậu tụ lại thành các cục lớn hơn và từ từ lắng xuống đáy cốc.'
      }
    ],
    quizzes: [
      {
        question_en: 'What unique morphological appearance distinguishes AgCl precipitate from fine barium sulfate?',
        question_vi: 'Đặc điểm hình thái nào phân biệt kết tủa AgCl với kết tủa bari sunfat BaSO4?',
        options_en: ['AgCl forms thick curd-like cheese clumps, while BaSO4 is a fine dispersed powder', 'AgCl is transparent liquid', 'AgCl forms golden hexagonal needles', 'AgCl floats like foam'],
        options_vi: ['AgCl kết tủa dạng vón cục bã đậu dày đặc, còn BaSO4 là dạng bột mịn phân tán', 'AgCl là chất lỏng trong suốt', 'AgCl tạo tinh thể hình kim màu vàng', 'AgCl nổi như bọt'],
        correctAnswer: 0,
        explanation_en: 'AgCl coagulates into thick flocculated curd-like aggregates (often compared to cottage cheese curds).',
        explanation_vi: 'AgCl vón tụ thành các mảng kết tủa dạng bã đậu (curdy precipitate) rất đặc trưng trong hóa phân tích.'
      }
    ]
  },
  {
    id: 'exothermic_neutralization',
    title_en: 'Thermochemistry: Enthalpy of Neutralization (HCl + NaOH)',
    title_vi: 'Nhiệt Hóa Học: Hiệu Ứng Nhiệt Phản Ứng Trung Hòa (HCl + NaOH)',
    category: 'thermal',
    difficulty: 'intermediate',
    objective_en: 'Measure the temperature rise (ΔT) during acid-base neutralization and study the thermometer thermal lag.',
    objective_vi: 'Đo độ tăng nhiệt độ (ΔT) khi trung hòa axit clohiđric bằng natri hiđroxit và quan sát độ trễ truyền nhiệt của nhiệt kế.',
    theory_en: 'Neutralization of a strong acid by a strong base is strongly exothermic: H⁺(aq) + OH⁻(aq) → H₂O(l), ΔH = -57.1 kJ/mol. The released heat raises the solution temperature by approximately 10 to 14 °C depending on concentrations.',
    theory_vi: 'Phản ứng trung hòa giữa axit mạnh và bazơ mạnh tỏa nhiệt lớn: H⁺ + OH⁻ → H₂O, ΔH = -57.1 kJ/mol. Lượng nhiệt giải phóng làm nhiệt độ dung dịch tăng từ 10 đến 14 °C.',
    safetyAdvisory_en: 'Solution warms up rapidly. Avoid skin contact with caustic NaOH.',
    safetyAdvisory_vi: 'Nhiệt độ dung dịch tăng nhanh. Tránh tiếp xúc trực tiếp với dung dịch kiềm nóng.',
    requiredEquipment: ['Digital Thermometer', 'Beaker (x2)', 'Glass Stirring Rod'],
    allowedChemicals: ['HCl (dil)', 'NaOH', 'H2O'],
    simulationAlgorithm_en: `Calorimetric Enthalpy & Sensor Thermal Lag ODE:
1. Instantaneous Neutralization Exotherm: H+ + OH- -> H2O (Delta H° = -57.1 kJ/mol).
2. Lumped Heat Balance:
   Delta T_ideal = n_rxn * (-Delta H°) / (m_total * C_p).
3. First-Order Thermometer Sensor Lag:
   dT_sensor/dt = (T_fluid - T_sensor) / tau_probe (probe time constant tau_probe ≈ 1.2 s).
   Solution remains clear colorless liquid with zero effervescence while temperature reading climbs.`,
    simulationAlgorithm_vi: `Thuật toán Nhiệt Lượng Kế & Độ Trễ Cảm Biến:
1. Phản ứng trung hòa giải phóng nhiệt lượng tiêu chuẩn Delta H° = -57.1 kJ/mol.
2. Cân bằng nhiệt dung tính độ tăng nhiệt độ Delta T lý thuyết dựa trên khối lượng dung dịch và nhiệt dung riêng.
3. Phương trình vi phân bậc một mô phỏng độ trễ truyền nhiệt của đầu đo nhiệt kế (tau ≈ 1.2 s).`,
    phenomenologyCases: [
      {
        id: 'neutralization_calorific_spike',
        name_en: 'Case 1: Sudden Temperature Climb & Dynamic Thermal Lag',
        name_vi: 'Trường hợp 1: Nhiệt độ tăng vọt & đầu đo cảm ứng nhiệt theo thời gian thực',
        description_en: 'Thermometer probe reading jumps swiftly from ambient 25.0°C toward ~38.0°C over 2-3 seconds following first-order thermal conduction lag.',
        description_vi: 'Chỉ số nhiệt kế nhảy vọt từ 25.0°C lên ~38.0°C trong vòng 2-3 giây mô phỏng chính xác độ trễ dẫn nhiệt của cảm biến kim loại.',
        algorithm: 'First-order thermal lag T_sensor(t) = T_final + (T_0 - T_final)*exp(-t / tau); tau = 1.2s.'
      },
      {
        id: 'neutralization_optical_clarity',
        name_en: 'Case 2: Pure Colorless Optical Quiescence',
        name_vi: 'Trường hợp 2: Dung dịch tĩnh lặng trong suốt không màu',
        description_en: 'Unlike effervescent or precipitation reactions, the liquid remains 100% transparent and clear with no bubble formation or turbidity.',
        description_vi: 'Không có hiện tượng sủi bọt hay kết tủa; dung dịch vẫn giữ độ trong veo tĩnh lặng hoàn toàn, phản ứng diễn ra vô hình ngoài độ tăng nhiệt.',
        algorithm: 'Transmittance T = 1.0; turbidity tau = 0.0; gas evolution flux = 0.'
      },
      {
        id: 'neutralization_convective_cooling',
        name_en: 'Case 3: Glass Heat Conduction & Newton Ambient Decay',
        name_vi: 'Trường hợp 3: Truyền nhiệt qua thành thủy tinh & nguội dần theo định luật Newton',
        description_en: 'Thermal energy transfers through thin beaker walls to laboratory air; temperature decays asymptotically back to ambient 25°C.',
        description_vi: 'Nhiệt lượng tỏa qua thành cốc thủy tinh ra không khí phòng; nhiệt độ từ từ giảm theo đường cong hàm mũ về 25°C.',
        algorithm: 'Newton cooling: dT/dt = -k_cool * (T - T_ambient); k_cool ≈ 0.005 s^-1.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        action: 'MEASURE_TEMPERATURE',
        requiredTool: 'thermometer',
        title_en: 'Record Initial Ambient Temperature',
        title_vi: 'Đo nhiệt độ ban đầu của dung dịch',
        instruction_en: 'Equip the digital thermometer and measure the initial temperature of 40 mL HCl in Beaker 1 (~25.0 °C).',
        instruction_vi: 'Cầm nhiệt kế điện tử và nhúng vào cốc chứa 40 mL dung dịch HCl để ghi nhận nhiệt độ ban đầu (~25.0 °C).',
        expectedResult_en: 'Stable ambient room temperature display of ~25.0 °C.',
        expectedResult_vi: 'Đồng hồ nhiệt kế hiển thị nhiệt độ phòng ổn định ~25.0 °C.'
      },
      {
        stepNumber: 2,
        action: 'POUR',
        targetChemical: 'NaOH',
        targetAmount: 40,
        tolerance: 2.0,
        title_en: 'Pour Sodium Hydroxide into Acid',
        title_vi: 'Rót dung dịch Natri Hiđroxit vào cốc Axit',
        instruction_en: 'Pour 40 mL of NaOH into the beaker containing HCl while observing the thermometer reading.',
        instruction_vi: 'Rót 40 mL dung dịch NaOH vào cốc axit và quan sát chỉ số nhiệt độ.',
        expectedResult_en: 'Rapid temperature climb from 25 °C up to ~38 °C due to ΔH = -57.1 kJ/mol!',
        expectedResult_vi: 'Nhiệt độ tăng vọt từ 25 °C lên đến ~38 °C do nhiệt lượng tỏa ra từ phản ứng trung hòa!'
      },
      {
        stepNumber: 3,
        action: 'MEASURE_PH',
        requiredTool: 'ph_meter',
        title_en: 'Verify Neutral pH with pH Meter',
        title_vi: 'Kiểm tra độ pH trung tính bằng máy đo pH',
        instruction_en: 'Select the digital pH meter and verify the neutralized mixture reaches pH ~ 7.0.',
        instruction_vi: 'Chọn máy đo pH và xác nhận dung dịch sau trung hòa đạt pH ~ 7.0.',
        expectedResult_en: 'Digital pH meter reads approximately 7.0 with green neutral indicator light.',
        expectedResult_vi: 'Máy đo pH hiển thị xấp xỉ 7.0 cùng đèn báo trung tính màu xanh lá.'
      }
    ],
    quizzes: [
      {
        question_en: 'What is the standard molar enthalpy of neutralization for strong acid with strong base?',
        question_vi: 'Nhiệt trung hòa tiêu chuẩn của một axit mạnh với một bazơ mạnh là bao nhiêu?',
        options_en: ['-57.1 kJ/mol', '+57.1 kJ/mol', '0 kJ/mol', '-285.8 kJ/mol'],
        options_vi: ['-57.1 kJ/mol (tỏa nhiệt)', '+57.1 kJ/mol (thu nhiệt)', '0 kJ/mol', '-285.8 kJ/mol'],
        correctAnswer: 0,
        explanation_en: 'The net reaction H⁺ + OH⁻ → H₂O consistently releases 57.1 kJ of heat per mole of water formed.',
        explanation_vi: 'Phản ứng ion thu gọn H⁺ + OH⁻ → H₂O luôn tỏa ra 57.1 kJ nhiệt lượng trên mỗi mol nước tạo thành.'
      }
    ]
  },
  {
    id: 'zn_hcl_hydrogen_production',
    title_en: 'Hydrogen Gas Generation & Pop-Sound Test (Zn + HCl)',
    title_vi: 'Điều chế Khí Hiđro từ Kẽm và Axit Clohiđric (Zn + HCl)',
    category: 'gas',
    difficulty: 'basic',
    objective_en: 'Produce flammable hydrogen gas from metallic zinc and hydrochloric acid, observing nucleate bubble streams, surface metal pitting, and characteristic acoustic pop.',
    objective_vi: 'Điều chế khí hiđro bằng phản ứng giữa kẽm hạt và axit clohiđric, quan sát các luồng bọt khí sủi từ bề mặt kim loại, sự ăn mòn kẽm và thử tiếng nổ "bốp" đặc trưng.',
    theory_en: 'Active metals react with non-oxidizing acids: Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂(g)↑ (ΔH° = -152.4 kJ/mol). Bubbles nucleate strictly from microscopic surface fissures on the zinc granules, breaking off as buoyant microbubbles.',
    theory_vi: 'Kim loại hoạt động đứng trước hiđro khử ion H+: Zn + 2HCl → ZnCl₂ + H₂↑ (ΔH° = -152.4 kJ/mol). Bọt khí H2 sinh ra trực tiếp từ các vết rỗ tế vi trên bề mặt hạt kẽm, nổi lên nhanh do nhẹ hơn nước rất nhiều.',
    safetyAdvisory_en: 'FLAMMABLE GAS: Hydrogen forms explosive mixtures with air. Keep away from naked flames except during controlled pop tests.',
    safetyAdvisory_vi: 'KHÍ DỄ CHÁY NỔ: Hỗn hợp khí hiđro và oxi/không khí nổ mạnh khi bén lửa. Tránh xa các nguồn nhiệt hở.',
    requiredEquipment: ['Test Tube / Flask', 'Graduated Cylinder', 'Spatula'],
    allowedChemicals: ['Zn', 'HCl (dil)', 'H2O'],
    simulationAlgorithm_en: `Heterogeneous Solid-Liquid Gas Evolution Algorithm:
1. Pitting Nucleation: Bubble emission sites are anchored to the solid Zn boundary vertices.
2. Gas generation rate: r = k(T) * [H+]^1.2 * A_surface(t), where A_surface shrinks as m(t)^(2/3).
3. Buoyancy & Wobble: Mendelson rise dynamics with lateral zigzag oscillation (Strouhal number St ≈ 0.22).
4. Audio: High-frequency cavitation sizzle combined with Minnaert surface pops f = 3260 / R_mm (Hz).`,
    simulationAlgorithm_vi: `Thuật toán Mô phỏng Khí Thoát từ Bề mặt Dị thể:
1. Tạo mầm bọt khí từ các vết rỗ trên bề mặt chất rắn kẽm.
2. Tốc độ sinh khí: r = k(T) * [H+]^1.2 * A_bề_mặt, diện tích bề mặt giảm dần theo quy luật m(t)^(2/3).
3. Nổi & Dao động ziczac theo phương trình Mendelson kết hợp xoáy Strouhal St ≈ 0.22.
4. Âm thanh rít bọt khí cùng tiếng nổ vỡ bọt khí Minnaert f = 3260 / R_mm (Hz).`,
    phenomenologyCases: [
      {
        id: 'zn_nucleate_stream',
        name_en: 'Case 1: Micro-Fissure Nucleation Stream',
        name_vi: 'Trường hợp 1: Luồng bọt khí mọc từ vết rỗ bề mặt kẽm',
        description_en: 'Fine streams of hydrogen bubbles emanate exclusively from the zinc coupon surface, accelerating upward as hydrostatic pressure drops.',
        description_vi: 'Các chuỗi bọt khí hiđro li ti mọc liên tục từ bề mặt hạt kẽm, phóng vụt lên mặt nước.',
        algorithm: 'Solid-anchored particle spawn; Mendelson buoyant ascent; hydrostatic expansion.'
      },
      {
        id: 'zn_exothermic_warmup',
        name_en: 'Case 2: Exothermic Thermal Feedback',
        name_vi: 'Trường hợp 2: Nhiệt tỏa làm ấm dung dịch và tăng tốc sinh khí',
        description_en: 'As the reaction proceeds, ΔH = -152 kJ/mol warms the liquid by 4-8°C, accelerating the Arrhenius reaction rate.',
        description_vi: 'Nhiệt phản ứng tỏa ra làm ấm dung dịch thêm 4-8°C, thúc đẩy tốc độ sinh khí nhanh hơn theo định luật Arrhenius.',
        algorithm: 'Coupled lumped thermal ODE: dT/dt = r*(-ΔH) / (m*Cp).'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Add Zinc Granules to Test Tube',
        title_vi: 'Cho kẽm hạt vào ống nghiệm',
        instruction_en: 'Add solid zinc metal granules into Test Tube 1.',
        instruction_vi: 'Cho vài hạt kẽm kim loại màu xám bạc vào Ống nghiệm 1.',
        expectedResult_en: 'Grey metallic granules resting at the bottom.',
        expectedResult_vi: 'Các hạt kẽm màu xám kim loại ở đáy ống nghiệm.'
      },
      {
        stepNumber: 2,
        title_en: 'Add Dilute Hydrochloric Acid',
        title_vi: 'Rót axit clohiđric loãng vào',
        instruction_en: 'Pour 20 mL of dilute HCl into the test tube containing zinc.',
        instruction_vi: 'Rót 20 mL dung dịch axit HCl loãng vào ống nghiệm chứa kẽm.',
        expectedResult_en: 'Immediate vigorous effervescence: streams of hydrogen bubbles rise rapidly to the surface with audible fizzing!',
        expectedResult_vi: 'Sủi bọt khí mãnh liệt tức thì: các luồng bọt khí hiđro phóng lên bề mặt kèm tiếng xèo xèo vui tai!'
      }
    ],
    quizzes: [
      {
        question_en: 'What acoustic sound does hydrogen gas make when ignited in a small test tube?',
        question_vi: 'Khí hiđro khi đốt trong ống nghiệm nhỏ phát ra âm thanh gì đặc trưng?',
        options_en: ['A distinct squeaky "pop" or miniature detonation sound', 'A silent flash with zero sound', 'A continuous deep trumpet note', 'A crackling electrical buzz'],
        options_vi: ['Tiếng nổ "bốp" hoặc tiếng lách tách nhỏ đặc trưng', 'Cháy êm đềm không có âm thanh', 'Phát ra tiếng trầm ngân vang', 'Tiếng rè rè như chập điện'],
        correctAnswer: 0,
        explanation_en: 'Small amounts of hydrogen mixing with air burn with an instantaneous rapid wave, creating a characteristic squeaky pop sound.',
        explanation_vi: 'Lượng nhỏ khí hiđro lẫn không khí khi bắt lửa cháy cực nhanh tạo sóng áp suất sinh ra tiếng nổ "bốp" đặc trưng.'
      }
    ]
  },
  {
    id: 'landolt_iodine_clock',
    title_en: 'Landolt Iodine Clock Reaction (Sudden Midnight Blue Flip)',
    title_vi: 'Đồng Hồ Iốt Landolt (Phản ứng Biến Đổi Màu Xanh Đen Đột Ngột)',
    category: 'redox',
    difficulty: 'advanced',
    objective_en: 'Demonstrate chemical kinetics and dramatic threshold color flip from crystal clear to dark midnight blue using iodate, bisulfite, and starch indicator.',
    objective_vi: 'Khảo sát động hóa học và hiện tượng đổi màu ngưỡng đột ngột từ trong suốt không màu sang xanh đen thẫm của phản ứng đồng hồ iốt Landolt.',
    theory_en: 'Two competing reactions occur: Slow oxidation (IO₃⁻ + 3HSO₃⁻ → I⁻ + 3SO₄²⁻ + 3H⁺) and Fast reduction (IO₃⁻ + 8I⁻ + 6H⁺ → 3I₃⁻ + 3H₂O). As long as bisulfite (HSO₃⁻) is present, triiodide is immediately reduced back to iodide. The instant bisulfite is exhausted, free iodine persists and instantly binds to amylose starch coils, flipping the solution to opaque blue-black in less than 0.1 seconds!',
    theory_vi: 'Phản ứng gồm hai giai đoạn cạnh tranh: Phản ứng chậm sinh I- và phản ứng nhanh tạo I2. Chừng nào còn chất khử bisunfit HSO3-, iot sinh ra bị khử ngược lại tức thì về I-. Ngay khi HSO3- vừa cạn kiệt hoàn toàn, iot tự do lập tức tích tụ và chui vào chuỗi xoắn amylose của hồ tinh bột, chuyển toàn bộ dung dịch sang màu xanh đen thẫm chỉ trong chưa đầy 0.1 giây!',
    safetyAdvisory_en: 'Handle reagents with care. Starch indicator should be freshly prepared for high contrast.',
    safetyAdvisory_vi: 'Cẩn thận khi thao tác với hóa chất. Hồ tinh bột dùng chỉ thị cần sạch để màu sắc rõ nét.',
    requiredEquipment: ['Beaker (x2)', 'Glass Stirring Rod', 'Digital Stopwatch'],
    allowedChemicals: ['KIO3', 'NaHSO3', 'Starch', 'H2O'],
    simulationAlgorithm_en: `Chemical Clock Induction & Step-Function Kinetics:
1. Dual-Rate Integrator:
   d[HSO3-]/dt = -k1 * [IO3-] * [HSO3-].
   [I2]_free = max(0, cumulative_I2 - stoichiometry * initial_[HSO3-]).
2. Threshold Heaviside Step Function:
   While [HSO3-] > 0: Absorbance A(λ) = 0 (solution remains water-clear).
   When [HSO3-] <= 0: Instantaneous flip (tau < 0.08 s) to amylose-I5- helical complex (extinction epsilon_600nm = 40,000 M^-1 cm^-1).
3. Convective Dispersion: Front propagates as a rapid color wave throughout the liquid volume.`,
    simulationAlgorithm_vi: `Thuật toán Động học Đồng hồ Hóa học & Bước nhảy Heaviside:
1. Hệ tích phân hai tốc độ phản ứng cạnh tranh:
   d[HSO3-]/dt = -k1 * [IO3-] * [HSO3-].
   Nồng độ I2 tự do = max(0, tổng I2 sinh ra - lượng tiêu thụ bởi HSO3-).
2. Hàm bước nhảy Heaviside kích hoạt đổi màu:
   Khi [HSO3-] > 0: Độ hấp thụ quang A = 0 (dung dịch hoàn toàn trong suốt).
   Khi [HSO3-] <= 0: Chuyển màu tức thì (< 0.08 s) thành phức chất amylose-I5- màu xanh đen thẫm.
3. Sóng màu lan truyền cuộn trào khắp thể tích dung dịch.`,
    phenomenologyCases: [
      {
        id: 'clock_induction_phase',
        name_en: 'Case 1: Colorless Induction Lag',
        name_vi: 'Trường hợp 1: Pha cảm ứng trong suốt không màu',
        description_en: 'Solution stays perfectly clear and motionless for 10-25 seconds while bisulfite scavenges all evolved iodine.',
        description_vi: 'Dung dịch hoàn toàn trong suốt không màu trong 10-25 giây đầu do bisunfit dọn sạch mọi ion iot sinh ra.',
        algorithm: 'Zero visual absorption; internal stoichiometric consumption tracking.'
      },
      {
        id: 'clock_instant_flip',
        name_en: 'Case 2: Sub-second Midnight Blue Flip',
        name_vi: 'Trường hợp 2: Bước nhảy màu xanh đen trong tích tắc',
        description_en: 'The moment bisulfite drops to zero, the entire volume flips to deep midnight blue in a fraction of a second.',
        description_vi: 'Khoảnh khắc chất khử cạn kiệt, toàn bộ cốc dung dịch đổi màu chớp nhoáng sang xanh đen huyền bí.',
        algorithm: 'Step-function optical extinction jump; color wave interpolation.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Prepare Iodate and Starch Solution',
        title_vi: 'Chuẩn bị dung dịch Kali Iodat và hồ tinh bột',
        instruction_en: 'Pour 30 mL of KIO3 solution into Beaker 1 and add 5 mL of Starch indicator solution.',
        instruction_vi: 'Rót 30 mL dung dịch KIO3 vào Cốc 1 và thêm 5 mL hồ tinh bột.',
        expectedResult_en: 'Colorless, transparent solution.',
        expectedResult_vi: 'Dung dịch trong suốt không màu.'
      },
      {
        stepNumber: 2,
        title_en: 'Pour Bisulfite Reagent & Start Clock',
        title_vi: 'Rót dung dịch Natri Bisunfit & Bắt đầu tính giờ',
        instruction_en: 'Pour 30 mL of NaHSO3 solution into the beaker, stir briefly, and observe the clock countdown.',
        instruction_vi: 'Rót 30 mL dung dịch NaHSO3 vào cốc, khuấy nhẹ và đếm ngược thời gian.',
        expectedResult_en: 'Remains completely colorless for several seconds, then instantaneously flips into dark midnight-blue in less than 0.1s!',
        expectedResult_vi: 'Dung dịch giữ nguyên không màu trong vài giây, sau đó đột ngột đổi sang màu xanh đen thẫm chỉ trong tích tắc!'
      }
    ],
    quizzes: [
      {
        question_en: 'Why does the solution remain colorless before suddenly turning dark blue in the iodine clock?',
        question_vi: 'Tại sao dung dịch giữ nguyên không màu trước khi bất ngờ đổi sang màu xanh đen?',
        options_en: ['Bisulfite immediately reduces any formed iodine back to iodide until bisulfite is completely consumed', 'The chemicals need time to dissolve completely', 'Light is required to activate the reaction', 'Starch repels iodine initially'],
        options_vi: ['Chất khử bisunfit tiêu thụ tức thì lượng iot sinh ra cho đến khi cạn kiệt hoàn toàn', 'Các chất cần thời gian hòa tan hết', 'Cần ánh sáng kích hoạt phản ứng', 'Hồ tinh bột lúc đầu đẩy iot'],
        correctAnswer: 0,
        explanation_en: 'Bisulfite acts as a sacrificial scavenger that consumes iodine until it runs out, at which point free iodine instantly binds starch.',
        explanation_vi: 'Bisunfit đóng vai trò chất dọn dẹp iot; khi bisunfit hết nhẵn, iot tự do tích tụ và lập tức kết hợp với hồ tinh bột.'
      }
    ]
  },
  {
    id: 'fe_kscn_chemical_equilibrium',
    title_en: 'Chemical Equilibrium & Blood-Red Complex (FeCl3 + KSCN)',
    title_vi: 'Cân Bằng Hóa Học & Phức Chất Đỏ Máu (FeCl3 + KSCN)',
    category: 'redox',
    difficulty: 'intermediate',
    objective_en: 'Investigate dynamic chemical equilibrium and Le Chatelier principle using the iron(III) thiocyanate blood-red complex system.',
    objective_vi: 'Khảo sát cân bằng hóa học động và nguyên lý chuyển dịch cân bằng Le Chatelier qua hệ phức chất sắt(III) thioxianat màu đỏ máu.',
    theory_en: 'A classic homogeneous reversible complexation equilibrium: Fe³⁺(aq) (yellow-brown) + SCN⁻(aq) (colorless) ⇌ [Fe(SCN)]²⁺(aq) (intense blood-red), K_eq ≈ 890 M⁻¹. Adding reactants or products shifts the equilibrium according to Le Chatelier principle, visibly deepening or fading the crimson color intensity.',
    theory_vi: 'Cân bằng tạo phức chất thuận nghịch kinh điển: Fe³⁺ (vàng nâu) + SCN⁻ (không màu) ⇌ [Fe(SCN)]²⁺ (đỏ máu), K_cb ≈ 890 M⁻¹. Khi thay đổi nồng độ các cấu tử, cân bằng chuyển dịch theo nguyên lý Le Chatelier làm đậm hoặc nhạt màu đỏ máu.',
    safetyAdvisory_en: 'FeCl3 is acidic and stains glassware. Wear nitrile gloves and safety goggles.',
    safetyAdvisory_vi: 'Dung dịch FeCl3 có tính axit và dễ bám màu. Luôn đeo găng tay và kính bảo hộ.',
    requiredEquipment: ['Beaker (x2)', 'Test Tube Rack', 'Glass Stirring Rod'],
    allowedChemicals: ['FeCl3', 'KSCN', 'H2O'],
    simulationAlgorithm_en: `Reversible Complexation & Spectrophotometric Law:
1. Exact Quadratic Equilibrium Solve:
   [Fe(SCN)2+] = ((c_Fe + c_SCN + 1/K_eq) - sqrt((c_Fe + c_SCN + 1/K_eq)^2 - 4*c_Fe*c_SCN)) / 2.
2. Beer-Lambert Extinction:
   A(500nm) = epsilon * [Fe(SCN)2+] * path_length (epsilon ≈ 4700 M^-1 cm^-1).
3. Dynamic Color Interpolation:
   RGB interpolates from dilute amber #d97706 to intense ruby/blood-red #991b1b.`,
    simulationAlgorithm_vi: `Thuật toán Giải Cân Bằng Thuận Nghịch & Định luật Beer-Lambert:
1. Giải chính xác phương trình bậc hai nồng độ cân bằng của phức chất [Fe(SCN)]2+.
2. Tính độ hấp thụ quang theo định luật Beer-Lambert: A = ε * C * l (ε ≈ 4700 M^-1 cm^-1 tại 500 nm).
3. Nội suy màu sắc RGB thực tế từ vàng hổ phách #d97706 sang đỏ máu hồng ngọc #991b1b.`,
    phenomenologyCases: [
      {
        id: 'fe_kscn_dilute_amber',
        name_en: 'Case 1: Uncomplexed Amber Reactant Phase',
        name_vi: 'Trường hợp 1: Pha chất phản ứng vàng hổ phách chưa tạo phức',
        description_en: 'Dilute FeCl3 solution exists predominantly as hydrated [Fe(H2O)6]3+ ions giving a faint translucent amber-yellow hue.',
        description_vi: 'Dung dịch FeCl3 loãng chứa chủ yếu ion [Fe(H2O)6]3+ có màu vàng rơm hổ phách trong suốt.',
        algorithm: 'Absorbance A = ε_Fe3+ * [Fe3+] * l; minimal visible absorbance (A < 0.05).'
      },
      {
        id: 'fe_kscn_blood_red_complex',
        name_en: 'Case 2: Blood-Red Charge-Transfer Complex Formation',
        name_vi: 'Trường hợp 2: Tạo phức chất chuyển dịch điện tích đỏ máu rực rỡ',
        description_en: 'Adding SCN- triggers ligand substitution yielding [Fe(H2O)5(SCN)]2+, producing an intense blood-red charge-transfer absorption band at 458 nm.',
        description_vi: 'Thêm SCN- thế phối tử tạo [Fe(H2O)5(SCN)]2+, dải hấp thụ chuyển dịch điện tích cực mạnh tại 458 nm biến dung dịch thành màu đỏ máu.',
        algorithm: 'Beer-Lambert A(458nm) = 4700 * [Fe(SCN)2+] * l; dynamic color interpolation into saturated ruby crimson.'
      },
      {
        id: 'fe_kscn_le_chatelier_shift',
        name_en: 'Case 3: Le Chatelier Equilibrium Shift under Perturbation',
        name_vi: 'Trường hợp 3: Chuyển dịch cân bằng Le Chatelier khi thay đổi nồng độ',
        description_en: 'Perturbing the system by adding excess Fe3+ or SCN- shifts the equilibrium right, darkening the color; dilution or fluoride addition shifts it left, fading the red hue.',
        description_vi: 'Khi thêm Fe3+ hoặc SCN-, cân bằng dịch chuyển sang phải làm đậm màu; khi pha loãng hoặc thêm ion F-, cân bằng dịch sang trái làm nhạt màu đỏ.',
        algorithm: 'Analytical quadratic equilibrium solve: [Fe(SCN)2+] = ((c1+c2+1/K) - sqrt((c1+c2+1/K)^2 - 4*c1*c2))/2.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Add Dilute Iron(III) Chloride',
        title_vi: 'Rót dung dịch Sắt(III) Clorua loãng',
        instruction_en: 'Pour 25 mL of FeCl3 solution into Beaker 1.',
        instruction_vi: 'Rót 25 mL dung dịch FeCl3 vào Cốc 1.',
        expectedResult_en: 'Pale yellow-amber transparent solution.',
        expectedResult_vi: 'Dung dịch màu vàng rơm trong suốt.'
      },
      {
        stepNumber: 2,
        title_en: 'Add Potassium Thiocyanate Reagent',
        title_vi: 'Thêm dung dịch Kali Thioxianat',
        instruction_en: 'Add 25 mL of KSCN solution and stir gently.',
        instruction_vi: 'Rót tiếp 25 mL dung dịch KSCN vào cốc và khuấy nhẹ.',
        expectedResult_en: 'Instant transformation into an intense, deep blood-red [Fe(SCN)]²⁺ complex solution!',
        expectedResult_vi: 'Dung dịch chuyển tức thì sang màu đỏ máu rực rỡ đặc trưng của phức chất [Fe(SCN)]²⁺!'
      }
    ],
    quizzes: [
      {
        question_en: 'What happens to the color intensity if more KSCN is added to the equilibrium mixture?',
        question_vi: 'Màu đỏ máu thay đổi như thế nào nếu thêm tiếp dung dịch KSCN vào hệ cân bằng?',
        options_en: ['The red color intensifies because the equilibrium shifts forward to produce more [Fe(SCN)]2+', 'The solution turns green', 'The color turns colorless', 'A gas evolves'],
        options_vi: ['Màu đỏ đậm hơn do cân bằng chuyển dịch theo chiều thuận tạo thêm phức chất [Fe(SCN)]2+', 'Dung dịch chuyển sang màu xanh lục', 'Dung dịch mất màu hoàn toàn', 'Sủi bọt khí'],
        correctAnswer: 0,
        explanation_en: 'According to Le Chatelier principle, adding a reactant (SCN-) shifts equilibrium right, forming more blood-red [Fe(SCN)]2+.',
        explanation_vi: 'Theo nguyên lý Le Chatelier, thêm chất phản ứng (SCN-) làm cân bằng chuyển dịch sang phải, tạo thêm phức màu đỏ máu.'
      }
    ]
  },
  {
    id: 'copper_ammonia_deep_blue',
    title_en: 'Coordination Chemistry: Copper-Ammonia Complexation',
    title_vi: 'Hóa Học Phức Chất: Đồng - Amoniac Màu Xanh Thẫm',
    category: 'precipitation',
    difficulty: 'intermediate',
    objective_en: 'Observe the multi-stage coordination transformation of copper(II) ions: pale blue hydroxide precipitation followed by dissolution into crystal-clear royal blue tetraamminecopper(II).',
    objective_vi: 'Khảo sát chuyển hóa phức chất hai giai đoạn của ion đồng(II): kết tủa keo lam nhạt Cu(OH)2 rồi tan hoàn toàn trong amoniac dư thành dung dịch xanh lam thẫm trong suốt.',
    theory_en: 'Stage 1 (Precipitation): Cu²⁺ + 2NH₃ + 2H₂O → Cu(OH)₂↓ + 2NH₄⁺ (light sky-blue gelatinous floc). Stage 2 (Complexation with excess NH3): Cu(OH)₂ + 4NH₃ → [Cu(NH₃)₄]²⁺ + 2OH⁻ (dissolves into brilliant transparent deep royal/ultramarine blue complex, log beta_4 = 13.1).',
    theory_vi: 'Giai đoạn 1 (Tạo kết tủa): Cu²⁺ + 2NH₃ + 2H₂O → Cu(OH)₂↓ + 2NH₄⁺ (kết tủa keo lam nhạt). Giai đoạn 2 (Tạo phức tan với NH3 dư): Cu(OH)₂ + 4NH₃ → [Cu(NH₃)₄]²⁺ + 2OH⁻ (kết tủa tan hoàn toàn tạo dung dịch phức chất màu xanh thẫm hoàng gia lộng lẫy).',
    safetyAdvisory_en: 'Ammonia fumes are pungent and irritate eyes and airways. Use in ventilated area.',
    safetyAdvisory_vi: 'Amoniac có mùi khai nồng, gây kích ứng mắt và mũi. Thao tác ở nơi thoáng khí.',
    requiredEquipment: ['Beaker (x2)', 'Glass Stirring Rod', 'Pipette'],
    allowedChemicals: ['CuSO4', 'NH3', 'H2O'],
    simulationAlgorithm_en: `Multi-Stage Ligand Exchange & Gel Dissolution:
1. Stage 1 (0 < progress < 0.4): Precipitation rate r_ppt dominates, turbidity increases to tau = 0.85 (sky-blue gel).
2. Stage 2 (0.4 < progress < 1.0): Excess NH3 ligand dissolves gel network via stability constant beta_4 = 1.3e13.
3. Turbidity drops back to 0.0 (crystal-clear) while absorption shifts from light blue (#38bdf8) to deep royal blue (#1d4ed8).`,
    simulationAlgorithm_vi: `Thuật toán Phức Chất Nhiều Giai Đoạn & Hòa Tan Keo:
1. Giai đoạn 1 (tiến độ < 0.4): Tạo kết tủa keo xanh da trời Cu(OH)2, độ đục tăng cao đến tau = 0.85.
2. Giai đoạn 2 (tiến độ 0.4 - 1.0): Phối tử NH3 dư hòa tan mạng lưới keo theo hằng số bền beta_4 = 1.3e13.
3. Độ đục giảm hoàn toàn về 0 (trong suốt như pha lê), màu dung dịch chuyển sang xanh lam thẫm quý tộc (#1d4ed8).`,
    phenomenologyCases: [
      {
        id: 'cu_nh3_gel_precipitation',
        name_en: 'Case 1: Basic Hydroxide Gel Flocculation',
        name_vi: 'Trường hợp 1: Tạo kết tủa keo hydroxit lam nhạt',
        description_en: 'Initial addition of NH3 acts as a weak base, forming gelatinous sky-blue copper(II) hydroxide flakes Cu(OH)2(s) with turbidity rising to tau = 0.85.',
        description_vi: 'Nhỏ amoniac ban đầu đóng vai trò bazơ yếu tạo kết tủa keo Cu(OH)2 màu xanh da trời làm đục dung dịch.',
        algorithm: 'Precipitation kinetics r_ppt = k_ppt * ([Cu2+][OH-]^2 - Ksp); flocculation aggregation.'
      },
      {
        id: 'cu_nh3_tetraammine_dissolution',
        name_en: 'Case 2: Tetraammine Complexation & Crystal-Clear Dissolution',
        name_vi: 'Trường hợp 2: Tạo phức chất tứ ammin hòa tan trong suốt',
        description_en: 'With excess NH3, coordination complexation dominates: [Cu(H2O)6]2+ and Cu(OH)2 dissolve completely into intensely colored sapphire/royal blue [Cu(NH3)4(H2O)2]2+.',
        description_vi: 'Khi dư NH3, phản ứng tạo phức chiếm ưu thế: kết tủa Cu(OH)2 tan hết thành phức chất [Cu(NH3)4(H2O)2]2+ màu xanh thẫm hoàng gia trong suốt.',
        algorithm: 'Stepwise formation equilibrium: log beta_4 = 13.1; turbidity tau -> 0.00; molar absorptivity epsilon(610nm) = 55 M^-1 cm^-1.'
      },
      {
        id: 'cu_nh3_acid_reversal',
        name_en: 'Case 3: Acid Protonation & Re-precipitation Reversal',
        name_vi: 'Trường hợp 3: Thêm axit làm phân hủy phức chất tạo lại kết tủa',
        description_en: 'Adding dilute acid protonates NH3 to NH4+, stripping ligands and briefly reprecipitating Cu(OH)2 before full dissolution to hydrated Cu2+.',
        description_vi: 'Thêm axit làm proton hóa NH3 thành NH4+, phá vỡ phức chất làm xuất hiện lại kết tủa Cu(OH)2 trước khi tan hoàn toàn về ion Cu2+.',
        algorithm: 'Competitive protonation equilibrium: NH3 + H+ ⇌ NH4+ (pKa = 9.25).'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Prepare Blue Copper Sulfate Solution',
        title_vi: 'Lấy dung dịch Đồng Sunfat',
        instruction_en: 'Pour 30 mL of blue CuSO4 solution into Beaker 1.',
        instruction_vi: 'Rót 30 mL dung dịch CuSO4 màu xanh lam vào Cốc 1.',
        expectedResult_en: 'Clear royal blue solution.',
        expectedResult_vi: 'Dung dịch màu xanh lam trong suốt.'
      },
      {
        stepNumber: 2,
        title_en: 'Add Aqueous Ammonia Gradually',
        title_vi: 'Nhỏ từ từ dung dịch Amoniac',
        instruction_en: 'Add aqueous ammonia drop by drop while stirring, observing initial precipitation then complete redissolution.',
        instruction_vi: 'Rót từ từ dung dịch amoniac NH3 vào cốc và khuấy đều, quan sát kết tủa lam xuất hiện rồi tan biến.',
        expectedResult_en: 'First a light blue precipitate appears, which upon adding excess ammonia dissolves completely into a breathtaking, crystal-clear deep royal blue solution!',
        expectedResult_vi: 'Ban đầu xuất hiện kết tủa màu xanh lam nhạt, sau đó kết tủa tan hoàn toàn thành dung dịch màu xanh lam thẫm tuyệt đẹp!'
      }
    ],
    quizzes: [
      {
        question_en: 'Why does the initial copper hydroxide precipitate dissolve upon adding excess ammonia?',
        question_vi: 'Tại sao kết tủa đồng hiđroxit ban đầu lại tan khi cho dư dung dịch amoniac?',
        options_en: ['Ammonia forms a highly stable soluble coordination complex [Cu(NH3)4]2+', 'The acid neutralizes the copper', 'Water evaporates away', 'Copper turns into pure metal'],
        options_vi: ['Amoniac tạo phức chất tan rất bền [Cu(NH3)4]2+ với ion đồng', 'Axit trung hòa đồng', 'Nước bay hơi hết', 'Đồng biến thành kim loại nguyên chất'],
        correctAnswer: 0,
        explanation_en: 'Excess ammonia acts as a neutral monodentate ligand that displaces water and hydroxide, forming the soluble tetraamminecopper(II) complex.',
        explanation_vi: 'Phối tử NH3 kết hợp với ion Cu2+ tạo phức chất tan màu xanh lam thẫm [Cu(NH3)4]2+ rất bền.'
      }
    ]
  },
  {
    id: 'al_amphoteric_hydroxide',
    title_en: 'Amphoteric Hydroxide: Precipitation & Dissolution of Al(OH)3',
    title_vi: 'Tính Lưỡng Tính của Nhôm Hiđroxit Al(OH)3',
    category: 'precipitation',
    difficulty: 'intermediate',
    objective_en: 'Explore the amphoteric nature of aluminum hydroxide: gelatinous white precipitation followed by complete redissolution in excess sodium hydroxide.',
    objective_vi: 'Khám phá tính chất lưỡng tính đặc trưng của nhôm hiđroxit: tạo kết tủa keo trắng Al(OH)3 rồi tan hoàn toàn trong kiềm mạnh dư.',
    theory_en: 'Step 1: Al³⁺ + 3OH⁻ → Al(OH)₃↓ (insoluble white gelatinous precipitate, Ksp = 3 × 10⁻³⁴). Step 2 (Amphoteric dissolution in excess base): Al(OH)₃(s) + OH⁻(aq) → [Al(OH)₄]⁻(aq) (soluble tetrahydroxoaluminate complex anion, restoring transparent clarity).',
    theory_vi: 'Giai đoạn 1: Al³⁺ + 3OH⁻ → Al(OH)₃↓ (kết tủa keo trắng, Ksp = 3 × 10⁻³⁴). Giai đoạn 2 (Hòa tan lưỡng tính trong kiềm dư): Al(OH)₃(r) + OH⁻(dd) → [Al(OH)₄]⁻(dd) (tạo ion phức tan tetrahidroxoaluminat, dung dịch trở lại trong suốt).',
    safetyAdvisory_en: 'Sodium hydroxide is caustic. Wash splashes immediately with plenty of water.',
    safetyAdvisory_vi: 'Dung dịch NaOH có tính ăn mòn da. Rửa sạch bằng nước nếu bị dính vào tay.',
    requiredEquipment: ['Beaker (x2)', 'Pipette', 'Glass Stirring Rod'],
    allowedChemicals: ['Al2(SO4)3', 'NaOH', 'H2O'],
    simulationAlgorithm_en: `Amphoteric Dual-Equilibrium Solver:
1. Forward Precipitation: S = ([Al3+][OH-]^3 / Ksp)^(1/4). Nucleates white gel particles with turbidity tau up to 0.75.
2. Amphoteric Reversal: When [OH-] exceeds critical threshold (pH > 12.8), complexation equilibrium Al(OH)3 + OH- ⇌ [Al(OH)4]- clears the precipitate back to tau = 0.0.`,
    simulationAlgorithm_vi: `Thuật toán Cân Bằng Kép Lưỡng Tính:
1. Tạo mầm kết tủa keo trắng Al(OH)3 khi tích số ion vượt tích số tan Ksp = 3.0e-34.
2. Khi nồng độ OH- dư (pH > 12.8), phản ứng tạo phức [Al(OH)4]- hòa tan toàn bộ kết tủa, độ đục trở về 0.`,
    phenomenologyCases: [
      {
        id: 'al_gelatinous_precipitate',
        name_en: 'Case 1: Translucent Gelatinous Floc Formation',
        name_vi: 'Trường hợp 1: Tạo kết tủa keo trắng đục lơ lửng',
        description_en: 'Stoichiometric addition of OH- precipitates gelatinous, highly hydrated aluminum hydroxide Al(OH)3(s) with high light scattering.',
        description_vi: 'Nhỏ OH- vừa đủ tạo các mảng kết tủa keo nhôm hiđroxit Al(OH)3 ngậm nước lơ lửng làm dung dịch hóa đục.',
        algorithm: 'Primary precipitation: Al3+ + 3OH- -> Al(OH)3(s) (Ksp = 3.0e-34); gel network formation.'
      },
      {
        id: 'al_aluminate_dissolution',
        name_en: 'Case 2: Amphoteric Dissolution in Excess Strong Base',
        name_vi: 'Trường hợp 2: Hòa tan lưỡng tính tạo ion aluminat trong kiềm dư',
        description_en: 'Adding excess concentrated NaOH coordinates an additional hydroxide ion, forming the soluble tetrahedral tetrahydroxoaluminate anion [Al(OH)4]- and restoring clarity.',
        description_vi: 'Thêm NaOH dư, Al(OH)3 thể hiện tính axit nhận thêm OH- tạo ion phức tan [Al(OH)4]-, dung dịch trở lại trong suốt không màu.',
        algorithm: 'Amphoteric base complexation: Al(OH)3 + OH- ⇌ [Al(OH)4]- (K_f = 40.0); turbidity tau -> 0.0.'
      },
      {
        id: 'al_acidic_reprecipitation',
        name_en: 'Case 3: Acid Neutralization & Amphoteric Reversal',
        name_vi: 'Trường hợp 3: Trung hòa bằng axit tái sinh kết tủa và tan thành Al3+',
        description_en: 'Titrating with acid consumes excess base, briefly reprecipitating Al(OH)3 at neutral pH, before excess acid dissolves it fully into Al3+(aq).',
        description_vi: 'Nhỏ axit vào dung dịch aluminat làm kết tủa keo Al(OH)3 xuất hiện trở lại ở pH trung tính, sau đó tan hoàn toàn thành muối nhôm Al3+ khi axit dư.',
        algorithm: 'Dual protonation sequence: [Al(OH)4]- + H+ -> Al(OH)3 + H2O; Al(OH)3 + 3H+ -> Al3+ + 3H2O.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Add Aluminum Sulfate Solution',
        title_vi: 'Lấy dung dịch Nhôm Sunfat',
        instruction_en: 'Pour 25 mL of Al2(SO4)3 solution into Beaker 1.',
        instruction_vi: 'Rót 25 mL dung dịch Al2(SO4)3 vào Cốc 1.',
        expectedResult_en: 'Clear colorless solution.',
        expectedResult_vi: 'Dung dịch trong suốt không màu.'
      },
      {
        stepNumber: 2,
        title_en: 'Add Sodium Hydroxide Gradually',
        title_vi: 'Nhỏ từ từ dung dịch Natri Hiđroxit',
        instruction_en: 'Add NaOH solution dropwise: watch the white gel form, then add excess NaOH to witness it dissolve completely!',
        instruction_vi: 'Nhỏ từ từ dung dịch NaOH vào: quan sát kết tủa keo trắng xuất hiện, sau đó rót thêm NaOH dư để xem kết tủa tan hết!',
        expectedResult_en: 'Thick white gelatinous precipitate forms and then dissolves completely into a clear colorless solution upon adding excess NaOH!',
        expectedResult_vi: 'Xuất hiện kết tủa keo trắng lơ lửng, sau đó kết tủa tan hoàn toàn thành dung dịch trong suốt khi thêm kiềm dư!'
      }
    ],
    quizzes: [
      {
        question_en: 'What property of Al(OH)3 allows it to dissolve in both strong acids and strong bases?',
        question_vi: 'Tính chất nào của Al(OH)3 cho phép nó vừa tan trong axit mạnh vừa tan trong bazơ mạnh?',
        options_en: ['Amphoteric nature (can react as both acid and base)', 'It is a noble metal compound', 'It is purely acidic', 'It decomposes into hydrogen gas'],
        options_vi: ['Tính chất lưỡng tính (vừa có thể phản ứng như axit, vừa phản ứng như bazơ)', 'Là hợp chất kim loại quý', 'Có tính axit thuần túy', 'Tự phân hủy ra khí hiđro'],
        correctAnswer: 0,
        explanation_en: 'Aluminum hydroxide is an amphoteric hydroxide that donates protons to strong bases and accepts protons from strong acids.',
        explanation_vi: 'Nhôm hiđroxit là hiđroxit lưỡng tính, phản ứng được với cả dung dịch axit mạnh và dung dịch kiềm mạnh.'
      }
    ]
  },
  {
    id: 'thiosulfate_acid_clock',
    title_en: 'Reaction Kinetics: Colloidal Sulfur Precipitation (Disappearing Cross)',
    title_vi: 'Động Học Phản Ứng: Kết Tủa Lưu Huỳnh Keo (Dấu Chữ Thập Biến Mất)',
    category: 'precipitation',
    difficulty: 'intermediate',
    objective_en: 'Measure reaction rate and study Rayleigh light scattering as colloidal sulfur gradually turns the solution opaque, obscuring a black cross underneath.',
    objective_vi: 'Nghiên cứu tốc độ phản ứng hóa học và sự tán xạ ánh sáng Rayleigh khi lưu huỳnh keo kết tủa làm dung dịch đục dần che khuất dấu chữ thập đen dưới đáy cốc.',
    theory_en: 'Sodium thiosulfate decomposes in acid: Na₂S₂O₃ + 2HCl → 2NaCl + S(colloid)↓ + SO₂↑ + H₂O. An initial induction period occurs while sulfur clusters grow to critical nucleation radius. As colloidal sulfur particles reach wavelengths of light (~400 nm), Rayleigh/Mie scattering causes progressive yellow-white turbidity until the black cross beneath the beaker vanishes.',
    theory_vi: 'Natri thiosunfat bị axit phân hủy: Na₂S₂O₃ + 2HCl → 2NaCl + S(keo)↓ + SO₂↑ + H₂O. Có một giai đoạn cảm ứng ban đầu khi các hạt lưu huỳnh tích tụ đạt kích thước tới hạn. Khi các hạt lưu huỳnh keo đạt kích thước bước sóng ánh sáng, hiện tượng tán xạ ánh sáng làm dung dịch đục dần từ từ cho tới khi dấu chữ thập dưới đáy cốc bị che khuất hoàn toàn.',
    safetyAdvisory_en: 'SO2 gas has a choking sulfurous smell. Ensure room ventilation.',
    safetyAdvisory_vi: 'Khí SO2 sinh ra có mùi hắc đặc trưng. Làm thí nghiệm ở nơi thoáng gió.',
    requiredEquipment: ['Beaker', 'Cross Card', 'Digital Stopwatch', 'Graduated Cylinder'],
    allowedChemicals: ['Na2S2O3', 'HCl (dil)', 'H2O'],
    simulationAlgorithm_en: `Colloidal Nucleation & Turbidity Growth Model:
1. Induction Lag:
   No visible particles while subcritical sulfur clusters grow (tau < 0.05 for 0 < progress < 0.25).
2. Sudden Nucleation & Mie Scattering:
   Turbidity tau(t) = tau_max / (1 + exp(-k * (t - t_half))).
3. Optical Opacity:
   Transmittance T = exp(-tau * depth). When T < 0.04, the background black cross becomes completely invisible.`,
    simulationAlgorithm_vi: `Thuật toán Tạo Mầm Keo & Tán Xạ Ánh Sáng:
1. Giai đoạn cảm ứng: Độ đục tau < 0.05 trong 25% thời gian đầu khi các cụm nguyên tử S đang lớn dần.
2. Tạo mầm bùng phát & Tán xạ Mie: Độ đục tau tăng vọt theo hàm sigmoid logistic.
3. Độ thấu quang T = exp(-tau * chiều_sâu). Khi T < 0.04, dấu chữ thập đen dưới đáy cốc hoàn toàn biến mất.`,
    phenomenologyCases: [
      {
        id: 'thiosulfate_induction_clarity',
        name_en: 'Case 1: Sub-Critical Cluster Induction Lag',
        name_vi: 'Trường hợp 1: Giai đoạn cảm ứng cụm nguyên tử dưới tới hạn',
        description_en: 'Solution remains completely water-clear while molecular S8 rings accumulate into sub-nanometer clusters below light-scattering limits.',
        description_vi: 'Dung dịch giữ nguyên độ trong suốt trong khi các vòng phân tử S8 kết tụ thành các cụm siêu vi chưa đủ kích thước tán xạ ánh sáng.',
        algorithm: 'Induction lag: cluster size r < r_critical (r < 50 nm); turbidity tau < 0.02; transmittance T > 0.95.'
      },
      {
        id: 'thiosulfate_mie_turbidity_growth',
        name_en: 'Case 2: Rapid Mie Scattering & Opalescent Yellowing',
        name_vi: 'Trường hợp 2: Bùng phát tán xạ Mie & vẩn đục màu vàng sữa',
        description_en: 'Clusters exceed light wavelength threshold (~400 nm); intense forward Mie scattering produces an opalescent milky yellow turbidity.',
        description_vi: 'Các hạt keo vượt ngưỡng bước sóng ánh sáng (~400 nm), tán xạ Mie làm dung dịch chuyển sang màu trắng đục ánh vàng sữa.',
        algorithm: 'Mie scattering efficiency: Q_sca ~ (x^4)/(x^2 + 1); sigmoid turbidity surge tau(t) = tau_max / (1 + exp(-k*(t - t_half))).'
      },
      {
        id: 'thiosulfate_cross_obscuration',
        name_en: 'Case 3: Complete Optical Extinction & Cross Disappearance',
        name_vi: 'Trường hợp 3: Triệt tiêu quang học hoàn toàn & che khuất dấu chữ thập',
        description_en: 'Optical depth reaches critical extinction threshold (optical density OD > 1.4); the black cross beneath the beaker vanishes entirely.',
        description_vi: 'Độ dày quang học vượt ngưỡng triệt tiêu ánh sáng (OD > 1.4), che mất hoàn toàn dấu chữ thập đen dưới đáy cốc.',
        algorithm: 'Beer-Lambert transmittance: T = exp(-tau * depth); observer threshold T < 0.04 marks endpoint timestamp.'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Add Sodium Thiosulfate over Cross Card',
        title_vi: 'Rót dung dịch Natri Thiosunfat vào cốc đặt trên dấu chữ thập',
        instruction_en: 'Pour 30 mL of Na2S2O3 solution into the beaker placed over the printed cross marker.',
        instruction_vi: 'Rót 30 mL dung dịch Na2S2O3 vào cốc đặt trên tấm bìa có dấu chữ thập đen.',
        expectedResult_en: 'Clear solution; cross marker is plainly visible through the liquid.',
        expectedResult_vi: 'Dung dịch trong suốt; nhìn thấy rõ ràng dấu chữ thập dưới đáy cốc.'
      },
      {
        stepNumber: 2,
        title_en: 'Add Dilute Acid & Measure Disappearance Time',
        title_vi: 'Rót axit loãng vào và quan sát độ đục',
        instruction_en: 'Add 15 mL of dilute HCl and swirl. Observe the liquid turn opalescent yellow-white until the cross completely disappears.',
        instruction_vi: 'Rót 15 mL dung dịch HCl loãng vào và khuấy nhẹ. Quan sát dung dịch đục dần sang màu vàng trắng sữa cho đến khi che khuất hoàn toàn dấu chữ thập.',
        expectedResult_en: 'After a brief induction lag, yellow-white colloidal sulfur precipitates and completely obscures the cross marker!',
        expectedResult_vi: 'Sau khoảng thời gian cảm ứng ngắn, dung dịch vẩn đục màu vàng nhạt của lưu huỳnh keo và che mất hoàn toàn dấu chữ thập!'
      }
    ],
    quizzes: [
      {
        question_en: 'What causes the solution to turn cloudy yellow in the thiosulfate acid reaction?',
        question_vi: 'Chất nào làm cho dung dịch bị vẩn đục màu vàng trong phản ứng giữa thiosunfat và axit?',
        options_en: ['Colloidal sulfur particles scattering light', 'Gaseous bubbles of chlorine', 'Dissolved sodium chloride crystals', 'Rust particles from iron'],
        options_vi: ['Các hạt lưu huỳnh dạng keo tán xạ ánh sáng', 'Bọt khí clo', 'Tinh thể muối ăn kết tinh', 'Bột rỉ sắt'],
        correctAnswer: 0,
        explanation_en: 'Elementary sulfur precipitates as sub-micron colloidal particles that scatter light via Tyndall/Mie scattering, making the liquid milky and opaque.',
        explanation_vi: 'Lưu huỳnh đơn chất sinh ra dưới dạng hạt keo siêu vi làm tán xạ ánh sáng (hiệu ứng Tyndall), khiến dung dịch bị vẩn đục.'
      }
    ]
  },
  {
    id: 'permanganate_oxalate_redox',
    title_en: 'Autocatalytic Kinetics: Potassium Permanganate + Oxalic Acid',
    title_vi: 'Động Học Tự Xúc Tác: Thuốc Tím (KMnO4) + Axit Oxalic (H2C2O4)',
    category: 'redox',
    difficulty: 'advanced',
    objective_en: 'Observe the remarkable autocatalytic S-curve kinetics: slow initial decolorization followed by rapid exponential bleaching as Mn2+ catalyst accumulates.',
    objective_vi: 'Quan sát hiện tượng động học tự xúc tác hình chữ S kinh điển: mất màu tím rất chậm lúc ban đầu rồi tăng tốc mất màu chớp nhoáng khi ion xúc tác Mn2+ sinh ra.',
    theory_en: 'The overall redox reaction: 2KMnO₄ + 5H₂C₂O₄ + 3H₂SO₄ → K₂SO₄ + 2MnSO₄ + 10CO₂↑ + 8H₂O. The reaction rate is initially very sluggish because of high activation energy between negative ions (MnO₄⁻ and C₂O₄²⁻). However, the product Mn²⁺ acts as a powerful homogeneous catalyst (autocatalyst), forming reactive intermediate complexes that accelerate the reaction rate by orders of magnitude!',
    theory_vi: 'Phương trình phản ứng: 2KMnO₄ + 5H₂C₂O₄ + 3H₂SO₄ → K₂SO₄ + 2MnSO₄ + 10CO₂↑ + 8H₂O. Tốc độ ban đầu rất chậm do lực đẩy tĩnh điện giữa hai ion âm MnO4- và C2O4(2-). Tuy nhiên, sản phẩm ion Mn2+ sinh ra đóng vai trò là chất xúc tác cực mạnh (hiện tượng tự xúc tác), tạo các phức chất trung gian làm tốc độ mất màu tăng vọt!',
    safetyAdvisory_en: 'Potassium permanganate is a strong oxidizer and stains skin brown (MnO2). Wear gloves.',
    safetyAdvisory_vi: 'Thuốc tím KMnO4 làm đen da tay khi dính vào. Cần đeo găng tay bảo hộ.',
    requiredEquipment: ['Beaker (x2)', 'Glass Stirring Rod', 'Hotplate (optional)'],
    allowedChemicals: ['KMnO4', 'H2C2O4', 'H2SO4 (dil)', 'H2O'],
    simulationAlgorithm_en: `Autocatalytic Sigmoidal Rate ODE:
1. Rate Law: r = (k0 + k_cat * [Mn2+]^1.4) * [MnO4-] * [H2C2O4].
2. Induction Lag: For the first 30-50% of reaction time, [Mn2+] is minimal and decolorization is imperceptible.
3. Exponential S-Curve: Once [Mn2+] exceeds critical threshold, rate surges 80x, bleaching the purple solution to crystal-clear in seconds with gentle CO2 effervescence.`,
    simulationAlgorithm_vi: `Thuật toán Tự Xúc Tác Đường Cong Sigmoid:
1. Phương trình tốc độ: r = (k0 + k_xúc_tác * [Mn2+]^1.4) * [MnO4-] * [H2C2O4].
2. Giai đoạn cảm ứng: Trong 30-50% thời gian đầu, ion Mn2+ rất ít nên màu tím hầu như không đổi.
3. Bùng nổ chữ S: Khi lượng Mn2+ tích tụ đủ, tốc độ tăng gấp 80 lần, dung dịch mất màu tím tức thì thành trong suốt không màu kèm sủi bọt khí CO2 li ti.`,
    phenomenologyCases: [
      {
        id: 'permanganate_induction_purple',
        name_en: 'Case 1: High Activation Barrier & Purple Inertia',
        name_vi: 'Trường hợp 1: Rào cản năng lượng hoạt hóa cao & trơ màu tím ban đầu',
        description_en: 'Electrostatic repulsion between MnO4- and C2O4(2-) slows initial rate; solution remains deep royal purple with no perceptible fading for 10-20 seconds.',
        description_vi: 'Lực đẩy tĩnh điện giữa hai anion làm phản ứng ban đầu diễn ra cực chậm; dung dịch giữ nguyên màu tím thẫm trong 10-20 giây.',
        algorithm: 'Uncatalyzed rate r0 = k0 * [MnO4-] * [H2C2O4] (k0 << k_cat); absorbance A(525nm) > 2.0.'
      },
      {
        id: 'permanganate_autocatalytic_surge',
        name_en: 'Case 2: Autocatalytic Mn2+ Avalanche & Exponential Bleaching',
        name_vi: 'Trường hợp 2: Thác lũ tự xúc tác Mn2+ & mất màu hàm mũ siêu tốc',
        description_en: 'Trace Mn2+ complexes with oxalate to form reactive Mn(III) intermediates, boosting reaction rate 80-fold and causing sudden exponential decolorization.',
        description_vi: 'Vết Mn2+ sinh ra tạo phức với oxalat sinh trung gian Mn(III) hoạt động mạnh, đẩy tốc độ tăng 80 lần, dung dịch mất sạch màu tím trong tích tắc.',
        algorithm: 'Autocatalytic rate law: d[Mn2+]/dt = (k0 + k_cat * [Mn2+]^1.4) * [MnO4-] * [H2C2O4]; steep sigmoidal slope.'
      },
      {
        id: 'permanganate_clarity_effervescence',
        name_en: 'Case 3: Decolorized Clarity & Carbon Dioxide Effervescence',
        name_vi: 'Trường hợp 3: Trong suốt hoàn toàn & sủi bọt khí CO2 li ti',
        description_en: 'Reaction reaches 100% completion; solution is crystal clear and colorless with gentle streams of CO2 micro-bubbles releasing from bulk solution.',
        description_vi: 'Phản ứng kết thúc hoàn toàn; dung dịch chuyển sang trong suốt không màu kèm các dòng bọt khí CO2 li ti sủi nhẹ lên bề mặt.',
        algorithm: 'Colorless Mn2+ state; CO2 Henry supersaturation degassing: dm_CO2/dt = k_desorb * (C_CO2 - C_sat).'
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Prepare Purple Permanganate Solution with Acid',
        title_vi: 'Chuẩn bị dung dịch Thuốc tím có pha axit',
        instruction_en: 'Pour 25 mL of purple KMnO4 solution into Beaker 1 and add 5 mL dilute H2SO4.',
        instruction_vi: 'Rót 25 mL dung dịch KMnO4 màu tím đậm vào Cốc 1 và thêm 5 mL H2SO4 loãng.',
        expectedResult_en: 'Deep royal purple solution.',
        expectedResult_vi: 'Dung dịch màu tím đậm đặc trưng của thuốc tím.'
      },
      {
        stepNumber: 2,
        title_en: 'Add Oxalic Acid and Observe S-Curve Decolorization',
        title_vi: 'Rót dung dịch Axit Oxalic và quan sát tự xúc tác',
        instruction_en: 'Add 30 mL of H2C2O4 solution and stir. Watch the lag time before sudden rapid decolorization to crystal clear!',
        instruction_vi: 'Rót 30 mL dung dịch axit oxalic vào cốc và khuấy đều. Quan sát giai đoạn trễ trước khi dung dịch mất sạch màu tím!',
        expectedResult_en: 'The purple color persists for a short while, then suddenly fades exponentially and becomes completely water-clear as CO2 micro-bubbles fizz!',
        expectedResult_vi: 'Màu tím giữ nguyên trong vài giây đầu, sau đó phai màu cực nhanh rồi trong suốt hoàn toàn, sủi bọt khí CO2 không màu!'
      }
    ],
    quizzes: [
      {
        question_en: 'What phenomenon causes the decolorization of KMnO4 with oxalic acid to accelerate over time?',
        question_vi: 'Hiện tượng nào làm cho phản ứng mất màu của KMnO4 với axit oxalic tăng tốc nhanh dần theo thời gian?',
        options_en: ['Autocatalysis (the product Mn2+ acts as a catalyst for the reaction)', 'The solution cools down', 'Oxygen gas escapes into air', 'The beaker expands'],
        options_vi: ['Hiện tượng tự xúc tác (sản phẩm ion Mn2+ sinh ra đóng vai trò là chất xúc tác cho phản ứng)', 'Dung dịch bị lạnh đi', 'Khí oxi bay mất', 'Cốc nghiệm nở ra'],
        correctAnswer: 0,
        explanation_en: 'Mn2+ ions produced in the reaction act as a homogeneous catalyst, creating classic autocatalytic S-shaped kinetic curves.',
        explanation_vi: 'Ion Mn2+ tạo thành sau phản ứng đóng vai trò chất xúc tác đồng thể, làm phản ứng tự tăng tốc theo đường cong chữ S.'
      }
    ]
  }
];
