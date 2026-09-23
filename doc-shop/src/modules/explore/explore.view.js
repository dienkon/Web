/**
 * Explore & Smart Category Browsing View for DkDocShop 2.0 (Section Z & E)
 */
import { store } from "../../app/state.js";
import { DocumentService } from "../../services/document.service.js";
import { renderDocumentCard } from "../../components/document-card.js";
import { renderEmptyState } from "../../components/empty-state.js";
import { SEED_CATEGORIES } from "../../data/seed/categories.seed.js";
import { SEED_SUBJECTS } from "../../data/seed/subjects.seed.js";
import { safe } from "../../utils/sanitize.js";

export const renderExploreView = async (container, initialCategorySlug = null) => {
  if (!container) return;

  const docsMap = await DocumentService.loadDocuments();
  const allDocs = Object.values(docsMap || {});

  let selectedSubject = "all";
  let selectedGrade = "all";
  let selectedCategory = initialCategorySlug || "all";
  let priceFilter = "all"; // all | free | paid
  let sortBy = "popular"; // popular | price-asc | price-desc | newest
  let searchQuery = "";

  const renderContent = () => {
    let filtered = [...allDocs];

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((d) =>
        (d.title || "").toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q) ||
        (d.keywords || []).some((k) => k.toLowerCase().includes(q))
      );
    }

    // Subject
    if (selectedSubject !== "all") {
      filtered = filtered.filter((d) => d.subject === selectedSubject);
    }

    // Grade
    if (selectedGrade !== "all") {
      filtered = filtered.filter((d) => d.grade === selectedGrade);
    }

    // Category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((d) =>
        (d.categories || []).includes(selectedCategory) ||
        d.slug === selectedCategory
      );
    }

    // Price
    if (priceFilter === "free") {
      filtered = filtered.filter((d) => Number(d.price) === 0);
    } else if (priceFilter === "paid") {
      filtered = filtered.filter((d) => Number(d.price) > 0);
    }

    // Sort
    if (sortBy === "popular") {
      filtered.sort((a, b) => Number(b.purchaseCount || 0) - Number(a.purchaseCount || 0));
    } else if (sortBy === "price-asc") {
      filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "price-desc") {
      filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === "newest") {
      filtered.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    }

    container.innerHTML = `
      <div class="fade-in space-y-6 pb-16">
        <!-- Header -->
        <div class="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <span>🔍</span> Khám Phá & Lọc Tài Liệu
            </h2>
            <p class="text-xs text-gray-500 mt-0.5">Tìm kiếm chính xác theo môn, cấp lớp, phân loại và mức giá</p>
          </div>
          <!-- Search Input -->
          <div class="w-full md:w-80">
            <input
              type="text"
              id="explore-search-input"
              value="${safe(searchQuery)}"
              placeholder="Nhập tên tài liệu, chủ đề..."
              class="w-full px-4 py-2 text-xs rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        <!-- Filter Controls Bar -->
        <div class="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap items-center gap-3 text-xs">
          <!-- Subject Select -->
          <div class="flex items-center gap-2">
            <span class="text-gray-400 font-medium">Môn:</span>
            <select id="explore-subject-select" class="px-3 py-1.5 rounded-xl border border-gray-200 bg-white font-medium text-gray-700">
              <option value="all">Tất cả môn học</option>
              ${SEED_SUBJECTS.map((s) => `<option value="${safe(s.name)}" ${selectedSubject === s.name ? "selected" : ""}>${s.icon} ${safe(s.name)}</option>`).join("")}
            </select>
          </div>

          <!-- Grade Select -->
          <div class="flex items-center gap-2">
            <span class="text-gray-400 font-medium">Khối lớp:</span>
            <select id="explore-grade-select" class="px-3 py-1.5 rounded-xl border border-gray-200 bg-white font-medium text-gray-700">
              <option value="all" ${selectedGrade === "all" ? "selected" : ""}>Tất cả các khối</option>
              <option value="Khối 12" ${selectedGrade === "Khối 12" ? "selected" : ""}>Khối 12 (Ôn thi THPT)</option>
              <option value="Khối 11" ${selectedGrade === "Khối 11" ? "selected" : ""}>Khối 11</option>
              <option value="Khối 10" ${selectedGrade === "Khối 10" ? "selected" : ""}>Khối 10</option>
            </select>
          </div>

          <!-- Price Select -->
          <div class="flex items-center gap-2">
            <span class="text-gray-400 font-medium">Mức giá:</span>
            <select id="explore-price-select" class="px-3 py-1.5 rounded-xl border border-gray-200 bg-white font-medium text-gray-700">
              <option value="all" ${priceFilter === "all" ? "selected" : ""}>Tất cả mức giá</option>
              <option value="free" ${priceFilter === "free" ? "selected" : ""}>Chỉ tài liệu miễn phí (0đ)</option>
              <option value="paid" ${priceFilter === "paid" ? "selected" : ""}>Tài liệu có phí</option>
            </select>
          </div>

          <!-- Sort Select -->
          <div class="flex items-center gap-2 ml-auto">
            <span class="text-gray-400 font-medium">Sắp xếp:</span>
            <select id="explore-sort-select" class="px-3 py-1.5 rounded-xl border border-gray-200 bg-white font-medium text-gray-700">
              <option value="popular" ${sortBy === "popular" ? "selected" : ""}>Tải nhiều nhất</option>
              <option value="newest" ${sortBy === "newest" ? "selected" : ""}>Mới cập nhật</option>
              <option value="price-asc" ${sortBy === "price-asc" ? "selected" : ""}>Giá tăng dần</option>
              <option value="price-desc" ${sortBy === "price-desc" ? "selected" : ""}>Giá giảm dần</option>
            </select>
          </div>
        </div>

        <!-- Result count -->
        <div class="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>Tìm thấy <strong class="text-gray-800 font-bold">${filtered.length}</strong> tài liệu phù hợp</span>
          ${(selectedSubject !== "all" || selectedGrade !== "all" || priceFilter !== "all" || searchQuery) ? `
            <button id="explore-reset-btn" class="text-emerald-600 hover:text-emerald-700 font-semibold underline">
              Đặt lại bộ lọc
            </button>
          ` : ""}
        </div>

        <!-- Documents Grid -->
        ${filtered.length > 0 ? `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            ${filtered.map((doc) => renderDocumentCard(doc)).join("")}
          </div>
        ` : `
          <div class="py-12">
            ${renderEmptyState({
              title: "Không tìm thấy tài liệu phù hợp",
              message: "Hãy thử nới lỏng bộ lọc hoặc tìm kiếm bằng từ khóa khác.",
            })}
          </div>
        `}
      </div>
    `;

    attachEvents();
  };

  const attachEvents = () => {
    container.querySelector("#explore-search-input")?.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderContent();
    });

    container.querySelector("#explore-subject-select")?.addEventListener("change", (e) => {
      selectedSubject = e.target.value;
      renderContent();
    });

    container.querySelector("#explore-grade-select")?.addEventListener("change", (e) => {
      selectedGrade = e.target.value;
      renderContent();
    });

    container.querySelector("#explore-price-select")?.addEventListener("change", (e) => {
      priceFilter = e.target.value;
      renderContent();
    });

    container.querySelector("#explore-sort-select")?.addEventListener("change", (e) => {
      sortBy = e.target.value;
      renderContent();
    });

    container.querySelector("#explore-reset-btn")?.addEventListener("click", () => {
      selectedSubject = "all";
      selectedGrade = "all";
      selectedCategory = "all";
      priceFilter = "all";
      searchQuery = "";
      renderContent();
    });
  };

  renderContent();
};

export default renderExploreView;
