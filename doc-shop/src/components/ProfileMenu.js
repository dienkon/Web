/**
 * Custom Profile Dropdown Menu & Logout Flow for DkDocShop 2.0
 */
import { store } from "../app/state.js";
import { authService } from "../services/auth.service.js";
import { router } from "../app/router.js";
import { Routes } from "../app/constants.js";
import { confirmDialog } from "./ConfirmDialog.js";
import { toast } from "./Toast.js";
import { safe } from "../utils/sanitize.js";

class ProfileMenuManager {
  constructor() {
    this._menuEl = null;
    this._isOpen = false;
    this._init();
  }

  _init() {
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("#navbar-profile-trigger");
      const menu = e.target.closest("#custom-profile-menu");

      if (trigger) {
        e.stopPropagation();
        this.toggle();
      } else if (!menu && this._isOpen) {
        this.close();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._isOpen) {
        this.close();
      }
    });
  }

  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    const trigger = document.getElementById("navbar-profile-trigger");
    if (!trigger) return;

    const user = store.getState().auth.currentUser;
    const userData = store.getState().user.data;
    if (!user) return;

    let menu = document.getElementById("custom-profile-menu");
    if (!menu) {
      menu = document.createElement("div");
      menu.id = "custom-profile-menu";
      menu.className = "absolute right-4 top-16 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/80 py-2 z-50 transform transition-all duration-200 origin-top-right animate-popup";
      document.body.appendChild(menu);
    }
    this._menuEl = menu;

    const name = safe(userData?.name || user.displayName || user.email || "Học sinh");
    const email = safe(user.email || "");
    const className = safe(userData?.class || "Khối 12");
    const school = userData?.school ? ` • ${safe(userData.school)}` : "";
    const avatar = safe(userData?.avatar || user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100");

    const makeLink = (route, icon, label, badge = "") => `
      <button
        type="button"
        data-profile-nav="${route}"
        class="w-full px-4 py-2 text-left flex items-center justify-between text-xs text-gray-700 hover:bg-emerald-50/70 hover:text-emerald-700 transition"
      >
        <span class="flex items-center gap-2.5">
          <span class="text-sm opacity-80">${icon}</span>
          <span class="font-medium">${label}</span>
        </span>
        ${badge}
      </button>
    `;

    menu.innerHTML = `
      <!-- User Info Header -->
      <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <img src="${avatar}" alt="Avatar" class="w-10 h-10 rounded-full border border-gray-200 object-cover shrink-0" />
        <div class="overflow-hidden">
          <h4 class="text-xs font-bold text-gray-900 truncate">${name}</h4>
          <p class="text-[11px] text-gray-400 truncate">${email}</p>
          <span class="inline-block mt-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-semibold">${className}${school}</span>
        </div>
      </div>

      <!-- Nav Items -->
      <div class="py-1">
        ${makeLink(Routes.PROFILE, "👤", "Hồ sơ cá nhân")}
        ${makeLink(Routes.LIBRARY, "📚", "Thư viện của tôi")}
        ${makeLink(Routes.PURCHASED, "📥", "Tài liệu đã mua")}
        ${makeLink(Routes.FAVORITES || "favorites", "❤️", "Yêu thích")}
        ${makeLink(Routes.WALLET, "💳", "Ví của tôi")}
        ${makeLink(Routes.TRANSACTIONS || "transactions", "🧾", "Giao dịch")}
        ${makeLink(Routes.NOTIFICATIONS || "notifications", "🔔", "Thông báo")}
        ${makeLink(Routes.SETTINGS, "⚙️", "Cài đặt")}
      </div>

      <!-- Logout Action -->
      <div class="pt-1 mt-1 border-t border-gray-100">
        <button
          type="button"
          id="profile-menu-logout-btn"
          class="w-full px-4 py-2 text-left flex items-center gap-2.5 text-xs text-red-600 hover:bg-red-50 font-semibold transition"
        >
          <span class="text-sm">🚪</span>
          <span>Đăng xuất</span>
        </button>
      </div>
    `;

    // Position menu directly under trigger
    const rect = trigger.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = `${rect.bottom + 8}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;

    // Attach navigation listeners
    menu.querySelectorAll("[data-profile-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-profile-nav");
        this.close();
        router.navigate(target);
      });
    });

    // Attach logout confirmation
    menu.querySelector("#profile-menu-logout-btn")?.addEventListener("click", async () => {
      this.close();
      await this.handleLogout();
    });

    this._isOpen = true;
  }

  close() {
    if (!this._isOpen || !this._menuEl) return;
    this._menuEl.remove();
    this._isOpen = false;
  }

  async handleLogout() {
    const confirmed = await confirmDialog(
      "Bạn có chắc muốn đăng xuất khỏi DkDocShop?",
      {
        title: "Đăng xuất tài khoản?",
        confirmText: "Đăng xuất",
        cancelText: "Hủy",
        variant: "danger",
      }
    );

    if (confirmed) {
      try {
        await authService.logout();
        router.navigate(Routes.HOME);
        toast.success("Đã đăng xuất");
      } catch (err) {
        toast.error("Đăng xuất thất bại: " + (err.message || "Lỗi không xác định"));
      }
    }
  }
}

export const profileMenu = new ProfileMenuManager();
export default profileMenu;
