import { api } from "./apiClient";
import { APP_LINK_ORIGIN } from "./appLinks";
import { isNativeAndroid } from "./offline/sync";
import {
  DOCUMENT_CATEGORY_META,
  DOCUMENT_GRADE_META,
  DOCUMENT_SUBJECT_META,
  expandCompactSeedDocument,
  type DocumentAccessCheckResult,
  type DocumentAuthorizedContent,
  type DocumentCategoryKey,
  type DocumentEntitlement,
  type DocumentGradeKey,
  type DocumentLibrarySettings,
  type DocumentSeedBundle,
  type DocumentStatus,
  type DocumentSubjectKey,
  type LibraryDocument,
} from "../types/documentLibrary";

export interface IndexedLibraryDocument extends LibraryDocument {
  _searchKey: string;
}

export interface DocumentFilterQuery {
  search?: string;
  grade?: DocumentGradeKey | "all";
  subject?: DocumentSubjectKey | "all";
  category?: DocumentCategoryKey | "all";
  priceFilter?: "all" | "free" | "paid";
  sourceFilter?: "all" | "seed" | "admin" | "community";
  sortBy?: "newest" | "featured" | "price_asc" | "title_asc";
}

const SAVED_DOCS_STORAGE_KEY = "dktest:saved_document_ids";
const LIVE_CACHE_TTL_MS = 30 * 1000;

let seedDocumentsPromise: Promise<LibraryDocument[]> | null = null;
let liveOverlayCache: {
  items: LibraryDocument[];
  settings?: Partial<DocumentLibrarySettings>;
  timestamp: number;
} | null = null;

