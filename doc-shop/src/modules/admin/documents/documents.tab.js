/**
 * Admin: Documents Management Tab
 */
import { DocumentService } from "../../../services/document.service.js";
import { KeywordService } from "../../../services/keyword.service.js";
import { UploadService } from "../../../services/upload.service.js";
import { formatVND } from "../../../utils/format.js";
import { safe } from "../../../utils/sanitize.js";
import { normalizeDocKeywords, matchesSearch } from "../../../utils/url.js";
import { copyText } from "../../../utils/clipboard.js";
import { confirmDialog } from "../../../components/confirm-dialog.js";
import { notificationService } from "../../../services/notification.service.js";
import { renderKeywordsTab } from "../keywords/keywords.tab.js";
import { renderKeyPoolsTab } from "../key-pools/key-pools.tab.js";

let editingDocId = null;

export const renderDocumentsTab = async (container, searchTerm = "") => {
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Embedded Sub-Managers -->
      <div id="admin-keywords-mount"></div>
      <div id="admin-key-pools-mount"></div>

      <!-- Add/Edit Document Form Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <h3 id="admin-doc-form-title" class="font-bold text-gray-800 text-base">
            <i class="fas fa-file-circle-plus text-primary-600 mr-1.5"></i> Đăng tài liệu mới
          </h3>
          <button
            type="button"
            id="cancel-edit-doc-btn"
            class="text-xs text-gray-500 hover:text-gray-800 font-medium hidden"
          >
            <i class="fas fa-times mr-1"></i> Hủy chế độ sửa
          </button>
        </div>

        <form id="admin-doc-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-gray-700 mb-1">Tên tài liệu *</label>
            <input
              type="text"
              id="adoc-title"
              required
              placeholder="VD: Tuyển tập đề thi thử THPT Quốc Gia môn Hóa 2026"
              class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            />
          </div>

          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-gray-700 mb-1">Mô tả ngắn</label>
            <textarea
              id="adoc-desc"
              rows="3"
              placeholder="Mô tả nội dung tài liệu, giáo trình, cấu trúc đề..."
              class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            ></textarea>
          </div>

          <!-- Dynamic Categories / Keywords -->
          <div class="md:col-span-2">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-semibold text-gray-700">Phân loại & Từ khóa</label>
              <button
                type="button"
                id="add-doc-cat-btn"
                class="px-2.5 py-1 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold transition"
              >
                <i class="fas fa-plus mr-1"></i> Thêm phân loại
              </button>
            </div>
            <div id="adoc-categories-list" class="space-y-2"></div>
            <datalist id="doc-category-suggestions"></datalist>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Lớp / Khối</label>
            <input
              type="text"
              id="adoc-grade"
              placeholder="VD: 10, 11, 12, Đại học..."
              class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Giá bán (VNĐ) * - Để 0 nếu miễn phí</label>
            <input
              type="number"
              id="adoc-price"
              value="0"
              min="0"
              step="1000"
              required
              class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            />
          </div>

          <!-- Thumbnail & Preview -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Ảnh bìa (Upload)</label>
            <input
              type="file"
              id="adoc-thumb-file"
              accept="image/*"
              class="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
            />
            <input type="hidden" id="adoc-thumb" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Ảnh xem trước / Watermark (Upload)</label>
            <input
              type="file"
              id="adoc-preview-file"
              accept="image/*"
              class="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
            />
            <input type="hidden" id="adoc-preview" />
          </div>

          <!-- Dynamic Links -->
          <div class="md:col-span-2">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-semibold text-gray-700">Link tài liệu đính kèm</label>
              <button
                type="button"
                id="add-doc-link-btn"
                class="px-2.5 py-1 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold transition"
              >
                <i class="fas fa-plus mr-1"></i> Thêm link
              </button>
            </div>
            <div id="adoc-links-list" class="space-y-2"></div>
          </div>

          <!-- Key Pool ID -->
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-gray-700 mb-1">
              Mã kho key bản quyền (UniqueKey Pool) - Để trống nếu không dùng key
            </label>
            <input
              type="text"
              id="adoc-key-pool"
              placeholder="VD: toan-12-vip (hoặc bấm 'Gán vào form' ở bảng kho key trên)"
              class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            />
          <!-- Featured Toggle -->
          <div class="md:col-span-2 flex items-center gap-2.5 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl">
            <input type="checkbox" id="adoc-featured" class="w-4 h-4 text-amber-600 rounded focus:ring-amber-400 cursor-pointer" />
            <div>
              <label for="adoc-featured" class="text-xs font-bold text-amber-900 cursor-pointer block">
                ⭐ Ghim tài liệu nổi bật lên Hero Banner trang chủ
              </label>
              <p class="text-[11px] text-amber-700/80">Chỉ các tài liệu được Quản trị viên bật tùy chọn này mới xuất hiện trên thanh Hero Banner.</p>
            </div>
          </div>

          <div class="md:col-span-2 flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              id="clone-form-values-btn"
              class="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
            >
              <i class="fas fa-copy mr-1"></i> Xóa nhanh để nhập mới
            </button>
            <button
              type="submit"
              id="admin-doc-submit-btn"
              class="px-8 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition shadow-xs"
            >
              <i class="fas fa-save mr-1"></i> Đăng tài liệu
            </button>
          </div>
        </form>
      </div>

      <!-- Documents Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-bold text-gray-800 text-base">Danh sách tài liệu</h3>
          <span class="text-xs text-gray-400">Tất cả tài liệu trên hệ thống</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3.5">Tài liệu</th>
                <th class="px-4 py-3.5">Phân loại & Lớp</th>
                <th class="px-4 py-3.5">Giá bán</th>
                <th class="px-4 py-3.5">Lượt mua</th>
                <th class="px-4 py-3.5">Hành động</th>
              </tr>
            </thead>
            <tbody id="admin-docs-table-body" class="divide-y divide-gray-100 text-gray-700">
              <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400 text-xs">Đang tải tài liệu...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Render sub-managers
  renderKeywordsTab(document.getElementById("admin-keywords-mount"));
  renderKeyPoolsTab(document.getElementById("admin-key-pools-mount"));

  // Setup Category / Link rows
  setupCategoryRows();
  setupLinkRows();
  populateCategorySuggestions();

  // Load and render table
  await refreshDocsTable(searchTerm);

  // Form submit handler
  const form = document.getElementById("admin-doc-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleFormSubmit();
    await refreshDocsTable(searchTerm);
  });

  // Cancel edit button
  document.getElementById("cancel-edit-doc-btn")?.addEventListener("click", () => {
    resetForm();
  });

  // Clear form button
  document.getElementById("clone-form-values-btn")?.addEventListener("click", () => {
    resetForm();
    notificationService.info("Đã xóa trắng form để nhập tài liệu mới.");
  });
};

