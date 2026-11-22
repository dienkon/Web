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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type {
  MinigameEvent,
  MinigamePrize,
  MinigamePrizeType,
  MinigameType,
} from "../../types/minigame";
import { MINIGAME_TYPE_META } from "../../services/minigame/gameLogic";
import { formatVnd } from "../../services/aiShop/billingEngine";
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
} from "../../services/minigameClientService";
import { RaceTrackStage } from "../../components/minigame/RaceTrackStage";
import { TaiXiuStage } from "../../components/minigame/TaiXiuStage";
import { BauCuaStage } from "../../components/minigame/BauCuaStage";
import { LuckyNumberStage } from "../../components/minigame/LuckyNumberStage";
import { WinnersPodiumCard } from "../../components/minigame/WinnersPodiumCard";
import { LiveCheerBar } from "../../components/minigame/LiveCheerBar";

function defaultPrizesForGame(gameType: MinigameType): MinigamePrize[] {
  if (gameType === "tai_xiu" || gameType === "bau_cua" || gameType === "lucky_number") {
    return [
      {
        rank: 0,
        label:
          gameType === "lucky_number"
            ? "Trúng chính xác số may mắn"
            : "Người dự đoán đúng",
        type: "wallet_vnd",
        amountVnd: gameType === "lucky_number" ? 20000 : 5000,
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
  const [prizes, setPrizes] = useState<MinigamePrize[]>(() => defaultPrizesForGame("horse_race"));

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
    setBusy(true);
    try {
      const created = await createMinigameApi({
        title: title.trim(),
        description: description.trim(),
        gameType,
        maxParticipants,
        racersPerHeat,
        prizes,
      });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
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
          message: "🏆 Giải đua đã tìm ra Top 1 - 2 - 3! Bấm 'Trao thưởng tự động ngay' để phát quà.",
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
    if (!window.confirm(`Hủy sự kiện "${ev.title}"?`)) return;
    try {
      await cancelMinigameApi(ev.id, Object.keys(ev.participants || {}).length === 0);
      setToast({ type: "success", message: "Đã hủy sự kiện." });
      if (selectedEvent?.id === ev.id) {
        setSelectedEvent(null);
        navigate("/admin/minigames", { replace: true });
      }
      await loadList();
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Không thể hủy sự kiện." });
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
              Tạo event Đua Ngựa, Đua Ong (4/8/16/32 người), Tài Xỉu, Bầu Cua, Đoán Số — phát quà Ví / Voucher hoàn toàn miễn phí cho học sinh
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
                  onClick={handleStartEvent}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    {isRace
                      ? "Khóa phòng & Chia bảng đua!"
                      : selectedEvent.gameType === "lucky_number"
                      ? "Quay số may mắn ngay!"
                      : "Mở bát & Công bố kết quả!"}
                  </span>
                </button>
              )}
            </div>
          </div>

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
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-md transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white bg-gradient-to-r ${meta?.gradient}`}
                      >
                        {meta?.emoji} {meta?.label}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ev.status === "lobby"
                            ? "bg-blue-100 text-blue-700"
                            : ev.status === "running"
                            ? "bg-amber-100 text-amber-700"
                            : ev.status === "finished"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
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

                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {ev.title}
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        <Users className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                        {count}/{ev.maxParticipants} người
                      </span>
                      <span className="font-mono text-[11px]">{ev.eventCode}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
              {/* Game Type Cards */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                  Chọn trò chơi sự kiện
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(MINIGAME_TYPE_META) as MinigameType[]).map((t) => {
                    const meta = MINIGAME_TYPE_META[t];
                    const active = gameType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelectGameType(t)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          active
                            ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/30"
                            : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
                        }`}
                      >
                        <div className="text-xl">{meta.emoji}</div>
                        <div className="text-xs font-black text-slate-900 dark:text-white mt-1">
                          {meta.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
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
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Số lượng người chơi tối đa (4 / 8 / 16 / 32)
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[4, 8, 16, 32].map((num) => (
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
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Số {gameType === "bee_race" ? "ong" : "ngựa"} chạy mỗi lượt đua
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[4, 8].map((per) => (
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

              {/* Flexible Prizes Configuration */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Thiết lập giải thưởng (+ Tiền Ví, Voucher, Quà bất kỳ)
                  </label>
                </div>
                {prizes.map((pr, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={pr.label}
                      onChange={(e) => {
                        const next = [...prizes];
                        next[idx] = { ...pr, label: e.target.value };
                        setPrizes(next);
                      }}
                      className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold"
                    />

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
                      className="sm:col-span-4 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    >
                      <option value="wallet_vnd">+ Cộng tiền Ví DkTEST</option>
                      <option value="voucher">Tặng mã Voucher</option>
                      <option value="custom_gift">Quà hiện vật / Acc AI tùy chỉnh</option>
                    </select>

                    {pr.type === "wallet_vnd" && (
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={pr.amountVnd ?? 0}
                        onChange={(e) => {
                          const next = [...prizes];
                          next[idx] = { ...pr, amountVnd: Math.max(0, Math.trunc(Number(e.target.value) || 0)) };
                          setPrizes(next);
                        }}
                        placeholder="Số tiền VNĐ"
                        className="sm:col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-emerald-600"
                      />
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
                        placeholder="Nhập mã Voucher (VD: PHUCLOI20)"
                        className="sm:col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono font-bold"
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
                        placeholder="VD: 1 slot Gemini Pro Ngon 1 tháng"
                        className="sm:col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      />
                    )}
                  </div>
                ))}
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
