/**
 * @license
 * Vector Function Graph Renderer for Vietnamese High School Mathematics
 * Renders publication-grade 2D Cartesian function plots into responsive SVGs.
 */

export interface GraphFunction {
  fn: string;             // Math expression, e.g. "x^3 - 3*x" or "1/(x-1)"
  color?: string;         // Curve stroke color
  width?: number;         // Curve stroke width
  dashed?: boolean;
  label?: string;         // Equation label, e.g. "y = x³ - 3x"
}

export interface GraphPoint {
  x: number;
  y: number;
  label?: string;
  color?: string;
  showProjection?: boolean; // Draw dashed lines to Ox and Oy
}

export interface GraphAsymptote {
  type: "vertical" | "horizontal" | "oblique";
  val: number;            // For vertical (x = val) or horizontal (y = val)
  slope?: number;         // For oblique (y = slope*x + val)
  intercept?: number;
  color?: string;
  label?: string;
}

export interface GraphConfig {
  title?: string;
  width?: number;
  height?: number;
  xRange?: [number, number]; // [minX, maxX], e.g. [-4, 4]
  yRange?: [number, number]; // [minY, maxY], e.g. [-4, 4]
  functions: GraphFunction[];
  points?: GraphPoint[];
  asymptotes?: GraphAsymptote[];
  showGrid?: boolean;
  showAxes?: boolean;
}

/**
 * Safely compiles a mathematical string into a JS evaluation function for x.
 * Replaces standard math syntax: ^ to **, sin, cos, tan, sqrt, abs, ln, exp, etc.
 */
