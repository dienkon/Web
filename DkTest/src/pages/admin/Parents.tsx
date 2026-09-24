import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Trash2,
  UserCheck,
  UserX,
  CheckCircle2,
} from "lucide-react";
import {
  fetchAdminUsers,
  approveUserAccount,
  suspendUserAccount,
  deleteUserAccount,
  bulkUserOperation,
} from "../../services/adminService";
import type { UserProfile } from "../../types";
import { formatDate } from "../../utils/date";
import { useToast } from "../../components/ui/ToastNotification";
import ConfirmModal from "../../components/ui/ConfirmModal";

export default function Parents() {
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const [parents, setParents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

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
        limit: 5,
        search,
        role: "parent",
        sort: "createdAt",
        order: "desc",
      });
      setParents(data.items || []);
      setTotalCount(data.pagination?.totalCount || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error("[Parents] Error loading parents:", err);
      const msg = err.message || "Không thể tải danh sách phụ huynh.";
      setLoadError(msg);
      showErrorToast(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadData();
  }, [page]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUids(parents.map((p) => p.uid));
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
      showSuccessToast(
        bulkAction === "delete"
          ? `Đã xoá vĩnh viễn ${selectedUids.length} tài khoản phụ huynh thành công!`
          : `Đã áp dụng thao tác thành công cho ${selectedUids.length} phụ huynh!`
      );
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
        showSuccessToast(`Đã duyệt tài khoản phụ huynh ${user.displayName || user.email}!`);
      } else if (type === "suspend") {
        await suspendUserAccount(user.uid, "Quản trị viên tạm khoá");
        showSuccessToast(`Đã tạm khoá tài khoản phụ huynh ${user.displayName || user.email}!`);
      } else if (type === "delete") {
        await deleteUserAccount(user.uid);
        showSuccessToast(`Đã xoá vĩnh viễn tài khoản phụ huynh ${user.displayName || user.email}!`);
      }
      setActionTarget(null);
      loadData();
    } catch (err: any) {
      showErrorToast(err.message || "Không thể thực hiện thao tác.");
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <UserX className="w-3 h-3" /> Tạm khoá
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <AlertCircle className="w-3 h-3" /> Chờ duyệt
          </span>
        );
      case "deleted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <Trash2 className="w-3 h-3" /> Đã xoá
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Đang hoạt động
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            <span>Quản Lý Phụ Huynh</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Tổng số: <strong className="text-slate-800">{totalCount}</strong> tài khoản phụ huynh trong hệ thống
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên phụ huynh, username, email, số điện thoại..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Floating Bulk Operations Bar */}
      {selectedUids.length > 0 && (
        <div className="bg-slate-900 text-white p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 text-xs font-bold pl-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[11px]">
              {selectedUids.length}
            </span>
            <span>phụ huynh được chọn</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkAction("approve");
                setShowBulkModal(true);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Duyệt</span>
            </button>
            <button
              onClick={() => {
                setBulkAction("suspend");
                setShowBulkModal(true);
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={parents.length > 0 && selectedUids.length === parents.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="p-3.5">Phụ huynh</th>
                <th className="p-3.5">Username / Email</th>
                <th className="p-3.5">Số điện thoại</th>
                <th className="p-3.5">Trạng thái</th>
                <th className="p-3.5">Ngày tham gia</th>
                <th className="p-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadError ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5 text-red-600">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                      <p className="font-bold text-sm text-slate-800">Lỗi khi tải danh sách phụ huynh</p>
                      <p className="text-xs text-red-600 max-w-md">{loadError}</p>
                      <button
                        onClick={() => loadData()}
                        className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Thử lại</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Đang tải danh sách phụ huynh...</span>
                  </td>
                </tr>
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Chưa có phụ huynh nào phù hợp tìm kiếm
                  </td>
                </tr>
              ) : (
                parents.map((parent) => (
                  <tr key={parent.uid} className={`hover:bg-slate-50 transition-colors ${selectedUids.includes(parent.uid) ? "bg-indigo-50/40" : ""}`}>
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUids.includes(parent.uid)}
                        onChange={() => handleToggleSelect(parent.uid)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {(parent.displayName || parent.username || parent.email || "P").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            to={`/admin/users/${parent.uid}`}
                            className="font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                          >
                            {parent.displayName || "Phụ huynh"}
                          </Link>
                          <p className="text-[10px] text-slate-400 font-mono">UID: {parent.uid.slice(0, 10)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      <div>
                        {parent.username && <span className="font-mono text-slate-800 font-semibold">{parent.username}</span>}
                        {parent.email && !parent.email.endsWith("@dktest.local") && (
                          <div className="text-[11px] text-slate-400">{parent.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">{parent.phone || "—"}</td>
                    <td className="p-3.5">
                      {getStatusBadge(parent.accountStatus)}
                    </td>
                    <td className="p-3.5 text-slate-500 font-medium">
                      {parent.createdAt ? formatDate(parent.createdAt) : "—"}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/users/${parent.uid}`}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors inline-block"
                          title="Xem chi tiết"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        {parent.accountStatus === "pending" && (
                          <button
                            onClick={() => setActionTarget({ user: parent, type: "approve" })}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Phê duyệt"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {parent.accountStatus === "active" ? (
                          <button
                            onClick={() => setActionTarget({ user: parent, type: "suspend" })}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Tạm khoá"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setActionTarget({ user: parent, type: "approve" })}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Kích hoạt lại"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setActionTarget({ user: parent, type: "delete" })}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Xoá vĩnh viễn"
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

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Hiển thị trang <strong>{page}</strong> / <strong>{totalPages || 1}</strong> ({totalCount} kết quả)
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-slate-800">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
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
              ? "Xác nhận xoá vĩnh viễn tài khoản phụ huynh"
              : actionTarget.type === "suspend"
              ? "Xác nhận tạm khoá tài khoản phụ huynh"
              : "Xác nhận phê duyệt tài khoản phụ huynh"
          }
          message={
            actionTarget.type === "delete"
              ? `Bạn có chắc chắn muốn xoá vĩnh viễn phụ huynh "${
                  actionTarget.user.displayName || actionTarget.user.email
                }" khỏi cơ sở dữ liệu cùng toàn bộ liên kết học sinh? Hành động này không thể hoàn tác.`
              : `Bạn có chắc muốn thực hiện thao tác này cho phụ huynh "${
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
              ? `Bạn có chắc chắn muốn xoá vĩnh viễn ${selectedUids.length} tài khoản phụ huynh đã chọn cùng toàn bộ dữ liệu liên kết? Hành động này không thể hoàn tác.`
              : `Bạn có chắc muốn thực hiện thao tác "${bulkAction}" cho ${selectedUids.length} phụ huynh đã chọn?`
          }
          confirmText={bulkAction === "delete" ? "Xoá tất cả đã chọn" : "Thực hiện ngay"}
          confirmVariant={bulkAction === "delete" ? "danger" : "primary"}
          onConfirm={executeBulkAction}
          onCancel={() => setShowBulkModal(false)}
        />
      )}
    </div>
  );
}
