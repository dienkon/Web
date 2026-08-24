import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomInt, generateNumericDistractors, shuffle } from "../utils";

export const wordMotionSpeedMode: PracticeMode = {
  id: "word-motion-speed",
  title: "Toán Chuyển động đều",
  description: "Bài toán quãng đường, vận tốc, thời gian (s = v × t) và toán hai xe đi ngược chiều, cùng chiều.",
  shortTag: "Toán Chuyển động",
  category: "word_problems",
  gradeRange: [5, 8],
  icon: "Compass",
  badgeColor: "cyan",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Tính s, v, t cơ bản", description: "Công thức cơ bản s = v × t, v = s : t, t = s : v", examples: "Xe máy đi với vận tốc 40 km/h trong 2.5 giờ -> Quãng đường = 100 km" },
    { id: 2, name: "Mức 2: Hai xe chuyển động ngược chiều", description: "Thời gian gặp nhau: t = s : (v1 + v2)", examples: "Quãng đường 180 km, xe 1 đi 40 km/h, xe 2 đi 50 km/h -> Gặp nhau sau 2 giờ" },
    { id: 3, name: "Mức 3: Hai xe chuyển động cùng chiều", description: "Thời gian đuổi kịp: t = s : (v1 - v2)", examples: "Cách nhau 60 km, v1 = 50 km/h, v2 = 30 km/h -> Đuổi kịp sau 3 giờ" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    let prompt = "";
    let latex = "";
    let correctAnswer = 0;
    let explanation = "";

    if (diff === 1) {
      const v = randomInt(30, 60);
      const t = randomInt(2, 5);
      correctAnswer = v * t;
      prompt = `Một ô tô đi với vận tốc ${v} km/h trong ${t} giờ. Hỏi ô tô đó đã đi được quãng đường bao nhiêu ki-lô-mét?`;
      latex = `v = ${v}\\text{ km/h}, t = ${t}\\text{ giờ}. \\text{ Tính quãng đường } s`;
      explanation = `Công thức tính quãng đường: $s = v \\times t = ${v} \\times ${t} = ${correctAnswer}\\text{ km}$.`;
    } else if (diff === 2) {
      const v1 = randomInt(35, 55);
      const v2 = randomInt(30, 50);
      const t = randomInt(2, 4);
      const totalS = (v1 + v2) * t;
      correctAnswer = t;
      prompt = `Hai thành phố A và B cách nhau ${totalS} km. Cùng một lúc, một ô tô đi từ A đến B với vận tốc ${v1} km/h và một xe máy đi từ B về A với vận tốc ${v2} km/h. Hỏi sau bao lâu hai xe gặp nhau?`;
      latex = `s = ${totalS}\\text{ km}, v_1 = ${v1}\\text{ km/h}, v_2 = ${v2}\\text{ km/h}. \\text{ Tính thời gian gặp nhau } t`;
      explanation = `- Tổng vận tốc 2 xe: $${v1} + ${v2} = ${v1 + v2}\\text{ km/h}$\n- Thời gian để 2 xe gặp nhau: $${totalS} : ${v1 + v2} = ${correctAnswer}\\text{ giờ}$.`;
    } else {
      const v2 = randomInt(20, 35); // xe đi trước
      const v1 = v2 + randomInt(15, 30); // xe đuổi theo
      const t = randomInt(2, 4);
      const s = (v1 - v2) * t;
      correctAnswer = t;
      prompt = `Một xe máy và một ô tô cùng xuất phát từ A đến B. Xe máy đi trước với vận tốc ${v2} km/h. Sau một thời gian, ô tô đuổi theo với vận tốc ${v1} km/h khi khoảng cách giữa hai xe là ${s} km. Hỏi sau bao lâu ô tô đuổi kịp xe máy?`;
      latex = `s = ${s}\\text{ km}, v_{\\text{ô tô}} = ${v1}\\text{ km/h}, v_{\\text{xe máy}} = ${v2}\\text{ km/h}. \\text{ Tính thời gian đuổi kịp } t`;
      explanation = `- Hiệu vận tốc giữa 2 xe: $${v1} - ${v2} = ${v1 - v2}\\text{ km/h}$\n- Thời gian để ô tô đuổi kịp: $${s} : ${v1 - v2} = ${correctAnswer}\\text{ giờ}$.`;
    }

    const dists = generateNumericDistractors(correctAnswer, 3, diff === 1 ? 15 : 2);
    const options = shuffle([correctAnswer, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

    return {
      id: `wmot_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "numeric",
      prompt,
      latex,
      subText: "Nhập giá trị kết quả",
      correctAnswer,
      options,
      explanation,
      difficulty: diff,
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