const setupCategoryRows = (initialCats = [""]) => {
  const container = document.getElementById("adoc-categories-list");
  if (!container) return;

  container.innerHTML = "";
  const cats = initialCats.length ? initialCats : [""];

  cats.forEach((cat) => addCategoryRow(cat));

  document.getElementById("add-doc-cat-btn")?.addEventListener("click", () => {
    addCategoryRow("");
  });
};

const addCategoryRow = (value = "") => {
  const container = document.getElementById("adoc-categories-list");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "flex items-center gap-2 category-row";
  row.innerHTML = `
    <input
      type="text"
      list="doc-category-suggestions"
      class="doc-category-input flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white outline-none"
      placeholder="Nhập tên phân loại hoặc từ khóa..."
      value="${safe(value)}"
    />
    <button type="button" class="remove-cat-btn text-gray-400 hover:text-red-500 px-2 py-1 text-xs">
      <i class="fas fa-trash"></i>
    </button>
  `;

  row.querySelector(".remove-cat-btn").addEventListener("click", () => {
    if (container.children.length > 1) {
      row.remove();
    } else {
      row.querySelector("input").value = "";
    }
  });

  container.appendChild(row);
};

const setupLinkRows = (initialLinks = [{ label: "", url: "" }]) => {
  const container = document.getElementById("adoc-links-list");
  if (!container) return;

  container.innerHTML = "";
  const links = initialLinks.length ? initialLinks : [{ label: "", url: "" }];

  links.forEach((l) => addLinkRow(l.label, l.url));

  document.getElementById("add-doc-link-btn")?.addEventListener("click", () => {
    addLinkRow("", "");
  });
};

const addLinkRow = (label = "", url = "") => {
  const container = document.getElementById("adoc-links-list");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "flex items-center gap-2 link-row";
  row.innerHTML = `
    <input
      type="text"
      class="doc-link-label w-1/3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white outline-none"
      placeholder="Tên link (VD: Tải PDF)"
      value="${safe(label)}"
    />
    <input
      type="url"
      class="doc-link-url flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white outline-none"
      placeholder="https://drive.google.com/..."
      value="${safe(url)}"
    />
    <button type="button" class="remove-link-btn text-gray-400 hover:text-red-500 px-2 py-1 text-xs">
      <i class="fas fa-trash"></i>
    </button>
  `;

  row.querySelector(".remove-link-btn").addEventListener("click", () => {
    if (container.children.length > 1) {
      row.remove();
    } else {
      row.querySelectorAll("input").forEach((i) => (i.value = ""));
    }
  });

  container.appendChild(row);
};

