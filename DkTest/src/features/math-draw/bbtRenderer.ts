/**
 * @license
 * Bảng Biến Thiên (BBT) & Bảng Xét Dấu Renderer for Vietnamese High School Mathematics
 * Conforms to Vietnam GDPT 2018 Textbook Standards (Toán 12)
 */

import katex from "katex";

export interface BBTPoint {
  x: string;                 // e.g. "-\\infty", "-1", "2", "+\\infty"
  yPrime?: string;           // e.g. "0", "||", "", "+"
  y?: string;                // e.g. "-\\infty", "4", "0", "+\\infty"
  yPos?: "top" | "bottom" | "mid" | "barrier"; // position level for arrow
  isDoubleBar?: boolean;     // tiệm cận đứng (||)
  leftLimit?: string;        // left limit for asymptote, e.g. "-\\infty"
  rightLimit?: string;       // right limit for asymptote, e.g. "+\\infty"
}

export interface BBTInterval {
  sign: "+" | "-" | "0" | "||" | string;
}

export interface BBTConfig {
  title?: string;
  variable?: string;        // default "x"
  derivativeLabel?: string; // default "y'"
  functionLabel?: string;   // default "y"
  points: BBTPoint[];
  intervals: BBTInterval[];
}

function safeKatex(tex: string): string {
  if (!tex || !tex.trim()) return "";
  const cleaned = tex
    .replace(/-oo|-inf/gi, "-\\infty")
    .replace(/\+oo|\+inf/gi, "+\\infty")
    .replace(/oo/gi, "\\infty");
  try {
    return katex.renderToString(cleaned, { displayMode: false, throwOnError: false, strict: false });
  } catch {
    return cleaned;
  }
}

/**
 * Parses BBT from either structured JSON or concise text DSL.
 *
 * Example DSL format:
 * x: -oo | -1 | 1 | +oo
 * y': | + | 0 | - | 0 | + |
 * y: -oo / 3 \ -1 / +oo
 */
