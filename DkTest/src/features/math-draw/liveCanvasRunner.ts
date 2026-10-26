/**
 * @license
 * Live Canvas Code Runner Engine
 * Allows Admin to write JavaScript code that executes directly on a Canvas block
 * to draw custom math diagrams, variation tables, geometry, or function plots.
 */

import { compileMathExpression } from "./graphRenderer";
import { parseBBTContent, BBTConfig } from "./bbtRenderer";

export interface LiveCanvasExecutionResult {
  success: boolean;
  error?: string;
  effectiveWidth?: number;
  effectiveHeight?: number;
}

export interface LiveCanvasHelpers {
  drawAxes: (options?: {
    xRange?: [number, number];
    yRange?: [number, number];
    stepX?: number;
    stepY?: number;
    showGrid?: boolean;
    color?: string;
  }) => void;
  toSvgX: (x: number) => number;
  toSvgY: (y: number) => number;
  plot: (
    fn: string | ((x: number) => number),
    options?: { color?: string; width?: number; dashed?: boolean }
  ) => void;
  drawPoint: (
    x: number,
    y: number,
    label?: string,
    options?: { color?: string; showProjection?: boolean }
  ) => void;
  drawArrow: (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: { color?: string; width?: number; headSize?: number }
  ) => void;
  drawBBT: (config: any) => void;
}

/**
 * Creates drawing helper functions bound to the specific canvas and coordinate system.
 */
