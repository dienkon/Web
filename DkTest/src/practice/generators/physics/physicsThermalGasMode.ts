/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Vật Lý 12 - Vật lý nhiệt & Khí lý tưởng
 */

import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";

interface PhysicsItemTemplate {
  prompt: string;
  options: string[];
  correctText: string;
  explanation: string;
  difficulty: number;
}

function generateDynamicThermalProblem(diff: number): PhysicsItemTemplate {
  const type = Math.floor(Math.random() * 4);

  if (type === 0) {
    // Heat capacity calculation Q = mcΔT
    const m = (Math.floor(Math.random() * 4) + 1) * 0.5; // 0.5, 1.0, 1.5, 2.0 kg
    const c = 4200; // J/(kg.K)
    const t1 = Math.floor(Math.random() * 20) + 15; // 15 to 35 C
    const dt = Math.floor(Math.random() * 40) + 20; // 20 to 60 C
    const t2 = t1 + dt;
    const qJ = m * c * dt;
    const qkJ = qJ / 1000;

    const correct = `${qkJ} kJ`;
    const dist1 = `${(m * c * (dt + 10)) / 1000} kJ`;
    const dist2 = `${(m * 2100 * dt) / 1000} kJ`;
    const dist3 = `${qkJ * 10} kJ`;

    return {
      prompt: `Một khối nước có khối lượng $m = ${m}\\text{ kg}$ được đun nóng từ $t_1 = ${t1}^\\circ\\text{C}$ lên $t_2 = ${t2}^\\circ\\text{C}$. Biết nhiệt dung riêng của nước là $c = 4200\\text{ J/(kg}\\cdot\\text{K)}$. Nhiệt lượng cần cung cấp cho khối nước là:`,
      options: [correct, dist1, dist2, dist3],
      correctText: correct,
      explanation: `Áp dụng công thức tính nhiệt lượng: $Q = mc(t_2 - t_1) = ${m} \\times 4200 \\times (${t2} - ${t1}) = ${qJ}\\text{ J} = ${qkJ}\\text{ kJ}$.`,
      difficulty: diff,
    };
  } else if (type === 1) {
    // Boyle's Law: p1*V1 = p2*V2
    const p1 = Math.floor(Math.random() * 3) + 1; // 1, 2, 3 atm
    const v1 = (Math.floor(Math.random() * 5) + 4) * 2; // 8, 10, 12, 14, 16 L
    const v2Ratio = [2, 4][Math.floor(Math.random() * 2)];
    const v2 = v1 / v2Ratio;
    const p2 = p1 * v2Ratio;

    const correct = `${p2} atm`;
    const dist1 = `${(p1 / v2Ratio).toFixed(1)} atm`;
    const dist2 = `${p2 * 2} atm`;
    const dist3 = `${p1 + v2Ratio} atm`;

    return {
      prompt: `Một khối khí lý tưởng xác định ở nhiệt độ không đổi có thể tích $V_1 = ${v1}\\text{ lít}$ và áp suất $p_1 = ${p1}\\text{ atm}$. Nén đẳng nhiệt khối khí đến thể tích $V_2 = ${v2}\\text{ lít}$. Áp suất $p_2$ của khối khí sau khi nén là:`,
      options: [correct, dist1, dist2, dist3],
      correctText: correct,
      explanation: `Theo định luật Boyle cho quá trình đẳng nhiệt: $p_1 V_1 = p_2 V_2 \\Rightarrow p_2 = \\frac{p_1 V_1}{V_2} = \\frac{${p1} \\times ${v1}}{${v2}} = ${p2}\\text{ atm}$.`,
      difficulty: diff,
    };
  } else if (type === 2) {
    // First law of thermodynamics: ΔU = A + Q
    const q = (Math.floor(Math.random() * 5) + 2) * 50; // 100, 150, 200, 250, 300 J
    const aWork = (Math.floor(Math.random() * 4) + 1) * 30; // 30, 60, 90, 120 J
    const isReceivingWork = Math.random() > 0.5;

    let deltaU: number;
    let descWork: string;
    if (isReceivingWork) {
      // Received work: A > 0
      deltaU = q + aWork;
      descWork = `đồng thời nhận công $A = ${aWork}\\text{ J}$ từ ngoại lực`;
    } else {
      // Done work: A < 0
      deltaU = q - aWork;
      descWork = `đồng thời giãn nở sinh công $A' = ${aWork}\\text{ J}$ đẩy pit-tông`;
    }

    const correct = `${deltaU > 0 ? "+" : ""}${deltaU} J`;
    const dist1 = `${deltaU > 0 ? "-" : "+"}${Math.abs(deltaU)} J`;
    const dist2 = `+${q} J`;
    const dist3 = `+${q + aWork + 50} J`;

    return {
      prompt: `Một khối khí trong xilanh nhận nhiệt lượng $Q = ${q}\\text{ J}$, ${descWork}. Độ biến thiên nội năng $\\Delta U$ của khối khí là:`,
      options: [correct, dist1, dist2, dist3],
      correctText: correct,
      explanation: `Theo nguyên lý I nhiệt động lực học $\\Delta U = A + Q$. Khối khí nhận nhiệt nên $Q = +${q}\\text{ J}$. ${isReceivingWork ? `Khối khí nhận công nên $A = +${aWork}\\text{ J}$` : `Khối khí thực hiện công nên $A = -${aWork}\\text{ J}$`}. Do đó $\\Delta U = ${deltaU > 0 ? "+" : ""}${deltaU}\\text{ J}$.`,
      difficulty: diff,
    };
  } else {
    // Charles Law: V1/T1 = V2/T2
    const t1C = 27;
    const t1K = 300;
    const t2C = 127;
    const t2K = 400;
    const v1 = 6; // L
    const v2 = (v1 * t2K) / t1K; // 8 L

    const correct = `${v2} lít`;
    const dist1 = `${(v1 * t2C / t1C).toFixed(1)} lít`;
    const dist2 = `${v1 + 2} lít`;
    const dist3 = `${v1 * 2} lít`;

    return {
      prompt: `Một lượng khí lý tưởng ở áp suất không đổi có thể tích $V_1 = ${v1}\\text{ lít}$ ở nhiệt độ $t_1 = 27^\\circ\\text{C}$. Đun nóng đẳng áp khối khí đến nhiệt độ $t_2 = 127^\\circ\\text{C}$. Thể tích $V_2$ của khối khí lúc sau là:`,
      options: [correct, dist1, dist2, dist3],
      correctText: correct,
      explanation: `Đổi sang thang Kelvin: $T_1 = 27 + 273 = 300\\text{ K}$, $T_2 = 127 + 273 = 400\\text{ K}$. Áp dụng định luật Charles cho quá trình đẳng áp: $\\frac{V_1}{T_1} = \\frac{V_2}{T_2} \\Rightarrow V_2 = V_1 \\cdot \\frac{T_2}{T_1} = ${v1} \\times \\frac{400}{300} = ${v2}\\text{ lít}$. Lưu ý: Phải đổi nhiệt độ sang Kelvin trước khi áp dụng định luật chất khí.`,
      difficulty: diff,
    };
  }
}

