import { Router, type Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  adminAuth,
  adminDb,
  getFirestoreRestDoc,
} from "../firebaseAdmin.js";
import {
  getOrCreateWallet,
  updateWalletProfile,
  createDepositRequest,
  getStudentDepositRequests,
  getStudentTransactions,
  checkExamAccess,
  unlockExam,
  getStudentUnpaidDebt,
} from "../services/walletService.js";
import {
  validateVoucher,
  redeemGiftVoucher,
  inspectVoucher,
  recordVoucherSave,
} from "../services/voucherService.js";
import {
  extractClientIp,
  getOrCreateReferralProfile,
  claimReferralCode,
  withdrawReferralBalanceToWallet,
} from "../services/referralService.js";
import {
  checkCourseAccess,
  unlockCourse,
  unlockCourseBundle,
  unlockCourseLesson,
  getAuthorizedLessonContent,
  resolveDriveDirectStreamUrl,
} from "../services/courseService.js";
import { extractGoogleDriveFileId } from "../../src/utils/videoSourceHelper.js";
import { aiShopStudentRouter } from "./aiShopStudentRoutes.js";
import { minigameStudentRouter } from "./minigameStudentRoutes.js";
import { documentLibraryRouter } from "./documentLibraryRoutes.js";
import { fetchNotificationFeed } from "../services/notificationPushService.js";

export const walletRouter = Router();

// Disable all HTTP caching for wallet and access endpoints
walletRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// -------------------------------------------------------------
// PUBLIC / AUTHENTICATED EXAM ACCESS CHECK
// -------------------------------------------------------------
// GET /api/exams/:examId/access
walletRouter.get("/exams/:examId/access", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await checkExamAccess(req.user!.uid, req.params.examId, req.user!.role);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: "access_check_error", message: err.message || "Không kiểm tra được quyền truy cập." });
  }
});

// -------------------------------------------------------------
// PROTECTED STUDENT WALLET ROUTES (Require Bearer Token)
// -------------------------------------------------------------

// GET /api/wallet/me
walletRouter.get("/wallet/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const wallet = await getOrCreateWallet(uid, {
      fullName: req.user!.displayName,
    });
    return res.json({ success: true, wallet });
  } catch (err: any) {
    return res.status(500).json({ error: "wallet_error", message: err.message || String(err) });
  }
});

// PATCH /api/wallet/me/profile
walletRouter.patch("/wallet/me/profile", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { fullName, currentClass } = req.body || {};

    if (!fullName || !currentClass) {
      return res.status(400).json({
        error: "missing_fields",
        message: "Vui lòng nhập đầy đủ họ tên và lớp học.",
      });
    }

    const updated = await updateWalletProfile(uid, { fullName, currentClass });
    return res.json({ success: true, wallet: updated });
  } catch (err: any) {
    return res.status(400).json({ error: "profile_update_error", message: err.message || String(err) });
  }
});

// GET /api/wallet/debt
walletRouter.get("/wallet/debt", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const debtSummary = await getStudentUnpaidDebt(uid);
    return res.json({ success: true, ...debtSummary });
  } catch (err: any) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});

// POST /api/wallet/deposit-requests
walletRouter.post("/wallet/deposit-requests", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { amountVnd, idempotencyKey, voucherCode } = req.body || {};

    const depositRequest = await createDepositRequest(uid, Number(amountVnd), idempotencyKey, voucherCode);
    return res.status(201).json({ success: true, depositRequest });
  } catch (err: any) {
    return res.status(400).json({ error: "deposit_request_error", message: err.message || String(err) });
  }
});

// GET /api/wallet/deposit-requests
walletRouter.get("/wallet/deposit-requests", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const requests = await getStudentDepositRequests(uid);
    return res.json({ success: true, items: requests });
  } catch (err: any) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});

// GET /api/wallet/transactions
walletRouter.get("/wallet/transactions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const transactions = await getStudentTransactions(uid);
    return res.json({ success: true, items: transactions });
  } catch (err: any) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});

