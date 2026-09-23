/**
 * ChemDex Data Editor - Periodic Table Grid Renderer
 * Fully displays Lanthanides (57-71) and Actinides (89-103) fully expanded for visual editing
 */
import { state } from "./state.js";
import { escapeHtml } from "./utils.js";

const GROUP_LABELS = {
  1: "IA", 2: "IIA", 3: "IIIB", 4: "IVB", 5: "VB", 6: "VIB", 7: "VIIB",
  8: "VIIIB", 9: "VIIIB", 10: "VIIIB", 11: "IB", 12: "IIB", 13: "IIIA",
  14: "IVA", 15: "VA", 16: "VIA", 17: "VIIA", 18: "VIIIA",
};

export const CATEGORY_COLORS = {
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

export class TableRenderer {
  constructor(containerId, onElementSelect) {
    this.container = document.getElementById(containerId);
    this.onElementSelect = onElementSelect;
    this.cellElements = new Map(); // symbol -> DOM Element

    // Subscribe to state updates
    state.subscribe("activeElement", (symbol) => this.updateActiveCell(symbol));
    state.subscribe("dirty", ({ symbol }) => this.updateDirtyCell(symbol));
    state.subscribe("filter", () => this.applyFilters());
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = "";
    this.cellElements.clear();

    // 1. Column Labels 1 -> 18 (Grid Col 2 -> 19, Grid Row 1)
    for (let col = 1; col <= 18; col++) {
      const label = document.createElement("div");
      label.className = `grid-label col-label-${col}`;
      label.style.gridColumn = col + 1;
      label.style.gridRow = 1;
      label.innerHTML = `
        <div class="flex flex-col items-center">
          <span class="text-[11px] leading-tight font-bold text-slate-400">
            ${GROUP_LABELS[col] || col}
          </span>
          <span class="text-[9px] text-slate-500 font-mono">
            ${col}
          </span>
        </div>
      `;
      this.container.appendChild(label);
    }

    // 2. Row Labels 1 -> 7 (Grid Col 1, Grid Row 2 -> 8)
    for (let row = 1; row <= 7; row++) {
      const label = document.createElement("div");
      label.className = `grid-label row-label-${row}`;
      label.style.gridColumn = 1;
      label.style.gridRow = row + 1;
      label.innerHTML = `<span class="text-xs font-bold text-slate-500">${row}</span>`;
      this.container.appendChild(label);
    }

    // Row Labels for Lanthanides & Actinides (Rows 10 & 11)
    const laRowLabel = document.createElement("div");
    laRowLabel.className = "grid-label text-pink-400 font-bold font-mono text-sm";
    laRowLabel.style.gridColumn = 1;
    laRowLabel.style.gridRow = 10;
    laRowLabel.innerHTML = `<span title="Họ Lanthanide (57-71)">*</span>`;
    this.container.appendChild(laRowLabel);

    const acRowLabel = document.createElement("div");
    acRowLabel.className = "grid-label text-fuchsia-400 font-bold font-mono text-sm";
    acRowLabel.style.gridColumn = 1;
    acRowLabel.style.gridRow = 11;
    acRowLabel.innerHTML = `<span title="Họ Actinide (89-103)">**</span>`;
    this.container.appendChild(acRowLabel);

    // Banners for Lanthanides & Actinides series in Col 2-4
    const laBanner = document.createElement("div");
    laBanner.className = "flex items-center justify-end pr-2 text-[11px] font-bold text-pink-400/90 font-mono select-none tracking-tight";
    laBanner.style.gridColumn = "2 / 5";
    laBanner.style.gridRow = 10;
    laBanner.innerHTML = `<span class="px-2 py-1 rounded bg-pink-950/40 border border-pink-500/20"><i class="fa-solid fa-arrow-right text-[10px] mr-1"></i> Lanthanide (La-Lu)</span>`;
    this.container.appendChild(laBanner);

    const acBanner = document.createElement("div");
    acBanner.className = "flex items-center justify-end pr-2 text-[11px] font-bold text-fuchsia-400/90 font-mono select-none tracking-tight";
    acBanner.style.gridColumn = "2 / 5";
    acBanner.style.gridRow = 11;
    acBanner.innerHTML = `<span class="px-2 py-1 rounded bg-fuchsia-950/40 border border-fuchsia-500/20"><i class="fa-solid fa-arrow-right text-[10px] mr-1"></i> Actinide (Ac-Lr)</span>`;
    this.container.appendChild(acBanner);

    // 3. Lanthanide & Actinide Placeholders in Main Grid (Rows 7 & 8, Col 4)
    this.createPlaceholder(7, 4, "* 57-71<br>La–Lu", "lanthanide", 10);
    this.createPlaceholder(8, 4, "** 89-103<br>Ac–Lr", "actinide", 11);

    // 4. Render All 118 Elements
    state.elements.forEach((el) => {
      const cell = document.createElement("div");
      const sym = el.symbol.toUpperCase();
      const color = CATEGORY_COLORS[el.category] || CATEGORY_COLORS["unknown"];

      let extraClasses = "";
      if (el.category === "lanthanide") extraClasses = "el-lanthanide";
      if (el.category === "actinide") extraClasses = "el-actinide";

      cell.className = `element el-cell ${el.hasData ? "" : "no-data"} cat-${el.category} ${extraClasses}`;
      cell.dataset.symbol = sym;
      cell.dataset.number = el.number;
      cell.dataset.cat = el.category;
      cell.style.gridColumn = el.xpos;
      cell.style.gridRow = el.ypos;
      cell.style.setProperty("--color", color);

      cell.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-mono text-slate-400 font-bold">${el.number}</span>
          ${!el.hasData ? '<span class="no-data-tag">NO DATA</span>' : ""}
        </div>
        <div class="text-base sm:text-lg font-black text-white text-center leading-tight py-0.5">
          ${escapeHtml(el.symbol)}
        </div>
        <div class="text-[10px] text-slate-300 truncate text-center font-medium" title="${escapeHtml(el.nameVi || el.nameEn)}">
          ${escapeHtml(el.nameVi || el.nameEn)}
        </div>
      `;

      cell.addEventListener("click", () => {
        this.onElementSelect(sym);
      });

      this.cellElements.set(sym, cell);
      this.container.appendChild(cell);
    });

    // Update active & dirty state visually
    if (state.selectedSymbol) {
      this.updateActiveCell(state.selectedSymbol);
    }
    state.dirtySet.forEach((sym) => {
      this.updateDirtyCell(sym);
    });

    this.applyFilters();
  }

  createPlaceholder(row, col, text, categoryKey, targetRow) {
    const ph = document.createElement("div");
    ph.className = `element el-cell text-[10px] sm:text-xs flex items-center justify-center font-bold text-slate-300 border border-slate-700/80 bg-slate-900/80 cursor-pointer transition-all hover:scale-105 hover:brightness-125`;
    ph.style.gridColumn = col;
    ph.style.gridRow = row;
    const color = CATEGORY_COLORS[categoryKey] || "#ec4899";
    ph.style.setProperty("--color", color);
    ph.innerHTML = `<span class="text-center leading-tight">${text}</span>`;
    
    ph.addEventListener("click", () => {
      // Smoothly scroll down to target row in the table
      const firstSeriesCell = document.querySelector(`.element.el-cell.cat-${categoryKey}`);
      if (firstSeriesCell) {
        firstSeriesCell.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        firstSeriesCell.classList.add("ring-2", "ring-sky-400");
        setTimeout(() => firstSeriesCell.classList.remove("ring-2", "ring-sky-400"), 1500);
      }
    });

    this.container.appendChild(ph);
  }

  updateActiveCell(symbol) {
    this.cellElements.forEach((cell, sym) => {
      if (sym === symbol) {
        cell.classList.add("is-active");
        cell.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      } else {
        cell.classList.remove("is-active");
      }
    });
  }

  updateDirtyCell(symbol) {
    const cell = this.cellElements.get(symbol);
    if (!cell) return;

    const isDirty = state.isDirty(symbol);
    if (isDirty) {
      cell.classList.add("is-dirty");
      if (!cell.querySelector(".dirty-indicator-dot")) {
        const dot = document.createElement("span");
        dot.className = "dirty-indicator-dot";
        cell.appendChild(dot);
      }
    } else {
      cell.classList.remove("is-dirty");
      const dot = cell.querySelector(".dirty-indicator-dot");
      if (dot) dot.remove();
    }
  }

  applyFilters() {
    const filters = state.filters || {
      query: state.searchQuery || "",
      category: state.categoryFilter || "all",
      status: state.statusFilter || "all",
    };
    const { query, category, status } = filters;
    const q = query ? query.toLowerCase().trim() : "";

    this.cellElements.forEach((cell, sym) => {
      const meta = state.getElementMeta(sym);
      if (!meta) return;

      let match = true;

      // Text query match
      if (q) {
        const matchSym = sym.toLowerCase().includes(q);
        const matchNum = String(meta.number) === q;
        const matchVi = (meta.nameVi || "").toLowerCase().includes(q);
        const matchEn = (meta.nameEn || "").toLowerCase().includes(q);
        if (!matchSym && !matchNum && !matchVi && !matchEn) {
          match = false;
        }
      }

      // Category match
      if (match && category && category !== "all") {
        if (meta.category !== category) {
          match = false;
        }
      }

      // Status match
      if (match && status && status !== "all") {
        const isDirty = state.isDirty(sym);
        if (status === "dirty" && !isDirty) match = false;
        if (status === "clean" && isDirty) match = false;
        if (status === "no-data" && meta.hasData) match = false;
      }

      if (match) {
        cell.classList.remove("is-dimmed");
      } else {
        cell.classList.add("is-dimmed");
      }
    });
  }
}
