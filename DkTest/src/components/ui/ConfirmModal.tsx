import React from "react";
import { AlertTriangle, Trash2, LogOut, Info, Loader2, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  confirmVariant?: "danger" | "warning" | "info" | string;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  variant = "danger",
  confirmVariant,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleClose = onCancel || onClose || (() => {});
  const effectiveVariant = (confirmVariant as "danger" | "warning" | "info") || variant;

  const getIcon = () => {
    switch (effectiveVariant) {
      case "danger":
        return <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case "warning":
        return <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />;
      case "info":
        return <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getIconBg = () => {
    switch (effectiveVariant) {
      case "danger":
        return "bg-red-100 dark:bg-red-950/50";
      case "warning":
        return "bg-amber-100 dark:bg-amber-950/50";
      case "info":
        return "bg-blue-100 dark:bg-blue-950/50";
    }
  };

  const getConfirmButtonClasses = () => {
    switch (effectiveVariant) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm shadow-red-500/20";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-sm shadow-amber-500/20";
      case "info":
        return "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-sm shadow-blue-500/20";
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={isLoading ? undefined : handleClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 animate-in zoom-in-95 duration-200 transition-colors duration-200">
        <button
          onClick={isLoading ? undefined : handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getIconBg()}`}>
            {getIcon()}
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-6">{title}</h3>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{message}</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isLoading}
            className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 ${getConfirmButtonClasses()}`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
