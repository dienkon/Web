import React from "react";
import { Loader2 } from "lucide-react";

export function PageLoadingFallback({ label = "Đang tải dữ liệu..." }: { label?: string }) {
  return (
    <div className="min-h-[40vh] w-full flex flex-col items-center justify-center p-6 select-none">
      <div className="relative flex items-center justify-center mb-3">
        <div className="w-10 h-10 rounded-full border-2 border-blue-100 animate-ping absolute opacity-40" />
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
      <p className="text-xs font-semibold text-slate-500 tracking-wide">{label}</p>
    </div>
  );
}
