/**
 * ChemDex Visual CMS & Data Editor - Main Application Controller
 */
import { state } from "./data-editor/state.js";
import {
  initFirebase,
  loadCloudDataOnce,
  ensureElementData,
  saveElementToCloud,
  saveAllDirtyToCloud,
  reloadElementFromCloud,
  loginWithGoogle,
  loginAnonymouslyUser,
  logoutUser,
} from "./data-editor/firebase.js";
import { TableRenderer } from "./data-editor/table-renderer.js";
import { WysiwygToolbar } from "./data-editor/wysiwyg-toolbar.js";
import { VisualDocEditor } from "./data-editor/visual-doc-editor.js";
import { RawJsonEditor } from "./data-editor/raw-editor.js";
import { PreviewRenderer } from "./data-editor/preview-renderer.js";
import { CommandPalette } from "./data-editor/command-palette.js";
import {
  exportSelectedElement,
  exportDirtyElements,
  exportAllData,
  importJsonFile,
} from "./data-editor/exporter.js";
import {
  showToast,
  showConfirmModal,
  showUnsavedChangeDialog,
  escapeHtml,
} from "./data-editor/utils.js";

class DataEditorApp {
  constructor() {
    this.tableRenderer = null;
    this.wysiwygToolbar = null;
    this.docEditor = null;
    this.rawEditor = null;
    this.previewRenderer = null;
    this.commandPalette = null;
    this.activeTab = "visual"; // 'visual' | 'source' | 'preview'
    this.viewMode = "split";   // 'split' | 'fullscreen-doc'
  }

