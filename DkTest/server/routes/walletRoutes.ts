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
import { validateVoucher, redeemGiftVoucher } from "../services/voucherService.js";

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
    const { code, context, amountVnd, examId } = req.body || {};
    const result = await validateVoucher({
      code: String(code || "").trim(),
      uid,
      context: context || "exam_unlock",
      amountVnd: Number(amountVnd || 0),
      examId,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: "voucher_validate_error", message: err.message || String(err) });
  }
});

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
