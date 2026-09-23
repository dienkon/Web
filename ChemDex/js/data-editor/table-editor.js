/**
 * ChemDex Data Editor - Table Editor & Smart Context Toolbar
 * Fulfills Sections X, Y, Z, AA, DN of ChemDex CMS Specification
 */
import { colorPicker } from "./color-picker.js";
import { escapeHtml } from "./utils.js";

export class TableEditor {
  constructor(wysiwygInstance) {
    this.wysiwyg = wysiwygInstance;
    this.activeCell = null;
    this.activeTable = null;
    this.contextToolbar = null;
    this.initContextToolbar();
    this.initTableListeners();
  }

  initContextToolbar() {
    let tb = document.getElementById("table-context-toolbar");
    if (!tb) {
      tb = document.createElement("div");
      tb.id = "table-context-toolbar";
      tb.className = "table-context-toolbar hidden";
      tb.innerHTML = `
        <div class="flex items-center gap-1 p-1 bg-[#181B1F] border border-white/10 rounded-xl shadow-2xl text-xs text-slate-200">
          <span class="px-2 py-0.5 text-[10px] font-bold text-sky-400 uppercase tracking-wider border-r border-white/10 flex items-center gap-1">
            <i class="fa-solid fa-table"></i> Bảng
          </span>
          
          <!-- Add Rows -->
          <button type="button" class="tbl-act-btn" data-action="row-above" title="Thêm hàng phía trên">
            <i class="fa-solid fa-arrow-up text-[10px]"></i> +Hàng
          </button>
          <button type="button" class="tbl-act-btn" data-action="row-below" title="Thêm hàng phía dưới">
            <i class="fa-solid fa-arrow-down text-[10px]"></i> +Hàng
          </button>

          <div class="w-px h-4 bg-white/10 mx-0.5"></div>

          <!-- Add Columns -->
          <button type="button" class="tbl-act-btn" data-action="col-left" title="Thêm cột bên trái">
            <i class="fa-solid fa-arrow-left text-[10px]"></i> +Cột
          </button>
          <button type="button" class="tbl-act-btn" data-action="col-right" title="Thêm cột bên phải">
            <i class="fa-solid fa-arrow-right text-[10px]"></i> +Cột
          </button>

          <div class="w-px h-4 bg-white/10 mx-0.5"></div>

          <!-- Delete Operations -->
          <button type="button" class="tbl-act-btn text-rose-300 hover:bg-rose-500/20" data-action="del-row" title="Xóa hàng hiện tại">
            <i class="fa-solid fa-trash-can text-[10px]"></i> Xóa hàng
          </button>
          <button type="button" class="tbl-act-btn text-rose-300 hover:bg-rose-500/20" data-action="del-col" title="Xóa cột hiện tại">
            <i class="fa-solid fa-trash-can text-[10px]"></i> Xóa cột
          </button>

          <div class="w-px h-4 bg-white/10 mx-0.5"></div>

          <!-- Cell Style -->
          <button type="button" class="tbl-act-btn" id="tbl-cell-bg-btn" title="Màu nền ô này">
            <i class="fa-solid fa-fill-drip text-amber-400"></i> Nền ô
          </button>
          <button type="button" class="tbl-act-btn" id="tbl-preset-btn" title="Kiểu dáng bảng">
            <i class="fa-solid fa-palette text-indigo-400"></i> Kiểu
          </button>

          <!-- Delete Table -->
          <button type="button" class="tbl-act-btn text-rose-400 hover:bg-rose-600 hover:text-white ml-1" data-action="del-table" title="Xóa toàn bộ bảng">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `;
      document.body.appendChild(tb);

      // Handle action clicks
      tb.querySelectorAll("button[data-action]").forEach((btn) => {
        btn.onmousedown = (e) => {
          e.preventDefault();
          this.handleTableAction(btn.dataset.action);
        };
      });

      // Cell background via ColorPicker
      tb.querySelector("#tbl-cell-bg-btn").onclick = (e) => {
        e.preventDefault();
        if (!this.activeCell) return;
        colorPicker.open({
          title: "Màu nền ô bảng",
          currentColor: "#20252B",
          mode: "custom",
          onSelect: (hex) => {
            if (this.activeCell) {
              this.activeCell.style.backgroundColor = hex;
              this.triggerInput();
            }
          },
        });
      };

      // Table style preset
      tb.querySelector("#tbl-preset-btn").onclick = (e) => {
        e.preventDefault();
        this.promptTablePreset();
      };
    }
    this.contextToolbar = tb;
  }

