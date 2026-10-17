import fs from "fs";
import path from "path";
import { PRODUCTION_HTML_TEMPLATE } from "./generatedHtmlTemplate.js";
import { adminDb } from "../../../server/firebaseAdmin.js";

export type SocialContentType = "voucher" | "exam" | "submission" | "code_exam" | "page";

export interface VoucherMeta {
  id: string;
  code: string;
  name: string;
  type?: string;
  value?: number;
  maxDiscountVnd?: number;
  minOrderVnd?: number;
  minDepositVnd?: number;
  usageLimit?: number;
  usedCount?: number;
  expiresAt?: string | null;
  isActive?: boolean;
  description?: string;
}

export interface ExamMeta {
  id: string;
  title: string;
  description: string;
  code?: string;
  subject?: string;
  gradeCategory?: string;
  timeLimit?: number | null;
  isUnlimitedTime?: boolean;
  questionCount?: number | null;
  priceVnd?: number | null;
  accessMode?: string;
  imageUrl?: string | null;
}

export interface SubmissionMeta {
  id: string;
  examId: string;
  examTitle: string;
  studentName: string;
  studentClass?: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  timeSpent?: number; // in seconds
  submittedAt?: string;
}

export interface CodeExamMeta {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
  language?: string;
}

export interface SocialMeta {
  contentType: SocialContentType;
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  siteName: string;
}

/**
 * Escapes characters that have special meaning in HTML attributes and text nodes
 * to prevent XSS and broken meta tags.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  const s = String(str);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Detects common social media and search engine crawlers by User-Agent header.
 * Thoroughly covers Zalo (Desktop, Mobile, in-app crawler), Facebook, Twitter, Telegram, etc.
 */
export function isSocialCrawler(userAgent: string = ""): boolean {
  if (!userAgent) return false;
  const crawlerPatterns = [
    /Zalo/i,
    /facebookexternalhit/i,
    /Facebot/i,
    /Twitterbot/i,
    /WhatsApp/i,
    /LinkedInBot/i,
    /Discordbot/i,
    /TelegramBot/i,
    /Googlebot/i,
    /bingbot/i,
    /Baiduspider/i,
    /YandexBot/i,
    /Sogou/i,
    /DuckDuckBot/i,
    /Applebot/i,
    /Slackbot/i,
    /vkShare/i,
    /W3C_Validator/i,
    /SkypeUriPreview/i,
    /MetaInspector/i,
    /redditbot/i,
    /Pinterest/i,
    /Embedly/i,
    /Quora Link Preview/i,
    /outbrain/i,
    /line-poker/i,
  ];
  return crawlerPatterns.some((pattern) => pattern.test(userAgent));
}

// ---------------------------------------------------------------------------
// Firestore REST parsing helpers
// ---------------------------------------------------------------------------
function getFirestoreString(field: any): string | null {
  if (!field) return null;
  if (typeof field.stringValue === "string") return field.stringValue;
  return null;
}

function getFirestoreNumber(field: any): number | null {
  if (!field) return null;
  if (field.integerValue !== undefined) return parseInt(field.integerValue, 10);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  return null;
}

function getFirestoreBoolean(field: any): boolean | null {
  if (!field) return null;
  if (typeof field.booleanValue === "boolean") return field.booleanValue;
  return null;
}

function getProjectId(): string {
  return (
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    "exam-fd7a1"
  );
}

