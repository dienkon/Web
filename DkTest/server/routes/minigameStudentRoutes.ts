import { Router, type Response } from "express";
import { ZodError } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  appendPersistentMinigameChat,
  appendPersistentMinigameCheer,
  getMinigameEvent,
  getPersistentMinigameChat,
  getPersistentMinigameCheers,
  joinOrUpdateMinigameParticipant,
  leaveMinigameEvent,
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

// GET /api/minigames/:id/cheers (shared live cheer feed — 0 Firestore reads!)
minigameStudentRouter.get(
  "/:id/cheers",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const cheers = await getPersistentMinigameCheers(req.params.id);
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
      const id = typeof req.body?.id === "string" ? req.body.id : undefined;
      const emoji = typeof req.body?.emoji === "string" ? req.body.emoji : "🔥";
      const text = typeof req.body?.text === "string" ? req.body.text : "";
      const { cheer, cheers } = await appendPersistentMinigameCheer(req.params.id, {
        id,
        uid: req.user!.uid,
        displayName: req.user!.displayName || req.user!.email?.split("@")[0] || "Người xem",
        emoji,
        text,
      });
      return res.json({ success: true, cheer, cheers });
    } catch (err: any) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);

// GET /api/minigames/:id/chat (shared across all serverless instances — 0 Firestore reads!)
minigameStudentRouter.get(
  "/:id/chat",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const messages = await getPersistentMinigameChat(req.params.id);
      return res.json({ success: true, messages });
    } catch (err: any) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);

// POST /api/minigames/:id/chat
minigameStudentRouter.post(
  "/:id/chat",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clientId = typeof req.body?.id === "string" ? req.body.id : undefined;
      const messageText = typeof req.body?.message === "string" ? req.body.message : "";
      const avatarUrl = typeof req.body?.avatarUrl === "string" ? req.body.avatarUrl : undefined;
      const roomTag = typeof req.body?.roomTag === "string" ? req.body.roomTag : undefined;
      const role = String(req.user?.role || "").toLowerCase();
      const isAdmin = role === "admin" || role === "super_admin" || role === "teacher";
      const { chatMessage, messages } = await appendPersistentMinigameChat(req.params.id, {
        id: clientId,
        uid: req.user!.uid,
        displayName: req.user!.displayName || req.user!.email?.split("@")[0] || "Học sinh",
        avatarUrl,
        isAdmin,
        message: messageText,
        roomTag,
      });
      return res.json({
        success: true,
        chatMessage,
        messages,
      });
    } catch (err: any) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);
