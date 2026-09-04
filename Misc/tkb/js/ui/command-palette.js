/**
 * Command Palette (Ctrl + K) UI Component
 */

import { escapeHTML, $ } from "../utils/dom.js";
import { events } from "../core/events.js";

export class CommandPaletteUI {
  constructor(store) {
    this.store = store;
    this.actions = [
      { id: "manage-slots", icon: "clock-4", label: "Quản lý mốc thời gian & ca học tùy chỉnh", run: () => events.emit("modal:open-manage-slots") },
      { id: "add-activity", icon: "plus", label: "Tạo môn học mới vào kho", run: () => events.emit("drawer:open", "drawer-add-activity") },
      { id: "focus-mode", icon: "target", label: "Bật chế độ Focus Mode (Pomodoro)", run: () => events.emit("focus:start") },
      { id: "analytics", icon: "bar-chart-2", label: "Xem phân tích & Thống kê 2.0", run: () => events.emit("modal:open", "modal-analytics") },
      { id: "export-excel", icon: "file-spreadsheet", label: "Xuất bảng Excel (SheetJS)", run: () => events.emit("backup:export-excel") },
      { id: "export-json", icon: "download", label: "Xuất sao lưu JSON đầy đủ", run: () => events.emit("backup:export-json") },
      { id: "settings", icon: "settings", label: "Mở Cài đặt hệ thống & Chẩn đoán", run: () => events.emit("modal:open", "modal-settings") },
      { id: "toggle-dark", icon: "moon", label: "Chuyển đổi giao diện Tối / Sáng", run: () => events.emit("theme:toggle-dark") },
    ];
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Keyboard shortcut: Ctrl + K
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.open();
      }
    });

    const triggerBtn = $("#btn-trigger-command-palette");
    if (triggerBtn) {
      triggerBtn.addEventListener("click", () => this.open());
    }

    const input = $("#command-palette-input");
    if (input) {
      input.addEventListener("input", (e) => {
        this.renderList(e.target.value.toLowerCase().trim());
      });
    }

    const list = $("#command-palette-list");
    if (list) {
      list.addEventListener("click", (e) => {
        const item = e.target.closest("[data-action-id]");
        if (item) {
          const id = item.dataset.actionId;
          const action = this.actions.find((a) => a.id === id);
          if (action) {
            this.close();
            action.run();
          }
        }
      });
    }

    $("#btn-close-command-palette")?.addEventListener("click", () => this.close());
  }

  open() {
    const modal = $("#modal-command-palette");
    if (!modal) return;
    modal.classList.add("active");
    this.renderList("");
    setTimeout(() => {
      const input = $("#command-palette-input");
      if (input) {
        input.value = "";
        input.focus();
      }
    }, 50);
  }

  close() {
    const modal = $("#modal-command-palette");
    if (modal) modal.classList.remove("active");
  }

  renderList(query) {
    const list = $("#command-palette-list");
    if (!list) return;

    let filtered = this.actions;
    if (query) {
      filtered = this.actions.filter((a) => a.label.toLowerCase().includes(query));
    }

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400">
          Không tìm thấy lệnh hoặc hoạt động nào phù hợp.
        </div>
      `;
      return;
    }

    list.innerHTML = filtered
      .map(
        (a) => `
        <div
          role="button"
          tabindex="0"
          data-action-id="${a.id}"
          class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition text-xs text-slate-700 dark:text-slate-200"
        >
          <div class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <i data-lucide="${a.icon}" class="w-4 h-4"></i>
          </div>
          <span class="font-medium flex-1">${escapeHTML(a.label)}</span>
          <span class="text-[10px] text-slate-400">↵</span>
        </div>
      `
      )
      .join("");

    if (typeof lucide !== "undefined") lucide.createIcons();
  }
}
