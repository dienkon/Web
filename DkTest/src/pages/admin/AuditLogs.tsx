import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  ShieldAlert,
  Loader2,
  Calendar,
  User,
  Activity,
  Filter,
} from "lucide-react";
import { fetchAuditLogs } from "../../services/adminService";
import type { AuditLog } from "../../types";
import { formatDate } from "../../utils/date";
import { useToast } from "../../components/ui/ToastNotification";

export default function AuditLogs() {
  const { showErrorToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [actorSearch, setActorSearch] = useState("");
  const [limit, setLimit] = useState(5);
  const [hasMore, setHasMore] = useState(true);

  const loadLogs = async (currentLimit = limit) => {
    setLoading(true);
    try {
      const res = await fetchAuditLogs({
        limit: currentLimit,
        action: actionFilter,
        actor: actorSearch,
      });
      const items = res.items || [];
      setLogs(items);
      setHasMore(items.length >= currentLimit);
    } catch (err: any) {
      console.error("[AuditLogs] Error:", err);
      showErrorToast(err.message || "Không thể tải nhật ký thao tác.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextLimit = limit + 5;
    setLimit(nextLimit);
    loadLogs(nextLimit);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLimit(5);
      loadLogs(5);
    }, 300);
    return () => clearTimeout(timer);
  }, [actionFilter, actorSearch]);

  const getActionBadge = (action: string) => {
    if (action.includes("APPROVED") || action.includes("REACTIVATED")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {action}
        </span>
      );
    }
    if (action.includes("SUSPENDED") || action.includes("DISABLED")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          {action}
        </span>
      );
    }
    if (action.includes("DELETED")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        {action}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Activity className="w-7 h-7 text-blue-600" />
          <span>Nhật Ký Quản Trị (Audit Logs)</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Theo dõi toàn bộ các thao tác quản trị viên đối với tài khoản và dữ liệu hệ thống
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <input
            type="text"
            value={actorSearch}
            onChange={(e) => setActorSearch(e.target.value)}
            placeholder="Tìm theo UID người thực hiện..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="w-60">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="">Tất cả hành động</option>
            <option value="USER_APPROVED">Phê duyệt tài khoản</option>
            <option value="USER_SUSPENDED">Tạm khoá tài khoản</option>
            <option value="USER_REACTIVATED">Kích hoạt lại</option>
            <option value="USER_DELETED">Xoá tài khoản</option>
            <option value="PROFILE_UPDATED">Cập nhật hồ sơ</option>
            <option value="BULK_OPERATION">Thao tác hàng loạt</option>
            <option value="DATA_REPAIRED">Sửa lỗi dữ liệu</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="p-3.5">Thời gian</th>
                <th className="p-3.5">Người thực hiện</th>
                <th className="p-3.5">Hành động</th>
                <th className="p-3.5">Đối tượng tác động</th>
                <th className="p-3.5">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Đang tải nhật ký...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Không có nhật ký nào phù hợp
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-medium text-slate-500 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">
                        {log.actorName || log.actorEmail || log.actorUid}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono capitalize">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="p-3.5">{getActionBadge(log.action)}</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">
                      {log.targetUid ? `${log.targetType || "user"}: ${log.targetUid.slice(0, 12)}...` : "Toàn hệ thống"}
                    </td>
                    <td className="p-3.5">
                      {log.metadata ? (
                        <pre className="text-[10px] bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-slate-600 max-w-xs overflow-x-auto">
                          {JSON.stringify(log.metadata)}
                        </pre>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {hasMore && logs.length >= limit && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loading}
              className="px-4 py-2 bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {loading ? "Đang tải thêm..." : "Tải thêm 5 nhật ký nữa"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
