import { Router, type Response } from "express";
import { adminAuth } from "../firebaseAdmin.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  checkDocumentAccess,
  createOrUpdateLibraryDocument,
  createOrUpdateLibraryFolder,
  deleteLibraryDocument,
  deleteLibraryFolder,
  fetchProxiedPdfBuffer,
  getAuthorizedDocumentContent,
  getDocumentByIdResolved,
  getDocumentLibrarySettings,
  getFolderByIdResolved,
  getLiveLibraryDocuments,
  getLiveLibraryFolders,
  getMyLibraryFolders,
  getMyUnlockedDocumentIds,
  getMyUploadedDocuments,
  moveDocumentsToFolder,
  probeLegacyCloudinaryPagesServer,
  resolveBatchAuthorizedDocuments,
  unlockLibraryDocument,
} from "../services/documentLibraryService.js";

export const documentLibraryRouter = Router();

async function extractOptionalAuth(
  req: AuthenticatedRequest
): Promise<{ uid: string | null; role: string }> {
  if (req.user?.uid) {
    return { uid: req.user.uid, role: req.user.role || "student" };
  }
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || "")?.[1];
  if (token && !/^(student_|dk_admin_)/.test(token) && adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      return { uid: decoded.uid, role: (decoded.role as string) || "student" };
    } catch {}
  }
  return { uid: null, role: "student" };
}

