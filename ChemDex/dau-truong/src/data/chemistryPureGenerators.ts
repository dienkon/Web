// src/data/chemistryPureGenerators.ts
// Bộ sinh đề ngẫu nhiên chuyên sâu 100% HÓA HỌC cho ChemDex Arena (THCS & THPT)
// Tuyệt đối không chứa Toán, Lí hay các môn ngoài Hóa học.

export interface ChemistryGeneratedQuestion {
  id: string;
  mode: string;
  difficulty: 'easy' | 'medium' | 'hard';
  grade: number;
  chapter: string;
  equation: string;          // Nội dung câu hỏi
  correctValue: number | string;
  acceptedAnswers: string[];  // Danh sách đáp án chấp nhận
  unit?: string;             // Đơn vị nếu có (VD: g/mol, mol, L, %, M, pH...)
  explanation: string;       // Lời giải từng bước chi tiết
  timeLimitSec: number;
  options?: string[];        // Dành cho trắc nghiệm 4 lựa chọn (ChoiceGame)
  correctIndex?: number;     // Vị trí đáp án đúng (0, 1, 2, 3)
  tolerance?: number;        // Sai số nếu là bài tính toán
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function roundDecimal(num: number, digits: number = 2): number {
  const p = Math.pow(10, digits);
  return Math.round(num * p) / p;
}

/**
 * 1. TÍNH TOÁN HÓA HỌC (mol_calc):
 * Số mol, khối lượng mol, nồng độ C%, CM, thể tích khí, tính theo PTHH.
 */
export function generateMolCalcQuestion(difficulty: 'easy' | 'medium' | 'hard'): ChemistryGeneratedQuestion {
  const id = `mol_${difficulty}_${Date.now()}_${randInt(100, 999)}`;

  if (difficulty === 'easy') {
    const types = ['molar_mass', 'mass_to_mol', 'mol_to_volume'];
    const chosenType = pickRandom(types);

    if (chosenType === 'molar_mass') {
      const items = [
        { formula: 'NaCl', M: 58.5, exp: 'M_NaCl = 23 (Na) + 35.5 (Cl) = 58.5 g/mol' },
        { formula: 'CaCO3', M: 100, exp: 'M_CaCO3 = 40 (Ca) + 12 (C) + 16×3 (O) = 100 g/mol' },
        { formula: 'H2SO4', M: 98, exp: 'M_H2SO4 = 1×2 (H) + 32 (S) + 16×4 (O) = 98 g/mol' },
        { formula: 'NaOH', M: 40, exp: 'M_NaOH = 23 (Na) + 16 (O) + 1 (H) = 40 g/mol' },
        { formula: 'Fe2O3', M: 160, exp: 'M_Fe2O3 = 56×2 (Fe) + 16×3 (O) = 160 g/mol' },
        { formula: 'CuSO4', M: 160, exp: 'M_CuSO4 = 64 (Cu) + 32 (S) + 16×4 (O) = 160 g/mol' },
        { formula: 'Al2O3', M: 102, exp: 'M_Al2O3 = 27×2 (Al) + 16×3 (O) = 102 g/mol' },
        { formula: 'KMnO4', M: 158, exp: 'M_KMnO4 = 39 (K) + 55 (Mn) + 16×4 (O) = 158 g/mol' },
        { formula: 'BaSO4', M: 233, exp: 'M_BaSO4 = 137 (Ba) + 32 (S) + 16×4 (O) = 233 g/mol' },
      ];
      const item = pickRandom(items);
      return {
        id,
        mode: 'mol_calc',
        difficulty,
        grade: 8,
        chapter: 'Mol và Tính toán Hóa học',
        equation: `Tính khối lượng mol phân tử của hợp chất [${item.formula}] (đơn vị: g/mol).`,
        correctValue: item.M,
        acceptedAnswers: [String(item.M), String(item.M).replace('.', ',')],
        unit: 'g/mol',
        explanation: item.exp,
        timeLimitSec: 45,
      };
    }

    if (chosenType === 'mass_to_mol') {
      const items = [
        { name: 'sắt (Fe)', m: 11.2, M: 56, n: 0.2 },
        { name: 'nhôm (Al)', m: 5.4, M: 27, n: 0.2 },
        { name: 'magie (Mg)', m: 4.8, M: 24, n: 0.2 },
        { name: 'đồng (Cu)', m: 12.8, M: 64, n: 0.2 },
        { name: 'kẽm (Zn)', m: 13, M: 65, n: 0.2 },
        { name: 'canxi cacbonat (CaCO3)', m: 20, M: 100, n: 0.2 },
        { name: 'natri hidroxit (NaOH)', m: 8, M: 40, n: 0.2 },
      ];
      const item = pickRandom(items);
      return {
        id,
        mode: 'mol_calc',
        difficulty,
        grade: 8,
        chapter: 'Mol và Tính toán Hóa học',
        equation: `Tính số mol của ${item.m} gam ${item.name} (biết M = ${item.M} g/mol).`,
        correctValue: item.n,
        acceptedAnswers: [String(item.n), String(item.n).replace('.', ',')],
        unit: 'mol',
        explanation: `Áp dụng công thức số mol: n = m / M = ${item.m} / ${item.M} = ${item.n} mol.`,
        timeLimitSec: 45,
      };
    }

    // mol_to_volume
    const n = pickRandom([0.1, 0.2, 0.25, 0.5, 1, 1.5, 2]);
    const V = roundDecimal(n * 22.4, 2);
    return {
      id,
      mode: 'mol_calc',
      difficulty,
      grade: 8,
      chapter: 'Chất khí và Thể tích mol',
      equation: `Tính thể tích của ${n} mol khí oxi (O2) ở điều kiện tiêu chuẩn (đktc, lít).`,
      correctValue: V,
      acceptedAnswers: [String(V), String(V).replace('.', ',')],
      unit: 'lít',
      explanation: `Ở đktc (0°C, 1 atm), thể tích mol chất khí: V = n × 22.4 = ${n} × 22.4 = ${V} lít.`,
      timeLimitSec: 45,
    };
  }

  if (difficulty === 'medium') {
    const types = ['c_percent', 'cm_calc', 'element_percent'];
    const chosenType = pickRandom(types);

    if (chosenType === 'c_percent') {
      const mct = pickRandom([10, 15, 20, 25, 30, 40, 50]);
      const mnc = pickRandom([90, 100, 150, 160, 175, 200]);
      const mdd = mct + mnc;
      const cPercent = roundDecimal((mct / mdd) * 100, 1);
      return {
        id,
        mode: 'mol_calc',
        difficulty,
        grade: 8,
        chapter: 'Dung dịch - Nồng độ phần trăm C%',
        equation: `Hòa tan ${mct} g muối ăn NaCl vào ${mnc} g nước tinh khiết. Tính nồng độ phần trăm (C%) của dung dịch thu được (làm tròn 1 chữ số thập phân).`,
        correctValue: cPercent,
        acceptedAnswers: [String(cPercent), String(cPercent).replace('.', ','), `${cPercent}%`],
        unit: '%',
        tolerance: 0.2,
        explanation: `Khối lượng dung dịch thu được: m_dd = m_ct + m_H2O = ${mct} + ${mnc} = ${mdd} g.\nNồng độ phần trăm: C% = (m_ct / m_dd) × 100% = (${mct} / ${mdd}) × 100% ≈ ${cPercent}%.`,
        timeLimitSec: 60,
      };
    }

    if (chosenType === 'cm_calc') {
      const n = pickRandom([0.1, 0.2, 0.4, 0.5, 0.75, 1, 1.5]);
      const V_ml = pickRandom([200, 250, 400, 500, 800, 1000]);
      const V_lit = V_ml / 1000;
      const CM = roundDecimal(n / V_lit, 2);
      return {
        id,
        mode: 'mol_calc',
        difficulty,
        grade: 8,
        chapter: 'Dung dịch - Nồng độ mol CM',
        equation: `Hòa tan ${n} mol NaOH vào nước thu được ${V_ml} mL dung dịch. Tính nồng độ mol (CM) của dung dịch (M).`,
        correctValue: CM,
        acceptedAnswers: [String(CM), String(CM).replace('.', ',')],
        unit: 'M',
        explanation: `Đổi thể tích ra lít: V = ${V_ml} mL = ${V_lit} L.\nNồng độ mol: C_M = n / V = ${n} / ${V_lit} = ${CM} M.`,
        timeLimitSec: 60,
      };
    }

    // % khối lượng nguyên tố
    const compounds = [
      { name: 'Fe2O3', elem: 'Fe', mass: 112, M: 160, val: 70 },
      { name: 'CaCO3', elem: 'Ca', mass: 40, M: 100, val: 40 },
      { name: 'SO2', elem: 'S', mass: 32, M: 64, val: 50 },
      { name: 'CH4', elem: 'C', mass: 12, M: 16, val: 75 },
      { name: 'CO2', elem: 'C', mass: 12, M: 44, val: 27.3 },
    ];
    const c = pickRandom(compounds);
    return {
      id,
      mode: 'mol_calc',
      difficulty,
      grade: 8,
      chapter: 'Công thức hóa học & Thành phần %',
      equation: `Tính phần trăm khối lượng (%m) của nguyên tố ${c.elem} trong hợp chất ${c.name} (làm tròn 1 chữ số thập phân).`,
      correctValue: c.val,
      acceptedAnswers: [String(c.val), String(c.val).replace('.', ','), `${c.val}%`],
      unit: '%',
      tolerance: 0.2,
      explanation: `Khối lượng mol của ${c.name} là ${c.M} g/mol.\n%m_${c.elem} = (${c.mass} / ${c.M}) × 100% ≈ ${c.val}%.`,
      timeLimitSec: 60,
    };
  }

  // hard: Tính toán theo PTHH
  const reactions = [
    {
      metal: 'Mg',
      M: 24,
      n: pickRandom([0.1, 0.2, 0.25, 0.3, 0.5]),
      pt: 'Mg + 2HCl -> MgCl2 + H2',
      ask: 'H2 (ở đktc)',
      calcV: (nVal: number) => roundDecimal(nVal * 22.4, 2),
    },
    {
      metal: 'Fe',
      M: 56,
      n: pickRandom([0.1, 0.2, 0.3, 0.5]),
      pt: 'Fe + 2HCl -> FeCl2 + H2',
      ask: 'H2 (ở đktc)',
      calcV: (nVal: number) => roundDecimal(nVal * 22.4, 2),
    },
    {
      metal: 'Zn',
      M: 65,
      n: pickRandom([0.1, 0.2, 0.4]),
      pt: 'Zn + H2SO4 -> ZnSO4 + H2',
      ask: 'H2 (ở đktc)',
      calcV: (nVal: number) => roundDecimal(nVal * 22.4, 2),
    },
  ];
  const r = pickRandom(reactions);
  const m = roundDecimal(r.n * r.M, 2);
  const vGas = r.calcV(r.n);

  return {
    id,
    mode: 'mol_calc',
    difficulty,
    grade: 9,
    chapter: 'Tính toán theo Phương trình Hóa học',
    equation: `Cho ${m} gam ${r.metal} phản ứng hoàn toàn với dung dịch axit dư theo sơ đồ:\n${r.pt}\nTính thể tích khí ${r.ask} thoát ra (lít).`,
    correctValue: vGas,
    acceptedAnswers: [String(vGas), String(vGas).replace('.', ',')],
    unit: 'lít',
    tolerance: 0.1,
    explanation: `Số mol kim loại: n_${r.metal} = ${m} / ${r.M} = ${r.n} mol.\nTheo phương trình phản ứng: n_H2 = n_${r.metal} = ${r.n} mol.\nThể tích khí H2 sinh ra ở đktc: V = ${r.n} × 22.4 = ${vGas} lít.`,
    timeLimitSec: 90,
  };
}

/**
 * 2. NHẬN BIẾT & ỨNG DỤNG HÓA CHẤT (substance_match)
 */
export const CHEMISTRY_RECOGNITION_DATA = [
  {
    target: 'Khí SO2 (Lưu huỳnh đioxit)',
    feature: 'Làm mất màu dung dịch nước brom (Br2) và dung dịch thuốc tím (KMnO4)',
    options: [
      'Làm mất màu dung dịch nước brom (Br2) và dung dịch thuốc tím (KMnO4)',
      'Làm que đốm bùng cháy mãnh liệt',
      'Tạo kết tủa đen với dung dịch chì axetat',
      'Làm quỳ tím hóa xanh ngay lập tức'
    ],
    explanation: 'Khí SO2 có tính khử mạnh, phản ứng làm mất màu nâu đỏ của dung dịch brom: SO2 + Br2 + 2H2O -> 2HBr + H2SO4.'
  },
  {
    target: 'Ion SO4 2- (Gốc sunfat trong H2SO4, Na2SO4)',
    feature: 'Tạo kết tủa trắng BaSO4 bền không tan trong mọi axit mạnh',
    options: [
      'Tạo kết tủa trắng BaSO4 bền không tan trong mọi axit mạnh',
      'Tạo kết tủa vàng tươi AgI',
      'Sủi bọt khí không màu có mùi trứng thối',
      'Làm phenolphtalein chuyển sang màu hồng đậm'
    ],
    explanation: 'Dung dịch chứa muối bari (BaCl2, Ba(OH)2) là thuốc thử đặc trưng nhất để nhận biết ion sunfat SO4 2- do tạo kết tủa trắng BaSO4 không tan trong axit.'
  },
  {
    target: 'Ion Cl- (Gốc clorua trong HCl, NaCl)',
    feature: 'Tác dụng với dung dịch AgNO3 tạo kết tủa trắng AgCl',
    options: [
      'Tác dụng với dung dịch AgNO3 tạo kết tủa trắng AgCl',
      'Tạo kết tủa keo trắng tan trong kiềm dư',
      'Làm quỳ tím chuyển màu đỏ rực',
      'Tác dụng với dung dịch BaCl2 tạo kết tủa vàng'
    ],
    explanation: 'Thuốc thử đặc trưng nhận biết ion Cl- là dung dịch bạc nitrat AgNO3: Ag+ + Cl- -> AgCl (kết tủa trắng vón, hoá đen ngoài ánh sáng).'
  },
  {
    target: 'Hồ tinh bột',
    feature: 'Tạo phức màu xanh tím đặc trưng khi tiếp xúc với dung dịch Iot (I2)',
    options: [
      'Tạo phức màu xanh tím đặc trưng khi tiếp xúc với dung dịch Iot (I2)',
      'Làm quỳ tím chuyển sang màu xanh lục',
      'Tạo kết tủa đỏ gạch Cu2O khi đun nóng với Cu(OH)2',
      'Tác dụng với Na giải phóng khí hiđro'
    ],
    explanation: 'Phản ứng màu của hồ tinh bột với dung dịch iot là phản ứng đặc trưng: phân tử iot chui vào các xoắn của amilozơ tạo phức chất màu xanh tím.'
  },
  {
    target: 'Glucozơ (C6H12O6)',
    feature: 'Phản ứng tráng bạc với AgNO3 trong NH3 tạo lớp bạc sáng bóng',
    options: [
      'Phản ứng tráng bạc với AgNO3 trong NH3 tạo lớp bạc sáng bóng',
      'Làm mất màu dung dịch nước vôi trong',
      'Tác dụng với dung dịch FeCl3 tạo dung dịch màu tím',
      'Làm giấy quỳ tím hóa đỏ tươi'
    ],
    explanation: 'Do chứa nhóm anđehit (-CHO) trong cấu tạo dạng mạch hở, glucozơ có tính khử mạnh và tham gia phản ứng tráng bạc tạo Ag kim loại.'
  },
  {
    target: 'Khí CO2 (Cacbon đioxit)',
    feature: 'Làm vẩn đục dung dịch nước vôi trong Ca(OH)2 do tạo kết tủa trắng CaCO3',
    options: [
      'Làm vẩn đục dung dịch nước vôi trong Ca(OH)2 do tạo kết tủa trắng CaCO3',
      'Làm dung dịch phenolphtalein hóa hồng rực rỡ',
      'Cháy với ngọn lửa màu xanh nhạt tỏa nhiều nhiệt',
      'Tạo kết tủa màu nâu đỏ với dung dịch NaOH'
    ],
    explanation: 'CO2 là oxit axit tác dụng với dung dịch nước vôi trong tạo canxi cacbonat không tan: CO2 + Ca(OH)2 -> CaCO3↓ + H2O.'
  },
  {
    target: 'Etilen (C2H4)',
    feature: 'Làm mất màu dung dịch nước brom (Br2) ngay ở điều kiện thường',
    options: [
      'Làm mất màu dung dịch nước brom (Br2) ngay ở điều kiện thường',
      'Tác dụng với kim loại Na giải phóng khí H2',
      'Tạo kết tủa vàng nhạt với dung dịch Ba(OH)2',
      'Làm dung dịch chuyển sang màu xanh lam đậm'
    ],
    explanation: 'Etilen có liên kết đôi C=C kém bền nên dễ tham gia phản ứng cộng làm mất màu dung dịch nước brom: C2H4 + Br2 -> C2H4Br2.'
  },
  {
    target: 'Vôi sống (Canxi oxit - CaO)',
    feature: 'Hút ẩm, tỏa nhiệt dữ dội khi tôi vôi và dùng để khử chua đất nông nghiệp',
    options: [
      'Hút ẩm, tỏa nhiệt dữ dội khi tôi vôi và dùng để khử chua đất nông nghiệp',
      'Làm gia vị thực phẩm và chất bảo quản hải sản',
      'Làm thuốc nhuộm tóc và tẩy trắng bột giấy',
      'Làm chất bôi trơn trong các động cơ đốt trong'
    ],
    explanation: 'CaO tác dụng mãnh liệt với nước sinh Ca(OH)2 tỏa nhiều nhiệt. Ca(OH)2 có tính bazơ giúp trung hòa axit trong đất phèn, khử chua hiệu quả.'
  },
  {
    target: 'Baking soda (Natri hiđrocacbonat - NaHCO3)',
    feature: 'Làm bột nở trong bánh bông lan và làm thuốc giảm đau dạ dày',
    options: [
      'Làm bột nở trong bánh bông lan và làm thuốc giảm đau dạ dày',
      'Sản xuất phân đạm bón cho cây lúa nước',
      'Chất diệt khuẩn sát trùng dụng cụ phẫu thuật y tế',
      'Chất xúc tác trong phản ứng luyện gang thép'
    ],
    explanation: 'NaHCO3 bị nhiệt phân sinh khí CO2 làm xốp bánh. Trong y học, NaHCO3 trung hòa bớt axit HCl dư trong dạ dày: NaHCO3 + HCl -> NaCl + CO2 + H2O.'
  },
];

export function generateSubstanceMatchQuestion(difficulty: 'easy' | 'medium' | 'hard'): ChemistryGeneratedQuestion {
  const id = `recog_${difficulty}_${Date.now()}_${randInt(100, 999)}`;
  const item = pickRandom(CHEMISTRY_RECOGNITION_DATA);
  const shuffledOptions = [...item.options].sort(() => Math.random() - 0.5);
  let correctIdx = shuffledOptions.indexOf(item.feature);
  if (correctIdx === -1) {
    shuffledOptions[0] = item.feature;
    correctIdx = 0;
  }
  const letterMap = ['A', 'B', 'C', 'D'];
  const correctLetter = letterMap[correctIdx] || 'A';

  return {
    id,
    mode: 'substance_match',
    difficulty,
    grade: 9,
    chapter: 'Nhận biết & Ứng dụng Hóa chất',
    equation: `Hiện tượng hoặc ứng dụng đặc trưng nhất dùng để nhận biết [${item.target}] là gì?`,
    correctValue: item.feature,
    correctIndex: correctIdx,
    options: shuffledOptions,
    acceptedAnswers: [
      item.feature.toLowerCase(),
      correctLetter.toLowerCase(),
      String(correctIdx + 1),
    ],
    explanation: item.explanation,
    timeLimitSec: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 65 : 90,
  };
}

/**
 * 3. DUNG DỊCH, AXIT - BAZƠ & ĐỘ pH (solution_ph)
 */
export const PH_QUESTIONS_DATA = [
  {
    equation: 'Dung dịch axit clohiđric (HCl 0.1M) làm đổi màu quỳ tím và có giá trị pH khoảng bao nhiêu?',
    options: ['Làm quỳ tím hóa đỏ, pH ≈ 1', 'Làm quỳ tím hóa xanh, pH ≈ 13', 'Không đổi màu quỳ tím, pH = 7', 'Làm phenolphtalein hóa hồng, pH ≈ 11'],
    answer: 'Làm quỳ tím hóa đỏ, pH ≈ 1',
    explanation: 'HCl là axit mạnh phân li hoàn toàn: [H+] = 0.1M => pH = -log(0.1) = 1. Môi trường axit làm quỳ tím hóa đỏ.'
  },
  {
    equation: 'Dung dịch natri hiđroxit (NaOH 0.01M) làm đổi màu các chất chỉ thị như thế nào?',
    options: ['Làm quỳ tím hóa xanh, phenolphtalein hóa hồng', 'Làm quỳ tím hóa đỏ, phenolphtalein không màu', 'Không làm đổi màu cả hai chất chỉ thị', 'Làm quỳ tím hóa xanh, phenolphtalein mất màu'],
    answer: 'Làm quỳ tím hóa xanh, phenolphtalein hóa hồng',
    explanation: 'NaOH là bazơ kiềm mạnh, pH > 7 làm quỳ tím chuyển màu xanh và làm dung dịch phenolphtalein không màu chuyển sang màu hồng đậm.'
  },
  {
    equation: 'Nước cất tinh khiết ở 25°C có giá trị pH bằng bao nhiêu và thuộc môi trường gì?',
    options: ['pH = 7 (môi trường trung tính)', 'pH < 7 (môi trường axit nhẹ)', 'pH > 7 (môi trường bazơ)', 'pH = 0 (môi trường không ion)'],
    answer: 'pH = 7 (môi trường trung tính)',
    explanation: 'Ở 25°C, nước tinh khiết có [H+] = [OH-] = 10^-7 M, do đó pH = 7 là môi trường trung tính hoàn hảo.'
  },
  {
    equation: 'Trộn 100 mL dung dịch HCl 0.1M với 100 mL dung dịch NaOH 0.1M thu được dung dịch có pH bằng bao nhiêu?',
    options: ['pH = 7', 'pH = 1', 'pH = 13', 'pH = 3'],
    answer: 'pH = 7',
    explanation: 'Số mol HCl = 0.1 × 0.1 = 0.01 mol. Số mol NaOH = 0.1 × 0.1 = 0.01 mol. Hai chất phản ứng vừa đủ theo tỉ lệ 1:1 tạo NaCl trung tính, pH = 7.'
  },
  {
    equation: 'Mưa axit là hiện tượng nước mưa có độ pH dưới bao nhiêu, gây hại cho mùa màng và công trình kiến trúc?',
    options: ['pH < 5.6', 'pH < 7.0', 'pH < 2.0', 'pH > 8.5'],
    answer: 'pH < 5.6',
    explanation: 'Nước mưa bình thường hòa tan CO2 có pH ≈ 5.6. Khi nhiễm khí SO2, NOx từ khí thải nhà máy, nước mưa có pH < 5.6 được gọi là mưa axit.'
  },
  {
    equation: 'Để hạ độ chua của đất trồng có pH = 4.5 về mức thích hợp cho cây trồng, người nông dân thường bón chất nào?',
    options: ['Vôi bột (CaO hoặc Ca(OH)2)', 'Phân đạm ure ((NH2)2CO)', 'Muối ăn (NaCl)', 'Dung dịch axit sunfuric loãng'],
    answer: 'Vôi bột (CaO hoặc Ca(OH)2)',
    explanation: 'Đất chua có pH < 7 chứa nhiều ion H+. Vôi tôi Ca(OH)2 có tính bazơ giúp trung hòa ion H+, nâng pH của đất lên mức màu mỡ.'
  },
];

export function generateSolutionPhQuestion(difficulty: 'easy' | 'medium' | 'hard'): ChemistryGeneratedQuestion {
  const id = `ph_${difficulty}_${Date.now()}_${randInt(100, 999)}`;
  const item = pickRandom(PH_QUESTIONS_DATA);
  const shuffledOptions = [...item.options].sort(() => Math.random() - 0.5);
  let correctIdx = shuffledOptions.indexOf(item.answer);
  if (correctIdx === -1) {
    shuffledOptions[0] = item.answer;
    correctIdx = 0;
  }
  const letterMap = ['A', 'B', 'C', 'D'];
  const correctLetter = letterMap[correctIdx] || 'A';

  return {
    id,
    mode: 'solution_ph',
    difficulty,
    grade: 11,
    chapter: 'Cân bằng ion trong dung dịch & Độ pH',
    equation: item.equation,
    correctValue: item.answer,
    correctIndex: correctIdx,
    options: shuffledOptions,
    acceptedAnswers: [
      item.answer.toLowerCase(),
      correctLetter.toLowerCase(),
      String(correctIdx + 1),
    ],
    explanation: item.explanation,
    timeLimitSec: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 85,
  };
}

/**
 * 4. HÓA HỌC HỮU CƠ (organic_reactions):
 * Hiđrocacbon, Ancol, Este, Cacbohiđrat, Amino axit, Polime.
 */
export const ORGANIC_QUESTIONS_DATA = [
  {
    equation: 'Phản ứng đặc trưng giữa axit axetic (CH3COOH) và ancol etylic (C2H5OH) có mặt H2SO4 đặc làm xúc tác là phản ứng gì?',
    options: ['Phản ứng este hóa tạo etyl axetat', 'Phản ứng trùng ngưng tạo tơ nilon', 'Phản ứng xà phòng hóa tạo xà phòng', 'Phản ứng cộng hợp làm mất màu brom'],
    answer: 'Phản ứng este hóa tạo etyl axetat',
    explanation: 'CH3COOH + C2H5OH <->[H2SO4 d, t°] CH3COOC2H5 (etyl axetat có mùi thơm quả chín) + H2O. Đây là phản ứng este hóa thuận nghịch.'
  },
  {
    equation: 'Khi đun nóng chất béo (trieste của glixerol và axit béo) với dung dịch kiềm NaOH, sản phẩm thu được gồm những chất nào?',
    options: ['Xà phòng (muối natri của axit béo) và glixerol', 'Axit béo tự do và khí metan', 'Etyl axetat và nước', 'Rượu etylic và natri cacbonat'],
    answer: 'Xà phòng (muối natri của axit béo) và glixerol',
    explanation: 'Thủy phân chất béo trong môi trường kiềm gọi là phản ứng xà phòng hóa: (RCOO)3C3H5 + 3NaOH -> 3RCOONa (xà phòng) + C3H5(OH)3 (glixerol).'
  },
  {
    equation: 'Hợp chất hữu cơ nào sau đây tham gia phản ứng cộng brom (Br2) và phản ứng trùng hợp tạo nhựa PE?',
    options: ['Etilen (CH2=CH2)', 'Metan (CH4)', 'Benzen (C6H6)', 'Axit axetic (CH3COOH)'],
    answer: 'Etilen (CH2=CH2)',
    explanation: 'Etilen có liên kết đôi C=C, tham gia phản ứng trùng hợp ở nhiệt độ và áp suất cao: n CH2=CH2 -> (-CH2-CH2-)n (nhựa polietilen - PE).'
  },
  {
    equation: 'Polime nào sau đây được tổng hợp từ phản ứng trùng hợp vinyl clorua (CH2=CHCl)?',
    options: ['Poli(vinyl clorua) - nhựa PVC', 'Tơ nitron (olon)', 'Poli(etylen terephtalat) - PET', 'Cao su buna-S'],
    answer: 'Poli(vinyl clorua) - nhựa PVC',
    explanation: 'Trùng hợp vinyl clorua: n CH2=CHCl -> (-CH2-CH(Cl)-)n tạo thành nhựa PVC dùng làm ống dẫn nước, vỏ bọc dây điện.'
  },
  {
    equation: 'Khi nhỏ vài giọt dung dịch Iot (I2) vào lát cắt củ khoai lang hoặc cơm nguội, ta quan sát được hiện tượng gì?',
    options: ['Xuất hiện màu xanh tím đặc trưng', 'Xuất hiện kết tủa trắng', 'Có sủi bọt khí không màu', 'Chuyển sang màu đỏ rực'],
    answer: 'Xuất hiện màu xanh tím đặc trưng',
    explanation: 'Khoai lang và cơm nguội chứa nhiều tinh bột. Tinh bột tạo phức chất màu xanh tím đặc trưng với phân tử iot.'
  },
  {
    equation: 'Để làm sạch dầu mỡ dính trên chảo rán bát đĩa, ta dùng nước rửa chén. Cơ chế làm sạch dựa trên tính chất gì?',
    options: ['Chất hoạt động bề mặt tạo nhũ tương phân tán dầu mỡ vào nước', 'Axit mạnh hòa tan hoàn toàn chất béo', 'Phản ứng đốt cháy chất béo thành CO2 và H2O', 'Khí clo tẩy trắng hòa tan lipit'],
    answer: 'Chất hoạt động bề mặt tạo nhũ tương phân tán dầu mỡ vào nước',
    explanation: 'Nước rửa chén chứa phân tử chất hoạt động bề mặt có 1 đầu ưa nước và 1 đuôi kỵ nước (ưa dầu), giúp bọc các giọt chất béo và phân tán vào nước.'
  },
];

export function generateOrganicQuestion(difficulty: 'easy' | 'medium' | 'hard'): ChemistryGeneratedQuestion {
  const id = `org_${difficulty}_${Date.now()}_${randInt(100, 999)}`;
  const item = pickRandom(ORGANIC_QUESTIONS_DATA);
  const shuffledOptions = [...item.options].sort(() => Math.random() - 0.5);
  let correctIdx = shuffledOptions.indexOf(item.answer);
  if (correctIdx === -1) {
    shuffledOptions[0] = item.answer;
    correctIdx = 0;
  }
  const letterMap = ['A', 'B', 'C', 'D'];
  const correctLetter = letterMap[correctIdx] || 'A';

  return {
    id,
    mode: 'organic_reactions',
    difficulty,
    grade: 12,
    chapter: 'Hóa học Hữu cơ & Polime',
    equation: item.equation,
    correctValue: item.answer,
    correctIndex: correctIdx,
    options: shuffledOptions,
    acceptedAnswers: [
      item.answer.toLowerCase(),
      correctLetter.toLowerCase(),
      String(correctIdx + 1),
    ],
    explanation: item.explanation,
    timeLimitSec: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 70 : 100,
  };
}

/**
 * 5. THÍ NGHIỆM & AN TOÀN PHÒNG HÓA HỌC (experiment_lab)
 */
export const EXPERIMENT_LAB_DATA = [
  {
    equation: 'Khi pha loãng axit sunfuric đặc (H2SO4 đặc), thao tác an toàn bắt buộc phải thực hiện là gì?',
    options: [
      'Rót từ từ axit đặc vào nước và khuấy nhẹ bằng đũa thủy tinh',
      'Rót nhanh nước vào axit đặc',
      'Đổ đồng thời cả axit và nước vào cốc thủy tinh',
      'Đun sôi nước trước rồi mới đổ axit vào'
    ],
    answer: 'Rót từ từ axit đặc vào nước và khuấy nhẹ bằng đũa thủy tinh',
    explanation: 'Axit sunfuric đặc tan trong nước tỏa lượng nhiệt rất lớn. Nếu rót nước vào axit, nước sôi đột ngột làm bắn axit ra ngoài gây bỏng cực kỳ nguy hiểm. Bắt buộc rót từ từ axit vào nước.'
  },
  {
    equation: 'Khi ngửi mùi của một chất khí mới sinh ra trong ống nghiệm phòng thí nghiệm, thao tác đúng là gì?',
    options: [
      'Dùng bàn tay phẩy nhẹ luồng khí từ miệng ống nghiệm về phía mũi',
      'Áp sát mũi trực tiếp vào miệng ống nghiệm hít thật sâu',
      'Đưa ống nghiệm vào gần mắt để quan sát trước khi ngửi',
      'Đậy chặt ống nghiệm rồi lắc mạnh sát tai'
    ],
    answer: 'Dùng bàn tay phẩy nhẹ luồng khí từ miệng ống nghiệm về phía mũi',
    explanation: 'Tuyệt đối không áp sát mũi vào hóa chất vì nhiều chất khí (Cl2, SO2, NH3, H2S...) có tính độc và gây kích ứng niêm mạc dữ dội. Chỉ dùng tay phẩy nhẹ hơi khí về phía mũi.'
  },
  {
    equation: 'Khi đốt khí hiđro (H2) sinh ra từ phản ứng giữa kim loại Zn và dung dịch HCl, trước khi đốt bắt buộc phải làm gì?',
    options: [
      'Thử độ tinh khiết của khí hiđro bằng ống nghiệm nhỏ',
      'Thổi thêm khí oxi vào đầu ống dẫn khí',
      'Ngâm ống dẫn khí vào nước đá lạnh',
      'Cho thêm cồn vào phễu dẫn khí'
    ],
    answer: 'Thử độ tinh khiết của khí hiđro bằng ống nghiệm nhỏ',
    explanation: 'Hỗn hợp khí H2 và O2 (hoặc không khí) theo tỉ lệ thể tích 2:1 là hỗn hợp nổ cực mạnh. Phải thử độ tinh khiết (thu vào ống nghiệm nhỏ và đốt, nếu chỉ nghe tiếng nổ nhẹ là tinh khiết) trước khi châm lửa đốt.'
  },
  {
    equation: 'Nếu không may bị dung dịch axit đặc bắn vào da tay trong phòng thí nghiệm, bước sơ cứu đầu tiên cần làm là gì?',
    options: [
      'Rửa ngay dưới vòi nước chảy liên tục trong nhiều phút, sau đó rửa bằng NaHCO3 loãng',
      'Bôi ngay dung dịch NaOH đặc để trung hòa',
      'Lấy khăn khô chà xát thật mạnh lên vết thương',
      'Bôi dầu ăn hoặc mỡ động vật lên vết bỏng'
    ],
    answer: 'Rửa ngay dưới vòi nước chảy liên tục trong nhiều phút, sau đó rửa bằng NaHCO3 loãng',
    explanation: 'Rửa dưới dòng nước chảy liên tục giúp làm loãng nhanh và cuốn trôi axit, giảm thiểu tổn thương ăn mòn mô da. Tuyệt đối không dùng bazơ mạnh (NaOH) vì phản ứng trung hòa tỏa nhiệt gây bỏng kép.'
  },
  {
    equation: 'Dụng cụ nào sau đây được dùng để đo chính xác thể tích chất lỏng trong phép chuẩn độ dung dịch?',
    options: ['Buret (Burette)', 'Ống nghiệm (Test tube)', 'Cốc thủy tinh chịu nhiệt (Beaker)', 'Bình cầu đáy tròn (Round flask)'],
    answer: 'Buret (Burette)',
    explanation: 'Buret có chia vạch thể tích chính xác đến 0.05 - 0.1 mL và có khóa điều chỉnh tốc độ nhỏ giọt, là dụng cụ đo chuẩn độ chính xác nhất trong phòng thí nghiệm.'
  },
];

export function generateExperimentLabQuestion(difficulty: 'easy' | 'medium' | 'hard'): ChemistryGeneratedQuestion {
  const id = `lab_${difficulty}_${Date.now()}_${randInt(100, 999)}`;
  const item = pickRandom(EXPERIMENT_LAB_DATA);
  const shuffledOptions = [...item.options].sort(() => Math.random() - 0.5);
  let correctIdx = shuffledOptions.indexOf(item.answer);
  if (correctIdx === -1) {
    shuffledOptions[0] = item.answer;
    correctIdx = 0;
  }
  const letterMap = ['A', 'B', 'C', 'D'];
  const correctLetter = letterMap[correctIdx] || 'A';

  return {
    id,
    mode: 'experiment_lab',
    difficulty,
    grade: 10,
    chapter: 'Kỹ năng Thí nghiệm & An toàn Hóa học',
    equation: item.equation,
    correctValue: item.answer,
    correctIndex: correctIdx,
    options: shuffledOptions,
    acceptedAnswers: [
      item.answer.toLowerCase(),
      correctLetter.toLowerCase(),
      String(correctIdx + 1),
    ],
    explanation: item.explanation,
    timeLimitSec: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 85,
  };
}

/**
 * Bộ điều phối tổng quát sinh câu hỏi Hóa học theo chế độ
 */
export function generateChemistryQuestion(mode: string, difficulty: 'easy' | 'medium' | 'hard'): ChemistryGeneratedQuestion {
  switch (mode) {
    case 'mol_calc':
      return generateMolCalcQuestion(difficulty);
    case 'substance_match':
      return generateSubstanceMatchQuestion(difficulty);
    case 'solution_ph':
      return generateSolutionPhQuestion(difficulty);
    case 'organic_reactions':
      return generateOrganicQuestion(difficulty);
    case 'experiment_lab':
      return generateExperimentLabQuestion(difficulty);
    default:
      return generateMolCalcQuestion(difficulty);
  }
}
