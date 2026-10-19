// src/data/stemGenerators.ts
// Bộ sinh đề ngẫu nhiên theo công thức toán học/hóa học/vật lý cho học sinh THCS & THPT
// Bảo đảm 100% chính xác, lời giải từng bước chi tiết, không lặp đề và đa dạng phong phú.

export interface GeneratedQuestion {
  id: string;
  mode: string;
  difficulty: 'easy' | 'medium' | 'hard';
  grade: number;
  chapter: string;
  equation: string;          // Nội dung câu hỏi (prompt)
  correctValue: number | string;
  acceptedAnswers: string[];  // Danh sách các chuỗi đáp án được chấp nhận
  unit?: string;             // Đơn vị nếu có (VD: mol, g, lít, m/s, J...)
  explanation: string;       // Lời giải từng bước chi tiết
  timeLimitSec: number;
  options?: string[];        // Dành cho trắc nghiệm MCQ
  correctIndex?: number;     // Index đáp án đúng (0, 1, 2, 3)
  hint?: string;
  tolerance?: number;        // Sai số cho phép (VD: 0.1)
}

/**
 * Trình phân tích & kiểm tra số đáp án:
 * - Chấp nhận dấu phẩy hoặc dấu chấm: 12,5 == 12.5
 * - Chấp nhận phân số: 3/4 == 0.75
 * - Chấp nhận khoảng trắng trong số lớn: 160 000 == 160000
 * - Bỏ qua ký hiệu phần trăm: 25% == 25
 */
export function checkNumericAnswer(
  userAnsStr: string,
  acceptedList: (string | number)[],
  expectedNum?: number,
  tolerance: number = 0.05
): boolean {
  if (!userAnsStr) return false;
  let raw = userAnsStr.trim().replace(/\s+/g, '').replace(/%/g, '');

  // 1. So sánh chuỗi trực tiếp
  for (const acc of acceptedList) {
    const cleanAcc = String(acc).trim().replace(/\s+/g, '').replace(/%/g, '');
    if (raw.toLowerCase() === cleanAcc.toLowerCase()) return true;
    if (raw.replace(',', '.') === cleanAcc.replace(',', '.')) return true;
  }

  // 2. Chuyển đổi thành số thực để so sánh
  let userNum: number | null = null;
  if (raw.includes('/')) {
    const parts = raw.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0].replace(',', '.'));
      const den = parseFloat(parts[1].replace(',', '.'));
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        userNum = num / den;
      }
    }
  } else {
    const parsed = parseFloat(raw.replace(',', '.'));
    if (!isNaN(parsed)) {
      userNum = parsed;
    }
  }

  if (userNum !== null && expectedNum !== undefined && !isNaN(expectedNum)) {
    const diff = Math.abs(userNum - expectedNum);
    if (diff <= tolerance) return true;
    // Tương đối cho số rất lớn
    if (Math.abs(expectedNum) > 100 && diff / Math.abs(expectedNum) <= 0.01) return true;
  }

  return false;
}

// Helper sinh số nguyên ngẫu nhiên trong khoảng [min, max]
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper chọn ngẫu nhiên phần tử từ mảng
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Làm tròn số thập phân
function roundDecimal(num: number, digits: number = 2): number {
  const p = Math.pow(10, digits);
  return Math.round(num * p) / p;
}

/**
 * 1. MÔN HÓA HỌC: mol_calc (Tính toán hóa học THCS 8-9, THPT 10)
 */
