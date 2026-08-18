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
} from "lucide-react";
import clsx from "clsx";
import ConfirmModal from "./ConfirmModal";

const navItems = [
  { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Bài thi", path: "/admin/exams", icon: FileText },
  { name: "Giám sát Live", path: "/admin/live-proctoring", icon: Eye },
  { name: "Học sinh", path: "/admin/students", icon: Users },
  { name: "Bài nộp", path: "/admin/submissions", icon: GraduationCap },
  { name: "Thống kê", path: "/admin/stats", icon: BarChart3 },
  { name: "Cài đặt", path: "/admin/settings", icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("admin_sidebar_collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    if (role !== "admin") {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate, location.pathname]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin_sidebar_collapsed", String(next));
      return next;
    });
  };

  const confirmLogout = () => {
    localStorage.removeItem("auth_role");
    localStorage.removeItem("admin_token");
    setShowLogoutModal(false);
    navigate("/", { replace: true });
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const currentNav = navItems.find((i) => location.pathname.startsWith(i.path));

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "bg-white border-r border-slate-200 flex flex-col h-full shrink-0 transition-all duration-300 z-50",
          "fixed lg:static inset-y-0 left-0",
          mobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 shrink-0">
              D
            </div>
            {!collapsed && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-1.5">
                  DkTEST
                  <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded tracking-wide">
                    ADMIN
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">Hệ thống khảo thí</p>
              </div>
            )}
          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={clsx(
                  "flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all font-medium text-sm",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon
                  className={clsx(
                    "w-5 h-5 shrink-0 transition-transform",
                    isActive ? "text-blue-600 scale-105" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer & Collapse toggle */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {/* Collapse button for desktop */}
          <button
            onClick={toggleCollapse}
            className={clsx(
              "hidden lg:flex items-center gap-2 w-full p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors text-xs font-medium",
              collapsed ? "justify-center" : "justify-between"
            )}
            title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          >
            {!collapsed && <span>Thu gọn menu</span>}
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Admin profile & logout */}
          <div
            className={clsx(
              "flex items-center p-2 bg-slate-50 border border-slate-100 rounded-xl",
              collapsed ? "justify-center cursor-pointer hover:bg-slate-100" : "justify-between"
            )}
            onClick={collapsed ? () => setShowLogoutModal(true) : undefined}
            title={collapsed ? "Nhấp để đăng xuất" : undefined}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                DK
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate text-slate-800">Quản trị viên</p>
                  <p className="text-[10px] text-slate-400 truncate">Dienkon</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between shrink-0 z-10 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">Quản trị DkTEST</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-800 uppercase tracking-tight">
                {currentNav?.name || "Hệ thống"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Trang thí sinh & Khảo thí
            </Link>
          </div>
        </header>

        {/* Scrollable View Container */}
        {location.pathname.includes("/admin/exams/new") || location.pathname.includes("/edit") ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <Outlet />
          </div>
        ) : (
          <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
          </div>
        )}
      </main>

      {/* Logout Confirmation Dialog */}
      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Đăng xuất tài khoản"
        message="Bạn có chắc chắn muốn đăng xuất tài khoản Quản trị viên khỏi phiên làm việc này?"
        confirmText="Đăng xuất"
        cancelText="Ở lại"
        variant="danger"
      />
    </div>
  );
}
