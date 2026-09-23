/**
 * ChemDex Data Editor - Chemical Formula, Equation & Special Characters Tools
 * Fulfills Sections AH, AI, AJ, DF of ChemDex CMS Specification
 */
import { escapeHtml } from "./utils.js";

const SUB_MAP = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋",
};

const SUPER_MAP = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "2+": "²⁺", "3+": "³⁺", "2-": "²⁻", "3-": "³⁻",
};

export function formatChemicalFormula(raw) {
  if (!raw) return "";
  let str = raw.trim();

  // Convert ^superscript (e.g. SO4^2- -> SO₄²⁻)
  str = str.replace(/\^([0-9\+\-]+)/g, (_, exp) => {
    return exp.split("").map((c) => SUPER_MAP[c] || c).join("");
  });

  // Convert trailing charge (e.g. Ca2+ -> Ca²⁺, Cl- -> Cl⁻)
  str = str.replace(/([A-Za-z\)])([0-9]*[\+\-])(?=[^A-Za-z0-9]|$)/g, (_, base, charge) => {
    const sup = charge.split("").map((c) => SUPER_MAP[c] || c).join("");
    return base + sup;
  });

  // Convert remaining numbers following letters/brackets to subscripts (e.g. H2O -> H₂O, Fe(OH)3 -> Fe(OH)₃)
  str = str.replace(/([A-Za-z\)])([0-9]+)/g, (_, base, num) => {
    const sub = num.split("").map((c) => SUB_MAP[c] || c).join("");
    return base + sub;
  });

  return str;
}

export class ChemistryTools {
  constructor(wysiwygInstance) {
    this.wysiwyg = wysiwygInstance;
    this.savedSelection = null;
  }

  saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      this.savedSelection = sel.getRangeAt(0).cloneRange();
    } else {
      this.savedSelection = null;
    }
  }

  restoreSelection() {
    if (this.savedSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this.savedSelection);
    }
  }

  /**
   * Section AH: Formula Insert Dialog
   */
  openFormulaDialog(onInsert) {
    this.saveSelection();

    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-fade-in";
    overlay.innerHTML = `
      <div class="bg-[#181B1F] border border-white/10 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-slate-200">
        <div class="flex items-center justify-between border-b border-white/5 pb-3">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-flask text-cyan-400"></i>
            <h3 class="font-bold text-sm text-white">Chèn công thức hóa học</h3>
          </div>
          <button id="form-close-btn" class="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Nhập công thức tự nhiên</label>
          <input
            type="text"
            id="formula-raw-input"
            placeholder="Ví dụ: H2O, SO4^2-, Ca(OH)2, Fe2(SO4)3, Cu2+..."
            class="w-full bg-[#111315] border border-white/10 text-white font-mono text-sm rounded-xl px-3.5 py-2.5 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            autofocus
          />
          <p class="text-[11px] text-slate-400 mt-1">Gõ số bình thường, hệ thống sẽ tự động chuyển thành chỉ số dưới hoặc trên.</p>
        </div>

        <!-- Quick Subscript / Superscript Helper Buttons -->
        <div class="space-y-1.5 bg-[#111315] p-2.5 rounded-xl border border-white/5">
          <div class="flex items-center justify-between text-[10px] text-slate-400">
            <span>Ký tự nhanh:</span>
          </div>
          <div class="flex items-center gap-1 flex-wrap" id="formula-quick-buttons">
            ${["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉", "⁺", "⁻", "²⁺", "³⁺", "²⁻"]
              .map(
                (char) => `
              <button type="button" class="w-6 h-6 rounded bg-white/5 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs border border-white/5 hover:border-cyan-500/40" data-char="${char}">
                ${char}
              </button>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- Live Preview -->
        <div class="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Xem trước hiển thị:</span>
            <div id="formula-preview" class="text-xl font-mono font-black text-cyan-200 mt-0.5 tracking-wide">
              (Chưa nhập)
            </div>
          </div>
          <span class="text-xs text-cyan-400/60 font-mono">HTML formatted</span>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <button type="button" id="form-cancel-btn" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300">
            Hủy
          </button>
          <button type="button" id="form-insert-btn" class="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25">
            Chèn công thức
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector("#formula-raw-input");
    const preview = overlay.querySelector("#formula-preview");

    const updatePreview = () => {
      const formatted = formatChemicalFormula(input.value);
      preview.textContent = formatted || "(Chưa nhập)";
    };

    input.oninput = updatePreview;

    overlay.querySelectorAll("#formula-quick-buttons button").forEach((btn) => {
      btn.onclick = () => {
        input.value += btn.dataset.char;
        input.focus();
        updatePreview();
      };
    });

    const doInsert = () => {
      const formatted = formatChemicalFormula(input.value);
      if (formatted) {
        this.restoreSelection();
        onInsert(formatted);
      }
      overlay.remove();
    };

    overlay.querySelector("#form-insert-btn").onclick = doInsert;
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doInsert();
      }
    };

    overlay.querySelector("#form-close-btn").onclick = () => overlay.remove();
    overlay.querySelector("#form-cancel-btn").onclick = () => overlay.remove();
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  }

  /**
   * Section AI: Chemical Equation Tool
   */
  openEquationDialog(onInsert) {
    this.saveSelection();

    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-fade-in";
    overlay.innerHTML = `
      <div class="bg-[#181B1F] border border-white/10 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 text-slate-200">
        <div class="flex items-center justify-between border-b border-white/5 pb-3">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-atom text-emerald-400"></i>
            <h3 class="font-bold text-sm text-white">Chèn phương trình phản ứng hóa học</h3>
          </div>
          <button id="eq-close-btn" class="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Reactants & Products Grid -->
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Chất tham gia (Reactants)</label>
            <input
              type="text"
              id="eq-reactants"
              placeholder="Ví dụ: 2H2 + O2 hoặc CaCO3"
              class="w-full bg-[#111315] border border-white/10 text-white font-mono text-sm rounded-xl px-3.5 py-2 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              autofocus
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Mũi tên phản ứng</label>
              <select id="eq-arrow" class="w-full bg-[#111315] border border-white/10 text-emerald-300 font-bold text-base rounded-xl px-3 py-2 focus:outline-none">
                <option value="→">→ (Một chiều)</option>
                <option value="⇌">⇌ (Thuận nghịch)</option>
                <option value="←">← (Nghịch)</option>
                <option value="⇄">⇄ (Cân bằng)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Điều kiện phản ứng (tùy chọn)</label>
              <input
                type="text"
                id="eq-condition"
                placeholder="Ví dụ: t°, xt, p, ánh sáng..."
                class="w-full bg-[#111315] border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Chất sản phẩm (Products)</label>
            <input
              type="text"
              id="eq-products"
              placeholder="Ví dụ: 2H2O hoặc CaO + CO2↑"
              class="w-full bg-[#111315] border border-white/10 text-white font-mono text-sm rounded-xl px-3.5 py-2 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
        </div>

        <!-- Quick Symbols: gas, precipitate, plus, minus, delta -->
        <div class="flex items-center gap-1.5 p-2 rounded-xl bg-[#111315] border border-white/5">
          <span class="text-[10px] text-slate-400 mr-1">Ký hiệu nhanh:</span>
          ${[
            { label: "↑ Khí", val: "↑" },
            { label: "↓ Kết tủa", val: "↓" },
            { label: "Δ Nhiệt", val: "Δ" },
            { label: "t°", val: "t°" },
            { label: "+", val: " + " },
          ]
            .map(
              (s) => `
            <button type="button" class="eq-symbol-btn px-2 py-1 rounded bg-white/5 hover:bg-emerald-500/20 text-emerald-300 font-semibold text-xs border border-white/5" data-val="${s.val}">
              ${s.label}
            </button>
          `
            )
            .join("")}
        </div>

        <!-- Live Preview -->
        <div class="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
          <span class="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Xem trước phương trình:</span>
          <div id="eq-preview" class="text-base font-mono font-bold text-emerald-200 mt-1 py-1 px-2 rounded bg-black/30 text-center">
            (Chưa nhập đủ chất tham gia và sản phẩm)
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <button type="button" id="eq-cancel-btn" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300">
            Hủy
          </button>
          <button type="button" id="eq-insert-btn" class="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25">
            Chèn phương trình
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const reactantsInput = overlay.querySelector("#eq-reactants");
    const arrowSelect = overlay.querySelector("#eq-arrow");
    const conditionInput = overlay.querySelector("#eq-condition");
    const productsInput = overlay.querySelector("#eq-products");
    const preview = overlay.querySelector("#eq-preview");

    let lastFocused = reactantsInput;
    reactantsInput.onfocus = () => (lastFocused = reactantsInput);
    productsInput.onfocus = () => (lastFocused = productsInput);
    conditionInput.onfocus = () => (lastFocused = conditionInput);

    const updatePreview = () => {
      const r = formatChemicalFormula(reactantsInput.value);
      const p = formatChemicalFormula(productsInput.value);
      const arrow = arrowSelect.value;
      const cond = conditionInput.value.trim();

      if (!r && !p) {
        preview.textContent = "(Chưa nhập đủ dữ liệu)";
        return;
      }

      let arrowStr = cond ? ` —(${cond})→ ` : ` ${arrow} `;
      preview.textContent = `${r || "..."}${arrowStr}${p || "..."}`;
    };

    [reactantsInput, arrowSelect, conditionInput, productsInput].forEach((el) => {
      el.oninput = updatePreview;
      el.onchange = updatePreview;
    });

    overlay.querySelectorAll(".eq-symbol-btn").forEach((btn) => {
      btn.onclick = () => {
        if (lastFocused) {
          lastFocused.value += btn.dataset.val;
          lastFocused.focus();
          updatePreview();
        }
      };
    });

    const doInsert = () => {
      const r = formatChemicalFormula(reactantsInput.value);
      const p = formatChemicalFormula(productsInput.value);
      const arrow = arrowSelect.value;
      const cond = conditionInput.value.trim();

      if (!r && !p) return;

      const condHtml = cond ? `<span class="text-[10px] text-amber-400 block -mb-1">(${escapeHtml(cond)})</span>` : "";
      const eqHtml = `
        <div class="chemical-equation-block my-3 p-3 rounded-xl bg-[#111315] border border-emerald-500/20 text-center font-mono font-bold text-emerald-200 text-sm md:text-base select-text">
          <span class="reactants text-white">${escapeHtml(r)}</span>
          <span class="inline-flex flex-col items-center mx-2 text-emerald-400 font-sans">
            ${condHtml}
            <span>${escapeHtml(arrow)}</span>
          </span>
          <span class="products text-white">${escapeHtml(p)}</span>
        </div>
        <p><br></p>
      `;

      this.restoreSelection();
      onInsert(eqHtml);
      overlay.remove();
    };

    overlay.querySelector("#eq-insert-btn").onclick = doInsert;
    overlay.querySelector("#eq-close-btn").onclick = () => overlay.remove();
    overlay.querySelector("#eq-cancel-btn").onclick = () => overlay.remove();
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  }

  /**
   * Section AJ: Special Characters Palette
   */
  openSpecialCharsDialog(onInsert) {
    this.saveSelection();

    const charGroups = [
      {
        name: "Mũi tên phản ứng & Trạng thái",
        chars: ["→", "←", "⇌", "⇄", "↑", "↓", "⇒", "⇔"],
      },
      {
        name: "Toán học & Đơn vị hóa học",
        chars: ["±", "°", "℃", "≈", "≠", "≤", "≥", "×", "÷", "•", "Å", "⚡", "Δ", "‰", "∞"],
      },
      {
        name: "Chữ cái Hy Lạp phổ biến",
        chars: ["α", "β", "γ", "δ", "ε", "θ", "λ", "μ", "π", "ρ", "σ", "φ", "ω", "Δ", "Ω"],
      },
      {
        name: "Chỉ số dưới (Subscript)",
        chars: ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉", "₊", "₋"],
      },
      {
        name: "Chỉ số trên (Superscript)",
        chars: ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "⁺", "⁻"],
      },
    ];

    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-fade-in";
    overlay.innerHTML = `
      <div class="bg-[#181B1F] border border-white/10 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-slate-200">
        <div class="flex items-center justify-between border-b border-white/5 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-amber-400 font-serif font-black text-base">Ω</span>
            <h3 class="font-bold text-sm text-white">Bảng ký hiệu đặc biệt</h3>
          </div>
          <button id="sc-close-btn" class="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
          ${charGroups
            .map(
              (group) => `
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">${group.name}</span>
              <div class="grid grid-cols-7 gap-1">
                ${group.chars
                  .map(
                    (c) => `
                  <button type="button" class="sc-btn h-9 rounded-lg bg-[#111315] hover:bg-sky-500/20 text-slate-200 hover:text-sky-300 font-mono text-sm border border-white/5 hover:border-sky-500/40 transition-all flex items-center justify-center shadow-sm" data-char="${c}">
                    ${c}
                  </button>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="pt-2 flex justify-end border-t border-white/5">
          <button type="button" id="sc-close" class="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300">
            Đóng
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelectorAll(".sc-btn").forEach((btn) => {
      btn.onclick = () => {
        const c = btn.dataset.char;
        this.restoreSelection();
        onInsert(c);
        overlay.remove();
      };
    });

    overlay.querySelector("#sc-close-btn").onclick = () => overlay.remove();
    overlay.querySelector("#sc-close").onclick = () => overlay.remove();
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  }
}
