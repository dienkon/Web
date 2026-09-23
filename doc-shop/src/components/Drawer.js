/**
 * Accessible Custom Drawer Component for DkDocShop 2.0
 */
import { safe } from "../utils/sanitize.js";

class DrawerManager {
  constructor() {
    this._drawerEl = null;
    this._panelEl = null;
    this._titleEl = null;
    this._bodyEl = null;
    this._init();
  }

  _init() {
    let drawer = document.getElementById("custom-drawer");
    if (!drawer) {
      drawer = document.createElement("div");
      drawer.id = "custom-drawer";
      drawer.className = "fixed inset-0 bg-gray-900/50 backdrop-blur-xs z-50 hidden transition-opacity duration-300";
      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-modal", "true");
      drawer.innerHTML = `
        <div class="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col transform translate-x-full transition-transform duration-300 ease-in-out border-l border-gray-100" id="drawer-panel">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 id="drawer-title" class="text-sm font-bold text-gray-900 tracking-tight"></h3>
            <button type="button" id="drawer-close-btn" class="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition">✕</button>
          </div>
          <div id="drawer-body" class="flex-1 overflow-y-auto p-5 text-xs text-gray-600"></div>
        </div>
      `;
      document.body.appendChild(drawer);
    }

    this._drawerEl = drawer;
    this._panelEl = document.getElementById("drawer-panel");
    this._titleEl = document.getElementById("drawer-title");
    this._bodyEl = document.getElementById("drawer-body");

    this._drawerEl.addEventListener("click", (e) => {
      if (e.target === this._drawerEl) this.close();
    });

    document.getElementById("drawer-close-btn")?.addEventListener("click", () => this.close());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this._drawerEl.classList.contains("hidden")) {
        this.close();
      }
    });
  }

  open({ title = "", contentHtml = "", onClose = null }) {
    this._titleEl.textContent = title;
    this._bodyEl.innerHTML = contentHtml;
    this._onClose = onClose;

    this._drawerEl.classList.remove("hidden");
    requestAnimationFrame(() => {
      this._panelEl.classList.remove("translate-x-full");
    });
  }

  close() {
    this._panelEl.classList.add("translate-x-full");
    setTimeout(() => {
      this._drawerEl.classList.add("hidden");
      if (this._onClose) {
        this._onClose();
        this._onClose = null;
      }
    }, 300);
  }
}

export const drawer = new DrawerManager();
export default drawer;
