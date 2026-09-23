import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  ShieldCheck,
  Cpu,
  Clock,
  Loader2,
} from "lucide-react";
import { fetchSystemHealth } from "../../services/adminService";
import { useToast } from "../../components/ui/ToastNotification";

export default function SystemHealth() {
  const { showErrorToast } = useToast();
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await fetchSystemHealth();
      setHealth(data);
    } catch (err: any) {
      showErrorToast(err.message || "Không thể kiểm tra sức khoẻ hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Server className="w-7 h-7 text-blue-600" />
            <span>Tình Trạng Hệ Thống (System Health)</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Theo dõi trạng thái thời gian thực của máy chủ Express, Firebase Auth và cơ sở dữ liệu Firestore
          </p>
        </div>

        <button
          onClick={loadHealth}
          disabled={loading}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <RefreshCw className="w-4 h-4" />}
          <span>Kiểm tra lại</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <span className="text-xs">Đang kiểm tra các dịch vụ...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Banner */}
          <div className={`rounded-3xl p-6 border flex items-center gap-4 ${
            health?.status === "healthy"
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
              : "bg-amber-50/70 border-amber-200 text-amber-900"
          }`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              health?.status === "healthy" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
            }`}>
              {health?.status === "healthy" ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-base font-bold">
                {health?.status === "healthy" ? "Tất cả các dịch vụ đang hoạt động bình thường" : "Hệ thống đang hoạt động với hiệu năng hạn chế"}
              </h2>
              <p className="text-xs opacity-80 mt-0.5">
                Cập nhật lúc: {health?.serverTimestamp ? new Date(health.serverTimestamp).toLocaleTimeString("vi-VN") : "—"}
              </p>
            </div>
          </div>

          {/* Grid Services */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                  {health?.database?.status === "ok" ? "Kết nối tốt" : "Lỗi"}
                </span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cơ sở dữ liệu Firestore</h3>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {health?.database?.latencyMs} <span className="text-xs font-normal text-slate-500">ms độ trễ</span>
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                  Hoạt động
                </span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firebase Admin SDK</h3>
                <p className="text-sm font-bold text-slate-900 mt-2">
                  {health?.database?.isFirebaseAdminConfigured ? "Đã xác thực Service Account" : "Chế độ dự phòng phát triển"}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-400">v{health?.version}</span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian hoạt động (Uptime)</h3>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {Math.floor((health?.uptimeSeconds || 0) / 60)} <span className="text-xs font-normal text-slate-500">phút</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
