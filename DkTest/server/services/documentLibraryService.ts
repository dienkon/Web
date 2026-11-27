import fs from "fs";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import {
  adminDb,
  getFirestoreRestDoc,
  getFirestoreRestDocs,
  queryFirestoreRestDocs,
  setFirestoreRestDoc,
  deleteFirestoreRestDoc,
} from "../firebaseAdmin.js";
import {
  getOrCreateWallet,
  sanitizeVnd,
  invalidateWalletOverviewCache,
  invalidateStudentDetailsCache,
} from "./walletService.js";
import {
  validateVoucher,
  invalidateVouchersCache,
  invalidateVoucherUsagesCache,
} from "./voucherService.js";
import { validateUrlForSsrf } from "./webImporter/ssrfGuard.js";
import {
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
} from "../../src/types/documentLibrary.js";
import type { StudentWallet, Voucher, VoucherUsage, WalletTransaction } from "../../src/types/index.js";

const SETTINGS_COLLECTION = "system_settings";
const SETTINGS_DOC_ID = "document_library_config";
const FOLDERS_COLLECTION = "library_folders";
const DOCS_COLLECTION = "library_documents";
const SECRETS_COLLECTION = "library_document_secrets";
const ENTITLEMENTS_COLLECTION = "library_entitlements";

const LIVE_DOCS_TTL_MS = 45 * 1000;
const SETTINGS_TTL_MS = 60 * 1000;
const MAX_PROXY_BYTES = 44 * 1024 * 1024; // 44 MB serverless-safe ceiling
const MAX_FOLDER_DEPTH = 6;

let cachedLiveDocs: { items: LibraryDocument[]; timestamp: number } | null = null;
let cachedLiveFolders: { items: LibraryFolder[]; timestamp: number } | null = null;
let cachedSettings: { data: DocumentLibrarySettings; timestamp: number } | null = null;
let cachedSeedBundle: {
  docs: Map<string, LibraryDocument>;
  folders: Map<string, LibraryFolder>;
} | null = null;
let cachedSeedPacks: Record<
  string,
  Array<{ n: string; u: string; f: DocumentFileFormat; p?: string }>
> | null = null;

function loadSeedPacksCache(): Record<
  string,
  Array<{ n: string; u: string; f: DocumentFileFormat; p?: string }>
> {
  if (cachedSeedPacks) return cachedSeedPacks;
  const candidates = [
    path.join(process.cwd(), "public", "data", "document-library-packs.json"),
    path.join(process.cwd(), "dist", "data", "document-library-packs.json"),
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      cachedSeedPacks = JSON.parse(fs.readFileSync(filePath, "utf8")) || {};
      return cachedSeedPacks!;
    } catch {}
  }
  cachedSeedPacks = {};
  return cachedSeedPacks;
}

function hydrateSeedDocPack(doc: LibraryDocument | null): LibraryDocument | null {
  if (!doc) return null;
  if (doc.subFiles && doc.subFiles.length > 0) return doc;
  if (!doc.subFileCount || doc.subFileCount <= 1) return doc;
  const rawPack = loadSeedPacksCache()[doc.id];
  if (!Array.isArray(rawPack) || rawPack.length === 0) return doc;
  const subFiles: DocumentSubFile[] = rawPack.map((sf) => ({
    name: sf.n,
    url: expandSeedUrl(sf.u) || sf.u,
    fileFormat: sf.f,
    ...(sf.p ? { folderPath: sf.p } : {}),
  }));
  return { ...doc, subFiles };
}

export function invalidateDocumentLibraryCache(): void {
  cachedLiveDocs = null;
  cachedLiveFolders = null;
}

export function invalidateDocumentSettingsCache(): void {
  cachedSettings = null;
}

function loadSeedBundleCache(): {
  docs: Map<string, LibraryDocument>;
  folders: Map<string, LibraryFolder>;
} {
  if (cachedSeedBundle) return cachedSeedBundle;
  const docs = new Map<string, LibraryDocument>();
  const folders = new Map<string, LibraryFolder>();
  const candidates = [
    path.join(process.cwd(), "public", "data", "document-library-seed.json"),
    path.join(process.cwd(), "dist", "data", "document-library-seed.json"),
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as DocumentSeedBundle;
      if (Array.isArray(parsed?.folders)) {
        for (const f of parsed.folders) {
          if (f?.id) {
            folders.set(f.id, expandCompactSeedFolder(f));
          }
        }
      }
      if (Array.isArray(parsed?.items)) {
        for (const item of parsed.items) {
          if (item?.id) {
            docs.set(item.id, expandCompactSeedDocument(item));
          }
        }
        break;
      }
    } catch (err) {
      console.warn("[documentLibraryService] Failed to parse seed JSON:", err);
    }
  }
  cachedSeedBundle = { docs, folders };
  return cachedSeedBundle;
}

export function getSeedDocumentById(docId: string): LibraryDocument | null {
  const clean = String(docId || "").trim();
  if (!clean) return null;
  return hydrateSeedDocPack(loadSeedBundleCache().docs.get(clean) || null);
}

export function getSeedFolderById(folderId: string): LibraryFolder | null {
  const clean = String(folderId || "").trim();
  if (!clean) return null;
  return loadSeedBundleCache().folders.get(clean) || null;
}

export async function getDocumentLibrarySettings(
  forceRefresh = false
): Promise<DocumentLibrarySettings> {
  if (!forceRefresh && cachedSettings && Date.now() - cachedSettings.timestamp < SETTINGS_TTL_MS) {
    return cachedSettings.data;
  }

  const defaults: DocumentLibrarySettings = {
    autoApproveUserUploads: true,
    creatorRevenueSharePercent: 80,
    maxUserPriceVnd: 500000,
    updatedAt: new Date().toISOString(),
  };

  try {
    let raw: any = null;
    if (adminDb) {
      const snap = await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get();
      if (snap.exists) raw = snap.data();
    } else {
      raw = await getFirestoreRestDoc(SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    }

    if (raw) {
      const merged: DocumentLibrarySettings = {
        autoApproveUserUploads:
          typeof raw.autoApproveUserUploads === "boolean"
            ? raw.autoApproveUserUploads
            : defaults.autoApproveUserUploads,
        creatorRevenueSharePercent:
          typeof raw.creatorRevenueSharePercent === "number"
            ? Math.max(0, Math.min(100, Math.round(raw.creatorRevenueSharePercent)))
            : defaults.creatorRevenueSharePercent,
        maxUserPriceVnd:
          typeof raw.maxUserPriceVnd === "number" && raw.maxUserPriceVnd >= 1000
            ? Math.floor(raw.maxUserPriceVnd)
            : defaults.maxUserPriceVnd,
        updatedAt: raw.updatedAt || defaults.updatedAt,
      };
      cachedSettings = { data: merged, timestamp: Date.now() };
      return merged;
    }
  } catch (err) {
    console.warn("[documentLibraryService] Error loading settings, using defaults:", err);
  }

  cachedSettings = { data: defaults, timestamp: Date.now() };
  return defaults;
}

export async function updateDocumentLibrarySettings(
  patch: Partial<DocumentLibrarySettings>
): Promise<DocumentLibrarySettings> {
  const current = await getDocumentLibrarySettings(true);
  const next: DocumentLibrarySettings = {
    autoApproveUserUploads:
      typeof patch.autoApproveUserUploads === "boolean"
        ? patch.autoApproveUserUploads
        : current.autoApproveUserUploads,
    creatorRevenueSharePercent:
      typeof patch.creatorRevenueSharePercent === "number"
        ? Math.max(0, Math.min(100, Math.round(patch.creatorRevenueSharePercent)))
        : current.creatorRevenueSharePercent,
    maxUserPriceVnd:
      typeof patch.maxUserPriceVnd === "number" && patch.maxUserPriceVnd >= 1000
        ? Math.min(5000000, Math.floor(patch.maxUserPriceVnd))
        : current.maxUserPriceVnd,
    updatedAt: new Date().toISOString(),
  };

  if (adminDb) {
    await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).set(next, { merge: true });
  } else {
    await setFirestoreRestDoc(SETTINGS_COLLECTION, SETTINGS_DOC_ID, next);
  }

  invalidateDocumentSettingsCache();
  return next;
}

// ============================================================================
// Schemas
// ============================================================================
const gradeEnum = z.enum([
  "thcs",
  "grade_10",
  "grade_11",
  "grade_12",
  "thpt_qg",
  "dgnl_dgtd",
  "general",
]);

const subjectEnum = z.enum([
  "math",
  "literature",
  "english",
  "physics",
  "chemistry",
  "biology",
  "history",
  "geography",
  "civics",
  "informatics",
  "technology",
  "foreign_other",
  "aptitude",
  "multi_subject",
]);