export function createLiveCanvasHelpers(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  initialXRange: [number, number] = [-4, 4],
  initialYRange: [number, number] = [-4, 4]
): LiveCanvasHelpers {
  let xRange = [...initialXRange] as [number, number];
  let yRange = [...initialYRange] as [number, number];
  const padding = 36;

  const toSvgX = (x: number) =>
    padding + ((x - xRange[0]) / (xRange[1] - xRange[0])) * (width - padding * 2);
  const toSvgY = (y: number) =>
    padding + ((yRange[1] - y) / (yRange[1] - yRange[0])) * (height - padding * 2);

  const drawAxes: LiveCanvasHelpers["drawAxes"] = (options) => {
    if (options?.xRange) xRange = [...options.xRange];
    if (options?.yRange) yRange = [...options.yRange];
    const showGrid = options?.showGrid !== false;
    const color = options?.color || "#334155";

    // Grid
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = "#f1f5f9";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      const stepX = options?.stepX || ((xRange[1] - xRange[0]) > 10 ? 2 : 1);
      for (let x = Math.ceil(xRange[0]); x <= Math.floor(xRange[1]); x += stepX) {
        if (x === 0) continue;
        const sx = toSvgX(x);
        ctx.beginPath();
        ctx.moveTo(sx, padding);
        ctx.lineTo(sx, height - padding);
        ctx.stroke();
      }

      const stepY = options?.stepY || ((yRange[1] - yRange[0]) > 10 ? 2 : 1);
      for (let y = Math.ceil(yRange[0]); y <= Math.floor(yRange[1]); y += stepY) {
        if (y === 0) continue;
        const sy = toSvgY(y);
        ctx.beginPath();
        ctx.moveTo(padding, sy);
        ctx.lineTo(width - padding, sy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Axes
    const originX = Math.max(padding, Math.min(width - padding, toSvgX(0)));
    const originY = Math.max(padding, Math.min(height - padding, toSvgY(0)));

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;

    // Ox
    ctx.beginPath();
    ctx.moveTo(padding - 10, originY);
    ctx.lineTo(width - padding + 15, originY);
    ctx.stroke();

    // Ox arrow
    ctx.beginPath();
    ctx.moveTo(width - padding + 20, originY);
    ctx.lineTo(width - padding + 12, originY - 4);
    ctx.lineTo(width - padding + 12, originY + 4);
    ctx.fill();

    // Oy
    ctx.beginPath();
    ctx.moveTo(originX, height - padding + 10);
    ctx.lineTo(originX, padding - 15);
    ctx.stroke();

    // Oy arrow
    ctx.beginPath();
    ctx.moveTo(originX, padding - 20);
    ctx.lineTo(originX - 4, padding - 12);
    ctx.lineTo(originX + 4, padding - 12);
    ctx.fill();

    // Labels
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillText("x", width - padding + 22, originY + 4);
    ctx.fillText("y", originX + 6, padding - 16);
    ctx.fillText("O", originX - 12, originY + 14);

    // Number ticks
    ctx.font = "9px system-ui, sans-serif";
    ctx.fillStyle = "#64748b";
    const stepX = options?.stepX || ((xRange[1] - xRange[0]) > 10 ? 2 : 1);
    for (let x = Math.ceil(xRange[0]); x <= Math.floor(xRange[1]); x += stepX) {
      if (x === 0) continue;
      const sx = toSvgX(x);
      ctx.beginPath();
      ctx.moveTo(sx, originY - 3);
      ctx.lineTo(sx, originY + 3);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillText(String(x), sx, originY + 14);
    }

    const stepY = options?.stepY || ((yRange[1] - yRange[0]) > 10 ? 2 : 1);
    for (let y = Math.ceil(yRange[0]); y <= Math.floor(yRange[1]); y += stepY) {
      if (y === 0) continue;
      const sy = toSvgY(y);
      ctx.beginPath();
      ctx.moveTo(originX - 3, sy);
      ctx.lineTo(originX + 3, sy);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(String(y), originX - 6, sy + 3);
    }

    ctx.restore();
  };

  const plot: LiveCanvasHelpers["plot"] = (fn, options) => {
    const evalFn = typeof fn === "function" ? fn : compileMathExpression(fn);

    ctx.save();
    ctx.strokeStyle = options?.color || "#2563eb";
    ctx.lineWidth = options?.width || 2;
    if (options?.dashed) ctx.setLineDash([4, 4]);

    ctx.beginPath();
    const sampleCount = 400;
    const dx = (xRange[1] - xRange[0]) / sampleCount;
    let isDrawing = false;
    let prevY: number | null = null;

    for (let i = 0; i <= sampleCount; i++) {
      const x = xRange[0] + i * dx;
      const y = evalFn(x);

      if (isNaN(y) || !isFinite(y) || y < yRange[0] - 10 || y > yRange[1] + 10) {
        isDrawing = false;
        prevY = null;
        continue;
      }

      if (prevY !== null && Math.abs(y - prevY) > (yRange[1] - yRange[0]) * 0.8) {
        isDrawing = false;
        prevY = null;
      }

      const sx = toSvgX(x);
      const sy = toSvgY(y);

      if (!isDrawing) {
        ctx.moveTo(sx, sy);
        isDrawing = true;
      } else {
        ctx.lineTo(sx, sy);
      }
      prevY = y;
    }
    ctx.stroke();
    ctx.restore();
  };

  const drawPoint: LiveCanvasHelpers["drawPoint"] = (x, y, label, options) => {
    const sx = toSvgX(x);
    const sy = toSvgY(y);
    const color = options?.color || "#4f46e5";

    ctx.save();
    if (options?.showProjection) {
      const originX = toSvgX(0);
      const originY = toSvgY(0);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, originY);
      ctx.moveTo(sx, sy);
      ctx.lineTo(originX, sy);
      ctx.stroke();
    }

    // Dot
    ctx.fillStyle = color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Label
    if (label) {
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillStyle = "#1e293b";
      ctx.textAlign = "center";
      ctx.fillText(label, sx, y >= 0 ? sy - 8 : sy + 16);
    }
    ctx.restore();
  };

  const drawArrow: LiveCanvasHelpers["drawArrow"] = (x1, y1, x2, y2, options) => {
    const color = options?.color || "#2563eb";
    const widthLine = options?.width || 2;
    const headSize = options?.headSize || 8;

    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = widthLine;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headSize * Math.cos(angle - Math.PI / 6),
      y2 - headSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headSize * Math.cos(angle + Math.PI / 6),
      y2 - headSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawBBT: LiveCanvasHelpers["drawBBT"] = (config) => {
    ctx.save();
    const startX = 20;
    const startY = 20;
    const tableW = width - 40;
    const headerW = 60;
    const rowH = 34;

    if (!config) {
      // Draw empty 3-row layout template
      const tableH = rowH * 2 + 76;
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, startY, tableW, tableH);
      ctx.beginPath();
      ctx.moveTo(startX + headerW, startY); ctx.lineTo(startX + headerW, startY + tableH);
      ctx.moveTo(startX, startY + rowH); ctx.lineTo(startX + tableW, startY + rowH);
      ctx.moveTo(startX, startY + rowH * 2); ctx.lineTo(startX + tableW, startY + rowH * 2);
      ctx.stroke();

      ctx.fillStyle = "#1e293b";
      ctx.font = "italic bold 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("x", startX + headerW / 2, startY + rowH / 2);
      ctx.fillText("y'", startX + headerW / 2, startY + rowH * 1.5);
      ctx.fillText("y", startX + headerW / 2, startY + rowH * 2 + 38);
      ctx.restore();
      return;
    }

    const bbt: BBTConfig = typeof config === "string" ? parseBBTContent(config) : config;
    const { variable = "x", derivativeLabel = "y'", functionLabel = "y", points = [], intervals = [] } = bbt;

    const hasFunctionRow = Boolean(functionLabel && functionLabel.trim()) && points.some((p) => Boolean(p.y) || p.yPos !== undefined || Boolean(p.leftLimit) || Boolean(p.rightLimit));
    const tableH = hasFunctionRow ? rowH * 2 + 76 : rowH * 2;

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, tableW, tableH);

    // Vertical line after header
    ctx.beginPath();
    ctx.moveTo(startX + headerW, startY);
    ctx.lineTo(startX + headerW, startY + tableH);
    // Row 1 bottom line
    ctx.moveTo(startX, startY + rowH);
    ctx.lineTo(startX + tableW, startY + rowH);
    if (hasFunctionRow) {
      // Row 2 bottom line
      ctx.moveTo(startX, startY + rowH * 2);
      ctx.lineTo(startX + tableW, startY + rowH * 2);
    }
    ctx.stroke();

    // Headers
    ctx.fillStyle = "#1e293b";
    ctx.font = "italic bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(variable, startX + headerW / 2, startY + rowH / 2);
    ctx.fillText(derivativeLabel, startX + headerW / 2, startY + rowH * 1.5);
    if (hasFunctionRow) {
      ctx.fillText(functionLabel, startX + headerW / 2, startY + rowH * 2 + 38);
    }

    // Column positions
    const colCount = points.length + intervals.length;
    const contentW = tableW - headerW;
    const colW = contentW / Math.max(1, colCount);

    const getColX = (ptIdx: number) => startX + headerW + (ptIdx * 2 + 0.5) * colW;
    const getIntervalX = (intIdx: number) => startX + headerW + (intIdx * 2 + 1.5) * colW;

    // Row 1: x values
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillStyle = "#0f172a";
    for (let i = 0; i < points.length; i++) {
      const cleanX = points[i].x.replace(/\\infty/g, "∞").replace(/-/g, "−");
      ctx.fillText(cleanX, getColX(i), startY + rowH / 2);
    }

    // Row 2: derivative signs
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (pt.isDoubleBar || pt.yPrime === "||") {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.fillText("||", getColX(i), startY + rowH * 1.5);
      } else if (pt.yPrime) {
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.fillText(pt.yPrime, getColX(i), startY + rowH * 1.5);
      }
    }
    for (let i = 0; i < intervals.length; i++) {
      const sign = intervals[i].sign;
      ctx.fillStyle = sign === "+" ? "#2563eb" : sign === "-" ? "#dc2626" : "#0f172a";
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillText(sign === "-" ? "−" : sign, getIntervalX(i), startY + rowH * 1.5);
    }

    // Row 3: function variation arrows and values
    if (hasFunctionRow) {
      const yTop = startY + rowH * 2 + 16;
      const yBottom = startY + tableH - 16;
      const yMid = startY + rowH * 2 + 38;

      // Vertical asymptotes
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (pt.isDoubleBar) {
          const cx = getColX(i);
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx - 2.5, startY + rowH * 2); ctx.lineTo(cx - 2.5, startY + tableH);
          ctx.moveTo(cx + 2.5, startY + rowH * 2); ctx.lineTo(cx + 2.5, startY + tableH);
          ctx.stroke();
        }
      }

      // Arrows
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const sign = intervals[i]?.sign;

        const x1 = getColX(i);
        const x2 = getColX(i + 1);

        const getY = (pt: any, isStart: boolean) => {
          if (pt.isDoubleBar) {
            return isStart
              ? (pt.rightLimit?.includes("+") ? yTop : yBottom)
              : (pt.leftLimit?.includes("+") ? yTop : yBottom);
          }
          if (pt.yPos === "top") return yTop;
          if (pt.yPos === "bottom") return yBottom;
          return sign === "+" ? (isStart ? yBottom : yTop) : (isStart ? yTop : yBottom);
        };

        const y1 = getY(p1, true);
        const y2 = getY(p2, false);
        const isRising = y1 > y2;
        const color = isRising ? "#2563eb" : "#dc2626";

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const pad = Math.min(22, len * 0.2);

        drawArrow(
          x1 + (dx / len) * pad,
          y1 + (dy / len) * pad,
          x2 - (dx / len) * pad,
          y2 - (dy / len) * pad,
          { color, width: 2, headSize: 7 }
        );
      }

      // Values
      ctx.font = "bold 11px system-ui, sans-serif";
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const cx = getColX(i);
        if (pt.isDoubleBar) {
          if (pt.leftLimit) {
            const ly = pt.leftLimit.includes("+") ? yTop : yBottom;
            ctx.fillStyle = "#0f172a";
            ctx.textAlign = "right";
            ctx.fillText(pt.leftLimit.replace(/\\infty/g, "∞").replace(/-/g, "−"), cx - 6, ly);
          }
          if (pt.rightLimit) {
            const ry = pt.rightLimit.includes("+") ? yTop : yBottom;
            ctx.fillStyle = "#0f172a";
            ctx.textAlign = "left";
            ctx.fillText(pt.rightLimit.replace(/\\infty/g, "∞").replace(/-/g, "−"), cx + 6, ry);
          }
        } else if (pt.y) {
          const cy = pt.yPos === "top" ? yTop : pt.yPos === "bottom" ? yBottom : yMid;
          ctx.fillStyle = "#0f172a";
          ctx.textAlign = "center";
          ctx.fillText(pt.y.replace(/\\infty/g, "∞").replace(/-/g, "−"), cx, cy);
        }
      }
    }

    ctx.restore();
  };

  return {
    drawAxes,
    toSvgX,
    toSvgY,
    plot,
    drawPoint,
    drawArrow,
    drawBBT,
  };
}

