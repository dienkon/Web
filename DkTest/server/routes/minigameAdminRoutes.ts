import { Router, type Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  cancelOrDeleteMinigameEvent,
  clearMinigameBots,
  completeRaceHeat,
  createMinigameEvent,
  distributeMinigamePrizes,
  fillMinigameWithBots,
  getMinigameEvent,
  launchRaceHeat,
  listMinigameEvents,
  resetMinigameForDemo,
  startMinigameEvent,
  updateMinigameSchedule,
} from "../services/minigameService.js";

export const minigameAdminRouter = Router();

function formatError(err: any) {
  if (err instanceof ZodError) {
    return {
      status: 400,
      error: "validation_error",
      message: err.issues[0]?.message || "Dữ liệu sự kiện không hợp lệ.",
    };
  }
  return {
    status: Number(err?.statusCode) || 400,
    error: err?.code || "minigame_error",
    message: err?.message || "Đã có lỗi xảy ra.",
  };
}

// GET /api/admin/minigames
minigameAdminRouter.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const events = await listMinigameEvents();
    return res.json({ success: true, events });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(500).json({ error: e.error, message: e.message });
  }
});

// GET /api/admin/minigames/:id
minigameAdminRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = await getMinigameEvent(req.params.id);
    return res.json({ success: true, event });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/minigames
minigameAdminRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = await createMinigameEvent(req.body, {
      uid: req.user!.uid,
      displayName: req.user!.displayName || req.user!.email,
    });
    return res.status(201).json({ success: true, event });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/minigames/:id/bots/fill
minigameAdminRouter.post("/:id/bots/fill", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = req.body?.count !== undefined ? Number(req.body.count) : undefined;
    const clearFirst = Boolean(req.body?.clearFirst);
    const event = await fillMinigameWithBots(req.params.id, { count, clearFirst });
    return res.json({ success: true, event });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/minigames/:id/bots/clear
minigameAdminRouter.post("/:id/bots/clear", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = await clearMinigameBots(req.params.id);
    return res.json({ success: true, event });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/minigames/:id/reset-demo
minigameAdminRouter.post("/:id/reset-demo", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = await resetMinigameForDemo(req.params.id);
    return res.json({ success: true, event });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// PATCH /api/admin/minigames/:id/schedule
minigameAdminRouter.patch("/:id/schedule", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = await updateMinigameSchedule(req.params.id, req.body);
    return res.json({ success: true, event });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/minigames/:id/start
minigameAdminRouter.post("/:id/start", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = await startMinigameEvent(req.params.id);
    return res.json({ success: true, event });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/minigames/:id/heats/launch
minigameAdminRouter.post("/:id/heats/launch", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = await launchRaceHeat(req.params.id, req.body?.heatId);
    return res.json({ success: true, event });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/minigames/:id/heats/complete
minigameAdminRouter.post("/:id/heats/complete", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = await completeRaceHeat(req.params.id, req.body?.heatId);
    return res.json({ success: true, event });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/admin/minigames/:id/distribute-prizes
minigameAdminRouter.post(
  "/:id/distribute-prizes",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await distributeMinigamePrizes(req.params.id, {
        uid: req.user!.uid,
        displayName: req.user!.displayName || req.user!.email,
      });
      return res.json({ success: true, ...result });
    } catch (err: any) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);

// DELETE /api/admin/minigames/:id
minigameAdminRouter.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    await cancelOrDeleteMinigameEvent(req.params.id, req.query.hard === "true");
    return res.json({ success: true });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
