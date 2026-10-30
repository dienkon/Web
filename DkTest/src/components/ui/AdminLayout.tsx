import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  GraduationCap,
  Sparkles,
  Eye,
  ShieldCheck,
  HeartHandshake,
  Activity,
  FileCode,
  Server,
  Layers,
  Compass,
  Wallet,
  Globe,
} from "lucide-react";
import clsx from "clsx";
import ConfirmModal from "./ConfirmModal";
import NotificationCenter from "./NotificationCenter";
import { subscribeToActiveSessions, type ActiveSession } from "../../services/realtimeProctoringService";
import { isAdminAuthenticated, clearAdminSession } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import AdminAIAssistant from "../admin/AdminAIAssistant";

const navItems = [
  { name: "Tổng quan", path: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Học sinh", path: "/admin/students", icon: Users },
  { name: "Ví & Công nợ", path: "/admin/wallet", icon: Wallet },
  { name: "Phụ huynh", path: "/admin/parents", icon: HeartHandshake },
  { name: "Lớp học", path: "/admin/classes", icon: Layers },
  { name: "Ngân hàng câu hỏi", path: "/admin/question-bank", icon: Sparkles },
  { name: "Xưởng Chiến Dịch", path: "/admin/journey-studio", icon: Compass },
  { name: "Bài thi", path: "/admin/exams", icon: FileText },
  { name: "Web Importer", path: "/admin/exams/web-importer", icon: Globe },
  { name: "Giám sát Live", path: "/admin/live-proctoring", icon: Eye, hasLiveBadge: true },
  { name: "Bài nộp", path: "/admin/submissions", icon: GraduationCap },
  { name: "Thống kê", path: "/admin/stats", icon: BarChart3 },
  { name: "Kiểm tra dữ liệu", path: "/admin/data-health", icon: Activity },
  { name: "Nhật ký hệ thống", path: "/admin/audit-logs", icon: FileCode },
  { name: "System Health", path: "/admin/system-health", icon: Server },
  { name: "Cài đặt & Giao diện", path: "/admin/settings", icon: Settings },
  { name: "Bản quyền & Pháp lý", path: "/admin/legal-policy", icon: ShieldCheck },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, role, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("admin_sidebar_collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeLiveCount, setActiveLiveCount] = useState(0);

  // Subscribe to live sessions for navigation badge
  useEffect(() => {
    const unsub = subscribeToActiveSessions((list) => {
      const active = list.filter((s) => s.status === "taking" || s.status === "warning");
      setActiveLiveCount(active.length);
    });
    return () => unsub();
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin_sidebar_collapsed", String(next));
      return next;
    });
  };

  const confirmLogout = async () => {
    clearAdminSession();
    await logout();
    setShowLogoutModal(false);
    navigate("/admin/login", { replace: true });
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const currentNav = navItems.find((i) => location.pathname.startsWith(i.path));

  return (
    <div className="flex min-h-dvh h-dvh w-full max-w-[100vw] bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 transition-all duration-300 z-50",
          "fixed lg:static inset-y-0 left-0",
          mobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-3 overflow-hidden group">
            <img
              src="/logo.png"
              alt="DkTEST Logo"
              className="w-9 h-9 rounded-xl object-contain drop-shadow-xs shrink-0 transition-transform duration-200 group-hover:scale-105"
            />
            {!collapsed && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  DkTEST
                  <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded tracking-wide">
                    ADMIN
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Hệ thống khảo thí</p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden lg:flex items-center justify-center cursor-pointer"
            title={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all relative group cursor-pointer",
                  isActive
                    ? "bg-blue-600 text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={clsx("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />

                {!collapsed && <span className="truncate">{item.name}</span>}

                {/* Live Badge for Proctoring */}
                {item.hasLiveBadge && activeLiveCount > 0 && (
                  <span
                    className={clsx(
                      "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      isActive
                        ? "bg-white text-blue-700"
                        : "bg-red-500 text-white animate-pulse"
                    )}
                  >
                    {activeLiveCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {(userProfile?.displayName || user?.email || "A").charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">
                    {userProfile?.displayName || "Quản trị viên"}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {user?.email || "admin"}
                  </p>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="p-1.5 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top App Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between shrink-0 z-10 shadow-2xs transition-colors duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">Quản trị DkTEST</span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-xs sm:text-sm">
                {currentNav?.name || "Hệ thống"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin AI Assistant Quick Trigger */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("admin-open-ai-assistant"))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Mở Trợ lý Quản trị Admin AI (gemini-3.5-flash-lite) - Ctrl + /"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
              <span className="hidden md:inline">Trợ lý AI</span>
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-md font-mono font-medium">3.5</span>
            </button>

            {/* Notification Center */}
            <NotificationCenter />

            {/* Dark Mode Switcher with Intensity Options */}
            <ThemeToggle variant="dropdown" />

            {/* Quick Role Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/60 p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400">
              <span className="px-2.5 py-1 bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 rounded-lg shadow-2xs flex items-center gap-1">
                <span>👨‍🏫 Giáo viên</span>
              </span>
              <Link
                to="/parent/dashboard"
                className="px-2.5 py-1 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg transition-colors flex items-center gap-1"
                title="Chuyển sang Cổng Phụ huynh"
              >
                <span>👨‍👩‍👧 Phụ huynh</span>
              </Link>
              <Link
                to="/"
                className="px-2.5 py-1 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg transition-colors hidden sm:flex items-center gap-1"
                title="Về Cổng Thí sinh / Trang chủ"
              >
                <span>🎓 Học sinh</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Scrollable View Container */}
        {location.pathname.includes("/admin/exams/new") || location.pathname.includes("/edit") ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/50 dark:bg-slate-950/60">
            <Outlet />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/60 p-4 lg:p-8">
            <Outlet />
          </div>
        )}
      </main>

      {/* Logout Confirmation Dialog */}
      {showLogoutModal && (
        <ConfirmModal
          isOpen={true}
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
          title="Đăng xuất tài khoản"
          message="Bạn có chắc chắn muốn đăng xuất tài khoản Quản trị viên khỏi phiên làm việc này?"
          confirmText="Đăng xuất"
          confirmVariant="danger"
        />
      )}

      {/* Admin AI Virtual Assistant (Gemini 3.5 Flash Lite) */}
      <AdminAIAssistant />
    </div>
  );
}