export const physicsThermalGasMode: PracticeMode = {
  id: "physics-thermal-gas",
  title: "Vật Lý 12 • Nhiệt học & Khí lý tưởng",
  description: "Luyện giải nhanh các định luật chất khí (Boyle, Charles), nguyên lý nhiệt động lực học và cân bằng nhiệt chuẩn chương trình mới.",
  shortTag: "Vật Lý 12",
  category: "physics",
  gradeRange: [10, 12],
  icon: "Atom",
  badgeColor: "rose",
  gameRule: "standard",
  defaultLength: 10,
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Định luật Boyle, Charles và cân bằng nhiệt cơ bản." },
    { id: 2, name: "Thông hiểu", description: "Nguyên lý 1 nhiệt động lực học và đồ thị trạng thái khí." },
    { id: 3, name: "Vận dụng", description: "Phương trình Clapeyron - Mendeleev và bài toán hỗn hợp nhiệt." },
  ],
  generateQuestion: (context: PracticeContext): PracticeQuestion => {
    const diff = context.difficulty || 1;
    const problem = generateDynamicThermalProblem(diff);

    // Shuffle options
    const uniqueOptions = Array.from(new Set(problem.options));
    let padCount = 1;
    while (uniqueOptions.length < 4) {
      uniqueOptions.push(`${problem.correctText} [d${padCount++}]`);
    }
    const shuffled = [...uniqueOptions].slice(0, 4).sort(() => Math.random() - 0.5);
    const correctLetter = String.fromCharCode(65 + shuffled.indexOf(problem.correctText));

    return {
      id: `phys_therm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "choice",
      prompt: problem.prompt,
      subText: "Vật Lý 12 • Chuyên đề Nhiệt học & Khí lý tưởng",
      options: shuffled.map((opt, idx) => ({
        id: String.fromCharCode(65 + idx),
        text: opt,
      })),
      correctAnswer: correctLetter,
      explanation: problem.explanation,
      difficulty: diff,
    };
  },
  validateAnswer: (question, userAnswer) => {
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },
  calculateScore: (question, userAnswer, ctx) => {
    return ctx.isCorrect ? Math.max(10, 100 - (ctx.timeSpentSeconds || 0) * 2) + ctx.combo * 5 : 0;
  },
};
