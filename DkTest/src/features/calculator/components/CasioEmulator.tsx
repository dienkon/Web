import React, { useState, useRef, useEffect } from "react";
import { X, Maximize2, Minimize2, Move, Grid, Check, HelpCircle, ArrowLeft, RefreshCw } from "lucide-react";
import "mathlive";
import { ComputeEngine } from "@cortex-js/compute-engine";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSendToScratchpad?: (value: string) => void;
}

type CasioMode = "COMP" | "CMPLX" | "TABLE" | "EQN" | "INEQ" | "MATRIX" | "VECTOR" | "STAT";

export default function CasioEmulator({ isOpen, onClose, onSendToScratchpad }: Props) {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const mfRef = useRef<any>(null);
  const [result, setResult] = useState<string>("");
  const [isShift, setIsShift] = useState(false);
  const [isAlpha, setIsAlpha] = useState(false);
  const [decimalMode, setDecimalMode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeMode, setActiveMode] = useState<CasioMode>("COMP");
  
  // Solver sub-modal state for Equation / Table
  const [eqnType, setEqnType] = useState<"deg2" | "deg3" | "sys2" | null>(null);
  const [eqnCoeffs, setEqnCoeffs] = useState<Record<string, string>>({ a: "1", b: "-3", c: "2", d: "0", a1: "1", b1: "1", c1: "5", a2: "2", b2: "-1", c2: "4" });
  const [eqnResult, setEqnResult] = useState<string[] | null>(null);

  const ceRef = useRef<ComputeEngine | null>(null);

  useEffect(() => {
    ceRef.current = new ComputeEngine();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPosition({
        x: window.innerWidth > 600 ? Math.max(10, window.innerWidth - 380) : 10,
        y: 70,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (mfRef.current && !isMinimized && !showMenu) {
      mfRef.current.virtualKeyboardMode = "off";
      mfRef.current.focus();
    }
  }, [isMinimized, showMenu, isOpen]);

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initX: position.x, initY: position.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 100, dragRef.current.initX + (e.clientX - dragRef.current.startX)));
    const newY = Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.initY + (e.clientY - dragRef.current.startY)));
    setPosition({ x: newX, y: newY });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleCommand = (cmd: string) => {
    if (mfRef.current) {
      mfRef.current.executeCommand(cmd);
      mfRef.current.focus();
    }
  };

  const insert = (text: string) => {
    if (mfRef.current) {
      mfRef.current.insert(text);
      mfRef.current.focus();
    }
  };

  const handleCalculate = async (toggleDecimal = false) => {
    if (!mfRef.current || !ceRef.current) return;
    try {
      const isDec = toggleDecimal ? !decimalMode : decimalMode;
      if (toggleDecimal) setDecimalMode(isDec);

      const latexVal = mfRef.current.getValue("latex");
      if (!latexVal || latexVal.trim() === "") {
        setResult("");
        return;
      }

      const expr = ceRef.current.parse(latexVal);
      const evaled = expr.evaluate();

      let resText = "";
      if (isDec) {
        const numVal = evaled.N();
        resText = numVal.latex || (numVal.value !== undefined ? String(numVal.value) : "0");
      } else {
        resText = evaled.latex || (evaled.value !== undefined ? String(evaled.value) : "0");
      }

      if (resText === "NaN" || resText === "Undefined") {
        setResult("Math ERROR");
      } else {
        setResult(resText);
      }
    } catch (e) {
      setResult("Math ERROR");
    }
  };

  const handleSolveEquation = () => {
    try {
      if (eqnType === "deg2") {
        const a = parseFloat(eqnCoeffs.a);
        const b = parseFloat(eqnCoeffs.b);
        const c = parseFloat(eqnCoeffs.c);
        if (isNaN(a) || isNaN(b) || isNaN(c) || a === 0) {
          setEqnResult(["Hệ số không hợp lệ (a ≠ 0)"]);
          return;
        }
        const delta = b * b - 4 * a * c;
        if (delta > 0) {
          const x1 = (-b + Math.sqrt(delta)) / (2 * a);
          const x2 = (-b - Math.sqrt(delta)) / (2 * a);
          setEqnResult([`x_1 = ${x1.toFixed(4)}`, `x_2 = ${x2.toFixed(4)}`, `\\Delta = ${delta}`]);
        } else if (delta === 0) {
          const x = -b / (2 * a);
          setEqnResult([`x_1 = x_2 = ${x.toFixed(4)}`, `\\Delta = 0`]);
        } else {
          const real = (-b / (2 * a)).toFixed(3);
          const imag = (Math.sqrt(-delta) / (2 * a)).toFixed(3);
          setEqnResult([`x_1 = ${real} + ${imag}i`, `x_2 = ${real} - ${imag}i`, `\\Delta = ${delta} < 0`]);
        }
      } else if (eqnType === "sys2") {
        const a1 = parseFloat(eqnCoeffs.a1), b1 = parseFloat(eqnCoeffs.b1), c1 = parseFloat(eqnCoeffs.c1);
        const a2 = parseFloat(eqnCoeffs.a2), b2 = parseFloat(eqnCoeffs.b2), c2 = parseFloat(eqnCoeffs.c2);
        const D = a1 * b2 - a2 * b1;
        const Dx = c1 * b2 - c2 * b1;
        const Dy = a1 * c2 - a2 * c1;
        if (D === 0) {
          setEqnResult(Dx === 0 && Dy === 0 ? ["Hệ vô số nghiệm"] : ["Hệ vô nghiệm"]);
        } else {
          setEqnResult([`x = ${(Dx / D).toFixed(4)}`, `y = ${(Dy / D).toFixed(4)}`]);
        }
      }
    } catch {
      setEqnResult(["Lỗi tính toán"]);
    }
  };

  const handleClear = () => {
    if (mfRef.current) mfRef.current.value = "";
    setResult("");
  };

  const handleDelete = () => handleCommand("deleteBackward");

  if (!isOpen) return null;

  // Render floating collapsed widget if minimized
  if (isMinimized) {
    return (
      <div
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        className="fixed z-[60] bg-[#1e1f22] border-2 border-blue-500/80 rounded-2xl shadow-2xl p-2.5 flex items-center gap-2.5 cursor-grab active:cursor-grabbing text-white select-none backdrop-blur-md"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="flex items-center gap-1.5 px-1 font-bold text-xs text-blue-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>fx-580VN X</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
          title="Mở rộng máy tính Casio"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Mở</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
          title="Đóng máy tính"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      className="fixed z-[60] w-[350px] shadow-2xl rounded-3xl border border-slate-700 bg-[#1e1f22] flex flex-col overflow-hidden text-slate-100 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Title / Drag Bar */}
      <div
        className="h-10 bg-[#141517] border-b border-[#2a2b30] flex items-center justify-between px-3.5 cursor-grab active:cursor-grabbing text-neutral-400 select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-black tracking-widest text-[#d1d5db]">CASIO fx-580VN X</span>
          <span className="text-[10px] bg-blue-900/60 text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-700/50">
            {activeMode}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
              showMenu ? "bg-amber-500 text-slate-900" : "hover:text-white hover:bg-slate-800"
            }`}
            title="Menu chức năng"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Thu nhỏ cửa sổ"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            title="Đóng máy tính"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-3.5 flex flex-col gap-3 bg-[#1e1f22]">
        {/* CASIO LCD SCREEN */}
        <div className="bg-[#9ba699] rounded-xl p-2.5 border-[3px] border-[#0a0a0a] shadow-inner flex flex-col h-[115px] font-mono relative overflow-hidden">
          {/* Status Header */}
          <div className="flex justify-between text-[10px] text-[#222] font-black h-4 select-none">
            <div className="flex items-center gap-1.5">
              {isShift && <span className="bg-[#222] text-[#ffb84d] px-1 rounded text-[9px]">S</span>}
              {isAlpha && <span className="bg-[#222] text-[#ff4d4d] px-1 rounded text-[9px]">A</span>}
              <span className="text-[9px]">{activeMode}</span>
            </div>
            <div className="flex items-center gap-2 text-[9px]">
              <span>D</span>
              <span>MATH</span>
            </div>
          </div>

          {/* Math Expression Field */}
          <div className="flex-1 overflow-x-auto flex items-center w-full min-h-[36px]" style={{ fontSize: "1.4rem" }}>
            {React.createElement("math-field", {
              ref: mfRef,
              style: {
                width: "100%",
                backgroundColor: "transparent",
                color: "#111",
                border: "none",
                outline: "none",
                fontFamily: "monospace",
                fontWeight: "600",
              },
            })}
          </div>

          {/* Evaluation Result Area */}
          <div className="h-7 text-right text-[#111] text-lg font-black font-mono tracking-tighter truncate mt-0.5 border-t border-[#879285] pt-0.5">
            {result && (
              <div
                onClick={() => {
                  if (onSendToScratchpad && result && result !== "Math ERROR") {
                    onSendToScratchpad(result);
                  }
                }}
                className="w-full text-right cursor-pointer hover:bg-[#8e9a8c] rounded px-1 transition-colors flex items-center justify-end"
                title="Bấm để dán kết quả vào nháp"
              >
                {React.createElement("math-field", {
                  "read-only": true,
                  style: {
                    textAlign: "right",
                    backgroundColor: "transparent",
                    color: "#000",
                    border: "none",
                    outline: "none",
                    pointerEvents: "none",
                    fontWeight: "bold",
                  },
                  value: result,
                })}
              </div>
            )}
          </div>
        </div>

        {/* FUNCTION MODE MENU OVERLAY */}
        {showMenu && (
          <div className="bg-[#2a2b30] border border-[#404148] rounded-2xl p-3 space-y-2 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-1 border-b border-slate-700">
              <span className="text-amber-400 font-extrabold uppercase">MENU CHỨC NĂNG (MODE)</span>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { key: "1", mode: "COMP" as CasioMode, label: "1: Tính toán cơ bản" },
                { key: "2", mode: "CMPLX" as CasioMode, label: "2: Số phức (CMPLX)" },
                { key: "3", mode: "TABLE" as CasioMode, label: "3: Bảng giá trị f(x)" },
                { key: "4", mode: "EQN" as CasioMode, label: "4: PT / Hệ phương trình" },
                { key: "5", mode: "INEQ" as CasioMode, label: "5: Bất phương trình" },
                { key: "6", mode: "STAT" as CasioMode, label: "6: Thống kê 1 biến" },
              ].map((item) => (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => {
                    setActiveMode(item.mode);
                    setShowMenu(false);
                    if (item.mode === "EQN") {
                      setEqnType("deg2");
                    }
                  }}
                  className={`p-2 rounded-xl text-left font-bold transition-all border ${
                    activeMode === item.mode
                      ? "bg-blue-600 text-white border-blue-400 shadow-xs"
                      : "bg-[#1f2024] text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* EQUATION SOLVER MODAL IF MODE = EQN */}
        {activeMode === "EQN" && eqnType && (
          <div className="bg-[#25262b] border border-blue-500/50 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-blue-300">
              <span>Giải PT Bậc 2: ax² + bx + c = 0</span>
              <button
                type="button"
                onClick={() => {
                  setActiveMode("COMP");
                  setEqnType(null);
                }}
                className="text-slate-400 hover:text-white text-[11px]"
              >
                Về COMP
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block font-bold">a =</label>
                <input
                  type="text"
                  value={eqnCoeffs.a}
                  onChange={(e) => setEqnCoeffs({ ...eqnCoeffs, a: e.target.value })}
                  className="w-full bg-[#141517] border border-slate-700 rounded-lg p-1.5 text-xs text-center font-mono font-bold text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block font-bold">b =</label>
                <input
                  type="text"
                  value={eqnCoeffs.b}
                  onChange={(e) => setEqnCoeffs({ ...eqnCoeffs, b: e.target.value })}
                  className="w-full bg-[#141517] border border-slate-700 rounded-lg p-1.5 text-xs text-center font-mono font-bold text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block font-bold">c =</label>
                <input
                  type="text"
                  value={eqnCoeffs.c}
                  onChange={(e) => setEqnCoeffs({ ...eqnCoeffs, c: e.target.value })}
                  className="w-full bg-[#141517] border border-slate-700 rounded-lg p-1.5 text-xs text-center font-mono font-bold text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleSolveEquation}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Giải nghiệm =
              </button>
            </div>

            {eqnResult && (
              <div className="p-2 bg-[#1a1b1e] rounded-xl border border-slate-700 text-xs font-mono space-y-1 text-emerald-400 font-bold">
                {eqnResult.map((res, i) => (
                  <div key={i}>{res}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CASIO HARDWARE KEYPAD */}
        <div className="flex flex-col gap-2">
          {/* Top Control Cluster */}
          <div className="flex justify-between items-start px-0.5">
            <button
              type="button"
              onClick={() => {
                setIsShift(!isShift);
                setIsAlpha(false);
              }}
              className={`w-[44px] h-7 rounded-[50%] bg-[#3a3b40] text-[#ffb84d] text-[10px] font-black border-b-2 transition-all ${
                isShift ? "border-[#111] bg-amber-900/50 translate-y-0.5" : "border-[#111]"
              }`}
            >
              SHIFT
            </button>

            <button
              type="button"
              onClick={() => {
                setIsAlpha(!isAlpha);
                setIsShift(false);
              }}
              className={`w-[44px] h-7 rounded-[50%] bg-[#3a3b40] text-[#ff4d4d] text-[10px] font-black border-b-2 transition-all ${
                isAlpha ? "border-[#111] bg-red-900/50 translate-y-0.5" : "border-[#111]"
              }`}
            >
              ALPHA
            </button>

            {/* D-Pad Navigational Disc */}
            <div className="w-18 h-18 bg-[#323338] rounded-full border-2 border-[#111] relative shadow-md flex items-center justify-center">
              <button
                type="button"
                onClick={() => handleCommand("moveToPreviousChar")}
                className="absolute left-0.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-slate-600/50 flex items-center justify-center text-[10px] font-bold text-slate-300"
                title="Sang trái"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => handleCommand("moveToNextChar")}
                className="absolute right-0.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-slate-600/50 flex items-center justify-center text-[10px] font-bold text-slate-300"
                title="Sang phải"
              >
                ▶
              </button>
              <button
                type="button"
                onClick={() => handleCommand("moveToPreviousPlaceholder")}
                className="absolute top-0.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full hover:bg-slate-600/50 flex items-center justify-center text-[10px] font-bold text-slate-300"
                title="Lên trên / Tử số"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => handleCommand("moveToNextPlaceholder")}
                className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full hover:bg-slate-600/50 flex items-center justify-center text-[10px] font-bold text-slate-300"
                title="Xuống dưới / Mẫu số"
              >
                ▼
              </button>
              <div className="w-7 h-7 rounded-full border border-[#222] bg-[#222327] pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="w-[44px] h-7 rounded-[50%] bg-[#3a3b40] text-white text-[10px] font-bold border-b-2 border-[#111] hover:bg-slate-600"
            >
              MENU
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="w-[44px] h-7 rounded-[50%] bg-[#3a3b40] text-white text-[10px] font-bold border-b-2 border-[#111] hover:bg-slate-600"
            >
              ON
            </button>
          </div>

          {/* Scientific Operations Grid (Row 1-3) */}
          <div className="grid grid-cols-6 gap-1.5">
            <CalcBtn label="OPTN" onClick={() => insert("x")} />
            <CalcBtn label="CALC" shift="SOLVE" shiftColor="#ffb84d" onShift={() => handleCalculate(false)} onClick={() => insert("x")} />
            <CalcBtn label="∫□" onClick={() => insert("\\int_{}^{}")} />
            <CalcBtn label="d/dx" onClick={() => insert("\\frac{d}{dx}\\left(\\right)")} />
            <CalcBtn label="x⁻¹" onClick={() => insert("^{-1}")} />
            <CalcBtn label="log" shift="10ˣ" onShift={() => insert("10^{}")} onClick={() => insert("\\log_{}(")} />

            <CalcBtn label="a/b" onClick={() => insert("\\frac{}{}")} />
            <CalcBtn label="√□" shift="³√□" shiftColor="#ffb84d" onShift={() => insert("\\sqrt[3]{}")} onClick={() => insert("\\sqrt{}")} />
            <CalcBtn label="x²" onClick={() => insert("^2")} />
            <CalcBtn label="x^□" onClick={() => insert("^{}")} />
            <CalcBtn label="log" onClick={() => insert("\\log(")} />
            <CalcBtn label="ln" shift="eˣ" onShift={() => insert("e^{}")} onClick={() => insert("\\ln(")} />

            <CalcBtn label="(-)" onClick={() => insert("-")} />
            <CalcBtn label={'° \' "'} onClick={() => insert("^{\\circ}")} />
            <CalcBtn label="S⇔D" onClick={() => handleCalculate(true)} />
            <CalcBtn label="sin" shift="sin⁻¹" onShift={() => insert("\\arcsin(")} onClick={() => insert("\\sin(")} />
            <CalcBtn label="cos" shift="cos⁻¹" onShift={() => insert("\\arccos(")} onClick={() => insert("\\cos(")} />
            <CalcBtn label="tan" shift="tan⁻¹" onShift={() => insert("\\arctan(")} onClick={() => insert("\\tan(")} />
          </div>

          {/* Keypad Digits & Operators */}
          <div className="grid grid-cols-5 gap-1.5 mt-1">
            <div className="col-span-3 grid grid-cols-3 gap-1.5">
              {["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "×10ˣ"].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => (btn === "×10ˣ" ? insert("\\cdot 10^{}") : insert(btn))}
                  className="bg-[#d4d4d6] text-black h-9 rounded-lg font-bold text-base border-b-[3px] border-[#9ca3af] active:border-b-0 active:translate-y-[2px] shadow-xs hover:bg-white transition-all cursor-pointer"
                >
                  {btn}
                </button>
              ))}
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleDelete}
                className="bg-[#e11d48] text-white h-9 rounded-lg font-bold text-xs border-b-[3px] border-[#9f1239] active:border-b-0 active:translate-y-[2px] shadow-xs hover:bg-[#f43f5e] transition-all cursor-pointer"
              >
                DEL
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="bg-[#e11d48] text-white h-9 rounded-lg font-bold text-xs border-b-[3px] border-[#9f1239] active:border-b-0 active:translate-y-[2px] shadow-xs hover:bg-[#f43f5e] transition-all cursor-pointer"
              >
                AC
              </button>

              <button
                type="button"
                onClick={() => insert("\\times")}
                className="bg-[#3a3b40] text-white h-9 rounded-lg font-bold text-base border-b-[3px] border-[#18181b] active:border-b-0 active:translate-y-[2px] shadow-xs hover:bg-slate-600 transition-all cursor-pointer"
              >
                ×
              </button>
              <button
                type="button"
                onClick={() => insert("\\div")}
                className="bg-[#3a3b40] text-white h-9 rounded-lg font-bold text-base border-b-[3px] border-[#18181b] active:border-b-0 active:translate-y-[2px] shadow-xs hover:bg-slate-600 transition-all cursor-pointer"
              >
                ÷
              </button>

              <button
                type="button"
                onClick={() => insert("+")}
                className="bg-[#3a3b40] text-white h-9 rounded-lg font-bold text-base border-b-[3px] border-[#18181b] active:border-b-0 active:translate-y-[2px] shadow-xs hover:bg-slate-600 transition-all cursor-pointer"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => insert("-")}
                className="bg-[#3a3b40] text-white h-9 rounded-lg font-bold text-base border-b-[3px] border-[#18181b] active:border-b-0 active:translate-y-[2px] shadow-xs hover:bg-slate-600 transition-all cursor-pointer"
              >
                −
              </button>

              <button
                type="button"
                onClick={() => insert("Ans")}
                className="bg-[#d4d4d6] text-black h-9 rounded-lg font-bold text-xs border-b-[3px] border-[#9ca3af] active:border-b-0 active:translate-y-[2px] shadow-xs hover:bg-white transition-all cursor-pointer"
              >
                Ans
              </button>
              <button
                type="button"
                onClick={() => handleCalculate(false)}
                className="bg-[#2563eb] text-white h-9 rounded-lg font-black text-xl border-b-[3px] border-[#1d4ed8] active:border-b-0 active:translate-y-[2px] shadow-xs hover:bg-blue-500 transition-all cursor-pointer"
              >
                =
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function CalcBtn({ label, shift, shiftColor, onShift, onClick }: any) {
    return (
      <button
        type="button"
        onClick={() => {
          if (isShift && onShift) {
            onShift();
            setIsShift(false);
          } else if (onClick) {
            onClick();
          }
        }}
        className="bg-[#2a2b30] text-white h-[32px] rounded-lg border-b-2 border-[#111] flex flex-col items-center justify-center relative active:border-b-0 active:translate-y-[2px] shadow-xs hover:bg-slate-700 transition-all cursor-pointer"
      >
        {shift && (
          <span
            className="absolute -top-2.5 text-[8px] font-black"
            style={{ color: shiftColor || "#ffb84d" }}
          >
            {shift}
          </span>
        )}
        <span className="text-[10px] font-bold">{label}</span>
      </button>
    );
  }
}
