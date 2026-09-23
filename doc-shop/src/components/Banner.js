/**
 * Hero Banner Carousel for DkDocShop 2.0
 * ONLY displays featured documents configured by Admin (doc.featured === true).
 * No hardcoded/mock document cards.
 */
import { safe } from "../utils/sanitize.js";
import { router } from "../app/router.js";
import { Routes } from "../app/constants.js";
import { store } from "../app/state.js";
import { formatVND } from "../utils/format.js";

class BannerCarousel {
  constructor() {
    this.currentIndex = 0;
    this.timer = null;
    this.featuredDocs = [];
    this.isPaused = false;
    this.container = null;
  }

  /**
   * Update featured documents from loaded documents
   */
  setDocuments(docsList) {
    const list = Array.isArray(docsList) ? docsList : Object.values(docsList || {});
    this.featuredDocs = list
      .filter((d) => d.status !== "inactive" && Boolean(d.featured))
      .sort((a, b) => (Number(b.featuredOrder) || 0) - (Number(a.featuredOrder) || 0) || (b.createdAt || 0) - (a.createdAt || 0));

    if (this.currentIndex >= this.featuredDocs.length) {
      this.currentIndex = 0;
    }

    if (this.container) {
      this.render(this.container);
    }
  }

  render(container) {
    if (!container) return;
    this.container = container;

    // Check if store has documents if not loaded yet
    if (this.featuredDocs.length === 0) {
      const items = store.getState().documents.items || {};
      const list = Object.values(items);
      const featured = list.filter((d) => d.status !== "inactive" && Boolean(d.featured));
      if (featured.length > 0) {
        this.featuredDocs = featured.sort(
          (a, b) => (Number(b.featuredOrder) || 0) - (Number(a.featuredOrder) || 0) || (b.createdAt || 0) - (a.createdAt || 0)
        );
      }
    }

    if (this.featuredDocs.length > 0) {
      this.renderFeaturedDocBanner(container);
    } else {
      this.renderWelcomeBanner(container);
    }
  }

