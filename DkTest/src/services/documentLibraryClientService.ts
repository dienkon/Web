import { api } from "./apiClient";
import { APP_LINK_ORIGIN } from "./appLinks";
import { isNativeAndroid } from "./offline/sync";
import {
  DOCUMENT_CATEGORY_META,
  DOCUMENT_GRADE_META,
  DOCUMENT_SUBJECT_META,
  expandCompactSeedDocument,
  expandCompactSeedFolder,
  expandSeedUrl,
  type DocumentAccessCheckResult,
  type DocumentAuthorizedContent,
  type DocumentCategoryKey,
  type DocumentEntitlement,
  type DocumentFileFormat,
  type DocumentGradeKey,
  type DocumentLibrarySettings,
  type DocumentSeedBundle,
  type DocumentSourceKey,
  type DocumentSpaceKey,
  type DocumentStatus,
  type DocumentSubFile,
  type DocumentSubjectKey,
  type LibraryDocument,
  type LibraryFolder,
} from "../types/documentLibrary";

export interface IndexedLibraryDocument extends LibraryDocument {
  _searchKey: string;
}

export interface FolderTreeNode extends LibraryFolder {
  children: FolderTreeNode[];
  directDocCount: number;
  recursiveDocCount: number;
  subfolderCount: number;
  breadcrumbs: LibraryFolder[];
  descendantIds: Set<string>;
}

export interface FolderTreeIndex {
  nodesById: Map<string, FolderTreeNode>;
  rootsBySpace: {
    dktest_exclusive: FolderTreeNode[];
    community: FolderTreeNode[];
    sources: FolderTreeNode[];
  };
  allRoots: FolderTreeNode[];
}

export interface DocumentFilterQuery {
  search?: string;
  grade?: DocumentGradeKey | "all";
  subject?: DocumentSubjectKey | "all";
  category?: DocumentCategoryKey | "all";
  priceFilter?: "all" | "free" | "paid";
  sourceFilter?: "all" | "seed" | "admin" | "community";
  spaceFilter?: "all" | DocumentSpaceKey;
  sourceKeyFilter?: "all" | DocumentSourceKey;
  folderId?: string | null;
  includeSubfolders?: boolean;
  folderIndex?: FolderTreeIndex;
  sortBy?: "newest" | "featured" | "price_asc" | "title_asc";
}

const SAVED_DOCS_STORAGE_KEY = "dktest:saved_document_ids";
const LIVE_CACHE_TTL_MS = 30 * 1000;

let seedBundlePromise: Promise<{
  documents: LibraryDocument[];
  folders: LibraryFolder[];
}> | null = null;

let seedPacksPromise: Promise<
  Record<string, Array<{ n: string; u: string; f: DocumentFileFormat; p?: string }>>
> | null = null;

