import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Loader2,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
  LogIn,
  HeartHandshake,
  ArrowRight,
  Users,
} from "lucide-react";
import { auth, db } from "../../services/firebase/config";
import { useAuth } from "../../context/AuthContext";
import GoogleLoginButton from "../../components/auth/GoogleLoginButton";
import PasswordStrengthMeter, { evaluatePasswordStrength } from "../../components/auth/PasswordStrengthMeter";
import ResetPasswordModal from "../../components/auth/ResetPasswordModal";
import { getFriendlyAuthErrorMessage } from "../../utils/authErrors";
import {
  getLinkedChildrenForParent,
  autoLinkChildToParent,
  type LinkedChildInfo,
} from "../../services/parentService";
import {
  isAdminAuthenticated,
  isStudentAuthenticated,
} from "../../services/authService";
import { STORAGE_KEYS, setStoredItem } from "../../utils/storage";
import { useToast } from "../../components/ui/ToastNotification";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const modeParam = searchParams.get("mode");
  const forceSwitch = searchParams.get("switch") === "true";

  const { loginWithEmail, loginWithUsername, registerWithEmail, registerWithUsername, userProfile, role } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [regMethod, setRegMethod] = useState<"username" | "email">("username");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);

  const [parentData, setParentData] = useState<{ username: string; displayName: string } | null>(null);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChildInfo[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [savedStudent, setSavedStudent] = useState<{
    username: string;
    displayName?: string;
    studentClass?: string;
    avatarUrl?: string;
  } | null>(null);

  // Default to Login mode
  const [isLogin, setIsLogin] = useState(modeParam !== "register");

  useEffect(() => {
    if (modeParam === "login") setIsLogin(true);
    else if (modeParam === "register") setIsLogin(false);
  }, [modeParam]);

  useEffect(() => {
    setIsAdmin(isAdminAuthenticated() || role === "admin" || role === "super_admin");

    // Read saved student info from this device
    const savedStr = localStorage.getItem("student_info") || localStorage.getItem(STORAGE_KEYS.STUDENT_INFO);
    if (savedStr) {
      try {
        const parsed = JSON.parse(savedStr);
        if (parsed.username || parsed.email) {
          setSavedStudent(parsed);
        }
      } catch (e) {}
    }

    const parentInfoStr = localStorage.getItem("parent_info") || localStorage.getItem(STORAGE_KEYS.PARENT_INFO);
    if (parentInfoStr) {
      try {
        const pObj = JSON.parse(parentInfoStr);
        setParentData(pObj);
        if (pObj.username) {
          setLoadingChildren(true);
          getLinkedChildrenForParent(pObj.username)
            .then((children) => setLinkedChildren(children || []))
            .catch(() => {})
            .finally(() => setLoadingChildren(false));
        }
      } catch (e) {}
    }

    if ((isStudentAuthenticated() || role === "student") && !forceSwitch) {
      if (
        redirectPath &&
        redirectPath !== "/" &&
        !redirectPath.startsWith("/student/login") &&
        !redirectPath.startsWith("/login") &&
        !redirectPath.startsWith("/admin")
      ) {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [navigate, redirectPath, forceSwitch, role]);

  const handleQuickLoginAsChild = async (child: LinkedChildInfo) => {
    const studentInfo = {
      username: child.username,
      displayName: child.displayName || child.username,
      studentClass: child.studentClass || "",
      avatarUrl: child.avatarUrl || "",
    };
    localStorage.setItem("auth_role", "student");
    localStorage.setItem("student_info", JSON.stringify(studentInfo));
    setStoredItem(STORAGE_KEYS.AUTH_ROLE, "student");
    setStoredItem(STORAGE_KEYS.STUDENT_INFO, studentInfo);

    if (parentData?.username && child.username.toLowerCase() !== parentData.username.toLowerCase()) {
      try {
        await autoLinkChildToParent(
          parentData.username,
          parentData.displayName || parentData.username,
          child.username
        );
      } catch (e) {}
    }

    const safeRedirect = (!redirectPath || redirectPath.startsWith("/student/login") || redirectPath.startsWith("/admin"))
      ? "/"
      : redirectPath;
    navigate(safeRedirect, { replace: true });
  };

  const handleQuickLoginAsSavedStudent = async () => {
    if (!savedStudent) return;
    localStorage.setItem("auth_role", "student");
    localStorage.setItem("student_info", JSON.stringify(savedStudent));
    setStoredItem(STORAGE_KEYS.AUTH_ROLE, "student");
    setStoredItem(STORAGE_KEYS.STUDENT_INFO, savedStudent);

    const safeRedirect = (!redirectPath || redirectPath.startsWith("/student/login") || redirectPath.startsWith("/admin"))
      ? "/"
      : redirectPath;
    navigate(safeRedirect, { replace: true });
  };

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
        setError("Vui lòng nhập họ và tên của bạn (bắt buộc).");
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

      if (!password) {
        setError("Vui lòng nhập mật khẩu.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Mật khẩu nhập lại không khớp. Vui lòng kiểm tra lại.");
        return;
      }

      const strength = evaluatePasswordStrength(password, regMethod === "email" ? email : username);
      if (strength.score < 2) {
        setError("Mật khẩu quá yếu. Vui lòng đảm bảo tối thiểu 8 ký tự gồm cả chữ và số.");
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        let profile: any;
        if (email.includes("@")) {
          profile = await loginWithEmail(email.trim(), password);
        } else {
          profile = await loginWithUsername(email.trim(), password);
        }

        const safeRedirect = (!redirectPath || redirectPath.startsWith("/student/login") || redirectPath.startsWith("/admin"))
          ? "/"
          : redirectPath;

        // Check if password provider with real email and not verified
        const isPassword = auth.currentUser?.providerData?.some((p) => p.providerId === "password");
        const isRealEmail = auth.currentUser?.email && !auth.currentUser.email.endsWith("@dktest.local");
        if (isPassword && isRealEmail && !auth.currentUser?.emailVerified) {
          navigate(`/email-verification?redirect=${encodeURIComponent(safeRedirect)}`, { replace: true });
          return;
        }

        showToast(`Đăng nhập thành công! Chào ${profile.displayName || "bạn"}.`, "success");
        navigate(safeRedirect, { replace: true });
      } else {
        const safeRedirect = (!redirectPath || redirectPath.startsWith("/student/login") || redirectPath.startsWith("/admin"))
          ? "/"
          : redirectPath;

        if (regMethod === "username") {
          const profile = await registerWithUsername({
            username: username.trim(),
            password,
            displayName: displayName.trim(),
            role: "student",
            studentClass: studentClass.trim(),
          });

          showToast(`Đăng ký thành công! Chào mừng ${profile.displayName} tham gia phòng thi.`, "success");
          navigate(safeRedirect, { replace: true });
        } else {
          await registerWithEmail({
            email: email.trim(),
            password,
            displayName: displayName.trim(),
            role: "student",
            studentClass: studentClass.trim(),
          });

          showToast("Đăng ký thành công! Vui lòng kiểm tra email để xác minh kích hoạt tài khoản.", "success");
          navigate(`/email-verification?redirect=${encodeURIComponent(safeRedirect)}`, { replace: true });
        }
      }
    } catch (err: any) {
      console.error("[StudentLogin] Error:", err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (profile: any) => {
    showToast(`Chào mừng ${profile.displayName || "bạn"} đã tham gia phòng thi!`, "success");
    const safeRedirect = (!redirectPath || redirectPath.startsWith("/student/login") || redirectPath.startsWith("/admin"))
      ? "/"
      : redirectPath;
    navigate(safeRedirect, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Về trang chủ"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <span className="px-2.5 py-1 bg-white text-emerald-700 rounded-lg shadow-2xs font-bold">
              Học sinh
            </span>
            <Link to="/parent/login" className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors">
              Phụ huynh
            </Link>
            {isAdmin && (
              <Link to="/admin/login" className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors">
                Giáo viên
              </Link>
            )}
          </div>
        </div>

        {/* Parent session banner if parent is logged in on this browser */}
        {parentData && (
          <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-900">
                <HeartHandshake className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold">
                  Phụ huynh: {parentData.displayName || parentData.username}
                </span>
              </div>
              <Link
                to="/parent/dashboard"
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-0.5"
              >
                Cổng PH <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loadingChildren ? (
              <div className="flex items-center gap-2 text-xs text-indigo-600 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tải danh sách con em...</span>
              </div>
            ) : linkedChildren.length > 0 ? (
              <div className="space-y-1.5 pt-1 border-t border-indigo-100">
                <p className="text-[11px] font-bold text-indigo-700">
                  Chọn con em để vào thi nhanh:
                </p>
                {linkedChildren.map((child) => (
                  <button
                    key={child.username}
                    type="button"
                    onClick={() => handleQuickLoginAsChild(child)}
                    className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-emerald-50 border border-indigo-100 hover:border-emerald-300 rounded-xl text-left transition-all shadow-2xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        {(child.displayName || child.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                          {child.displayName || child.username}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          @{child.username} {child.studentClass ? `• ${child.studentClass}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Vào thi <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Saved local student account quick card */}
        {savedStudent && (
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900">
                <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">Tài khoản lưu trên máy:</span>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                Đã lưu phiên
              </span>
            </div>

            <button
              type="button"
              onClick={handleQuickLoginAsSavedStudent}
              className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-400 rounded-xl text-left transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {(savedStudent.displayName || savedStudent.username || "H").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                    {savedStudent.displayName || savedStudent.username}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {savedStudent.studentClass || "Học sinh"}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                Vào thi <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>
        )}

        {/* Title Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="DKTEST Logo"
              className="w-14 h-14 rounded-2xl object-contain shadow-md border border-slate-100 p-1 bg-white"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cổng Học Sinh</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isLogin ? "Đăng nhập để vào phòng thi trực tuyến" : "Đăng ký tài khoản học sinh mới"}
            </p>
          </div>
        </div>

        {/* Google Sign-in */}
        <div>
          <GoogleLoginButton
            intendedRole="student"
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

        {/* Toggle Register / Login Mode Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isLogin ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
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
              !isLogin ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
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
                    ? "bg-white text-emerald-700 shadow-xs"
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
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Địa chỉ Email</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-medium px-1">
              {regMethod === "username"
                ? "⚡ Không cần email: Tạo tài khoản và vào thi ngay lập tức."
                : "✉️ Xác thực qua mail: Hệ thống sẽ gửi thư xác nhận kích hoạt tài khoản."}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Họ và tên của bạn <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="VD: Nguyễn Văn An"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
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
                  placeholder="VD: nguyenvana hoặc an.nguyen@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
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
                  placeholder="VD: nguyenvana hoặc an_12a1"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
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
                  placeholder="VD: an.nguyen@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
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
                Lớp / Khối (Không bắt buộc)
              </label>
              <input
                type="text"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                placeholder="VD: 12A1"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
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
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
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
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
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
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập vào phòng thi</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>
                  {regMethod === "username"
                    ? "Hoàn tất đăng ký & Vào thi"
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