  async init() {
    console.log("ChemDex Visual CMS & Data Editor starting...");

    // 1. Fetch manifest.json
    try {
      const res = await fetch("./data/manifest.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const manifestList = await res.json();
      state.initElements(manifestList);
    } catch (err) {
      console.error("Failed to load manifest.json:", err);
      showToast("Không thể tải manifest.json. Vui lòng kiểm tra file.", "error");
      return;
    }

    // 2. Initialize Subcomponents
    this.tableRenderer = new TableRenderer("periodic-table", (symbol) => {
      this.attemptSelectElement(symbol);
    });
    this.tableRenderer.render();

    this.wysiwygToolbar = new WysiwygToolbar("wysiwyg-toolbar-container");
    this.wysiwygToolbar.renderFixedToolbar();

    this.docEditor = new VisualDocEditor("visual-doc-editor-container", this.wysiwygToolbar);
    this.rawEditor = new RawJsonEditor("raw-editor-container", (symbol) => {
      this.refreshActiveView();
    });
    this.previewRenderer = new PreviewRenderer("preview-container");

    this.commandPalette = new CommandPalette(this);

    // 3. Setup UI Listeners
    this.bindEvents();

    // 4. Setup State Subscriptions
    this.bindState();

    // 5. Initialize Firebase in background
    initFirebase();
    this.initCloud();

    // 6. Check URL query params for initial element, fallback to H
    const urlParams = new URLSearchParams(window.location.search);
    const initialSymbol = urlParams.get("element") || "H";
    this.loadAndShowElement(initialSymbol);
  }

  async initCloud() {
    try {
      await loadCloudDataOnce();
      if (state.selectedSymbol) {
        await ensureElementData(state.selectedSymbol);
        this.refreshActiveView();
      }
    } catch (err) {
      console.warn("Cloud initialization note:", err);
    }
  }

  attemptSelectElement(targetSymbol) {
    if (!targetSymbol) return;
    const currentSym = state.selectedSymbol;

    // If already on this element, do nothing
    if (currentSym === targetSymbol.toUpperCase()) return;

    // Check if current element has unsaved changes (Section AV)
    if (currentSym && state.isDirty(currentSym)) {
      showUnsavedChangeDialog({
        symbol: currentSym,
        onKeepEditing: () => {
          // Do nothing, stay on current element
        },
        onDiscard: () => {
          state.cancelChanges(currentSym);
          this.loadAndShowElement(targetSymbol);
        },
        onSaveAndSwitch: async () => {
          try {
            await saveElementToCloud(currentSym);
            this.loadAndShowElement(targetSymbol);
          } catch (err) {
            showToast("Lưu thất bại: " + (err.message || err), "error");
          }
        },
      });
      return;
    }

    this.loadAndShowElement(targetSymbol);
  }

  async loadAndShowElement(symbol) {
    const sym = symbol.toUpperCase();
    state.selectElement(sym);

    await ensureElementData(sym);

    this.updateActiveElementHeader(sym);
    this.refreshActiveView();

    // On mobile / small screens, open editor drawer
    if (window.innerWidth < 1024) {
      const editorCol = document.getElementById("editor-panel-column");
      if (editorCol) editorCol.classList.add("is-open");
    }
  }

  refreshActiveView() {
    const sym = state.selectedSymbol;
    if (!sym) return;

    if (this.activeTab === "visual" && this.docEditor) {
      this.docEditor.render(sym);
    } else if (this.activeTab === "source" && this.rawEditor) {
      this.rawEditor.render(sym);
    } else if (this.activeTab === "preview" && this.previewRenderer) {
      this.previewRenderer.render(sym);
    }

    this.updateElementActionButtons(sym);
  }

  updateActiveElementHeader(symbol) {
    const meta = state.getElementMeta(symbol);
    const working = state.getWorkingCopy(symbol);

    const titleEl = document.getElementById("active-element-title");
    const subEl = document.getElementById("active-element-subtitle");
    const categoryBadge = document.getElementById("active-element-category");
    const dirtyBadge = document.getElementById("active-element-dirty-badge");

    if (titleEl) {
      titleEl.innerHTML = `
        <span class="font-black text-xl text-white font-mono mr-1.5">${escapeHtml(symbol)}</span>
        <span class="text-slate-300 font-semibold text-base">${escapeHtml(working?.nameVi || meta?.nameVi || "")}</span>
      `;
    }

    if (subEl) {
      const engName = working?.general?.englishName || working?.nameEn || meta?.nameEn || "";
      const zNum = working?.number || meta?.number || "?";
      const mass = working?.mass != null ? working.mass : meta?.mass != null ? meta.mass : "?";
      subEl.textContent = `Z = ${zNum} | Mass: ${mass} | English: ${engName}`;
    }

    if (categoryBadge) {
      const cat = working?.category || meta?.category || "unknown";
      categoryBadge.textContent = cat;
      categoryBadge.className = `text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full cat-${cat} border border-slate-700/80`;
    }

    if (dirtyBadge) {
      const isDirty = state.isDirty(symbol);
      if (isDirty) dirtyBadge.classList.remove("hidden");
      else dirtyBadge.classList.add("hidden");
    }
  }

  updateElementActionButtons(symbol) {
    const isDirty = state.isDirty(symbol);
    const cancelBtn = document.getElementById("element-cancel-btn");
    const saveBtn = document.getElementById("element-save-btn");
    const dirtyBadge = document.getElementById("active-element-dirty-badge");

    if (cancelBtn) {
      cancelBtn.disabled = !isDirty;
      cancelBtn.style.opacity = isDirty ? "1" : "0.5";
    }

    if (dirtyBadge) {
      if (isDirty) dirtyBadge.classList.remove("hidden");
      else dirtyBadge.classList.add("hidden");
    }

    if (saveBtn) {
      if (isDirty) {
        saveBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-xs"></i> <span>Lưu nguyên tố •</span>';
        saveBtn.classList.remove("bg-slate-700", "text-slate-300");
        saveBtn.classList.add("bg-emerald-600", "text-white");
      } else {
        saveBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-xs"></i> <span>Lưu nguyên tố</span>';
      }
    }
  }

  bindEvents() {
    // 1. Tab Switching (Visual | Source JSON | Preview)
    const tabVisual = document.getElementById("tab-visual-btn");
    const tabSource = document.getElementById("tab-source-btn");
    const tabPreview = document.getElementById("tab-preview-btn");

    const visualView = document.getElementById("visual-doc-editor-container");
    const sourceView = document.getElementById("raw-editor-container");
    const previewView = document.getElementById("preview-container");
    const wysiwygBar = document.getElementById("wysiwyg-toolbar-container");

    const switchTab = (tabName) => {
      this.activeTab = tabName;
      [tabVisual, tabSource, tabPreview].forEach((btn) => {
        if (!btn) return;
        btn.classList.remove("border-blue-500", "text-blue-400", "bg-slate-800/80");
        btn.classList.add("text-slate-400", "border-transparent");
      });

      [visualView, sourceView, previewView].forEach((view) => {
        if (view) view.classList.add("hidden");
      });

      if (tabName === "visual") {
        if (tabVisual) tabVisual.classList.add("border-blue-500", "text-blue-400", "bg-slate-800/80");
        if (visualView) visualView.classList.remove("hidden");
        if (wysiwygBar) wysiwygBar.classList.remove("hidden");
      } else if (tabName === "source") {
        if (tabSource) tabSource.classList.add("border-blue-500", "text-blue-400", "bg-slate-800/80");
        if (sourceView) sourceView.classList.remove("hidden");
        if (wysiwygBar) wysiwygBar.classList.add("hidden");
      } else if (tabName === "preview") {
        if (tabPreview) tabPreview.classList.add("border-blue-500", "text-blue-400", "bg-slate-800/80");
        if (previewView) previewView.classList.remove("hidden");
        if (wysiwygBar) wysiwygBar.classList.add("hidden");
      }

      this.refreshActiveView();
    };

    if (tabVisual) tabVisual.onclick = () => switchTab("visual");
    if (tabSource) tabSource.onclick = () => switchTab("source");
    if (tabPreview) tabPreview.onclick = () => switchTab("preview");

    // 2. Element Action Buttons with AT Section States
    const saveElementBtn = document.getElementById("element-save-btn");
    if (saveElementBtn) {
      saveElementBtn.onclick = async () => {
        const sym = state.selectedSymbol;
        if (!sym) return;
        try {
          saveElementBtn.disabled = true;
          saveElementBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Đang lưu...</span>';
          await saveElementToCloud(sym);
          saveElementBtn.innerHTML = '<i class="fa-solid fa-check text-xs text-emerald-300"></i> <span>Đã lưu ✓</span>';
          setTimeout(() => {
            this.updateElementActionButtons(sym);
            saveElementBtn.disabled = false;
          }, 1500);
        } catch (err) {
          console.error("Save error:", err);
          saveElementBtn.disabled = false;
          saveElementBtn.innerHTML = '<i class="fa-solid fa-rotate-right text-xs text-rose-300"></i> <span>Thử lại</span>';
          showToast("Lưu thất bại: " + (err.message || err), "error");
        }
      };
    }

    const cancelElementBtn = document.getElementById("element-cancel-btn");
    if (cancelElementBtn) {
      cancelElementBtn.onclick = () => {
        const sym = state.selectedSymbol;
        if (!sym || !state.isDirty(sym)) return;
        showConfirmModal({
          title: "Hủy thay đổi",
          message: `Khôi phục ${sym} về bản lưu ban đầu? Các chỉnh sửa chưa lưu sẽ bị hủy bỏ.`,
          confirmText: "Hủy thay đổi",
          cancelText: "Tiếp tục chỉnh sửa",
          isDanger: true,
          onConfirm: () => {
            state.cancelChanges(sym);
            this.refreshActiveView();
            showToast(`Đã khôi phục ${sym} về bản gốc`, "info");
          },
        });
      };
    }

    const previewChemDexBtn = document.getElementById("element-preview-chemdex-btn");
    if (previewChemDexBtn) {
      previewChemDexBtn.onclick = () => {
        const sym = state.selectedSymbol;
        if (!sym) return;
        window.open(`index.html?element=${sym}`, "_blank");
      };
    }

    // 3. Search & Filters
    const searchInput = document.getElementById("editor-search-input");
    if (searchInput) {
      searchInput.oninput = (e) => {
        state.setFilters({ query: e.target.value });
      };
    }

    const categorySelect = document.getElementById("editor-filter-category");
    if (categorySelect) {
      categorySelect.onchange = (e) => {
        state.setFilters({ category: e.target.value });
      };
    }

    // Command palette trigger button in search bar
    const cmdTrigger = document.getElementById("cmd-palette-trigger-btn");
    if (cmdTrigger) {
      cmdTrigger.onclick = () => {
        this.commandPalette.open();
      };
    }

    // 4. Global Save Bar Buttons
    const globalSaveBtn = document.getElementById("global-save-all-btn");
    if (globalSaveBtn) {
      globalSaveBtn.onclick = async () => {
        try {
          globalSaveBtn.disabled = true;
          globalSaveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Đang lưu tất cả...</span>';
          await saveAllDirtyToCloud();
          globalSaveBtn.innerHTML = '<i class="fa-solid fa-check text-xs"></i> <span>Đã lưu tất cả ✓</span>';
          setTimeout(() => {
            globalSaveBtn.disabled = false;
            globalSaveBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-xs"></i> <span>Lưu tất cả lên Firebase</span>';
          }, 1500);
        } catch (err) {
          console.error("Save all error:", err);
          globalSaveBtn.disabled = false;
          globalSaveBtn.innerHTML = '<i class="fa-solid fa-rotate-right text-xs"></i> <span>Thử lại tất cả</span>';
          showToast("Lưu hàng loạt thất bại: " + (err.message || err), "error");
        }
      };
    }

    const globalCancelBtn = document.getElementById("global-cancel-all-btn");
    if (globalCancelBtn) {
      globalCancelBtn.onclick = () => {
        const dirtyCount = state.dirtySet.size;
        if (dirtyCount === 0) return;
        showConfirmModal({
          title: "Hủy tất cả thay đổi",
          message: `Bạn có chắc muốn hủy thay đổi của toàn bộ ${dirtyCount} nguyên tố chưa lưu?`,
          confirmText: "Hủy tất cả",
          cancelText: "Không",
          isDanger: true,
          onConfirm: () => {
            state.cancelAllChanges();
            this.refreshActiveView();
            showToast("Đã hủy tất cả thay đổi", "info");
          },
        });
      };
    }

    // 5. Export Dropdown Actions
    const exportSelectedBtn = document.getElementById("export-selected-btn");
    if (exportSelectedBtn) {
      exportSelectedBtn.onclick = () => {
        exportSelectedElement(state.selectedSymbol);
      };
    }

    const exportDirtyBtn = document.getElementById("export-dirty-btn");
    if (exportDirtyBtn) {
      exportDirtyBtn.onclick = () => {
        exportDirtyElements();
      };
    }

    const exportAllBtn = document.getElementById("export-all-btn");
    if (exportAllBtn) {
      exportAllBtn.onclick = () => {
        exportAllData();
      };
    }

    // 6. Import JSON
    const importFileInput = document.getElementById("import-file-input");
    const importBtn = document.getElementById("import-json-btn");
    if (importBtn && importFileInput) {
      importBtn.onclick = () => importFileInput.click();
      importFileInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          importJsonFile(file, (sym) => {
            this.loadAndShowElement(sym);
          });
        }
        importFileInput.value = "";
      };
    }