export function compileMathExpression(expr: string): (x: number) => number {
  if (!expr || !expr.trim()) return () => NaN;

  let jsExpr = expr
    .trim()
    .replace(/\s+/g, "");

  // 1. Unicode superscripts: x² -> x**(2), x³ -> x**(3), etc.
  jsExpr = jsExpr.replace(/([a-zA-Z0-9_)])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, base, sups) => {
    const map: Record<string, string> = {
      "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
      "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
    };
    const num = sups.split("").map((c: string) => map[c] || c).join("");
    return `${base}**(${num})`;
  });

  // 2. Exponentiation operator ^ -> **
  jsExpr = jsExpr.replace(/\^/g, "**");

  // 3. Math functions
  jsExpr = jsExpr
    .replace(/\bsin\b/gi, "Math.sin")
    .replace(/\bcos\b/gi, "Math.cos")
    .replace(/\btan\b/gi, "Math.tan")
    .replace(/\bsqrt\b/gi, "Math.sqrt")
    .replace(/\babs\b/gi, "Math.abs")
    .replace(/\bln\b/gi, "Math.log")
    .replace(/\blog\b/gi, "Math.log10")
    .replace(/\bexp\b/gi, "Math.exp")
    .replace(/\bpi\b/gi, "Math.PI")
    .replace(/\be\b/g, "Math.E");

  // 4. Implicit multiplication
  // digit followed by letter or opening paren: 2x -> 2*x, 3(x) -> 3*(x)
  jsExpr = jsExpr.replace(/(\d)([a-zA-Z(])/g, "$1*$2");
  // closing paren followed by digit, letter, or opening paren: (x)(x) -> (x)*(x)
  jsExpr = jsExpr.replace(/(\))([0-9a-zA-Z(])/g, "$1*$2");
  // variable x or Math constants followed by opening paren: x( -> x*(
  jsExpr = jsExpr.replace(/(\bx|Math\.E|Math\.PI)\s*\(/g, "$1*(");

  // 5. Unary minus / plus before exponentiation:
  // In ES2016+, unary operators like -x**2 throw SyntaxError.
  // Transform -x**2 into (-1)*x**2 and -(...)**2 into (-1)*(...)**2.
  jsExpr = jsExpr.replace(/(^|[+\-*/,(])\s*-\s*([a-zA-Z0-9_.]+|\([^()]+\))\s*\*\*/g, "$1(-1)*$2**");
  jsExpr = jsExpr.replace(/(^|[+\-*/,(])\s*\+\s*([a-zA-Z0-9_.]+|\([^()]+\))\s*\*\*/g, "$1(+1)*$2**");

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("x", `"use strict"; return (${jsExpr});`) as (x: number) => number;
    // Test evaluation at non-zero point
    fn(1);
    return fn;
  } catch (err) {
    console.warn("Failed to compile math expression:", expr, err);
    return () => NaN;
  }
}

/**
 * Parses GraphConfig from either JSON or concise DSL string.
 */
export function parseGraphContent(content: string): GraphConfig {
  const trimmed = (content || "").trim();
  if (!trimmed) {
    return getGraphPreset("bac3");
  }

  // JSON parse
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        title: parsed.title,
        width: parsed.width || 480,
        height: parsed.height || 360,
        xRange: parsed.xRange || parsed.range || [-4, 4],
        yRange: parsed.yRange || [-4, 4],
        functions: parsed.functions || (parsed.fn ? [{ fn: parsed.fn, color: parsed.color || "#2563eb", label: parsed.label }] : []),
        points: parsed.points || [],
        asymptotes: parsed.asymptotes || [],
        showGrid: parsed.showGrid !== false,
        showAxes: parsed.showAxes !== false,
      };
    } catch {
      // Fallback to DSL
    }
  }

  // DSL parsing
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  const functions: GraphFunction[] = [];
  const points: GraphPoint[] = [];
  const asymptotes: GraphAsymptote[] = [];
  let title = "";
  let xRange: [number, number] = [-4, 4];
  let yRange: [number, number] = [-4, 4];

  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.startsWith("title:")) {
      title = line.substring(6).trim();
    } else if (l.startsWith("fn:") || l.startsWith("f(x):") || l.startsWith("y:")) {
      const fnExpr = line.replace(/^(?:fn|f\(x\)|y)\s*[:=]\s*/i, "").trim();
      if (fnExpr) {
        functions.push({
          fn: fnExpr,
          color: functions.length === 0 ? "#2563eb" : functions.length === 1 ? "#dc2626" : "#059669",
        });
      }
    } else if (l.startsWith("range:") || l.startsWith("xrange:")) {
      const parts = line.replace(/^(?:range|xrange)\s*[:=]\s*/i, "").split(/[,;]/).map((s) => parseFloat(s.trim()));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        xRange = [parts[0], parts[1]];
      }
    } else if (l.startsWith("yrange:")) {
      const parts = line.replace(/^yrange\s*[:=]\s*/i, "").split(/[,;]/).map((s) => parseFloat(s.trim()));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        yRange = [parts[0], parts[1]];
      }
    } else if (l.startsWith("point:") || l.startsWith("pt:")) {
      // e.g. point: -1, 2, Cực đại (-1; 2)
      const raw = line.replace(/^(?:point|pt)\s*[:=]\s*/i, "").replace(/[()]/g, "");
      const parts = raw.split(",").map((s) => s.trim());
      const px = parseFloat(parts[0]);
      const py = parseFloat(parts[1]);
      if (!isNaN(px) && !isNaN(py)) {
        points.push({ x: px, y: py, label: parts[2] || `(${px}; ${py})`, showProjection: true });
      }
    } else if (l.startsWith("asymptote:") || l.startsWith("tc:")) {
      // e.g. asymptote: x = 1 or asymptote: y = 2
      const raw = line.replace(/^(?:asymptote|tc)\s*[:=]\s*/i, "").trim();
      if (raw.toLowerCase().startsWith("x")) {
        const val = parseFloat(raw.replace(/^x\s*=\s*/i, ""));
        if (!isNaN(val)) asymptotes.push({ type: "vertical", val, label: `x = ${val}` });
      } else if (raw.toLowerCase().startsWith("y")) {
        const val = parseFloat(raw.replace(/^y\s*=\s*/i, ""));
        if (!isNaN(val)) asymptotes.push({ type: "horizontal", val, label: `y = ${val}` });
      }
    }
  }

  if (functions.length === 0) {
    functions.push({ fn: "x^3 - 3*x", color: "#2563eb", label: "y = x³ - 3x" });
  }

  return {
    title,
    width: 480,
    height: 360,
    xRange,
    yRange,
    functions,
    points,
    asymptotes,
    showGrid: true,
    showAxes: true,
  };
}

/**
 * Renders the GraphConfig into a standalone, crisp SVG.
 */
