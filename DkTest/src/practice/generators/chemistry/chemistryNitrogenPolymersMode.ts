/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Hóa Học 12 - Hợp chất chứa Nitơ & Polime (Amin, Amino Axit, Peptit, Polime)
 */

import { PracticeMode, PracticeQuestion, PracticeContext, TrueFalseStatement } from "../../core/types";

export const chemistryNitrogenPolymersMode: PracticeMode = {
  id: "chem_nitrogen_polymers",
  title: "Hóa Học 12: Hợp chất chứa Nitơ & Polime",
  description: "Luyện tập tính bazơ của amin, tính lưỡng tính của amino axit, liên kết peptit và vật liệu polime.",
  shortTag: "Amin & Polime 12",
  category: "chemistry",
  gradeRange: [12, 12],
  icon: "Boxes",
  badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
  gameRule: "standard",
  defaultLength: 10,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Nhận biết", description: "Bậc amin, tên gọi amino axit (Gly, Ala, Val), tơ thiên nhiên & nhân tạo" },
    { id: 2, name: "Thông hiểu", description: "Tính lưỡng tính của amino axit, phản ứng trùng hợp / trùng ngưng" },
    { id: 3, name: "Vận dụng", description: "Đúng/Sai 4 ý, thủy phân peptit, tính toán khối lượng mắt xích polime" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const formatRoll = Math.random();

    // 1. Part II True / False Cluster: Amino Acids & Peptides
    if (diff >= 2 && formatRoll < 0.35) {
      const statements: TrueFalseStatement[] = [
        {
          id: "a",
          text: `Amino axit là hợp chất hữu cơ tạp chức, phân tử chứa đồng thời nhóm amino ($\\text{-NH}_2$) và nhóm cacboxyl ($\\text{-COOH}$).`,
          isCorrect: true,
          explanation: `Định nghĩa chuẩn của amino axit theo SGK Hóa học 12.`,
        },
        {
          id: "b",
          text: `Glyxin ($\\text{H}_2\\text{N-CH}_2\\text{-COOH}$) làm quỳ tím hóa đỏ do chứa nhóm cacboxyl mang tính axit.`,
          isCorrect: false,
          explanation: `Glyxin có 1 nhóm $\\text{-NH}_2$ và 1 nhóm $\\text{-COOH}$ nên dung dịch có pH xấp xỉ 7, không làm đổi màu quỳ tím.`,
        },
        {
          id: "c",
          text: `Peptit tạo bởi các gốc $\\alpha$-amino axit bằng liên kết peptit ($\\text{-CO-NH-}$). Đipeptit không có phản ứng màu biure với $\\text{Cu(OH)}_2$.`,
          isCorrect: true,
          explanation: `Chỉ từ tripeptit trở lên mới có phản ứng màu biure với $\\text{Cu(OH)}_2$ tạo phức màu tím đặc trưng.`,
        },
        {
          id: "d",
          text: `Tơ nilon-6,6 thuộc loại tơ poliamit, được điều chế bằng phản ứng trùng ngưng giữa axit ađipic và hexametylendiamin.`,
          isCorrect: true,
          explanation: `Nilon-6,6 là tơ poliamit tiêu biểu điều chế qua trùng ngưng axit ađipic và hexametylendiamin.`,
        },
      ];

      return {
        id: `chem_nitro_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "true_false_group",
        prompt: `Hợp chất hữu cơ chứa nitơ và polime có nhiều ứng dụng trong y học, dệt may và đời sống. Xét tính đúng/sai của các nhận định sau:`,
        subText: "Hóa Học 12 • Phần II: Đúng/Sai",
        difficulty: diff,
        correctAnswer: { a: true, b: false, c: true, d: true },
        trueFalseStatements: statements,
        hints: [
          "So sánh số lượng nhóm $\\text{-NH}_2$ và $\\text{-COOH}$ để xét tính đổi màu quỳ tím.",
          "Ghi nhớ: Đipeptit KHÔNG có phản ứng màu biure.",
        ],
        misconceptions: [
          "Nghĩ rằng glyxin làm quỳ tím đổi màu.",
          "Nghĩ rằng đipeptit cũng có phản ứng màu biure.",
        ],
        explanation: `Lời giải:\n- Ý a: Đúng, định nghĩa tạp chức.\n- Ý b: Sai, glyxin không làm đổi màu chỉ thị màu.\n- Ý c: Đúng, đipeptit không có phản ứng biure.\n- Ý d: Đúng, tơ nilon-6,6 điều chế bằng phản ứng trùng ngưng.`,
      };
    }

    // 2. Part III Numeric Short Answer: Molar mass or number of peptide bonds
    if (diff >= 2 && formatRoll >= 0.35 && formatRoll < 0.6) {
      // Number of peptide bonds in a tetrapeptide = 4 - 1 = 3
      const numResidues = [3, 4, 5][Math.floor(Math.random() * 3)];
      const numBonds = numResidues - 1;
      const peptideName = numResidues === 3 ? "tripeptit" : numResidues === 4 ? "tetrapeptit" : "pentapeptit";

      return {
        id: `chem_nitro_num_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "numeric",
        prompt: `Số liên kết peptit có trong một phân tử ${peptideName} mạch hở bằng bao nhiêu?`,
        subText: "Hóa Học 12 • Phần III: Trả lời ngắn",
        difficulty: 1,
        correctAnswer: numBonds,
        tolerance: 0,
        hints: [
          "Một peptit mạch hở gồm $n$ gốc $\\alpha$-amino axit sẽ có $n - 1$ liên kết peptit $\\text{-CO-NH-}$.",
        ],
        misconceptions: [
          "Nhầm số liên kết peptit với số gốc amino axit ($n$).",
        ],
        explanation: `Phân tử ${peptideName} có $n = ${numResidues}$ gốc $\\alpha$-amino axit, do đó số liên kết peptit là $n - 1 = ${numResidues} - 1 = ${numBonds}$.`,
      };
    }

    // 3. Part I Single Choice: Base strength or Classification
    return {
      id: `chem_nitro_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "choice",
      prompt: `Chất nào dưới đây làm quỳ tím ẩm chuyển sang màu xanh?`,
      subText: "Hóa Học 12 • Phần I: Trắc nghiệm 4 lựa chọn",
      difficulty: 1,
      options: [
        { id: "A", text: "Metylamin (CH3NH2)" },
        { id: "B", text: "Anilin (C6H5NH2)" },
        { id: "C", text: "Glyxin (H2N-CH2-COOH)" },
        { id: "D", text: "Axit axetic (CH3COOH)" },
      ],
      correctAnswer: "A",
      hints: [
        "Metylamin là amin béo có tính bazơ mạnh hơn amoniac, làm quỳ tím hóa xanh.",
        "Anilin có tính bazơ rất yếu không làm đổi màu quỳ tím.",
      ],
      misconceptions: [
        "Nghĩ rằng mọi amin đều làm đổi màu quỳ tím (anilin không đổi màu quỳ tím).",
      ],
      explanation: `Metylamin $(\\text{CH}_3\\text{NH}_2)$ tan tốt trong nước, dung dịch có tính bazơ làm quỳ tím chuyển màu xanh. Anilin có tính bazơ rất yếu không làm đổi màu quỳ tím.`,
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
