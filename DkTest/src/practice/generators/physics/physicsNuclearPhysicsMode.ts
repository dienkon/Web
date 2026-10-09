/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Vật Lý 12 - Vật lý hạt nhân & Phóng xạ (GDPT 2018)
 */

import { PracticeMode, PracticeQuestion, PracticeContext, TrueFalseStatement } from "../../core/types";

export const physicsNuclearPhysicsMode: PracticeMode = {
  id: "physics_nuclear_physics",
  title: "Vật Lý 12: Vật lý hạt nhân & Năng lượng",
  description: "Luyện tập cấu tạo hạt nhân, độ hụt khối, năng lượng liên kết riêng và định luật phóng xạ.",
  shortTag: "Hạt nhân 12",
  category: "physics",
  gradeRange: [12, 12],
  icon: "Atom",
  badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  gameRule: "standard",
  defaultLength: 10,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Nhận biết", description: "Số khối A, số proton Z, số nơtron N, các tia phóng xạ" },
    { id: 2, name: "Thông hiểu", description: "Độ hụt khối Δm, năng lượng liên kết W_lk, chu kỳ bán rã T" },
    { id: 3, name: "Vận dụng", description: "Đúng/Sai 4 ý, năng lượng phản ứng hạt nhân, định tuổi đồng vị" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const formatRoll = Math.random();

    // 1. Part II True / False Cluster: Radioactivity and Nuclear Structure
    if (diff >= 2 && formatRoll < 0.35) {
      // Isotope Iodine-131, T = 8 days
      const tHalf = 8; // days
      const daysElapsed = 24; // 3 half-lives
      // Remaining fraction: (1/2)^3 = 1/8 = 12.5%
      const remainingPercent = 12.5;

      const statements: TrueFalseStatement[] = [
        {
          id: "a",
          text: `Hạt nhân $^{131}_{53}\\text{I}$ có $53$ proton và $78$ nơtron.`,
          isCorrect: true,
          explanation: `Số proton $Z = 53$, số khối $A = 131 \\Rightarrow$ số nơtron $N = A - Z = 131 - 53 = 78$.`,
        },
        {
          id: "b",
          text: `Chu kỳ bán rã $T$ của đồng vị phóng xạ phụ thuộc vào nhiệt độ và áp suất của môi trường.`,
          isCorrect: false,
          explanation: `Phóng xạ là quá trình biến đổi tự phát bên trong hạt nhân, hoàn toàn không phụ thuộc vào các điều kiện bên ngoài như nhiệt độ, áp suất.`,
        },
        {
          id: "c",
          text: `Sau thời gian $t = 24\\text{ ngày}$ (tương ứng $3T$), số hạt nhân $^{131}_{53}\\text{I}$ còn lại là $12{,}5\\%$ so với ban đầu.`,
          isCorrect: true,
          explanation: `Áp dụng định luật phóng xạ: $\\frac{N(t)}{N_0} = 2^{-t/T} = 2^{-24/8} = 2^{-3} = \\frac{1}{8} = 12{,}5\\%$.`,
        },
        {
          id: "d",
          text: `Tia phóng xạ $\\alpha$ mang điện tích $+2e$ và bị lệch trong điện trường về phía bản âm.`,
          isCorrect: true,
          explanation: `Hạt $\\alpha$ là hạt nhân nguyên tử Heli $^{4}_{2}\\text{He}$ mang điện tích dương $+2e$, bị hút về bản âm của tụ điện.`,
        },
      ];

      return {
        id: `phys_nucl_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "true_false_group",
        prompt: `Đồng vị iot $^{131}_{53}\\text{I}$ là chất phóng xạ $\\beta^-$ với chu kỳ bán rã $T = 8\\text{ ngày}$. Xét tính đúng/sai của các phát biểu sau:`,
        subText: "Vật Lý 12 • Phần II: Đúng/Sai",
        difficulty: diff,
        correctAnswer: { a: true, b: false, c: true, d: true },
        trueFalseStatements: statements,
        hints: [
          "Số nơtron $N = A - Z$.",
          "Số hạt còn lại sau thời gian $t$ tính theo công thức: $N(t) = N_0 \\cdot 2^{-t/T}$.",
          "Phóng xạ không chịu ảnh hưởng của các tác nhân vật lý và hóa học thông thường.",
        ],
        misconceptions: [
          "Nghĩ rằng chu kỳ bán rã có thể thay đổi khi đun nóng hoặc làm lạnh chất phóng xạ.",
          "Nhầm hạt $\\alpha$ (dương) với $\\beta^-$ (âm).",
        ],
        explanation: `Lời giải:\n- Ý a: Đúng, $Z = 53, N = 131 - 53 = 78$.\n- Ý b: Sai, chu kỳ bán rã là bất biến đối với các yếu tố bên ngoài.\n- Ý c: Đúng, $2^{-3} = 12{,}5\\%$.\n- Ý d: Đúng, tia $\\alpha$ mang điện dương nên lệch về bản âm.`,
      };
    }

    // 2. Part III Numeric Short Answer: Number of Neutrons or Mass Defect
    if (diff >= 2 && formatRoll >= 0.35 && formatRoll < 0.6) {
      // Calculate number of neutrons of Uranium-238 (Z = 92) => N = 238 - 92 = 146
      const z = 92;
      const a = 238;
      const n = a - z; // 146

      return {
        id: `phys_nucl_num_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "numeric",
        prompt: `Số nơtron có trong một hạt nhân Urani $^{238}_{92}\\text{U}$ bằng bao nhiêu?`,
        subText: "Vật Lý 12 • Phần III: Trả lời ngắn",
        difficulty: 1,
        correctAnswer: n,
        tolerance: 0,
        hints: [
          "Ký hiệu hạt nhân: $^{A}_{Z}\\text{X}$, trong đó $A$ là số khối, $Z$ là số proton.",
          "Số nơtron $N = A - Z$.",
        ],
        misconceptions: [
          "Nhầm số nơtron với số khối $A = 238$.",
        ],
        explanation: `Số nơtron của hạt nhân $^{238}_{92}\\text{U}$ là: $N = A - Z = 238 - 92 = 146$.`,
      };
    }

    // 3. Part I Single Choice: Binding energy or composition
    const zProt = Math.floor(Math.random() * 5) + 6; // 6 to 10 (C, N, O, F, Ne)
    const aMass = 2 * zProt; // Carbon-12, Nitrogen-14, Oxygen-16
    const nNeut = aMass - zProt;

    return {
      id: `phys_nucl_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "choice",
      prompt: `Hạt nhân $^{${aMass}}_{${zProt}}\\text{X}$ có số nuclôn bằng:`,
      subText: "Vật Lý 12 • Phần I: Trắc nghiệm 4 lựa chọn",
      difficulty: 1,
      options: [
        { id: "A", text: `${aMass}`, latex: `${aMass}` },
        { id: "B", text: `${zProt}`, latex: `${zProt}` },
        { id: "C", text: `${nNeut}`, latex: `${nNeut}` },
        { id: "D", text: `${aMass + zProt}`, latex: `${aMass + zProt}` },
      ],
      correctAnswer: "A",
      hints: ["Số nuclôn chính là số khối $A$ ở chỉ số trên của ký hiệu hạt nhân."],
      misconceptions: ["Nhầm số nuclôn với số proton $Z$ hoặc số nơtron."],
      explanation: `Hạt nhân $^{A}_{Z}\\text{X}$ có số nuclôn chính là số khối $A = ${aMass}$.`,
    };
  },

  validateAnswer(question: PracticeQuestion, userAnswer: any) {
    if (question.type === "true_false_group") {
      const stmts = question.trueFalseStatements || [];
      if (!userAnswer || typeof userAnswer !== "object") return false;
      return stmts.every((s) => userAnswer[s.id] === s.isCorrect);
    }
    if (question.type === "numeric") {
      const numVal = parseFloat(String(userAnswer).replace(",", "."));
      const corVal = parseFloat(String(question.correctAnswer).replace(",", "."));
      const tol = question.tolerance ?? 0;
      return !isNaN(numVal) && !isNaN(corVal) && Math.abs(numVal - corVal) <= tol;
    }
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },

  calculateScore(question: PracticeQuestion, userAnswer: any, context) {
    const base = context.difficulty * 10;
    return context.isCorrect ? base + Math.min(context.combo * 2, 10) : 0;
  },
};
