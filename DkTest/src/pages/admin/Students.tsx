import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  MoreVertical,
  Download,
  Trash2,
  UserCheck,
  UserX,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  GraduationCap,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  fetchAdminUsers,
  approveUserAccount,
  suspendUserAccount,
  reactivateUserAccount,
  deleteUserAccount,
  bulkUserOperation,
} from "../../services/adminService";
import type { UserProfile } from "../../types";
import { formatDate } from "../../utils/date";
import { useToast } from "../../components/ui/ToastNotification";
import ConfirmModal from "../../components/ui/ConfirmModal";

export default function Students() {
  const navigate = useNavigate();
  const { showToast, error: showErrorToast, success: showSuccessToast } = useToast();

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  // Search & Filter & Sort state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection & Bulk state
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Single action modal
  const [actionTarget, setActionTarget] = useState<{ user: UserProfile; type: "suspend" | "delete" | "approve" } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAdminUsers({
        page,
        limit,
        search,
        role: "student",
        status: statusFilter,
        provider: providerFilter,
        verified: verifiedFilter,
        class: classFilter,
        sort: sortField,
        order: sortOrder,
      });

      setStudents(data.items || []);
      setTotalCount(data.pagination?.totalCount || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error("[Students] Error loading students:", err);
      const msg = err.message || "Không thể tải danh sách học sinh.";
      setLoadError(msg);
      showErrorToast(msg);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, statusFilter, providerFilter, verifiedFilter, classFilter, sortField, sortOrder, limit]);

  useEffect(() => {
    loadData();
  }, [page]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUids(students.map((s) => s.uid));
    } else {
      setSelectedUids([]);
    }
  };

  const handleToggleSelect = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const executeBulkAction = async () => {
    if (!bulkAction || selectedUids.length === 0) return;
    setIsBulkProcessing(true);
    try {
      await bulkUserOperation(bulkAction, selectedUids);
      showSuccessToast(`Đã áp dụng thao tác thành công cho ${selectedUids.length} học sinh!`);
      setSelectedUids([]);
      setShowBulkModal(false);
      loadData();
    } catch (err: any) {
      showErrorToast(err.message || "Lỗi khi thực hiện thao tác hàng loạt.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleSingleAction = async () => {
    if (!actionTarget) return;
    const { user, type } = actionTarget;
    try {
      if (type === "approve") {
        await approveUserAccount(user.uid);
        showSuccessToast(`Đã duyệt tài khoản của ${user.displayName || user.email}!`);
      } else if (type === "suspend") {
        await suspendUserAccount(user.uid, "Quản trị viên tạm khoá");
        showSuccessToast(`Đã tạm khoá tài khoản của ${user.displayName || user.email}!`);
      } else if (type === "delete") {
        await deleteUserAccount(user.uid);
        showSuccessToast(`Đã xoá tài khoản của ${user.displayName || user.email}!`);
      }
      setActionTarget(null);
      loadData();
    } catch (err: any) {
      showErrorToast(err.message || "Không thể thực hiện thao tác.");
    }
  };

  const exportCsv = () => {
    const headers = ["UID", "Họ và tên", "Email", "Lớp", "Trạng thái", "Phương thức", "Ngày tham gia"];
    const rows = students.map((s) => [
      `"${s.uid}"`,
      `"${s.displayName || ""}"`,
      `"${s.email || ""}"`,
      `"${s.studentClass || ""}"`,
      `"${s.accountStatus || "active"}"`,
      `"${s.provider || "password"}"`,
      `"${s.createdAt ? formatDate(s.createdAt) : ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `danh_sach_hoc_sinh_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Đang hoạt động
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Chờ duyệt
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <ShieldAlert className="w-3 h-3" /> Tạm khoá
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-blue-600" />
            <span>Quản Lý Học Sinh</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Tổng số: <strong className="text-slate-800">{totalCount}</strong> tài khoản học sinh trong hệ thống
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportCsv}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, lớp, UID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="pending">Chờ phê duyệt</option>
              <option value="suspended">Tạm khoá</option>
            </select>
          </div>

          {/* Provider Filter */}
          <div>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="">Tất cả phương thức</option>
              <option value="google">Đăng nhập Google</option>
              <option value="password">Email / Mật khẩu</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={`${sortField}_${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split("_");
                setSortField(f);
                setSortOrder(o as any);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="createdAt_desc">Mới tham gia nhất</option>
              <option value="createdAt_asc">Cũ nhất trước</option>
              <option value="displayName_asc">Tên A → Z</option>
              <option value="displayName_desc">Tên Z → A</option>
              <option value="lastLoginAt_desc">Đăng nhập gần nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating Bulk Operations Bar */}
      {selectedUids.length > 0 && (
        <div className="bg-slate-900 text-white p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 text-xs font-bold pl-2">
            <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[11px]">
              {selectedUids.length}
            </span>
            <span>học sinh được chọn</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkAction("approve");
                setShowBulkModal(true);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Duyệt</span>
            </button>
            <button
              onClick={() => {
                setBulkAction("suspend");
                setShowBulkModal(true);
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Tạm khoá</span>
            </button>
            <button
              onClick={() => setSelectedUids([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Students Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && selectedUids.length === students.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="p-3.5">Học sinh</th>
                <th className="p-3.5">Lớp</th>
                <th className="p-3.5">Trạng thái</th>
                <th className="p-3.5">Phương thức</th>
                <th className="p-3.5">Email xác minh</th>
                <th className="p-3.5">Ngày tham gia</th>
                <th className="p-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadError ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5 text-red-600">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                      <p className="font-bold text-sm text-slate-800">Lỗi khi tải danh sách học sinh</p>
                      <p className="text-xs text-red-600 max-w-md">{loadError}</p>
                      <button
                        onClick={() => loadData()}
                        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Thử lại</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Đang tải danh sách học sinh...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Không tìm thấy học sinh nào phù hợp bộ lọc
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr
                    key={student.uid}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      selectedUids.includes(student.uid) ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUids.includes(student.uid)}
                        onChange={() => handleToggleSelect(student.uid)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        {student.photoURL ? (
                          <img
                            src={student.photoURL}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {(student.displayName || student.email || "H").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <Link
                            to={`/admin/users/${student.uid}`}
                            className="font-bold text-slate-900 hover:text-blue-600 flex items-center gap-1 group"
                          >
                            <span>{student.displayName || "Học sinh"}</span>
                            <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {student.email || student.uid}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-700">
                        {student.studentClass || "—"}
                      </span>
                    </td>
                    <td className="p-3.5">{getStatusBadge(student.accountStatus || "active")}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 capitalize">
                        {student.provider === "google" ? "Google" : "Email/Mật khẩu"}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {student.emailVerified ? (
                        <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã xác minh
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Chưa xác minh</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500 font-medium">
                      {student.createdAt ? formatDate(student.createdAt) : "—"}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/users/${student.uid}`}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Xem hồ sơ chi tiết"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        {student.accountStatus === "pending" && (
                          <button
                            onClick={() => setActionTarget({ user: student, type: "approve" })}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Phê duyệt tài khoản"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {student.accountStatus === "active" ? (
                          <button
                            onClick={() => setActionTarget({ user: student, type: "suspend" })}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Tạm khoá"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setActionTarget({ user: student, type: "approve" })}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Kích hoạt lại"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setActionTarget({ user: student, type: "delete" })}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Xoá tài khoản"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Hiển thị trang <strong>{page}</strong> / <strong>{totalPages || 1}</strong> ({totalCount} kết quả)
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-slate-800">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Single Action Confirm Modal */}
      {actionTarget && (
        <ConfirmModal
          isOpen={true}
          title={
            actionTarget.type === "delete"
              ? "Xác nhận xoá tài khoản"
              : actionTarget.type === "suspend"
              ? "Xác nhận tạm khoá tài khoản"
              : "Xác nhận phê duyệt tài khoản"
          }
          message={`Bạn có chắc muốn thực hiện thao tác này cho học sinh "${
            actionTarget.user.displayName || actionTarget.user.email
          }"?`}
          confirmText={actionTarget.type === "delete" ? "Xoá tài khoản" : "Xác nhận"}
          confirmVariant={actionTarget.type === "delete" ? "danger" : "primary"}
          onConfirm={handleSingleAction}
          onCancel={() => setActionTarget(null)}
        />
      )}

      {/* Bulk Action Confirm Modal */}
      {showBulkModal && (
        <ConfirmModal
          isOpen={true}
          title="Xác nhận thao tác hàng loạt"
          message={`Bạn có chắc muốn thực hiện thao tác "${bulkAction}" cho ${selectedUids.length} học sinh đã chọn?`}
          confirmText="Thực hiện ngay"
          confirmVariant={bulkAction === "delete" ? "danger" : "primary"}
          onConfirm={executeBulkAction}
          onCancel={() => setShowBulkModal(false)}
        />
      )}
    </div>
  );
}
