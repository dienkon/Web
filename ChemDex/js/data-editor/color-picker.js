/**
 * ChemDex Data Editor - Unified ColorPicker Component
 * Fulfills Sections N, O, DG, DH, DI, DJ, DK of ChemDex CMS Specification
 * Features:
 * - Theme colors
 * - Standard multi-hue palette
 * - Recently used colors with localStorage persistence
 * - Custom HEX input & native picker with live preview
 * - Selection preservation so formatting doesn't steal focus
 * - Accessibility contrast warning
 */
import { escapeHtml } from "./utils.js";

const RECENT_COLORS_KEY = "chemdex_recent_colors";

const THEME_COLORS = [
  { name: "Chữ chính (Trắng kem)", hex: "#F2F4F7" },
  { name: "Chữ phụ (Xám nhạt)", hex: "#94A3B8" },
  { name: "Điểm nhấn Cyan", hex: "#38BDF8" },
  { name: "Xanh lục tươi", hex: "#34D399" },
  { name: "Vàng cảnh báo", hex: "#FBBF24" },
  { name: "Đỏ nổi bật", hex: "#F87171" },
  { name: "Tím thạch anh", hex: "#C084FC" },
  { name: "Cam san hô", hex: "#FB923C" },
  { name: "Nền tối nhẹ", hex: "#20252B" },
  { name: "Xám viền", hex: "#475569" },
];

const STANDARD_PALETTES = [
  {
    name: "Neutrals",
    colors: ["#FFFFFF", "#E2E8F0", "#CBD5E1", "#94A3B8", "#64748B", "#334155", "#1E293B", "#0F172A"],
  },
  {
    name: "Red / Rose",
    colors: ["#FFE4E6", "#FECDD3", "#FDA4AF", "#FB7185", "#F43F5E", "#E11D48", "#BE123C", "#9F1239"],
  },
  {
    name: "Orange / Amber",
    colors: ["#FEF3C7", "#FDE68A", "#FCD34D", "#FBBF24", "#F59E0B", "#F97316", "#EA580C", "#9A3412"],
  },
  {
    name: "Green / Emerald",
    colors: ["#DCFCE7", "#BBF7D0", "#86EFAC", "#4ADE80", "#22C55E", "#16A34A", "#15803D", "#166534"],
  },
  {
    name: "Cyan / Sky",
    colors: ["#E0F2FE", "#BAE6FD", "#7DD3FC", "#38BDF8", "#0EA5E9", "#0284C7", "#0369A1", "#075985"],
  },
  {
    name: "Blue / Indigo",
    colors: ["#EDE9FE", "#DDD6FE", "#C4B5FD", "#A78BFA", "#818CF8", "#6366F1", "#4F46E5", "#3730A3"],
  },
  {
    name: "Purple / Pink",
    colors: ["#FCE7F3", "#FBCFE8", "#F472B6", "#EC4899", "#D946EF", "#C026D3", "#9333EA", "#7E22CE"],
  },
];

export class ColorPicker {
  constructor() {
    this.modalEl = null;
    this.savedSelection = null;
    this.recentColors = this.loadRecentColors();
  }

  loadRecentColors() {
    try {
      const raw = localStorage.getItem(RECENT_COLORS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.slice(0, 10);
      }
    } catch (e) {
      console.warn("Failed to load recent colors", e);
    }
    return ["#38BDF8", "#34D399", "#FBBF24", "#F87171"];
  }