export function safeDecodeURIComponent(str: string): string {
  if (!str) return "";
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

function getFirebaseApiKey(): string {
  return (
    process.env.VITE_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    "AIzaSyDp9p5hkQ6fVEou4znk5YZu81VhgZtM7h4"
  );
}

// ---------------------------------------------------------------------------
// 1. Voucher Metadata Fetcher
// ---------------------------------------------------------------------------
function parseFirestoreVoucherFields(docId: string, fields: any): VoucherMeta {
  const code = (getFirestoreString(fields.code) || docId).trim().toUpperCase();
  const name = getFirestoreString(fields.name) || `Voucher ${code}`;
  const type = getFirestoreString(fields.type) || "discount_fixed";
  const value = getFirestoreNumber(fields.value) ?? 0;
  const maxDiscountVnd = getFirestoreNumber(fields.maxDiscountVnd) ?? undefined;
  const minOrderVnd = getFirestoreNumber(fields.minOrderVnd) ?? undefined;
  const minDepositVnd = getFirestoreNumber(fields.minDepositVnd) ?? undefined;
  const usageLimit = getFirestoreNumber(fields.usageLimit) ?? undefined;
  const usedCount = getFirestoreNumber(fields.usedCount) ?? 0;
  const expiresAt = getFirestoreString(fields.expiresAt);
  const isActive = getFirestoreBoolean(fields.isActive) ?? true;
  const description = getFirestoreString(fields.description) || undefined;

  return {
    id: docId,
    code,
    name,
    type,
    value,
    maxDiscountVnd,
    minOrderVnd,
    minDepositVnd,
    usageLimit,
    usedCount,
    expiresAt,
    isActive,
    description,
  };
}

export async function fetchVoucherMetadata(
  codeOrId: string
): Promise<{ found: boolean; voucher: VoucherMeta | null }> {
  if (!codeOrId || typeof codeOrId !== "string") {
    return { found: false, voucher: null };
  }

  const clean = safeDecodeURIComponent(codeOrId).trim();
  const upperCode = clean.toUpperCase();

  // Try Admin SDK first if available
  if (adminDb) {
    try {
      const snap = await adminDb
        .collection("vouchers")
        .where("code", "==", upperCode)
        .limit(1)
        .get();

      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        return {
          found: true,
          voucher: {
            id: d.id,
            code: (data.code || upperCode).toUpperCase(),
            name: data.name || `Voucher ${upperCode}`,
            type: data.type || "discount_fixed",
            value: data.value ?? 0,
            maxDiscountVnd: data.maxDiscountVnd,
            minOrderVnd: data.minOrderVnd,
            minDepositVnd: data.minDepositVnd,
            usageLimit: data.usageLimit,
            usedCount: data.usedCount || 0,
            expiresAt: data.expiresAt || null,
            isActive: data.isActive !== false,
            description: data.description,
          },
        };
      }

      // Also check direct document ID
      const docSnap = await adminDb.collection("vouchers").doc(clean).get();
      if (docSnap.exists) {
        const data = docSnap.data() || {};
        return {
          found: true,
          voucher: {
            id: docSnap.id,
            code: (data.code || clean).toUpperCase(),
            name: data.name || `Voucher ${(data.code || clean).toUpperCase()}`,
            type: data.type || "discount_fixed",
            value: data.value ?? 0,
            maxDiscountVnd: data.maxDiscountVnd,
            minOrderVnd: data.minOrderVnd,
            minDepositVnd: data.minDepositVnd,
            usageLimit: data.usageLimit,
            usedCount: data.usedCount || 0,
            expiresAt: data.expiresAt || null,
            isActive: data.isActive !== false,
            description: data.description,
          },
        };
      }
    } catch (err) {
      console.warn("[SocialMetadata] AdminDb error querying voucher:", err);
    }
  }

  // REST API fallback
  const projectId = getProjectId();
  const apiKey = getFirebaseApiKey();
  try {
    // 1. Query by code
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: "vouchers" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "code" },
            op: "EQUAL",
            value: { stringValue: upperCode },
          },
        },
        limit: 1,
      },
    };

    const queryRes = await fetch(queryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(queryBody),
    });

    if (queryRes.ok) {
      const results = await queryRes.json();
      const firstDoc = results?.[0]?.document;
      if (firstDoc && firstDoc.fields) {
        const docId = firstDoc.name ? firstDoc.name.split("/").pop() : clean;
        return {
          found: true,
          voucher: parseFirestoreVoucherFields(docId || clean, firstDoc.fields),
        };
      }
    }

    // 2. Direct get by ID
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/vouchers/${encodeURIComponent(
      clean
    )}?key=${apiKey}`;
    const docRes = await fetch(docUrl, { headers: { Accept: "application/json" } });
    if (docRes.ok) {
      const doc = await docRes.json();
      if (doc && doc.fields) {
        return {
          found: true,
          voucher: parseFirestoreVoucherFields(clean, doc.fields),
        };
      }
    }
  } catch (err) {
    console.error(`[SocialMetadata] Error fetching voucher ${clean}:`, err);
  }

  return { found: false, voucher: null };
}

// ---------------------------------------------------------------------------
// 2. Exam Metadata Fetcher
// ---------------------------------------------------------------------------
function parseFirestoreExamFields(docId: string, fields: any): ExamMeta {
  const rawTitle = getFirestoreString(fields.title) || "";
  const rawDesc = getFirestoreString(fields.description) || "";
  const code = getFirestoreString(fields.code) || "";
  const subject = getFirestoreString(fields.subject) || undefined;
  const gradeCategory = getFirestoreString(fields.gradeCategory) || undefined;
  const accessMode = getFirestoreString(fields.accessMode) || undefined;
  const priceVnd = getFirestoreNumber(fields.priceVnd) ?? undefined;

  const candidateImage =
    getFirestoreString(fields.coverImage) ||
    getFirestoreString(fields.thumbnail) ||
    getFirestoreString(fields.imageUrl) ||
    getFirestoreString(fields.image) ||
    getFirestoreString(fields.banner) ||
    getFirestoreString(fields.ogImage) ||
    null;

  let validImageUrl: string | null = null;
  if (
    candidateImage &&
    typeof candidateImage === "string" &&
    (candidateImage.startsWith("http://") ||
      candidateImage.startsWith("https://") ||
      candidateImage.startsWith("data:image/"))
  ) {
    validImageUrl = candidateImage;
  }

  const timeLimit =
    getFirestoreNumber(fields.timeLimit) ??
    getFirestoreNumber(fields.durationMinutes) ??
    null;
  const isUnlimitedTime =
    getFirestoreBoolean(fields.isUnlimitedTime) ??
    getFirestoreBoolean(fields.unlimitedTime) ??
    (timeLimit === 0);
  const questionCount =
    getFirestoreNumber(fields.questionCount) ??
    getFirestoreNumber(fields.totalQuestions) ??
    null;

  return {
    id: docId,
    title: rawTitle.trim() || "DkTEST - Bài kiểm tra",
    description: rawDesc.trim() || "Tham gia bài kiểm tra trên DkTEST",
    code,
    subject,
    gradeCategory,
    timeLimit,
    isUnlimitedTime,
    questionCount,
    priceVnd,
    accessMode,
    imageUrl: validImageUrl,
  };
}

export async function fetchExamMetadata(
  examId: string
): Promise<{ found: boolean; exam: ExamMeta | null }> {
  if (!examId || typeof examId !== "string") {
    return { found: false, exam: null };
  }

  const cleanId = safeDecodeURIComponent(examId).trim();

  // Try Admin SDK first if available
  if (adminDb) {
    try {
      const docSnap = await adminDb.collection("exams").doc(cleanId).get();
      if (docSnap.exists) {
        const data = docSnap.data() || {};
        return {
          found: true,
          exam: {
            id: docSnap.id,
            title: data.title || "DkTEST - Bài kiểm tra",
            description: data.description || "Tham gia bài kiểm tra trên DkTEST",
            code: data.code,
            subject: data.subject,
            gradeCategory: data.gradeCategory,
            timeLimit: data.timeLimit ?? data.durationMinutes ?? null,
            isUnlimitedTime: data.isUnlimitedTime || data.unlimitedTime || data.timeLimit === 0,
            questionCount: data.questionCount ?? data.totalQuestions ?? null,
            priceVnd: data.priceVnd ?? null,
            accessMode: data.accessMode,
            imageUrl: data.coverImage || data.thumbnail || data.imageUrl || null,
          },
        };
      }

      // Query by code
      const querySnap = await adminDb
        .collection("exams")
        .where("code", "==", cleanId.toUpperCase())
        .limit(1)
        .get();
      if (!querySnap.empty) {
        const d = querySnap.docs[0];
        const data = d.data();
        return {
          found: true,
          exam: {
            id: d.id,
            title: data.title || "DkTEST - Bài kiểm tra",
            description: data.description || "Tham gia bài kiểm tra trên DkTEST",
            code: data.code,
            subject: data.subject,
            gradeCategory: data.gradeCategory,
            timeLimit: data.timeLimit ?? data.durationMinutes ?? null,
            isUnlimitedTime: data.isUnlimitedTime || data.unlimitedTime || data.timeLimit === 0,
            questionCount: data.questionCount ?? data.totalQuestions ?? null,
            priceVnd: data.priceVnd ?? null,
            accessMode: data.accessMode,
            imageUrl: data.coverImage || data.thumbnail || data.imageUrl || null,
          },
        };
      }
    } catch (err) {
      console.warn("[SocialMetadata] AdminDb error querying exam:", err);
    }
  }

  const projectId = getProjectId();
  const apiKey = getFirebaseApiKey();
  try {
    // 1. Direct document get by ID
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/exams/${encodeURIComponent(
      cleanId
    )}?key=${apiKey}`;
    const res = await fetch(docUrl, { headers: { Accept: "application/json" } });

    if (res.ok) {
      const doc = await res.json();
      if (doc && doc.fields) {
        return {
          found: true,
          exam: parseFirestoreExamFields(cleanId, doc.fields),
        };
      }
    }

    // 2. Query by code
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: "exams" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "code" },
            op: "EQUAL",
            value: { stringValue: cleanId.toUpperCase() },
          },
        },
        limit: 1,
      },
    };

    const queryRes = await fetch(queryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(queryBody),
    });

    if (queryRes.ok) {
      const results = await queryRes.json();
      const firstDoc = results?.[0]?.document;
      if (firstDoc && firstDoc.fields) {
        const foundId = firstDoc.name ? firstDoc.name.split("/").pop() : cleanId;
        return {
          found: true,
          exam: parseFirestoreExamFields(foundId || cleanId, firstDoc.fields),
        };
      }
    }
  } catch (err) {
    console.error(`[SocialMetadata] Error fetching exam ${cleanId}:`, err);
  }

  return { found: false, exam: null };
}

