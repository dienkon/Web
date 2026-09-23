/**
 * ChemDex Data Editor - WYSIWYG & Rich-Text Toolbar Controller
 * Provides Notion / Google Docs / Word-like formatting for any contenteditable area
 * Full compliance with Sections H through W, AB through AF, AH through AJ, DF through DM of TODO.md
 */
import { colorPicker } from "./color-picker.js";
import { TableEditor } from "./table-editor.js";
import { ChemistryTools } from "./chemistry-tools.js";
import { showPromptModal, escapeHtml } from "./utils.js";

const CHEM_QUICK_SYMBOLS = ["₂", "₃", "₄", "⁺", "⁻", "→", "⇌", "↑", "↓", "°C", "Å"];

export class WysiwygToolbar {
  constructor(toolbarContainerId) {
    this.container = document.getElementById(toolbarContainerId);
    this.activeEditor = null;
    this.bubbleToolbar = null;
    this.tableEditor = new TableEditor(this);
    this.chemistryTools = new ChemistryTools(this);
    this.savedRange = null;

    this.initBubbleToolbar();
    this.initSelectionListener();
  }

  setActiveEditor(editorEl) {
    this.activeEditor = editorEl;
  }

  saveCurrentRange() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      this.savedRange = sel.getRangeAt(0).cloneRange();
    }
  }

  restoreCurrentRange() {
    if (this.savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this.savedRange);
    }
  }

  initBubbleToolbar() {
    let bubble = document.getElementById("wysiwyg-bubble-toolbar");
    if (!bubble) {
      bubble = document.createElement("div");
      bubble.id = "wysiwyg-bubble-toolbar";
      bubble.className = "bubble-toolbar hidden";
      bubble.innerHTML = `
        <button type="button" class="wysiwyg-btn" data-cmd="bold" title="In đậm (Ctrl+B)"><i class="fa-solid fa-bold text-xs"></i></button>
        <button type="button" class="wysiwyg-btn" data-cmd="italic" title="In nghiêng (Ctrl+I)"><i class="fa-solid fa-italic text-xs"></i></button>
        <button type="button" class="wysiwyg-btn" data-cmd="underline" title="Gạch chân (Ctrl+U)"><i class="fa-solid fa-underline text-xs"></i></button>
        <button type="button" class="wysiwyg-btn" data-cmd="strikeThrough" title="Gạch ngang"><i class="fa-solid fa-strikethrough text-xs"></i></button>
        
        <div class="wysiwyg-separator"></div>

        <button type="button" class="wysiwyg-btn" data-cmd="subscript" title="Chỉ số dưới (H₂O)"><i class="fa-solid fa-subscript text-xs text-cyan-400"></i></button>
        <button type="button" class="wysiwyg-btn" data-cmd="superscript" title="Chỉ số trên (SO₄²⁻)"><i class="fa-solid fa-superscript text-xs text-cyan-400"></i></button>

        <div class="wysiwyg-separator"></div>

        <button type="button" class="wysiwyg-btn bubble-color-btn" title="Đổi màu chữ"><i class="fa-solid fa-palette text-xs text-sky-400"></i></button>
        <button type="button" class="wysiwyg-btn bubble-highlight-btn" title="Đánh dấu highlight"><i class="fa-solid fa-highlighter text-xs text-amber-400"></i></button>
        <button type="button" class="wysiwyg-btn bubble-link-btn" title="Chèn liên kết"><i class="fa-solid fa-link text-xs"></i></button>

        <div class="wysiwyg-separator"></div>

        <button type="button" class="wysiwyg-btn bubble-formula-btn" title="Chèn công thức hóa học"><i class="fa-solid fa-flask text-xs text-cyan-300"></i></button>
      `;
      document.body.appendChild(bubble);

      // Bind commands on bubble
      bubble.querySelectorAll("button[data-cmd]").forEach((btn) => {
        btn.onmousedown = (e) => {
          e.preventDefault();
          this.executeCommand(btn.dataset.cmd);
          this.updateBubblePosition();
        };
      });

      bubble.querySelector(".bubble-color-btn").onmousedown = (e) => {
        e.preventDefault();
        this.promptTextColor();
      };
      bubble.querySelector(".bubble-highlight-btn").onmousedown = (e) => {
        e.preventDefault();
        this.promptHighlightColor();
      };
      bubble.querySelector(".bubble-link-btn").onmousedown = (e) => {
        e.preventDefault();
        this.promptInsertLink();
      };
      bubble.querySelector(".bubble-formula-btn").onmousedown = (e) => {
        e.preventDefault();
        this.chemistryTools.openFormulaDialog((txt) => this.insertTextAtCursor(txt));
      };
    }
    this.bubbleToolbar = bubble;
  }

  initSelectionListener() {
    document.addEventListener("selectionchange", () => {
      this.updateBubblePosition();
    });

    document.addEventListener("mousedown", (e) => {
      if (this.bubbleToolbar && !this.bubbleToolbar.contains(e.target)) {
        if (!e.target.closest(".rich-text-area") && !e.target.closest(".color-picker-dialog")) {
          this.bubbleToolbar.classList.add("hidden");
        }
      }
    });
  }

  updateBubblePosition() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      if (this.bubbleToolbar) this.bubbleToolbar.classList.add("hidden");
      return;
    }

    const anchorNode = selection.anchorNode;
    const editableParent =
      anchorNode?.nodeType === Node.ELEMENT_NODE
        ? anchorNode.closest(".rich-text-area")
        : anchorNode?.parentElement?.closest(".rich-text-area");

    if (!editableParent) {
      if (this.bubbleToolbar) this.bubbleToolbar.classList.add("hidden");
      return;
    }

    this.activeEditor = editableParent;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      this.bubbleToolbar.classList.add("hidden");
      return;
    }

    const top = rect.top + window.scrollY - 42;
    const left = rect.left + window.scrollX + rect.width / 2;

    this.bubbleToolbar.style.top = `${top}px`;
    this.bubbleToolbar.style.left = `${left}px`;
    this.bubbleToolbar.classList.remove("hidden");
  }

  executeCommand(command, value = null) {
    document.execCommand(command, false, value);
    if (this.activeEditor) {
      this.activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  renderFixedToolbar() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="wysiwyg-toolbar flex items-center flex-wrap gap-1 p-2 bg-[#181B1F] border-b border-white/5 text-slate-300">
        <!-- Group 1: Undo / Redo -->
        <div class="flex items-center gap-0.5">
          <button type="button" class="wysiwyg-btn" data-cmd="undo" title="Hoàn tác (Ctrl+Z)"><i class="fa-solid fa-rotate-left"></i></button>
          <button type="button" class="wysiwyg-btn" data-cmd="redo" title="Làm lại (Ctrl+Y)"><i class="fa-solid fa-rotate-right"></i></button>
        </div>

        <div class="wysiwyg-separator"></div>

        <!-- Group 2: Paragraph & Headings -->
        <select id="tb-heading-select" class="wysiwyg-select font-semibold">
          <option value="p">Văn bản thường</option>
          <option value="h1">Tiêu đề 1 (Lớn)</option>
          <option value="h2">Tiêu đề 2 (Vừa)</option>
          <option value="h3">Tiêu đề 3 (Nhỏ)</option>
          <option value="blockquote">Trích dẫn</option>
        </select>

        <!-- Group 3: Font Family with Preview (Section DL) -->
        <select id="tb-font-select" class="wysiwyg-select">
          <option value="Inter" style="font-family: Inter;">Inter (Hiện đại)</option>
          <option value="Roboto" style="font-family: Roboto;">Roboto (Chuẩn)</option>
          <option value="'Times New Roman'" style="font-family: 'Times New Roman';">Times New Roman</option>
          <option value="'JetBrains Mono'" style="font-family: 'JetBrains Mono';">JetBrains Mono</option>
        </select>

        <!-- Group 4: Font Size with Preview (Section DM) -->
        <select id="tb-size-select" class="wysiwyg-select w-20">
          <option value="3" selected>14px (Chuẩn)</option>
          <option value="1">10px (Nhỏ)</option>
          <option value="2">12px (Phụ)</option>
          <option value="4">16px (Vừa)</option>
          <option value="5">18px (Lớn)</option>
          <option value="6">24px (Đề mục)</option>
          <option value="7">32px (Tiêu đề)</option>
        </select>

        <div class="wysiwyg-separator"></div>

        <!-- Group 5: Basic Text Styles (Bold, Italic, Underline, Strikethrough) -->
        <div class="flex items-center gap-0.5">
          <button type="button" class="wysiwyg-btn" data-cmd="bold" title="In đậm (Ctrl+B)"><i class="fa-solid fa-bold"></i></button>
          <button type="button" class="wysiwyg-btn" data-cmd="italic" title="In nghiêng (Ctrl+I)"><i class="fa-solid fa-italic"></i></button>
          <button type="button" class="wysiwyg-btn" data-cmd="underline" title="Gạch chân (Ctrl+U)"><i class="fa-solid fa-underline"></i></button>
          <button type="button" class="wysiwyg-btn" data-cmd="strikeThrough" title="Gạch ngang"><i class="fa-solid fa-strikethrough"></i></button>
        </div>

        <div class="wysiwyg-separator"></div>

        <!-- Group 6: Text Color & Highlight (Sections N, O, DG, DH) -->
        <div class="flex items-center gap-0.5">
          <button type="button" id="tb-color-picker-btn" class="wysiwyg-btn flex items-center gap-1" title="Màu chữ (Bảng màu trực quan)">
            <i class="fa-solid fa-palette text-sky-400"></i>
            <span class="text-[11px] hidden sm:inline">Màu</span>
          </button>
          <button type="button" id="tb-highlight-picker-btn" class="wysiwyg-btn flex items-center gap-1" title="Highlight màu nền">
            <i class="fa-solid fa-highlighter text-amber-400"></i>
            <span class="text-[11px] hidden sm:inline">Highlight</span>
          </button>
        </div>

        <div class="wysiwyg-separator"></div>

        <!-- Group 7: Alignment -->
        <div class="flex items-center gap-0.5">
          <button type="button" class="wysiwyg-btn" data-cmd="justifyLeft" title="Căn trái"><i class="fa-solid fa-align-left"></i></button>
          <button type="button" class="wysiwyg-btn" data-cmd="justifyCenter" title="Căn giữa"><i class="fa-solid fa-align-center"></i></button>
          <button type="button" class="wysiwyg-btn" data-cmd="justifyRight" title="Căn phải"><i class="fa-solid fa-align-right"></i></button>
          <button type="button" class="wysiwyg-btn" data-cmd="justifyFull" title="Căn đều"><i class="fa-solid fa-align-justify"></i></button>
        </div>

        <div class="wysiwyg-separator"></div>

        <!-- Group 8: Lists, Quote, Divider -->
        <div class="flex items-center gap-0.5">
          <button type="button" class="wysiwyg-btn" data-cmd="insertUnorderedList" title="Danh sách chấm đầu dòng"><i class="fa-solid fa-list-ul"></i></button>
          <button type="button" class="wysiwyg-btn" data-cmd="insertOrderedList" title="Danh sách đánh số"><i class="fa-solid fa-list-ol"></i></button>
          <button type="button" id="tb-insert-quote-btn" class="wysiwyg-btn" title="Trích dẫn (Quote)"><i class="fa-solid fa-quote-left"></i></button>
          <button type="button" id="tb-insert-divider-btn" class="wysiwyg-btn" title="Đường kẻ phân cách"><i class="fa-solid fa-minus"></i></button>
        </div>

        <div class="wysiwyg-separator"></div>

        <!-- Group 9: Table, Link, Image -->
        <div class="flex items-center gap-0.5">
          <button type="button" id="tb-insert-table-btn" class="wysiwyg-btn flex items-center gap-1 text-sky-400" title="Chèn bảng mới (Kéo chọn kích thước)">
            <i class="fa-solid fa-table"></i>
            <span class="text-[11px] font-semibold hidden md:inline">Bảng</span>
          </button>
          <button type="button" id="tb-insert-link-btn" class="wysiwyg-btn" title="Chèn liên kết URL"><i class="fa-solid fa-link"></i></button>
          <button type="button" id="tb-insert-image-btn" class="wysiwyg-btn" title="Chèn hình ảnh"><i class="fa-solid fa-image"></i></button>
        </div>

        <div class="wysiwyg-separator"></div>

        <!-- Group 10: Chemistry Formula & Equation Tools (Sections AH, AI, AJ, DF) -->
        <div class="flex items-center gap-1 bg-[#111315] p-1 rounded-xl border border-white/5">
          <button type="button" class="wysiwyg-btn" data-cmd="subscript" title="Chỉ số dưới (H₂O)"><i class="fa-solid fa-subscript text-cyan-400"></i></button>
          <button type="button" class="wysiwyg-btn" data-cmd="superscript" title="Chỉ số trên (SO₄²⁻)"><i class="fa-solid fa-superscript text-cyan-400"></i></button>

          <button type="button" id="tb-formula-btn" class="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center gap-1 border border-cyan-500/20" title="Chèn công thức hóa học tự động chuyển số">
            <i class="fa-solid fa-flask text-xs"></i>
            <span>Công thức</span>
          </button>

          <button type="button" id="tb-equation-btn" class="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1 border border-emerald-500/20" title="Chèn phương trình phản ứng (Mũi tên, điều kiện)">
            <i class="fa-solid fa-atom text-xs"></i>
            <span>Phương trình</span>
          </button>

          <button type="button" id="tb-symbols-btn" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 font-serif font-bold text-sm flex items-center justify-center border border-white/5" title="Bảng ký hiệu đặc biệt hóa học (Ω)">
            Ω
          </button>
        </div>

        <!-- Quick Symbols Badges -->
        <div class="hidden 2xl:flex items-center gap-1 ml-1">
          ${CHEM_QUICK_SYMBOLS.map(
            (s) => `<button type="button" class="chem-symbol-badge chem-quick-btn" data-sym="${s}">${s}</button>`
          ).join("")}
        </div>
      </div>
    `;

    // Bind standard command buttons with mousedown prevention to maintain selection
    this.container.querySelectorAll("button[data-cmd]").forEach((btn) => {
      btn.onmousedown = (e) => {
        e.preventDefault();
        this.executeCommand(btn.dataset.cmd);
      };
    });

    // Heading Select
    const headingSelect = this.container.querySelector("#tb-heading-select");
    headingSelect.onchange = () => {
      const val = headingSelect.value;
      if (val === "blockquote") {
        this.executeCommand("formatBlock", "blockquote");
      } else {
        this.executeCommand("formatBlock", `<${val}>`);
      }
    };

    // Font Select
    const fontSelect = this.container.querySelector("#tb-font-select");
    fontSelect.onchange = () => {
      this.executeCommand("fontName", fontSelect.value);
    };

    // Font Size Select
    const sizeSelect = this.container.querySelector("#tb-size-select");
    sizeSelect.onchange = () => {
      this.executeCommand("fontSize", sizeSelect.value);
    };

    // Color Pickers (using unified ColorPicker)
    const colorBtn = this.container.querySelector("#tb-color-picker-btn");
    colorBtn.onmousedown = (e) => {
      e.preventDefault();
      this.promptTextColor();
    };

    const highlightBtn = this.container.querySelector("#tb-highlight-picker-btn");
    highlightBtn.onmousedown = (e) => {
      e.preventDefault();
      this.promptHighlightColor();
    };

    // Table Grid Picker
    const tableBtn = this.container.querySelector("#tb-insert-table-btn");
    tableBtn.onmousedown = (e) => {
      e.preventDefault();
      this.tableEditor.openGridPicker(tableBtn, (rows, cols) => {
        const tableHtml = this.tableEditor.generateTableHtml(rows, cols);
        this.insertHtmlAtCursor(tableHtml);
      });
    };

    // Quote & Divider
    const quoteBtn = this.container.querySelector("#tb-insert-quote-btn");
    quoteBtn.onmousedown = (e) => {
      e.preventDefault();
      this.insertHtmlAtCursor('<blockquote class="p-3 my-3 border-l-4 border-cyan-400 bg-cyan-950/20 text-slate-200 italic rounded-r-lg">Nhập trích dẫn hóa học ở đây...</blockquote><p><br></p>');
    };

    const dividerBtn = this.container.querySelector("#tb-insert-divider-btn");
    dividerBtn.onmousedown = (e) => {
      e.preventDefault();
      this.insertHtmlAtCursor('<hr class="my-4 border-white/10" /><p><br></p>');
    };

    // Link & Image
    this.container.querySelector("#tb-insert-link-btn").onmousedown = (e) => {
      e.preventDefault();
      this.promptInsertLink();
    };
    this.container.querySelector("#tb-insert-image-btn").onmousedown = (e) => {
      e.preventDefault();
      this.promptInsertImage();
    };

    // Formula & Equation
    const formulaBtn = this.container.querySelector("#tb-formula-btn");
    formulaBtn.onmousedown = (e) => {
      e.preventDefault();
      this.chemistryTools.openFormulaDialog((txt) => {
        this.insertTextAtCursor(txt);
      });
    };

    const eqBtn = this.container.querySelector("#tb-equation-btn");
    eqBtn.onmousedown = (e) => {
      e.preventDefault();
      this.chemistryTools.openEquationDialog((html) => {
        this.insertHtmlAtCursor(html);
      });
    };

    // Special Symbols
    const symsBtn = this.container.querySelector("#tb-symbols-btn");
    symsBtn.onmousedown = (e) => {
      e.preventDefault();
      this.chemistryTools.openSpecialCharsDialog((c) => {
        this.insertTextAtCursor(c);
      });
    };

    // Quick Chem Symbols
    this.container.querySelectorAll(".chem-quick-btn").forEach((btn) => {
      btn.onmousedown = (e) => {
        e.preventDefault();
        const sym = btn.dataset.sym;
        this.insertTextAtCursor(sym);
      };
    });
  }

  insertTextAtCursor(text) {
    if (!this.activeEditor) return;
    this.activeEditor.focus();
    document.execCommand("insertText", false, text);
    this.activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
  }

  insertHtmlAtCursor(html) {
    if (!this.activeEditor) return;
    this.activeEditor.focus();
    document.execCommand("insertHTML", false, html);
    this.activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
  }

  promptTextColor() {
    colorPicker.open({
      title: "Đổi màu chữ",
      currentColor: "#38BDF8",
      mode: "foreColor",
      onSelect: (color) => {
        this.executeCommand("foreColor", color);
      },
    });
  }

  promptHighlightColor() {
    colorPicker.open({
      title: "Đánh dấu màu nền (Highlight)",
      currentColor: "#FEF08A",
      mode: "hiliteColor",
      onSelect: (color) => {
        this.executeCommand("hiliteColor", color);
      },
    });
  }

  promptInsertLink() {
    showPromptModal({
      title: "Chèn liên kết (Link)",
      message: "Nhập địa chỉ URL của liên kết:",
      placeholder: "https://vi.wikipedia.org/...",
      onConfirm: (url) => {
        if (!url) return;
        this.executeCommand("createLink", url);
      },
    });
  }

  promptInsertImage() {
    showPromptModal({
      title: "Chèn hình ảnh",
      message: "Nhập đường dẫn URL ảnh hoặc đường dẫn nội bộ:",
      placeholder: "./assets/elements/... hoặc https://...",
      onConfirm: (url) => {
        if (!url) return;
        const imgHtml = `
          <div class="my-3 text-center">
            <img src="${escapeHtml(url)}" alt="Hình ảnh hóa học" class="max-w-full rounded-xl border border-white/10 mx-auto shadow-lg max-h-80 object-contain" />
          </div>
          <p><br></p>
        `;
        this.insertHtmlAtCursor(imgHtml);
      },
    });
  }
}