const subFileSchema = z.object({
  name: z.string().trim().min(1).max(160),
  url: z.string().trim().url().max(2048),
  fileFormat: z
    .enum(["pdf", "docx", "doc", "pptx", "xlsx", "zip", "folder", "sheet", "other"])
    .default("pdf"),
  folderPath: z.string().trim().max(160).optional(),
});

export const upsertFolderSchema = z.object({
  id: z.string().trim().min(3).max(96).optional(),
  name: z.string().trim().min(2, "Tên thư mục phải có ít nhất 2 ký tự.").max(140),
  description: z.string().trim().max(600).optional().default(""),
  parentId: z.string().trim().max(96).nullable().optional().default(null),
  space: z.enum(["dktest_exclusive", "community", "sources"]).optional(),
  grade: gradeEnum.optional(),
  subject: subjectEnum.optional(),
  iconColor: z
    .enum(["teal", "blue", "indigo", "amber", "rose", "emerald", "purple", "slate"])
    .optional()
    .default("teal"),
  coverImageUrl: z.string().trim().url().max(2048).nullable().optional(),
  isPinned: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  status: z.enum(["published", "hidden"]).optional(),
});

export const upsertDocumentSchema = z.object({
  id: z.string().trim().min(3).max(96).optional(),
  title: z.string().trim().min(3, "Tiêu đề phải có ít nhất 3 ký tự.").max(220),
  description: z.string().trim().max(2000).optional().default(""),
  grade: gradeEnum.default("grade_12"),
  subject: subjectEnum.default("math"),
  category: z
    .enum(["exam_test", "ebook_book", "topic_guide", "formula_handbook", "folder_pack"])
    .default("exam_test"),
  fileFormat: z
    .enum(["pdf", "docx", "doc", "pptx", "xlsx", "zip", "folder", "sheet", "other"])
    .default("pdf"),
  folderId: z.string().trim().max(96).nullable().optional(),
  space: z.enum(["dktest_exclusive", "community", "sources"]).optional(),
  pageCount: z.number().int().min(0).max(5000).optional(),
  fileSizeBytes: z.number().int().min(0).max(1024 * 1024 * 500).optional(),
  coverImageUrl: z.string().trim().url().max(2048).nullable().optional(),
  previewImageUrls: z.array(z.string().trim().url().max(2048)).max(5).optional(),
  accessMode: z.enum(["free", "paid"]).default("free"),
  priceVnd: z.number().min(0).max(5000000).default(0),
  previewPageCount: z.number().int().min(0).max(10).optional().default(2),
  salesEnabled: z.boolean().optional().default(true),
  fileUrl: z.string().trim().url("Vui lòng tải tệp lên hoặc nhập liên kết hợp lệ.").max(2048).optional(),
  originalFileName: z.string().trim().max(200).optional(),
  answerUrl: z.string().trim().max(2048).optional(),
  videoUrl: z.string().trim().max(2048).optional(),
  subFiles: z.array(subFileSchema).max(120).optional(),
  tags: z.array(z.string().trim().max(48)).max(12).optional().default([]),
  isFeatured: z.boolean().optional(),
  status: z.enum(["published", "pending", "rejected", "hidden"]).optional(),
});

function sanitizePublicDocument(doc: LibraryDocument): LibraryDocument {
  const isPaid = doc.accessMode === "paid" && sanitizeVnd(doc.priceVnd) > 0;
  if (!isPaid) return doc;
  const copy: LibraryDocument = { ...doc };
  delete copy.fileUrl;
  delete copy.answerUrl;
  delete copy.videoUrl;
  delete copy.subFiles;
  return copy;
}

