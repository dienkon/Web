import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  User,
  AtSign,
  Mail,
  Lock,
  Loader2,
  ArrowLeft,
  GraduationCap,
  Users,
  CheckCircle2,
  XCircle,
  CheckSquare,
  Square,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PasswordStrengthMeter, { evaluatePasswordStrength } from "../../components/auth/PasswordStrengthMeter";
import GoogleLoginButton from "../../components/auth/GoogleLoginButton";
import { getFriendlyAuthErrorMessage } from "../../utils/authErrors";
import { checkUsernameAvailability } from "../../services/authService";
import { useToast } from "../../components/ui/ToastNotification";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const { registerWithEmail, registerWithUsername } = useAuth();
  const { showToast } = useToast();

  const [role, setRole] = useState<"student" | "parent">("student");
  const [regMethod, setRegMethod] = useState<"username" | "email">("username");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [phone, setPhone] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Username validation state
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameMessage, setUsernameMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debounced check username availability
  useEffect(() => {
    if (regMethod !== "username") return;
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameAvailable(null);
      setUsernameMessage("");
      setUsernameChecking(false);
      return;
    }

    if (trimmed.length < 3) {
      setUsernameAvailable(false);
      setUsernameMessage("Tên đăng nhập phải có ít nhất 3 ký tự.");
      setUsernameChecking(false);
      return;
    }

    if (/\s/.test(trimmed)) {
      setUsernameAvailable(false);
      setUsernameMessage("Tên đăng nhập không được có khoảng trắng.");
      setUsernameChecking(false);
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      setUsernameAvailable(false);
      setUsernameMessage("Chỉ dùng chữ cái, số, dấu gạch dưới (_), gạch ngang (-), chấm (.).");
      setUsernameChecking(false);
      return;
    }

    setUsernameChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(trimmed);
        setUsernameAvailable(res.available);
        setUsernameMessage(res.message || (res.available ? "Tên đăng nhập hợp lệ." : "Tên đăng nhập đã được sử dụng."));
      } catch (err: any) {
        setUsernameAvailable(null);
        setUsernameMessage("");
      } finally {
        setUsernameChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, regMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!displayName.trim()) {
      setError("Vui lòng nhập Họ và tên của bạn (bắt buộc).");
      return;
    }

    if (regMethod === "username") {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        setError("Vui lòng chọn tên đăng nhập (Username).");
        return;
      }

      if (usernameAvailable === false) {
        setError(usernameMessage || "Tên đăng nhập không khả dụng, vui lòng chọn tên khác.");
        return;
      }

      if (!password) {
        setError("Vui lòng nhập mật khẩu.");
        return;
      }
    } else {
      if (!email.trim() || !email.includes("@")) {
        setError("Vui lòng nhập địa chỉ email hợp lệ để nhận mã xác nhận.");
        return;
      }

      if (!password) {
        setError("Vui lòng nhập mật khẩu.");
        return;
      }
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp. Vui lòng kiểm tra lại.");
      return;
    }

    const strength = evaluatePasswordStrength(password, regMethod === "email" ? email : username);
    if (strength.score < 2) {
      setError("Mật khẩu quá yếu. Vui lòng đảm bảo tối thiểu 8 ký tự, gồm cả chữ và số.");
      return;
    }

    if (!agreedTerms) {
      setError("Bạn cần đồng ý với Điều khoản dịch vụ và chính sách của DkTEST.");
      return;
    }

    setLoading(true);

    try {
      if (regMethod === "username") {
        const trimmedUsername = username.trim();
        const checkRes = await checkUsernameAvailability(trimmedUsername);
        if (!checkRes.available) {
          setError(checkRes.message || "Tên đăng nhập này vừa bị tài khoản khác sử dụng.");
          setLoading(false);
          return;
        }

        const profile = await registerWithUsername({
          username: trimmedUsername,
          password,
          displayName: displayName.trim(),
          role,
          studentClass: studentClass.trim(),
          phone: phone.trim(),
        });

        showToast(`Đăng ký tài khoản thành công! Chào mừng ${profile.displayName}.`, "success");
        const dest = role === "parent" ? "/parent/dashboard" : (redirectPath && !redirectPath.startsWith("/login") && !redirectPath.startsWith("/register") ? redirectPath : "/");
        navigate(dest, { replace: true });
      } else {
        await registerWithEmail({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          role,
          studentClass: studentClass.trim(),
          phone: phone.trim(),
        });

        showToast("Đăng ký thành công! Vui lòng kiểm tra email để xác minh kích hoạt tài khoản.", "success");
        navigate(`/email-verification?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
      }
    } catch (err: any) {
      console.error("[Register] Error:", err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (profile: any) => {
    showToast(`Chào mừng ${profile.displayName || "bạn"} đã tham gia DkTEST!`, "success");
    if (profile.role === "parent") {
      navigate("/parent/dashboard", { replace: true });
    } else {
      navigate(redirectPath.startsWith("/login") || redirectPath.startsWith("/register") ? "/" : redirectPath, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 py-8">
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

          <Link
            to={`/login?redirect=${encodeURIComponent(redirectPath)}`}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Đã có tài khoản? Đăng nhập
          </Link>
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tạo tài khoản mới</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Đăng ký tham gia hệ thống khảo thí trực tuyến DkTEST
            </p>
          </div>
        </div>

        {/* Google Register Button */}
        <div>
          <GoogleLoginButton
            intendedRole={role}
            buttonText="Đăng ký nhanh với Google"
            onSuccess={handleGoogleSuccess}
            onError={setError}
          />
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-bold text-[10px] tracking-wider">
                hoặc điền form đăng ký đầy đủ
              </span>
            </div>
          </div>
        </div>

        {/* Role Selection Tabs */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Bạn là:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                role === "student"
                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-2xs font-bold"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  role === "student" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold leading-tight">Học sinh</p>
                <p className="text-[10px] text-slate-400">Làm bài thi & luyện tập</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole("parent")}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                role === "parent"
                  ? "border-indigo-500 bg-indigo-50/70 text-indigo-900 shadow-2xs font-bold"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  role === "parent" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                <Users className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold leading-tight">Phụ huynh</p>
                <p className="text-[10px] text-slate-400">Theo dõi kết quả con</p>
              </div>
            </button>
          </div>
        </div>

        {/* Method Picker: 1 trong 2 (Username hoặc Email) */}
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
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                regMethod === "username"
                  ? "bg-white text-blue-600 shadow-xs"
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
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                regMethod === "email"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Địa chỉ Email</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 font-medium px-1">
            {regMethod === "username"
              ? "⚡ Không cần email: Tạo tài khoản và vào làm bài ngay lập tức."
              : "✉️ Xác thực qua mail: Hệ thống sẽ gửi thư xác nhận kích hoạt tài khoản."}
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={role === "student" ? "VD: Nguyễn Văn An" : "VD: Phụ huynh em An"}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Option 1: Username with Real-time Check */}
          {regMethod === "username" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tên đăng nhập (Username) <span className="text-red-500">*</span>
                </label>
                {usernameChecking && (
                  <span className="text-[10px] text-blue-600 font-medium inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang kiểm tra...
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="VD: nguyenvanan2026"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 transition-all text-slate-800 ${
                    usernameAvailable === true
                      ? "border-emerald-400 focus:ring-emerald-500 bg-emerald-50/30"
                      : usernameAvailable === false
                      ? "border-red-400 focus:ring-red-500 bg-red-50/30"
                      : "border-slate-200 focus:ring-blue-500 focus:bg-white"
                  }`}
                />
                <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                {usernameAvailable === true && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-3" />
                )}
                {usernameAvailable === false && (
                  <XCircle className="w-4 h-4 text-red-500 absolute right-3 top-3" />
                )}
              </div>
              {usernameMessage && (
                <p
                  className={`text-[10px] mt-1 font-medium ${
                    usernameAvailable ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {usernameMessage}
                </p>
              )}
            </div>
          )}

          {/* Option 2: Email */}
          {regMethod === "email" && (
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
                  placeholder="VD: hocsinh@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Hệ thống sẽ gửi email xác minh và liên kết kích hoạt tài khoản vào hòm thư này.
              </p>
            </div>
          )}

          {/* Optional Class for student, Phone for parent */}
          {role === "student" ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Lớp / Trường (Không bắt buộc)
              </label>
              <input
                type="text"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                placeholder="VD: 12A1 - THPT Chuyên"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Số điện thoại liên hệ (Không bắt buộc)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0912345678"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
            <PasswordStrengthMeter password={password} email={email} />
          </div>

          {/* Confirm Password */}
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
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Terms checkbox */}
          <div
            onClick={() => setAgreedTerms(!agreedTerms)}
            className="flex items-start gap-2.5 pt-1 cursor-pointer select-none"
          >
            <div className="mt-0.5 text-blue-600">
              {agreedTerms ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Tôi đồng ý với{" "}
              <Link to="/legal-policy" target="_blank" className="text-blue-600 underline font-semibold">
                Điều khoản dịch vụ
              </Link>{" "}
              và cam kết sử dụng hệ thống đúng quy chế học tập.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold animate-in fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 text-white rounded-xl font-bold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
              role === "parent"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>
                {regMethod === "username"
                  ? "Hoàn tất đăng ký & Bắt đầu"
                  : "Hoàn tất đăng ký & Kích hoạt email"}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
