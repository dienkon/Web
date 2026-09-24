import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { User, Mail, Lock, Loader2, ArrowLeft, Users, ShieldCheck, HeartHandshake, Eye, Sparkles, LogIn, UserPlus } from "lucide-react";
import { auth } from "../../services/firebase/config";
import { useAuth } from "../../context/AuthContext";
import GoogleLoginButton from "../../components/auth/GoogleLoginButton";
import PasswordStrengthMeter, { evaluatePasswordStrength } from "../../components/auth/PasswordStrengthMeter";
import ResetPasswordModal from "../../components/auth/ResetPasswordModal";
import { getFriendlyAuthErrorMessage } from "../../utils/authErrors";
import { isAdminAuthenticated, isParentAuthenticated } from "../../services/authService";
import { useToast } from "../../components/ui/ToastNotification";

export default function ParentLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/parent/dashboard";
  const { loginWithEmail, loginWithUsername, registerWithEmail, registerWithUsername, userProfile, role } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [regMethod, setRegMethod] = useState<"username" | "email">("username");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);

  const [isLogin, setIsLogin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminActive = isAdminAuthenticated() || role === "admin" || role === "super_admin";
    setIsAdmin(adminActive);

    // Only redirect if explicitly logged in as a parent with an intended target
    if (
      role === "parent" &&
      redirectPath &&
      !redirectPath.startsWith("/parent/login") &&
      redirectPath !== "/parent/dashboard"
    ) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLogin) {
      if (!email.trim() || !password) {
        setError("Vui lòng điền đầy đủ tên đăng nhập (hoặc email) và mật khẩu.");
        return;
      }
    } else {
      if (!displayName.trim()) {
        setError("Vui lòng nhập họ và tên của phụ huynh (bắt buộc).");
        return;
      }

      if (regMethod === "username") {
        const trimmedUser = username.trim();
        if (!trimmedUser) {
          setError("Vui lòng nhập tên đăng nhập (username) của bạn (bắt buộc).");
          return;
        }
        if (trimmedUser.length < 3) {
          setError("Tên đăng nhập phải có ít nhất 3 ký tự.");
          return;
        }
        if (/\s/.test(trimmedUser)) {
          setError("Tên đăng nhập không được chứa khoảng trắng.");
          return;
        }
      } else {
        if (!email.trim() || !email.includes("@")) {
          setError("Vui lòng nhập địa chỉ email hợp lệ để nhận mã xác nhận kích hoạt.");
          return;
        }
      }

      if (!password || password.length < 6) {
        setError("Mật khẩu phải có tối thiểu 6 ký tự (khuyến nghị từ 8 ký tự).");
        return;
      }

      if (password !== confirmPassword) {
        setError("Mật khẩu nhập lại không khớp. Vui lòng kiểm tra lại.");
        return;
      }

      const strength = evaluatePasswordStrength(password, regMethod === "email" ? email : username);
      if (strength.score < 2 || password.length < 8) {
        setError("Mật khẩu quá yếu. Vui lòng đảm bảo tối thiểu 8 ký tự gồm cả chữ và số.");
        return;
      }
    }

    setLoading(true);

    try {
      const target = redirectPath && !redirectPath.startsWith("/parent/login") ? redirectPath : "/parent/dashboard";

      if (isLogin) {
        let profile: any;
        if (email.includes("@")) {
          profile = await loginWithEmail(email.trim(), password);
        } else {
          profile = await loginWithUsername(email.trim(), password);
        }

        const isPassword = auth.currentUser?.providerData?.some((p) => p.providerId === "password");
        const isRealEmail = auth.currentUser?.email && !auth.currentUser.email.endsWith("@dktest.local");
        if (isPassword && isRealEmail && !auth.currentUser?.emailVerified) {
          navigate(`/email-verification?redirect=${encodeURIComponent(target)}`, { replace: true });
          return;
        }

        showToast(`Đăng nhập thành công! Chào ${profile.displayName || "Phụ huynh"}.`, "success");
        navigate(target, { replace: true });
      } else {
        if (regMethod === "username") {
          const profile = await registerWithUsername({
            username: username.trim(),
            password,
            displayName: displayName.trim(),
            role: "parent",
            phone: phone.trim(),
          });
          showToast(`Đăng ký tài khoản Phụ huynh thành công! Chào mừng ${profile.displayName}.`, "success");
          navigate(target, { replace: true });
        } else {
          await registerWithEmail({
            email: email.trim(),
            password,
            displayName: displayName.trim(),
            role: "parent",
            phone: phone.trim(),
          });
          showToast("Đăng ký tài khoản Phụ huynh thành công! Vui lòng xác minh email để kích hoạt.", "success");
          navigate(`/email-verification?redirect=${encodeURIComponent(target)}`, { replace: true });
        }
      }
    } catch (err: any) {
      console.error("[ParentLogin] Error:", err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (profile: any) => {
    showToast(`Chào mừng ${profile.displayName || "Phụ huynh"}!`, "success");
    navigate("/parent/dashboard", { replace: true });
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
            <span className="px-2.5 py-1 bg-white text-indigo-700 rounded-lg shadow-2xs font-bold">
              Phụ huynh
            </span>
            {isAdmin && (
              <Link to="/admin/login" className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors">
                Giáo viên
              </Link>
            )}
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cổng Phụ Huynh</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Đồng hành và giám sát kết quả khảo thí của con em
            </p>
          </div>
        </div>

        {/* Google Login for Parent */}
        <div>
          <GoogleLoginButton
            intendedRole="parent"
            buttonText="Tiếp tục với Google"
            onSuccess={handleGoogleSuccess}
            onError={setError}
          />
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-bold text-[10px] tracking-wider">
                hoặc dùng tài khoản Email
              </span>
            </div>
          </div>
        </div>

        {/* Toggle Mode */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isLogin ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              !isLogin ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Đăng ký mới</span>
          </button>
        </div>

        {/* If registering, show 1 trong 2 picker */}
        {!isLogin && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Phương thức đăng ký:
            </label>
            <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setRegMethod("username");
                  setError("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  regMethod === "username"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Tên đăng nhập (Username)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegMethod("email");
                  setError("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  regMethod === "email"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Địa chỉ Email</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-medium px-1">
              {regMethod === "username"
                ? "⚡ Không cần email: Tạo tài khoản và truy cập cổng phụ huynh ngay."
                : "✉️ Xác thực qua mail: Hệ thống sẽ gửi thư xác nhận kích hoạt tài khoản."}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Họ và tên Phụ huynh <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Ba"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          )}

          {isLogin ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tên đăng nhập (Username) hoặc Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: phuhuynh123 hoặc phuhuynh@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
                />
                {!email.includes("@") ? (
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                ) : (
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                )}
              </div>
            </div>
          ) : regMethod === "username" ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tên đăng nhập (Username) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="VD: phuhuynh_an"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Địa chỉ Email thật <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: phuhuynh@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Hệ thống sẽ gửi email xác minh và liên kết kích hoạt tài khoản vào hòm thư này.
              </p>
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Số điện thoại (Không bắt buộc)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0912345678"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? "Nhập mật khẩu..." : "Tối thiểu 8 ký tự..."}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
            {!isLogin && <PasswordStrengthMeter password={password} email={regMethod === "email" ? email : username} />}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nhập lại mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại chính xác mật khẩu..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold animate-in fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập Cổng Phụ Huynh</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>
                  {regMethod === "username"
                    ? "Hoàn tất đăng ký & Bắt đầu"
                    : "Hoàn tất đăng ký & Kích hoạt email"}
                </span>
              </>
            )}
          </button>
        </form>
      </div>

      <ResetPasswordModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        initialEmail={email}
      />
    </div>
  );
}