export function renderGraphToSvg(input: GraphConfig | string): string {
  const config = typeof input === "string" ? parseGraphContent(input) : input;
  const {
    title,
    width = 480,
    height = 360,
    xRange = [-4, 4],
    yRange = [-4, 4],
    functions = [],
    points = [],
    asymptotes = [],
    showGrid = true,
    showAxes = true,
  } = config;

  const [minX, maxX] = xRange;
  const [minY, maxY] = yRange;

  const padding = 36;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  // Coordinate conversion functions
  const toSvgX = (x: number) => padding + ((x - minX) / (maxX - minX)) * plotWidth;
  const toSvgY = (y: number) => padding + ((maxY - y) / (maxY - minY)) * plotHeight;

  let svg = `<div class="dk-graph-container my-3 select-none flex flex-col items-center justify-center">`;
  svg += `<div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs max-w-full overflow-x-auto">`;

  if (title) {
    svg += `<div class="text-xs font-bold text-slate-700 text-center mb-2 flex items-center justify-center gap-1.5"><span>📈</span><span>${title}</span></div>`;
  }

  svg += `<svg viewBox="0 0 ${width} ${height}" class="max-w-full h-auto" style="width: ${width}px; max-height: 400px;" xmlns="http://www.w3.org/2000/svg">`;

  // Grid
  if (showGrid) {
    svg += `<g class="grid-lines" stroke="#f1f5f9" stroke-width="1">`;
    // Vertical grid lines
    const stepX = (maxX - minX) > 10 ? 2 : 1;
    for (let x = Math.ceil(minX); x <= Math.floor(maxX); x += stepX) {
      if (x === 0) continue;
      const sx = toSvgX(x);
      svg += `<line x1="${sx}" y1="${padding}" x2="${sx}" y2="${height - padding}" stroke="#e2e8f0" stroke-dasharray="2,2" />`;
    }
    // Horizontal grid lines
    const stepY = (maxY - minY) > 10 ? 2 : 1;
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y += stepY) {
      if (y === 0) continue;
      const sy = toSvgY(y);
      svg += `<line x1="${padding}" y1="${sy}" x2="${width - padding}" y2="${sy}" stroke="#e2e8f0" stroke-dasharray="2,2" />`;
    }
    svg += `</g>`;
  }

  // Axes
  if (showAxes) {
    const originX = toSvgX(0);
    const originY = toSvgY(0);

    // Clamped origin position for axes within plot area
    const clampedY = Math.max(padding, Math.min(height - padding, originY));
    const clampedX = Math.max(padding, Math.min(width - padding, originX));

    // Ox Axis (horizontal)
    svg += `<g class="axes" stroke="#334155" stroke-width="1.5">`;
    svg += `<line x1="${padding - 10}" y1="${clampedY}" x2="${width - padding + 15}" y2="${clampedY}" />`;
    // Ox Arrow
    svg += `<polygon points="${width - padding + 20},${clampedY} ${width - padding + 12},${clampedY - 4} ${width - padding + 12},${clampedY + 4}" fill="#334155" />`;

    // Oy Axis (vertical)
    svg += `<line x1="${clampedX}" y1="${height - padding + 10}" x2="${clampedX}" y2="${padding - 15}" />`;
    // Oy Arrow
    svg += `<polygon points="${clampedX},${padding - 20} ${clampedX - 4},${padding - 12} ${clampedX + 4},${padding - 12}" fill="#334155" />`;
    svg += `</g>`;

    // Axis labels: "x", "y", "O"
    svg += `<g font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#334155">`;
    svg += `<text x="${width - padding + 22}" y="${clampedY + 4}">x</text>`;
    svg += `<text x="${clampedX + 6}" y="${padding - 18}">y</text>`;
    svg += `<text x="${clampedX - 12}" y="${clampedY + 14}">O</text>`;

    // Ticks & number labels
    const stepX = (maxX - minX) > 10 ? 2 : 1;
    for (let x = Math.ceil(minX); x <= Math.floor(maxX); x += stepX) {
      if (x === 0) continue;
      const sx = toSvgX(x);
      svg += `<line x1="${sx}" y1="${clampedY - 3}" x2="${sx}" y2="${clampedY + 3}" stroke="#64748b" stroke-width="1" />`;
      svg += `<text x="${sx}" y="${clampedY + 14}" text-anchor="middle" font-size="9" font-weight="normal" fill="#64748b">${x}</text>`;
    }

    const stepY = (maxY - minY) > 10 ? 2 : 1;
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y += stepY) {
      if (y === 0) continue;
      const sy = toSvgY(y);
      svg += `<line x1="${clampedX - 3}" y1="${sy}" x2="${clampedX + 3}" y2="${sy}" stroke="#64748b" stroke-width="1" />`;
      svg += `<text x="${clampedX - 8}" y="${sy + 3}" text-anchor="end" font-size="9" font-weight="normal" fill="#64748b">${y}</text>`;
    }
    svg += `</g>`;
  }

  // Draw Asymptotes
  for (const asy of asymptotes) {
    const color = asy.color || "#dc2626";
    if (asy.type === "vertical") {
      const sx = toSvgX(asy.val);
      svg += `<line x1="${sx}" y1="${padding}" x2="${sx}" y2="${height - padding}" stroke="${color}" stroke-width="1.5" stroke-dasharray="4,4" />`;
      if (asy.label) {
        svg += `<text x="${sx + 4}" y="${padding + 12}" font-size="10" font-weight="bold" fill="${color}">${asy.label}</text>`;
      }
    } else if (asy.type === "horizontal") {
      const sy = toSvgY(asy.val);
      svg += `<line x1="${padding}" y1="${sy}" x2="${width - padding}" y2="${sy}" stroke="${color}" stroke-width="1.5" stroke-dasharray="4,4" />`;
      if (asy.label) {
        svg += `<text x="${width - padding - 40}" y="${sy - 4}" font-size="10" font-weight="bold" fill="${color}">${asy.label}</text>`;
      }
    }
  }

  // Draw Function Curves
  const sampleCount = 400; // Resolution of curve
  const dx = (maxX - minX) / sampleCount;

  for (const fnObj of functions) {
    const evalFn = compileMathExpression(fnObj.fn);
    const strokeColor = fnObj.color || "#2563eb";
    const strokeWidth = fnObj.width || 2.2;

    let pathD = "";
    let isDrawing = false;
    let prevY: number | null = null;

    for (let i = 0; i <= sampleCount; i++) {
      const x = minX + i * dx;
      const y = evalFn(x);

      // Check for NaN, Infinity or steep discontinuity jump (e.g. asymptotes)
      if (isNaN(y) || !isFinite(y) || y < minY - (maxY - minY) * 2 || y > maxY + (maxY - minY) * 2) {
        isDrawing = false;
        prevY = null;
        continue;
      }

      // Check discontinuity jump
      if (prevY !== null && Math.abs(y - prevY) > (maxY - minY) * 0.8) {
        isDrawing = false;
        prevY = null;
      }

      const sx = toSvgX(x);
      const sy = toSvgY(y);

      if (!isDrawing) {
        pathD += ` M ${sx.toFixed(1)},${sy.toFixed(1)}`;
        isDrawing = true;
      } else {
        pathD += ` L ${sx.toFixed(1)},${sy.toFixed(1)}`;
      }
      prevY = y;
    }

    svg += `<path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
  }

  // Draw Points & Projections
  for (const pt of points) {
    const sx = toSvgX(pt.x);
    const sy = toSvgY(pt.y);
    const color = pt.color || "#4f46e5";

    // Dashed projections to axes
    if (pt.showProjection) {
      const originX = toSvgX(0);
      const originY = toSvgY(0);
      svg += `<line x1="${sx}" y1="${sy}" x2="${sx}" y2="${originY}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2,2" />`;
      svg += `<line x1="${sx}" y1="${sy}" x2="${originX}" y2="${sy}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2,2" />`;
    }

    // Point dot
    svg += `<circle cx="${sx}" cy="${sy}" r="4" fill="${color}" stroke="#ffffff" stroke-width="1.5" />`;

    // Point label
    if (pt.label) {
      const labelY = pt.y >= 0 ? sy - 8 : sy + 16;
      svg += `<text x="${sx}" y="${labelY}" text-anchor="middle" font-size="10" font-weight="bold" fill="#1e293b" stroke="#ffffff" stroke-width="2" paint-order="stroke">${pt.label}</text>`;
    }
  }

  // Legend / Equation badge if labeled
  if (functions.some((f) => f.label)) {
    svg += `<g class="legend" transform="translate(${padding + 8}, ${padding + 16})">`;
    let legendY = 0;
    functions.forEach((f) => {
      if (!f.label) return;
      svg += `<rect x="0" y="${legendY - 10}" width="16" height="3" fill="${f.color || "#2563eb"}" rx="1.5" />`;
      svg += `<text x="22" y="${legendY - 7}" font-size="10" font-weight="bold" fill="#334155">${f.label}</text>`;
      legendY += 16;
    });
    svg += `</g>`;
  }

  svg += `</svg></div></div>`;
  return svg;
}