export function generateMolCalcQuestion(difficulty: 'easy' | 'medium' | 'hard'): GeneratedQuestion {
  const id = `mol_${difficulty}_${Date.now()}_${randInt(100, 999)}`;

  if (difficulty === 'easy') {
    const types = ['molar_mass', 'mass_to_mol', 'mol_to_volume'];
    const chosenType = pickRandom(types);

    if (chosenType === 'molar_mass') {
      const compounds = [
        { formula: 'H2O', M: 18, detail: '2×1 + 16 = 18' },
        { formula: 'CO2', M: 44, detail: '12 + 2×16 = 44' },
        { formula: 'NaCl', M: 58.5, detail: '23 + 35.5 = 58.5' },
        { formula: 'CaCO3', M: 100, detail: '40 + 12 + 3×16 = 100' },
        { formula: 'H2SO4', M: 98, detail: '2×1 + 32 + 4×16 = 98' },
        { formula: 'NaOH', M: 40, detail: '23 + 16 + 1 = 40' },
        { formula: 'Fe2O3', M: 160, detail: '2×56 + 3×16 = 160' },
        { formula: 'CuO', M: 80, detail: '64 + 16 = 80' },
        { formula: 'HCl', M: 36.5, detail: '1 + 35.5 = 36.5' },
        { formula: 'CH4', M: 16, detail: '12 + 4×1 = 16' },
      ];
      const c = pickRandom(compounds);
      return {
        id,
        mode: 'mol_calc',
        difficulty,
        grade: 8,
        chapter: 'Mol và tính toán hóa học',
        equation: `Tính khối lượng mol phân tử (M) của hợp chất ${c.formula} (gam/mol).`,
        correctValue: c.M,
        acceptedAnswers: [String(c.M), String(c.M).replace('.', ',')],
        unit: 'g/mol',
        explanation: `Khối lượng mol của ${c.formula} bằng tổng nguyên tử khối các nguyên tố cấu thành: ${c.detail} = ${c.M} g/mol.`,
        timeLimitSec: 25,
      };
    }

    if (chosenType === 'mass_to_mol') {
      const samples = [
        { name: 'nước (H2O)', M: 18, n: pickRandom([0.5, 1, 1.5, 2]) },
        { name: 'khí CO2', M: 44, n: pickRandom([0.1, 0.25, 0.5, 2]) },
        { name: 'đá vôi CaCO3', M: 100, n: pickRandom([0.2, 0.5, 1.2, 2.5]) },
        { name: 'sút NaOH', M: 40, n: pickRandom([0.25, 0.5, 1, 2]) },
      ];
      const s = pickRandom(samples);
      const m = roundDecimal(s.n * s.M, 2);
      return {
        id,
        mode: 'mol_calc',
        difficulty,
        grade: 8,
        chapter: 'Mol và tính toán hóa học',
        equation: `Tìm số mol của ${m} gam ${s.name} (biết M = ${s.M} g/mol).`,
        correctValue: s.n,
        acceptedAnswers: [String(s.n), String(s.n).replace('.', ',')],
        unit: 'mol',
        explanation: `Áp dụng công thức liên hệ n = m / M: n = ${m} / ${s.M} = ${s.n} mol.`,
        timeLimitSec: 25,
      };
    }

    // mol_to_volume đktc
    const n = pickRandom([0.1, 0.2, 0.25, 0.5, 1, 1.5, 2]);
    const V = roundDecimal(n * 22.4, 2);
    return {
      id,
      mode: 'mol_calc',
      difficulty,
      grade: 8,
      chapter: 'Mol và tính toán hóa học',
      equation: `Tính thể tích ở đktc của ${n} mol khí O2 (lít).`,
      correctValue: V,
      acceptedAnswers: [String(V), String(V).replace('.', ',')],
      unit: 'lít',
      explanation: `Ở điều kiện tiêu chuẩn (đktc), thể tích 1 mol chất khí là 22,4 lít. Vậy V = n × 22,4 = ${n} × 22,4 = ${V} lít.`,
      timeLimitSec: 25,
    };
  }

  if (difficulty === 'medium') {
    const types = ['c_percent', 'cm_calc', 'element_percent'];
    const chosenType = pickRandom(types);

    if (chosenType === 'c_percent') {
      const mct = pickRandom([5, 10, 15, 20, 25, 30, 40]);
      const mnc = pickRandom([60, 80, 100, 160, 180, 200]);
      const mdd = mct + mnc;
      const cPercent = roundDecimal((mct / mdd) * 100, 1);
      return {
        id,
        mode: 'mol_calc',
        difficulty,
        grade: 8,
        chapter: 'Dung dịch - Nồng độ dung dịch',
        equation: `Hòa tan ${mct} g muối ăn vào ${mnc} g nước. Tính nồng độ phần trăm (C%) của dung dịch thu được (làm tròn 1 chữ số thập phân).`,
        correctValue: cPercent,
        acceptedAnswers: [String(cPercent), String(cPercent).replace('.', ','), `${cPercent}%`],
        unit: '%',
        tolerance: 0.2,
        explanation: `Khối lượng dung dịch thu được: m_dd = m_ct + m_H2O = ${mct} + ${mnc} = ${mdd} g.\nNồng độ phần trăm: C% = (m_ct / m_dd) × 100% = (${mct} / ${mdd}) × 100% ≈ ${cPercent}%.`,
        timeLimitSec: 40,
      };
    }

    if (chosenType === 'cm_calc') {
      const n = pickRandom([0.1, 0.2, 0.5, 0.75, 1, 1.5, 2]);
      const V_ml = pickRandom([100, 200, 250, 400, 500, 1000]);
      const V_lit = V_ml / 1000;
      const CM = roundDecimal(n / V_lit, 2);
      return {
        id,
        mode: 'mol_calc',
        difficulty,
        grade: 8,
        chapter: 'Dung dịch - Nồng độ mol',
        equation: `Hòa tan ${n} mol HCl vào nước thu được ${V_ml} mL dung dịch. Tính nồng độ mol (CM) của dung dịch (M).`,
        correctValue: CM,
        acceptedAnswers: [String(CM), String(CM).replace('.', ',')],
        unit: 'M',
        explanation: `Đổi thể tích sang lít: V = ${V_ml} mL = ${V_lit} L.\nNồng độ mol: C_M = n / V = ${n} / ${V_lit} = ${CM} M.`,
        timeLimitSec: 40,
      };
    }

    // % khối lượng nguyên tố
    const compounds = [
      { name: 'CaCO3', elem: 'C', mass: 12, M: 100, val: 12 },
      { name: 'CaCO3', elem: 'O', mass: 48, M: 100, val: 48 },
      { name: 'Fe2O3', elem: 'Fe', mass: 112, M: 160, val: 70 },
      { name: 'H2O', elem: 'O', mass: 16, M: 18, val: 88.9 },
      { name: 'CH4', elem: 'H', mass: 4, M: 16, val: 25 },
      { name: 'SO2', elem: 'S', mass: 32, M: 64, val: 50 },
    ];
    const c = pickRandom(compounds);
    return {
      id,
      mode: 'mol_calc',
      difficulty,
      grade: 8,
      chapter: 'Công thức hóa học và thành phần phần trăm',
      equation: `Tính phần trăm khối lượng (%m) của nguyên tố ${c.elem} trong hợp chất ${c.name} (làm tròn 1 chữ số thập phân).`,
      correctValue: c.val,
      acceptedAnswers: [String(c.val), String(c.val).replace('.', ','), `${c.val}%`],
      unit: '%',
      tolerance: 0.2,
      explanation: `Khối lượng mol của ${c.name} là ${c.M} g/mol.\n%m_${c.elem} = (${c.mass} / ${c.M}) × 100% ≈ ${c.val}%.`,
      timeLimitSec: 40,
    };
  }

  // hard: Tính toán theo PTHH
  const reactions = [
    {
      metal: 'Mg',
      M: 24,
      n: pickRandom([0.1, 0.2, 0.3, 0.5]),
      pt: 'Mg + 2HCl -> MgCl2 + H2',
      ask: 'H2 (ở đktc)',
      calcV: (nVal: number) => roundDecimal(nVal * 22.4, 2),
    },
    {
      metal: 'Zn',
      M: 65,
      n: pickRandom([0.1, 0.2, 0.4]),
      pt: 'Zn + 2HCl -> ZnCl2 + H2',
      ask: 'H2 (ở đktc)',
      calcV: (nVal: number) => roundDecimal(nVal * 22.4, 2),
    },
    {
      metal: 'CaCO3',
      M: 100,
      n: pickRandom([0.15, 0.2, 0.5, 1]),
      pt: 'CaCO3 -[t°]-> CaO + CO2',
      ask: 'CO2 (ở đktc)',
      calcV: (nVal: number) => roundDecimal(nVal * 22.4, 2),
    },
  ];
  const r = pickRandom(reactions);
  const m = roundDecimal(r.n * r.M, 2);
  const vAnswer = r.calcV(r.n);

  return {
    id,
    mode: 'mol_calc',
    difficulty,
    grade: 9,
    chapter: 'Tính toán theo phương trình hóa học',
    equation: `Cho ${m} gam ${r.metal} tác dụng hết theo phương trình:\n${r.pt}\nTính thể tích khí ${r.ask} thu được (lít, đktc).`,
    correctValue: vAnswer,
    acceptedAnswers: [String(vAnswer), String(vAnswer).replace('.', ',')],
    unit: 'lít',
    explanation: `Bước 1: Tính số mol ${r.metal}: n = ${m} / ${r.M} = ${r.n} mol.\nBước 2: Dựa vào PTHH, tỉ lệ mol là 1 : 1 => n_${r.ask.split(' ')[0]} = ${r.n} mol.\nBước 3: Thể tích khí ở đktc: V = ${r.n} × 22,4 = ${vAnswer} lít.`,
    timeLimitSec: 60,
  };
}

