/**
 * Accessible Custom Toast Component for DkDocShop 2.0
 */
import { notificationService } from "../services/notification.service.js";
import { safe } from "../utils/sanitize.js";

class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0";
      document.body.appendChild(container);
    }
    this.container = container;

    notificationService.onToast(({ message, type, duration }) => {
      this.renderToast(message, type, duration);
    });
  }

  renderToast(message, type = "info", duration = 3500) {
    if (!this.container) return;

    const toastEl = document.createElement("div");
    toastEl.className = "pointer-events-auto bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-lg rounded-2xl p-3.5 flex items-start gap-3 transform transition-all duration-300 translate-y-2 opacity-0";

    const icons = {
      success: '<div class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs shrink-0 font-bold">✓</div>',
      error: '<div class="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs shrink-0 font-bold">✕</div>',
      warning: '<div class="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs shrink-0 font-bold">⚠️</div>',
      info: '<div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs shrink-0 font-bold">ℹ️</div>',
    };

    toastEl.innerHTML = `
      ${icons[type] || icons.info}
      <div class="flex-1 text-gray-800 text-xs font-medium leading-relaxed break-words">${safe(message)}</div>
      <button type="button" class="text-gray-400 hover:text-gray-600 text-xs p-1" aria-label="Đóng">✕</button>
    `;

    const closeBtn = toastEl.querySelector("button");
    const remove = () => {
      toastEl.classList.remove("translate-y-0", "opacity-100");
      toastEl.classList.add("translate-y-2", "opacity-0");
      setTimeout(() => {
        if (toastEl.parentElement) toastEl.parentElement.removeChild(toastEl);
      }, 250);
    };

    closeBtn.addEventListener("click", remove);
    this.container.appendChild(toastEl);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toastEl.classList.remove("translate-y-2", "opacity-0");
      toastEl.classList.add("translate-y-0", "opacity-100");
    });

    if (duration > 0) {
      setTimeout(remove, duration);
    }
  }
}

export const toastComponent = new ToastManager();

export const toast = {
  success: (msg, d) => notificationService.success(msg, d),
  error: (msg, d) => notificationService.error(msg, d),
  warning: (msg, d) => notificationService.warning(msg, d),
  info: (msg, d) => notificationService.info(msg, d),
};

export default toast;