export function normalizeVietnameseSearchText(input: string): string {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchKey(doc: LibraryDocument): string {
  const gradeLabel = DOCUMENT_GRADE_META[doc.grade]?.label || "";
  const subjLabel = DOCUMENT_SUBJECT_META[doc.subject]?.label || "";
  const catLabel = DOCUMENT_CATEGORY_META[doc.category]?.label || "";
  return normalizeVietnameseSearchText(
    [
      doc.title,
      doc.description,
      gradeLabel,
      subjLabel,
      catLabel,
      doc.authorName,
      doc.sourceName,
      ...(doc.tags || []),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function getDocumentCoverFallbackUrl(subject: DocumentSubjectKey): string {
  const bannerKey = DOCUMENT_SUBJECT_META[subject]?.bannerKey || "default";
  return `/images/documents/${bannerKey}.jpg`;
}

export function buildDocumentShareUrl(docId?: string): string {
  const origin =
    typeof window !== "undefined" &&
    !isNativeAndroid() &&
    window.location.origin.startsWith("http") &&
    !window.location.origin.includes("localhost")
      ? window.location.origin
      : APP_LINK_ORIGIN;

  if (!docId) return `${origin}/documents`;
  return `${origin}/documents/${encodeURIComponent(docId)}`;
}

async function loadStaticSeedDocuments(): Promise<LibraryDocument[]> {
  if (seedDocumentsPromise) return seedDocumentsPromise;

  seedDocumentsPromise = (async () => {
    try {
      const res = await fetch("/data/document-library-seed.json");
      if (!res.ok) return [];
      const bundle = (await res.json()) as DocumentSeedBundle;
      if (!Array.isArray(bundle?.items)) return [];
      return bundle.items.map(expandCompactSeedDocument);
    } catch (err) {
      console.warn("[documentLibraryClient] Không thể nạp gói seed tĩnh:", err);
      return [];
    }
  })();

  return seedDocumentsPromise;
}

export function invalidateClientDocumentCache(): void {
  liveOverlayCache = null;
}

/**
 * Loads the complete merged Document Repository:
 * - 4,180+ pre-populated documents from static CDN (`0` Firestore reads)
 * - Live Admin & Community uploads + overrides from server-cached `/api/documents/live`
 */
export async function getCatalogDocuments(options: { forceRefresh?: boolean } = {}): Promise<{
  documents: IndexedLibraryDocument[];
  settings: {
    autoApproveUserUploads: boolean;
    creatorRevenueSharePercent: number;
    maxUserPriceVnd: number;
  };
}> {
  const shouldFetchLive =
    options.forceRefresh ||
    !liveOverlayCache ||
    Date.now() - liveOverlayCache.timestamp > LIVE_CACHE_TTL_MS;

  const livePromise = shouldFetchLive
    ? api
        .get<{
          success: boolean;
          items: LibraryDocument[];
          settings?: Partial<DocumentLibrarySettings>;
        }>("/api/documents/live")
        .then((res) => {
          const next = {
            items: Array.isArray(res?.items) ? res.items : [],
            settings: res?.settings,
            timestamp: Date.now(),
          };
          liveOverlayCache = next;
          return next;
        })
        .catch(() => liveOverlayCache || { items: [], settings: undefined, timestamp: Date.now() })
    : Promise.resolve(liveOverlayCache!);

  const [seedDocs, liveData] = await Promise.all([loadStaticSeedDocuments(), livePromise]);

  const overrideMap = new Map<string, LibraryDocument>();
  for (const item of liveData.items) {
    if (item?.id) overrideMap.set(item.id, item);
  }

  const merged: IndexedLibraryDocument[] = [];
  const seenIds = new Set<string>();

  // 1. Add published live uploads & overrides first so new uploads appear prominently
  for (const liveDoc of liveData.items) {
    if (!liveDoc?.id) continue;
    seenIds.add(liveDoc.id);
    if (liveDoc.status !== "published") continue;
    merged.push({
      ...liveDoc,
      _searchKey: buildSearchKey(liveDoc),
    });
  }

  // 2. Add static seed documents (unless overridden or hidden by Admin)
  for (const seedDoc of seedDocs) {
    if (seenIds.has(seedDoc.id)) continue;
    const override = overrideMap.get(seedDoc.id);
    if (override && override.status === "hidden") continue;
    merged.push({
      ...seedDoc,
      _searchKey: buildSearchKey(seedDoc),
    });
  }

  return {
    documents: merged,
    settings: {
      autoApproveUserUploads: liveData.settings?.autoApproveUserUploads ?? true,
      creatorRevenueSharePercent: liveData.settings?.creatorRevenueSharePercent ?? 80,
      maxUserPriceVnd: liveData.settings?.maxUserPriceVnd ?? 500000,
    },
  };
}

export function filterAndSortDocuments(
  allDocs: IndexedLibraryDocument[],
  query: DocumentFilterQuery
): {
  items: IndexedLibraryDocument[];
  gradeCounts: Record<string, number>;
  subjectCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
} {
  const tokens = normalizeVietnameseSearchText(query.search || "")
    .split(" ")
    .filter(Boolean);
  const grade = query.grade || "all";
  const subject = query.subject || "all";
  const category = query.category || "all";
  const priceFilter = query.priceFilter || "all";
  const sourceFilter = query.sourceFilter || "all";
  const sortBy = query.sortBy || "newest";

  const gradeCounts: Record<string, number> = { all: 0 };
  const subjectCounts: Record<string, number> = { all: 0 };
  const categoryCounts: Record<string, number> = { all: 0 };

  const matched: IndexedLibraryDocument[] = [];

  for (const doc of allDocs) {
    // 1. Check text search + price + source first
    if (tokens.length > 0) {
      let allMatch = true;
      for (const tk of tokens) {
        if (!doc._searchKey.includes(tk)) {
          allMatch = false;
          break;
        }
      }
      if (!allMatch) continue;
    }

    const isPaid = doc.accessMode === "paid" && doc.priceVnd > 0;
    if (priceFilter === "free" && isPaid) continue;
    if (priceFilter === "paid" && !isPaid) continue;
    if (sourceFilter !== "all" && doc.authorRole !== sourceFilter) continue;

    // Accumulate cross-facet counts cleanly
    const matchesSubject = subject === "all" || doc.subject === subject;
    const matchesCategory = category === "all" || doc.category === category;
    const matchesGrade = grade === "all" || doc.grade === grade;

    if (matchesSubject && matchesCategory) {
      gradeCounts.all++;
      gradeCounts[doc.grade] = (gradeCounts[doc.grade] || 0) + 1;
    }
    if (matchesGrade && matchesCategory) {
      subjectCounts.all++;
      subjectCounts[doc.subject] = (subjectCounts[doc.subject] || 0) + 1;
    }
    if (matchesGrade && matchesSubject) {
      categoryCounts.all++;
      categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1;
    }

    if (matchesGrade && matchesSubject && matchesCategory) {
      matched.push(doc);
    }
  }

  // Sort results
  matched.sort((a, b) => {
    if (sortBy === "featured") {
      const af = a.isFeatured ? 1 : 0;
      const bf = b.isFeatured ? 1 : 0;
      if (bf !== af) return bf - af;
      const aLive = a.authorRole !== "seed" ? 1 : 0;
      const bLive = b.authorRole !== "seed" ? 1 : 0;
      if (bLive !== aLive) return bLive - aLive;
    } else if (sortBy === "price_asc") {
      if (a.priceVnd !== b.priceVnd) return a.priceVnd - b.priceVnd;
    } else if (sortBy === "title_asc") {
      return a.title.localeCompare(b.title, "vi");
    }

    // Featured & fresh live uploads gently prioritized at identical dates
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return String(b.publishedAt || b.createdAt || "").localeCompare(
      String(a.publishedAt || a.createdAt || "")
    );
  });

  return {
    items: matched,
    gradeCounts,
    subjectCounts,
    categoryCounts,
  };
}

// ---------------------------------------------------------------------------
// Local Bookmarks (0 Firestore reads/writes)
// ---------------------------------------------------------------------------
export function getSavedDocumentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_DOCS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toggleSavedDocumentId(docId: string): { saved: boolean; ids: string[] } {
  const current = getSavedDocumentIds();
  const exists = current.includes(docId);
  const next = exists ? current.filter((x) => x !== docId) : [docId, ...current];
  try {
    localStorage.setItem(SAVED_DOCS_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return { saved: !exists, ids: next };
}

// ---------------------------------------------------------------------------
// Single Document Lookup & Authenticated Actions
// ---------------------------------------------------------------------------
export async function getSingleDocumentClient(docId: string): Promise<LibraryDocument | null> {
  const clean = String(docId || "").trim();
  if (!clean) return null;

  // Check local merged catalog first if already warm (0 extra requests!)
  try {
    const { documents } = await getCatalogDocuments();
    const found = documents.find((d) => d.id === clean);
    if (found) return found;
  } catch {}

  const res = await api.get<{ success: boolean; document: LibraryDocument }>(
    `/api/documents/${encodeURIComponent(clean)}`
  );
  return res?.document || null;
}

export async function getMyDocumentLibraryState(): Promise<{
  uploaded: LibraryDocument[];
  unlockedIds: string[];
  settings: DocumentLibrarySettings;
}> {
  const res = await api.get<{
    success: boolean;
    uploaded: LibraryDocument[];
    unlockedIds: string[];
    settings: DocumentLibrarySettings;
  }>("/api/documents/me");
  return {
    uploaded: res.uploaded || [],
    unlockedIds: res.unlockedIds || [],
    settings: res.settings,
  };
}

export async function saveUserDocumentClient(
  payload: Record<string, any>,
  existingId?: string
): Promise<{ document: LibraryDocument; message: string }> {
  const res = existingId
    ? await api.patch<{ success: boolean; document: LibraryDocument; message: string }>(
        `/api/documents/${encodeURIComponent(existingId)}`,
        payload
      )
    : await api.post<{ success: boolean; document: LibraryDocument; message: string }>(
        "/api/documents",
        payload
      );
  invalidateClientDocumentCache();
  return { document: res.document, message: res.message };
}

export async function deleteUserDocumentClient(docId: string): Promise<void> {
  await api.delete(`/api/documents/${encodeURIComponent(docId)}`);
  invalidateClientDocumentCache();
}

export async function checkDocumentAccessClient(docId: string): Promise<DocumentAccessCheckResult> {
  const res = await api.get<{ success: boolean; access: DocumentAccessCheckResult }>(
    `/api/documents/${encodeURIComponent(docId)}/access`
  );
  return res.access;
}

export async function getAuthorizedDocumentContentClient(
  docId: string
): Promise<DocumentAuthorizedContent> {
  const res = await api.get<{ success: boolean; content: DocumentAuthorizedContent }>(
    `/api/documents/${encodeURIComponent(docId)}/content`
  );
  return res.content;
}

export async function unlockDocumentClient(
  docId: string,
  options: { voucherCode?: string; idempotencyKey?: string } = {}
): Promise<{
  alreadyUnlocked: boolean;
  newBalanceVnd: number;
  entitlement: DocumentEntitlement;
  discountVnd: number;
  finalPriceVnd: number;
  message: string;
}> {
  const res = await api.post<any>(`/api/documents/${encodeURIComponent(docId)}/unlock`, {
    voucherCode: options.voucherCode,
    idempotencyKey: options.idempotencyKey || `unlock_doc_${docId}_${Date.now()}`,
  });
  invalidateClientDocumentCache();
  return res;
}

// ---------------------------------------------------------------------------
// Admin Client Helpers
// ---------------------------------------------------------------------------
export async function getAdminDocumentsOverviewClient(): Promise<{
  documents: LibraryDocument[];
  settings: DocumentLibrarySettings;
  purchases: DocumentEntitlement[];
}> {
  return await api.get("/api/admin/documents");
}

export async function saveAdminDocumentClient(
  payload: Record<string, any>
): Promise<{ document: LibraryDocument; message: string }> {
  const res = await api.post<{ document: LibraryDocument; message: string }>(
    "/api/admin/documents",
    payload
  );
  invalidateClientDocumentCache();
  return res;
}

export async function moderateAdminDocumentClient(
  docId: string,
  patch: {
    status?: DocumentStatus;
    rejectionReason?: string;
    isFeatured?: boolean;
    priceVnd?: number;
    accessMode?: "free" | "paid";
  }
): Promise<{ document: LibraryDocument; message: string }> {
  const res = await api.patch<{ document: LibraryDocument; message: string }>(
    `/api/admin/documents/${encodeURIComponent(docId)}/moderate`,
    patch
  );
  invalidateClientDocumentCache();
  return res;
}

export async function deleteAdminDocumentClient(docId: string): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(
    `/api/admin/documents/${encodeURIComponent(docId)}`
  );
  invalidateClientDocumentCache();
  return res;
}

export async function updateAdminDocumentSettingsClient(
  patch: Partial<DocumentLibrarySettings>
): Promise<{ settings: DocumentLibrarySettings; message: string }> {
  const res = await api.patch<{ settings: DocumentLibrarySettings; message: string }>(
    "/api/admin/documents/settings",
    patch
  );
  invalidateClientDocumentCache();
  return res;
}

export async function grantOrRevokeAdminDocumentEntitlementClient(params: {
  uid: string;
  docId: string;
  action: "grant" | "revoke";
}): Promise<{ entitlement: DocumentEntitlement; message: string }> {
  return await api.post("/api/admin/documents/entitlements", params);
}

export async function importBloggerAdminDocumentsClient(params: {
  siteUrl: string;
  limit?: number;
}): Promise<{ importedCount: number; message: string }> {
  const res = await api.post<{ importedCount: number; message: string }>(
    "/api/admin/documents/import-blogger",
    params
  );
  invalidateClientDocumentCache();
  return res;
}
