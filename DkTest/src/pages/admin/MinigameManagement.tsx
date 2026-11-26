import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  PlusCircle,
  Trophy,
  Copy,
  Check,
  Play,
  Users,
  Sparkles,
  Trash2,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Gift,
  ArrowLeft,
  Bot,
  RotateCcw,
  Megaphone,
  CalendarClock,
  Clock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type {
  MinigameEvent,
  MinigamePrize,
  MinigamePrizeType,
  MinigameType,
} from "../../types/minigame";
import { MINIGAME_TYPE_META, getDefaultRankLabel } from "../../services/minigame/gameLogic";
import { getMinigameArtwork } from "../../services/minigame/minigameAssets";
import { formatVnd } from "../../services/aiShop/billingEngine";
import { MinigamePreviewCard } from "../../components/minigame/MinigamePreviewCard";
import { showAppConfirm } from "../../services/appDialogService";
import {
  broadcastDeviceNotificationApi,
  cancelMinigameApi,
  clearMinigameBotsApi,
  completeRaceHeatApi,
  createMinigameApi,
  distributeMinigamePrizesApi,
  fetchAdminMinigamesApi,
  fillMinigameBotsApi,
  launchRaceHeatApi,
  resetMinigameDemoApi,
  startMinigameApi,
  subscribeMinigameEventRealtime,
  updateMinigameScheduleApi,
} from "../../services/minigameClientService";
import { RaceTrackStage } from "../../components/minigame/RaceTrackStage";
import { TaiXiuStage } from "../../components/minigame/TaiXiuStage";
import { BauCuaStage } from "../../components/minigame/BauCuaStage";
import { LuckyNumberStage } from "../../components/minigame/LuckyNumberStage";
import { LuckyWheelStage } from "../../components/minigame/LuckyWheelStage";
import { TreasureFlipStage } from "../../components/minigame/TreasureFlipStage";
import { MysteryBoxStage } from "../../components/minigame/MysteryBoxStage";
import { WinnersPodiumCard } from "../../components/minigame/WinnersPodiumCard";
import { LiveCheerBar } from "../../components/minigame/LiveCheerBar";
import { MinigameRealtimeChat } from "../../components/minigame/MinigameRealtimeChat";
import { MinigameScheduleBanner } from "../../components/minigame/MinigameScheduleBanner";

function defaultPrizesForGame(gameType: MinigameType): MinigamePrize[] {
  if (
    gameType === "tai_xiu" ||
    gameType === "bau_cua" ||
    gameType === "lucky_number" ||
    gameType === "lucky_wheel" ||
    gameType === "treasure_flip" ||
    gameType === "mystery_box"
  ) {
    return [
      {
        rank: 0,
        label:
          gameType === "lucky_number"
            ? "Trúng chính xác số may mắn"
            : gameType === "lucky_wheel"
            ? "Trúng ô Vòng Quay"
            : gameType === "treasure_flip"
            ? "Mở trúng Rương Kho Báu"
            : gameType === "mystery_box"
            ? "Đập trúng Hộp Đặc Biệt"
            : "Người dự đoán đúng",
        type: "wallet_vnd",
        amountVnd: gameType === "lucky_number" ? 20000 : 10000,
      },
    ];
  }
  return [
    { rank: 1, label: "Giải Nhất", type: "wallet_vnd", amountVnd: 20000 },
    { rank: 2, label: "Giải Nhì", type: "wallet_vnd", amountVnd: 10000 },
    { rank: 3, label: "Giải Ba", type: "wallet_vnd", amountVnd: 5000 },
  ];
}

