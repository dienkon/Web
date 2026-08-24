import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, generateNumericDistractors, shuffle } from "../utils";

export const perimeterAreaSquareRectMode: PracticeMode = {
  id: "perimeter-area-square-rect",
  title: "Chu vi & Diện tích Hình vuông, Chữ nhật",
  description: "Luyện tính chu vi và diện tích của hình vuông và hình chữ nhật khi biết cạnh hoặc chiều dài, chiều rộng.",
  shortTag: "Chu vi & Diện tích",
  category: "geometry",
  gradeRange: [3, 6],
  icon: "Square",
  badgeColor: "blue",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Hình vuông cơ bản", description: "Tính chu vi và diện tích hình vuông", examples: "Hình vuông cạnh 6 cm: Chu vi = 24 cm, Diện tích = 36 cm²" },
    { id: 2, name: "Mức 2: Hình chữ nhật cơ bản", description: "Tính chu vi và diện tích hình chữ nhật", examples: "Dài 8 cm, rộng 5 cm: C = 26 cm, S = 40 cm²" },
    { id: 3, name: "Mức 3: Bài toán ngược", description: "Biết diện tích/chu vi, tìm cạnh còn lại", examples: "Hình chữ nhật có diện tích 48 cm², dài 8 cm, tìm chiều rộng" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (diff === 1) {
      const a = randomInt(3, 15);
      const isArea = Math.random() > 0.5;
      if (isArea) {
        correctAnswer = a * a;
        prompt = `Tính diện tích hình vuông có cạnh bằng ${a} cm`;
        latex = `\\text{Tính diện tích hình vuông có cạnh } a = ${a}\\text{ cm}`;
        explanation = `Diện tích hình vuông = cạnh $\\times$ cạnh:\n$S = ${a} \\times ${a} = ${correctAnswer}\\text{ cm}^2$.`;
      } else {
        correctAnswer = a * 4;
        prompt = `Tính chu vi hình vuông có cạnh bằng ${a} cm`;
        latex = `\\text{Tính chu vi hình vuông có cạnh } a = ${a}\\text{ cm}`;
        explanation = `Chu vi hình vuông = cạnh $\\times 4$:\n$P = ${a} \\times 4 = ${correctAnswer}\\text{ cm}$.`;
      }
    } else if (diff === 2) {
      const length = randomInt(6, 20);
      const width = randomInt(3, length - 1);
      const isArea = Math.random() > 0.5;
      if (isArea) {
        correctAnswer = length * width;
        prompt = `Tính diện tích hình chữ nhật có chiều dài ${length} cm và chiều rộng ${width} cm`;
        latex = `\\text{Tính diện tích HCN có } a = ${length}\\text{ cm, } b = ${width}\\text{ cm}`;
        explanation = `Diện tích hình chữ nhật = chiều dài $\\times$ chiều rộng:\n$S = ${length} \\times ${width} = ${correctAnswer}\\text{ cm}^2$.`;
      } else {
        correctAnswer = (length + width) * 2;
        prompt = `Tính chu vi hình chữ nhật có chiều dài ${length} cm và chiều rộng ${width} cm`;
        latex = `\\text{Tính chu vi HCN có } a = ${length}\\text{ cm, } b = ${width}\\text{ cm}`;
        explanation = `Chu vi hình chữ nhật = (chiều dài + chiều rộng) $\\times 2$:\n$P = (${length} + ${width}) \\times 2 = ${correctAnswer}\\text{ cm}$.`;
      }
    } else {
      const length = randomInt(8, 25);
      const width = randomInt(4, length - 2);
      const area = length * width;
      correctAnswer = width;
      prompt = `Một hình chữ nhật có diện tích là ${area} cm² và chiều dài là ${length} cm. Chiều rộng của hình chữ nhật đó là bao nhiêu cm?`;
      latex = `S = ${area}\\text{ cm}^2, \\text{chiều dài } a = ${length}\\text{ cm}. \\text{ Tìm chiều rộng } b`;
      explanation = `Muốn tìm chiều rộng, ta lấy diện tích chia cho chiều dài:\n$b = ${area} : ${length} = ${width}\\text{ cm}$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, diff === 1 ? 4 : 12);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `geom_sq_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Nhập giá trị số (không cần nhập đơn vị đo)",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
