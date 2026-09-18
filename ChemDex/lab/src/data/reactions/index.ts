import { ReactionResult } from '../../types/reaction';

export const DETERMINISTIC_REACTIONS: Record<string, ReactionResult> = {
  // 1. HCl + NaOH (Acid-Base Neutralization)
  'HCl+NaOH': {
    id: 'rxn_hcl_naoh',
    canonicalKey: 'HCl+NaOH',
    schemaVersion: 1,
    equation: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)',
    ionicEquation: 'H⁺(aq) + Cl⁻(aq) + Na⁺(aq) + OH⁻(aq) → Na⁺(aq) + Cl⁻(aq) + H₂O(l)',
    netIonicEquation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    reactionTypeVi: 'Phản ứng trung hòa (Axit - Bazơ)',
    conditionsVi: 'Nhiệt độ phòng (25°C)',
    reactants: [
      { chemicalId: 'HCl', formula: 'HCl', coefficient: 1, state: 'aq' },
      { chemicalId: 'NaOH', formula: 'NaOH', coefficient: 1, state: 'aq' }
    ],
    products: [
      { chemicalId: 'NaCl', formula: 'NaCl', coefficient: 1, state: 'aq' },
      { chemicalId: 'H2O', formula: 'H₂O', coefficient: 1, state: 'l' }
    ],
    observations: {
      phenomenonVi: 'Dung dịch trong suốt, tỏa nhiệt nhẹ. Nếu có chỉ thị Phenolphthalein trước đó thì màu hồng biến mất về không màu (hoặc ngược lại).',
      liquidColor: { r: 245, g: 250, b: 255, a: 0.1, hex: '#f5faff' },
      precipitate: null,
      gas: null,
      temperatureChangeC: 2.5,
      resultingPhEstimate: 7.0
    },
    educationalExplanationVi: {
      titleVi: 'Phản ứng trung hòa kinh điển',
      summaryVi: 'Ion H⁺ từ axit mạnh kết hợp với ion OH⁻ từ bazơ mạnh tạo thành phân tử nước trung tính.',
      detailVi: 'Nhiệt tỏa ra từ phản ứng trung hòa khoảng -57.3 kJ/mol nước sinh ra. Muối NaCl sinh ra tan hoàn toàn trong nước tạo dung dịch trung tính (pH ≈ 7).',
      realWorldApplicationVi: 'Ứng dụng trong xử lý nước thải công nghiệp chứa axit/kiềm và phép chuẩn độ định lượng axit-bazơ.'
    },
    safetyAdviceVi: {
      level: 'NOTICE',
      messageVi: 'Dù phản ứng tạo ra muối ăn và nước, axit và bazơ đậm đặc ban đầu có tính ăn mòn cao. Luôn đeo kính bảo hộ.',
      ppeRecommendedVi: ['Kính bảo hộ', 'Áo blouse', 'Găng tay nitrile'],
      wasteHandlingVi: 'Dung dịch sau trung hòa an toàn để xả qua bồn rửa phòng lab với nhiều nước.'
    },
    provenance: 'tier0_deterministic',
    createdAt: Date.now()
  },

  // 2. H2SO4 + NaOH
  'H2SO4+NaOH': {
    id: 'rxn_h2so4_naoh',
    canonicalKey: 'H2SO4+NaOH',
    schemaVersion: 1,
    equation: 'H₂SO₄(aq) + 2NaOH(aq) → Na₂SO₄(aq) + 2H₂O(l)',
    ionicEquation: '2H⁺(aq) + SO₄²⁻(aq) + 2Na⁺(aq) + 2OH⁻(aq) → 2Na⁺(aq) + SO₄²⁻(aq) + 2H₂O(l)',
    netIonicEquation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    reactionTypeVi: 'Phản ứng trung hòa Axit Đa Chức',
    conditionsVi: 'Nhiệt độ phòng (25°C)',
    reactants: [
      { chemicalId: 'H2SO4', formula: 'H₂SO₄', coefficient: 1, state: 'aq' },
      { chemicalId: 'NaOH', formula: 'NaOH', coefficient: 2, state: 'aq' }
    ],
    products: [
      { chemicalId: 'Na2SO4', formula: 'Na₂SO₄', coefficient: 1, state: 'aq' },
      { chemicalId: 'H2O', formula: 'H₂O', coefficient: 2, state: 'l' }
    ],
    observations: {
      phenomenonVi: 'Dung dịch trong suốt, tỏa nhiệt rõ rệt.',
      liquidColor: { r: 245, g: 250, b: 255, a: 0.1, hex: '#f5faff' },
      precipitate: null,
      gas: null,
      temperatureChangeC: 4.5,
      resultingPhEstimate: 7.0
    },
    educationalExplanationVi: {
      titleVi: 'Trung hòa Axit Sunfuric',
      summaryVi: '1 phân tử H₂SO₄ cung cấp 2 ion H⁺ để trung hòa với 2 phân tử NaOH.',
      detailVi: 'Tùy tỉ lệ mol giữa H₂SO₄ và NaOH có thể tạo thành muối axit (NaHSO₄) hoặc muối trung hòa (Na₂SO₄).',
      realWorldApplicationVi: 'Sản xuất muối natri sunfat dùng trong ngành dệt nhuộm và sản xuất bột giặt.'
    },
    safetyAdviceVi: {
      level: 'WARNING',
      messageVi: 'H₂SO₄ tỏa nhiều nhiệt khi pha loãng và phản ứng. Cẩn trọng tránh nhiệt độ tăng nhanh.',
      ppeRecommendedVi: ['Kính bảo hộ', 'Áo blouse', 'Găng tay'],
      wasteHandlingVi: 'Dung dịch trung hòa xả bồn nước.'
    },
    provenance: 'tier0_deterministic',
    createdAt: Date.now()
  },

  // 3. BaCl2 + H2SO4 (Precipitation)
  'BaCl2+H2SO4': {
    id: 'rxn_bacl2_h2so4',
    canonicalKey: 'BaCl2+H2SO4',
    schemaVersion: 1,
    equation: 'BaCl₂(aq) + H₂SO₄(aq) → BaSO₄(s)↓ + 2HCl(aq)',
    ionicEquation: 'Ba²⁺(aq) + 2Cl⁻(aq) + 2H⁺(aq) + SO₄²⁻(aq) → BaSO₄(s)↓ + 2H⁺(aq) + 2Cl⁻(aq)',
    netIonicEquation: 'Ba²⁺(aq) + SO₄²⁻(aq) → BaSO₄(s)↓',
    reactionTypeVi: 'Phản ứng trao đổi ion (Tạo kết tủa)',
    conditionsVi: 'Nhiệt độ phòng (25°C)',
    reactants: [
      { chemicalId: 'BaCl2', formula: 'BaCl₂', coefficient: 1, state: 'aq' },
      { chemicalId: 'H2SO4', formula: 'H₂SO₄', coefficient: 1, state: 'aq' }
    ],
    products: [
      { chemicalId: 'BaSO4', formula: 'BaSO₄', coefficient: 1, state: 's' },
      { chemicalId: 'HCl', formula: 'HCl', coefficient: 2, state: 'aq' }
    ],
    observations: {
      phenomenonVi: 'Xuất hiện ngay lập tức kết tủa trắng đục lắng dần xuống đáy cốc (BaSO₄), không tan trong axit mạnh dư.',
      liquidColor: { r: 240, g: 240, b: 240, a: 0.35, hex: '#f0f0f0' },
      precipitate: {
        chemicalId: 'BaSO4',
        formula: 'BaSO₄',
        nameVi: 'Bari sunfat',
        colorHex: '#ffffff',
        type: 'fine_powder',
        descriptionVi: 'Kết tủa trắng mịn, cực kỳ bền và không tan trong axit.'
      },
      gas: null,
      temperatureChangeC: 0.5,
      resultingPhEstimate: 1.0
    },
    educationalExplanationVi: {
      titleVi: 'Phản ứng đặc trưng nhận biết gốc Sunfat (SO₄²⁻)',
      summaryVi: 'Ion Ba²⁺ kết hợp với ion SO₄²⁻ tạo ra kết tủa BaSO₄ có tích số tan cực nhỏ (Ksp ≈ 1.1 × 10⁻¹⁰).',
      detailVi: 'BaSO₄ trơ về mặt hóa học, không tan cả trong axit đặc nóng, là cơ sở định tính và định lượng ion SO₄²⁻ trong phòng thí nghiệm.',
      realWorldApplicationVi: 'Dùng làm thuốc cản quang chụp X-quang đường tiêu hóa nhờ khả năng cản quang tốt và hoàn toàn không độc do không tan trong cơ thể.'
    },
    safetyAdviceVi: {
      level: 'WARNING',
      messageVi: 'Dung dịch Ba²⁺ tan có độc tính đối với hệ thần kinh và tim mạch. Dung dịch sau phản ứng chứa axit HCl.',
      ppeRecommendedVi: ['Kính bảo hộ', 'Găng tay cao su', 'Áo lab'],
      wasteHandlingVi: 'Thu gom vào bình thải kim loại nặng có Bari (Heavy Metal Waste).'
    },
    provenance: 'tier0_deterministic',
    createdAt: Date.now()
  },

  // 4. AgNO3 + NaCl (Precipitation)
  'AgNO3+NaCl': {
    id: 'rxn_agno3_nacl',
    canonicalKey: 'AgNO3+NaCl',
    schemaVersion: 1,
    equation: 'AgNO₃(aq) + NaCl(aq) → AgCl(s)↓ + NaNO₃(aq)',
    ionicEquation: 'Ag⁺(aq) + NO₃⁻(aq) + Na⁺(aq) + Cl⁻(aq) → AgCl(s)↓ + Na⁺(aq) + NO₃⁻(aq)',
    netIonicEquation: 'Ag⁺(aq) + Cl⁻(aq) → AgCl(s)↓',
    reactionTypeVi: 'Phản ứng trao đổi ion (Nhận biết ion Cl⁻)',
    conditionsVi: 'Nhiệt độ phòng (25°C)',
    reactants: [
      { chemicalId: 'AgNO3', formula: 'AgNO₃', coefficient: 1, state: 'aq' },
      { chemicalId: 'NaCl', formula: 'NaCl', coefficient: 1, state: 'aq' }
    ],
    products: [
      { chemicalId: 'AgCl', formula: 'AgCl', coefficient: 1, state: 's' },
      { chemicalId: 'NaNO3', formula: 'NaNO₃', coefficient: 1, state: 'aq' }
    ],
    observations: {
      phenomenonVi: 'Tạo kết tủa trắng vón cục dạng nhũ tương (AgCl). Để ngoài ánh sáng kết tủa dần hóa xám đen do giải phóng Ag kim loại.',
      liquidColor: { r: 245, g: 245, b: 245, a: 0.25, hex: '#f5f5f5' },
      precipitate: {
        chemicalId: 'AgCl',
        formula: 'AgCl',
        nameVi: 'Bạc clorua',
        colorHex: '#ffffff',
        type: 'gelatinous',
        descriptionVi: 'Kết tủa trắng vón cục, nhạy sáng.'
      },
      gas: null,
      temperatureChangeC: 0.2,
      resultingPhEstimate: 7.0
    },
    educationalExplanationVi: {
      titleVi: 'Phản ứng nhận biết ion Halogenua (Cl⁻)',
      summaryVi: 'Ag⁺ kết tủa với Cl⁻ tạo AgCl trắng. AgCl tan được trong dung dịch amoniac dư tạo phức [Ag(NH₃)₂]⁺.',
      detailVi: 'Tích số tan của AgCl là 1.8 × 10⁻¹⁰. Khi chiếu sáng: 2AgCl → 2Ag(s) + Cl₂(g).',
      realWorldApplicationVi: 'Ứng dụng trong nhiếp ảnh truyền thống và phân tích định lượng Cl⁻ bằng phương pháp Mohr.'
    },
    safetyAdviceVi: {
      level: 'NOTICE',
      messageVi: 'AgNO₃ làm ố đen da và quần áo khi tiếp xúc do ion Ag⁺ bị khử thành Ag kim loại.',
      ppeRecommendedVi: ['Găng tay', 'Kính bảo hộ'],
      wasteHandlingVi: 'Thu gom vào bình thải thu hồi kim loại quý (Bạc).'
    },
    provenance: 'tier0_deterministic',
    createdAt: Date.now()
  },

  // 5. KI + Pb(NO3)2 (Golden Rain Precipitation)
  'KI+PbNO32': {
    id: 'rxn_ki_pbno32',
    canonicalKey: 'KI+PbNO32',
    schemaVersion: 1,
    equation: 'Pb(NO₃)₂(aq) + 2KI(aq) → PbI₂(s)↓ + 2KNO₃(aq)',
    ionicEquation: 'Pb²⁺(aq) + 2NO₃⁻(aq) + 2K⁺(aq) + 2I⁻(aq) → PbI₂(s)↓ + 2K⁺(aq) + 2NO₃⁻(aq)',
    netIonicEquation: 'Pb²⁺(aq) + 2I⁻(aq) → PbI₂(s)↓',
    reactionTypeVi: 'Phản ứng tạo kết tủa tinh thể (Mưa vàng)',
    conditionsVi: 'Nhiệt độ phòng (25°C)',
    reactants: [
      { chemicalId: 'PbNO32', formula: 'Pb(NO₃)₂', coefficient: 1, state: 'aq' },
      { chemicalId: 'KI', formula: 'KI', coefficient: 2, state: 'aq' }
    ],
    products: [
      { chemicalId: 'PbI2', formula: 'PbI₂', coefficient: 1, state: 's' },
      { chemicalId: 'KNO3', formula: 'KNO₃', coefficient: 2, state: 'aq' }
    ],
    observations: {
      phenomenonVi: 'Xuất hiện ngay kết tủa màu vàng tươi rực rỡ của PbI₂. Khi đun nóng kết tủa tan ra và khi làm nguội từ từ tạo thành các tinh thể lấp lánh như cơn mưa vàng.',
      liquidColor: { r: 254, g: 240, b: 138, a: 0.45, hex: '#fef08a' },
      precipitate: {
        chemicalId: 'PbI2',
        formula: 'PbI₂',
        nameVi: 'Chì(II) iotua',
        colorHex: '#eab308', // golden yellow
        type: 'crystalline',
        descriptionVi: 'Tinh thể vàng ánh kim tuyệt đẹp dạng phiến nhỏ.'
      },
      gas: null,
      temperatureChangeC: 0.1,
      resultingPhEstimate: 6.0
    },
    educationalExplanationVi: {
      titleVi: 'Thí nghiệm "Cơn Mưa Vàng" (Golden Rain)',
      summaryVi: 'PbI₂ có độ tan tăng mạnh theo nhiệt độ: ít tan ở nước lạnh nhưng tan tốt ở nước sôi, cho phép kết tinh lại tạo tinh thể vàng kim lấp lánh.',
      detailVi: 'Phản ứng giữa muối chì và muối iotua là một trong những minh họa trực quan đẹp mắt nhất trong giảng dạy hóa học đại cương.',
      realWorldApplicationVi: 'Trước đây PbI₂ được dùng làm chất màu vàng (iodine yellow) trong hội họa mỹ thuật.'
    },
    safetyAdviceVi: {
      level: 'CRITICAL',
      messageVi: 'Chì (Pb²⁺) là kim loại nặng cực độc, gây tổn thương hệ thần kinh. Tuyệt đối không để vương vãi hoặc xả thải bừa bãi!',
      ppeRecommendedVi: ['Kính bảo hộ', 'Áo blouse', 'Găng tay nitrile dày'],
      wasteHandlingVi: 'Thu gom vào bình chất thải nguy hại kim loại Chì (Toxic Heavy Metal Waste).'
    },
    provenance: 'tier0_deterministic',
    createdAt: Date.now()
  },

  // 6. CuSO4 + NaOH
  'CuSO4+NaOH': {
    id: 'rxn_cuso4_naoh',
    canonicalKey: 'CuSO4+NaOH',
    schemaVersion: 1,
    equation: 'CuSO₄(aq) + 2NaOH(aq) → Cu(OH)₂(s)↓ + Na₂SO₄(aq)',
    ionicEquation: 'Cu²⁺(aq) + SO₄²⁻(aq) + 2Na⁺(aq) + 2OH⁻(aq) → Cu(OH)₂(s)↓ + 2Na⁺(aq) + SO₄²⁻(aq)',
    netIonicEquation: 'Cu²⁺(aq) + 2OH⁻(aq) → Cu(OH)₂(s)↓',
    reactionTypeVi: 'Phản ứng tạo kết tủa Hydroxit kim loại',
    conditionsVi: 'Nhiệt độ phòng (25°C)',
    reactants: [
      { chemicalId: 'CuSO4', formula: 'CuSO₄', coefficient: 1, state: 'aq' },
      { chemicalId: 'NaOH', formula: 'NaOH', coefficient: 2, state: 'aq' }
    ],
    products: [
      { chemicalId: 'CuOH2', formula: 'Cu(OH)₂', coefficient: 1, state: 's' },
      { chemicalId: 'Na2SO4', formula: 'Na₂SO₄', coefficient: 1, state: 'aq' }
    ],
    observations: {
      phenomenonVi: 'Màu xanh lam của dung dịch nhạt dần, đồng thời xuất hiện kết tủa keo màu xanh da trời đặc trưng (Cu(OH)₂).',
      liquidColor: { r: 186, g: 230, b: 253, a: 0.3, hex: '#bae6fd' },
      precipitate: {
        chemicalId: 'CuOH2',
        formula: 'Cu(OH)₂',
        nameVi: 'Đồng(II) hidroxit',
        colorHex: '#38bdf8', // bright sky blue
        type: 'gelatinous',
        descriptionVi: 'Kết tủa keo nhớt màu xanh lơ đặc trưng.'
      },
      gas: null,
      temperatureChangeC: 1.0,
      resultingPhEstimate: 8.5
    },
    educationalExplanationVi: {
      titleVi: 'Điều chế Đồng(II) Hidroxit',
      summaryVi: 'Cu(OH)₂ là bazơ không tan, dễ tan trong axit tạo muối đồng và hòa tan được polyalcohol (như glixerol, glucozơ) tạo phức màu xanh lam thẫm.',
      detailVi: 'Nếu đun nóng nhẹ hỗn hợp trên ngọn lửa, Cu(OH)₂ sẽ phân hủy nhiệt mất nước tạo CuO màu đen: Cu(OH)₂ → CuO(s) + H₂O.',
      realWorldApplicationVi: 'Thuốc thử Trommer và Fehling trong hóa hữu cơ để nhận biết nhóm chức andehit và đường khử.'
    },
    safetyAdviceVi: {
      level: 'NOTICE',
      messageVi: 'Dung dịch chứa NaOH dư có tính kiềm ăn mòn. Cu²⁺ gây hại cho sinh vật thủy sinh.',
      ppeRecommendedVi: ['Kính bảo hộ', 'Găng tay'],
      wasteHandlingVi: 'Bình chứa chất thải ion kim loại nặng.'
    },
    provenance: 'tier0_deterministic',
    createdAt: Date.now()
  },

  // 7. Fe + CuSO4 (Single Displacement)
  'CuSO4+Fe': {
    id: 'rxn_fe_cuso4',
    canonicalKey: 'CuSO4+Fe',
    schemaVersion: 1,
    equation: 'Fe(s) + CuSO₄(aq) → FeSO₄(aq) + Cu(s)↓',
    ionicEquation: 'Fe(s) + Cu²⁺(aq) + SO₄²⁻(aq) → Fe²⁺(aq) + SO₄²⁻(aq) + Cu(s)↓',
    netIonicEquation: 'Fe(s) + Cu²⁺(aq) → Fe²⁺(aq) + Cu(s)↓',
    reactionTypeVi: 'Phản ứng thế kim loại (Oxi hóa - Khử)',
    conditionsVi: 'Nhiệt độ phòng (25°C)',
    reactants: [
      { chemicalId: 'Fe', formula: 'Fe', coefficient: 1, state: 's' },
      { chemicalId: 'CuSO4', formula: 'CuSO₄', coefficient: 1, state: 'aq' }
    ],
    products: [
      { chemicalId: 'FeSO4', formula: 'FeSO₄', coefficient: 1, state: 'aq' },
      { chemicalId: 'Cu', formula: 'Cu', coefficient: 1, state: 's' }
    ],
    observations: {
      phenomenonVi: 'Bề mặt đinh sắt dần phủ một lớp kim loại màu đỏ gạch (Cu). Màu xanh lam của dung dịch CuSO₄ nhạt dần và chuyển sang màu vàng lục nhạt của FeSO₄.',
      liquidColor: { r: 187, g: 247, b: 208, a: 0.4, hex: '#bbf7d0' }, // pale green-cyan
      precipitate: {
        chemicalId: 'Cu',
        formula: 'Cu',
        nameVi: 'Đồng kim loại',
        colorHex: '#b45309', // copper red
        type: 'metallic',
        descriptionVi: 'Lớp kim loại màu đỏ phủ bám ngoài thanh sắt.'
      },
      gas: null,
      temperatureChangeC: 0.8,
      resultingPhEstimate: 4.5
    },
    educationalExplanationVi: {
      titleVi: 'Kim loại mạnh đẩy kim loại yếu ra khỏi dung dịch muối',
      summaryVi: 'Sắt có thế khử chuẩn E°(Fe²⁺/Fe) = -0.44V nhỏ hơn đồng E°(Cu²⁺/Cu) = +0.34V, do đó Fe có tính khử mạnh hơn và khử Cu²⁺ thành Cu.',
      detailVi: 'Phản ứng minh họa định luật bảo toàn khối lượng và sự biến đổi màu sắc dung dịch theo ion kim loại chuyển tiếp.',
      realWorldApplicationVi: 'Phương pháp thủy luyện đồng từ quặng nghèo và mạ điện đồng.'
    },
    safetyAdviceVi: {
      level: 'NOTICE',
      messageVi: 'Dung dịch chứa muối đồng có độc tính với môi trường.',
      ppeRecommendedVi: ['Kính bảo hộ', 'Găng tay'],
      wasteHandlingVi: 'Bình thải kim loại nặng.'
    },
    provenance: 'tier0_deterministic',
    createdAt: Date.now()
  },

  // 8. CaCO3 + HCl (Gas evolution)
  'CaCO3+HCl': {
    id: 'rxn_caco3_hcl',
    canonicalKey: 'CaCO3+HCl',
    schemaVersion: 1,
    equation: 'CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + CO₂(g)↑ + H₂O(l)',
    ionicEquation: 'CaCO₃(s) + 2H⁺(aq) + 2Cl⁻(aq) → Ca²⁺(aq) + 2Cl⁻(aq) + CO₂(g)↑ + H₂O(l)',
    netIonicEquation: 'CaCO₃(s) + 2H⁺(aq) → Ca²⁺(aq) + CO₂(g)↑ + H₂O(l)',
    reactionTypeVi: 'Phản ứng axit tác dụng muối cacbonat (Sinh khí CO₂)',
    conditionsVi: 'Nhiệt độ phòng (25°C)',
    reactants: [
      { chemicalId: 'CaCO3', formula: 'CaCO₃', coefficient: 1, state: 's' },
      { chemicalId: 'HCl', formula: 'HCl', coefficient: 2, state: 'aq' }
    ],
    products: [
      { chemicalId: 'CaCl2', formula: 'CaCl₂', coefficient: 1, state: 'aq' },
      { chemicalId: 'CO2', formula: 'CO₂', coefficient: 1, state: 'g' },
      { chemicalId: 'H2O', formula: 'H₂O', coefficient: 1, state: 'l' }
    ],
    observations: {
      phenomenonVi: 'Mảnh đá vôi tan dần, sủi bọt khí không màu bốc lên mạnh mẽ (khí CO₂), dung dịch trong suốt không màu.',
      liquidColor: { r: 245, g: 250, b: 255, a: 0.1, hex: '#f5faff' },
      precipitate: null,
      gas: {
        chemicalId: 'CO2',
        formula: 'CO₂',
        nameVi: 'Khí Cacbon dioxit',
        bubbleRate: 0.85,
        descriptionVi: 'Khí không màu, không mùi, làm đục nước vôi trong.'
      },
      temperatureChangeC: 1.2,
      resultingPhEstimate: 5.5
    },
    educationalExplanationVi: {
      titleVi: 'Điều chế khí CO₂ trong phòng thí nghiệm',
      summaryVi: 'Axit mạnh HCl đẩy axit cacbonic yếu H₂CO₃ ra khỏi muối. H₂CO₃ không bền phân hủy ngay thành CO₂ và H₂O.',
      detailVi: 'Phản ứng xảy ra mãnh liệt trên bề mặt chất rắn. Khí CO₂ nặng hơn không khí và không duy trì sự cháy.',
      realWorldApplicationVi: 'Hiện tượng hòa tan đá vôi tạo thành các hang động caster tự nhiên trong địa chất.'
    },
    safetyAdviceVi: {
      level: 'NOTICE',
      messageVi: 'Khí thoát ra có thể cuốn theo hơi axit HCl. Cẩn thận không ghé sát mũi ngửi trực tiếp.',
      ppeRecommendedVi: ['Kính bảo hộ', 'Áo lab'],
      wasteHandlingVi: 'Dung dịch chứa CaCl₂ an toàn trung hòa xả cống.'
    },
    provenance: 'tier0_deterministic',
    createdAt: Date.now()
  },

  // 9. Zn + HCl (Hydrogen Gas evolution)
  'HCl+Zn': {
    id: 'rxn_zn_hcl',
    canonicalKey: 'HCl+Zn',
    schemaVersion: 1,
    equation: 'Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂(g)↑',
    ionicEquation: 'Zn(s) + 2H⁺(aq) + 2Cl⁻(aq) → Zn²⁺(aq) + 2Cl⁻(aq) + H₂(g)↑',
    netIonicEquation: 'Zn(s) + 2H⁺(aq) → Zn²⁺(aq) + H₂(g)↑',
    reactionTypeVi: 'Phản ứng kim loại tác dụng axit (Sinh khí H₂)',
    conditionsVi: 'Nhiệt độ phòng (25°C)',
    reactants: [
      { chemicalId: 'Zn', formula: 'Zn', coefficient: 1, state: 's' },
      { chemicalId: 'HCl', formula: 'HCl', coefficient: 2, state: 'aq' }
    ],
    products: [
      { chemicalId: 'ZnCl2', formula: 'ZnCl₂', coefficient: 1, state: 'aq' },
      { chemicalId: 'H2', formula: 'H₂', coefficient: 1, state: 'g' }
    ],
    observations: {
      phenomenonVi: 'Hạt kẽm tan dần, bọt khí không màu sủi bọt liên tục trên bề mặt kẽm và bay lên (khí H₂), tỏa nhiệt nhẹ.',
      liquidColor: { r: 245, g: 250, b: 255, a: 0.1, hex: '#f5faff' },
      precipitate: null,
      gas: {
        chemicalId: 'H2',
        formula: 'H₂',
        nameVi: 'Khí Hidro',
        bubbleRate: 0.75,
        descriptionVi: 'Khí không màu, nhẹ nhất trong các khí, cháy trong không khí với ngọn lửa xanh mờ kèm tiếng nổ "pốp".'
      },
      temperatureChangeC: 2.0,
      resultingPhEstimate: 3.5
    },
    educationalExplanationVi: {
      titleVi: 'Điều chế khí Hidro bằng phản ứng thế',
      summaryVi: 'Kẽm đứng trước hidro trong dãy hoạt động hóa học của kim loại, khử ion H⁺ thành H₂ tự do.',
      detailVi: 'Tốc độ phản ứng có thể gia tăng đáng kể nếu nhỏ thêm vài giọt dung dịch CuSO₄ (do tạo pin điện hóa ăn mòn Zn-Cu).',
      realWorldApplicationVi: 'Phương pháp kinh điển thu khí hidro trong bình kíp tại các phòng thí nghiệm trường học.'
    },
    safetyAdviceVi: {
      level: 'WARNING',
      messageVi: 'Khí H₂ dễ bắt lửa tạo hỗn hợp nổ nguy hiểm với oxy. Tránh xa mọi nguồn tia lửa và ngọn lửa trần.',
      ppeRecommendedVi: ['Kính bảo hộ', 'Áo blouse'],
      wasteHandlingVi: 'Bình thải chứa kim loại Kẽm (Heavy Metal).'
    },
    provenance: 'tier0_deterministic',
    createdAt: Date.now()
  },

  // 10. Na2CO3 + HCl
  'HCl+Na2CO3': {
    id: 'rxn_na2co3_hcl',
    canonicalKey: 'HCl+Na2CO3',
    schemaVersion: 1,
    equation: 'Na₂CO₃(aq) + 2HCl(aq) → 2NaCl(aq) + CO₂(g)↑ + H₂O(l)',
    ionicEquation: '2Na⁺(aq) + CO₃²⁻(aq) + 2H⁺(aq) + 2Cl⁻(aq) → 2Na⁺(aq) + 2Cl⁻(aq) + CO₂(g)↑ + H₂O(l)',
    netIonicEquation: 'CO₃²⁻(aq) + 2H⁺(aq) → CO₂(g)↑ + H₂O(l)',
    reactionTypeVi: 'Phản ứng muối cacbonat với axit mạnh',
    conditionsVi: 'Nhiệt độ phòng (25°C)',
    reactants: [
      { chemicalId: 'Na2CO3', formula: 'Na₂CO₃', coefficient: 1, state: 'aq' },
      { chemicalId: 'HCl', formula: 'HCl', coefficient: 2, state: 'aq' }
    ],
    products: [
      { chemicalId: 'NaCl', formula: 'NaCl', coefficient: 2, state: 'aq' },
      { chemicalId: 'CO2', formula: 'CO₂', coefficient: 1, state: 'g' },
      { chemicalId: 'H2O', formula: 'H₂O', coefficient: 1, state: 'l' }
    ],
    observations: {
      phenomenonVi: 'Sủi bọt khí CO₂ mãnh liệt trong toàn bộ thể tích chất lỏng, dung dịch vẫn giữ độ trong suốt.',
      liquidColor: { r: 245, g: 250, b: 255, a: 0.1, hex: '#f5faff' },
      precipitate: null,
      gas: {
        chemicalId: 'CO2',
        formula: 'CO₂',
        nameVi: 'Khí Cacbon dioxit',
        bubbleRate: 0.95,
        descriptionVi: 'Khí sủi bọt nhanh chóng trong dung dịch.'
      },
      temperatureChangeC: 1.5,
      resultingPhEstimate: 6.5
    },
    educationalExplanationVi: {
      titleVi: 'Phản ứng giữa muối cacbonat tan và axit',
      summaryVi: 'Ion cacbonat (CO₃²⁻) kết hợp ion H⁺ qua hai giai đoạn: đầu tiên tạo HCO₃⁻, sau đó sinh khí CO₂.',
      detailVi: 'Phản ứng xảy ra đồng thể nên tốc độ sủi bọt nhanh hơn đáng kể so với đá vôi rắn CaCO₃.',
      realWorldApplicationVi: 'Ứng dụng trong bột nở làm bánh nướng (baking soda) và viên sủi bọt y tế.'
    },
    safetyAdviceVi: {
      level: 'NOTICE',
      messageVi: 'Dung dịch sủi bọt nhanh có thể trào ra ngoài miệng ống nghiệm nếu cho lượng lớn.',
      ppeRecommendedVi: ['Kính bảo hộ'],
      wasteHandlingVi: 'Xả bồn rửa phòng lab với nước.'
    },
    provenance: 'tier0_deterministic',
    createdAt: Date.now()
  },

  // 11. FeCl3 + NaOH
  'FeCl3+NaOH': {
    id: 'rxn_fecl3_naoh',
    canonicalKey: 'FeCl3+NaOH',
    schemaVersion: 1,
    equation: 'FeCl₃(aq) + 3NaOH(aq) → Fe(OH)₃(s)↓ + 3NaCl(aq)',
    ionicEquation: 'Fe³⁺(aq) + 3Cl⁻(aq) + 3Na⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s)↓ + 3Na⁺(aq) + 3Cl⁻(aq)',
    netIonicEquation: 'Fe³⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s)↓',
    reactionTypeVi: 'Phản ứng tạo kết tủa Sắt(III) hidroxit',
    conditionsVi: 'Nhiệt độ phòng (25°C)',
    reactants: [
      { chemicalId: 'FeCl3', formula: 'FeCl₃', coefficient: 1, state: 'aq' },
      { chemicalId: 'NaOH', formula: 'NaOH', coefficient: 3, state: 'aq' }
    ],
    products: [
      { chemicalId: 'FeOH3', formula: 'Fe(OH)₃', coefficient: 1, state: 's' },
      { chemicalId: 'NaCl', formula: 'NaCl', coefficient: 3, state: 'aq' }
    ],
    observations: {
      phenomenonVi: 'Dung dịch màu nâu vàng chuyển sang xuất hiện kết tủa màu nâu đỏ đậm (Fe(OH)₃) lắng dần.',
      liquidColor: { r: 254, g: 215, b: 170, a: 0.35, hex: '#fed7aa' },
      precipitate: {
        chemicalId: 'FeOH3',
        formula: 'Fe(OH)₃',
        nameVi: 'Sắt(III) hidroxit',
        colorHex: '#9a3412', // rust red-brown
        type: 'gelatinous',
        descriptionVi: 'Kết tủa màu nâu đỏ dạng keo tụ.'
      },
      gas: null,
      temperatureChangeC: 1.0,
      resultingPhEstimate: 8.0
    },
    educationalExplanationVi: {
      titleVi: 'Nhận biết ion Sắt(III) (Fe³⁺)',
      summaryVi: 'Ion Fe³⁺ tạo kết tủa Fe(OH)₃ màu nâu đỏ rất đặc trưng khi gặp ion OH⁻ bazơ, không tan trong kiềm dư.',
      detailVi: 'Tích số tan rất bé Ksp ≈ 1 × 10⁻³⁸ giúp kết tủa hoàn toàn ngay cả ở pH tương đối thấp.',
      realWorldApplicationVi: 'Ứng dụng làm chất keo tụ xử lý nước cấp và nước thải công nghiệp.'
    },
    safetyAdviceVi: {
      level: 'NOTICE',
      messageVi: 'Dung dịch sắt làm ố màu dụng cụ và quần áo.',
      ppeRecommendedVi: ['Kính bảo hộ', 'Găng tay'],
      wasteHandlingVi: 'Bình thu gom kim loại.'
    },
    provenance: 'tier0_deterministic',
    createdAt: Date.now()
  }
};
