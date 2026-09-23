import React, { useState } from "react";
import { Mail, Loader2, CheckCircle2, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getFriendlyAuthErrorMessage } from "../../utils/authErrors";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export default function ResetPasswordModal({ isOpen, onClose, initialEmail = "" }: ResetPasswordModalProps) {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập địa chỉ email của bạn.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err: any) {
      console.error("[ResetPassword] Error:", err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative space-y-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Quên mật khẩu?</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Nhập email đã đăng ký của bạn. Chúng tôi sẽ gửi một liên kết an toàn để đặt lại mật khẩu mới.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center py-2">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Đã gửi email khôi phục tới <strong>{email}</strong>!</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Vui lòng kiểm tra hộp thư đến và làm theo hướng dẫn trong email để tạo mật khẩu mới.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Đã hiểu & Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Địa chỉ Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs font-semibold bg-red-50 p-2.5 rounded-lg border border-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gửi liên kết khôi phục"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
