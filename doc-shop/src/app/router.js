/**
 * Lightweight SPA Hash Router - Upgraded for DkDocShop 2.0
 */
import { Routes } from "./constants.js";
import { store } from "./state.js";
import { authService } from "../services/auth.service.js";
import { renderSidebar } from "../components/sidebar.js";
import { renderNavbar } from "../components/navbar.js";
import { renderBottomNav } from "../components/bottom-nav.js";
import { renderLandingView } from "../modules/landing/landing.view.js";
import { renderHomeView } from "../modules/home/home.view.js";
import { renderExploreView } from "../modules/explore/explore.view.js";
import { renderFavoritesView } from "../modules/favorites/favorites.view.js";
import { renderBundlesView } from "../modules/bundles/bundles.view.js";
import { renderDocDetailView } from "../modules/documents/detail.view.js";
import { renderProfileView } from "../modules/profile/profile.view.js";
import { renderWalletView } from "../modules/wallet/wallet.view.js";
import { renderPurchasedView } from "../modules/purchased/purchased.view.js";
import { renderAdminView } from "../modules/admin/admin.view.js";
import { renderDashboardView } from "../modules/dashboard/dashboard.view.js";
import { renderLibraryView } from "../modules/library/library.view.js";
import { renderNotesView } from "../modules/notes/notes.view.js";
import { renderFlashcardsView } from "../modules/flashcards/flashcards.view.js";
import { renderQuizView } from "../modules/quiz/quiz.view.js";
import { renderStudyPlanView } from "../modules/study-plan/study-plan.view.js";
import { renderAIView } from "../modules/ai/ai.view.js";
import { renderGamificationView } from "../modules/gamification/gamification.view.js";
import { renderSellerView } from "../modules/seller/seller.view.js";
import { renderSettingsView } from "../modules/settings/settings.view.js";
import { modal } from "../components/modal.js";
import { DocumentService } from "../services/document.service.js";
import { gamificationService } from "../services/gamification.service.js";

class Router {
  constructor() {
    this.currentRoute = null;
    this.currentParams = null;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    window.addEventListener("hashchange", () => this.handleRouting());
    // Delegate clicks across the app
    document.addEventListener("click", (e) => {
      const docCard = e.target.closest('[data-action="view-doc"]');
      if (docCard && docCard.dataset.docId) {
        e.preventDefault();
        this.navigate(Routes.DOCUMENT_DETAIL, docCard.dataset.docId);
        return;
      }

      const navBtn = e.target.closest("[data-nav]");
      if (navBtn) {
        e.preventDefault();
        const route = navBtn.dataset.nav;
        const params = navBtn.dataset.navParams || "";
        this.navigate(route, params);
        return;
      }
    });

    // Handle legacy ?doc=ID link parameter check
    const searchParams = new URLSearchParams(window.location.search);
    const legacyDocId = searchParams.get("doc");
    if (legacyDocId) {
      window.location.hash = `#/document/${encodeURIComponent(legacyDocId)}`;
      return;
    }

    this.handleRouting();
  }

  navigate(route, params = "") {
    let targetHash = "";
    if ((route === Routes.DOCUMENT_DETAIL || route === "document" || route === "doc-detail") && params) {
      targetHash = `#/document/${encodeURIComponent(params)}`;
    } else {
      targetHash = params ? `#/${route}/${encodeURIComponent(params)}` : `#/${route}`;
    }

    if (window.location.hash === targetHash) {
      this.handleRouting();
    } else {
      window.location.hash = targetHash;
    }
  }

  parseHash() {
    const hash = window.location.hash.replace(/^#\/?/, "") || "";
    const [path, ...rest] = hash.split("/");

    if ((path === "document" || path === "doc-detail") && rest.length) {
      return { route: Routes.DOCUMENT_DETAIL, param: decodeURIComponent(rest.join("/")) };
    }

    if (path === "admin" && rest.length) {
      return { route: Routes.ADMIN, param: rest[0] };
    }

    return { route: path || "", param: null };
  }


  async handleRouting() {
    const { route, param } = this.parseHash();
    const contentArea = document.getElementById("content-area");
    if (!contentArea) return;

    // Stop document view tracker when navigating away
    DocumentService.stopViewTracker();

    // Close mobile drawer on route change
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("mobile-sidebar-overlay");
    sidebar?.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");

    const user = store.getState().auth.currentUser;

    let targetRoute = route;

    // Default route determination (Shop First)
    if (!targetRoute) {
      targetRoute = Routes.HOME;
    }

    // Route Guards: handled gracefully inside views (e.g. renderAdminView)

    this.currentRoute = targetRoute;
    this.currentParams = param;

    // Record study streak on any navigation for logged-in users
    if (user) {
      gamificationService.recordActivity();
    }

    // Re-render navigation components
    renderSidebar(targetRoute);
    renderNavbar();

    // Render target view into content area
    contentArea.scrollTop = 0;

    switch (targetRoute) {
      case Routes.LANDING:
        renderLandingView(contentArea);
        break;

      case Routes.HOME:
        await renderHomeView(contentArea);
        break;

      case Routes.EXPLORE:
        await renderExploreView(contentArea, param);
        break;

      case Routes.FAVORITES:
        await renderFavoritesView(contentArea);
        break;

      case Routes.BUNDLES:
        await renderBundlesView(contentArea);
        break;

      case Routes.DASHBOARD:
        renderDashboardView(contentArea);
        break;

      case Routes.LIBRARY:
        renderLibraryView(contentArea);
        break;

      case Routes.NOTES:
        renderNotesView(contentArea);
        break;

      case Routes.FLASHCARDS:
        renderFlashcardsView(contentArea);
        break;

      case Routes.QUIZ:
        renderQuizView(contentArea);
        break;

      case Routes.STUDY_PLAN:
        renderStudyPlanView(contentArea);
        break;

      case Routes.AI:
        renderAIView(contentArea);
        break;

      case Routes.ACHIEVEMENTS:
        renderGamificationView(contentArea);
        break;

      case Routes.SELLER:
        renderSellerView(contentArea);
        break;

      case Routes.SETTINGS:
        renderSettingsView(contentArea);
        break;

      case Routes.DOCUMENT_DETAIL:
        await renderDocDetailView(contentArea, param);
        break;

      case Routes.PROFILE:
        renderProfileView(contentArea);
        break;

      case Routes.WALLET:
      case Routes.TRANSACTIONS:
        await renderWalletView(contentArea);
        break;

      case Routes.PURCHASED:
        await renderPurchasedView(contentArea);
        break;

      case Routes.ADMIN:
        await renderAdminView(contentArea, param || "overview");
        break;

      default:
        await renderHomeView(contentArea);
        break;
    }

    // Check profile completion prompt if user is logged in
    if (user && authService.requiresProfileCompletion() && targetRoute !== Routes.PROFILE) {
      modal.open({
        title: "Hoàn tất hồ sơ",
        message: "Vui lòng cập nhật đầy đủ Họ tên và Lớp để mở khóa toàn bộ chức năng mua và nạp tiền.",
        iconType: "warning",
        actionBtn: `<button type="button" class="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm" onclick="closeModal(); window.location.hash = '#/profile'">Điền hồ sơ ngay</button>`,
      });
    }
  }
}

export const router = new Router();

// Global backward compatibility
window.nav = (viewId, params = null) => {
  if ((viewId === "doc-detail" || viewId === "document") && params) {
    router.navigate(Routes.DOCUMENT_DETAIL, params);
  } else {
    router.navigate(viewId, params || "");
  }
};