  /**
   * Render actual featured document configured by Admin
   */
  renderFeaturedDocBanner(container) {
    const doc = this.featuredDocs[this.currentIndex] || this.featuredDocs[0];
    const total = this.featuredDocs.length;
    const isFree = Number(doc.price) === 0;
    const priceText = isFree ? "Miễn phí (0đ)" : formatVND(doc.price);
    const defaultThumb = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800";

    container.innerHTML = `
      <div
        id="hero-banner-card"
        class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-gray-900 to-slate-900 text-white shadow-xl border border-emerald-900/30 transition-all duration-300"
        style="min-height: 360px;"
      >
        <!-- Subtle Ambient Background Light -->
        <div class="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="h-full flex flex-col justify-between p-6 sm:p-8 lg:p-10 relative z-10">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1">
            <!-- Left Content Area -->
            <div class="lg:col-span-7 space-y-4 min-w-0">
              <!-- Admin Featured Badge -->
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold tracking-wider uppercase">
                <i class="fa-solid fa-star text-amber-400 text-xs"></i>
                <span>TÀI LIỆU NỔI BẬT • LỚP ${safe(doc.grade || "Chung")}</span>
              </div>

              <!-- Document Title -->
              <h1 class="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug line-clamp-2">
                ${safe(doc.title)}
              </h1>

              <!-- Document Description -->
              <p class="text-xs sm:text-sm text-gray-300/90 max-w-xl leading-relaxed line-clamp-3">
                ${safe(doc.description || "Tài liệu học tập chất lượng cao do Ban Quản trị tuyển chọn và ghim nổi bật.")}
              </p>

              <!-- Price and Stats Tag -->
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-300 pt-1">
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="text-gray-400">Giá:</span>
                  <span class="text-emerald-400 font-bold font-mono text-sm">${priceText}</span>
                </div>
                <div class="hidden sm:block w-1 h-1 rounded-full bg-gray-500"></div>
                <span class="flex items-center gap-1.5 shrink-0">
                  <i class="fa-solid fa-eye text-gray-400 text-xs"></i>
                  <span>${Number(doc.views || 0)} lượt xem</span>
                </span>
                <div class="hidden sm:block w-1 h-1 rounded-full bg-gray-500"></div>
                <span class="flex items-center gap-1.5 shrink-0">
                  <i class="fa-solid fa-bag-shopping text-gray-400 text-xs"></i>
                  <span>${Number(doc.buys || 0)} lượt mua</span>
                </span>
              </div>

              <!-- Buttons -->
              <div class="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  id="hero-view-doc-btn"
                  data-doc-id="${safe(doc.id)}"
                  class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs shadow-lg shadow-emerald-950/50 hover:shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <span>Xem chi tiết tài liệu</span>
                  <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>

                <button
                  type="button"
                  id="hero-explore-btn"
                  class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur-xs border border-white/10 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  Khám phá toàn bộ
                </button>
              </div>
            </div>

            <!-- Right Visual Composition: Real Document Card Preview -->
            <div class="hidden lg:flex lg:col-span-5 relative items-center justify-center h-full min-h-[260px]">
              <div
                id="hero-preview-card"
                data-doc-id="${safe(doc.id)}"
                class="relative z-10 w-64 rounded-2xl bg-gradient-to-b from-gray-800/95 to-gray-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-lg overflow-hidden cursor-pointer transform hover:scale-102 transition duration-300"
              >
                <!-- Thumbnail -->
                <div class="relative aspect-[16/10] bg-gray-950 overflow-hidden">
                  <img
                    src="${safe(doc.thumbnail || defaultThumb)}"
                    alt="${safe(doc.title)}"
                    class="w-full h-full object-cover"
                    onerror="this.src='${defaultThumb}'"
                  />
                  <div class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-amber-500 text-gray-950 text-[10px] font-black uppercase flex items-center gap-1">
                    <i class="fa-solid fa-star text-[9px]"></i>
                    <span>Ghim</span>
                  </div>
                </div>

                <!-- Info Inside Card -->
                <div class="p-4 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                      Lớp ${safe(doc.grade || "Chung")}
                    </span>
                    <span class="text-xs font-bold text-emerald-400 font-mono">${priceText}</span>
                  </div>
                  <h4 class="text-xs font-bold text-white line-clamp-2 leading-snug">
                    ${safe(doc.title)}
                  </h4>
                  <div class="pt-2 border-t border-gray-700/60 flex items-center justify-between text-[11px] text-gray-400">
                    <span>${safe(doc.category || doc.subject || "Tài liệu")}</span>
                    <span class="text-emerald-400 font-medium flex items-center gap-1">
                      <span>Xem ngay</span>
                      <i class="fa-solid fa-chevron-right text-[9px]"></i>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Floating Badges -->
              <div class="absolute -bottom-1 -left-2 z-20 px-3 py-1.5 rounded-xl bg-gray-900/95 border border-emerald-500/40 shadow-xl flex items-center gap-2 backdrop-blur-md">
                <i class="fa-solid fa-book-open text-emerald-400 text-xs"></i>
                <span class="text-[10px] font-bold text-emerald-300">Đọc thử trực tuyến</span>
              </div>
              <div class="absolute -top-1 -right-2 z-20 px-3 py-1.5 rounded-xl bg-gray-900/95 border border-teal-500/40 shadow-xl flex items-center gap-2 backdrop-blur-md">
                <i class="fa-solid fa-bolt text-teal-300 text-xs"></i>
                <span class="text-[10px] font-bold text-teal-300">Nhận ngay lập tức</span>
              </div>
            </div>
          </div>

          <!-- Bottom Controls: Indicators & Navigation Arrows (if > 1 featured document) -->
          ${
            total > 1
              ? `
            <div class="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
              <!-- Carousel Dots -->
              <div class="flex items-center gap-1.5">
                ${this.featuredDocs
                  .map(
                    (_, i) => `
                  <button
                    type="button"
                    data-carousel-dot="${i}"
                    class="h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      i === this.currentIndex ? "w-6 bg-emerald-400" : "w-2 bg-white/20 hover:bg-white/40"
                    }"
                    aria-label="Chuyển tài liệu nổi bật ${i + 1}"
                  ></button>
                `,
                  )
                  .join("")}
              </div>

              <!-- Arrows -->
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  id="hero-banner-prev"
                  class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition cursor-pointer"
                  aria-label="Tài liệu trước"
                >
                  <i class="fa-solid fa-chevron-left text-[10px]"></i>
                </button>
                <button
                  type="button"
                  id="hero-banner-next"
                  class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition cursor-pointer"
                  aria-label="Tài liệu sau"
                >
                  <i class="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;

    this.attachFeaturedEvents(container, doc);
    if (total > 1) {
      this.startAutoPlay(container);
    } else if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * Render neutral platform banner when no documents are marked as featured yet
   */
  renderWelcomeBanner(container) {
    if (this.timer) clearInterval(this.timer);

    container.innerHTML = `
      <div
        id="hero-banner-card"
        class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-gray-900 to-slate-900 text-white shadow-xl border border-emerald-900/30 transition-all duration-300 p-6 sm:p-8 lg:p-10"
        style="min-height: 320px;"
      >
        <div class="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          <div class="lg:col-span-8 space-y-4">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold tracking-wider uppercase">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              DKDOCSHOP 2.0 • THƯ VIỆN SỐ
            </div>

            <h1 class="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
              Kho Tài Liệu Học Tập, Ôn Thi & Trợ Lý DkAI Thông Minh
            </h1>

            <p class="text-xs sm:text-sm text-gray-300/90 max-w-xl leading-relaxed">
              Tìm kiếm, sở hữu và quản lý tài liệu học tập trong một thư viện cá nhân tinh gọn, hiện đại. Trợ lý DkAI hỗ trợ giải bài và phân tích tài liệu chuẩn mực.
            </p>

            <div class="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                id="hero-welcome-explore-btn"
                class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs shadow-lg transition active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>Khám phá kho tài liệu</span>
                <span>→</span>
              </button>
              <button
                type="button"
                id="hero-welcome-free-btn"
                class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/10 transition active:scale-95 cursor-pointer"
              >
                Tài liệu miễn phí (0đ)
              </button>
            </div>
          </div>

          <!-- Feature highlights (no fake mock docs) -->
          <div class="hidden lg:flex lg:col-span-4 flex-col gap-3">
            <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-3">
              <span class="text-2xl">⚡</span>
              <div>
                <h4 class="text-xs font-bold text-white">Nhận tài liệu tức thì</h4>
                <p class="text-[11px] text-gray-400">Tải link Drive & Key kích hoạt tự động sau khi thanh toán</p>
              </div>
            </div>
            <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-3">
              <span class="text-2xl">🤖</span>
              <div>
                <h4 class="text-xs font-bold text-white">Trợ lý DkAI kèm học</h4>
                <p class="text-[11px] text-gray-400">Giải thích chi tiết công thức Toán, Lý, Hóa chuẩn LaTeX</p>
              </div>
            </div>
            <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-3">
              <span class="text-2xl">📚</span>
              <div>
                <h4 class="text-xs font-bold text-white">Thư viện cá nhân thông minh</h4>
                <p class="text-[11px] text-gray-400">Đọc trực tuyến, ghi chú và ôn tập flashcard mọi lúc</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector("#hero-welcome-explore-btn")?.addEventListener("click", () => {
      router.navigate(Routes.EXPLORE);
    });

    container.querySelector("#hero-welcome-free-btn")?.addEventListener("click", () => {
      store.setDocFilter("free");
      router.navigate(Routes.HOME);
    });
  }

  attachFeaturedEvents(container, currentDoc) {
    const card = container.querySelector("#hero-banner-card");

    // Pause on hover
    card?.addEventListener("mouseenter", () => {
      this.isPaused = true;
    });
    card?.addEventListener("mouseleave", () => {
      this.isPaused = false;
    });

    // Primary button: Navigate to document detail
    container.querySelector("#hero-view-doc-btn")?.addEventListener("click", () => {
      router.navigate(Routes.DOCUMENT_DETAIL, currentDoc.id);
    });

    // Right preview card click: Navigate to document detail
    container.querySelector("#hero-preview-card")?.addEventListener("click", () => {
      router.navigate(Routes.DOCUMENT_DETAIL, currentDoc.id);
    });

    // Explore button
    container.querySelector("#hero-explore-btn")?.addEventListener("click", () => {
      router.navigate(Routes.EXPLORE);
    });

    // Navigation arrows
    container.querySelector("#hero-banner-prev")?.addEventListener("click", () => {
      this.prev(container);
    });
    container.querySelector("#hero-banner-next")?.addEventListener("click", () => {
      this.next(container);
    });

    // Dots
    container.querySelectorAll("[data-carousel-dot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-carousel-dot"));
        this.goTo(idx, container);
      });
    });
  }

  next(container) {
    if (this.featuredDocs.length <= 1) return;
    this.currentIndex = (this.currentIndex + 1) % this.featuredDocs.length;
    this.render(container);
  }

  prev(container) {
    if (this.featuredDocs.length <= 1) return;
    this.currentIndex = (this.currentIndex - 1 + this.featuredDocs.length) % this.featuredDocs.length;
    this.render(container);
  }

  goTo(index, container) {
    if (index >= 0 && index < this.featuredDocs.length) {
      this.currentIndex = index;
      this.render(container);
    }
  }

  startAutoPlay(container) {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.isPaused && this.featuredDocs.length > 1) {
        this.next(container);
      }
    }, 6000);
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

export const heroBanner = new BannerCarousel();
export default heroBanner;