// GET /api/documents/live — Live Firestore documents + live folders + settings (server-cached 45s)
documentLibraryRouter.get("/live", async (_req, res: Response) => {
  try {
    const [items, folders, settings] = await Promise.all([
      getLiveLibraryDocuments({ includeNonPublished: false }),
      getLiveLibraryFolders({ includeHidden: true }),
      getDocumentLibrarySettings(),
    ]);
    return res.json({
      success: true,
      items,
      folders,
      settings: {
        autoApproveUserUploads: settings.autoApproveUserUploads,
        creatorRevenueSharePercent: settings.creatorRevenueSharePercent,
        maxUserPriceVnd: settings.maxUserPriceVnd,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "documents_live_error",
      message: err?.message || "Không thể tải danh sách tài liệu mới.",
    });
  }
});

// GET /api/documents/pdf-proxy — SSRF-protected document streaming & legacy Cloudinary page prober
documentLibraryRouter.get("/pdf-proxy", async (req, res: Response) => {
  try {
    const rawUrl = String(req.query?.url || "").trim();
    if (!rawUrl) {
      return res.status(400).json({ error: "missing_url", message: "Thiếu đường dẫn tệp." });
    }

    if (req.query?.action === "probe-pages") {
      const pageCount = await probeLegacyCloudinaryPagesServer(rawUrl);
      return res.json({ success: true, pageCount });
    }

    const { buffer, contentType } = await fetchProxiedPdfBuffer(rawUrl);
    const isDownload = req.query?.download === "1" || req.query?.download === "true";
    const rawFileName = String(req.query?.filename || "Tai_lieu_DkTEST.pdf")
      .replace(/["\r\n]/g, "")
      .trim();
    const asciiFallback = rawFileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-zA-Z0-9._-]+/g, "_");

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType || "application/pdf");
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename="${asciiFallback || "document.pdf"}"; filename*=UTF-8''${encodeURIComponent(rawFileName || "Tai_lieu_DkTEST.pdf")}`
    );
    return res.status(200).send(buffer);
  } catch (err: any) {
    const status = err?.statusCode === 413 ? 413 : 400;
    return res.status(status).json({
      error: "pdf_proxy_error",
      message: err?.message || "Không thể truyền tải tệp tài liệu này.",
    });
  }
});

// GET /api/documents/me — User's own uploaded docs, own folders, and unlocked paid doc IDs
documentLibraryRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const [uploaded, folders, unlockedIds, settings] = await Promise.all([
      getMyUploadedDocuments(uid),
      getMyLibraryFolders(uid),
      getMyUnlockedDocumentIds(uid),
      getDocumentLibrarySettings(),
    ]);
    return res.json({
      success: true,
      uploaded,
      folders,
      unlockedIds,
      settings,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "documents_me_error",
      message: err?.message || "Không thể tải dữ liệu tài liệu cá nhân.",
    });
  }
});

// ---------------------------------------------------------------------------
// Contributor & Admin Folder Routes (/api/documents/folders...)
// ---------------------------------------------------------------------------
documentLibraryRouter.get("/folders/:folderId", async (req, res: Response) => {
  try {
    const folder = await getFolderByIdResolved(req.params.folderId);
    if (!folder || folder.status === "hidden") {
      return res.status(404).json({ error: "not_found", message: "Không tìm thấy thư mục." });
    }
    return res.json({ success: true, folder });
  } catch (err: any) {
    return res.status(400).json({
      error: "folder_get_error",
      message: err?.message || "Không thể tải thông tin thư mục.",
    });
  }
});

documentLibraryRouter.post("/folders", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const folder = await createOrUpdateLibraryFolder(req.user!, req.body || {});
    return res.status(201).json({
      success: true,
      folder,
      message: "Đã tạo thư mục mới thành công!",
    });
  } catch (err: any) {
    const msg = err?.issues?.[0]?.message || err?.message || "Không thể tạo thư mục.";
    return res.status(400).json({ error: "folder_create_error", message: msg });
  }
});

documentLibraryRouter.patch(
  "/folders/:folderId",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const folder = await createOrUpdateLibraryFolder(req.user!, {
        ...(req.body || {}),
        id: req.params.folderId,
      });
      return res.json({
        success: true,
        folder,
        message: "Đã cập nhật thông tin thư mục.",
      });
    } catch (err: any) {
      const msg = err?.issues?.[0]?.message || err?.message || "Không thể cập nhật thư mục.";
      return res.status(400).json({ error: "folder_update_error", message: msg });
    }
  }
);

documentLibraryRouter.delete(
  "/folders/:folderId",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await deleteLibraryFolder(req.user!, req.params.folderId);
      return res.json({
        success: true,
        ...result,
        message: "Đã xóa thư mục thành công.",
      });
    } catch (err: any) {
      return res.status(400).json({
        error: "folder_delete_error",
        message: err?.message || "Không thể xóa thư mục.",
      });
    }
  }
);

// POST /api/documents/bulk-move — Move own/admin documents into a folder
documentLibraryRouter.post(
  "/bulk-move",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { docIds, folderId } = req.body || {};
      const result = await moveDocumentsToFolder(req.user!, {
        docIds: Array.isArray(docIds) ? docIds : [],
        folderId: folderId ? String(folderId) : null,
      });
      return res.json({
        success: true,
        ...result,
        message: `Đã di chuyển ${result.movedCount} tài liệu sang thư mục đích.`,
      });
    } catch (err: any) {
      return res.status(400).json({
        error: "bulk_move_error",
        message: err?.message || "Không thể di chuyển tài liệu.",
      });
    }
  }
);

// POST /api/documents/batch-resolve — Authorized URLs for Batch / Whole-Folder Download ("Tải toàn bộ")
documentLibraryRouter.post("/batch-resolve", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid, role } = await extractOptionalAuth(req);
    const docIds = Array.isArray(req.body?.docIds) ? req.body.docIds : [];
    const resolved = await resolveBatchAuthorizedDocuments(uid, role, docIds);
    return res.json({
      success: true,
      ...resolved,
    });
  } catch (err: any) {
    return res.status(400).json({
      error: "batch_resolve_error",
      message: err?.message || "Không thể chuẩn bị danh sách tải hàng loạt.",
    });
  }
});

// ---------------------------------------------------------------------------
// Document CRUD & Monetization Routes
// ---------------------------------------------------------------------------
documentLibraryRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = await createOrUpdateLibraryDocument(req.user!, req.body || {});
    return res.status(201).json({
      success: true,
      document: created,
      message:
        created.status === "published"
          ? "Đăng tải tài liệu lên Kho Tài Liệu DkTEST thành công!"
          : "Đã gửi tài liệu! Quản trị viên sẽ kiểm duyệt và xuất bản sớm nhất.",
    });
  } catch (err: any) {
    const msg = err?.issues?.[0]?.message || err?.message || "Không thể đăng tài liệu.";
    return res.status(400).json({ error: "document_create_error", message: msg });
  }
});

documentLibraryRouter.patch(
  "/:docId",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await createOrUpdateLibraryDocument(req.user!, {
        ...(req.body || {}),
        id: req.params.docId,
      });
      return res.json({
        success: true,
        document: updated,
        message: "Đã cập nhật thông tin tài liệu.",
      });
    } catch (err: any) {
      const msg = err?.issues?.[0]?.message || err?.message || "Không thể cập nhật tài liệu.";
      return res.status(400).json({ error: "document_update_error", message: msg });
    }
  }
);

documentLibraryRouter.delete(
  "/:docId",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await deleteLibraryDocument(req.user!, req.params.docId);
      return res.json({
        success: true,
        ...result,
        message: "Đã xóa tài liệu khỏi hệ thống.",
      });
    } catch (err: any) {
      return res.status(400).json({
        error: "document_delete_error",
        message: err?.message || "Không thể xóa tài liệu.",
      });
    }
  }
);

documentLibraryRouter.get("/:docId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = await getDocumentByIdResolved(req.params.docId);
    if (!doc || doc.status === "hidden") {
      return res.status(404).json({ error: "not_found", message: "Không tìm thấy tài liệu." });
    }
    return res.json({ success: true, document: doc });
  } catch (err: any) {
    return res.status(400).json({
      error: "document_get_error",
      message: err?.message || "Lỗi tải thông tin tài liệu.",
    });
  }
});

documentLibraryRouter.get("/:docId/access", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid, role } = await extractOptionalAuth(req);
    const access = await checkDocumentAccess(uid, req.params.docId, role);
    return res.json({ success: true, access });
  } catch (err: any) {
    return res.status(400).json({
      error: "document_access_error",
      message: err?.message || "Không kiểm tra được quyền truy cập tài liệu.",
    });
  }
});

documentLibraryRouter.get("/:docId/content", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid, role } = await extractOptionalAuth(req);
    const doc = await getDocumentByIdResolved(req.params.docId);
    if (!doc || doc.status === "hidden") {
      return res.status(404).json({ error: "not_found", message: "Không tìm thấy tài liệu." });
    }

    if (doc.accessMode === "paid" && doc.priceVnd > 0 && !uid) {
      return requireAuth(req, res, async () => {
        try {
          const content = await getAuthorizedDocumentContent(
            req.user!.uid,
            req.params.docId,
            req.user!.role
          );
          return res.json({ success: true, content });
        } catch (innerErr: any) {
          return res.status(403).json({
            error: "document_locked",
            message: innerErr?.message || "Tài liệu trả phí chưa được mở khóa.",
          });
        }
      });
    }

    const content = await getAuthorizedDocumentContent(uid, req.params.docId, role);
    return res.json({ success: true, content });
  } catch (err: any) {
    const msg = err?.message || "Không thể mở nội dung tài liệu.";
    const status = msg.includes("trả phí") ? 403 : 400;
    return res.status(status).json({ error: "document_content_error", message: msg });
  }
});

documentLibraryRouter.post(
  "/:docId/unlock",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const uid = req.user!.uid;
      const { idempotencyKey, voucherCode } = req.body || {};
      const result = await unlockLibraryDocument(uid, req.params.docId, idempotencyKey, voucherCode);
      return res.json({
        success: true,
        ...result,
        message: result.alreadyUnlocked
          ? "Tài liệu này đã được mở khóa trước đó."
          : "Mở khóa tài liệu vĩnh viễn thành công! Bạn có thể đọc và tải PDF ngay.",
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("Số dư không đủ")) {
        return res.status(402).json({ error: "insufficient_balance", message: msg });
      }
      return res.status(400).json({ error: "document_unlock_error", message: msg });
    }
  }
);
