import React, { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/ToastNotification";

export default function EmailVerificationBanner() {
  const { user, resendVerificationEmail } = useAuth();
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // If user is not logged in or email is already verified, do not show banner
  if (!user || user.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerificationEmail();
      setSent(true);
      showToast("Đã gửi email xác minh. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam).", "success");
    } catch (err: any) {
      showToast(err.message || "Không thể gửi email xác minh lúc này. Vui lòng thử lại sau.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-800 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          Địa chỉ email <strong>{user.email}</strong> chưa được xác minh.
        </span>
      </div>
      <div className="flex items-center gap-2">
        {sent ? (
          <span className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã gửi email
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            <span>Gửi lại email xác minh</span>
          </button>
        )}
      </div>
    </div>
  );
}