let liveOverlayCache: {
  items: LibraryDocument[];
  folders: LibraryFolder[];
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

function getShareOrigin(): string {
  return typeof window !== "undefined" &&
    !isNativeAndroid() &&
    window.location.origin.startsWith("http") &&
    !window.location.origin.includes("localhost")
    ? window.location.origin
    : APP_LINK_ORIGIN;
}

export function buildDocumentShareUrl(docId?: string): string {
  const origin = getShareOrigin();
  if (!docId) return `${origin}/documents`;
  return `${origin}/documents/${encodeURIComponent(docId)}`;
}

export function buildFolderShareUrl(folderId: string): string {
  const origin = getShareOrigin();
  return `${origin}/documents?folder=${encodeURIComponent(folderId)}`;
}

async function loadStaticSeedBundle(): Promise<{
  documents: LibraryDocument[];
  folders: LibraryFolder[];
}> {
  if (seedBundlePromise) return seedBundlePromise;

  seedBundlePromise = (async () => {
    try {
      const res = await fetch("/data/document-library-seed.json");
      if (!res.ok) return { documents: [], folders: [] };
      const bundle = (await res.json()) as DocumentSeedBundle;
      const folders = Array.isArray(bundle?.folders)
        ? bundle.folders.map(expandCompactSeedFolder)
        : [];
      const documents = Array.isArray(bundle?.items)
        ? bundle.items.map(expandCompactSeedDocument)
        : [];
      return { documents, folders };
    } catch (err) {
      console.warn("[documentLibraryClient] Không thể nạp gói seed tĩnh:", err);
      return { documents: [], folders: [] };
    }
  })();

  return seedBundlePromise;
}

async function loadStaticSeedPacks(): Promise<
  Record<string, Array<{ n: string; u: string; f: DocumentFileFormat; p?: string }>>
> {
  if (seedPacksPromise) return seedPacksPromise;
  seedPacksPromise = (async () => {
    try {
      const res = await fetch("/data/document-library-packs.json");
      if (!res.ok) return {};
      return (await res.json()) || {};
    } catch {
      return {};
    }
  })();
  return seedPacksPromise;
}

export async function hydrateDocumentSubFilesClient(
  doc: LibraryDocument
): Promise<LibraryDocument> {
  if (doc.subFiles && doc.subFiles.length > 0) return doc;
  if (!doc.subFileCount || doc.subFileCount <= 1) return doc;
  const packs = await loadStaticSeedPacks();
  const rawPack = packs[doc.id];
  if (!Array.isArray(rawPack) || rawPack.length === 0) return doc;
  const subFiles: DocumentSubFile[] = rawPack.map((sf) => ({
    name: sf.n,
    url: expandSeedUrl(sf.u) || sf.u,
    fileFormat: sf.f,
    ...(sf.p ? { folderPath: sf.p } : {}),
  }));
  return { ...doc, subFiles };
}

export function invalidateClientDocumentCache(): void {
  liveOverlayCache = null;
}

/**
 * Loads the complete merged Document Repository & Hierarchical Folder Tree:
 * - 5,400+ pre-populated documents & 280 folders from static CDN (`0` Firestore reads)
 * - Live Admin & Community uploads + custom folders from server-cached `/api/documents/live`
 */
export async function getCatalogDocuments(options: { forceRefresh?: boolean } = {}): Promise<{
  documents: IndexedLibraryDocument[];
  folders: LibraryFolder[];
  folderIndex: FolderTreeIndex;
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
          folders?: LibraryFolder[];
          settings?: Partial<DocumentLibrarySettings>;
        }>("/api/documents/live")
        .then((res) => {
          const next = {
            items: Array.isArray(res?.items) ? res.items : [],
            folders: Array.isArray(res?.folders) ? res.folders : [],
            settings: res?.settings,
            timestamp: Date.now(),
          };
          liveOverlayCache = next;
          return next;
        })
        .catch(
          () =>
            liveOverlayCache || {
              items: [],
              folders: [],
              settings: undefined,
              timestamp: Date.now(),
            }
        )
    : Promise.resolve(liveOverlayCache!);

  const [seedData, liveData] = await Promise.all([loadStaticSeedBundle(), livePromise]);

  // 1. Merge Folders (live folders + overrides on seed folders)
  const folderOverrideMap = new Map<string, LibraryFolder>();
  for (const lf of liveData.folders) {
    if (lf?.id) folderOverrideMap.set(lf.id, lf);
  }

  const mergedFolders: LibraryFolder[] = [];
  const seenFolderIds = new Set<string>();

  for (const lf of liveData.folders) {
    if (!lf?.id) continue;
    seenFolderIds.add(lf.id);
    if (lf.status === "hidden") continue;
    mergedFolders.push(lf);
  }
  for (const sf of seedData.folders) {
    if (seenFolderIds.has(sf.id)) continue;
    const override = folderOverrideMap.get(sf.id);
    if (override && override.status === "hidden") continue;
    mergedFolders.push(sf);
  }

  const hiddenFolderIds = new Set(
    liveData.folders.filter((f) => f?.status === "hidden").map((f) => f.id)
  );

  // 2. Merge Documents
  const overrideMap = new Map<string, LibraryDocument>();
  for (const item of liveData.items) {
    if (item?.id) overrideMap.set(item.id, item);
  }

  const mergedDocs: IndexedLibraryDocument[] = [];
  const seenDocIds = new Set<string>();

  for (const liveDoc of liveData.items) {
    if (!liveDoc?.id) continue;
    seenDocIds.add(liveDoc.id);
    if (liveDoc.status !== "published") continue;
    if (liveDoc.folderId && hiddenFolderIds.has(liveDoc.folderId)) continue;
    const normalizedSpace: DocumentSpaceKey =
      liveDoc.space ||
      (liveDoc.authorRole === "admin"
        ? "dktest_exclusive"
        : liveDoc.authorRole === "community"
        ? "community"
        : "sources");
    const enriched: LibraryDocument = {
      ...liveDoc,
      space: normalizedSpace,
      sourceKey:
        liveDoc.sourceKey ||
        (normalizedSpace === "dktest_exclusive" ? "dktest" : "community"),
    };
    mergedDocs.push({
      ...enriched,
      _searchKey: buildSearchKey(enriched),
    });
  }

  for (const seedDoc of seedData.documents) {
    if (seenDocIds.has(seedDoc.id)) continue;
    const override = overrideMap.get(seedDoc.id);
    if (override && override.status === "hidden") continue;
    if (seedDoc.folderId && hiddenFolderIds.has(seedDoc.folderId)) continue;
    mergedDocs.push({
      ...seedDoc,
      _searchKey: buildSearchKey(seedDoc),
    });
  }

  const folderIndex = buildFolderTreeIndex(mergedFolders, mergedDocs);

  return {
    documents: mergedDocs,
    folders: mergedFolders,
    folderIndex,
    settings: {
      autoApproveUserUploads: liveData.settings?.autoApproveUserUploads ?? true,
      creatorRevenueSharePercent: liveData.settings?.creatorRevenueSharePercent ?? 80,
      maxUserPriceVnd: liveData.settings?.maxUserPriceVnd ?? 500000,
    },
  };
}

