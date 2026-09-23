/**
 * ChemDex Data Editor - Visual CMS Document Editor
 * 100% compliant with ChemDex standard detail form (Form gốc bảng tuần hoàn)
 * Numbered sections:
 *  1. Thông tin chung
 *  2. Lịch sử khám phá
 *  3. Cấu tạo (a. Cấu tạo, b. Trạng thái tự nhiên, c. Đồng vị)
 *  4. Tính chất (Tính chất vật lý | Tính chất hóa học)
 *  5. Điều chế
 *  6. Nhận biết
 *  7. Phương trình
 *  8. Ứng dụng thực tế
 *  9. Tổng quan & Ghi chú
 */
import { state } from "./state.js";
import { escapeHtml, deepClone, showConfirmModal } from "./utils.js";
import { draftManager } from "./draft-manager.js";

const CATEGORY_NAMES = {
  "phi-kim": "Phi kim",
  "khi-hiem": "Khí hiếm",
  kiem: "Kim loại kiềm",
  "kiem-tho": "Kim loại kiềm thổ",
  "a-kim": "Á kim",
  halogen: "Halogen",
  "chuyen-tiep": "Kim loại chuyển tiếp",
  lanthanide: "Lanthanide",
  actinide: "Actinide",
  unknown: "Chưa phân loại",
};

const CATEGORY_COLORS = {
  "phi-kim": "#22c55e",
  "khi-hiem": "#a855f7",
  kiem: "#f97316",
  "kiem-tho": "#eab308",
  "a-kim": "#06b6d4",
  halogen: "#14b8a6",
  "chuyen-tiep": "#ef4444",
  lanthanide: "#ec4899",
  actinide: "#d946ef",
  unknown: "#475569",
};

export class VisualDocEditor {
  constructor(containerId, wysiwygToolbar) {
    this.container = document.getElementById(containerId);
    this.toolbar = wysiwygToolbar;
    this.currentSymbol = null;
  }

  render(symbol) {
    if (!this.container) return;
    this.currentSymbol = symbol;
    this.container.innerHTML = "";

    if (!symbol) {
      this.container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400">
          <i class="fa-solid fa-atom text-5xl mb-3 text-slate-500 animate-pulse"></i>
          <p class="font-bold text-lg text-slate-200">Chọn một nguyên tố từ Bảng Tuần Hoàn</p>
          <p class="text-xs text-slate-400 mt-1 max-w-sm">
            Nhấp vào ô nguyên tố ở cột bên trái để mở trình soạn thảo trực quan.
          </p>
        </div>
      `;
      return;
    }

    const data = state.getWorkingCopy(symbol);
    if (!data) {
      this.container.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-blue-400"></i>
          <p class="text-sm">Đang tải tài liệu ${escapeHtml(symbol)}...</p>
        </div>
      `;
      return;
    }

    // Main Document Canvas
    const canvas = document.createElement("div");
    const isExpanded = document.body.classList.contains("is-fullwidth-active");
    canvas.className = `doc-canvas-container space-y-8 ${isExpanded ? "is-expanded-canvas" : ""}`;

    // Check & display local draft recovery banner
    draftManager.checkAndRenderRecoveryBanner(
      symbol,
      canvas,
      () => this.render(symbol),
      () => {}
    );

    // 0. Hero Document Header (Chuẩn ChemDex)
    canvas.appendChild(this.buildHeroSection(data, symbol));

    // 1. Thông tin chung
    canvas.appendChild(this.buildGeneralSection(data, symbol));

    // 2. Lịch sử khám phá
    canvas.appendChild(this.buildHistorySection(data, symbol));

    // 3. Cấu tạo (a. Hạt nhân & vỏ, b. Trạng thái tự nhiên, c. Đồng vị)
    canvas.appendChild(this.buildStructureAndOccurrenceSection(data, symbol));

    // 4. Tính chất (Tính chất vật lý | Tính chất hóa học 2 cột song song)
    canvas.appendChild(this.buildPropertiesSection(data, symbol));

    // 5. Điều chế
    canvas.appendChild(this.buildPreparationSection(data, symbol));

    // 6. Nhận biết
    canvas.appendChild(this.buildRecognitionSection(data, symbol));

    // 7. Phương trình phản ứng
    canvas.appendChild(this.buildReactionsSection(data, symbol));

    // 8. Ứng dụng thực tế
    canvas.appendChild(this.buildApplicationsSection(data, symbol));

    // 9. Tổng quan & Ghi chú
    canvas.appendChild(this.buildOverviewSection(data, symbol));

    // 10. Menu thêm nhanh
    canvas.appendChild(this.buildQuickAddMenu(data, symbol));

    this.container.appendChild(canvas);

    // Setup active editor focus hooks for wysiwyg toolbar
    this.container.querySelectorAll(".rich-text-area").forEach((el) => {
      el.addEventListener("focus", () => {
        if (this.toolbar) this.toolbar.setActiveEditor(el);
      });
    });
  }

  // Helper to update working copy
  updateDataField(path, value) {
    if (!this.currentSymbol) return;
    state.updateWorkingCopy(this.currentSymbol, (obj) => {
      let target = obj;
      for (let i = 0; i < path.length - 1; i++) {
        const seg = path[i];
        if (!target[seg] || typeof target[seg] !== "object") {
          target[seg] = {};
        }
        target = target[seg];
      }
      target[path[path.length - 1]] = value;
    });
  }

