/**
 * Home (Shop-First) View for DkDocShop 2.0 (Section J)
 * 1. Hero • 2. Search • 3. Categories • 4. Featured • 5. Popular • 6. Free
 * 7. Promotions • 8. Bundles • 9. Recently Added • 10. DkAI • 11. Footer
 */
import { store } from "../../app/state.js";
import { DocumentService } from "../../services/document.service.js";
import { renderDocumentCard } from "../../components/document-card.js";
import { renderCardSkeletons } from "../../components/skeleton.js";
import { renderEmptyState } from "../../components/empty-state.js";
import { safe } from "../../utils/sanitize.js";
import { heroBanner } from "../../components/Banner.js";
import { SEED_CATEGORIES } from "../../data/seed/categories.seed.js";
import { promotionService } from "../../services/promotion.service.js";
import { bundleService } from "../../services/bundle.service.js";
import { router } from "../../app/router.js";
import { Routes } from "../../app/constants.js";
import { formatVND } from "../../utils/format.js";
import { toast } from "../../components/toast.js";
import { copyText } from "../../utils/clipboard.js";

export const renderHomeView = async (container) => {
  if (!container) return;

  const activePromos = promotionService.getActivePromotions();
  const activeBundles = bundleService.getActiveBundles();

  container.innerHTML = `
    <div class="fade-in space-y-10 pb-16">
      <!-- 1. Hero Banner Section -->
      <section id="hero-banner-container" class="w-full">
        <!-- Rendered dynamically by Banner.js -->
      </section>

      <!-- 2. Search & Category Filters Header -->
      <section class="space-y-4">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <span>🏪</span> Cửa Hàng Tài Liệu Học Tập
            </h2>
            <p class="text-xs text-gray-500 mt-0.5">Tìm kiếm tài liệu chuẩn hóa theo môn học, khối lớp và chuyên đề chọn lọc</p>
          </div>
          <div id="home-keyword-pills" class="flex gap-2 w-full md:w-auto overflow-x-auto hide-scroll pb-1">
            <!-- Filter pills -->
          </div>
        </div>
      </section>

      <!-- 3. Categories Grid -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span>📚</span> Danh mục trọng điểm
          </h3>
          <button type="button" data-nav="explore" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition">
            Xem tất cả danh mục →
          </button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          ${SEED_CATEGORIES.slice(0, 6).map((cat) => `
            <div
              data-cat-filter="${cat.slug}"
              class="p-3.5 rounded-2xl bg-white border border-gray-200/80 hover:border-emerald-500/50 hover:shadow-md transition cursor-pointer group text-center"
            >
              <div class="text-2xl mb-1.5 transform group-hover:scale-110 transition duration-200">${cat.icon}</div>
              <h4 class="text-xs font-bold text-gray-800 group-hover:text-emerald-600 transition truncate">${cat.name}</h4>
              <p class="text-[10px] text-gray-400 mt-0.5 line-clamp-1">${cat.description}</p>
            </div>
          `).join("")}
        </div>
      </section>

      <!-- 4. Featured Documents Carousel -->
      <section id="featured-docs-section" class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <h3 class="text-sm font-bold text-gray-900">Tài liệu nổi bật nhất</h3>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" id="feat-scroll-left" class="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-xs shadow-2xs">‹</button>
            <button type="button" id="feat-scroll-right" class="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-xs shadow-2xs">›</button>
          </div>
        </div>
        <div id="featured-docs-row" class="flex gap-5 overflow-x-auto hide-scroll scroll-smooth pb-2">
          <!-- Featured document cards -->
        </div>
      </section>

      <!-- 5. Popular Documents Grid -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span>🔥</span> Tài liệu tải nhiều nhất
          </h3>
          <span class="text-xs text-gray-400">Được cộng đồng đánh giá cao</span>
        </div>
        <div id="popular-docs-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          ${renderCardSkeletons(4)}
        </div>
      </section>

      <!-- 6. Free Documents Section -->
      <section class="space-y-3 p-5 rounded-3xl bg-emerald-50/50 border border-emerald-100">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <span>🎁</span> Kho Tài Liệu Miễn Phí 0đ
            </h3>
            <p class="text-xs text-emerald-700/80 mt-0.5">Tải và nhận ngay vào thư viện không giới hạn</p>
          </div>
          <button type="button" id="view-all-free-btn" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition">
            Xem toàn bộ miễn phí
          </button>
        </div>
        <div id="free-docs-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
          ${renderCardSkeletons(4)}
        </div>
      </section>

      <!-- 7. Active Promotions Banner -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span>🎟️</span> Mã Giảm Giá Đang Diễn Ra
          </h3>
        </div>
        ${activePromos.length > 0 ? `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${activePromos.slice(0, 4).map((promo) => `
              <div class="p-4 rounded-2xl bg-white border border-dashed border-emerald-300 shadow-2xs flex flex-col justify-between space-y-3">
                <div>
                  <div class="flex items-center justify-between">
                    <span class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-mono font-bold text-xs">
                      ${safe(promo.code)}
                    </span>
                    <span class="text-[10px] text-emerald-600 font-semibold">Đang hoạt động</span>
                  </div>
                  <h4 class="text-xs font-bold text-gray-900 mt-2">${safe(promo.description || 'Ưu đãi giảm giá')}</h4>
                </div>
                <button
                  type="button"
                  data-copy-code="${safe(promo.code)}"
                  class="w-full py-1.5 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 font-semibold text-xs border border-gray-200 transition cursor-pointer"
                >
                  Sao chép mã
                </button>
              </div>
            `).join("")}
          </div>
        ` : `
          <div class="p-6 rounded-2xl bg-white border border-gray-100 text-center text-xs text-gray-400">
            Hiện chưa có mã voucher mới. Các chương trình khuyến mãi do Quản trị viên phát hành sẽ hiển thị tại đây!
          </div>
        `}
      </section>

      <!-- 8. Bundles & Combos Section -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>📦</span> Combo Chuyên Đề — Tiết Kiệm Đến 40%
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">Trọn gói tài liệu ôn tập theo từng khối và môn học</p>
          </div>
          <button type="button" data-nav="bundles" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition cursor-pointer">
            Xem tất cả combo →
          </button>
        </div>
        ${activeBundles.length > 0 ? `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            ${activeBundles.slice(0, 3).map((bundle) => `
              <div class="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
                <div class="space-y-2.5">
                  <span class="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Tiết kiệm ${formatVND(bundle.savingAmount)}
                  </span>
                  <h4 class="text-sm font-bold text-gray-900 line-clamp-2">${safe(bundle.title)}</h4>
                  <p class="text-xs text-gray-500 line-clamp-2">${safe(bundle.description || '')}</p>
                  <div class="pt-1 flex items-baseline gap-2">
                    <span class="text-base font-black text-emerald-600 font-mono">${formatVND(bundle.bundlePrice)}</span>
                    <span class="text-xs text-gray-400 line-through font-mono">${formatVND(bundle.originalPrice)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  data-nav="bundles"
                  class="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition text-center cursor-pointer"
                >
                  Xem chi tiết combo
                </button>
              </div>
            `).join("")}
          </div>
        ` : `
          <div class="p-6 rounded-2xl bg-white border border-gray-100 text-center text-xs text-gray-400">
            Các gói combo tài liệu đang được Ban Quản trị biên soạn và sẽ sớm ra mắt!
          </div>
        `}
      </section>


      <!-- 9. Recently Added Documents -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span>✨</span> Tài liệu mới cập nhật
          </h3>
          <span class="text-xs text-gray-400">Cập nhật liên tục 2026</span>
        </div>
        <div id="recent-docs-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          ${renderCardSkeletons(4)}
        </div>
      </section>

      <!-- 10. DkAI Spotlight Section -->
      <section class="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 text-white shadow-xl relative overflow-hidden">
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          <div class="lg:col-span-8 space-y-3">
            <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
              Trợ lý DkAI thông minh
            </span>
            <h3 class="text-xl sm:text-2xl font-black text-white leading-snug">
              Học cùng Trợ lý DkAI — Giải đáp công thức Toán, Lý, Hóa chuẩn LaTeX
            </h3>
            <p class="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xl">
              Không chỉ cho đáp án, DkAI giải thích cặn kẽ từng bước, cảnh báo các bẫy thường gặp và tóm tắt bài học ngắn gọn.
            </p>
            <div class="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                data-nav="ai"
                class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs shadow-md transition"
              >
                Trò chuyện với DkAI ngay
              </button>
            </div>
          </div>
          <div class="lg:col-span-4 flex justify-center">
            <div class="w-40 h-40 rounded-3xl bg-white/5 border border-emerald-500/30 flex items-center justify-center text-6xl shadow-2xl backdrop-blur-md">
              🤖
            </div>
          </div>
        </div>
      </section>

      <!-- 11. Footer Section (Section BV) -->
      <footer class="pt-10 mt-12 border-t border-gray-200/80 text-gray-500 text-xs space-y-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div class="space-y-2">
            <h4 class="font-bold text-gray-800 text-xs uppercase tracking-wider">DkDocShop 2.0</h4>
            <p class="text-[11px] text-gray-400 leading-relaxed">
              Cửa hàng tài liệu số và thư viện học tập thông minh dành cho học sinh, sinh viên và giáo viên.
            </p>
          </div>
          <div class="space-y-1.5">
            <h4 class="font-bold text-gray-800 text-xs uppercase tracking-wider">Khám phá</h4>
            <p><a href="#/home" class="hover:text-emerald-600 transition">Cửa hàng tài liệu</a></p>
            <p><a href="#/explore" class="hover:text-emerald-600 transition">Khám phá danh mục</a></p>
            <p><a href="#/bundles" class="hover:text-emerald-600 transition">Combo ưu đãi</a></p>
            <p><a href="#/ai" class="hover:text-emerald-600 transition">Trợ lý DkAI</a></p>
          </div>
          <div class="space-y-1.5">
            <h4 class="font-bold text-gray-800 text-xs uppercase tracking-wider">Cá nhân</h4>
            <p><a href="#/library" class="hover:text-emerald-600 transition">Thư viện của tôi</a></p>
            <p><a href="#/purchased" class="hover:text-emerald-600 transition">Tài liệu đã mua</a></p>
            <p><a href="#/favorites" class="hover:text-emerald-600 transition">Yêu thích</a></p>
            <p><a href="#/wallet" class="hover:text-emerald-600 transition">Ví & Nạp tiền</a></p>
          </div>
          <div class="space-y-1.5">
            <h4 class="font-bold text-gray-800 text-xs uppercase tracking-wider">Hỗ trợ & Bảo mật</h4>
            <p><a href="#/profile" class="hover:text-emerald-600 transition">Trung tâm hỗ trợ</a></p>
            <p><a href="#/settings" class="hover:text-emerald-600 transition">Điều khoản sử dụng</a></p>
            <p><a href="#/settings" class="hover:text-emerald-600 transition">Chính sách bảo mật</a></p>
            <p class="text-[10px] text-gray-400 mt-2">© 2026 DkDocShop. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  `;

  // Load documents
  const docsMap = await DocumentService.loadDocuments();
  const docsList = Object.values(docsMap || {});

  // Render Hero Banner from actual featured documents
  const bannerContainer = container.querySelector("#hero-banner-container");
  if (bannerContainer) {
    heroBanner.setDocuments(docsList);
    heroBanner.render(bannerContainer);
  }

  // Render Keywords / Filter Pills
  renderKeywordPills(container);

  renderFeaturedRow(container, docsList);
  renderPopularGrid(container, docsList);
  renderFreeGrid(container, docsList);
  renderRecentGrid(container, docsList);
  attachHomeEvents(container);
};

