import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";

const REWRITE_QUESTIONS = [
  {
    original: "They have built a new hospital in this area.",
    options: [
      "A new hospital has been built in this area.",
      "A new hospital was built in this area.",
      "A new hospital is built in this area.",
      "A new hospital had been built in this area."
    ],
    correct: "A",
    explanation: "Câu gốc dùng Hiện tại hoàn thành chủ động -> Chuyển sang bị động: 'has/have been + V3/ed' (A new hospital has been built...).",
  },
  {
    original: "\"I am reading a very interesting book now,\" Nam said.",
    options: [
      "Nam said that he was reading a very interesting book then.",
      "Nam said that he is reading a very interesting book now.",
      "Nam said that I was reading a very interesting book then.",
      "Nam said that he read a very interesting book now."
    ],
    correct: "A",
    explanation: "Câu tường thuật lùi thì: 'am reading' -> 'was reading', 'now' -> 'then', 'I' -> 'he'.",
  },
  {
    original: "I don't have enough money, so I can't buy that laptop.",
    options: [
      "If I had enough money, I could buy that laptop.",
      "If I have enough money, I can buy that laptop.",
      "If I had had enough money, I could have bought that laptop.",
      "Unless I had enough money, I couldn't buy that laptop."
    ],
    correct: "A",
    explanation: "Tình huống trái ngược ở hiện tại -> Dùng câu điều kiện loại 2: 'If + S + V2/ed, S + would/could + V-bare'.",
  },
  {
    original: "She started working as a teacher five years ago.",
    options: [
      "She has been working as a teacher for five years.",
      "She worked as a teacher for five years.",
      "She worked as a teacher since five years.",
      "She has started working as a teacher for five years."
    ],
    correct: "A",
    explanation: "Cấu trúc 'started + V-ing ... ago' tương đương với 'has/have + V3/ed (hoặc been V-ing) + for ...'.",
  },
];

export const englishSentenceRewriteMode: PracticeMode = {
  id: "english-sentence-rewrite",
  title: "Viết lại Câu Tương đương",
  description: "Luyện tập chuyển đổi câu Bị động, Tường thuật, Điều kiện & So sánh.",
  shortTag: "Tiếng Anh",
  category: "english",
  gradeRange: [3, 12],
  icon: "Layers",
  badgeColor: "purple",
  gameRule: "standard",
  defaultLength: 10,
  difficultyLevels: [
    { id: 1, name: "Trung bình", description: "Câu bị động đơn giản & Tường thuật trực tiếp." },
    { id: 2, name: "Nâng cao", description: "Câu điều kiện hỗn hợp, Đảo ngữ & Cấu trúc so sánh." },
  ],
  generateQuestion: (context: PracticeContext): PracticeQuestion => {
    const q = REWRITE_QUESTIONS[Math.floor(Math.random() * REWRITE_QUESTIONS.length)];
    return {
      id: `rewrite_${Date.now()}_${Math.random()}`,
      type: "choice",
      prompt: `Chọn câu có nghĩa gần nhất với câu cho sẵn:\n\n**"${q.original}"**`,
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
