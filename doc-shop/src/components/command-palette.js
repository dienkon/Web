/**
 * Global Command Palette (Ctrl + K) Component
 */
import { Routes } from "../app/constants.js";
import { store } from "../app/state.js";
import { escapeHtml } from "../utils/sanitize.js";

class CommandPalette {
  constructor() {
    this.isOpen = false;
    this.selectedIndex = 0;
    this.actions = [
      { id: "dash", title: "Mở Góc học tập (Dashboard)", category: "Học tập", icon: "📊", route: Routes.DASHBOARD },
      { id: "lib", title: "Mở Thư viện tài liệu", category: "Tài liệu", icon: "📚", route: Routes.LIBRARY },
      { id: "notes", title: "Mở Sổ tay ghi chú", category: "Học tập", icon: "📝", route: Routes.NOTES },
      { id: "flash", title: "Ôn tập Flashcards (Spaced Repetition)", category: "Học tập", icon: "🧠", route: Routes.FLASHCARDS },
      { id: "quiz", title: "Thi thử & Luyện đề trắc nghiệm", category: "Học tập", icon: "🎯", route: Routes.QUIZ },
      { id: "plan", title: "Kế hoạch học tập & Đếm ngược kỳ thi", category: "Học tập", icon: "📅", route: Routes.STUDY_PLAN },
      { id: "ai", title: "Trợ lý DkAI - Gia sư thông minh", category: "AI", icon: "🤖", route: Routes.AI },
      { id: "wallet", title: "Mở Ví & Nạp tiền", category: "Tài khoản", icon: "💳", route: Routes.WALLET },
      { id: "achieve", title: "Xem Thành tích & Bảng xếp hạng", category: "Học tập", icon: "🏆", route: Routes.ACHIEVEMENTS },
      { id: "settings", title: "Cài đặt & Giao diện Sáng/Tối", category: "Hệ thống", icon: "⚙️", route: Routes.SETTINGS },
      { id: "theme_toggle", title: "Đổi chế độ Sáng / Tối (Dark Mode)", category: "Hệ thống", icon: "🌓", action: "toggle_theme" },
      { id: "admin", title: "Bảng điều khiển Quản trị viên", category: "Quản trị", icon: "🛡️", route: Routes.ADMIN, adminOnly: true },
    ];
  }

  init() {
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.toggle();
      } else if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });

    document.addEventListener("click", (e) => {
      if (e.target.closest('[data-action="open-command-palette"]')) {
        e.preventDefault();
        this.open();
      }
    });
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.selectedIndex = 0;
    this.render();
  }

  close() {
    this.isOpen = false;
    const el = document.getElementById("cmd-palette-modal");
    if (el) el.remove();
  }

  getFilteredActions(query = "") {
    const q = query.toLowerCase().trim();
    const user = store.getState().auth.currentUser;
    const userData = store.getState().user.data;
    const isAdmin = userData?.role === "admin" || userData?.isAdmin === true;

    return this.actions.filter((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (!q) return true;
      return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    });
  }

  execute(action) {
    this.close();
    if (action.action === "toggle_theme") {
      const current = store.getState().theme;
      store.setTheme(current === "dark" ? "light" : "dark");
      return;
    }
    if (action.route) {
      window.location.hash = `#/${action.route}`;
    }
  }

  render() {
    let modalEl = document.getElementById("cmd-palette-modal");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "cmd-palette-modal";
      modalEl.className = "cmd-palette-backdrop animate-popup";
      document.body.appendChild(modalEl);
    }

    const filtered = this.getFilteredActions("");

    modalEl.innerHTML = `
      <div class="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[75vh]" onclick="event.stopPropagation()">
        <!-- Header Search Input -->
        <div class="p-4 border-b border-gray-200 flex items-center gap-3">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input id="cmd-input" type="text" placeholder="Tìm kiếm nhanh hoặc điều hướng... (ESC để đóng)" class="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none" autocomplete="off" autofocus />
          <kbd class="px-2 py-0.5 text-xs text-gray-500 bg-gray-100 rounded border border-gray-300">ESC</kbd>
        </div>

        <!-- Action Items List -->
        <div id="cmd-list" class="flex-1 overflow-y-auto p-2 space-y-1">
          ${this.renderItemsList(filtered)}
        </div>

        <!-- Footer -->
        <div class="px-4 py-2.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span>↑↓ để di chuyển</span>
            <span>↵ để chọn</span>
          </div>
          <span class="font-medium text-emerald-600">DkDocShop 2.0</span>
        </div>
      </div>
    `;

    const input = modalEl.querySelector("#cmd-input");
    input?.focus();

    input?.addEventListener("input", (e) => {
      const q = e.target.value;
      const list = this.getFilteredActions(q);
      const listEl = modalEl.querySelector("#cmd-list");
      if (listEl) {
        listEl.innerHTML = this.renderItemsList(list);
      }
    });

    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) this.close();
      const itemBtn = e.target.closest("[data-cmd-id]");
      if (itemBtn) {
        const actionId = itemBtn.dataset.cmdId;
        const act = this.actions.find(a => a.id === actionId);
        if (act) this.execute(act);
      }
    });
  }

  renderItemsList(items) {
    if (!items.length) {
      return `<div class="p-6 text-center text-sm text-gray-400">Không tìm thấy lệnh hoặc trang nào</div>`;
    }
    return items.map((item, idx) => `
      <button data-cmd-id="${item.id}" class="w-full text-left flex items-center justify-between p-3 rounded-xl hover:bg-emerald-50/80 transition-colors group">
        <div class="flex items-center gap-3">
          <span class="text-xl p-2 bg-gray-100 rounded-lg group-hover:bg-white">${item.icon}</span>
          <div>
            <div class="text-sm font-medium text-gray-800 group-hover:text-emerald-700">${escapeHtml(item.title)}</div>
            <div class="text-xs text-gray-400">${escapeHtml(item.category)}</div>
          </div>
        </div>
        <span class="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Nhấn để mở →</span>
      </button>
    `).join("");
  }
}

export const commandPalette = new CommandPalette();