// ============================================================================
// Hierarchical Folder Operations (0 extra reads via 45s RAM cache)
// ============================================================================
export async function getLiveLibraryFolders(
  options: { includeHidden?: boolean; forceRefresh?: boolean } = {}
): Promise<LibraryFolder[]> {
  if (
    !options.forceRefresh &&
    cachedLiveFolders &&
    Date.now() - cachedLiveFolders.timestamp < LIVE_DOCS_TTL_MS
  ) {
    const all = cachedLiveFolders.items;
    return options.includeHidden ? all : all.filter((f) => f.status !== "hidden");
  }

  let list: LibraryFolder[] = [];
  if (adminDb) {
    try {
      const snap = await adminDb
        .collection(FOLDERS_COLLECTION)
        .orderBy("updatedAt", "desc")
        .limit(500)
        .get();
      list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    } catch {
      const snap = await adminDb.collection(FOLDERS_COLLECTION).limit(500).get();
      list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    }
  } else {
    const docs = await getFirestoreRestDocs(FOLDERS_COLLECTION, 400, true);
    list = (docs || []).map((d: any) => ({ id: d.id, ...d }));
    list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  cachedLiveFolders = { items: list, timestamp: Date.now() };
  return options.includeHidden ? list : list.filter((f) => f.status !== "hidden");
}

export async function getFolderByIdResolved(folderId: string): Promise<LibraryFolder | null> {
  const cleanId = String(folderId || "").trim();
  if (!cleanId) return null;

  let liveFolder: LibraryFolder | null = null;
  if (adminDb) {
    const snap = await adminDb.collection(FOLDERS_COLLECTION).doc(cleanId).get();
    if (snap.exists) {
      liveFolder = { id: snap.id, ...(snap.data() as any) };
    }
  } else {
    const rest = await getFirestoreRestDoc(FOLDERS_COLLECTION, cleanId);
    if (rest) {
      liveFolder = { id: cleanId, ...(rest as any) };
    }
  }
  if (liveFolder) return liveFolder;

  return getSeedFolderById(cleanId);
}

export async function getMyLibraryFolders(uid: string): Promise<LibraryFolder[]> {
  const cleanUid = String(uid || "").trim();
  if (!cleanUid) return [];
  const all = await getLiveLibraryFolders({ includeHidden: true });
  return all.filter((f) => f.ownerUid === cleanUid);
}

async function assertValidParentChain(
  folderId: string,
  parentId: string | null
): Promise<{ parentFolder: LibraryFolder | null; depth: number }> {
  if (!parentId) return { parentFolder: null, depth: 0 };
  if (parentId === folderId) {
    throw new Error("Không thể đặt thư mục làm thư mục con của chính nó.");
  }

  const firstParent = await getFolderByIdResolved(parentId);
  if (!firstParent || firstParent.status === "hidden") {
    throw new Error("Thư mục cha không tồn tại hoặc đã bị ẩn.");
  }

  let cur: LibraryFolder | null = firstParent;
  let depth = 1;
  const visited = new Set<string>([folderId]);

  while (cur) {
    if (visited.has(cur.id)) {
      throw new Error("Phát hiện vòng lặp phân cấp thư mục không hợp lệ.");
    }
    visited.add(cur.id);
    if (depth >= MAX_FOLDER_DEPTH) {
      throw new Error(`Cây thư mục hỗ trợ tối đa ${MAX_FOLDER_DEPTH} cấp phân nhánh.`);
    }
    if (!cur.parentId) break;
    cur = await getFolderByIdResolved(cur.parentId);
    depth++;
  }

  return { parentFolder: firstParent, depth };
}

export async function createOrUpdateLibraryFolder(
  actor: { uid: string; displayName?: string; email?: string; role: string },
  rawInput: unknown
): Promise<LibraryFolder> {
  const parsed = upsertFolderSchema.parse(rawInput);
  const isAdmin = actor.role === "admin" || actor.role === "super_admin";

  const existingId = parsed.id?.trim();
  let existingFolder: LibraryFolder | null = null;

  if (existingId) {
    existingFolder = await getFolderByIdResolved(existingId);
    if (existingFolder) {
      if (!isAdmin && existingFolder.ownerUid !== actor.uid) {
        throw new Error("Bạn chỉ có quyền chỉnh sửa thư mục do chính mình tạo.");
      }
      if (!isAdmin && existingFolder.ownerRole === "seed") {
        throw new Error("Chỉ Quản trị viên mới có thể chỉnh sửa thư mục nguồn gốc.");
      }
    }
  }

  const folderId =
    existingId || `lfold_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const cleanParentId = parsed.parentId?.trim() || null;

  const { parentFolder } = await assertValidParentChain(folderId, cleanParentId);

  // Enforce ownership boundary for non-admin contributors
  if (!isAdmin && parentFolder) {
    if (parentFolder.ownerUid !== actor.uid) {
      throw new Error("Bạn chỉ có thể tạo thư mục con bên trong thư mục của chính mình.");
    }
  }

  let resolvedSpace: DocumentSpaceKey = "community";
  let resolvedSourceKey: DocumentSourceKey = "community";

  if (parentFolder) {
    resolvedSpace = parentFolder.space;
    resolvedSourceKey =
      parentFolder.sourceKey ||
      (parentFolder.space === "dktest_exclusive" ? "dktest" : "community");
  } else if (isAdmin) {
    resolvedSpace = parsed.space || existingFolder?.space || "dktest_exclusive";
    resolvedSourceKey =
      resolvedSpace === "dktest_exclusive"
        ? "dktest"
        : resolvedSpace === "sources"
        ? existingFolder?.sourceKey || "nhdt"
        : "community";
  }

  const now = new Date().toISOString();
  const ownerName =
    existingFolder?.ownerName && existingFolder.ownerRole !== "seed"
      ? existingFolder.ownerName
      : actor.displayName ||
        actor.email?.split("@")[0] ||
        (isAdmin ? "Ban Quản Trị DkTEST" : "Thành viên DkTEST");

  const folderDoc: LibraryFolder = {
    id: folderId,
    name: parsed.name.trim(),
    description: parsed.description?.trim() || "",
    parentId: cleanParentId,
    space: resolvedSpace,
    sourceKey: resolvedSourceKey,
    ...(parsed.grade ? { grade: parsed.grade } : existingFolder?.grade ? { grade: existingFolder.grade } : {}),
    ...(parsed.subject ? { subject: parsed.subject } : existingFolder?.subject ? { subject: existingFolder.subject } : {}),
    iconColor: (parsed.iconColor || existingFolder?.iconColor || "teal") as FolderAccentColor,
    coverImageUrl:
      parsed.coverImageUrl !== undefined
        ? parsed.coverImageUrl
        : existingFolder?.coverImageUrl || null,
    ownerUid: existingFolder?.ownerUid || actor.uid,
    ownerName,
    ownerRole:
      existingFolder?.ownerRole && existingFolder.ownerRole !== "seed"
        ? existingFolder.ownerRole
        : isAdmin
        ? "admin"
        : "community",
    status: isAdmin ? parsed.status || existingFolder?.status || "published" : "published",
    isPinned: isAdmin ? parsed.isPinned ?? existingFolder?.isPinned ?? false : false,
    sortOrder: parsed.sortOrder ?? existingFolder?.sortOrder ?? 50,
    createdAt: existingFolder?.createdAt || now,
    updatedAt: now,
  };

  if (adminDb) {
    await adminDb.collection(FOLDERS_COLLECTION).doc(folderId).set(folderDoc);
  } else {
    await setFirestoreRestDoc(FOLDERS_COLLECTION, folderId, folderDoc);
  }

  invalidateDocumentLibraryCache();
  return folderDoc;
}

export async function deleteLibraryFolder(
  actor: { uid: string; role: string },
  folderId: string
): Promise<{ deleted: boolean; hiddenSeed?: boolean; reparentedDocs: number; reparentedFolders: number }> {
  const cleanId = String(folderId || "").trim();
  if (!cleanId) throw new Error("Mã thư mục không hợp lệ.");

  const isAdmin = actor.role === "admin" || actor.role === "super_admin";
  const existing = await getFolderByIdResolved(cleanId);
  if (!existing) throw new Error("Không tìm thấy thư mục.");

  if (!isAdmin && existing.ownerUid !== actor.uid) {
    throw new Error("Bạn không có quyền xóa thư mục này.");
  }

  const isSeed = Boolean(getSeedFolderById(cleanId));
  if (isSeed) {
    if (!isAdmin) throw new Error("Không thể xóa thư mục gốc của hệ thống.");
    const hiddenOverride: LibraryFolder = {
      ...existing,
      status: "hidden",
      updatedAt: new Date().toISOString(),
    };
    if (adminDb) {
      await adminDb.collection(FOLDERS_COLLECTION).doc(cleanId).set(hiddenOverride, { merge: true });
    } else {
      await setFirestoreRestDoc(FOLDERS_COLLECTION, cleanId, hiddenOverride);
    }
    invalidateDocumentLibraryCache();
    return { deleted: true, hiddenSeed: true, reparentedDocs: 0, reparentedFolders: 0 };
  }

  const fallbackParentId = existing.parentId ?? null;
  const now = new Date().toISOString();

  // Safely re-parent direct child folders and live documents so no uploaded files are orphaned
  const [liveFolders, liveDocs] = await Promise.all([
    getLiveLibraryFolders({ includeHidden: true, forceRefresh: true }),
    getLiveLibraryDocuments({ includeNonPublished: true, forceRefresh: true }),
  ]);

  const childFolders = liveFolders.filter((f) => f.parentId === cleanId);
  const childDocs = liveDocs.filter((d) => d.folderId === cleanId);

  if (adminDb) {
    const batch = adminDb.batch();
    for (const cf of childFolders) {
      batch.set(
        adminDb.collection(FOLDERS_COLLECTION).doc(cf.id),
        { parentId: fallbackParentId, updatedAt: now },
        { merge: true }
      );
    }
    for (const cd of childDocs) {
      batch.set(
        adminDb.collection(DOCS_COLLECTION).doc(cd.id),
        { folderId: fallbackParentId, updatedAt: now },
        { merge: true }
      );
    }
    batch.delete(adminDb.collection(FOLDERS_COLLECTION).doc(cleanId));
    await batch.commit();
  } else {
    for (const cf of childFolders) {
      await setFirestoreRestDoc(FOLDERS_COLLECTION, cf.id, {
        ...cf,
        parentId: fallbackParentId,
        updatedAt: now,
      });
    }
    for (const cd of childDocs) {
      await setFirestoreRestDoc(DOCS_COLLECTION, cd.id, {
        ...cd,
        folderId: fallbackParentId,
        updatedAt: now,
      });
    }
    await deleteFirestoreRestDoc(FOLDERS_COLLECTION, cleanId);
  }

  invalidateDocumentLibraryCache();
  return {
    deleted: true,
    reparentedDocs: childDocs.length,
    reparentedFolders: childFolders.length,
  };
}

// ============================================================================
// Live Documents & Contributor Operations
// ============================================================================
export async function getLiveLibraryDocuments(
  options: { includeNonPublished?: boolean; forceRefresh?: boolean } = {}
): Promise<LibraryDocument[]> {
  if (
    !options.forceRefresh &&
    cachedLiveDocs &&
    Date.now() - cachedLiveDocs.timestamp < LIVE_DOCS_TTL_MS
  ) {
    const all = cachedLiveDocs.items;
    return options.includeNonPublished
      ? all
      : all.filter((d) => d.status === "published" || d.status === "hidden");
  }

  let list: LibraryDocument[] = [];
  if (adminDb) {
    try {
      const snap = await adminDb
        .collection(DOCS_COLLECTION)
        .orderBy("updatedAt", "desc")
        .limit(600)
        .get();
      list = snap.docs.map((d) => sanitizePublicDocument({ id: d.id, ...(d.data() as any) }));
    } catch {
      const snap = await adminDb.collection(DOCS_COLLECTION).limit(600).get();
      list = snap.docs.map((d) => sanitizePublicDocument({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    }
  } else {
    const docs = await getFirestoreRestDocs(DOCS_COLLECTION, 400, true);
    list = (docs || []).map((d: any) => sanitizePublicDocument({ id: d.id, ...d }));
    list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  cachedLiveDocs = { items: list, timestamp: Date.now() };
  return options.includeNonPublished
    ? list
    : list.filter((d) => d.status === "published" || d.status === "hidden");
}

export async function getDocumentByIdResolved(docId: string): Promise<LibraryDocument | null> {
  const cleanId = String(docId || "").trim();
  if (!cleanId) return null;

  let liveDoc: LibraryDocument | null = null;
  if (adminDb) {
    const snap = await adminDb.collection(DOCS_COLLECTION).doc(cleanId).get();
    if (snap.exists) {
      liveDoc = sanitizePublicDocument({ id: snap.id, ...(snap.data() as any) });
    }
  } else {
    const restDoc = await getFirestoreRestDoc(DOCS_COLLECTION, cleanId);
    if (restDoc) {
      liveDoc = sanitizePublicDocument({ id: cleanId, ...(restDoc as any) });
    }
  }
  if (liveDoc) return liveDoc;

  return getSeedDocumentById(cleanId);
}

async function getDocumentSecrets(docId: string): Promise<{
  fileUrl?: string;
  originalFileName?: string;
  answerUrl?: string;
  videoUrl?: string;
  subFiles?: any[];
} | null> {
  if (adminDb) {
    const snap = await adminDb.collection(SECRETS_COLLECTION).doc(docId).get();
    return snap.exists ? (snap.data() as any) : null;
  }
  return await getFirestoreRestDoc(SECRETS_COLLECTION, docId);
}

export async function getMyUploadedDocuments(uid: string): Promise<LibraryDocument[]> {
  const cleanUid = String(uid || "").trim();
  if (!cleanUid) return [];
  const all = await getLiveLibraryDocuments({ includeNonPublished: true });
  return all.filter((d) => d.authorUid === cleanUid);
}

export async function getMyUnlockedDocumentIds(uid: string): Promise<string[]> {
  const cleanUid = String(uid || "").trim();
  if (!cleanUid) return [];

  let ents: any[] = [];
  if (adminDb) {
    const snap = await adminDb
      .collection(ENTITLEMENTS_COLLECTION)
      .where("uid", "==", cleanUid)
      .limit(300)
      .get();
    ents = snap.docs.map((d) => d.data());
  } else {
    ents = (await queryFirestoreRestDocs(ENTITLEMENTS_COLLECTION, "uid", cleanUid, 300)) || [];
  }

  return ents.filter((e) => e && e.status === "active" && e.docId).map((e) => String(e.docId));
}

export async function createOrUpdateLibraryDocument(
  actor: { uid: string; displayName?: string; email?: string; role: string },
  rawInput: unknown
): Promise<LibraryDocument> {
  const parsed = upsertDocumentSchema.parse(rawInput);
  const isAdmin = actor.role === "admin" || actor.role === "super_admin";
  const settings = await getDocumentLibrarySettings();

  const existingId = parsed.id?.trim();
  let existingDoc: LibraryDocument | null = null;
  let existingSecrets: any = null;

  if (existingId) {
    existingDoc = await getDocumentByIdResolved(existingId);
    if (existingDoc) {
      if (!isAdmin && existingDoc.authorUid !== actor.uid) {
        throw new Error("Bạn chỉ có quyền chỉnh sửa tài liệu do chính mình đăng tải.");
      }
      existingSecrets = await getDocumentSecrets(existingId);
    }
  }

  const resolvedFileUrl =
    parsed.fileUrl?.trim() || existingSecrets?.fileUrl || existingDoc?.fileUrl || "";
  if (!resolvedFileUrl) {
    throw new Error("Vui lòng tải tệp tài liệu lên Cloudinary hoặc nhập đường dẫn hợp lệ.");
  }

  if (!/^https:\/\/res\.cloudinary\.com\//i.test(resolvedFileUrl)) {
    await validateUrlForSsrf(resolvedFileUrl);
  }

  // Validate optional folder assignment
  const requestedFolderId =
    parsed.folderId !== undefined ? parsed.folderId?.trim() || null : existingDoc?.folderId ?? null;
  let targetFolder: LibraryFolder | null = null;
  if (requestedFolderId) {
    targetFolder = await getFolderByIdResolved(requestedFolderId);
    if (!targetFolder || targetFolder.status === "hidden") {
      throw new Error("Thư mục lưu trữ không tồn tại hoặc đã bị ẩn.");
    }
    if (!isAdmin && targetFolder.ownerUid !== actor.uid) {
      throw new Error("Bạn chỉ có thể đăng tài liệu vào thư mục của chính mình.");
    }
  }

  const accessMode = parsed.accessMode === "paid" && parsed.priceVnd > 0 ? "paid" : "free";
  const priceVnd = accessMode === "paid" ? sanitizeVnd(parsed.priceVnd) : 0;

  if (accessMode === "paid") {
    if (priceVnd < 1000) {
      throw new Error("Mức phí tài liệu trả phí tối thiểu là 1.000đ.");
    }
    const maxAllowed = isAdmin ? 5000000 : settings.maxUserPriceVnd;
    if (priceVnd > maxAllowed) {
      throw new Error(`Mức phí tối đa cho phép là ${maxAllowed.toLocaleString("vi-VN")}đ.`);
    }
  }

  const now = new Date().toISOString();
  const docId =
    existingId || `ldoc_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

  let nextStatus: DocumentStatus = "published";
  if (isAdmin) {
    nextStatus = parsed.status || existingDoc?.status || "published";
  } else {
    nextStatus = settings.autoApproveUserUploads ? "published" : "pending";
  }

  const cleanAnswerUrl =
    parsed.answerUrl !== undefined
      ? parsed.answerUrl.trim() || undefined
      : existingSecrets?.answerUrl || existingDoc?.answerUrl || undefined;
  const cleanVideoUrl =
    parsed.videoUrl !== undefined
      ? parsed.videoUrl.trim() || undefined
      : existingSecrets?.videoUrl || existingDoc?.videoUrl || undefined;
  const cleanSubFiles =
    parsed.subFiles !== undefined
      ? parsed.subFiles
      : existingSecrets?.subFiles || existingDoc?.subFiles || undefined;
  const cleanOriginalFileName =
    parsed.originalFileName?.trim() ||
    existingSecrets?.originalFileName ||
    existingDoc?.originalFileName ||
    undefined;

  const authorRole =
    existingDoc?.authorRole && existingDoc.authorRole !== "seed"
      ? existingDoc.authorRole
      : isAdmin
      ? "admin"
      : "community";

  const authorName =
    existingDoc?.authorName && existingDoc.authorRole !== "seed"
      ? existingDoc.authorName
      : actor.displayName ||
        actor.email?.split("@")[0] ||
        (isAdmin ? "Ban Quản Trị DkTEST" : "Thành viên DkTEST");

  const resolvedSpace: DocumentSpaceKey = targetFolder
    ? targetFolder.space
    : isAdmin
    ? parsed.space || existingDoc?.space || "dktest_exclusive"
    : "community";

  const resolvedSourceKey: DocumentSourceKey = targetFolder?.sourceKey
    ? targetFolder.sourceKey
    : resolvedSpace === "dktest_exclusive"
    ? "dktest"
    : existingDoc?.sourceKey || "community";

  const fullDoc: LibraryDocument = {
    id: docId,
    title: parsed.title,
    description:
      parsed.description?.trim() ||
      `Tài liệu ${parsed.title} được chia sẻ trên Kho Tài Liệu DkTEST.`,
    grade: parsed.grade as DocumentGradeKey,
    subject: parsed.subject as DocumentSubjectKey,
    category: parsed.category as DocumentCategoryKey,
    fileFormat: parsed.fileFormat as DocumentFileFormat,
    folderId: requestedFolderId,
    space: resolvedSpace,
    sourceKey: resolvedSourceKey,
    ...(parsed.pageCount
      ? { pageCount: parsed.pageCount }
      : existingDoc?.pageCount
      ? { pageCount: existingDoc.pageCount }
      : {}),
    ...(parsed.fileSizeBytes
      ? { fileSizeBytes: parsed.fileSizeBytes }
      : existingDoc?.fileSizeBytes
      ? { fileSizeBytes: existingDoc.fileSizeBytes }
      : {}),
    coverImageUrl:
      parsed.coverImageUrl !== undefined
        ? parsed.coverImageUrl
        : existingDoc?.coverImageUrl || null,
    ...(parsed.previewImageUrls?.length
      ? { previewImageUrls: parsed.previewImageUrls }
      : existingDoc?.previewImageUrls?.length
      ? { previewImageUrls: existingDoc.previewImageUrls }
      : {}),
    accessMode,
    priceVnd,
    previewPageCount: parsed.previewPageCount ?? existingDoc?.previewPageCount ?? 2,
    salesEnabled: parsed.salesEnabled ?? existingDoc?.salesEnabled ?? true,
    ...(accessMode === "free"
      ? {
          fileUrl: resolvedFileUrl,
          ...(cleanOriginalFileName ? { originalFileName: cleanOriginalFileName } : {}),
          ...(cleanAnswerUrl ? { answerUrl: cleanAnswerUrl } : {}),
          ...(cleanVideoUrl ? { videoUrl: cleanVideoUrl } : {}),
          ...(cleanSubFiles?.length ? { subFiles: cleanSubFiles } : {}),
        }
      : {}),
    authorUid: existingDoc?.authorUid || actor.uid,
    authorName,
    authorRole,
    ...(existingDoc?.sourceName ? { sourceName: existingDoc.sourceName } : {}),
    ...(existingDoc?.sourcePostUrl ? { sourcePostUrl: existingDoc.sourcePostUrl } : {}),
    status: nextStatus,
    isFeatured: isAdmin
      ? parsed.isFeatured ?? existingDoc?.isFeatured ?? false
      : existingDoc?.isFeatured ?? false,
    tags: parsed.tags || existingDoc?.tags || [],
    viewCount: existingDoc?.viewCount || 0,
    downloadCount: existingDoc?.downloadCount || 0,
    purchaseCount: existingDoc?.purchaseCount || 0,
    totalRevenueVnd: existingDoc?.totalRevenueVnd || 0,
    publishedAt: existingDoc?.publishedAt || now,
    createdAt: existingDoc?.createdAt || now,
    updatedAt: now,
  };

  const publicDoc = sanitizePublicDocument(fullDoc);
  const secretsPayload = {
    docId,
    fileUrl: resolvedFileUrl,
    ...(cleanOriginalFileName ? { originalFileName: cleanOriginalFileName } : {}),
    ...(cleanAnswerUrl ? { answerUrl: cleanAnswerUrl } : {}),
    ...(cleanVideoUrl ? { videoUrl: cleanVideoUrl } : {}),
    ...(cleanSubFiles?.length ? { subFiles: cleanSubFiles } : {}),
    updatedAt: now,
  };

  if (adminDb) {
    const batch = adminDb.batch();
    batch.set(adminDb.collection(DOCS_COLLECTION).doc(docId), publicDoc);
    batch.set(adminDb.collection(SECRETS_COLLECTION).doc(docId), secretsPayload);
    await batch.commit();
  } else {
    await setFirestoreRestDoc(DOCS_COLLECTION, docId, publicDoc);
    await setFirestoreRestDoc(SECRETS_COLLECTION, docId, secretsPayload);
  }

  invalidateDocumentLibraryCache();
  return publicDoc;
}

export async function moveDocumentsToFolder(
  actor: { uid: string; role: string },
  params: { docIds: string[]; folderId: string | null }
): Promise<{ movedCount: number }> {
  const isAdmin = actor.role === "admin" || actor.role === "super_admin";
  const cleanIds = [...new Set((params.docIds || []).map((x) => String(x || "").trim()).filter(Boolean))].slice(
    0,
    60
  );
  if (cleanIds.length === 0) {
    throw new Error("Vui lòng chọn ít nhất 1 tài liệu để di chuyển.");
  }

  const cleanFolderId = params.folderId?.trim() || null;
  let targetFolder: LibraryFolder | null = null;
  if (cleanFolderId) {
    targetFolder = await getFolderByIdResolved(cleanFolderId);
    if (!targetFolder || targetFolder.status === "hidden") {
      throw new Error("Thư mục đích không tồn tại.");
    }
    if (!isAdmin && targetFolder.ownerUid !== actor.uid) {
      throw new Error("Bạn chỉ có thể di chuyển tài liệu vào thư mục của chính mình.");
    }
  }

  const now = new Date().toISOString();
  let movedCount = 0;

  for (const docId of cleanIds) {
    const doc = await getDocumentByIdResolved(docId);
    if (!doc) continue;
    if (!isAdmin && doc.authorUid !== actor.uid) {
      throw new Error(`Bạn không có quyền di chuyển tài liệu "${doc.title}".`);
    }

    const nextSpace: DocumentSpaceKey = targetFolder
      ? targetFolder.space
      : doc.authorRole === "admin"
      ? "dktest_exclusive"
      : "community";
    const nextSourceKey: DocumentSourceKey = targetFolder?.sourceKey
      ? targetFolder.sourceKey
      : nextSpace === "dktest_exclusive"
      ? "dktest"
      : "community";

    const updated: LibraryDocument = sanitizePublicDocument({
      ...doc,
      folderId: cleanFolderId,
      space: nextSpace,
      sourceKey: nextSourceKey,
      updatedAt: now,
    });

    if (adminDb) {
      await adminDb.collection(DOCS_COLLECTION).doc(docId).set(updated, { merge: true });
    } else {
      await setFirestoreRestDoc(DOCS_COLLECTION, docId, updated);
    }
    movedCount++;
  }

  invalidateDocumentLibraryCache();
  return { movedCount };
}

export async function deleteLibraryDocument(
  actor: { uid: string; role: string },
  docId: string
): Promise<{ deleted: boolean; hiddenSeed?: boolean }> {
  const cleanId = String(docId || "").trim();
  if (!cleanId) throw new Error("Mã tài liệu không hợp lệ.");

  const isAdmin = actor.role === "admin" || actor.role === "super_admin";
  const existing = await getDocumentByIdResolved(cleanId);
  if (!existing) throw new Error("Không tìm thấy tài liệu.");

  if (!isAdmin && existing.authorUid !== actor.uid) {
    throw new Error("Bạn không có quyền xóa tài liệu này.");
  }

  const isSeed = Boolean(getSeedDocumentById(cleanId));
  if (isSeed && isAdmin) {
    const hiddenOverride: LibraryDocument = {
      ...existing,
      status: "hidden",
      updatedAt: new Date().toISOString(),
    };
    if (adminDb) {
      await adminDb.collection(DOCS_COLLECTION).doc(cleanId).set(hiddenOverride, { merge: true });
    } else {
      await setFirestoreRestDoc(DOCS_COLLECTION, cleanId, hiddenOverride);
    }
    invalidateDocumentLibraryCache();
    return { deleted: true, hiddenSeed: true };
  }

  if (adminDb) {
    const batch = adminDb.batch();
    batch.delete(adminDb.collection(DOCS_COLLECTION).doc(cleanId));
    batch.delete(adminDb.collection(SECRETS_COLLECTION).doc(cleanId));
    await batch.commit();
  } else {
    await deleteFirestoreRestDoc(DOCS_COLLECTION, cleanId);
    await deleteFirestoreRestDoc(SECRETS_COLLECTION, cleanId).catch(() => {});
  }

  invalidateDocumentLibraryCache();
  return { deleted: true };
}

export async function moderateLibraryDocument(
  adminActor: { uid: string; displayName?: string },
  docId: string,
  patch: {
    status?: DocumentStatus;
    rejectionReason?: string;
    isFeatured?: boolean;
    priceVnd?: number;
    accessMode?: "free" | "paid";
    folderId?: string | null;
  }
): Promise<LibraryDocument> {
  const existing = await getDocumentByIdResolved(docId);
  if (!existing) throw new Error("Không tìm thấy tài liệu cần duyệt.");

  const secrets = await getDocumentSecrets(docId);
  const now = new Date().toISOString();
  const nextAccessMode =
    patch.accessMode !== undefined
      ? patch.accessMode
      : patch.priceVnd !== undefined
      ? patch.priceVnd > 0
        ? "paid"
        : "free"
      : existing.accessMode;
  const nextPrice =
    nextAccessMode === "paid"
      ? sanitizeVnd(patch.priceVnd !== undefined ? patch.priceVnd : existing.priceVnd)
      : 0;

  const updated: LibraryDocument = sanitizePublicDocument({
    ...existing,
    ...(nextAccessMode === "free" && secrets?.fileUrl ? { fileUrl: secrets.fileUrl } : {}),
    ...(patch.folderId !== undefined ? { folderId: patch.folderId } : {}),
    accessMode: nextAccessMode,
    priceVnd: nextPrice,
    status: patch.status || existing.status,
    ...(patch.rejectionReason !== undefined ? { rejectionReason: patch.rejectionReason } : {}),
    ...(patch.isFeatured !== undefined ? { isFeatured: patch.isFeatured } : {}),
    updatedAt: now,
  });

  if (adminDb) {
    await adminDb.collection(DOCS_COLLECTION).doc(docId).set(updated);
  } else {
    await setFirestoreRestDoc(DOCS_COLLECTION, docId, updated);
  }

  if (patch.status && patch.status !== existing.status && existing.authorUid) {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const isApproved = patch.status === "published";
    const notifDoc = {
      id: notifId,
      userId: existing.authorUid,
      recipientUid: existing.authorUid,
      title: isApproved
        ? `✅ Tài liệu "${existing.title}" đã được duyệt!`
        : `⚠️ Tài liệu "${existing.title}" cần chỉnh sửa`,
      content: isApproved
        ? `Tài liệu của bạn đã xuất hiện công khai trên Kho Tài Liệu DkTEST.`
        : `Lý do: ${patch.rejectionReason || "Nội dung chưa phù hợp tiêu chuẩn cộng đồng."}`,
      type: "system",
      read: false,
      link: `/student/documents/${encodeURIComponent(docId)}`,
      createdAt: now,
    };
    try {
      if (adminDb) {
        await adminDb.collection("notifications").doc(notifId).set(notifDoc);
      } else {
        await setFirestoreRestDoc("notifications", notifId, notifDoc);
      }
    } catch {}
  }

  invalidateDocumentLibraryCache();
  return updated;
}

export async function checkDocumentAccess(
  uid: string | null | undefined,
  docId: string,
  role = "student"
): Promise<DocumentAccessCheckResult> {
  const doc = await getDocumentByIdResolved(docId);
  if (!doc || doc.status === "hidden") {
    throw new Error("Tài liệu không tồn tại hoặc đã bị gỡ.");
  }

  const priceVnd = doc.accessMode === "paid" ? sanitizeVnd(doc.priceVnd) : 0;
  const isFree = priceVnd <= 0;
  const isAdmin = role === "admin" || role === "super_admin";
  const isOwner = Boolean(uid && doc.authorUid && doc.authorUid === uid);

  if (isFree || isAdmin || isOwner) {
    return {
      hasAccess: true,
      isFree,
      isOwner: isOwner || isAdmin,
      unlocked: !isFree,
      priceVnd,
      previewPageCount: doc.previewPageCount ?? 2,
      userBalanceVnd: 0,
      missingVnd: 0,
      canUnlock: true,
    };
  }

  if (!uid) {
    return {
      hasAccess: false,
      isFree: false,
      isOwner: false,
      unlocked: false,
      priceVnd,
      previewPageCount: doc.previewPageCount ?? 2,
      userBalanceVnd: 0,
      missingVnd: priceVnd,
      canUnlock: false,
    };
  }

  const entId = `${uid}_${docId}`;
  let entDoc: any = null;
  if (adminDb) {
    const snap = await adminDb.collection(ENTITLEMENTS_COLLECTION).doc(entId).get();
    if (snap.exists) entDoc = snap.data();
  } else {
    entDoc = await getFirestoreRestDoc(ENTITLEMENTS_COLLECTION, entId);
  }

  if (entDoc && entDoc.status === "active") {
    return {
      hasAccess: true,
      isFree: false,
      isOwner: false,
      unlocked: true,
      priceVnd,
      previewPageCount: doc.previewPageCount ?? 2,
      userBalanceVnd: 0,
      missingVnd: 0,
      canUnlock: true,
    };
  }

  const wallet = await getOrCreateWallet(uid);
  const balance = sanitizeVnd(wallet.balanceVnd);
  const missingVnd = Math.max(0, priceVnd - balance);

  return {
    hasAccess: false,
    isFree: false,
    isOwner: false,
    unlocked: false,
    priceVnd,
    previewPageCount: doc.previewPageCount ?? 2,
    userBalanceVnd: balance,
    missingVnd,
    canUnlock: balance >= priceVnd && doc.salesEnabled !== false,
  };
}

export async function getAuthorizedDocumentContent(
  uid: string | null | undefined,
  docId: string,
  role = "student"
): Promise<DocumentAuthorizedContent> {
  const doc = await getDocumentByIdResolved(docId);
  if (!doc || doc.status === "hidden") {
    throw new Error("Tài liệu không tồn tại.");
  }

  const access = await checkDocumentAccess(uid, docId, role);
  if (!access.hasAccess) {
    throw new Error(
      `Tài liệu trả phí (${access.priceVnd.toLocaleString("vi-VN")}đ). Vui lòng mở khóa để đọc trọn bộ và tải PDF gốc.`
    );
  }

  const secrets = await getDocumentSecrets(docId);
  const fileUrl = secrets?.fileUrl || doc.fileUrl || "";
  if (!fileUrl) {
    throw new Error("Không tìm thấy đường dẫn tệp gốc của tài liệu này.");
  }

  return {
    docId,
    hasFullAccess: true,
    isPreviewOnly: false,
    previewPageCount: doc.previewPageCount ?? 2,
    fileUrl,
    originalFileName: secrets?.originalFileName || doc.originalFileName,
    answerUrl: secrets?.answerUrl || doc.answerUrl,
    videoUrl: secrets?.videoUrl || doc.videoUrl,
    subFiles: secrets?.subFiles || doc.subFiles,
  };
}

/**
 * Bulk-resolves authorized download URLs for Batch / Whole-Folder Download ("Tải toàn bộ").
 * Strictly enforces paid entitlements: locked paid documents are skipped and NEVER leak secret URLs.
 */
export async function resolveBatchAuthorizedDocuments(
  uid: string | null | undefined,
  role = "student",
  docIds: string[]
): Promise<{
  items: Array<DocumentAuthorizedContent & { title: string; fileFormat: DocumentFileFormat }>;
  skippedLockedCount: number;
  skippedLockedTitles: string[];
}> {
  const cleanIds = [...new Set((docIds || []).map((x) => String(x || "").trim()).filter(Boolean))].slice(
    0,
    80
  );
  const isAdmin = role === "admin" || role === "super_admin";
  const unlockedSet =
    uid && !isAdmin ? new Set(await getMyUnlockedDocumentIds(uid)) : new Set<string>();

  const items: Array<DocumentAuthorizedContent & { title: string; fileFormat: DocumentFileFormat }> = [];
  const skippedLockedTitles: string[] = [];

  for (const id of cleanIds) {
    // Fast-path for free static seed documents (0 Firestore reads!)
    const seedDoc = getSeedDocumentById(id);
    if (seedDoc && (!cachedLiveDocs || !cachedLiveDocs.items.some((x) => x.id === id))) {
      if (seedDoc.fileUrl) {
        items.push({
          docId: seedDoc.id,
          title: seedDoc.title,
          fileFormat: seedDoc.fileFormat,
          hasFullAccess: true,
          isPreviewOnly: false,
          previewPageCount: 0,
          fileUrl: seedDoc.fileUrl,
          originalFileName: seedDoc.originalFileName,
          answerUrl: seedDoc.answerUrl,
          videoUrl: seedDoc.videoUrl,
          subFiles: seedDoc.subFiles,
        });
      }
      continue;
    }

    const doc = await getDocumentByIdResolved(id);
    if (!doc || doc.status === "hidden") continue;

    const priceVnd = doc.accessMode === "paid" ? sanitizeVnd(doc.priceVnd) : 0;
    const isFree = priceVnd <= 0;
    const isOwner = Boolean(uid && doc.authorUid && doc.authorUid === uid);
    const hasAccess = isFree || isAdmin || isOwner || unlockedSet.has(doc.id);

    if (!hasAccess) {
      skippedLockedTitles.push(doc.title);
      continue;
    }

    const secrets = isFree && doc.fileUrl ? null : await getDocumentSecrets(doc.id);
    const fileUrl = secrets?.fileUrl || doc.fileUrl || "";
    if (!fileUrl) continue;

    items.push({
      docId: doc.id,
      title: doc.title,
      fileFormat: doc.fileFormat,
      hasFullAccess: true,
      isPreviewOnly: false,
      previewPageCount: doc.previewPageCount ?? 2,
      fileUrl,
      originalFileName: secrets?.originalFileName || doc.originalFileName,
      answerUrl: secrets?.answerUrl || doc.answerUrl,
      videoUrl: secrets?.videoUrl || doc.videoUrl,
      subFiles: secrets?.subFiles || doc.subFiles,
    });
  }

  return {
    items,
    skippedLockedCount: skippedLockedTitles.length,
    skippedLockedTitles,
  };
}

export async function unlockLibraryDocument(
  uid: string,
  docId: string,
  idempotencyKey?: string,
  voucherCode?: string
): Promise<{
  alreadyUnlocked: boolean;
  newBalanceVnd: number;
  entitlement: DocumentEntitlement;
  discountVnd: number;
  finalPriceVnd: number;
}> {
  if (!uid) throw new Error("Vui lòng đăng nhập để mở khóa tài liệu.");
  const doc = await getDocumentByIdResolved(docId);
  if (!doc || doc.status !== "published") {
    throw new Error("Tài liệu không khả dụng để mở khóa.");
  }
  if (doc.salesEnabled === false) {
    throw new Error("Tài liệu này hiện đang tạm dừng mở khóa.");
  }

  const basePriceVnd = doc.accessMode === "paid" ? sanitizeVnd(doc.priceVnd) : 0;
  const entId = `${uid}_${docId}`;
  const now = new Date().toISOString();

  if (basePriceVnd <= 0 || doc.authorUid === uid) {
    const freeEnt: DocumentEntitlement = {
      id: entId,
      uid,
      docId,
      docTitleSnapshot: doc.title,
      authorUid: doc.authorUid,
      pricePaidVnd: 0,
      creatorShareVnd: 0,
      platformFeeVnd: 0,
      status: "active",
      grantedBy: "wallet_purchase",
      createdAt: now,
    };
    const wallet = await getOrCreateWallet(uid);
    return {
      alreadyUnlocked: true,
      newBalanceVnd: sanitizeVnd(wallet.balanceVnd),
      entitlement: freeEnt,
      discountVnd: 0,
      finalPriceVnd: 0,
    };
  }

  let discountVnd = 0;
  let appliedVoucher: Voucher | null = null;
  if (voucherCode && String(voucherCode).trim()) {
    const vRes = await validateVoucher({
      code: String(voucherCode).trim(),
      uid,
      context: "document_unlock",
      amountVnd: basePriceVnd,
    });
    if (!vRes.valid || !vRes.voucher) {
      throw new Error(vRes.message || "Mã voucher không hợp lệ cho tài liệu này.");
    }
    discountVnd = sanitizeVnd(vRes.discountVnd || 0);
    appliedVoucher = vRes.voucher;
  }

  const finalPriceVnd = Math.max(0, basePriceVnd - discountVnd);
  const settings = await getDocumentLibrarySettings();
  const isCommunityCreator =
    doc.authorRole === "community" && Boolean(doc.authorUid) && doc.authorUid !== uid;
  const creatorShareVnd =
    isCommunityCreator && finalPriceVnd > 0
      ? Math.floor((finalPriceVnd * settings.creatorRevenueSharePercent) / 100)
      : 0;
  const platformFeeVnd = Math.max(0, finalPriceVnd - creatorShareVnd);

  await getOrCreateWallet(uid);
  if (isCommunityCreator && doc.authorUid) {
    await getOrCreateWallet(doc.authorUid).catch(() => {});
  }

  const txDebitId = `tx_doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const txCreditId = `tx_docrev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const usageId = `vuse_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (adminDb) {
    const txRes = await adminDb.runTransaction(async (transaction) => {
      const entRef = adminDb!.collection(ENTITLEMENTS_COLLECTION).doc(entId);
      const buyerWalletRef = adminDb!.collection("wallets").doc(uid);
      const docRef = adminDb!.collection(DOCS_COLLECTION).doc(docId);

      const [entSnap, buyerSnap, docSnap] = await Promise.all([
        transaction.get(entRef),
        transaction.get(buyerWalletRef),
        transaction.get(docRef),
      ]);

      const buyerData = (buyerSnap.data() || {}) as StudentWallet;
      const buyerBalance = sanitizeVnd(buyerData.balanceVnd);

      if (entSnap.exists && entSnap.data()?.status === "active") {
        return {
          alreadyUnlocked: true,
          newBalanceVnd: buyerBalance,
          entitlement: entSnap.data() as DocumentEntitlement,
        };
      }

      if (buyerBalance < finalPriceVnd) {
        throw new Error(
          `Số dư không đủ (cần ${finalPriceVnd.toLocaleString("vi-VN")}đ, hiện có ${buyerBalance.toLocaleString("vi-VN")}đ). Vui lòng nạp thêm vào Ví DkTEST!`
        );
      }

      let creatorSnap: any = null;
      const creatorWalletRef =
        isCommunityCreator && doc.authorUid && creatorShareVnd > 0
          ? adminDb!.collection("wallets").doc(doc.authorUid)
          : null;
      if (creatorWalletRef) {
        creatorSnap = await transaction.get(creatorWalletRef);
      }

      const newBuyerBalance = buyerBalance - finalPriceVnd;
      transaction.set(
        buyerWalletRef,
        {
          balanceVnd: newBuyerBalance,
          totalSpentVnd: sanitizeVnd(buyerData.totalSpentVnd) + finalPriceVnd,
          updatedAt: now,
        },
        { merge: true }
      );

      const debitTx: WalletTransaction = {
        id: txDebitId,
        uid,
        type: "document_unlock_debit",
        amountVnd: finalPriceVnd,
        balanceBeforeVnd: buyerBalance,
        balanceAfterVnd: newBuyerBalance,
        idempotencyKey: idempotencyKey || entId,
        actorUid: uid,
        actorName: buyerData.fullName || "Học sinh",
        note: `Mở khóa tài liệu: "${doc.title}"${appliedVoucher ? ` (Voucher ${appliedVoucher.code} -${discountVnd.toLocaleString("vi-VN")}đ)` : ""}`,
        createdAt: now,
      };
      transaction.set(adminDb!.collection("wallet_transactions").doc(txDebitId), debitTx);

      if (creatorWalletRef && doc.authorUid && creatorShareVnd > 0) {
        const cData = (creatorSnap?.exists ? creatorSnap.data() : {}) as StudentWallet;
        const cBefore = sanitizeVnd(cData.balanceVnd);
        const cAfter = cBefore + creatorShareVnd;
        transaction.set(
          creatorWalletRef,
          {
            uid: doc.authorUid,
            balanceVnd: cAfter,
            totalCreditedVnd: sanitizeVnd(cData.totalCreditedVnd) + creatorShareVnd,
            updatedAt: now,
          },
          { merge: true }
        );
        const creditTx: WalletTransaction = {
          id: txCreditId,
          uid: doc.authorUid,
          type: "document_revenue_credit",
          amountVnd: creatorShareVnd,
          balanceBeforeVnd: cBefore,
          balanceAfterVnd: cAfter,
          idempotencyKey: `rev_${entId}`,
          actorUid: "system",
          actorName: "Kho Tài Liệu DkTEST",
          note: `Doanh thu tác giả (${settings.creatorRevenueSharePercent}%): Tài liệu "${doc.title}" được mở khóa`,
          createdAt: now,
        };
        transaction.set(adminDb!.collection("wallet_transactions").doc(txCreditId), creditTx);

        const notifId = `notif_docrev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        transaction.set(adminDb!.collection("notifications").doc(notifId), {
          id: notifId,
          userId: doc.authorUid,
          recipientUid: doc.authorUid,
          title: `🎉 Tài liệu của bạn vừa có người mua! (+${creatorShareVnd.toLocaleString("vi-VN")}đ)`,
          content: `Bạn nhận được +${creatorShareVnd.toLocaleString("vi-VN")}đ vào Ví DkTEST từ lượt mở khóa tài liệu "${doc.title}".`,
          type: "system",
          read: false,
          link: "/student/documents?tab=mine",
          createdAt: now,
        });
      }

      const entDoc: DocumentEntitlement = {
        id: entId,
        uid,
        docId,
        docTitleSnapshot: doc.title,
        authorUid: doc.authorUid,
        pricePaidVnd: finalPriceVnd,
        creatorShareVnd,
        platformFeeVnd,
        status: "active",
        grantedBy: "wallet_purchase",
        transactionId: txDebitId,
        ...(appliedVoucher ? { voucherCode: appliedVoucher.code } : {}),
        createdAt: now,
      };
      transaction.set(entRef, entDoc);

      if (docSnap.exists) {
        const curPurchases = Number(docSnap.data()?.purchaseCount || 0);
        const curRev = Number(docSnap.data()?.totalRevenueVnd || 0);
        transaction.update(docRef, {
          purchaseCount: curPurchases + 1,
          totalRevenueVnd: curRev + finalPriceVnd,
          updatedAt: now,
        });
      }

      if (appliedVoucher) {
        const vRef = adminDb!.collection("vouchers").doc(appliedVoucher.id);
        transaction.set(
          vRef,
          { usedCount: (appliedVoucher.usedCount || 0) + 1, updatedAt: now },
          { merge: true }
        );
        const usageDoc: VoucherUsage = {
          id: usageId,
          voucherId: appliedVoucher.id,
          voucherCode: appliedVoucher.code,
          uid,
          studentName: buyerData.fullName || "",
          studentClass: buyerData.currentClass || "",
          type: appliedVoucher.type,
          discountVnd,
          usedAt: now,
          context: "exam_unlock",
          referenceId: docId,
        };
        transaction.set(adminDb!.collection("voucher_usages").doc(usageId), usageDoc);
      }

      return {
        alreadyUnlocked: false,
        newBalanceVnd: newBuyerBalance,
        entitlement: entDoc,
      };
    });

    if (appliedVoucher) {
      invalidateVouchersCache();
      invalidateVoucherUsagesCache();
    }
    invalidateDocumentLibraryCache();
    invalidateWalletOverviewCache();
    invalidateStudentDetailsCache(uid);
    if (doc.authorUid) invalidateStudentDetailsCache(doc.authorUid);

    return {
      ...txRes,
      discountVnd,
      finalPriceVnd,
    };
  }

  // REST fallback mode
  const existingEnt = await getFirestoreRestDoc(ENTITLEMENTS_COLLECTION, entId);
  const buyerWallet = await getOrCreateWallet(uid);
  const buyerBalance = sanitizeVnd(buyerWallet.balanceVnd);

  if (existingEnt && existingEnt.status === "active") {
    return {
      alreadyUnlocked: true,
      newBalanceVnd: buyerBalance,
      entitlement: existingEnt as DocumentEntitlement,
      discountVnd: 0,
      finalPriceVnd,
    };
  }

  if (buyerBalance < finalPriceVnd) {
    throw new Error(
      `Số dư không đủ (cần ${finalPriceVnd.toLocaleString("vi-VN")}đ, hiện có ${buyerBalance.toLocaleString("vi-VN")}đ).`
    );
  }

  const newBuyerBalance = buyerBalance - finalPriceVnd;
  await setFirestoreRestDoc("wallets", uid, {
    ...buyerWallet,
    balanceVnd: newBuyerBalance,
    totalSpentVnd: sanitizeVnd(buyerWallet.totalSpentVnd) + finalPriceVnd,
    updatedAt: now,
  });

  await setFirestoreRestDoc("wallet_transactions", txDebitId, {
    id: txDebitId,
    uid,
    type: "document_unlock_debit",
    amountVnd: finalPriceVnd,
    balanceBeforeVnd: buyerBalance,
    balanceAfterVnd: newBuyerBalance,
    idempotencyKey: idempotencyKey || entId,
    actorUid: uid,
    actorName: buyerWallet.fullName || "Học sinh",
    note: `Mở khóa tài liệu: "${doc.title}"`,
    createdAt: now,
  });

  if (isCommunityCreator && doc.authorUid && creatorShareVnd > 0) {
    const cWallet = await getOrCreateWallet(doc.authorUid);
    const cBefore = sanitizeVnd(cWallet.balanceVnd);
    await setFirestoreRestDoc("wallets", doc.authorUid, {
      ...cWallet,
      balanceVnd: cBefore + creatorShareVnd,
      totalCreditedVnd: sanitizeVnd(cWallet.totalCreditedVnd) + creatorShareVnd,
      updatedAt: now,
    });
  }

  const entDoc: DocumentEntitlement = {
    id: entId,
    uid,
    docId,
    docTitleSnapshot: doc.title,
    authorUid: doc.authorUid,
    pricePaidVnd: finalPriceVnd,
    creatorShareVnd,
    platformFeeVnd,
    status: "active",
    grantedBy: "wallet_purchase",
    transactionId: txDebitId,
    createdAt: now,
  };
  await setFirestoreRestDoc(ENTITLEMENTS_COLLECTION, entId, entDoc);
  invalidateDocumentLibraryCache();

  return {
    alreadyUnlocked: false,
    newBalanceVnd: newBuyerBalance,
    entitlement: entDoc,
    discountVnd,
    finalPriceVnd,
  };
}