  safeNumber(val, isFloat = false) {
    if (val === "" || val == null) return null;
    const str = String(val).trim().replace(",", ".");
    const num = isFloat ? parseFloat(str) : parseInt(str, 10);
    return isNaN(num) ? null : num;
  }

  // --- SECTION BUILDERS CHUẨN CHEMDEX ---

  // 0. Hero Header
  buildHeroSection(data, symbol) {
    const hero = document.createElement("div");
    hero.className = "relative rounded-3xl p-6 md:p-8 overflow-hidden bg-gradient-to-b from-[#181B1F] to-[#111315] border border-white/10 shadow-xl";

    const nameVi = data.nameVi || "";
    const nameEn = data.nameEn || data.general?.englishName || "";
    const mass = data.mass != null ? data.mass : "";
    const cat = data.category || "unknown";
    const catColor = CATEGORY_COLORS[cat] || "#475569";
    const catName = CATEGORY_NAMES[cat] || "CHƯA XÁC ĐỊNH";

    hero.innerHTML = `
      <div class="absolute top-0 right-10 w-80 h-80 rounded-full blur-[100px] opacity-15 pointer-events-none" style="background-color: ${catColor};"></div>
      
      <div class="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6">
        <!-- Square Element Badge -->
        <div class="w-32 h-32 md:w-36 md:h-36 rounded-3xl flex flex-col items-center justify-center shadow-2xl border-2 bg-[#111315]/90 backdrop-blur shrink-0" style="border-color: ${catColor};">
          <input
            type="number"
            id="hero-number"
            value="${data.number || ""}"
            placeholder="Z"
            class="text-xs text-slate-400 font-bold mb-0.5 text-center bg-transparent focus:outline-none w-12"
            title="Số hiệu nguyên tử (Z)"
          />
          <span class="text-5xl font-black font-mono text-white leading-none tracking-tight">${escapeHtml(symbol)}</span>
          <span class="text-[10px] text-slate-500 font-mono mt-1">${escapeHtml(data.general?.block || "s").toUpperCase()} block</span>
        </div>

        <!-- Info & Names -->
        <div class="flex-1 text-center md:text-left space-y-2 w-full">
          <div class="flex items-center justify-center md:justify-start gap-2 flex-wrap">
            <span class="px-3 py-1 rounded-full text-xs font-bold border inline-block uppercase tracking-wider" style="color: ${catColor}; border-color: ${catColor}; background: rgba(0,0,0,0.3);">
              ${escapeHtml(catName)}
            </span>
          </div>

          <div>
            <input
              type="text"
              id="hero-name-vi"
              value="${escapeHtml(nameVi)}"
              placeholder="Tên tiếng Việt (vd: Hydrogen, Oxy)..."
              class="text-3xl md:text-5xl font-black bg-transparent text-white border-b border-dashed border-white/20 focus:border-sky-400 focus:outline-none w-full max-w-md transition-colors"
              title="Nhấp để sửa tên nguyên tố tiếng Việt"
            />
          </div>

          <div class="flex items-center justify-center md:justify-start gap-3 text-slate-300 text-sm md:text-base flex-wrap">
            <input
              type="text"
              id="hero-name-en"
              value="${escapeHtml(nameEn)}"
              placeholder="English name..."
              class="bg-transparent text-slate-300 font-medium border-b border-white/10 focus:border-sky-400 focus:outline-none w-36 transition-colors"
            />
            <span class="text-slate-500">•</span>
            <div class="flex items-center gap-1">
              <input
                type="text"
                id="hero-mass"
                value="${mass}"
                placeholder="Khối lượng..."
                class="bg-transparent text-cyan-300 font-mono font-bold border-b border-white/10 focus:border-sky-400 focus:outline-none w-24 transition-colors"
              />
              <span class="text-xs text-slate-400">g/mol</span>
            </div>
          </div>
        </div>
      </div>
    `;

    hero.querySelector("#hero-number").oninput = (e) => {
      const v = this.safeNumber(e.target.value);
      this.updateDataField(["number"], v);
    };
    hero.querySelector("#hero-name-vi").oninput = (e) => {
      this.updateDataField(["nameVi"], e.target.value);
    };
    hero.querySelector("#hero-name-en").oninput = (e) => {
      this.updateDataField(["nameEn"], e.target.value);
      this.updateDataField(["general", "englishName"], e.target.value);
    };
    hero.querySelector("#hero-mass").oninput = (e) => {
      const v = this.safeNumber(e.target.value, true);
      this.updateDataField(["mass"], v);
    };

    return hero;
  }

