import { Router, type Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { validateUrlForSsrf } from "../services/webImporter/ssrfGuard.js";
import {
  createOrUpdateLibraryDocument,
  deleteLibraryDocument,
  getAdminDocumentPurchases,
  getDocumentLibrarySettings,
  getLiveLibraryDocuments,
  grantOrRevokeDocumentEntitlement,
  moderateLibraryDocument,
  updateDocumentLibrarySettings,
} from "../services/documentLibraryService.js";

export const documentLibraryAdminRouter = Router();

// GET /api/admin/documents — Overview of all live/pending/override documents, settings, and purchases
documentLibraryAdminRouter.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [documents, settings, purchases] = await Promise.all([
      getLiveLibraryDocuments({ includeNonPublished: true, forceRefresh: true }),
      getDocumentLibrarySettings(true),
      getAdminDocumentPurchases(120),
    ]);
    return res.json({
      success: true,
      documents,
      settings,
      purchases,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "admin_documents_error",
      message: err?.message || "Không thể tải danh sách quản trị tài liệu.",
    });
  }
});

// POST /api/admin/documents — Create or override any document as Admin
documentLibraryAdminRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = await createOrUpdateLibraryDocument(req.user!, req.body || {});
    return res.status(201).json({
      success: true,
      document: doc,
      message: "Đã lưu tài liệu vào Kho Tài Liệu!",
    });
  } catch (err: any) {
    const msg = err?.issues?.[0]?.message || err?.message || "Không thể lưu tài liệu.";
    return res.status(400).json({ error: "admin_doc_save_error", message: msg });
  }
});

// PATCH /api/admin/documents/settings — Update auto-approve, creator share %, max price
documentLibraryAdminRouter.patch("/settings", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await updateDocumentLibrarySettings(req.body || {});
    return res.json({
      success: true,
      settings,
      message: "Đã lưu cấu hình Kho Tài Liệu.",
    });
  } catch (err: any) {
    return res.status(400).json({
      error: "admin_doc_settings_error",
      message: err?.message || "Không thể cập nhật cấu hình.",
    });
  }
});

// POST /api/admin/documents/entitlements — Manually grant or revoke student access
documentLibraryAdminRouter.post("/entitlements", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid, docId, action } = req.body || {};
    if (!uid || !docId || (action !== "grant" && action !== "revoke")) {
      return res.status(400).json({
        error: "invalid_params",
        message: "Vui lòng truyền đầy đủ uid, docId và action (grant / revoke).",
      });
    }
    const entitlement = await grantOrRevokeDocumentEntitlement(req.user!, { uid, docId, action });
    return res.json({
      success: true,
      entitlement,
      message:
        action === "grant"
          ? "Đã cấp quyền truy cập tài liệu cho học sinh!"
          : "Đã thu hồi quyền truy cập tài liệu.",
    });
  } catch (err: any) {
    return res.status(400).json({
      error: "admin_doc_entitlement_error",
      message: err?.message || "Không thể cập nhật quyền truy cập.",
    });
  }
});

// POST /api/admin/documents/import-blogger — Quick live sync from nganhangdethi.org or Blogger site
documentLibraryAdminRouter.post("/import-blogger", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawSiteUrl = String(req.body?.siteUrl || "https://www.nganhangdethi.org")
      .trim()
      .replace(/\/+$/, "");
    const maxItems = Math.max(1, Math.min(30, Number(req.body?.limit) || 12));
    await validateUrlForSsrf(rawSiteUrl);

    const feedUrl = `${rawSiteUrl}/feeds/posts/default?alt=json&max-results=${maxItems}`;
    const feedRes = await fetch(feedUrl, { signal: AbortSignal.timeout(15000) });
    if (!feedRes.ok) {
      throw new Error(`Không thể kết nối nguồn RSS/JSON (${feedRes.status}).`);
    }
    const feedJson = await feedRes.json();
    const entries = feedJson?.feed?.entry || [];

    let importedCount = 0;
    for (const entry of entries) {
      const title = String(entry?.title?.["$t"] || "").trim();
      const content = String(entry?.content?.["$t"] || "");
      const deMatch =
        content.match(/\bde=['"](https?:\/\/[^'"]+)['"]/i) ||
        content.match(/https?:\/\/drive\.google\.com\/(?:file\/d\/[a-zA-Z0-9_-]+(?:\/view)?|open\?id=[a-zA-Z0-9_-]+)/i);
      const fileUrl = deMatch ? (deMatch[1] || deMatch[0]) : "";
      if (!title || !fileUrl) continue;

      const daMatch = content.match(/\bda=['"](https?:\/\/[^'"]+)['"]/i);
      const answerUrl = daMatch && daMatch[1] !== fileUrl ? daMatch[1] : undefined;

      await createOrUpdateLibraryDocument(req.user!, {
        title: title.slice(0, 200),
        description: `Tài liệu đồng bộ từ ${new URL(rawSiteUrl).hostname}.`,
        grade: /10/.test(title) ? "grade_10" : /11/.test(title) ? "grade_11" : "grade_12",
        subject: "multi_subject",
        category: /ebook|sách/i.test(title) ? "ebook_book" : "exam_test",
        fileFormat: "pdf",
        accessMode: "free",
        priceVnd: 0,
        fileUrl,
        answerUrl,
        status: "published",
      });
      importedCount++;
    }

    return res.json({
      success: true,
      importedCount,
      message: `Đã đồng bộ thêm ${importedCount} tài liệu mới từ ${new URL(rawSiteUrl).hostname}!`,
    });
  } catch (err: any) {
    return res.status(400).json({
      error: "import_blogger_error",
      message: err?.message || "Đồng bộ nguồn ngoài thất bại.",
    });
  }
});

// PATCH /api/admin/documents/:docId/moderate — Approve, reject, feature, hide, or reprice
documentLibraryAdminRouter.patch(
  "/:docId/moderate",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await moderateLibraryDocument(req.user!, req.params.docId, req.body || {});
      return res.json({
        success: true,
        document: updated,
        message: "Đã cập nhật trạng thái kiểm duyệt tài liệu.",
      });
    } catch (err: any) {
      return res.status(400).json({
        error: "admin_doc_moderate_error",
        message: err?.message || "Không thể cập nhật trạng thái tài liệu.",
      });
    }
  }
);

// DELETE /api/admin/documents/:docId — Delete live document or hide seeded document
documentLibraryAdminRouter.delete("/:docId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await deleteLibraryDocument(req.user!, req.params.docId);
    return res.json({
      success: true,
      ...result,
      message: result.hiddenSeed
        ? "Đã ẩn tài liệu gốc khỏi danh sách hiển thị công khai."
        : "Đã xóa tài liệu vĩnh viễn.",
    });
  } catch (err: any) {
    return res.status(400).json({
      error: "admin_doc_delete_error",
      message: err?.message || "Không thể xóa tài liệu.",
    });
  }
});