// ---------------------------------------------------------------------------
// 3. Submission / Result Metadata Fetcher
// ---------------------------------------------------------------------------
export async function fetchSubmissionMetadata(
  submissionId: string
): Promise<{ found: boolean; submission: SubmissionMeta | null }> {
  if (!submissionId || typeof submissionId !== "string") {
    return { found: false, submission: null };
  }

  const clean = safeDecodeURIComponent(submissionId).trim();

  // Try Admin SDK
  if (adminDb) {
    try {
      const snap = await adminDb.collection("submissions").doc(clean).get();
      if (snap.exists) {
        const data = snap.data() || {};
        return {
          found: true,
          submission: {
            id: snap.id,
            examId: data.examId || "",
            examTitle: data.examTitleSnapshot || data.examTitle || "Bài thi DkTEST",
            studentName: data.studentNameSnapshot || data.studentName || "Học sinh",
            studentClass: data.studentClassSnapshot || data.studentClass || undefined,
            score: Number(data.score) || 0,
            maxScore: Number(data.maxScore) || 10,
            correctCount: Number(data.correctCount) || 0,
            totalCount: Number(data.totalCount) || 0,
            timeSpent: Number(data.timeSpent) || 0,
          },
        };
      }
    } catch (err) {
      console.warn("[SocialMetadata] AdminDb error querying submission:", err);
    }
  }

  // REST API fallback
  const projectId = getProjectId();
  const apiKey = getFirebaseApiKey();
  try {
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/submissions/${encodeURIComponent(
      clean
    )}?key=${apiKey}`;
    const res = await fetch(docUrl, { headers: { Accept: "application/json" } });

    if (res.ok) {
      const doc = await res.json();
      if (doc && doc.fields) {
        const fields = doc.fields;
        return {
          found: true,
          submission: {
            id: clean,
            examId: getFirestoreString(fields.examId) || "",
            examTitle:
              getFirestoreString(fields.examTitleSnapshot) ||
              getFirestoreString(fields.examTitle) ||
              "Bài thi DkTEST",
            studentName:
              getFirestoreString(fields.studentNameSnapshot) ||
              getFirestoreString(fields.studentName) ||
              "Học sinh",
            studentClass:
              getFirestoreString(fields.studentClassSnapshot) ||
              getFirestoreString(fields.studentClass) ||
              undefined,
            score: getFirestoreNumber(fields.score) ?? 0,
            maxScore: getFirestoreNumber(fields.maxScore) ?? 10,
            correctCount: getFirestoreNumber(fields.correctCount) ?? 0,
            totalCount: getFirestoreNumber(fields.totalCount) ?? 0,
            timeSpent: getFirestoreNumber(fields.timeSpent) ?? 0,
          },
        };
      }
    }
  } catch (err) {
    console.error(`[SocialMetadata] Error fetching submission ${clean}:`, err);
  }

  return { found: false, submission: null };
}

// ---------------------------------------------------------------------------
// 4. Code Exam Metadata Fetcher
// ---------------------------------------------------------------------------
export async function fetchCodeExamMetadata(
  codeExamId: string
): Promise<{ found: boolean; codeExam: CodeExamMeta | null }> {
  if (!codeExamId || typeof codeExamId !== "string") {
    return { found: false, codeExam: null };
  }

  const clean = safeDecodeURIComponent(codeExamId).trim();

  if (adminDb) {
    try {
      const snap = await adminDb.collection("code_exams").doc(clean).get();
      if (snap.exists) {
        const data = snap.data() || {};
        return {
          found: true,
          codeExam: {
            id: snap.id,
            title: data.title || "Bài thi Lập trình DkTEST",
            description: data.description,
            timeLimit: data.timeLimit,
            language: data.language,
          },
        };
      }
    } catch (err) {
      console.warn("[SocialMetadata] AdminDb error querying code_exam:", err);
    }
  }

  const projectId = getProjectId();
  const apiKey = getFirebaseApiKey();
  try {
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/code_exams/${encodeURIComponent(
      clean
    )}?key=${apiKey}`;
    const res = await fetch(docUrl, { headers: { Accept: "application/json" } });

    if (res.ok) {
      const doc = await res.json();
      if (doc && doc.fields) {
        const fields = doc.fields;
        return {
          found: true,
          codeExam: {
            id: clean,
            title: getFirestoreString(fields.title) || "Bài thi Lập trình DkTEST",
            description: getFirestoreString(fields.description) || undefined,
            timeLimit: getFirestoreNumber(fields.timeLimit) ?? undefined,
            language: getFirestoreString(fields.language) || undefined,
          },
        };
      }
    }
  } catch (err) {
    console.error(`[SocialMetadata] Error fetching code_exam ${clean}:`, err);
  }

  return { found: false, codeExam: null };
}

