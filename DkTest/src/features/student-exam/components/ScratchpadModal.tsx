import React, { useEffect, useRef, useState } from "react";
import { Question } from "../../../types";
import LatexPreview from "../../exam-builder/editor/LatexPreview";
import InteractiveMatchingBoard from "../../../components/exam/InteractiveMatchingBoard";
import InteractiveFillBlankText from "../../../components/exam/InteractiveFillBlankText";
import {
  X,
  Pencil,
  Eraser,
  RotateCcw,
  RotateCw,
  ImagePlus,
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
  ChevronUp,
  ChevronDown,
  Move,
  Plus,
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
  imageSrc?: string;
  imageX?: number;
  imageY?: number;
  imageW?: number;
  imageH?: number;
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

  const [tool, setTool] = useState<"pen" | "eraser" | "move">("pen");
  const [color, setColor] = useState<string>("#2563eb");
  const [size, setSize] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showQuestionPanel, setShowQuestionPanel] = useState(true);
  const [showBrushSettings, setShowBrushSettings] = useState(false);
  const [extraHeight, setExtraHeight] = useState<number>(0);

  // Selected image and transform states for Move / Transform tool
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const isTransformingRef = useRef<"move" | "tl" | "tr" | "bl" | "br" | null>(null);
  const transformStartPosRef = useRef<StrokePoint | null>(null);
  const initialImageBoundsRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Resizable panel width state
  const [panelWidth, setPanelWidth] = useState<number>(460);
  const [isResizing, setIsResizing] = useState(false);

  // Store stroke history per questionId
  const [drawings, setDrawings] = useState<Record<string, Stroke[]>>({});
  const currentStrokesRef = useRef<Stroke[]>([]);
  const redoStrokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const imageElementsCache = useRef<Record<string, HTMLImageElement>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentQ = questions[activeQuestionIdx];

  // Resizing handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(260, e.clientX), 750);
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
  // Adjust canvas size to parent container with High DPI scaling and extra height expansion
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const totalHeight = Math.max(rect.height, rect.height + extraHeight);

    canvas.width = rect.width * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${totalHeight}px`;

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
  }, [isOpen, showQuestionPanel, panelWidth, extraHeight]);

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
      // Draw pasted/uploaded image stroke
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
        return;
      }

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

    // Draw selection outline and transform handles when tool === "move"
    if (tool === "move" && selectedImageIndex !== null) {
      const selectedStroke = strokes[selectedImageIndex];
      if (selectedStroke && selectedStroke.imageSrc) {
        const sx = selectedStroke.imageX ?? 40;
        const sy = selectedStroke.imageY ?? 40;
        const sw = selectedStroke.imageW ?? 300;
        const sh = selectedStroke.imageH ?? 200;

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

    if (tool === "move") {
      const strokes = currentStrokesRef.current;
      // 1. Check if clicked a handle on the currently selected image
      if (selectedImageIndex !== null) {
        const selStroke = strokes[selectedImageIndex];
        if (selStroke && selStroke.imageSrc) {
          const sx = selStroke.imageX ?? 40;
          const sy = selStroke.imageY ?? 40;
          const sw = selStroke.imageW ?? 300;
          const sh = selStroke.imageH ?? 200;
          const R = 14;

          let handleHit: "tl" | "tr" | "bl" | "br" | null = null;
          if (Math.hypot(pt.x - sx, pt.y - sy) <= R) handleHit = "tl";
          else if (Math.hypot(pt.x - (sx + sw), pt.y - sy) <= R) handleHit = "tr";
          else if (Math.hypot(pt.x - sx, pt.y - (sy + sh)) <= R) handleHit = "bl";
          else if (Math.hypot(pt.x - (sx + sw), pt.y - (sy + sh)) <= R) handleHit = "br";

          if (handleHit) {
            isTransformingRef.current = handleHit;
            transformStartPosRef.current = pt;
            initialImageBoundsRef.current = { x: sx, y: sy, w: sw, h: sh };
            return;
          }
        }
      }

      // 2. Check if clicked on any image to select and drag
      let hitIdx: number | null = null;
      for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i];
        if (s.imageSrc) {
          const sx = s.imageX ?? 40;
          const sy = s.imageY ?? 40;
          const sw = s.imageW ?? 300;
          const sh = s.imageH ?? 200;
          if (pt.x >= sx && pt.x <= sx + sw && pt.y >= sy && pt.y <= sy + sh) {
            hitIdx = i;
            break;
          }
        }
      }

      if (hitIdx !== null) {
        setSelectedImageIndex(hitIdx);
        isTransformingRef.current = "move";
        transformStartPosRef.current = pt;
        const s = strokes[hitIdx];
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

    // Normal drawing / eraser
    setIsDrawing(true);
    redoStrokesRef.current = [];
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
    e.preventDefault();
    const pt = getCoordinates(e);
    if (!pt) return;

    if (tool === "move") {
      if (
        isTransformingRef.current &&
        transformStartPosRef.current &&
        initialImageBoundsRef.current &&
        selectedImageIndex !== null
      ) {
        const dx = pt.x - transformStartPosRef.current.x;
        const dy = pt.y - transformStartPosRef.current.y;
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
    activeStrokeRef.current.points.push(pt);
    redrawCanvas();
  };

  const notifyUpdate = () => {
    if (onScratchpadUpdate && canvasRef.current) {
      const canvas = canvasRef.current;
      const thumbCanvas = document.createElement("canvas");
      // Scale appropriately for fast real-time sync while maintaining high legibility
      thumbCanvas.width = Math.min(canvas.width, 1000);
      thumbCanvas.height = Math.min(canvas.height, 700);
      const ctx = thumbCanvas.getContext("2d");
      if (ctx) {
        // Fill white background for clean visibility
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
        ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        onScratchpadUpdate(thumbCanvas.toDataURL("image/jpeg", 0.6));
      }
    }
  };

  const handleEnd = () => {
    if (tool === "move") {
      if (isTransformingRef.current) {
        isTransformingRef.current = null;
        transformStartPosRef.current = null;
        initialImageBoundsRef.current = null;
        if (currentQ) {
          const updated = {
            ...drawings,
            [currentQ.id]: [...currentStrokesRef.current],
          };
          saveDrawingsToStorage(updated);
          notifyUpdate();
        }
      }
      return;
    }

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

  const handleDeleteSelectedImage = () => {
    if (selectedImageIndex === null) return;
    const target = currentStrokesRef.current[selectedImageIndex];
    if (target) {
      redoStrokesRef.current.push(target);
      currentStrokesRef.current.splice(selectedImageIndex, 1);
      setSelectedImageIndex(null);
      redrawCanvas();
      if (currentQ) {
        saveDrawingsToStorage({
          ...drawings,
          [currentQ.id]: [...currentStrokesRef.current],
        });
        notifyUpdate();
      }
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
    if (currentStrokesRef.current.length === 0) return;
    const popped = currentStrokesRef.current.pop();
    if (popped) {
      redoStrokesRef.current.push(popped);
    }
    redrawCanvas();
    if (currentQ) {
      const updated = {
        ...drawings,
        [currentQ.id]: [...currentStrokesRef.current],
      };
      saveDrawingsToStorage(updated);
      notifyUpdate();
    }
  };

  const handleRedo = () => {
    if (redoStrokesRef.current.length === 0) return;
    const restored = redoStrokesRef.current.pop();
    if (restored) {
      currentStrokesRef.current.push(restored);
    }
    redrawCanvas();
    if (currentQ) {
      const updated = {
        ...drawings,
        [currentQ.id]: [...currentStrokesRef.current],
      };
      saveDrawingsToStorage(updated);
      notifyUpdate();
    }
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
      currentStrokesRef.current = [...currentStrokesRef.current, imageStroke];
      imageElementsCache.current[dataUrl] = tempImg;
      const newIdx = currentStrokesRef.current.length - 1;
      setSelectedImageIndex(newIdx);
      setTool("move");
      redrawCanvas();

      if (currentQ) {
        const updated = {
          ...drawings,
          [currentQ.id]: [...currentStrokesRef.current],
        };
        saveDrawingsToStorage(updated);
        notifyUpdate();
      }
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

  // Keyboard shortcut listener for Ctrl+Z (Undo), Ctrl+Y (Redo), and Ctrl+V (Paste Image) & Delete image
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedImageIndex !== null && tool === "move") {
        e.preventDefault();
        handleDeleteSelectedImage();
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
  }, [isOpen, currentQ?.id]);

  const handleClear = () => {
    redoStrokesRef.current = [];
    currentStrokesRef.current = [];
    redrawCanvas();
    if (currentQ) {
      const updated = {
        ...drawings,
        [currentQ.id]: [],
      };
      saveDrawingsToStorage(updated);
      notifyUpdate();
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

  const handleMoveOrderingItem = (index: number, direction: "up" | "down") => {
    if (!currentQ || !onAnswerChange) return;
    const items = currentQ.orderingItems || [];
    const currentOrder: string[] =
      Array.isArray(answers[currentQ.id]) && answers[currentQ.id].length === items.length
        ? answers[currentQ.id]
        : items.map((it) => it.id);

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const newOrder = [...currentOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    onAnswerChange(currentQ.id, newOrder);
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
            {questions.length === 1 && currentQ.order ? `Câu ${currentQ.order}` : `${activeQuestionIdx + 1} / ${questions.length}`}
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
                Câu {currentQ.order || (activeQuestionIdx + 1)}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Nháp & Chọn đáp án
              </span>
            </div>

            {/* Question Text */}
            <div className="text-slate-900 text-xs sm:text-sm font-semibold leading-relaxed">
              {currentQ.type === "fill_blank" || currentQ.text?.includes("[_]") || currentQ.text?.includes("[blank]") ? (
                <InteractiveFillBlankText
                  content={currentQ.text}
                  answers={typeof answers[currentQ.id] === "object" && answers[currentQ.id] ? answers[currentQ.id] : {}}
                  acceptedAnswersPerBlank={currentQ.acceptedAnswersPerBlank}
                  caseSensitive={currentQ.caseSensitive}
                  trimWhitespace={currentQ.trimWhitespace}
                  onAnswerChange={(bIdx, val) => {
                    const currentMap = typeof answers[currentQ.id] === "object" && answers[currentQ.id] ? answers[currentQ.id] : {};
                    const nextMap = { ...currentMap, [bIdx]: val };
                    if (onAnswerChange) onAnswerChange(currentQ.id, nextMap);
                  }}
                />
              ) : (
                <LatexPreview content={currentQ.text} />
              )}
            </div>

            {/* Question Image if present */}
            {currentQ.imageUrl && (
              <div className="pt-2">
                <img
                  src={currentQ.imageUrl}
                  alt="Ảnh câu hỏi"
                  className="max-h-48 rounded-xl border border-slate-200 object-contain mx-auto"
                />
              </div>
            )}

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

            {/* Ordering (Sắp xếp thứ tự) Interactive */}
            {currentQ.type === "ordering" && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Dùng mũi tên để sắp xếp theo đúng thứ tự logic:
                </p>
                {(() => {
                  const items = currentQ.orderingItems || [];
                  const currentOrder: string[] =
                    Array.isArray(answers[currentQ.id]) && answers[currentQ.id].length === items.length
                      ? answers[currentQ.id]
                      : items.map((it) => it.id);

                  return (
                    <div className="space-y-1.5">
                      {currentOrder.map((itemId, idx) => {
                        const item = items.find((it) => it.id === itemId);
                        return (
                          <div
                            key={itemId}
                            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 hover:border-blue-300 transition-all text-xs"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="w-5 h-5 rounded-lg bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="text-slate-800 font-medium flex-1">
                                <LatexPreview content={item?.text || ""} />
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveOrderingItem(idx, "up")}
                                disabled={idx === 0}
                                className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                title="Di chuyển lên"
                              >
                                <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveOrderingItem(idx, "down")}
                                disabled={idx === currentOrder.length - 1}
                                className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                title="Di chuyển xuống"
                              >
                                <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Fill Blank Interactive */}
            {currentQ.type === "fill_blank" && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Điền vào các chỗ trống:
                </p>
                {(() => {
                  const totalBlanks = Math.max(
                    Object.keys(currentQ.acceptedAnswersPerBlank || {}).length,
                    (currentQ.text?.match(/\[_\]|\[blank\]/gi) || []).length
                  );
                  const userAnswersMap = (answers[currentQ.id] as Record<number, string>) || {};

                  return (
                    <div className="space-y-1.5">
                      {Array.from({ length: totalBlanks || 1 }).map((_, bIdx) => {
                        const currentVal = userAnswersMap[bIdx] || "";
                        return (
                          <div key={bIdx} className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-blue-700 w-16 shrink-0">Ô [{bIdx + 1}]:</span>
                            <input
                              type="text"
                              placeholder={`Đáp án ô ${bIdx + 1}...`}
                              value={currentVal}
                              onChange={(e) => {
                                const nextMap = { ...userAnswersMap, [bIdx]: e.target.value };
                                if (onAnswerChange) onAnswerChange(currentQ.id, nextMap);
                              }}
                              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Matching Table (Nối bảng 2 cột) Interactive */}
            {currentQ.type === "matching" && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Nối các mục tương ứng giữa 2 cột:
                </p>
                <InteractiveMatchingBoard
                  leftItems={currentQ.matchingLeft || []}
                  rightItems={currentQ.matchingRight || []}
                  matches={typeof answers[currentQ.id] === "object" && answers[currentQ.id] ? answers[currentQ.id] : {}}
                  correctMatches={currentQ.correctMatches || {}}
                  onChange={(newMatches) => {
                    if (onAnswerChange) onAnswerChange(currentQ.id, newMatches);
                  }}
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

        {/* Canvas Area Container with Vertical Scrollability */}
        <div className="flex-1 relative flex flex-col overflow-hidden bg-white">
          <div
            ref={containerRef}
            className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden relative touch-none select-none"
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              className={`block touch-none ${
                tool === "move" ? "cursor-move" : tool === "eraser" ? "cursor-cell" : "cursor-crosshair"
              }`}
            />
          </div>

          {/* Hidden File Input for Image Upload / Paste fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Floating Canvas Drawing Tools Toolbar (Compact Capsule) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md text-white py-1.5 px-3 rounded-full border border-slate-700/80 shadow-2xl flex items-center gap-1.5 sm:gap-2 max-w-[95vw] transition-all select-none z-20">
            {/* Tool Selector: Pen vs Eraser vs Move */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-full">
              <button
                type="button"
                onClick={() => {
                  setTool("pen");
                  setSelectedImageIndex(null);
                }}
                className={`p-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  tool === "pen" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
                title="Bút vẽ"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setTool("eraser");
                  setSelectedImageIndex(null);
                }}
                className={`p-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  tool === "eraser" ? "bg-amber-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
                title="Tẩy nét vẽ"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setTool("move");
                  setShowBrushSettings(false);
                }}
                className={`p-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  tool === "move" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
                title="Di chuyển & chỉnh kích thước ảnh dán (Kéo rê hoặc kéo 4 góc)"
              >
                <Move className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-px h-5 bg-slate-700/60" />

            {/* Compact Color & Size Capsule with Vertical Popover Upwards */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBrushSettings(!showBrushSettings)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  showBrushSettings
                    ? "bg-slate-700 border-blue-400 text-white"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white"
                }`}
                title="Chọn màu & cỡ nét (Bấm để sổ lên)"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/60 shadow-2xs shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] font-mono">{size}px</span>
                <ChevronUp className={`w-3 h-3 transition-transform ${showBrushSettings ? "rotate-180 text-blue-400" : "text-slate-400"}`} />
              </button>

              {/* Vertical Popover upward */}
              {showBrushSettings && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-700 backdrop-blur-md rounded-2xl p-3 shadow-2xl flex flex-col gap-3 min-w-[210px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  {/* Color Palette */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Màu nét vẽ</span>
                      <span className="text-[9px] text-blue-400 font-mono">
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
                              ? "border-white scale-110 ring-2 ring-blue-500 shadow-sm"
                              : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                          }`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Stroke Size Selector */}
                  <div className="border-t border-slate-800 pt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Độ dày nét bút
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {STROKE_SIZES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSize(s)}
                          className={`py-1.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                            size === s
                              ? "bg-blue-600 text-white font-bold shadow-xs"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
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

            <div className="w-px h-5 bg-slate-700/60" />

            {/* Undo (Ctrl+Z) & Redo (Ctrl+Y) */}
            <button
              type="button"
              onClick={handleUndo}
              className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Hoàn tác (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Làm lại (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Paste / Insert Image (Ctrl+V) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-full bg-slate-800/80 hover:bg-blue-600/80 text-blue-300 hover:text-white transition-colors cursor-pointer"
              title="Dán hoặc tải ảnh vào nháp (Ctrl+V)"
            >
              <ImagePlus className="w-3.5 h-3.5" />
            </button>

            {/* Delete selected image if any */}
            {tool === "move" && selectedImageIndex !== null && (
              <button
                type="button"
                onClick={handleDeleteSelectedImage}
                className="p-1.5 rounded-full bg-amber-900/60 hover:bg-amber-700 text-amber-200 transition-colors cursor-pointer"
                title="Xóa ảnh đang chọn (Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Clear All */}
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-full bg-red-950/60 hover:bg-red-800 text-red-300 hover:text-red-100 transition-colors cursor-pointer"
              title="Xóa toàn bộ nháp"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-5 bg-slate-700/60" />

            {/* Expand Scratchpad Area (+600px Height & Scroll) */}
            <button
              type="button"
              onClick={handleExpandScratchpad}
              className="px-2.5 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs shadow-indigo-600/30"
              title="Cuộn mở rộng thêm 600px diện tích nháp mới"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thêm chỗ nháp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