const populateCategorySuggestions = () => {
  const datalist = document.getElementById("doc-category-suggestions");
  if (!datalist) return;
  const categories = KeywordService.getKnownCategories();
  datalist.innerHTML = categories.map((cat) => `<option value="${safe(cat)}"></option>`).join("");
};

const handleFormSubmit = async () => {
  const submitBtn = document.getElementById("admin-doc-submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
  }

  try {
    const isEditing = !!editingDocId;
    let thumbnail = document.getElementById("adoc-thumb")?.value || "";
    let previewLink = document.getElementById("adoc-preview")?.value || "";

    const thumbFile = document.getElementById("adoc-thumb-file")?.files[0];
    const previewFile = document.getElementById("adoc-preview-file")?.files[0];

    if (thumbFile) {
      thumbnail = await UploadService.uploadImage(thumbFile, "documents/thumbnails");
    }
    if (previewFile) {
      previewLink = await UploadService.uploadImage(previewFile, "documents/previews");
    }

    const categories = Array.from(document.querySelectorAll("#adoc-categories-list .category-row"))
      .map((row) => row.querySelector(".doc-category-input")?.value?.trim() || "")
      .filter(Boolean);

    const links = Array.from(document.querySelectorAll("#adoc-links-list .link-row"))
      .map((row) => ({
        label: row.querySelector(".doc-link-label")?.value?.trim() || "Tài liệu",
        url: row.querySelector(".doc-link-url")?.value?.trim() || "",
      }))
      .filter((l) => l.url);

    const docPayload = {
      title: document.getElementById("adoc-title")?.value?.trim() || "",
      description: document.getElementById("adoc-desc")?.value?.trim() || "",
      subject: categories[0] || "Khác",
      category: categories[0] || "Khác",
      keywords: categories,
      grade: document.getElementById("adoc-grade")?.value?.trim() || "Chung",
      price: Number(document.getElementById("adoc-price")?.value || 0),
      thumbnail,
      previewLink,
      links,
      keyPoolId: document.getElementById("adoc-key-pool")?.value?.trim() || "",
      featured: Boolean(document.getElementById("adoc-featured")?.checked),
      featuredOrder: document.getElementById("adoc-featured")?.checked ? Date.now() : 0,
    };

    await DocumentService.saveDocument(docPayload, editingDocId);
    resetForm();
  } catch (err) {
    notificationService.error(err.message || "Lỗi lưu tài liệu.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save mr-1"></i> ' + (editingDocId ? "Cập nhật tài liệu" : "Đăng tài liệu");
    }
  }
};

const resetForm = () => {
  editingDocId = null;
  const form = document.getElementById("admin-doc-form");
  if (form) form.reset();

  document.getElementById("adoc-thumb").value = "";
  document.getElementById("adoc-preview").value = "";
  const featCb = document.getElementById("adoc-featured");
  if (featCb) featCb.checked = false;

  setupCategoryRows([""]);
  setupLinkRows([{ label: "", url: "" }]);

  const titleEl = document.getElementById("admin-doc-form-title");
  if (titleEl) {
    titleEl.innerHTML = '<i class="fas fa-file-circle-plus text-primary-600 mr-1.5"></i> Đăng tài liệu mới';
  }

  const cancelBtn = document.getElementById("cancel-edit-doc-btn");
  if (cancelBtn) cancelBtn.classList.add("hidden");

  const submitBtn = document.getElementById("admin-doc-submit-btn");
  if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save mr-1"></i> Đăng tài liệu';
};