// POST /api/exams/:examId/unlock
walletRouter.post("/exams/:examId/unlock", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const examId = req.params.examId;
    const { idempotencyKey, voucherCode } = req.body || {};

    const result = await unlockExam(uid, examId, idempotencyKey, voucherCode);
    return res.json({
      success: true,
      newBalanceVnd: result.newBalanceVnd,
      entitlement: result.entitlement,
      alreadyUnlocked: result.alreadyUnlocked,
      message: result.alreadyUnlocked
        ? "Đề thi đã được mở khóa trước đó."
        : "Mở khóa đề thi vĩnh viễn thành công!",
    });
  } catch (err: any) {
    const msg = err.message || String(err);
    if (msg.includes("Số dư không đủ")) {
      return res.status(402).json({ error: "insufficient_balance", message: msg });
    }
    return res.status(400).json({ error: "unlock_error", message: msg });
  }
});

// POST /api/vouchers/validate & /api/wallet/vouchers/validate
walletRouter.post(["/vouchers/validate", "/wallet/vouchers/validate", "/wallet/validate-voucher"], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { code, context, amountVnd, examId, courseId } = req.body || {};
    const result = await validateVoucher({
      code: String(code || "").trim(),
      uid,
      context: context || "exam_unlock",
      amountVnd: Number(amountVnd || 0),
      examId,
      courseId,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: "voucher_validate_error", message: err.message || String(err) });
  }
});

// GET /api/vouchers/inspect/:code & /api/wallet/vouchers/inspect/:code
walletRouter.get(
  ["/vouchers/inspect/:code", "/wallet/vouchers/inspect/:code"],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const code = String(req.params.code || "").trim();
      let verifiedUid: string | undefined;
      const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || "")?.[1];
      if (token && !/^(student_|dk_admin_)/.test(token) && adminAuth) {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          verifiedUid = decoded.uid;
        } catch {
          verifiedUid = undefined;
        }
      }
      const result = await inspectVoucher(code, verifiedUid);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ error: "voucher_inspect_error", message: err.message || String(err) });
    }
  }
);

// POST /api/vouchers/save & /api/wallet/vouchers/save (increments savedCount only, never usedCount)
walletRouter.post(
  ["/vouchers/save", "/wallet/vouchers/save"],
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { code } = req.body || {};
      if (!code) {
        return res.status(400).json({ error: "missing_code", message: "Vui lòng cung cấp mã voucher cần lưu." });
      }
      const result = await recordVoucherSave(String(code).trim());
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ error: "voucher_save_error", message: err.message || String(err) });
    }
  }
);

// POST /api/vouchers/redeem-gift & /api/wallet/vouchers/redeem-gift
walletRouter.post(["/vouchers/redeem-gift", "/wallet/vouchers/redeem-gift", "/wallet/redeem-gift", "/redeem-gift"], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { code } = req.body || {};
    if (!code) {
      return res.status(400).json({ error: "missing_code", message: "Vui lòng nhập mã voucher quà tặng." });
    }
    const result = await redeemGiftVoucher(String(code).trim(), uid);
    return res.json({
      success: true,
      message: `Nhập mã quà tặng thành công! Bạn nhận được +${result.addedVnd.toLocaleString("vi-VN")}đ vào ví.`,
      ...result,
    });
  } catch (err: any) {
    return res.status(400).json({ error: "redeem_error", message: err.message || String(err) });
  }
});

// -------------------------------------------------------------
// REFERRAL PROGRAM (MỜI BẠN DÙNG DKTEST - ANTI-FRAUD PROTECTED)
// -------------------------------------------------------------

// GET /api/referral/me & /api/wallet/referral/me
walletRouter.get(
  ["/referral/me", "/wallet/referral/me"],
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const uid = req.user!.uid;
      const clientIp = extractClientIp(req);
      const deviceFingerprint = String(req.headers["x-device-fingerprint"] || "").trim() || null;
      const result = await getOrCreateReferralProfile(uid, {
        ip: clientIp,
        deviceFingerprint,
      });
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: "referral_profile_error", message: err.message || String(err) });
    }
  }
);

