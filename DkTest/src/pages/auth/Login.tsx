import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, Loader2, ArrowLeft, LogIn, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import GoogleLoginButton from "../../components/auth/GoogleLoginButton";
import ResetPasswordModal from "../../components/auth/ResetPasswordModal";
import { getFriendlyAuthErrorMessage } from "../../utils/authErrors";
import { useToast } from "../../components/ui/ToastNotification";

type LoginMethod = "username" | "email" | "google";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const { loginWithEmail, loginWithUsername, userProfile, role, emailVerified, user } = useAuth();
  const { showToast } = useToast();

  const [method, setMethod] = useState<LoginMethod>("username");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);

  // If already authenticated and email is verified, navigate appropriately
  useEffect(() => {
    if (user && userProfile) {
      const isPassword = user.providerData?.some((p) => p.providerId === "password");
      const isUsernameAccount =
        user.email?.endsWith("@dktest.local") ||
        userProfile.authProvider === "username" ||
        user.providerData?.[0]?.providerId === "google.com";

      if (isPassword && !isUsernameAccount && !user.emailVerified) {
        navigate(`/email-verification?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
        return;
      }

      if (role === "admin" || role === "super_admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "parent") {
        navigate("/parent/dashboard", { replace: true });
      } else if (redirectPath && redirectPath !== "/" && !redirectPath.startsWith("/login") && !redirectPath.startsWith("/register")) {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [user, userProfile, role, navigate, redirectPath]);

  const handlePostLoginRedirect = (profile: any, firebaseUser?: any) => {
    const u = firebaseUser || user;
    const isPassword = u?.providerData?.some((p: any) => p.providerId === "password");
    const isUsernameAccount =
      u?.email?.endsWith("@dktest.local") ||
      profile?.authProvider === "username" ||
      userProfile?.authProvider === "username";

    if (isPassword && !isUsernameAccount && !u?.emailVerified) {
      navigate(`/email-verification?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
      return;
    }

    if (profile.role === "admin" || profile.role === "super_admin") {
      navigate("/admin/dashboard", { replace: true });
    } else if (profile.role === "parent") {
      navigate("/parent/dashboard", { replace: true });
    } else {
      const safeRedirect = redirectPath && !redirectPath.startsWith("/login") ? redirectPath : "/";
      navigate(safeRedirect, { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (method === "username") {
      if (!username.trim() || !password) {
        setError("Vui lòng nhập tên đăng nhập và mật khẩu.");
        return;
      }
    } else if (method === "email") {
      if (!email.trim() || !password) {
        setError("Vui lòng nhập email và mật khẩu.");
        return;
      }
    }

    setLoading(true);

    try {
      let profile: any;
      if (method === "username") {
        const trimmed = username.trim();
        if (trimmed.includes("@")) {
          profile = await loginWithEmail(trimmed, password);
        } else {
          profile = await loginWithUsername(trimmed, password);
        }
      } else {
        const trimmed = email.trim();
        if (trimmed.includes("@")) {
          profile = await loginWithEmail(trimmed, password);
        } else {
          profile = await loginWithUsername(trimmed, password);
        }
      }

      showToast(`Đăng nhập thành công! Chào mừng ${profile.displayName || "bạn"}.`, "success");
      handlePostLoginRedirect(profile);
    } catch (err: any) {
      console.error("[Login] Error:", err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (profile: any) => {
    showToast(`Đăng nhập Google thành công! Chào ${profile.displayName || "bạn"}.`, "success");
    handlePostLoginRedirect(profile);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Về trang chủ"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <Link to="/student/login" className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors">
              Học sinh
            </Link>
            <Link to="/parent/login" className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors">
              Phụ huynh
            </Link>
            <Link to="/admin/login" className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors">
              Giáo viên
            </Link>
          </div>
        </div>

        {/* Brand Title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="DKTEST Logo"
              className="w-14 h-14 rounded-2xl object-contain shadow-md border border-slate-100 p-1 bg-white"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Đăng nhập tài khoản</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Truy cập vào hệ thống khảo thí và học tập DkTEST
            </p>
          </div>
        </div>

        {/* 3 Methods Segmented Control */}
        <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setMethod("username");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              method === "username"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Username
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("email");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              method === "email"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("google");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              method === "google"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Google
          </button>
        </div>

        {/* Method: Google */}
        {method === "google" && (
          <div className="py-4 space-y-4">
            <GoogleLoginButton
              buttonText="Tiếp tục với Google"
              onSuccess={handleGoogleSuccess}
              onError={setError}
            />
            <p className="text-center text-[11px] text-slate-400">
              Đăng nhập nhanh không cần mật khẩu thông qua tài khoản Google của bạn.
            </p>
          </div>
        )}

        {/* Method: Username or Email */}
        {method !== "google" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {method === "username" ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên đăng nhập (Username)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập username..."
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold animate-in fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Link to Register */}
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Chưa có tài khoản?{" "}
            <Link
              to={`/register?redirect=${encodeURIComponent(redirectPath)}`}
              className="font-bold text-blue-600 hover:text-blue-800 underline transition-colors"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>

      <ResetPasswordModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        initialEmail={email}
      />
    </div>
  );
}
