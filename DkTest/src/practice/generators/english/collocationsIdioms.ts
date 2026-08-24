import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";

const COLLOCATIONS_QUESTIONS = [
  {
    prompt: "You need to _______ a decision before the end of the week.",
    options: ["make", "do", "take", "create"],
    correct: "A",
    explanation: "Collocation chuẩn: 'make a decision' (đưa ra quyết định). Không dùng 'do a decision'.",
  },
  {
    prompt: "Passing the final exam was a piece of _______ for him because he worked hard.",
    options: ["cake", "bread", "pie", "candy"],
    correct: "A",
    explanation: "Idiom: 'a piece of cake' có nghĩa là việc rất dễ dàng.",
  },
  {
    prompt: "Please _______ attention to what the speaker is saying.",
    options: ["pay", "give", "take", "draw"],
    correct: "A",
    explanation: "Collocation chuẩn: 'pay attention to something' (chú ý đến cái gì).",
  },
  {
    prompt: "It's raining cats and _______ outside, so don't forget your umbrella!",
    options: ["dogs", "birds", "frogs", "ducks"],
    correct: "A",
    explanation: "Idiom: 'rain cats and dogs' nghĩa là mưa như trút nước.",
  },
  {
    prompt: "We should _______ advantage of this great opportunity to improve our skills.",
    options: ["take", "make", "get", "have"],
    correct: "A",
    explanation: "Collocation: 'take advantage of something' (tận dụng cơ hội/lợi thế).",
  },
];

export const englishCollocationsIdiomsMode: PracticeMode = {
  id: "english-collocations-idioms",
  title: "Cụm từ Cố định & Thành ngữ (Collocations & Idioms)",
  description: "Luyện tập các cụm từ đi liền nhau tự nhiên và idioms phổ biến trong đề thi.",
  shortTag: "Tiếng Anh",
  category: "english",
  gradeRange: [3, 12],
  icon: "Sparkles",
  badgeColor: "pink",
  gameRule: "standard",
  defaultLength: 10,
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Collocations với Make, Do, Take, Pay, Have." },
    { id: 2, name: "Nâng cao", description: "Thành ngữ Tiếng Anh (Idioms) trong giao tiếp & đề thi." },
  ],
  generateQuestion: (context: PracticeContext): PracticeQuestion => {
    const q = COLLOCATIONS_QUESTIONS[Math.floor(Math.random() * COLLOCATIONS_QUESTIONS.length)];
    return {
      id: `coll_${Date.now()}_${Math.random()}`,
      type: "choice",
      prompt: `Chọn từ hoàn thiện cụm từ / thành ngữ chuẩn xác:\n\n**"${q.prompt}"**`,
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
