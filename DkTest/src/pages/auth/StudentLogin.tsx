import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  User,
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
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import {
  getLinkedChildrenForParent,
  autoLinkChildToParent,
  type LinkedChildInfo,
} from "../../services/parentService";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const modeParam = searchParams.get("mode");
  const forceSwitch = searchParams.get("switch") === "true";

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  // Default to Register mode when first entering, unless mode=login is requested
  const [isLogin, setIsLogin] = useState(modeParam === "login");

  useEffect(() => {
    if (modeParam === "login") {
      setIsLogin(true);
    } else if (modeParam === "register") {
      setIsLogin(false);
    }
  }, [modeParam]);

  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    const adminToken = localStorage.getItem("admin_token");
    setIsAdmin(role === "admin" || !!adminToken);

    // Read saved student info from this device
    const savedStr = localStorage.getItem("student_info");
    if (savedStr) {
      try {
        const parsed = JSON.parse(savedStr);
        if (parsed.username) {
          setSavedStudent(parsed);
        }
      } catch (e) {}
    }

    const parentInfoStr = localStorage.getItem("parent_info");

    // Check if parent account exists on device
    if (parentInfoStr) {
      try {
        const pObj = JSON.parse(parentInfoStr);
        setParentData(pObj);
        if (pObj.username) {
          setLoadingChildren(true);
          getLinkedChildrenForParent(pObj.username)
            .then((children) => {
              setLinkedChildren(children || []);
            })
            .catch(() => {})
            .finally(() => setLoadingChildren(false));
        }
      } catch (e) {}
    }

    // Only redirect if ALREADY logged in as student AND not explicitly asking to switch
    if (role === "student" && !forceSwitch) {
      if (redirectPath !== "/student/login" && redirectPath !== "/login") {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [navigate, redirectPath, forceSwitch]);

  const handleQuickLoginAsChild = async (child: LinkedChildInfo) => {
    localStorage.setItem("auth_role", "student");
    localStorage.setItem(
      "student_info",
      JSON.stringify({
        username: child.username,
        displayName: child.displayName || child.username,
        studentClass: child.studentClass || "",
        avatarUrl: child.avatarUrl || "",
      })
    );

    if (parentData?.username && child.username.toLowerCase() !== parentData.username.toLowerCase()) {
      try {
        await autoLinkChildToParent(
          parentData.username,
          parentData.displayName || parentData.username,
          child.username
        );
      } catch (e) {}
    }

    navigate(redirectPath, { replace: true });
  };

  const handleQuickLoginAsSavedStudent = async () => {
    if (!savedStudent) return;
    localStorage.setItem("auth_role", "student");
    localStorage.setItem("student_info", JSON.stringify(savedStudent));

    if (parentData?.username && savedStudent.username.toLowerCase() !== parentData.username.toLowerCase()) {
      try {
        await autoLinkChildToParent(
          parentData.username,
          parentData.displayName || parentData.username,
          savedStudent.username
        );
      } catch (e) {}
    }

    navigate(redirectPath, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || (!isLogin && !displayName.trim())) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userRef = doc(db, "users", cleanUsername);
      const userSnap = await getDoc(userRef);

      if (isLogin) {
        if (!userSnap.exists()) {
          throw new Error(
            "Tài khoản không tồn tại. Nếu bạn là học sinh mới, vui lòng bấm tab 'Đăng ký tài khoản'."
          );
        }
        const userData = userSnap.data();

        // Log in success
        localStorage.setItem("auth_role", "student");
        localStorage.setItem(
          "student_info",
          JSON.stringify({
            username: cleanUsername,
            displayName: userData.displayName || cleanUsername,
            studentClass: userData.studentClass || "",
            avatarUrl: userData.avatarUrl || "",
          })
        );

        // Auto-link to parent if parent is logged in on this browser
        if (parentData?.username && cleanUsername !== parentData.username.toLowerCase()) {
          try {
            await autoLinkChildToParent(
              parentData.username,
              parentData.displayName || parentData.username,
              cleanUsername
            );
          } catch (e) {}
        }

        navigate(redirectPath, { replace: true });
      } else {
        if (userSnap.exists()) {
          throw new Error(
            "Username này đã được sử dụng. Vui lòng chọn tên đăng nhập khác hoặc chuyển sang tab 'Đăng nhập'."
          );
        }

        // Register success
        const newUserData = {
          username: cleanUsername,
          displayName: displayName.trim(),
          studentClass: studentClass.trim(),
          role: "student",
          createdAt: new Date().toISOString(),
        };

        await setDoc(userRef, newUserData);

        localStorage.setItem("auth_role", "student");
        localStorage.setItem(
          "student_info",
          JSON.stringify({
            username: cleanUsername,
            displayName: displayName.trim(),
            studentClass: studentClass.trim(),
          })
        );

        // Auto-link to parent if parent is logged in on this browser
        if (parentData?.username && cleanUsername !== parentData.username.toLowerCase()) {
          try {
            await autoLinkChildToParent(
              parentData.username,
              parentData.displayName || parentData.username,
              cleanUsername
            );
          } catch (e) {}
        }

        navigate(redirectPath, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "Lỗi xử lý tài khoản");
    } finally {
      setLoading(false);
    }
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

          {/* Role Nav pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <span className="px-2.5 py-1 bg-white text-emerald-700 rounded-lg shadow-2xs">
              Học sinh
            </span>
            <Link
              to="/parent/login"
              className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors"
            >
              Phụ huynh
            </Link>
            {isAdmin && (
              <Link
                to="/admin/login"
                className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors"
              >
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
              <div className="space-y-2 pt-1 border-t border-indigo-100">
                <p className="text-[11px] font-bold text-indigo-700">
                  Chọn con em để đăng nhập nhanh vào thi:
                </p>
                <div className="space-y-1.5">
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
              </div>
            ) : (
              <p className="text-[11px] text-indigo-600/90 leading-relaxed">
                Bạn có thể đăng nhập hoặc đăng ký tài khoản Học sinh bên dưới để làm bài thi.
              </p>
            )}
          </div>
        )}

        {/* Saved local student account quick card */}
        {savedStudent && (
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900">
                <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">
                  Tài khoản học sinh đã lưu trên máy này:
                </span>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                Đã lưu phiên
              </span>
            </div>

            <button
              type="button"
              onClick={handleQuickLoginAsSavedStudent}
              className="w-full flex items-center justify-between p-3 bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-400 rounded-xl text-left transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {(savedStudent.displayName || savedStudent.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                    {savedStudent.displayName || savedStudent.username}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    @{savedStudent.username} {savedStudent.studentClass ? `• ${savedStudent.studentClass}` : ""}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                Tiếp tục vào thi <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>
        )}

        {/* Title Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs border border-emerald-100">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Cổng Khảo Thí Học Sinh
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {isLogin
              ? "Đăng nhập tài khoản để vào thi và đồng bộ bảng nháp"
              : "Đăng ký nhanh tài khoản học sinh để bắt đầu làm bài"}
          </p>
        </div>

        {/* Toggle Register / Login Mode Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-black">
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              !isLogin
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Đăng ký mới</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isLogin
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên đăng nhập (Username) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              placeholder="VD: nguyenvanan12"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">Viết liền không dấu, không khoảng trắng</p>
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Họ và tên của bạn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="VD: Nguyễn Văn An"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lớp / Trường (Không bắt buộc)
                </label>
                <input
                  type="text"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  placeholder="VD: 12A1 - THPT Chuyên"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
                <span>Hoàn tất đăng ký & Bắt đầu</span>
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-xs text-slate-500 hover:text-emerald-600 font-semibold transition-colors cursor-pointer"
            >
              {isLogin
                ? "Chưa có tài khoản học sinh? Bấm vào đây để Đăng ký ngay"
                : "Đã có tài khoản từ trước? Bấm vào đây để Đăng nhập"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
