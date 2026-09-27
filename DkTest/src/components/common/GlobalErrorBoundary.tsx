import React, { Component, ErrorInfo, ReactNode } from "react";
import { reportError } from "../../services/errorReporter";
import { isChunkLoadError, triggerChunkRecovery } from "../../utils/lazyWithRetry";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showTechnicalDetails: boolean;
  isRecovering: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showTechnicalDetails: false,
    isRecovering: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log centrally
    reportError(error, {
      source: "error_boundary",
      action: "react_component_crash",
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });

    // Check if this was a chunk loading error from a new deployment
    if (isChunkLoadError(error)) {
      this.setState({ isRecovering: true });
      const reloaded = triggerChunkRecovery(error);
      if (reloaded) {
        return;
      }
    }
  }

  private handleHardReload = (): void => {
    try {
      // Clear transient session storage flags before hard reload
      sessionStorage.removeItem("dk_last_chunk_recovery");
      const url = new URL(window.location.href);
      url.searchParams.set("_t", String(Date.now()));
      window.location.href = url.toString();
    } catch {
      window.location.reload();
    }
  };

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showTechnicalDetails: false,
      isRecovering: false,
    });
  };

  private handleGoHome = (): void => {
    window.location.href = "/";
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      const isChunk = isChunkLoadError(this.state.error);
      const isDev =
        import.meta.env?.DEV ||
        (typeof window !== "undefined" && window.location.search.includes("debug=1"));

      return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans select-none">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5 shrink-0 shadow-inner">
              <svg
                className="w-8 h-8 animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Brand Title */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-3">
              <span>DkTEST Safety Guard</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
              {isChunk
                ? "Đã có bản cập nhật DkTEST mới"
                : "DkTEST gặp sự cố khi tải trang"}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mb-6">
              {isChunk
                ? "Hệ thống vừa cập nhật phiên bản mới nhất trên máy chủ. Vui lòng tải lại trang để nạp bản cập nhật an toàn."
                : "Ứng dụng vừa gặp sự cố hiển thị ngoài dự kiến. Dữ liệu làm bài và tài khoản của bạn vẫn được bảo toàn an toàn."}
            </p>

            {/* Action Buttons */}
            <div className="w-full flex flex-col sm:flex-row gap-2.5 mb-4">
              <button
                type="button"
                onClick={this.handleHardReload}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Tải lại trang</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700/60 cursor-pointer"
              >
                Thử lại
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700/60 cursor-pointer"
              >
                Về trang chủ
              </button>
            </div>

            {/* Build Version info */}
            <div className="text-[11px] text-slate-500 font-medium">
              DkTEST v1.8.26 • Safe Boot Mode
            </div>

            {/* Technical details toggle in dev or debug mode */}
            {isDev && (
              <div className="w-full mt-5 pt-4 border-t border-slate-800/80 text-left">
                <button
                  type="button"
                  onClick={() =>
                    this.setState((prev) => ({
                      showTechnicalDetails: !prev.showTechnicalDetails,
                    }))
                  }
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer mb-2"
                >
                  {this.state.showTechnicalDetails
                    ? "Ẩn chi tiết kỹ thuật ▲"
                    : "Chi tiết lỗi kỹ thuật (Debug) ▼"}
                </button>

                {this.state.showTechnicalDetails && (
                  <pre className="p-3 bg-slate-950 rounded-xl text-[10px] text-red-400 overflow-x-auto max-h-48 border border-red-900/30 whitespace-pre-wrap font-mono select-text">
                    {this.state.error?.name}: {this.state.error?.message}
                    {"\n\n"}
                    {this.state.error?.stack}
                    {"\n\nComponent Stack:"}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
