/**
 * Admin Promotions & Coupons Management Tab for DkDocShop 2.0
 * Dynamic admin-managed vouchers, zero pre-filled mock data, zero browser popups.
 */
import { toast } from "../../../components/toast.js";
import { confirmDialog } from "../../../components/ConfirmDialog.js";
import { modal } from "../../../components/modal.js";
import { escapeHtml } from "../../../utils/sanitize.js";
import { promotionService } from "../../../services/promotion.service.js";
import { formatVND } from "../../../utils/format.js";
import { copyText } from "../../../utils/clipboard.js";

export const renderPromotionsTab = (container) => {
  const promos = promotionService.getPromotions();
  const activeCount = promos.filter((p) => p.active).length;
  const totalUsed = promos.reduce((sum, p) => sum + (Number(p.usedCount) || 0), 0);

  container.innerHTML = `
    <div class="space-y-6 fade-in">
      <!-- Header & Stats -->
      <div class="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase mb-2">
            <i class="fa-solid fa-ticket"></i>
            <span>Hệ Thống Voucher Khuyến Mãi</span>
          </div>
          <h3 class="font-extrabold text-base sm:text-lg text-gray-900">
            Quản Lý Mã Giảm Giá & Voucher
          </h3>
          <p class="text-xs text-gray-500 mt-0.5">
            Cấu hình voucher chiết khấu % hoặc số tiền cố định. Dữ liệu do Quản trị viên trực tiếp phát hành.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
            <div>
              <span class="text-gray-400 block text-[10px]">Đang chạy</span>
              <strong class="text-emerald-600 font-mono">${activeCount}/${promos.length}</strong>
            </div>
            <div class="w-px h-6 bg-gray-200"></div>
            <div>
              <span class="text-gray-400 block text-[10px]">Lượt đã dùng</span>
              <strong class="text-blue-600 font-mono">${totalUsed}</strong>
            </div>
          </div>

          <button
            type="button"
            id="promo-add-btn"
            class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <i class="fa-solid fa-plus"></i>
            <span>Tạo Voucher Mới</span>
          </button>
        </div>
      </div>

      <!-- Vouchers Grid -->
      ${promos.length > 0 ? `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${promos.map((promo) => {
            const now = Date.now();
            const isExpired = promo.validTo && now > promo.validTo;
            const isExhausted = promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit;
            const isPercent = promo.type === 'percentage' || promo.type === 'percent';

            let statusBadge = '';
            if (!promo.active) {
              statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">Tạm dừng</span>';
            } else if (isExpired) {
              statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Hết hạn</span>';
            } else if (isExhausted) {
              statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Hết lượt</span>';
            } else {
              statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Đang chạy</span>';
            }

            return `
              <div class="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition">
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                      <span class="px-3 py-1 bg-emerald-50 text-emerald-800 font-mono font-black text-sm rounded-xl border border-emerald-200 tracking-wider">
                        ${escapeHtml(promo.code)}
                      </span>
                      <button
                        type="button"
                        data-promo-copy="${escapeHtml(promo.code)}"
                        class="p-1.5 text-gray-400 hover:text-emerald-600 text-xs transition cursor-pointer"
                        title="Sao chép mã"
                      >
                        <i class="fa-solid fa-copy"></i>
                      </button>
                    </div>
                    ${statusBadge}
                  </div>

                  <div class="text-xl font-black text-gray-900">
                    ${isPercent ? `Giảm ${promo.value}%` : `Giảm ${formatVND(promo.value)}`}
                    ${isPercent && promo.maxDiscount ? `<span class="text-xs font-normal text-gray-400 ml-1">(Tối đa ${formatVND(promo.maxDiscount)})</span>` : ''}
                  </div>

                  <p class="text-xs text-gray-600 leading-relaxed">${escapeHtml(promo.description || "Ưu đãi giảm giá đơn hàng tài liệu")}</p>

                  <!-- Usage & Expiration Info -->
                  <div class="space-y-1.5 pt-1 text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <div class="flex justify-between">
                      <span>Đơn tối thiểu:</span>
                      <strong class="text-gray-700">${promo.minOrder ? formatVND(promo.minOrder) : '0đ (Mọi đơn)'}</strong>
                    </div>

                    <div class="flex justify-between">
                      <span>Đã dùng:</span>
                      <strong class="text-gray-700 font-mono">
                        ${promo.usedCount || 0} / ${promo.usageLimit > 0 ? `${promo.usageLimit} lượt` : 'Vô hạn'}
                      </strong>
                    </div>

                    ${promo.validTo ? `
                      <div class="flex justify-between">
                        <span>Hết hạn:</span>
                        <strong class="${isExpired ? 'text-red-600' : 'text-gray-700'}">
                          ${new Date(promo.validTo).toLocaleDateString("vi-VN")}
                        </strong>
                      </div>
                    ` : `
                      <div class="flex justify-between">
                        <span>Thời hạn:</span>
                        <strong class="text-gray-700">Vĩnh viễn</strong>
                      </div>
                    `}
                  </div>
                </div>

                <div class="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    data-promo-toggle="${promo.id}"
                    class="font-semibold transition cursor-pointer flex items-center gap-1.5 ${promo.active ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'}"
                  >
                    <i class="fa-solid ${promo.active ? 'fa-pause' : 'fa-play'} text-[10px]"></i>
                    <span>${promo.active ? 'Tạm dừng' : 'Kích hoạt'}</span>
                  </button>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      data-promo-edit="${promo.id}"
                      class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <i class="fa-solid fa-pen text-[10px]"></i>
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      data-promo-delete="${promo.id}"
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
            <i class="fa-solid fa-ticket"></i>
          </div>
          <h4 class="text-sm font-bold text-gray-800">Chưa có mã voucher nào được tạo</h4>
          <p class="text-xs text-gray-400 leading-relaxed">
            Voucher và khuyến mãi được quản trị viên trực tiếp cấu hình tại đây. Nhấn nút "Tạo Voucher Mới" để phát hành mã giảm giá cho học sinh.
          </p>
        </div>
      `}
    </div>
  `;

  bindEvents(container);
};

const bindEvents = (container) => {
  // Copy voucher code
  container.querySelectorAll("[data-promo-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.getAttribute("data-promo-copy");
      const ok = await copyText(code);
      if (ok) toast.success(`Đã sao chép mã ${code}!`);
    });
  });

  // Toggle active status
  container.querySelectorAll("[data-promo-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetId = btn.getAttribute("data-promo-toggle");
      const updated = await promotionService.togglePromotion(targetId);
      if (updated) {
        toast.success(`Đã ${updated.active ? 'kích hoạt' : 'tạm dừng'} mã ${updated.code}`);
        renderPromotionsTab(container);
      }
    });
  });

  // Delete promotion
  container.querySelectorAll("[data-promo-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetId = btn.getAttribute("data-promo-delete");
      const target = promotionService.getPromotionById(targetId);
      const codeName = target ? target.code : "này";

      const confirmed = await confirmDialog(
        `Bạn có chắc chắn muốn xóa mã giảm giá "${codeName}"? Thao tác này không thể hoàn tác.`,
        {
          title: "Xóa mã voucher",
          confirmText: "Xóa vĩnh viễn",
          cancelText: "Hủy",
          variant: "danger",
        }
      );

      if (confirmed) {
        await promotionService.deletePromotion(targetId);
        toast.success(`Đã xóa voucher ${codeName}`);
        renderPromotionsTab(container);
      }
    });
  });

  // Add promotion button
  container.querySelector("#promo-add-btn")?.addEventListener("click", () => {
    openPromoFormModal(null, () => renderPromotionsTab(container));
  });

  // Edit promotion button
  container.querySelectorAll("[data-promo-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-promo-edit");
      const target = promotionService.getPromotionById(targetId);
      if (target) {
        openPromoFormModal(target, () => renderPromotionsTab(container));
      }
    });
  });
};

const openPromoFormModal = (editingPromo = null, onSaved) => {
  const isEditing = Boolean(editingPromo);
  const title = isEditing ? `Chỉnh sửa Voucher: ${editingPromo.code}` : "Tạo Mã Giảm Giá Mới";

  const dateVal = editingPromo?.validTo
    ? new Date(editingPromo.validTo).toISOString().split("T")[0]
    : "";

  const formHtml = `
    <form id="promo-modal-form" class="space-y-4 text-left">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">Mã Voucher (Code) *</label>
          <input
            type="text"
            id="form-promo-code"
            required
            placeholder="VD: HOCGIOI20"
            value="${editingPromo ? escapeHtml(editingPromo.code) : ""}"
            class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:border-emerald-500 outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">Loại giảm giá *</label>
          <select
            id="form-promo-type"
            class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-emerald-500 outline-none cursor-pointer"
          >
            <option value="percentage" ${editingPromo?.type === 'percentage' || editingPromo?.type === 'percent' ? 'selected' : ''}>Phần trăm (%)</option>
            <option value="fixed" ${editingPromo?.type === 'fixed' ? 'selected' : ''}>Số tiền cố định (VNĐ)</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">Giá trị giảm *</label>
          <input
            type="number"
            id="form-promo-val"
            required
            min="1"
            placeholder="VD: 20 (cho %) hoặc 15000 (cho VNĐ)"
            value="${editingPromo ? editingPromo.value : ""}"
            class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:border-emerald-500 outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">Mức giảm tối đa (VNĐ)</label>
          <input
            type="number"
            id="form-promo-max-discount"
            min="0"
            step="1000"
            placeholder="Để 0 nếu không giới hạn (chỉ dùng cho %)"
            value="${editingPromo?.maxDiscount || 0}"
            class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">Đơn hàng tối thiểu (VNĐ)</label>
          <input
            type="number"
            id="form-promo-min-order"
            min="0"
            step="1000"
            placeholder="0 = Áp dụng mọi đơn"
            value="${editingPromo?.minOrder || 0}"
            class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:border-emerald-500 outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">Giới hạn số lượt dùng</label>
          <input
            type="number"
            id="form-promo-limit"
            min="0"
            placeholder="0 = Không giới hạn lượt"
            value="${editingPromo?.usageLimit || 0}"
            class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">Ngày hết hạn</label>
          <input
            type="date"
            id="form-promo-exp"
            value="${dateVal}"
            class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none"
          />
          <p class="text-[10px] text-gray-400 mt-0.5">Để trống nếu voucher không có thời hạn</p>
        </div>

        <div class="flex items-center pt-5">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="form-promo-active"
              ${!editingPromo || editingPromo.active ? 'checked' : ''}
              class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span class="text-xs font-bold text-gray-800">Kích hoạt voucher ngay lập tức</span>
          </label>
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-gray-700 mb-1">Mô tả hiển thị</label>
        <textarea
          id="form-promo-desc"
          rows="2"
          placeholder="VD: Giảm 20% tối đa 30.000đ cho chuyên đề Toán - Lý 12"
          class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none"
        >${editingPromo ? escapeHtml(editingPromo.description || "") : ""}</textarea>
      </div>

      <div class="pt-3 border-t border-gray-100 flex justify-end gap-2.5">
        <button
          type="button"
          id="modal-cancel-btn"
          class="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="submit"
          class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
        >
          ${isEditing ? 'Lưu Thay Đổi' : 'Tạo Voucher'}
        </button>
      </div>
    </form>
  `;

  modal.open({
    title,
    contentHtml: formHtml,
    actionBtn: "",
  });

  const form = document.getElementById("promo-modal-form");
  document.getElementById("modal-cancel-btn")?.addEventListener("click", () => {
    modal.close();
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const code = document.getElementById("form-promo-code")?.value?.trim().toUpperCase();
    const type = document.getElementById("form-promo-type")?.value;
    const value = Number(document.getElementById("form-promo-val")?.value);
    const minOrder = Number(document.getElementById("form-promo-min-order")?.value) || 0;
    const maxDiscount = Number(document.getElementById("form-promo-max-discount")?.value) || 0;
    const usageLimit = Number(document.getElementById("form-promo-limit")?.value) || 0;
    const expDateStr = document.getElementById("form-promo-exp")?.value;
    const description = document.getElementById("form-promo-desc")?.value?.trim() || "";
    const active = document.getElementById("form-promo-active")?.checked;

    const validTo = expDateStr ? new Date(`${expDateStr}T23:59:59`).getTime() : null;

    if (!code) {
      toast.warning("Vui lòng nhập mã voucher.");
      return;
    }

    if (!value || value <= 0) {
      toast.warning("Vui lòng nhập giá trị giảm giá hợp lệ.");
      return;
    }

    if (type === "percentage" && value > 100) {
      toast.warning("Phần trăm giảm giá không được vượt quá 100%.");
      return;
    }

    try {
      if (isEditing) {
        await promotionService.updatePromotion(editingPromo.id, {
          code,
          type,
          value,
          minOrder,
          maxDiscount,
          usageLimit,
          validTo,
          description,
          active,
        });
        toast.success(`Đã cập nhật mã ${code}!`);
      } else {
        await promotionService.addPromotion({
          code,
          type,
          value,
          minOrder,
          maxDiscount,
          usageLimit,
          validTo,
          description,
          active,
        });
        toast.success(`Đã tạo thành công mã giảm giá ${code}!`);
      }

      modal.close();
      if (typeof onSaved === "function") {
        onSaved();
      }
    } catch (err) {
      toast.error(err.message || "Lỗi lưu voucher.");
    }
  });
};

export default renderPromotionsTab;
