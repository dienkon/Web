/**
 * In-App Notification Center Component
 */
import { store } from "../app/state.js";
import { escapeHtml } from "../utils/sanitize.js";
import { formatDate } from "../utils/date.js";

class NotificationCenter {
  constructor() {
    this.isOpen = false;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.render();
  }

  close() {
    this.isOpen = false;
    const el = document.getElementById("notification-dropdown");
    if (el) el.remove();
  }

  markAllRead() {
    const notifications = store.getState().notifications.items.map(n => ({ ...n, read: true }));
    store.setNotifications(notifications);
    this.render();
  }

  render() {
    let dropdown = document.getElementById("notification-dropdown");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.id = "notification-dropdown";
      dropdown.className = "absolute right-0 top-14 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-popup";
      const headerRight = document.querySelector("#main-header .flex.items-center.gap-3");
      if (headerRight) {
        headerRight.classList.add("relative");
        headerRight.appendChild(dropdown);
      } else {
        document.body.appendChild(dropdown);
      }
    }

    const { items, unreadCount } = store.getState().notifications;

    dropdown.innerHTML = `
      <div class="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div class="flex items-center gap-2">
          <h4 class="font-bold text-sm text-gray-900">Thông báo</h4>
          ${unreadCount > 0 ? `<span class="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 font-semibold rounded-full">${unreadCount} mới</span>` : ''}
        </div>
        <div class="flex items-center gap-2">
          <button id="notif-mark-read" class="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Đánh dấu đã đọc</button>
          <button id="notif-close" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      </div>

      <div class="max-h-80 overflow-y-auto divide-y divide-gray-100">
        ${items.length === 0 ? `
          <div class="p-8 text-center text-sm text-gray-400">
            <span class="text-3xl block mb-2">🔔</span>
            Bạn chưa có thông báo nào
          </div>
        ` : items.map((item) => `
          <div class="p-3.5 hover:bg-gray-50 transition-colors flex gap-3 ${item.read ? 'opacity-70' : 'bg-emerald-50/20'}">
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${this.getIconBg(item.type)}">
              ${this.getIcon(item.type)}
            </div>
            <div class="flex-1">
              <div class="text-xs font-semibold text-gray-900">${escapeHtml(item.title)}</div>
              <div class="text-xs text-gray-600 mt-0.5">${escapeHtml(item.message)}</div>
              <div class="text-[10px] text-gray-400 mt-1">${formatDate(item.timestamp || Date.now())}</div>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
        <span class="text-xs text-gray-400">Tự động cập nhật tức thời</span>
      </div>
    `;

    dropdown.querySelector("#notif-close")?.addEventListener("click", () => this.close());
    dropdown.querySelector("#notif-mark-read")?.addEventListener("click", () => this.markAllRead());
  }

  getIcon(type) {
    switch (type) {
      case "purchase": return "🛍️";
      case "wallet": return "💰";
      case "exam": return "⏳";
      case "achievement": return "🏆";
      case "system": return "📢";
      default: return "📌";
    }
  }

  getIconBg(type) {
    switch (type) {
      case "purchase": return "bg-blue-100 text-blue-600";
      case "wallet": return "bg-emerald-100 text-emerald-600";
      case "exam": return "bg-amber-100 text-amber-600";
      case "achievement": return "bg-purple-100 text-purple-600";
      default: return "bg-gray-100 text-gray-600";
    }
  }
}

export const notificationCenter = new NotificationCenter();
