/**
 * Admin Dashboard Container View - Upgraded with Announcements, Promotions, Audit Logs, and Backup
 */
import { store } from "../../app/state.js";
import { authService } from "../../services/auth.service.js";
import { debounce } from "../../utils/debounce.js";
import { renderOverviewTab } from "./overview/overview.tab.js";
import { renderDocumentsTab } from "./documents/documents.tab.js";
import { renderUsersTab } from "./users/users.tab.js";
import { renderTransactionsTab } from "./transactions/transactions.tab.js";
import { renderReportsTab } from "./reports/reports.tab.js";
import { renderAnnouncementsTab } from "./announcements/announcements.tab.js";
import { renderPromotionsTab } from "./promotions/promotions.tab.js";
import { renderBannersTab } from "./banners/banners.tab.js";
import { renderBundlesTab } from "./bundles/bundles.tab.js";
import { renderAuditLogsTab } from "./audit-logs/audit-logs.tab.js";
import { renderBackupTab } from "./backup/backup.tab.js";

let currentActiveTab = "overview";
let currentSearchTerm = "";

export const renderAdminView = async (container, initialTab = "overview") => {
  if (!container) return;

  // Security guard check
  if (!authService.isAdmin()) {
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    container.innerHTML = `
      <div class="fade-in max-w-md mx-auto my-16 bg-white rounded-3xl p-8 border border-red-100 shadow-sm text-center">
        <div class="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-2xl mx-auto mb-4">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">Không có quyền truy cập</h3>
        <p class="text-sm text-gray-500 mb-6">Khu vực này chỉ dành riêng cho tài khoản Quản trị viên (Admin).</p>
        
        <div class="space-y-3">
          <button type="button" data-nav="home" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition cursor-pointer">
            Quay lại cửa hàng
          </button>
          
          ${isLocal ? `
            <button type="button" id="admin-dev-bypass-btn" class="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2">
              <i class="fa-solid fa-key text-emerald-600"></i>
              <span>Kích hoạt quyền Admin (Chế độ Local Dev)</span>
            </button>
          ` : ""}
        </div>
      </div>
    `;

    container.querySelector("#admin-dev-bypass-btn")?.addEventListener("click", () => {
      localStorage.setItem("dkdocshop_dev_admin", "true");
      renderAdminView(container, initialTab);
    });

    return;
  }

  currentActiveTab = initialTab || "overview";

  container.innerHTML = `
    <div class="fade-in space-y-6 pb-12">
      <!-- Admin Header & Tab Switcher -->
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-base">
              <i class="fa-solid fa-shield-halved"></i>
            </span>
            <span>Admin Command Center</span>
          </h2>
          <p class="text-xs text-gray-400 mt-0.5">Trung tâm điều hành và kiểm duyệt dữ liệu DkDocShop 2.0</p>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
          <!-- Navigation Tabs -->
          <div class="flex gap-1 bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs overflow-x-auto hide-scroll">
            ${[
              { id: "overview", label: "Tổng quan", icon: "fa-chart-pie" },
              { id: "documents", label: "Tài liệu", icon: "fa-file-lines" },
              { id: "users", label: "Người dùng", icon: "fa-users" },
              { id: "transactions", label: "Giao dịch", icon: "fa-receipt" },
              { id: "banners", label: "Banners", icon: "fa-panorama" },
              { id: "bundles", label: "Combos", icon: "fa-boxes-stacked" },
              { id: "promotions", label: "Khuyến mãi", icon: "fa-ticket" },
              { id: "announcements", label: "Thông báo", icon: "fa-bullhorn" },
              { id: "reports", label: "Báo cáo", icon: "fa-triangle-exclamation" },
              { id: "audit-logs", label: "Nhật ký an ninh", icon: "fa-lock" },
              { id: "backup", label: "Xuất/Nhập", icon: "fa-floppy-disk" },
            ]
              .map(
                (tab) => `
                <button
                  type="button"
                  class="admin-nav-tab px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${currentActiveTab === tab.id ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}"
                  data-tab="${tab.id}"
                >
                  <i class="fa-solid ${tab.icon} text-xs"></i>
                  <span>${tab.label}</span>
                </button>
              `,
              )
              .join("")}
          </div>

          <!-- Search Input for current tab -->
          <div class="relative w-full sm:w-64">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              id="admin-tab-search"
              placeholder="Tìm kiếm trong tab này..."
              class="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
            />
          </div>
        </div>
      </div>

      <!-- Tab Content Area (Lazy Loaded) -->
      <div id="admin-tab-content" class="min-h-[400px]"></div>
    </div>
  `;

  const contentHost = document.getElementById("admin-tab-content");

  const switchTab = async (tabId) => {
    currentActiveTab = tabId;

    // Update tab button styles
    container.querySelectorAll(".admin-nav-tab").forEach((btn) => {
      if (btn.dataset.tab === tabId) {
        btn.className = "admin-nav-tab px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs";
      } else {
        btn.className = "admin-nav-tab px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap text-gray-600 hover:text-gray-900 hover:bg-gray-50";
      }
    });

    // Lazy load the requested tab view
    if (tabId === "overview") {
      await renderOverviewTab(contentHost, currentSearchTerm);
    } else if (tabId === "documents") {
      await renderDocumentsTab(contentHost, currentSearchTerm);
    } else if (tabId === "users") {
      await renderUsersTab(contentHost, currentSearchTerm);
    } else if (tabId === "transactions") {
      await renderTransactionsTab(contentHost, currentSearchTerm);
    } else if (tabId === "banners") {
      renderBannersTab(contentHost);
    } else if (tabId === "bundles") {
      renderBundlesTab(contentHost);
    } else if (tabId === "reports") {
      await renderReportsTab(contentHost, currentSearchTerm);
    } else if (tabId === "announcements") {
      renderAnnouncementsTab(contentHost);
    } else if (tabId === "promotions") {
      renderPromotionsTab(contentHost);
    } else if (tabId === "audit-logs") {
      renderAuditLogsTab(contentHost);
    } else if (tabId === "backup") {
      renderBackupTab(contentHost);
    }
  };


  // Attach tab switch handlers
  container.querySelectorAll(".admin-nav-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Debounced search input handler
  const searchInput = document.getElementById("admin-tab-search");
  searchInput?.addEventListener(
    "input",
    debounce((e) => {
      currentSearchTerm = e.target.value.trim();
      switchTab(currentActiveTab);
    }, 250),
  );

  // Initial load
  await switchTab(currentActiveTab);
};
