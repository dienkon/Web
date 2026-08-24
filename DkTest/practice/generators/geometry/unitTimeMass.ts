import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, randomChoice, generateNumericDistractors, shuffle } from "../utils";

export const unitTimeMassMode: PracticeMode = {
  id: "unit-time-mass",
  title: "Đổi đơn vị khối lượng & thời gian",
  description: "Luyện đổi giữa tấn, tạ, yến, kg, g và thế kỉ, năm, ngày, giờ, phút, giây.",
  shortTag: "Khối lượng & Thời gian",
  category: "geometry",
  gradeRange: [4, 6],
  icon: "Clock",
  badgeColor: "orange",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Khối lượng (tấn, tạ, kg, g)", description: "Đổi đơn vị khối lượng", examples: "3 tấn = 3000 kg, 4 kg 50 g = 4050 g" },
    { id: 2, name: "Mức 2: Thời gian (giờ, phút, giây)", description: "Đổi đơn vị thời gian", examples: "2 giờ 15 phút = 135 phút" },
    { id: 3, name: "Mức 3: Thế kỉ & Năm", description: "Xác định năm thuộc thế kỉ nào", examples: "Năm 1975 thuộc thế kỉ XX" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let prompt = "";
    let latex = "";
    let correctAnswer: number | string = 0;
    let explanation = "";
    let options: Array<{ id: string; text: string; latex?: string }> = [];

    if (diff === 1) {
      const isMixed = Math.random() > 0.5;
      if (isMixed) {
        const kg = randomInt(2, 8);
        const g = randomInt(20, 800);
        correctAnswer = kg * 1000 + g;
        prompt = `${kg} kg ${g} g = ? g`;
        latex = `${kg}\\text{ kg } ${g}\\text{ g} = \\mathbf{?}\\text{ g}`;
        explanation = `Đổi $${kg}\\text{ kg} = ${kg * 1000}\\text{ g}$.\nVậy $${kg}\\text{ kg } ${g}\\text{ g} = ${kg * 1000} + ${g} = ${correctAnswer}\\text{ g}$.`;
      } else {
        const tan = randomInt(2, 15);
        correctAnswer = tan * 1000;
        prompt = `${tan} tấn = ? kg`;
        latex = `${tan}\\text{ tấn} = \\mathbf{?}\\text{ kg}`;
        explanation = `Vì $1\\text{ tấn} = 1000\\text{ kg}$ nên $${tan}\\text{ tấn} = ${tan} \\times 1000 = ${correctAnswer}\\text{ kg}$.`;
      }
      const dists = generateNumericDistractors(Number(correctAnswer), 3, 100);
      options = shuffle([Number(correctAnswer), ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));
    } else if (diff === 2) {
      const hours = randomInt(1, 5);
      const mins = randomInt(5, 55);
      correctAnswer = hours * 60 + mins;
      prompt = `${hours} giờ ${mins} phút = ? phút`;
      latex = `${hours}\\text{ giờ } ${mins}\\text{ phút} = \\mathbf{?}\\text{ phút}`;
      explanation = `Vì $1\\text{ giờ} = 60\\text{ phút}$ nên $${hours}\\text{ giờ } ${mins}\\text{ phút} = ${hours} \\times 60 + ${mins} = ${correctAnswer}\\text{ phút}$.`;
      const dists = generateNumericDistractors(Number(correctAnswer), 3, 15);
      options = shuffle([Number(correctAnswer), ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));
    } else {
      const year = randomInt(1700, 2024);
      const century = Math.ceil(year / 100);
      const romanCenturies: Record<number, string> = {
        17: "XVII",
        18: "XVIII",
        19: "XIX",
        20: "XX",
        21: "XXI",
      };
      const correctRoman = romanCenturies[century] || `thế kỉ ${century}`;
      correctAnswer = correctRoman;
      prompt = `Năm ${year} thuộc thế kỉ nào?`;
      latex = `\\text{Năm } ${year} \\text{ thuộc thế kỉ nào?}`;
      explanation = `Vì năm $${year}$ nằm trong khoảng từ năm ${(century - 1) * 100 + 1} đến năm ${century * 100} nên thuộc thế kỉ ${correctRoman} (thế kỉ ${century}).`;

      const allCenturies = ["XVII", "XVIII", "XIX", "XX", "XXI"];
      options = allCenturies.map((c) => ({ id: c, text: `Thế kỉ ${c}`, latex: `\\text{Thế kỉ } ${c}` }));
    }

    return {
      id: `unit_tm_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: typeof correctAnswer === "number" ? "numeric" : "choice",
      prompt,
      latex,
      subText: "Điền số hoặc chọn thế kỉ tương ứng",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
