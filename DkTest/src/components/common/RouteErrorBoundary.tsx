import React, { useEffect } from "react";
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import { reportError } from "../../services/errorReporter";
import { isChunkLoadError, triggerChunkRecovery } from "../../utils/lazyWithRetry";
import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";

export function RouteErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    reportError(error, {
      source: "route_boundary",
      action: "route_error_caught",
    });

    if (isChunkLoadError(error)) {
      triggerChunkRecovery(error);
    }
  }, [error]);

  const isChunk = isChunkLoadError(error);
  let statusText = "Lỗi hiển thị trang";
  let message = "Đã xảy ra sự cố khi tải nội dung này.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      statusText = "Không tìm thấy trang (404)";
      message = "Địa chỉ liên kết bạn vừa truy cập không tồn tại hoặc đã bị gỡ bỏ.";
    } else {
      statusText = `Lỗi hệ thống (${error.status})`;
      message = error.statusText || message;
    }
  } else if (isChunk) {
    statusText = "Bản cập nhật mới";
    message = "Phiên bản mới của trang này đã sẵn sàng. Vui lòng tải lại để sử dụng.";
  } else if (error instanceof Error) {
    message = error.message;
  }

  const handleHardReload = () => {
    try {
      sessionStorage.removeItem("dk_last_chunk_recovery");
      window.location.reload();
    } catch {
      window.location.href = window.location.href;
    }
  };

  return (
    <div className="min-h-[50vh] w-full flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
          {statusText}
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          {message}
        </p>

        <div className="w-full flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleHardReload}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tải lại trang</span>
          </button>

          <Link
            to="/"
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
