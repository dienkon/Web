import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, generateNumericDistractors, shuffle } from "../utils";

export const unitLengthAreaMode: PracticeMode = {
  id: "unit-length-area",
  title: "Đổi đơn vị độ dài & diện tích",
  description: "Luyện đổi giữa các đơn vị đo độ dài (km, m, dm, cm, mm) và đơn vị đo diện tích (km², ha, m², dm², cm²).",
  shortTag: "Đổi độ dài & Diện tích",
  category: "geometry",
  gradeRange: [4, 6],
  icon: "Ruler",
  badgeColor: "indigo",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Đơn vị độ dài (m, dm, cm, mm)", description: "Đổi đơn vị độ dài cơ bản", examples: "5 m = 50 dm, 12 m = 1200 cm" },
    { id: 2, name: "Mức 2: Đơn vị km và hỗn hợp", description: "Đổi có km và kết hợp", examples: "3 km 250 m = 3250 m" },
    { id: 3, name: "Mức 3: Đơn vị diện tích (m², dm², ha)", description: "Đổi đơn vị diện tích và hecta", examples: "5 m² = 500 dm², 2 ha = 20000 m²" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (diff === 1) {
      const val = randomInt(2, 25);
      const conv = randomChoice([
        { from: "m", to: "dm", factor: 10 },
        { from: "m", to: "cm", factor: 100 },
        { from: "dm", to: "cm", factor: 10 },
        { from: "cm", to: "mm", factor: 10 },
        { from: "m", to: "mm", factor: 1000 },
      ]);
      correctAnswer = val * conv.factor;
      prompt = `${val} ${conv.from} = ? ${conv.to}`;
      latex = `${val}\\text{ ${conv.from}} = \\mathbf{?}\\text{ ${conv.to}}`;
      explanation = `Vì $1\\text{ ${conv.from}} = ${conv.factor}\\text{ ${conv.to}}$ nên $${val}\\text{ ${conv.from}} = ${val} \\times ${conv.factor} = ${correctAnswer}\\text{ ${conv.to}}$.`;
    } else if (diff === 2) {
      const km = randomInt(2, 9);
      const m = randomInt(15, 850);
      correctAnswer = km * 1000 + m;
      prompt = `${km} km ${m} m = ? m`;
      latex = `${km}\\text{ km } ${m}\\text{ m} = \\mathbf{?}\\text{ m}`;
      explanation = `Đổi $${km}\\text{ km} = ${km * 1000}\\text{ m}$.\nVậy $${km}\\text{ km } ${m}\\text{ m} = ${km * 1000} + ${m} = ${correctAnswer}\\text{ m}$.`;
    } else {
      const isHa = Math.random() > 0.5;
      if (isHa) {
        const ha = randomInt(2, 12);
        correctAnswer = ha * 10000;
        prompt = `${ha} ha = ? m²`;
        latex = `${ha}\\text{ ha} = \\mathbf{?}\\text{ m}^2`;
        explanation = `Vì $1\\text{ ha} = 10\\,000\\text{ m}^2$ nên $${ha}\\text{ ha} = ${ha} \\times 10\\,000 = ${correctAnswer}\\text{ m}^2$.`;
      } else {
        const val = randomInt(3, 30);
        correctAnswer = val * 100;
        prompt = `${val} m² = ? dm²`;
        latex = `${val}\\text{ m}^2 = \\mathbf{?}\\text{ dm}^2`;
        explanation = `Vì $1\\text{ m}^2 = 100\\text{ dm}^2$ nên $${val}\\text{ m}^2 = ${val} \\times 100 = ${correctAnswer}\\text{ dm}^2$.`;
      }
    }

    const dists = generateNumericDistractors(correctAnswer, 3, 10);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `unit_la_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Nhập số thích hợp điền vào dấu ?",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
