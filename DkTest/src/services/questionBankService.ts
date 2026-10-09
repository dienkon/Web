import { collection, getDocs, addDoc, query, where, limit, orderBy } from "firebase/firestore";
import { db } from "./firebase/config";
import type { Question, QuestionType, Difficulty } from "../types";

export type BloomLevel = "remember" | "understand" | "apply" | "analyze";

export interface QuestionBankItem {
  id: string;
  text: string;
  type: QuestionType;
  subject: string;
  gradeCategory: string;
  topic: string;
  bloomLevel: BloomLevel;
  difficulty: Difficulty;
  options?: { id: string; text: string }[];
  correctOptionIds?: string[];
  statements?: { id: string; text: string; correctAnswer: boolean }[];
  acceptedAnswers?: string[];
  explanation?: string;
  tags?: string[];
  createdAt: number;
  usageCount?: number;
}

export interface MatrixConfig {
  rememberCount: number;
  understandCount: number;
  applyCount: number;
  analyzeCount: number;
}

const LOCAL_BANK_KEY = "dktest_question_bank_items";

// Built-in seed questions for immediate availability without requiring massive prior database seeding
const SEED_QUESTION_BANK: QuestionBankItem[] = [
  // Toán - Nhận biết (remember)
  {
    id: "qb_toan_01",
    text: "Hàm số nào sau đây đồng biến trên khoảng $(-\\infty; +\\infty)$?",
    type: "single_choice",
    subject: "Toán",
    gradeCategory: "THPT Quốc Gia",
    topic: "Khảo sát hàm số",
    bloomLevel: "remember",
    difficulty: "easy",
    options: [
      { id: "opt1", text: "$y = x^3 + 3x$" },
      { id: "opt2", text: "$y = -x^3 + 3x$" },
      { id: "opt3", text: "$y = \\frac{x-1}{x+2}$" },
      { id: "opt4", text: "$y = x^4 + 2x^2$" },
    ],
    correctOptionIds: ["opt1"],
    explanation: "Đạo hàm $y' = 3x^2 + 3 > 0$ với mọi $x \\in \\mathbb{R}$, do đó hàm số luôn đồng biến trên $\\mathbb{R}$.",
    tags: ["Đạo hàm", "Đơn điệu"],
    createdAt: Date.now() - 86400000,
    usageCount: 5,
  },
  // Toán - Thông hiểu (understand)
  {
    id: "qb_toan_02",
    text: "Cho hàm số $y = f(x)$ có bảng biến thiên với $f'(x) = x(x-1)^2(x+2)$. Số điểm cực trị của hàm số là:",
    type: "single_choice",
    subject: "Toán",
    gradeCategory: "THPT Quốc Gia",
    topic: "Cực trị hàm số",
    bloomLevel: "understand",
    difficulty: "medium",
    options: [
      { id: "opt1", text: "2" },
      { id: "opt2", text: "3" },
      { id: "opt3", text: "1" },
      { id: "opt4", text: "4" },
    ],
    correctOptionIds: ["opt1"],
    explanation: "Đạo hàm đổi dấu qua các nghiệm bậc lẻ $x=0$ và $x=-2$. Nghiệm $x=1$ là nghiệm kép bậc 2 nên đạo hàm không đổi dấu. Số cực trị là 2.",
    tags: ["Cực trị"],
    createdAt: Date.now() - 86400000,
    usageCount: 3,
  },
  // Toán - Vận dụng (apply)
  {
    id: "qb_toan_03",
    text: "Tìm tất cả các giá trị thực của tham số $m$ để hàm số $y = \\frac{1}{3}x^3 - mx^2 + (m^2-4)x + 3$ đạt cực đại tại $x = 3$.",
    type: "single_choice",
    subject: "Toán",
    gradeCategory: "THPT Quốc Gia",
    topic: "Cực trị chứa tham số",
    bloomLevel: "apply",
    difficulty: "medium",
    options: [
      { id: "opt1", text: "$m = 1$" },
      { id: "opt2", text: "$m = 5$" },
      { id: "opt3", text: "$m = -1$" },
      { id: "opt4", text: "$m = 7$" },
    ],
    correctOptionIds: ["opt2"],
    explanation: "$y' = x^2 - 2mx + m^2 - 4$. Ta có $y'(3) = 0 \\Leftrightarrow m^2 - 6m + 5 = 0 \\Leftrightarrow m = 1$ hoặc $m = 5$. Với $m=5$: $y''(3) < 0$ (thỏa mãn cực đại).",
    tags: ["Tham số m", "Cực đại"],
    createdAt: Date.now() - 86400000,
    usageCount: 2,
  },
  // Toán - Vận dụng cao (analyze)
  {
    id: "qb_toan_04",
    text: "Có bao nhiêu giá trị nguyên của tham số $m \\in [-10; 10]$ để đồ thị hàm số $y = |x^4 - 2(m+1)x^2 + m^2|$ có đúng 7 điểm cực trị?",
    type: "single_choice",
    subject: "Toán",
    gradeCategory: "THPT Quốc Gia",
    topic: "Cực trị hàm trị tuyệt đối",
    bloomLevel: "analyze",
    difficulty: "hard",
    options: [
      { id: "opt1", text: "10" },
      { id: "opt2", text: "9" },
      { id: "opt3", text: "8" },
      { id: "opt4", text: "11" },
    ],
    correctOptionIds: ["opt1"],
    explanation: "Đồ thị $y = |g(x)|$ có 7 điểm cực trị khi $g(x) = 0$ có 4 nghiệm phân biệt và $g(x)$ có 3 điểm cực trị. Điều này dẫn đến $m > 0$. Với $m \\in [-10; 10]$ nguyên có 10 giá trị từ 1 đến 10.",
    tags: ["Vận dụng cao", "Trị tuyệt đối"],
    createdAt: Date.now() - 86400000,
    usageCount: 1,
  },
  // Tiếng Anh - Nhận biết
  {
    id: "qb_eng_01",
    text: "Choose the word whose underlined part is pronounced differently: /ed/",
    type: "single_choice",
    subject: "Tiếng Anh",
    gradeCategory: "THPT Quốc Gia",
    topic: "Ngữ âm & Trọng âm",
    bloomLevel: "remember",
    difficulty: "easy",
    options: [
      { id: "opt1", text: "played" },
      { id: "opt2", text: "stayed" },
      { id: "opt3", text: "worked" },
      { id: "opt4", text: "lived" },
    ],
    correctOptionIds: ["opt3"],
    explanation: "'worked' phát âm là /t/, các từ còn lại phát âm là /d/.",
    tags: ["Pronunciation", "Ed ending"],
    createdAt: Date.now() - 86400000,
    usageCount: 4,
  },
  // Tiếng Anh - Thông hiểu
  {
    id: "qb_eng_02",
    text: "If I _______ your advice yesterday, I wouldn't be in such trouble now.",
    type: "single_choice",
    subject: "Tiếng Anh",
    gradeCategory: "THPT Quốc Gia",
    topic: "Câu điều kiện hỗn hợp",
    bloomLevel: "understand",
    difficulty: "medium",
    options: [
      { id: "opt1", text: "had followed" },
      { id: "opt2", text: "followed" },
      { id: "opt3", text: "have followed" },
      { id: "opt4", text: "follow" },
    ],
    correctOptionIds: ["opt1"],
    explanation: "Câu điều kiện hỗn hợp loại 3 và loại 2 (giả thiết quá khứ - kết quả hiện tại): If + S + had V3/ed, S + would + V.",
    tags: ["Mixed Conditionals"],
    createdAt: Date.now() - 86400000,
    usageCount: 3,
  },
  // Vật Lý - Nhận biết
  {
    id: "qb_ly_01",
    text: "Một con lắc lò xo có độ cứng $k$ và vật nặng khối lượng $m$. Chu kì dao động điều hòa của con lắc là:",
    type: "single_choice",
    subject: "Vật Lý",
    gradeCategory: "THPT Quốc Gia",
    topic: "Dao động cơ",
    bloomLevel: "remember",
    difficulty: "easy",
    options: [
      { id: "opt1", text: "$T = 2\\pi \\sqrt{\\frac{m}{k}}$" },
      { id: "opt2", text: "$T = 2\\pi \\sqrt{\\frac{k}{m}}$" },
      { id: "opt3", text: "$T = \\frac{1}{2\\pi} \\sqrt{\\frac{m}{k}}$" },
      { id: "opt4", text: "$T = \\frac{1}{2\\pi} \\sqrt{\\frac{k}{m}}$" },
    ],
    correctOptionIds: ["opt1"],
    explanation: "Công thức chuẩn chu kì con lắc lò xo $T = 2\\pi\\sqrt{\\frac{m}{k}}$.",
    tags: ["Dao động", "Lò xo"],
    createdAt: Date.now() - 86400000,
    usageCount: 6,
  },
  // Hóa Học - Thông hiểu
  {
    id: "qb_hoa_01",
    text: "Chất nào sau đây tác dụng với dung dịch $AgNO_3$ trong $NH_3$ đun nóng tạo kết tủa bạc?",
    type: "single_choice",
    subject: "Hóa Học",
    gradeCategory: "THPT Quốc Gia",
    topic: "Cacbohiđrat",
    bloomLevel: "understand",
    difficulty: "medium",
    options: [
      { id: "opt1", text: "Glucozơ" },
      { id: "opt2", text: "Saccarozơ" },
      { id: "opt3", text: "Tinh bột" },
      { id: "opt4", text: "Xenlulozơ" },
    ],
    correctOptionIds: ["opt1"],
    explanation: "Glucozơ có nhóm chức anđehit (-CHO) nên có phản ứng tráng bạc tạo kết tủa Ag.",
    tags: ["Cacbohidrat", "Tráng gương"],
    createdAt: Date.now() - 86400000,
    usageCount: 4,
  },
];

