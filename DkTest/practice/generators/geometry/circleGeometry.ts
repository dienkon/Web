import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, shuffle } from "../utils";

export const circleGeometryMode: PracticeMode = {
  id: "circle-geometry",
  title: "Chu vi & Diện tích Hình tròn",
  description: "Luyện tính chu vi (C = d × 3.14) và diện tích (S = r × r × 3.14) hình tròn.",
  shortTag: "Hình tròn",
  category: "geometry",
  gradeRange: [5, 7],
  icon: "Circle",
  badgeColor: "purple",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Chu vi hình tròn", description: "Tính chu vi biết bán kính hoặc đường kính", examples: "Bán kính r = 5 cm -> C = 31.4 cm" },
    { id: 2, name: "Mức 2: Diện tích hình tròn", description: "Tính diện tích hình tròn biết bán kính", examples: "Bán kính r = 4 cm -> S = 50.24 cm²" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const r = randomInt(2, 10);

    if (diff === 1) {
      const circ = Math.round(2 * r * 3.14 * 100) / 100;
      const prompt = `Tính chu vi hình tròn có bán kính r = ${r} cm (lấy số π ≈ 3.14)`;
      const latex = `\\text{Tính chu vi hình tròn có bán kính } r = ${r}\\text{ cm (}\\pi = 3.14\\text{)}`;
      const explanation = `Công thức tính chu vi hình tròn:\n$C = 2 \\times r \\times 3.14 = 2 \\times ${r} \\times 3.14 = ${circ}\\text{ cm}$.`;

      const dist1 = Math.round(r * 3.14 * 100) / 100;
      const dist2 = Math.round(r * r * 3.14 * 100) / 100;
      const dist3 = Math.round((circ + 3.14) * 100) / 100;

      const options = shuffle([circ, dist1, dist2, dist3]).map((v) => ({ id: String(v), text: `${v} cm`, latex: `${v}\\text{ cm}` }));

      return {
        id: `circle_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "numeric",
        prompt,
        latex,
        subText: "Nhập kết quả chu vi",
        correctAnswer: circ,
        options,
        explanation,
        difficulty: diff,
      };
    } else {
      const area = Math.round(r * r * 3.14 * 100) / 100;
      const prompt = `Tính diện tích hình tròn có bán kính r = ${r} cm (lấy số π ≈ 3.14)`;
      const latex = `\\text{Tính diện tích hình tròn có bán kính } r = ${r}\\text{ cm (}\\pi = 3.14\\text{)}`;
      const explanation = `Công thức tính diện tích hình tròn:\n$S = r \\times r \\times 3.14 = ${r} \\times ${r} \\times 3.14 = ${area}\\text{ cm}^2$.`;

      const dist1 = Math.round(2 * r * 3.14 * 100) / 100;
      const dist2 = Math.round(r * 3.14 * 100) / 100;
      const dist3 = Math.round((area + 6.28) * 100) / 100;

      const options = shuffle([area, dist1, dist2, dist3]).map((v) => ({ id: String(v), text: `${v} cm²`, latex: `${v}\\text{ cm}^2` }));

      return {
        id: `circle_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "numeric",
        prompt,
        latex,
        subText: "Nhập kết quả diện tích",
        correctAnswer: area,
        options,
        explanation,
        difficulty: diff,
      };
    }
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