    // 7. Auth Buttons
    const googleLoginBtn = document.getElementById("auth-google-btn");
    const anonLoginBtn = document.getElementById("auth-anon-btn");
    const logoutBtn = document.getElementById("auth-logout-btn");

    if (googleLoginBtn) googleLoginBtn.onclick = () => loginWithGoogle();
    if (anonLoginBtn) anonLoginBtn.onclick = () => loginAnonymouslyUser();
    if (logoutBtn) logoutBtn.onclick = () => logoutUser();

    // 8. Mobile Drawer Close & Full-Window Expand Toggle
    const closeDrawerBtn = document.getElementById("close-mobile-drawer-btn");
    if (closeDrawerBtn) {
      closeDrawerBtn.onclick = () => {
        const drawer = document.getElementById("editor-panel-column");
        if (drawer) drawer.classList.remove("is-open");
      };
    }

    const fullwidthBtn = document.getElementById("toggle-fullwidth-btn");
    const tablePanelCol = document.getElementById("table-panel-column");
    let isFullWidth = false;

    if (fullwidthBtn && tablePanelCol) {
      fullwidthBtn.onclick = () => {
        isFullWidth = !isFullWidth;
        document.body.classList.toggle("is-fullwidth-active", isFullWidth);
        if (isFullWidth) {
          tablePanelCol.classList.add("hidden");
          fullwidthBtn.innerHTML = '<i class="fa-solid fa-compress text-xs"></i> <span class="hidden sm:inline">Hiện BTH</span>';
          document.querySelector(".doc-canvas-container")?.classList.add("is-expanded-canvas");
        } else {
          tablePanelCol.classList.remove("hidden");
          fullwidthBtn.innerHTML = '<i class="fa-solid fa-expand text-xs"></i> <span class="hidden sm:inline">Toàn cửa sổ</span>';
          document.querySelector(".doc-canvas-container")?.classList.remove("is-expanded-canvas");
        }
      };
    }

