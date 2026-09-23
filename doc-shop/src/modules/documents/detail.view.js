/**
 * Document Detail View - Upgraded with Reader, Reviews, Wishlist & Coupons
 */
import { store } from "../../app/state.js";
import { DocumentService } from "../../services/document.service.js";
import { PurchaseService } from "../../services/purchase.service.js";
import { KeyService } from "../../services/key.service.js";
import { authService } from "../../services/auth.service.js";
import { ReportService } from "../../services/report.service.js";
import { wishlistService } from "../../services/wishlist.service.js";
import { reviewService } from "../../services/review.service.js";
import { promotionService } from "../../services/promotion.service.js";
import { documentReader } from "../../components/document-reader.js";
import { formatVND } from "../../utils/format.js";
import { formatDate } from "../../utils/date.js";
import { safe } from "../../utils/sanitize.js";
import { normalizeDocKeywords } from "../../utils/url.js";
import { copyText } from "../../utils/clipboard.js";
import { notificationService } from "../../services/notification.service.js";
import { modal } from "../../components/modal.js";
import { toast } from "../../components/toast.js";
import { openPurchaseModal } from "../document/purchase.modal.js";

export const renderDocDetailView = async (container, docId) => {
  if (!container || !docId) return;

  container.innerHTML = `
    <div class="fade-in max-w-5xl mx-auto space-y-4 pb-12">
      <button
        type="button"
        data-nav="home"
        class="text-gray-500 hover:text-emerald-600 flex items-center gap-2 text-sm font-medium transition py-1"
      >
        <span>←</span> Quay lại danh sách tài liệu
      </button>

      <div id="doc-detail-box" class="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-12 text-center text-gray-400">
          <p class="text-sm">Đang tải thông tin tài liệu...</p>
        </div>
      </div>

      <!-- Reviews & Ratings Section -->
      <div id="doc-reviews-container" class="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
        <!-- Injected below -->
      </div>
    </div>
  `;

  let doc = await DocumentService.getDocument(docId);
  if (!doc) {
    await DocumentService.loadDocuments();
    doc = await DocumentService.getDocument(docId);
  }

  const detailBox = document.getElementById("doc-detail-box");
  const reviewsContainer = document.getElementById("doc-reviews-container");
  if (!detailBox) return;


  if (!doc) {
    detailBox.innerHTML = `
      <div class="p-12 text-center space-y-3">
        <span class="text-5xl block">📑</span>
        <h3 class="text-lg font-bold text-gray-800">Không tìm thấy tài liệu</h3>
        <p class="text-sm text-gray-500">Tài liệu này không tồn tại hoặc đã bị gỡ bỏ.</p>
        <button type="button" data-nav="home" class="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm">
          Về trang chủ
        </button>
      </div>
    `;
    return;
  }

  // Start view tracking session
  DocumentService.startViewTracker(docId, (newViews) => {
    const viewsEl = document.getElementById("doc-views-count");
    if (viewsEl) viewsEl.textContent = newViews;
  });

  const user = store.getState().auth.currentUser;
  const purchased = PurchaseService.hasAccess(docId);
  const purchase = PurchaseService.getLatestPurchase(docId);
  const isFree = Number(doc.price) === 0;
  const isFavorited = wishlistService.isWishlisted(docId);

  // Key / Links Access
  const links = purchase?.accessLinks && purchase.accessLinks.length
    ? purchase.accessLinks
    : Array.isArray(doc.links) && doc.links.length
      ? doc.links
      : doc.fileLink
        ? [{ label: "Tài liệu", url: doc.fileLink }]
        : [];

  const finalRedeemUrl = purchase?.redeemUrl || (purchase?.assignedKey ? KeyService.buildKeyRedeemUrl(purchase.assignedKey) : null);

  // Access block HTML
  let accessBlockHtml = "";

  if (isFree || purchased) {
    let linkButtonsHtml = "";

    // Always include Immersive Reader button
    linkButtonsHtml += `
      <button
        type="button"
        class="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
        data-action="open-reader"
      >
        <span>📖</span> Mở Đọc Trực Tuyến Toàn Màn Hình
      </button>
    `;

    if (finalRedeemUrl) {
      linkButtonsHtml += `
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
            data-action="open-key-link"
            data-url="${safe(finalRedeemUrl)}"
            data-doc-id="${safe(docId)}"
          >
            <span>🔑</span> Mở Key Truy Cập
          </button>
          <button
            type="button"
            class="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            data-action="copy-link"
            data-url="${safe(finalRedeemUrl)}"
            title="Sao chép link key"
          >
            📋
          </button>
        </div>
      `;
    }

    if (links.length) {
      links.forEach((link, idx) => {
        linkButtonsHtml += `
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
              data-action="open-doc-link"
              data-url="${safe(link.url)}"
              data-label="${safe(link.label || "Tài liệu")}"
              data-doc-id="${safe(docId)}"
            >
              <span>🔗</span> ${safe(link.label || `Mở liên kết Drive ${idx + 1}`)}
            </button>
            <button
              type="button"
              class="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
              data-action="copy-link"
              data-url="${safe(link.url)}"
              title="Sao chép link"
            >
              📋
            </button>
          </div>
        `;
      });
    }

    accessBlockHtml = `
      <div class="bg-emerald-50/60 border border-emerald-100 p-5 rounded-2xl space-y-3 mt-6">
        <div class="flex items-center justify-between">
          <p class="text-emerald-800 font-bold text-sm flex items-center gap-2">
            <span>✓</span>
            ${isFree ? "Tài liệu miễn phí - Có thể học ngay" : "Bạn đã sở hữu tài liệu này"}
          </p>
          <span class="text-[11px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
            ${isFree ? "Miễn phí" : "Đã mua"}
          </span>
        </div>

        <div class="space-y-2 pt-1">
          ${linkButtonsHtml}
        </div>

        <div class="flex flex-wrap gap-2 pt-2 border-t border-emerald-100/80">
          <button
            type="button"
            data-action="toggle-wishlist"
            class="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 flex items-center gap-1.5 transition"
          >
            <span>${isFavorited ? "❤️ Đã lưu" : "🤍 Yêu thích"}</span>
          </button>
          <button
            type="button"
            data-action="share-doc"
            data-doc-id="${safe(docId)}"
            class="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 flex items-center gap-1.5 transition"
          >
            <span>📤</span> Chia sẻ
          </button>
          <button
            type="button"
            data-action="report-doc"
            data-doc-id="${safe(docId)}"
            class="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 flex items-center gap-1.5 transition ml-auto"
          >
            <span>⚠️</span> Báo lỗi / Đổi key
          </button>
        </div>
      </div>
    `;
  } else if (!user) {
    accessBlockHtml = `
      <div class="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-xs text-gray-500">Giá bán:</span>
          <p class="text-3xl font-extrabold text-emerald-600">${formatVND(doc.price)}</p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            data-action="toggle-wishlist"
            class="px-4 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            title="Yêu thích"
          >
            <span>${isFavorited ? "❤️" : "🤍"}</span>
          </button>
          <button
            type="button"
            id="doc-detail-login-btn"
            class="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
          >
            Đăng nhập để mua tài liệu
          </button>
        </div>
      </div>
    `;
  } else {
    accessBlockHtml = `
      <div class="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-xs text-gray-500">Giá thanh toán:</span>
          <p class="text-3xl font-extrabold text-emerald-600">${formatVND(doc.price)}</p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            data-action="toggle-wishlist"
            class="px-4 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            title="Yêu thích"
          >
            <span>${isFavorited ? "❤️" : "🤍"}</span>
          </button>
          <button
            type="button"
            data-action="share-doc"
            data-doc-id="${safe(docId)}"
            class="px-4 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            title="Chia sẻ"
          >
            <span>📤</span>
          </button>
          <button
            type="button"
            id="doc-detail-buy-btn"
            data-doc-id="${safe(docId)}"
            class="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
          >
            <span>🛒</span> Mua ngay
          </button>
        </div>
      </div>
    `;
  }

  const defaultThumb = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800";

  detailBox.innerHTML = `
    <div class="flex flex-col lg:flex-row">
      <!-- Thumbnail & Preview Column -->
      <div class="lg:w-2/5 bg-gray-50 p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-200">
        <div class="w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden shadow-md border border-gray-200 relative group bg-white">
          <img
            src="${safe(doc.thumbnail || doc.thumbnailUrl || defaultThumb)}"
            alt="${safe(doc.title || "")}"
            class="w-full h-full object-cover"
            onerror="this.src='${defaultThumb}'"
          />
          <button
            type="button"
            data-action="open-reader"
            class="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur text-gray-800 py-2.5 rounded-xl text-center font-bold text-xs shadow-lg hover:bg-white transition flex items-center justify-center gap-2"
          >
            <span>👁️</span> Đọc thử trực tuyến
          </button>
        </div>
      </div>

      <!-- Information Column -->
      <div class="p-6 lg:p-8 lg:w-3/5 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 flex-wrap mb-3">
            <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
              Lớp ${safe(doc.grade || "Chung")}
            </span>
            <span class="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
              ${safe(doc.category || doc.subject || "Khác")}
            </span>
            ${
              purchased
                ? '<span class="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">✓ Đã sở hữu</span>'
                : ""
            }
          </div>

          <h1 class="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-3 leading-snug">
            ${safe(doc.title || "")}
          </h1>

          <div class="flex items-center gap-4 text-xs text-gray-400 mb-4 pb-4 border-b border-gray-100">
            <span>👁️ <strong id="doc-views-count" class="text-gray-600">${Number(doc.views || 0)}</strong> lượt xem</span>
            <span>🛍️ <strong class="text-gray-600">${Number(doc.buys || 0)}</strong> lượt mua</span>
            <span>📅 ${formatDate(doc.createdAt || Date.now())}</span>
          </div>

          <!-- Keywords tags -->
          <div class="flex flex-wrap gap-1.5 mb-6">
            ${normalizeDocKeywords(doc)
              .map(
                (k) => `
                <span class="bg-gray-50 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200">
                  #${safe(k)}
                </span>
              `,
              )
              .join("")}
          </div>

          <h3 class="text-sm font-bold text-gray-900 mb-2">Mô tả chi tiết:</h3>
          <div class="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
            ${safe(doc.description || "Chưa có mô tả chi tiết cho tài liệu này.")}
          </div>
        </div>

        ${accessBlockHtml}
      </div>
    </div>
  `;

  // Render Reviews Section
  const reviews = reviewService.getReviewsForDoc(docId);
  const avgRating = reviews.length ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "5.0";

  reviewsContainer.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
      <div>
        <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>⭐</span> Đánh giá từ học sinh (${reviews.length})
        </h3>
        <p class="text-xs text-gray-500 mt-0.5">Điểm trung bình: <strong class="text-emerald-600 text-sm">${avgRating} / 5.0</strong> ⭐</p>
      </div>
      <button id="write-review-toggle-btn" class="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors self-start sm:self-auto">
        + Viết nhận xét
      </button>
    </div>

    <!-- Review Form (Hidden by default) -->
    <div id="review-form-box" class="hidden bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
      <h4 class="text-xs font-bold text-gray-900 uppercase">Gửi đánh giá của bạn</h4>
      <div class="space-y-2">
        <label class="block text-xs font-medium text-gray-700">Mức độ hài lòng:</label>
        <select id="review-stars-select" class="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800">
          <option value="5">⭐⭐⭐⭐⭐ (5 sao - Rất tốt, chi tiết)</option>
          <option value="4">⭐⭐⭐⭐ (4 sao - Tốt)</option>
          <option value="3">⭐⭐⭐ (3 sao - Bình thường)</option>
          <option value="2">⭐⭐ (2 sao - Cần cải thiện)</option>
          <option value="1">⭐ (1 sao - Không hài lòng)</option>
        </select>
      </div>
      <div class="space-y-2">
        <label class="block text-xs font-medium text-gray-700">Nhận xét chi tiết:</label>
        <textarea id="review-comment-input" rows="3" class="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500" placeholder="Chia sẻ cảm nhận về nội dung, chất lượng giải đề, phương pháp..."></textarea>
      </div>
      <div class="flex justify-end gap-2">
        <button id="review-cancel-btn" class="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700">Hủy</button>
        <button id="review-submit-btn" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs">Gửi đánh giá</button>
      </div>
    </div>

    <!-- Reviews List -->
    <div class="space-y-3">
      ${reviews.map(r => `
        <div class="p-4 rounded-2xl bg-gray-50/60 border border-gray-200 space-y-1.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-bold text-xs text-gray-900">${safe(r.userName)}</span>
              <span class="text-[10px] text-gray-400">(${safe(r.userClass)})</span>
              ${r.verified ? '<span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">✓ Đã mua</span>' : ''}
            </div>
            <div class="text-amber-500 text-xs">${"⭐".repeat(r.rating || 5)}</div>
          </div>
          <p class="text-xs text-gray-700 leading-relaxed">${safe(r.comment)}</p>
        </div>
      `).join("")}
    </div>
  `;

  // Attach event listeners
  detailBox.querySelectorAll('[data-action="open-reader"]').forEach(btn => {
    btn.addEventListener("click", () => {
      documentReader.open(doc);
    });
  });

  detailBox.querySelectorAll('[data-action="toggle-wishlist"]').forEach(btn => {
    btn.addEventListener("click", () => {
      wishlistService.toggleWishlist(docId);
      renderDocDetailView(container, docId);
    });
  });

  detailBox.querySelector("#doc-detail-login-btn")?.addEventListener("click", () => {
    authService.loginGoogle();
  });

  detailBox.querySelector("#doc-detail-buy-btn")?.addEventListener("click", () => {
    openPurchaseModal(doc, () => {
      renderDocDetailView(container, docId);
    });
  });

  // Reviews events
  reviewsContainer.querySelector("#write-review-toggle-btn")?.addEventListener("click", () => {
    const formBox = reviewsContainer.querySelector("#review-form-box");
    formBox?.classList.toggle("hidden");
  });

  reviewsContainer.querySelector("#review-cancel-btn")?.addEventListener("click", () => {
    reviewsContainer.querySelector("#review-form-box")?.classList.add("hidden");
  });

  reviewsContainer.querySelector("#review-submit-btn")?.addEventListener("click", () => {
    const stars = reviewsContainer.querySelector("#review-stars-select")?.value;
    const comment = reviewsContainer.querySelector("#review-comment-input")?.value;
    if (!comment || !comment.trim()) {
      toast.warning("Vui lòng nhập nhận xét của bạn.");
      return;
    }
    reviewService.addReview(docId, { rating: stars, comment });
    renderDocDetailView(container, docId);
  });

  // Share button
  detailBox.querySelectorAll('[data-action="share-doc"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const url = `${window.location.origin}${window.location.pathname}#/document/${docId}`;
      const ok = await copyText(url);
      if (ok) {
        notificationService.success("Đã sao chép liên kết chia sẻ tài liệu!");
      }
    });
  });

  // Copy link
  detailBox.querySelectorAll('[data-action="copy-link"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const url = btn.dataset.url;
      const ok = await copyText(url);
      if (ok) {
        notificationService.success("Đã sao chép đường link!");
      }
    });
  });

  // Open doc link
  detailBox.querySelectorAll('[data-action="open-doc-link"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const url = btn.dataset.url;
      const label = btn.dataset.label;
      await DocumentService.trackLinkClick(docId, url, label, "open_doc");
      window.open(url, "_blank", "noopener,noreferrer");
    });
  });

  // Open key link
  detailBox.querySelectorAll('[data-action="open-key-link"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const url = btn.dataset.url;
      if (doc.keyPoolId && purchase?.assignedKey) {
        await KeyService.recordKeyLogin(doc.keyPoolId, purchase.assignedKey, user);
      }
      await DocumentService.trackLinkClick(docId, url, "Mở Key", "key");
      window.open(url, "_blank", "noopener,noreferrer");
    });
  });

  // Report doc modal
  detailBox.querySelectorAll('[data-action="report-doc"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.openForm(
        "Báo cáo tài liệu / Đổi key",
        `
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Tài liệu</label>
            <input type="text" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" value="${safe(doc.title)}" readonly>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Loại báo cáo</label>
            <select name="type" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
              <option value="Lỗi link">Lỗi link không mở được</option>
              <option value="Lỗi key">Lỗi key không đăng nhập được</option>
              <option value="Nội dung sai">Nội dung tài liệu sai lệch</option>
              <option value="Vi phạm">Vi phạm bản quyền</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Mô tả chi tiết</label>
            <textarea name="details" rows="3" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Mô tả cụ thể lỗi bạn gặp phải..."></textarea>
          </div>
        `,
        async (formData) => {
          await ReportService.submitReport({
            docId,
            type: formData.get("type"),
            details: formData.get("details"),
          });
        },
        "Gửi báo cáo",
      );
    });
  });
};