  // 1. Thông tin chung
  buildGeneralSection(data, symbol) {
    const section = document.createElement("section");
    section.className = "doc-section scroll-mt-24";

    const g = data.general || {};

    section.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
        <h3 class="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          <span class="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm shadow-sm">
            <i class="fa-solid fa-info"></i>
          </span>
          <span>1. Thông tin chung</span>
        </h3>
        <span class="text-xs text-slate-400 font-mono">General Information</span>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
        <div class="de-glass-card p-4 rounded-xl border border-white/5 space-y-1">
          <p class="text-slate-400 text-xs">Tên Latin</p>
          <input type="text" class="field-chip-input gen-input text-base font-mono text-yellow-300 font-bold" data-key="latinName" value="${escapeHtml(g.latinName || "")}" placeholder="Hydrogenium..." />
        </div>

        <div class="de-glass-card p-4 rounded-xl border border-white/5 space-y-1">
          <p class="text-slate-400 text-xs">Tên Tiếng Anh</p>
          <input type="text" class="field-chip-input gen-input text-base font-mono text-emerald-300 font-bold" data-key="englishName" value="${escapeHtml(g.englishName || data.nameEn || "")}" placeholder="Hydrogen..." />
        </div>

        <div class="de-glass-card p-4 rounded-xl border border-white/5 space-y-1">
          <p class="text-slate-400 text-xs">Đồng vị</p>
          <input type="text" class="field-chip-input gen-input text-base font-mono text-blue-300 font-bold" data-key="isotope" value="${escapeHtml(g.isotope || "")}" placeholder="¹H, ²H, ³H..." />
        </div>

        <div class="de-glass-card p-4 rounded-xl border border-white/5 space-y-1">
          <p class="text-slate-400 text-xs">Vị trí trong BTH</p>
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <span class="text-[10px] text-slate-500">Nhóm:</span>
              <input type="number" class="field-chip-input gen-input font-bold" data-key="group" value="${g.group != null ? g.group : ""}" placeholder="1" min="1" max="18" />
            </div>
            <div class="flex-1">
              <span class="text-[10px] text-slate-500">Chu kì:</span>
              <input type="number" class="field-chip-input gen-input font-bold" data-key="period" value="${g.period != null ? g.period : ""}" placeholder="1" min="1" max="7" />
            </div>
          </div>
        </div>

        <div class="de-glass-card p-4 rounded-xl border border-white/5 space-y-1">
          <p class="text-slate-400 text-xs">Số Oxy hóa</p>
          <input type="text" class="field-chip-input gen-input text-base font-mono text-white font-bold" data-key="oxidation" value="${escapeHtml(g.oxidation || "")}" placeholder="+1, -1..." />
        </div>

        <div class="de-glass-card p-4 rounded-xl border border-white/5 space-y-1">
          <p class="text-slate-400 text-xs">Độ âm điện (Pauling)</p>
          <input type="text" class="field-chip-input gen-input text-base font-mono text-white font-bold" data-key="electronegativity" value="${g.electronegativity != null ? g.electronegativity : ""}" placeholder="2.20..." />
        </div>

        <div class="de-glass-card p-4 rounded-xl border border-white/5 space-y-1">
          <p class="text-slate-400 text-xs">Cấu hình electron</p>
          <input type="text" class="field-chip-input gen-input font-mono text-cyan-300 font-bold" data-key="electronConfig" value="${escapeHtml(g.electronConfig || "")}" placeholder="1s¹..." />
        </div>

        <div class="de-glass-card p-4 rounded-xl border border-white/5 space-y-1">
          <p class="text-slate-400 text-xs">Trạng thái (ở 20°C)</p>
          <input type="text" class="field-chip-input gen-input text-slate-200" data-key="state" value="${escapeHtml(g.state || "")}" placeholder="Khí, Lỏng, Rắn..." />
        </div>

        <div class="de-glass-card p-4 rounded-xl border border-white/5 space-y-1">
          <p class="text-slate-400 text-xs">Khối lượng riêng</p>
          <input type="text" class="field-chip-input gen-input text-slate-200" data-key="density" value="${escapeHtml(g.density || "")}" placeholder="0.08988 g/L..." />
        </div>

        <div class="de-glass-card p-4 rounded-xl border border-white/5 space-y-1">
          <p class="text-slate-400 text-xs">Nhiệt độ nóng chảy</p>
          <input type="text" class="field-chip-input gen-input text-slate-200" data-key="meltingPoint" value="${escapeHtml(g.meltingPoint || "")}" placeholder="-259.16 °C..." />
        </div>

        <div class="de-glass-card p-4 rounded-xl border border-white/5 space-y-1">
          <p class="text-slate-400 text-xs">Nhiệt độ sôi</p>
          <input type="text" class="field-chip-input gen-input text-slate-200" data-key="boilingPoint" value="${escapeHtml(g.boilingPoint || "")}" placeholder="-252.87 °C..." />
        </div>

        <div class="de-glass-card p-4 rounded-xl border border-white/5 space-y-1">
          <p class="text-slate-400 text-xs">Phân lớp (Block)</p>
          <input type="text" class="field-chip-input gen-input font-mono uppercase text-slate-200" data-key="block" value="${escapeHtml(g.block || "")}" placeholder="s, p, d, f..." />
        </div>
      </div>
    `;

    section.querySelectorAll(".gen-input").forEach((input) => {
      input.oninput = (e) => {
        const key = input.dataset.key;
        let val = e.target.value;
        if (key === "electronegativity" || key === "period" || key === "group") {
          val = this.safeNumber(val, key === "electronegativity");
        }
        this.updateDataField(["general", key], val);
      };
    });

    return section;
  }

  // 2. Lịch sử khám phá
  buildHistorySection(data, symbol) {
    const section = document.createElement("section");
    section.className = "doc-section scroll-mt-24";

    const h = data.history || {};

    section.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
        <h3 class="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          <span class="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm shadow-sm">
            <i class="fa-solid fa-landmark"></i>
          </span>
          <span>2. Lịch sử khám phá</span>
        </h3>
        <span class="text-xs text-slate-400 font-mono">History of Discovery</span>
      </div>

      <div class="de-glass p-6 rounded-2xl border border-white/10 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label class="block text-slate-400 text-xs mb-1">Phát hiện bởi</label>
            <input type="text" id="hist-discoverer" class="field-chip-input font-bold text-white" value="${escapeHtml(h.discoverer || "")}" placeholder="Henry Cavendish..." />
          </div>
          <div>
            <label class="block text-slate-400 text-xs mb-1">Năm công bố</label>
            <input type="text" id="hist-year" class="field-chip-input font-mono text-amber-300 font-bold" value="${escapeHtml(String(h.year || ""))}" placeholder="1766..." />
          </div>
          <div>
            <label class="block text-slate-400 text-xs mb-1">Nơi khám phá</label>
            <input type="text" id="hist-location" class="field-chip-input font-bold text-white" value="${escapeHtml(h.discoveryLocation || "")}" placeholder="Anh quốc..." />
          </div>
        </div>

        <div>
          <label class="block text-slate-400 text-xs mb-1.5 flex items-center justify-between">
            <span>Mô tả câu chuyện lịch sử</span>
            <span class="text-[10px] text-sky-400 font-normal"><i class="fa-solid fa-pen-nib"></i> Nhấp để sửa trực tiếp</span>
          </label>
          <div
            id="hist-desc"
            class="rich-text-area"
            contenteditable="true"
            placeholder="Mô tả bối cảnh lịch sử, quá trình phát hiện, nguồn gốc tên gọi..."
          >${h.description || ""}</div>
        </div>
      </div>
    `;

    section.querySelector("#hist-discoverer").oninput = (e) => {
      this.updateDataField(["history", "discoverer"], e.target.value);
    };
    section.querySelector("#hist-year").oninput = (e) => {
      const v = this.safeNumber(e.target.value);
      this.updateDataField(["history", "year"], v != null ? v : e.target.value);
    };
    section.querySelector("#hist-location").oninput = (e) => {
      this.updateDataField(["history", "discoveryLocation"], e.target.value);
    };
    section.querySelector("#hist-desc").oninput = (e) => {
      this.updateDataField(["history", "description"], e.target.innerHTML);
    };

    return section;
  }

