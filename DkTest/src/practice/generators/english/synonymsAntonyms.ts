import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";

const SYN_ANT_QUESTIONS = [
  {
    type: "synonym",
    prompt: "Chọn từ ĐỒNG NGHĨA (CLOSEST IN MEANING) với từ in đậm:\n\n\"The company introduced a **vital** strategy to boost sales.\"",
    options: ["crucial", "unimportant", "optional", "minor"],
    correct: "A",
    explanation: "'vital' có nghĩa là rất quan trọng, sống còn -> Đồng nghĩa với 'crucial'.",
  },
  {
    type: "antonym",
    prompt: "Chọn từ TRÁI NGHĨA (OPPOSITE IN MEANING) với từ in đậm:\n\n\"His **generous** contribution helped many poor children in the area.\"",
    options: ["mean", "kind", "helpful", "hospitable"],
    correct: "A",
    explanation: "'generous' nghĩa là rộng lượng, hào phóng -> Trái nghĩa với 'mean' (keo kiệt, hà tiện).",
  },
  {
    type: "synonym",
    prompt: "Chọn từ ĐỒNG NGHĨA (CLOSEST IN MEANING) với từ in đậm:\n\n\"The heavy rain forced them to **postpone** the football match until Sunday.\"",
    options: ["put off", "cancel", "continue", "organize"],
    correct: "A",
    explanation: "'postpone' nghĩa là hoãn lại -> Đồng nghĩa với 'put off'.",
  },
  {
    type: "antonym",
    prompt: "Chọn từ TRÁI NGHĨA (OPPOSITE IN MEANING) với từ in đậm:\n\n\"She felt **confident** before walking onto the stage for her speech.\"",
    options: ["timid", "brave", "certain", "bold"],
    correct: "A",
    explanation: "'confident' nghĩa là tự tin -> Trái nghĩa với 'timid' (nhút nhát, rụt rè).",
  },
];

export const englishSynonymsAntonymsMode: PracticeMode = {
  id: "english-synonyms-antonyms",
  title: "Từ Đồng nghĩa & Trái nghĩa (Synonyms & Antonyms)",
  description: "Mở rộng vốn từ vựng học thuật, nhận biết từ gần nghĩa và đối nghĩa.",
  shortTag: "Tiếng Anh",
  category: "english",
  gradeRange: [3, 12],
  icon: "Sparkles",
  badgeColor: "rose",
  gameRule: "standard",
  defaultLength: 10,
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Từ vựng thông dụng trong giao tiếp & chương trình THCS." },
    { id: 2, name: "Nâng cao", description: "Từ vựng học thuật IELTS/TOEFL & đề thi THPT Quốc Gia." },
  ],
  generateQuestion: (context: PracticeContext): PracticeQuestion => {
    const q = SYN_ANT_QUESTIONS[Math.floor(Math.random() * SYN_ANT_QUESTIONS.length)];
    return {
      id: `synant_${Date.now()}_${Math.random()}`,
      type: "choice",
      prompt: `${q.prompt}`,
      options: q.options.map((opt, idx) => ({ id: String.fromCharCode(65 + idx), text: opt })),
      correctAnswer: q.correct,
      explanation: q.explanation,
      difficulty: context.difficulty,
    };
  },
  validateAnswer: (question, userAnswer) => {
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },
  calculateScore: (question, userAnswer, session) => {
    return session.isCorrect ? 10 + session.combo * 2 : 0;
  },
};
