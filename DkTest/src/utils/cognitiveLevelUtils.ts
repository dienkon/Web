import type { Question, Submission } from "../types";
import { evaluateQuestionAnswer } from "./attemptAnalytics";

export type CognitiveLevel = "NB" | "TH" | "VD" | "VDC";

export const COGNITIVE_LEVEL_ORDER: CognitiveLevel[] = ["NB", "TH", "VD", "VDC"];

export interface CognitiveLevelMeta {
  code: CognitiveLevel;
  label: string;
  shortLabel: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  badgeClass: string;
  activePillClass: string;
  barColor: string;
}

export const COGNITIVE_LEVEL_META: Record<CognitiveLevel, CognitiveLevelMeta> = {
  NB: {
    code: "NB",
    label: "Nhận biết",
    shortLabel: "NB",
    description: "Ghi nhớ, nhận diện kiến thức cơ bản & công thức nền tảng",
    difficulty: "easy",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activePillClass: "bg-emerald-600 text-white border-emerald-600 shadow-xs",
    barColor: "#10b981",
  },
  TH: {
    code: "TH",
    label: "Thông hiểu",
    shortLabel: "TH",
    description: "Diễn giải, so sánh, áp dụng trực tiếp kiến thức đã học",
    difficulty: "medium",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    activePillClass: "bg-sky-600 text-white border-sky-600 shadow-xs",
    barColor: "#0ea5e9",
  },
  VD: {
    code: "VD",
    label: "Vận dụng",
    shortLabel: "VD",
    description: "Giải quyết bài toán kết hợp nhiều bước hoặc tình huống quen thuộc",
    difficulty: "hard",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    activePillClass: "bg-amber-500 text-white border-amber-500 shadow-xs",
    barColor: "#f59e0b",
  },
  VDC: {
    code: "VDC",
    label: "Vận dụng cao",
    shortLabel: "VDC",
    description: "Phân tích sâu, tổng hợp sáng tạo, bài toán phân hóa điểm 9–10",
    difficulty: "hard",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    activePillClass: "bg-rose-600 text-white border-rose-600 shadow-xs",
    barColor: "#e11d48",
  },
};

export function normalizeCognitiveLevel(raw: unknown): CognitiveLevel | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toUpperCase();
  if (cleaned === "NB" || cleaned === "TH" || cleaned === "VD" || cleaned === "VDC") {
    return cleaned;
  }
  const lower = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (lower.includes("van dung cao") || lower === "vdc" || lower === "very_hard") return "VDC";
  if (lower.includes("van dung") || lower === "vd" || lower === "hard" || lower === "kho") return "VD";
  if (lower.includes("thong hieu") || lower === "th" || lower === "medium" || lower === "trung binh") return "TH";
  if (lower.includes("nhan biet") || lower === "nb" || lower === "easy" || lower === "de") return "NB";
  return null;
}

export function cognitiveLevelToDifficulty(level: CognitiveLevel): "easy" | "medium" | "hard" {
  return COGNITIVE_LEVEL_META[level].difficulty;
}

export function resolveQuestionCognitiveLevel(
  question: Pick<Question, "level" | "difficulty"> | null | undefined
): CognitiveLevel {
  if (!question) return "TH";
  const fromLevel = normalizeCognitiveLevel(question.level);
  if (fromLevel) return fromLevel;
  const fromDiff = normalizeCognitiveLevel(question.difficulty);
  if (fromDiff) return fromDiff;
  return "TH";
}

export interface CognitiveLevelCountRow {
  level: CognitiveLevel;
  label: string;
  count: number;
  pct: number;
}

export function computeCognitiveLevelDistribution(
  questions: Array<Pick<Question, "level" | "difficulty">>
): CognitiveLevelCountRow[] {
  const counts: Record<CognitiveLevel, number> = { NB: 0, TH: 0, VD: 0, VDC: 0 };
  for (const q of questions || []) {
    const lv = resolveQuestionCognitiveLevel(q);
    counts[lv]++;
  }
  const total = questions?.length || 0;
  return COGNITIVE_LEVEL_ORDER.map((level) => ({
    level,
    label: COGNITIVE_LEVEL_META[level].label,
    count: counts[level],
    pct: total > 0 ? Math.round((counts[level] / total) * 100) : 0,
  }));
}

export interface CognitiveLevelPerformanceRow {
  level: CognitiveLevel;
  label: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracyPct: number;
}

export function computeCognitiveLevelPerformance(
  questions: Question[],
  submission: Pick<Submission, "answers" | "maxScore"> | null | undefined
): CognitiveLevelPerformanceRow[] {
  const buckets: Record<
    CognitiveLevel,
    { total: number; correct: number; incorrect: number; unanswered: number }
  > = {
    NB: { total: 0, correct: 0, incorrect: 0, unanswered: 0 },
    TH: { total: 0, correct: 0, incorrect: 0, unanswered: 0 },
    VD: { total: 0, correct: 0, incorrect: 0, unanswered: 0 },
    VDC: { total: 0, correct: 0, incorrect: 0, unanswered: 0 },
  };

  const list = questions || [];
  const pointPerQuestion = list.length > 0 ? (submission?.maxScore || 10) / list.length : 1;

  for (const q of list) {
    const lv = resolveQuestionCognitiveLevel(q);
    buckets[lv].total++;
    const ans = submission?.answers?.[q.id];
    const evalRes = evaluateQuestionAnswer(q, ans, pointPerQuestion);
    if (evalRes.status === "unanswered") {
      buckets[lv].unanswered++;
    } else if (evalRes.isCorrect) {
      buckets[lv].correct++;
    } else {
      buckets[lv].incorrect++;
    }
  }

  return COGNITIVE_LEVEL_ORDER.map((level) => {
    const b = buckets[level];
    return {
      level,
      label: COGNITIVE_LEVEL_META[level].label,
      total: b.total,
      correct: b.correct,
      incorrect: b.incorrect,
      unanswered: b.unanswered,
      accuracyPct: b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0,
    };
  });
}