/**
 * Cleans and normalizes canvas JavaScript code:
 * 1. Decodes HTML entities (&amp;, &lt;, &gt;, &quot;, &#39;, &nbsp;, numeric entities).
 * 2. Normalizes smart quotes (“ ”, ‘ ’) to standard (" ').
 * 3. Normalizes unicode dashes/minus (−, –, —) to standard (-).
 * 4. Normalizes non-breaking spaces (\u00A0) to standard spaces and removes zero-width characters.
 */
export function cleanCanvasCode(str: string): string {
  if (!str || typeof str !== "string") return "";

  let cleaned = str;

  if (cleaned.includes("&")) {
    cleaned = cleaned
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&#x27;|&apos;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_, dec) => {
        try {
          return String.fromCharCode(parseInt(dec, 10));
        } catch {
          return _;
        }
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        try {
          return String.fromCharCode(parseInt(hex, 16));
        } catch {
          return _;
        }
      });
  }

  // Normalize smart quotes and typographic characters that cause SyntaxError: Invalid or unexpected token
  return cleaned
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/[\u00A0\u202F\u2007]/g, " ")
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
}

export function decodeHtmlEntities(str: string): string {
  return cleanCanvasCode(str);
}

/**
 * Injects safety iteration counters into loops to prevent infinite freezes.
 * Uses lexical scanning to safely preserve strings, comments, and single-statement contexts.
 */
