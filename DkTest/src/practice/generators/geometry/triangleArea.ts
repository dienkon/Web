import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const triangleAreaMode: PracticeMode = {
  id: "triangle-area",
  title: "Diện tích Tam giác & Hình thang",
  description: "Luyện tính diện tích hình tam giác (S = a × h : 2) và hình thang (S = (a + b) × h : 2).",
  shortTag: "Tam giác & Hình thang",
  category: "geometry",
  gradeRange: [5, 7],
  icon: "Triangle",
  badgeColor: "teal",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Diện tích tam giác", description: "Tính S tam giác biết đáy và chiều cao", examples: "Đáy 8 cm, chiều cao 5 cm: S = 20 cm²" },
    { id: 2, name: "Mức 2: Diện tích hình thang", description: "Tính S hình thang biết 2 đáy và chiều cao", examples: "Đáy lớn 12 cm, đáy bé 8 cm, cao 6 cm: S = 60 cm²" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (diff === 1) {
      const base = randomInt(4, 20) * 2; // make base even for clean int answer
      const height = randomInt(3, 15);
      correctAnswer = (base * height) / 2;
      prompt = `Tính diện tích hình tam giác có độ dài đáy là ${base} cm và chiều cao tương ứng là ${height} cm.`;
      latex = `\\text{Tính diện tích tam giác: đáy } a = ${base}\\text{ cm, cao } h = ${height}\\text{ cm}`;
      explanation = `Công thức tính diện tích hình tam giác:\n$S = \\frac{a \\times h}{2} = \\frac{${base} \\times ${height}}{2} = ${correctAnswer}\\text{ cm}^2$.`;
    } else {
      const a = randomInt(8, 22);
      const b = randomInt(4, a - 2);
      const h = randomInt(3, 12) * 2; // make height even
      correctAnswer = ((a + b) * h) / 2;
      prompt = `Tính diện tích hình thang có độ dài hai đáy lần lượt là ${a} cm, ${b} cm và chiều cao là ${h} cm.`;
      latex = `\\text{Tính diện tích hình thang: } a = ${a}\\text{ cm, } b = ${b}\\text{ cm, } h = ${h}\\text{ cm}`;
      explanation = `Công thức tính diện tích hình thang:\n$S = \\frac{(a + b) \\times h}{2} = \\frac{(${a} + ${b}) \\times ${h}}{2} = \\frac{${a + b} \\times ${h}}{2} = ${correctAnswer}\\text{ cm}^2$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, 10);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `geom_tri_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Nhập giá trị diện tích (cm²)",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
