/**
 * ChemDex Data Editor Utilities
 */

export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(obj);
    } catch {
      // Fallback
    }
  }
  return JSON.parse(JSON.stringify(obj));
}

export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getType(val) {
  if (val === null) return "null";
  if (Array.isArray(val)) return "array";
  return typeof val;
}

export function sanitizeHtml(html) {
  if (!html) return "";
  // Strip harmful script tags and on* attributes
  let clean = String(html)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
  return clean;
}

export function showToast(message, type = "info", duration = 3500) {
  let container = document.getElementById("de-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "de-toast-container";
    container.className = "de-toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `de-toast toast-${type}`;

  let iconHtml = '<i class="fa-solid fa-circle-info text-blue-400"></i>';
  if (type === "success") iconHtml = '<i class="fa-solid fa-circle-check text-emerald-400"></i>';
  else if (type === "warning") iconHtml = '<i class="fa-solid fa-triangle-exclamation text-amber-400"></i>';
  else if (type === "error") iconHtml = '<i class="fa-solid fa-circle-xmark text-rose-400"></i>';

  toast.innerHTML = `
    ${iconHtml}
    <span class="flex-1 text-sm">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showConfirmModal({
  title = "Xác nhận",
  message = "Bạn có chắc chắn muốn thực hiện thao tác này?",
  confirmText = "Đồng ý",
  cancelText = "Hủy",
  isDanger = false,
  onConfirm = () => {},
  onCancel = () => {},
}) {
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in";
  overlay.innerHTML = `
    <div class="bg-slate-900 border border-slate-700/80 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
      <h3 class="text-lg font-bold text-white flex items-center gap-2">
        <i class="fa-solid ${isDanger ? "fa-triangle-exclamation text-rose-500" : "fa-circle-question text-blue-400"}"></i>
        ${escapeHtml(title)}
      </h3>
      <p class="text-slate-300 text-sm leading-relaxed">${escapeHtml(message)}</p>
      <div class="flex items-center justify-end gap-3 pt-2">
        <button id="modal-cancel-btn" class="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
          ${escapeHtml(cancelText)}
        </button>
        <button id="modal-confirm-btn" class="px-4 py-2 rounded-lg text-sm font-medium ${
          isDanger ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
        } transition-colors">
          ${escapeHtml(confirmText)}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
  };

  overlay.querySelector("#modal-cancel-btn").onclick = () => {
    close();
    onCancel();
  };
  overlay.querySelector("#modal-confirm-btn").onclick = () => {
    close();
    onConfirm();
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      close();
      onCancel();
    }
  };
}

export function showPromptModal({
  title = "Nhập dữ liệu",
  message = "Vui lòng nhập giá trị:",
  defaultValue = "",
  placeholder = "",
  typeOptions = null, // array of { label, value } if user also picks a type
  onConfirm = () => {},
  onCancel = () => {},
}) {
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in";

  let typeSelectHtml = "";
  if (typeOptions && Array.isArray(typeOptions)) {
    const optionsHtml = typeOptions
      .map((opt) => `<option value="${opt.value}">${escapeHtml(opt.label)}</option>`)
      .join("");
    typeSelectHtml = `
      <div class="mt-3">
        <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Kiểu dữ liệu (Type)</label>
        <select id="modal-prompt-type" class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none">
          ${optionsHtml}
        </select>
      </div>
    `;
  }

  overlay.innerHTML = `
    <div class="bg-slate-900 border border-slate-700/80 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
      <h3 class="text-lg font-bold text-white flex items-center gap-2">
        <i class="fa-solid fa-keyboard text-blue-400"></i>
        ${escapeHtml(title)}
      </h3>
      <p class="text-slate-300 text-sm">${escapeHtml(message)}</p>
      <div>
        <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Tên trường (Key)</label>
        <input type="text" id="modal-prompt-input" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(placeholder)}" class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
      </div>
      ${typeSelectHtml}
      <div class="flex items-center justify-end gap-3 pt-2">
        <button id="prompt-cancel-btn" class="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
          Hủy
        </button>
        <button id="prompt-confirm-btn" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors">
          Xác nhận
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const input = overlay.querySelector("#modal-prompt-input");
  input.focus();
  input.select();

  const close = () => {
    overlay.remove();
  };

  const handleConfirm = () => {
    const val = input.value.trim();
    if (!val) {
      input.classList.add("border-rose-500");
      return;
    }
    const typeSelect = overlay.querySelector("#modal-prompt-type");
    const selectedType = typeSelect ? typeSelect.value : null;
    close();
    onConfirm(val, selectedType);
  };

  overlay.querySelector("#prompt-cancel-btn").onclick = () => {
    close();
    onCancel();
  };
  overlay.querySelector("#prompt-confirm-btn").onclick = handleConfirm;
  input.onkeydown = (e) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") {
      close();
      onCancel();
    }
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      close();
      onCancel();
    }
  };
}

export function showUnsavedChangeDialog({
  symbol,
  onKeepEditing = () => {},
  onDiscard = () => {},
  onSaveAndSwitch = () => {},
}) {
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black/75 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-fade-in";
  overlay.innerHTML = `
    <div class="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
      <div class="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <div>
        <h3 class="text-lg font-bold text-white">Bạn có thay đổi chưa lưu trên ${escapeHtml(symbol)}</h3>
        <p class="text-slate-400 text-xs mt-1 leading-relaxed">
          Bạn vừa thực hiện chỉnh sửa nội dung nguyên tố này nhưng chưa lưu lên đám mây. Bạn muốn làm gì trước khi chuyển sang nguyên tố khác?
        </p>
      </div>
      <div class="flex flex-col gap-2 pt-2">
        <button id="unsaved-save-switch-btn" class="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <span>Lưu rồi chuyển</span>
        </button>
        <button id="unsaved-discard-btn" class="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 transition-all">
          Bỏ thay đổi
        </button>
        <button id="unsaved-keep-btn" class="w-full py-2 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors">
          Tiếp tục chỉnh sửa
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.querySelector("#unsaved-save-switch-btn").onclick = () => {
    close();
    onSaveAndSwitch();
  };
  overlay.querySelector("#unsaved-discard-btn").onclick = () => {
    close();
    onDiscard();
  };
  overlay.querySelector("#unsaved-keep-btn").onclick = () => {
    close();
    onKeepEditing();
  };
}