export function protectCodeAgainstInfiniteLoops(code: string): string {
  if (!code || typeof code !== "string") return "";
  if (code.includes("__iterGuard")) return code;

  try {
    let result = "";
    let i = 0;
    const len = code.length;

    while (i < len) {
      const ch = code[i];
      const next = code[i + 1];

      // 1. Single-line comment: // ...
      if (ch === "/" && next === "/") {
        const end = code.indexOf("\n", i + 2);
        if (end === -1) {
          result += code.slice(i);
          break;
        } else {
          result += code.slice(i, end + 1);
          i = end + 1;
          continue;
        }
      }

      // 2. Multi-line comment: /* ... */
      if (ch === "/" && next === "*") {
        const end = code.indexOf("*/", i + 2);
        if (end === -1) {
          result += code.slice(i);
          break;
        } else {
          result += code.slice(i, end + 2);
          i = end + 2;
          continue;
        }
      }

      // 3. Single-quoted string: '...'
      if (ch === "'") {
        let end = i + 1;
        while (end < len) {
          if (code[end] === "\\") {
            end += 2;
          } else if (code[end] === "'") {
            end++;
            break;
          } else {
            end++;
          }
        }
        result += code.slice(i, end);
        i = end;
        continue;
      }

      // 4. Double-quoted string: "..."
      if (ch === '"') {
        let end = i + 1;
        while (end < len) {
          if (code[end] === "\\") {
            end += 2;
          } else if (code[end] === '"') {
            end++;
            break;
          } else {
            end++;
          }
        }
        result += code.slice(i, end);
        i = end;
        continue;
      }

      // 5. Template literal: `...`
      if (ch === "`") {
        let end = i + 1;
        while (end < len) {
          if (code[end] === "\\") {
            end += 2;
          } else if (code[end] === "`") {
            end++;
            break;
          } else if (code[end] === "$" && code[end + 1] === "{") {
            let depth = 1;
            end += 2;
            while (end < len && depth > 0) {
              const c = code[end];
              if (c === "\\") {
                end += 2;
                continue;
              }
              if (c === "'" || c === '"' || c === "`") {
                const q = c;
                end++;
                while (end < len && code[end] !== q) {
                  if (code[end] === "\\") end++;
                  end++;
                }
                if (end < len) end++;
                continue;
              }
              if (c === "{") depth++;
              else if (c === "}") depth--;
              end++;
            }
          } else {
            end++;
          }
        }
        result += code.slice(i, end);
        i = end;
        continue;
      }

      // 5b. Regular expression literal: /.../
      if (ch === "/" && next !== "/" && next !== "*") {
        let p = i - 1;
        while (p >= 0 && /\s/.test(code[p])) p--;
        const pChar = p >= 0 ? code[p] : "";
        const isRegexStart = p < 0 || /[(=:[,!&|?;~^{}]/.test(pChar) || /^(?:return|throw|typeof)$/.test(code.slice(Math.max(0, p - 6), p + 1));
        if (isRegexStart) {
          let end = i + 1;
          let inClass = false;
          while (end < len) {
            if (code[end] === "\\") {
              end += 2;
            } else if (code[end] === "[" && !inClass) {
              inClass = true;
              end++;
            } else if (code[end] === "]" && inClass) {
              inClass = false;
              end++;
            } else if (code[end] === "/" && !inClass) {
              end++;
              while (end < len && /[a-z]/i.test(code[end])) end++;
              break;
            } else if (code[end] === "\n") {
              break;
            } else {
              end++;
            }
          }
          if (end > i + 1 && code[end - 1] !== "\n") {
            result += code.slice(i, end);
            i = end;
            continue;
          }
        }
      }

      // 6. Check for loop keywords: `for`, `while`
      const prevChar = i > 0 ? code[i - 1] : " ";
      const isWordBoundary = !/[a-zA-Z0-9_$]/.test(prevChar);

      if (isWordBoundary) {
        if (code.startsWith("for", i) && !/[a-zA-Z0-9_$]/.test(code[i + 3] || "")) {
          let p = i + 3;
          while (p < len && /\s/.test(code[p])) p++;
          if (p < len && code[p] === "(") {
            let depth = 1;
            let pEnd = p + 1;
            while (pEnd < len && depth > 0) {
              const c = code[pEnd];
              if (c === "(") depth++;
              else if (c === ")") depth--;
              else if (c === "'" || c === '"' || c === "`") {
                const q = c;
                pEnd++;
                while (pEnd < len && code[pEnd] !== q) {
                  if (code[pEnd] === "\\") pEnd++;
                  pEnd++;
                }
              }
              pEnd++;
            }
            if (depth === 0) {
              let b = pEnd;
              while (b < len && /\s/.test(code[b])) b++;
              if (b < len && code[b] === "{") {
                result += code.slice(i, b + 1);
                result += ` if (++__iterGuard > 100000) throw new Error("Vòng lặp vượt quá giới hạn an toàn (quá 100,000 lần)");`;
                i = b + 1;
                continue;
              }
            }
          }
        } else if (code.startsWith("while", i) && !/[a-zA-Z0-9_$]/.test(code[i + 5] || "")) {
          let p = i + 5;
          while (p < len && /\s/.test(code[p])) p++;
          if (p < len && code[p] === "(") {
            let depth = 1;
            let pEnd = p + 1;
            while (pEnd < len && depth > 0) {
              const c = code[pEnd];
              if (c === "(") depth++;
              else if (c === ")") depth--;
              else if (c === "'" || c === '"' || c === "`") {
                const q = c;
                pEnd++;
                while (pEnd < len && code[pEnd] !== q) {
                  if (code[pEnd] === "\\") pEnd++;
                  pEnd++;
                }
              }
              pEnd++;
            }
            if (depth === 0) {
              let b = pEnd;
              while (b < len && /\s/.test(code[b])) b++;
              if (b < len && code[b] === "{") {
                result += code.slice(i, b + 1);
                result += ` if (++__iterGuard > 100000) throw new Error("Vòng lặp vượt quá giới hạn an toàn (quá 100,000 lần)");`;
                i = b + 1;
                continue;
              }
            }
          }
        }
      }

      result += ch;
      i++;
    }

    return result;
  } catch (err) {
    console.warn("protectCodeAgainstInfiniteLoops fallback to raw code:", err);
    return code;
  }
}

export interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  hasDrawn: boolean;
}

/**
 * Runs a dry-run execution with a coordinate tracking context to measure
 * the actual drawn bounding box of arbitrary canvas code.
 */
export function detectContentBounds(
  code: string,
  initialWidth: number,
  initialHeight: number
): ContentBounds | null {
  try {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasDrawn = false;

    let curMatrix = [1, 0, 0, 1, 0, 0];
    const matrixStack: number[][] = [];

    const transformPoint = (x: number, y: number): [number, number] => {
      const [a, b, c, d, e, f] = curMatrix;
      return [x * a + y * c + e, x * b + y * d + f];
    };

    const addPoint = (x: number, y: number) => {
      if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) return;
      const [tx, ty] = transformPoint(x, y);
      if (tx < minX) minX = tx;
      if (tx > maxX) maxX = tx;
      if (ty < minY) minY = ty;
      if (ty > maxY) maxY = ty;
      hasDrawn = true;
    };

    let curFont = "16px sans-serif";
    let curTextAlign = "left";
    let curTextBaseline = "alphabetic";

    const fakeCtxTarget: any = {
      canvas: { width: initialWidth, height: initialHeight },
      get font() { return curFont; },
      set font(val: string) { curFont = val; },
      get textAlign() { return curTextAlign; },
      set textAlign(val: string) { curTextAlign = val; },
      get textBaseline() { return curTextBaseline; },
      set textBaseline(val: string) { curTextBaseline = val; },
      strokeStyle: "#000",
      fillStyle: "#000",
      lineWidth: 1,
      lineCap: "butt",
      lineJoin: "miter",
      miterLimit: 10,
      shadowBlur: 0,
      shadowColor: "rgba(0,0,0,0)",
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",

      save() {
        matrixStack.push([...curMatrix]);
      },
      restore() {
        if (matrixStack.length > 0) curMatrix = matrixStack.pop()!;
      },
      scale(sx: number, sy: number) {
        const [a, b, c, d, e, f] = curMatrix;
        curMatrix = [a * sx, b * sx, c * sy, d * sy, e, f];
      },
      rotate(angle: number) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const [a, b, c, d, e, f] = curMatrix;
        curMatrix = [
          a * cos + c * sin,
          b * cos + d * sin,
          a * -sin + c * cos,
          b * -sin + d * cos,
          e,
          f,
        ];
      },
      translate(dx: number, dy: number) {
        const [a, b, c, d, e, f] = curMatrix;
        curMatrix = [a, b, c, d, a * dx + c * dy + e, b * dx + d * dy + f];
      },
      transform(a2: number, b2: number, c2: number, d2: number, e2: number, f2: number) {
        const [a, b, c, d, e, f] = curMatrix;
        curMatrix = [
          a * a2 + c * b2,
          b * a2 + d * b2,
          a * c2 + c * d2,
          b * c2 + d * d2,
          a * e2 + c * f2 + e,
          b * e2 + d * f2 + f,
        ];
      },
      setTransform(a2?: any, b2?: any, c2?: any, d2?: any, e2?: any, f2?: any) {
        if (typeof a2 === "object" && a2 !== null) {
          curMatrix = [a2.a, a2.b, a2.c, a2.d, a2.e, a2.f];
        } else if (arguments.length >= 6) {
          curMatrix = [a2, b2, c2, d2, e2, f2];
        } else {
          curMatrix = [1, 0, 0, 1, 0, 0];
        }
      },
      resetTransform() {
        curMatrix = [1, 0, 0, 1, 0, 0];
      },
      getTransform() {
        return {
          a: curMatrix[0], b: curMatrix[1],
          c: curMatrix[2], d: curMatrix[3],
          e: curMatrix[4], f: curMatrix[5],
        };
      },

      beginPath() {},
      closePath() {},
      moveTo(x: number, y: number) { addPoint(x, y); },
      lineTo(x: number, y: number) { addPoint(x, y); },
      rect(x: number, y: number, w: number, h: number) {
        addPoint(x, y);
        addPoint(x + w, y + h);
      },
      strokeRect(x: number, y: number, w: number, h: number) {
        addPoint(x, y);
        addPoint(x + w, y + h);
      },
      fillRect(x: number, y: number, w: number, h: number) {
        const isBg = Math.abs(x) <= 2 && Math.abs(y) <= 2 && w >= initialWidth - 10 && h >= initialHeight - 10;
        if (!isBg) {
          addPoint(x, y);
          addPoint(x + w, y + h);
        }
      },
      clearRect() {},
      arc(x: number, y: number, r: number) {
        addPoint(x - r, y - r);
        addPoint(x + r, y + r);
      },
      ellipse(x: number, y: number, rx: number, ry: number) {
        addPoint(x - rx, y - ry);
        addPoint(x + rx, y + ry);
      },
      roundRect(x: number, y: number, w: number, h: number) {
        addPoint(x, y);
        addPoint(x + w, y + h);
      },
      arcTo(x1: number, y1: number, x2: number, y2: number) {
        addPoint(x1, y1);
        addPoint(x2, y2);
      },
      bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) {
        addPoint(cp1x, cp1y);
        addPoint(cp2x, cp2y);
        addPoint(x, y);
      },
      quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
        addPoint(cpx, cpy);
        addPoint(x, y);
      },
      stroke() {},
      fill() {},
      fillText(text: any, x: number, y: number, maxWidth?: number) {
        const str = String(text ?? "");
        const fontMatch = curFont.match(/(\d+)px/);
        const fontSize = fontMatch ? parseInt(fontMatch[1], 10) : 16;
        const approxCharWidth = fontSize * 0.55;
        const tw = maxWidth || Math.max(12, str.length * approxCharWidth);

        let left = x;
        if (curTextAlign === "center") left = x - tw / 2;
        else if (curTextAlign === "right") left = x - tw;

        let top = y - fontSize * 0.85;
        if (curTextBaseline === "top" || curTextBaseline === "hanging") top = y;
        else if (curTextBaseline === "middle") top = y - fontSize / 2;
        else if (curTextBaseline === "bottom") top = y - fontSize;

        addPoint(left, top);
        addPoint(left + tw, top + fontSize);
      },
      strokeText(text: any, x: number, y: number, maxWidth?: number) {
        this.fillText(text, x, y, maxWidth);
      },
      measureText(text: any) {
        const str = String(text ?? "");
        const fontMatch = curFont.match(/(\d+)px/);
        const fontSize = fontMatch ? parseInt(fontMatch[1], 10) : 16;
        return { width: str.length * fontSize * 0.55 };
      },
      drawImage(img: any, dx: number, dy: number, dw?: number, dh?: number) {
        const w = dw || img?.width || 100;
        const h = dh || img?.height || 100;
        addPoint(dx, dy);
        addPoint(dx + w, dy + h);
      },
      clip() {},
      setLineDash() {},
      getLineDash() { return []; },
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
      createPattern() { return null; },
    };

    const fakeCtx = new Proxy(fakeCtxTarget, {
      get(target, prop) {
        if (prop in target) return target[prop];
        return () => {};
      },
    });

    const fakeCanvas: any = {
      width: initialWidth,
      height: initialHeight,
      getContext: () => fakeCtx,
      style: {},
    };

    const helpers = createLiveCanvasHelpers(fakeCanvas, fakeCtx, initialWidth, initialHeight);
    const cleanCode = decodeHtmlEntities(code);
    const safeCode = protectCodeAgainstInfiniteLoops(cleanCode);
    runAdminCanvasCode(safeCode, fakeCanvas, fakeCtx, initialWidth, initialHeight, helpers);

    if (!hasDrawn || !isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
      return null;
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
      hasDrawn: true,
    };
  } catch {
    return null;
  }
}