const renderKeywordPills = (container) => {
  const host = container.querySelector("#home-keyword-pills");
  if (!host) return;

  const currentFilter = store.getState().documents.filter || "all";
  const pillFilters = [
    { label: "Tất cả", value: "all" },
    { label: "Miễn phí (0đ)", value: "free" },
    { label: "Toán Học", value: "Toán Học" },
    { label: "Vật Lý", value: "Vật Lý" },
    { label: "Hóa Học", value: "Hóa Học" },
    { label: "Tiếng Anh", value: "Tiếng Anh" },
    { label: "ĐGNL HCM", value: "ĐGNL ĐHQG-HCM" },
    { label: "ĐGTD Bách Khoa", value: "ĐGTD Bách Khoa (TSA)" },
  ];

  host.innerHTML = pillFilters.map((pill) => {
    const isActive = currentFilter === pill.value;
    return `
      <button
        type="button"
        data-home-pill="${safe(pill.value)}"
        class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${isActive ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}"
      >
        ${safe(pill.label)}
      </button>
    `;
  }).join("");

  host.querySelectorAll("[data-home-pill]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const filterVal = btn.getAttribute("data-home-pill");
      store.setDocFilter(filterVal);
      renderKeywordPills(container);
      const docs = store.getState().documents.items;
      renderPopularGrid(container, Object.values(docs || {}));
    });
  });
};

