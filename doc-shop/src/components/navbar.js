/**
 * Header / Navbar Component - Upgraded for DkDocShop 2.0
 */
import { store } from "../app/state.js";
import { formatVND } from "../utils/format.js";
import { safe } from "../utils/sanitize.js";
import { authService } from "../services/auth.service.js";
import { notificationCenter } from "./notification-center.js";
import { commandPalette } from "./command-palette.js";
import { profileMenu } from "./ProfileMenu.js";

export const renderNavbar = () => {
  const host = document.getElementById("main-header");
  if (!host) return;

  const state = store.getState();
  const user = state.auth.currentUser;
  const userData = state.user.data;
  const theme = state.theme || "light";
  const unreadCount = state.notifications.unreadCount || 0;

  let authSectionHtml = "";

  if (!user || !userData) {
    authSectionHtml = `
      <button
        id="navbar-login-btn"
        class="bg-emerald-600 text-white hover:bg-emerald-700 px-3 sm:px-5 py-2 rounded-full font-bold text-xs shadow-sm transition flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
      >
        <i class="fa-solid fa-right-to-bracket text-xs"></i>
        <span>Đăng nhập</span>
      </button>
    `;
  } else {
    authSectionHtml = `
      <div
        class="flex items-center bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-full px-2.5 sm:px-3.5 py-1.5 cursor-pointer transition shrink-0"
        data-nav="wallet"
      >
        <i class="fa-solid fa-wallet text-emerald-600 text-xs mr-1.5 hidden sm:inline"></i>
        <span class="text-xs text-gray-500 mr-1.5 hidden md:inline">Ví:</span>
        <span class="font-black text-emerald-700 text-xs font-mono">${formatVND(userData.walletBalance)}</span>
      </div>

      <div
        id="navbar-profile-trigger"
        class="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-gray-100 transition relative shrink-0"
        title="Tài khoản & Cài đặt"
      >
        <div class="text-right hidden md:block">
          <p class="text-xs font-bold text-gray-800 leading-tight">
            ${safe(userData.name || user.email)}
          </p>
          <p class="text-[10px] text-gray-400 mt-0.5">${safe(userData.class || "Khối 12")}</p>
        </div>
        <img
          src="${safe(userData.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100")}"
          alt="Avatar"
          class="w-8 h-8 rounded-full border border-gray-200 object-cover"
        />
      </div>
    `;
  }

  host.innerHTML = `
    <div class="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 mr-2">
      <button
        id="mobile-menu-btn"
        class="md:hidden text-gray-600 hover:text-emerald-600 focus:outline-none p-1.5 rounded-lg text-base shrink-0 cursor-pointer"
        aria-label="Mở menu"
      >
        <i class="fa-solid fa-bars"></i>
      </button>

      <!-- Search & Command Palette Trigger -->
      <button
        data-action="open-command-palette"
        class="flex items-center justify-between flex-1 max-w-[200px] sm:max-w-sm px-3 sm:px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-400 focus:outline-none shadow-xs transition-all text-left cursor-pointer min-w-0"
      >
        <div class="flex items-center gap-2 min-w-0 overflow-hidden">
          <i class="fa-solid fa-magnifying-glass text-gray-400 shrink-0 text-xs"></i>
          <span class="truncate">Tìm tài liệu...</span>
        </div>
        <kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] text-gray-500 bg-white rounded border border-gray-200 font-mono shrink-0">Ctrl K</kbd>
      </button>
    </div>

    <!-- Right Controls: Theme toggle, Notifications, Auth -->
    <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0" id="header-user-info">
      <!-- Theme Toggle -->
      <button
        id="navbar-theme-toggle"
        class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-gray-600 hover:bg-gray-100 transition text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
        title="Đổi chế độ Sáng / Tối"
      >
        ${theme === "dark" ? '<i class="fa-solid fa-sun text-amber-500"></i>' : '<i class="fa-solid fa-moon text-gray-600"></i>'}
      </button>

      <!-- Notification Bell -->
      <div class="relative shrink-0">
        <button
          id="navbar-notif-btn"
          class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-gray-600 hover:bg-gray-100 transition text-xs sm:text-sm flex items-center justify-center relative cursor-pointer"
          title="Thông báo"
        >
          <i class="fa-solid fa-bell text-gray-600"></i>
          ${unreadCount > 0 ? `
            <span class="absolute top-0.5 right-0.5 w-4 h-4 bg-emerald-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              ${unreadCount}
            </span>
          ` : ''}
        </button>
      </div>

      ${authSectionHtml}
    </div>
  `;

  // Attach handlers
  host.querySelector("#navbar-login-btn")?.addEventListener("click", () => {
    authService.loginGoogle();
  });

  host.querySelector("#navbar-theme-toggle")?.addEventListener("click", () => {
    const current = store.getState().theme;
    store.setTheme(current === "dark" ? "light" : "dark");
    renderNavbar();
  });

  host.querySelector("#navbar-notif-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    notificationCenter.toggle();
  });
};
