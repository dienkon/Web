import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Folder as FolderIcon,
  Link as LinkIcon,
  Layers,
  BarChart3,
  X,
  CheckCircle2,
  Loader2,
  Globe,
  FolderTree,
} from "lucide-react";
import type { Folder, Exam } from "../../types";
import { exportExamsAndFoldersToExcel, ExcelExportFormat } from "../../services/excelExportService";
import { useToast } from "../ui/ToastNotification";

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId: string | null;
  ownerId?: string | null;
  cachedExams?: Exam[];
}

export default function ExcelExportModal({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  ownerId,
  cachedExams,
}: ExcelExportModalProps) {
  const toast = useToast();
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExcelExportFormat>("quick_links");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Khởi tạo thư mục được chọn theo currentFolderId khi mở modal
  useEffect(() => {
    if (isOpen) {
      if (currentFolderId) {
        setSelectedFolderId(currentFolderId);
      } else {
        setSelectedFolderId("all");
      }
      if (typeof window !== "undefined") {
        setCustomBaseUrl(window.location.origin);
      }
    }
  }, [isOpen, currentFolderId]);

  // Xây dựng cây thư mục lồng nhau để hiển thị trong select
  const folderTreeOptions = useMemo(() => {
    const buildOptions = (parentId: string | null = null, depth = 0): { id: string; name: string; depth: number }[] => {
      const result: { id: string; name: string; depth: number }[] = [];
      const children = folders.filter((f) => (f.parentId || null) === parentId);
      for (const child of children) {
        result.push({ id: child.id, name: child.name, depth });
        result.push(...buildOptions(child.id, depth + 1));
      }
      return result;
    };
    return buildOptions(null, 0);
  }, [folders]);

  if (!isOpen) return null;

  const selectedFolderName =
    selectedFolderId === "all"
      ? "Tất cả đề thi trong hệ thống"
      : folders.find((f) => f.id === selectedFolderId)?.name || "Thư mục chọn";

  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      const res = await exportExamsAndFoldersToExcel({
        ownerId,
        targetFolderId: selectedFolderId,
        targetFolderName: selectedFolderName,
        includeSubfolders,
        format: exportFormat,
        baseUrl: customBaseUrl.trim() || undefined,
        cachedExams,
        cachedFolders: folders,
      });

      toast.success(
        `Xuất Excel thành công! Đã lưu ${res.exportedExamsCount} bài thi (${res.fileName})`
      );
      onClose();
    } catch (err) {
      console.error("Lỗi xuất Excel:", err);
      toast.error("Không thể xuất file Excel. Vui lòng kiểm tra lại kết nối mạng!");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-5 border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Xuất tổng hợp bài thi ra Excel (.xlsx)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Tùy chọn xuất theo thư mục và lựa chọn định dạng phù hợp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Phạm vi xuất (Scope & Folders) */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FolderTree className="w-3.5 h-3.5 text-blue-600" />
            <span>Phạm vi xuất dữ liệu:</span>
          </label>

          <select
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">📂 Toàn bộ hệ thống (Tất cả thư mục & đề thi)</option>
            {folderTreeOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {"\u00A0".repeat(f.depth * 4)}📁 {f.name}
              </option>
            ))}
          </select>

          {selectedFolderId !== "all" && (
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSubfolders}
                  onChange={(e) => setIncludeSubfolders(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Bao gồm cả các thư mục con bên trong (đệ quy)
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Section 2: Chọn định dạng xuất (Template) */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-slate-800">
            Chọn dạng xuất bảng tính:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Template 1: Quick Links */}
            <div
              onClick={() => setExportFormat("quick_links")}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                exportFormat === "quick_links"
                  ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <LinkIcon className="w-4 h-4 text-blue-600" />
                  {exportFormat === "quick_links" && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <h4 className="text-xs font-black text-slate-900 leading-snug">
                  Đề & Link thi trực tiếp
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Tên bài thi + <strong>Link làm bài clickable</strong> để gửi cho học sinh click làm ngay.
              </p>
            </div>

            {/* Template 2: Full Management */}
            <div
              onClick={() => setExportFormat("full_management")}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                exportFormat === "full_management"
                  ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  {exportFormat === "full_management" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <h4 className="text-xs font-black text-slate-900 leading-snug">
                  Báo cáo Quản trị Đầy đủ
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                19 cột chi tiết + Sheet Thống kê Thư mục + Sheet Chỉ số KPI.
              </p>
            </div>

            {/* Template 3: Analytics */}
            <div
              onClick={() => setExportFormat("analytics")}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                exportFormat === "analytics"
                  ? "bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <BarChart3 className="w-4 h-4 text-amber-600" />
                  {exportFormat === "analytics" && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <h4 className="text-xs font-black text-slate-900 leading-snug">
                  Thống kê Lượt thi
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Phân tích số lượt làm bài, giá vé và doanh thu ước tính.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Domain Base URL */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <label className="block text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Globe className="w-3 h-3 text-slate-400" />
            <span>Địa chỉ Web máy chủ (Base URL cho link làm bài):</span>
          </label>
          <input
            type="text"
            value={customBaseUrl}
            onChange={(e) => setCustomBaseUrl(e.target.value)}
            placeholder="Ví dụ: http://localhost:3636 hoặc https://dktest.vn"
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExecuteExport}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tạo file Excel...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Tải file Excel (.xlsx)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
