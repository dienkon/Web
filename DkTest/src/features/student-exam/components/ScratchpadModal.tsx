import React, { useEffect, useRef, useState } from "react";
import { Question } from "../../../types";
import LatexPreview from "../../exam-builder/editor/LatexPreview";
import {
  X,
  Pencil,
  Eraser,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Check,
  FileText,
  Sliders,
  Sparkles,
  GripVertical,
  Clock,
  Send,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  activeQuestionIdx: number;
  onSelectQuestion: (idx: number) => void;
  answers: Record<string, any>;
  onAnswerChange?: (questionId: string, answer: any) => void;
  timeLeft?: number;
  onSubmitExam?: () => void;
  onScratchpadUpdate?: (dataUrl: string | null) => void;
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
  { name: "Đen", value: "#0f172a" },
  { name: "Xanh dương", value: "#2563eb" },
  { name: "Đỏ", value: "#dc2626" },
  { name: "Xanh lá", value: "#16a34a" },
  { name: "Tím", value: "#9333ea" },
  { name: "Cam", value: "#ea580c" },
];

const STROKE_SIZES = [2, 4, 8, 14];

export default function ScratchpadModal({
  isOpen,
  onClose,
  questions,
  activeQuestionIdx,
  onSelectQuestion,
  answers,
  onAnswerChange,
  timeLeft,
  onSubmitExam,
  onScratchpadUpdate,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState<string>("#2563eb");
  const [size, setSize] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showQuestionPanel, setShowQuestionPanel] = useState(true);

  // Resizable panel width state
  const [panelWidth, setPanelWidth] = useState<number>(360);
  const [isResizing, setIsResizing] = useState(false);

  // Store stroke history per questionId
  const [drawings, setDrawings] = useState<Record<string, Stroke[]>>({});
  const currentStrokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);

  const currentQ = questions[activeQuestionIdx];

  // Resizing handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(220, e.clientX), 650);
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        resizeCanvas();
      }
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Load saved drawings from localStorage when modal opens
  useEffect(() => {
    try {
      const saved = localStorage.getItem("student_exam_scratchpad_drawings");
      if (saved) {
        setDrawings(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  // Save drawings to localStorage
  const saveDrawingsToStorage = (updated: Record<string, Stroke[]>) => {
    setDrawings(updated);
    try {
      localStorage.setItem("student_exam_scratchpad_drawings", JSON.stringify(updated));
    } catch (e) {}
  };

  // Sync currentStrokesRef when activeQuestionIdx changes or drawings update
  useEffect(() => {
    if (!currentQ) return;
    const existingStrokes = drawings[currentQ.id] || [];
    currentStrokesRef.current = existingStrokes;
    redrawCanvas();
  }, [activeQuestionIdx, drawings, currentQ?.id]);

  // Adjust canvas size to parent container with High DPI scaling
  const resizeCanvas = () => {
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
    notifyUpdate();
  };

  useEffect(() => {
    if (!isOpen) return;
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [isOpen, showQuestionPanel, panelWidth]);

  // Redraw canvas from currentStrokesRef
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Draw grid background lines
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 30; y < height; y += 30) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    const strokes = currentStrokesRef.current;
    strokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;

      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = stroke.size;

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    ctx.globalCompositeOperation = "source-over";
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): StrokePoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return null;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pt = getCoordinates(e);
    if (!pt) return;

    setIsDrawing(true);
    const newStroke: Stroke = {
      points: [pt],
      color,
      size,
      isEraser: tool === "eraser",
    };
    activeStrokeRef.current = newStroke;
    currentStrokesRef.current = [...currentStrokesRef.current, newStroke];
    redrawCanvas();
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !activeStrokeRef.current) return;
    e.preventDefault();
    const pt = getCoordinates(e);
    if (!pt) return;

    activeStrokeRef.current.points.push(pt);
    redrawCanvas();
  };


  const notifyUpdate = () => {
    if (onScratchpadUpdate && canvasRef.current) {
      const canvas = canvasRef.current;
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = canvas.width / 2;
      thumbCanvas.height = canvas.height / 2;
      const ctx = thumbCanvas.getContext("2d");
      if (ctx) {
        // Fill white background for jpeg
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
        ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        onScratchpadUpdate(thumbCanvas.toDataURL("image/jpeg", 0.4));
      }
    }
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    activeStrokeRef.current = null;

    if (currentQ) {
      const updated = {
        ...drawings,
        [currentQ.id]: [...currentStrokesRef.current],
      };
      saveDrawingsToStorage(updated);
      notifyUpdate();
    }
  };

  const handleUndo = () => {
    if (currentStrokesRef.current.length === 0) return;
    currentStrokesRef.current.pop();
    redrawCanvas();
    if (currentQ) {
      const updated = {
        ...drawings,
        [currentQ.id]: [...currentStrokesRef.current],
      };
      saveDrawingsToStorage(updated);
    }
  };

  const handleClear = () => {
    currentStrokesRef.current = [];
    redrawCanvas();
    if (currentQ) {
      const updated = {
        ...drawings,
        [currentQ.id]: [],
      };
      saveDrawingsToStorage(updated);
    }
  };

  // Option selection handlers inside Scratchpad
  const handleSelectOption = (optId: string) => {
    if (!currentQ || !onAnswerChange) return;

    if (currentQ.type === "single_choice" || !currentQ.type) {
      onAnswerChange(currentQ.id, optId);
    } else if (currentQ.type === "multiple_choice") {
      const curr: string[] = Array.isArray(answers[currentQ.id]) ? answers[currentQ.id] : [];
      const updated = curr.includes(optId)
        ? curr.filter((id) => id !== optId)
        : [...curr, optId];
      onAnswerChange(currentQ.id, updated);
    }
  };

  const handleToggleStatement = (stmtId: string, val: boolean) => {
    if (!currentQ || !onAnswerChange) return;
    const currMap: Record<string, boolean> =
      typeof answers[currentQ.id] === "object" && !Array.isArray(answers[currentQ.id])
        ? answers[currentQ.id]
        : {};
    const updated = { ...currMap, [stmtId]: val };
    onAnswerChange(currentQ.id, updated);
  };

  const handleShortAnswerChange = (val: string) => {
    if (!currentQ || !onAnswerChange) return;
    onAnswerChange(currentQ.id, val);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen || !currentQ) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Top Action Header */}
      <div className="bg-slate-900 text-white px-4 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
       

        {/* Real-time Timer Counter & Submit Button */}
        {timeLeft !== undefined && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl font-mono text-xs font-bold shadow-xs">
              <Clock className="w-4 h-4 animate-pulse text-blue-400" />
              <span>{formatTime(timeLeft)}</span>
            </div>
            {onSubmitExam && (
              <button
                type="button"
                onClick={onSubmitExam}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-emerald-500/20"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Question Switcher Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectQuestion(Math.max(0, activeQuestionIdx - 1))}
            disabled={activeQuestionIdx === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
            title="Câu trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-800 rounded-lg text-blue-400 border border-slate-700">
            {activeQuestionIdx + 1} / {questions.length}
          </span>

          <button
            type="button"
            onClick={() => onSelectQuestion(Math.min(questions.length - 1, activeQuestionIdx + 1))}
            disabled={activeQuestionIdx === questions.length - 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
            title="Câu tiếp theo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-800 mx-1" />

          {/* Toggle Panel Button */}
          <button
            type="button"
            onClick={() => setShowQuestionPanel(!showQuestionPanel)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              showQuestionPanel
                ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {showQuestionPanel ? "Ẩn đề" : "Hiện đề"}
            </span>
          </button>

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
            title="Đóng bảng vẽ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Drawing Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Resizable Question Reference & Answer Panel */}
        {showQuestionPanel && (
          <div
            style={{ width: `${panelWidth}px` }}
            className="w-full bg-white border-b md:border-b-0 md:border-r border-slate-200 p-4 overflow-y-auto shrink-0 flex flex-col max-h-56 md:max-h-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs">
                Câu {activeQuestionIdx + 1}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Nháp & Chọn đáp án
              </span>
            </div>

            {/* Question Text */}
            <div className="text-slate-900 text-xs sm:text-sm font-semibold leading-relaxed">
              <LatexPreview content={currentQ.text} />
            </div>

            {/* Interactive Options Area */}
            {(currentQ.type === "single_choice" || currentQ.type === "multiple_choice" || !currentQ.type) && currentQ.options && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Chọn đáp án trực tiếp:
                </p>
                {currentQ.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSingle = currentQ.type === "single_choice" || !currentQ.type;
                  const isUserAns = isSingle
                    ? answers[currentQ.id] === opt.id
                    : Array.isArray(answers[currentQ.id]) && answers[currentQ.id].includes(opt.id);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(opt.id)}
                      className={`w-full p-2.5 rounded-xl text-xs border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        isUserAns
                          ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-2xs"
                          : "bg-slate-50/80 border-slate-200 hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded font-black text-[11px] flex items-center justify-center shrink-0 ${
                          isUserAns
                            ? "bg-blue-600 text-white"
                            : "bg-white text-slate-700 border border-slate-300"
                        }`}
                      >
                        {letter}
                      </span>
                      <div className="flex-1 pt-0.5 leading-relaxed">
                        <LatexPreview content={opt.text} />
                      </div>
                      {isUserAns && (
                        <Check className="w-4 h-4 text-blue-600 shrink-0 self-center" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* True/False Statements Interactive */}
            {currentQ.type === "true_false" && currentQ.statements && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Chọn Đúng/Sai trực tiếp:
                </p>
                {currentQ.statements.map((stmt, sIdx) => {
                  const letter = String.fromCharCode(97 + sIdx);
                  const userAnsMap = answers[currentQ.id] || {};
                  const isTrue = userAnsMap[stmt.id] === true;
                  const isFalse = userAnsMap[stmt.id] === false;

                  return (
                    <div
                      key={stmt.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-start gap-1.5 font-medium text-slate-800">
                        <span className="font-bold text-blue-700">{letter})</span>
                        <LatexPreview content={stmt.text} />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleToggleStatement(stmt.id, true)}
                          className={`px-3 py-1 rounded-lg font-bold border text-xs cursor-pointer ${
                            isTrue
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-700 border-slate-300"
                          }`}
                        >
                          ĐÚNG
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatement(stmt.id, false)}
                          className={`px-3 py-1 rounded-lg font-bold border text-xs cursor-pointer ${
                            isFalse
                              ? "bg-red-600 text-white border-red-600"
                              : "bg-white text-slate-700 border-slate-300"
                          }`}
                        >
                          SAI
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Short Answer Interactive */}
            {currentQ.type === "short_answer" && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Nhập câu trả lời:
                </p>
                <input
                  type="text"
                  placeholder="Nhập đáp án..."
                  value={answers[currentQ.id] || ""}
                  onChange={(e) => handleShortAnswerChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Resizable Drag Handle between Question Panel & Canvas */}
        {showQuestionPanel && (
          <div
            onMouseDown={() => setIsResizing(true)}
            className="w-2.5 bg-slate-200 hover:bg-blue-500 active:bg-blue-600 cursor-col-resize hidden md:flex items-center justify-center shrink-0 transition-colors group z-10"
            title="Kéo sang trái/phải để thay đổi kích thước khung câu hỏi"
          >
            <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-white" />
          </div>
        )}

        {/* Canvas Area Container */}
        <div ref={containerRef} className="flex-1 bg-white relative touch-none overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            className="w-full h-full cursor-crosshair touch-none block"
          />

          {/* Floating Canvas Drawing Tools Toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white p-2 sm:p-2.5 rounded-2xl border border-slate-700 shadow-2xl flex items-center gap-2 sm:gap-3 max-w-[95vw] overflow-x-auto">
            {/* Tool Selector: Pen vs Eraser */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTool("pen")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  tool === "pen" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bút vẽ</span>
              </button>

              <button
                type="button"
                onClick={() => setTool("eraser")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  tool === "eraser" ? "bg-amber-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tẩy</span>
              </button>
            </div>

            <div className="w-px h-6 bg-slate-800" />

            {/* Color Palette */}
            {tool === "pen" && (
              <div className="flex items-center gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                      color === c.value
                        ? "border-white scale-125 shadow-md"
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            <div className="w-px h-6 bg-slate-800" />

            {/* Stroke Size Selector */}
            <div className="flex items-center gap-1">
              {STROKE_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`w-7 h-7 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                    size === s
                      ? "bg-slate-700 text-white border border-slate-500"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span
                    className="rounded-full bg-current inline-block"
                    style={{ width: Math.max(4, s), height: Math.max(4, s) }}
                  />
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-slate-800" />

            {/* Undo & Clear Buttons */}
            <button
              type="button"
              onClick={handleUndo}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Hoàn tác nét vẽ"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-red-100 transition-colors cursor-pointer"
              title="Xóa toàn bộ nét vẽ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
