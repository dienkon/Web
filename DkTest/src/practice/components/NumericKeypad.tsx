import React from "react";
import { Delete, CornerDownLeft } from "lucide-react";

interface Props {
  onKeyPress: (key: string) => void;
  onSubmit: () => void;
  onBackspace: () => void;
  onClear: () => void;
  showFractionKey?: boolean;
  showNegativeKey?: boolean;
  disabled?: boolean;
}

export default function NumericKeypad({
  onKeyPress,
  onSubmit,
  onBackspace,
  onClear,
  showFractionKey = false,
  showNegativeKey = true,
  disabled = false,
}: Props) {
  const keys = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
  ];

  return (
    <div className="w-full max-w-sm mx-auto p-2 bg-slate-100/80 backdrop-blur-xs rounded-2xl border border-slate-200 shadow-inner">
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        {keys.map((row) =>
          row.map((k) => (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => onKeyPress(k)}
              className="h-12 text-xl font-semibold bg-white text-slate-800 rounded-xl shadow-xs border border-slate-200/80 active:scale-95 active:bg-blue-50 transition-all flex items-center justify-center select-none"
            >
              {k}
            </button>
          ))
        )}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-4 gap-1.5">
        {showNegativeKey ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onKeyPress("-")}
            className="h-12 text-lg font-semibold bg-slate-200/90 text-slate-700 rounded-xl active:scale-95 transition-all flex items-center justify-center select-none"
          >
            ± / -
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className="h-12 text-xs font-semibold bg-slate-200/90 text-slate-700 rounded-xl active:scale-95 transition-all flex items-center justify-center select-none"
          >
            Xóa hết
          </button>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={() => onKeyPress("0")}
          className="h-12 text-xl font-semibold bg-white text-slate-800 rounded-xl shadow-xs border border-slate-200/80 active:scale-95 active:bg-blue-50 transition-all flex items-center justify-center select-none"
        >
          0
        </button>

        {showFractionKey ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onKeyPress("/")}
            className="h-12 text-lg font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-xl active:scale-95 transition-all flex items-center justify-center select-none"
          >
            /
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onKeyPress(".")}
            className="h-12 text-xl font-bold bg-slate-200/90 text-slate-700 rounded-xl active:scale-95 transition-all flex items-center justify-center select-none"
          >
            .
          </button>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          className="h-12 text-slate-700 bg-rose-50 border border-rose-200 rounded-xl active:scale-95 active:bg-rose-100 text-rose-600 transition-all flex items-center justify-center select-none"
          title="Xóa ký tự vừa nhập"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* Enter Submit Bar */}
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className="w-full mt-2 h-12 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 select-none"
      >
        <span>Xác nhận kết quả</span>
        <CornerDownLeft className="w-4 h-4" />
      </button>
    </div>
  );
}