  // 3. Cấu tạo (a. Cấu tạo, b. Trạng thái tự nhiên, c. Đồng vị)
  buildStructureAndOccurrenceSection(data, symbol) {
    const section = document.createElement("section");
    section.className = "doc-section scroll-mt-24";

    const s = data.structure || {};
    const occ = data.occurrence || {};
    const shells = Array.isArray(s.electronShells) ? s.electronShells.join(", ") : "";

    section.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
        <h3 class="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          <span class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm shadow-sm">
            <i class="fa-solid fa-cubes"></i>
          </span>
          <span>3. Cấu tạo</span>
        </h3>
        <span class="text-xs text-slate-400 font-mono">Structure & Occurrence</span>
      </div>

      <div class="flex flex-col gap-6">
        <!-- a. Cấu tạo hạt nhân & electron -->
        <div class="de-glass p-5 rounded-2xl border border-white/10 space-y-4">
          <h4 class="text-white font-bold text-sm text-emerald-300 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> a. Cấu tạo nguyên tử
          </h4>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div class="de-glass-card p-3 rounded-xl border border-white/5">
              <p class="text-slate-400 mb-1">Số hiệu nguyên tử (Z)</p>
              <input type="number" id="struct-protons-z" class="field-chip-input font-bold text-white text-base" value="${data.number || ""}" placeholder="1" />
            </div>
            <div class="de-glass-card p-3 rounded-xl border border-white/5">
              <p class="text-slate-400 mb-1">Nguyên tử khối</p>
              <input type="text" id="struct-mass" class="field-chip-input font-bold text-cyan-300 text-base font-mono" value="${data.mass != null ? data.mass : ""}" placeholder="1.008" />
            </div>
            <div class="de-glass-card p-3 rounded-xl border border-white/5">
              <p class="text-slate-400 mb-1">Vỏ nguyên tử (electron)</p>
              <input type="number" id="struct-electrons" class="field-chip-input font-bold text-white text-base" value="${s.electrons != null ? s.electrons : ""}" placeholder="1" />
            </div>
            <div class="de-glass-card p-3 rounded-xl border border-white/5">
              <p class="text-slate-400 mb-1">Hạt nhân (Proton / Neutron)</p>
              <div class="flex items-center gap-2">
                <input type="number" id="struct-protons" class="field-chip-input text-xs" value="${s.protons != null ? s.protons : ""}" placeholder="p" title="Proton" />
                <span class="text-slate-500">/</span>
                <input type="number" id="struct-neutrons" class="field-chip-input text-xs" value="${s.neutrons != null ? s.neutrons : ""}" placeholder="n" title="Neutron" />
              </div>
            </div>
            <div class="de-glass-card p-3 rounded-xl border border-white/5">
              <p class="text-slate-400 mb-1">Lớp electron (phân bố)</p>
              <input type="text" id="struct-shells" class="field-chip-input font-mono text-xs text-blue-300 font-bold" value="${escapeHtml(shells)}" placeholder="2, 8, 1..." />
            </div>
            <div class="de-glass-card p-3 rounded-xl border border-white/5">
              <p class="text-slate-400 mb-1">Loại mạng tinh thể</p>
              <input type="text" id="struct-lattice" class="field-chip-input text-xs text-white" value="${escapeHtml(s.lattice || "")}" placeholder="BCC, FCC, HCP, kim cương..." />
            </div>
          </div>
        </div>

        <!-- b. Trạng thái tự nhiên -->
        <div class="de-glass p-5 rounded-2xl border border-white/10 space-y-4">
          <h4 class="text-white font-bold text-sm text-sky-300 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-sky-400"></span> b. Trạng thái tự nhiên
          </h4>

          <div class="space-y-3 text-xs">
            <div>
              <label class="block text-slate-400 mb-1">Mô tả phân bố tự nhiên</label>
              <div
                id="occ-desc"
                class="rich-text-area"
                contenteditable="true"
                placeholder="Mô tả sự tồn tại trong tự nhiên, vỏ Trái Đất, khí quyển..."
              >${occ.description || ""}</div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-emerald-400 font-bold mb-1">Dạng đơn chất</label>
                <input type="text" id="occ-simple" class="field-chip-input font-mono text-emerald-300" value="${escapeHtml(Array.isArray(occ.simple) ? occ.simple.join(", ") : "")}" placeholder="H₂..." />
              </div>
              <div>
                <label class="block text-sky-400 font-bold mb-1">Hợp chất</label>
                <input type="text" id="occ-compounds" class="field-chip-input font-mono text-sky-300" value="${escapeHtml(Array.isArray(occ.compounds) ? occ.compounds.join(", ") : "")}" placeholder="H₂O, HCl, H₂SO₄..." />
              </div>
              <div>
                <label class="block text-amber-400 font-bold mb-1">Quặng & Nguồn khoáng</label>
                <input type="text" id="occ-ores" class="field-chip-input text-amber-300" value="${escapeHtml(Array.isArray(occ.ores) ? occ.ores.join(", ") : "")}" placeholder="Nước biển, dầu mỏ..." />
              </div>
            </div>
          </div>
        </div>

        <!-- c. Đồng vị -->
        <div class="de-glass p-5 rounded-2xl border border-white/10 space-y-2">
          <h4 class="text-white font-bold text-sm text-blue-300 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-400"></span> c. Đồng vị
          </h4>
          <input
            type="text"
            id="iso-input"
            class="field-chip-input font-mono text-sm text-blue-200"
            value="${escapeHtml(data.general?.isotope || "")}"
            placeholder="¹H (99.98%), ²H (Deuteri 0.02%), ³H (Triti - phóng xạ)..."
          />
        </div>
      </div>
    `;

    section.querySelector("#struct-protons").oninput = (e) => {
      this.updateDataField(["structure", "protons"], this.safeNumber(e.target.value));
    };
    section.querySelector("#struct-neutrons").oninput = (e) => {
      this.updateDataField(["structure", "neutrons"], this.safeNumber(e.target.value));
    };
    section.querySelector("#struct-electrons").oninput = (e) => {
      this.updateDataField(["structure", "electrons"], this.safeNumber(e.target.value));
    };
    section.querySelector("#struct-shells").oninput = (e) => {
      const arr = e.target.value.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      this.updateDataField(["structure", "electronShells"], arr);
    };
    section.querySelector("#struct-lattice").oninput = (e) => {
      this.updateDataField(["structure", "lattice"], e.target.value);
    };
    section.querySelector("#occ-desc").oninput = (e) => {
      this.updateDataField(["occurrence", "description"], e.target.innerHTML);
    };
    section.querySelector("#occ-simple").oninput = (e) => {
      const arr = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
      this.updateDataField(["occurrence", "simple"], arr);
    };
    section.querySelector("#occ-compounds").oninput = (e) => {
      const arr = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
      this.updateDataField(["occurrence", "compounds"], arr);
    };
    section.querySelector("#occ-ores").oninput = (e) => {
      const arr = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
      this.updateDataField(["occurrence", "ores"], arr);
    };
    section.querySelector("#iso-input").oninput = (e) => {
      this.updateDataField(["general", "isotope"], e.target.value);
    };

    return section;
  }

  // 4. Tính chất (Tính chất vật lý | Tính chất hóa học song song chuẩn ChemDex)
  buildPropertiesSection(data, symbol) {
    const section = document.createElement("section");
    section.className = "doc-section scroll-mt-24";

    section.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
        <h3 class="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          <span class="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm shadow-sm">
            <i class="fa-solid fa-flask"></i>
          </span>
          <span>4. Tính chất</span>
        </h3>
        <span class="text-xs text-slate-400 font-mono">Properties</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Physical Properties -->
        <div class="de-glass p-6 rounded-2xl border border-white/10 space-y-3">
          <h4 class="text-lg font-bold text-white border-l-4 border-cyan-500 pl-3 flex items-center justify-between">
            <span>Tính chất vật lý</span>
            <span class="text-xs text-cyan-400 font-normal"><i class="fa-solid fa-temperature-half"></i> Physical</span>
          </h4>
          <div
            id="prop-physical"
            class="rich-text-area"
            contenteditable="true"
            placeholder="Nhập mô tả trạng thái, màu sắc, cấu trúc tinh thể, từ tính, độ dẫn điện, khối lượng..."
          >${data.physical || ""}</div>
        </div>

        <!-- Chemical Properties -->
        <div class="de-glass p-6 rounded-2xl border border-white/10 space-y-3">
          <h4 class="text-lg font-bold text-white border-l-4 border-red-500 pl-3 flex items-center justify-between">
            <span>Tính chất hóa học</span>
            <span class="text-xs text-rose-400 font-normal"><i class="fa-solid fa-flask-vial"></i> Chemical</span>
          </h4>
          <div
            id="prop-chemical"
            class="rich-text-area"
            contenteditable="true"
            placeholder="Nhập mô tả tính chất hóa học đặc trưng, tính khử, tính oxy hóa, mức độ hoạt động..."
          >${data.chemical || ""}</div>
        </div>
      </div>
    `;

    section.querySelector("#prop-physical").oninput = (e) => {
      this.updateDataField(["physical"], e.target.innerHTML);
    };
    section.querySelector("#prop-chemical").oninput = (e) => {
      this.updateDataField(["chemical"], e.target.innerHTML);
    };

    return section;
  }

