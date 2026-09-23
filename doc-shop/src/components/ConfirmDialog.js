/**
 * Accessible Custom Confirm Dialog Component for DkDocShop 2.0
 * Zero window.confirm() guarantee
 */
import { safe } from "../utils/sanitize.js";

export const confirmDialog = (
  message,
  {
    title = "Xác nhận",
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    variant = "primary", // primary | danger | warning | info | success
    confirmVariant = null, // backward compat
    icon = null,
  } = {},
) => {
  const chosenVariant = confirmVariant || variant;

  return new Promise((resolve) => {
    const existing = document.getElementById("custom-confirm-popup");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "custom-confirm-popup";
    overlay.className = "fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "confirm-dialog-title");

    let btnClass = "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm";
    let iconHtml = '<div class="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mx-auto mb-3">✓</div>';

    if (chosenVariant === "danger") {
      btnClass = "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200";
      iconHtml = '<div class="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xl mx-auto mb-3">⚠️</div>';
    } else if (chosenVariant === "warning") {
      btnClass = "bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-200";
      iconHtml = '<div class="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xl mx-auto mb-3">⚡</div>';
    } else if (chosenVariant === "info") {
      btnClass = "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200";
      iconHtml = '<div class="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl mx-auto mb-3">ℹ️</div>';
    }

    if (icon) {
      iconHtml = `<div class="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-2xl mx-auto mb-3">${icon}</div>`;
    }

    overlay.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-auto transform scale-95 transition-transform duration-200 border border-gray-100 animate-popup" role="alertdialog">
        ${iconHtml}
        <h3 id="confirm-dialog-title" class="text-base font-bold text-gray-900 text-center mb-1.5">${safe(title)}</h3>
        <p class="text-xs text-gray-600 text-center mb-6 leading-relaxed">${safe(message)}</p>
        <div class="flex gap-2.5">
          <button type="button" id="confirm-cancel-btn" class="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition active:scale-95">
            ${safe(cancelText)}
          </button>
          <button type="button" id="confirm-ok-btn" class="flex-1 py-2.5 rounded-xl text-xs font-semibold transition active:scale-95 ${btnClass}">
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
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        close(true);
      }
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
window.askConfirm = (title, message, confirmText) => confirmDialog(message, { title, confirmText });
window.showConfirmPopup = (message, confirmText) => confirmDialog(message, { confirmText });
export default confirmDialog;
