/**
 * Admin Bundles & Combos Management Tab for DkDocShop 2.0
 * Dynamic admin-managed combos, zero pre-filled mock data, zero browser popups.
 * Multi-document picker, real-time discount calculation, and FA6 vector icons.
 */
import { toast } from "../../../components/toast.js";
import { confirmDialog } from "../../../components/ConfirmDialog.js";
import { escapeHtml } from "../../../utils/sanitize.js";
import { bundleService } from "../../../services/bundle.service.js";
import { formatVND } from "../../../utils/format.js";
import { store } from "../../../app/state.js";

export const renderBundlesTab = (container) => {
  const bundles = bundleService.getBundles();
  const availableDocs = Object.values(store.getState().documents.items || {});

  container.innerHTML = `
    <div class="space-y-6 fade-in">
      <!-- Header Bar -->
      <div class="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-boxes-stacked"></i>
          </div>
          <div>
            <h3 class="font-bold text-base text-gray-900 flex items-center gap-2">
              Quản lý Gói Tài Liệu & Combo Tiết Kiệm
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Cấu hình đóng gói nhiều tài liệu với giá ưu đãi (Do Admin quản lý trực tiếp)
            </p>
          </div>
        </div>

        <button
          id="bundle-add-btn"
          class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Tạo Combo Mới</span>
        </button>
      </div>

      <!-- Bundle Grid -->
      ${bundles.length > 0 ? `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${bundles.map((bundle) => {
            const docCount = bundle.documentIds?.length || 0;
            const savingAmount = Math.max(0, (bundle.originalPrice || 0) - (bundle.bundlePrice || 0));

            return `
              <div class="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all duration-200 group">
                <div class="space-y-3">
                  <!-- Cover Image & Badges -->
                  <div class="relative h-40 rounded-2xl overflow-hidden bg-gray-100">
                    <img
                      src="${escapeHtml(bundle.coverImage || '')}"
                      alt="${escapeHtml(bundle.title)}"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onerror="this.src='https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600'"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent"></div>

                    <div class="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      <span class="px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs flex items-center gap-1 ${
                        bundle.active
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-800/90 text-gray-300'
                      }">
                        <i class="fa-solid ${bundle.active ? 'fa-circle-check' : 'fa-circle-pause'} text-[9px]"></i>
                        <span>${bundle.active ? 'Đang mở bán' : 'Tạm dừng'}</span>
                      </span>
                    </div>

                    <div class="absolute bottom-2.5 left-2.5">
                      <span class="px-2.5 py-1 bg-red-600 text-white font-black text-xs rounded-lg shadow-sm flex items-center gap-1">
                        <i class="fa-solid fa-tag text-[10px]"></i>
                        <span>Tiết kiệm ${bundle.discountPercent || 0}%</span>
                      </span>
                    </div>
                  </div>

                  <!-- Title & Description -->
                  <div>
                    <h4 class="text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
                      ${escapeHtml(bundle.title)}
                    </h4>
                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">
                      ${escapeHtml(bundle.description || 'Gói tuyển tập các chuyên đề học tập trọng tâm')}
                    </p>
                  </div>

                  <!-- Details Pill Box -->
                  <div class="p-3.5 bg-gray-50/90 rounded-2xl border border-gray-100 space-y-2">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-gray-400 flex items-center gap-1.5">
                        <i class="fa-solid fa-coins text-[10px]"></i>
                        <span>Giá gốc:</span>
                      </span>
                      <span class="line-through text-gray-400 font-semibold">${formatVND(bundle.originalPrice)}</span>
                    </div>

                    <div class="flex items-center justify-between text-xs">
                      <span class="text-emerald-700 font-bold flex items-center gap-1.5">
                        <i class="fa-solid fa-bolt text-[10px]"></i>
                        <span>Giá Combo ưu đãi:</span>
                      </span>
                      <span class="text-emerald-600 font-black text-base">${formatVND(bundle.bundlePrice)}</span>
                    </div>

                    <div class="pt-2 border-t border-gray-200/50 flex items-center justify-between text-[11px] text-gray-500">
                      <span class="flex items-center gap-1">
                        <i class="fa-solid fa-file-lines text-emerald-600"></i>
                        <strong>${docCount}</strong> tài liệu
                      </span>
                      <span class="text-amber-600 font-medium flex items-center gap-1">
                        <i class="fa-solid fa-cart-shopping text-[10px]"></i>
                        <span>${bundle.salesCount || 0} lượt mua</span>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    data-bundle-toggle="${bundle.id}"
                    class="font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      bundle.active ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'
                    }"
                  >
                    <i class="fa-solid ${bundle.active ? 'fa-pause' : 'fa-play'} text-[10px]"></i>
                    <span>${bundle.active ? 'Tạm dừng' : 'Mở bán'}</span>
                  </button>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      data-bundle-edit="${bundle.id}"
                      class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <i class="fa-solid fa-pen text-[10px]"></i>
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      data-bundle-delete="${bundle.id}"
                      class="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <i class="fa-solid fa-trash text-[10px]"></i>
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      ` : `
        <div class="p-12 text-center bg-white rounded-3xl border border-gray-200/80 shadow-xs space-y-3 max-w-md mx-auto">
          <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-xs">
            <i class="fa-solid fa-boxes-stacked"></i>
          </div>
          <h4 class="text-sm font-bold text-gray-800">Chưa có gói Combo nào được tạo</h4>
          <p class="text-xs text-gray-400 leading-relaxed">
            Các gói combo do quản trị viên trực tiếp tạo và cấu hình tại đây. Nhấn nút "Tạo Combo Mới" để bắt đầu ghép tài liệu và đặt giá ưu đãi.
          </p>
        </div>
      `}
    </div>
  `;

  bindEvents(container, availableDocs);
};

const bindEvents = (container, availableDocs) => {
  // Add bundle button
  container.querySelector("#bundle-add-btn")?.addEventListener("click", () => {
    openBundleFormModal(null, availableDocs, () => renderBundlesTab(container));
  });

  // Toggle active
  container.querySelectorAll("[data-bundle-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetId = btn.getAttribute("data-bundle-toggle");
      const target = bundleService.getBundleById(targetId);
      if (!target) return;

      const actionText = target.active ? "tạm dừng bán" : "mở bán lại";
      const confirmed = await confirmDialog(`Bạn có chắc muốn ${actionText} combo "${target.title}"?`, {
        title: "Xác nhận trạng thái Combo",
        confirmText: "Đồng ý",
        cancelText: "Hủy",
        variant: target.active ? "warning" : "primary",
      });

      if (confirmed) {
        await bundleService.toggleBundle(target.id);
        toast.success(`Đã cập nhật trạng thái combo "${target.title}"`);
        renderBundlesTab(container);
      }
    });
  });

  // Delete bundle
  container.querySelectorAll("[data-bundle-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetId = btn.getAttribute("data-bundle-delete");
      const target = bundleService.getBundleById(targetId);
      if (!target) return;

      const confirmed = await confirmDialog(`Hành động này sẽ xóa vĩnh viễn combo "${target.title}". Thao tác không thể hoàn tác!`, {
        title: "Xóa Gói Combo",
        confirmText: "Xóa vĩnh viễn",
        cancelText: "Hủy",
        variant: "danger",
      });

      if (confirmed) {
        await bundleService.deleteBundle(target.id);
        toast.success(`Đã xóa combo "${target.title}" thành công!`);
        renderBundlesTab(container);
      }
    });
  });

  // Edit bundle
  container.querySelectorAll("[data-bundle-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-bundle-edit");
      const target = bundleService.getBundleById(targetId);
      if (target) {
        openBundleFormModal(target, availableDocs, () => renderBundlesTab(container));
      }
    });
  });
};

/**
 * Open interactive, multi-document picker modal for Bundle Creation/Editing
 */
const openBundleFormModal = (editingBundle = null, availableDocs = [], onSaved) => {
  const isEditing = Boolean(editingBundle);
  const title = isEditing ? `Chỉnh sửa Combo: ${editingBundle.title}` : "Tạo Gói Tài Liệu / Combo Mới";

  const existingSelectedIds = new Set(
    isEditing && Array.isArray(editingBundle.documentIds) ? editingBundle.documentIds : []
  );

  const existingOriginalPrice = isEditing ? Number(editingBundle.originalPrice) || 0 : 0;
  const existingBundlePrice = isEditing ? Number(editingBundle.bundlePrice) || 0 : 0;

  const modalOverlay = document.createElement("div");
  modalOverlay.id = "bundle-form-modal";
  modalOverlay.className = "fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 fade-in";
  modalOverlay.setAttribute("role", "dialog");
  modalOverlay.setAttribute("aria-modal", "true");

  modalOverlay.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-popup">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-white">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shadow-xs">
            <i class="fa-solid fa-boxes-stacked"></i>
          </div>
          <div>
            <h3 class="text-sm sm:text-base font-black text-gray-900">${escapeHtml(title)}</h3>
            <p class="text-[11px] text-gray-500">Ghép tài liệu và cấu hình mức giảm giá hấp dẫn</p>
          </div>
        </div>
        <button type="button" id="bundle-modal-close-btn" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs transition cursor-pointer">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <form id="bundle-modal-form" class="p-6 overflow-y-auto space-y-4 text-left flex-1 hide-scroll">
        <!-- Basic info -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Tên Combo / Gói tài liệu *</label>
            <input
              type="text"
              id="form-bundle-title"
              required
              placeholder="VD: Combo Ôn Thi Toán 12 Cấp Tốc"
              value="${isEditing ? escapeHtml(editingBundle.title) : ""}"
              class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Ảnh bìa Combo (URL)</label>
            <input
              type="url"
              id="form-bundle-cover"
              placeholder="https://images.unsplash.com/..."
              value="${isEditing ? escapeHtml(editingBundle.coverImage || "") : ""}"
              class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">Mô tả tóm tắt nội dung gói</label>
          <textarea
            id="form-bundle-desc"
            rows="2"
            placeholder="Bao gồm trọn bộ các dạng bài tập, đề thi thử có lời giải chi tiết..."
            class="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none"
          >${isEditing ? escapeHtml(editingBundle.description || "") : ""}</textarea>
        </div>

        <!-- Document Selection Section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <i class="fa-solid fa-file-circle-check text-emerald-600"></i>
              <span>Chọn tài liệu đưa vào Combo:</span>
              <span id="selected-count-badge" class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-bold">
                0 đã chọn
              </span>
            </label>

            <!-- Doc Search Filter -->
            <div class="relative w-48">
              <input
                type="text"
                id="doc-filter-input"
                placeholder="Tìm tài liệu..."
                class="w-full pl-7 pr-2.5 py-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white"
              />
              <i class="fa-solid fa-magnifying-glass text-[10px] text-gray-400 absolute left-2.5 top-2"></i>
            </div>
          </div>

          <!-- Document List Box -->
          <div id="bundle-docs-list" class="max-h-52 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-gray-50 border border-gray-200 divide-y divide-gray-100/80">
            ${availableDocs.length > 0 ? availableDocs.map((doc) => {
              const docPrice = Number(doc.price || 0);
              const isChecked = existingSelectedIds.has(doc.id);

              return `
                <label
                  data-doc-item="${doc.id}"
                  data-doc-title="${escapeHtml((doc.title || '').toLowerCase())}"
                  class="flex items-center justify-between gap-3 p-2 rounded-xl cursor-pointer hover:bg-white transition-all select-none ${isChecked ? 'bg-white shadow-xs border border-emerald-200' : ''}"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      name="selectedDocs"
                      value="${escapeHtml(doc.id)}"
                      data-doc-price="${docPrice}"
                      ${isChecked ? "checked" : ""}
                      class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer shrink-0"
                    />
                    <img
                      src="${escapeHtml(doc.thumbnail || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100')}"
                      alt="thumb"
                      class="w-8 h-10 object-cover rounded-md bg-gray-200 shrink-0 border border-gray-200"
                      onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100'"
                    />
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-gray-800 truncate">${escapeHtml(doc.title)}</p>
                      <div class="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span class="px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded font-semibold">${escapeHtml(doc.grade || 'Lớp')}</span>
                        <span>${escapeHtml(doc.subject || 'Tổng hợp')}</span>
                      </div>
                    </div>
                  </div>

                  <span class="text-xs font-bold font-mono text-emerald-600 shrink-0">
                    ${formatVND(docPrice)}
                  </span>
                </label>
              `;
            }).join("") : `
              <p class="text-xs text-gray-400 p-4 text-center">Chưa có tài liệu nào trong hệ thống để tạo combo.</p>
            `}
          </div>
        </div>

        <!-- Pricing Calculator Box -->
        <div class="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-gray-700">Công cụ tính giá ưu đãi</span>
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] text-gray-400">Gợi ý giảm:</span>
              <button type="button" data-apply-pct="20" class="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition cursor-pointer">-20%</button>
              <button type="button" data-apply-pct="30" class="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition cursor-pointer">-30%</button>
              <button type="button" data-apply-pct="40" class="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition cursor-pointer">-40%</button>
              <button type="button" data-apply-pct="50" class="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition cursor-pointer">-50%</button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">
                Giá gốc tổng cộng (Tự động tính)
              </label>
              <input
                type="number"
                id="form-bundle-original"
                min="0"
                step="1000"
                value="${existingOriginalPrice}"
                class="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-emerald-700 mb-1">
                Giá bán Combo khuyến mãi (VNĐ) *
              </label>
              <input
                type="number"
                id="form-bundle-price"
                required
                min="1000"
                step="1000"
                placeholder="VD: 69000"
                value="${existingBundlePrice}"
                class="w-full px-3.5 py-2 bg-white border-2 border-emerald-500 rounded-xl text-xs font-mono font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <!-- Savings banner preview -->
          <div id="bundle-saving-preview" class="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between text-xs">
            <span class="text-gray-500">Mức tiết kiệm cho học sinh:</span>
            <span id="bundle-saving-text" class="font-bold text-emerald-700 font-mono">0đ (0%)</span>
          </div>
        </div>

        <!-- Submit actions -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            id="bundle-cancel-btn"
            class="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            id="bundle-submit-btn"
            class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <i class="fa-solid fa-floppy-disk text-xs"></i>
            <span>${isEditing ? "Cập nhật Combo" : "Lưu Combo"}</span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  // Close logic
  const closeModal = () => modalOverlay.remove();
  modalOverlay.querySelector("#bundle-modal-close-btn")?.addEventListener("click", closeModal);
  modalOverlay.querySelector("#bundle-cancel-btn")?.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Filter input logic
  const filterInput = modalOverlay.querySelector("#doc-filter-input");
  filterInput?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    modalOverlay.querySelectorAll("[data-doc-item]").forEach((item) => {
      const titleText = item.getAttribute("data-doc-title") || "";
      item.classList.toggle("hidden", !titleText.includes(q));
    });
  });

  // Checkbox calculation logic
  const checkboxes = modalOverlay.querySelectorAll('input[name="selectedDocs"]');
  const countBadge = modalOverlay.querySelector("#selected-count-badge");
  const origInput = modalOverlay.querySelector("#form-bundle-original");
  const priceInput = modalOverlay.querySelector("#form-bundle-price");
  const savingText = modalOverlay.querySelector("#bundle-saving-text");

  const updateCalculations = () => {
    let sum = 0;
    let checkedCount = 0;

    checkboxes.forEach((cb) => {
      const parentLabel = cb.closest("label");
      if (cb.checked) {
        checkedCount++;
        sum += Number(cb.getAttribute("data-doc-price")) || 0;
        parentLabel?.classList.add("bg-white", "shadow-xs", "border", "border-emerald-200");
      } else {
        parentLabel?.classList.remove("bg-white", "shadow-xs", "border", "border-emerald-200");
      }
    });

    if (countBadge) {
      countBadge.textContent = `${checkedCount} đã chọn`;
    }

    // Auto-update original price if empty or modified
    if (origInput && (!origInput.value || !isEditing || Number(origInput.value) === 0)) {
      origInput.value = sum;
    }

    recalcSavings();
  };

  const recalcSavings = () => {
    const orig = Number(origInput?.value) || 0;
    const bPrice = Number(priceInput?.value) || 0;
    const saving = Math.max(0, orig - bPrice);
    const pct = orig > 0 ? Math.round((saving / orig) * 100) : 0;

    if (savingText) {
      savingText.textContent = `${formatVND(saving)} (Tiết kiệm ${pct}%)`;
    }
  };

  checkboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      let sum = 0;
      checkboxes.forEach((c) => {
        if (c.checked) sum += Number(c.getAttribute("data-doc-price")) || 0;
      });
      if (origInput) origInput.value = sum;
      updateCalculations();
    });
  });

  origInput?.addEventListener("input", recalcSavings);
  priceInput?.addEventListener("input", recalcSavings);

  // Quick discount percentage buttons
  modalOverlay.querySelectorAll("[data-apply-pct]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pct = Number(btn.getAttribute("data-apply-pct")) || 0;
      const orig = Number(origInput?.value) || 0;
      if (orig > 0 && priceInput) {
        const discounted = Math.round((orig * (1 - pct / 100)) / 1000) * 1000;
        priceInput.value = discounted;
        recalcSavings();
      }
    });
  });

  // Initial calculation run
  updateCalculations();

  // Form submission
  const formEl = modalOverlay.querySelector("#bundle-modal-form");
  formEl?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const titleVal = modalOverlay.querySelector("#form-bundle-title")?.value.trim();
    const coverVal = modalOverlay.querySelector("#form-bundle-cover")?.value.trim();
    const descVal = modalOverlay.querySelector("#form-bundle-desc")?.value.trim();
    const origVal = Number(origInput?.value) || 0;
    const bPriceVal = Number(priceInput?.value) || 0;

    const checkedDocs = Array.from(checkboxes).filter((c) => c.checked).map((c) => c.value);

    if (!titleVal) {
      toast.warning("Vui lòng nhập tên gói combo.");
      return;
    }

    if (checkedDocs.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 tài liệu cho gói combo này.");
      return;
    }

    if (origVal <= 0 || bPriceVal <= 0) {
      toast.warning("Giá gốc và giá combo phải lớn hơn 0đ.");
      return;
    }

    if (bPriceVal >= origVal) {
      toast.warning("Giá Combo ưu đãi nên thấp hơn giá gốc để kích thích mua hàng!");
    }

    const submitBtn = modalOverlay.querySelector("#bundle-submit-btn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang lưu...</span>`;
    }

    try {
      const payload = {
        title: titleVal,
        description: descVal,
        coverImage: coverVal || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600",
        documentIds: checkedDocs,
        originalPrice: origVal,
        bundlePrice: bPriceVal,
      };

      if (isEditing) {
        await bundleService.updateBundle(editingBundle.id, payload);
        toast.success(`Đã cập nhật combo "${titleVal}" thành công!`);
      } else {
        await bundleService.addBundle(payload);
        toast.success(`Đã tạo combo "${titleVal}" thành công!`);
      }

      closeModal();
      if (typeof onSaved === "function") onSaved();
    } catch (err) {
      toast.error(`Lỗi: ${err.message || "Không thể lưu combo"}`);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk text-xs"></i> <span>${isEditing ? "Cập nhật Combo" : "Lưu Combo"}</span>`;
      }
    }
  });
};
