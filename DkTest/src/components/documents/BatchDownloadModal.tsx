import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Download,
  ExternalLink,
  FolderDown,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import {
  executeBatchDownload,
  MAX_BATCH_DOCUMENTS,
  type BatchDownloadProgress,
  type BatchDownloadSummary,
} from "../../services/batchDownloadService";
import type { FolderTreeIndex } from "../../services/documentLibraryClientService";
import type { LibraryDocument } from "../../types/documentLibrary";
import { useToast } from "../ui/ToastNotification";

interface BatchDownloadModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  documents: LibraryDocument[];
  rootFolderId?: string | null;
  folderIndex?: FolderTreeIndex;
  subFolderFilter?: string;
}

export default function BatchDownloadModal({
  open,
  onClose,
  title,
  documents,
  rootFolderId = null,
  folderIndex,
  subFolderFilter,
}: BatchDownloadModalProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const [mode, setMode] = useState<"zip" | "individual">("zip");
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [expandSubFiles, setExpandSubFiles] = useState(true);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<BatchDownloadProgress | null>(null);
  const [summary, setSummary] = useState<BatchDownloadSummary | null>(null);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setRunning(false);
      setProgress(null);
      setSummary(null);
    }
  }, [open]);

  if (!open) return null;

  const effectiveDocs = documents.slice(0, MAX_BATCH_DOCUMENTS);
  const paidCountInSelection = effectiveDocs.filter(
    (d) => d.accessMode === "paid" && d.priceVnd > 0
  ).length;

  const handleStartDownload = async () => {
    if (effectiveDocs.length === 0) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      setRunning(true);
      setSummary(null);
      const res = await executeBatchDownload({
        archiveTitle: subFolderFilter ? `${title}_${subFolderFilter}` : title,
        mode,
        documents: effectiveDocs,
        rootFolderId,
        folderIndex,
        includeAnswers,
        expandSubFiles,
        subFolderFilter,
        signal: ctrl.signal,
        onProgress: (p) => setProgress(p),
      });
      setSummary(res);
      if (res.downloadedCount > 0) {
        showSuccessToast(
          res.mode === "zip"
            ? `Đã đóng gói và tải xuống "${res.archiveFileName}" (${res.downloadedCount} tệp)!`
            : `Đã tải xuống ${res.downloadedCount} tệp về thiết bị!`
        );
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        showErrorToast("Đã dừng quá trình tải hàng loạt.");
      } else {
        showErrorToast(err?.message || "Tải toàn bộ thư mục thất bại.");
      }
    } finally {
      setRunning(false);
    }
  };

  const handleCancel = () => {
    if (running) {
      abortRef.current?.abort();
      setRunning(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <FolderDown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Tải toàn bộ: {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {effectiveDocs.length} mục tài liệu được chọn
                {documents.length > MAX_BATCH_DOCUMENTS
                  ? ` (tối đa ${MAX_BATCH_DOCUMENTS} mục mỗi đợt tải)`
                  : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!summary && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={running}
                  onClick={() => setMode("zip")}
                  className={`text-left p-3.5 rounded-2xl border transition cursor-pointer ${
                    mode === "zip"
                      ? "border-teal-600 bg-teal-50/70 dark:bg-teal-950/30"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <Archive className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Gói nén 1 file .ZIP</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Giữ nguyên cấu trúc cây thư mục con tiếng Việt, gọn gàng 1 tệp duy nhất.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={running}
                  onClick={() => setMode("individual")}
                  className={`text-left p-3.5 rounded-2xl border transition cursor-pointer ${
                    mode === "individual"
                      ? "border-teal-600 bg-teal-50/70 dark:bg-teal-950/30"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <Download className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Tải rời từng tệp gốc</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Tải lần lượt từng PDF / DOCX về thư mục Tải xuống (tối ưu cho Ebook nặng).
                  </p>
                </button>
              </div>

              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={running}
                    checked={includeAnswers}
                    onChange={(e) => setIncludeAnswers(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Tự động tải kèm tệp Đáp án &amp; Lời giải chi tiết (nếu có)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={running}
                    checked={expandSubFiles}
                    onChange={(e) => setExpandSubFiles(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Bung đầy đủ các tệp con bên trong Bộ tài liệu tổng hợp (tối đa 80 tệp)</span>
                </label>
              </div>

              {paidCountInSelection > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Danh sách có <b>{paidCountInSelection}</b> tài liệu trả phí: hệ thống sẽ tự động tải các tài liệu bạn đã mở khóa và bỏ qua các tài liệu chưa mua.
                  </span>
                </div>
              )}
            </>
          )}

          {/* Live Progress */}
          {running && progress && (
            <div className="space-y-2.5 p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900">
              <div className="flex items-center justify-between text-xs font-bold text-teal-900 dark:text-teal-200">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  <span>
                    {progress.phase === "zipping"
                      ? "Đang đóng gói .ZIP..."
                      : `Đang tải (${progress.completedCount}/${progress.totalCount})`}
                  </span>
                </span>
                <span>{progress.percent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-teal-200/70 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-teal-600 transition-all duration-200 rounded-full"
                  style={{ width: `${Math.max(5, progress.percent)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                {progress.currentLabel}
              </p>
            </div>
          )}

          {/* Completion Summary */}
          {summary && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200">
                    {summary.downloadedCount > 0
                      ? summary.mode === "zip"
                        ? `Đã lưu gói nén "${summary.archiveFileName}" gồm ${summary.downloadedCount} tệp!`
                        : `Đã tải xuống thành công ${summary.downloadedCount} tệp!`
                      : "Không có tệp trực tiếp nào có thể đóng gói tự động."}
                  </div>
                  {summary.skippedLockedCount > 0 && (
                    <div className="text-amber-700 dark:text-amber-300">
                      • Đã bỏ qua {summary.skippedLockedCount} tài liệu trả phí chưa mở khóa.
                    </div>
                  )}
                  {summary.failedTitles.length > 0 && (
                    <div className="text-slate-600 dark:text-slate-400">
                      • {summary.failedTitles.length} tệp lớn (&gt;44MB) cần mở/tải riêng từng tệp.
                    </div>
                  )}
                </div>
              </div>

              {summary.externalFolderLinks.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <span>
                      Thư mục liên kết Google Drive trực tiếp ({summary.externalFolderLinks.length}):
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {summary.externalFolderLinks.map((ext, i) => (
                      <a
                        key={i}
                        href={ext.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span className="truncate">{ext.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {running ? "Dừng tải" : summary ? "Đóng" : "Hủy"}
            </button>

            {!summary && (
              <button
                type="button"
                disabled={running || effectiveDocs.length === 0}
                onClick={() => void handleStartDownload()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {running ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderDown className="w-4 h-4" />
                )}
                <span>
                  {mode === "zip" ? "Đóng gói & Tải .ZIP ngay" : "Bắt đầu tải từng tệp"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
