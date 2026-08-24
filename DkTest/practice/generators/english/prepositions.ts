import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";

const PREPOSITION_QUESTIONS = [
  {
    prompt: "She is very interested _______ learning foreign languages.",
    options: ["in", "on", "at", "for"],
    correct: "A",
    explanation: "Cấu trúc 'to be interested in + N/V-ing': thích thú, quan tâm đến cái gì.",
  },
  {
    prompt: "The meeting is scheduled to begin _______ 9:00 AM on Monday.",
    options: ["at", "in", "on", "by"],
    correct: "A",
    explanation: "Giới từ 'at' dùng trước giờ cụ thể (at 9:00 AM).",
  },
  {
    prompt: "He succeeded _______ passing the university entrance exam with flying colors.",
    options: ["in", "on", "with", "about"],
    correct: "A",
    explanation: "Cấu trúc 'succeed in + V-ing': thành công trong việc gì.",
  },
  {
    prompt: "I am looking forward _______ hearing from you soon.",
    options: ["to", "at", "for", "with"],
    correct: "A",
    explanation: "Cấu trúc 'look forward to + V-ing': mong đợi điều gì.",
  },
  {
    prompt: "My father depends _______ public transportation to go to work.",
    options: ["on", "in", "to", "at"],
    correct: "A",
    explanation: "Động từ 'depend on': phụ thuộc vào.",
  },
  {
    prompt: "They arrived _______ the airport just in time for their flight.",
    options: ["at", "in", "to", "on"],
    correct: "A",
    explanation: "Dùng 'arrive at' cho địa điểm cụ thể (sân bay, nhà ga). 'Arrive in' dùng cho thành phố/quốc gia.",
  },
];

export const englishPrepositionsMode: PracticeMode = {
  id: "english-prepositions",
  title: "Thành thạo Giới từ Tiếng Anh",
  description: "Luyện tập giới từ chỉ thời gian, nơi chốn và đi kèm động/tính từ.",
  shortTag: "Tiếng Anh",
  category: "english",
  gradeRange: [3, 12],
  icon: "Sliders",
  badgeColor: "amber",
  gameRule: "standard",
  defaultLength: 10,
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Giới từ chỉ thời gian (In, On, At) và vị trí." },
    { id: 2, name: "Nâng cao", description: "Giới từ đi kèm Cụm tính từ và Động từ cố định." },
  ],
  generateQuestion: (context: PracticeContext): PracticeQuestion => {
    const q = PREPOSITION_QUESTIONS[Math.floor(Math.random() * PREPOSITION_QUESTIONS.length)];
    return {
      id: `prep_${Date.now()}_${Math.random()}`,
      type: "choice",
      prompt: `Điền giới từ thích hợp vào chỗ trống:\n\n**"${q.prompt}"**`,
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