const refreshDocsTable = async (searchTerm = "") => {
  const tbody = document.getElementById("admin-docs-table-body");
  if (!tbody) return;

  const docsMap = await DocumentService.loadDocuments();
  let docs = Object.entries(docsMap || {})
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (searchTerm) {
    docs = docs.filter(
      (d) =>
        matchesSearch(d.title, searchTerm) ||
        matchesSearch(d.category, searchTerm) ||
        matchesSearch(d.grade, searchTerm) ||
        matchesSearch(normalizeDocKeywords(d).join(" "), searchTerm),
    );
  }

  if (!docs.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-8 text-center text-gray-400 text-xs">
          Không tìm thấy tài liệu phù hợp.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = docs
    .map((doc) => {
      const keywords = normalizeDocKeywords(doc);
      return `
        <tr class="hover:bg-gray-50/70 transition">
          <td class="px-4 py-3">
            <p class="font-bold text-gray-800 text-xs leading-tight flex items-center gap-1.5">
              ${safe(doc.title || "")}
              ${doc.featured ? '<span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 uppercase">Ghim</span>' : ""}
            </p>
            <p class="text-[11px] text-gray-400 mt-0.5">${safe(doc.category || "Khác")}</p>
          </td>
          <td class="px-4 py-3 text-xs text-gray-600">
            <span class="font-semibold text-gray-700">Lớp ${safe(doc.grade || "Chung")}</span>
            <p class="text-[11px] text-gray-400">${safe(keywords.slice(0, 3).join(", "))}</p>
          </td>
          <td class="px-4 py-3 text-xs font-bold text-primary-600">${formatVND(doc.price)}</td>
          <td class="px-4 py-3 text-xs text-gray-600">${Number(doc.buys || 0)}</td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="edit-doc-action p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs transition"
                data-doc-id="${safe(doc.id)}"
                title="Sửa tài liệu"
              >
                <i class="fas fa-pen"></i>
              </button>
              <button
                type="button"
                class="clone-doc-action p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 text-xs transition"
                data-doc-id="${safe(doc.id)}"
                title="Nhân bản"
              >
                <i class="fas fa-clone"></i>
              </button>
              <button
                type="button"
                class="featured-doc-action p-1.5 rounded-lg ${doc.featured ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"} hover:bg-yellow-200 text-xs transition"
                data-doc-id="${safe(doc.id)}"
                title="Ghim nổi bật"
              >
                <i class="fas fa-star"></i>
              </button>
              <button
                type="button"
                class="delete-doc-action p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs transition"
                data-doc-id="${safe(doc.id)}"
                title="Xóa tài liệu"
              >
                <i class="fas fa-trash"></i>
              </button>
              <button
                type="button"
                class="share-doc-action p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs transition"
                data-doc-id="${safe(doc.id)}"
                title="Sao chép link"
              >
                <i class="fas fa-share-nodes"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  // Attach action button handlers
  tbody.querySelectorAll(".edit-doc-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      const doc = docsMap[btn.dataset.docId];
      if (!doc) return;

      editingDocId = btn.dataset.docId;

      document.getElementById("adoc-title").value = doc.title || "";
      document.getElementById("adoc-desc").value = doc.description || "";
      document.getElementById("adoc-grade").value = doc.grade || "";
      document.getElementById("adoc-price").value = doc.price || 0;
      document.getElementById("adoc-thumb").value = doc.thumbnail || "";
      document.getElementById("adoc-preview").value = doc.previewLink || "";
      document.getElementById("adoc-key-pool").value = doc.keyPoolId || "";
      const editFeatCb = document.getElementById("adoc-featured");
      if (editFeatCb) editFeatCb.checked = Boolean(doc.featured);

      setupCategoryRows(normalizeDocKeywords(doc));
      setupLinkRows(Array.isArray(doc.links) && doc.links.length ? doc.links : [{ label: "Tài liệu", url: doc.fileLink || "" }]);

      const titleEl = document.getElementById("admin-doc-form-title");
      if (titleEl) {
        titleEl.innerHTML = `<i class="fas fa-pen text-blue-600 mr-1.5"></i> Sửa: <span class="font-mono text-xs text-gray-500">${safe(doc.title)}</span>`;
      }

      document.getElementById("cancel-edit-doc-btn")?.classList.remove("hidden");
      document.getElementById("admin-doc-submit-btn").innerHTML = '<i class="fas fa-save mr-1"></i> Cập nhật tài liệu';

      document.getElementById("admin-doc-form")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  tbody.querySelectorAll(".clone-doc-action").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await DocumentService.cloneDocument(btn.dataset.docId);
      await refreshDocsTable(searchTerm);
    });
  });

  tbody.querySelectorAll(".featured-doc-action").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await DocumentService.toggleFeatured(btn.dataset.docId);
      await refreshDocsTable(searchTerm);
    });
  });

  tbody.querySelectorAll(".delete-doc-action").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await confirmDialog("Bạn có chắc chắn muốn xóa tài liệu này? Không thể hoàn tác sau khi xóa.", {
        title: "Xác nhận xóa tài liệu",
        confirmVariant: "danger",
      });
      if (!ok) return;

      await DocumentService.deleteDocument(btn.dataset.docId);
      await refreshDocsTable(searchTerm);
    });
  });

  tbody.querySelectorAll(".share-doc-action").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const url = `${window.location.origin}${window.location.pathname}#/document/${btn.dataset.docId}`;
      await copyText(url);
      notificationService.success("Đã copy link tài liệu!");
    });
  });
};
