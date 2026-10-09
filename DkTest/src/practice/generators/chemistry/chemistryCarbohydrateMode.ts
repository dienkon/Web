/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Hóa Học 12 - Cacbohiđrat (Glucose, Fructose, Saccarose, Tinh bột, Xenlulozơ)
 */

import { PracticeMode, PracticeQuestion, PracticeContext, TrueFalseStatement } from "../../core/types";

export const chemistryCarbohydrateMode: PracticeMode = {
  id: "chem_carbohydrate",
  title: "Hóa Học 12: Cacbohiđrat & Ứng dụng",
  description: "Luyện tập cấu tạo phân tử, tính chất hóa học và phản ứng thủy phân, tráng bạc của cacbohiđrat.",
  shortTag: "Cacbohiđrat 12",
  category: "chemistry",
  gradeRange: [12, 12],
  icon: "FlaskConical",
  badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
  gameRule: "standard",
  defaultLength: 10,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Nhận biết", description: "Phân loại cacbohiđrat (mono-, đi-, polisaccarit), tính tan" },
    { id: 2, name: "Thông hiểu", description: "Phản ứng tráng bạc, phản ứng với Cu(OH)2, thủy phân" },
    { id: 3, name: "Vận dụng", description: "Đúng/Sai 4 ý, bài toán lên men glucose, hiệu suất phản ứng" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const formatRoll = Math.random();

    // 1. Part II True / False Cluster: Properties of Glucose & Fructose
    if (diff >= 2 && formatRoll < 0.35) {
      const statements: TrueFalseStatement[] = [
        {
          id: "a",
          text: `Glucose và fructose đều có cùng công thức phân tử là $\\text{C}_6\\text{H}_{12}\\text{O}_6$ và là đồng phân của nhau.`,
          isCorrect: true,
          explanation: `Cả hai đều có $\\text{C}_6\\text{H}_{12}\\text{O}_6$, glucose có nhóm andehit (-CHO) còn fructose có nhóm xeton (-CO-).`,
        },
        {
          id: "b",
          text: `Trong môi trường kiềm, fructose có thể chuyển hóa thuận nghịch thành glucose và cũng cho phản ứng tráng bạc.`,
          isCorrect: true,
          explanation: `Trong môi trường kiềm (như dung dịch $\\text{AgNO}_3/\\text{NH}_3$), tồn tại cân bằng: Glucose $\\rightleftharpoons$ Fructose, nên fructose vẫn tráng bạc.`,
        },
        {
          id: "c",
          text: `Cả tinh bột và xenlulozơ đều là polime thiên nhiên và là đồng phân của nhau.`,
          isCorrect: false,
          explanation: `Mặc dù đều có dạng $(\\text{C}_6\\text{H}_{10}\\text{O}_5)_n$ nhưng hệ số polime hóa $n$ của tinh bột và xenlulozơ rất khác nhau, nên chúng không phải là đồng phân.`,
        },
        {
          id: "d",
          text: `Thuốc thử dùng để nhận biết dung dịch hồ tinh bột là dung dịch iot ($\text{I}_2$), tạo dung dịch có màu xanh tím đặc trưng.`,
          isCorrect: true,
          explanation: `Iot len lỏi vào các cuộn xoắn của amilozơ trong tinh bột tạo phức chất màu xanh tím.`,
        },
      ];

      return {
        id: `chem_carb_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "true_false_group",
        prompt: `Cacbohiđrat là hợp chất hữu cơ tạp chức đóng vai trò quan trọng trong đời sống và dinh dưỡng. Xét tính đúng/sai của các nhận định sau:`,
        subText: "Hóa Học 12 • Phần II: Đúng/Sai",
        difficulty: diff,
        correctAnswer: { a: true, b: true, c: false, d: true },
        trueFalseStatements: statements,
        hints: [
          "Phân biệt đồng phân: phải có cùng phân tử khối và công thức phân tử chính xác.",
          "Fructose không làm mất màu nước brom nhưng tráng bạc được nhờ môi trường bazơ.",
        ],
        misconceptions: [
          "Nghĩ rằng tinh bột và xenlulozơ là đồng phân vì nhìn thấy cùng công thức $(\\text{C}_6\\text{H}_{10}\\text{O}_5)_n$.",
          "Nghĩ rằng fructose chứa nhóm -CHO nên mới tráng bạc (thực tế fructose chứa nhóm xeton).",
        ],
        explanation: `Lời giải:\n- Ý a: Đúng, là đồng phân monosaccarit.\n- Ý b: Đúng, fructose chuyển hóa thành glucose trong kiềm.\n- Ý c: Sai, hệ số mắt xích $n$ khác nhau nên không phải đồng phân.\n- Ý d: Đúng, phản ứng đặc trưng với $\\text{I}_2$.`,
      };
    }

    // 2. Part III Numeric Short Answer: Fermentation calculation
    if (diff >= 2 && formatRoll >= 0.35 && formatRoll < 0.6) {
      // Glucose -> 2 C2H5OH + 2 CO2
      // 180g C6H12O6 -> 2*44 = 88g CO2 (or 2*22.4L CO2)
      // If 180g -> 88g CO2. Let m Glucose = 180g * k (k = 1, 2, 0.5)
      const k = [0.5, 1, 1.5, 2][Math.floor(Math.random() * 4)];
      const mGlucose = 180 * k;
      const mCO2 = Math.round(88 * k * 10) / 10;

      return {
        id: `chem_carb_num_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "numeric",
        prompt: `Lên men hoàn toàn $${mGlucose}\\text{ gam}$ glucose ($\text{C}_6\text{H}_{12}\text{O}_6$) với hiệu suất $100\\%$ thu được khí $\\text{CO}_2$. Khối lượng $\\text{CO}_2$ tạo thành bằng bao nhiêu gam?`,
        subText: "Hóa Học 12 • Phần III: Trả lời ngắn",
        difficulty: diff,
        correctAnswer: mCO2,
        tolerance: 0.1,
        unit: "g",
        hints: [
          "Phương trình lên men rượu: $\\text{C}_6\\text{H}_{12}\\text{O}_6 \\xrightarrow{\\text{men}} 2\\text{C}_2\\text{H}_5\\text{OH} + 2\\text{CO}_2$.",
          "$n_{\\text{glucose}} = \\frac{${mGlucose}}{180} = ${k}\\text{ mol}$.",
          "$n_{\\text{CO}_2} = 2 \\times n_{\\text{glucose}} = ${2 * k}\\text{ mol}$.",
        ],
        misconceptions: [
          "Quên hệ số 2 của $\\text{CO}_2$ trong phương trình phản ứng.",
          "Lấy sai phân tử khối của glucose (M = 180).",
        ],
        explanation: `Ta có $n_{\\text{glucose}} = \\frac{${mGlucose}}{180} = ${k}\\text{ mol}$.\nPhương trình: $\\text{C}_6\\text{H}_{12}\\text{O}_6 \\rightarrow 2\\text{C}_2\\text{H}_5\\text{OH} + 2\\text{CO}_2$.\nSuy ra $n_{\\text{CO}_2} = 2 \\times ${k} = ${2 * k}\\text{ mol}$.\nKhối lượng $\\text{CO}_2$ là $m_{\\text{CO}_2} = ${2 * k} \\times 44 = ${mCO2}\\text{ g}$.`,
      };
    }

    // 3. Part I Single Choice: Classification
    return {
      id: `chem_carb_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "choice",
      prompt: `Chất nào sau đây thuộc loại đisaccarit?`,
      subText: "Hóa Học 12 • Phần I: Trắc nghiệm 4 lựa chọn",
      difficulty: 1,
      options: [
        { id: "A", text: "Saccarozơ" },
        { id: "B", text: "Glucozơ" },
        { id: "C", text: "Xenlulozơ" },
        { id: "D", text: "Fructozơ" },
      ],
      correctAnswer: "A",
      hints: [
        "Monosaccarit: Glucose, Fructose.",
        "Đisaccarit: Saccarose, Mantose.",
        "Polisaccarit: Tinh bột, Xenlulozơ.",
      ],
      misconceptions: [
        "Nhầm saccarozơ với monosaccarit.",
      ],
      explanation: `Saccarozơ có công thức phân tử $\\text{C}_{12}\\text{H}_{22}\\text{O}_{11}$, cấu tạo từ 1 gốc $\\alpha$-glucose và 1 gốc $\\beta$-fructose, thuộc loại đisaccarit.`,
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
      const tol = question.tolerance ?? 0.1;
      return !isNaN(numVal) && !isNaN(corVal) && Math.abs(numVal - corVal) <= tol;
    }
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },

  calculateScore(question: PracticeQuestion, userAnswer: any, context) {
    const base = context.difficulty * 10;
    return context.isCorrect ? base + Math.min(context.combo * 2, 10) : 0;
  },
};
