import { Router, type Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  archiveOrRestoreAiCustomer,
  createAiCustomer,
  createAiOrder,
  createAiPayment,
  createAiService,
  deleteAiCustomerSafely,
  ensureInitialServicesSeeded,
  getAdminAiShopBootstrap,
  importAiShopExcelRows,
  updateAiCustomer,
  updateAiOrder,
  updateAiPayment,
  updateAiService,
  voidAiPayment,
} from "../services/aiShopService.js";

export const aiShopAdminRouter = Router();

function formatError(err: any): { status: number; error: string; message: string } {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return {
      status: 400,
      error: "validation_error",
      message: first?.message || "Dữ liệu đầu vào không hợp lệ.",
    };
  }
  return {
    status: Number(err?.statusCode) || 400,
    error: err?.code || "ai_shop_error",
    message: err?.message || "Đã có lỗi xảy ra.",
  };
}

// GET /api/admin/ai-shop/bootstrap
aiShopAdminRouter.get("/bootstrap", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const force = req.query.force === "true";
    const data = await getAdminAiShopBootstrap(force);
    return res.json({ success: true, ...data });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status >= 400 ? e.status : 500).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/ai-shop/services/seed
aiShopAdminRouter.post("/services/seed", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const services = await ensureInitialServicesSeeded(
      req.user!.uid,
      req.user!.displayName || req.user!.email || "Admin"
    );
    return res.json({ success: true, services });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/ai-shop/services
aiShopAdminRouter.post("/services", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = await createAiService(req.body, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.status(201).json({ success: true, service });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// PATCH /api/admin/ai-shop/services/:id
aiShopAdminRouter.patch("/services/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = await updateAiService(req.params.id, req.body, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.json({ success: true, service });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/ai-shop/customers
aiShopAdminRouter.post("/customers", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await createAiCustomer(req.body, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.status(201).json({ success: true, customer });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// PATCH /api/admin/ai-shop/customers/:id
aiShopAdminRouter.patch("/customers/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await updateAiCustomer(req.params.id, req.body, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.json({ success: true, customer });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/ai-shop/customers/:id/archive
aiShopAdminRouter.post("/customers/:id/archive", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const archive = req.body?.archive !== false;
    const customer = await archiveOrRestoreAiCustomer(req.params.id, archive, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.json({ success: true, customer });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// DELETE /api/admin/ai-shop/customers/:id
aiShopAdminRouter.delete("/customers/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    await deleteAiCustomerSafely(req.params.id, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.json({ success: true });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/ai-shop/orders
aiShopAdminRouter.post("/orders", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await createAiOrder(req.body, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.status(201).json({ success: true, order });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// PATCH /api/admin/ai-shop/orders/:id
aiShopAdminRouter.patch("/orders/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await updateAiOrder(req.params.id, req.body, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.json({ success: true, order });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/ai-shop/payments
aiShopAdminRouter.post("/payments", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await createAiPayment(req.body, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.status(201).json({ success: true, payment });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// PATCH /api/admin/ai-shop/payments/:id
aiShopAdminRouter.patch("/payments/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await updateAiPayment(req.params.id, req.body, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.json({ success: true, payment });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/ai-shop/payments/:id/void
aiShopAdminRouter.post("/payments/:id/void", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await voidAiPayment(req.params.id, req.body, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.json({ success: true, payment });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/ai-shop/import
aiShopAdminRouter.post("/import", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await importAiShopExcelRows(req.body, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