  initTableListeners() {
    document.addEventListener("click", (e) => {
      const cell = e.target.closest("td, th");
      const table = cell ? cell.closest("table") : null;

      if (cell && table) {
        this.activeCell = cell;
        this.activeTable = table;
        this.updateContextToolbarPosition(cell);
      } else if (!e.target.closest("#table-context-toolbar") && !e.target.closest(".color-picker-dialog")) {
        this.hideContextToolbar();
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.key === "Escape") this.hideContextToolbar();
    });
  }

  updateContextToolbarPosition(cell) {
    if (!this.contextToolbar) return;
    const rect = cell.getBoundingClientRect();
    const top = Math.max(10, rect.top + window.scrollY - 44);
    const left = Math.max(10, rect.left + window.scrollX);

    this.contextToolbar.style.top = `${top}px`;
    this.contextToolbar.style.left = `${left}px`;
    this.contextToolbar.classList.remove("hidden");
  }

  hideContextToolbar() {
    if (this.contextToolbar) {
      this.contextToolbar.classList.add("hidden");
    }
    this.activeCell = null;
    this.activeTable = null;
  }

  triggerInput() {
    const parentEditor = this.activeTable?.closest(".rich-text-area");
    if (parentEditor) {
      parentEditor.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  handleTableAction(action) {
    if (!this.activeCell || !this.activeTable) return;
    const row = this.activeCell.closest("tr");
    const tbody = this.activeTable.querySelector("tbody") || this.activeTable;
    const colIndex = Array.from(row.children).indexOf(this.activeCell);

    switch (action) {
      case "row-above": {
        const newRow = document.createElement("tr");
        const cellCount = row.children.length;
        for (let i = 0; i < cellCount; i++) {
          const td = document.createElement("td");
          td.className = "p-2.5 border border-white/10 bg-[#181B1F] text-slate-200 text-xs";
          td.innerHTML = "Ô mới...";
          newRow.appendChild(td);
        }
        row.parentNode.insertBefore(newRow, row);
        this.triggerInput();
        break;
      }
      case "row-below": {
        const newRow = document.createElement("tr");
        const cellCount = row.children.length;
        for (let i = 0; i < cellCount; i++) {
          const td = document.createElement("td");
          td.className = "p-2.5 border border-white/10 bg-[#181B1F] text-slate-200 text-xs";
          td.innerHTML = "Ô mới...";
          newRow.appendChild(td);
        }
        if (row.nextSibling) {
          row.parentNode.insertBefore(newRow, row.nextSibling);
        } else {
          row.parentNode.appendChild(newRow);
        }
        this.triggerInput();
        break;
      }
      case "col-left": {
        this.activeTable.querySelectorAll("tr").forEach((tr) => {
          const isHeader = tr.parentNode.tagName.toLowerCase() === "thead" || tr.children[0]?.tagName.toLowerCase() === "th";
          const cell = document.createElement(isHeader ? "th" : "td");
          cell.className = isHeader
            ? "p-2.5 border border-white/10 bg-[#20252B] text-white font-bold text-xs"
            : "p-2.5 border border-white/10 bg-[#181B1F] text-slate-200 text-xs";
          cell.innerHTML = isHeader ? "Cột mới" : "Nội dung...";
          const target = tr.children[colIndex];
          if (target) tr.insertBefore(cell, target);
        });
        this.triggerInput();
        break;
      }
      case "col-right": {
        this.activeTable.querySelectorAll("tr").forEach((tr) => {
          const isHeader = tr.parentNode.tagName.toLowerCase() === "thead" || tr.children[0]?.tagName.toLowerCase() === "th";
          const cell = document.createElement(isHeader ? "th" : "td");
          cell.className = isHeader
            ? "p-2.5 border border-white/10 bg-[#20252B] text-white font-bold text-xs"
            : "p-2.5 border border-white/10 bg-[#181B1F] text-slate-200 text-xs";
          cell.innerHTML = isHeader ? "Cột mới" : "Nội dung...";
          const target = tr.children[colIndex];
          if (target && target.nextSibling) {
            tr.insertBefore(cell, target.nextSibling);
          } else {
            tr.appendChild(cell);
          }
        });
        this.triggerInput();
        break;
      }
      case "del-row": {
        if (this.activeTable.querySelectorAll("tr").length <= 1) {
          this.activeTable.remove();
        } else {
          row.remove();
        }
        this.hideContextToolbar();
        this.triggerInput();
        break;
      }
      case "del-col": {
        const rows = this.activeTable.querySelectorAll("tr");
        if (row.children.length <= 1) {
          this.activeTable.remove();
        } else {
          rows.forEach((r) => {
            if (r.children[colIndex]) r.children[colIndex].remove();
          });
        }
        this.hideContextToolbar();
        this.triggerInput();
        break;
      }
      case "del-table": {
        this.activeTable.remove();
        this.hideContextToolbar();
        this.triggerInput();
        break;
      }
    }
  }

  promptTablePreset() {
    if (!this.activeTable) return;
    const presets = [
      { name: "Mặc định (Tối thanh lịch)", headerBg: "#20252B", cellBg: "#181B1F", border: "rgba(255,255,255,0.08)" },
      { name: "Cyan ChemDex (Điểm nhấn)", headerBg: "#0C4A6E", cellBg: "#082F49", border: "rgba(56,189,248,0.2)" },
      { name: "Emerald (Xanh lục)", headerBg: "#064E3B", cellBg: "#022C22", border: "rgba(52,211,153,0.2)" },
      { name: "Amber (Vàng hóa học)", headerBg: "#78350F", cellBg: "#451A03", border: "rgba(251,191,36,0.2)" },
      { name: "Viền mờ tối giản", headerBg: "transparent", cellBg: "transparent", border: "rgba(255,255,255,0.06)" },
    ];

    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-fade-in";
    overlay.innerHTML = `
      <div class="bg-[#181B1F] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
        <h3 class="font-bold text-sm text-white flex items-center gap-2">
          <i class="fa-solid fa-palette text-sky-400"></i> Chọn kiểu dáng bảng
        </h3>
        <div class="space-y-2">
          ${presets
            .map(
              (p, i) => `
            <button
              type="button"
              class="w-full text-left p-2.5 rounded-xl border border-white/5 hover:border-sky-400 bg-[#20252B] hover:bg-white/10 transition-all flex items-center justify-between"
              data-idx="${i}"
            >
              <span class="text-xs font-semibold text-slate-200">${escapeHtml(p.name)}</span>
              <div class="flex items-center gap-1">
                <span class="w-3.5 h-3.5 rounded border border-white/10" style="background-color: ${p.headerBg};"></span>
                <span class="w-3.5 h-3.5 rounded border border-white/10" style="background-color: ${p.cellBg};"></span>
              </div>
            </button>
          `
            )
            .join("")}
        </div>
        <div class="pt-2 flex justify-end">
          <button type="button" id="tp-close" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300">Đóng</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelectorAll("button[data-idx]").forEach((btn) => {
      btn.onclick = () => {
        const p = presets[parseInt(btn.dataset.idx, 10)];
        if (this.activeTable && p) {
          this.activeTable.querySelectorAll("th").forEach((th) => {
            th.style.backgroundColor = p.headerBg;
            th.style.borderColor = p.border;
          });
          this.activeTable.querySelectorAll("td").forEach((td) => {
            td.style.backgroundColor = p.cellBg;
            td.style.borderColor = p.border;
          });
          this.activeTable.style.borderColor = p.border;
          this.triggerInput();
        }
        overlay.remove();
      };
    });

    overlay.querySelector("#tp-close").onclick = () => overlay.remove();
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  }

  /**
   * Interactive 8x8 Grid Picker for Table Insertion (Section X)
   */
  openGridPicker(anchorEl, onInsert) {
    let picker = document.getElementById("table-grid-picker-popover");
    if (picker) picker.remove();

    picker = document.createElement("div");
    picker.id = "table-grid-picker-popover";
    picker.className = "table-grid-picker de-glass p-3 rounded-2xl shadow-2xl border border-white/10 z-[120]";

    const maxRows = 8;
    const maxCols = 8;

    picker.innerHTML = `
      <div class="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between">
        <span>Chèn bảng</span>
        <span id="grid-dimensions-label" class="text-sky-400 font-mono">1 × 1</span>
      </div>
      <div id="grid-cells-matrix" class="grid grid-cols-8 gap-1 p-1 bg-[#111315] rounded-xl border border-white/5 w-fit">
        ${Array.from({ length: maxRows * maxCols })
          .map((_, i) => {
            const r = Math.floor(i / maxCols) + 1;
            const c = (i % maxCols) + 1;
            return `<div class="grid-cell w-5 h-5 rounded bg-white/5 border border-white/5 cursor-pointer transition-colors" data-r="${r}" data-c="${c}"></div>`;
          })
          .join("")}
      </div>
      <div class="mt-2 text-center">
        <span class="text-[10px] text-slate-400" id="grid-hint-label">Di chuột để chọn kích thước</span>
      </div>
    `;

    document.body.appendChild(picker);

    // Position popover near anchor
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      picker.style.position = "fixed";
      picker.style.top = `${rect.bottom + 6}px`;
      picker.style.left = `${Math.min(window.innerWidth - 220, Math.max(10, rect.left))}px`;
    }

    const label = picker.querySelector("#grid-dimensions-label");
    const hint = picker.querySelector("#grid-hint-label");
    const cells = picker.querySelectorAll(".grid-cell");

    const highlightCells = (selectedR, selectedC) => {
      cells.forEach((cell) => {
        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        if (r <= selectedR && c <= selectedC) {
          cell.classList.add("bg-sky-500", "border-sky-400");
          cell.classList.remove("bg-white/5", "border-white/5");
        } else {
          cell.classList.remove("bg-sky-500", "border-sky-400");
          cell.classList.add("bg-white/5", "border-white/5");
        }
      });
      label.textContent = `${selectedR} × ${selectedC}`;
      hint.textContent = `Nhấp để chèn bảng ${selectedR} hàng, ${selectedC} cột`;
    };

    cells.forEach((cell) => {
      cell.onmouseenter = () => {
        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        highlightCells(r, c);
      };

      cell.onclick = () => {
        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        picker.remove();
        onInsert(r, c);
      };
    });

    // Close on outside click
    const handleOutside = (e) => {
      if (!picker.contains(e.target) && (!anchorEl || !anchorEl.contains(e.target))) {
        picker.remove();
        document.removeEventListener("mousedown", handleOutside);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handleOutside), 10);
  }

  generateTableHtml(rows, cols) {
    let html = '<div class="table-responsive my-3 overflow-x-auto"><table class="w-full border-collapse border border-white/10 rounded-xl overflow-hidden shadow-md"><thead><tr>';
    for (let c = 1; c <= cols; c++) {
      html += `<th class="p-2.5 border border-white/10 bg-[#20252B] text-white font-bold text-xs text-left">Tiêu đề ${c}</th>`;
    }
    html += "</tr></thead><tbody>";
    for (let r = 1; r <= rows; r++) {
      html += "<tr>";
      for (let c = 1; c <= cols; c++) {
        html += '<td class="p-2.5 border border-white/10 bg-[#181B1F] text-slate-200 text-xs">Nội dung...</td>';
      }
      html += "</tr>";
    }
    html += "</tbody></table></div><p><br></p>";
    return html;
  }
}
