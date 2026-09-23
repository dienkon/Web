/**
 * Application Bootstrap - Upgraded for DkDocShop 2.0
 */
import { store } from "./state.js";
import { router } from "./router.js";
import { initLifecycle } from "./lifecycle.js";
import { authService } from "../services/auth.service.js";
import { DocumentService } from "../services/document.service.js";
import { PurchaseService } from "../services/purchase.service.js";
import { renderNavbar } from "../components/navbar.js";
import { renderSidebar } from "../components/sidebar.js";
import { renderBottomNav } from "../components/bottom-nav.js";
import { toastComponent } from "../components/toast.js";
import { modal } from "../components/modal.js";
import { initChatbotUI } from "../modules/chatbot/chatbot.ui.js";
import { commandPalette } from "../components/command-palette.js";
import { debounce } from "../utils/debounce.js";
import { copyText } from "../utils/clipboard.js";
import { renderGrid } from "../modules/home/home.view.js";
import { Routes } from "./constants.js";
import { notificationService } from "../services/notification.service.js";
import { initSeedData } from "../data/seed/index.js";

export const bootstrap = () => {
  // 0. Initialize realistic seed data if empty
  initSeedData(store);

  // 1. Initialize Theme from store
  const currentTheme = store.getState().theme || "light";
  document.documentElement.setAttribute("data-theme", currentTheme);

  // 2. Initialize Command Palette (Ctrl + K)
  commandPalette.init();

  // 3. Initialize Toast container
  toastComponent;

  // 4. Initialize Lifecycle (online/offline)
  initLifecycle();

  // 5. Initialize Chatbot Widget
  initChatbotUI();

  // 6. Register Service Worker for PWA
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  // 7. Mobile Drawer handlers
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("mobile-sidebar-overlay");

  const openSidebar = () => {
    sidebar?.classList.remove("-translate-x-full");
    overlay?.classList.remove("hidden");
  };

  const closeSidebar = () => {
    sidebar?.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");
  };

  document.addEventListener("click", (e) => {
    if (e.target.closest("#mobile-menu-btn")) {
      openSidebar();
    } else if (e.target.closest("#mobile-sidebar-overlay") || e.target.closest("#sidebar-close-btn")) {
      closeSidebar();
    }
  });

  // Global backward compatibility bindings
  window.loginGoogleUI = () => authService.loginGoogle();
  window.logout = () => authService.logout();
  window.buyDocument = async (id) => {
    try {
      await PurchaseService.purchaseDocument(id);
    } catch (err) {
      notificationService.error(err.message || "Giao dịch không thành công.");
    }
  };
  window.shareDoc = async (id) => {
    const url = `${window.location.origin}${window.location.pathname}#/document/${id}`;
    const ok = await copyText(url);
    if (ok) notificationService.success("Đã copy link tài liệu!");
  };
  window.setDocTagFilter = (tag) => {
    store.setDocumentFilter(tag);
    router.navigate(Routes.HOME);
    renderGrid();
  };

  // Wire Global Search Input in Navbar
  document.addEventListener(
    "input",
    debounce((e) => {
      if (e.target.id === "global-search") {
        const query = e.target.value.trim();
        store.setDocumentFilter(store.getState().documents.filter, query);
        if (router.currentRoute === Routes.HOME) {
          renderGrid();
        } else {
          router.navigate(Routes.HOME);
        }
      }
    }, 200),
  );

  // Subscribe Navbar and Sidebar to Auth/User/Theme changes
  store.subscribe("auth", () => {
    renderNavbar();
    renderSidebar(router.currentRoute);
  });

  store.subscribe("user", () => {
    renderNavbar();
    renderSidebar(router.currentRoute);
  });

  store.subscribe("theme", (newTheme) => {
    document.documentElement.setAttribute("data-theme", newTheme);
    renderNavbar();
  });

  // Check initial token if defined
  if (typeof window.__initial_auth_token !== "undefined") {
    authService.loginCustomToken(window.__initial_auth_token);
  }

  // Initialize Auth state listener
  authService.initAuthListener(() => {
    router.init();
  });
};

