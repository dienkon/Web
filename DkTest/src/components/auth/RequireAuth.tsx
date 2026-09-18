import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  isAdminAuthenticated,
  isParentAuthenticated,
  isStudentAuthenticated,
} from "../../services/authService";

interface RequireAuthProps {
  role: "admin" | "parent" | "student";
  children: React.ReactNode;
}

export default function RequireAuth({ role, children }: RequireAuthProps) {
  const location = useLocation();

  if (role === "admin") {
    if (!isAdminAuthenticated()) {
      return (
        <Navigate
          to={`/admin/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
          replace
        />
      );
    }
  } else if (role === "parent") {
    if (!isParentAuthenticated()) {
      return (
        <Navigate
          to={`/parent/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
          replace
        />
      );
    }
  } else if (role === "student") {
    if (!isStudentAuthenticated()) {
      return (
        <Navigate
          to={`/student/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
          replace
        />
      );
    }
  }

  return <>{children}</>;
}
