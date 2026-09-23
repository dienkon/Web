/**
 * ChemDex Data Editor - Raw JSON Editor (JSON Mode)
 */
import { state } from "./state.js";
import { showToast, escapeHtml } from "./utils.js";

export class RawJsonEditor {
  constructor(containerId, onApplySuccess) {
    this.container = document.getElementById(containerId);
    this.onApplySuccess = onApplySuccess;
    this.currentSymbol = null;
  }

  render(symbol) {
    if (!this.container) return;
    this.currentSymbol = symbol;
    this.container.innerHTML = "";

    if (!symbol) {
      this.container.innerHTML = `
        <div class="p-8 text-center text-slate-500 text-sm">
          Chưa có nguyên tố nào được chọn.
        </div>
      `;
      return;
    }

    const workingData = state.getWorkingCopy(symbol);
    const jsonString = workingData ? JSON.stringify(workingData, null, 2) : "{}";

    this.container.innerHTML = `
      <div class="flex flex-col h-full space-y-2">
        <!-- Toolbar -->
        <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-700/50">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-400 font-mono">
              ${escapeHtml(symbol)}: Raw JSON
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button id="raw-format-btn" class="tree-btn hover:bg-slate-700 text-slate-300">
              <i class="fa-solid fa-code text-xs"></i> Định dạng (Format)
            </button>
            <button id="raw-validate-btn" class="tree-btn hover:bg-slate-700 text-slate-300">
              <i class="fa-solid fa-check-double text-xs"></i> Kiểm tra (Validate)
            </button>
            <button id="raw-apply-btn" class="tree-btn bg-blue-600 hover:bg-blue-500 text-white font-semibold">
              <i class="fa-solid fa-check text-xs"></i> Áp dụng (Apply)
            </button>
          </div>
        </div>

        <!-- Error Banner -->
        <div id="raw-error-banner" class="hidden bg-rose-950/80 border border-rose-600/80 rounded-lg p-3 text-rose-200 text-xs font-mono"></div>

        <!-- Textarea -->
        <div class="flex-1 min-h-[400px]">
          <textarea
            id="raw-json-textarea"
            class="w-full h-full min-h-[400px] p-4 bg-slate-950 font-mono text-sm text-sky-200 rounded-lg border border-slate-700/80 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y leading-relaxed"
            spellcheck="false"
          >${escapeHtml(jsonString)}</textarea>
        </div>
      </div>
    `;

    const textarea = this.container.querySelector("#raw-json-textarea");
    const errorBanner = this.container.querySelector("#raw-error-banner");
    const formatBtn = this.container.querySelector("#raw-format-btn");
    const validateBtn = this.container.querySelector("#raw-validate-btn");
    const applyBtn = this.container.querySelector("#raw-apply-btn");

    formatBtn.onclick = () => {
      try {
        const parsed = JSON.parse(textarea.value);
        textarea.value = JSON.stringify(parsed, null, 2);
        errorBanner.classList.add("hidden");
        showToast("Đã định dạng JSON", "info");
      } catch (err) {
        errorBanner.textContent = `Lỗi cú pháp: ${err.message}`;
        errorBanner.classList.remove("hidden");
      }
    };

    validateBtn.onclick = () => {
      const err = this.validateJsonText(textarea.value);
      if (err) {
        errorBanner.textContent = err;
        errorBanner.classList.remove("hidden");
        showToast("JSON không hợp lệ", "error");
      } else {
        errorBanner.classList.add("hidden");
        showToast("Cú pháp JSON hoàn toàn hợp lệ!", "success");
      }
    };

    applyBtn.onclick = () => {
      const err = this.validateJsonText(textarea.value);
      if (err) {
        errorBanner.textContent = err;
        errorBanner.classList.remove("hidden");
        showToast("Không thể áp dụng vì JSON có lỗi cú pháp", "error");
        return;
      }

      errorBanner.classList.add("hidden");
      const parsed = JSON.parse(textarea.value);
      state.setWorkingCopyDirect(this.currentSymbol, parsed);
      showToast(`Đã cập nhật bản sao làm việc của ${this.currentSymbol} (chưa ghi Cloud)`, "success");

      if (this.onApplySuccess) {
        this.onApplySuccess(this.currentSymbol);
      }
    };
  }

  validateJsonText(text) {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") {
        return "JSON phải là một đối tượng (object).";
      }
      if (parsed.number == null || !parsed.symbol) {
        return "Cảnh báo: Dữ liệu thiếu trường bắt buộc: 'number' hoặc 'symbol'.";
      }
      return null;
    } catch (err) {
      return `Lỗi cú pháp: ${err.message}`;
    }
  }
}
