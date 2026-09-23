import React, { useState, useEffect } from "react";
import {
  Activity,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Loader2,
  Download,
  Wrench,
  Sliders,
  ExternalLink,
} from "lucide-react";
import {
  fetchDataHealth,
  scanDataHealth,
  repairDataHealth,
} from "../../services/adminService";
import type { DataHealthReport, ReconciliationIssue } from "../../types";
import { formatDate } from "../../utils/date";
import { useToast } from "../../components/ui/ToastNotification";
import ConfirmModal from "../../components/ui/ConfirmModal";

export default function DataHealth() {
  const { showToast, error: showErrorToast, success: showSuccessToast } = useToast();

  const [report, setReport] = useState<DataHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [repairing, setRepairing] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("all");
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [dryRunMode, setDryRunMode] = useState(true);
  const [dryRunResult, setDryRunResult] = useState<any | null>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await fetchDataHealth();
      setReport(data);
    } catch (err: any) {
      console.error("[DataHealth] Error:", err);
      showErrorToast(err.message || "Không thể tải báo cáo sức khoẻ dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      showToast("Đang quét và đối soát cơ sở dữ liệu...", "info");
      const res = await scanDataHealth();
      setReport(res);
      showSuccessToast("Đã hoàn tất quét đối soát dữ liệu!");
    } catch (err: any) {
      showErrorToast(err.message || "Lỗi khi quét dữ liệu.");
    } finally {
      setScanning(false);
    }
  };

  const handleExecuteRepair = async (isDryRun: boolean) => {
    setRepairing(true);
    try {
      const res = await repairDataHealth(undefined, isDryRun);
      if (isDryRun) {
        setDryRunResult(res);
        showToast(`[Dry Run] Phát hiện ${res.plannedRepairsCount} mục có thể tự động sửa an toàn.`, "info");
      } else {
        showSuccessToast(res.message || "Đã áp dụng sửa lỗi dữ liệu thành công!");
        setShowRepairModal(false);
        setDryRunResult(null);
        handleScan();
      }
    } catch (err: any) {
      showErrorToast(err.message || "Lỗi khi sửa dữ liệu.");
    } finally {
      setRepairing(false);
    }
  };

  const exportReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `data_health_report_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allIssues = report?.issues || [];
  const filteredIssues =
    activeTab === "all"
      ? allIssues
      : allIssues.filter((i) => i.type === activeTab);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-7 h-7 text-emerald-600" />
            <span>Trung Tâm Kiểm Tra Dữ Liệu</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Đối soát danh tính Firebase Authentication & Firestore Profiles, nhận diện tài khoản ảo và dữ liệu rác
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportReport}
            disabled={!report || allIssues.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Xuất JSON</span>
          </button>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Quét dữ liệu</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500">Tài khoản hợp lệ</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{report?.validUsersCount ?? "—"}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500">Auth chưa có Profile</p>
          <p className={`text-2xl font-black mt-1 ${report?.authWithoutProfileCount ? "text-amber-600" : "text-slate-800"}`}>
            {report?.authWithoutProfileCount ?? "—"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500">Profile mồ côi (Orphan)</p>
          <p className={`text-2xl font-black mt-1 ${report?.orphanProfileCount ? "text-red-600" : "text-slate-800"}`}>
            {report?.orphanProfileCount ?? "—"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500">Email trùng lặp</p>
          <p className={`text-2xl font-black mt-1 ${report?.duplicateEmailCount ? "text-red-600" : "text-slate-800"}`}>
            {report?.duplicateEmailCount ?? "—"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500">Thiếu Role</p>
          <p className={`text-2xl font-black mt-1 ${report?.missingRoleCount ? "text-amber-600" : "text-slate-800"}`}>
            {report?.missingRoleCount ?? "—"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500">Lỗi liên kết PH</p>
          <p className={`text-2xl font-black mt-1 ${report?.brokenRelationshipCount ? "text-amber-600" : "text-slate-800"}`}>
            {report?.brokenRelationshipCount ?? "—"}
          </p>
        </div>
      </div>

      {/* Repair Control Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" />
            <span>Sửa lỗi dữ liệu tự động an toàn</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Hệ thống hỗ trợ sửa chữa tự động các lỗi an toàn (bổ sung role mặc định, tạo skeleton profile, gỡ bỏ quan hệ liên kết hỏng) có kèm chế độ Xem trước (Dry Run) trước khi thực hiện ghi dữ liệu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExecuteRepair(true)}
            disabled={repairing || allIssues.length === 0}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700 disabled:opacity-40"
          >
            {repairing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xem trước (Dry Run)"}
          </button>
          <button
            onClick={() => setShowRepairModal(true)}
            disabled={repairing || allIssues.length === 0}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-40"
          >
            Sửa lỗi an toàn
          </button>
        </div>
      </div>

      {/* Dry Run Result Preview */}
      {dryRunResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
          <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>Kết quả Xem trước (Dry Run):</span>
          </h4>
          <p className="text-xs text-blue-800">
            Có <strong>{dryRunResult.plannedRepairsCount}</strong> tác vụ sửa chữa sẽ được thực thi:
          </p>
          <ul className="text-[11px] text-blue-700 list-disc list-inside space-y-1">
            {dryRunResult.repairs?.map((r: any, idx: number) => (
              <li key={idx}>
                <strong>{r.action}</strong> cho ID: <span className="font-mono">{r.uid || r.relId}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Issue Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2 text-xs font-bold">
        {[
          { id: "all", label: `Tất cả vấn đề (${allIssues.length})` },
          { id: "AUTH_WITHOUT_PROFILE", label: `Chưa có Profile (${report?.authWithoutProfileCount || 0})` },
          { id: "ORPHAN_PROFILE", label: `Profile mồ côi (${report?.orphanProfileCount || 0})` },
          { id: "DATA_CONFLICT", label: `Email trùng (${report?.duplicateEmailCount || 0})` },
          { id: "MISSING_ROLE", label: `Thiếu Role (${report?.missingRoleCount || 0})` },
          { id: "BROKEN_RELATIONSHIP", label: `Lỗi liên kết (${report?.brokenRelationshipCount || 0})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
            <span className="text-xs">Đang tải dữ liệu kiểm tra...</span>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-800">Cơ sở dữ liệu đang trong trạng thái rất tốt!</p>
            <p className="text-xs text-slate-400">Không phát hiện vấn đề bất thường nào thuộc danh mục này.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="p-3.5">Mức độ</th>
                  <th className="p-3.5">Loại vấn đề</th>
                  <th className="p-3.5">Mô tả chi tiết</th>
                  <th className="p-3.5">Hành động đề xuất</th>
                  <th className="p-3.5 text-right">Tự động sửa?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5">
                      {issue.severity === "error" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                          <XCircle className="w-4 h-4" /> Nghiêm trọng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                          <AlertTriangle className="w-4 h-4" /> Cảnh báo
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 font-mono text-[11px]">{issue.type}</td>
                    <td className="p-3.5 text-slate-700 leading-snug">{issue.description}</td>
                    <td className="p-3.5 text-blue-700 font-medium">{issue.suggestedAction}</td>
                    <td className="p-3.5 text-right">
                      {issue.safeToAutoRepair ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px]">
                          Có thể tự sửa
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-medium rounded text-[10px]">
                          Cần kiểm tra
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Repair Modal */}
      {showRepairModal && (
        <ConfirmModal
          isOpen={true}
          title="Xác nhận sửa lỗi dữ liệu"
          message="Bạn có chắc chắn muốn áp dụng sửa chữa tự động cho tất cả các mục an toàn đã phát hiện? Hệ thống sẽ ghi nhận lịch sử vào Audit Log."
          confirmText="Tiến hành sửa lỗi"
          confirmVariant="primary"
          onConfirm={() => handleExecuteRepair(false)}
          onCancel={() => setShowRepairModal(false)}
        />
      )}
    </div>
  );
}
