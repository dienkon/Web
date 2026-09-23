/**
 * Bundle Purchase Modal for DkDocShop 2.0
 * Comprehensive checkout experience for document combos with coupon support and immediate library unlock.
 */
import { store } from "../../app/state.js";
import { formatVND } from "../../utils/format.js";
import { safe } from "../../utils/sanitize.js";
import { promotionService } from "../../services/promotion.service.js";
import { bundleService } from "../../services/bundle.service.js";
import { authService } from "../../services/auth.service.js";
import { toast } from "../../components/toast.js";
import { router } from "../../app/router.js";
import { Routes } from "../../app/constants.js";

export const openBundlePurchaseModal = (bundle, onSuccess) => {
  const user = store.getState().auth.currentUser;
  const userData = store.getState().user.data;
  const isGuest = !user;

  const existing = document.getElementById("bundle-purchase-modal");
  if (existing) existing.remove();

  const balance = Number(userData?.walletBalance || 0);
  const baseBundlePrice = Number(bundle.bundlePrice || 0);
  let finalPrice = baseBundlePrice;
  let appliedCoupon = null;

  const ownership = user
    ? bundleService.checkOwnership(bundle.id, user.uid)
    : { ownedCount: 0, totalCount: bundle.documentIds?.length || 0, allOwned: false, ownedDocIds: [] };
  const includedDocs = bundleService.getBundleDocuments(bundle.id);
  const activePromos = promotionService.getActivePromotions();

  const modalOverlay = document.createElement("div");
  modalOverlay.id = "bundle-purchase-modal";
  modalOverlay.className = "fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in overflow-y-auto";
  modalOverlay.setAttribute("role", "dialog");
  modalOverlay.setAttribute("aria-modal", "true");

  const renderModalContent = () => {
    const isEnough = balance >= finalPrice;
    const needed = finalPrice - balance;

    modalOverlay.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl p-6 sm:p-7 max-w-lg w-full mx-auto border border-gray-100 transform scale-95 transition-all duration-200 animate-popup my-auto">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3.5 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 class="text-sm font-bold text-gray-900 tracking-tight">Sở Hữu Trọn Bộ Combo Tài Liệu</h3>
          </div>
          <button type="button" id="bundle-modal-close-btn" class="w-7 h-7 rounded-full hover:bg-gray-100 text-gray-400 flex items-center justify-center text-xs transition cursor-pointer">✕</button>
        </div>

        <!-- Bundle Card Summary -->
        <div class="my-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border border-emerald-100/80 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
              Tiết kiệm ${formatVND(bundle.savingAmount)} (-${bundle.discountPercent}%)
            </span>
            <span class="text-xs text-gray-500 font-medium">${includedDocs.length} tài liệu</span>
          </div>

          <h4 class="text-sm font-extrabold text-gray-900 leading-snug">${safe(bundle.title)}</h4>
          <p class="text-xs text-gray-600 leading-relaxed">${safe(bundle.description || "Gói tài liệu học tập chuyên đề chọn lọc.")}</p>

          ${ownership.ownedCount > 0 ? `
            <div class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
              <i class="fa-solid fa-circle-info text-amber-600"></i>
              <span>Bạn đã sở hữu <strong>${ownership.ownedCount}/${ownership.totalCount}</strong> tài liệu trong combo này. Mua combo sẽ kích hoạt các tài liệu còn lại vào thư viện của bạn!</span>
            </div>
          ` : ""}
        </div>

        <!-- Included Documents Preview -->
        <div class="space-y-2 mb-4">
          <h5 class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Danh sách tài liệu được mở khóa:</h5>
          <div class="max-h-36 overflow-y-auto space-y-1.5 pr-1 hide-scroll">
            ${includedDocs.map((doc, idx) => {
              const isOwned = ownership.ownedDocIds.includes(doc.id);
              return `
                <div class="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2 min-w-0 pr-2">
                    <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                      ${idx + 1}
                    </span>
                    <span class="font-medium text-gray-800 truncate">${safe(doc.title)}</span>
                  </div>
                  <div class="shrink-0 text-right">
                    ${isOwned ? `
                      <span class="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Đã có</span>
                    ` : `
                      <span class="font-mono text-gray-500">${formatVND(doc.price)}</span>
                    `}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Price Breakdown -->
        <div class="space-y-2 py-2 text-xs border-t border-gray-100">
          <div class="flex justify-between text-gray-500">
            <span>Tổng giá niêm yết:</span>
            <span class="font-mono line-through">${formatVND(bundle.originalPrice)}</span>
          </div>

          <div class="flex justify-between text-gray-800 font-semibold">
            <span>Giá combo ưu đãi:</span>
            <span class="font-mono">${formatVND(baseBundlePrice)}</span>
          </div>

          ${appliedCoupon ? `
            <div class="flex justify-between text-emerald-600 font-bold bg-emerald-50 p-2 rounded-xl">
              <span>Mã ưu đãi (${safe(appliedCoupon.code)}):</span>
              <span class="font-mono">-${formatVND(appliedCoupon.discountAmount)}</span>
            </div>
          ` : ""}

          <div class="flex justify-between text-xs font-bold pt-2 border-t border-gray-100">
            <span class="text-gray-900 text-sm">Số tiền thanh toán:</span>
            <span class="text-emerald-700 font-mono text-base font-black">${formatVND(finalPrice)}</span>
          </div>

          <div class="flex justify-between text-xs pt-1 text-gray-500">
            <span>Số dư ví của bạn:</span>
            <span class="font-mono font-medium text-gray-700">${formatVND(balance)}</span>
          </div>
        </div>

        <!-- Coupon Voucher Section -->
        <div class="my-3 pt-1">
          <div class="flex gap-2">
            <input
              type="text"
              id="bundle-coupon-input"
              placeholder="Nhập mã ưu đãi (VD: DKDOC20)"
              value="${appliedCoupon ? safe(appliedCoupon.code) : ""}"
              class="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs uppercase font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            ${appliedCoupon ? `
              <button
                type="button"
                id="bundle-remove-coupon-btn"
                class="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Hủy mã
              </button>
            ` : `
              <button
                type="button"
                id="bundle-apply-coupon-btn"
                class="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Áp dụng
              </button>
            `}
          </div>

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

        <!-- Status Warning if balance is insufficient or user is guest -->
        ${isGuest ? `
          <div class="p-3 mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-user-lock text-emerald-600 text-sm"></i>
              <span>Đăng nhập để sở hữu combo và lưu vào Thư viện cá nhân</span>
            </div>
          </div>
        ` : !isEnough ? `
          <div class="p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <div>
              <p class="font-bold flex items-center gap-1">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Số dư ví không đủ</span>
              </p>
              <p class="text-[11px] text-red-600 mt-0.5">Cần nạp thêm ${formatVND(needed)} để thanh toán.</p>
            </div>
            <button
              type="button"
              id="bundle-topup-btn"
              class="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              Nạp tiền ngay
            </button>
          </div>
        ` : ""}

        <!-- Action Buttons -->
        <div class="flex gap-2.5 pt-2">
          <button
            type="button"
            id="bundle-cancel-btn"
            class="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
          >
            Đóng
          </button>

          ${isGuest ? `
            <button
              type="button"
              id="bundle-guest-login-btn"
              class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <i class="fa-brands fa-google"></i>
              <span>Đăng nhập để mua Combo</span>
            </button>
          ` : isEnough ? `
            <button
              type="button"
              id="bundle-confirm-btn"
              class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <i class="fa-solid fa-bolt"></i>
              <span>Xác nhận mua Combo</span>
            </button>
          ` : `
            <button
              type="button"
              id="bundle-topup-cta-btn"
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
    modalOverlay.querySelector("#bundle-modal-close-btn")?.addEventListener("click", close);
    modalOverlay.querySelector("#bundle-cancel-btn")?.addEventListener("click", close);

    modalOverlay.querySelector("#bundle-guest-login-btn")?.addEventListener("click", async () => {
      close();
      await authService.loginGoogle();
    });

    modalOverlay.querySelector("#bundle-topup-btn")?.addEventListener("click", () => {
      close();
      router.navigate(Routes.WALLET);
    });

    modalOverlay.querySelector("#bundle-topup-cta-btn")?.addEventListener("click", () => {
      close();
      router.navigate(Routes.WALLET);
    });

    // Pick available promo quick click
    modalOverlay.querySelectorAll("[data-pick-promo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = btn.getAttribute("data-pick-promo");
        const res = promotionService.validateCode(code, baseBundlePrice);
        if (res && res.valid) {
          appliedCoupon = res;
          finalPrice = res.finalPrice;
          toast.success(`Đã áp dụng mã ${res.code}: Giảm ${formatVND(res.discountAmount)}!`);
          renderModalContent();
        } else {
          toast.error(res?.error || "Mã không hợp lệ.");
        }
      });
    });

    // Apply Coupon manually
    modalOverlay.querySelector("#bundle-apply-coupon-btn")?.addEventListener("click", () => {
      const code = modalOverlay.querySelector("#bundle-coupon-input")?.value?.trim();
      if (!code) {
        toast.warning("Vui lòng nhập mã giảm giá.");
        return;
      }

      const res = promotionService.validateCode(code, baseBundlePrice);
      if (res && res.valid) {
        appliedCoupon = res;
        finalPrice = res.finalPrice;
        toast.success(`Đã áp dụng mã ${res.code}: Giảm ${formatVND(res.discountAmount)}!`);
        renderModalContent();
      } else {
        toast.error(res?.error || "Mã giảm giá không hợp lệ hoặc đã hết lượt dùng.");
      }
    });

    // Remove Coupon
    modalOverlay.querySelector("#bundle-remove-coupon-btn")?.addEventListener("click", () => {
      appliedCoupon = null;
      finalPrice = baseBundlePrice;
      toast.info("Đã gỡ mã giảm giá.");
      renderModalContent();
    });

    // Confirm Payment
    modalOverlay.querySelector("#bundle-confirm-btn")?.addEventListener("click", async () => {
      const btn = modalOverlay.querySelector("#bundle-confirm-btn");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang xử lý giao dịch...';
      }

      try {
        const result = await bundleService.purchaseBundle(
          bundle.id,
          appliedCoupon ? appliedCoupon.code : ""
        );

        close();
        showBundleSuccessModal(result.bundle, result.unlockedCount);

        if (typeof onSuccess === "function") {
          onSuccess(result);
        }
      } catch (err) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-bolt mr-1"></i> Xác nhận mua Combo';
        }
        toast.error(err.message || "Giao dịch combo không thành công.");
      }
    });

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) close();
    });
  };

  document.body.appendChild(modalOverlay);
  renderModalContent();
};

