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
  FileText,
  X,
} from "lucide-react";
import { collection, query, where, limit as fsLimit, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase/config";
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

  // Quick Exam History Preview state
  const [previewStudent, setPreviewStudent] = useState<UserProfile | null>(null);
  const [previewSubs, setPreviewSubs] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const openExamPreview = async (stu: UserProfile) => {
    setPreviewStudent(stu);
    setPreviewSubs([]);
    setPreviewLoading(true);
    try {
      const candidateNames = Array.from(
        new Set([stu.uid, stu.username, stu.displayName, stu.email].filter(Boolean))
      );
      const subMap = new Map<string, any>();
      for (const name of candidateNames) {
        try {
          const q1 = query(collection(db, "submissions"), where("studentUsername", "==", name), fsLimit(10));
          const s1 = await getDocs(q1);
          s1.docs.forEach((d) => subMap.set(d.id, { id: d.id, ...d.data() }));
        } catch (_) {}

        try {
          const q2 = query(collection(db, "submissions"), where("studentId", "==", name), fsLimit(10));
          const s2 = await getDocs(q2);
          s2.docs.forEach((d) => subMap.set(d.id, { id: d.id, ...d.data() }));
        } catch (_) {}
      }
      const list = Array.from(subMap.values());
      list.sort((a, b) => {
        const timeA = new Date(a.submittedAt?.toDate?.() || a.submittedAt || 0).getTime();
        const timeB = new Date(b.submittedAt?.toDate?.() || b.submittedAt || 0).getTime();
        return timeB - timeA;
      });
      setPreviewSubs(list);
    } catch (e) {
      console.warn("Lỗi tải nhanh bài thi:", e);
    } finally {
      setPreviewLoading(false);
    }
  };

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

  const isFirstRender = React.useRef(true);

  // Debounce search and filters
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        loadData();
      }
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
              onClick={() => {
                setBulkAction("delete");
                setShowBulkModal(true);
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xoá vĩnh viễn</span>
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
                        <button
                          type="button"
                          onClick={() => openExamPreview(student)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Xem nhanh các bài thi gần nhất"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
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
              ? "Xác nhận xoá vĩnh viễn tài khoản"
              : actionTarget.type === "suspend"
              ? "Xác nhận tạm khoá tài khoản"
              : "Xác nhận phê duyệt tài khoản"
          }
          message={
            actionTarget.type === "delete"
              ? `Bạn có chắc chắn muốn xoá vĩnh viễn học sinh "${
                  actionTarget.user.displayName || actionTarget.user.email
                }" khỏi cơ sở dữ liệu cùng toàn bộ kết quả thi và liên kết? Hành động này không thể hoàn tác.`
              : `Bạn có chắc muốn thực hiện thao tác này cho học sinh "${
                  actionTarget.user.displayName || actionTarget.user.email
                }"?`
          }
          confirmText={actionTarget.type === "delete" ? "Xoá vĩnh viễn" : "Xác nhận"}
          confirmVariant={actionTarget.type === "delete" ? "danger" : "primary"}
          onConfirm={handleSingleAction}
          onCancel={() => setActionTarget(null)}
        />
      )}

      {/* Bulk Action Confirm Modal */}
      {showBulkModal && (
        <ConfirmModal
          isOpen={true}
          title={bulkAction === "delete" ? "Xác nhận xoá vĩnh viễn hàng loạt" : "Xác nhận thao tác hàng loạt"}
          message={
            bulkAction === "delete"
              ? `Bạn có chắc chắn muốn xoá vĩnh viễn ${selectedUids.length} tài khoản học sinh đã chọn cùng toàn bộ dữ liệu liên quan khỏi cơ sở dữ liệu? Hành động này không thể hoàn tác.`
              : `Bạn có chắc muốn thực hiện thao tác "${bulkAction}" cho ${selectedUids.length} học sinh đã chọn?`
          }
          confirmText={bulkAction === "delete" ? "Xoá tất cả đã chọn" : "Thực hiện ngay"}
          confirmVariant={bulkAction === "delete" ? "danger" : "primary"}
          onConfirm={executeBulkAction}
          onCancel={() => setShowBulkModal(false)}
        />
      )}

      {/* Quick Exam History Preview Modal */}
      {previewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {(previewStudent.displayName || previewStudent.email || "H").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Bài thi gần nhất: {previewStudent.displayName || "Học sinh"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {previewStudent.email || previewStudent.username || previewStudent.uid} • Lớp: {previewStudent.studentClass || "—"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {previewLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-xs">Đang tải lịch sử thi...</p>
                </div>
              ) : previewSubs.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Học sinh chưa làm bài thi nào</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Học sinh chưa hoàn thành bất kỳ bài thi nào trên hệ thống.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                        <th className="pb-2.5">Tên đề thi</th>
                        <th className="pb-2.5">Điểm số</th>
                        <th className="pb-2.5">Đúng / Tổng</th>
                        <th className="pb-2.5">Thời gian</th>
                        <th className="pb-2.5">Ngày nộp</th>
                        <th className="pb-2.5 text-right">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewSubs.map((sub: any) => {
                        const score = typeof sub.score === "number" ? sub.score : 0;
                        const maxScore = sub.maxScore || 10;
                        const ratio = maxScore > 0 ? score / maxScore : 0;
                        const badgeColor =
                          ratio >= 0.8
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ratio >= 0.5
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-rose-50 text-rose-700 border-rose-200";

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 font-bold text-slate-900 max-w-[200px] truncate">
                              {sub.examTitleSnapshot || sub.examTitle || sub.examId}
                            </td>
                            <td className="py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border font-black text-xs ${badgeColor}`}>
                                {score} <span className="font-normal text-[10px] ml-1 opacity-70">/ {maxScore}</span>
                              </span>
                            </td>
                            <td className="py-3 text-slate-600 font-medium">
                              {sub.correctCount ?? "—"} / {sub.totalCount ?? "—"}
                            </td>
                            <td className="py-3 text-slate-600 font-medium">
                              {sub.timeSpent ? `${Math.round(sub.timeSpent / 60)} phút` : "—"}
                            </td>
                            <td className="py-3 text-slate-500 font-mono text-[11px]">
                              {sub.submittedAt ? formatDate(sub.submittedAt) : "—"}
                            </td>
                            <td className="py-3 text-right">
                              <Link
                                to={`/admin/exams/${sub.examId}/submissions/${sub.id}`}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition-colors inline-block"
                              >
                                Xem bài
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <Link
                to={`/admin/users/${previewStudent.uid}`}
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                <span>Mở toàn bộ hồ sơ học sinh</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setPreviewStudent(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
