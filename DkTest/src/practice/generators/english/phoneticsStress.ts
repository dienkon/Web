import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";

const PHONETICS_QUESTIONS = [
  {
    type: "stress",
    prompt: "Chọn từ có vị trí trọng âm chính KHÁC với 3 từ còn lại:",
    options: ["decision", "importance", "catastrophe", "family"],
    correct: "D",
    explanation: "'family' nhấn trọng âm 1 (/ˈfæməli/), các từ còn lại nhấn trọng âm 2 (de'cision, im'portance, ca'tastrophe).",
  },
  {
    type: "ed_pronunciation",
    prompt: "Chọn từ có phần gạch chân phát âm '-ed' KHÁC với các từ còn lại:",
    options: ["wanted", "decided", "needed", "played"],
    correct: "D",
    explanation: "'played' phát âm đuôi -ed là /d/. Các từ 'wanted', 'decided', 'needed' kết thúc bằng âm /t/, /d/ nên -ed phát âm là /ɪd/.",
  },
  {
    type: "s_pronunciation",
    prompt: "Chọn từ có đuôi '-s / -es' phát âm KHÁC với các từ còn lại:",
    options: ["books", "cats", "maps", "dogs"],
    correct: "D",
    explanation: "'dogs' kết thúc bằng âm hữu thanh /g/ nên đuôi -s phát âm là /z/. 'books', 'cats', 'maps' phát âm là /s/.",
  },
  {
    type: "stress",
    prompt: "Chọn từ có vị trí trọng âm chính KHÁC với 3 từ còn lại:",
    options: ["protect", "provide", "suggest", "student"],
    correct: "D",
    explanation: "'student' nhấn trọng âm 1 ('student). Các động từ 2 âm tiết 'protect', 'provide', 'suggest' nhấn trọng âm 2.",
  },
];

export const englishPhoneticsStressMode: PracticeMode = {
  id: "english-phonetics-stress",
  title: "Phát âm & Trọng âm (Phonetics & Stress)",
  description: "Luyện quy tắc phát âm đuôi -ed, -s/es và vị trí trọng âm từ 2-3 âm tiết.",
  shortTag: "Tiếng Anh",
  category: "english",
  gradeRange: [3, 12],
  icon: "BookOpen",
  badgeColor: "cyan",
  gameRule: "standard",
  defaultLength: 10,
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Quy tắc đuôi -ed, -s/es & Trọng âm từ 2 âm tiết." },
    { id: 2, name: "Nâng cao", description: "Trọng âm từ 3-4 âm tiết và nguyên âm đôi/nguyên âm dài." },
  ],
  generateQuestion: (context: PracticeContext): PracticeQuestion => {
    const q = PHONETICS_QUESTIONS[Math.floor(Math.random() * PHONETICS_QUESTIONS.length)];
    return {
      id: `phon_${Date.now()}_${Math.random()}`,
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
