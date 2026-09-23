/**
 * Custom Purchase Modal for DkDocShop 2.0
 * Comprehensive checkout with detailed voucher picker, real-time discount calculation, and usage recording.
 */
import { store } from "../../app/state.js";
import { formatVND } from "../../utils/format.js";
import { safe } from "../../utils/sanitize.js";
import { promotionService } from "../../services/promotion.service.js";
import { PurchaseService } from "../../services/purchase.service.js";
import { toast } from "../../components/toast.js";
import { router } from "../../app/router.js";
import { Routes } from "../../app/constants.js";

export const openPurchaseModal = (doc, onSuccess) => {
  const user = store.getState().auth.currentUser;
  const userData = store.getState().user.data;

  if (!user) {
    toast.warning("Vui lòng đăng nhập để mua tài liệu.");
    return;
  }

  const existing = document.getElementById("custom-purchase-modal");
  if (existing) existing.remove();

  const balance = Number(userData?.walletBalance || 0);
  const basePrice = Number(doc.price || 0);
  let finalPrice = basePrice;
  let appliedCoupon = null;
  let couponError = "";

  const activePromos = promotionService.getActivePromotions();

  const modalOverlay = document.createElement("div");
  modalOverlay.id = "custom-purchase-modal";
  modalOverlay.className = "fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in overflow-y-auto";
  modalOverlay.setAttribute("role", "dialog");
  modalOverlay.setAttribute("aria-modal", "true");

  const renderModalContent = () => {
    const isEnough = balance >= finalPrice;
    const needed = finalPrice - balance;

    modalOverlay.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl p-6 sm:p-7 max-w-md w-full mx-auto border border-gray-100 transform scale-95 transition-all duration-200 animate-popup my-auto">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3.5 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 class="text-sm font-bold text-gray-900 tracking-tight">Xác nhận đơn mua tài liệu</h3>
          </div>
          <button type="button" id="purchase-modal-close-btn" class="w-7 h-7 rounded-full hover:bg-gray-100 text-gray-400 flex items-center justify-center text-xs transition cursor-pointer">✕</button>
        </div>

        <!-- Document Preview -->
        <div class="my-4 p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3.5">
          <img
            src="${safe(doc.thumbnail || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160")}"
            alt="${safe(doc.title)}"
            class="w-14 h-16 rounded-xl object-cover border border-gray-200 shadow-2xs shrink-0"
          />
          <div class="overflow-hidden min-w-0">
            <h4 class="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">${safe(doc.title)}</h4>
            <div class="flex items-center gap-2 mt-1 flex-wrap">
              <span class="px-2 py-0.5 rounded-md bg-emerald-100/60 text-emerald-800 text-[10px] font-bold">${safe(doc.subject || "Tổng hợp")}</span>
              <span class="text-[11px] text-gray-400">Lớp ${safe(doc.grade || "Chung")}</span>
            </div>
          </div>
        </div>

        <!-- Price Breakdown -->
        <div class="space-y-2 py-2 text-xs">
          <div class="flex justify-between text-gray-600">
            <span>Giá niêm yết:</span>
            <span class="font-semibold text-gray-800 font-mono">${formatVND(basePrice)}</span>
          </div>

          ${appliedCoupon ? `
            <div class="flex justify-between text-emerald-600 font-semibold bg-emerald-50 p-2 rounded-xl">
              <span>Mã giảm giá (${safe(appliedCoupon.code)}):</span>
              <span class="font-mono">-${formatVND(appliedCoupon.discountAmount)}</span>
            </div>
          ` : ""}

          <div class="flex justify-between text-xs font-bold pt-2 border-t border-gray-100">
            <span class="text-gray-900 text-sm">Số tiền cần thanh toán:</span>
            <span class="text-emerald-700 font-mono text-base font-black">${formatVND(finalPrice)}</span>
          </div>

          <div class="flex justify-between text-xs pt-1 text-gray-500">
            <span>Số dư ví hiện tại:</span>
            <span class="font-mono font-medium text-gray-700">${formatVND(balance)}</span>
          </div>
        </div>

        <!-- Coupon Input & Picker -->
        <div class="my-3 pt-2">
          <div class="flex gap-2">
            <input
              type="text"
              id="purchase-coupon-input"
              placeholder="Nhập mã ưu đãi (VD: DKDOC20)"
              value="${appliedCoupon ? safe(appliedCoupon.code) : ""}"
              class="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs uppercase font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            ${appliedCoupon ? `
              <button
                type="button"
                id="purchase-remove-coupon-btn"
                class="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Hủy mã
              </button>
            ` : `
              <button
                type="button"
                id="purchase-apply-coupon-btn"
                class="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Áp dụng
              </button>
            `}
          </div>

          ${couponError ? `
            <p class="text-[11px] text-red-600 mt-1.5 flex items-center gap-1">
              <i class="fa-solid fa-circle-exclamation"></i>
              <span>${safe(couponError)}</span>
            </p>
          ` : ""}

          <!-- Quick pick voucher list if available -->
          ${activePromos.length > 0 && !appliedCoupon ? `
            <div class="mt-2 flex items-center gap-1.5 overflow-x-auto hide-scroll py-1">
              <span class="text-[10px] text-gray-400 font-medium shrink-0">Mã có sẵn:</span>
              ${activePromos.map((p) => `
                <button
                  type="button"
                  data-pick-promo="${safe(p.code)}"
                  class="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold shrink-0 transition cursor-pointer"
                >
                  ${safe(p.code)} (${p.type === 'percent' || p.type === 'percentage' ? `-${p.value}%` : `-${formatVND(p.value)}`})
                </button>
              `).join("")}
            </div>
          ` : ""}
        </div>

        <!-- Status Message if Insufficient -->
        ${!isEnough ? `
          <div class="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <div>
              <p class="font-bold flex items-center gap-1">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Số dư không đủ</span>
              </p>
              <p class="text-[11px] text-red-600 mt-0.5">Còn thiếu ${formatVND(needed)} để hoàn tất.</p>
            </div>
            <button
              type="button"
              id="purchase-topup-btn"
              class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              Nạp tiền ngay
            </button>
          </div>
        ` : ""}

        <!-- Action Buttons -->
        <div class="flex gap-2.5 pt-2">
          <button
            type="button"
            id="purchase-cancel-btn"
            class="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
          >
            Hủy
          </button>

          ${isEnough ? `
            <button
              type="button"
              id="purchase-confirm-btn"
              class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <i class="fa-solid fa-credit-card"></i>
              <span>Xác nhận thanh toán</span>
            </button>
          ` : `
            <button
              type="button"
              id="purchase-topup-cta-btn"
              class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Nạp tiền vào ví
            </button>
          `}
        </div>
      </div>
    `;

    attachEvents();
  };

  const close = () => {
    modalOverlay.remove();
  };

  const attachEvents = () => {
    modalOverlay.querySelector("#purchase-modal-close-btn")?.addEventListener("click", close);
    modalOverlay.querySelector("#purchase-cancel-btn")?.addEventListener("click", close);

    modalOverlay.querySelector("#purchase-topup-btn")?.addEventListener("click", () => {
      close();
      router.navigate(Routes.WALLET);
    });

    modalOverlay.querySelector("#purchase-topup-cta-btn")?.addEventListener("click", () => {
      close();
      router.navigate(Routes.WALLET);
    });

    // Pick available promo quick click
    modalOverlay.querySelectorAll("[data-pick-promo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = btn.getAttribute("data-pick-promo");
        const res = promotionService.validateCode(code, basePrice);
        if (res && res.valid) {
          appliedCoupon = res;
          finalPrice = res.finalPrice;
          couponError = "";
          toast.success(`Đã áp dụng mã ${res.code}: Giảm ${formatVND(res.discountAmount)}!`);
          renderModalContent();
        } else {
          couponError = res?.error || "Mã không hợp lệ.";
          renderModalContent();
        }
      });
    });

    // Apply Coupon
    modalOverlay.querySelector("#purchase-apply-coupon-btn")?.addEventListener("click", () => {
      const code = modalOverlay.querySelector("#purchase-coupon-input")?.value?.trim();
      if (!code) {
        toast.warning("Vui lòng nhập mã giảm giá.");
        return;
      }

      const res = promotionService.validateCode(code, basePrice);
      if (res && res.valid) {
        appliedCoupon = res;
        finalPrice = res.finalPrice;
        couponError = "";
        toast.success(`Đã áp dụng mã ${res.code}: Giảm ${formatVND(res.discountAmount)}!`);
        renderModalContent();
      } else {
        couponError = res?.error || "Mã giảm giá không hợp lệ hoặc đã hết lượt dùng.";
        renderModalContent();
      }
    });

    // Remove Coupon
    modalOverlay.querySelector("#purchase-remove-coupon-btn")?.addEventListener("click", () => {
      appliedCoupon = null;
      finalPrice = basePrice;
      couponError = "";
      toast.info("Đã gỡ mã giảm giá.");
      renderModalContent();
    });

    // Confirm Payment
    modalOverlay.querySelector("#purchase-confirm-btn")?.addEventListener("click", async () => {
      const btn = modalOverlay.querySelector("#purchase-confirm-btn");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang xử lý...';
      }

      try {
        await PurchaseService.purchaseDocument(doc.id, appliedCoupon ? appliedCoupon.code : "");
        close();
        toast.success("Đã mua tài liệu thành công!");

        if (typeof onSuccess === "function") {
          onSuccess();
        }
      } catch (err) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-credit-card mr-1"></i> Xác nhận thanh toán';
        }
        toast.error(err.message || "Giao dịch không thành công.");
      }
    });

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) close();
    });
  };

  document.body.appendChild(modalOverlay);
  renderModalContent();
};

export default openPurchaseModal;