export async function grantOrRevokeDocumentEntitlement(
  adminActor: { uid: string; displayName?: string },
  params: { uid: string; docId: string; action: "grant" | "revoke" }
): Promise<DocumentEntitlement> {
  const cleanUid = String(params.uid || "").trim();
  const cleanDocId = String(params.docId || "").trim();
  if (!cleanUid || !cleanDocId) throw new Error("Thiếu UID người dùng hoặc mã tài liệu.");

  const doc = await getDocumentByIdResolved(cleanDocId);
  if (!doc) throw new Error("Không tìm thấy tài liệu.");

  const entId = `${cleanUid}_${cleanDocId}`;
  const now = new Date().toISOString();
  const ent: DocumentEntitlement = {
    id: entId,
    uid: cleanUid,
    docId: cleanDocId,
    docTitleSnapshot: doc.title,
    authorUid: doc.authorUid,
    pricePaidVnd: 0,
    creatorShareVnd: 0,
    platformFeeVnd: 0,
    status: params.action === "grant" ? "active" : "revoked",
    grantedBy: "admin_grant",
    createdAt: now,
    updatedAt: now,
  };

  if (adminDb) {
    await adminDb.collection(ENTITLEMENTS_COLLECTION).doc(entId).set(ent, { merge: true });
  } else {
    await setFirestoreRestDoc(ENTITLEMENTS_COLLECTION, entId, ent);
  }
  return ent;
}

