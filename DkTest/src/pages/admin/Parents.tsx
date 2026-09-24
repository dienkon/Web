import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Search,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  Mail,
  HeartHandshake,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { fetchAdminUsers } from "../../services/adminService";
import type { UserProfile } from "../../types";
import { formatDate } from "../../utils/date";
import { useToast } from "../../components/ui/ToastNotification";

export default function Parents() {
  const { showErrorToast } = useToast();
  const [parents, setParents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

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
            placeholder="Tìm theo tên phụ huynh, email, số điện thoại..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="p-3.5">Phụ huynh</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Số điện thoại</th>
                <th className="p-3.5">Trạng thái</th>
                <th className="p-3.5">Ngày tham gia</th>
                <th className="p-3.5 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadError ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
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
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Đang tải danh sách phụ huynh...</span>
                  </td>
                </tr>
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Chưa có phụ huynh nào phù hợp tìm kiếm
                  </td>
                </tr>
              ) : (
                parents.map((parent) => (
                  <tr key={parent.uid} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {(parent.displayName || parent.email || "P").charAt(0).toUpperCase()}
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
                    <td className="p-3.5 font-medium text-slate-700">{parent.email || "—"}</td>
                    <td className="p-3.5 font-medium text-slate-700">{parent.phone || "—"}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Đang hoạt động
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 font-medium">
                      {parent.createdAt ? formatDate(parent.createdAt) : "—"}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        to={`/admin/users/${parent.uid}`}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors inline-block"
                        title="Xem chi tiết"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>Trang {page} / {totalPages || 1}</div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-slate-800">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