export function parseBBTContent(content: string): BBTConfig {
  const trimmed = (content || "").trim();
  if (!trimmed) {
    return getBBTPreset("bac3_duong");
  }

  // Try JSON parse first
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.points && Array.isArray(parsed.points)) {
        return {
          title: parsed.title,
          variable: parsed.variable || "x",
          derivativeLabel: parsed.derivativeLabel || "y'",
          functionLabel: parsed.functionLabel || "y",
          points: parsed.points,
          intervals: parsed.intervals || [],
        };
      }
    } catch {
      // Fallback to DSL parsing
    }
  }

  // DSL Parsing
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  let xLine = "";
  let yPrimeLine = "";
  let yLine = "";
  let title = "";

  for (const line of lines) {
    if (line.toLowerCase().startsWith("title:")) {
      title = line.substring(6).trim();
    } else if (line.toLowerCase().startsWith("x:") || line.toLowerCase().startsWith("x|") || line.toLowerCase().startsWith("x |")) {
      xLine = line.replace(/^x\s*[:|]\s*/i, "");
    } else if (line.toLowerCase().startsWith("y':") || line.toLowerCase().startsWith("y'|") || line.toLowerCase().startsWith("y' |") || line.toLowerCase().startsWith("f'(x):")) {
      yPrimeLine = line.replace(/^(?:y'|f'\(x\))\s*[:|]\s*/i, "");
    } else if (line.toLowerCase().startsWith("y:") || line.toLowerCase().startsWith("y|") || line.toLowerCase().startsWith("y |") || line.toLowerCase().startsWith("f(x):")) {
      yLine = line.replace(/^(?:y|f\(x\))\s*[:|]\s*/i, "");
    }
  }

  // If no labeled lines, try positional lines 0, 1, 2
  if (!xLine && lines.length >= 2) {
    xLine = lines[0].replace(/^x\s*[:|]\s*/i, "");
    yPrimeLine = lines[1].replace(/^(?:y'|f'\(x\))\s*[:|]\s*/i, "");
    if (lines[2]) yLine = lines[2].replace(/^(?:y|f\(x\))\s*[:|]\s*/i, "");
  }

  const rawXParts = xLine ? xLine.split("|").map((s) => s.trim()).filter(Boolean) : ["-\\infty", "-1", "1", "+\\infty"];
  const rawYPrimeParts = yPrimeLine ? yPrimeLine.split("|").map((s) => s.trim()) : ["+", "0", "-", "0", "+"];

  const points: BBTPoint[] = [];
  const intervals: BBTInterval[] = [];

  // Parse points on X axis
  for (let i = 0; i < rawXParts.length; i++) {
    const rawVal = rawXParts[i];
    const isDouble = rawVal === "||" || rawVal.includes("||");
    let cleanX = rawVal.replace(/\|\|/g, "").trim();
    if (/^-oo|^-inf$/i.test(cleanX)) cleanX = "-\\infty";
    else if (/^\+oo|^\+inf$/i.test(cleanX)) cleanX = "+\\infty";
    else if (/^oo|^inf$/i.test(cleanX)) cleanX = "\\infty";

    points.push({
      x: cleanX || rawVal,
      isDoubleBar: isDouble,
      yPrime: isDouble ? "||" : (i === 0 || i === rawXParts.length - 1 ? "" : "0"),
    });
  }

  // If y' line or y line specifies || for asymptotes, associate with the internal point
  if (yPrimeLine.includes("||") || yLine.includes("||")) {
    const doubleBarMatch = rawYPrimeParts.findIndex((s) => s.includes("||"));
    if (doubleBarMatch !== -1) {
      // Map doubleBarMatch to closest internal point
      const targetPointIdx = Math.min(points.length - 2, Math.max(1, Math.floor((doubleBarMatch / rawYPrimeParts.length) * (points.length - 1))));
      if (points[targetPointIdx]) {
        points[targetPointIdx].isDoubleBar = true;
        points[targetPointIdx].yPrime = "||";
      }
    } else if (points.length === 3) {
      points[1].isDoubleBar = true;
      points[1].yPrime = "||";
    }
  }

  // Parse signs for intervals
  const cleanSigns = rawYPrimeParts.filter((s) => s !== "");
  if (cleanSigns.length > 0) {
    let signIdx = 0;
    for (let i = 0; i < points.length; i++) {
      if (cleanSigns[signIdx] !== undefined) {
        if (["0", "||"].includes(cleanSigns[signIdx])) {
          points[i].yPrime = cleanSigns[signIdx];
          if (cleanSigns[signIdx] === "||") points[i].isDoubleBar = true;
          signIdx++;
        }
      }
      if (i < points.length - 1 && cleanSigns[signIdx] !== undefined) {
        if (["+", "-", "||"].includes(cleanSigns[signIdx])) {
          intervals.push({ sign: cleanSigns[signIdx] });
          signIdx++;
        } else {
          intervals.push({ sign: "+" });
        }
      }
    }
  }

  // Fill default intervals if missing
  while (intervals.length < points.length - 1) {
    intervals.push({ sign: intervals.length % 2 === 0 ? "+" : "-" });
  }

  // Parse y variation if present
  const hasExplicitYLine = lines.some((l) => /^(?:y|f\(x\))\s*[:|]/i.test(l.trim()));
  const isSignTable =
    title.toLowerCase().includes("xét dấu") ||
    (!hasExplicitYLine && (!yLine || !yLine.trim()));

  if (isSignTable) {
    // Pure sign table: only x and y' rows, no function row y
    return {
      title,
      variable: "x",
      derivativeLabel: (lines.find((l) => /f'\(x\)/i.test(l)) ? "f'(x)" : "y'"),
      functionLabel: "",
      points,
      intervals,
    };
  }

  if (yLine && yLine.trim()) {
    // Check if tokens use arrows / or \ or ->
    const tokens = yLine.split(/(->|\/|\\|\|\|)/g).map((s) => s.trim()).filter(Boolean);
    let pIdx = 0;
    for (let t = 0; t < tokens.length && pIdx < points.length; t++) {
      const tok = tokens[t];
      if (["->", "/", "\\"].includes(tok)) continue;
      if (tok === "||") {
        if (points[pIdx]) {
          points[pIdx].isDoubleBar = true;
          points[pIdx].yPos = "barrier";
        }
        continue;
      }
      if (points[pIdx]) {
        points[pIdx].y = tok;
        if (tok.includes("-\\infty") || tok.includes("-oo")) {
          points[pIdx].yPos = "bottom";
        } else if (tok.includes("+\\infty") || tok.includes("+oo")) {
          points[pIdx].yPos = "top";
        } else {
          // alternate or guess
          points[pIdx].yPos = pIdx % 2 === 1 ? "top" : "bottom";
        }
        pIdx++;
      }
    }
  } else {
    // Default Y row based on signs
    let currentLevel: "top" | "bottom" = intervals[0]?.sign === "+" ? "bottom" : "top";
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        points[i].y = currentLevel === "bottom" ? "-\\infty" : "+\\infty";
        points[i].yPos = currentLevel;
      } else {
        const prevSign = intervals[i - 1]?.sign;
        if (prevSign === "+") {
          currentLevel = "top";
          points[i].y = points[i].isDoubleBar ? "+\\infty" : (i === points.length - 1 ? "+\\infty" : "2");
        } else {
          currentLevel = "bottom";
          points[i].y = points[i].isDoubleBar ? "-\\infty" : (i === points.length - 1 ? "-\\infty" : "-2");
        }
        points[i].yPos = points[i].isDoubleBar ? "barrier" : currentLevel;
      }
    }
  }

  return {
    title,
    variable: "x",
    derivativeLabel: "y'",
    functionLabel: "y",
    points,
    intervals,
  };
}

