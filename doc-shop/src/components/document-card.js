/**
 * Document Card Component
 */
import { formatVND } from "../utils/format.js";
import { safe } from "../utils/sanitize.js";
import { normalizeDocKeywords } from "../utils/url.js";
import { PurchaseService } from "../services/purchase.service.js";

export const renderDocumentCard = (doc) => {
  const isFree = Number(doc.price) === 0;
  const priceTag = isFree
    ? '<span class="text-green-600 font-bold text-sm bg-green-50 px-2.5 py-1 rounded-full border border-green-200">Miễn phí</span>'
    : `<span class="text-primary-600 font-bold text-base">${formatVND(doc.price)}</span>`;

  const docKeywords = normalizeDocKeywords(doc);
  const purchased = PurchaseService.hasAccess(doc.id);
  const purchasedBadge = purchased
    ? '<span class="absolute top-3 left-3 bg-green-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md z-10 flex items-center gap-1"><i class="fas fa-check-circle"></i> Đã mua</span>'
    : "";

  const featuredBadge = doc.featured
    ? '<span class="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow z-10 uppercase tracking-wider flex items-center gap-1"><i class="fas fa-star text-[9px]"></i> Ghim</span>'
    : "";

  const defaultThumb = "https://placehold.co/600x800/e2e8f0/64748b?text=Tài+Liệu";

  return `
    <div
      class="doc-card bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col cursor-pointer group hover:border-emerald-300 transition"
      data-action="view-doc"
      data-doc-id="${safe(doc.id)}"
    >
      <div class="relative aspect-[4/3] bg-gray-100 overflow-hidden pointer-events-none">
        ${purchasedBadge}
        ${featuredBadge}
        <img
          src="${safe(doc.thumbnail || defaultThumb)}"
          alt="${safe(doc.title || "Tài liệu")}"
          loading="lazy"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onerror="this.src='${defaultThumb}'"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <span class="text-white text-xs font-medium flex items-center gap-1"><i class="fas fa-eye"></i> Xem chi tiết</span>
        </div>
      </div>
      <div class="p-4 flex-1 flex flex-col pointer-events-none">
        <div class="flex items-center gap-1.5 flex-wrap mb-2">
          <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[11px] font-medium">Lớp ${safe(doc.grade || "Chung")}</span>
          <span class="bg-primary-50 text-primary-700 px-2 py-0.5 rounded-md text-[11px] font-medium">${safe(doc.category || doc.subject || "Khác")}</span>
        </div>
        <h4 class="font-bold text-gray-800 text-sm mb-1 line-clamp-2 leading-snug group-hover:text-primary-600 transition-colors">
          <a href="#/document/${encodeURIComponent(doc.id)}" class="pointer-events-auto hover:underline">${safe(doc.title || "Chưa có tiêu đề")}</a>
        </h4>
        <p class="text-gray-500 text-xs line-clamp-2 mb-3 flex-1">
          ${safe(doc.description || "Tài liệu học tập chất lượng cao.")}
        </p>
        <div class="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
          <div class="flex items-center gap-3 text-[11px] text-gray-400">
            <span><i class="fas fa-eye"></i> ${Number(doc.views || 0)}</span>
            <span><i class="fas fa-shopping-bag"></i> ${Number(doc.buys || 0)}</span>
          </div>
          <div>${priceTag}</div>
        </div>
      </div>
    </div>
  `;
};
