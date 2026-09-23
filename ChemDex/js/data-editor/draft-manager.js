/**
 * ChemDex Data Editor - Local Draft Auto-Saver & Recovery
 * Fulfills Section AR of ChemDex CMS Specification
 * Stores uncommitted working drafts in localStorage keyed by element symbol
 */
import { state } from "./state.js";
import { showToast } from "./utils.js";

const DRAFT_PREFIX = "chemdex_draft_";

export class DraftManager {
  constructor() {
    this.initAutoSaver();
  }

  initAutoSaver() {
    // Listen to dataUpdate state changes and persist draft locally
    state.subscribe("dataUpdate", ({ symbol, data }) => {
      if (!symbol || !data) return;
      if (state.isDirty(symbol)) {
        this.saveDraft(symbol, data);
      }
    });

    // Clear draft when element changes are committed or discarded
    state.subscribe("dirty", () => {
      // Any elements that are no longer dirty can have their local draft removed
      state.elementsList.forEach((el) => {
        if (!state.isDirty(el.symbol)) {
          this.clearDraft(el.symbol);
        }
      });
    });
  }

  saveDraft(symbol, data) {
    try {
      const payload = {
        symbol: symbol.toUpperCase(),
        timestamp: Date.now(),
        data,
      };
      localStorage.setItem(`${DRAFT_PREFIX}${symbol.toUpperCase()}`, JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to write local draft", e);
    }
  }

  getDraft(symbol) {
    try {
      const raw = localStorage.getItem(`${DRAFT_PREFIX}${symbol.toUpperCase()}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse local draft", e);
      return null;
    }
  }

  clearDraft(symbol) {
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${symbol.toUpperCase()}`);
    } catch (e) {
      console.warn("Failed to clear local draft", e);
    }
  }

  hasDraft(symbol) {
    return localStorage.getItem(`${DRAFT_PREFIX}${symbol.toUpperCase()}`) !== null;
  }

  /**
   * Check and render a recovery banner if a previous local draft exists
   */
  checkAndRenderRecoveryBanner(symbol, containerEl, onRestore, onDiscard) {
    const draft = this.getDraft(symbol);
    if (!draft || !draft.data) return;

    // Check if draft has difference with current working copy
    const working = state.getWorkingCopy(symbol);
    if (JSON.stringify(working) === JSON.stringify(draft.data)) {
      return; // Already matched
    }

    // Create banner
    const existingBanner = containerEl.querySelector(".draft-recovery-banner");
    if (existingBanner) existingBanner.remove();

    const banner = document.createElement("div");
    banner.className = "draft-recovery-banner p-3.5 mb-6 rounded-2xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-between flex-wrap gap-3 text-xs text-amber-200 shadow-lg animate-fade-in";
    
    const dateStr = new Date(draft.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    banner.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
          <i class="fa-solid fa-clock-rotate-left text-sm"></i>
        </div>
        <div>
          <div class="font-bold text-amber-100 flex items-center gap-2">
            <span>Phát hiện bản nháp chưa lưu từ trước (${dateStr})</span>
            <span class="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">Bản nháp máy này</span>
          </div>
          <p class="text-[11px] text-amber-300/80 mt-0.5">
            Trình duyệt đã tự động lưu lại các chỉnh sửa của bạn trước khi đóng trang. Bạn muốn khôi phục không?
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button type="button" id="draft-discard-btn" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 text-xs font-semibold transition-colors">
          Bỏ bản nháp
        </button>
        <button type="button" id="draft-restore-btn" class="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-colors flex items-center gap-1.5">
          <i class="fa-solid fa-arrow-rotate-left text-xs"></i> Khôi phục bản nháp
        </button>
      </div>
    `;

    containerEl.insertBefore(banner, containerEl.firstChild);

    banner.querySelector("#draft-restore-btn").onclick = () => {
      state.workingCopies[symbol.toUpperCase()] = draft.data;
      state.dirtySet.add(symbol.toUpperCase());
      state.notify("dataUpdate", { symbol: symbol.toUpperCase(), data: draft.data });
      state.notify("dirty", { dirtyCount: state.dirtySet.size, dirtyList: Array.from(state.dirtySet) });
      banner.remove();
      showToast(`Đã khôi phục bản nháp của ${symbol}`, "success");
      if (typeof onRestore === "function") onRestore();
    };

    banner.querySelector("#draft-discard-btn").onclick = () => {
      this.clearDraft(symbol);
      banner.remove();
      showToast(`Đã xóa bản nháp của ${symbol}`, "info");
      if (typeof onDiscard === "function") onDiscard();
    };
  }
}

export const draftManager = new DraftManager();