/**
 * Renders standard, publication-grade Vietnamese Bảng Biến Thiên in HTML + SVG.
 */
export function renderBBTToHtml(input: BBTConfig | string): string {
  const config = typeof input === "string" ? parseBBTContent(input) : input;
  const { title, variable = "x", derivativeLabel = "y'", functionLabel = "y", points, intervals } = config;

  if (!points || points.length === 0) return "";

  const colCount = points.length + intervals.length;
  // Calculate SVG dimensions for variation arrows
  const svgWidth = Math.max(500, colCount * 80);
  const svgHeight = 120;
  const headerWidth = 70;
  const dataWidth = svgWidth - headerWidth;
  const colWidth = dataWidth / colCount;

  // Build Table HTML
  let html = `<div class="dk-bbt-container my-3 overflow-x-auto select-none rounded-xl border border-slate-300 bg-white shadow-2xs font-sans text-slate-800 text-xs sm:text-sm">`;

  if (title) {
    html += `<div class="px-4 py-2 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-center flex items-center justify-center gap-2"><span>📊</span><span>${title}</span></div>`;
  }

  html += `<table class="w-full border-collapse border-spacing-0" style="min-width: ${svgWidth}px;">`;

  // Row 1: Variable (x)
  html += `<tr class="border-b border-slate-300">`;
  html += `<td class="w-[70px] text-center font-bold italic py-2.5 px-2 bg-slate-100/90 border-r border-slate-300 text-slate-800">${safeKatex(variable)}</td>`;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    html += `<td class="text-center py-2.5 px-2 font-medium">${safeKatex(pt.x)}</td>`;
    if (i < intervals.length) {
      html += `<td class="text-center py-2.5 px-2 text-slate-300"></td>`;
    }
  }
  html += `</tr>`;

  // Row 2: Derivative (y')
  html += `<tr class="border-b border-slate-300">`;
  html += `<td class="w-[70px] text-center font-bold italic py-2 px-2 bg-slate-100/90 border-r border-slate-300 text-slate-800">${safeKatex(derivativeLabel)}</td>`;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const isDouble = pt.isDoubleBar || pt.yPrime === "||";
    const cellContent = isDouble ? `<span class="font-bold text-slate-400 select-none">||</span>` : (pt.yPrime ? safeKatex(pt.yPrime) : "");
    html += `<td class="text-center py-2 px-2 font-bold ${isDouble ? "text-red-500" : "text-slate-700"}">${cellContent}</td>`;

    if (i < intervals.length) {
      const sign = intervals[i].sign;
      const signColor = sign === "+" ? "text-blue-600 font-extrabold" : sign === "-" ? "text-rose-600 font-extrabold" : "text-slate-600";
      html += `<td class="text-center py-2 px-2 text-sm ${signColor}">${sign === "+" ? "+" : sign === "-" ? "−" : sign}</td>`;
    }
  }
  html += `</tr>`;

  // Row 3: Function Variation (y) with Vector SVG
  const hasFunctionRow =
    Boolean(functionLabel && functionLabel.trim()) &&
    points.some(
      (p) =>
        Boolean(p.y) ||
        p.yPos !== undefined ||
        Boolean(p.leftLimit) ||
        Boolean(p.rightLimit)
    );

  if (hasFunctionRow) {
    html += `<tr>`;
    html += `<td class="w-[70px] text-center font-bold italic py-3 px-2 bg-slate-100/90 border-r border-slate-300 text-slate-800 align-middle">${safeKatex(functionLabel)}</td>`;
    html += `<td colspan="${colCount}" class="p-0 relative" style="height: ${svgHeight}px;">`;

    // Render SVG Variation Diagram
    let svg = `<svg class="w-full h-full" viewBox="0 0 ${dataWidth} ${svgHeight}" preserveAspectRatio="none">`;
    svg += `<defs>
      <marker id="arrow-up" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb" />
      </marker>
      <marker id="arrow-down" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#dc2626" />
      </marker>
    </defs>`;

    // Calculate X coordinate for each point column in SVG space
    const getColX = (ptIndex: number) => {
      // Point index 0 is at column 0. Point index i is at column i * 2.
      const colIdx = ptIndex * 2;
      return (colIdx + 0.5) * colWidth;
    };

    const yTop = 24;
    const yBottom = svgHeight - 24;
    const yMid = svgHeight / 2;

    // Draw double bars and vertical asymptote dividers
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (pt.isDoubleBar || pt.yPos === "barrier") {
        const cx = getColX(i);
        svg += `<line x1="${cx - 2.5}" y1="0" x2="${cx - 2.5}" y2="${svgHeight}" stroke="#94a3b8" stroke-width="1.5" />`;
        svg += `<line x1="${cx + 2.5}" y1="0" x2="${cx + 2.5}" y2="${svgHeight}" stroke="#94a3b8" stroke-width="1.5" />`;
      }
    }

    // Draw arrows connecting points
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const sign = intervals[i]?.sign;

      const x1 = getColX(i);
      const x2 = getColX(i + 1);

      // Determine Y coordinate based on pos
      const getY = (pt: BBTPoint, isStart: boolean) => {
        if (pt.isDoubleBar) {
          if (isStart) {
            // Leaving asymptote: right side
            return pt.rightLimit?.includes("+") ? yTop : yBottom;
          } else {
            // Entering asymptote: left side
            return pt.leftLimit?.includes("+") ? yTop : yBottom;
          }
        }
        if (pt.yPos === "top") return yTop;
        if (pt.yPos === "bottom") return yBottom;
        if (pt.yPos === "mid") return yMid;
        return sign === "+" ? (isStart ? yBottom : yTop) : (isStart ? yTop : yBottom);
      };

      const yStart = getY(p1, true);
      const yEnd = getY(p2, false);

      const isRising = yStart > yEnd;
      const arrowColor = isRising ? "#2563eb" : "#dc2626";
      const marker = isRising ? "url(#arrow-up)" : "url(#arrow-down)";

      // Leave a small gap around endpoints so arrow doesn't overlap text
      const dx = x2 - x1;
      const dy = yEnd - yStart;
      const len = Math.sqrt(dx * dx + dy * dy);
      const pad = Math.min(22, len * 0.2);

      const ax1 = x1 + (dx / len) * pad;
      const ay1 = yStart + (dy / len) * pad;
      const ax2 = x2 - (dx / len) * pad;
      const ay2 = yEnd - (dy / len) * pad;

      svg += `<line x1="${ax1}" y1="${ay1}" x2="${ax2}" y2="${ay2}" stroke="${arrowColor}" stroke-width="2" marker-end="${marker}" />`;
    }

    // Draw Value Labels on top of arrows
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const cx = getColX(i);

      if (pt.isDoubleBar) {
        if (pt.leftLimit) {
          const ly = pt.leftLimit.includes("+") ? yTop : yBottom;
          svg += `<foreignObject x="${cx - 50}" y="${ly - 18}" width="48" height="36"><div xmlns="http://www.w3.org/1999/xhtml" class="text-right text-xs font-semibold text-slate-800 leading-tight">${safeKatex(pt.leftLimit)}</div></foreignObject>`;
        }
        if (pt.rightLimit) {
          const ry = pt.rightLimit.includes("+") ? yTop : yBottom;
          svg += `<foreignObject x="${cx + 5}" y="${ry - 18}" width="48" height="36"><div xmlns="http://www.w3.org/1999/xhtml" class="text-left text-xs font-semibold text-slate-800 leading-tight">${safeKatex(pt.rightLimit)}</div></foreignObject>`;
        }
        continue;
      }

      if (pt.y) {
        const cy = pt.yPos === "top" ? yTop : pt.yPos === "bottom" ? yBottom : yMid;
        svg += `<foreignObject x="${cx - 45}" y="${cy - 18}" width="90" height="36"><div xmlns="http://www.w3.org/1999/xhtml" class="text-center text-xs font-semibold text-slate-900 leading-tight">${safeKatex(pt.y)}</div></foreignObject>`;
      }
    }

    svg += `</svg>`;
    html += svg;
    html += `</td></tr>`;
  }

  html += `</table></div>`;
  return html;
}

