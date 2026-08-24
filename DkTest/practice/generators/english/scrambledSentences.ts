import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";

const SCRAMBLED_QUESTIONS = [
  {
    original: "Learning English opens up many career opportunities.",
    scrambledOptions: [
      "Learning English opens up many career opportunities.",
      "English opens learning up career many opportunities.",
      "Many career opportunities opens up learning English.",
      "Learning opens up English many career opportunities."
    ],
    correct: "A",
    explanation: "Cấu trúc đúng: V-ing (Learning English) làm chủ ngữ + Động từ (opens up) + Tân ngữ (many career opportunities).",
  },
  {
    original: "The harder you study, the better results you will get.",
    scrambledOptions: [
      "The harder you study, the better results you will get.",
      "The better you study, the harder results you will get.",
      "You study harder, you will get better results.",
      "Harder you study, better results you will get."
    ],
    correct: "A",
    explanation: "Cấu trúc so sánh kép: 'The + so sánh hơn + S + V, the + so sánh hơn + S + V'.",
  },
  {
    original: "She advised me to prepare carefully for the job interview.",
    scrambledOptions: [
      "She advised me to prepare carefully for the job interview.",
      "She advised to me prepare carefully for the job interview.",
      "She advised me prepare carefully for the job interview.",
      "Carefully she advised me to prepare for job interview."
    ],
    correct: "A",
    explanation: "Cấu trúc động từ 'advise someone to do something' (Khuyên ai làm gì).",
  },
];

export const englishScrambledSentencesMode: PracticeMode = {
  id: "english-scrambled-sentences",
  title: "Sắp xếp Từ thành Câu Hoàn chỉnh",
  description: "Rèn luyện tư duy cấu trúc câu, ngữ pháp chuẩn và vị trí từ trong Tiếng Anh.",
  shortTag: "Tiếng Anh",
  category: "english",
  gradeRange: [3, 12],
  icon: "Layers",
  badgeColor: "emerald",
  gameRule: "standard",
  defaultLength: 10,
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Câu đơn S-V-O và câu hỏi thông dụng." },
    { id: 2, name: "Nâng cao", description: "Câu ghép, câu phức và cấu trúc so sánh kép." },
  ],
  generateQuestion: (context: PracticeContext): PracticeQuestion => {
    const q = SCRAMBLED_QUESTIONS[Math.floor(Math.random() * SCRAMBLED_QUESTIONS.length)];
    return {
      id: `scram_${Date.now()}_${Math.random()}`,
      type: "choice",
      prompt: `Chọn câu được sắp xếp đúng ngữ pháp và hoàn chỉnh nghĩa nhất:`,
      options: q.scrambledOptions.map((opt, idx) => ({ id: String.fromCharCode(65 + idx), text: opt })),
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
