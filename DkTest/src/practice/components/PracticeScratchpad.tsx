import React, { useEffect, useRef, useState } from "react";
import { X, Pencil, Eraser, RotateCcw, RotateCw, ImagePlus, Trash2, Maximize2, Minimize2, Move, Plus, ChevronUp } from "lucide-react";

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
  imageSrc?: string;
  imageX?: number;
  imageY?: number;
  imageW?: number;
  imageH?: number;
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

  const [tool, setTool] = useState<"pen" | "eraser" | "move">("pen");
  const [color, setColor] = useState<string>("#2563eb");
  const [size, setSize] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showBrushSettings, setShowBrushSettings] = useState(false);
  const [extraHeight, setExtraHeight] = useState(0);

  // Selected image and transform states for Move / Transform tool
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const isTransformingRef = useRef<"move" | "tl" | "tr" | "bl" | "br" | null>(null);
  const transformStartPosRef = useRef<StrokePoint | null>(null);
  const initialImageBoundsRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

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
  const redoStrokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const imageElementsCache = useRef<Record<string, HTMLImageElement>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Redraw canvas whenever strokes change
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes = currentStrokesRef.current;
    for (let i = 0; i < allStrokes.length; i++) {
      const stroke = allStrokes[i];
      if (stroke.imageSrc) {
        let img = imageElementsCache.current[stroke.imageSrc];
        if (!img) {
          img = new Image();
          img.src = stroke.imageSrc;
          imageElementsCache.current[stroke.imageSrc] = img;
          img.onload = () => redrawCanvas();
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(
            img,
            stroke.imageX ?? 40,
            stroke.imageY ?? 40,
            stroke.imageW ?? 300,
            stroke.imageH ?? 200
          );
        }
        continue;
      }

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
      for (let j = 1; j < stroke.points.length; j++) {
        ctx.lineTo(stroke.points[j].x, stroke.points[j].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw selection outline and transform handles when tool === "move"
    if (tool === "move" && selectedImageIndex !== null) {
      const selStroke = allStrokes[selectedImageIndex];
      if (selStroke && selStroke.imageSrc) {
        const sx = selStroke.imageX ?? 40;
        const sy = selStroke.imageY ?? 40;
        const sw = selStroke.imageW ?? 300;
        const sh = selStroke.imageH ?? 200;

        ctx.save();
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(sx, sy, sw, sh);

        ctx.setLineDash([]);
        const handles = [
          { x: sx, y: sy },
          { x: sx + sw, y: sy },
          { x: sx, y: sy + sh },
          { x: sx + sw, y: sy + sh },
        ];
        handles.forEach((h) => {
          ctx.beginPath();
          ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.strokeStyle = "#2563eb";
          ctx.lineWidth = 2.5;
          ctx.stroke();
        });
        ctx.restore();
      }
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
      const totalH = Math.max(rect.height, rect.height + extraHeight);

      canvas.width = rect.width * dpr;
      canvas.height = totalH * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${totalH}px`;

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
  }, [isOpen, isFullScreen, extraHeight]);

  // Persist strokes
  useEffect(() => {
    try {
      localStorage.setItem("practice_scratchpad_strokes", JSON.stringify(strokes));
    } catch {
      // ignore
    }
  }, [strokes]);

  if (!isOpen) return null;

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): StrokePoint => {
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
    const coords = getCanvasCoords(e);

    if (tool === "move") {
      const allStrokes = currentStrokesRef.current;
      // 1. Check handle hit if an image is already selected
      if (selectedImageIndex !== null) {
        const selStroke = allStrokes[selectedImageIndex];
        if (selStroke && selStroke.imageSrc) {
          const sx = selStroke.imageX ?? 40;
          const sy = selStroke.imageY ?? 40;
          const sw = selStroke.imageW ?? 300;
          const sh = selStroke.imageH ?? 200;
          const R = 14;

          let handleHit: "tl" | "tr" | "bl" | "br" | null = null;
          if (Math.hypot(coords.x - sx, coords.y - sy) <= R) handleHit = "tl";
          else if (Math.hypot(coords.x - (sx + sw), coords.y - sy) <= R) handleHit = "tr";
          else if (Math.hypot(coords.x - sx, coords.y - (sy + sh)) <= R) handleHit = "bl";
          else if (Math.hypot(coords.x - (sx + sw), coords.y - (sy + sh)) <= R) handleHit = "br";

          if (handleHit) {
            isTransformingRef.current = handleHit;
            transformStartPosRef.current = coords;
            initialImageBoundsRef.current = { x: sx, y: sy, w: sw, h: sh };
            return;
          }
        }
      }

      // 2. Check hit inside any image
      let hitIdx: number | null = null;
      for (let i = allStrokes.length - 1; i >= 0; i--) {
        const s = allStrokes[i];
        if (s.imageSrc) {
          const sx = s.imageX ?? 40;
          const sy = s.imageY ?? 40;
          const sw = s.imageW ?? 300;
          const sh = s.imageH ?? 200;
          if (coords.x >= sx && coords.x <= sx + sw && coords.y >= sy && coords.y <= sy + sh) {
            hitIdx = i;
            break;
          }
        }
      }

      if (hitIdx !== null) {
        setSelectedImageIndex(hitIdx);
        isTransformingRef.current = "move";
        transformStartPosRef.current = coords;
        const s = allStrokes[hitIdx];
        initialImageBoundsRef.current = {
          x: s.imageX ?? 40,
          y: s.imageY ?? 40,
          w: s.imageW ?? 300,
          h: s.imageH ?? 200,
        };
      } else {
        setSelectedImageIndex(null);
      }
      redrawCanvas();
      return;
    }

    setIsDrawing(true);
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
    const coords = getCanvasCoords(e);

    if (tool === "move") {
      if (
        isTransformingRef.current &&
        transformStartPosRef.current &&
        initialImageBoundsRef.current &&
        selectedImageIndex !== null
      ) {
        const dx = coords.x - transformStartPosRef.current.x;
        const dy = coords.y - transformStartPosRef.current.y;
        const init = initialImageBoundsRef.current;
        const st = currentStrokesRef.current[selectedImageIndex];
        if (!st) return;

        if (isTransformingRef.current === "move") {
          st.imageX = Math.round(init.x + dx);
          st.imageY = Math.round(init.y + dy);
        } else if (isTransformingRef.current === "br") {
          st.imageW = Math.max(50, Math.round(init.w + dx));
          st.imageH = Math.max(40, Math.round(init.h + dy));
        } else if (isTransformingRef.current === "bl") {
          const newW = Math.max(50, Math.round(init.w - dx));
          st.imageX = Math.round(init.x + (init.w - newW));
          st.imageW = newW;
          st.imageH = Math.max(40, Math.round(init.h + dy));
        } else if (isTransformingRef.current === "tr") {
          const newH = Math.max(40, Math.round(init.h - dy));
          st.imageY = Math.round(init.y + (init.h - newH));
          st.imageW = Math.max(50, Math.round(init.w + dx));
          st.imageH = newH;
        } else if (isTransformingRef.current === "tl") {
          const newW = Math.max(50, Math.round(init.w - dx));
          const newH = Math.max(40, Math.round(init.h - dy));
          st.imageX = Math.round(init.x + (init.w - newW));
          st.imageY = Math.round(init.y + (init.h - newH));
          st.imageW = newW;
          st.imageH = newH;
        }
        redrawCanvas();
      }
      return;
    }

    if (!isDrawing || !activeStrokeRef.current) return;
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
    if (tool === "move") {
      if (isTransformingRef.current) {
        isTransformingRef.current = null;
        transformStartPosRef.current = null;
        initialImageBoundsRef.current = null;
        setStrokes([...currentStrokesRef.current]);
      }
      return;
    }

    if (!isDrawing || !activeStrokeRef.current) return;
    setIsDrawing(false);
    redoStrokesRef.current = [];
    setStrokes((prev) => [...prev, activeStrokeRef.current!]);
    activeStrokeRef.current = null;
  };

  const handleDeleteSelectedImage = () => {
    if (selectedImageIndex === null) return;
    const target = currentStrokesRef.current[selectedImageIndex];
    if (target) {
      redoStrokesRef.current.push(target);
      currentStrokesRef.current.splice(selectedImageIndex, 1);
      setSelectedImageIndex(null);
      setStrokes([...currentStrokesRef.current]);
      redrawCanvas();
    }
  };

  const handleExpandScratchpad = () => {
    setExtraHeight((prev) => prev + 600);
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  const handleUndo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const popped = prev[prev.length - 1];
      redoStrokesRef.current.push(popped);
      const next = prev.slice(0, prev.length - 1);
      currentStrokesRef.current = next;
      setTimeout(redrawCanvas, 0);
      return next;
    });
  };

  const handleRedo = () => {
    if (redoStrokesRef.current.length === 0) return;
    const restored = redoStrokesRef.current.pop();
    if (!restored) return;
    setStrokes((prev) => {
      const next = [...prev, restored];
      currentStrokesRef.current = next;
      setTimeout(redrawCanvas, 0);
      return next;
    });
  };

  const pasteImageToCanvas = (dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const canvasW = canvas.width / dpr;
    const canvasH = canvas.height / dpr;

    const tempImg = new Image();
    tempImg.onload = () => {
      let w = tempImg.naturalWidth;
      let h = tempImg.naturalHeight;
      const maxW = Math.min(canvasW * 0.75, 450);
      const maxH = Math.min(canvasH * 0.75, 350);

      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const x = Math.max(20, Math.round((canvasW - w) / 2));
      const y = Math.max(20, Math.round((canvasH - h) / 2));

      const imageStroke: Stroke = {
        points: [],
        color: "transparent",
        size: 0,
        isEraser: false,
        imageSrc: dataUrl,
        imageX: x,
        imageY: y,
        imageW: w,
        imageH: h,
      };

      redoStrokesRef.current = [];
      imageElementsCache.current[dataUrl] = tempImg;
      setStrokes((prev) => {
        const next = [...prev, imageStroke];
        currentStrokesRef.current = next;
        setTimeout(redrawCanvas, 0);
        return next;
      });
    };
    tempImg.src = dataUrl;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        pasteImageToCanvas(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Keyboard shortcut listener for Ctrl+Z (Undo), Ctrl+Y (Redo), and Ctrl+V (Paste Image)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        handleRedo();
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              if (dataUrl) {
                pasteImageToCanvas(dataUrl);
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("paste", handlePaste);
    };
  }, [isOpen]);

  const handleClear = () => {
    redoStrokesRef.current = [];
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
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white border-b border-slate-200 text-xs sm:text-sm shrink-0">
          {/* Tools Selector: Pen, Eraser, Move */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setTool("pen");
                  setSelectedImageIndex(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  tool === "pen" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Bút vẽ"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Bút</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTool("eraser");
                  setSelectedImageIndex(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  tool === "eraser" ? "bg-white text-amber-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Tẩy nét vẽ"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Tẩy</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTool("move");
                  setShowBrushSettings(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  tool === "move" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Di chuyển & phóng to/thu nhỏ ảnh dán (Kéo rê hoặc kéo 4 góc)"
              >
                <Move className="w-3.5 h-3.5" />
                <span>Di chuyển</span>
              </button>
            </div>

            {/* Compact Color & Size Capsule Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBrushSettings(!showBrushSettings)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                  showBrushSettings
                    ? "bg-blue-50 border-blue-400 text-blue-700 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
                title="Chọn màu & kích cỡ bút (Bấm để sổ dọc lên)"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono text-xs">{size}px</span>
                <ChevronUp
                  className={`w-3.5 h-3.5 transition-transform ${
                    showBrushSettings ? "rotate-180 text-blue-600" : "text-slate-400"
                  }`}
                />
              </button>

              {/* Vertical Popover upward */}
              {showBrushSettings && (
                <div className="absolute top-full mt-2 left-0 sm:left-auto bg-white border border-slate-200 rounded-xl p-3 shadow-xl flex flex-col gap-3 min-w-[220px] z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Color Palette */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Màu nét bút</span>
                      <span className="text-[9px] text-blue-600 font-mono">
                        {COLOR_PALETTE.find((c) => c.value === color)?.name || color}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {COLOR_PALETTE.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => {
                            setColor(c.value);
                            setTool("pen");
                          }}
                          style={{ backgroundColor: c.value }}
                          className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                            color === c.value && tool === "pen"
                              ? "border-blue-600 scale-110 ring-2 ring-blue-300 shadow-sm"
                              : "border-transparent opacity-85 hover:opacity-100 hover:scale-105"
                          }`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Stroke Size Selector */}
                  <div className="border-t border-slate-100 pt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Cỡ nét vẽ
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {STROKE_SIZES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSize(s)}
                          className={`py-1.5 px-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                            size === s
                              ? "bg-blue-600 text-white font-bold shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                          title={`Cỡ nét ${s}px`}
                        >
                          <span
                            className="rounded-full bg-current inline-block"
                            style={{ width: Math.max(3, s), height: Math.max(3, s) }}
                          />
                          <span className="text-[10px] font-mono">{s}px</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hidden File Input for Image Upload / Paste fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs font-semibold cursor-pointer"
              title="Hoàn tác (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hoàn tác</span>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStrokesRef.current.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs font-semibold cursor-pointer"
              title="Làm lại (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Làm lại</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-semibold cursor-pointer"
              title="Dán hoặc tải ảnh vào nháp (Ctrl+V)"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dán ảnh</span>
            </button>

            {/* Delete selected image */}
            {tool === "move" && selectedImageIndex !== null && (
              <button
                type="button"
                onClick={handleDeleteSelectedImage}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors text-xs font-semibold cursor-pointer"
                title="Xóa ảnh đang chọn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xóa ảnh</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs font-semibold cursor-pointer"
              title="Xóa toàn bộ nháp"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xóa hết</span>
            </button>

            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {/* Expand Scratchpad Area (+600px Height & Scroll) */}
            <button
              type="button"
              onClick={handleExpandScratchpad}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors text-xs font-semibold cursor-pointer shadow-xs"
              title="Cuộn mở rộng thêm 600px diện tích nháp mới"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thêm chỗ nháp</span>
            </button>
          </div>
        </div>

        {/* Canvas area with grid background and vertical scrollability */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-white overflow-y-auto overflow-x-hidden select-none touch-none"
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
            className={`block touch-none ${
              tool === "move" ? "cursor-move" : tool === "eraser" ? "cursor-cell" : "cursor-crosshair"
            }`}
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
