import React from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  isAdminAuthenticated,
  isParentAuthenticated,
  isStudentAuthenticated,
} from "../../services/authService";
import { Loader2, ShieldAlert, Clock, LogOut } from "lucide-react";

interface RequireAuthProps {
  role: "admin" | "parent" | "student";
  children: React.ReactNode;
}

export default function RequireAuth({ role, children }: RequireAuthProps) {
  const location = useLocation();
  const { user, userProfile, role: currentRole, loading, isPendingApproval, isSuspended, logout } = useAuth();

  // If Firebase Auth is still loading, show a neat spinner rather than flashing redirects
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Đang xác thực thông tin...</p>
      </div>
    );
  }

  // Account suspended state
  if (isSuspended) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-red-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Tài khoản tạm khoá</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Tài khoản của bạn đã bị tạm khoá hoặc vô hiệu hoá bởi quản trị viên. Vui lòng liên hệ nhà trường hoặc người quản trị để được hỗ trợ.
          </p>
          <button
            onClick={() => logout()}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    );
  }

  // Account pending approval state (if enabled)
  if (isPendingApproval && role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Đang chờ phê duyệt</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Tài khoản của bạn đã được đăng ký thành công và đang chờ Quản trị viên duyệt để kích hoạt đầy đủ quyền làm bài.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => logout()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Đăng xuất
            </button>
            <Link
              to="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check email verification: Only real email accounts using password provider must verify
  const isPasswordProvider = user?.providerData?.some((p) => p.providerId === "password");
  const isUsernameAccount =
    Boolean(user?.email?.endsWith("@dktest.local")) ||
    userProfile?.authProvider === "username";
  const needsEmailVerification = user && isPasswordProvider && !isUsernameAccount && !user.emailVerified;

  if (needsEmailVerification) {
    if (!location.pathname.startsWith("/email-verification")) {
      return (
        <Navigate
          to={`/email-verification?redirect=${encodeURIComponent(location.pathname + location.search)}`}
          replace
        />
      );
    }
  }

  // Check role permissions
  const hasAdminRole = currentRole === "admin" || currentRole === "super_admin" || isAdminAuthenticated();
  const hasParentRole = currentRole === "parent" || hasAdminRole || isParentAuthenticated();
  const hasStudentRole = currentRole === "student" || hasAdminRole || isStudentAuthenticated();

  if (role === "admin") {
    if (!hasAdminRole) {
      if (location.pathname.startsWith("/admin/login")) {
        return <>{children}</>;
      }
      return (
        <Navigate
          to={`/admin/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
          replace
        />
      );
    }
  } else if (role === "parent") {
    if (!hasParentRole) {
      if (location.pathname.startsWith("/parent/login")) {
        return <>{children}</>;
      }
      return (
        <Navigate
          to={`/parent/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
          replace
        />
      );
    }
  } else if (role === "student") {
    if (!hasStudentRole) {
      if (location.pathname.startsWith("/student/login") || location.pathname.startsWith("/login")) {
        return <>{children}</>;
      }
      return (
        <Navigate
          to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
          replace
        />
      );
    }
  }

  return <>{children}</>;
}