export async function fetchQuestionBank(filter?: {
  subject?: string;
  bloomLevel?: string;
  topic?: string;
  search?: string;
}): Promise<QuestionBankItem[]> {
  let list: QuestionBankItem[] = [];

  try {
    const raw = localStorage.getItem(LOCAL_BANK_KEY);
    const stored: QuestionBankItem[] = raw ? JSON.parse(raw) : [];
    
    // Combine seed with locally saved custom bank items
    const mergedMap = new Map<string, QuestionBankItem>();
    SEED_QUESTION_BANK.forEach((q) => mergedMap.set(q.id, q));
    stored.forEach((q) => mergedMap.set(q.id, q));
    list = Array.from(mergedMap.values());
  } catch {
    list = [...SEED_QUESTION_BANK];
  }

  // Filter criteria
  return list.filter((item) => {
    if (filter?.subject && filter.subject !== "all" && item.subject !== filter.subject) {
      return false;
    }
    if (filter?.bloomLevel && filter.bloomLevel !== "all" && item.bloomLevel !== filter.bloomLevel) {
      return false;
    }
    if (filter?.topic && filter.topic !== "all" && item.topic !== filter.topic) {
      return false;
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const match =
        item.text.toLowerCase().includes(q) ||
        (item.topic && item.topic.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)));
      if (!match) return false;
    }
    return true;
  });
}