const renderFeaturedRow = (container, docsList) => {
  const row = container.querySelector("#featured-docs-row");
  if (!row) return;

  const featured = docsList.filter((d) => d.featured).slice(0, 8);
  if (featured.length === 0) {
    row.innerHTML = `<div class="p-4 text-xs text-gray-400">Đang cập nhật tài liệu nổi bật...</div>`;
    return;
  }

  row.innerHTML = featured.map((doc) => `
    <div class="w-72 shrink-0">
      ${renderDocumentCard(doc)}
    </div>
  `).join("");
};

const renderPopularGrid = (container, docsList) => {
  const grid = container.querySelector("#popular-docs-grid");
  if (!grid) return;

  const currentFilter = store.getState().documents.filter || "all";
  let list = docsList;

  if (currentFilter !== "all") {
    if (currentFilter === "free") {
      list = list.filter((d) => Number(d.price) === 0);
    } else {
      list = list.filter((d) => d.subject === currentFilter || d.category === currentFilter);
    }
  }

  const popular = [...list].sort((a, b) => Number(b.purchaseCount || 0) - Number(a.purchaseCount || 0)).slice(0, 8);

  if (popular.length === 0) {
    grid.innerHTML = `<div class="col-span-4">${renderEmptyState({ title: "Không tìm thấy tài liệu", message: "Hãy thử đổi bộ lọc khác." })}</div>`;
    return;
  }

  grid.innerHTML = popular.map((doc) => renderDocumentCard(doc)).join("");
};