    // 9. Keyboard Shortcuts (Ctrl+S, Ctrl+P)
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const sym = state.selectedSymbol;
        if (sym && state.isDirty(sym)) {
          saveElementToCloud(sym).catch((err) => console.error("Ctrl+S save error:", err));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        const tabPreview = document.getElementById("tab-preview-btn");
        if (tabPreview) tabPreview.click();
      }
    });

    // 10. Beforeunload warning (Section AW)
    window.addEventListener("beforeunload", (e) => {
      if (state.dirtySet.size > 0) {
        e.preventDefault();
        e.returnValue = `Bạn có ${state.dirtySet.size} thay đổi chưa lưu trên ChemDex Data Editor!`;
        return e.returnValue;
      }
    });
  }

  bindState() {
    // 1. Dirty changes -> update global save bar (Section AU)
    state.subscribe("dirty", ({ dirtyCount, dirtyList }) => {
      const saveBar = document.getElementById("global-save-bar");
      const dirtyCountEl = document.getElementById("global-dirty-count");
      const chipsContainer = document.getElementById("global-dirty-chips");

      if (saveBar) {
        if (dirtyCount > 0) saveBar.classList.add("is-visible");
        else saveBar.classList.remove("is-visible");
      }

      if (dirtyCountEl) {
        dirtyCountEl.textContent = `${dirtyCount} thay đổi chưa lưu`;
      }

      if (chipsContainer) {
        chipsContainer.innerHTML = dirtyList
          .map((sym) => `<button class="dirty-chip" data-sym="${sym}">${sym}</button>`)
          .join("");

        chipsContainer.querySelectorAll(".dirty-chip").forEach((btn) => {
          btn.onclick = () => {
            const sym = btn.dataset.sym;
            this.attemptSelectElement(sym);
          };
        });
      }

      if (state.selectedSymbol) {
        this.updateElementActionButtons(state.selectedSymbol);
      }
    });

    // 2. Cloud status
    state.subscribe("cloudStatus", (status) => {
      const statusBadge = document.getElementById("cloud-status-badge");
      if (!statusBadge) return;

      if (status === "synced") {
        statusBadge.className = "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80";
        statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Cloud: Synced';
      } else if (status === "connecting") {
        statusBadge.className = "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/80";
        statusBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Cloud: Syncing...';
      } else {
        statusBadge.className = "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
        statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-500"></span> Cloud: Offline (Local)';
      }
    });

    // 3. Auth changes
    state.subscribe("auth", (user) => {
      const userDisplay = document.getElementById("auth-user-display");
      const authActionsLogged = document.getElementById("auth-actions-logged");
      const authActionsGuest = document.getElementById("auth-actions-guest");

      if (user) {
        if (userDisplay) {
          userDisplay.textContent = user.displayName || user.email || `User (${user.uid.slice(0, 6)})`;
          userDisplay.classList.remove("hidden");
        }
        if (authActionsLogged) authActionsLogged.classList.remove("hidden");
        if (authActionsGuest) authActionsGuest.classList.add("hidden");
      } else {
        if (userDisplay) userDisplay.classList.add("hidden");
        if (authActionsLogged) authActionsLogged.classList.add("hidden");
        if (authActionsGuest) authActionsGuest.classList.remove("hidden");
      }
    });

    // 4. Data update
    state.subscribe("dataUpdate", ({ symbol }) => {
      if (symbol === state.selectedSymbol) {
        this.updateActiveElementHeader(symbol);
        this.updateElementActionButtons(symbol);
      }
    });
  }
}

// Instantiate and launch
document.addEventListener("DOMContentLoaded", () => {
  const app = new DataEditorApp();
  app.init();
});
