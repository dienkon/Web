import React, { useState, useRef, useEffect } from "react";
import { X, Play, Copy, Check, Sparkles, TrendingUp, Table, Code2, Plus, Trash2 } from "lucide-react";
import { getBBTPreset, parseBBTContent, renderBBTToHtml } from "./bbtRenderer";
import { getGraphPreset, renderGraphToSvg, compileMathExpression, GraphPoint } from "./graphRenderer";
import { LIVE_CANVAS_TEMPLATES, executeLiveCanvasCode, detectContentBounds } from "./liveCanvasRunner";

interface Props {
  onInsert: (tagContent: string) => void;
  onClose: () => void;
}

export default function MathGraphModal({ onInsert, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"graph" | "bbt" | "live_code">("graph");

  // Tab 1: Graph State
  const [graphFn, setGraphFn] = useState("x^3 - 3*x + 1");
  const [graphTitle, setGraphTitle] = useState("Đồ thị hàm số y = x³ - 3x + 1");
  const [xMin, setXMin] = useState(-3);
  const [xMax, setXMax] = useState(3);
  const [yMin, setYMin] = useState(-3);
  const [yMax, setYMax] = useState(4);
  const [graphPoints, setGraphPoints] = useState<GraphPoint[]>([
    { x: -1, y: 3, label: "CĐ(-1; 3)", color: "#dc2626" },
    { x: 1, y: -1, label: "CT(1; -1)", color: "#16a34a" },
  ]);
  const [graphAsymptotes, setGraphAsymptotes] = useState<Array<{ type: "vertical" | "horizontal"; val: number; label: string }>>([]);

  // Tab 2: BBT State
  const [bbtDsl, setBbtDsl] = useState(`title: Bảng biến thiên hàm số y = x³ - 3x + 1\nx: -oo | -1 | 1 | +oo\ny': | + | 0 | - | 0 | + |\ny: -oo / 3 \\ -1 / +oo`);

  // Tab 3: Live Code State
  const [liveCode, setLiveCode] = useState(LIVE_CANVAS_TEMPLATES[0].code);
  const [liveCanvasTitle, setLiveCanvasTitle] = useState("Hình vẽ minh hoạ");
  const canvasPreviewRef = useRef<HTMLCanvasElement>(null);
  const [liveCodeError, setLiveCodeError] = useState<string | null>(null);

  const isHtmlCode = /<(?:!DOCTYPE|html|head|body|style|script|div|svg|canvas\b[^>]*>)/i.test(liveCode.trim());

  // Run live canvas preview when in live_code tab
  useEffect(() => {
    if (activeTab === "live_code") {
      setLiveCodeError(null);
      if (!isHtmlCode && canvasPreviewRef.current) {
        const res = executeLiveCanvasCode(canvasPreviewRef.current, liveCode, 460, 280);
        if (!res.success && res.error) {
          setLiveCodeError(res.error);
        }
      }
    }
  }, [activeTab, liveCode, isHtmlCode]);

  // Handlers for Graph Presets
  const applyGraphPreset = (presetName: string) => {
    const p = getGraphPreset(presetName);
    setGraphFn(p.functions[0]?.fn || "x^2");
    setGraphTitle(p.title || "");
    setXMin(p.xRange?.[0] ?? -4);
    setXMax(p.xRange?.[1] ?? 4);
    setYMin(p.yRange?.[0] ?? -4);
    setYMax(p.yRange?.[1] ?? 4);
    setGraphPoints(p.points || []);
    setGraphAsymptotes(p.asymptotes?.map((a) => ({ type: a.type as any, val: a.val, label: a.label || "" })) || []);
  };

  // Handlers for BBT Presets
  const applyBbtPreset = (presetName: string) => {
    switch (presetName) {
      case "bac3_duong":
        setBbtDsl(`title: Bảng biến thiên hàm bậc ba (a > 0)\nx: -oo | -1 | 1 | +oo\ny': | + | 0 | - | 0 | + |\ny: -oo / 2 \\ -2 / +oo`);
        break;
      case "bac3_am":
        setBbtDsl(`title: Bảng biến thiên hàm bậc ba (a < 0)\nx: -oo | -1 | 1 | +oo\ny': | - | 0 | + | 0 | - |\ny: +oo \\ -2 / 2 \\ -oo`);
        break;
      case "trungphuong":
        setBbtDsl(`title: Bảng biến thiên hàm trùng phương (a > 0, 3 cực trị)\nx: -oo | -1 | 0 | 1 | +oo\ny': | - | 0 | + | 0 | - | 0 | + |\ny: +oo \\ -1 / 3 \\ -1 / +oo`);
        break;
      case "phanthuc":
        setBbtDsl(`title: Bảng biến thiên hàm nhất biến (nghịch biến)\nx: -oo | 1 | +oo\ny': | - || - |\ny: 2 \\ -oo || +oo \\ 2`);
        break;
      case "xet_dau":
        setBbtDsl(`title: Bảng xét dấu đạo hàm f'(x)\nx: -oo | -2 | 0 | 3 | +oo\ny': | + | 0 | - | 0 | + | 0 | - |\ny: `);
        break;
      default:
        break;
    }
  };

  // Generate Tag and Insert
  const handleInsertGraph = () => {
    const config = {
      title: graphTitle,
      fn: graphFn,
      xRange: [xMin, xMax],
      yRange: [yMin, yMax],
      points: graphPoints,
      asymptotes: graphAsymptotes,
    };
    const tag = `\n<graph>\n${JSON.stringify(config, null, 2)}\n</graph>\n`;
    onInsert(tag);
    onClose();
  };

  const handleInsertBBT = () => {
    const tag = `\n<bbt>\n${bbtDsl.trim()}\n</bbt>\n`;
    onInsert(tag);
    onClose();
  };

  const handleInsertLiveCanvas = () => {
    let tag = "";
    if (isHtmlCode) {
      tag = `\n<html-widget height="380" title="${liveCanvasTitle}">\n${liveCode.trim()}\n</html-widget>\n`;
    } else {
      const bounds = detectContentBounds(liveCode, 500, 340);
      let tagWidth = 500;
      let tagHeight = 340;
      if (bounds && bounds.hasDrawn) {
        if (bounds.maxX > 500 - 15) {
          tagWidth = Math.ceil(bounds.maxX + 24);
        }
        const neededH = Math.ceil(bounds.maxY + 24);
        if (neededH < 320) {
          tagHeight = Math.max(120, neededH);
        } else if (bounds.maxY > 330) {
          tagHeight = Math.ceil(bounds.maxY + 24);
        }
      }
      tag = `\n<live-canvas width="${tagWidth}" height="${tagHeight}" title="${liveCanvasTitle}">\n${liveCode.trim()}\n</live-canvas>\n`;
    }
    onInsert(tag);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Thẻ Vẽ Đồ Thị, Bảng Biến Thiên & Khối Code Trực Tiếp
              </h3>
              <p className="text-xs text-slate-500">
                Tạo hình minh họa chuẩn chương trình Toán THPT (GDPT 2018) cho câu hỏi và lời giải
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-100/70 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("graph")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "graph"
                ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Thẻ 1: Vẽ Đồ Thị Hàm Số</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bbt")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "bbt"
                ? "bg-white text-emerald-600 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Table className="w-4 h-4 text-emerald-600" />
            <span>Thẻ 2: Bảng Biến Thiên</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("live_code")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "live_code"
                ? "bg-white text-indigo-600 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Code2 className="w-4 h-4 text-indigo-600" />
            <span>Thẻ 3: Khối Code Trực Tiếp (Live Runner)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: GRAPH BUILDER */}
          {activeTab === "graph" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Controls */}
              <div className="lg:col-span-6 space-y-4">
                {/* Presets */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mẫu đồ thị phổ biến (GDPT 2018):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "bac3", label: "Bậc 3 (2 cực trị)" },
                      { id: "bac4_trungphuong", label: "Trùng phương" },
                      { id: "phanthuc_1_1", label: "Nhất biến 1/1" },
                      { id: "phanthuc_2_1", label: "Phân thức 2/1" },
                      { id: "parabol", label: "Parabol bậc 2" },
                      { id: "mu_log", label: "Mũ & Log" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyGraphPreset(p.id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Function Expression */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hàm số y = f(x):
                  </label>
                  <input
                    type="text"
                    value={graphFn}
                    onChange={(e) => setGraphFn(e.target.value)}
                    placeholder="ví dụ: x^3 - 3*x + 1 hoặc (2*x+1)/(x-1)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="text-[11px] text-slate-400 mt-1">
                    Hỗ trợ: `x^2`, `x^3`, `sqrt(x)`, `sin(x)`, `cos(x)`, `abs(x)`, `ln(x)`, `(2*x+1)/(x-1)`
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiêu đề đồ thị (tuỳ chọn):
                  </label>
                  <input
                    type="text"
                    value={graphTitle}
                    onChange={(e) => setGraphTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                {/* X & Y Ranges */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Miền X [min, max]:</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={xMin}
                        onChange={(e) => setXMin(parseFloat(e.target.value) || -4)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-center"
                      />
                      <span>→</span>
                      <input
                        type="number"
                        value={xMax}
                        onChange={(e) => setXMax(parseFloat(e.target.value) || 4)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Miền Y [min, max]:</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={yMin}
                        onChange={(e) => setYMin(parseFloat(e.target.value) || -4)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-center"
                      />
                      <span>→</span>
                      <input
                        type="number"
                        value={yMax}
                        onChange={(e) => setYMax(parseFloat(e.target.value) || 4)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Special Points */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Điểm đặc biệt (Cực trị, uốn, giao trục):</label>
                    <button
                      type="button"
                      onClick={() => setGraphPoints([...graphPoints, { x: 0, y: 0, label: "A(0; 0)", color: "#4f46e5" }])}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm điểm
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {graphPoints.map((pt, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-xs">
                        <span className="text-slate-400 font-mono">x:</span>
                        <input
                          type="number"
                          value={pt.x}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setGraphPoints(graphPoints.map((p, i) => i === idx ? { ...p, x: val } : p));
                          }}
                          className="w-14 px-1 py-0.5 border border-slate-200 rounded text-center bg-white"
                        />
                        <span className="text-slate-400 font-mono">y:</span>
                        <input
                          type="number"
                          value={pt.y}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setGraphPoints(graphPoints.map((p, i) => i === idx ? { ...p, y: val } : p));
                          }}
                          className="w-14 px-1 py-0.5 border border-slate-200 rounded text-center bg-white"
                        />
                        <input
                          type="text"
                          value={pt.label || ""}
                          placeholder="Nhãn"
                          onChange={(e) => {
                            const val = e.target.value;
                            setGraphPoints(graphPoints.map((p, i) => i === idx ? { ...p, label: val } : p));
                          }}
                          className="flex-1 px-1.5 py-0.5 border border-slate-200 rounded bg-white text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setGraphPoints(graphPoints.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="lg:col-span-6 flex flex-col justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" /> Xem trước trực tiếp:
                  </div>
                  <div className="flex justify-center bg-white rounded-xl p-2 border border-slate-200 shadow-2xs">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: renderGraphToSvg({
                          title: graphTitle,
                          functions: [{ fn: graphFn, color: "#2563eb", label: `y = ${graphFn}` }],
                          xRange: [xMin, xMax],
                          yRange: [yMin, yMax],
                          points: graphPoints,
                          asymptotes: graphAsymptotes,
                        }),
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertGraph}
                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Chèn thẻ đồ thị vào bài viết</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BBT BUILDER */}
          {activeTab === "bbt" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mẫu bảng biến thiên phổ biến:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "bac3_duong", label: "Bậc 3 (a > 0)" },
                      { id: "bac3_am", label: "Bậc 3 (a < 0)" },
                      { id: "trungphuong", label: "Trùng phương" },
                      { id: "phanthuc", label: "Nhất biến 1/1" },
                      { id: "xet_dau", label: "Bảng xét dấu" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyBbtPreset(p.id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cấu trúc code bảng biến thiên (DSL):
                  </label>
                  <textarea
                    rows={6}
                    value={bbtDsl}
                    onChange={(e) => setBbtDsl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  />
                  <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                    <div>• Dòng 1: `x: -oo | -1 | 1 | +oo` (giá trị x, dấu || là tiệm cận)</div>
                    <div>• Dòng 2: `y': | + | 0 | - | 0 | + |` (dấu đạo hàm)</div>
                    <div>• Dòng 3: `y: -oo / 3 \ -1 / +oo` (`/` là đi lên, `\` là đi xuống)</div>
                  </div>
                </div>
              </div>

              {/* BBT Live Preview */}
              <div className="lg:col-span-6 flex flex-col justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> Bảng biến thiên trực tiếp:
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs overflow-x-auto">
                    <div dangerouslySetInnerHTML={{ __html: renderBBTToHtml(bbtDsl) }} />
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertBBT}
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Chèn bảng biến thiên vào bài viết</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE CODE RUNNER */}
          {activeTab === "live_code" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mẫu code có sẵn:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setLiveCode(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 14px; font-family: system-ui, sans-serif; text-align: center; }
    .sim-card { padding: 18px; background: linear-gradient(135deg, #eff6ff, #f5f3ff); border-radius: 12px; border: 1px solid #bfdbfe; }
    button { padding: 8px 18px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
    button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="sim-card">
    <h3>Mô phỏng tương tác HTML5 / CSS & JS</h3>
    <p id="sim-status">Bấm nút để kích hoạt tương tác:</p>
    <button onclick="document.getElementById('sim-status').innerText = 'JavaScript đã thực thi thành công! ✓'">Thử nghiệm</button>
  </div>
</body>
</html>`);
                        setLiveCanvasTitle("Mô phỏng HTML5 / JavaScript");
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                    >
                      ★ Mẫu HTML5 & JS (Mô phỏng)
                    </button>
                    {LIVE_CANVAS_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setLiveCode(tmpl.code);
                          setLiveCanvasTitle(tmpl.title);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      >
                        {tmpl.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiêu đề khối vẽ / mô phỏng:
                  </label>
                  <input
                    type="text"
                    value={liveCanvasTitle}
                    onChange={(e) => setLiveCanvasTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Mã JavaScript Canvas HOẶC dán toàn bộ mã nguồn HTML:
                    </label>
                    <span className="text-[11px] text-indigo-600 font-medium">
                      {isHtmlCode ? "Đang nhận diện: HTML5 / CSS & JS" : "Đang nhận diện: Canvas 2D JS"}
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    value={liveCode}
                    onChange={(e) => setLiveCode(e.target.value)}
                    placeholder="Dán mã Canvas JS hoặc dán nguyên cục code HTML5 (chứa <style>, <script>, <div>)..."
                    className="w-full px-3 py-2 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>
              </div>

              {/* Live Preview Pane */}
              <div className="lg:col-span-6 flex flex-col justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <Play className="w-4 h-4 text-emerald-600" /> Kết quả chạy trực tiếp:
                    </div>
                    {isHtmlCode && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                        HTML5 Sandbox
                      </span>
                    )}
                  </div>

                  {liveCodeError && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                      Lỗi thực thi: {liveCodeError}
                    </div>
                  )}

                  <div className="flex justify-center bg-white rounded-xl p-2 border border-slate-200 shadow-2xs overflow-hidden min-h-[290px]">
                    {isHtmlCode ? (
                      <iframe
                        sandbox="allow-scripts allow-modals allow-forms allow-popups"
                        srcDoc={
                          /<!DOCTYPE\b|<html\b/i.test(liveCode)
                            ? liveCode
                            : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;font-family:sans-serif;}</style></head><body>${liveCode}</body></html>`
                        }
                        className="w-full h-[280px] border-0 rounded-lg bg-white"
                        title="HTML5 Live Preview"
                      />
                    ) : (
                      <canvas ref={canvasPreviewRef} className="rounded-lg shadow-2xs" />
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertLiveCanvas}
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Chèn khối code trực tiếp vào bài viết</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
