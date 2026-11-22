import React from "react";
import { Link } from "react-router-dom";
import { Trophy, Gift, CheckCircle2, Wallet, Ticket } from "lucide-react";
import type { MinigameEvent } from "../../types/minigame";
import { formatVnd } from "../../services/aiShop/billingEngine";

interface WinnersPodiumCardProps {
  event: MinigameEvent;
  currentUid?: string;
  isAdmin?: boolean;
  onAdminDistributePrizes?: () => Promise<void>;
  busy?: boolean;
}

export const WinnersPodiumCard: React.FC<WinnersPodiumCardProps> = ({
  event,
  currentUid,
  isAdmin = false,
  onAdminDistributePrizes,
  busy = false,
}) => {
  if (event.status !== "finished") return null;

  const hasUndistributed = (event.winners || []).some((w) => !w.distributed);

  return (
    <div className="bg-gradient-to-br from-amber-50 via-yellow-50/60 to-white dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 rounded-3xl border-2 border-amber-300 dark:border-amber-700 p-5 shadow-md space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-sm">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Bảng Vinh Danh & Trao Quà Phúc Lợi ({event.winners.length} người thắng)
            </h3>
            <p className="text-xs text-slate-500">
              {event.prizesDistributedAt
                ? "Admin đã xác nhận trao thưởng cho danh sách người thắng."
                : "Đang chờ Admin xác nhận trao thưởng tự động vào Ví / Voucher."}
            </p>
          </div>
        </div>

        {isAdmin && hasUndistributed && event.winners.length > 0 && onAdminDistributePrizes && (
          <button
            type="button"
            disabled={busy}
            onClick={onAdminDistributePrizes}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md disabled:opacity-60 cursor-pointer"
          >
            <Gift className="w-4 h-4" />
            <span>{busy ? "Đang trao thưởng..." : "Trao thưởng tự động ngay"}</span>
          </button>
        )}
      </div>

      {event.winners.length === 0 ? (
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 text-xs text-slate-500 text-center">
          Sự kiện lần này chưa có người chơi nào khớp kết quả trúng thưởng. Hẹn gặp lại ở sự kiện kế tiếp!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {event.winners.map((w, idx) => {
            const isMe = w.uid === currentUid;
            return (
              <div
                key={`${w.uid}_${w.rank}_${idx}`}
                className={`p-4 rounded-2xl border bg-white dark:bg-slate-950/70 space-y-2 ${
                  isMe
                    ? "border-emerald-400 ring-2 ring-emerald-300/50"
                    : w.rank === 1
                    ? "border-amber-400 shadow-xs"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <span>
                      {w.rank === 1
                        ? "🥇"
                        : w.rank === 2
                        ? "🥈"
                        : w.rank === 3
                        ? "🥉"
                        : "🎉"}
                    </span>
                    <span>{w.prizeLabel}</span>
                  </span>
                  {w.distributed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Đã trao
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                      Chờ trao
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {w.displayName} {isMe && <span className="text-emerald-600">(Bạn!)</span>}
                  </div>
                  {w.matchDetail && (
                    <div className="text-[11px] text-slate-500 mt-0.5">{w.matchDetail}</div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  {w.prizeType === "wallet_vnd" && (
                    <div className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-600 dark:text-emerald-400">
                      <Wallet className="w-4 h-4" /> +{formatVnd(w.amountVnd || 0)} vào Ví DkTEST
                    </div>
                  )}
                  {w.prizeType === "voucher" && (
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400">
                        <Ticket className="w-4 h-4" /> Mã Voucher:{" "}
                        <code className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950">
                          {w.voucherCode || "Liên hệ Admin"}
                        </code>
                      </div>
                      {isMe && w.voucherCode && (
                        <div>
                          <Link
                            to={`/voucher/${encodeURIComponent(w.voucherCode)}`}
                            className="inline-block px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold"
                          >
                            Mở & Nhận Voucher ngay
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                  {w.prizeType === "custom_gift" && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-black text-violet-600 dark:text-violet-400">
                      <Gift className="w-4 h-4" /> {w.customTitle || "Phần quà đặc biệt"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