export default function MinigameManagement() {
  const { eventId: routeEventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [events, setEvents] = useState<MinigameEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MinigameEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Create Event Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gameType, setGameType] = useState<MinigameType>("horse_race");
  const [maxParticipants, setMaxParticipants] = useState<number>(8);
  const [racersPerHeat, setRacersPerHeat] = useState<number>(4);
  const [scheduledStartLocal, setScheduledStartLocal] = useState<string>("");
  const [scheduledEndLocal, setScheduledEndLocal] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [raceDurationSec, setRaceDurationSec] = useState<number>(14);
  const [revealDurationSec, setRevealDurationSec] = useState<number>(4);
  const [chatEnabled, setChatEnabled] = useState<boolean>(true);
  const [prizes, setPrizes] = useState<MinigamePrize[]>(() => defaultPrizesForGame("horse_race"));

  // Inline live schedule editor in Admin Room
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false);
  const [editStartLocal, setEditStartLocal] = useState("");
  const [editEndLocal, setEditEndLocal] = useState("");
  const [editChatEnabled, setEditChatEnabled] = useState(true);

  // Push Notification Broadcast Modal State
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastRoute, setBroadcastRoute] = useState("/student/minigame");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadList = useCallback(async () => {
    try {
      const list = await fetchAdminMinigamesApi();
      setEvents(list);
      if (routeEventId) {
        const found = list.find((e) => e.id === routeEventId || e.eventCode === routeEventId);
        if (found) setSelectedEvent(found);
      }
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Không tải được danh sách Minigame." });
    } finally {
      setLoading(false);
    }
  }, [routeEventId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // Real-time subscription when inspecting/hosting a specific event
  useEffect(() => {
    if (!selectedEvent?.id) return;
    const unsub = subscribeMinigameEventRealtime(
      selectedEvent.id,
      (liveEvent) => {
        setSelectedEvent(liveEvent);
        setEvents((prev) => prev.map((e) => (e.id === liveEvent.id ? liveEvent : e)));
      },
      true
    );
    return () => unsub();
  }, [selectedEvent?.id]);

  const handleSelectGameType = (type: MinigameType) => {
    setGameType(type);
    setPrizes(defaultPrizesForGame(type));
    if (type === "horse_race" || type === "bee_race") {
      setMaxParticipants(8);
      setRacersPerHeat(4);
    } else {
      setMaxParticipants(50);
      setRacersPerHeat(4);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (title.trim().length < 2) {
      setToast({ type: "error", message: "Vui lòng nhập tiêu đề sự kiện." });
      return;
    }
    const seenRanks = new Set<number>();
    for (const pr of prizes) {
      if (seenRanks.has(pr.rank)) {
        setToast({
          type: "error",
          message:
            pr.rank === 0
              ? "Chỉ được cấu hình 1 giải đồng hạng (Chung)."
              : `Hạng #${pr.rank} đang bị trùng lặp. Vui lòng chọn thứ hạng khác nhau cho từng giải.`,
        });
        return;
      }
      seenRanks.add(pr.rank);
    }
    const normalizedPrizes = prizes.map((pr) => ({
      ...pr,
      label: pr.label.trim() || getDefaultRankLabel(pr.rank),
      amountVnd: pr.type === "wallet_vnd" ? Math.max(0, Math.trunc(Number(pr.amountVnd) || 0)) : undefined,
    }));
    setBusy(true);
    try {
      const created = await createMinigameApi({
        title: title.trim(),
        description: description.trim(),
        gameType,
        maxParticipants,
        racersPerHeat,
        scheduledStartAt: scheduledStartLocal ? new Date(scheduledStartLocal).toISOString() : null,
        scheduledEndAt: scheduledEndLocal ? new Date(scheduledEndLocal).toISOString() : null,
        durationMinutes:
          typeof durationMinutes === "number" && durationMinutes > 0 ? durationMinutes : null,
        raceDurationMs: Math.max(6, Math.min(30, raceDurationSec)) * 1000,
        revealDurationMs: Math.max(2, Math.min(10, revealDurationSec)) * 1000,
        chatEnabled,
        prizes: normalizedPrizes,
      });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setScheduledStartLocal("");
      setScheduledEndLocal("");
      setDurationMinutes("");
      setSelectedEvent(created);
      setEvents((prev) => [created, ...prev]);
      navigate(`/admin/minigames/${created.id}`, { replace: true });
      setToast({
        type: "success",
        message: `Đã mở phòng Minigame "${created.title}"! Copy link mời gửi học sinh tham gia miễn phí ngay.`,
      });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Không tạo được sự kiện Minigame." });
    } finally {
      setBusy(false);
    }
  };

  const copyInviteLink = (ev: MinigameEvent) => {
    const url = `${window.location.origin}/minigame/${ev.id}`;
    navigator.clipboard?.writeText(url);
    setCopiedId(ev.id);
    setToast({ type: "success", message: `Đã sao chép link mời: ${url}` });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartEvent = async () => {
    if (!selectedEvent || busy) return;
    setBusy(true);
    try {
      const updated = await startMinigameApi(selectedEvent.id);
      setSelectedEvent(updated);
      setToast({
        type: "success",
        message:
          updated.gameType === "horse_race" || updated.gameType === "bee_race"
            ? "Đã khóa đăng ký & chia bảng đấu! Bấm Xuất phát để bắt đầu lượt đua."
            : "Đã bắt đầu quay thưởng trực tiếp trên toàn bộ màn hình học sinh!",
      });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Không thể bắt đầu sự kiện." });
    } finally {
      setBusy(false);
    }
  };

  const handleLaunchHeat = async (heatId: string) => {
    if (!selectedEvent || busy) return;
    setBusy(true);
    try {
      const updated = await launchRaceHeatApi(selectedEvent.id, heatId);
      setSelectedEvent(updated);
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Không thể xuất phát lượt đua." });
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteHeat = async (heatId: string) => {
    if (!selectedEvent) return;
    try {
      const updated = await completeRaceHeatApi(selectedEvent.id, heatId);
      setSelectedEvent(updated);
      if (updated.status === "finished") {
        setToast({
          type: "success",
          message: `🏆 Giải đua đã hoàn tất với ${updated.winners.length} người thắng giải! Bấm 'Trao thưởng tự động ngay' để phát quà.`,
        });
      }
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Không chốt được lượt đua." });
    }
  };

  const handleDistributePrizes = async () => {
    if (!selectedEvent || busy) return;
    setBusy(true);
    try {
      const res = await distributeMinigamePrizesApi(selectedEvent.id);
      setSelectedEvent(res.event);
      setToast({
        type: "success",
        message: `Đã trao quà thành công cho ${res.creditedCount} người thắng${
          res.totalCreditedVnd > 0 ? ` (tổng cộng ${formatVnd(res.totalCreditedVnd)} vào Ví DkTEST)` : ""
        }!`,
      });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Lỗi khi trao thưởng." });
    } finally {
      setBusy(false);
    }
  };

  const handleCancelEvent = async (ev: MinigameEvent) => {
    const ok = await showAppConfirm(
      `Bạn có chắc chắn muốn xóa vĩnh viễn sự kiện "${ev.title}" không? Hành động này không thể hoàn tác.`,
      {
        title: "Xóa sự kiện Minigame",
        confirmLabel: "Xóa sự kiện",
        cancelLabel: "Giữ lại",
        danger: true,
      }
    );
    if (!ok) return;
    try {
      await cancelMinigameApi(ev.id, true);
      setToast({ type: "success", message: `Đã xóa sự kiện "${ev.title}".` });
      if (selectedEvent?.id === ev.id) {
        setSelectedEvent(null);
        navigate("/admin/minigames", { replace: true });
      }
      await loadList();
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Không thể xóa sự kiện." });
    }
  };

  const handleFillBots = async (count?: number) => {
    if (!selectedEvent || busy) return;
    setBusy(true);
    try {
      const updated = await fillMinigameBotsApi(selectedEvent.id, { count });
      setSelectedEvent(updated);
      setToast({
        type: "success",
        message: count
          ? `Đã thêm ${count} Bot ảo vào phòng thử nghiệm.`
          : `Đã điền đầy phòng bằng Bot ảo (${Object.keys(updated.participants || {}).length}/${updated.maxParticipants}). Bấm Bắt đầu để xem thử hiệu ứng!`,
      });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Không thể thêm Bot ảo." });
    } finally {
      setBusy(false);
    }
  };

  const handleClearBots = async () => {
    if (!selectedEvent || busy) return;
    setBusy(true);
    try {
      const updated = await clearMinigameBotsApi(selectedEvent.id);
      setSelectedEvent(updated);
      setToast({ type: "success", message: "Đã xóa toàn bộ Bot ảo khỏi phòng chờ." });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Không thể xóa Bot ảo." });
    } finally {
      setBusy(false);
    }
  };

  const handleResetDemo = async () => {
    if (!selectedEvent || busy) return;
    setBusy(true);
    try {
      const updated = await resetMinigameDemoApi(selectedEvent.id);
      setSelectedEvent(updated);
      setToast({ type: "success", message: "Đã đặt lại phòng về trạng thái chờ để chạy thử lại!" });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Không thể đặt lại phòng thử." });
    } finally {
      setBusy(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await broadcastDeviceNotificationApi({
        title: broadcastTitle.trim(),
        message: broadcastMsg.trim(),
        route: broadcastRoute.trim() || "/",
        type: "feature_release",
      });
      setBroadcastOpen(false);
      setBroadcastTitle("");
      setBroadcastMsg("");
      setToast({
        type: "success",
        message: "Đã phát thông báo đẩy tới tất cả Web & App Android DkTEST!",
      });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Gửi thông báo thất bại." });
    } finally {
      setBusy(false);
    }
  };

  const participantList = useMemo(
    () =>
      selectedEvent
        ? Object.values(selectedEvent.participants || {}).sort((a, b) => a.joinedAt - b.joinedAt)
        : [],
    [selectedEvent]
  );

  const isRace =
    selectedEvent?.gameType === "horse_race" || selectedEvent?.gameType === "bee_race";

  return (
    <div className="p-4 lg:p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 lg:p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          {selectedEvent && (
            <button
              type="button"
              onClick={() => {
                setSelectedEvent(null);
                navigate("/admin/minigames", { replace: true });
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Minigame Sự kiện Phúc lợi (Miễn phí 100%)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tạo event Đua Ngựa, Đua Ong (từ 2 / 4 / 8 / 16 / 32 người), Tài Xỉu, Bầu Cua, Đoán Số — tùy chỉnh số lượng giải &amp; số tiền thưởng bất kỳ hoàn toàn miễn phí
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBroadcastOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs cursor-pointer"
          >
            <Megaphone className="w-4 h-4" /> Gửi thông báo Web/App
          </button>
          <button
            type="button"
            onClick={loadList}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Mở sự kiện Minigame mới
          </button>
        </div>
      </div>

      {/* Live Event Host Room View */}
      {selectedEvent ? (
        <div className="space-y-5">
          {/* Event Control Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl">{MINIGAME_TYPE_META[selectedEvent.gameType]?.emoji}</span>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedEvent.title}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {selectedEvent.eventCode}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    selectedEvent.status === "lobby"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      : selectedEvent.status === "running"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      : selectedEvent.status === "finished"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {selectedEvent.status === "lobby"
                    ? "Đang mở đăng ký"
                    : selectedEvent.status === "running"
                    ? "Đang diễn ra trực tiếp"
                    : selectedEvent.status === "finished"
                    ? "Đã có kết quả"
                    : "Đã hủy"}
                </span>
              </div>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  {participantList.length} / {selectedEvent.maxParticipants} học sinh đã tham gia
                </span>
                {isRace && <span>• {selectedEvent.racersPerHeat} thí sinh / lượt đua</span>}
                <span>• Miễn phí 100% (0đ)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copyInviteLink(selectedEvent)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold cursor-pointer"
              >
                {copiedId === selectedEvent.id ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" /> Đã copy link mời
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy link mời học sinh
                  </>
                )}
              </button>

              {selectedEvent.status === "lobby" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const toLocalInput = (iso?: string | null) => {
                      if (!iso) return "";
                      const d = new Date(iso);
                      if (Number.isNaN(d.getTime())) return "";
                      const tzOffset = d.getTimezoneOffset() * 60_000;
                      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
                    };
                    setEditStartLocal(toLocalInput(selectedEvent.scheduledStartAt));
                    setEditEndLocal(toLocalInput(selectedEvent.scheduledEndAt));
                    setEditChatEnabled(selectedEvent.chatEnabled !== false);
                    setScheduleEditorOpen((v) => !v);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold cursor-pointer"
                >
                  <CalendarClock className="w-4 h-4" />
                  <span>Hẹn giờ &amp; Chat</span>
                </button>
              )}

              {selectedEvent.status === "lobby" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleStartEvent}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    {isRace
                      ? "Khóa phòng & Chia bảng đua!"
                      : selectedEvent.gameType === "lucky_number"
                      ? "Quay số may mắn ngay!"
                      : selectedEvent.gameType === "lucky_wheel"
                      ? "Quay Vòng Quay Siêu Tốc!"
                      : selectedEvent.gameType === "treasure_flip"
                      ? "Lật 9 Rương Kho Báu!"
                      : selectedEvent.gameType === "mystery_box"
                      ? "Đập Hộp Bí Ẩn ngay!"
                      : "Mở bát & Công bố kết quả!"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Live Schedule Banner */}
          <MinigameScheduleBanner event={selectedEvent} />

          {/* Inline Schedule & Chat Editor for Admin */}
          {scheduleEditorOpen && selectedEvent.status === "lobby" && (
            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Tùy chỉnh thời gian diễn ra &amp; Chat trực tiếp</span>
                </div>
                <button
                  type="button"
                  onClick={() => setScheduleEditorOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Thời gian bắt đầu (tùy chọn)
                  </label>
                  <input
                    type="datetime-local"
                    value={editStartLocal}
                    onChange={(e) => setEditStartLocal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Thời gian kết thúc đăng ký (tùy chọn)
                  </label>
                  <input
                    type="datetime-local"
                    value={editEndLocal}
                    onChange={(e) => setEditEndLocal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editChatEnabled}
                    onChange={(e) => setEditChatEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span>Bật khung Chat realtime trong phòng</span>
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const updated = await updateMinigameScheduleApi(selectedEvent.id, {
                        scheduledStartAt: editStartLocal ? new Date(editStartLocal).toISOString() : null,
                        scheduledEndAt: editEndLocal ? new Date(editEndLocal).toISOString() : null,
                        chatEnabled: editChatEnabled,
                      });
                      setSelectedEvent(updated);
                      setScheduleEditorOpen(false);
                      setToast({ type: "success", message: "Đã cập nhật lịch diễn ra sự kiện!" });
                    } catch (err: any) {
                      setToast({ type: "error", message: err?.message || "Không lưu được lịch hẹn." });
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer disabled:opacity-50"
                >
                  Lưu thời gian
                </button>
              </div>
            </div>
          )}

          {/* Admin Virtual Bot Simulation Bar (Test Animations Anytime!) */}
          <div className="bg-violet-50/70 dark:bg-violet-950/30 rounded-2xl border border-violet-200 dark:border-violet-800 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-violet-900 dark:text-violet-200">
              <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <div>
                <span className="font-black">Chế độ Bot ảo thử nghiệm hiệu ứng:</span>{" "}
                <span className="opacity-85">
                  Thêm Bot chạy thử Đua Ngựa / Đua Ong / Tài Xỉu / Bầu Cua / Đoán Số (Bot không bao giờ nhận tiền thật).
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {selectedEvent.status === "lobby" && (
                <>
                  <button
                    type="button"
                    disabled={busy || participantList.length >= selectedEvent.maxParticipants}
                    onClick={() => handleFillBots(1)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    +1 Bot
                  </button>
                  <button
                    type="button"
                    disabled={busy || participantList.length >= selectedEvent.maxParticipants}
                    onClick={() => handleFillBots()}
                    className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    🤖 Điền đầy Bot ({selectedEvent.maxParticipants})
                  </button>
                  {participantList.some((p) => p.isBot) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleClearBots}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold cursor-pointer"
                    >
                      Xóa Bot
                    </button>
                  )}
                </>
              )}
              {(selectedEvent.status === "running" || selectedEvent.status === "finished") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleResetDemo}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Chạy lại Demo (Reset về phòng chờ)
                </button>
              )}
            </div>
          </div>

          {/* Prize Configuration Preview */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Gift className="w-4 h-4 text-amber-500" /> Cơ cấu giải thưởng:
            </span>
            {selectedEvent.prizes.map((pr, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-900 dark:text-amber-200"
              >
                {pr.label}:{" "}
                <b>
                  {pr.type === "wallet_vnd"
                    ? `+${formatVnd(pr.amountVnd || 0)}`
                    : pr.type === "voucher"
                    ? `Voucher ${pr.voucherCode}`
                    : pr.customTitle}
                </b>
              </span>
            ))}
          </div>

          {/* Interactive Live Game Stage */}
          {isRace && selectedEvent.heats.length > 0 && (
            <RaceTrackStage
              event={selectedEvent}
              isAdmin
              onAdminLaunchHeat={handleLaunchHeat}
              onAdminCompleteHeat={handleCompleteHeat}
              busy={busy}
            />
          )}

          {selectedEvent.gameType === "tai_xiu" && <TaiXiuStage event={selectedEvent} />}
          {selectedEvent.gameType === "bau_cua" && <BauCuaStage event={selectedEvent} />}
          {selectedEvent.gameType === "lucky_number" && <LuckyNumberStage event={selectedEvent} />}
          {selectedEvent.gameType === "lucky_wheel" && <LuckyWheelStage event={selectedEvent} />}
          {selectedEvent.gameType === "treasure_flip" && <TreasureFlipStage event={selectedEvent} />}
          {selectedEvent.gameType === "mystery_box" && <MysteryBoxStage event={selectedEvent} />}

          {/* Winners Podium + One-click Auto Distribute Prizes */}
          <WinnersPodiumCard
            event={selectedEvent}
            isAdmin
            onAdminDistributePrizes={handleDistributePrizes}
            busy={busy}
          />

          {/* Live Cheer Bar */}
          {user && (
            <LiveCheerBar
              eventId={selectedEvent.id}
              currentUid={user.uid}
              currentDisplayName={userProfile?.displayName || "Admin"}
            />
          )}

          {/* Realtime Room Chat */}
          {user && (
            <MinigameRealtimeChat
              eventId={selectedEvent.id}
              currentUid={user.uid}
              currentDisplayName={userProfile?.displayName || "Admin"}
              currentAvatarUrl={userProfile?.photoURL || user.photoURL || undefined}
              isAdmin
              chatEnabled={selectedEvent.chatEnabled !== false}
            />
          )}

          {/* Live Registered Participants Lobby Roster */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
              Danh sách học sinh đã đăng ký ({participantList.length}/{selectedEvent.maxParticipants})
            </h3>
            {participantList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Chưa có học sinh nào vào phòng. Hãy bấm "Copy link mời học sinh" và gửi lên nhóm lớp / Zalo / Discord!
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {participantList.map((p) => (
                  <div
                    key={p.uid}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs"
                  >
                    <span
                      className="w-6 h-6 rounded-full text-white text-[11px] font-black flex items-center justify-center shrink-0"
                      style={{ backgroundColor: p.racerColor }}
                    >
                      {p.racerNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {p.displayName}
                      </div>
                      {p.prediction && (
                        <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                          Chọn: {p.prediction}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Events List Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full p-10 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Đang tải danh sách sự kiện Minigame...
            </div>
          ) : events.length === 0 ? (
            <div className="col-span-full p-10 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Sparkles className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Chưa có sự kiện Minigame nào
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tạo ngay sự kiện Đua Ngựa, Đua Ong, Tài Xỉu, Bầu Cua hoặc Đoán Số May Mắn miễn phí để tặng quà phúc lợi cho học sinh!
              </p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                Mở sự kiện đầu tiên
              </button>
            </div>
          ) : (
            events.map((ev) => {
              const meta = MINIGAME_TYPE_META[ev.gameType];
              const count = Object.keys(ev.participants || {}).length;
              return (
                <div
                  key={ev.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all overflow-hidden"
                >
                  <div>
                    <div className="relative aspect-[1200/630] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={getMinigameArtwork(ev.gameType).imagePath}
                        alt={getMinigameArtwork(ev.gameType).imageAlt}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white shadow-sm bg-gradient-to-r ${meta?.gradient}`}
                        >
                          {meta?.emoji} {meta?.label}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                            ev.status === "lobby"
                              ? "bg-blue-600 text-white"
                              : ev.status === "running"
                              ? "bg-amber-500 text-white"
                              : ev.status === "finished"
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-700 text-white"
                          }`}
                        >
                          {ev.status === "lobby"
                            ? "Mở đăng ký"
                            : ev.status === "running"
                            ? "Đang đua"
                            : ev.status === "finished"
                            ? "Hoàn thành"
                            : "Đã hủy"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-2">
                        {ev.title}
                      </h3>
                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          <Users className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                          {count}/{ev.maxParticipants} người
                        </span>
                        <span className="font-mono text-[11px]">{ev.eventCode}</span>
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          {ev.prizes.length} giải
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEvent(ev);
                        navigate(`/admin/minigames/${ev.id}`);
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer"
                    >
                      Mở phòng điều khiển
                    </button>
                    <button
                      type="button"
                      onClick={() => copyInviteLink(ev)}
                      title="Copy link mời"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      {copiedId === ev.id ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelEvent(ev)}
                      title="Hủy sự kiện"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Broadcast Push Notification Modal */}
      {broadcastOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-amber-500" /> Gửi thông báo tới Web & Điện thoại
                </h3>
                <p className="text-xs text-slate-500">
                  Hiển thị thông báo hệ thống trên trình duyệt & thanh trạng thái Android App
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBroadcastOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendBroadcast} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tiêu đề thông báo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="VD: 🎉 Ra mắt Minigame Đua Ngựa & Cửa hàng Acc AI!"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="VD: Vào ngay mục Minigame Phúc Lợi tham gia miễn phí nhận thưởng Ví DkTEST!"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Đường dẫn khi người dùng bấm vào
                </label>
                <select
                  value={broadcastRoute}
                  onChange={(e) => setBroadcastRoute(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  <option value="/student/minigame">Sân chơi Minigame Phúc Lợi (/student/minigame)</option>
                  <option value="/student/ai-shop">Cửa hàng Acc AI (/student/ai-shop)</option>
                  <option value="/student/wallet">Ví DkTEST & Voucher (/student/wallet)</option>
                  <option value="/student/courses">Khóa học (/student/courses)</option>
                  <option value="/">Trang chủ Đề thi (/)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBroadcastOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black disabled:opacity-60 cursor-pointer"
                >
                  {busy ? "Đang phát..." : "Phát thông báo ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Minigame Event Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl my-auto overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Mở sự kiện Minigame Phúc lợi mới
                </h3>
                <p className="text-xs text-slate-500">
                  Miễn phí 100% — Không thu tiền học sinh, chỉ phát thưởng phúc lợi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
              {/* Game Type Cards with Visual Artwork Thumbnails */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                  Chọn trò chơi sự kiện
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(Object.keys(MINIGAME_TYPE_META) as MinigameType[]).map((t) => {
                    const meta = MINIGAME_TYPE_META[t];
                    const art = getMinigameArtwork(t);
                    const active = gameType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelectGameType(t)}
                        className={`rounded-2xl border overflow-hidden text-left transition-all cursor-pointer ${
                          active
                            ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/30"
                            : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
                        }`}
                      >
                        <div className="aspect-[1200/630] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <img
                            src={art.imagePath}
                            alt={art.imageAlt}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-2">
                          <div className="text-[11px] font-black text-slate-900 dark:text-white truncate">
                            {meta.emoji} {art.shortTitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Visual & Social Share Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Xem trước minh họa &amp; Thẻ chia sẻ link (Zalo / Facebook)
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Tự cập nhật khi chỉnh sửa
                  </span>
                </div>
                <MinigamePreviewCard
                  key={gameType}
                  gameType={gameType}
                  title={title.trim() || `${MINIGAME_TYPE_META[gameType].label} — Sự kiện Phúc lợi DkTEST`}
                  description={description.trim() || undefined}
                  defaultShowGuide={false}
                  compact
                  footer={
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        Tối đa <b className="text-slate-800 dark:text-slate-100">{maxParticipants}</b> người •{" "}
                        <b className="text-emerald-600 dark:text-emerald-400">{prizes.length} giải thưởng</b>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        dk-test-v3.vercel.app/minigame/...
                      </span>
                    </div>
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên sự kiện <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Đua Ngựa Cuối Tuần — Tặng 50K Ví DkTEST!"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả / Thể lệ ngắn (tùy chọn)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="VD: Tham gia hoàn toàn miễn phí — giải cộng thẳng vào Ví DkTEST!"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>

              {/* Participant Capacity & Bracket Settings */}
              {gameType === "horse_race" || gameType === "bee_race" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Số người chơi tối đa (từ 2 đến 64 người)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[2, 4, 8, 16, 32].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setMaxParticipants(num);
                            if (racersPerHeat > num) setRacersPerHeat(num);
                          }}
                          className={`py-2 rounded-xl text-xs font-black border cursor-pointer ${
                            maxParticipants === num
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Hoặc nhập tùy ý:</span>
                      <input
                        type="number"
                        min={2}
                        max={64}
                        value={maxParticipants}
                        onChange={(e) => {
                          const val = Math.max(2, Math.min(64, Math.trunc(Number(e.target.value) || 2)));
                          setMaxParticipants(val);
                          if (racersPerHeat > val) setRacersPerHeat(val);
                        }}
                        className="w-20 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold"
                      />
                      <span className="text-[11px] text-slate-400">người</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Số {gameType === "bee_race" ? "ong" : "ngựa"} chạy mỗi lượt đua
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[2, 4, 8].map((per) => (
                        <button
                          key={per}
                          type="button"
                          disabled={per > maxParticipants}
                          onClick={() => setRacersPerHeat(per)}
                          className={`py-2 rounded-xl text-xs font-black border cursor-pointer disabled:opacity-40 ${
                            racersPerHeat === per
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {per} con / lượt
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {maxParticipants === 2
                        ? "Chế độ đấu đối kháng 1 vs 1 trực tiếp Chung kết!"
                        : `Tối đa ${Math.min(racersPerHeat, maxParticipants)} làn mỗi lượt, tự chia vòng loại tới Chung kết.`}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số lượng người tham gia tối đa
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={200}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Math.max(2, Math.min(200, Number(e.target.value) || 20)))}
                    className="w-36 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-bold"
                  />
                </div>
              )}

              {/* Custom Schedule, Duration & Chat Controls */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/25 border border-indigo-200/70 dark:border-indigo-800/70 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-indigo-600" />
                    <span>Tùy chỉnh thời gian diễn ra &amp; Chat realtime</span>
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chatEnabled}
                      onChange={(e) => setChatEnabled(e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <span>Bật Chat Live</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Bắt đầu lúc (để trống = mở ngay)
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledStartLocal}
                      onChange={(e) => setScheduledStartLocal(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Hạn chót đăng ký (tùy chọn)
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledEndLocal}
                      onChange={(e) => {
                        setScheduledEndLocal(e.target.value);
                        if (e.target.value) setDurationMinutes("");
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-bold text-slate-600 dark:text-slate-300">Thời lượng nhanh:</span>
                  {[5, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setDurationMinutes(mins);
                        setScheduledEndLocal("");
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer ${
                        durationMinutes === mins
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {mins} phút
                    </button>
                  ))}
                  {durationMinutes !== "" && (
                    <button
                      type="button"
                      onClick={() => setDurationMinutes("")}
                      className="text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Không giới hạn
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-indigo-200/50 dark:border-indigo-800/50">
                  {gameType === "horse_race" || gameType === "bee_race" ? (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Thời gian mỗi lượt đua (giây):
                      </span>
                      <input
                        type="number"
                        min={6}
                        max={30}
                        value={raceDurationSec}
                        onChange={(e) =>
                          setRaceDurationSec(Math.max(6, Math.min(30, Number(e.target.value) || 14)))
                        }
                        className="w-20 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-center font-black"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Thời gian quay/mở kết quả (giây):
                      </span>
                      <input
                        type="number"
                        min={2}
                        max={10}
                        value={revealDurationSec}
                        onChange={(e) =>
                          setRevealDurationSec(Math.max(2, Math.min(10, Number(e.target.value) || 4)))
                        }
                        className="w-20 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-center font-black"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Flexible Prizes Configuration (1..32 prizes, arbitrary money amount) */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Thiết lập cơ cấu giải thưởng ({prizes.length} giải — tùy chỉnh số lượng &amp; tiền bất kỳ)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Có thể giữ 1 giải, 2 giải, 3 giải hoặc thêm 4, 5, 10+ giải với số tiền bất kỳ (kể cả số lẻ như 1.234đ).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={prizes.length >= 32}
                      onClick={() => {
                        const usedRanks = new Set(prizes.map((p) => p.rank).filter((r) => r >= 1));
                        let nextRank = 1;
                        while (usedRanks.has(nextRank)) nextRank++;
                        setPrizes([
                          ...prizes,
                          {
                            rank: nextRank,
                            label: getDefaultRankLabel(nextRank),
                            type: "wallet_vnd",
                            amountVnd: 5000,
                          },
                        ]);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-black disabled:opacity-40 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Thêm giải xếp hạng
                    </button>
                    {!prizes.some((p) => p.rank === 0) && (
                      <button
                        type="button"
                        disabled={prizes.length >= 32}
                        onClick={() => {
                          setPrizes([
                            ...prizes,
                            {
                              rank: 0,
                              label: "Giải khuyến khích / đồng hạng",
                              type: "wallet_vnd",
                              amountVnd: 2000,
                            },
                          ]);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold disabled:opacity-40 cursor-pointer"
                      >
                        + Thêm giải chung
                      </button>
                    )}
                  </div>
                </div>

                {prizes.map((pr, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* Rank Selector */}
                      <select
                        value={pr.rank}
                        onChange={(e) => {
                          const newRank = Number(e.target.value);
                          const next = [...prizes];
                          const autoOldLabel = getDefaultRankLabel(pr.rank);
                          next[idx] = {
                            ...pr,
                            rank: newRank,
                            label:
                              !pr.label || pr.label === autoOldLabel
                                ? getDefaultRankLabel(newRank)
                                : pr.label,
                          };
                          setPrizes(next);
                        }}
                        className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-black text-amber-700 dark:text-amber-300"
                        title="Thứ hạng nhận giải"
                      >
                        <option value={0}>Chung</option>
                        {Array.from({ length: 32 }, (_, i) => i + 1).map((r) => (
                          <option key={r} value={r}>
                            Hạng #{r}
                          </option>
                        ))}
                      </select>

                      {/* Prize Label */}
                      <input
                        type="text"
                        value={pr.label}
                        onChange={(e) => {
                          const next = [...prizes];
                          next[idx] = { ...pr, label: e.target.value };
                          setPrizes(next);
                        }}
                        placeholder="Tên giải thưởng..."
                        className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold"
                      />

                      {/* Prize Type */}
                      <select
                        value={pr.type}
                        onChange={(e) => {
                          const nextType = e.target.value as MinigamePrizeType;
                          const next = [...prizes];
                          next[idx] = {
                            ...pr,
                            type: nextType,
                            amountVnd: nextType === "wallet_vnd" ? pr.amountVnd ?? 10000 : undefined,
                            voucherCode: nextType === "voucher" ? pr.voucherCode ?? "" : undefined,
                            customTitle: nextType === "custom_gift" ? pr.customTitle ?? "" : undefined,
                          };
                          setPrizes(next);
                        }}
                        className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      >
                        <option value="wallet_vnd">+ Cộng tiền Ví</option>
                        <option value="voucher">Tặng Voucher</option>
                        <option value="custom_gift">Quà tùy chỉnh</option>
                      </select>

                      {/* Reward Value (arbitrary custom integer VND, voucher code, or custom title) */}
                      {pr.type === "wallet_vnd" && (
                        <div className="sm:col-span-3 flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={pr.amountVnd === undefined ? "" : String(pr.amountVnd)}
                            onChange={(e) => {
                              const digitsOnly = e.target.value.replace(/[^\d]/g, "");
                              const parsed = digitsOnly === "" ? 0 : Math.min(1_000_000_000, parseInt(digitsOnly, 10));
                              const next = [...prizes];
                              next[idx] = { ...pr, amountVnd: parsed };
                              setPrizes(next);
                            }}
                            placeholder="Nhập số tiền bất kỳ..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-black text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                      )}
                      {pr.type === "voucher" && (
                        <input
                          type="text"
                          value={pr.voucherCode || ""}
                          onChange={(e) => {
                            const next = [...prizes];
                            next[idx] = { ...pr, voucherCode: e.target.value.toUpperCase() };
                            setPrizes(next);
                          }}
                          placeholder="Mã Voucher (VD: PHUCLOI20)"
                          className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono font-bold"
                        />
                      )}
                      {pr.type === "custom_gift" && (
                        <input
                          type="text"
                          value={pr.customTitle || ""}
                          onChange={(e) => {
                            const next = [...prizes];
                            next[idx] = { ...pr, customTitle: e.target.value };
                            setPrizes(next);
                          }}
                          placeholder="VD: 1 slot Gemini Pro 1T"
                          className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                        />
                      )}

                      {/* Delete Prize Button */}
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          disabled={prizes.length <= 1}
                          onClick={() => setPrizes(prizes.filter((_, i) => i !== idx))}
                          title={prizes.length <= 1 ? "Cần ít nhất 1 giải thưởng" : "Xóa giải này"}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Live VND preview & quick chips when wallet_vnd */}
                    {pr.type === "wallet_vnd" && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          Mức thưởng: +{formatVnd(pr.amountVnd || 0)}
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          {[1000, 5000, 10000, 20000, 50000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                const next = [...prizes];
                                next[idx] = { ...pr, amountVnd: preset };
                                setPrizes(next);
                              }}
                              className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                            >
                              {preset / 1000}K
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Prize Pool Summary */}
                <div className="px-3.5 py-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                  <span>Tổng số giải đã thiết lập: {prizes.length} giải</span>
                  <span>
                    Tổng tiền Ví (các giải xếp hạng):{" "}
                    {formatVnd(
                      prizes
                        .filter((p) => p.type === "wallet_vnd" && p.rank >= 1)
                        .reduce((s, p) => s + (p.amountVnd || 0), 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {busy ? "Đang tạo..." : "Mở sự kiện & Lấy link mời"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