// ---------------------------------------------------------------------------
// Text Formatting Utilities for Open Graph
// ---------------------------------------------------------------------------
function formatVoucherBenefit(voucher: VoucherMeta): string {
  const v = voucher.value || 0;
  switch (voucher.type) {
    case "gift_money":
      return `Tặng ngay ${v.toLocaleString("vi-VN")}đ vào ví học sinh DkTEST`;
    case "discount_fixed":
      return `Giảm ngay ${v.toLocaleString("vi-VN")}đ khi mở khóa đề thi`;
    case "discount_percent": {
      const cap = voucher.maxDiscountVnd
        ? ` (tối đa ${voucher.maxDiscountVnd.toLocaleString("vi-VN")}đ)`
        : "";
      return `Giảm ngay ${v}% khi mở khóa đề thi${cap}`;
    }
    case "deposit_bonus_fixed":
      return `Thưởng nạp +${v.toLocaleString("vi-VN")}đ khi nạp tiền vào ví`;
    case "deposit_bonus_percent":
      return `Thưởng nạp +${v}% giá trị khi nạp tiền vào ví`;
    default:
      return v > 0 ? `Ưu đãi ${v.toLocaleString("vi-VN")}đ` : "Ưu đãi đặc biệt";
  }
}

function formatVoucherExpiry(isoString?: string | null): string | null {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return null;
  }
}

