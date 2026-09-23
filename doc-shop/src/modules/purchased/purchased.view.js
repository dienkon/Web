/**
 * Purchased Documents View
 */
import { store } from "../../app/state.js";
import { PurchaseService } from "../../services/purchase.service.js";
import { DocumentService } from "../../services/document.service.js";
import { KeyService } from "../../services/key.service.js";
import { formatDate } from "../../utils/date.js";
import { safe } from "../../utils/sanitize.js";
import { copyText } from "../../utils/clipboard.js";
import { notificationService } from "../../services/notification.service.js";
import { renderEmptyState } from "../../components/empty-state.js";
import { renderCardSkeletons } from "../../components/skeleton.js";
import { modal } from "../../components/modal.js";
import { ReportService } from "../../services/report.service.js";

export const renderPurchasedView = async (container) => {
  if (!container) return;

  const user = store.getState().auth.currentUser;
  if (!user) {
    container.innerHTML = `
      <div class="fade-in max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
        <div class="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center text-2xl mx-auto mb-4">
          <i class="fas fa-download"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">Yêu cầu đăng nhập</h3>
        <p class="text-sm text-gray-500 mb-6">Đăng nhập để xem danh sách các tài liệu bạn đã mua.</p>
        <button type="button" id="purchased-login-btn" class="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md transition">
          <i class="fab fa-google mr-2"></i> Đăng nhập Google
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="fade-in space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Tài liệu đã mua</h2>
        <p class="text-xs text-gray-500 mt-0.5">Truy cập nhanh các tài liệu và mã key kích hoạt bạn đang sở hữu</p>
      </div>

      <div id="purchased-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        ${renderCardSkeletons(4)}
      </div>
    </div>
  `;

  // Load user purchases and all documents
  const purchasesMap = await PurchaseService.loadPurchases(user.uid);
  const docsMap = await DocumentService.loadDocuments();

  const grid = document.getElementById("purchased-grid");
  if (!grid) return;

  const myPurchases = Object.values(purchasesMap || {}).sort(
    (a, b) => (b.purchasedAt || 0) - (a.purchasedAt || 0),
  );

  if (!myPurchases.length) {
    grid.innerHTML = `
      <div class="col-span-full">
        ${renderEmptyState({
          icon: "fa-book-open",
          title: "Chưa có tài liệu nào",
          description: "Bạn chưa mua tài liệu nào. Hãy khám phá kho tài liệu ngay!",
          actionText: "Khám phá ngay",
          actionId: "go-to-store-btn",
        })}
      </div>
    `;
    grid.querySelector("#go-to-store-btn")?.addEventListener("click", () => {
      window.location.hash = "#/home";
    });
    return;
  }

  // Deduplicate by docId if multiple purchases of same doc
  const renderedDocIds = new Set();
  const cardsHtml = [];

  for (const pur of myPurchases) {
    const docId = String(pur.documentId || pur.docId || "").trim();
    if (!docId || renderedDocIds.has(docId)) continue;
    renderedDocIds.add(docId);

    const doc = docsMap[docId] || {
      id: docId,
      title: "Tài liệu #" + docId,
      thumbnail: "https://placehold.co/600x800/e2e8f0/64748b?text=Tài+Liệu",
      category: "Tài liệu đã mua",
      grade: "Chung",
    };

    const links = Array.isArray(pur.accessLinks) && pur.accessLinks.length
      ? pur.accessLinks
      : Array.isArray(doc.links) && doc.links.length
        ? doc.links
        : doc.fileLink
          ? [{ label: "Tài liệu", url: doc.fileLink }]
          : [];

    const redeemUrl = pur.redeemUrl || (pur.assignedKey ? KeyService.buildKeyRedeemUrl(pur.assignedKey) : null);

    let actionsHtml = "";

    if (redeemUrl) {
      actionsHtml += `
        <div class="flex gap-1.5">
          <button
            type="button"
            class="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition"
            data-action="open-key"
            data-url="${safe(redeemUrl)}"
            data-doc-id="${safe(docId)}"
          >
            <i class="fas fa-key text-[10px]"></i> Mở Key
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs transition"
            data-action="copy"
            data-url="${safe(redeemUrl)}"
            title="Sao chép link key"
          >
            <i class="fas fa-copy"></i>
          </button>
        </div>
      `;
    }

    if (links.length) {
      links.forEach((l, i) => {
        actionsHtml += `
          <div class="flex gap-1.5">
            <button
              type="button"
              class="flex-1 py-2 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition"
              data-action="open-doc"
              data-url="${safe(l.url)}"
              data-label="${safe(l.label || "Tài liệu")}"
              data-doc-id="${safe(docId)}"
            >
              <i class="fas fa-external-link-alt text-[10px]"></i> ${safe(l.label || `Mở link ${i + 1}`)}
            </button>
            <button
              type="button"
              class="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs transition"
              data-action="copy"
              data-url="${safe(l.url)}"
              title="Sao chép link"
            >
              <i class="fas fa-copy"></i>
            </button>
          </div>
        `;
      });
    }

    cardsHtml.push(`
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
        <div class="relative aspect-[16/10] bg-gray-100 overflow-hidden cursor-pointer" data-action="view-detail" data-doc-id="${safe(docId)}">
          <img
            src="${safe(doc.thumbnail || "https://placehold.co/600x800/e2e8f0/64748b?text=Tài+Liệu")}"
            alt="${safe(doc.title || "")}"
            class="w-full h-full object-cover"
            onerror="this.src='https://placehold.co/600x800/e2e8f0/64748b?text=Tài+Liệu'"
          />
          <span class="absolute top-2.5 left-2.5 bg-green-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
            <i class="fas fa-check-circle"></i> Đã mua
          </span>
        </div>
        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div class="text-[11px] text-gray-400 mb-1">
              Đã mua lúc ${formatDate(pur.purchasedAt)}
            </div>
            <h4
              class="font-bold text-gray-800 text-sm line-clamp-2 hover:text-primary-600 transition cursor-pointer"
              data-action="view-detail"
              data-doc-id="${safe(docId)}"
            >
              ${safe(doc.title || "Tài liệu")}
            </h4>
          </div>

          <div class="space-y-1.5 pt-2 border-t border-gray-100">
            ${actionsHtml}
            <div class="flex justify-between items-center pt-1 text-xs">
              <button
                type="button"
                data-action="share"
                data-doc-id="${safe(docId)}"
                class="text-gray-500 hover:text-gray-800 flex items-center gap-1"
              >
                <i class="fas fa-share-nodes"></i> Chia sẻ
              </button>
              <button
                type="button"
                data-action="report"
                data-doc-id="${safe(docId)}"
                data-doc-title="${safe(doc.title || "")}"
                class="text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <i class="fas fa-bug"></i> Báo lỗi
              </button>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  grid.innerHTML = cardsHtml.join("");

  // Attach card action listeners
  grid.querySelectorAll('[data-action="view-detail"]').forEach((el) => {
    el.addEventListener("click", () => {
      window.location.hash = `#/document/${el.dataset.docId}`;
    });
  });

  grid.querySelectorAll('[data-action="copy"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await copyText(btn.dataset.url);
      if (ok) notificationService.success("Đã sao chép liên kết!");
    });
  });

  grid.querySelectorAll('[data-action="open-doc"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { docId, url, label } = btn.dataset;
      await DocumentService.trackLinkClick(docId, url, label, "open_doc");
      window.open(url, "_blank", "noopener,noreferrer");
    });
  });

  grid.querySelectorAll('[data-action="open-key"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { docId, url } = btn.dataset;
      const doc = docsMap[docId];
      const pur = myPurchases.find((p) => p.documentId === docId);
      if (doc?.keyPoolId && pur?.assignedKey) {
        await KeyService.recordKeyLogin(doc.keyPoolId, pur.assignedKey, user);
      }
      await DocumentService.trackLinkClick(docId, url, "Mở Key", "key");
      window.open(url, "_blank", "noopener,noreferrer");
    });
  });

  grid.querySelectorAll('[data-action="share"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const url = `${window.location.origin}${window.location.pathname}#/document/${btn.dataset.docId}`;
      const ok = await copyText(url);
      if (ok) notificationService.success("Đã sao chép liên kết chia sẻ!");
    });
  });

  grid.querySelectorAll('[data-action="report"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const { docId, docTitle } = btn.dataset;
      modal.openForm(
        "Báo cáo tài liệu / Lỗi key",
        `
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Tài liệu</label>
            <input type="text" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" value="${safe(docTitle)}" readonly>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Loại báo cáo</label>
            <select name="type" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
              <option value="Lỗi link">Lỗi link không mở được</option>
              <option value="Lỗi key">Lỗi key không đăng nhập được</option>
              <option value="Nội dung sai">Nội dung tài liệu sai lệch</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Mô tả</label>
            <textarea name="details" rows="3" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Mô tả cụ thể vấn đề..."></textarea>
          </div>
        `,
        async (formData) => {
          await ReportService.submitReport({
            docId,
            type: formData.get("type"),
            details: formData.get("details"),
          });
          renderPurchasedView(container);
        },
        "Gửi báo cáo",
      );
    });
  });
};
