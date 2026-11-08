import { collection, query, orderBy } from "firebase/firestore";
import { db } from "./firebase/config";
import { FirestoreCache } from "./firebase/firestoreCache";
import { FirestoreRepository } from "./firebase/firestoreRepository";
import type { Question, Section } from "../types";
import { loadOfflineExam, prefersOfflineExam } from './offline/exams';

/**
 * Invalidates home page cached queries for top attempted, newest, and filter lists.
 */
export function invalidateHomeTopCache(): void {
  try {
    FirestoreCache.invalidate("home:top:attempted");
    FirestoreCache.invalidate("home:top:newest");
    FirestoreCache.invalidatePrefix("home:filter:");
    FirestoreCache.invalidatePrefix("query:exams");
  } catch (err) {
    console.warn("[examCacheService] Error invalidating home cache:", err);
  }
}

const QUESTIONS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL in memory

/**
 * Invalidates memory and sessionStorage caches for an exam's questions and sections.
 */
export function invalidateExamQuestionsCache(examId: string): void {
  if (!examId) return;
  try {
    FirestoreCache.invalidate(`query:exams/${examId}/questions`);
    FirestoreCache.invalidate(`query:exams/${examId}/sections`);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(`exam_questions_${examId}`);
      sessionStorage.removeItem(`exam_sections_${examId}`);
    }
  } catch (err) {
    console.warn("[examCacheService] Error invalidating exam questions cache:", err);
  }
}

/**
 * Loads exam questions with multi-tier caching (RAM -> SessionStorage -> FirestoreRepository).
 * Completely eliminates duplicate 50-100 document subcollection reads when navigating
 * between ExamIntro, TakingExam, ExamResult, and RetakeReview.
 */
export async function getExamQuestionsWithCache(
  examId: string,
  docQuestions?: Question[] | null,
  options: { forceRefresh?: boolean; caller?: string } = {}
): Promise<Question[]> {
  if (!examId) return [];

  if (prefersOfflineExam()) {
    const pack = await loadOfflineExam(examId);
    if (pack) return [...pack.questions].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  const cacheKey = `exams/${examId}/questions`;
  const storageKey = `exam_questions_${examId}`;

  // 1. If questions array was already embedded in the root exam document, cache and return
  if (Array.isArray(docQuestions) && docQuestions.length > 0) {
    const sorted = [...docQuestions].sort((a, b) => (a.order || 0) - (b.order || 0));
    FirestoreCache.set(`query:${cacheKey}`, sorted, QUESTIONS_CACHE_TTL_MS);
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(storageKey, JSON.stringify(sorted));
      }
    } catch (_) {}
    return sorted;
  }

  // 2. Check RAM cache (0 Firestore reads)
  if (!options.forceRefresh) {
    const inMemory = FirestoreCache.get<Question[]>(`query:${cacheKey}`);
    if (Array.isArray(inMemory) && inMemory.length > 0) {
      return inMemory;
    }

    // 3. Check SessionStorage cache across page transitions (0 Firestore reads)
    try {
      if (typeof sessionStorage !== "undefined") {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            FirestoreCache.set(`query:${cacheKey}`, parsed, QUESTIONS_CACHE_TTL_MS);
            return parsed as Question[];
          }
        }
      }
    } catch (_) {}
  }

  // 4. Query Firestore subcollection via unified FirestoreRepository (with request deduplication)
  try {
    const q = query(collection(db, `exams/${examId}/questions`), orderBy("order", "asc"));
    const fetched = await FirestoreRepository.getQuery<Question>(cacheKey, q, {
      ttlMs: QUESTIONS_CACHE_TTL_MS,
      forceRefresh: options.forceRefresh,
      caller: options.caller || "getExamQuestionsWithCache",
    });

    const sorted = [...fetched].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Save to SessionStorage so next page load (e.g. TakingExam -> ExamResult) doesn't query Firestore
    try {
      if (typeof sessionStorage !== "undefined" && sorted.length > 0) {
        sessionStorage.setItem(storageKey, JSON.stringify(sorted));
      }
    } catch (_) {}

    return sorted;
  } catch (err) {
    console.warn(`[examCacheService] Error fetching questions for ${examId}:`, err);
    return [];
  }
}

/**
 * Loads exam sections with multi-tier caching (RAM -> SessionStorage -> FirestoreRepository).
 */
export async function getExamSectionsWithCache(
  examId: string,
  docSections?: Section[] | null,
  options: { forceRefresh?: boolean; caller?: string } = {}
): Promise<Section[]> {
  if (!examId) return [];

  if (prefersOfflineExam()) {
    const pack = await loadOfflineExam(examId);
    if (pack) return [...pack.sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  const cacheKey = `exams/${examId}/sections`;
  const storageKey = `exam_sections_${examId}`;

  // 1. If sections array was already embedded in root exam document, cache and return
  if (Array.isArray(docSections) && docSections.length > 0) {
    const sorted = [...docSections].sort((a, b) => (a.order || 0) - (b.order || 0));
    FirestoreCache.set(`query:${cacheKey}`, sorted, QUESTIONS_CACHE_TTL_MS);
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(storageKey, JSON.stringify(sorted));
      }
    } catch (_) {}
    return sorted;
  }

  // 2. Check RAM cache
  if (!options.forceRefresh) {
    const inMemory = FirestoreCache.get<Section[]>(`query:${cacheKey}`);
    if (Array.isArray(inMemory) && inMemory.length > 0) {
      return inMemory;
    }

    // 3. Check SessionStorage cache
    try {
      if (typeof sessionStorage !== "undefined") {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            FirestoreCache.set(`query:${cacheKey}`, parsed, QUESTIONS_CACHE_TTL_MS);
            return parsed as Section[];
          }
        }
      }
    } catch (_) {}
  }

  // 4. Query Firestore subcollection via unified FirestoreRepository
  try {
    const q = query(collection(db, `exams/${examId}/sections`), orderBy("order", "asc"));
    const fetched = await FirestoreRepository.getQuery<Section>(cacheKey, q, {
      ttlMs: QUESTIONS_CACHE_TTL_MS,
      forceRefresh: options.forceRefresh,
      caller: options.caller || "getExamSectionsWithCache",
    });

    const sorted = [...fetched].sort((a, b) => (a.order || 0) - (b.order || 0));

    try {
      if (typeof sessionStorage !== "undefined" && sorted.length > 0) {
        sessionStorage.setItem(storageKey, JSON.stringify(sorted));
      }
    } catch (_) {}

    return sorted;
  } catch (err) {
    console.warn(`[examCacheService] Error fetching sections for ${examId}:`, err);
    return [];
  }
}
