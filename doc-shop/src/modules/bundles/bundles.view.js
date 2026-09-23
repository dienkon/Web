import { store } from "../../app/state.js";
import { bundleService } from "../../services/bundle.service.js";
import { formatVND } from "../../utils/format.js";
import { safe } from "../../utils/sanitize.js";
import { toast } from "../../components/toast.js";
import { router } from "../../app/router.js";
import { Routes } from "../../app/constants.js";
import { openBundlePurchaseModal } from "./bundle-purchase.modal.js";

export const renderBundlesView = async (container) => {
  if (!container) return;

  const user = store.getState().auth.currentUser;
  const docsMap = store.getState().documents.items || {};
  const bundles = bundleService.getActiveBundles();

  container.innerHTML = `
    <div class="fade-in space-y-8 pb-16">
      <!-- Header -->
      <div class="bg-gradient-to-r from-emerald-950 via-gray-900 to-teal-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-900/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div class="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="space-y-1.5 relative z-10">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
            <i class="fa-solid fa-tags text-xs"></i>
            <span>Ưu đãi tiết kiệm đến 50%</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-black tracking-tight">Gói Combo Tài Liệu Chuyên Đề</h2>
          <p class="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
            Tổng hợp các bộ chuyên đề then chốt theo khối thi. Mua theo combo giúp bạn sở hữu trọn vẹn lộ trình học với chi phí tiết kiệm nhất.
          </p>
        </div>
        <button type="button" data-nav="home" class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition flex items-center gap-1.5 cursor-pointer relative z-10">
          <i class="fa-solid fa-arrow-left text-xs"></i>
          <span>Về cửa hàng</span>
        </button>
      </div>

      <!-- Bundles List -->
      ${bundles.length > 0 ? `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${bundles.map((b) => {
            const includedDocs = (b.documentIds || []).map((id) => docsMap[id]).filter(Boolean);
            const ownership = user ? bundleService.checkOwnership(b.id, user.uid) : null;
            const isAllOwned = ownership?.allOwned;

            return `
              <div class="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm flex flex-col justify-between space-y-5 hover:shadow-md transition">
                <!-- Bundle Info -->
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
                      <i class="fa-solid fa-bolt text-amber-500 text-[11px]"></i>
                      <span>Tiết kiệm ${formatVND(b.savingAmount)} (-${b.discountPercent}%)</span>
                    </span>
                    <span class="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <i class="fa-solid fa-layer-group text-xs"></i>
                      <span>${b.documentIds ? b.documentIds.length : 0} tài liệu</span>
                    </span>
                  </div>

                  <h3 class="text-base font-extrabold text-gray-900 leading-snug">${safe(b.title)}</h3>
                  <p class="text-xs text-gray-500 leading-relaxed">${safe(b.description || '')}</p>

                  ${ownership && ownership.ownedCount > 0 ? `
                    <div class="p-2.5 rounded-xl ${isAllOwned ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'} text-xs font-medium flex items-center gap-2">
                      <i class="fa-solid ${isAllOwned ? 'fa-circle-check text-green-600' : 'fa-circle-info text-amber-600'}"></i>
                      <span>${isAllOwned ? 'Bạn đã sở hữu trọn bộ combo này!' : `Bạn đã sở hữu ${ownership.ownedCount}/${ownership.totalCount} tài liệu trong gói.`}</span>
                    </div>
                  ` : ""}

                  <!-- Included Documents List -->
                  <div class="pt-2 space-y-2">
                    <h4 class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tài liệu bao gồm trong gói:</h4>
                    <div class="space-y-1.5">
                      ${includedDocs.map((doc, idx) => {
                        const isOwned = ownership?.ownedDocIds?.includes(doc.id);
                        return `
                          <div class="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs hover:bg-gray-100/70 transition">
                            <div class="flex items-center gap-2 overflow-hidden pr-2">
                              <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                                ${idx + 1}
                              </span>
                              <span class="font-medium text-gray-800 truncate">${safe(doc.title)}</span>
                            </div>
                            <div class="shrink-0 text-right">
                              ${isOwned ? `
                                <span class="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Đã mua</span>
                              ` : `
                                <span class="font-mono text-gray-500 font-semibold">${formatVND(doc.price)}</span>
                              `}
                            </div>
                          </div>
                        `;
                      }).join("")}
                    </div>
                  </div>
                </div>

                <!-- Price & CTA -->
                <div class="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <div class="flex items-baseline gap-2">
                      <span class="text-xl font-black text-emerald-600 font-mono">${formatVND(b.bundlePrice)}</span>
                      <span class="text-xs text-gray-400 line-through font-mono">${formatVND(b.originalPrice)}</span>
                    </div>
                    <span class="text-[10px] text-gray-400">Thanh toán trọn gói 1 lần</span>
                  </div>

                  ${isAllOwned ? `
                    <button
                      type="button"
                      data-nav="library"
                      class="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <i class="fa-solid fa-book-open"></i>
                      <span>Đến Thư Viện Học</span>
                    </button>
                  ` : `
                    <button
                      type="button"
                      data-buy-bundle="${b.id}"
                      class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <i class="fa-solid fa-cart-shopping"></i>
                      <span>Mua Combo Ngay</span>
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      ` : `
        <div class="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-xs space-y-4 max-w-lg mx-auto">
          <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto">
            <i class="fa-solid fa-box-open"></i>
          </div>
          <h3 class="text-base font-bold text-gray-900">Các gói Combo đang được Ban Quản Trị biên soạn</h3>
          <p class="text-xs text-gray-500 leading-relaxed">
            Hiện chưa có gói combo nào được mở bán. Khi Quản trị viên phát hành combo mới, bạn sẽ thấy danh sách các gói tài liệu ưu đãi xuất hiện tại đây.
          </p>
          <button type="button" data-nav="home" class="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer">
            Khám phá tài liệu lẻ tại cửa hàng
          </button>
        </div>
      `}
    </div>
  `;

  // Attach bundle buy handler
  container.querySelectorAll("[data-buy-bundle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bundleId = btn.getAttribute("data-buy-bundle");
      const target = bundleService.getBundleById(bundleId);
      if (target) {
        openBundlePurchaseModal(target, () => {
          renderBundlesView(container);
        });
      }
    });
  });
};

export default renderBundlesView;
