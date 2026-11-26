import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Trophy,
  Users,
  Sparkles,
  Gift,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  LogOut,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { BauCuaFace, MinigameEvent, MinigameType } from "../../types/minigame";
import { MINIGAME_TYPE_META } from "../../services/minigame/gameLogic";
import { getMinigameArtwork } from "../../services/minigame/minigameAssets";
import { formatVnd } from "../../services/aiShop/billingEngine";
import {
  fetchStudentMinigameDetailApi,
  fetchStudentMinigamesApi,
  joinMinigameApi,
  leaveMinigameApi,
  subscribeMinigameEventRealtime,
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
import { MinigamePreviewCard } from "../../components/minigame/MinigamePreviewCard";

export default function StudentMinigame() {
  const { eventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [events, setEvents] = useState<MinigameEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<MinigameEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [previewGameType, setPreviewGameType] = useState<MinigameType>("horse_race");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (eventId) {
        const ev = await fetchStudentMinigameDetailApi(eventId);
        setActiveEvent(ev);
      } else {
        setActiveEvent(null);
        const list = await fetchStudentMinigamesApi();
        setEvents(list);
      }
    } catch (err: any) {
      setToast({
        type: "error",
        message: err?.message || "Không tải được sự kiện Minigame.",
      });
    } finally {
      setLoading(false);
    }
  }, [user, eventId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Real-time live event sync
  useEffect(() => {
    if (!activeEvent?.id || !user) return;
    const unsub = subscribeMinigameEventRealtime(activeEvent.id, (liveEv) => {
      setActiveEvent(liveEv);
    });
    return () => unsub();
  }, [activeEvent?.id, user]);

  const myParticipant = useMemo(
    () => (activeEvent && user ? activeEvent.participants?.[user.uid] || null : null),
    [activeEvent, user]
  );

  const participantList = useMemo(
    () =>
      activeEvent
        ? Object.values(activeEvent.participants || {}).sort((a, b) => a.joinedAt - b.joinedAt)
        : [],
    [activeEvent]
  );

  const handleJoin = async (prediction?: string) => {
    if (!activeEvent || !user || busy) return;
    setBusy(true);
    try {
      const updated = await joinMinigameApi(activeEvent.id, {
        prediction,
        avatarUrl: userProfile?.photoURL || user.photoURL || "",
      });
      setActiveEvent(updated);
      setToast({
        type: "success",
        message: prediction
          ? "Đã chốt lựa chọn miễn phí thành công! Chờ Admin bắt đầu nhé."
          : "Đăng ký tham gia sự kiện miễn phí thành công! Chờ Admin xuất phát nhé.",
      });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Không thể tham gia sự kiện." });
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!activeEvent || !user || busy) return;
    setBusy(true);
    try {
      const updated = await leaveMinigameApi(activeEvent.id);
      setActiveEvent(updated);
      setToast({ type: "success", message: "Đã rời khỏi phòng chờ sự kiện." });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Không thể rời phòng." });
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto p-6 mt-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto">
          <Trophy className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-black text-slate-900 dark:text-white">
          Minigame Phúc Lợi DkTEST (Miễn phí 100%)
        </h1>
        <p className="text-xs text-slate-500">
          Vui lòng đăng nhập tài khoản DkTEST để tham gia các sự kiện Đua Ngựa, Đua Ong, Tài Xỉu, Bầu Cua, Đoán Số nhận quà miễn phí từ Admin!
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-4 z-50 max-w-md px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
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

      {/* Room Detail View */}
      {activeEvent ? (
        <div className="space-y-5">
          {/* Header Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/student/minigame")}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl">{MINIGAME_TYPE_META[activeEvent.gameType]?.emoji}</span>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {activeEvent.title}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                    MIỄN PHÍ 100%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeEvent.description || MINIGAME_TYPE_META[activeEvent.gameType]?.shortDesc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" />
                {participantList.length}/{activeEvent.maxParticipants}
              </span>

              {activeEvent.status === "lobby" &&
                (activeEvent.gameType === "horse_race" || activeEvent.gameType === "bee_race") &&
                (myParticipant ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleLeave}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> Rời phòng
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy || participantList.length >= activeEvent.maxParticipants}
                    onClick={() => handleJoin()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    {participantList.length >= activeEvent.maxParticipants
                      ? "Phòng đã đủ người"
                      : "Đăng ký tham gia miễn phí!"}
                  </button>
                ))}
            </div>
          </div>

          {/* Schedule & Countdown Banner */}
          <MinigameScheduleBanner event={activeEvent} />

          {/* Prize Showcase Strip */}
          <div className="bg-amber-50/70 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-3.5 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <Gift className="w-4 h-4" /> Giải thưởng phúc lợi:
            </span>
            {activeEvent.prizes.map((pr, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-xs font-bold text-slate-800 dark:text-slate-100"
              >
                {pr.label}:{" "}
                <b className="text-emerald-600 dark:text-emerald-400">
                  {pr.type === "wallet_vnd"
                    ? `+${formatVnd(pr.amountVnd || 0)}`
                    : pr.type === "voucher"
                    ? `Voucher ${pr.voucherCode}`
                    : pr.customTitle}
                </b>
              </span>
            ))}
          </div>

          {/* Game Visual Preview & How-to-Play Card */}
          <MinigamePreviewCard
            gameType={activeEvent.gameType}
            title={activeEvent.title}
            description={activeEvent.description}
            defaultShowGuide={activeEvent.status === "lobby"}
            statusBadge={
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black shadow-sm ${
                  activeEvent.status === "lobby"
                    ? "bg-emerald-500 text-white"
                    : activeEvent.status === "running"
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-slate-900/85 text-white"
                }`}
              >
                {activeEvent.status === "lobby"
                  ? "Đang mở đăng ký"
                  : activeEvent.status === "running"
                  ? "🔴 ĐANG LIVE"
                  : "Đã kết thúc"}
              </span>
            }
          />

          {/* Game Stage */}
          {(activeEvent.gameType === "horse_race" || activeEvent.gameType === "bee_race") && (
            <>
              {activeEvent.heats.length > 0 ? (
                <RaceTrackStage event={activeEvent} currentUid={user.uid} />
              ) : (
                <div className="bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 text-white text-center space-y-4 border-2 border-emerald-400/50 shadow-lg">
                  <div className="text-4xl">
                    {activeEvent.gameType === "bee_race" ? "🐝🏁" : "🐎🏆"}
                  </div>
                  <h2 className="text-xl font-black">
                    Phòng chờ {MINIGAME_TYPE_META[activeEvent.gameType]?.label}
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-100 max-w-lg mx-auto">
                    {myParticipant
                      ? `Bạn mang số áo #${myParticipant.racerNumber}! Đang chờ Admin khóa phòng và bấm xuất phát trực tiếp...`
                      : `Bấm "Đăng ký tham gia miễn phí" để nhận số áo và bước vào trường đua tranh giải thưởng từ Admin!`}
                  </p>
                  {!myParticipant && activeEvent.status === "lobby" && (
                    <button
                      type="button"
                      disabled={busy || participantList.length >= activeEvent.maxParticipants}
                      onClick={() => handleJoin()}
                      className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-lg cursor-pointer disabled:opacity-50"
                    >
                      🎉 Tham gia trường đua miễn phí ngay!
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {activeEvent.gameType === "tai_xiu" && (
            <TaiXiuStage
              event={activeEvent}
              currentUid={user.uid}
              onSelectPrediction={(side) => handleJoin(side)}
              busy={busy}
            />
          )}

          {activeEvent.gameType === "bau_cua" && (
            <BauCuaStage
              event={activeEvent}
              currentUid={user.uid}
              onSelectPrediction={(face: BauCuaFace) => handleJoin(face)}
              busy={busy}
            />
          )}

          {activeEvent.gameType === "lucky_number" && (
            <LuckyNumberStage
              event={activeEvent}
              currentUid={user.uid}
              onSelectPrediction={(num) => handleJoin(num)}
              busy={busy}
            />
          )}

          {activeEvent.gameType === "lucky_wheel" && (
            <LuckyWheelStage
              event={activeEvent}
              currentUid={user.uid}
              onSelectPrediction={(sectorId) => handleJoin(sectorId)}
              busy={busy}
            />
          )}

          {activeEvent.gameType === "treasure_flip" && (
            <TreasureFlipStage
              event={activeEvent}
              currentUid={user.uid}
              onSelectPrediction={(chestIndex) => handleJoin(chestIndex)}
              busy={busy}
            />
          )}

          {activeEvent.gameType === "mystery_box" && (
            <MysteryBoxStage
              event={activeEvent}
              currentUid={user.uid}
              onSelectPrediction={(boxNumber) => handleJoin(boxNumber)}
              busy={busy}
            />
          )}

          {/* Winners Podium */}
          <WinnersPodiumCard event={activeEvent} currentUid={user.uid} />

          {/* Real-time Cheer Bar */}
          <LiveCheerBar
            eventId={activeEvent.id}
            currentUid={user.uid}
            currentDisplayName={
              userProfile?.displayName || user.displayName || user.email?.split("@")[0] || "Học sinh"
            }
          />

          {/* Realtime Room Chat */}
          <MinigameRealtimeChat
            eventId={activeEvent.id}
            currentUid={user.uid}
            currentDisplayName={
              userProfile?.displayName || user.displayName || user.email?.split("@")[0] || "Học sinh"
            }
            currentAvatarUrl={userProfile?.photoURL || user.photoURL || undefined}
            isAdmin={userProfile?.role === "admin" || userProfile?.role === "super_admin"}
            chatEnabled={activeEvent.chatEnabled !== false}
          />

          {/* Registered Players List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
              Người chơi đang có mặt ({participantList.length}/{activeEvent.maxParticipants})
            </h3>
            <div className="flex flex-wrap gap-2">
              {participantList.map((p) => (
                <span
                  key={p.uid}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                    p.uid === user.uid
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center"
                    style={{ backgroundColor: p.racerColor }}
                  >
                    {p.racerNumber}
                  </span>
                  <span>{p.displayName}</span>
                </span>
              ))}
              {participantList.length === 0 && (
                <span className="text-xs text-slate-400">Hãy là người đầu tiên đăng ký!</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Lobby List View */
        <div className="space-y-5">
          {/* Hero */}
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-black">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sự kiện phúc lợi MIỄN PHÍ 100% — Không thu phí, không đặt cược</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Sân Chơi Minigame Phúc Lợi Trực Tiếp
              </h1>
              <p className="text-xs sm:text-sm text-amber-50 max-w-xl">
                Đua Ngựa, Đua Ong, Vòng Quay Siêu Tốc, Lật Thẻ Kho Báu, Đập Hộp Bí Ẩn, Tài Xỉu, Bầu Cua, Đoán Số kèm Chat Live trực tiếp — nhận thưởng cộng thẳng Ví DkTEST!
              </p>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="self-start sm:self-center inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Đang tìm các sự kiện Minigame đang mở...
            </div>
          ) : events.filter((e) => e.status !== "cancelled").length === 0 ? (
            <div className="p-12 text-center space-y-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Sparkles className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                Hiện chưa có sự kiện Minigame nào đang diễn ra
              </p>
              <p className="text-xs text-slate-500">
                Khi Admin mở sự kiện mới hoặc gửi link mời, sự kiện sẽ xuất hiện ngay tại đây!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events
                .filter((e) => e.status !== "cancelled")
                .map((ev) => {
                  const meta = MINIGAME_TYPE_META[ev.gameType];
                  const art = getMinigameArtwork(ev.gameType);
                  const count = Object.keys(ev.participants || {}).length;
                  const joined = Boolean(ev.participants?.[user.uid]);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => navigate(`/student/minigame/${ev.id}`)}
                      className="group text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs hover:shadow-lg hover:border-amber-400 transition-all cursor-pointer overflow-hidden"
                    >
                      <div>
                        {/* Custom 1200x630 Game Artwork Preview */}
                        <div className="relative aspect-[1200/630] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <img
                            src={art.imagePath}
                            alt={art.imageAlt}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white shadow-sm bg-gradient-to-r ${meta?.gradient}`}
                            >
                              {meta?.emoji} {meta?.label}
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm ${
                                ev.status === "lobby"
                                  ? "bg-emerald-500 text-white"
                                  : ev.status === "running"
                                  ? "bg-rose-600 text-white animate-pulse"
                                  : "bg-slate-900/80 text-white"
                              }`}
                            >
                              {ev.status === "lobby"
                                ? "Đang mở đăng ký"
                                : ev.status === "running"
                                ? "🔴 ĐANG LIVE"
                                : "Đã kết thúc"}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 space-y-2.5">
                          <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-2">
                            {ev.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {ev.description || art.tagline}
                          </p>

                          <div className="flex flex-wrap gap-1.5">
                            {ev.prizes.slice(0, 3).map((pr, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                              >
                                {pr.label}:{" "}
                                {pr.type === "wallet_vnd"
                                  ? `+${formatVnd(pr.amountVnd || 0)}`
                                  : pr.type === "voucher"
                                  ? pr.voucherCode
                                  : pr.customTitle}
                              </span>
                            ))}
                            {ev.prizes.length > 3 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                +{ev.prizes.length - 3} giải khác
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          {count}/{ev.maxParticipants} người
                        </span>
                        <span className="font-black text-blue-600 dark:text-blue-400">
                          {joined
                            ? "Đã tham gia → Vào xem"
                            : ev.status === "lobby"
                            ? "Tham gia miễn phí →"
                            : "Xem trực tiếp →"}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Interactive Showcase & Detailed Visual Guide for all 8 Minigames */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Xem trước &amp; Minh họa 8 Minigame Phúc Lợi
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chọn từng trò chơi để xem hình ảnh minh họa chi tiết và hướng dẫn cách tham gia nhận quà miễn phí.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(MINIGAME_TYPE_META) as MinigameType[]).map((type) => {
                const meta = MINIGAME_TYPE_META[type];
                const art = getMinigameArtwork(type);
                const selected = previewGameType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPreviewGameType(type)}
                    className={`rounded-2xl border overflow-hidden text-left transition-all cursor-pointer ${
                      selected
                        ? "border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/70 dark:bg-blue-950/40"
                        : "border-slate-200 dark:border-slate-700 hover:border-blue-300 bg-white dark:bg-slate-900"
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

            <MinigamePreviewCard
              key={previewGameType}
              gameType={previewGameType}
              defaultShowGuide
            />
          </div>
        </div>
      )}
    </div>
  );
}
