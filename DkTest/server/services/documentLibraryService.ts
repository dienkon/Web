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
  type CompactSeedDocument,
  type DocumentAccessCheckResult,
  type DocumentAuthorizedContent,
  type DocumentCategoryKey,
  type DocumentEntitlement,
  type DocumentFileFormat,
  type DocumentGradeKey,
  type DocumentLibrarySettings,
  type DocumentSeedBundle,
  type DocumentStatus,
  type DocumentSubjectKey,
  type LibraryDocument,
} from "../../src/types/documentLibrary.js";
import type { StudentWallet, Voucher, VoucherUsage, WalletTransaction } from "../../src/types/index.js";

const SETTINGS_COLLECTION = "system_settings";
const SETTINGS_DOC_ID = "document_library_config";
const DOCS_COLLECTION = "library_documents";
const SECRETS_COLLECTION = "library_document_secrets";
const ENTITLEMENTS_COLLECTION = "library_entitlements";

const LIVE_DOCS_TTL_MS = 45 * 1000;
const SETTINGS_TTL_MS = 60 * 1000;
const MAX_PROXY_BYTES = 44 * 1024 * 1024; // 44 MB serverless-safe ceiling

let cachedLiveDocs: { items: LibraryDocument[]; timestamp: number } | null = null;
let cachedSettings: { data: DocumentLibrarySettings; timestamp: number } | null = null;
let cachedSeedMap: Map<string, LibraryDocument> | null = null;

export function invalidateDocumentLibraryCache(): void {
  cachedLiveDocs = null;
}

export function invalidateDocumentSettingsCache(): void {
  cachedSettings = null;
}

function loadSeedDocumentsMap(): Map<string, LibraryDocument> {
  if (cachedSeedMap) return cachedSeedMap;
  const map = new Map<string, LibraryDocument>();
  const candidates = [
    path.join(process.cwd(), "public", "data", "document-library-seed.json"),
    path.join(process.cwd(), "dist", "data", "document-library-seed.json"),
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as DocumentSeedBundle;
      if (Array.isArray(parsed?.items)) {
        for (const item of parsed.items) {
          if (item?.id) {
            map.set(item.id, expandCompactSeedDocument(item));
          }
        }
        break;
      }
    } catch (err) {
      console.warn("[documentLibraryService] Failed to parse seed JSON:", err);
    }
  }
  cachedSeedMap = map;
  return map;
}