const renderFreeGrid = (container, docsList) => {
  const grid = container.querySelector("#free-docs-grid");
  if (!grid) return;

  const freeDocs = docsList.filter((d) => Number(d.price) === 0).slice(0, 4);
  grid.innerHTML = freeDocs.map((doc) => renderDocumentCard(doc)).join("");
};

const renderRecentGrid = (container, docsList) => {
  const grid = container.querySelector("#recent-docs-grid");
  if (!grid) return;

  const recent = [...docsList].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).slice(0, 4);
  grid.innerHTML = recent.map((doc) => renderDocumentCard(doc)).join("");
};

const attachHomeEvents = (container) => {
  // Featured scroll buttons
  container.querySelector("#feat-scroll-left")?.addEventListener("click", () => {
    container.querySelector("#featured-docs-row")?.scrollBy({ left: -320, behavior: "smooth" });
  });

  container.querySelector("#feat-scroll-right")?.addEventListener("click", () => {
    container.querySelector("#featured-docs-row")?.scrollBy({ left: 320, behavior: "smooth" });
  });

  // View all free
  container.querySelector("#view-all-free-btn")?.addEventListener("click", () => {
    store.setDocFilter("free");
    router.navigate(Routes.HOME);
    renderKeywordPills(container);
    renderPopularGrid(container, Object.values(store.getState().documents.items || {}));
  });

  // Copy promo code buttons
  container.querySelectorAll("[data-copy-code]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.getAttribute("data-copy-code");
      const ok = await copyText(code);
      if (ok) toast.success(`Đã sao chép mã ${code}!`);
    });
  });

  // Category card clicks
  container.querySelectorAll("[data-cat-filter]").forEach((card) => {
    card.addEventListener("click", () => {
      const slug = card.getAttribute("data-cat-filter");
      router.navigate(Routes.EXPLORE, slug);
    });
  });
};

export const renderGrid = (docs) => {
  const contentArea = document.getElementById("content-area");
  if (!contentArea) return;
  const docsList = docs ? Object.values(docs) : Object.values(store.getState().documents.items || {});
  renderPopularGrid(contentArea, docsList);
};

export default renderHomeView;