// POST /api/referral/claim & /api/wallet/referral/claim
walletRouter.post(
  ["/referral/claim", "/wallet/referral/claim"],
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const uid = req.user!.uid;
      const { code, deviceFingerprint: bodyFingerprint } = req.body || {};
      if (!code || !String(code).trim()) {
        return res.status(400).json({ error: "missing_code", message: "Vui lòng nhập mã giới thiệu." });
      }
      const clientIp = extractClientIp(req);
      const deviceFingerprint =
        String(bodyFingerprint || req.headers["x-device-fingerprint"] || "").trim() || null;
      const result = await claimReferralCode(uid, String(code).trim(), {
        ip: clientIp,
        deviceFingerprint,
        refereeEmail: req.user!.email || null,
        refereeName: req.user!.displayName || null,
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: "referral_claim_error", message: err.message || String(err) });
    }
  }
);

// POST /api/referral/withdraw & /api/wallet/referral/withdraw
walletRouter.post(
  ["/referral/withdraw", "/wallet/referral/withdraw"],
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const uid = req.user!.uid;
      const { amountVnd } = req.body || {};
      const parsedAmount =
        amountVnd !== undefined && amountVnd !== null && amountVnd !== ""
          ? Number(amountVnd)
          : undefined;
      const result = await withdrawReferralBalanceToWallet(uid, parsedAmount);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: "referral_withdraw_error", message: err.message || String(err) });
    }
  }
);

// -------------------------------------------------------------
// COURSES ACCESS, UNLOCK & AUTHORIZED LESSON CONTENT
// -------------------------------------------------------------

// GET /api/courses/:courseId/access
walletRouter.get("/courses/:courseId/access", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await checkCourseAccess(req.user!.uid, req.params.courseId, req.user!.role);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: "course_access_error", message: err.message || "Không kiểm tra được quyền truy cập khóa học." });
  }
});

// POST /api/courses/:courseId/unlock
walletRouter.post("/courses/:courseId/unlock", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const courseId = req.params.courseId;
    const { idempotencyKey, voucherCode } = req.body || {};
    const result = await unlockCourse(uid, courseId, idempotencyKey, voucherCode);
    return res.json({
      success: true,
      newBalanceVnd: result.newBalanceVnd,
      entitlement: result.entitlement,
      alreadyUnlocked: result.alreadyUnlocked,
      message: result.alreadyUnlocked
        ? "Khóa học đã được mở khóa trước đó."
        : "Mở khóa trọn khóa học thành công!",
    });
  } catch (err: any) {
    const msg = err.message || String(err);
    if (msg.includes("Số dư không đủ")) {
      return res.status(402).json({ error: "insufficient_balance", message: msg });
    }
    return res.status(400).json({ error: "course_unlock_error", message: msg });
  }
});

// POST /api/courses/:courseId/unlock-bundle (chapter / topic / selected / all_remaining)
walletRouter.post("/courses/:courseId/unlock-bundle", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const courseId = req.params.courseId;
    const { bundleType, chapterId, topicTitle, lessonIds, idempotencyKey, voucherCode } = req.body || {};
    const result = await unlockCourseBundle(uid, courseId, {
      bundleType,
      chapterId,
      topicTitle,
      lessonIds: Array.isArray(lessonIds) ? lessonIds : undefined,
      idempotencyKey,
      voucherCode,
    });
    return res.json({
      success: true,
      ...result,
      message: result.alreadyUnlocked
        ? "Toàn bộ video trong gói này đã được mở khóa trước đó."
        : `Mở khóa thành công ${result.unlockedCount} video bài giảng!`,
    });
  } catch (err: any) {
    const msg = err.message || String(err);
    if (msg.includes("Số dư không đủ")) {
      return res.status(402).json({ error: "insufficient_balance", message: msg });
    }
    return res.status(400).json({ error: "course_bundle_unlock_error", message: msg });
  }
});

