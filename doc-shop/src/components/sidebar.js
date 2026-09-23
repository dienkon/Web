/**
 * Sidebar Navigation Component for DkDocShop 2.0
 * Pure Shop & Library focus
 */
import { store } from "../app/state.js";
import { authService } from "../services/auth.service.js";
import { router } from "../app/router.js";
import { Routes } from "../app/constants.js";
import { confirmDialog } from "./ConfirmDialog.js";
import { toast } from "./toast.js";

export const renderSidebar = (activeRoute = Routes.HOME) => {
  const sidebar = document.getElementById("sidebar");
  const menu = document.getElementById("nav-menu");
  const authSec = document.getElementById("sidebar-auth-section");
  if (!sidebar || !menu || !authSec) return;

  const user = store.getState().auth.currentUser;
  const userData = store.getState().user.data;

  const makeItem = (route, iconHtml, label, badge = null) => {
    const isActive = activeRoute === route;
    const activeClasses = "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-xs";
    const inactiveClasses = "text-gray-600 hover:bg-gray-50 hover:text-gray-900";

    return `
      <button
        type="button"
        data-nav="${route}"
        class="w-full text-left px-3.5 py-2.5 rounded-2xl flex items-center justify-between transition cursor-pointer ${isActive ? activeClasses : inactiveClasses}"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-5 text-center text-sm shrink-0 flex items-center justify-center">${iconHtml}</span>
          <span class="text-xs font-semibold truncate">${label}</span>
        </div>
        ${badge || ""}
      </button>
    `;
  };

  if (!user) {
    menu.innerHTML = `
      <div class="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cửa hàng & Dịch vụ</div>
      ${makeItem(Routes.HOME, '<i class="fa-solid fa-store text-emerald-600"></i>', "Cửa hàng tài liệu")}
      ${makeItem(Routes.EXPLORE, '<i class="fa-solid fa-compass text-teal-600"></i>', "Khám phá danh mục")}
      ${makeItem(Routes.BUNDLES, '<i class="fa-solid fa-boxes-stacked text-amber-500"></i>', "Combo tài liệu")}
      ${makeItem(Routes.AI, '<i class="fa-solid fa-wand-magic-sparkles text-indigo-500"></i>', "Trợ lý DkAI")}
    `;

    authSec.innerHTML = `
      <button
        id="sidebar-login-btn"
        class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm transition active:scale-95 cursor-pointer"
      >
        <i class="fa-solid fa-right-to-bracket"></i>
        <span>Đăng nhập Google</span>
      </button>
    `;

    authSec.querySelector("#sidebar-login-btn")?.addEventListener("click", () => {
      authService.loginGoogle();
    });
    return;
  }

  let html = "";

  if (authService.requiresProfileCompletion()) {
    html += `
      <div class="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
        <p class="font-bold flex items-center gap-1 mb-0.5">
          <i class="fa-solid fa-triangle-exclamation text-amber-600"></i> Cần hoàn tất hồ sơ
        </p>
        Cập nhật Họ tên & Lớp để mở khóa đầy đủ tính năng.
      </div>
      ${makeItem(Routes.PROFILE, '<i class="fa-solid fa-user-pen text-amber-600"></i>', "Hoàn tất hồ sơ", '<span class="w-2 h-2 rounded-full bg-amber-500"></span>')}
    `;
  }

  // Section 1: Shop & Explore
  html += `
    <div class="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cửa hàng & Tìm kiếm</div>
    ${makeItem(Routes.HOME, '<i class="fa-solid fa-store text-emerald-600"></i>', "Cửa hàng tài liệu")}
    ${makeItem(Routes.EXPLORE, '<i class="fa-solid fa-compass text-teal-600"></i>', "Khám phá danh mục")}
    ${makeItem(Routes.BUNDLES, '<i class="fa-solid fa-boxes-stacked text-amber-500"></i>', "Combo tài liệu")}
    ${makeItem(Routes.AI, '<i class="fa-solid fa-wand-magic-sparkles text-indigo-500"></i>', "Trợ lý DkAI")}

    <div class="my-2.5 border-t border-gray-100"></div>
    <div class="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Thư viện & Cá nhân</div>
    ${makeItem(Routes.LIBRARY, '<i class="fa-solid fa-book-bookmark text-blue-600"></i>', "Thư viện của tôi")}
    ${makeItem(Routes.PURCHASED, '<i class="fa-solid fa-bag-shopping text-emerald-600"></i>', "Tài liệu đã mua")}
    ${makeItem(Routes.FAVORITES, '<i class="fa-solid fa-heart text-red-500"></i>', "Yêu thích")}
    ${makeItem(Routes.NOTES, '<i class="fa-solid fa-note-sticky text-amber-500"></i>', "Sổ tay ghi chú")}
    ${makeItem(Routes.WALLET, '<i class="fa-solid fa-wallet text-emerald-600"></i>', "Ví của tôi")}
    ${makeItem(Routes.TRANSACTIONS, '<i class="fa-solid fa-receipt text-gray-500"></i>', "Lịch sử giao dịch")}
    ${makeItem(Routes.PROFILE, '<i class="fa-solid fa-user text-gray-600"></i>', "Hồ sơ cá nhân")}
    ${makeItem(Routes.SETTINGS, '<i class="fa-solid fa-gear text-gray-500"></i>', "Cài đặt & Giao diện")}
  `;

  if (userData?.role === "admin" || userData?.isAdmin === true) {
    html += `
      <div class="my-2.5 border-t border-gray-100"></div>
      <div class="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quản trị</div>
      ${makeItem(Routes.ADMIN, '<i class="fa-solid fa-shield-halved text-emerald-600"></i>', "Admin CMS", '<span class="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded uppercase">Admin</span>')}
    `;
  }

  menu.innerHTML = html;

  authSec.innerHTML = `
    <button
      id="sidebar-logout-btn"
      class="w-full text-red-600 hover:bg-red-50 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition cursor-pointer active:scale-95"
    >
      <i class="fa-solid fa-arrow-right-from-bracket"></i>
      <span>Đăng xuất</span>
    </button>
  `;

  authSec.querySelector("#sidebar-logout-btn")?.addEventListener("click", async () => {
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
      await authService.logout();
      router.navigate(Routes.HOME);
      toast.success("Đã đăng xuất");
    }
  });
};

export default renderSidebar;