function formatMinutes(seconds: number = 0): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} giây`;
  if (s === 0) return `${m} phút`;
  return `${m} phút ${s}s`;
}

// ---------------------------------------------------------------------------
// 5. Unified Social Metadata Resolver
// ---------------------------------------------------------------------------
export async function resolveSocialMetadataForUrl({
  url,
  baseUrl,
}: {
  url: string;
  baseUrl: string;
}): Promise<SocialMeta> {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url, cleanBaseUrl);
  } catch {
    parsedUrl = new URL("/", cleanBaseUrl);
  }

  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // Case 1: Voucher Links
  // Matches /voucher/:code, /vouchers/:code, /student/voucher/:code OR ?voucher=CODE / ?code=CODE / ?redeem=CODE
  const voucherPathMatch = pathname.match(
    /^\/(?:student\/)?vouchers?\/([^/?#]+)/i
  );
  const queryVoucherCode =
    searchParams.get("voucher") ||
    searchParams.get("code") ||
    searchParams.get("redeem");

  let rawCandidate = voucherPathMatch ? voucherPathMatch[1] : null;
  if (rawCandidate && /^[:$](?:code|1)$/i.test(rawCandidate.trim())) {
    rawCandidate = null;
  }

  let queryCandidate = queryVoucherCode;
  if (queryCandidate && /^[:$](?:code|1|voucher)$/i.test(queryCandidate.trim())) {
    queryCandidate = null;
  }

  const rawVoucherCode = rawCandidate
    ? rawCandidate
    : (pathname.includes("/wallet") || pathname.includes("/voucher")) && queryCandidate
    ? queryCandidate
    : null;

  const voucherCode = rawVoucherCode ? safeDecodeURIComponent(rawVoucherCode).trim() : null;

  if (voucherCode) {
    const { found, voucher } = await fetchVoucherMetadata(voucherCode);
    const codeUpper = voucherCode.trim().toUpperCase();

    // Preserve any extra query parameters (e.g. ?v=1, ?t=... for Zalo cache-busting)
    const extraParams = new URLSearchParams();
    searchParams.forEach((val, key) => {
      const kLower = key.toLowerCase();
      if (!["voucher", "code", "redeem", "path", "format"].includes(kLower)) {
        extraParams.append(key, val);
      }
    });
    const canonicalPath = pathname.includes("/voucher")
      ? `/voucher/${encodeURIComponent(codeUpper)}`
      : `/student/wallet?voucher=${encodeURIComponent(codeUpper)}`;
    const joiner = canonicalPath.includes("?") ? "&" : "?";
    const extraQueryStr = extraParams.toString() ? `${joiner}${extraParams.toString()}` : "";
    const canonicalUrl = `${cleanBaseUrl}${canonicalPath}${extraQueryStr}`;
    const imageUrl = `${cleanBaseUrl}/images/voucher-banner.jpg`;

    if (found && voucher) {
      const benefit = formatVoucherBenefit(voucher);
      const conditions: string[] = [];

      if (voucher.minOrderVnd && voucher.minOrderVnd > 0) {
        conditions.push(`Đơn tối thiểu ${voucher.minOrderVnd.toLocaleString("vi-VN")}đ`);
      }
      if (voucher.minDepositVnd && voucher.minDepositVnd > 0) {
        conditions.push(`Nạp tối thiểu ${voucher.minDepositVnd.toLocaleString("vi-VN")}đ`);
      }
      const exp = formatVoucherExpiry(voucher.expiresAt);
      if (exp) {
        conditions.push(`HSD: ${exp}`);
      }
      if (voucher.usageLimit && voucher.usageLimit > 0) {
        const remaining = Math.max(0, voucher.usageLimit - (voucher.usedCount || 0));
        conditions.push(`Còn ${remaining} lượt`);
      }

      const condText = conditions.length > 0 ? ` • Điều kiện: ${conditions.join(", ")}` : "";
      const customDesc = voucher.description ? ` • ${voucher.description.trim()}` : "";

      const isExpired = voucher.expiresAt ? new Date(voucher.expiresAt).getTime() < Date.now() : false;
      const isExhausted = Boolean(
        voucher.usageLimit && voucher.usageLimit > 0 && (voucher.usedCount || 0) >= voucher.usageLimit
      );
      const isInactive = voucher.isActive === false;

      let statusBadge = "";
      let statusNotice = "";
      if (isInactive) {
        statusBadge = "[Tạm dừng] ";
        statusNotice = " (Mã hiện đang tạm ngưng kích hoạt)";
      } else if (isExpired) {
        statusBadge = "[Đã hết hạn] ";
        statusNotice = " (Mã ưu đãi đã hết hạn sử dụng)";
      } else if (isExhausted) {
        statusBadge = "[Đã hết lượt] ";
        statusNotice = " (Mã ưu đãi đã hết lượt nhận)";
      }

      const cleanName = voucher.name ? voucher.name.trim() : "";
      const isNameSameAsCode =
        !cleanName ||
        cleanName.toUpperCase() === voucher.code ||
        cleanName.toUpperCase() === `VOUCHER ${voucher.code}`;

      let titleBody = "";
      if (isNameSameAsCode) {
        titleBody = `Mã Voucher ${voucher.code}`;
      } else if (cleanName.toLowerCase().startsWith("voucher ")) {
        titleBody = `${cleanName} (${voucher.code})`;
      } else {
        titleBody = `Mã Voucher ${voucher.code}: ${cleanName}`;
      }
      const title = `${statusBadge}🎫 ${titleBody} | DkTEST`;

      let actionCall = "Nhấn vào link để tự động kích hoạt và nhận ưu đãi trên DkTEST!";
      if (statusNotice) {
        actionCall = `Lưu ý:${statusNotice}.`;
      }
      const description = `Ưu đãi: ${benefit}${condText}${customDesc} • ${actionCall}`;

      return {
        contentType: "voucher",
        title,
        description,
        canonicalUrl,
        imageUrl,
        imageAlt: `Voucher ưu đãi DkTEST: ${voucher.code}`,
        imageWidth: 1200,
        imageHeight: 630,
        siteName: "DkTEST",
      };
    } else {
      // Voucher code present in URL but not found in Firestore
      return {
        contentType: "voucher",
        title: `🎫 Nhận Mã Ưu Đãi Voucher ${codeUpper} | DkTEST`,
        description: `Nhận ngay ưu đãi giảm giá và quà tặng khi áp dụng mã voucher ${codeUpper} trên DkTEST. Nhấn vào link để kích hoạt ưu đãi ngay!`,
        canonicalUrl,
        imageUrl,
        imageAlt: `Mã Voucher ${codeUpper}`,
        imageWidth: 1200,
        imageHeight: 630,
        siteName: "DkTEST",
      };
    }
  }

  // Case 2: Submission / Exam Result Links
  // Matches /student/exam/:examId/result/:submissionId, /student/exam/:examId/submissions/:submissionId,
  // /exam/:examId/result/:submissionId, /parent/exams/:examId/submissions/:submissionId,
  // /admin/exams/:examId/submissions/:submissionId
  const resultMatch = pathname.match(
    /^\/(?:student\/exam|exam|(?:parent|admin)\/exams)\/([^/]+)\/(?:result|submissions)\/([^/?#]+)/i
  );
  if (resultMatch) {
    const examId = safeDecodeURIComponent(resultMatch[1]);
    const submissionId = safeDecodeURIComponent(resultMatch[2]);
    const { found, submission } = await fetchSubmissionMetadata(submissionId);
    const canonicalUrl = `${cleanBaseUrl}/student/exam/${encodeURIComponent(examId)}/result/${encodeURIComponent(submissionId)}`;
    const imageUrl = `${cleanBaseUrl}/images/result-banner.jpg`;

    if (found && submission) {
      const durationStr = formatMinutes(submission.timeSpent);
      const studentClassStr = submission.studentClass ? ` (${submission.studentClass})` : "";
      const title = `🏆 Kết quả: ${submission.examTitle} - ${submission.score}/${submission.maxScore} điểm | DkTEST`;
      const description = `Thí sinh: ${submission.studentName}${studentClassStr} • Đạt ${submission.score}/${submission.maxScore} điểm (${submission.correctCount}/${submission.totalCount} câu đúng) • Thời gian làm bài: ${durationStr}. Nhấn để xem chi tiết bảng điểm và lời giải trên DkTEST!`;

      return {
        contentType: "submission",
        title,
        description,
        canonicalUrl,
        imageUrl,
        imageAlt: `Kết quả bài thi ${submission.examTitle}`,
        imageWidth: 1200,
        imageHeight: 630,
        siteName: "DkTEST",
      };
    } else {
      return {
        contentType: "submission",
        title: `🏆 Kết Quả Bài Làm Thi Trực Tuyến | DkTEST`,
        description: `Xem chi tiết kết quả làm bài, phân tích điểm số và lời giải bài kiểm tra trực tuyến trên DkTEST.`,
        canonicalUrl,
        imageUrl,
        imageAlt: "Kết quả bài thi DkTEST",
        imageWidth: 1200,
        imageHeight: 630,
        siteName: "DkTEST",
      };
    }
  }

  // Case 3: Code Exam Sandbox Links
  // Matches /code-exam/:id or /code-exam/edit/:id
  const codeExamMatch = pathname.match(/^\/code-exam(?:\/edit)?\/([^/?#]+)/i);
  if (codeExamMatch && codeExamMatch[1] !== "new") {
    const codeExamId = safeDecodeURIComponent(codeExamMatch[1]);
    const { found, codeExam } = await fetchCodeExamMetadata(codeExamId);
    const canonicalUrl = `${cleanBaseUrl}/code-exam/${encodeURIComponent(codeExamId)}`;
    const imageUrl = `${cleanBaseUrl}/logo.png`;

    if (found && codeExam) {
      const title = `💻 ${codeExam.title} - Phòng Thi Lập Trình | DkTEST`;
      const durationStr = codeExam.timeLimit ? `Thời gian: ${codeExam.timeLimit} phút • ` : "";
      const desc = codeExam.description
        ? `${durationStr}${codeExam.description.trim()}`
        : `${durationStr}Phòng thi thực hành lập trình trực tuyến trên DkTEST Sandbox. Viết code, chạy test case và chấm điểm tự động!`;

      return {
        contentType: "code_exam",
        title,
        description: desc,
        canonicalUrl,
        imageUrl,
        imageAlt: codeExam.title,
        imageWidth: 600,
        imageHeight: 600,
        siteName: "DkTEST",
      };
    } else {
      return {
        contentType: "code_exam",
        title: `💻 Phòng Thi Lập Trình & Sandbox Trực Tuyến | DkTEST`,
        description: `Tham gia làm bài thi lập trình trực tuyến trên DkTEST. Hỗ trợ đa ngôn ngữ, chấm điểm tự động theo test case chuẩn.`,
        canonicalUrl,
        imageUrl,
        imageAlt: "Phòng thi lập trình DkTEST",
        imageWidth: 600,
        imageHeight: 600,
        siteName: "DkTEST",
      };
    }
  }

  // Case 4: Exam Links
  // Matches /student/exam/:examId, /exam/:examId, /parent/exams/:examId, /admin/exams/:examId
  const isTakeMode = /\/take\/?$/i.test(pathname);
  const examMatch = pathname.match(
    /^\/(?:student\/exam|exam|(?:parent|admin)\/exams)\/([^/?#]+)/i
  );
  if (
    examMatch &&
    !pathname.includes("/result") &&
    !pathname.includes("/submissions")
  ) {
    const rawExamId = safeDecodeURIComponent(examMatch[1]);
    const isSpecialSubpath = [
      "new",
      "import-word",
      "import-prompt",
      "web-importer",
      "stats",
    ].includes(rawExamId);

    if (!isSpecialSubpath) {
      const { found, exam } = await fetchExamMetadata(rawExamId);
      const canonicalUrl = isTakeMode
        ? `${cleanBaseUrl}/student/exam/${encodeURIComponent(rawExamId)}/take`
        : `${cleanBaseUrl}/student/exam/${encodeURIComponent(rawExamId)}`;

      if (found && exam) {
        const parts: string[] = [];
        if (exam.subject) parts.push(`📚 Môn: ${exam.subject}`);
        if (exam.gradeCategory) parts.push(`🎓 ${exam.gradeCategory}`);
        if (exam.isUnlimitedTime) {
          parts.push("⏱️ Không giới hạn thời gian");
        } else if (exam.timeLimit) {
          parts.push(`⏱️ Thời gian: ${exam.timeLimit} phút`);
        }
        if (exam.questionCount) parts.push(`❓ Số lượng: ${exam.questionCount} câu`);
        if (exam.code) parts.push(`🏷️ Mã đề: ${exam.code}`);
        if (exam.accessMode === "paid" && exam.priceVnd && exam.priceVnd > 0) {
          parts.push(`💰 Phí: ${exam.priceVnd.toLocaleString("vi-VN")}đ`);
        } else if (exam.accessMode === "free") {
          parts.push("🎁 Miễn phí");
        }

        let desc = parts.join(" • ");
        if (exam.description && exam.description.trim()) {
          desc = desc ? `${desc} — ${exam.description.trim()}` : exam.description.trim();
        }
        if (!desc) {
          desc = "Tham gia bài kiểm tra trực tuyến chất lượng cao trên DkTEST.";
        }

        const rawExamTitle = exam.title.trim();
        let title = "";
        if (isTakeMode) {
          title = `🚀 Vào Thi Ngay: ${rawExamTitle} | DkTEST`;
          desc = `${desc} • Nhấn vào link để bắt đầu làm bài thi trực tuyến ngay!`;
        } else if (rawExamTitle.toLowerCase().includes("dktest")) {
          title = rawExamTitle;
        } else {
          title = `📝 ${rawExamTitle} | DkTEST`;
        }

        const imageUrl = exam.imageUrl || `${cleanBaseUrl}/logo.png`;

        return {
          contentType: "exam",
          title,
          description: desc,
          canonicalUrl,
          imageUrl,
          imageAlt: exam.title,
          imageWidth: 1200,
          imageHeight: 630,
          siteName: "DkTEST",
        };
      } else {
        return {
          contentType: "exam",
          title: "📝 DkTEST - Bài Kiểm Tra Trực Tuyến",
          description: "Tham gia bài kiểm tra và luyện thi trực tuyến thông minh trên DkTEST.",
          canonicalUrl,
          imageUrl: `${cleanBaseUrl}/logo.png`,
          imageAlt: "DkTEST Bài kiểm tra",
          imageWidth: 600,
          imageHeight: 600,
          siteName: "DkTEST",
        };
      }
    }
  }

  // Case 5: Dedicated Sub-pages
  if (pathname.includes("/wallet") || pathname.includes("/voucher")) {
    const isVoucherPage = pathname.includes("/voucher");
    const extraParams = new URLSearchParams();
    searchParams.forEach((val, key) => {
      const kLower = key.toLowerCase();
      if (!["voucher", "code", "redeem", "path", "format"].includes(kLower)) {
        extraParams.append(key, val);
      }
    });
    const extraQueryStr = extraParams.toString() ? `?${extraParams.toString()}` : "";
    const canonicalBase = isVoucherPage ? `${cleanBaseUrl}/voucher` : `${cleanBaseUrl}/student/wallet`;
    return {
      contentType: "page",
      title: isVoucherPage
        ? "🎁 Nhập Mã Voucher & Quà Tặng | DkTEST"
        : "💳 Ví Điện Tử DkTEST - Nạp Tiền & Mở Khóa Đề Thi",
      description: isVoucherPage
        ? "Nhập mã voucher ưu đãi để nhận quà tặng vào ví hoặc giảm giá mở khóa bài thi trực tuyến trên DkTEST."
        : "Quản lý số dư, nạp tiền nhanh chóng qua QR chuyển khoản hoặc tiền mặt, nhận mã ưu đãi voucher và mở khóa đề thi trên DkTEST.",
      canonicalUrl: `${canonicalBase}${extraQueryStr}`,
      imageUrl: `${cleanBaseUrl}/images/voucher-banner.jpg`,
      imageAlt: isVoucherPage ? "Nhập mã Voucher DkTEST" : "Ví điện tử DkTEST",
      imageWidth: 1200,
      imageHeight: 630,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/journey")) {
    return {
      contentType: "page",
      title: "🗺️ Bản Đồ Hành Trình Học Tập - DkTEST",
      description: "Chinh phục các chặng đua kiến thức, mở khóa thú cưng trợ thủ và tích lũy huy hiệu học tập đỉnh cao cùng bạn bè!",
      canonicalUrl: `${cleanBaseUrl}/student/journey`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Bản đồ hành trình DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/escape-room")) {
    return {
      contentType: "page",
      title: "🔐 Thử Thách Phòng Mật Mã (Escape Room) - DkTEST",
      description: "Giải cứu căn phòng bí mật bằng kiến thức! Thử thách giải câu đố tư duy logic nghẹt thở theo nhóm trực tuyến.",
      canonicalUrl: `${cleanBaseUrl}/student/escape-room`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Escape Room DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/practice")) {
    return {
      contentType: "page",
      title: "🎯 Luyện Thi & Củng Cố Kiến Thức Thông Minh - DkTEST",
      description: "Kho hàng ngàn câu hỏi trắc nghiệm chuẩn cấu trúc Bộ GD&ĐT, ôn luyện phân loại theo chuyên đề và mức độ nhận thức.",
      canonicalUrl: `${cleanBaseUrl}/student/practice`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Luyện thi DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/community")) {
    return {
      contentType: "page",
      title: "👥 Cộng Đồng Học Tập & Thảo Luận - DkTEST",
      description: "Giao lưu, hỏi đáp bài tập khó và chia sẻ kinh nghiệm học tập cùng hàng ngàn học sinh và giáo viên trên cả nước.",
      canonicalUrl: `${cleanBaseUrl}/student/community`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Cộng đồng DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/ai-tutor")) {
    return {
      contentType: "page",
      title: "🤖 Gia Sư AI 24/7 - Hỏi Đáp & Giải Bài Tập Tức Thì | DkTEST",
      description: "Trợ lý học tập thông minh AI hỗ trợ giải thích chi tiết từng bước, gợi ý phương pháp giải toán, lý, hóa, văn, anh và mọi môn học.",
      canonicalUrl: `${cleanBaseUrl}/student/ai-tutor`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Gia sư AI DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/history")) {
    return {
      contentType: "page",
      title: "📊 Lịch Sử Làm Bài & Bảng Điểm Cá Nhân - DkTEST",
      description: "Xem lại toàn bộ lịch sử các bài thi đã làm, theo dõi biểu đồ tiến bộ điểm số và phân tích lỗ hổng kiến thức trên DkTEST.",
      canonicalUrl: `${cleanBaseUrl}/student/history`,
      imageUrl: `${cleanBaseUrl}/images/result-banner.jpg`,
      imageAlt: "Lịch sử làm bài DkTEST",
      imageWidth: 1200,
      imageHeight: 630,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/profile")) {
    return {
      contentType: "page",
      title: "👤 Hồ Sơ Học Sinh & Thông Tin Cá Nhân - DkTEST",
      description: "Quản lý thông tin tài khoản học sinh, lớp học, danh hiệu và thiết lập bảo mật trên hệ thống DkTEST.",
      canonicalUrl: `${cleanBaseUrl}/student/profile`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Hồ sơ cá nhân DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/tutorial")) {
    return {
      contentType: "page",
      title: "🎯 Bài Thi Trải Nghiệm & Hướng Dẫn Thí Sinh - DkTEST",
      description: "Làm quen với giao diện phòng thi trực tuyến DkTEST, thao tác chọn đáp án, nộp bài và các tính năng chống gian lận thông minh.",
      canonicalUrl: `${cleanBaseUrl}/student/tutorial/exam`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Hướng dẫn làm bài thi DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.startsWith("/parent/exams")) {
    return {
      contentType: "page",
      title: "📚 Quản Lý Đề Thi - Cổng Phụ Huynh | DkTEST",
      description: "Tạo đề thi mới, nhập đề từ Word hoặc AI và quản lý danh sách đề thi trực tuyến cho con em trên DkTEST.",
      canonicalUrl: `${cleanBaseUrl}/parent/exams`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Quản lý đề thi phụ huynh DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/exams") || pathname === "/exam") {
    return {
      contentType: "page",
      title: "📚 Ngân Hàng Đề Thi & Khảo Thí Trực Tuyến - DkTEST",
      description: "Khám phá kho đề thi trắc nghiệm các môn Toán, Lý, Hóa, Sinh, Sử, Địa, GDCD, Tiếng Anh, Tin học từ lớp 1 đến lớp 12 chuẩn Bộ GD&ĐT.",
      canonicalUrl: `${cleanBaseUrl}/exams`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Ngân hàng đề thi DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/login")) {
    return {
      contentType: "page",
      title: "🔑 Đăng Nhập Hệ Thống Thi Trực Tuyến DkTEST",
      description: "Đăng nhập tài khoản DkTEST để tham gia làm bài thi, xem kết quả, nạp ví và nhận các mã ưu đãi đặc quyền.",
      canonicalUrl: `${cleanBaseUrl}/login`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Đăng nhập DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/register")) {
    return {
      contentType: "page",
      title: "✨ Đăng Ký Tài Khoản Học Sinh & Phụ Huynh - DkTEST",
      description: "Tạo tài khoản miễn phí trên DkTEST để trải nghiệm luyện thi trực tuyến thông minh, làm bài thi thử và nhận quà tặng chào mừng.",
      canonicalUrl: `${cleanBaseUrl}/register`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Đăng ký tài khoản DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/parent")) {
    return {
      contentType: "page",
      title: "👨‍👩‍👧 Cổng Phụ Huynh - Đồng Hành Cùng Con - DkTEST",
      description: "Theo dõi kết quả học tập, điểm số bài thi trực tuyến và tiến độ rèn luyện của con em mọi lúc, mọi nơi trên DkTEST.",
      canonicalUrl: `${cleanBaseUrl}/parent/dashboard`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Cổng thông tin phụ huynh DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.includes("/legal-policy") || pathname.includes("/policy") || pathname.includes("/terms")) {
    return {
      contentType: "page",
      title: "📜 Điều Khoản Dịch Vụ & Chính Sách Bảo Mật - DkTEST",
      description: "Tìm hiểu các điều khoản sử dụng nền tảng, cam kết bảo mật thông tin và chính sách khảo thí minh bạch của DkTEST.",
      canonicalUrl: `${cleanBaseUrl}/legal-policy`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Chính sách DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  if (pathname.startsWith("/admin")) {
    return {
      contentType: "page",
      title: "⚙️ Bảng Điều Khiển Quản Trị Hệ Thống - DkTEST",
      description: "Hệ thống quản lý đề thi, ngân hàng câu hỏi, lớp học, học sinh, giám sát thi trực tuyến và quản trị ví DkTEST.",
      canonicalUrl: `${cleanBaseUrl}/admin`,
      imageUrl: `${cleanBaseUrl}/logo.png`,
      imageAlt: "Quản trị DkTEST",
      imageWidth: 600,
      imageHeight: 600,
      siteName: "DkTEST",
    };
  }

  // Fallback / Home
  return {
    contentType: "page",
    title: "DkTEST - Nền Tảng Khảo Thí & Luyện Thi Trực Tuyến Thông Minh",
    description: "Tạo đề thi tự động bằng AI, tổ chức thi trực tuyến bảo mật chống gian lận, chấm điểm và phân tích phổ điểm tức thì.",
    canonicalUrl: `${cleanBaseUrl}${pathname}`,
    imageUrl: `${cleanBaseUrl}/logo.png`,
    imageAlt: "DkTEST Nền tảng thi trực tuyến",
    imageWidth: 600,
    imageHeight: 600,
    siteName: "DkTEST",
  };
}

// ---------------------------------------------------------------------------
// 6. Meta Tags HTML Builder
// ---------------------------------------------------------------------------
export function buildSocialMetaTags(meta: SocialMeta): {
  escapedTitle: string;
  escapedDescription: string;
  metaTagsHtml: string;
} {
  const escapedTitle = escapeHtml(meta.title);
  const escapedDescription = escapeHtml(meta.description);
  const escapedUrl = escapeHtml(meta.canonicalUrl);
  const escapedImage = escapeHtml(meta.imageUrl);
  const escapedSiteName = escapeHtml(meta.siteName || "DkTEST");
  const escapedAlt = escapeHtml(meta.imageAlt || meta.title);

  const tags: string[] = [
    `<meta name="description" content="${escapedDescription}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapedSiteName}">`,
    `<meta property="og:title" content="${escapedTitle}">`,
    `<meta property="og:description" content="${escapedDescription}">`,
    `<meta property="og:url" content="${escapedUrl}">`,
    `<meta property="og:image" content="${escapedImage}">`,
  ];

  if (meta.imageUrl.startsWith("https://")) {
    tags.push(`<meta property="og:image:secure_url" content="${escapedImage}">`);
  }

  if (meta.imageUrl.endsWith(".jpg") || meta.imageUrl.endsWith(".jpeg")) {
    tags.push(`<meta property="og:image:type" content="image/jpeg">`);
  } else if (meta.imageUrl.endsWith(".png")) {
    tags.push(`<meta property="og:image:type" content="image/png">`);
  }

  tags.push(`<meta property="og:image:alt" content="${escapedAlt}">`);

  if (meta.imageWidth) {
    tags.push(`<meta property="og:image:width" content="${meta.imageWidth}">`);
  }
  if (meta.imageHeight) {
    tags.push(`<meta property="og:image:height" content="${meta.imageHeight}">`);
  }

  tags.push(
    `<meta property="og:locale" content="vi_VN">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapedTitle}">`,
    `<meta name="twitter:description" content="${escapedDescription}">`,
    `<meta name="twitter:image" content="${escapedImage}">`,
    `<link rel="canonical" href="${escapedUrl}">`
  );

  return {
    escapedTitle,
    escapedDescription,
    metaTagsHtml: tags.join("\n    "),
  };
}