// POST /api/courses/:courseId/lessons/:lessonId/unlock
walletRouter.post("/courses/:courseId/lessons/:lessonId/unlock", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { courseId, lessonId } = req.params;
    const { idempotencyKey, voucherCode } = req.body || {};
    const result = await unlockCourseLesson(uid, courseId, lessonId, idempotencyKey, voucherCode);
    return res.json({
      success: true,
      newBalanceVnd: result.newBalanceVnd,
      entitlement: result.entitlement,
      alreadyUnlocked: result.alreadyUnlocked,
      message: result.alreadyUnlocked
        ? "Bài giảng đã được mở khóa trước đó."
        : "Mở khóa bài giảng thành công!",
    });
  } catch (err: any) {
    const msg = err.message || String(err);
    if (msg.includes("Số dư không đủ")) {
      return res.status(402).json({ error: "insufficient_balance", message: msg });
    }
    return res.status(400).json({ error: "lesson_unlock_error", message: msg });
  }
});

// GET /api/courses/:courseId/lessons/:lessonId/content
walletRouter.get("/courses/:courseId/lessons/:lessonId/content", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lesson = await getAuthorizedLessonContent(
      req.user!.uid,
      req.params.courseId,
      req.params.lessonId,
      req.user!.role
    );
    return res.json({ success: true, lesson });
  } catch (err: any) {
    const msg = err.message || String(err);
    const status = msg.includes("trả phí") ? 403 : 400;
    return res.status(status).json({ error: "lesson_access_error", message: msg });
  }
});

// GET /api/courses/:courseId/lessons/:lessonId/stream
walletRouter.get("/courses/:courseId/lessons/:lessonId/stream", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lesson = await getAuthorizedLessonContent(
      req.user!.uid,
      req.params.courseId,
      req.params.lessonId,
      req.user!.role
    );
    const driveId = extractGoogleDriveFileId(lesson.videoUrl || "");
    if (!driveId) {
      return res.json({ success: true, streamUrl: null });
    }
    const streamUrl = await resolveDriveDirectStreamUrl(driveId);
    return res.json({ success: true, streamUrl });
  } catch (err: any) {
    const msg = err.message || String(err);
    const status = msg.includes("trả phí") ? 403 : 400;
    return res.status(status).json({ error: "lesson_stream_error", message: msg });
  }
});

// Student AI Account Storefront & Auto-Purchase Routes (/api/ai-shop/*)
walletRouter.use("/ai-shop", aiShopStudentRouter);

// Free Welfare Minigame Event Student Routes (/api/minigames/*)
walletRouter.use("/minigames", minigameStudentRouter);

// Document Repository Student & Public Routes (/api/documents/*)
walletRouter.use("/documents", documentLibraryRouter);

// GET /api/notifications/feed — Public broadcast + optional user-specific feed for Web & Android WorkManager
walletRouter.get("/notifications/feed", async (req: AuthenticatedRequest, res: Response) => {
  try {
    let uid: string | null = null;
    const authHeader = String(req.headers.authorization || "");
    const bearer = /^Bearer\s+(\S+)$/i.exec(authHeader)?.[1];
    if (bearer && !/^(student_|dk_admin_)/.test(bearer)) {
      try {
        if (adminAuth) {
          const decoded = await adminAuth.verifyIdToken(bearer);
          uid = decoded.uid;
        }
      } catch {
        // Fallback to public "all" broadcast feed if token expired in background worker
      }
    }
    const sinceMs = Number(req.query.since) || 0;
    const limitCount = Number(req.query.limit) || 15;
    const notifications = await fetchNotificationFeed({ uid, sinceMs, limitCount });
    return res.json({ success: true, serverTimeMs: Date.now(), notifications });
  } catch (err: any) {
    return res.status(500).json({ error: "notif_feed_error", message: err?.message || "Lỗi tải thông báo." });
  }
});
