export type AppDialogKind = "alert" | "confirm" | "prompt";

export interface AppDialogRequest {
  id: string;
  kind: AppDialogKind;
  title?: string;
  message: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (value: any) => void;
}

type DialogListener = (req: AppDialogRequest) => void;

const listeners = new Set<DialogListener>();
const pendingQueue: AppDialogRequest[] = [];

export function subscribeAppDialogs(listener: DialogListener): () => void {
  listeners.add(listener);
  while (pendingQueue.length > 0) {
    const next = pendingQueue.shift();
    if (next) listener(next);
  }
  return () => {
    listeners.delete(listener);
  };
}

function enqueueDialog(req: AppDialogRequest) {
  if (listeners.size === 0) {
    pendingQueue.push(req);
    return;
  }
  const first = listeners.values().next().value;
  if (first) first(req);
}

export function showAppAlert(message: string, title = "Thông báo DkTEST"): Promise<void> {
  return new Promise<void>((resolve) => {
    enqueueDialog({
      id: `dlg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      kind: "alert",
      title,
      message: String(message ?? ""),
      confirmLabel: "Đã hiểu",
      resolve: () => resolve(),
    });
  });
}

export function showAppConfirm(
  message: string,
  options?: { title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    enqueueDialog({
      id: `dlg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      kind: "confirm",
      title: options?.title || "Xác nhận thao tác",
      message: String(message ?? ""),
      confirmLabel: options?.confirmLabel || "Xác nhận",
      cancelLabel: options?.cancelLabel || "Hủy",
      danger: Boolean(options?.danger),
      resolve: (val) => resolve(Boolean(val)),
    });
  });
}

export function showAppPrompt(
  message: string,
  defaultValue = "",
  title = "Nhập thông tin"
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    enqueueDialog({
      id: `dlg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      kind: "prompt",
      title,
      message: String(message ?? ""),
      defaultValue,
      confirmLabel: "Đồng ý",
      cancelLabel: "Hủy",
      resolve: (val) => resolve(typeof val === "string" ? val : null),
    });
  });
}
