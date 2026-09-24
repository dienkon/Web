import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, Mail, User, Loader2, ArrowLeft, ShieldCheck, KeyRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import GoogleLoginButton from "../../components/auth/GoogleLoginButton";
import {
  verifyAdminCredentials,
  setAdminSession,
  isAdminAuthenticated,
} from "../../services/authService";
import { getFriendlyAuthErrorMessage } from "../../utils/authErrors";
import { useToast } from "../../components/ui/ToastNotification";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/admin/exams";
  const redirectPath = rawRedirect && !rawRedirect.startsWith("/admin/login") ? rawRedirect : "/admin/exams";

  const { loginWithEmail, loginWithUsername, userProfile, role, logout } = useAuth();
  const { showToast } = useToast();

  const [authMode, setAuthMode] = useState<"firebase" | "legacy_pass">("firebase");
  const [email, setEmail] = useState("duongthanhdien3456@gmail.com");
  const [password, setPassword] = useState("");
  const [legacyPassword, setLegacyPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAdminAuthenticated() || role === "admin" || role === "super_admin") {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath, role]);

  const handleFirebaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Vui lòng nhập email và mật khẩu quản trị.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let profile: any;
      if (email.includes("@")) {
        profile = await loginWithEmail(email.trim(), password);
      } else {
        profile = await loginWithUsername(email.trim(), password);
      }

      if (profile.role !== "admin" && profile.role !== "super_admin") {
        setError("Tài khoản này không có quyền quản trị viên.");
        return;
      }
      setAdminSession({ displayName: profile.displayName || "Dương Thanh Điền (Admin)", email: profile.email || "duongthanhdien3456@gmail.com" });
      showToast("Đăng nhập quyền Quản trị viên thành công!", "success");
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      console.error("[AdminLogin] Error:", err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLegacyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legacyPassword) {
      setError("Vui lòng nhập mật khẩu quản trị.");
      return;
    }

    setLoading(true);
    setError("");

    setTimeout(() => {
      if (verifyAdminCredentials(legacyPassword)) {
        setAdminSession({ displayName: "Dương Thanh Điền (Admin)", email: "duongthanhdien3456@gmail.com" });
        showToast("Đăng nhập thành công!", "success");
        navigate(redirectPath, { replace: true });
      } else {
        setError("Mật khẩu quản trị không đúng.");
      }
      setLoading(false);
    }, 400);
  };

  const handleGoogleSuccess = (profile: any) => {
    if (profile.role !== "admin" && profile.role !== "super_admin") {
      setError("Tài khoản Google này chưa được cấp quyền Quản trị viên.");
      return;
    }
    setAdminSession({ displayName: profile.displayName || "Dương Thanh Điền (Admin)", email: profile.email || "duongthanhdien3456@gmail.com" });
    showToast("Đăng nhập Google với quyền Quản trị viên thành công!", "success");
    navigate(redirectPath, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
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
            <span className="px-2.5 py-1 bg-white text-blue-700 rounded-lg shadow-2xs font-bold">
              Giáo viên
            </span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="DKTEST Logo"
              className="w-16 h-16 rounded-2xl object-contain shadow-md border border-slate-100 p-1 bg-white"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cổng Giáo Viên</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Đăng nhập tài khoản Quản trị để quản lý hệ thống</p>
          </div>
        </div>

        {/* Google Login for Admin */}
        <div>
          <GoogleLoginButton
            buttonText="Đăng nhập Admin bằng Google"
            onSuccess={handleGoogleSuccess}
            onError={setError}
          />
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-bold text-[10px] tracking-wider">
                hoặc đăng nhập bằng tài khoản
              </span>
            </div>
          </div>
        </div>

        {/* Auth Mode Toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode("firebase");
              setError("");
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              authMode === "firebase" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Email + Mật khẩu
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("legacy_pass");
              setError("");
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              authMode === "legacy_pass" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Mã quản trị nhanh
          </button>
        </div>

        {authMode === "firebase" ? (
          <form onSubmit={handleFirebaseLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tên đăng nhập (Username) hoặc Email Quản trị
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin hoặc admin@dktest.vn"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
                />
                {!email.includes("@") ? (
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                ) : (
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs font-semibold bg-red-50 p-2.5 rounded-xl border border-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Đăng nhập Giáo viên"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLegacyLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mật khẩu quản trị viên
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={legacyPassword}
                  onChange={(e) => setLegacyPassword(e.target.value)}
                  placeholder="Nhập mật khẩu quản trị..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs font-semibold bg-red-50 p-2.5 rounded-xl border border-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận mã quản trị"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
