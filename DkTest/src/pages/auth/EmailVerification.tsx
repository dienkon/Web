import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, CheckCircle2, RotateCw, LogOut, ArrowLeft, AlertCircle, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/ToastNotification";

export default function EmailVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const { user, userProfile, emailVerified, authInitialized, checkEmailVerification, resendVerificationEmail, logout } = useAuth();
  const { showToast, showErrorToast } = useToast();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // If not logged in and auth finished initializing, redirect to login
  useEffect(() => {
    if (authInitialized && !user) {
      navigate("/login", { replace: true });
    }
  }, [authInitialized, user, navigate]);

  // Mask email for privacy (e.g. "dienkon@gmail.com" -> "d***n@gmail.com")
  const getMaskedEmail = (rawEmail: string): string => {
    if (!rawEmail) return "email của bạn";
    const parts = rawEmail.split("@");
    if (parts.length !== 2) return rawEmail;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) {
      return `${name[0]}***@${domain}`;
    }
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  };

  const emailToDisplay = user?.email || userProfile?.email || "";

  // If already verified or is username account, redirect immediately
  useEffect(() => {
    const isUsernameAccount =
      Boolean(user?.email?.endsWith("@dktest.local")) ||
      userProfile?.authProvider === "username" ||
      user?.providerData?.[0]?.providerId === "google.com";

    if (emailVerified || isUsernameAccount) {
      const destination = redirectPath && !redirectPath.startsWith("/email-verification") && !redirectPath.startsWith("/login")
        ? redirectPath
        : userProfile?.role === "parent"
        ? "/parent/dashboard"
        : userProfile?.role === "admin" || userProfile?.role === "super_admin"
        ? "/admin/dashboard"
        : "/";
      navigate(destination, { replace: true });
    }
  }, [emailVerified, user, userProfile, redirectPath, navigate]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      const isVerified = await checkEmailVerification();
      if (isVerified) {
        showToast("Xác thực email thành công! Chào mừng bạn tham gia DkTEST.", "success");
        const destination = redirectPath && !redirectPath.startsWith("/email-verification") && !redirectPath.startsWith("/login")
          ? redirectPath
          : userProfile?.role === "parent"
          ? "/parent/dashboard"
          : userProfile?.role === "admin" || userProfile?.role === "super_admin"
          ? "/admin/dashboard"
          : "/";
        navigate(destination, { replace: true });
      } else {
        showErrorToast("Tài khoản chưa được xác minh. Vui lòng mở hòm thư và nhấn vào liên kết xác nhận.");
      }
    } catch (err: any) {
      console.error("[EmailVerification] Error checking:", err);
      showErrorToast(err.message || "Không thể kiểm tra trạng thái xác minh.");
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await resendVerificationEmail();
      showToast("Đã gửi lại email xác minh thành công. Vui lòng kiểm tra hộp thư!", "success");
      setCooldown(45);
    } catch (err: any) {
      console.error("[EmailVerification] Resend error:", err);
      if (err?.code === "auth/too-many-requests") {
        showErrorToast("Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng đợi ít phút trước khi thử lại.");
        setCooldown(60);
      } else {
        showErrorToast(err.message || "Không thể gửi lại email xác minh.");
      }
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6 text-center animate-in fade-in duration-200">
        {/* Animated Icon */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Mail className="w-8 h-8" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md">
            !
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Kiểm tra email của bạn
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            Hệ thống đã gửi liên kết kích hoạt tài khoản tới:
          </p>
          <div className="inline-block px-3.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-bold rounded-xl select-all">
            {getMaskedEmail(emailToDisplay)}
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-left text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Hướng dẫn xác minh:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-700">
            1. Mở hòm thư điện tử và tìm email từ <strong>DkTEST (Firebase)</strong>.
          </p>
          <p className="text-[11px] leading-relaxed text-amber-700">
            2. Nhấp vào liên kết xác nhận trong email.
          </p>
          <p className="text-[11px] leading-relaxed text-amber-700">
            3. Quay lại trang này và nhấn nút <strong>"Tôi đã xác minh email"</strong> bên dưới.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleCheckVerification}
            disabled={checking}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {checking ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Đang kiểm tra trạng thái...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Tôi đã xác minh email</span>
              </>
            )}
          </button>

          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-700 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
            <span>
              {cooldown > 0
                ? `Gửi lại email sau ${cooldown}s`
                : resending
                ? "Đang gửi lại..."
                : "Gửi lại email xác minh"}
            </span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đổi tài khoản khác</span>
          </button>

          <span className="text-[11px] text-slate-400">
            Kiểm tra thư mục <strong>Spam / Rác</strong> nếu không thấy thư
          </span>
        </div>
      </div>
    </div>
  );
}
