import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const findXExpressionMode: PracticeMode = {
  id: "find-x-expression",
  title: "Tìm x trong biểu thức",
  description: "Luyện giải bài toán tìm x nhiều bước dạng ax + b = c, a(x - b) = c hoặc (x + a) : b = c.",
  shortTag: "Tìm x nâng cao",
  category: "equations",
  gradeRange: [5, 8],
  icon: "DivideCircle",
  badgeColor: "emerald",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: ax + b = c", description: "Phương trình bậc nhất đơn giản", examples: "3x + 5 = 20, 4x - 8 = 24" },
    { id: 2, name: "Mức 2: a(x + b) = c", description: "Phương trình chứa dấu ngoặc", examples: "5(x - 3) = 35, 6(x + 2) = 48" },
    { id: 3, name: "Mức 3: (x - a) : b = c", description: "Phương trình kết hợp phân số / phép chia", examples: "(x - 14) : 4 = 18" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let prompt = "";
    let latex = "";
    let xVal = 0;
    let explanation = "";

    if (diff === 1) {
      const a = randomInt(2, 6);
      xVal = randomInt(3, 15);
      const b = randomInt(4, 25);
      const isPlus = Math.random() > 0.5;

      if (isPlus) {
        const c = a * xVal + b;
        prompt = `${a}x + ${b} = ${c}`;
        latex = `${a}x + ${b} = ${c}`;
        explanation = `Giải phương trình:\n- Chuyển $${b}$ sang vế phải: $${a}x = ${c} - ${b} = ${c - b}$\n- Chia cả hai vế cho $${a}$: $x = ${c - b} : ${a} = ${xVal}$.`;
      } else {
        const c = a * xVal - b;
        prompt = `${a}x - ${b} = ${c}`;
        latex = `${a}x - ${b} = ${c}`;
        explanation = `Giải phương trình:\n- Chuyển $-${b}$ sang vế phải: $${a}x = ${c} + ${b} = ${c + b}$\n- Chia cả hai vế cho $${a}$: $x = ${c + b} : ${a} = ${xVal}$.`;
      }
    } else if (diff === 2) {
      const a = randomInt(3, 8);
      xVal = randomInt(5, 20);
      const b = randomInt(2, 10);
      const isPlus = Math.random() > 0.5;

      if (isPlus) {
        const inner = xVal + b;
        const c = a * inner;
        prompt = `${a}(x + ${b}) = ${c}`;
        latex = `${a}(x + ${b}) = ${c}`;
        explanation = `Giải phương trình:\n- Chia hai vế cho $${a}$: $x + ${b} = ${c} : ${a} = ${inner}$\n- Tìm $x$: $x = ${inner} - ${b} = ${xVal}$.`;
      } else {
        const inner = xVal - b;
        const c = a * inner;
        prompt = `${a}(x - ${b}) = ${c}`;
        latex = `${a}(x - ${b}) = ${c}`;
        explanation = `Giải phương trình:\n- Chia hai vế cho $${a}$: $x - ${b} = ${c} : ${a} = ${inner}$\n- Tìm $x$: $x = ${inner} + ${b} = ${xVal}$.`;
      }
    } else {
      const b = randomInt(3, 7);
      const c = randomInt(8, 25);
      const a = randomInt(5, 30);
      const inner = b * c;
      xVal = inner + a;
      prompt = `(x - ${a}) : ${b} = ${c}`;
      latex = `(x - ${a}) : ${b} = ${c}`;
      explanation = `Giải phương trình:\n- Tìm $(x - ${a})$: $x - ${a} = ${c} \\times ${b} = ${inner}$\n- Tìm $x$: $x = ${inner} + ${a} = ${xVal}$.`;
    }

    const dists = generateNumericDistractors(xVal, 3, 4);
    const options = shuffle([xVal, ...dists]).map((v) => ({ id: String(v), text: `x = ${v}`, latex: `x = ${v}` }));

    return {
      id: `fxe_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt: `Tìm x biết: ${prompt}`,
      latex: `\\text{Tìm } x \\text{ biết: } ${latex}`,
      subText: "Nhập giá trị của x",
      correctAnswer: xVal,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
