import React, { useState } from "react";
import { Globe, Lock, CheckCircle2, X } from "lucide-react";

interface PublishVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (isPublic: boolean) => void;
  initialIsPublic?: boolean;
}

export default function PublishVisibilityModal({
  isOpen,
  onClose,
  onConfirm,
  initialIsPublic = true,
}: PublishVisibilityModalProps) {
  const [isPublic, setIsPublic] = useState<boolean>(initialIsPublic);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Xuất bản đề thi
              </h3>
              <p className="text-xs text-slate-500">
                Lựa chọn quyền riêng tư và phạm vi truy cập bài thi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 font-medium">
            Bạn muốn thiết lập chế độ hiển thị cho bài thi này như thế nào?
          </p>

          <div className="space-y-3">
            {/* Public Option */}
            <div
              onClick={() => setIsPublic(true)}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                isPublic
                  ? "border-blue-600 bg-blue-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  isPublic
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Globe className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">
                    🌐 Xuất bản CÔNG KHAI
                  </span>
                  {isPublic && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Đề thi sẽ xuất hiện trên Thư viện chung. Tất cả giáo viên &
                  học sinh có thể tìm kiếm, làm bài và ôn tập.
                </p>
              </div>
            </div>

            {/* Unlisted / Private Option */}
            <div
              onClick={() => setIsPublic(false)}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                !isPublic
                  ? "border-amber-600 bg-amber-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  !isPublic
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">
                    🔒 KHÔNG CÔNG KHAI (Riêng tư / Có link)
                  </span>
                  {!isPublic && (
                    <CheckCircle2 className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Đề thi bị ẩn khỏi Thư viện chung. Chỉ những người nhận được
                  mã đề hoặc liên kết chia sẻ mới có thể truy cập.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => onConfirm(isPublic)}
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Xác nhận Xuất bản
          </button>
        </div>
      </div>
    </div>
  );
}
