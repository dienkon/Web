import { Router, type Response } from "express";
import { ZodError } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  acknowledgeStudentOrderNotification,
  getStudentAiCatalog,
  getStudentAiOrdersAndWallet,
  studentCancelSlotRenewal,
  studentPayOrderWithWallet,
  studentPurchaseAiService,
  studentResumeSlotRenewal,
} from "../services/aiShopService.js";

export const aiShopStudentRouter = Router();

function formatError(err: any): { status: number; error: string; message: string; missingVnd?: number } {
  if (err instanceof ZodError) {
    return {
      status: 400,
      error: "validation_error",
      message: err.issues[0]?.message || "Dữ liệu đầu vào không hợp lệ.",
    };
  }
  return {
    status: Number(err?.statusCode) || 400,
    error: err?.code || "ai_shop_error",
    message: err?.message || "Đã có lỗi xảy ra.",
    missingVnd: typeof err?.missingVnd === "number" ? err.missingVnd : undefined,
  };
}

function resolveRequestOrigin(req: AuthenticatedRequest): string {
  const originHeader = req.headers.origin;
  if (typeof originHeader === "string" && /^https?:\/\//i.test(originHeader)) {
    return originHeader;
  }
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  if (host) return `${proto}://${host}`;
  return process.env.PUBLIC_APP_URL || "https://dk-test-v3.vercel.app";
}

// GET /api/ai-shop/catalog (authenticated students/admins see active student-visible services)
aiShopStudentRouter.get("/catalog", requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const services = await getStudentAiCatalog();
    return res.json({ success: true, services });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(500).json({ error: e.error, message: e.message });
  }
});

// GET /api/ai-shop/my-orders (strictly scoped to req.user.uid)
aiShopStudentRouter.get("/my-orders", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getStudentAiOrdersAndWallet(req.user!.uid, req.user!.displayName);
    return res.json({ success: true, ...data });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(500).json({ error: e.error, message: e.message });
  }
});

// POST /api/ai-shop/purchase (auto-purchase via Ví DkTEST + Discord notification to Admin)
aiShopStudentRouter.post("/purchase", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await studentPurchaseAiService(
      {
        uid: req.user!.uid,
        email: req.user!.email,
        displayName: req.user!.displayName,
      },
      req.body,
      resolveRequestOrigin(req)
    );
    return res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({
      error: e.error,
      message: e.message,
      ...(e.missingVnd !== undefined ? { missingVnd: e.missingVnd } : {}),
    });
  }
});

// POST /api/ai-shop/orders/:orderId/ack-notification (mark admin completion notice as read)
aiShopStudentRouter.post(
  "/orders/:orderId/ack-notification",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await acknowledgeStudentOrderNotification(req.user!.uid, req.params.orderId);
      return res.json({ success: true, order });
    } catch (err: any) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);

// POST /api/ai-shop/orders/:orderId/cancel-renewal (cancel monthly slot renewal)
aiShopStudentRouter.post(
  "/orders/:orderId/cancel-renewal",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await studentCancelSlotRenewal(
        { uid: req.user!.uid, displayName: req.user!.displayName },
        req.params.orderId,
        req.body?.reason
      );
      return res.json({ success: true, order });
    } catch (err: any) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);

// POST /api/ai-shop/orders/:orderId/resume-renewal (resume monthly slot renewal before stopDate)
aiShopStudentRouter.post(
  "/orders/:orderId/resume-renewal",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await studentResumeSlotRenewal(
        { uid: req.user!.uid, displayName: req.user!.displayName },
        req.params.orderId
      );
      return res.json({ success: true, order });
    } catch (err: any) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);

// POST /api/ai-shop/orders/:orderId/pay-wallet (auto-pay/renew own order via Ví DkTEST)
aiShopStudentRouter.post(
  "/orders/:orderId/pay-wallet",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await studentPayOrderWithWallet(
        {
          uid: req.user!.uid,
          displayName: req.user!.displayName,
        },
        req.params.orderId,
        req.body
      );
      return res.status(201).json({ success: true, ...result });
    } catch (err: any) {
      const e = formatError(err);
      return res.status(e.status).json({
        error: e.error,
        message: e.message,
        ...(e.missingVnd !== undefined ? { missingVnd: e.missingVnd } : {}),
      });
    }
  }
);
