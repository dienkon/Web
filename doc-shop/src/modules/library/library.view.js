/**
 * Smart Digital Document Library View
 */
import { store } from "../../app/state.js";
import { Routes } from "../../app/constants.js";
import { escapeHtml } from "../../utils/sanitize.js";
import { libraryService } from "../../services/library.service.js";
import { documentReader } from "../../components/document-reader.js";
import { toast } from "../../components/toast.js";
import { promptDialog } from "../../components/Modal.js";

export function renderLibraryView(container) {
  const folders = store.getState().library.folders;
  let activeFolder = store.getState().library.activeFolder || "all";
  const purchases = Object.values(store.getState().purchases.items || {});
  const documents = store.getState().documents.items || {};
  const readingProgress = store.getState().library.readingProgress || {};

  // Map purchased items to actual document data
  let libraryDocs = purchases.map((p) => {
    const docData = documents[p.docId] || {};
    return {
      docId: p.docId,
      title: p.docTitle || docData.title || "Tài liệu học tập",
      category: p.docCategory || docData.category || "Tổng hợp",
      thumbnailUrl: docData.thumbnailUrl || "",
      previewUrl: docData.previewUrl || "",
      driveUrl: p.driveUrl || docData.driveUrl || "",
      uniqueKey: p.uniqueKey || "",
      purchaseDate: p.purchaseDate || Date.now(),
      progress: readingProgress[p.docId] || { page: 1, totalPages: 10, progressPct: 0 },
    };
  });

  // If user hasn't bought documents yet, include demo high-quality educational documents
  if (libraryDocs.length === 0) {
    const publicDocs = Object.values(documents);
    if (publicDocs.length > 0) {
      libraryDocs = publicDocs.slice(0, 4).map(d => ({
        ...d,
        purchaseDate: Date.now(),
        progress: readingProgress[d.docId] || { page: 1, totalPages: 12, progressPct: 0 },
      }));
    }
  }

  function filterByFolder(folder) {
    activeFolder = folder;
    store.setLibrary({ activeFolder: folder });
    renderContent();
  }

  function renderContent() {
    const filtered = activeFolder === "all"
      ? libraryDocs
      : libraryDocs.filter(d => (d.category || "").toLowerCase().includes(activeFolder.toLowerCase()) || (d.title || "").toLowerCase().includes(activeFolder.toLowerCase()));

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6 fade-in pb-12">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <span>📚</span> Thư viện tài liệu số
            </h1>
            <p class="text-xs text-gray-500 mt-1">Quản lý toàn bộ tài liệu học tập, tiến độ đọc và ghi chú cá nhân của bạn</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="lib-add-folder-btn" class="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5">
              <span>📁</span> + Tạo thư mục mới
            </button>
            <button data-nav="${Routes.HOME}" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors">
              Khám phá thêm tài liệu
            </button>
          </div>
        </div>

        <!-- Folder Filter Tabs -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2 hide-scroll">
          <button data-folder="all" class="px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${activeFolder === 'all' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}">
            Tất cả tài liệu (${libraryDocs.length})
          </button>
          ${folders.map(f => `
            <button data-folder="${escapeHtml(f)}" class="px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${activeFolder === f ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}">
              📁 ${escapeHtml(f)}
            </button>
          `).join("")}
        </div>

        <!-- Document Grid -->
        ${filtered.length === 0 ? `
          <div class="bg-white rounded-3xl p-12 text-center space-y-4 border border-gray-200 shadow-sm">
            <span class="text-5xl block">📖</span>
            <h3 class="text-base font-bold text-gray-900">Thư mục chưa có tài liệu nào</h3>
            <p class="text-xs text-gray-500 max-w-md mx-auto">Bạn có thể thêm tài liệu vào thư mục này từ cửa hàng tài liệu hoặc chuyển đổi giữa các thư mục.</p>
            <button data-nav="${Routes.HOME}" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors">
              Khám phá tài liệu ngay
            </button>
          </div>
        ` : `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            ${filtered.map(doc => `
              <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col card-hover">
                <!-- Preview Thumbnail -->
                <div class="aspect-[4/3] bg-gray-100 relative overflow-hidden group">
                  <img src="${doc.thumbnailUrl || doc.previewUrl || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800'}" alt="${escapeHtml(doc.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button data-action="read-doc" data-doc-id="${doc.docId}" class="px-4 py-2 bg-white text-gray-900 font-bold text-xs rounded-xl shadow-lg hover:bg-emerald-50 transition-colors flex items-center gap-1.5">
                      <span>📖</span> Đọc ngay
                    </button>
                  </div>
                  <span class="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur text-[11px] font-bold text-gray-800 rounded-lg shadow-xs">
                    ${escapeHtml(doc.category)}
                  </span>
                </div>

                <!-- Body -->
                <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div class="space-y-2">
                    <h3 class="font-bold text-sm text-gray-900 line-clamp-2 hover:text-emerald-700 transition-colors cursor-pointer" data-nav="${Routes.DOCUMENT_DETAIL}" data-nav-params="${doc.docId}">
                      ${escapeHtml(doc.title)}
                    </h3>
                    
                    <!-- Reading Progress -->
                    <div class="space-y-1">
                      <div class="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                        <span>Tiến độ đọc</span>
                        <span class="text-emerald-600 font-bold">${doc.progress.progressPct}%</span>
                      </div>
                      <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${doc.progress.progressPct}%"></div>
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button data-action="read-doc" data-doc-id="${doc.docId}" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors text-center">
                      Mở đọc
                    </button>
                    <button data-nav="${Routes.DOCUMENT_DETAIL}" data-nav-params="${doc.docId}" class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors" title="Xem chi tiết">
                      Chi tiết
                    </button>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;

    // Folder tab clicks
    container.querySelectorAll("[data-folder]").forEach((btn) => {
      btn.addEventListener("click", () => filterByFolder(btn.dataset.folder));
    });

    // Add folder button
    container.querySelector("#lib-add-folder-btn")?.addEventListener("click", async () => {
      const folderName = await promptDialog({
        title: "Tạo thư mục mới",
        message: "Nhập tên thư mục học tập mới:",
        placeholder: "Ví dụ: Ôn thi HSG, Sinh 12...",
        confirmText: "Tạo thư mục",
      });

      if (folderName) {
        const added = libraryService.addFolder(folderName);
        if (added) {
          toast.success(`Đã tạo thư mục "${folderName}"!`);
          renderContent();
        } else {
          toast.warning("Thư mục này đã tồn tại hoặc tên không hợp lệ.");
        }
      }
    });

    // Read doc action
    container.querySelectorAll('[data-action="read-doc"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const docId = btn.dataset.docId;
        const targetDoc = libraryDocs.find(d => d.docId === docId);
        if (targetDoc) {
          documentReader.open(targetDoc);
        }
      });
    });
  }

  renderContent();
}
