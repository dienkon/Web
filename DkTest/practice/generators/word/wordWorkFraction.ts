import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomChoice, simplifyFraction, shuffle } from "../utils";

export const wordWorkFractionMode: PracticeMode = {
  id: "word-work-fraction",
  title: "Toán Làm chung công việc",
  description: "Bài toán hai người làm chung một công việc hoặc hai vòi nước cùng chảy vào một bể.",
  shortTag: "Làm chung công việc",
  category: "word_problems",
  gradeRange: [5, 8],
  icon: "Users",
  badgeColor: "teal",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Hai vòi nước cùng chảy", description: "Thời gian để cả 2 vòi chảy đầy bể", examples: "Vòi 1 chảy 4 giờ đầy, vòi 2 chảy 6 giờ đầy -> Cùng chảy mất 2.4 giờ (12/5 giờ)" },
    { id: 2, name: "Mức 2: Hai người cùng làm việc", description: "Hai người cùng làm xong trong bao lâu", examples: "Người A làm trong 6 ngày, người B làm trong 3 ngày -> Cùng làm mất 2 ngày" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;

    // Pairs of (t1, t2) where 1/t1 + 1/t2 results in clean numbers
    const cleanPairs = [
      { t1: 3, t2: 6, ans: 2, workName: "người thợ", unit: "ngày" },
      { t1: 4, t2: 12, ans: 3, workName: "người thợ", unit: "ngày" },
      { t1: 6, t2: 12, ans: 4, workName: "người thợ", unit: "ngày" },
      { t1: 2, t2: 3, ans: 1.2, workName: "vòi nước", unit: "giờ", isFraction: true, num: 6, den: 5 },
      { t1: 4, t2: 6, ans: 2.4, workName: "vòi nước", unit: "giờ", isFraction: true, num: 12, den: 5 },
    ];

    const selected = randomChoice(diff === 1 ? cleanPairs.slice(0, 3) : cleanPairs);

    const isTap = selected.workName === "vòi nước";
    const prompt = isTap
      ? `Vòi thứ nhất chảy một mình mất ${selected.t1} giờ thì đầy bể. Vòi thứ hai chảy một mình mất ${selected.t2} giờ thì đầy bể. Nếu mở cả hai vòi cùng một lúc thì sau bao lâu bể sẽ đầy?`
      : `Người thứ nhất làm một mình xong công việc trong ${selected.t1} ngày. Người thứ hai làm một mình xong công việc trong ${selected.t2} ngày. Nếu cả hai người cùng làm thì sau bao lâu sẽ hoàn thành công việc?`;

    const latex = `t_1 = ${selected.t1}\\text{ ${selected.unit}}, t_2 = ${selected.t2}\\text{ ${selected.unit}}. \\text{ Cùng làm: } t = ?`;

    const explanation = `- Trong 1 ${selected.unit}, ${isTap ? "vòi 1" : "người 1"} làm được: $\\frac{1}{${selected.t1}}$ công việc.\n- Trong 1 ${selected.unit}, ${isTap ? "vòi 2" : "người 2"} làm được: $\\frac{1}{${selected.t2}}$ công việc.\n- Trong 1 ${selected.unit}, cả hai cùng làm được: $\\frac{1}{${selected.t1}} + \\frac{1}{${selected.t2}} = \\frac{${selected.t1 + selected.t2}}{${selected.t1 * selected.t2}} = \\frac{1}{${selected.ans}}$ công việc.\n- Thời gian để hoàn thành: $1 : \\frac{1}{${selected.ans}} = ${selected.ans}\\text{ ${selected.unit}}$.`;

    const correctAnswer = selected.ans;
    const dist1 = selected.ans + 1;
    const dist2 = Math.max(1, selected.ans - 1);
    const dist3 = Math.round(((selected.t1 + selected.t2) / 2) * 10) / 10;

    const options = shuffle([correctAnswer, dist1, dist2, dist3]).map((v) => ({ id: String(v), text: `${v} ${selected.unit}`, latex: `${v}\\text{ ${selected.unit}}` }));

    return {
      id: `wwork_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: `Nhập số ${selected.unit} cần thiết`,
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
