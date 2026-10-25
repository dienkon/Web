import React, { useEffect, useRef, useState } from "react";
import { Code, RotateCcw, Download, Check, AlertCircle } from "lucide-react";
import { renderBBTToHtml } from "./bbtRenderer";
import { renderGraphToSvg } from "./graphRenderer";
import { executeLiveCanvasCode } from "./liveCanvasRunner";

interface Props {
  type: "graph" | "bbt" | "canvas";
  content: string;
  width?: number;
  height?: number;
  title?: string;
}

export default function MathDrawBlock({
  type,
  content,
  width = 500,
  height = 340,
  title,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Execution for live-canvas runner
  const runCode = () => {
    if (type !== "canvas" || !canvasRef.current) return;
    setError(null);
    const result = executeLiveCanvasCode(canvasRef.current, content, width, height);
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  useEffect(() => {
    if (type === "canvas") {
      runCode();
    }
  }, [type, content, width, height]);

  const handleDownload = () => {
    if (type === "canvas" && canvasRef.current) {
      const url = canvasRef.current.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `math-drawing-${Date.now()}.png`;
      a.click();
    }
  };

  const handleCopyCode = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(content)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          setCopied(false);
        });
    }
  };

  if (type === "bbt") {
    const html = renderBBTToHtml(content);
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if (type === "graph") {
    const svg = renderGraphToSvg(content);
    return <div dangerouslySetInnerHTML={{ __html: svg }} />;
  }

  // Live Canvas Runner Block
  return (
    <div className="dk-live-canvas-block my-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs max-w-full overflow-hidden select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-800">
            {title || "Khối Code Trực Tiếp (Live Canvas)"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
            title="Xem / Ẩn mã nguồn"
          >
            <Code className="w-3.5 h-3.5" />
            <span>{showCode ? "Ẩn code" : "Xem code"}</span>
          </button>

          <button
            type="button"
            onClick={runCode}
            className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
            title="Chạy lại code"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Chạy lại</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Tải ảnh PNG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Lỗi thực thi: {error}</span>
        </div>
      )}

      <div className="flex justify-center overflow-x-auto bg-slate-50/50 rounded-xl p-2">
        <canvas
          ref={canvasRef}
          className="rounded-lg shadow-2xs bg-white"
          style={{ maxWidth: "100%", height: "auto", display: "block", margin: "0 auto" }}
        />
      </div>

      {showCode && (
        <div className="mt-3 relative rounded-xl bg-slate-900 p-3 text-slate-100 font-mono text-xs">
          <button
            type="button"
            onClick={handleCopyCode}
            className="absolute right-2 top-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Code className="w-3 h-3" />}
            <span>{copied ? "Đã chép" : "Sao chép"}</span>
          </button>
          <pre className="overflow-x-auto pr-16">{content}</pre>
        </div>
      )}
    </div>
  );
}
