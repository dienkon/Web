/**
 * Timetable Grid (Desktop) & Vertical Timeline (Mobile) Feature
 */

import { escapeHTML, $, $$ } from "../utils/dom.js";
import { DAY_NAMES, DAY_SHORT_NAMES, DAY_ORDER, formatDurationShort } from "../utils/format.js";
import { COLOR_MAP, DEFAULT_LESSONS, DEFAULT_TIMETABLE_HOURS, DEFAULT_TIMETABLE_DATA } from "../state/store.js";
import { TimeEngine } from "../core/time-engine.js";
import { events } from "../core/events.js";

export class TimetableFeature {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
  }

  init() {
    this.render();
    this.bindEvents();
    events.on("schedule:updated", () => this.render());
    events.on("schedule:day-changed", () => this.renderMobileTimeline());
    events.on("timetable:clear-day", (day) => this.clearDaySchedule(day));
    events.on("timetable:clear-all", () => this.clearAllSchedule());
    events.on("timetable:reset-sample", () => this.resetSampleSchedule());
  }

  bindEvents() {
    // 1. Delegation for Desktop Timetable interactions
    const desktopGrid = $("#timetable-body");
    if (desktopGrid) {
      desktopGrid.addEventListener("click", (e) => {
        // Quick delete button on cell
        const delBtn = e.target.closest(".btn-quick-del-cell");
        if (delBtn) {
          e.stopPropagation();
          const slotKey = delBtn.dataset.slotKey;
          this.removeItem(slotKey);
          return;
        }

        // Toggle complete button on cell
        const compBtn = e.target.closest(".btn-toggle-complete");
        if (compBtn) {
          e.stopPropagation();
          const slotKey = compBtn.dataset.slotKey;
          this.toggleComplete(slotKey);
          return;
        }

        // Edit slot time button in left time column
        const editSlotBtn = e.target.closest(".btn-edit-slot-time");
        if (editSlotBtn) {
          e.stopPropagation();
          events.emit("modal:open-manage-slots");
          return;
        }

        // Existing card click -> Open Detail or Multi-select
        const card = e.target.closest(".timetable-card");
        if (card) {
          const slotKey = card.dataset.slotKey;
          if (e.ctrlKey || e.metaKey) {
            this.toggleSelectCell(slotKey);
          } else {
            events.emit("drawer:open-detail", slotKey);
          }
          return;
        }

        // Empty cell click -> Open Quick Add Modal!
        const emptyCell = e.target.closest(".timetable-cell:not(:has(.timetable-card))");
        if (emptyCell) {
          const slotKey = emptyCell.dataset.slotKey;
          if (e.ctrlKey || e.metaKey) {
            this.toggleSelectCell(slotKey);
          } else {
            events.emit("modal:open-quick-add", slotKey);
          }
        }
      });
    }

    // 2. Delegation for Mobile Timeline interactions (CRITICAL FIX!)
    const mobileTimeline = $("#mobile-timeline-container");
    if (mobileTimeline) {
      mobileTimeline.addEventListener("click", (e) => {
        // Toggle complete
        const compBtn = e.target.closest('[data-action="toggle-complete-mobile"]');
        if (compBtn) {
          e.stopPropagation();
          const slotKey = compBtn.dataset.slotKey;
          this.toggleComplete(slotKey);
          return;
        }

        // Focus
        const focusBtn = e.target.closest('[data-action="focus-mobile"]');
        if (focusBtn) {
          e.stopPropagation();
          const slotKey = focusBtn.dataset.slotKey;
          const state = this.store.getState();
          const item = state.schedule.find((s) => s.slotId === slotKey);
          events.emit("focus:start", item);
          return;
        }

        // Detail
        const detailBtn = e.target.closest('[data-action="detail-mobile"]');
        if (detailBtn) {
          e.stopPropagation();
          const slotKey = detailBtn.dataset.slotKey;
          events.emit("drawer:open-detail", slotKey);
          return;
        }

        // Add to this day button
        const addBtn = e.target.closest('[data-action="mobile-add-to-day"]');
        if (addBtn) {
          e.stopPropagation();
          const state = this.store.getState();
          const activeDay = state.selectedDayMobile;
          // Find first empty slot today or first slot
          const emptySlot = state.timeSlots.find(
            (sl) => !state.schedule.some((s) => s.slotId === `${activeDay}-${sl.id}`)
          ) || state.timeSlots[0];

          if (emptySlot) {
            events.emit("modal:open-quick-add", `${activeDay}-${emptySlot.id}`);
          }
          return;
        }

        // Quick delete button on mobile card
        const delBtn = e.target.closest('[data-action="delete-mobile"]');
        if (delBtn) {
          e.stopPropagation();
          const slotKey = delBtn.dataset.slotKey;
          this.removeItem(slotKey);
          return;
        }

        // Clear all slots of this day
        const clearDayBtn = e.target.closest('[data-action="mobile-clear-day"]');
        if (clearDayBtn) {
          e.stopPropagation();
          const state = this.store.getState();
          this.clearDaySchedule(state.selectedDayMobile);
          return;
        }

        // Click card body opens detail
        const card = e.target.closest(".timeline-vertical-card");
        if (card) {
          const slotKey = card.dataset.slotKey;
          if (slotKey) events.emit("drawer:open-detail", slotKey);
        }
      });
    }

    // Filter tab buttons
    const filterContainer = $("#sub-filter-buttons");
    if (filterContainer) {
      filterContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-filter]");
        if (btn) {
          const filter = btn.dataset.filter;
          this.store.setState({ activeFilter: filter });
          filterContainer.querySelectorAll("[data-filter]").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.render();
        }
      });
    }

    // Multi-select actions bar
    $("#btn-multi-complete")?.addEventListener("click", () => this.bulkComplete());
    $("#btn-multi-delete")?.addEventListener("click", () => this.bulkDelete());
    $("#btn-multi-clear")?.addEventListener("click", () => this.clearSelection());
  }

  toggleSelectCell(slotKey) {
    const state = this.store.getState();
    if (state.selectedCells.has(slotKey)) {
      state.selectedCells.delete(slotKey);
    } else {
      state.selectedCells.add(slotKey);
    }
    this.updateMultiSelectBar();
    this.render();
  }

  clearSelection() {
    this.store.getState().selectedCells.clear();
    this.updateMultiSelectBar();
    this.render();
  }

  bulkComplete() {
    const state = this.store.getState();
    if (state.selectedCells.size === 0) return;
    this.history.recordState();

    state.schedule.forEach((item) => {
      if (state.selectedCells.has(item.slotId)) {
        item.status = "completed";
      }
    });

    state.selectedCells.clear();
    this.storage.debouncedSave();
    this.updateMultiSelectBar();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã đánh dấu hoàn thành các ca đã chọn", type: "success" });
  }

  bulkDelete() {
    const state = this.store.getState();
    if (state.selectedCells.size === 0) return;
    if (!confirm(`Xóa ${state.selectedCells.size} ca học đã chọn?`)) return;

    this.history.recordState();
    state.schedule = state.schedule.filter((item) => !state.selectedCells.has(item.slotId));
    state.selectedCells.clear();

    this.storage.debouncedSave();
    this.updateMultiSelectBar();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã xóa các ca đã chọn", type: "info" });
  }

  updateMultiSelectBar() {
    const bar = $("#multi-select-bar");
    const countEl = $("#multi-select-count");
    const state = this.store.getState();

    if (!bar) return;
    if (state.selectedCells.size > 0) {
      bar.classList.remove("hidden");
      if (countEl) countEl.textContent = state.selectedCells.size;
    } else {
      bar.classList.add("hidden");
    }
  }

  toggleComplete(slotKey) {
    this.history.recordState();
    const state = this.store.getState();
    const item = state.schedule.find((s) => s.slotId === slotKey);
    if (!item) return;

    item.status = item.status === "completed" ? "planned" : "completed";
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", {
      message: item.status === "completed" ? `Đã hoàn thành "${item.subject}"` : `Chưa hoàn thành "${item.subject}"`,
      type: "info",
    });
  }

  removeItem(slotKey) {
    this.history.recordState();
    const state = this.store.getState();
    const item = state.schedule.find((s) => s.slotId === slotKey);
    if (!item) return;

    state.schedule = state.schedule.filter((s) => s.slotId !== slotKey);
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: `Đã xóa "${item.subject}"`, type: "info" });
  }

  clearDaySchedule(day) {
    const state = this.store.getState();
    const count = state.schedule.filter((s) => s.slotId && s.slotId.startsWith(`${day}-`)).length;
    if (count === 0) {
      events.emit("toast:show", { message: `${DAY_NAMES[day]} hiện chưa có ca học nào để xóa`, type: "info" });
      return;
    }

    if (!confirm(`Xác nhận XÓA toàn bộ ${count} ca học trong ${DAY_NAMES[day]}?`)) return;

    this.storage.createSnapshot(`Trước khi xóa ${DAY_NAMES[day]}`);
    this.history.recordState();
    state.schedule = state.schedule.filter((s) => !s.slotId || !s.slotId.startsWith(`${day}-`));
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: `Đã xóa ${count} ca học của ${DAY_NAMES[day]} (Bấm Ctrl+Z để hoàn tác)`, type: "info" });
  }

  clearAllSchedule() {
    const state = this.store.getState();
    if (state.schedule.length === 0) {
      events.emit("toast:show", { message: "Thời khóa biểu hiện đang trống", type: "info" });
      return;
    }

    if (!confirm(`CẢNH BÁO: Bạn có chắc muốn XÓA TOÀN BỘ ${state.schedule.length} ca học trên thời khóa biểu cả tuần? (Dữ liệu sẽ được tự động sao lưu dự phòng trước khi xóa)`)) return;

    this.storage.createSnapshot("Trước khi xóa toàn bộ lịch");
    this.history.recordState();
    state.schedule = [];
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã xóa toàn bộ lịch học (Bấm Ctrl+Z để hoàn tác)", type: "info" });
  }

  resetSampleSchedule() {
    if (!confirm("Khôi phục thời khóa biểu về lịch học mẫu chuẩn mặc định? (Dữ liệu hiện tại sẽ được lưu snapshot)")) return;

    this.storage.createSnapshot("Trước khi khôi phục lịch mẫu");
    this.history.recordState();
    this.store.hydrate({
      schedule: JSON.parse(JSON.stringify(DEFAULT_TIMETABLE_DATA)),
      timeSlots: JSON.parse(JSON.stringify(DEFAULT_TIMETABLE_HOURS)),
      lessons: JSON.parse(JSON.stringify(DEFAULT_LESSONS)),
    });
    this.storage.save();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã khôi phục dữ liệu mẫu mặc định", type: "success" });
  }

  render() {
    this.renderDesktopGrid();
    this.renderMobileTimeline();
  }

  renderDesktopGrid() {
    const body = $("#timetable-body");
    const headerRow = $("#timetable-header-row");
    const indicator = $("#current-time-indicator");
    if (!body || !headerRow) return;

    body.innerHTML = "";
    if (indicator) body.appendChild(indicator);

    const state = this.store.getState();
    const now = new Date();
    const today = now.getDay();

    // 1. Render Header Row (Sticky) - FIXED WEEK: Thứ 2 -> Chủ Nhật, no shifting past/future
    headerRow.innerHTML = `
      <div class="p-2 text-center text-slate-400 text-[11px] font-bold border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 sticky-time-col flex items-center justify-center">
        GIỜ / CA
      </div>
      ${DAY_ORDER.map((d) => {
        const isToday = d === today;
        return `
          <div
            class="p-2.5 border-r border-slate-200 dark:border-slate-800 text-center transition-colors ${
              isToday ? "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-extrabold" : ""
            }"
          >
            <div class="text-xs uppercase tracking-tight flex items-center justify-center gap-1">
              <span>${DAY_NAMES[d]}</span>
              ${isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>' : ""}
            </div>
          </div>
        `;
      }).join("")}
    `;

    // 2. Render Rows (Dynamic based on state.timeSlots)
    state.timeSlots.forEach((slot) => {
      const row = document.createElement("div");
      row.dataset.rowSlot = slot.id;
      row.className = "grid timetable-grid-desktop border-b border-slate-200 dark:border-slate-800 min-h-[72px] transition-all relative group/row";

      // Time Column (Sticky left) with Edit Button
      const isOvernight = TimeEngine.isOvernight(slot.start, slot.end);
      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      const timeCol = document.createElement("div");
      timeCol.className =
        "p-2 flex flex-col justify-center items-center text-center bg-slate-50/90 dark:bg-slate-900/90 border-r border-slate-200 dark:border-slate-800 text-xs select-none sticky-time-col relative group/time";
      timeCol.innerHTML = `
        <div class="flex items-center gap-1 justify-center w-full">
          <span class="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate">${escapeHTML(slot.label)}</span>
          <button type="button" class="btn-edit-slot-time opacity-0 group-hover/time:opacity-100 p-0.5 rounded text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-950 transition" title="Sửa ca học này">
            <i data-lucide="settings-2" class="w-3 h-3"></i>
          </button>
        </div>
        <div class="text-[10px] text-slate-500 font-mono mt-0.5">${slot.start} - ${slot.end}</div>
        <span class="text-[9px] font-bold mt-0.5 px-1 rounded ${isOvernight ? "bg-purple-100 text-purple-700 dark:bg-purple-950" : "text-slate-400"}">${formatDurationShort(dur)}</span>
      `;
      row.appendChild(timeCol);

      // Days Columns
      DAY_ORDER.forEach((day) => {
        const slotKey = `${day}-${slot.id}`;
        const cell = document.createElement("div");
        cell.dataset.slotKey = slotKey;
        cell.dataset.day = day;
        cell.dataset.slotId = slot.id;

        const isToday = day === today;
        const isSelected = state.selectedCells.has(slotKey);

        cell.className = `timetable-cell p-1 border-r border-slate-200 dark:border-slate-800 transition-colors relative group flex items-stretch ${
          isToday ? "bg-sky-50/20 dark:bg-sky-950/10" : ""
        } ${isSelected ? "cell-multi-selected" : ""}`;

        // Drag & drop dropzone listeners
        cell.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          cell.classList.add("drop-target-valid");
        });
        cell.addEventListener("dragleave", () => cell.classList.remove("drop-target-valid"));
        cell.addEventListener("drop", (e) => {
          e.preventDefault();
          cell.classList.remove("drop-target-valid");
          try {
            const raw = e.dataTransfer.getData("text/plain");
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.type === "pool") {
              this.placeLessonIntoSlot(slotKey, data.id);
            } else if (data.type === "cell") {
              this.moveItem(data.sourceKey, slotKey);
            }
          } catch (err) {}
        });

        const item = state.schedule.find((s) => s.slotId === slotKey);

        if (item) {
          // Filter check
          let matchesFilter = true;
          if (state.activeFilter === "focus" && !item.isFocus) matchesFilter = false;
          if (state.activeFilter === "uncompleted" && item.status === "completed") matchesFilter = false;
          if (state.activeFilter === "completed" && item.status !== "completed") matchesFilter = false;

          const col = COLOR_MAP[item.color] || COLOR_MAP.blue;
          const isCompleted = item.status === "completed";

          const card = document.createElement("div");
          card.draggable = true;
          card.dataset.slotKey = slotKey;
          card.className = `timetable-card ${col.bg} ${col.border} ${col.text} ${isCompleted ? "is-completed" : ""} ${
            !matchesFilter ? "opacity-20 pointer-events-none" : ""
          }`;

          card.innerHTML = `
            <div class="flex items-start justify-between gap-1 leading-tight">
              <div class="flex items-center gap-1 truncate">
                ${item.isFocus ? '<span class="text-amber-500 text-xs font-bold">★</span>' : ""}
                <span class="font-bold text-xs truncate ${isCompleted ? "line-through text-slate-500" : ""}">${escapeHTML(item.subject)}</span>
              </div>
              <div class="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  data-slot-key="${slotKey}"
                  class="btn-toggle-complete p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition"
                  title="${isCompleted ? "Chưa hoàn thành" : "Hoàn thành"}"
                >
                  <i data-lucide="${isCompleted ? "check-circle-2" : "circle"}" class="w-3.5 h-3.5 ${isCompleted ? "text-emerald-600" : "text-slate-400"}"></i>
                </button>
                <button
                  type="button"
                  data-slot-key="${slotKey}"
                  class="btn-quick-del-cell opacity-0 group-hover:opacity-100 p-0.5 rounded text-rose-500 hover:text-rose-700 transition"
                  title="Xóa"
                >
                  <i data-lucide="x" class="w-3 h-3"></i>
                </button>
              </div>
            </div>

            <!-- Phụ trách & Phòng -->
            <div class="text-[10px] opacity-80 truncate mt-0.5 font-medium">
              <span class="font-semibold text-slate-700 dark:text-slate-200">${escapeHTML(item.teacher || "-")}</span>
              <span>•</span>
              <span>${escapeHTML(item.room || "-")}</span>
            </div>

            <div class="flex items-center justify-between text-[9px] mt-0.5">
              <span class="font-mono opacity-70">${slot.start}</span>
              ${item.priority === "critical" ? '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>' : item.priority === "high" ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>' : ""}
            </div>
          `;

          // Cell Dragging
          card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", JSON.stringify({ type: "cell", sourceKey: slotKey }));
            e.dataTransfer.effectAllowed = "move";
          });

          cell.appendChild(card);
        } else {
          // Empty cell -> clicking opens Quick Add!
          cell.innerHTML = `
            <div class="w-full h-full rounded-xl border border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 flex items-center justify-center cursor-pointer transition" title="Bấm để thêm môn vào ô này">
              <i data-lucide="plus" class="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition"></i>
            </div>
          `;
        }

        row.appendChild(cell);
      });

      body.appendChild(row);
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  renderMobileTimeline() {
    const listEl = $("#mobile-timeline-container");
    if (!listEl) return;

    const state = this.store.getState();
    const activeDay = state.selectedDayMobile;

    const dayItems = state.schedule.filter((s) => s.slotId && s.slotId.startsWith(`${activeDay}-`));

    // Sort day items according to timeSlots order
    dayItems.sort((a, b) => {
      const [, aSlotId] = a.slotId.split("-");
      const [, bSlotId] = b.slotId.split("-");
      const aIdx = state.timeSlots.findIndex((s) => s.id === aSlotId);
      const bIdx = state.timeSlots.findIndex((s) => s.id === bSlotId);
      return aIdx - bIdx;
    });

    if (dayItems.length === 0) {
      listEl.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <i data-lucide="calendar-x" class="w-6 h-6"></i>
          </div>
          <p class="font-bold text-sm text-slate-700 dark:text-slate-300">${DAY_NAMES[activeDay]} chưa có lịch học</p>
          <p class="text-xs text-slate-400 mt-1 mb-4">Bấm nút bên dưới để thêm môn vào ngày này</p>
          <button
            type="button"
            data-action="mobile-add-to-day"
            class="btn btn-primary py-2 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
          >
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Thêm môn vào ${DAY_NAMES[activeDay]}</span>
          </button>
        </div>
      `;
      if (typeof lucide !== "undefined") lucide.createIcons();
      return;
    }

    const cardsHtml = dayItems
      .map((item) => {
        const [, slotId] = item.slotId.split("-");
        const slot = state.timeSlots.find((s) => s.id === slotId);
        const col = COLOR_MAP[item.color] || COLOR_MAP.blue;
        const isCompleted = item.status === "completed";

        return `
          <div
            data-slot-key="${item.slotId}"
            class="timeline-vertical-card border ${col.bg} ${col.border} ${isCompleted ? "opacity-60" : ""} shadow-xs cursor-pointer"
          >
            <div class="flex items-center justify-between">
              <span class="font-mono text-xs font-bold text-slate-500">${slot ? `${slot.label} • ${slot.start} - ${slot.end}` : ""}</span>
              <button
                type="button"
                data-action="toggle-complete-mobile"
                data-slot-key="${item.slotId}"
                class="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 ${
                  isCompleted ? "text-emerald-600 font-bold" : "text-slate-400"
                }"
              >
                <i data-lucide="${isCompleted ? "check-circle-2" : "circle"}" class="w-4 h-4"></i>
                <span>${isCompleted ? "Đã xong" : "Chưa xong"}</span>
              </button>
            </div>

            <div class="flex items-center gap-1.5 mt-1">
              ${item.isFocus ? '<span class="text-amber-500 font-bold">★</span>' : ""}
              <h4 class="font-black text-base text-slate-900 dark:text-white ${isCompleted ? "line-through" : ""}">${escapeHTML(item.subject)}</h4>
            </div>

            <div class="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-0.5">
              <span>Phụ trách: <strong>${escapeHTML(item.teacher || "-")}</strong></span>
              <span>•</span>
              <span>Phòng: <strong>${escapeHTML(item.room || "-")}</strong></span>
            </div>

            <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
              <button
                type="button"
                data-action="focus-mobile"
                data-slot-key="${item.slotId}"
                class="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg flex items-center gap-1 shadow-2xs"
              >
                <i data-lucide="target" class="w-3.5 h-3.5"></i>
                <span>Focus</span>
              </button>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  data-action="delete-mobile"
                  data-slot-key="${item.slotId}"
                  class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:hover:bg-rose-900/80 dark:text-rose-400 font-semibold rounded-lg flex items-center gap-1 transition"
                  title="Xóa ca này khỏi lịch"
                >
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  <span>Xóa</span>
                </button>
                <button
                  type="button"
                  data-action="detail-mobile"
                  data-slot-key="${item.slotId}"
                  class="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg shadow-2xs"
                >
                  Chi tiết
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    listEl.innerHTML = `
      ${cardsHtml}
      <div class="pt-3 pb-8 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          data-action="mobile-add-to-day"
          class="btn btn-secondary py-2 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border-dashed"
        >
          <i data-lucide="plus" class="w-4 h-4 text-sky-500"></i>
          <span>Thêm ca</span>
        </button>
        <button
          type="button"
          data-action="mobile-clear-day"
          class="btn btn-secondary text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 py-2 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border-rose-200 dark:border-rose-900"
          title="Xóa tất cả các ca học trong ngày này"
        >
          <i data-lucide="trash-2" class="w-4 h-4 text-rose-500"></i>
          <span>Xóa hết ca ${DAY_NAMES[activeDay]}</span>
        </button>
      </div>
    `;

    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  placeLessonIntoSlot(slotKey, lessonId) {
    this.history.recordState();
    const state = this.store.getState();
    const lesson = state.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    const existingIdx = state.schedule.findIndex((s) => s.slotId === slotKey);
    const newItem = {
      id: `item_${Date.now()}`,
      subject: lesson.subject,
      teacher: lesson.teacher || "",
      room: lesson.room || "",
      color: lesson.color || "blue",
      slotId: slotKey,
      status: "planned",
      priority: "medium",
    };

    if (existingIdx >= 0) {
      state.schedule[existingIdx] = newItem;
    } else {
      state.schedule.push(newItem);
    }

    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: `Đã xếp "${lesson.subject}" vào lịch`, type: "success" });
  }

  moveItem(sourceKey, targetKey) {
    if (sourceKey === targetKey) return;
    this.history.recordState();
    const state = this.store.getState();

    const sourceItem = state.schedule.find((s) => s.slotId === sourceKey);
    const targetItem = state.schedule.find((s) => s.slotId === targetKey);

    if (sourceItem) sourceItem.slotId = targetKey;
    if (targetItem) targetItem.slotId = sourceKey;

    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã di chuyển hoạt động", type: "info" });
  }
}
