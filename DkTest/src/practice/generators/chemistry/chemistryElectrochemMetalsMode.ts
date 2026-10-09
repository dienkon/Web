/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Hóa Học 12 - Pin điện hóa, Thế điện cực & Kim loại (GDPT 2018)
 */

import { PracticeMode, PracticeQuestion, PracticeContext, TrueFalseStatement } from "../../core/types";

export const chemistryElectrochemMetalsMode: PracticeMode = {
  id: "chem_electrochem_metals",
  title: "Hóa Học 12: Pin điện hóa & Kim loại",
  description: "Luyện tập dãy điện hóa, thế điện cực chuẩn, sức điện động của pin điện hóa và ăn mòn kim loại.",
  shortTag: "Điện hóa 12",
  category: "chemistry",
  gradeRange: [12, 12],
  icon: "Zap",
  badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  gameRule: "standard",
  defaultLength: 10,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Nhận biết", description: "Dãy điện thế chuẩn, anot / catot trong pin điện hóa, tính khử kim loại" },
    { id: 2, name: "Thông hiểu", description: "Tính sức điện động chuẩn E°_pin, chiều phản ứng oxi hóa - khử" },
    { id: 3, name: "Vận dụng", description: "Đúng/Sai 4 ý, định luật Faraday trong điện phân, chống ăn mòn điện hóa" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const formatRoll = Math.random();

    // 1. Part II True / False Cluster: Galvanic Daniell Cell Zn-Cu
    if (diff >= 2 && formatRoll < 0.35) {
      // E0(Zn2+/Zn) = -0.76 V, E0(Cu2+/Cu) = +0.34 V => E0_pin = 0.34 - (-0.76) = 1.10 V
      const statements: TrueFalseStatement[] = [
        {
          id: "a",
          text: `Ở điện cực kẽm (Zn) xảy ra quá trình oxi hóa: $\\text{Zn} \\rightarrow \\text{Zn}^{2+} + 2e$, kẽm đóng vai trò là cực âm (anot).`,
          isCorrect: true,
          explanation: `Trong pin điện hóa, anot là cực âm nơi xảy ra quá trình oxi hóa kẽm.`,
        },
        {
          id: "b",
          text: `Ở điện cực đồng (Cu) xảy ra quá trình khử: $\\text{Cu}^{2+} + 2e \\rightarrow \\text{Cu}$, đồng đóng vai trò là cực dương (catot).`,
          isCorrect: true,
          explanation: `Trong pin điện hóa, catot là cực dương nơi xảy ra quá trình khử ion $\\text{Cu}^{2+}$.`,
        },
        {
          id: "c",
          text: `Sức điện động chuẩn của pin điện hóa $\\text{Zn-Cu}$ là $E^\\circ_{\\text{pin}} = 1{,}10\\text{ V}$.`,
          isCorrect: true,
          explanation: `$E^\\circ_{\\text{pin}} = E^\\circ_{\\text{Cu}^{2+}/\\text{Cu}} - E^\\circ_{\\text{Zn}^{2+}/\\text{Zn}} = 0{,}34 - (-0{,}76) = 1{,}10\\text{ V}$.`,
        },
        {
          id: "d",
          text: `Dòng electron chạy ở mạch ngoài từ điện cực đồng (Cu) sang điện cực kẽm (Zn).`,
          isCorrect: false,
          explanation: `Electron giải phóng tại anot (Zn) chạy qua dây dẫn mạch ngoài sang catot (Cu).`,
        },
      ];

      return {
        id: `chem_elec_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "true_false_group",
        prompt: `Cho pin điện hóa Daniell gồm hai điện cực $\\text{Zn}$ nhúng trong dung dịch $\\text{ZnSO}_4$ và $\\text{Cu}$ nhúng trong dung dịch $\\text{CuSO}_4$. Biết $E^\\circ_{\\text{Zn}^{2+}/\\text{Zn}} = -0{,}76\\text{ V}$, $E^\\circ_{\\text{Cu}^{2+}/\\text{Cu}} = +0{,}34\\text{ V}$. Xét tính đúng/sai:`,
        subText: "Hóa Học 12 • Phần II: Đúng/Sai",
        difficulty: diff,
        correctAnswer: { a: true, b: true, c: true, d: false },
        trueFalseStatements: statements,
        hints: [
          "Anot: cực âm (xảy ra oxi hóa kim loại có tính khử mạnh hơn).",
          "Catot: cực dương (xảy ra khử cation kim loại yếu hơn).",
          "$E^\\circ_{\\text{pin}} = E^\\circ_{\\text{catot}} - E^\\circ_{\\text{anot}}$.",
        ],
        misconceptions: [
          "Nhầm lẫn dấu điện cực giữa pin điện hóa (anot âm, catot dương) và bình điện phân (anot dương, catot âm).",
          "Nhầm chiều dòng electron ở mạch ngoài.",
        ],
        explanation: `Lời giải:\n- Ý a: Đúng, anot là cực âm, Zn bị oxi hóa.\n- Ý b: Đúng, catot là cực dương, $\\text{Cu}^{2+}$ bị khử.\n- Ý c: Đúng, $E^\\circ_{\\text{pin}} = 0{,}34 - (-0{,}76) = 1{,}10\\text{ V}$.\n- Ý d: Sai, dòng electron chạy từ Zn sang Cu.`,
      };
    }

    // 2. Part III Numeric Short Answer: Calculate standard EMF E0_pin
    if (diff >= 2 && formatRoll >= 0.35 && formatRoll < 0.6) {
      // E0(Ag+/Ag) = +0.80 V, E0(Cu2+/Cu) = +0.34 V => E0_pin = 0.80 - 0.34 = 0.46 V
      const e0Pin = 0.46;

      return {
        id: `chem_elec_num_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "numeric",
        prompt: `Biết thế điện cực chuẩn của hai cặp oxi hóa - khử là $E^\\circ_{\\text{Ag}^+/\\text{Ag}} = +0{,}80\\text{ V}$ và $E^\\circ_{\\text{Cu}^{2+}/\\text{Cu}} = +0{,}34\\text{ V}$. Sức điện động chuẩn của pin điện hóa $\\text{Cu-Ag}$ bằng bao nhiêu Vôn (V)?`,
        subText: "Hóa Học 12 • Phần III: Trả lời ngắn",
        difficulty: diff,
        correctAnswer: e0Pin,
        tolerance: 0.05,
        unit: "V",
        hints: [
          "Sức điện động chuẩn của pin: $E^\\circ_{\\text{pin}} = E^\\circ_{\\text{catot}} - E^\\circ_{\\text{anot}} = E^\\circ_{\\text{dương}} - E^\\circ_{\\text{âm}}$.",
          "Thế lớn hơn đóng vai trò catot: $0{,}80 - 0{,}34$.",
        ],
        misconceptions: [
          "Lấy hiệu theo chiều ngược lại ra kết quả âm (sức điện động pin luôn dương).",
        ],
        explanation: `Sức điện động của pin điện hóa $\\text{Cu-Ag}$ là: $E^\\circ_{\\text{pin}} = E^\\circ_{\\text{Ag}^+/\\text{Ag}} - E^\\circ_{\\text{Cu}^{2+}/\\text{Cu}} = 0{,}80 - 0{,}34 = 0{,}46\\text{ V}$.`,
      };
    }

    // 3. Part I Single Choice: Galvanic vs Electrolysis or Metal Activity
    return {
      id: `chem_elec_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "choice",
      prompt: `Kim loại nào sau đây có tính khử mạnh nhất trong dãy hoạt động hóa học?`,
      subText: "Hóa Học 12 • Phần I: Trắc nghiệm 4 lựa chọn",
      difficulty: 1,
      options: [
        { id: "A", text: "Kali (K)" },
        { id: "B", text: "Sắt (Fe)" },
        { id: "C", text: "Đồng (Cu)" },
        { id: "D", text: "Bạc (Ag)" },
      ],
      correctAnswer: "A",
      hints: ["Thứ tự dãy điện hóa: Khi (K), Nào (Na), Cần (Ca), May (Mg), Áo (Al)..."],
      misconceptions: ["Nhầm giữa tính khử của kim loại và tính oxi hóa của cation."],
      explanation: `Kali (K) đứng đầu dãy điện hóa nên có tính khử mạnh nhất trong các kim loại đã cho.`,
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
      const tol = question.tolerance ?? 0.05;
      return !isNaN(numVal) && !isNaN(corVal) && Math.abs(numVal - corVal) <= tol;
    }
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },

  calculateScore(question: PracticeQuestion, userAnswer: any, context) {
    const base = context.difficulty * 10;
    return context.isCorrect ? base + Math.min(context.combo * 2, 10) : 0;
  },
};
