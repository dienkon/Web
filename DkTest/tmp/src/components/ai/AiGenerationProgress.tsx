import React, { useEffect, useRef } from "react";
import { Terminal, CheckCircle2, AlertTriangle, AlertCircle, Info, Loader2, Sparkles } from "lucide-react";

export interface AiLogItem {
  id: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
}

interface Props {
  isProcessing: boolean;
  progressPercent: number;
  currentMessage: string;
  logs: AiLogItem[];
  title?: string;
}

export default function AiGenerationProgress({
  isProcessing,
  progressPercent,
  currentMessage,
  logs,
  title = "Tiến trình xử lý AI & Nhận diện LaTeX",
}: Props) {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (!isProcessing && logs.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl text-slate-100 space-y-4 animate-in fade-in duration-300">
      {/* Header with Title & Percent */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              {title}
            </h4>
            <p className="text-[11px] text-slate-400 font-mono line-clamp-1">
              {currentMessage || "Đang kết nối mô hình trí tuệ nhân tạo..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-sm sm:text-base font-extrabold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/40">
            {Math.min(100, Math.max(0, progressPercent))}%
          </span>
        </div>
      </div>

      {/* Glowing Progress Bar */}
      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 border border-slate-700/60 relative">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(59,130,246,0.6)]"
          style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
        />
      </div>

      {/* Terminal Logs Window */}
      <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-3 sm:p-4 font-mono text-[11px] sm:text-xs max-h-56 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <div className="flex items-center gap-2 text-slate-500 pb-2 border-b border-slate-800/80 text-[10px] uppercase font-bold tracking-wider">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span>Nhật ký thời gian thực (Real-time Live Logs)</span>
        </div>

        {logs.length === 0 ? (
          <div className="text-slate-500 italic py-2 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
            <span>Đang chuẩn bị luồng dữ liệu...</span>
          </div>
        ) : (
          logs.map((log) => {
            let Icon = Info;
            let iconColor = "text-blue-400";
            let textColor = "text-slate-300";

            if (log.level === "success") {
              Icon = CheckCircle2;
              iconColor = "text-emerald-400";
              textColor = "text-emerald-300";
            } else if (log.level === "warning") {
              Icon = AlertTriangle;
              iconColor = "text-amber-400";
              textColor = "text-amber-300";
            } else if (log.level === "error") {
              Icon = AlertCircle;
              iconColor = "text-rose-400";
              textColor = "text-rose-300";
            }

            return (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed animate-in fade-in">
                <span className="text-slate-500 select-none shrink-0 font-mono text-[10px] pt-0.5">
                  [{log.timestamp}]
                </span>
                <Icon className={`w-3.5 h-3.5 ${iconColor} shrink-0 mt-0.5`} />
                <span className={`flex-1 break-words ${textColor}`}>{log.message}</span>
              </div>
            );
          })
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-blue-400/80 pt-1 text-[11px] italic">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>AI đang tính toán & nhận diện...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
