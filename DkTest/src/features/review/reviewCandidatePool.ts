import type { Question, Section, QuestionType } from "../../types";
import { evaluateQuestionAnswer } from "../../utils/attemptAnalytics";
import { getExamQuestionsSafe, getQuestionSignature } from "../../services/reviewExamService";
import type {
  ReviewSourceExam,
  ReviewQuestionCandidate,
  ReviewFilterConfig,
  QuestionAnswerStatus,
} from "./types";

/**
 * Strips HTML tags, Markdown symbols, and LaTeX tokens for a clean preview snippet.
 */
export function cleanTextSnippet(text: string, maxLength = 140): string {
  if (!text) return "";
  const cleaned = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\$\$?[^$]+\$\$?/g, "[Công thức]")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength - 3) + "...";
}

/**
 * Builds a standardized candidate pool from multiple review source exams.
 */
export async function buildReviewCandidatePool(
  sources: ReviewSourceExam[]
): Promise<{
  candidates: ReviewQuestionCandidate[];
  candidateMap: Map<string, ReviewQuestionCandidate>;
}> {
  const candidates: ReviewQuestionCandidate[] = [];
  const candidateMap = new Map<string, ReviewQuestionCandidate>();

  for (let sIdx = 0; sIdx < sources.length; sIdx++) {
    const source = sources[sIdx];
    // Always load master questions from exam first to ensure NO questions are missing
    const rawQuestions = await getExamQuestionsSafe(
      source.examId,
      source.questions ||
        source.exam.questions ||
        source.submission?.shuffledQuestionsSnapshot
    );

    const submission = source.submission;
    const pointPerQuestion =
      rawQuestions.length > 0 && submission?.maxScore
        ? submission.maxScore / rawQuestions.length
        : 1;

    // Build section lookup map if sections exist
    const sectionMap = new Map<string, string>();
    if (source.exam.sections && Array.isArray(source.exam.sections)) {
      source.exam.sections.forEach((sec: Section) => {
        if (sec.id) sectionMap.set(sec.id, sec.title || "Phần đề thi");
      });
    }

    rawQuestions.forEach((q, qIdx) => {
      // Retain original ID for submission answering and mastery tracking
      const origId = (q as any).originalQuestionId || q.id || `q_${qIdx + 1}`;
      const cleanExam = String(source.examId || `ex_${sIdx + 1}`).replace(/[^a-zA-Z0-9_-]/g, "_");
      const cleanOrigId = String(origId).replace(/[^a-zA-Z0-9_-]/g, "_");

      // AUTO ĐỔI ID RIÊNG BIỆT HOÀN TOÀN, KHÔNG DÙNG ID CỦA BÀI GỐC
      const uniqueCandidateId = `rev_${cleanExam}_q${qIdx + 1}_${cleanOrigId}_${Math.random().toString(36).slice(2, 7)}`;

      // Calculate answer status based on submission using original question ID or key
      let answerStatus: "correct" | "wrong" | "unanswered" | "unattempted" = "unattempted";

      if (submission) {
        const studentAns =
          submission.answers?.[origId] ??
          submission.answers?.[q.id] ??
          (submission.answers
            ? Object.entries(submission.answers).find(([k]) => k === origId || k === q.id)?.[1]
            : undefined);

        const isAnswerEmpty =
          studentAns === undefined ||
          studentAns === null ||
          studentAns === "" ||
          (Array.isArray(studentAns) && studentAns.length === 0) ||
          (typeof studentAns === "object" && Object.keys(studentAns).length === 0);

        if (isAnswerEmpty) {
          answerStatus = "unanswered";
        } else {
          const evalResult = evaluateQuestionAnswer(q, studentAns, pointPerQuestion);
          answerStatus = evalResult.isCorrect ? "correct" : "wrong";
        }
      }

      const sectionTitle = q.sectionId ? sectionMap.get(q.sectionId) : undefined;
      const snippet = cleanTextSnippet(q.text || "");
      const diff = q.difficulty || "unspecified";

      // Question object has its OWN SEPARATE ID, NEVER reusing the original question id
      const newQuestionObj: Question = {
        ...q,
        id: uniqueCandidateId, // Auto đổi ID riêng
        originalQuestionId: origId,
        originalExamId: source.examId,
        order: candidates.length,
      };

      const candidate: ReviewQuestionCandidate = {
        candidateId: uniqueCandidateId, // ID ứng viên riêng
        sourceExamId: source.examId,
        sourceExamTitle: source.examTitle,
        originalQuestionId: origId,
        question: newQuestionObj,
        answerStatus,
        type: q.type || "single_choice",
        difficulty: diff,
        sectionTitle,
        sectionId: q.sectionId,
        tags: Array.isArray(q.tags) ? q.tags : [],
        points: q.points || 1,
        order: candidates.length,
        textSnippet: snippet,
      };

      // Đưa toàn bộ câu hỏi vào danh sách ứng viên, không bỏ sót bất kỳ câu nào
      candidates.push(candidate);
      candidateMap.set(uniqueCandidateId, candidate);
    });
  }

  return { candidates, candidateMap };
}

/**
 * Applies deterministic hard filters to candidate pool.
 */
export function filterCandidates(
  candidates: ReviewQuestionCandidate[],
  filter: ReviewFilterConfig
): ReviewQuestionCandidate[] {
  return candidates.filter((c) => {
    // 1. Question Type filter
    if (filter.types.length > 0 && !filter.types.includes(c.type)) {
      return false;
    }

    // 2. Difficulty filter
    if (filter.difficulties.length > 0) {
      const matchDiff = filter.difficulties.includes(c.difficulty);
      if (!matchDiff) return false;
    }

    // 3. Section filter
    if (filter.sections.length > 0) {
      const secKey = c.sectionTitle || c.sectionId || "";
      if (!filter.sections.includes(secKey)) return false;
    }

    // 4. Status filter
    switch (filter.answerStatus) {
      case "all":
        return true;
      case "wrong":
        return c.answerStatus === "wrong";
      case "correct":
        return c.answerStatus === "correct";
      case "unanswered":
        return c.answerStatus === "unanswered";
      case "wrong_or_unanswered":
        return c.answerStatus === "wrong" || c.answerStatus === "unanswered";
      default:
        return true;
    }
  });
}

export interface CandidatePoolStats {
  total: number;
  byType: Record<string, number>;
  byDifficulty: Record<string, number>;
  byStatus: Record<string, number>;
  sections: string[];
}

/**
 * Computes pool breakdown stats for UI chips and badges.
 */
export function getCandidatePoolStats(
  candidates: ReviewQuestionCandidate[]
): CandidatePoolStats {
  const byType: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
    unspecified: 0,
  };
  const byStatus: Record<string, number> = {
    all: candidates.length,
    wrong: 0,
    correct: 0,
    unanswered: 0,
    unattempted: 0,
  };
  const sectionSet = new Set<string>();

  for (const c of candidates) {
    byType[c.type] = (byType[c.type] || 0) + 1;
    byDifficulty[c.difficulty] = (byDifficulty[c.difficulty] || 0) + 1;
    byStatus[c.answerStatus] = (byStatus[c.answerStatus] || 0) + 1;
    if (c.sectionTitle) sectionSet.add(c.sectionTitle);
  }

  return {
    total: candidates.length,
    byType,
    byDifficulty,
    byStatus,
    sections: Array.from(sectionSet),
  };
}