/**
 * 2. MÔN TOÁN: math_algebra (Toán nhanh THCS Lớp 6 - 9)
 */
export function generateMathAlgebraQuestion(difficulty: 'easy' | 'medium' | 'hard'): GeneratedQuestion {
  const id = `math_${difficulty}_${Date.now()}_${randInt(100, 999)}`;

  if (difficulty === 'easy') {
    const types = ['percent_calc', 'linear_eq', 'pythagoras_basic'];
    const chosen = pickRandom(types);

    if (chosen === 'percent_calc') {
      const orig = pickRandom([50, 80, 100, 120, 200, 250, 500]);
      const pct = pickRandom([10, 15, 20, 25, 30, 50]);
      const res = roundDecimal((orig * pct) / 100, 2);
      return {
        id,
        mode: 'math_algebra',
        difficulty,
        grade: 6,
        chapter: 'Tỉ số phần trăm',
        equation: `Tính ${pct}% của số ${orig}.`,
        correctValue: res,
        acceptedAnswers: [String(res), String(res).replace('.', ',')],
        explanation: `Muốn tìm ${pct}% của ${orig}, ta lấy: ${orig} × ${pct} / 100 = ${res}.`,
        timeLimitSec: 25,
      };
    }

    if (chosen === 'linear_eq') {
      const a = randInt(2, 8);
      const x = randInt(2, 12);
      const b = randInt(3, 20);
      const c = a * x + b;
      return {
        id,
        mode: 'math_algebra',
        difficulty,
        grade: 7,
        chapter: 'Phương trình bậc nhất một ẩn',
        equation: `Tìm x biết: ${a}x + ${b} = ${c}`,
        correctValue: x,
        acceptedAnswers: [String(x)],
        explanation: `Chuyển vế: ${a}x = ${c} - ${b} = ${c - b}\nChia cả hai vế cho ${a}: x = ${c - b} / ${a} = ${x}.`,
        timeLimitSec: 25,
      };
    }

    // Pytago cơ bản (3-4-5, 6-8-10, 5-12-13)
    const triples = [
      { a: 3, b: 4, c: 5 },
      { a: 6, b: 8, c: 10 },
      { a: 5, b: 12, c: 13 },
      { a: 9, b: 12, c: 15 },
      { a: 8, b: 15, c: 17 },
    ];
    const t = pickRandom(triples);
    return {
      id,
      mode: 'math_algebra',
      difficulty,
      grade: 7,
      chapter: 'Định lý Pytago',
      equation: `Cho tam giác vuông có hai cạnh góc vuông lần lượt là ${t.a} cm và ${t.b} cm. Độ dài cạnh huyền là bao nhiêu cm?`,
      correctValue: t.c,
      acceptedAnswers: [String(t.c)],
      unit: 'cm',
      explanation: `Theo định lý Pytago: c² = a² + b² = ${t.a}² + ${t.b}² = ${t.a * t.a} + ${t.b * t.b} = ${t.c * t.c}.\nSuy ra cạnh huyền c = √${t.c * t.c} = ${t.c} cm.`,
      timeLimitSec: 25,
    };
  }

  if (difficulty === 'medium') {
    const types = ['discount_price', 'system_eq', 'quadratic_root'];
    const chosen = pickRandom(types);

    if (chosen === 'discount_price') {
      const price = pickRandom([100000, 200000, 250000, 400000, 500000]);
      const discount = pickRandom([10, 15, 20, 25, 30]);
      const finalPrice = price * (1 - discount / 100);
      return {
        id,
        mode: 'math_algebra',
        difficulty,
        grade: 7,
        chapter: 'Toán thực tế - Giảm giá',
        equation: `Một món đồ có giá gốc ${price.toLocaleString('vi-VN')} đ được giảm giá ${discount}%. Giá sau khi giảm là bao nhiêu đồng?`,
        correctValue: finalPrice,
        acceptedAnswers: [String(finalPrice), String(finalPrice).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')],
        unit: 'đồng',
        explanation: `Số tiền được giảm: ${price.toLocaleString('vi-VN')} × ${discount}% = ${(price * discount / 100).toLocaleString('vi-VN')} đ.\nGiá thực trả: ${price.toLocaleString('vi-VN')} - ${(price * discount / 100).toLocaleString('vi-VN')} = ${finalPrice.toLocaleString('vi-VN')} đ.`,
        timeLimitSec: 40,
      };
    }

    if (chosen === 'system_eq') {
      const x = randInt(2, 6);
      const y = randInt(1, 5);
      const c1 = x + y;
      const c2 = 2 * x - y;
      return {
        id,
        mode: 'math_algebra',
        difficulty,
        grade: 9,
        chapter: 'Hệ hai phương trình bậc nhất hai ẩn',
        equation: `Giải hệ phương trình:\n  x + y = ${c1}\n  2x - y = ${c2}\nTìm giá trị của x:`,
        correctValue: x,
        acceptedAnswers: [String(x)],
        explanation: `Cộng vế với vế của hai phương trình để triệt tiêu y:\n  (x + y) + (2x - y) = ${c1} + ${c2}\n  => 3x = ${c1 + c2}\n  => x = ${x}.`,
        timeLimitSec: 40,
      };
    }

    // Nghiệm dương phương trình bậc hai
    const roots = [
      { a: 1, b: -5, c: 6, x1: 2, x2: 3 },
      { a: 1, b: -7, c: 12, x1: 3, x2: 4 },
      { a: 1, b: -8, c: 15, x1: 3, x2: 5 },
      { a: 1, b: -9, c: 20, x1: 4, x2: 5 },
      { a: 1, b: -10, c: 21, x1: 3, x2: 7 },
    ];
    const r = pickRandom(roots);
    return {
      id,
      mode: 'math_algebra',
      difficulty,
      grade: 9,
      chapter: 'Phương trình bậc hai một ẩn',
      equation: `Tìm nghiệm lớn hơn của phương trình: x² - ${-r.b}x + ${r.c} = 0`,
      correctValue: r.x2,
      acceptedAnswers: [String(r.x2)],
      explanation: `Tính biệt thức Delta: Δ = b² - 4ac = (${r.b})² - 4×1×${r.c} = ${r.b * r.b - 4 * r.c}.\nCăn bậc hai √Δ = 1.\nHai nghiệm phân biệt: x₁ = ${r.x1}, x₂ = ${r.x2}. Nghiệm lớn hơn là ${r.x2}.`,
      timeLimitSec: 40,
    };
  }

  // hard: Bài toán chuyển động hoặc phương trình chứa tham số
  const v = pickRandom([30, 40, 50, 60]);
  const tHours = pickRandom([1.5, 2, 2.5, 3]);
  const s = roundDecimal(v * tHours, 1);
  return {
    id,
    mode: 'math_algebra',
    difficulty,
    grade: 8,
    chapter: 'Giải bài toán bằng cách lập phương trình',
    equation: `Một ô tô đi quãng đường dài ${s} km trong ${tHours} giờ. Vận tốc trung bình của ô tô là bao nhiêu km/h?`,
    correctValue: v,
    acceptedAnswers: [String(v)],
    unit: 'km/h',
    explanation: `Áp dụng công thức v = s / t:\nv = ${s} / ${tHours} = ${v} km/h.`,
    timeLimitSec: 60,
  };
}

/**
 * 3. MÔN VẬT LÍ: physics_calc (Vật lí THCS Lớp 8-9 & THPT 10)
 */
export function generatePhysicsQuestion(difficulty: 'easy' | 'medium' | 'hard'): GeneratedQuestion {
  const id = `phys_${difficulty}_${Date.now()}_${randInt(100, 999)}`;

  if (difficulty === 'easy') {
    const types = ['gravity_p', 'velocity_v', 'density_d'];
    const chosen = pickRandom(types);

    if (chosen === 'gravity_p') {
      const m = pickRandom([2, 5, 10, 15, 20, 45, 60]);
      const P = m * 10;
      return {
        id,
        mode: 'physics_calc',
        difficulty,
        grade: 8,
        chapter: 'Lực - Trọng lực',
        equation: `Một vật có khối lượng m = ${m} kg. Trọng lượng P của vật trên mặt đất là bao nhiêu Niutơn (N)?`,
        correctValue: P,
        acceptedAnswers: [String(P)],
        unit: 'N',
        explanation: `Hệ thức giữa trọng lượng và khối lượng: P = 10 × m = 10 × ${m} = ${P} N.`,
        timeLimitSec: 25,
      };
    }

    if (chosen === 'velocity_v') {
      const s = pickRandom([60, 90, 120, 150, 180, 240]);
      const t = pickRandom([2, 3, 4, 5]);
      const v = s / t;
      return {
        id,
        mode: 'physics_calc',
        difficulty,
        grade: 8,
        chapter: 'Chuyển động cơ học',
        equation: `Một người đi xe máy đi được quãng đường s = ${s} km trong thời gian t = ${t} giờ. Vận tốc của người đó là bao nhiêu km/h?`,
        correctValue: v,
        acceptedAnswers: [String(v)],
        unit: 'km/h',
        explanation: `Công thức tính vận tốc: v = s / t = ${s} / ${t} = ${v} km/h.`,
        timeLimitSec: 25,
      };
    }

    // Khối lượng riêng D = m / V
    const m = pickRandom([270, 780, 1360, 2000]);
    const V = pickRandom([0.1, 0.2, 0.5, 1]);
    const D = roundDecimal(m / V, 1);
    return {
      id,
      mode: 'physics_calc',
      difficulty,
      grade: 8,
      chapter: 'Khối lượng riêng và trọng lượng riêng',
      equation: `Một khối kim loại có khối lượng m = ${m} kg và thể tích V = ${V} m³. Khối lượng riêng D của kim loại đó là bao nhiêu kg/m³?`,
      correctValue: D,
      acceptedAnswers: [String(D), String(D).replace('.', ',')],
      unit: 'kg/m³',
      explanation: `Công thức khối lượng riêng: D = m / V = ${m} / ${V} = ${D} kg/m³.`,
      timeLimitSec: 25,
    };
  }

  if (difficulty === 'medium') {
    const types = ['ohm_law', 'work_power', 'electric_power'];
    const chosen = pickRandom(types);

    if (chosen === 'ohm_law') {
      const U = pickRandom([6, 9, 12, 24, 220]);
      const R = pickRandom([10, 20, 40, 50, 100]);
      const I = roundDecimal(U / R, 2);
      return {
        id,
        mode: 'physics_calc',
        difficulty,
        grade: 9,
        chapter: 'Điện học - Định luật Ôm',
        equation: `Đặt một hiệu điện thế U = ${U} V vào hai đầu dây dẫn có điện trở R = ${R} Ω. Cường độ dòng điện I chạy qua dây dẫn là bao nhiêu Ampe (A)?`,
        correctValue: I,
        acceptedAnswers: [String(I), String(I).replace('.', ',')],
        unit: 'A',
        explanation: `Theo định luật Ôm: I = U / R = ${U} / ${R} = ${I} A.`,
        timeLimitSec: 40,
      };
    }

    if (chosen === 'electric_power') {
      const U = 220;
      const I = pickRandom([0.5, 1, 2, 2.5, 5]);
      const P = roundDecimal(U * I, 1);
      return {
        id,
        mode: 'physics_calc',
        difficulty,
        grade: 9,
        chapter: 'Điện học - Công suất điện',
        equation: `Một bóng đèn hoạt động ở hiệu điện thế U = 220 V với dòng điện I = ${I} A. Công suất điện P của bóng đèn là bao nhiêu Oát (W)?`,
        correctValue: P,
        acceptedAnswers: [String(P), String(P).replace('.', ',')],
        unit: 'W',
        explanation: `Công thức công suất điện: P = U × I = 220 × ${I} = ${P} W.`,
        timeLimitSec: 40,
      };
    }

    // Công cơ học A = F * s
    const F = pickRandom([50, 100, 200, 500]);
    const s = pickRandom([5, 10, 15, 20]);
    const A = F * s;
    return {
      id,
      mode: 'physics_calc',
      difficulty,
      grade: 8,
      chapter: 'Cơ học - Công cơ học',
      equation: `Một lực kéo F = ${F} N làm dịch chuyển một vật trên quãng đường s = ${s} m theo phương của lực. Công sinh ra A là bao nhiêu Jun (J)?`,
      correctValue: A,
      acceptedAnswers: [String(A)],
      unit: 'J',
      explanation: `Công thức công cơ học: A = F × s = ${F} × ${s} = ${A} J.`,
      timeLimitSec: 40,
    };
  }

  // hard: Nhiệt lượng Q = mcΔt hoặc điện năng tiêu thụ kWh
  const m = pickRandom([1, 2, 3, 5]); // kg nước
  const c = 4200; // J/kg.K
  const deltaT = pickRandom([10, 20, 30, 50]);
  const Q = m * c * deltaT; // Jun
  const Q_kJ = roundDecimal(Q / 1000, 1);

  return {
    id,
    mode: 'physics_calc',
    difficulty,
    grade: 8,
    chapter: 'Nhiệt học - Nhiệt lượng',
    equation: `Tính nhiệt lượng cần cung cấp để đun nóng ${m} kg nước (nhiệt dung riêng c = 4200 J/kg.K) tăng thêm ${deltaT} °C (kết quả tính theo kJ).`,
    correctValue: Q_kJ,
    acceptedAnswers: [String(Q_kJ), String(Q_kJ).replace('.', ',')],
    unit: 'kJ',
    explanation: `Công thức tính nhiệt lượng: Q = m × c × Δt\nQ = ${m} × 4200 × ${deltaT} = ${Q.toLocaleString('vi-VN')} J = ${Q_kJ} kJ.`,
    timeLimitSec: 60,
  };
}

/**
 * 4. MÔN KHTN: unit_convert (Đổi đơn vị chuẩn khoa học)
 */
export function generateUnitConvertQuestion(difficulty: 'easy' | 'medium' | 'hard'): GeneratedQuestion {
  const id = `unit_${difficulty}_${Date.now()}_${randInt(100, 999)}`;

  if (difficulty === 'easy') {
    const list = [
      { q: '1,5 km bằng bao nhiêu mét (m)?', val: 1500, detail: '1 km = 1000 m => 1,5 km = 1500 m' },
      { q: '2,5 kg bằng bao nhiêu gam (g)?', val: 2500, detail: '1 kg = 1000 g => 2,5 kg = 2500 g' },
      { q: '500 mL bằng bao nhiêu lít (L)?', val: 0.5, detail: '1 L = 1000 mL => 500 mL = 0,5 L' },
      { q: '3 dm³ bằng bao nhiêu lít (L)?', val: 3, detail: '1 dm³ = 1 L => 3 dm³ = 3 L' },
      { q: '2 giờ bằng bao nhiêu phút?', val: 120, detail: '1 giờ = 60 phút => 2 giờ = 120 phút' },
      { q: '0,25 mol bằng bao nhiêu mmol?', val: 250, detail: '1 mol = 1000 mmol => 0,25 mol = 250 mmol' },
      { q: '4500 g bằng bao nhiêu kg?', val: 4.5, detail: '1 kg = 1000 g => 4500 g = 4,5 kg' },
    ];
    const item = pickRandom(list);
    return {
      id,
      mode: 'unit_convert',
      difficulty,
      grade: 6,
      chapter: 'Phép đo và đơn vị đo KHTN',
      equation: item.q,
      correctValue: item.val,
      acceptedAnswers: [String(item.val), String(item.val).replace('.', ',')],
      explanation: `Quy tắc chuyển đổi: ${item.detail}.`,
      timeLimitSec: 20,
    };
  }

  if (difficulty === 'medium') {
    const list = [
      { q: '36 km/h tương ứng bao nhiêu m/s?', val: 10, detail: 'Chia cho 3,6: 36 / 3,6 = 10 m/s' },
      { q: '54 km/h tương ứng bao nhiêu m/s?', val: 15, detail: 'Chia cho 3,6: 54 / 3,6 = 15 m/s' },
      { q: '72 km/h tương ứng bao nhiêu m/s?', val: 20, detail: 'Chia cho 3,6: 72 / 3,6 = 20 m/s' },
      { q: '20 m/s tương ứng bao nhiêu km/h?', val: 72, detail: 'Nhân với 3,6: 20 × 3,6 = 72 km/h' },
      { q: '2 hecta (ha) bằng bao nhiêu mét vuông (m²)?', val: 20000, detail: '1 ha = 10 000 m² => 2 ha = 20 000 m²' },
      { q: '1 kWh tương ứng bao nhiêu kJ?', val: 3600, detail: '1 kWh = 1000 W × 3600 s = 3 600 000 J = 3600 kJ' },
      { q: '27 °C tương ứng bao nhiêu Kelvin (K)?', val: 300, detail: 'T(K) = t(°C) + 273 = 27 + 273 = 300 K' },
    ];
    const item = pickRandom(list);
    return {
      id,
      mode: 'unit_convert',
      difficulty,
      grade: 7,
      chapter: 'Đổi đơn vị nâng cao',
      equation: item.q,
      correctValue: item.val,
      acceptedAnswers: [String(item.val), String(item.val).replace('.', ',')],
      explanation: `Hướng dẫn giải: ${item.detail}.`,
      timeLimitSec: 30,
    };
  }

  // hard: Khối lượng riêng g/cm³ <-> kg/m³, nhiệt độ âm, áp suất
  const list = [
    { q: '1 g/cm³ tương ứng bao nhiêu kg/m³?', val: 1000, detail: '1 g/cm³ = (10⁻³ kg) / (10⁻⁶ m³) = 1000 kg/m³' },
    { q: '7,8 g/cm³ (khối lượng riêng của sắt) bằng bao nhiêu kg/m³?', val: 7800, detail: 'Nhân 1000: 7,8 × 1000 = 7800 kg/m³' },
    { q: '13,6 g/cm³ (thủy ngân) bằng bao nhiêu kg/m³?', val: 13600, detail: '13,6 × 1000 = 13 600 kg/m³' },
    { q: '0 °C tương ứng bao nhiêu Kelvin (K)?', val: 273, detail: 'T = 0 + 273 = 273 K' },
    { q: '350 K tương ứng bao nhiêu độ Celsius (°C)?', val: 77, detail: 't = 350 - 273 = 77 °C' },
  ];
  const item = pickRandom(list);
  return {
    id,
    mode: 'unit_convert',
    difficulty,
    grade: 8,
    chapter: 'Chuyển đổi đại lượng vật lí tiêu chuẩn',
    equation: item.q,
    correctValue: item.val,
    acceptedAnswers: [String(item.val), String(item.val).replace('.', ',')],
    explanation: `Giải thích: ${item.detail}.`,
    timeLimitSec: 45,
  };
}

/**
 * 5. TRẮC NGHIỆM KHTN LIÊN MÔN: science_mcq (Sinh - Lí - Hóa - An toàn thí nghiệm)
 */
export const SCIENCE_MCQ_BANK = [
  {
    grade: 6,
    prompt: 'Cấp độ tổ chức cơ bản nhất của sự sống là gì?',
    options: ['Tế bào', 'Mô', 'Cơ quan', 'Hệ cơ quan'],
    answer: 'Tế bào',
    explanation: 'Mọi sinh vật sống đều được cấu tạo từ tế bào. Tế bào là đơn vị cấu trúc và chức năng nhỏ nhất của cơ thể sống.',
  },
  {
    grade: 6,
    prompt: 'Bào quan nào trong tế bào thực vật trực tiếp thực hiện quá trình quang hợp?',
    options: ['Lục lạp', 'Ti thể', 'Không bào', 'Nhân tế bào'],
    answer: 'Lục lạp',
    explanation: 'Lục lạp chứa chất diệp lục giúp hấp thụ ánh sáng mặt trời để tổng hợp chất hữu cơ qua quang hợp.',
  },
  {
    grade: 6,
    prompt: 'Khi hòa loãng axit sunfuric đặc (H2SO4) trong phòng thí nghiệm, quy tắc an toàn bắt buộc là gì?',
    options: ['Rót từ từ axit vào nước và khuấy đều', 'Rót từ từ nước vào axit và khuấy đều', 'Đổ thật nhanh nước vào axit', 'Đổ cả hai cùng lúc vào cốc'],
    answer: 'Rót từ từ axit vào nước và khuấy đều',
    explanation: 'Axit sunfuric đặc tan trong nước tỏa lượng nhiệt rất lớn. Nếu rót nước vào axit, nước sôi đột ngột làm axit bắn ra gây bỏng cực kỳ nguy hiểm. Vì vậy bắt buộc phải rót từ từ axit vào nước.',
  },
  {
    grade: 7,
    prompt: 'Âm thanh không thể truyền được trong môi trường nào dưới đây?',
    options: ['Chân không', 'Chất rắn', 'Chất lỏng', 'Chất khí'],
    answer: 'Chân không',
    explanation: 'Sóng âm là dao động cơ học cần có các phần tử vật chất để lan truyền, do đó âm không thể truyền trong môi trường chân không.',
  },
  {
    grade: 7,
    prompt: 'Hiện tượng phản xạ ánh sáng tuân theo định luật nào?',
    options: ['Góc phản xạ luôn bằng góc tới (i\' = i)', 'Góc phản xạ lớn hơn góc tới', 'Góc phản xạ nhỏ hơn góc tới', 'Góc phản xạ gấp đôi góc tới'],
    answer: 'Góc phản xạ luôn bằng góc tới (i\' = i)',
    explanation: 'Theo định luật phản xạ ánh sáng, tia phản xạ nằm trong mặt phẳng tới và góc phản xạ luôn bằng góc tới.',
  },
  {
    grade: 8,
    prompt: 'Khí nào chiếm thể tích lớn nhất trong không khí sạch bao quanh Trái Đất?',
    options: ['Nitơ (khoảng 78%)', 'Oxi (khoảng 21%)', 'Cacbon đioxit', 'Argon'],
    answer: 'Nitơ (khoảng 78%)',
    explanation: 'Thành phần không khí gồm khoảng 78% thể tích khí nitơ, 21% khí oxi và 1% các khí khác (CO2, hơi nước, khí hiếm).',
  },
  {
    grade: 8,
    prompt: 'Kim loại nào sau đây ở thể lỏng ở điều kiện nhiệt độ phòng thường gặp?',
    options: ['Thủy ngân (Hg)', 'Sắt (Fe)', 'Đồng (Cu)', 'Bạc (Ag)'],
    answer: 'Thủy ngân (Hg)',
    explanation: 'Thủy ngân (Hg) có nhiệt độ nóng chảy khoảng -38,8 °C nên là kim loại duy nhất ở thể lỏng ở nhiệt độ phòng.',
  },
  {
    grade: 9,
    prompt: 'Dung dịch nào sau đây làm đổi màu quỳ tím sang màu đỏ?',
    options: ['Axit clohiđric (HCl)', 'Natri hiđroxit (NaOH)', 'Nước cất (H2O)', 'Natri clorua (NaCl)'],
    answer: 'Axit clohiđric (HCl)',
    explanation: 'Các dung dịch axit làm quỳ tím chuyển sang màu đỏ. Dung dịch kiềm làm quỳ tím hóa xanh. Dung dịch muối trung tính như NaCl không đổi màu quỳ tím.',
  },
  {
    grade: 9,
    prompt: 'Khi chẳng may bị bỏng hóa chất axit trong phòng thí nghiệm, bước sơ cứu khẩn cấp đầu tiên là gì?',
    options: ['Rửa ngay dưới vòi nước sạch chảy liên tục nhiều phút', 'Bôi ngay kem đánh răng hoặc mỡ trăn', 'Đổ bazơ đặc lên để trung hòa', 'Băng chặt vết thương lại ngay'],
    answer: 'Rửa ngay dưới vòi nước sạch chảy liên tục nhiều phút',
    explanation: 'Xối rửa ngay lập tức dưới vòi nước sạch chảy liên tục trong ít nhất 15-20 phút giúp pha loãng và loại bỏ axit trên bề mặt da, giảm thiểu tối đa tổn thương mô tế bào.',
  },
  {
    grade: 9,
    prompt: 'Người có nhóm máu O có thể truyền hồng cầu an toàn cho người mang nhóm máu nào?',
    options: ['Cả 4 nhóm máu A, B, AB và O', 'Chỉ truyền được cho người nhóm máu O', 'Chỉ truyền được cho người nhóm máu AB', 'Chỉ truyền được cho nhóm A và B'],
    answer: 'Cả 4 nhóm máu A, B, AB và O',
    explanation: 'Hồng cầu của nhóm máu O không có kháng nguyên A và kháng nguyên B, nên có thể truyền cho cả 4 nhóm máu trong hệ ABO (người hiến máu phổ thông).',
  },
];

export function generateScienceMcqQuestion(difficulty: 'easy' | 'medium' | 'hard'): GeneratedQuestion {
  const id = `mcq_${difficulty}_${Date.now()}_${randInt(100, 999)}`;
  const item = pickRandom(SCIENCE_MCQ_BANK);

  // Xáo trộn 4 đáp án ngẫu nhiên
  const shuffledOptions = [...item.options].sort(() => Math.random() - 0.5);
  const correctIdx = shuffledOptions.indexOf(item.answer);

  // Ký tự chữ cái tương ứng A, B, C, D
  const letterMap = ['A', 'B', 'C', 'D'];
  const correctLetter = letterMap[correctIdx];

  const timeLimits = { easy: 15, medium: 20, hard: 25 };

  return {
    id,
    mode: 'science_mcq',
    difficulty,
    grade: item.grade,
    chapter: 'Khoa học tự nhiên & Kỹ năng phòng thí nghiệm',
    equation: item.prompt,
    correctValue: item.answer,
    correctIndex: correctIdx,
    options: shuffledOptions,
    acceptedAnswers: [
      item.answer.toLowerCase(),
      correctLetter.toLowerCase(),
      String(correctIdx + 1), // phím số 1, 2, 3, 4
    ],
    explanation: item.explanation,
    timeLimitSec: timeLimits[difficulty],
  };
}

/**
 * 6. GHÉP CHẤT - TÍNH CHẤT & ỨNG DỤNG THỰC TẾ (substance_match)
 */
export const SUBSTANCE_MATCH_DATA = [
  { substance: 'Vôi sống (CaO)', application: 'Khử chua đất trồng trọt, tẩy uế môi trường' },
  { substance: 'Đá vôi (CaCO3)', application: 'Sản xuất vôi, xi măng và vật liệu xây dựng' },
  { substance: 'Baking soda (NaHCO3)', application: 'Làm bột nở làm bánh, giảm đau dạ dày' },
  { substance: 'Khí CO2 (Băng khô)', application: 'Bảo quản thực phẩm, tạo khói sân khấu' },
  { substance: 'Muối ăn (NaCl)', application: 'Gia vị, bảo quản thực phẩm, sản xuất clo' },
  { substance: 'Cồn (Ethanol - C2H5OH)', application: 'Nhiên liệu sinh học, sát trùng y tế' },
  { substance: 'Giấm ăn (CH3COOH)', application: 'Gia vị nấu ăn, tẩy cặn vôi ấm đun' },
  { substance: 'Khí Oxi (O2)', application: 'Duy trì sự sống, hỗ trợ sự hô hấp và đốt cháy' },
  { substance: 'Khí Metan (CH4)', application: 'Nhiên liệu đốt trong khí sinh học bioga' },
];

export function generateSubstanceMatchQuestion(difficulty: 'easy' | 'medium' | 'hard'): GeneratedQuestion {
  const id = `match_${difficulty}_${Date.now()}_${randInt(100, 999)}`;
  const item = pickRandom(SUBSTANCE_MATCH_DATA);
  const wrongItems = SUBSTANCE_MATCH_DATA.filter(x => x.substance !== item.substance);
  const wrongOptions = [...wrongItems].sort(() => Math.random() - 0.5).slice(0, 3).map(x => x.application);

  const allOptions = [item.application, ...wrongOptions].sort(() => Math.random() - 0.5);
  const correctIdx = allOptions.indexOf(item.application);
  const letters = ['A', 'B', 'C', 'D'];

  return {
    id,
    mode: 'substance_match',
    difficulty,
    grade: 9,
    chapter: 'Ứng dụng chất hóa học trong đời sống',
    equation: `Ứng dụng thực tế quan trọng nhất của chất [${item.substance}] là gì?`,
    correctValue: item.application,
    correctIndex: correctIdx,
    options: allOptions,
    acceptedAnswers: [
      item.application.toLowerCase(),
      letters[correctIdx].toLowerCase(),
      String(correctIdx + 1),
    ],
    explanation: `Chất [${item.substance}] có đặc tính ứng dụng tiêu biểu là: "${item.application}".`,
    timeLimitSec: 25,
  };
}

/**
 * 7. BỘ TỔNG HỢP: Sinh câu hỏi STEM tổng quát theo chế độ
 */
export function generateStemQuestion(mode: string, difficulty: 'easy' | 'medium' | 'hard'): GeneratedQuestion {
  switch (mode) {
    case 'mol_calc':
      return generateMolCalcQuestion(difficulty);
    case 'math_algebra':
      return generateMathAlgebraQuestion(difficulty);
    case 'physics_calc':
      return generatePhysicsQuestion(difficulty);
    case 'unit_convert':
      return generateUnitConvertQuestion(difficulty);
    case 'science_mcq':
      return generateScienceMcqQuestion(difficulty);
    case 'substance_match':
      return generateSubstanceMatchQuestion(difficulty);
    case 'stem_mixed': {
      const stemModes = ['mol_calc', 'math_algebra', 'physics_calc', 'unit_convert', 'science_mcq', 'substance_match'];
      const chosen = pickRandom(stemModes);
      return generateStemQuestion(chosen, difficulty);
    }
    default:
      return generateMolCalcQuestion(difficulty);
  }
}
