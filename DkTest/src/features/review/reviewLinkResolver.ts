import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Exam } from "../../types";

const examMemoryCache = new Map<string, Exam>();

/**
 * Extracts and cleans exam IDs or exam codes from text (URLs, paths, bare IDs, codes).
 * Supports multiline, comma-separated, space-separated inputs up to 50 items.
 */
export function parseExamReferences(rawInput: string): string[] {
  if (!rawInput || typeof rawInput !== "string") return [];

  // Split by newlines, commas, semicolons, whitespace
  const tokens = rawInput
    .split(/[\r\n,;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const results = new Set<string>();

  for (const token of tokens) {
    let clean = token;

    // Remove query params & hashes
    clean = clean.split("?")[0].split("#")[0].replace(/\/+$/, "");

    // Extract ID from full or partial URLs:
    // e.g. https://.../student/exam/XYZ or /student/exam/XYZ or /exam/XYZ
    const urlPattern = /(?:student\/exam|exam)\/([a-zA-Z0-9_\-]+)/i;
    const match = clean.match(urlPattern);

    if (match && match[1]) {
      clean = match[1];
    } else {
      // If it's a full URL without /student/exam pattern, take the last path segment
      if (clean.includes("://") || clean.startsWith("/")) {
        const segments = clean.split("/").filter(Boolean);
        const last = segments[segments.length - 1];
        if (last && /^[a-zA-Z0-9_\-]+$/.test(last)) {
          clean = last;
        }
      }
    }

    if (clean && /^[a-zA-Z0-9_\-]+$/.test(clean) && clean.length >= 2) {
      results.add(clean);
      if (results.size >= 50) break;
    }
  }

  return Array.from(results);
}

export interface ResolveResult {
  exam: Exam;
  ref: string;
  resolvedBy: "id" | "code";
}

/**
 * Resolves a single exam reference by ID or code, utilizing in-memory cache to eliminate redundant reads.
 */
export async function resolveExamReference(
  ref: string,
  cache = examMemoryCache
): Promise<ResolveResult | null> {
  const trimmed = ref.trim();
  if (!trimmed) return null;

  // 1. Check in-memory cache
  if (cache.has(trimmed)) {
    const cached = cache.get(trimmed)!;
    return {
      exam: cached,
      ref: trimmed,
      resolvedBy: cached.id === trimmed ? "id" : "code",
    };
  }

  // Also check if any cached exam has this code
  for (const cached of cache.values()) {
    if (cached.code && cached.code.toLowerCase() === trimmed.toLowerCase()) {
      return { exam: cached, ref: trimmed, resolvedBy: "code" };
    }
  }

  // 2. Try fetching as doc ID directly
  try {
    const docRef = doc(db, "exams", trimmed);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      console.warn(`[Firestore] READ (1 doc): exams/${trimmed} (resolveExamReference by ID)`);
      const examData = { id: snap.id, ...snap.data() } as Exam;
      cache.set(examData.id, examData);
      if (examData.code) cache.set(examData.code, examData);
      return { exam: examData, ref: trimmed, resolvedBy: "id" };
    }
  } catch (err) {
    console.warn(`[resolveExamReference] Doc ID lookup failed for "${trimmed}":`, err);
  }

  // 3. Fallback: Search by exam code
  try {
    const q = query(
      collection(db, "exams"),
      where("code", "==", trimmed),
      limit(1)
    );
    const qSnap = await getDocs(q);
    console.warn(`[Firestore] READ_MANY (${qSnap.size} docs): exams (resolveExamReference by code "${trimmed}")`);
    if (!qSnap.empty) {
      const firstDoc = qSnap.docs[0];
      const examData = { id: firstDoc.id, ...firstDoc.data() } as Exam;
      cache.set(examData.id, examData);
      if (examData.code) cache.set(examData.code, examData);
      return { exam: examData, ref: trimmed, resolvedBy: "code" };
    }
  } catch (err) {
    console.warn(`[resolveExamReference] Code query failed for "${trimmed}":`, err);
  }

  return null;
}

/**
 * Resolves multiple references concurrently with cache reuse.
 */
export async function resolveExamReferences(
  refs: string[],
  cache = examMemoryCache
): Promise<{ resolved: ResolveResult[]; failed: string[] }> {
  const resolved: ResolveResult[] = [];
  const failed: string[] = [];
  const seenExamIds = new Set<string>();

  const results = await Promise.all(
    refs.map(async (r) => {
      try {
        const res = await resolveExamReference(r, cache);
        return { ref: r, result: res };
      } catch {
        return { ref: r, result: null };
      }
    })
  );

  for (const { ref, result } of results) {
    if (result && !seenExamIds.has(result.exam.id)) {
      seenExamIds.add(result.exam.id);
      resolved.push(result);
    } else if (!result) {
      failed.push(ref);
    }
  }

  return { resolved, failed };
}