export async function getAdminDocumentPurchases(limitCount = 100): Promise<DocumentEntitlement[]> {
  const safeLimit = Math.max(1, Math.min(250, limitCount));
  if (adminDb) {
    try {
      const snap = await adminDb
        .collection(ENTITLEMENTS_COLLECTION)
        .orderBy("createdAt", "desc")
        .limit(safeLimit)
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    } catch {
      const snap = await adminDb.collection(ENTITLEMENTS_COLLECTION).limit(safeLimit).get();
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      return items;
    }
  }
  const rest = (await getFirestoreRestDocs(ENTITLEMENTS_COLLECTION, safeLimit, true)) || [];
  rest.sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return rest as DocumentEntitlement[];
}

// ---------------------------------------------------------------------------
// Secure SSRF-Guarded Document Proxy & Cloudinary Page Prober
// ---------------------------------------------------------------------------
const ALLOWED_DOC_PROXY_HOST_PATTERNS = [
  /^res\.cloudinary\.com$/i,
  /^drive\.google\.com$/i,
  /^drive\.usercontent\.google\.com$/i,
  /^docs\.google\.com$/i,
  /\.googleusercontent\.com$/i,
  /^(?:www\.)?nganhangdethi\.org$/i,
  /^(?:www\.)?tailieuonthi\.edu\.vn$/i,
  /^(?:www\.)?tailieuonthi\.org$/i,
  /^(?:www\.)?mathvn\.com$/i,
  /^thpt\.math\.vn$/i,
  /\.blogspot\.com$/i,
];

