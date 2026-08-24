import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";

const TENSE_QUESTIONS = [
  {
    prompt: "Look! The sun _______ behind the mountains.",
    options: ["is setting", "sets", "set", "has set"],
    correct: "A",
    explanation: "Dấu hiệu 'Look!' cho thấy hành động đang diễn ra ngay lúc nói -> Dùng thì Hiện tại tiếp diễn (is setting).",
  },
  {
    prompt: "By the time we arrived at the cinema, the movie _______.",
    options: ["had started", "started", "has started", "was starting"],
    correct: "A",
    explanation: "Cấu trúc 'By the time + Thì Quá khứ đơn, Mệnh đề Quá khứ hoàn thành' -> chọn 'had started'.",
  },
  {
    prompt: "She _______ in Hanoi since 2018.",
    options: ["has lived", "lives", "lived", "is living"],
    correct: "A",
    explanation: "Dấu hiệu 'since 2018' chỉ hành động bắt đầu trong quá khứ kéo dài đến hiện tại -> Dùng Hiện tại hoàn thành (has lived).",
  },
  {
    prompt: "Water _______ at 100 degrees Celsius.",
    options: ["boils", "is boiling", "boiled", "will boil"],
    correct: "A",
    explanation: "Chân lý / sự thật hiển nhiên -> Dùng thì Hiện tại đơn (boils).",
  },
  {
    prompt: "At 8 p.m. yesterday, I _______ my English homework.",
    options: ["was doing", "did", "have done", "would do"],
    correct: "A",
    explanation: "Hành động đang diễn ra tại mốc thời điểm cụ thể trong quá khứ ('At 8 p.m. yesterday') -> Quá khứ tiếp diễn (was doing).",
  },
  {
    prompt: "If it _______ tomorrow, we will cancel the outdoor picnic.",
    options: ["rains", "will rain", "rained", "is raining"],
    correct: "A",
    explanation: "Câu điều kiện loại 1: Mệnh đề 'If' dùng Hiện tại đơn (rains), mệnh đề chính dùng 'will + V'.",
  },
  {
    prompt: "I haven't heard from Peter since he _______ to London.",
    options: ["moved", "has moved", "was moving", "had moved"],
    correct: "A",
    explanation: "Sau 'since' chỉ mốc thời điểm trong quá khứ -> Dùng Quá khứ đơn (moved).",
  },
];

export const englishGrammarTensesMode: PracticeMode = {
  id: "english-grammar-tenses",
  title: "Chinh phục 12 Thì Tiếng Anh",
  description: "Luyện tập nhận biết và chia động từ theo đúng ngữ cảnh thời gian.",
  shortTag: "Tiếng Anh",
  category: "english",
  gradeRange: [3, 12],
  icon: "Sparkles",
  badgeColor: "blue",
  gameRule: "standard",
  defaultLength: 10,
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Hiện tại đơn, Quá khứ đơn, Tương lai đơn." },
    { id: 2, name: "Nâng cao", description: "Hiện tại hoàn thành, Quá khứ hoàn thành, Tiếp diễn." },
  ],
  generateQuestion: (context: PracticeContext): PracticeQuestion => {
    const q = TENSE_QUESTIONS[Math.floor(Math.random() * TENSE_QUESTIONS.length)];
    return {
      id: `tense_${Date.now()}_${Math.random()}`,
      type: "choice",
      prompt: `Chọn phương án đúng để hoàn thành câu:\n\n**"${q.prompt}"**`,
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
