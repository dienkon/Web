/**
 * Accessible Custom Bottom Sheet Component for Mobile DkDocShop 2.0
 */
import { safe } from "../utils/sanitize.js";

class BottomSheetManager {
  constructor() {
    this._overlayEl = null;
    this._sheetEl = null;
    this._titleEl = null;
    this._contentEl = null;
    this._init();
  }

  _init() {
    let sheet = document.getElementById("custom-bottom-sheet");
    if (!sheet) {
      sheet = document.createElement("div");
      sheet.id = "custom-bottom-sheet";
      sheet.className = "fixed inset-0 bg-gray-900/50 backdrop-blur-xs z-50 hidden transition-opacity duration-300 flex flex-col justify-end";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.innerHTML = `
        <div class="bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col transform translate-y-full transition-transform duration-300 ease-out" id="bottom-sheet-panel">
          <div class="pt-3 pb-1 flex justify-center">
            <div class="w-12 h-1.5 rounded-full bg-gray-200 cursor-grab"></div>
          </div>
          <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 id="bottom-sheet-title" class="text-sm font-bold text-gray-900"></h3>
            <button type="button" id="bottom-sheet-close-btn" class="w-7 h-7 rounded-full hover:bg-gray-100 text-gray-400 flex items-center justify-center text-xs">✕</button>
          </div>
          <div id="bottom-sheet-body" class="p-5 overflow-y-auto max-h-[70vh] hide-scroll text-xs text-gray-600"></div>
        </div>
      `;
      document.body.appendChild(sheet);
    }

    this._overlayEl = sheet;
    this._sheetEl = document.getElementById("bottom-sheet-panel");
    this._titleEl = document.getElementById("bottom-sheet-title");
    this._contentEl = document.getElementById("bottom-sheet-body");

    this._overlayEl.addEventListener("click", (e) => {
      if (e.target === this._overlayEl) this.close();
    });

    document.getElementById("bottom-sheet-close-btn")?.addEventListener("click", () => this.close());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this._overlayEl.classList.contains("hidden")) {
        this.close();
      }
    });
  }

  open({ title = "", contentHtml = "", onClose = null }) {
    this._titleEl.textContent = title;
    this._contentEl.innerHTML = contentHtml;
    this._onClose = onClose;

    this._overlayEl.classList.remove("hidden");
    requestAnimationFrame(() => {
      this._sheetEl.classList.remove("translate-y-full");
    });
  }

  close() {
    this._sheetEl.classList.add("translate-y-full");
    setTimeout(() => {
      this._overlayEl.classList.add("hidden");
      if (this._onClose) {
        this._onClose();
        this._onClose = null;
      }
    }, 300);
  }
}

export const bottomSheet = new BottomSheetManager();
export default bottomSheet;