function isAllowedDocProxyHost(hostname: string): boolean {
  const h = String(hostname || "").toLowerCase();
  return ALLOWED_DOC_PROXY_HOST_PATTERNS.some((re) => re.test(h));
}

function extractDriveIdServer(rawUrl: string): string | null {
  const fileMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/i);
  if (fileMatch) return fileMatch[1];
  try {
    const parsed = new URL(rawUrl);
    if (
      parsed.hostname.includes("drive.google.com") ||
      parsed.hostname.includes("docs.google.com") ||
      parsed.hostname.includes("drive.usercontent.google.com")
    ) {
      const id = parsed.searchParams.get("id");
      if (id && /^[a-zA-Z0-9_-]{15,}$/.test(id)) return id;
    }
  } catch {}
  return null;
}

export async function probeLegacyCloudinaryPagesServer(rawUrl: string): Promise<number> {
  const clean = String(rawUrl || "").trim().split(/[?#]/)[0];
  const match = clean.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:[^/]+\/)*(v\d+\/.+)\.pdf$/i
  );
  if (!match) return 1;
  const probeUrl = `${match[1]}pg_99999,w_120,f_jpg/${match[2]}.jpg`;
  await validateUrlForSsrf(probeUrl);
  const res = await fetch(probeUrl, { signal: AbortSignal.timeout(10000) });
  if (res.ok) return 99999;
  const cldErr = res.headers.get("x-cld-error") || "";
  const m = cldErr.match(/only has\s+(\d+)\s+pages?/i);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

export async function fetchProxiedPdfBuffer(rawUrl: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  const clean = String(rawUrl || "").trim();
  const { url: validatedUrl } = await validateUrlForSsrf(clean);
  if (!isAllowedDocProxyHost(validatedUrl.hostname)) {
    throw new Error(
      `Tên miền lưu trữ "${validatedUrl.hostname}" không nằm trong danh sách cho phép proxy.`
    );
  }

  const driveId = extractDriveIdServer(clean);
  const targetFetchUrl = driveId
    ? `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=download&confirm=t`
    : clean;

  if (targetFetchUrl !== clean) {
    await validateUrlForSsrf(targetFetchUrl);
  }

  const upstream = await fetch(targetFetchUrl, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 DkTEST-PDF-Reader/2.1",
      Accept: "application/pdf,application/octet-stream,*/*",
    },
    signal: AbortSignal.timeout(25000),
  });

  if (!upstream.ok) {
    throw new Error(`Kho lưu trữ phản hồi HTTP ${upstream.status}.`);
  }

  const contentType = upstream.headers.get("content-type") || "application/pdf";
  if (/text\/html/i.test(contentType)) {
    throw new Error("Tệp trên kho lưu trữ bên ngoài yêu cầu xác nhận trình duyệt hoặc là thư mục.");
  }

  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (contentLength > MAX_PROXY_BYTES) {
    const err: any = new Error(
      "Tệp vượt quá giới hạn đọc trực tiếp 44MB, chuyển sang chế độ xem nhúng."
    );
    err.statusCode = 413;
    throw err;
  }

  const reader = upstream.body?.getReader();
  if (!reader) {
    const ab = await upstream.arrayBuffer();
    if (ab.byteLength > MAX_PROXY_BYTES) {
      const err: any = new Error("Tệp vượt quá giới hạn đọc trực tiếp 44MB.");
      err.statusCode = 413;
      throw err;
    }
    return {
      buffer: Buffer.from(ab),
      contentType,
    };
  }

  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_PROXY_BYTES) {
        await reader.cancel().catch(() => {});
        const err: any = new Error("Tệp vượt quá giới hạn đọc trực tiếp 44MB.");
        err.statusCode = 413;
        throw err;
      }
      chunks.push(Buffer.from(value));
    }
  }

  return {
    buffer: Buffer.concat(chunks, total),
    contentType,
  };
}
