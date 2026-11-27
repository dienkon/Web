import { api } from "./apiClient";
import { APP_LINK_ORIGIN } from "./appLinks";
import { isNativeAndroid } from "./offline/sync";
import {
  DOCUMENT_CATEGORY_META,
  DOCUMENT_GRADE_META,
  DOCUMENT_SUBJECT_META,
  DOCUMENT_TOPIC_CLUSTER_META,
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
  type FolderAccentColor,
  type LibraryDocument,
  type LibraryFolder,
} from "../types/documentLibrary";

export interface IndexedLibraryDocument extends LibraryDocument {
  _searchKey: string;
  _topicKey?: string;
}

export interface ConsolidatedTopicGroup {
  key: string;
  topicKey: string;
  title: string;
  topicLabel: string;
  subject: DocumentSubjectKey;
  grade: DocumentGradeKey;
  iconColor: FolderAccentColor;
  sortOrder: number;
  count: number;
  multiPackCount: number;
  sources: string[];
  previewTitles: string[];
  latestDate: string;
  documents: IndexedLibraryDocument[];
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
  topicFilter?: string | "all";
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
  documents: IndexedLibraryDocument[];
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

const normalizedTaxonomyCache = new Map<string, string>();

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

export function inferDocumentTopicKey(doc: LibraryDocument): string {
  if (doc.topicKey && DOCUMENT_TOPIC_CLUSTER_META[doc.topicKey]) {
    return doc.topicKey;
  }
  const s = normalizeVietnameseSearchText(`${doc.title} ${(doc.tags || []).join(" ")}`);
  if (doc.grade === "dgnl_dgtd" || /\b(hsa|tsa|v-act|vact|dgnl|dgtd|spt|v-sat|vsat)\b/.test(s)) {
    if (/\b(hsa|dhqg ha noi|quoc gia ha noi)\b/.test(s)) return "dgnl_hsa";
    if (/\b(v-act|vact|dhqg tp|dhqg hcm)\b/.test(s)) return "dgnl_vact";
    if (/\b(tsa|bach khoa|tu duy)\b/.test(s)) return "dgtd_tsa";
    return "dgnl_spt_vsat";
  }
  if (/\b(vao 10|tuyen sinh lop 10|thi vao lop 10)\b/.test(s)) return "tuyen_sinh_10";
  if (/\b(hoc sinh gioi|hsg|olympic)\b/.test(s)) return "de_hsg";
  if (/\b(giua hoc ky 1|giua ky 1|giua ki 1|giua hk1|gk1|ghk1)\b/.test(s)) return "de_gk1";
  if (/\b(cuoi hoc ky 1|cuoi ky 1|hoc ky 1|hk1|chk1)\b/.test(s)) return "de_hk1";
  if (/\b(giua hoc ky 2|giua ky 2|giua ki 2|giua hk2|gk2|ghk2)\b/.test(s)) return "de_gk2";
  if (/\b(cuoi hoc ky 2|cuoi ky 2|hoc ky 2|hk2|chk2)\b/.test(s)) return "de_hk2";
  if (
    /\b(khao sat chat luong|kscl)\b/.test(s) &&
    doc.grade !== "thpt_qg" &&
    doc.grade !== "grade_12"
  ) {
    return "de_kscl";
  }
  if (
    doc.grade === "thpt_qg" ||
    /\b(thi thu|tot nghiep thpt|tn thpt|thpt quoc gia|thptqg|khao sat|kscl|so gd|truong thpt)\b/.test(s)
  ) {
    if (/\b(\d+\s*de|bo de|tong hop de|tuyen tap de)\b/.test(s)) return "bo_de_thuc_chien";
    return "thptqg_truong_so";
  }
  if (doc.category === "ebook_book") return "tu_sach_ebook";
  if (doc.category === "formula_handbook") return "so_tay_mindmap";
  if (/\b(dung sai|tra loi ngan)\b/.test(s)) return "cd_dung_sai_tln";
  if (doc.subject === "math") {
    if (/\b(ham so|dao ham|cuc tri|tiem can|do thi)\b/.test(s)) return "cd_ham_so";
    if (/\b(nguyen ham|tich phan)\b/.test(s)) return "cd_tich_phan";
    if (/\b(oxyz|khong gian|khoi da dien|goc khoang cach|vecto)\b/.test(s))
      return "cd_hinh_oxyz";
    if (/\b(xac suat|thong ke|to hop)\b/.test(s)) return "cd_xac_suat";
    if (/\b(day so|cap so|logarit|mu|luong giac)\b/.test(s)) return "cd_dai_so";
  }
  if (doc.subject === "physics") return "cd_ly_song_dien";
  if (doc.subject === "chemistry") return "cd_hoa_chuyen_de";
  if (doc.subject === "biology") return "cd_sinh_chuyen_de";
  if (doc.subject === "literature") return "cd_van_nghi_luan";
  if (doc.subject === "english") return "cd_anh_luyen_de";
  return "bo_tai_lieu_tong_hop";
}

function buildSearchKey(doc: LibraryDocument, topicKey: string): string {
  const taxKey = `${doc.grade}|${doc.subject}|${doc.category}|${topicKey}|${doc.sourceName || doc.authorName}`;
  let taxNorm = normalizedTaxonomyCache.get(taxKey);
  if (taxNorm === undefined) {
    const gradeLabel = DOCUMENT_GRADE_META[doc.grade]?.label || "";
    const subjLabel = DOCUMENT_SUBJECT_META[doc.subject]?.label || "";
    const catLabel = DOCUMENT_CATEGORY_META[doc.category]?.label || "";
    const topicLabel = DOCUMENT_TOPIC_CLUSTER_META[topicKey]?.label || "";
    taxNorm = normalizeVietnameseSearchText(
      `${gradeLabel} ${subjLabel} ${catLabel} ${topicLabel} ${doc.sourceName || doc.authorName}`
    );
    normalizedTaxonomyCache.set(taxKey, taxNorm);
  }

  const titleAndTags = doc.tags?.length
    ? `${doc.title} ${doc.tags.join(" ")}`
    : doc.title;
  return `${normalizeVietnameseSearchText(titleAndTags)} ${taxNorm}`;
}

/**
 * Automatically consolidates same-topic documents (e.g. all "Đề thi thử TN THPT & Khảo sát Trường - Sở — Môn Toán"
 * across multiple sources/schools/provinces) into compact Topic Collection Folders for clean Web browsing.
 */
export function buildConsolidatedTopicGroups(docs: IndexedLibraryDocument[]): {
  groups: ConsolidatedTopicGroup[];
  standaloneDocs: IndexedLibraryDocument[];
} {
  const buckets = new Map<string, IndexedLibraryDocument[]>();

  for (const doc of docs) {
    const tk = doc._topicKey || inferDocumentTopicKey(doc);
    let normGrade: DocumentGradeKey = doc.grade;
    let normSubject: DocumentSubjectKey = doc.subject;

    // Unify Grade 12 + THPT QG for School/Department Mock Exams & Practice Sets so all same-subject exams merge cleanly!
    if (
      (tk === "thptqg_truong_so" || tk === "bo_de_thuc_chien") &&
      (doc.grade === "grade_12" || doc.grade === "thpt_qg")
    ) {
      normGrade = "thpt_qg";
    } else if (
      tk === "dgnl_hsa" ||
      tk === "dgnl_vact" ||
      tk === "dgtd_tsa" ||
      tk === "dgnl_spt_vsat"
    ) {
      normGrade = "dgnl_dgtd";
      if (doc.subject === "multi_subject") normSubject = "aptitude";
    } else if (tk === "tuyen_sinh_10") {
      normGrade = "thcs";
    }

    const bucketKey = `${tk}__${normSubject}__${normGrade}`;
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
    buckets.get(bucketKey)!.push(doc);
  }

  const groups: ConsolidatedTopicGroup[] = [];
  const standaloneDocs: IndexedLibraryDocument[] = [];

  for (const [key, items] of buckets.entries()) {
    if (items.length < 2) {
      standaloneDocs.push(...items);
      continue;
    }

    const [tk, subjRaw, gradeRaw] = key.split("__") as [
      string,
      DocumentSubjectKey,
      DocumentGradeKey,
    ];
    const tMeta =
      DOCUMENT_TOPIC_CLUSTER_META[tk] || DOCUMENT_TOPIC_CLUSTER_META.bo_tai_lieu_tong_hop;
    const subjLabel = DOCUMENT_SUBJECT_META[subjRaw]?.label || "Tổng hợp";
    const gradeShort = DOCUMENT_GRADE_META[gradeRaw]?.shortLabel || "";

    const isAptitudeTopic =
      tk === "dgnl_hsa" ||
      tk === "dgnl_vact" ||
      tk === "dgtd_tsa" ||
      tk === "dgnl_spt_vsat";
    const isSubjectEmbeddedInTopic =
      tk.startsWith("cd_") && tk !== "cd_dung_sai_tln";

    let title = tMeta.label;
    if (!isAptitudeTopic && !isSubjectEmbeddedInTopic && subjRaw !== "multi_subject") {
      title = `${tMeta.label} — Môn ${subjLabel}`;
    } else if (isAptitudeTopic && subjRaw !== "aptitude" && subjRaw !== "multi_subject") {
      title = `${tMeta.label} — Phần ${subjLabel}`;
    }

    if (
      gradeRaw !== "thpt_qg" &&
      gradeRaw !== "dgnl_dgtd" &&
      gradeRaw !== "general" &&
      tk !== "tuyen_sinh_10" &&
      gradeShort
    ) {
      title = `${title} (${gradeShort})`;
    }

    const srcSet = new Set<string>();
    let multiPackCount = 0;
    let latestDate = "";
    for (const d of items) {
      if (d.sourceName) srcSet.add(d.sourceName);
      else if (d.authorName) srcSet.add(d.authorName);
      if ((d.subFiles?.length || d.subFileCount || 0) > 1) multiPackCount++;
      const dt = String(d.publishedAt || d.createdAt || "");
      if (dt > latestDate) latestDate = dt;
    }

    groups.push({
      key,
      topicKey: tk,
      title,
      topicLabel: tMeta.label,
      subject: subjRaw,
      grade: gradeRaw,
      iconColor: tMeta.accentColor,
      sortOrder: tMeta.order,
      count: items.length,
      multiPackCount,
      sources: [...srcSet].slice(0, 4),
      previewTitles: items.slice(0, 3).map((x) => x.title),
      latestDate,
      documents: items,
    });
  }

  groups.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return b.count - a.count;
  });

  return { groups, standaloneDocs };
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
  documents: IndexedLibraryDocument[];
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
      const documents: IndexedLibraryDocument[] = Array.isArray(bundle?.items)
        ? bundle.items.map((raw) => {
            const expanded = expandCompactSeedDocument(raw);
            const tk = expanded.topicKey || inferDocumentTopicKey(expanded);
            return {
              ...expanded,
              topicKey: tk,
              _topicKey: tk,
              _searchKey: buildSearchKey(expanded, tk),
            };
          })
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
    const liveTopicKey = inferDocumentTopicKey(enriched);
    mergedDocs.push({
      ...enriched,
      topicKey: liveTopicKey,
      _topicKey: liveTopicKey,
      _searchKey: buildSearchKey(enriched, liveTopicKey),
    });
  }

  for (const seedDoc of seedData.documents) {
    if (seenDocIds.has(seedDoc.id)) continue;
    const override = overrideMap.get(seedDoc.id);
    if (override && override.status === "hidden") continue;
    if (seedDoc.folderId && hiddenFolderIds.has(seedDoc.folderId)) continue;
    mergedDocs.push(seedDoc);
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

export function matchesDocumentTopicFilter(
  doc: IndexedLibraryDocument,
  topicFilter: string
): boolean {
  if (!topicFilter || topicFilter === "all") return true;
  const tk = doc._topicKey || doc.topicKey || inferDocumentTopicKey(doc);
  if (topicFilter === "thptqg_truong_so") {
    return tk === "thptqg_truong_so" || tk === "bo_de_thuc_chien";
  }
  if (topicFilter === "de_kscl") {
    return (
      tk === "de_kscl" ||
      (tk === "thptqg_truong_so" &&
        (doc._searchKey.includes("kscl") || doc._searchKey.includes("khao sat")))
    );
  }
  if (topicFilter === "de_hk1") return tk === "de_hk1";
  if (topicFilter === "de_hk2") return tk === "de_hk2" || tk === "de_gk2_hk2";
  if (topicFilter === "de_gk") return tk === "de_gk1" || tk === "de_gk2";
  if (topicFilter === "de_hsg") return tk === "de_hsg";
  if (topicFilter === "dgnl_all") {
    return (
      tk === "dgnl_hsa" ||
      tk === "dgnl_vact" ||
      tk === "dgtd_tsa" ||
      tk === "dgnl_spt_vsat" ||
      doc.grade === "dgnl_dgtd"
    );
  }
  return tk === topicFilter;
}

export function filterAndSortDocuments(
  allDocs: IndexedLibraryDocument[],
  query: DocumentFilterQuery
): {
  items: IndexedLibraryDocument[];
  gradeCounts: Record<string, number>;
  subjectCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  topicCounts: Record<string, number>;
} {
  const tokens = normalizeVietnameseSearchText(query.search || "")
    .split(" ")
    .filter(Boolean);
  const grade = query.grade || "all";
  const subject = query.subject || "all";
  const category = query.category || "all";
  const topicFilter = query.topicFilter || "all";
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
  const topicCounts: Record<string, number> = {
    all: 0,
    thptqg_truong_so: 0,
    de_kscl: 0,
    de_hk1: 0,
    de_hk2: 0,
    de_gk: 0,
    de_hsg: 0,
    dgnl_all: 0,
  };

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
    const matchesTopic = matchesDocumentTopicFilter(doc, topicFilter);

    if (matchesGrade && matchesSubject && matchesCategory) {
      topicCounts.all++;
      const tk = doc._topicKey || doc.topicKey || "";
      if (tk === "thptqg_truong_so" || tk === "bo_de_thuc_chien") {
        topicCounts.thptqg_truong_so++;
      }
      if (
        tk === "de_kscl" ||
        (tk === "thptqg_truong_so" &&
          (doc._searchKey.includes("kscl") || doc._searchKey.includes("khao sat")))
      ) {
        topicCounts.de_kscl++;
      }
      if (tk === "de_hk1") topicCounts.de_hk1++;
      if (tk === "de_hk2" || tk === "de_gk2_hk2") topicCounts.de_hk2++;
      if (tk === "de_gk1" || tk === "de_gk2") topicCounts.de_gk++;
      if (tk === "de_hsg") topicCounts.de_hsg++;
      if (
        tk === "dgnl_hsa" ||
        tk === "dgnl_vact" ||
        tk === "dgtd_tsa" ||
        tk === "dgnl_spt_vsat" ||
        doc.grade === "dgnl_dgtd"
      ) {
        topicCounts.dgnl_all++;
      }
    }

    if (!matchesTopic) continue;

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
    topicCounts,
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

export async function supplementDocumentClient(
  docId: string,
  payload: {
    appendSubFiles?: DocumentSubFile[];
    replaceSubFiles?: DocumentSubFile[];
    answerUrl?: string | null;
    videoUrl?: string | null;
    status?: "published" | "hidden";
    folderId?: string | null;
  }
): Promise<{
  document: LibraryDocument;
  subFiles: DocumentSubFile[];
  answerUrl?: string;
  videoUrl?: string;
  message: string;
}> {
  const res = await api.post<{
    success: boolean;
    document: LibraryDocument;
    subFiles: DocumentSubFile[];
    answerUrl?: string;
    videoUrl?: string;
    message: string;
  }>(`/api/documents/${encodeURIComponent(docId)}/supplement`, payload);
  invalidateClientDocumentCache();
  return res;
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
