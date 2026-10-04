export interface LabStep {
  stepNumber: number;
  title_en: string;
  title_vi: string;
  instruction_en: string;
  instruction_vi: string;
  expectedResult_en: string;
  expectedResult_vi: string;
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

export interface ExperimentGuide {
  id: string;
  title_en: string;
  title_vi: string;
  category: 'acid_base' | 'precipitation' | 'gas' | 'redox' | 'thermal' | 'safety';
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
    title_en: 'Alkali Metal Reaction: Sodium in Water with Indicator',
    title_vi: 'Natri tác dụng với Nước (Kim loại kiềm)',
    category: 'redox',
    difficulty: 'intermediate',
    objective_en: 'Observe the vigorous reactivity of group 1 alkali metals with water generating alkaline solution and hydrogen.',
    objective_vi: 'Quan sát phản ứng mãnh liệt của kim loại kiềm nhóm IA với nước, tạo dung dịch kiềm và khí hiđro.',
    theory_en: 'Sodium reacts vigorously with water: 2Na + 2H₂O → 2NaOH + H₂↑. Due to low melting point (97.8°C) and density (0.97 g/cm³), sodium melts into a silvery bead that skims rapidly across the water surface.',
    theory_vi: 'Natri phản ứng mãnh liệt với nước: 2Na + 2H₂O → 2NaOH + H₂↑. Do nhiệt độ nóng chảy thấp (97.8°C) và nhẹ hơn nước, mẩu natri nóng chảy vo tròn thành viên bi bạc chạy lướt trên mặt nước.',
    safetyAdvisory_en: 'FIRE HAZARD: Use small pinhead-sized pieces of sodium. Keep hands and tools dry.',
    safetyAdvisory_vi: 'NGUY CƠ CHÁY NỔ: Chỉ dùng mẩu natri nhỏ bằng hạt đậu xanh. Luôn dùng kẹp khô gắp natri.',
    requiredEquipment: ['Beaker', 'Tweezers / Forceps'],
    allowedChemicals: ['Na', 'H2O', 'Phenolphthalein'],
    steps: [
      {
        stepNumber: 1,
        title_en: 'Prepare Water with Phenolphthalein',
        title_vi: 'Chuẩn bị nước có phenolphtalein',
        instruction_en: 'Add water into Beaker 1 and add 2-3 drops of Phenolphthalein indicator.',
        instruction_vi: 'Rót nước cất vào Cốc 1 và nhỏ 2-3 giọt dung dịch phenolphtalein.',
        expectedResult_en: 'Colorless liquid.',
        expectedResult_vi: 'Dung dịch trong suốt không màu.'
      },
      {
        stepNumber: 2,
        title_en: 'Drop Sodium Metal Piece',
        title_vi: 'Thả mẩu natri vào cốc',
        instruction_en: 'Drop a piece of sodium metal into the beaker.',
        instruction_vi: 'Thả một mẩu kim loại natri vào cốc nước.',
        expectedResult_en: 'Sodium melts into a silvery sphere, darts across the surface, fizzing H2, and leaves a vivid pink-magenta trail of NaOH!',
        expectedResult_vi: 'Viên natri vo tròn lướt nhanh trên mặt nước, sủi bọt khí H2 và để lại vệt màu hồng fuchsia rực rỡ của dung dịch kiềm NaOH!'
      }
    ],
    quizzes: [
      {
        question_en: 'Why does sodium float and melt into a sphere on water?',
        question_vi: 'Tại sao mẩu natri lại nổi và nóng chảy vo tròn thành hình cầu trên mặt nước?',
        options_en: ['Density is lower than water (0.97 g/cm³) and reaction heat exceeds its 97.8°C melting point', 'Sodium is hollow inside', 'Water repels sodium magnetically', 'It reacts with air pressure'],
        options_vi: ['Khối lượng riêng nhẹ hơn nước (0.97 g/cm³) và nhiệt phản ứng lớn hơn điểm nóng chảy 97.8°C', 'Natri có ruột rỗng', 'Nước đẩy natri bằng từ tính', 'Do áp suất không khí nén lại'],
        correctAnswer: 0,
        explanation_en: 'Sodium is less dense than water (floats). The highly exothermic reaction melts the metal (melting point 97.8°C), and surface tension pulls it into a sphere.',
        explanation_vi: 'Natri nhẹ hơn nước nên nổi. Phản ứng tỏa nhiệt mạnh làm nóng chảy mẩu kim loại và lực căng bề mặt kéo nó thành hình cầu lăn tròn.'
      }
    ]
  }
];