/**
 * Free-form code runner for canvas drawing:
 * Enables admins to define functions, variables, IIFEs, helpers,
 * and direct Math helpers without syntax collisions.
 */
function runAdminCanvasCode(
  code: string,
  canvas: any,
  ctx: any,
  width: number,
  height: number,
  helpers: LiveCanvasHelpers
) {
  const mathGlobals = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    atan: Math.atan,
    atan2: Math.atan2,
    asin: Math.asin,
    acos: Math.acos,
    sqrt: Math.sqrt,
    abs: Math.abs,
    PI: Math.PI,
    E: Math.E,
    min: Math.min,
    max: Math.max,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    trunc: Math.trunc,
    sign: Math.sign,
    pow: Math.pow,
    log: Math.log,
    log10: Math.log10,
    log2: Math.log2,
    exp: Math.exp,
    random: Math.random,
    hypot: Math.hypot,
    toRad: (deg: number) => (deg * Math.PI) / 180,
    toDeg: (rad: number) => (rad * 180) / Math.PI,
    clamp: (val: number, minVal: number, maxVal: number) => Math.max(minVal, Math.min(maxVal, val)),
  };

  const fn = new Function(
    "__ctx",
    "__canvas",
    "__width",
    "__height",
    "__helpers",
    "__math",
    `
    var __iterGuard = 0;
    var ctx = __ctx;
    var canvas = __canvas;
    var width = __width;
    var height = __height;
    var helpers = __helpers;
    var drawAxes = __helpers.drawAxes;
    var plot = __helpers.plot;
    var drawPoint = __helpers.drawPoint;
    var drawArrow = __helpers.drawArrow;
    var drawBBT = __helpers.drawBBT;
    var toSvgX = __helpers.toSvgX;
    var toSvgY = __helpers.toSvgY;
    var sin = __math.sin;
    var cos = __math.cos;
    var tan = __math.tan;
    var atan = __math.atan;
    var atan2 = __math.atan2;
    var asin = __math.asin;
    var acos = __math.acos;
    var sqrt = __math.sqrt;
    var abs = __math.abs;
    var PI = __math.PI;
    var E = __math.E;
    var min = __math.min;
    var max = __math.max;
    var round = __math.round;
    var floor = __math.floor;
    var ceil = __math.ceil;
    var trunc = __math.trunc;
    var sign = __math.sign;
    var pow = __math.pow;
    var log = __math.log;
    var log10 = __math.log10;
    var log2 = __math.log2;
    var exp = __math.exp;
    var random = __math.random;
    var hypot = __math.hypot;
    var toRad = __math.toRad;
    var toDeg = __math.toDeg;
    var clamp = __math.clamp;

    {
      ${code}
    }
    `
  );

  fn(ctx, canvas, width, height, helpers, mathGlobals);
}

