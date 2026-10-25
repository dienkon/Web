/**
 * @license
 * Math & Graphing Studio for Students (GeoGebra-style interactive graphing calculator)
 * Dedicated tool room in Student Practice center.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Table,
  Sliders,
  Sparkles,
  ChevronRight,
  Maximize2,
  Minimize2,
  Activity,
  Compass,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Globe,
  HelpCircle,
  Layers,
  Box,
} from "lucide-react";
import { compileMathExpression } from "../../features/math-draw/graphRenderer";

export type StudioMode = "dkmath" | "geogebra";
export type GeoGebraAppId = "calculator" | "classic" | "geometry" | "3d";

export interface GeoGebraAppOption {
  id: GeoGebraAppId;
  name: string;
  shortName: string;
  badge: string;
  desc: string;
  embedUrl: string;
  directUrl: string;
}

export const GEOGEBRA_APPS: GeoGebraAppOption[] = [
  {
    id: "calculator",
    name: "Máy tính Đồ thị (Graphing)",
    shortName: "Đồ thị 2D",
    badge: "Khuyên dùng",
    desc: "Vẽ đồ thị hàm số, tìm cực trị, điểm uốn, tiệm cận, giải phương trình & lập bảng giá trị",
    embedUrl: "https://www.geogebra.org/calculator?embed",
    directUrl: "https://www.geogebra.org/calculator",
  },
  {
    id: "classic",
    name: "GeoGebra Cổ điển (Classic)",
    shortName: "Classic Suite",
    badge: "Toàn diện",
    desc: "Bộ công cụ đầy đủ: Đại số, Hình học, CAS, Bảng tính số liệu, Không gian 3D",
    embedUrl: "https://www.geogebra.org/classic?embed",
    directUrl: "https://www.geogebra.org/classic",
  },
  {
    id: "geometry",
    name: "Hình học 2D (Geometry)",
    shortName: "Hình học 2D",
    badge: "Hình học phẳng",
    desc: "Dựng điểm, đường thẳng, tam giác, đường tròn, góc, vectơ và các phép biến hình",
    embedUrl: "https://www.geogebra.org/geometry?embed",
    directUrl: "https://www.geogebra.org/geometry",
  },
  {
    id: "3d",
    name: "Hình không gian 3D (3D Calc)",
    shortName: "Không gian 3D",
    badge: "Toán 12 Oxyz",
    desc: "Toạ độ Oxyz, mặt cầu, mặt phẳng, đường thẳng trong không gian, góc và khoảng cách",
    embedUrl: "https://www.geogebra.org/3d?embed",
    directUrl: "https://www.geogebra.org/3d",
  },
];

export interface GeoGebraShortcut {
  category: "Hàm số & Khảo sát" | "Đạo hàm & Tiếp tuyến" | "Tích phân" | "Hình học Oxyz";
  label: string;
  command: string;
  desc: string;
}

export const GEOGEBRA_SHORTCUTS: GeoGebraShortcut[] = [
  {
    category: "Hàm số & Khảo sát",
    label: "Hàm bậc ba",
    command: "f(x) = x^3 - 3*x + 1",
    desc: "Đồ thị hàm bậc ba 2 cực trị",
  },
  {
    category: "Hàm số & Khảo sát",
    label: "Hàm nhất biến",
    command: "f(x) = (2*x + 1)/(x - 1)",
    desc: "Đồ thị phân thức bậc nhất trên bậc nhất",
  },
  {
    category: "Hàm số & Khảo sát",
    label: "Cực trị hàm số",
    command: "Extremum(f)",
    desc: "Tìm tất cả điểm cực đại, cực tiểu của hàm số f",
  },
  {
    category: "Hàm số & Khảo sát",
    label: "Điểm uốn đồ thị",
    command: "InflectionPoint(f)",
    desc: "Tìm toạ độ điểm uốn của đồ thị hàm số f",
  },
  {
    category: "Hàm số & Khảo sát",
    label: "Đường tiệm cận",
    command: "Asymptote(f)",
    desc: "Tìm tiệm cận đứng, tiệm cận ngang và tiệm cận xiên",
  },
  {
    category: "Hàm số & Khảo sát",
    label: "Giao điểm 2 đồ thị",
    command: "Intersect(f, g)",
    desc: "Tìm toạ độ các giao điểm của f và g",
  },
  {
    category: "Đạo hàm & Tiếp tuyến",
    label: "Đạo hàm f'(x)",
    command: "Derivative(f)",
    desc: "Tính biểu thức và vẽ đồ thị hàm số đạo hàm",
  },
  {
    category: "Đạo hàm & Tiếp tuyến",
    label: "Tiếp tuyến tại điểm",
    command: "Tangent(1, f)",
    desc: "Phương trình tiếp tuyến của đồ thị hàm f tại hoành độ x = 1",
  },
  {
    category: "Tích phân",
    label: "Tích phân xác định",
    command: "Integral(f, 0, 2)",
    desc: "Tính diện tích hình phẳng giới hạn bởi đồ thị f từ x = 0 đến 2",
  },
  {
    category: "Hình học Oxyz",
    label: "Mặt cầu Oxyz",
    command: "Sphere((1, 2, -1), 3)",
    desc: "Mặt cầu tâm I(1; 2; -1) bán kính R = 3",
  },
  {
    category: "Hình học Oxyz",
    label: "Mặt phẳng qua 3 điểm",
    command: "Plane(A, B, C)",
    desc: "Phương trình mặt phẳng đi qua 3 điểm A, B, C",
  },
  {
    category: "Hình học Oxyz",
    label: "Đường thẳng qua 2 điểm",
    command: "Line(A, B)",
    desc: "Phương trình đường thẳng đi qua 2 điểm A, B",
  },
  {
    category: "Hình học Oxyz",
    label: "Khoảng cách điểm - mp",
    command: "Distance(A, p)",
    desc: "Tính khoảng cách từ điểm A đến mặt phẳng p",
  },
];

interface FunctionItem {
  id: string;
  name: string; // f, g, h...
  expr: string;
  color: string;
  visible: boolean;
  showDerivative?: boolean;
}

interface CustomPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
}

const PRESET_FUNCTIONS = [
  { name: "Hàm bậc 3 (2 cực trị)", expr: "x^3 - 3*x + 1", desc: "y = x³ - 3x + 1" },
  { name: "Hàm trùng phương", expr: "x^4 - 2*x^2 - 1", desc: "y = x⁴ - 2x² - 1" },
  { name: "Hàm nhất biến (1/1)", expr: "(2*x + 1)/(x - 1)", desc: "y = (2x+1)/(x-1)" },
  { name: "Phân thức bậc 2/1", expr: "(x^2 - x + 1)/(x - 1)", desc: "y = (x²-x+1)/(x-1)" },
  { name: "Parabol bậc 2", expr: "-x^2 + 2*x + 3", desc: "y = -x² + 2x + 3" },
  { name: "Lượng giác sin/cos", expr: "sin(x)", desc: "y = sin(x)" },
  { name: "Hàm số mũ 2^x", expr: "2^x", desc: "y = 2^x" },
  { name: "Hàm logarit ln(x)", expr: "ln(x)", desc: "y = ln(x)" },
];

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2"];

export default function MathGraphingStudio() {
  // Mode toggle: DkMath Native Canvas vs GeoGebra Iframe
  const [studioMode, setStudioMode] = useState<StudioMode>("dkmath");

  // GeoGebra state
  const [selectedGeoApp, setSelectedGeoApp] = useState<GeoGebraAppId>("calculator");
  const [geogebraReloadKey, setGeogebraReloadKey] = useState(0);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<{ command: string; label: string } | null>(null);
  const [showGeoGebraGuide, setShowGeoGebraGuide] = useState(false);
  const [shortcutCategory, setShortcutCategory] = useState<string>("all");

  // Native Canvas state
  const studioRootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Coordinate view state
  const [centerX, setCenterX] = useState(0);
  const [centerY, setCenterY] = useState(0);
  const [scale, setScale] = useState(45); // pixels per unit

  // Functions list
  const [functions, setFunctions] = useState<FunctionItem[]>([
    { id: "1", name: "f", expr: "x^3 - 3*x + 1", color: "#2563eb", visible: true, showDerivative: false },
  ]);

  // Dynamic Parameter slider (m)
  const [paramM, setParamM] = useState(1);
  const [useParamM, setUseParamM] = useState(false);

  // Geometric Points
  const [points, setPoints] = useState<CustomPoint[]>([
    { id: "p1", x: -1, y: 3, label: "CĐ(-1; 3)", color: "#dc2626" },
    { id: "p2", x: 1, y: -1, label: "CT(1; -1)", color: "#16a34a" },
  ]);

  // UI state
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"functions" | "table" | "presets">("functions");
  const [tableRange, setTableRange] = useState({ start: -3, end: 3, step: 0.5 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initCenterX: number; initCenterY: number }>({
    mouseX: 0,
    mouseY: 0,
    initCenterX: 0,
    initCenterY: 0,
  });

  // Screen size handling
  const [canvasDim, setCanvasDim] = useState({ width: 700, height: 500 });

  // Update canvas size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasDim({
          width: Math.max(340, Math.floor(rect.width)),
          height: Math.max(380, Math.min(600, window.innerHeight - 260)),
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [studioMode, isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Escape key handler for fullscreen (works with both native and fallback overlay)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // GeoGebra iframe load timeout fallback (auto-dismiss spinner after 8 seconds)
  useEffect(() => {
    if (!isIframeLoading) return;
    const timer = setTimeout(() => {
      setIsIframeLoading(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isIframeLoading, selectedGeoApp, geogebraReloadKey]);

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        if (studioRootRef.current?.requestFullscreen) {
          await studioRootRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch {
      // Fallback to React state overlay
      setIsFullscreen((prev) => !prev);
    }
  };

  const reloadGeoGebra = () => {
    setIsIframeLoading(true);
    setGeogebraReloadKey((k) => k + 1);
  };

  const handleCopyShortcut = (cmd: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(cmd).catch(() => {});
    }
    setCopiedCommand({ command: cmd, label });
    setTimeout(() => {
      setCopiedCommand(null);
    }, 2800);
  };

  // Redraw Canvas for DkMath Studio
  const drawGraph = useCallback(() => {
    if (studioMode !== "dkmath") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvasDim;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Coordinate conversions
    const originScreenX = width / 2 - centerX * scale;
    const originScreenY = height / 2 + centerY * scale;

    const toScreenX = (mathX: number) => originScreenX + mathX * scale;
    const toScreenY = (mathY: number) => originScreenY - mathY * scale;
    const toMathX = (screenX: number) => (screenX - originScreenX) / scale;
    const toMathY = (screenY: number) => (originScreenY - screenY) / scale;

    // Grid step calculation
    let step = 1;
    if (scale < 25) step = 2;
    if (scale < 15) step = 5;
    if (scale < 8) step = 10;
    if (scale > 90) step = 0.5;
    if (scale > 180) step = 0.2;

    const minMathX = toMathX(0);
    const maxMathX = toMathX(width);
    const minMathY = toMathY(height);
    const maxMathY = toMathY(0);

    // 1. Draw Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#f1f5f9";

    const startX = Math.floor(minMathX / step) * step;
    const endX = Math.ceil(maxMathX / step) * step;
    const startY = Math.floor(minMathY / step) * step;
    const endY = Math.ceil(maxMathY / step) * step;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const sx = toScreenX(x);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }
    for (let y = startY; y <= endY; y += step) {
      const sy = toScreenY(y);
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();

    // 2. Draw Axes
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.6;

    // Ox axis
    const clampedY = Math.max(15, Math.min(height - 15, originScreenY));
    ctx.beginPath();
    ctx.moveTo(0, clampedY);
    ctx.lineTo(width, clampedY);
    ctx.stroke();

    // Ox Arrow
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.moveTo(width - 2, clampedY);
    ctx.lineTo(width - 10, clampedY - 4);
    ctx.lineTo(width - 10, clampedY + 4);
    ctx.fill();

    // Oy axis
    const clampedX = Math.max(15, Math.min(width - 15, originScreenX));
    ctx.beginPath();
    ctx.moveTo(clampedX, 0);
    ctx.lineTo(clampedX, height);
    ctx.stroke();

    // Oy Arrow
    ctx.beginPath();
    ctx.moveTo(clampedX, 2);
    ctx.lineTo(clampedX - 4, 10);
    ctx.lineTo(clampedX + 4, 10);
    ctx.fill();

    // Axis labels
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText("x", width - 14, clampedY + 16);
    ctx.fillText("y", clampedX + 8, 14);
    ctx.fillText("O", clampedX - 14, clampedY + 14);

    // Numbers on axes
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "#64748b";

    for (let x = startX; x <= endX; x += step) {
      if (Math.abs(x) < 0.0001) continue;
      const sx = toScreenX(x);
      ctx.beginPath();
      ctx.moveTo(sx, clampedY - 3);
      ctx.lineTo(sx, clampedY + 3);
      ctx.stroke();

      const label = Number(x.toFixed(2)).toString();
      ctx.textAlign = "center";
      ctx.fillText(label, sx, clampedY + 14);
    }

    for (let y = startY; y <= endY; y += step) {
      if (Math.abs(y) < 0.0001) continue;
      const sy = toScreenY(y);
      ctx.beginPath();
      ctx.moveTo(clampedX - 3, sy);
      ctx.lineTo(clampedX + 3, sy);
      ctx.stroke();

      const label = Number(y.toFixed(2)).toString();
      ctx.textAlign = "right";
      ctx.fillText(label, clampedX - 6, sy + 3);
    }

    // 3. Draw Functions
    const totalSamples = width;

    functions.forEach((fnObj) => {
      if (!fnObj.visible || !fnObj.expr.trim()) return;

      let formula = fnObj.expr;
      if (useParamM) {
        formula = formula.replace(/\bm\b/g, `(${paramM})`);
      }

      const evalFn = compileMathExpression(formula);

      ctx.save();
      ctx.strokeStyle = fnObj.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();

      let isDrawing = false;
      let prevMathY: number | null = null;

      for (let px = 0; px <= totalSamples; px++) {
        const mx = toMathX(px);
        const my = evalFn(mx);

        if (isNaN(my) || !isFinite(my) || my < minMathY - 50 || my > maxMathY + 50) {
          isDrawing = false;
          prevMathY = null;
          continue;
        }

        if (prevMathY !== null && Math.abs(my - prevMathY) > (maxMathY - minMathY) * 0.9) {
          isDrawing = false;
          prevMathY = null;
        }

        const py = toScreenY(my);

        if (!isDrawing) {
          ctx.moveTo(px, py);
          isDrawing = true;
        } else {
          ctx.lineTo(px, py);
        }
        prevMathY = my;
      }
      ctx.stroke();

      // Derivative plot if enabled
      if (fnObj.showDerivative) {
        ctx.strokeStyle = fnObj.color;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();

        const h = 0.0001;
        let isDerivDrawing = false;

        for (let px = 0; px <= totalSamples; px += 2) {
          const mx = toMathX(px);
          const dy = (evalFn(mx + h) - evalFn(mx - h)) / (2 * h);

          if (isNaN(dy) || !isFinite(dy) || dy < minMathY - 30 || dy > maxMathY + 30) {
            isDerivDrawing = false;
            continue;
          }

          const py = toScreenY(dy);
          if (!isDerivDrawing) {
            ctx.moveTo(px, py);
            isDerivDrawing = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }

      ctx.restore();
    });

    // 4. Draw Geometric Points
    points.forEach((pt) => {
      const sx = toScreenX(pt.x);
      const sy = toScreenY(pt.y);

      ctx.save();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, clampedY);
      ctx.moveTo(sx, sy);
      ctx.lineTo(clampedX, sy);
      ctx.stroke();

      ctx.fillStyle = pt.color;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.fillText(pt.label, sx, pt.y >= 0 ? sy - 10 : sy + 18);
      ctx.restore();
    });

    // 5. Draw Hover Pointer Coordinates
    if (hoverCoord) {
      const sx = toScreenX(hoverCoord.x);
      const sy = toScreenY(hoverCoord.y);

      ctx.save();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(sx, 0); ctx.lineTo(sx, height);
      ctx.moveTo(0, sy); ctx.lineTo(width, sy);
      ctx.stroke();

      ctx.restore();
    }
  }, [studioMode, centerX, centerY, scale, functions, points, paramM, useParamM, hoverCoord, canvasDim]);

  useEffect(() => {
    if (studioMode === "dkmath") {
      drawGraph();
    }
  }, [studioMode, drawGraph]);

  // Mouse & Touch Pan / Zoom Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initCenterX: centerX,
      initCenterY: centerY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const originScreenX = canvasDim.width / 2 - centerX * scale;
    const originScreenY = canvasDim.height / 2 + centerY * scale;

    const mathX = (mx - originScreenX) / scale;
    const mathY = (originScreenY - my) / scale;
    setHoverCoord({ x: parseFloat(mathX.toFixed(2)), y: parseFloat(mathY.toFixed(2)) });

    if (isDragging) {
      const dx = (e.clientX - dragStartRef.current.mouseX) / scale;
      const dy = (e.clientY - dragStartRef.current.mouseY) / scale;
      setCenterX(dragStartRef.current.initCenterX - dx);
      setCenterY(dragStartRef.current.initCenterY + dy);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const touchDistRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        initCenterX: centerX,
        initCenterY: centerY,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;

      const originScreenX = canvasDim.width / 2 - centerX * scale;
      const originScreenY = canvasDim.height / 2 + centerY * scale;

      const mathX = (mx - originScreenX) / scale;
      const mathY = (originScreenY - my) / scale;
      setHoverCoord({ x: parseFloat(mathX.toFixed(2)), y: parseFloat(mathY.toFixed(2)) });

      const dx = (touch.clientX - dragStartRef.current.mouseX) / scale;
      const dy = (touch.clientY - dragStartRef.current.mouseY) / scale;
      setCenterX(dragStartRef.current.initCenterX - dx);
      setCenterY(dragStartRef.current.initCenterY + dy);
    } else if (e.touches.length === 2 && touchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / touchDistRef.current;
      setScale((prev) => Math.max(8, Math.min(300, prev * ratio)));
      touchDistRef.current = newDist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistRef.current = null;
    setHoverCoord(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setScale((prev) => Math.max(8, Math.min(300, prev * zoomFactor)));
  };

  // Zoom Buttons
  const handleZoomIn = () => setScale((prev) => Math.min(300, prev * 1.25));
  const handleZoomOut = () => setScale((prev) => Math.max(8, prev * 0.8));
  const handleResetView = () => {
    setCenterX(0);
    setCenterY(0);
    setScale(45);
  };

  // Function management
  const addFunction = () => {
    const names = ["f", "g", "h", "p", "q", "r"];
    const name = names[functions.length % names.length];
    const color = COLORS[functions.length % COLORS.length];
    setFunctions([
      ...functions,
      { id: Date.now().toString(), name, expr: "x", color, visible: true, showDerivative: false },
    ]);
  };

  const updateFunction = (id: string, updates: Partial<FunctionItem>) => {
    setFunctions(functions.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeFunction = (id: string) => {
    if (functions.length <= 1) return;
    setFunctions(functions.filter((f) => f.id !== id));
  };

  const loadPreset = (preset: typeof PRESET_FUNCTIONS[0]) => {
    setFunctions([
      { id: "1", name: "f", expr: preset.expr, color: "#2563eb", visible: true, showDerivative: false },
    ]);
    handleResetView();
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `do-thi-dkmath-${Date.now()}.png`;
    a.click();
  };

  const currentGeoApp = GEOGEBRA_APPS.find((a) => a.id === selectedGeoApp) || GEOGEBRA_APPS[0];

  return (
    <div
      ref={studioRootRef}
      className={`w-full bg-slate-950 text-slate-100 rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-800 transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none overflow-y-auto p-4 sm:p-6" : ""
      }`}
    >
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Phòng Công Cụ Toán Học · GeoGebra Studio
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Toán 12 GDPT 2018
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Khảo sát hàm số, đồ thị 2D, bảng biến thiên, tham số $m$, và GeoGebra Calculator trực tuyến
            </p>
          </div>
        </div>

        {/* Action Controls for Active Mode */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {studioMode === "dkmath" ? (
            <>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
                title="Phóng to (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
                title="Thu nhỏ (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetView}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
                title="Về gốc toạ độ (0; 0)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleExportPng}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                title="Xuất ảnh PNG chất lượng cao"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Xuất ảnh PNG</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={reloadGeoGebra}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Tải lại bảng GeoGebra mới"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              <a
                href={currentGeoApp.directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Mở trong tab mới trên GeoGebra.org"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Mở thẻ mới</span>
              </a>
            </>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isFullscreen
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800"
            }`}
            title={isFullscreen ? "Thu nhỏ (Thoát toàn màn hình)" : "Toàn màn hình phòng vẽ"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* PRIMARY TOOL MODE SWITCHER (DkMath Studio vs GeoGebra Calculator) */}
      <div className="mb-5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => setStudioMode("dkmath")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
            studioMode === "dkmath"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-cyan-300" />
            <div>
              <div className="text-xs sm:text-sm font-black leading-tight">
                DkMath Studio (Máy vẽ 2D & Bảng giá trị)
              </div>
              <div className="text-[11px] font-normal text-blue-100 opacity-90 hidden sm:block">
                Khảo sát hàm số, tham số $m$, bảng giá trị trực tiếp (Ngoại tuyến & Nhanh)
              </div>
            </div>
          </div>
          {studioMode === "dkmath" && (
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-white/20 text-white hidden md:inline">
              Đang chọn
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setStudioMode("geogebra")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
            studioMode === "geogebra"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-amber-300" />
            <div>
              <div className="text-xs sm:text-sm font-black leading-tight">
                GeoGebra Calculator (Trực tuyến)
              </div>
              <div className="text-[11px] font-normal text-purple-100 opacity-90 hidden sm:block">
                Bộ máy vẽ GeoGebra chính hãng chuẩn Quốc tế · Đại số, Hình học 2D & Không gian 3D
              </div>
            </div>
          </div>
          {studioMode === "geogebra" && (
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-white/20 text-white hidden md:inline">
              Đang chọn
            </span>
          )}
        </button>
      </div>

      {/* MODE 1: DKMATH STUDIO (NATIVE 2D CANVAS & TABLE) */}
      {studioMode === "dkmath" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
          {/* LEFT COLUMN: FUNCTIONS & INVESTIGATION TOOLS */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Sub Navigation */}
            <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("functions")}
                className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "functions" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Hàm số ({functions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("table")}
                className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "table" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Bảng giá trị</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "presets" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mẫu đề thi</span>
              </button>
            </div>

            {/* TAB: FUNCTIONS LIST */}
            {activeTab === "functions" && (
              <div className="space-y-3">
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {functions.map((fn) => (
                    <div
                      key={fn.id}
                      className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: fn.color }}
                        />
                        <span className="font-mono text-xs font-bold text-slate-300">
                          {fn.name}(x) =
                        </span>
                        <input
                          type="text"
                          value={fn.expr}
                          onChange={(e) => updateFunction(fn.id, { expr: e.target.value })}
                          placeholder="Nhập hàm số, vd: x^3 - 3*x"
                          className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateFunction(fn.id, { visible: !fn.visible })}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title={fn.visible ? "Ẩn đồ thị" : "Hiện đồ thị"}
                        >
                          {fn.visible ? <Eye className="w-4 h-4 text-blue-400" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        {functions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFunction(fn.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                        <label className="flex items-center gap-1.5 text-slate-400 hover:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fn.showDerivative || false}
                            onChange={(e) => updateFunction(fn.id, { showDerivative: e.target.checked })}
                            className="rounded text-blue-600 focus:ring-0 bg-slate-800 border-slate-700"
                          />
                          <span>Hiện đạo hàm {fn.name}'(x)</span>
                        </label>

                        <div className="flex items-center gap-1">
                          {COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateFunction(fn.id, { color: c })}
                              className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-transform ${
                                fn.color === c ? "scale-125 ring-2 ring-white" : "opacity-60 hover:opacity-100"
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addFunction}
                  className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-slate-700 hover:border-blue-500 hover:bg-blue-500/10 text-xs font-bold text-slate-300 hover:text-blue-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm hàm số mới</span>
                </button>

                {/* Dynamic Parameter Slider (m) */}
                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useParamM}
                        onChange={(e) => setUseParamM(e.target.checked)}
                        className="rounded text-indigo-500 bg-slate-800 border-slate-700"
                      />
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Biến thiên tham số m (GeoGebra Slider)</span>
                    </label>
                    <span className="font-mono text-xs font-bold text-indigo-400">
                      m = {paramM.toFixed(1)}
                    </span>
                  </div>

                  {useParamM && (
                    <div className="pt-1">
                      <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.1"
                        value={paramM}
                        onChange={(e) => setParamM(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                        <span>-5</span>
                        <span>0</span>
                        <span>+5</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: TABLE OF VALUES */}
            {activeTab === "table" && (
              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Bắt đầu:</label>
                    <input
                      type="number"
                      value={tableRange.start}
                      onChange={(e) => setTableRange({ ...tableRange, start: parseFloat(e.target.value) || -3 })}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-center font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Kết thúc:</label>
                    <input
                      type="number"
                      value={tableRange.end}
                      onChange={(e) => setTableRange({ ...tableRange, end: parseFloat(e.target.value) || 3 })}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-center font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Bước nhảy (Step):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tableRange.step}
                      onChange={(e) => setTableRange({ ...tableRange, step: Math.max(0.05, parseFloat(e.target.value) || 0.5) })}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-center font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Table Render */}
                <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800">
                  <table className="w-full text-xs font-mono text-left">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3 text-center">x</th>
                        {functions.filter((f) => f.visible).map((fn) => (
                          <th key={fn.id} className="py-2 px-3 text-center" style={{ color: fn.color }}>
                            {fn.name}(x)
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(() => {
                        const rows = [];
                        const evalFns = functions
                          .filter((f) => f.visible)
                          .map((f) => {
                            const expr = useParamM ? f.expr.replace(/\bm\b/g, `(${paramM})`) : f.expr;
                            return compileMathExpression(expr);
                          });

                        const step = Math.max(0.01, tableRange.step || 0.5);
                        const start = Math.min(tableRange.start, tableRange.end);
                        const end = Math.max(tableRange.start, tableRange.end);
                        const MAX_ROWS = 250;
                        let count = 0;

                        for (let x = start; x <= end + 0.0001 && count < MAX_ROWS; x += step) {
                          count++;
                          const curX = parseFloat(x.toFixed(3));
                          rows.push(
                            <tr key={`${count}-${curX}`} className="hover:bg-slate-800/40">
                              <td className="py-1.5 px-3 text-center text-slate-300 font-bold">{curX}</td>
                              {evalFns.map((evalFn, idx) => {
                                const y = evalFn(curX);
                                const yStr = isNaN(y) || !isFinite(y) ? "—" : y.toFixed(3);
                                return (
                                  <td key={idx} className="py-1.5 px-3 text-center text-slate-200">
                                    {yStr}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        }
                        return rows;
                      })()}
                    </tbody>
                  </table>
                </div>

                {Math.abs(tableRange.end - tableRange.start) / Math.max(0.01, tableRange.step) > 250 && (
                  <div className="text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/60 p-2 rounded-xl">
                    ⚠️ Bảng giá trị đã giới hạn tối đa 250 dòng để đảm bảo trải nghiệm mượt mà. Hãy tăng Bước nhảy (Step) hoặc thu hẹp khoảng.
                  </div>
                )}
              </div>
            )}

            {/* TAB: PRESET LIBRARY */}
            {activeTab === "presets" && (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {PRESET_FUNCTIONS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => loadPreset(p)}
                    className="w-full p-2.5 bg-slate-900 hover:bg-blue-600/20 hover:border-blue-500/50 rounded-2xl border border-slate-800 text-left transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-blue-300">
                        {p.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{p.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: INTERACTIVE CANVAS */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div
              ref={containerRef}
              className="w-full relative rounded-2xl overflow-hidden bg-white shadow-2xl border border-slate-700/80 cursor-crosshair select-none"
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  handleMouseUp();
                  setHoverCoord(null);
                }}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                className="block w-full h-auto touch-none"
              />

              {/* Live Hover Floating HUD */}
              {hoverCoord && (
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md text-white font-mono text-xs border border-slate-700/60 shadow-lg pointer-events-none">
                  <span>(x: </span>
                  <span className="text-blue-400 font-bold">{hoverCoord.x}</span>
                  <span>, y: </span>
                  <span className="text-emerald-400 font-bold">{hoverCoord.y}</span>
                  <span>)</span>
                </div>
              )}

              {/* Quick Navigation Help Overlay */}
              <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-slate-950/70 backdrop-blur-xs px-2.5 py-1 rounded-lg pointer-events-none">
                Kéo chuột để di chuyển · Lăn chuột để phóng to / thu nhỏ
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: GEOGEBRA CALCULATOR (OFFICIAL EMBEDDED IFRAME & SHORTCUTS) */}
      {studioMode === "geogebra" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* GeoGebra Sub-apps Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
            {/* App Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {GEOGEBRA_APPS.map((app) => {
                const isActive = selectedGeoApp === app.id;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      if (selectedGeoApp !== app.id) {
                        setSelectedGeoApp(app.id);
                        setIsIframeLoading(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800"
                    }`}
                  >
                    {app.id === "3d" ? <Box className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                    <span>{app.shortName}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {app.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Guide Toggle */}
            <button
              type="button"
              onClick={() => setShowGeoGebraGuide((v) => !v)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showGeoGebraGuide ? "Ẩn hướng dẫn cú pháp" : "Cú pháp & Lệnh tắt GeoGebra"}</span>
            </button>
          </div>

          {/* Quick Shortcuts Bar (Vietnamese GDPT 2018 High School Math) */}
          <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Lệnh tắt phổ biến (Nhấn để sao chép & dán vào GeoGebra):</span>
              </span>
              {copiedCommand && (
                <span className="text-[11px] text-emerald-400 font-bold animate-in fade-in flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã sao chép: {copiedCommand.label}</span>
                </span>
              )}
            </div>

            {/* Category Filter for Shortcuts */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: "all", label: "Tất cả" },
                { id: "Hàm số & Khảo sát", label: "Hàm số & Khảo sát" },
                { id: "Đạo hàm & Tiếp tuyến", label: "Đạo hàm & Tiếp tuyến" },
                { id: "Tích phân", label: "Tích phân" },
                { id: "Hình học Oxyz", label: "Hình học Oxyz" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setShortcutCategory(cat.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    shortcutCategory === cat.id
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {GEOGEBRA_SHORTCUTS.filter(
                (sc) => shortcutCategory === "all" || sc.category === shortcutCategory
              ).map((sc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCopyShortcut(sc.command, sc.label)}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-purple-950/60 hover:border-purple-500/50 text-slate-300 hover:text-white rounded-lg border border-slate-800 text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1.5 group"
                  title={`${sc.desc} -> ${sc.command}`}
                >
                  <Copy className="w-3 h-3 text-slate-500 group-hover:text-purple-400 transition-colors" />
                  <span className="font-sans font-medium text-slate-200">{sc.label}:</span>
                  <span className="text-purple-300">{sc.command}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 px-3.5 py-2 rounded-xl border border-slate-800 gap-2">
            <span>
              💡 Máy tính GeoGebra chạy từ máy chủ Quốc tế (geogebra.org). Nếu mạng chập chờn, học sinh có thể chuyển sang{" "}
              <button
                type="button"
                onClick={() => setStudioMode("dkmath")}
                className="text-cyan-400 font-bold underline cursor-pointer hover:text-cyan-300"
              >
                DkMath Studio (Máy vẽ 2D)
              </button>{" "}
              để vẽ đồ thị và lập bảng giá trị hoàn toàn ngoại tuyến.
            </span>
          </div>

          {/* Collapsible Detailed Guide */}
          {showGeoGebraGuide && (
            <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed animate-in fade-in">
              <div className="font-bold text-white text-sm mb-1">
                📖 Hướng dẫn sử dụng GeoGebra cho học sinh Toán 12:
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>
                  <strong className="text-white">Nhập hàm số:</strong> Gõ trực tiếp{" "}
                  <code className="text-purple-300 font-mono">y = x^3 - 3*x + 1</code> hoặc{" "}
                  <code className="text-purple-300 font-mono">f(x) = (2x+1)/(x-1)</code> vào thanh nhập liệu.
                </li>
                <li>
                  <strong className="text-white">Cực trị & Điểm uốn:</strong> Gõ lệnh{" "}
                  <code className="text-purple-300 font-mono">Extremum(f)</code> hoặc{" "}
                  <code className="text-purple-300 font-mono">InflectionPoint(f)</code>.
                </li>
                <li>
                  <strong className="text-white">Đường tiệm cận:</strong> Gõ{" "}
                  <code className="text-purple-300 font-mono">Asymptote(f)</code> để GeoGebra tự vẽ tất cả tiệm cận đứng, ngang, xiên.
                </li>
                <li>
                  <strong className="text-white">Hình không gian Oxyz:</strong> Chuyển sang thẻ{" "}
                  <span className="text-purple-300 font-semibold">Không gian 3D</span> để vẽ mặt cầu, mặt phẳng, đường thẳng trong không gian.
                </li>
              </ul>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                💡 <span className="text-amber-300 font-medium">Mẹo nhỏ:</span> Khi cần vẽ đồ thị và lập bảng giá trị nhanh mà không cần kết nối mạng internet, bạn có thể chuyển về tab{" "}
                <strong className="text-white">DkMath Studio (Máy vẽ 2D)</strong> ở trên.
              </div>
            </div>
          )}

          {/* GeoGebra Embedded Iframe Container */}
          <div className="w-full relative rounded-2xl overflow-hidden bg-slate-900 shadow-2xl border border-slate-700 min-h-[640px]">
            {isIframeLoading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-10 text-slate-400 gap-3 p-4 text-center">
                <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-sm font-semibold text-slate-200">
                  Đang khởi tạo {currentGeoApp.name}...
                </div>
                <div className="text-xs text-slate-400">
                  Tải trực tiếp từ máy chủ GeoGebra Quốc tế (geogebra.org)
                </div>
                <button
                  type="button"
                  onClick={() => setIsIframeLoading(false)}
                  className="mt-1 text-xs text-purple-300 hover:text-white underline cursor-pointer bg-slate-800/80 hover:bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 transition-colors"
                >
                  Bỏ qua màn hình chờ (Xem bảng vẽ ngay)
                </button>
              </div>
            )}

            <iframe
              key={`${selectedGeoApp}-${geogebraReloadKey}`}
              src={currentGeoApp.embedUrl}
              title={currentGeoApp.name}
              onLoad={() => setIsIframeLoading(false)}
              allow="fullscreen; clipboard-read; clipboard-write; microphone; camera"
              className="w-full h-[660px] lg:h-[720px] border-0 rounded-2xl block bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
