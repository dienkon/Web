/**
 * Accessible Confirmation Dialog Component
 */
import { safe } from "../utils/sanitize.js";

export const confirmDialog = (
  message,
  {
    title = "Xác nhận",
    confirmText = "Đồng ý",
    cancelText = "Hủy bỏ",
    confirmVariant = "primary", // primary | danger
  } = {},
) => {
  return new Promise((resolve) => {
    // Remove existing if any
    const existing = document.getElementById("custom-confirm-popup");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "custom-confirm-popup";
    overlay.className = "fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in";

    const confirmBtnClass =
      confirmVariant === "danger"
        ? "bg-red-600 hover:bg-red-700 text-white"
        : "bg-primary-600 hover:bg-primary-700 text-white";

    overlay.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-auto transform scale-95 transition-transform duration-200 animate-popup" role="alertdialog">
        <div class="w-12 h-12 rounded-full ${confirmVariant === "danger" ? "bg-red-50 text-red-600" : "bg-primary-50 text-primary-600"} flex items-center justify-center text-xl mx-auto mb-4">
          <i class="${confirmVariant === "danger" ? "fas fa-exclamation-triangle" : "fas fa-question-circle"}"></i>
        </div>
        <h3 class="text-lg font-bold text-gray-800 text-center mb-2">${safe(title)}</h3>
        <p class="text-sm text-gray-600 text-center mb-6 leading-relaxed">${safe(message)}</p>
        <div class="flex gap-3">
          <button type="button" id="confirm-cancel-btn" class="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
            ${safe(cancelText)}
          </button>
          <button type="button" id="confirm-ok-btn" class="flex-1 py-2.5 rounded-xl text-sm font-medium transition shadow-sm ${confirmBtnClass}">
            ${safe(confirmText)}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = (result) => {
      overlay.remove();
      document.removeEventListener("keydown", onKeydown);
      resolve(result);
    };

    const onKeydown = (e) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };

    overlay.querySelector("#confirm-cancel-btn").addEventListener("click", () => close(false));
    overlay.querySelector("#confirm-ok-btn").addEventListener("click", () => close(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });

    document.addEventListener("keydown", onKeydown);
    overlay.querySelector("#confirm-ok-btn")?.focus();
  });
};

// Global backward compatibility
window.askConfirm = (title, message, confirmText) =>
  confirmDialog(message, { title, confirmText });
window.showConfirmPopup = (message, confirmText) =>
  confirmDialog(message, { confirmText });
