import React from 'react';
import { AlertTriangle, RotateCcw, RefreshCw, History } from 'lucide-react';
import { listSessions, restoreSession, type LabSessionV1 } from '../../services/labSessions';
import { useLabStore } from '../../store/useLabStore';

export type ErrorBoundaryScope = 'workbench' | 'modal';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  scope?: ErrorBoundaryScope;
  language?: 'en' | 'vi';
  onRecover?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
  statusNote: string | null;
  busy: boolean;
}

/**
 * Restores the most recent saved session (preferring the active autosave slot)
 * from IndexedDB without losing the user's experiment progress.
 */
export async function restoreLatestSavedSession(): Promise<LabSessionV1 | null> {
  const sessions = await listSessions();
  if (!sessions || sessions.length === 0) return null;
  const sorted = [...sessions].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const preferred = sorted.find((s) => s.id === 'autosave') ?? sorted[0];
  return restoreSession(preferred);
}

/**
 * Resets either transient modal state (preserving vessels on the bench)
 * or the entire workbench state when recovering from an ErrorBoundary fault.
 */
export function resetLabStateForRecovery(
  scope: ErrorBoundaryScope,
  onRecover?: () => void
): void {
  if (scope === 'modal') {
    useLabStore.setState({
      isNotebookOpen: false,
      isAIAssistantOpen: false,
      isApiKeyModalOpen: false,
      isPeriodicTableOpen: false,
      isReactionLibraryOpen: false,
      isTitrationCurveOpen: false,
      isQuizModalOpen: false,
      isTransferModalOpen: false,
      transferSourceId: null,
      transferTargetId: null,
    });
  } else {
    useLabStore.getState().resetWorkbench();
  }
  onRecover?.();
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: null,
      statusNote: null,
      busy: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error',
      statusNote: null,
      busy: false,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ChemDex ErrorBoundary]', error, info.componentStack);
  }

  private handleRestoreAutosave = async () => {
    const vi = (this.props.language ?? 'vi') === 'vi';
    this.setState({ busy: true, statusNote: null });
    try {
      const restored = await restoreLatestSavedSession();
      if (!restored) {
        this.setState({
          busy: false,
          statusNote: vi
            ? 'Không tìm thấy bản tự lưu nào khả dụng.'
            : 'No saved session found to restore.',
        });
        return;
      }
      this.props.onRecover?.();
      this.setState({
        hasError: false,
        errorMessage: null,
        statusNote: null,
        busy: false,
      });
    } catch {
      this.setState({
        busy: false,
        statusNote: vi
          ? 'Không thể đọc bản tự lưu từ trình duyệt.'
          : 'Could not read saved session from browser storage.',
      });
    }
  };

  private handleResetOrDismiss = () => {
    resetLabStateForRecovery(this.props.scope ?? 'workbench', this.props.onRecover);
    this.setState({
      hasError: false,
      errorMessage: null,
      statusNote: null,
      busy: false,
    });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const scope = this.props.scope ?? 'workbench';
    const vi = (this.props.language ?? 'vi') === 'vi';
    const isModal = scope === 'modal';

    return (
      <div
        role="alert"
        className={
          isModal
            ? 'fixed bottom-4 right-4 z-50 max-w-md rounded-2xl border border-red-200 bg-white p-4 shadow-2xl text-slate-800'
            : 'flex-1 flex items-center justify-center p-6 bg-slate-50 text-slate-800'
        }
      >
        <div className={isModal ? 'space-y-3' : 'max-w-lg w-full rounded-2xl border border-red-200 bg-white p-6 shadow-xl space-y-4'}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-50 text-red-600 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="text-sm font-bold text-slate-900">
                {isModal
                  ? vi
                    ? 'Hộp thoại gặp sự cố hiển thị'
                    : 'A dialog encountered a rendering error'
                  : vi
                    ? 'Bàn thí nghiệm gặp sự cố không mong muốn'
                    : 'The laboratory workbench encountered an unexpected error'}
              </h2>
              <p className="text-xs text-slate-600">
                {vi
                  ? 'Bạn có thể khôi phục phiên tự lưu gần nhất, đặt lại vùng hiển thị hoặc tải lại trang.'
                  : 'You can restore the latest autosaved session, reset the view, or reload the page.'}
              </p>
              {this.state.errorMessage && (
                <p className="text-[11px] font-mono text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 break-words">
                  {this.state.errorMessage}
                </p>
              )}
              {this.state.statusNote && (
                <p className="text-xs font-medium text-amber-700">{this.state.statusNote}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!isModal && (
              <button
                type="button"
                disabled={this.state.busy}
                onClick={this.handleRestoreAutosave}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                <History size={14} />
                <span>{vi ? 'Khôi phục phiên tự lưu' : 'Restore autosave'}</span>
              </button>
            )}
            <button
              type="button"
              disabled={this.state.busy}
              onClick={this.handleResetOrDismiss}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>
                {isModal
                  ? vi
                    ? 'Đóng hộp thoại'
                    : 'Close dialog'
                  : vi
                    ? 'Đặt lại bàn thí nghiệm'
                    : 'Reset workbench'}
              </span>
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>{vi ? 'Tải lại trang' : 'Reload page'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