  // 5. Điều chế
  buildPreparationSection(data, symbol) {
    const section = document.createElement("section");
    section.className = "doc-section scroll-mt-24";

    const prep = data.preparations || {};

    section.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
        <h3 class="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          <span class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm shadow-sm">
            <i class="fa-solid fa-vial-circle-check"></i>
          </span>
          <span>5. Điều chế</span>
        </h3>
        <span class="text-xs text-slate-400 font-mono">Preparation & Manufacture</span>
      </div>

      <div class="de-glass p-6 rounded-2xl border border-white/10 space-y-3">
        <div
          id="prep-desc"
          class="rich-text-area"
          contenteditable="true"
          placeholder="Mô tả phương pháp điều chế trong phòng thí nghiệm và quy trình sản xuất công nghiệp..."
        >${prep.description || ""}</div>
      </div>
    `;

    section.querySelector("#prep-desc").oninput = (e) => {
      this.updateDataField(["preparations", "description"], e.target.innerHTML);
    };

    return section;
  }

  // 6. Nhận biết
  buildRecognitionSection(data, symbol) {
    const section = document.createElement("section");
    section.className = "doc-section scroll-mt-24";

    const recognition = Array.isArray(data.recognition) ? data.recognition.join("\n") : "";

    section.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
        <h3 class="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          <span class="w-8 h-8 rounded-xl bg-lime-500/20 text-lime-400 flex items-center justify-center text-sm shadow-sm">
            <i class="fa-solid fa-magnifying-glass-chart"></i>
          </span>
          <span>6. Nhận biết</span>
        </h3>
        <span class="text-xs text-slate-400 font-mono">Recognition Signs</span>
      </div>

      <div class="de-glass p-6 rounded-2xl border border-white/10 space-y-2">
        <label class="block text-slate-400 text-xs mb-1">Các dấu hiệu nhận biết đặc trưng (mỗi dòng một dấu hiệu)</label>
        <textarea
          id="recog-input"
          class="tree-textarea-string text-xs"
          rows="3"
          placeholder="Đốt cháy khí phát ra tiếng nổ nhỏ kèm ngọn lửa màu xanh nhạt..."
        >${escapeHtml(recognition)}</textarea>
      </div>
    `;

    section.querySelector("#recog-input").oninput = (e) => {
      const lines = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
      this.updateDataField(["recognition"], lines);
    };

    return section;
  }

