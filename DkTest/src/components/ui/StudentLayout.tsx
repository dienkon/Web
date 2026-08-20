import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut,
  ArrowLeft,
  User,
  ShieldCheck,
  History,
  BookOpen,
  Settings,
  Flame,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Play,
  HeartHandshake,
} from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import { hasActiveExamInProgress, clearActiveExamSession } from "../../services/examSessionService";

export default function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [studentInfo, setStudentInfo] = useState<{ username?: string; displayName?: string; avatarUrl?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    const adminToken = localStorage.getItem("admin_token");
    if (role === "admin" || adminToken) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }

    const infoStr = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
    if (infoStr) {
      try {
        const parsed = JSON.parse(infoStr);
        setStudentInfo(parsed);

        // Fetch fresh avatar and profile from Firestore to ensure permanent sync
        const username = parsed.username || parsed.name || parsed.displayName;
        if (username) {
          import("../../services/studentService").then(({ getStudent }) => {
            getStudent(username).then((studentDoc) => {
              if (studentDoc && studentDoc.avatarUrl) {
                const updated = {
                  ...parsed,
                  avatarUrl: studentDoc.avatarUrl,
                  displayName: studentDoc.name || parsed.displayName || parsed.name,
                };
                setStudentInfo(updated);
                localStorage.setItem("student_info", JSON.stringify(updated));
              }
            });
          });
        }
      } catch (e) {
        // ignore
      }
    } else {
      setStudentInfo(null);
    }
  }, [location.pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [location.pathname]);

  // Check for active in-progress exam session and redirect student back immediately
  useEffect(() => {
    if (!location.pathname.includes("/take") && !location.pathname.includes("/result/")) {
      const activeSession = hasActiveExamInProgress();
      if (activeSession) {
        navigate(`/student/exam/${activeSession.examId}/take`, { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  const handleConfirmLogout = () => {
    clearActiveExamSession();
    localStorage.removeItem("auth_role");
    localStorage.removeItem("student_info");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("current_student_session");
    localStorage.removeItem("student_submission_history");
    setStudentInfo(null);
    setIsAdmin(false);
    setShowLogoutModal(false);
    navigate("/", { replace: true });
  };

  const isTakingExam = location.pathname.includes("/take");
  const isExamResult = location.pathname.includes("/result/");
  const isParentViewing = isExamResult && localStorage.getItem("auth_role") === "parent";
  const hideStudentNav = isTakingExam || isExamResult;

  const navItems = [
    { to: "/", label: "Đề thi", icon: BookOpen },
    { to: "/student/ai-tutor", label: "Hỏi Gia sư AI", icon: Sparkles, iconColor: "text-indigo-500" },
    { to: "/student/community", label: "Cộng đồng", icon: Flame, iconColor: "text-amber-500" },
    { to: "/student/history", label: "Lịch sử bài làm", icon: History },
    { to: "/student/profile", label: "Hồ sơ & Avatar", icon: User },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 flex flex-col">
      {!hideStudentNav && (
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 shadow-2xs shrink-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Hamburger Drawer Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link
              to="/"
              className="flex items-center gap-1.5 sm:gap-2 text-slate-600 hover:text-slate-900 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              title="Về trang chủ"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
            </Link>

            <Link to="/" className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black text-blue-600 tracking-tight">DkTEST</span>
              <span className="hidden xs:inline-block text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg">
                Thi Trực Tuyến
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Portal Switcher */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <Link
                to="/parent/dashboard"
                className="px-2.5 py-1 text-slate-600 hover:text-indigo-700 hover:bg-white/60 rounded-lg transition-all flex items-center gap-1.5"
                title="Cổng Phụ huynh & Soạn đề ChatGPT"
              >
                <HeartHandshake className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline">Phụ huynh</span>
              </Link>
              <Link
                to="/admin/exams"
                className="px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-white/60 rounded-lg transition-all flex items-center gap-1.5"
                title="Cổng Quản trị Viên"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden md:inline">Quản trị</span>
              </Link>
            </div>

            {isAdmin && (
              <Link
                to="/admin/exams"
                className="sm:hidden text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 p-2 rounded-xl transition-colors border border-blue-200 flex items-center justify-center"
                title="Trang quản trị"
              >
                <ShieldCheck className="w-4 h-4" />
              </Link>
            )}

            {studentInfo ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  to="/student/profile"
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-xl transition-colors cursor-pointer border border-slate-200/60"
                  title="Chỉnh sửa hồ sơ cá nhân"
                >
                  {studentInfo.avatarUrl ? (
                    <img
                      src={studentInfo.avatarUrl}
                      alt="Avatar"
                      className="w-6 h-6 rounded-full object-cover border border-slate-300 shadow-2xs"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                      {(studentInfo.displayName || "S").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold text-slate-800 max-w-[90px] sm:max-w-[120px] truncate">
                    {studentInfo.displayName || "Học sinh"}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              !isAdmin && (
                <Link
                  to="/student/login"
                  className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-xl transition-all shadow-xs"
                >
                  Đăng nhập
                </Link>
              )
            )}
          </div>
        </header>
      )}

      {/* Main Container with Isolated Layer Collapsible Sidebar on Desktop */}
      <div className="flex-1 flex overflow-hidden relative">
        {!hideStudentNav && (
          <aside
            className={`bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 transition-all duration-200 ease-in-out z-20 shadow-xs select-none ${
              isSidebarCollapsed ? "w-18 p-3" : "w-60 p-4"
            }`}
          >
            {/* Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute -right-3 top-6 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-xs z-20 cursor-pointer"
              title={isSidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>

            <div className="space-y-1.5">
              {!isSidebarCollapsed && (
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Thí sinh
                </div>
              )}

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-blue-50 text-blue-700 shadow-2xs border border-blue-100"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    } ${isSidebarCollapsed ? "justify-center px-2" : ""}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${item.iconColor || ""}`} />
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>

            {/* Bottom Profile card */}
            {studentInfo && (
              <div className="mt-auto pt-4 border-t border-slate-100">
                <Link
                  to="/student/profile"
                  className={`p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer border border-slate-200/50 ${
                    isSidebarCollapsed ? "justify-center" : ""
                  }`}
                  title="Hồ sơ cá nhân"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold overflow-hidden shrink-0 shadow-2xs">
                    {studentInfo.avatarUrl ? (
                      <img src={studentInfo.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      (studentInfo.displayName || "S").charAt(0).toUpperCase()
                    )}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="truncate flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">{studentInfo.displayName || "Thí sinh"}</div>
                      <div className="text-[10px] text-slate-400 truncate">@{studentInfo.username || "student"}</div>
                    </div>
                  )}
                </Link>
              </div>
            )}
          </aside>
        )}

        {/* Mobile Slide-Over Drawer */}
        {!hideStudentNav && isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setIsMobileDrawerOpen(false)}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 max-w-xs w-3/4 bg-white shadow-2xl z-10 p-5 flex flex-col space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-blue-600">DkTEST</span>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                    Phòng thi
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Profile Preview */}
              {studentInfo ? (
                <Link
                  to="/student/profile"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-3 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-200/70"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold overflow-hidden shrink-0 shadow-2xs">
                    {studentInfo.avatarUrl ? (
                      <img src={studentInfo.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      (studentInfo.displayName || "S").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="truncate flex-1">
                    <div className="text-sm font-bold text-slate-900 truncate">{studentInfo.displayName || "Thí sinh"}</div>
                    <div className="text-xs text-slate-500 truncate">@{studentInfo.username || "student"}</div>
                  </div>
                </Link>
              ) : (
                <Link
                  to="/student/login"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-3 bg-blue-50 rounded-2xl text-center text-xs font-bold text-blue-700 border border-blue-100"
                >
                  Đăng nhập tài khoản
                </Link>
              )}

              {/* Navigation Links */}
              <div className="space-y-1 flex-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${item.iconColor || ""}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {isAdmin && (
                  <Link
                    to="/admin/exams"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 mt-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Trang Quản Trị Viên</span>
                  </Link>
                )}
              </div>

              {studentInfo && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setShowLogoutModal(true);
                  }}
                  className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              )}
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-16 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Modern Mobile Bottom Navigation Bar */}
      {!hideStudentNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-lg z-30">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                aria-label={item.label}
                className={`p-2.5 rounded-2xl transition-all flex items-center justify-center cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-600 shadow-2xs border border-blue-100 scale-105"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive && item.iconColor ? item.iconColor : ""}`} />
              </Link>
            );
          })}
        </nav>
      )}

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản học sinh?"
        confirmText="Đăng xuất"
        cancelText="Ở lại"
        variant="danger"
      />
    </div>
  );
}