export async function saveQuestionToBank(item: Omit<QuestionBankItem, "id" | "createdAt">): Promise<QuestionBankItem> {
  const newId = `qb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newItem: QuestionBankItem = {
    ...item,
    id: newId,
    createdAt: Date.now(),
    usageCount: 0,
  };

  try {
    const raw = localStorage.getItem(LOCAL_BANK_KEY);
    const list: QuestionBankItem[] = raw ? JSON.parse(raw) : [];
    list.unshift(newItem);
    localStorage.setItem(LOCAL_BANK_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save question to local bank cache", e);
  }

  return newItem;
}

export function generateExamFromMatrix(params: {
  title: string;
  subject: string;
  gradeCategory: string;
  duration: number;
  matrix: MatrixConfig;
  allBankQuestions: QuestionBankItem[];
}): { examTitle: string; questions: Question[] } {
  const { title, subject, gradeCategory, duration, matrix, allBankQuestions } = params;

  // Filter bank by matching subject
  const subjectPool = allBankQuestions.filter(
    (q) => !subject || subject === "all" || q.subject === subject
  );

  const poolByLevel: Record<BloomLevel, QuestionBankItem[]> = {
    remember: subjectPool.filter((q) => q.bloomLevel === "remember"),
    understand: subjectPool.filter((q) => q.bloomLevel === "understand"),
    apply: subjectPool.filter((q) => q.bloomLevel === "apply"),
    analyze: subjectPool.filter((q) => q.bloomLevel === "analyze"),
  };

  const selectedBankItems: QuestionBankItem[] = [];

  const pickLevel = (level: BloomLevel, count: number) => {
    const available = [...(poolByLevel[level] || [])];
    // Shuffle available pool
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    for (let i = 0; i < count; i++) {
      if (i < available.length) {
        selectedBankItems.push(available[i]);
      } else {
        // Synthesize dynamic template question if pool exhausted
        const levelLabel =
          level === "remember"
            ? "Nhận biết"
            : level === "understand"
            ? "Thông hiểu"
            : level === "apply"
            ? "Vận dụng"
            : "Vận dụng cao";
        selectedBankItems.push({
          id: `synth_${level}_${i + 1}_${Date.now()}`,
          text: `[${levelLabel}] Câu hỏi ôn tập kiến thức ${subject} mức độ ${levelLabel} (Mã sinh: #${i + 1})`,
          type: "single_choice",
          subject,
          gradeCategory,
          topic: `Chuyên đề ${levelLabel}`,
          bloomLevel: level,
          difficulty: level === "remember" ? "easy" : level === "analyze" ? "hard" : "medium",
          options: [
            { id: "A", text: "Phương án A (Đáp án mẫu)" },
            { id: "B", text: "Phương án B" },
            { id: "C", text: "Phương án C" },
            { id: "D", text: "Phương án D" },
          ],
          correctOptionIds: ["A"],
          explanation: `Giải thích chi tiết cho câu hỏi mức độ ${levelLabel}.`,
          createdAt: Date.now(),
        });
      }
    }
  };

  pickLevel("remember", matrix.rememberCount);
  pickLevel("understand", matrix.understandCount);
  pickLevel("apply", matrix.applyCount);
  pickLevel("analyze", matrix.analyzeCount);

  // Convert QuestionBankItem to Exam Question interface
  const totalCount = selectedBankItems.length;
  const pointsPerQ = totalCount > 0 ? Number((10 / totalCount).toFixed(2)) : 0.25;

  const generatedQuestions: Question[] = selectedBankItems.map((item, idx) => ({
    id: item.id || `q_${idx + 1}`,
    examId: "",
    order: idx + 1,
    type: item.type,
    text: item.text,
    options: item.options?.map((o, oIdx) => ({
      id: o.id || `opt_${oIdx + 1}`,
      text: o.text,
    })),
    correctOptionIds: item.correctOptionIds || [],
    statements: item.statements,
    acceptedAnswers: item.acceptedAnswers,
    explanation: item.explanation,
    points: pointsPerQ,
    difficulty: item.difficulty,
    tags: [item.bloomLevel, item.topic, ...(item.tags || [])],
  }));

  return {
    examTitle: title || `Đề thi Ma trận - ${subject}`,
    questions: generatedQuestions,
  };
}