  // 7. Phương trình phản ứng
  buildReactionsSection(data, symbol) {
    const section = document.createElement("section");
    section.className = "doc-section scroll-mt-24";

    const reactions = Array.isArray(data.reactions) ? data.reactions : [];

    section.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
        <h3 class="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          <span class="w-8 h-8 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center text-sm shadow-sm">
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
          </span>
          <span>7. Phương trình (${reactions.length})</span>
        </h3>
        <button id="add-reaction-btn" class="tree-btn bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-500/30 text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
          <i class="fa-solid fa-plus text-xs"></i> Thêm phương trình
        </button>
      </div>

      <div id="reactions-list-container" class="space-y-4"></div>
    `;

    const listContainer = section.querySelector("#reactions-list-container");

    reactions.forEach((rxn, index) => {
      const card = document.createElement("div");
      card.className = "reaction-card p-5 rounded-2xl bg-[#181B1F] border border-white/10 shadow-lg space-y-3";
      card.innerHTML = `
        <div class="flex items-center justify-between pb-2 border-b border-white/5 text-xs">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-fuchsia-500/20 text-fuchsia-400 font-bold flex items-center justify-center text-xs border border-fuchsia-500/30 font-mono">
              ${index + 1}
            </span>
            <input
              type="text"
              class="rxn-type bg-transparent text-fuchsia-300 font-bold focus:border-b focus:border-fuchsia-400 focus:outline-none w-48 sm:w-72"
              value="${escapeHtml(rxn.type || "Phản ứng mới")}"
              placeholder="Loại phản ứng (vd: Tác dụng với Oxygen)..."
            />
          </div>
          <!-- Block Reorder Actions -->
          <div class="flex items-center gap-1">
            <button class="tree-btn move-up-btn" title="Lên" ${index === 0 ? "disabled style='opacity:0.3;'" : ""}><i class="fa-solid fa-arrow-up text-[10px]"></i></button>
            <button class="tree-btn move-down-btn" title="Xuống" ${index === reactions.length - 1 ? "disabled style='opacity:0.3;'" : ""}><i class="fa-solid fa-arrow-down text-[10px]"></i></button>
            <button class="tree-btn duplicate-btn text-cyan-400" title="Nhân bản"><i class="fa-solid fa-clone text-[10px]"></i></button>
            <button class="tree-btn btn-danger delete-btn" title="Xóa"><i class="fa-solid fa-trash text-[10px]"></i></button>
          </div>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-400 font-semibold mb-1">Phương trình hóa học</label>
            <input
              type="text"
              class="field-chip-input font-mono text-emerald-300 font-bold rxn-eq text-sm md:text-base py-2.5"
              value="${escapeHtml(rxn.equation || "")}"
              placeholder="Ví dụ: 2H₂ + O₂ → 2H₂O..."
            />
          </div>
          <div>
            <label class="block text-slate-400 font-semibold mb-1">Mô tả hiện tượng & điều kiện</label>
            <textarea
              class="tree-textarea-string rxn-desc text-xs"
              placeholder="Nhiệt độ (t°), chất xúc tác, màu sắc, khí thoát ra, kết tủa..."
            >${escapeHtml(rxn.desc || "")}</textarea>
          </div>
        </div>
      `;

      card.querySelector(".rxn-type").oninput = (e) => {
        rxn.type = e.target.value;
        this.updateDataField(["reactions"], reactions);
      };
      card.querySelector(".rxn-eq").oninput = (e) => {
        rxn.equation = e.target.value;
        this.updateDataField(["reactions"], reactions);
      };
      card.querySelector(".rxn-desc").oninput = (e) => {
        rxn.desc = e.target.value;
        this.updateDataField(["reactions"], reactions);
      };

      if (index > 0) {
        card.querySelector(".move-up-btn").onclick = () => {
          const temp = reactions[index];
          reactions[index] = reactions[index - 1];
          reactions[index - 1] = temp;
          this.updateDataField(["reactions"], reactions);
          this.render(symbol);
        };
      }
      if (index < reactions.length - 1) {
        card.querySelector(".move-down-btn").onclick = () => {
          const temp = reactions[index];
          reactions[index] = reactions[index + 1];
          reactions[index + 1] = temp;
          this.updateDataField(["reactions"], reactions);
          this.render(symbol);
        };
      }
      card.querySelector(".duplicate-btn").onclick = () => {
        reactions.splice(index + 1, 0, deepClone(rxn));
        this.updateDataField(["reactions"], reactions);
        this.render(symbol);
      };
      card.querySelector(".delete-btn").onclick = () => {
        showConfirmModal({
          title: "Xóa phương trình phản ứng",
          message: `Xóa phương trình "${rxn.type || `số ${index + 1}`}"?`,
          confirmText: "Xóa",
          isDanger: true,
          onConfirm: () => {
            reactions.splice(index, 1);
            this.updateDataField(["reactions"], reactions);
            this.render(symbol);
          },
        });
      };

      listContainer.appendChild(card);
    });

    if (reactions.length === 0) {
      listContainer.innerHTML = `
        <div class="p-8 text-center text-slate-400 bg-[#14171A] rounded-2xl border border-dashed border-white/10">
          <i class="fa-solid fa-arrow-right-arrow-left text-2xl mb-1 text-slate-500"></i>
          <p class="text-xs font-semibold text-slate-300">Chưa có phương trình phản ứng nào.</p>
        </div>
      `;
    }

    section.querySelector("#add-reaction-btn").onclick = () => {
      reactions.push({ type: "Phản ứng mới", equation: "", desc: "" });
      this.updateDataField(["reactions"], reactions);
      this.render(symbol);
    };

    return section;
  }

  // 8. Ứng dụng thực tế
  buildApplicationsSection(data, symbol) {
    const section = document.createElement("section");
    section.className = "doc-section scroll-mt-24";

    const apps = Array.isArray(data.applications) ? data.applications : [];

    section.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
        <h3 class="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          <span class="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center text-sm shadow-sm">
            <i class="fa-solid fa-rocket"></i>
          </span>
          <span>8. Ứng dụng thực tế (${apps.length})</span>
        </h3>
        <button id="add-app-btn" class="tree-btn bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
          <i class="fa-solid fa-plus text-xs"></i> Thêm ứng dụng
        </button>
      </div>

      <div id="apps-list-container" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    `;

    const listContainer = section.querySelector("#apps-list-container");

    apps.forEach((app, index) => {
      const card = document.createElement("div");
      card.className = "application-card p-5 rounded-2xl bg-[#181B1F] border border-white/10 shadow-lg space-y-3 flex flex-col justify-between";
      card.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-white/5 text-xs">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center text-xs border border-pink-500/30 font-mono">
                ${index + 1}
              </span>
              <input
                type="text"
                class="app-title bg-transparent text-pink-300 font-bold text-sm focus:border-b focus:border-pink-400 focus:outline-none w-48"
                value="${escapeHtml(app.title || "Ứng dụng mới")}"
                placeholder="Tên ứng dụng..."
              />
            </div>
            <!-- Actions -->
            <div class="flex items-center gap-1">
              <button class="tree-btn move-up-btn" title="Lên" ${index === 0 ? "disabled style='opacity:0.3;'" : ""}><i class="fa-solid fa-arrow-up text-[10px]"></i></button>
              <button class="tree-btn move-down-btn" title="Xuống" ${index === apps.length - 1 ? "disabled style='opacity:0.3;'" : ""}><i class="fa-solid fa-arrow-down text-[10px]"></i></button>
              <button class="tree-btn duplicate-btn text-cyan-400" title="Nhân bản"><i class="fa-solid fa-clone text-[10px]"></i></button>
              <button class="tree-btn btn-danger delete-btn" title="Xóa"><i class="fa-solid fa-trash text-[10px]"></i></button>
            </div>
          </div>
          <div>
            <textarea
              class="tree-textarea-string app-desc text-xs"
              placeholder="Chi tiết về cách ứng dụng trong thực tế, công nghiệp, y học, đời sống..."
            >${escapeHtml(app.desc || "")}</textarea>
          </div>
        </div>
      `;

      card.querySelector(".app-title").oninput = (e) => {
        app.title = e.target.value;
        this.updateDataField(["applications"], apps);
      };
      card.querySelector(".app-desc").oninput = (e) => {
        app.desc = e.target.value;
        this.updateDataField(["applications"], apps);
      };

      if (index > 0) {
        card.querySelector(".move-up-btn").onclick = () => {
          const temp = apps[index];
          apps[index] = apps[index - 1];
          apps[index - 1] = temp;
          this.updateDataField(["applications"], apps);
          this.render(symbol);
        };
      }
      if (index < apps.length - 1) {
        card.querySelector(".move-down-btn").onclick = () => {
          const temp = apps[index];
          apps[index] = apps[index + 1];
          apps[index + 1] = temp;
          this.updateDataField(["applications"], apps);
          this.render(symbol);
        };
      }
      card.querySelector(".duplicate-btn").onclick = () => {
        apps.splice(index + 1, 0, deepClone(app));
        this.updateDataField(["applications"], apps);
        this.render(symbol);
      };
      card.querySelector(".delete-btn").onclick = () => {
        showConfirmModal({
          title: "Xóa ứng dụng",
          message: `Xóa ứng dụng "${app.title || `số ${index + 1}`}"?`,
          confirmText: "Xóa",
          isDanger: true,
          onConfirm: () => {
            apps.splice(index, 1);
            this.updateDataField(["applications"], apps);
            this.render(symbol);
          },
        });
      };

      listContainer.appendChild(card);
    });

    if (apps.length === 0) {
      listContainer.innerHTML = `
        <div class="p-8 text-center text-slate-400 bg-[#14171A] rounded-2xl border border-dashed border-white/10 col-span-2">
          <i class="fa-solid fa-rocket text-2xl mb-1 text-slate-500"></i>
          <p class="text-xs font-semibold text-slate-300">Chưa có ứng dụng nào.</p>
        </div>
      `;
    }

    section.querySelector("#add-app-btn").onclick = () => {
      apps.push({ title: "Ứng dụng mới", desc: "" });
      this.updateDataField(["applications"], apps);
      this.render(symbol);
    };

    return section;
  }

  // 9. Tổng quan & Ghi chú
  buildOverviewSection(data, symbol) {
    const section = document.createElement("section");
    section.className = "doc-section scroll-mt-24";

    section.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
        <h3 class="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          <span class="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm shadow-sm">
            <i class="fa-solid fa-book"></i>
          </span>
          <span>9. Tổng quan</span>
        </h3>
        <span class="text-xs text-slate-400 font-mono">Overview & Notes</span>
      </div>

      <div class="de-glass p-6 rounded-2xl border border-white/10 space-y-3">
        <div
          id="overview-notes"
          class="rich-text-area"
          contenteditable="true"
          placeholder="Nhập phần kiến thức tổng quan, lưu ý thêm về nguyên tố hóa học này..."
        >${data.notes || ""}</div>
      </div>
    `;

    section.querySelector("#overview-notes").oninput = (e) => {
      this.updateDataField(["notes"], e.target.innerHTML);
    };

    return section;
  }

  // Quick Add Menu at bottom
  buildQuickAddMenu(data, symbol) {
    const wrap = document.createElement("div");
    wrap.className = "pt-6 pb-12 text-center border-t border-white/10";
    wrap.innerHTML = `
      <div class="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-[#14171A] border border-white/10 shadow-lg flex-wrap justify-center">
        <span class="text-xs font-semibold text-slate-400 px-3 flex items-center gap-1.5">
          <i class="fa-solid fa-plus text-sky-400"></i> Thao tác nhanh:
        </span>
        <button type="button" id="quick-add-rxn" class="tree-btn bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-300 text-xs py-1.5 px-3 rounded-xl border border-fuchsia-500/30 font-semibold">
          <i class="fa-solid fa-arrow-right-arrow-left text-xs"></i> + Phương trình
        </button>
        <button type="button" id="quick-add-app" class="tree-btn bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 text-xs py-1.5 px-3 rounded-xl border border-pink-500/30 font-semibold">
          <i class="fa-solid fa-rocket text-xs"></i> + Ứng dụng
        </button>
        <button type="button" id="quick-add-formula" class="tree-btn bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs py-1.5 px-3 rounded-xl border border-cyan-500/30 font-semibold">
          <i class="fa-solid fa-flask text-xs"></i> + Công thức
        </button>
        <button type="button" id="quick-add-table" class="tree-btn bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs py-1.5 px-3 rounded-xl border border-indigo-500/30 font-semibold">
          <i class="fa-solid fa-table text-xs"></i> + Bảng
        </button>
      </div>
    `;

    wrap.querySelector("#quick-add-rxn").onclick = () => {
      const rxns = Array.isArray(data.reactions) ? data.reactions : [];
      rxns.push({ type: "Phản ứng mới", equation: "", desc: "" });
      this.updateDataField(["reactions"], rxns);
      this.render(symbol);
    };

    wrap.querySelector("#quick-add-app").onclick = () => {
      const apps = Array.isArray(data.applications) ? data.applications : [];
      apps.push({ title: "Ứng dụng mới", desc: "" });
      this.updateDataField(["applications"], apps);
      this.render(symbol);
    };

    wrap.querySelector("#quick-add-formula").onclick = () => {
      if (this.toolbar?.chemistryTools) {
        this.toolbar.chemistryTools.openFormulaDialog((txt) => {
          this.toolbar.insertTextAtCursor(txt);
        });
      }
    };

    wrap.querySelector("#quick-add-table").onclick = (e) => {
      if (this.toolbar?.tableEditor) {
        this.toolbar.tableEditor.openGridPicker(e.currentTarget, (rows, cols) => {
          const html = this.toolbar.tableEditor.generateTableHtml(rows, cols);
          this.toolbar.insertHtmlAtCursor(html);
        });
      }
    };

    return wrap;
  }
}
