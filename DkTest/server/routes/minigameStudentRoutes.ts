import { Router, type Response } from "express";
import { ZodError } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  addLiveMinigameCheer,
  getMinigameEvent,
  joinOrUpdateMinigameParticipant,
  leaveMinigameEvent,
  listLiveMinigameCheers,
  listMinigameEvents,
} from "../services/minigameService.js";

export const minigameStudentRouter = Router();

function formatError(err: any) {
  if (err instanceof ZodError) {
    return {
      status: 400,
      error: "validation_error",
      message: err.issues[0]?.message || "Dữ liệu không hợp lệ.",
    };
  }
  return {
    status: Number(err?.statusCode) || 400,
    error: err?.code || "minigame_error",
    message: err?.message || "Đã có lỗi xảy ra.",
  };
}

// GET /api/minigames (list active & recent events for authenticated users)
minigameStudentRouter.get("/", requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const events = await listMinigameEvents();
    return res.json({ success: true, events });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(500).json({ error: e.error, message: e.message });
  }
});

// GET /api/minigames/:id
minigameStudentRouter.get("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = await getMinigameEvent(req.params.id);
    return res.json({ success: true, event });
  } catch (err: any) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// POST /api/minigames/:id/join (100% FREE welfare registration!)
minigameStudentRouter.post(
  "/:id/join",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const event = await joinOrUpdateMinigameParticipant(
        req.params.id,
        {
          uid: req.user!.uid,
          email: req.user!.email,
          displayName: req.user!.displayName,
        },
        req.body
      );
      return res.json({ success: true, event });
    } catch (err: any) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);

// POST /api/minigames/:id/leave
minigameStudentRouter.post(
  "/:id/leave",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const event = await leaveMinigameEvent(req.params.id, req.user!.uid);
      return res.json({ success: true, event });
    } catch (err: any) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);

// GET /api/minigames/:id/cheers (live cheer feed without requiring RTDB write rules)
minigameStudentRouter.get(
  "/:id/cheers",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const cheers = listLiveMinigameCheers(req.params.id);
      return res.json({ success: true, cheers });
    } catch (err: any) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);

// POST /api/minigames/:id/cheer
minigameStudentRouter.post(
  "/:id/cheer",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const emoji = typeof req.body?.emoji === "string" ? req.body.emoji : "🔥";
      const text = typeof req.body?.text === "string" ? req.body.text : "";
      const cheer = addLiveMinigameCheer(req.params.id, {
        uid: req.user!.uid,
        displayName: req.user!.displayName || req.user!.email?.split("@")[0] || "Người xem",
        emoji,
        text,
      });
      return res.json({ success: true, cheer, cheers: listLiveMinigameCheers(req.params.id) });
    } catch (err: any) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);
