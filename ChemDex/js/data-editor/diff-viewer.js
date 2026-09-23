/**
 * ChemDex Data Editor - Diff Viewer
 */
import { state } from "./state.js";
import { escapeHtml } from "./utils.js";

export class DiffViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  calculateDiff(original, working, path = "") {
    let differences = [];

    if (original === working) return differences;

    const isOrigObj = original !== null && typeof original === "object";
    const isWorkObj = working !== null && typeof working === "object";

    if (!isOrigObj || !isWorkObj) {
      if (original !== working) {
        differences.push({
          type: original === undefined ? "added" : working === undefined ? "removed" : "modified",
          path: path || "(root)",
          oldVal: original === undefined ? "(none)" : JSON.stringify(original),
          newVal: working === undefined ? "(deleted)" : JSON.stringify(working),
        });
      }
      return differences;
    }

    const allKeys = new Set([...Object.keys(original || {}), ...Object.keys(working || {})]);

    allKeys.forEach((k) => {
      const currentPath = path ? `${path}.${k}` : k;
      const oldVal = original ? original[k] : undefined;
      const newVal = working ? working[k] : undefined;

      if (oldVal === undefined) {
        differences.push({
          type: "added",
          path: currentPath,
          oldVal: "(none)",
          newVal: JSON.stringify(newVal),
        });
      } else if (newVal === undefined) {
        differences.push({
          type: "removed",
          path: currentPath,
          oldVal: JSON.stringify(oldVal),
          newVal: "(deleted)",
        });
      } else if (typeof oldVal !== typeof newVal || Array.isArray(oldVal) !== Array.isArray(newVal)) {
        differences.push({
          type: "modified",
          path: currentPath,
          oldVal: JSON.stringify(oldVal),
          newVal: JSON.stringify(newVal),
        });
      } else if (typeof oldVal === "object" && oldVal !== null) {
        differences = differences.concat(this.calculateDiff(oldVal, newVal, currentPath));
      } else if (oldVal !== newVal) {
        differences.push({
          type: "modified",
          path: currentPath,
          oldVal: JSON.stringify(oldVal),
          newVal: JSON.stringify(newVal),
        });
      }
    });

    return differences;
  }

  render(symbol) {
    if (!this.container) return;
    this.container.innerHTML = "";

    if (!symbol) {
      this.container.innerHTML = `
        <div class="p-8 text-center text-slate-500 text-sm">
          Chưa chọn nguyên tố để so sánh.
        </div>
      `;
      return;
    }

    const orig = state.getOriginalSnapshot(symbol);
    const work = state.getWorkingCopy(symbol);
    const diffs = this.calculateDiff(orig, work);

    if (diffs.length === 0) {
      this.container.innerHTML = `
        <div class="p-8 text-center text-slate-400 space-y-2">
          <i class="fa-solid fa-circle-check text-emerald-400 text-3xl"></i>
          <p class="font-medium text-slate-200">Không có thay đổi nào</p>
          <p class="text-xs text-slate-500">Dữ liệu bản sao làm việc đang trùng khớp 100% với bản lưu ban đầu.</p>
        </div>
      `;
      return;
    }

    const addedCount = diffs.filter((d) => d.type === "added").length;
    const modCount = diffs.filter((d) => d.type === "modified").length;
    const delCount = diffs.filter((d) => d.type === "removed").length;

    let rowsHtml = diffs
      .map((d) => {
        let tagHtml = "";
        let borderClass = "";
        if (d.type === "added") {
          tagHtml = '<span class="text-emerald-400 font-bold">+ THÊM</span>';
          borderClass = "diff-added";
        } else if (d.type === "modified") {
          tagHtml = '<span class="text-amber-400 font-bold">~ SỬA</span>';
          borderClass = "diff-modified";
        } else {
          tagHtml = '<span class="text-rose-400 font-bold">- XÓA</span>';
          borderClass = "diff-removed";
        }

        return `
          <div class="diff-row ${borderClass}">
            <div class="diff-path flex items-center gap-1.5">
              ${tagHtml}
              <span class="truncate" title="${escapeHtml(d.path)}">${escapeHtml(d.path)}</span>
            </div>
            <div class="diff-original">${escapeHtml(d.oldVal)}</div>
            <div class="diff-working">${escapeHtml(d.newVal)}</div>
          </div>
        `;
      })
      .join("");

    this.container.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between p-2 bg-slate-800/60 rounded-lg text-xs font-mono">
          <span class="text-slate-300 font-bold">${escapeHtml(symbol)}: ${diffs.length} thay đổi</span>
          <div class="flex items-center gap-3">
            <span class="text-emerald-400">+${addedCount} thêm</span>
            <span class="text-amber-400">~${modCount} sửa</span>
            <span class="text-rose-400">-${delCount} xóa</span>
          </div>
        </div>

        <div class="border border-slate-700/80 rounded-lg overflow-hidden bg-slate-950/60">
          <div class="diff-row diff-row-header">
            <div>Đường dẫn (Path)</div>
            <div>Bản gốc (Original)</div>
            <div>Hiện tại (Working)</div>
          </div>
          <div class="max-h-[500px] overflow-y-auto divide-y divide-slate-800/40">
            ${rowsHtml}
          </div>
        </div>
      </div>
    `;
  }
}