export function getSeedDocumentById(docId: string): LibraryDocument | null {
  const clean = String(docId || "").trim();
  if (!clean) return null;
  return loadSeedDocumentsMap().get(clean) || null;
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

const subFileSchema = z.object({
  name: z.string().trim().min(1).max(160),
  url: z.string().trim().url().max(2048),
  fileFormat: z
    .enum(["pdf", "docx", "doc", "pptx", "xlsx", "zip", "folder", "sheet", "other"])
    .default("pdf"),
  folderPath: z.string().trim().max(160).optional(),
});

export const upsertDocumentSchema = z.object({
  id: z.string().trim().min(3).max(96).optional(),
  title: z.string().trim().min(3, "Tiêu đề phải có ít nhất 3 ký tự.").max(220),
  description: z.string().trim().max(2000).optional().default(""),
  grade: z
    .enum(["grade_10", "grade_11", "grade_12", "thpt_qg", "dgnl_dgtd", "general"])
    .default("grade_12"),
  subject: z
    .enum([
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
    ])
    .default("math"),
  category: z
    .enum(["exam_test", "ebook_book", "topic_guide", "formula_handbook", "folder_pack"])
    .default("exam_test"),
  fileFormat: z
    .enum(["pdf", "docx", "doc", "pptx", "xlsx", "zip", "folder", "sheet", "other"])
    .default("pdf"),
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
  subFiles: z.array(subFileSchema).max(40).optional(),
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

/**
 * Fetches live Firestore documents (Admin uploads, User community uploads, and Admin overrides on seed items).
 * Cached in server RAM for 45s to guarantee near-zero Firestore read consumption.
 */
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

  // Check live Firestore first (covers new uploads + admin overrides on seed items)
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

  // Fallback to seed repository (0 Firestore reads)
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

  // Validate fileUrl against SSRF / malicious protocols
  if (!/^https:\/\/res\.cloudinary\.com\//i.test(resolvedFileUrl)) {
    await validateUrlForSsrf(resolvedFileUrl);
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
    existingId ||
    `ldoc_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

  let nextStatus: DocumentStatus = "published";
  if (isAdmin) {
    nextStatus = parsed.status || existingDoc?.status || "published";
  } else {
    nextStatus = settings.autoApproveUserUploads ? "published" : "pending";
  }

  const cleanAnswerUrl = parsed.answerUrl?.trim() || existingSecrets?.answerUrl || existingDoc?.answerUrl || undefined;
  const cleanVideoUrl = parsed.videoUrl?.trim() || existingSecrets?.videoUrl || existingDoc?.videoUrl || undefined;
  const cleanSubFiles = parsed.subFiles || existingSecrets?.subFiles || existingDoc?.subFiles || undefined;
  const cleanOriginalFileName =
    parsed.originalFileName?.trim() || existingSecrets?.originalFileName || existingDoc?.originalFileName || undefined;

  const authorRole = existingDoc?.authorRole && existingDoc.authorRole !== "seed"
    ? existingDoc.authorRole
    : isAdmin
    ? "admin"
    : "community";

  const authorName =
    existingDoc?.authorName && existingDoc.authorRole !== "seed"
      ? existingDoc.authorName
      : actor.displayName || actor.email?.split("@")[0] || (isAdmin ? "Ban Quản Trị DkTEST" : "Thành viên DkTEST");

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
    ...(parsed.pageCount ? { pageCount: parsed.pageCount } : existingDoc?.pageCount ? { pageCount: existingDoc.pageCount } : {}),
    ...(parsed.fileSizeBytes ? { fileSizeBytes: parsed.fileSizeBytes } : existingDoc?.fileSizeBytes ? { fileSizeBytes: existingDoc.fileSizeBytes } : {}),
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

  // If this is a seeded item being deleted by Admin, mark status = 'hidden' override
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

  // Notify uploader if status changed
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

  // Validate optional discount voucher
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

  // Ensure buyer wallet & creator wallet exist before transaction
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

      // Credit community author share atomically
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
    type: "exam_unlock_debit",
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
// Secure SSRF-Guarded PDF Proxy & Cloudinary Page Prober
// ---------------------------------------------------------------------------
const ALLOWED_DOC_PROXY_HOST_PATTERNS = [
  /^res\.cloudinary\.com$/i,
  /^drive\.google\.com$/i,
  /^drive\.usercontent\.google\.com$/i,
  /^docs\.google\.com$/i,
  /\.googleusercontent\.com$/i,
  /^www\.nganhangdethi\.org$/i,
  /^www\.mathvn\.com$/i,
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
    throw new Error(`Tên miền lưu trữ "${validatedUrl.hostname}" không nằm trong danh sách cho phép proxy.`);
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
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 DkTEST-PDF-Reader/2.0",
      Accept: "application/pdf,application/octet-stream,*/*",
    },
    signal: AbortSignal.timeout(25000),
  });

  if (!upstream.ok) {
    throw new Error(`Kho lưu trữ phản hồi HTTP ${upstream.status}.`);
  }

  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (contentLength > MAX_PROXY_BYTES) {
    const err: any = new Error("Tệp vượt quá giới hạn đọc trực tiếp 44MB, chuyển sang chế độ xem nhúng.");
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
      contentType: upstream.headers.get("content-type") || "application/pdf",
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
    contentType: upstream.headers.get("content-type") || "application/pdf",
  };
}
