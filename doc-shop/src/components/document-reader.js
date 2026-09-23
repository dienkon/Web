/**
 * Immersive Document Reader Component
 */
import { store } from "../app/state.js";
import { escapeHtml } from "../utils/sanitize.js";
import { toast } from "./toast.js";
import { promptDialog } from "./Modal.js";

class DocumentReader {
  constructor() {
    this.currentDoc = null;
    this.currentPage = 1;
    this.totalPages = 10;
    this.zoom = 1;
    this.isFullscreen = false;
    this.isDarkMode = false;
  }

  open(doc) {
    this.currentDoc = doc;
    const progress = store.getState().library.readingProgress[doc.docId];
    this.currentPage = progress?.page || 1;
    this.totalPages = doc.totalPages || 12;
    this.zoom = 1;
    this.render();
  }

  close() {
    this.saveProgress();
    const el = document.getElementById("document-reader-modal");
    if (el) el.remove();
    this.currentDoc = null;
  }

  saveProgress() {
    if (!this.currentDoc) return;
    const readingProgress = { ...store.getState().library.readingProgress };
    readingProgress[this.currentDoc.docId] = {
      page: this.currentPage,
      totalPages: this.totalPages,
      progressPct: Math.round((this.currentPage / this.totalPages) * 100),
      lastReadAt: Date.now(),
      title: this.currentDoc.title,
    };
    store.setLibrary({ readingProgress });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateView();
      this.saveProgress();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateView();
      this.saveProgress();
    }
  }

  setZoom(delta) {
    this.zoom = Math.max(0.6, Math.min(2.5, this.zoom + delta));
    const img = document.getElementById("reader-active-page");
    if (img) img.style.transform = `scale(${this.zoom})`;
    const zoomText = document.getElementById("reader-zoom-level");
    if (zoomText) zoomText.innerText = `${Math.round(this.zoom * 100)}%`;
  }

  toggleFullscreen() {
    const el = document.getElementById("document-reader-modal");
    if (!document.fullscreenElement) {
      el?.requestFullscreen().catch(() => {});
      this.isFullscreen = true;
    } else {
      document.exitFullscreen().catch(() => {});
      this.isFullscreen = false;
    }
  }

  bookmarkPage() {
    toast.success(`Đã đánh dấu Trang ${this.currentPage}!`);
  }

  async openNote() {
    const noteText = await promptDialog({
      title: `Ghi chú Trang ${this.currentPage}`,
      message: "Nhập nội dung ghi chú nhanh cho trang này:",
      placeholder: "Nội dung kiến thức, công thức cần nhớ...",
      confirmText: "Lưu ghi chú",
    });

    if (noteText && noteText.trim()) {
      const noteId = `note_${Date.now()}`;
      const notes = { ...store.getState().notes.items };
      notes[noteId] = {
        id: noteId,
        docId: this.currentDoc.docId,
        docTitle: this.currentDoc.title,
        page: this.currentPage,
        text: noteText.trim(),
        color: "amber",
        createdAt: Date.now(),
      };
      store.setNotes(notes);
      toast.success("Đã lưu ghi chú học tập!");
    }
  }

  render() {
    let modalEl = document.getElementById("document-reader-modal");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "document-reader-modal";
      modalEl.className = "fixed inset-0 z-50 flex flex-col bg-gray-950 text-white select-none";
      document.body.appendChild(modalEl);
    }

    const doc = this.currentDoc;
    const progressPct = Math.round((this.currentPage / this.totalPages) * 100);

    modalEl.innerHTML = `
      <!-- Reader Header Bar -->
      <header class="h-14 bg-gray-900/90 backdrop-blur border-b border-gray-800 flex items-center justify-between px-4 z-10 shrink-0">
        <div class="flex items-center gap-3 max-w-[45%]">
          <button id="reader-close" class="p-2 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <span class="font-medium text-sm text-gray-200 truncate" title="${escapeHtml(doc.title)}">${escapeHtml(doc.title)}</span>
        </div>

        <!-- Page Navigator Controls -->
        <div class="flex items-center gap-2 bg-gray-800/80 px-3 py-1.5 rounded-xl text-xs font-semibold">
          <button id="reader-prev-btn" class="p-1 hover:text-emerald-400 text-gray-300 disabled:opacity-30" ${this.currentPage <= 1 ? 'disabled' : ''}>◀</button>
          <span>Trang ${this.currentPage} / ${this.totalPages}</span>
          <button id="reader-next-btn" class="p-1 hover:text-emerald-400 text-gray-300 disabled:opacity-30" ${this.currentPage >= this.totalPages ? 'disabled' : ''}>▶</button>
        </div>

        <!-- Tools: Zoom, Notes, Bookmark, Fullscreen -->
        <div class="flex items-center gap-2">
          <div class="hidden sm:flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-xl text-xs">
            <button id="reader-zoom-out" class="p-1 hover:text-emerald-400 text-gray-300">-</button>
            <span id="reader-zoom-level" class="w-12 text-center text-gray-300">100%</span>
            <button id="reader-zoom-in" class="p-1 hover:text-emerald-400 text-gray-300">+</button>
          </div>

          <button id="reader-bookmark-btn" class="p-2 hover:bg-gray-800 rounded-lg text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1" title="Đánh dấu trang">
            <span>🔖</span>
          </button>
          <button id="reader-note-btn" class="p-2 hover:bg-gray-800 rounded-lg text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1" title="Ghi chú nhanh">
            <span>📝</span>
          </button>
          <button id="reader-fs-btn" class="p-2 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white" title="Toàn màn hình">
            ⛶
          </button>
        </div>
      </header>

      <!-- Reading Progress Bar -->
      <div class="w-full bg-gray-800 h-1">
        <div class="bg-emerald-500 h-1 transition-all duration-200" style="width: ${progressPct}%"></div>
      </div>

      <!-- Main Viewer Area -->
      <div class="flex-1 overflow-auto flex items-center justify-center p-4 bg-gray-900/60 relative">
        <div class="transition-transform duration-150 origin-center max-w-4xl shadow-2xl rounded-lg overflow-hidden border border-gray-800 bg-white" id="reader-active-page">
          <img src="${doc.previewUrl || doc.thumbnailUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1000'}" alt="Doc page" class="w-full h-auto object-contain max-h-[82vh]" />
        </div>
      </div>

      <!-- Footer Quick Info -->
      <footer class="h-10 bg-gray-900/90 border-t border-gray-800 flex items-center justify-between px-6 text-xs text-gray-400">
        <span>Tiến độ đọc: ${progressPct}%</span>
        <span>Phím tắt: ← / → để chuyển trang, ESC để thoát</span>
      </footer>
    `;

    // Event listeners
    modalEl.querySelector("#reader-close")?.addEventListener("click", () => this.close());
    modalEl.querySelector("#reader-prev-btn")?.addEventListener("click", () => this.prevPage());
    modalEl.querySelector("#reader-next-btn")?.addEventListener("click", () => this.nextPage());
    modalEl.querySelector("#reader-zoom-in")?.addEventListener("click", () => this.setZoom(0.15));
    modalEl.querySelector("#reader-zoom-out")?.addEventListener("click", () => this.setZoom(-0.15));
    modalEl.querySelector("#reader-fs-btn")?.addEventListener("click", () => this.toggleFullscreen());
    modalEl.querySelector("#reader-bookmark-btn")?.addEventListener("click", () => this.bookmarkPage());
    modalEl.querySelector("#reader-note-btn")?.addEventListener("click", () => this.openNote());

    // Keyboard navigation
    const keyHandler = (e) => {
      if (!this.currentDoc) {
        window.removeEventListener("keydown", keyHandler);
        return;
      }
      if (e.key === "ArrowRight") this.nextPage();
      else if (e.key === "ArrowLeft") this.prevPage();
      else if (e.key === "Escape") this.close();
    };
    window.addEventListener("keydown", keyHandler);
  }

  updateView() {
    this.render();
  }
}

export const documentReader = new DocumentReader();
