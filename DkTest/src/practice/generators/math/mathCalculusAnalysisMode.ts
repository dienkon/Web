/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Toán 12 - Khảo sát hàm số & Ứng dụng đạo hàm (GDPT 2018 & Đề thi 2025)
 */

import { PracticeMode, PracticeQuestion, PracticeContext, TrueFalseStatement } from "../../core/types";

export const mathCalculusAnalysisMode: PracticeMode = {
  id: "math_calculus_analysis",
  title: "Toán 12: Khảo sát hàm số & Đạo hàm",
  description: "Luyện tập tính đơn điệu, cực trị, GTLN-GTNN và tiệm cận theo định dạng đề thi tốt nghiệp THPT 2025.",
  shortTag: "Đạo hàm 12",
  category: "advanced",
  gradeRange: [12, 12],
  icon: "TrendingUp",
  badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  gameRule: "standard",
  defaultLength: 10,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Nhận biết", description: "Nhận biết tính đồng biến/nghịch biến, tiệm cận cơ bản" },
    { id: 2, name: "Thông hiểu", description: "Tìm cực trị, GTLN/GTNN trên đoạn, dạng đồ thị" },
    { id: 3, name: "Vận dụng", description: "Đúng/Sai 4 ý, tìm tham số m, bài toán tối ưu thực tế" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    // Alternate format: Part I (choice), Part II (true_false_group), Part III (numeric)
    const formatRoll = Math.random();

    // 1. FORMAT PART II: True / False Cluster (4 statements a, b, c, d)
    if (diff >= 2 && formatRoll < 0.35) {
      const a = [1, -1][Math.floor(Math.random() * 2)];
      const x1 = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
      const x2 = x1 + 2; // distinct roots
      // f'(x) = 3a(x - x1)(x - x2) = 3a(x^2 - (x1+x2)x + x1*x2)
      const bCoeff = -3 * a * (x1 + x2);
      const cCoeff = 3 * a * x1 * x2;
      const dCoeff = Math.floor(Math.random() * 5) + 1;

      // f(x) = a*x^3 + (bCoeff/2)*x^2 + cCoeff*x + dCoeff (we construct standard cubic)
      const promptLatex = `Cho hàm số $y = f(x) = ${a === 1 ? "" : "-"}\\frac{1}{3}x^3 ${bCoeff >= 0 ? "+ " + bCoeff : "- " + Math.abs(bCoeff)}x^2 ${cCoeff >= 0 ? "+ " + cCoeff : "- " + Math.abs(cCoeff)}x + ${dCoeff}$. Xét tính đúng/sai của các mệnh đề sau:`;

      const statements: TrueFalseStatement[] = [
        {
          id: "a",
          text: `Hàm số đã cho có đạo hàm $f'(x) = ${a === 1 ? "" : "-"}x^2 ${2 * bCoeff >= 0 ? "+ " + 2 * bCoeff : "- " + Math.abs(2 * bCoeff)}x ${cCoeff >= 0 ? "+ " + cCoeff : "- " + Math.abs(cCoeff)}$.`,
          isCorrect: true,
          explanation: `Đạo hàm đúng theo quy tắc lũy thừa: $(x^n)' = n x^{n-1}$.`,
        },
        {
          id: "b",
          text: `Hàm số đồng biến trên toàn bộ tập số thực $\\mathbb{R}$.`,
          isCorrect: false,
          explanation: `Hàm số bậc ba có đạo hàm đổi dấu nên không thể luôn đồng biến trên $\\mathbb{R}$.`,
        },
        {
          id: "c",
          text: `Đồ thị hàm số có hai điểm cực trị nằm về hai phía trục tung.`,
          isCorrect: x1 * x2 < 0,
          explanation: `Tích hoành độ hai điểm cực trị $x_1 x_2 = ${x1 * x2} ${x1 * x2 < 0 ? "< 0$ nên nằm về 2 phía trục tung." : "\\ge 0$ nên không nằm về 2 phía trục tung."}`,
        },
        {
          id: "d",
          text: `Đồ thị hàm số không có đường tiệm cận đứng và tiệm cận ngang.`,
          isCorrect: true,
          explanation: `Hàm đa thức bậc ba xác định trên $\\mathbb{R}$ và liên tục nên không có tiệm cận.`,
        },
      ];

      return {
        id: `math_calc_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "true_false_group",
        prompt: promptLatex,
        subText: "Toán 12 • Phần II: Đúng/Sai",
        difficulty: diff,
        correctAnswer: { a: true, b: false, c: x1 * x2 < 0, d: true },
        trueFalseStatements: statements,
        hints: [
          "Tính đạo hàm $f'(x)$ và giải phương trình $f'(x) = 0$ để tìm điểm cực trị.",
          "Hàm đa thức xác định trên $\\mathbb{R}$ nên không có tiệm cận.",
        ],
        misconceptions: [
          "Nhầm lẫn giữa hàm đa thức bậc 3 với hàm phân thức (hàm đa thức không có đường tiệm cận).",
          "Nhầm giữa điểm cực trị của hàm số ($x$) và giá trị cực trị ($y$).",
        ],
        explanation: `Lời giải tổng hợp:\n- Mệnh đề a: Đúng, đạo hàm chuẩn.\n- Mệnh đề b: Sai, hàm số đổi chiều biến thiên.\n- Mệnh đề c: ${x1 * x2 < 0 ? "Đúng" : "Sai"} do $x_1 x_2 = ${x1 * x2}$.\n- Mệnh đề d: Đúng, hàm đa thức không có tiệm cận.`,
      };
    }

    // 2. FORMAT PART III: Numeric Short Answer (find max/min or number of extrema)
    if (diff >= 2 && formatRoll >= 0.35 && formatRoll < 0.6) {
      // Find min/max of y = x + 4/x on [1; 4] => min at x = 2 is 4
      const k = [4, 9, 16][Math.floor(Math.random() * 3)];
      const rootK = Math.round(Math.sqrt(k));
      const minVal = 2 * rootK;

      return {
        id: `math_calc_num_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "numeric",
        prompt: `Giá trị nhỏ nhất của hàm số $y = x + \\frac{${k}}{x}$ trên đoạn $[1; ${rootK + 2}]$ bằng bao nhiêu?`,
        subText: "Toán 12 • Phần III: Trả lời ngắn",
        difficulty: diff,
        correctAnswer: minVal,
        tolerance: 0.05,
        hints: [
          `Tính đạo hàm $y' = 1 - \\frac{${k}}{x^2}$.`,
          `Giải $y' = 0$ trên khoảng $(1; ${rootK + 2})$ để tìm điểm cực trị $x = \\sqrt{${k}} = ${rootK}$.`,
          "So sánh giá trị tại hai đầu mút và tại điểm cực trị.",
        ],
        misconceptions: [
          "Quên không kiểm tra giá trị tại 2 đầu mút của đoạn.",
          "Áp dụng bất đẳng thức Cauchy nhưng quên đối chiếu xem dấu bằng có xảy ra trong đoạn xét hay không.",
        ],
        explanation: `Đạo hàm $y' = 1 - \\frac{${k}}{x^2} = \\frac{x^2 - ${k}}{x^2}$.\nVới $x \\in [1; ${rootK + 2}]$, $y' = 0 \\Leftrightarrow x = ${rootK}$.\nTa có: $y(1) = 1 + ${k} = ${k + 1}$; $y(${rootK}) = ${rootK} + \\frac{${k}}{${rootK}} = ${minVal}$; $y(${rootK + 2}) = ${rootK + 2} + \\frac{${k}}{${rootK + 2}}$.\nVậy giá trị nhỏ nhất là $\\min_{[1; ${rootK + 2}]} y = ${minVal}$.`,
      };
    }

    // 3. FORMAT PART I: Multiple Choice Single Answer (4 choices)
    // Asymptote or Monotonicity
    const subType = Math.floor(Math.random() * 3);
    if (subType === 0) {
      // Asymptote of (ax + b)/(cx + d)
      const a = Math.floor(Math.random() * 4) + 1;
      const b = Math.floor(Math.random() * 5) + 1;
      const d = Math.floor(Math.random() * 4) + 1;
      const tcDung = d; // x = -d or x = d
      const tcNgang = a;

      const correctOpt = `x = ${tcDung}`;
      const opt1 = `x = -${tcDung}`;
      const opt2 = `y = ${tcNgang}`;
      const opt3 = `y = -${tcNgang}`;

      return {
        id: `math_calc_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "choice",
        prompt: `Tiệm cận đứng của đồ thị hàm số $y = \\frac{${a}x + ${b}}{x - ${d}}$ là đường thẳng:`,
        subText: "Toán 12 • Phần I: Trắc nghiệm 4 lựa chọn",
        difficulty: 1,
        options: [
          { id: "A", text: correctOpt, latex: correctOpt },
          { id: "B", text: opt1, latex: opt1 },
          { id: "C", text: opt2, latex: opt2 },
          { id: "D", text: opt3, latex: opt3 },
        ],
        correctAnswer: "A",
        hints: [
          "Tiệm cận đứng của hàm phân thức bậc 1 trên bậc 1 là nghiệm của mẫu số.",
          "Nghiệm của mẫu $x - d = 0 \\Rightarrow x = d$.",
        ],
        misconceptions: [
          "Nhầm lẫn giữa tiệm cận đứng ($x = x_0$) và tiệm cận ngang ($y = y_0$).",
          "Nhầm dấu nghiệm của mẫu số.",
        ],
        explanation: `Tập xác định: $D = \\mathbb{R} \\setminus \\{${d}\\}$.\nTa có $\\lim_{x \\to ${d}^+} \\frac{${a}x + ${b}}{x - ${d}} = +\\infty$ nên đường thẳng $x = ${d}$ là tiệm cận đứng của đồ thị hàm số.`,
      };
    } else if (subType === 1) {
      // Extrema of y = x^3 - 3x + 2
      return {
        id: `math_calc_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "choice",
        prompt: `Điểm cực đại của hàm số $y = x^3 - 3x^2 + 2$ là:`,
        subText: "Toán 12 • Phần I: Trắc nghiệm 4 lựa chọn",
        difficulty: 2,
        options: [
          { id: "A", text: "x = 0", latex: "x = 0" },
          { id: "B", text: "x = 2", latex: "x = 2" },
          { id: "C", text: "x = -2", latex: "x = -2" },
          { id: "D", text: "y = 2", latex: "y = 2" },
        ],
        correctAnswer: "A",
        hints: [
          "Tính đạo hàm $y' = 3x^2 - 6x = 3x(x - 2)$.",
          "Lập bảng biến thiên: $y'$ đổi dấu từ dương sang âm qua điểm cực đại.",
        ],
        misconceptions: [
          "Chọn nhầm giá trị cực đại $y = 2$ thay vì điểm cực đại của hàm số $x = 0$.",
          "Nhầm điểm cực tiểu $x = 2$ với điểm cực đại.",
        ],
        explanation: `Đạo hàm $y' = 3x^2 - 6x = 3x(x - 2)$.\n$y' = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$.\nQua $x = 0$, $y'$ đổi dấu từ dương sang âm nên $x = 0$ là điểm cực đại của hàm số.`,
      };
    } else {
      // Interval of increase for y = -x^3 + 3x
      return {
        id: `math_calc_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "choice",
        prompt: `Hàm số $y = -x^3 + 3x + 1$ đồng biến trên khoảng nào dưới đây?`,
        subText: "Toán 12 • Phần I: Trắc nghiệm 4 lựa chọn",
        difficulty: 1,
        options: [
          { id: "A", text: "(-1; 1)", latex: "(-1; 1)" },
          { id: "B", text: "(-\\infty; -1)", latex: "(-\\infty; -1)" },
          { id: "C", text: "(1; +\\infty)", latex: "(1; +\\infty)" },
          { id: "D", text: "(-1; +\\infty)", latex: "(-1; +\\infty)" },
        ],
        correctAnswer: "A",
        hints: [
          "Tính $y' = -3x^2 + 3$.",
          "Hàm số đồng biến khi $y' > 0 \\Leftrightarrow -3x^2 + 3 > 0$.",
        ],
        misconceptions: [
          "Quên dấu âm của hệ số $a = -3$ dẫn đến xét dấu tam thức bậc hai sai (trong trái ngoài cùng).",
        ],
        explanation: `Đạo hàm $y' = -3x^2 + 3 = -3(x^2 - 1)$.\n$y' > 0 \\Leftrightarrow x^2 - 1 < 0 \\Leftrightarrow -1 < x < 1$.\nVậy hàm số đồng biến trên khoảng $(-1; 1)$.`,
      };
    }
  },

  validateAnswer(question: PracticeQuestion, userAnswer: any) {
    if (question.type === "true_false_group") {
      const stmts = question.trueFalseStatements || [];
      if (!userAnswer || typeof userAnswer !== "object") return false;
      const allMatch = stmts.every((s) => userAnswer[s.id] === s.isCorrect);
      return allMatch;
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
