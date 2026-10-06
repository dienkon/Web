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
  const seenSignatures = new Set<string>();

  for (const source of sources) {
    const rawQuestions = await getExamQuestionsSafe(
      source.examId,
      source.questions ||
        source.submission?.shuffledQuestionsSnapshot ||
        source.exam.questions
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

    rawQuestions.forEach((q, idx) => {
      const origId = (q as any).originalQuestionId || q.id || `q_${idx + 1}`;
      const candidateKey = `${source.examId}::${origId}`;

      // Calculate answer status based on submission
      let answerStatus: "correct" | "wrong" | "unanswered" | "unattempted" = "unattempted";

      if (submission) {
        const studentAns = submission.answers?.[q.id];
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

      const candidate: ReviewQuestionCandidate = {
        candidateId: candidateKey,
        sourceExamId: source.examId,
        sourceExamTitle: source.examTitle,
        originalQuestionId: origId,
        question: {
          ...q,
          originalQuestionId: origId,
          originalExamId: source.examId,
        },
        answerStatus,
        type: q.type || "single_choice",
        difficulty: diff,
        sectionTitle,
        sectionId: q.sectionId,
        tags: Array.isArray(q.tags) ? q.tags : [],
        points: q.points || 1,
        order: q.order ?? idx,
        textSnippet: snippet,
      };

      // Guard against exact duplicates across combined sources
      const sig = `${getQuestionSignature(q)}_${q.type}`;
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        candidates.push(candidate);
        candidateMap.set(candidateKey, candidate);
      }
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