/**
 * Standard Presets according to GDPT 2018 Grade 12 Math
 */
export function getGraphPreset(presetName: string): GraphConfig {
  switch (presetName) {
    case "bac3":
      return {
        title: "Đồ thị hàm số bậc 3: y = x³ - 3x + 1",
        width: 480,
        height: 360,
        xRange: [-3, 3],
        yRange: [-3, 4],
        functions: [{ fn: "x^3 - 3*x + 1", color: "#2563eb", label: "y = x³ - 3x + 1" }],
        points: [
          { x: -1, y: 3, label: "CĐ(-1; 3)", color: "#dc2626", showProjection: true },
          { x: 1, y: -1, label: "CT(1; -1)", color: "#16a34a", showProjection: true },
          { x: 0, y: 1, label: "U(0; 1)", color: "#7c3aed", showProjection: true },
        ],
        showGrid: true,
        showAxes: true,
      };

    case "bac4_trungphuong":
      return {
        title: "Đồ thị hàm trùng phương: y = x⁴ - 2x² - 1",
        width: 480,
        height: 360,
        xRange: [-2.5, 2.5],
        yRange: [-3, 3],
        functions: [{ fn: "x^4 - 2*x^2 - 1", color: "#2563eb", label: "y = x⁴ - 2x² - 1" }],
        points: [
          { x: -1, y: -2, label: "CT(-1; -2)", color: "#16a34a", showProjection: true },
          { x: 0, y: -1, label: "CĐ(0; -1)", color: "#dc2626", showProjection: true },
          { x: 1, y: -2, label: "CT(1; -2)", color: "#16a34a", showProjection: true },
        ],
        showGrid: true,
        showAxes: true,
      };

    case "phanthuc_1_1":
      return {
        title: "Đồ thị hàm nhất biến: y = (2x + 1)/(x - 1)",
        width: 480,
        height: 360,
        xRange: [-4, 6],
        yRange: [-5, 8],
        functions: [{ fn: "(2*x + 1)/(x - 1)", color: "#2563eb", label: "y = (2x+1)/(x-1)" }],
        asymptotes: [
          { type: "vertical", val: 1, label: "TCĐ: x = 1", color: "#dc2626" },
          { type: "horizontal", val: 2, label: "TCN: y = 2", color: "#dc2626" },
        ],
        points: [
          { x: 0, y: -1, label: "(0; -1)", color: "#4f46e5", showProjection: true },
          { x: -0.5, y: 0, label: "(-1/2; 0)", color: "#4f46e5", showProjection: true },
        ],
        showGrid: true,
        showAxes: true,
      };

    case "phanthuc_2_1":
      return {
        title: "Đồ thị phân thức bậc hai / bậc nhất: y = (x² - x + 1)/(x - 1)",
        width: 480,
        height: 360,
        xRange: [-4, 6],
        yRange: [-6, 6],
        functions: [
          { fn: "(x^2 - x + 1)/(x - 1)", color: "#2563eb", label: "y = (x²-x+1)/(x-1)" },
          { fn: "x", color: "#94a3b8", dashed: true, label: "TCX: y = x" },
        ],
        asymptotes: [{ type: "vertical", val: 1, label: "TCĐ: x = 1", color: "#dc2626" }],
        showGrid: true,
        showAxes: true,
      };

    case "parabol":
      return {
        title: "Đồ thị Parabol bậc hai: y = -x² + 2x + 3",
        width: 480,
        height: 360,
        xRange: [-3, 5],
        yRange: [-3, 5],
        functions: [{ fn: "-x^2 + 2*x + 3", color: "#2563eb", label: "y = -x² + 2x + 3" }],
        points: [
          { x: 1, y: 4, label: "Đỉnh I(1; 4)", color: "#dc2626", showProjection: true },
          { x: -1, y: 0, label: "(-1; 0)", color: "#16a34a", showProjection: true },
          { x: 3, y: 0, label: "(3; 0)", color: "#16a34a", showProjection: true },
        ],
        showGrid: true,
        showAxes: true,
      };

    case "mu_log":
      return {
        title: "Đồ thị hàm số mũ & logarit",
        width: 480,
        height: 360,
        xRange: [-3, 5],
        yRange: [-3, 5],
        functions: [
          { fn: "2^x", color: "#2563eb", label: "y = 2^x" },
          { fn: "log(x)", color: "#dc2626", label: "y = log₂(x)" },
          { fn: "x", color: "#cbd5e1", dashed: true, label: "y = x" },
        ],
        showGrid: true,
        showAxes: true,
      };

    default:
      return getGraphPreset("bac3");
  }
}