/**
 * Scans rendered pixels to eliminate excessive trailing whitespace at the bottom
 * of the canvas, ensuring balanced, textbook-clean illustrations.
 */
function trimExcessCanvasWhitespace(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  dpr: number
): number | null {
  try {
    if (typeof document === "undefined" || typeof ctx.getImageData !== "function") return null;
    if (canvas.width <= 0 || canvas.height <= 0) return null;
    if (canvas.width * canvas.height > 4000000) return null;

    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let bottom = -1;
    for (let y = h - 1; y >= 0; y -= 2) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x += 4) {
        const idx = rowOffset + x * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a > 30 && (r < 248 || g < 248 || b < 248)) {
          bottom = y;
          break;
        }
      }
      if (bottom !== -1) break;
    }

    if (bottom === -1) return null;

    const naturalBottomCss = Math.ceil(bottom / dpr);
    const currentHeightCss = Math.ceil(h / dpr);
    const excessWhiteAtBottom = currentHeightCss - naturalBottomCss;

    if (excessWhiteAtBottom > 24) {
      const newHeightCss = Math.max(50, naturalBottomCss + 16);
      const newHeightActual = Math.round(newHeightCss * dpr);

      const copyCanvas = document.createElement("canvas");
      copyCanvas.width = w;
      copyCanvas.height = newHeightActual;
      const copyCtx = copyCanvas.getContext("2d");
      if (copyCtx) {
        copyCtx.drawImage(canvas, 0, 0, w, newHeightActual, 0, 0, w, newHeightActual);
        canvas.height = newHeightActual;
        if (canvas.style) {
          canvas.style.maxWidth = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.margin = "0 auto";
        }
        ctx.resetTransform?.();
        ctx.drawImage(copyCanvas, 0, 0);
        return newHeightCss;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export interface LiveCanvasExecutionOptions {
  skipTrim?: boolean;
}

/**
 * Safely executes admin code on an HTML5 canvas element with high DPI scaling,
 * automatic coordinate bounding, responsive proportions, and excess whitespace elimination.
 */
export function executeLiveCanvasCode(
  canvas: HTMLCanvasElement,
  code: string,
  width = 500,
  height = 340,
  options?: LiveCanvasExecutionOptions
): LiveCanvasExecutionResult {
  if (!canvas) return { success: false, error: "Canvas element not found" };

  try {
    const rawCleanCode = decodeHtmlEntities(code);
    const safeCode = protectCodeAgainstInfiniteLoops(rawCleanCode);

    // 1. Detect content bounding box to auto-adjust dimensions
    const bounds = detectContentBounds(safeCode, width, height);

    let effectiveWidth = width;
    let effectiveHeight = height;

    if (bounds && bounds.hasDrawn) {
      // If horizontal coordinates exceed requested width (e.g. chemical chain up to x=775),
      // expand canvas width so drawing isn't clipped
      if (bounds.maxX > width - 15) {
        const leftMargin = Math.max(16, bounds.minX > 0 ? bounds.minX : 20);
        effectiveWidth = Math.ceil(bounds.maxX + leftMargin);
      }

      // Eliminate excessive blank whitespace below content (e.g. BBT height ~175 vs 340)
      const topPad = Math.max(12, bounds.minY > 0 ? bounds.minY : 16);
      const bottomMargin = Math.max(12, Math.min(32, topPad));
      const contentNeededHeight = Math.ceil(bounds.maxY + bottomMargin);

      if (contentNeededHeight < height - 16) {
        effectiveHeight = Math.max(50, contentNeededHeight);
      } else if (bounds.maxY > height - 10) {
        effectiveHeight = Math.ceil(bounds.maxY + bottomMargin);
      }
    }

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = effectiveWidth * dpr;
    canvas.height = effectiveHeight * dpr;
    if (canvas.style) {
      canvas.style.width = `${effectiveWidth}px`;
      canvas.style.maxWidth = "100%";
      canvas.style.height = "auto";
      canvas.style.display = "block";
      canvas.style.margin = "0 auto";
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return { success: false, error: "Canvas 2D context not available" };

    // Polyfill modern canvas 2D methods for older browsers if missing
    if (typeof (ctx as any).roundRect !== "function") {
      (ctx as any).roundRect = function (x: number, y: number, w: number, h: number) {
        if (typeof this.rect === "function") this.rect(x, y, w, h);
      };
    }
    if (typeof (ctx as any).ellipse !== "function") {
      (ctx as any).ellipse = function (x: number, y: number, rx: number, ry: number) {
        this.save?.();
        this.translate?.(x, y);
        this.scale?.(rx, ry);
        this.arc?.(0, 0, 1, 0, 2 * Math.PI);
        this.restore?.();
      };
    }

    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);

    // Clear background with clean white
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, effectiveWidth, effectiveHeight);

    const helpers = createLiveCanvasHelpers(canvas, ctx, effectiveWidth, effectiveHeight);

    // Execute admin canvas code in safe scope
    runAdminCanvasCode(safeCode, canvas, ctx, effectiveWidth, effectiveHeight, helpers);

    // Trim trailing white pixels if canvas has excess empty space (skipped in fast interactive preview)
    if (!options?.skipTrim) {
      const trimmedHeight = trimExcessCanvasWhitespace(canvas, ctx, dpr);
      if (trimmedHeight && trimmedHeight > 0) {
        effectiveHeight = trimmedHeight;
      }
    }

    return {
      success: true,
      effectiveWidth,
      effectiveHeight,
    };
  } catch (err: any) {
    console.error("LiveCanvas execution error:", err);
    // Draw visual error indicator directly on canvas for immediate feedback
    try {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff1f2";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#e11d48";
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("⚠️ Lỗi thực thi mã Canvas (Live Code Error):", 16, 28);
        ctx.fillStyle = "#334155";
        ctx.font = "11px Consolas, monospace";
        const msg = String(err?.message || err);
        ctx.fillText(msg.slice(0, 75), 16, 52);
        if (msg.length > 75) ctx.fillText(msg.slice(75, 150), 16, 70);
      }
    } catch {
      // Ignore canvas drawing errors during error rendering
    }
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Pre-built templates for Live Code Runner
 */
export const LIVE_CANVAS_TEMPLATES = [
  {
    id: "bbt_canvas",
    title: "Code Bảng Biến Thiên trực tiếp",
    code: `// 1. Vẽ khung bảng biến thiên
drawBBT();

// 2. Điền các giá trị x và y'
ctx.font = "bold 12px sans-serif";
ctx.fillStyle = "#0f172a";
ctx.textAlign = "center";

// Hàng x
ctx.fillText("-∞", 120, 38);
ctx.fillText("-1", 200, 38);
ctx.fillText("1", 320, 38);
ctx.fillText("+∞", 420, 38);

// Hàng y'
ctx.fillStyle = "#2563eb";
ctx.fillText("+", 160, 74);
ctx.fillStyle = "#0f172a";
ctx.fillText("0", 200, 74);
ctx.fillStyle = "#dc2626";
ctx.fillText("-", 260, 74);
ctx.fillStyle = "#0f172a";
ctx.fillText("0", 320, 74);
ctx.fillStyle = "#2563eb";
ctx.fillText("+", 370, 74);

// 3. Vẽ mũi tên biến thiên hàng y
// -∞ đi lên 3
drawArrow(120, 160, 195, 110, { color: "#2563eb", width: 2 });
ctx.fillText("-∞", 115, 175);
ctx.fillText("3", 200, 100);

// 3 đi xuống -1
drawArrow(205, 110, 315, 160, { color: "#dc2626", width: 2 });
ctx.fillText("-1", 320, 175);

// -1 đi lên +∞
drawArrow(325, 160, 415, 110, { color: "#2563eb", width: 2 });
ctx.fillText("+∞", 425, 100);`,
  },
  {
    id: "graph_poly",
    title: "Code Đồ thị & Tiếp tuyến",
    code: `// Vẽ hệ trục toạ độ Oxy
drawAxes({ xRange: [-3, 3], yRange: [-3, 4], showGrid: true });

// Vẽ đồ thị hàm số y = x³ - 3x + 1
plot("x^3 - 3*x + 1", { color: "#2563eb", width: 2.5 });

// Vẽ tiếp tuyến tại điểm uốn U(0, 1): y = -3x + 1
plot("-3*x + 1", { color: "#ea580c", width: 1.5, dashed: true });

// Đánh dấu các điểm cực trị & điểm uốn
drawPoint(-1, 3, "CĐ(-1; 3)", { color: "#dc2626", showProjection: true });
drawPoint(1, -1, "CT(1; -1)", { color: "#16a34a", showProjection: true });
drawPoint(0, 1, "U(0; 1)", { color: "#7c3aed", showProjection: true });`,
  },
  {
    id: "oxyz_space",
    title: "Code Hình học không gian Oxyz",
    code: `// Vẽ hệ trục toạ độ không gian Oxyz
const ox = 250, oy = 180;

// Trục Oz (thẳng đứng lên)
drawArrow(ox, oy, ox, 40, { color: "#0f172a", width: 2 });
ctx.fillText("z", ox + 10, 45);

// Trục Oy (sang phải)
drawArrow(ox, oy, 440, oy, { color: "#0f172a", width: 2 });
ctx.fillText("y", 445, oy + 5);

// Trục Ox (nghiêng 135 độ về trước)
drawArrow(ox, oy, 110, 290, { color: "#0f172a", width: 2 });
ctx.fillText("x", 95, 295);
ctx.fillText("O", ox - 15, oy + 15);

// Vẽ hình hộp chữ nhật ABCD.A'B'C'D'
ctx.strokeStyle = "#2563eb";
ctx.lineWidth = 1.8;
ctx.strokeRect(170, 90, 120, 80);

// Nối các đỉnh không gian
ctx.beginPath();
ctx.moveTo(170, 90); ctx.lineTo(130, 130);
ctx.moveTo(290, 90); ctx.lineTo(250, 130);
ctx.moveTo(290, 170); ctx.lineTo(250, 210);
ctx.moveTo(170, 170); ctx.lineTo(130, 210);
ctx.stroke();

ctx.strokeRect(130, 130, 120, 80);`,
  },
  {
    id: "trig_circle",
    title: "Code Đường tròn lượng giác",
    code: `// Tâm và bán kính
const cx = 250, cy = 170, r = 110;

// Hệ trục toạ độ
drawArrow(cx - 140, cy, cx + 140, cy, { color: "#475569", width: 1.5 });
drawArrow(cx, cy + 140, cx, cy - 140, { color: "#475569", width: 1.5 });
ctx.font = "bold 11px sans-serif";
ctx.fillText("cos x", cx + 135, cy + 18);
ctx.fillText("sin x", cx + 8, cy - 135);

// Vẽ đường tròn lượng giác
ctx.beginPath();
ctx.arc(cx, cy, r, 0, Math.PI * 2);
ctx.strokeStyle = "#2563eb";
ctx.lineWidth = 2;
ctx.stroke();

// Góc alpha = 60 độ (pi/3)
const angle = Math.PI / 3;
const px = cx + r * Math.cos(angle);
const py = cy - r * Math.sin(angle);

ctx.beginPath();
ctx.moveTo(cx, cy);
ctx.lineTo(px, py);
ctx.strokeStyle = "#dc2626";
ctx.lineWidth = 2;
ctx.stroke();

// Hình chiếu lên cos và sin
ctx.setLineDash([3, 3]);
ctx.strokeStyle = "#94a3b8";
ctx.beginPath();
ctx.moveTo(px, py); ctx.lineTo(px, cy);
ctx.moveTo(px, py); ctx.lineTo(cx, py);
ctx.stroke();

// Điểm M
ctx.fillStyle = "#dc2626";
ctx.beginPath();
ctx.arc(px, py, 4, 0, Math.PI * 2);
ctx.fill();
ctx.fillText("M(cos α, sin α)", px + 8, py - 6);`,
  },
  {
    id: "triglyceride_chem",
    title: "Cấu tạo hoá học Triglyceride (Chất béo)",
    code: `// Draw triglyceride structure using Canvas 2D
(function () {
    ctx.save();

    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.font = "20px Arial";

    function bond(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    function doubleBond(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var len = Math.sqrt(dx * dx + dy * dy);
        var nx = -dy / len * 4;
        var ny = dx / len * 4;

        bond(x1 + nx, y1 + ny, x2 + nx, y2 + ny);
        bond(x1 - nx, y1 - ny, x2 - nx, y2 - ny);
    }

    function text(str, x, y) {
        ctx.fillText(str, x, y);
    }

    function chain(points, doubles) {
        for (var i = 0; i < points.length - 1; i++) {
            var a = points[i];
            var b = points[i + 1];

            if (doubles.indexOf(i) !== -1) {
                doubleBond(a[0], a[1], b[0], b[1]);
            } else {
                bond(a[0], a[1], b[0], b[1]);
            }
        }
    }

    // Glycerol backbone
    text("H2C", 20, 95);
    text("HC", 30, 185);
    text("H2C", 20, 275);

    bond(70, 100, 70, 165);
    bond(70, 190, 70, 255);

    bond(70, 88, 115, 88);
    bond(70, 178, 115, 178);
    bond(70, 268, 115, 268);

    text("O", 120, 95);
    text("O", 120, 185);
    text("O", 120, 275);

    // Three ester groups
    bond(145, 88, 180, 88);
    doubleBond(180, 88, 180, 48);
    text("O", 173, 35);

    bond(145, 178, 180, 178);
    doubleBond(180, 178, 180, 138);
    text("O", 173, 125);

    bond(145, 268, 180, 268);
    doubleBond(180, 268, 180, 228);
    text("O", 173, 215);

    // First fatty acid chain
    chain([
        [180, 88],
        [215, 108],
        [250, 88],
        [285, 108],
        [320, 88],
        [355, 108],
        [390, 88],
        [425, 108],
        [460, 88],
        [495, 108],
        [530, 88],
        [565, 108],
        [600, 88],
        [635, 108],
        [670, 88],
        [705, 108],
        [740, 88],
        [775, 108]
    ], []);

    // Second fatty acid chain
    chain([
        [180, 178],
        [215, 198],
        [250, 178],
        [285, 198],
        [320, 178],
        [355, 198],
        [390, 178],
        [425, 198],
        [460, 178],
        [495, 178],
        [530, 198],
        [565, 178],
        [600, 198],
        [635, 178],
        [670, 198],
        [705, 178],
        [740, 198],
        [775, 178]
    ], [8]);

    // Third fatty acid chain
    chain([
        [180, 268],
        [215, 288],
        [250, 268],
        [285, 288],
        [320, 268],
        [355, 288],
        [390, 268],
        [425, 288],
        [460, 268],
        [495, 268],
        [530, 288],
        [565, 268],
        [600, 268],
        [635, 288],
        [670, 268],
        [705, 268],
        [740, 288],
        [775, 268]
    ], [8, 11, 14]);

    ctx.restore();
})();`,
  },
];