/**
 * Builds an in-memory hierarchical FolderTreeIndex with recursive document counts,
 * breadcrumbs, and descendant ID sets in O(N) time (`<3ms` for 300+ folders & 5,500 docs).
 */
export function buildFolderTreeIndex(
  folders: LibraryFolder[],
  documents: LibraryDocument[]
): FolderTreeIndex {
  const nodesById = new Map<string, FolderTreeNode>();

  for (const f of folders) {
    nodesById.set(f.id, {
      ...f,
      children: [],
      directDocCount: 0,
      recursiveDocCount: 0,
      subfolderCount: 0,
      breadcrumbs: [],
      descendantIds: new Set<string>([f.id]),
    });
  }

  // Count direct documents per folder
  for (const doc of documents) {
    if (doc.folderId && nodesById.has(doc.folderId)) {
      nodesById.get(doc.folderId)!.directDocCount++;
    }
  }

  // Wire parent -> children cleanly with cycle guard
  const allRoots: FolderTreeNode[] = [];
  for (const node of nodesById.values()) {
    const pid = node.parentId;
    if (pid && pid !== node.id && nodesById.has(pid)) {
      // Prevent cycle
      let cur: FolderTreeNode | undefined = nodesById.get(pid);
      let hasCycle = false;
      let guard = 0;
      while (cur && guard < 12) {
        if (cur.id === node.id) {
          hasCycle = true;
          break;
        }
        cur = cur.parentId ? nodesById.get(cur.parentId) : undefined;
        guard++;
      }
      if (!hasCycle) {
        nodesById.get(pid)!.children.push(node);
        continue;
      }
    }
    allRoots.push(node);
  }

  const sortFolderNodes = (arr: FolderTreeNode[]) => {
    arr.sort((a, b) => {
      const ap = a.isPinned ? 1 : 0;
      const bp = b.isPinned ? 1 : 0;
      if (bp !== ap) return bp - ap;
      const ao = a.sortOrder ?? 100;
      const bo = b.sortOrder ?? 100;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name, "vi");
    });
  };

  const dfsCompute = (node: FolderTreeNode, ancestors: LibraryFolder[]): number => {
    const nextBreadcrumbs = [...ancestors, node];
    node.breadcrumbs = nextBreadcrumbs;
    sortFolderNodes(node.children);
    node.subfolderCount = node.children.length;

    let totalDocs = node.directDocCount;
    for (const child of node.children) {
      totalDocs += dfsCompute(child, nextBreadcrumbs);
      for (const descId of child.descendantIds) {
        node.descendantIds.add(descId);
      }
    }
    node.recursiveDocCount = totalDocs;
    return totalDocs;
  };

  sortFolderNodes(allRoots);
  for (const root of allRoots) {
    dfsCompute(root, []);
  }

  return {
    nodesById,
    rootsBySpace: {
      dktest_exclusive: allRoots.filter((r) => r.space === "dktest_exclusive"),
      community: allRoots.filter((r) => r.space === "community"),
      sources: allRoots.filter((r) => r.space === "sources"),
    },
    allRoots,
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
  const spaceFilter = query.spaceFilter || "all";
  const sourceKeyFilter = query.sourceKeyFilter || "all";
  const folderId = query.folderId || null;
  const includeSubfolders = query.includeSubfolders !== false;
  const sortBy = query.sortBy || "newest";

  const targetFolderNode =
    folderId && query.folderIndex ? query.folderIndex.nodesById.get(folderId) : undefined;

  const gradeCounts: Record<string, number> = { all: 0 };
  const subjectCounts: Record<string, number> = { all: 0 };
  const categoryCounts: Record<string, number> = { all: 0 };

  const matched: IndexedLibraryDocument[] = [];

  for (const doc of allDocs) {
    // 1. Folder & Space filter
    if (folderId) {
      if (includeSubfolders && targetFolderNode) {
        if (!doc.folderId || !targetFolderNode.descendantIds.has(doc.folderId)) continue;
      } else if (doc.folderId !== folderId) {
        continue;
      }
    } else if (spaceFilter !== "all") {
      const docSpace =
        doc.space ||
        (doc.authorRole === "admin"
          ? "dktest_exclusive"
          : doc.authorRole === "community"
          ? "community"
          : "sources");
      if (docSpace !== spaceFilter) continue;
    }

    if (sourceKeyFilter !== "all" && doc.sourceKey !== sourceKeyFilter) continue;

    // 2. Text search + price + authorRole filter
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

    // 3. Cross-facet counts
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

  try {
    const { documents } = await getCatalogDocuments();
    const found = documents.find((d) => d.id === clean);
    if (found) {
      return await hydrateDocumentSubFilesClient(found);
    }
  } catch {}

  const res = await api.get<{ success: boolean; document: LibraryDocument }>(
    `/api/documents/${encodeURIComponent(clean)}`
  );
  if (!res?.document) return null;
  return await hydrateDocumentSubFilesClient(res.document);
}

export async function getMyDocumentLibraryState(): Promise<{
  uploaded: LibraryDocument[];
  folders: LibraryFolder[];
  unlockedIds: string[];
  settings: DocumentLibrarySettings;
}> {
  const res = await api.get<{
    success: boolean;
    uploaded: LibraryDocument[];
    folders?: LibraryFolder[];
    unlockedIds: string[];
    settings: DocumentLibrarySettings;
  }>("/api/documents/me");
  return {
    uploaded: res.uploaded || [],
    folders: res.folders || [],
    unlockedIds: res.unlockedIds || [],
    settings: res.settings,
  };
}

export async function saveUserFolderClient(
  payload: Record<string, any>,
  existingId?: string
): Promise<{ folder: LibraryFolder; message: string }> {
  const res = existingId
    ? await api.patch<{ success: boolean; folder: LibraryFolder; message: string }>(
        `/api/documents/folders/${encodeURIComponent(existingId)}`,
        payload
      )
    : await api.post<{ success: boolean; folder: LibraryFolder; message: string }>(
        "/api/documents/folders",
        payload
      );
  invalidateClientDocumentCache();
  return { folder: res.folder, message: res.message };
}

export async function deleteUserFolderClient(folderId: string): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(
    `/api/documents/folders/${encodeURIComponent(folderId)}`
  );
  invalidateClientDocumentCache();
  return res;
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

export async function bulkMoveDocumentsClient(
  params: { docIds: string[]; folderId: string | null },
  isAdminMode = false
): Promise<{ movedCount: number; message: string }> {
  const endpoint = isAdminMode ? "/api/admin/documents/bulk-move" : "/api/documents/bulk-move";
  const res = await api.post<{ movedCount: number; message: string }>(endpoint, params);
  invalidateClientDocumentCache();
  return res;
}

export async function resolveBatchAuthorizedDocumentsClient(docIds: string[]): Promise<{
  items: Array<DocumentAuthorizedContent & { title: string; fileFormat: DocumentFileFormat }>;
  skippedLockedCount: number;
  skippedLockedTitles: string[];
}> {
  return await api.post("/api/documents/batch-resolve", { docIds });
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
  folders: LibraryFolder[];
  settings: DocumentLibrarySettings;
  purchases: DocumentEntitlement[];
}> {
  return await api.get("/api/admin/documents");
}

export async function saveAdminFolderClient(
  payload: Record<string, any>
): Promise<{ folder: LibraryFolder; message: string }> {
  const res = await api.post<{ folder: LibraryFolder; message: string }>(
    "/api/admin/documents/folders",
    payload
  );
  invalidateClientDocumentCache();
  return res;
}

export async function deleteAdminFolderClient(folderId: string): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(
    `/api/admin/documents/folders/${encodeURIComponent(folderId)}`
  );
  invalidateClientDocumentCache();
  return res;
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
    folderId?: string | null;
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
  folderId?: string | null;
}): Promise<{ importedCount: number; message: string }> {
  const res = await api.post<{ importedCount: number; message: string }>(
    "/api/admin/documents/import-blogger",
    params
  );
  invalidateClientDocumentCache();
  return res;
}