// ---------------------------------------------------------------------------
// 7. Inject Meta Tags into HTML Template
// ---------------------------------------------------------------------------
export function injectSocialMetaIntoHtml(
  templateHtml: string,
  metaInfo: {
    escapedTitle: string;
    escapedDescription: string;
    metaTagsHtml: string;
  }
): string {
  let html = templateHtml;

  // Replace <title>...</title>
  html = html.replace(
    /<title>.*?<\/title>/is,
    `<title>${metaInfo.escapedTitle}</title>`
  );

  // Remove existing static meta description, og:*, twitter:*, canonical tags to prevent duplicates
  html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, "");
  html = html.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "");
  html = html.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "");
  html = html.replace(/<meta\s+property=["']twitter:[^"']+["'][^>]*>/gi, "");
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");

  // Inject dynamic tags right after <title>...</title> or before </head>
  if (html.includes("</title>")) {
    html = html.replace("</title>", `</title>\n    ${metaInfo.metaTagsHtml}`);
  } else if (html.includes("</head>")) {
    html = html.replace(
      "</head>",
      `    <title>${metaInfo.escapedTitle}</title>\n    ${metaInfo.metaTagsHtml}\n  </head>`
    );
  }

  return html;
}

export function getFallbackBaseHtml(isDev: boolean = false): string {
  if (!isDev && PRODUCTION_HTML_TEMPLATE) {
    return PRODUCTION_HTML_TEMPLATE;
  }
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0f172a" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/favicon.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

// ---------------------------------------------------------------------------
// 8. Complete Dynamic Page Renderer
// ---------------------------------------------------------------------------
export async function renderSocialPageHtml({
  url,
  baseUrl,
  isDev = false,
  customTemplate,
}: {
  url: string;
  baseUrl: string;
  isDev?: boolean;
  customTemplate?: string;
}): Promise<{
  html: string;
  status: number;
  meta: SocialMeta;
}> {
  const meta = await resolveSocialMetadataForUrl({ url, baseUrl });
  const metaInfo = buildSocialMetaTags(meta);

  let rawTemplate = customTemplate || "";

  if (!rawTemplate) {
    if (!isDev) {
      const distIndexPath = path.join(process.cwd(), "dist", "index.html");
      if (fs.existsSync(distIndexPath)) {
        try {
          rawTemplate = fs.readFileSync(distIndexPath, "utf-8");
        } catch {
          rawTemplate = PRODUCTION_HTML_TEMPLATE;
        }
      } else {
        rawTemplate = PRODUCTION_HTML_TEMPLATE;
      }
    } else {
      const rootIndexPath = path.join(process.cwd(), "index.html");
      if (fs.existsSync(rootIndexPath)) {
        try {
          rawTemplate = fs.readFileSync(rootIndexPath, "utf-8");
        } catch {}
      }
      if (!rawTemplate) {
        rawTemplate = getFallbackBaseHtml(true);
      }
    }
  }

  if (!rawTemplate) {
    rawTemplate = getFallbackBaseHtml(isDev);
  }

  const finalHtml = injectSocialMetaIntoHtml(rawTemplate, metaInfo);

  return {
    html: finalHtml,
    status: 200,
    meta,
  };
}
