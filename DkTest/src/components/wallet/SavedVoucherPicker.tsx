import React, { useEffect, useMemo, useState } from "react";
import { Ticket, CheckCircle2, Sparkles, Clock } from "lucide-react";
import {
  getSuggestedSavedVouchersForContext,
  formatVoucherBenefitSummary,
} from "../../services/savedVoucherService";

interface SavedVoucherPickerProps {
  uid?: string | null;
  context: "exam_unlock" | "course_unlock" | "deposit";
  amountVnd: number;
  appliedCode?: string | null;
  onSelectVoucher: (code: string) => void;
  className?: string;
}

export const SavedVoucherPicker: React.FC<SavedVoucherPickerProps> = ({
  uid,
  context,
  amountVnd,
  appliedCode,
  onSelectVoucher,
  className = "",
}) => {
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshTick((n) => n + 1);
    window.addEventListener("dktest:saved_vouchers_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("dktest:saved_vouchers_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const suggestions = useMemo(
    () => getSuggestedSavedVouchersForContext(uid, context, amountVnd),
    [uid, context, amountVnd, refreshTick]
  );

  if (suggestions.length === 0) {
    return null;
  }

  const normalizedApplied = String(appliedCode || "").trim().toUpperCase();
  const isDeposit = context === "deposit";

  return (
    <div
      className={`rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-3.5 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 uppercase tracking-wider">
          <Ticket className="w-3.5 h-3.5" />
          <span>
            {isDeposit ? "Voucher nạp tiền đã lưu" : "Voucher giảm giá đã lưu"} ({suggestions.length})
          </span>
        </div>
        <span className="text-[11px] font-semibold text-indigo-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Đề xuất tốt nhất
        </span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
        {suggestions.map(({ voucher, eligible, reason, estimatedBenefitVnd }) => {
          const isSelected = normalizedApplied === voucher.code.toUpperCase();
          return (
            <div
              key={voucher.code}
              className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 transition-all ${
                isSelected
                  ? "border-emerald-400 bg-emerald-50/80 shadow-sm"
                  : eligible
                    ? "border-indigo-200/80 bg-white hover:border-indigo-400 hover:shadow-sm"
                    : "border-slate-200 bg-slate-50/70 opacity-75"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-black tracking-wide ${
                      isSelected
                        ? "bg-emerald-600 text-white"
                        : eligible
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-300 text-slate-700"
                    }`}
                  >
                    {voucher.code}
                  </span>
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {voucher.name}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="font-semibold text-indigo-600">
                    {formatVoucherBenefitSummary(voucher)}
                  </span>
                  {eligible && estimatedBenefitVnd > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                      {isDeposit
                        ? `Thưởng +${estimatedBenefitVnd.toLocaleString("vi-VN")}đ`
                        : `Tiết kiệm ${estimatedBenefitVnd.toLocaleString("vi-VN")}đ`}
                    </span>
                  )}
                  {!eligible && reason && (
                    <span className="text-amber-700 font-semibold">{reason}</span>
                  )}
                  {voucher.expiresAt && (
                    <span className="text-slate-400 inline-flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      HSD {new Date(voucher.expiresAt).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={!eligible}
                onClick={() => onSelectVoucher(voucher.code)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                  isSelected
                    ? "bg-emerald-600 text-white cursor-default"
                    : eligible
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm active:scale-95"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã chọn
                  </>
                ) : (
                  "Dùng ngay"
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
