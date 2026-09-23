/**
 * ChemDex Data Editor - Command Palette & Quick Navigation
 * Fulfills Sections AY, CO, CP of ChemDex CMS Specification
 */
import { state } from "./state.js";
import { escapeHtml } from "./utils.js";

export class CommandPalette {
  constructor(appController) {
    this.app = appController;
    this.overlay = null;
    this.selectedIndex = 0;
    this.currentItems = [];
    this.initGlobalShortcut();
  }

  initGlobalShortcut() {
    window.addEventListener("keydown", (e) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        const selection = window.getSelection();
        // If user has highlighted text inside a rich text editor, Ctrl+K can be used for inserting link
        const isEditingText = selection && !selection.isCollapsed && selection.anchorNode?.parentElement?.closest(".rich-text-area");
        if (!isEditingText) {
          e.preventDefault();
          this.toggle();
        }
      }
    });
  }

  toggle() {
    if (this.overlay) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.close();

    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-start justify-center pt-20 px-4 animate-fade-in";
    overlay.innerHTML = `
      <div class="bg-[#181B1F] border border-white/10 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-slate-200">
        <!-- Input Header -->
        <div class="p-3.5 border-b border-white/10 flex items-center gap-3 bg-[#14171A]">
          <i class="fa-solid fa-magnifying-glass text-sky-400 text-sm"></i>
          <input
            type="text"
            id="cmd-palette-input"
            placeholder="Tìm nguyên tố (Fe, Sắt, 26) hoặc nhập lệnh (Lưu, Bảng, Xem trước)..."
            class="w-full bg-transparent text-white font-medium text-sm focus:outline-none placeholder:text-slate-500"
            autocomplete="off"
            autofocus
          />
          <button
            type="button"
            id="cmd-palette-close-btn"
            class="text-[10px] font-mono text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10 cursor-pointer transition-colors"
            title="Đóng (ESC)"
          >
            ESC
          </button>
        </div>

        <!-- Results List -->
        <div id="cmd-palette-results" class="overflow-y-auto p-2 space-y-1 flex-1 divide-y divide-white/5">
          <!-- Populated dynamically -->
        </div>

        <!-- Footer -->
        <div class="p-2.5 bg-[#111315] border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <div class="flex items-center gap-3">
            <span><kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">↑↓</kbd> Di chuyển</span>
            <span><kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">↵</kbd> Chọn</span>
          </div>
          <span class="text-sky-400/80 font-medium">ChemDex Visual CMS Command Hub</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;

    const input = overlay.querySelector("#cmd-palette-input");
    const closeBtn = overlay.querySelector("#cmd-palette-close-btn");
    input.focus();

    this.renderResults("");

    if (closeBtn) closeBtn.onclick = () => this.close();

    input.oninput = () => {
      this.selectedIndex = 0;
      this.renderResults(input.value.trim());
    };

    const handleKey = (e) => {
      if (!this.overlay) {
        window.removeEventListener("keydown", handleKey);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % Math.max(1, this.currentItems.length);
        this.updateActiveItem();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + this.currentItems.length) % Math.max(1, this.currentItems.length);
        this.updateActiveItem();
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.executeSelected();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
    };
    window.addEventListener("keydown", handleKey);

    overlay.onclick = (e) => {
      if (e.target === overlay) this.close();
    };
  }

  close() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  getActions() {
    return [
      {
        id: "act-save",
        type: "action",
        title: "Lưu nguyên tố hiện tại lên Firebase",
        sub: "Phím tắt: Ctrl + S",
        icon: "fa-solid fa-cloud-arrow-up text-emerald-400",
        run: () => {
          const btn = document.getElementById("element-save-btn");
          if (btn) btn.click();
        },
      },
      {
        id: "act-visual",
        type: "action",
        title: "Chuyển sang chế độ Soạn thảo trực quan (Visual Document)",
        sub: "Google Docs / Notion style",
        icon: "fa-solid fa-pen-nib text-blue-400",
        run: () => {
          const btn = document.getElementById("tab-visual-btn");
          if (btn) btn.click();
        },
      },
      {
        id: "act-preview",
        type: "action",
        title: "Chuyển sang chế độ Xem trước (Preview Mode)",
        sub: "Xem thành phẩm không có thanh công cụ",
        icon: "fa-solid fa-eye text-cyan-400",
        run: () => {
          const btn = document.getElementById("tab-preview-btn");
          if (btn) btn.click();
        },
      },
      {
        id: "act-source",
        type: "action",
        title: "Chuyển sang chế độ Mã nguồn (JSON Source)",
        sub: "Dành cho nhà phát triển / Quản trị",
        icon: "fa-solid fa-code text-amber-400",
        run: () => {
          const btn = document.getElementById("tab-source-btn");
          if (btn) btn.click();
        },
      },
      {
        id: "act-formula",
        type: "action",
        title: "Chèn công thức hóa học (H₂O, SO₄²⁻...)",
        sub: "Tự động đổi chỉ số dưới và trên",
        icon: "fa-solid fa-flask text-cyan-400",
        run: () => {
          if (this.app?.wysiwygToolbar?.chemistryTools) {
            this.app.wysiwygToolbar.chemistryTools.openFormulaDialog((txt) => {
              this.app.wysiwygToolbar.insertTextAtCursor(txt);
            });
          }
        },
      },
      {
        id: "act-equation",
        type: "action",
        title: "Chèn phương trình phản ứng hóa học",
        sub: "Có mũi tên thuận nghịch, điều kiện nhiệt độ",
        icon: "fa-solid fa-atom text-emerald-400",
        run: () => {
          if (this.app?.wysiwygToolbar?.chemistryTools) {
            this.app.wysiwygToolbar.chemistryTools.openEquationDialog((html) => {
              this.app.wysiwygToolbar.insertHtmlAtCursor(html);
            });
          }
        },
      },
      {
        id: "act-symbols",
        type: "action",
        title: "Mở bảng ký hiệu đặc biệt (Ω)",
        sub: "Mũi tên, dấu nhiệt độ, chữ cái Hy Lạp...",
        icon: "fa-solid fa-icons text-purple-400",
        run: () => {
          if (this.app?.wysiwygToolbar?.chemistryTools) {
            this.app.wysiwygToolbar.chemistryTools.openSpecialCharsDialog((c) => {
              this.app.wysiwygToolbar.insertTextAtCursor(c);
            });
          }
        },
      },
      {
        id: "act-export-curr",
        type: "action",
        title: "Xuất file JSON nguyên tố đang chọn",
        sub: "Tải file .json tương thích 100% với ChemDex",
        icon: "fa-solid fa-file-export text-sky-400",
        run: () => {
          const btn = document.getElementById("export-selected-btn");
          if (btn) btn.click();
        },
      },
      {
        id: "act-export-all",
        type: "action",
        title: "Xuất toàn bộ 118 nguyên tố hóa học",
        sub: "File System Access hoặc JSZip fallback",
        icon: "fa-solid fa-folder-tree text-emerald-400",
        run: () => {
          const btn = document.getElementById("export-all-btn");
          if (btn) btn.click();
        },
      },
    ];
  }

  renderResults(query) {
    const resultsContainer = this.overlay.querySelector("#cmd-palette-results");
    const q = query.toLowerCase();
    this.currentItems = [];

    // Filter actions
    const allActions = this.getActions();
    const matchedActions = q
      ? allActions.filter((a) => a.title.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q))
      : allActions.slice(0, 4);

    // Filter elements from state
    let matchedElements = [];
    if (state.elementsList.length > 0) {
      if (q) {
        matchedElements = state.elementsList.filter((el) => {
          const sym = (el.symbol || "").toLowerCase();
          const vi = (el.nameVi || "").toLowerCase();
          const en = (el.nameEn || "").toLowerCase();
          const num = String(el.number || "");
          return sym.includes(q) || vi.includes(q) || en.includes(q) || num === q;
        });
      } else {
        // Show active element + first few
        const curSym = state.selectedSymbol;
        matchedElements = state.elementsList.slice(0, 8);
      }
    }

    let itemsHtml = "";

    // Section 1: Actions
    if (matchedActions.length > 0) {
      itemsHtml += `<div class="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 tracking-wider">Thao tác nhanh</div>`;
      matchedActions.forEach((act) => {
        const itemIdx = this.currentItems.length;
        this.currentItems.push(act);
        itemsHtml += `
          <div
            class="cmd-item p-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
              itemIdx === this.selectedIndex ? "bg-sky-500/15 border border-sky-500/30 text-white" : "hover:bg-white/5 text-slate-300"
            }"
            data-idx="${itemIdx}"
          >
            <div class="flex items-center gap-3">
              <div class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs">
                <i class="${act.icon}"></i>
              </div>
              <div>
                <div class="text-xs font-semibold">${escapeHtml(act.title)}</div>
                <div class="text-[10px] text-slate-400">${escapeHtml(act.sub)}</div>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right text-[10px] text-slate-500"></i>
          </div>
        `;
      });
    }

    // Section 2: Elements
    if (matchedElements.length > 0) {
      itemsHtml += `<div class="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 tracking-wider mt-2">Nguyên tố hóa học (${matchedElements.length})</div>`;
      matchedElements.slice(0, 15).forEach((el) => {
        const itemIdx = this.currentItems.length;
        const elemItem = {
          type: "element",
          symbol: el.symbol,
          run: () => {
            this.app.attemptSelectElement(el.symbol);
          },
        };
        this.currentItems.push(elemItem);

        const isDirty = state.isDirty(el.symbol);
        itemsHtml += `
          <div
            class="cmd-item p-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
              itemIdx === this.selectedIndex ? "bg-sky-500/15 border border-sky-500/30 text-white" : "hover:bg-white/5 text-slate-300"
            }"
            data-idx="${itemIdx}"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex flex-col items-center justify-center text-white font-mono font-bold leading-none shadow-sm">
                <span class="text-[9px] text-cyan-200 leading-none">${el.number || "?"}</span>
                <span class="text-xs font-black leading-none">${escapeHtml(el.symbol)}</span>
              </div>
              <div>
                <div class="text-xs font-bold flex items-center gap-2">
                  <span>${escapeHtml(el.nameVi || el.symbol)}</span>
                  <span class="text-[11px] font-normal text-slate-400">(${escapeHtml(el.nameEn || "")})</span>
                </div>
                <div class="text-[10px] text-slate-400">Khối lượng: ${el.mass != null ? el.mass : "?"} | Phân loại: ${el.category || "unknown"}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              ${isDirty ? '<span class="text-[9px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800">● Chưa lưu</span>' : ""}
              <i class="fa-solid fa-arrow-turn-down-left text-xs text-slate-500"></i>
            </div>
          </div>
        `;
      });
    }

    if (this.currentItems.length === 0) {
      itemsHtml = `
        <div class="p-8 text-center text-slate-400">
          <i class="fa-solid fa-magnifying-glass text-2xl mb-2 text-slate-500"></i>
          <p class="text-xs font-semibold text-slate-300">Không tìm thấy kết quả nào cho "${escapeHtml(query)}"</p>
          <p class="text-[11px] text-slate-500 mt-0.5">Hãy thử tìm theo ký hiệu (Fe, O, H), tên (Sắt, Oxygen) hoặc số nguyên tử.</p>
        </div>
      `;
    }

    resultsContainer.innerHTML = itemsHtml;

    resultsContainer.querySelectorAll(".cmd-item").forEach((itemEl) => {
      itemEl.onclick = () => {
        const idx = parseInt(itemEl.dataset.idx, 10);
        this.selectedIndex = idx;
        this.executeSelected();
      };
    });
  }

  updateActiveItem() {
    if (!this.overlay) return;
    const items = this.overlay.querySelectorAll(".cmd-item");
    items.forEach((el, idx) => {
      if (idx === this.selectedIndex) {
        el.className = "cmd-item p-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors bg-sky-500/15 border border-sky-500/30 text-white";
        el.scrollIntoView({ block: "nearest" });
      } else {
        el.className = "cmd-item p-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors hover:bg-white/5 text-slate-300";
      }
    });
  }

  executeSelected() {
    const item = this.currentItems[this.selectedIndex];
    if (item && typeof item.run === "function") {
      this.close();
      item.run();
    }
  }
}
