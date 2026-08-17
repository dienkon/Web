import { createContext, useContext, useState, ReactNode } from "react";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
};

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    resolve?: (value: boolean) => void;
  }>({
    open: false,
    title: "",
    message: "",
    confirmText: "Đồng ý",
    cancelText: "Huỷ",
  });

  const confirm: ConfirmContextType = (options) =>
    new Promise((resolve) => {
      setDialog({
        open: true,
        title: options.title ?? "Xác nhận",
        message: options.message,
        confirmText: options.confirmText ?? "Đồng ý",
        cancelText: options.cancelText ?? "Huỷ",
        resolve,
      });
    });

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {dialog.open && (
        <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center">
          <div className="bg-zinc-900 border border-yellow-500 rounded-xl w-[380px] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-yellow-400 mb-4">
              {dialog.title}
            </h2>

            <div className="text-gray-200 whitespace-pre-wrap mb-6">
              {dialog.message}
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 py-2 rounded bg-gray-700 hover:bg-gray-600"
                onClick={() => {
                  dialog.resolve?.(false);
                  setDialog((d) => ({ ...d, open: false }));
                }}
              >
                {dialog.cancelText}
              </button>

              <button
                className="flex-1 py-2 rounded bg-red-600 hover:bg-red-500"
                onClick={() => {
                  dialog.resolve?.(true);
                  setDialog((d) => ({ ...d, open: false }));
                }}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);

  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");

  return ctx;
}
