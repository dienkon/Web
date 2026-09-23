/**
 * Accessible Custom Modal Component for DkDocShop 2.0
 * Zero window.alert() and zero window.prompt() guarantee
 */
import { safe } from "../utils/sanitize.js";

class ModalManager {
  constructor() {
    this._modalEl = null;
    this._boxEl = null;
    this._iconEl = null;
    this._titleEl = null;
    this._messageEl = null;
    this._actionsEl = null;
    this._onCloseCallback = null;
    this._init();
  }

  _init() {
    let modal = document.getElementById("custom-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "custom-modal";
      modal.className = "fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-auto transform scale-95 transition-all duration-200 border border-gray-100" id="modal-content-box">
          <div id="modal-icon" class="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl mb-3 hidden"></div>
          <h3 id="modal-title" class="text-lg font-bold text-center text-gray-900 mb-2 tracking-tight"></h3>
          <div id="modal-message" class="text-gray-600 text-xs sm:text-sm mb-5 max-h-[65vh] overflow-y-auto hide-scroll"></div>
          <div class="flex justify-end gap-2.5" id="modal-actions"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    this._modalEl = modal;
    this._boxEl = document.getElementById("modal-content-box");
    this._iconEl = document.getElementById("modal-icon");
    this._titleEl = document.getElementById("modal-title");
    this._messageEl = document.getElementById("modal-message");
    this._actionsEl = document.getElementById("modal-actions");

    // Close on backdrop click
    this._modalEl.addEventListener("click", (e) => {
      if (e.target === this._modalEl) this.close();
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this._modalEl.classList.contains("hidden")) {
        this.close();
      }
    });

    // Global backward compatibility
    window.showModal = (title, message, iconType = "info", actionBtn = null) => {
      this.open({ title, message, iconType, actionBtn });
    };
    window.closeModal = () => this.close();
  }

  open({ title, message, contentHtml = null, body = null, iconType = "none", actionBtn = null, onClose = null }) {
    this._onCloseCallback = onClose;
    this._titleEl.textContent = title || "";

    const finalHtml = contentHtml || body || (typeof message === "string" ? message : "");
    if (typeof finalHtml === "string" && (finalHtml.includes("<") || finalHtml.includes("&"))) {
      this._messageEl.innerHTML = finalHtml;
    } else {
      this._messageEl.textContent = finalHtml;
    }

    // Icons
    this._iconEl.className = "w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl mb-3";
    if (iconType === "success") {
      this._iconEl.classList.remove("hidden");
      this._iconEl.classList.add("bg-emerald-100", "text-emerald-600");
      this._iconEl.innerHTML = "✓";
    } else if (iconType === "error") {
      this._iconEl.classList.remove("hidden");
      this._iconEl.classList.add("bg-red-100", "text-red-600");
      this._iconEl.innerHTML = "✕";
    } else if (iconType === "warning") {
      this._iconEl.classList.remove("hidden");
      this._iconEl.classList.add("bg-amber-100", "text-amber-600");
      this._iconEl.innerHTML = "⚠️";
    } else if (iconType === "info") {
      this._iconEl.classList.remove("hidden");
      this._iconEl.classList.add("bg-blue-100", "text-blue-600");
      this._iconEl.innerHTML = "ℹ️";
    } else {
      this._iconEl.classList.add("hidden");
    }

    // Actions
    if (actionBtn !== null) {
      if (typeof actionBtn === "string") {
        this._actionsEl.innerHTML = `
          <button type="button" class="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition" id="modal-cancel-btn">Đóng</button>
          ${actionBtn}
        `;
        this._actionsEl.querySelector("#modal-cancel-btn")?.addEventListener("click", () => this.close());
      } else {
        this._actionsEl.innerHTML = "";
      }
    } else {
      this._actionsEl.innerHTML = `
        <button type="button" class="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition" id="modal-close-btn">Đóng</button>
      `;
      this._actionsEl.querySelector("#modal-close-btn")?.addEventListener("click", () => this.close());
    }

    this._modalEl.classList.remove("hidden");
    setTimeout(() => {
      this._boxEl.classList.remove("scale-95");
      this._boxEl.classList.add("scale-100");
    }, 10);
  }

  close() {
    if (!this._modalEl || this._modalEl.classList.contains("hidden")) return;
    this._boxEl?.classList.remove("scale-100");
    this._boxEl?.classList.add("scale-95");
    setTimeout(() => {
      this._modalEl?.classList.add("hidden");
      if (this._onCloseCallback) {
        this._onCloseCallback();
        this._onCloseCallback = null;
      }
    }, 150);
  }

  /**
   * Open dynamic form modal
   */
  openForm(title, formFieldsHtml, onSubmit, submitText = "Lưu") {
    const formHtml = `
      <form id="modal-dynamic-form" class="space-y-4">
        ${formFieldsHtml}
        <div class="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
          <button type="button" class="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition" id="form-cancel-btn">Hủy</button>
          <button type="submit" class="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm transition" id="form-submit-btn">${safe(submitText)}</button>
        </div>
      </form>
    `;

    this.open({
      title,
      message: formHtml,
      iconType: "none",
      actionBtn: "",
    });

    this._actionsEl.innerHTML = "";

    const form = document.getElementById("modal-dynamic-form");
    document.getElementById("form-cancel-btn")?.addEventListener("click", () => this.close());

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("form-submit-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Đang xử lý...";
      }
      try {
        const formData = new FormData(form);
        await onSubmit(formData);
        this.close();
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitText;
        }
      }
    });
  }

  /**
   * Custom Prompt replacement - Returns string or null
   */
  promptDialog({
    title = "Nhập thông tin",
    message = "",
    defaultValue = "",
    placeholder = "Nhập tại đây...",
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    inputType = "text",
  } = {}) {
    return new Promise((resolve) => {
      const existing = document.getElementById("custom-prompt-popup");
      if (existing) existing.remove();

      const overlay = document.createElement("div");
      overlay.id = "custom-prompt-popup";
      overlay.className = "fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");

      overlay.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-auto transform scale-95 transition-all duration-200 border border-gray-100 animate-popup">
          <h3 class="text-base font-bold text-gray-900 text-center mb-1.5">${safe(title)}</h3>
          ${message ? `<p class="text-xs text-gray-600 text-center mb-4 leading-relaxed">${safe(message)}</p>` : ""}
          <div class="mb-5">
            <input
              type="${inputType}"
              id="custom-prompt-input"
              value="${safe(defaultValue)}"
              placeholder="${safe(placeholder)}"
              class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
          <div class="flex gap-2.5">
            <button type="button" id="prompt-cancel-btn" class="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition active:scale-95">
              ${safe(cancelText)}
            </button>
            <button type="button" id="prompt-confirm-btn" class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition active:scale-95 shadow-sm">
              ${safe(confirmText)}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector("#custom-prompt-input");
      input?.focus();
      input?.select();

      const close = (val) => {
        overlay.remove();
        document.removeEventListener("keydown", onKeydown);
        resolve(val);
      };

      const onKeydown = (e) => {
        if (e.key === "Escape") close(null);
        if (e.key === "Enter") close(input?.value?.trim() ?? "");
      };

      overlay.querySelector("#prompt-cancel-btn")?.addEventListener("click", () => close(null));
      overlay.querySelector("#prompt-confirm-btn")?.addEventListener("click", () => close(input?.value?.trim() ?? ""));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close(null);
      });

      document.addEventListener("keydown", onKeydown);
    });
  }
}

export const modal = new ModalManager();
export const promptDialog = (opts) => modal.promptDialog(opts);
export default modal;
