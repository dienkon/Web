import React, { useEffect, useRef, useState } from "react";
import { X, Pencil, Eraser, RotateCcw, Trash2, Maximize2, Minimize2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  isInline?: boolean;
}

interface StrokePoint {
  x: number;
  y: number;
}

interface Stroke {
  points: StrokePoint[];
  color: string;
  size: number;
  isEraser: boolean;
}

const COLOR_PALETTE = [
  { name: "Xanh dương", value: "#2563eb" },
  { name: "Đen", value: "#0f172a" },
  { name: "Đỏ", value: "#dc2626" },
  { name: "Xanh lá", value: "#16a34a" },
  { name: "Tím", value: "#9333ea" },
  { name: "Cam", value: "#ea580c" },
];

const STROKE_SIZES = [2, 4, 8, 14];

export default function PracticeScratchpad({ isOpen, onClose, title = "Bảng nháp tính toán", isInline = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState<string>("#2563eb");
  const [size, setSize] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [strokes, setStrokes] = useState<Stroke[]>(() => {
    try {
      const saved = localStorage.getItem("practice_scratchpad_strokes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const currentStrokesRef = useRef<Stroke[]>(strokes);
  currentStrokesRef.current = strokes;
  const activeStrokeRef = useRef<Stroke | null>(null);

  // Redraw canvas whenever strokes change
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes = currentStrokesRef.current;
    for (const stroke of allStrokes) {
      if (stroke.points.length === 0) continue;

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = stroke.isEraser ? "#ffffff" : stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  };

  // Adjust canvas size
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      redrawCanvas();
    };

    const timer = setTimeout(handleResize, 50);
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, isFullScreen]);

  // Persist strokes
  useEffect(() => {
    try {
      localStorage.setItem("practice_scratchpad_strokes", JSON.stringify(strokes));
    } catch {
      // ignore
    }
  }, [strokes]);

  if (!isOpen) return null;

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    const newStroke: Stroke = {
      points: [coords],
      color,
      size,
      isEraser: tool === "eraser",
    };
    activeStrokeRef.current = newStroke;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = tool === "eraser" ? "#ffffff" : color;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    }
    ctx.arc(coords.x, coords.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handleMoveDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeStrokeRef.current) return;
    const coords = getCanvasCoords(e);
    activeStrokeRef.current.points.push(coords);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pts = activeStrokeRef.current.points;
    if (pts.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.restore();
  };

  const handleEndDraw = () => {
    if (!isDrawing || !activeStrokeRef.current) return;
    setIsDrawing(false);
    setStrokes((prev) => [...prev, activeStrokeRef.current!]);
    activeStrokeRef.current = null;
  };

  const handleUndo = () => {
    setStrokes((prev) => {
      const next = prev.slice(0, prev.length - 1);
      currentStrokesRef.current = next;
      setTimeout(redrawCanvas, 0);
      return next;
    });
  };

  const handleClear = () => {
    setStrokes([]);
    currentStrokesRef.current = [];
    redrawCanvas();
  };

  const content = (
    <div
      className={`flex flex-col bg-white overflow-hidden transition-all duration-200 ${
        isInline ? "w-full h-full" : isFullScreen ? "w-full h-full rounded-2xl shadow-2xl border border-slate-200" : "w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl border border-slate-200"
      }`}
    >
      {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm sm:text-base">{title}</h3>
              <p className="text-xs text-slate-500">Viết vẽ, đặt tính, nháp công thức trực tiếp trên màn hình</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isInline && (
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                title={isFullScreen ? "Thu nhỏ" : "Toàn màn hình"}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Đóng bảng nháp"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-slate-200 text-xs sm:text-sm">
          {/* Tools & Colors */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setTool("pen")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  tool === "pen" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Bút</span>
              </button>
              <button
                onClick={() => setTool("eraser")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  tool === "eraser" ? "bg-white text-rose-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Tẩy</span>
              </button>
            </div>

            {/* Colors */}
            {tool === "pen" && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c.value ? "scale-125 ring-2 ring-blue-500 ring-offset-1" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Sizes */}
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
              {STROKE_SIZES.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setSize(sz)}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                    size === sz ? "bg-blue-100 text-blue-700 font-bold" : "text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{ width: Math.max(3, sz), height: Math.max(3, sz) }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hoàn tác</span>
            </button>
            <button
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa sạch</span>
            </button>
          </div>
        </div>

        {/* Canvas area with grid background */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-white cursor-crosshair overflow-hidden select-none touch-none"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleStartDraw}
            onMouseMove={handleMoveDraw}
            onMouseUp={handleEndDraw}
            onMouseLeave={handleEndDraw}
            onTouchStart={handleStartDraw}
            onTouchMove={handleMoveDraw}
            onTouchEnd={handleEndDraw}
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4">
      {content}
    </div>
  );
}