const showBundleSuccessModal = (bundle, count) => {
  const successModal = document.createElement("div");
  successModal.className = "fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in";
  successModal.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl p-7 max-w-md w-full mx-auto border border-gray-100 text-center space-y-4 animate-popup">
      <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-xs">
        <i class="fa-solid fa-circle-check"></i>
      </div>

      <h3 class="text-lg font-black text-gray-900">Chúc Mừng Bạn Đã Sở Hữu Combo!</h3>
      <p class="text-xs text-gray-600 leading-relaxed">
        Gói <strong>${safe(bundle.title)}</strong> đã được kích hoạt thành công. Đã mở khóa <strong>${count}</strong> tài liệu vào Thư viện cá nhân của bạn!
      </p>

      <div class="pt-3 flex gap-2.5">
        <button
          type="button"
          id="success-stay-btn"
          class="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
        >
          Ở lại trang
        </button>
        <button
          type="button"
          id="success-goto-library-btn"
          class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
        >
          Đến Thư Viện Ngay →
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(successModal);

  successModal.querySelector("#success-stay-btn")?.addEventListener("click", () => {
    successModal.remove();
  });

  successModal.querySelector("#success-goto-library-btn")?.addEventListener("click", () => {
    successModal.remove();
    router.navigate(Routes.LIBRARY);
  });
};

export default openBundlePurchaseModal;