  saveRecentColor(hex) {
    if (!hex || typeof hex !== "string") return;
    const clean = hex.trim().toUpperCase();
    if (!clean.startsWith("#")) return;
    this.recentColors = [clean, ...this.recentColors.filter((c) => c !== clean)].slice(0, 10);
    try {
      localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(this.recentColors));
    } catch (e) {
      console.warn("Failed to save recent colors", e);
    }
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
   * Calculate luminance of HEX color to detect low contrast against dark background (#181B1F)
   */
  isLowContrast(hex) {
    if (!hex || !hex.startsWith("#") || hex.length < 7) return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
    // Relative luminance
    const lum = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
    // Dark background #181B1F is lum ~0.015. Text with lum < 0.15 is hard to read.
    return lum < 0.16;
  }

  open({
    title = "Chọn màu",
    currentColor = "#38BDF8",
    mode = "foreColor", // 'foreColor' | 'hiliteColor' | 'custom'
    onSelect = () => {},
  }) {
    this.saveSelection();

    // Close any previous instance
    this.close();

    const overlay = document.createElement("div");
    overlay.className = "color-picker-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-fade-in";

    let hexValue = currentColor || "#38BDF8";
    if (!hexValue.startsWith("#")) hexValue = "#38BDF8";

    overlay.innerHTML = `
      <div class="color-picker-dialog bg-[#181B1F] border border-white/10 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-slate-200">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-white/5 pb-3">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-palette text-sky-400"></i>
            <h3 class="font-bold text-sm text-white">${escapeHtml(title)}</h3>
          </div>
          <button id="cp-close-btn" class="text-slate-400 hover:text-white text-xs p-1 rounded-md hover:bg-white/5">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Live Color Preview Bar -->
        <div class="flex items-center gap-3 p-2.5 rounded-xl bg-[#111315] border border-white/5">
          <div id="cp-swatch" class="w-10 h-10 rounded-lg shadow-inner shrink-0 border border-white/10" style="background-color: ${hexValue};"></div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold text-white" id="cp-hex-label">${hexValue.toUpperCase()}</span>
              <span id="cp-contrast-warning" class="hidden text-[10px] text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800 flex items-center gap-1">
                <i class="fa-solid fa-triangle-exclamation"></i> Tương phản thấp
              </span>
            </div>
            <p class="text-[11px] text-slate-400 truncate mt-0.5">
              ${mode === "hiliteColor" ? "Màu nền highlight chữ đã chọn" : mode === "foreColor" ? "Màu hiển thị của ký tự" : "Màu được áp dụng"}
            </p>
          </div>
        </div>

        <!-- 1. Theme Colors -->
        <div>
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-wand-magic-sparkles text-sky-400 text-[10px]"></i> Màu chủ đề ChemDex
          </div>
          <div class="grid grid-cols-5 gap-1.5">
            ${THEME_COLORS.map(
              (c) => `
              <button
                type="button"
                class="cp-cell flex items-center gap-1.5 p-1.5 rounded-lg border border-white/5 hover:border-sky-400 transition-all text-left group bg-[#20252B] hover:bg-white/10"
                data-hex="${c.hex}"
                title="${c.name} (${c.hex})"
              >
                <span class="w-4 h-4 rounded-md shrink-0 shadow-sm border border-white/10" style="background-color: ${c.hex};"></span>
                <span class="text-[10px] truncate text-slate-300 group-hover:text-white font-mono">${c.hex}</span>
              </button>
            `
            ).join("")}
          </div>
        </div>

        <!-- 2. Standard Palettes -->
        <div>
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-swatchbook text-indigo-400 text-[10px]"></i> Bảng màu tiêu chuẩn
          </div>
          <div class="space-y-1.5 bg-[#111315] p-2 rounded-xl border border-white/5">
            ${STANDARD_PALETTES.map(
              (p) => `
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-slate-400 w-16 truncate font-medium">${p.name}</span>
                <div class="flex items-center gap-1 flex-1">
                  ${p.colors
                    .map(
                      (hex) => `
                    <button
                      type="button"
                      class="cp-cell w-5 h-5 rounded-md border border-white/10 hover:scale-125 transition-transform hover:z-10 shadow-sm"
                      style="background-color: ${hex};"
                      data-hex="${hex}"
                      title="${hex}"
                    ></button>
                  `
                    )
                    .join("")}
                </div>
              </div>
            `
            ).join("")}
          </div>
        </div>

        <!-- 3. Recently Used Colors -->
        <div id="cp-recent-section" class="${this.recentColors.length ? "" : "hidden"}">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <i class="fa-solid fa-clock-rotate-left text-emerald-400 text-[10px]"></i> Đã dùng gần đây
          </div>
          <div class="flex items-center gap-1.5 flex-wrap" id="cp-recent-list">
            ${this.recentColors
              .map(
                (hex) => `
              <button
                type="button"
                class="cp-cell w-6 h-6 rounded-md border border-white/10 hover:scale-125 transition-transform hover:border-white shadow-sm"
                style="background-color: ${hex};"
                data-hex="${hex}"
                title="${hex}"
              ></button>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- 4. Custom Color Input -->
        <div class="border-t border-white/5 pt-3">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Tùy chỉnh mã HEX</div>
          <div class="flex items-center gap-2">
            <input
              type="color"
              id="cp-native-picker"
              value="${hexValue}"
              class="w-10 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0 shrink-0"
              title="Mở bảng chọn màu hệ thống"
            />
            <div class="relative flex-1">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">#</span>
              <input
                type="text"
                id="cp-hex-input"
                value="${hexValue.replace("#", "")}"
                maxlength="7"
                placeholder="RRGGBB"
                class="w-full bg-[#111315] border border-white/10 text-white font-mono text-xs rounded-lg pl-7 pr-3 py-2 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 uppercase"
              />
            </div>
            <button
              type="button"
              id="cp-apply-btn"
              class="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-lg shadow-sky-500/20"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.modalEl = overlay;

    const swatchEl = overlay.querySelector("#cp-swatch");
    const hexLabelEl = overlay.querySelector("#cp-hex-label");
    const warningEl = overlay.querySelector("#cp-contrast-warning");
    const nativePicker = overlay.querySelector("#cp-native-picker");
    const hexInput = overlay.querySelector("#cp-hex-input");

    const updatePreview = (hex) => {
      let clean = hex.trim();
      if (!clean.startsWith("#")) clean = "#" + clean;
      if (swatchEl) swatchEl.style.backgroundColor = clean;
      if (hexLabelEl) hexLabelEl.textContent = clean.toUpperCase();
      if (warningEl) {
        if (mode === "foreColor" && this.isLowContrast(clean)) {
          warningEl.classList.remove("hidden");
        } else {
          warningEl.classList.add("hidden");
        }
      }
    };

    updatePreview(hexValue);

    // Color cell clicks
    overlay.querySelectorAll(".cp-cell").forEach((btn) => {
      btn.onclick = () => {
        const selectedHex = btn.dataset.hex;
        updatePreview(selectedHex);
        if (nativePicker) nativePicker.value = selectedHex;
        if (hexInput) hexInput.value = selectedHex.replace("#", "");
        this.applyColor(selectedHex, onSelect);
      };
    });

    // Native color change
    nativePicker.oninput = (e) => {
      const val = e.target.value;
      if (hexInput) hexInput.value = val.replace("#", "");
      updatePreview(val);
    };

    // Text HEX change
    hexInput.oninput = (e) => {
      let val = e.target.value.trim();
      if (val.startsWith("#")) val = val.slice(1);
      if (val.length === 3 || val.length === 6) {
        const fullHex = "#" + val;
        if (nativePicker) nativePicker.value = fullHex;
        updatePreview(fullHex);
      }
    };

    // Apply button
    overlay.querySelector("#cp-apply-btn").onclick = () => {
      let val = hexInput.value.trim();
      if (!val.startsWith("#")) val = "#" + val;
      this.applyColor(val, onSelect);
    };

    // Close buttons
    overlay.querySelector("#cp-close-btn").onclick = () => this.close();
    overlay.onclick = (e) => {
      if (e.target === overlay) this.close();
    };

    // ESC to close
    const handleKey = (e) => {
      if (e.key === "Escape") {
        this.close();
        window.removeEventListener("keydown", handleKey);
      }
    };
    window.addEventListener("keydown", handleKey);
  }

  applyColor(hex, onSelect) {
    this.saveRecentColor(hex);
    this.restoreSelection();
    onSelect(hex);
    this.close();
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}

export const colorPicker = new ColorPicker();