/**
 * Standard Presets according to GDPT 2018 Grade 12 Math
 */
export function getBBTPreset(type: string): BBTConfig {
  switch (type) {
    case "bac3_duong":
      return {
        title: "Hàm bậc ba: y = ax³ + bx² + cx + d (a > 0, 2 cực trị)",
        variable: "x",
        derivativeLabel: "y'",
        functionLabel: "y",
        points: [
          { x: "-\\infty", yPrime: "", y: "-\\infty", yPos: "bottom" },
          { x: "-1", yPrime: "0", y: "2", yPos: "top" },
          { x: "1", yPrime: "0", y: "-2", yPos: "bottom" },
          { x: "+\\infty", yPrime: "", y: "+\\infty", yPos: "top" },
        ],
        intervals: [{ sign: "+" }, { sign: "-" }, { sign: "+" }],
      };

    case "bac3_am":
      return {
        title: "Hàm bậc ba: y = ax³ + bx² + cx + d (a < 0, 2 cực trị)",
        variable: "x",
        derivativeLabel: "y'",
        functionLabel: "y",
        points: [
          { x: "-\\infty", yPrime: "", y: "+\\infty", yPos: "top" },
          { x: "-1", yPrime: "0", y: "-2", yPos: "bottom" },
          { x: "1", yPrime: "0", y: "2", yPos: "top" },
          { x: "+\\infty", yPrime: "", y: "-\\infty", yPos: "bottom" },
        ],
        intervals: [{ sign: "-" }, { sign: "+" }, { sign: "-" }],
      };

    case "trungphuong_3cuc":
      return {
        title: "Hàm trùng phương: y = ax⁴ + bx² + c (a > 0, ab < 0)",
        variable: "x",
        derivativeLabel: "y'",
        functionLabel: "y",
        points: [
          { x: "-\\infty", yPrime: "", y: "+\\infty", yPos: "top" },
          { x: "-1", yPrime: "0", y: "-1", yPos: "bottom" },
          { x: "0", yPrime: "0", y: "3", yPos: "top" },
          { x: "1", yPrime: "0", y: "-1", yPos: "bottom" },
          { x: "+\\infty", yPrime: "", y: "+\\infty", yPos: "top" },
        ],
        intervals: [{ sign: "-" }, { sign: "+" }, { sign: "-" }, { sign: "+" }],
      };

    case "phanthuc_bac1":
      return {
        title: "Hàm nhất biến: y = (ax + b)/(cx + d) (Nghịch biến, TCĐ x = 1, TCN y = 2)",
        variable: "x",
        derivativeLabel: "y'",
        functionLabel: "y",
        points: [
          { x: "-\\infty", yPrime: "", y: "2", yPos: "top" },
          { x: "1", isDoubleBar: true, yPrime: "||", yPos: "barrier", leftLimit: "-\\infty", rightLimit: "+\\infty" },
          { x: "+\\infty", yPrime: "", y: "2", yPos: "bottom" },
        ],
        intervals: [{ sign: "-" }, { sign: "-" }],
      };

    case "xet_dau":
      return {
        title: "Bảng xét dấu f'(x)",
        variable: "x",
        derivativeLabel: "f'(x)",
        functionLabel: "",
        points: [
          { x: "-\\infty" },
          { x: "-2", yPrime: "0" },
          { x: "0", yPrime: "0" },
          { x: "3", yPrime: "0" },
          { x: "+\\infty" },
        ],
        intervals: [{ sign: "+" }, { sign: "-" }, { sign: "+" }, { sign: "-" }],
      };

    default:
      return getBBTPreset("bac3_duong");
  }
}
