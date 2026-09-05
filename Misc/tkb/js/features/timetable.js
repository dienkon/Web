/**
 * Timetable Feature - Desktop Smart Block Grid & Mobile Timeline
 * Uses Smart Block Merge Engine for visual continuity while preserving state integrity.
 */

import { escapeHTML, $, $$ } from "../utils/dom.js";
import { DAY_NAMES, DAY_SHORT_NAMES, DAY_ORDER, formatDurationShort } from "../utils/format.js";
import { COLOR_MAP, getColorConfig, DEFAULT_LESSONS, DEFAULT_TIMETABLE_HOURS, DEFAULT_TIMETABLE_DATA } from "../state/store.js";
import { TimeEngine } from "../core/time-engine.js";
import { buildMergedBlocks, splitMergedBlock, unsplitMergedBlock } from "../core/merge-engine.js";
import { analyticsEngine } from "./analytics-engine.js";
import { events } from "../core/events.js";

export class TimetableFeature {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
    this.clipboardItem = null;
    this.focusedSlotKey = null;
  }

  init() {
    this.render();
    this.bindEvents();
    this.bindKeyboardShortcuts();

    events.on("schedule:updated", () => this.render());
    events.on("schedule:day-changed", () => this.renderMobileTimeline());
    events.on("timetable:clear-day", (day) => this.clearDaySchedule(day));
    events.on("timetable:clear-all", () => this.clearAllSchedule());
    events.on("timetable:reset-sample", () => this.resetSampleSchedule());
    events.on("timetable:split-block", (slotKeys) => this.handleSplitBlock(slotKeys));
    events.on("timetable:delete-block", (slotKeys) => this.handleDeleteBlock(slotKeys));
    events.on("timetable:toggle-complete-block", (slotKeys) => this.handleToggleCompleteBlock(slotKeys));
  }

  bindEvents() {
    // 1. Delegation for Desktop Timetable interactions
    const desktopGrid = $("#timetable-body");
    if (desktopGrid) {
      desktopGrid.addEventListener("click", (e) => {
        // Quick delete button on block
        const delBtn = e.target.closest(".btn-quick-del-block");
        if (delBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(delBtn.dataset.slotKeys || "[]");
          this.handleDeleteBlock(slotKeys);
          return;
        }

        // Quick edit button on block
        const editBtn = e.target.closest(".btn-quick-edit-block");
        if (editBtn) {
          e.stopPropagation();
          const slotKey = editBtn.dataset.slotKey;
          events.emit("modal:open-quick-edit", slotKey);
          return;
        }

        // Quick split button on merged block
        const splitBtn = e.target.closest(".btn-quick-split-block");
        if (splitBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(splitBtn.dataset.slotKeys || "[]");
          this.handleSplitBlock(slotKeys);
          return;
        }

        // Toggle complete button on block
        const compBtn = e.target.closest(".btn-toggle-complete-block");
        if (compBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(compBtn.dataset.slotKeys || "[]");
          this.handleToggleCompleteBlock(slotKeys);
          return;
        }

        // Edit slot time button in left time column
        const editSlotBtn = e.target.closest(".btn-edit-slot-time");
        if (editSlotBtn) {
          e.stopPropagation();
          events.emit("modal:open-manage-slots");
          return;
        }

        // Click on Merged or Single Card -> Open Merged Block Detail or Drawer
        const card = e.target.closest(".timetable-card");
        if (card) {
          const slotKeys = JSON.parse(card.dataset.slotKeys || "[]");
          const firstKey = slotKeys[0] || card.dataset.slotKey;
          this.focusedSlotKey = firstKey;

          if (e.ctrlKey || e.metaKey) {
            slotKeys.forEach((k) => this.toggleSelectCell(k));
          } else {
            // Open Merged Block Detail Modal
            events.emit("modal:open-merged-detail", {
              blockId: card.dataset.blockId,
              slotKeys,
              day: card.dataset.day,
            });
          }
          return;
        }

        // Empty cell click -> Open Quick Add Modal!
        const emptyCell = e.target.closest(".timetable-empty-cell");
        if (emptyCell) {
          const slotKey = emptyCell.dataset.slotKey;
          this.focusedSlotKey = slotKey;
          if (e.ctrlKey || e.metaKey) {
            this.toggleSelectCell(slotKey);
          } else {
            events.emit("modal:open-quick-add", slotKey);
          }
        }
      });
    }

    // 2. Delegation for Mobile Timeline interactions
    const mobileTimeline = $("#mobile-timeline-container");
    if (mobileTimeline) {
      mobileTimeline.addEventListener("click", (e) => {
        // Toggle complete on mobile block
        const compBtn = e.target.closest('[data-action="toggle-complete-mobile"]');
        if (compBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(compBtn.dataset.slotKeys || `["${compBtn.dataset.slotKey}"]`);
          this.handleToggleCompleteBlock(slotKeys);
          return;
        }

        // Focus on mobile block
        const focusBtn = e.target.closest('[data-action="focus-mobile"]');
        if (focusBtn) {
          e.stopPropagation();
          const slotKey = focusBtn.dataset.slotKey;
          const state = this.store.getState();
          const item = state.schedule.find((s) => s.slotId === slotKey);
          if (item) events.emit("focus:start", item);
          return;
        }

        // Split on mobile block
        const splitBtn = e.target.closest('[data-action="split-mobile"]');
        if (splitBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(splitBtn.dataset.slotKeys || "[]");
          this.handleSplitBlock(slotKeys);
          return;
        }

        // Detail on mobile block
        const detailBtn = e.target.closest('[data-action="detail-mobile"]');
        if (detailBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(detailBtn.dataset.slotKeys || "[]");
          events.emit("modal:open-merged-detail", {
            slotKeys,
            day: this.store.getState().selectedDayMobile,
          });
          return;
        }

        // Add to this day button
        const addBtn = e.target.closest('[data-action="mobile-add-to-day"]');
        if (addBtn) {
          e.stopPropagation();
          const state = this.store.getState();
          const activeDay = state.selectedDayMobile;
          const emptySlot = state.timeSlots.find(
            (sl) => !state.schedule.some((s) => s.slotId === `${activeDay}-${sl.id}`)
          ) || state.timeSlots[0];

          if (emptySlot) {
            events.emit("modal:open-quick-add", `${activeDay}-${emptySlot.id}`);
          }
          return;
        }

        // Delete mobile block
        const delBtn = e.target.closest('[data-action="delete-mobile"]');
        if (delBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(delBtn.dataset.slotKeys || `["${delBtn.dataset.slotKey}"]`);
          this.handleDeleteBlock(slotKeys);
          return;
        }

        // Card body click
        const card = e.target.closest(".timeline-vertical-card");
        if (card) {
          const slotKeys = JSON.parse(card.dataset.slotKeys || "[]");
          events.emit("modal:open-merged-detail", {
            slotKeys,
            day: this.store.getState().selectedDayMobile,
          });
        }
      });
    }

    // Header Day Summary click to open Day Detail Drawer
    const headerRow = $("#timetable-header-row");
    if (headerRow) {
      headerRow.addEventListener("click", (e) => {
        const dayHeader = e.target.closest("[data-day-col-index]");
        if (dayHeader) {
          const dayNum = parseInt(dayHeader.dataset.dayColIndex, 10);
          events.emit("drawer:open-day-detail", dayNum);
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

  bindKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      // Ignore if user is typing inside an input, textarea or contentEditable
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + C: Copy selected session
      if (isCtrl && e.key.toLowerCase() === "c") {
        if (this.focusedSlotKey) {
          const state = this.store.getState();
          const item = state.schedule.find((s) => s.slotId === this.focusedSlotKey);
          if (item) {
            this.clipboardItem = JSON.parse(JSON.stringify(item));
            events.emit("toast:show", { message: `Đã sao chép môn "${item.subject}"`, type: "info" });
          }
        }
      }

      // Ctrl + V: Paste into focused cell
      if (isCtrl && e.key.toLowerCase() === "v") {
        if (this.clipboardItem && this.focusedSlotKey) {
          this.history.recordState();
          const state = this.store.getState();
          const existingIdx = state.schedule.findIndex((s) => s.slotId === this.focusedSlotKey);
          const pastedItem = {
            ...this.clipboardItem,
            id: `item_${Date.now()}`,
            slotId: this.focusedSlotKey,
          };

          if (existingIdx >= 0) {
            state.schedule[existingIdx] = pastedItem;
          } else {
            state.schedule.push(pastedItem);
          }

          this.storage.debouncedSave();
          this.render();
          events.emit("schedule:updated");
          events.emit("toast:show", { message: `Đã dán môn "${pastedItem.subject}" vào ô`, type: "success" });
        }
      }

      // Ctrl + D: Duplicate selected session into next slot
      if (isCtrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (this.focusedSlotKey) {
          this.duplicateSlot(this.focusedSlotKey);
        }
      }
    });
  }

  duplicateSlot(slotKey) {
    const [d, sId] = slotKey.split("-");
    const dayNum = parseInt(d, 10);
    const state = this.store.getState();
    const source = state.schedule.find((s) => s.slotId === slotKey);
    if (!source) return;

    // Find next slot in same day
    const sIdx = state.timeSlots.findIndex((s) => s.id === sId);
    if (sIdx >= 0 && sIdx < state.timeSlots.length - 1) {
      const nextSlot = state.timeSlots[sIdx + 1];
      const targetKey = `${dayNum}-${nextSlot.id}`;

      this.history.recordState();
      const existingIdx = state.schedule.findIndex((s) => s.slotId === targetKey);
      const dup = {
        ...source,
        id: `item_${Date.now()}`,
        slotId: targetKey,
      };

      if (existingIdx >= 0) state.schedule[existingIdx] = dup;
      else state.schedule.push(dup);

      this.storage.debouncedSave();
      this.render();
      events.emit("schedule:updated");
      events.emit("toast:show", { message: `Đã nhân bản "${source.subject}" sang ${nextSlot.label}`, type: "success" });
    }
  }

  handleSplitBlock(slotKeys = []) {
    if (!slotKeys || slotKeys.length === 0) return;
    this.history.recordState();
    const state = this.store.getState();
    state.schedule = splitMergedBlock(state.schedule, slotKeys);
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã tách khối thành các ca học độc lập", type: "info" });
  }

  handleDeleteBlock(slotKeys = []) {
    if (!slotKeys || slotKeys.length === 0) return;
    this.history.recordState();
    const state = this.store.getState();
    const keySet = new Set(slotKeys);
    state.schedule = state.schedule.filter((s) => !keySet.has(s.slotId));
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: `Đã xóa ${slotKeys.length} ca học khỏi lịch`, type: "info" });
  }

  handleToggleCompleteBlock(slotKeys = []) {
    if (!slotKeys || slotKeys.length === 0) return;
    this.history.recordState();
    const state = this.store.getState();
    const keySet = new Set(slotKeys);

    // Determine target state: if all are completed, toggle to planned; otherwise complete all
    const allCompleted = slotKeys.every((k) => {
      const it = state.schedule.find((s) => s.slotId === k);
      return it && it.status === "completed";
    });
    const targetStatus = allCompleted ? "planned" : "completed";

    state.schedule.forEach((item) => {
      if (keySet.has(item.slotId)) {
        item.status = targetStatus;
      }
    });

    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", {
      message: targetStatus === "completed" ? "Đã đánh dấu hoàn thành cả block" : "Đã chuyển cả block về chưa hoàn thành",
      type: "info",
    });
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
    events.emit("toast:show", { message: `Đã xóa ${count} ca học của ${DAY_NAMES[day]}`, type: "info" });
  }

  clearAllSchedule() {
    const state = this.store.getState();
    if (state.schedule.length === 0) {
      events.emit("toast:show", { message: "Thời khóa biểu hiện đang trống", type: "info" });
      return;
    }

    if (!confirm(`CẢNH BÁO: Bạn có chắc muốn XÓA TOÀN BỘ ${state.schedule.length} ca học trên thời khóa biểu cả tuần?`)) return;

    this.storage.createSnapshot("Trước khi xóa toàn bộ lịch");
    this.history.recordState();
    state.schedule = [];
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã xóa toàn bộ lịch học (Bấm Ctrl+Z để hoàn tác)", type: "info" });
  }

  resetSampleSchedule() {
    if (!confirm("Khôi phục thời khóa biểu về lịch học mẫu chuẩn mặc định?")) return;

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
    const slots = state.timeSlots;
    const numSlots = slots.length;

    // Pre-calculate daily stats for day summaries
    const analyticsData = analyticsEngine.computeAll(state.schedule, state.timeSlots, state.lessons);
    const dailyStatsMap = new Map();
    analyticsData.daily.forEach((d) => dailyStatsMap.set(d.day, d));

    // 1. Render Sticky Header Row with Day Summaries
    headerRow.innerHTML = `
      <div class="p-2.5 text-center text-slate-400 text-[11px] font-bold border-r border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 sticky-time-col flex items-center justify-center">
        GIỜ / CA
      </div>
      ${DAY_ORDER.map((d) => {
        const isToday = d === today;
        const dStats = dailyStatsMap.get(d) || { sessionCount: 0, totalHoursFormatted: "0", workloadScore: 0, workloadLevel: "Nhẹ", workloadColor: "emerald" };
        return `
          <div
            data-day-col-index="${d}"
            class="p-2 border-r border-slate-200 dark:border-slate-800 text-center transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 ${
              isToday ? "bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-extrabold" : ""
            }"
            title="Bấm để xem phân tích chi tiết của ${DAY_NAMES[d]}"
          >
            <div class="text-xs uppercase tracking-tight flex items-center justify-center gap-1.5">
              <span>${DAY_NAMES[d]}</span>
              ${isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>' : ""}
            </div>
            <!-- Day Summary Bar -->
            <div class="mt-1 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <span>${dStats.sessionCount} ca • ${dStats.totalHoursFormatted}h</span>
              <span class="px-1.5 py-0.2 rounded-full font-bold bg-${dStats.workloadColor}-100 text-${dStats.workloadColor}-700 dark:bg-${dStats.workloadColor}-950 dark:text-${dStats.workloadColor}-300">
                ${dStats.workloadScore}đ
              </span>
            </div>
          </div>
        `;
      }).join("")}
    `;

    // 2. Set Up Single CSS Grid Container for Body
    // Columns: 88px Time column + 7 equal day columns
    // Rows: exactly `numSlots` rows, each minmax(72px, auto)
    const gridContainer = document.createElement("div");
    gridContainer.id = "timetable-unified-grid";
    gridContainer.className = "grid relative";
    gridContainer.style.display = "grid";
    gridContainer.style.gridTemplateColumns = "88px repeat(7, minmax(130px, 1fr))";
    gridContainer.style.gridTemplateRows = `repeat(${numSlots}, minmax(72px, auto))`;

    // 3. Render Time Column Cells (Column 1)
    slots.forEach((slot, slotIdx) => {
      const isOvernight = TimeEngine.isOvernight(slot.start, slot.end);
      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      const timeCol = document.createElement("div");
      timeCol.dataset.rowSlot = slot.id;
      timeCol.className =
        "p-2 flex flex-col justify-center items-center text-center bg-slate-50/90 dark:bg-slate-900/90 border-r border-b border-slate-200 dark:border-slate-800 text-xs select-none sticky-time-col relative group/time";
      timeCol.style.gridColumn = "1";
      timeCol.style.gridRow = `${slotIdx + 1}`;

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

      gridContainer.appendChild(timeCol);
    });

    // 4. Render Day Columns with Smart Block Merge
    DAY_ORDER.forEach((day, dayOrderIdx) => {
      const colIndex = dayOrderIdx + 2; // Column 2 to 8
      const isToday = day === today;
      const autoMerge = state.settings.autoMergeBlocks !== false;

      // Call Pure Merge Engine to get visual blocks for this day
      const blocks = buildMergedBlocks(state.schedule, slots, day, autoMerge);

      // Track occupied slots in this day
      const occupiedSlotIndices = new Set();

      blocks.forEach((block) => {
        for (let idx = block.startSlotIndex; idx <= block.endSlotIndex; idx++) {
          occupiedSlotIndices.add(idx);
        }

        // Create Merged Visual Card Cell
        const blockCell = document.createElement("div");
        blockCell.dataset.blockId = block.id;
        blockCell.dataset.day = day;
        blockCell.dataset.slotKeys = JSON.stringify(block.slotKeys);
        blockCell.style.gridColumn = `${colIndex}`;
        blockCell.style.gridRow = `${block.startSlotIndex + 1} / span ${block.slotCount}`;
        blockCell.className = `p-1 border-r border-b border-slate-200 dark:border-slate-800 flex items-stretch relative ${
          isToday ? "bg-sky-50/20 dark:bg-sky-950/10" : ""
        }`;

        // Check active filters
        let matchesFilter = true;
        if (state.activeFilter === "focus" && !block.isFocus) matchesFilter = false;
        if (state.activeFilter === "uncompleted" && block.status === "completed") matchesFilter = false;
        if (state.activeFilter === "completed" && block.status !== "completed") matchesFilter = false;

        const col = getColorConfig(block.color);
        const isCompleted = block.status === "completed";
        const isSelected = block.slotKeys.some((k) => state.selectedCells.has(k));

        const card = document.createElement("div");
        card.draggable = true;
        card.dataset.blockId = block.id;
        card.dataset.day = day;
        card.dataset.slotKeys = JSON.stringify(block.slotKeys);
        card.dataset.slotKey = block.slotKeys[0];
        card.className = `timetable-card relative w-full h-full flex flex-col justify-between select-none ${col.bg} ${col.border} ${col.text} ${
          isCompleted ? "is-completed opacity-60" : ""
        } ${isSelected ? "cell-multi-selected" : ""} ${!matchesFilter ? "opacity-20 pointer-events-none" : ""}`;

        // Left accent bar
        const accentBarHtml = `<div class="absolute left-0 top-0 bottom-0 w-1 ${col.accent} rounded-l"></div>`;

        // Card Content depending on density (single slot vs multi-slot merged)
        if (block.slotCount > 1) {
          // SPANNING MERGED BLOCK LAYOUT
          card.innerHTML = `
            ${accentBarHtml}
            <div class="pl-2 flex-1 flex flex-col justify-between">
              <!-- Top Row: Subject & Badges & Actions -->
              <div>
                <div class="flex items-start justify-between gap-1.5">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      ${block.isFocus ? '<span class="text-amber-500 text-xs font-black" title="Ca trọng tâm Focus">★</span>' : ""}
                      <h4 class="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate ${isCompleted ? "line-through text-slate-500" : ""}">
                        ${escapeHTML(block.subject)}
                      </h4>
                    </div>
                    <!-- Time range & Spanned count badge -->
                    <div class="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5 flex-wrap">
                      <span>${block.startTime} — ${block.endTime}</span>
                      <span class="px-1.5 py-0.2 rounded-full font-bold bg-white/80 dark:bg-black/40 text-slate-700 dark:text-slate-300">
                        ${block.slotCount} tiết • ${block.durationMinutes}p
                      </span>
                    </div>
                  </div>

                  <!-- Quick Action Buttons -->
                  <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition">
                    <button type="button" class="btn-quick-edit-block p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300" data-slot-key="${block.slotKeys[0]}" title="Sửa nhanh block">
                      <i data-lucide="edit-3" class="w-3 h-3"></i>
                    </button>
                    <button type="button" class="btn-quick-split-block p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300" data-slot-keys='${JSON.stringify(block.slotKeys)}' title="Tách khối thành từng ca riêng">
                      <i data-lucide="split" class="w-3 h-3"></i>
                    </button>
                    <button type="button" class="btn-toggle-complete-block p-1 rounded hover:bg-black/10 dark:hover:bg-white/10" data-slot-keys='${JSON.stringify(block.slotKeys)}' title="${isCompleted ? "Chưa hoàn thành" : "Hoàn thành"}">
                      <i data-lucide="${isCompleted ? "check-circle-2" : "circle"}" class="w-3.5 h-3.5 ${isCompleted ? "text-emerald-600" : "text-slate-400"}"></i>
                    </button>
                    <button type="button" class="btn-quick-del-block p-1 rounded text-rose-500 hover:text-rose-700" data-slot-keys='${JSON.stringify(block.slotKeys)}' title="Xóa toàn bộ block">
                      <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                  </div>
                </div>

                <!-- Teacher & Room -->
                <div class="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-1">
                  <span>GV: <strong>${escapeHTML(block.teacher || "-")}</strong></span>
                  <span>•</span>
                  <span>Phòng: <strong>${escapeHTML(block.room || "-")}</strong></span>
                </div>
              </div>

              <!-- Footer: Priority & Multi-slot Pill -->
              <div class="flex items-center justify-between text-[10px] mt-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                <span class="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-white/60 dark:bg-black/30">Gộp ${block.slotCount} ca</span>
                ${block.priority === "critical" ? '<span class="px-1.5 rounded-full text-[9px] font-bold bg-rose-500 text-white">Gấp</span>' : block.priority === "high" ? '<span class="px-1.5 rounded-full text-[9px] font-bold bg-amber-500 text-white">Cao</span>' : ""}
              </div>
            </div>
          `;
        } else {
          // SINGLE SLOT COMPACT LAYOUT
          card.innerHTML = `
            ${accentBarHtml}
            <div class="pl-2 flex-1 flex flex-col justify-between">
              <div class="flex items-start justify-between gap-1 leading-tight">
                <div class="flex items-center gap-1 truncate">
                  ${block.isFocus ? '<span class="text-amber-500 text-xs font-bold">★</span>' : ""}
                  <span class="font-bold text-xs truncate ${isCompleted ? "line-through text-slate-500" : ""}">${escapeHTML(block.subject)}</span>
                </div>
                <div class="flex items-center gap-0.5 shrink-0">
                  <button type="button" data-slot-key="${block.slotKeys[0]}" class="btn-quick-edit-block opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-slate-700" title="Sửa nhanh">
                    <i data-lucide="edit-2" class="w-3 h-3"></i>
                  </button>
                  <button type="button" data-slot-keys='${JSON.stringify(block.slotKeys)}' class="btn-toggle-complete-block p-0.5 rounded hover:bg-black/10" title="${isCompleted ? "Chưa xong" : "Đã xong"}">
                    <i data-lucide="${isCompleted ? "check-circle-2" : "circle"}" class="w-3.5 h-3.5 ${isCompleted ? "text-emerald-600" : "text-slate-400"}"></i>
                  </button>
                  <button type="button" data-slot-keys='${JSON.stringify(block.slotKeys)}' class="btn-quick-del-block opacity-0 group-hover:opacity-100 p-0.5 rounded text-rose-500 hover:text-rose-700" title="Xóa">
                    <i data-lucide="x" class="w-3 h-3"></i>
                  </button>
                </div>
              </div>

              <div class="text-[10px] opacity-80 truncate mt-0.5 font-medium">
                <span>${escapeHTML(block.teacher || "-")}</span>
                <span>•</span>
                <span>${escapeHTML(block.room || "-")}</span>
              </div>

              <div class="flex items-center justify-between text-[9px] mt-0.5">
                <span class="font-mono opacity-70">${block.startTime}</span>
                ${block.priority === "critical" ? '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>' : block.priority === "high" ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>' : ""}
              </div>
            </div>
          `;
        }

        // Dragging Card
        card.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", JSON.stringify({ type: "cell", sourceKey: block.slotKeys[0], allKeys: block.slotKeys }));
          e.dataTransfer.effectAllowed = "move";
          card.classList.add("opacity-50");
        });
        card.addEventListener("dragend", () => {
          card.classList.remove("opacity-50");
        });

        // Drop Listeners on Occupied Cell to allow swapping activities
        blockCell.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          blockCell.classList.add("drop-target-valid");
        });
        blockCell.addEventListener("dragleave", () => blockCell.classList.remove("drop-target-valid"));
        blockCell.addEventListener("drop", (e) => {
          e.preventDefault();
          blockCell.classList.remove("drop-target-valid");
          try {
            const raw = e.dataTransfer.getData("text/plain");
            if (!raw) return;
            const data = JSON.parse(raw);
            const targetKey = block.slotKeys[0];
            if (data.type === "pool") {
              this.placeLessonIntoSlot(targetKey, data.id);
            } else if (data.type === "cell") {
              this.moveOrSwapItem(data.sourceKey, targetKey);
            }
          } catch (err) {}
        });

        blockCell.appendChild(card);
        gridContainer.appendChild(blockCell);
      });

      // 5. Render Empty Dropzone Cells for remaining non-occupied slots in this day
      for (let slotIdx = 0; slotIdx < numSlots; slotIdx++) {
        if (!occupiedSlotIndices.has(slotIdx)) {
          const slot = slots[slotIdx];
          const slotKey = `${day}-${slot.id}`;
          const isSelected = state.selectedCells.has(slotKey);

          const emptyCell = document.createElement("div");
          emptyCell.dataset.slotKey = slotKey;
          emptyCell.dataset.day = day;
          emptyCell.dataset.slotId = slot.id;
          emptyCell.style.gridColumn = `${colIndex}`;
          emptyCell.style.gridRow = `${slotIdx + 1}`;
          emptyCell.className = `timetable-empty-cell p-1 border-r border-b border-slate-200 dark:border-slate-800 flex items-stretch relative group ${
            isToday ? "bg-sky-50/20 dark:bg-sky-950/10" : ""
          } ${isSelected ? "cell-multi-selected" : ""}`;

          emptyCell.innerHTML = `
            <div class="w-full h-full rounded-xl border border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 flex items-center justify-center cursor-pointer transition" title="Bấm để thêm môn vào ô này">
              <i data-lucide="plus" class="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition"></i>
            </div>
          `;

          // Drop Listeners
          emptyCell.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            emptyCell.classList.add("drop-target-valid");
          });
          emptyCell.addEventListener("dragleave", () => emptyCell.classList.remove("drop-target-valid"));
          emptyCell.addEventListener("drop", (e) => {
            e.preventDefault();
            emptyCell.classList.remove("drop-target-valid");
            try {
              const raw = e.dataTransfer.getData("text/plain");
              if (!raw) return;
              const data = JSON.parse(raw);
              if (data.type === "pool") {
                this.placeLessonIntoSlot(slotKey, data.id);
              } else if (data.type === "cell") {
                this.moveOrSwapItem(data.sourceKey, slotKey);
              }
            } catch (err) {}
          });

          gridContainer.appendChild(emptyCell);
        }
      }
    });

    body.appendChild(gridContainer);
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  renderMobileTimeline() {
    const listEl = $("#mobile-timeline-container");
    if (!listEl) return;

    const state = this.store.getState();
    const activeDay = state.selectedDayMobile;
    const slots = state.timeSlots;
    const autoMerge = state.settings.autoMergeBlocks !== false;

    // Call Merge Engine for active mobile day
    const blocks = buildMergedBlocks(state.schedule, slots, activeDay, autoMerge);

    if (blocks.length === 0) {
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

    const cardsHtml = blocks
      .map((block) => {
        const col = getColorConfig(block.color);
        const isCompleted = block.status === "completed";

        return `
          <div
            data-block-id="${block.id}"
            data-slot-keys='${JSON.stringify(block.slotKeys)}'
            class="timeline-vertical-card border ${col.bg} ${col.border} ${isCompleted ? "opacity-60" : ""} shadow-xs cursor-pointer relative overflow-hidden"
          >
            <!-- Left Accent Indicator -->
            <div class="absolute left-0 top-0 bottom-0 w-1 ${col.accent}"></div>

            <div class="pl-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span class="font-mono text-xs font-bold text-slate-500">${block.startTime} — ${block.endTime}</span>
                  ${block.slotCount > 1 ? `<span class="text-[10px] px-2 py-0.2 rounded-full font-bold bg-white/70 dark:bg-black/40 text-slate-700 dark:text-slate-300">Gộp ${block.slotCount} ca (${block.durationMinutes}p)</span>` : ""}
                </div>

                <button
                  type="button"
                  data-action="toggle-complete-mobile"
                  data-slot-keys='${JSON.stringify(block.slotKeys)}'
                  class="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 ${
                    isCompleted ? "text-emerald-600 font-bold" : "text-slate-400"
                  }"
                >
                  <i data-lucide="${isCompleted ? "check-circle-2" : "circle"}" class="w-4 h-4"></i>
                  <span>${isCompleted ? "Đã xong" : "Chưa xong"}</span>
                </button>
              </div>

              <div class="flex items-center gap-1.5 mt-1">
                ${block.isFocus ? '<span class="text-amber-500 font-bold">★</span>' : ""}
                <h4 class="font-black text-base text-slate-900 dark:text-white ${isCompleted ? "line-through" : ""}">${escapeHTML(block.subject)}</h4>
              </div>

              <div class="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-0.5">
                <span>Phụ trách: <strong>${escapeHTML(block.teacher || "-")}</strong></span>
                <span>•</span>
                <span>Phòng: <strong>${escapeHTML(block.room || "-")}</strong></span>
              </div>

              <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-action="focus-mobile"
                    data-slot-key="${block.slotKeys[0]}"
                    class="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg flex items-center gap-1 shadow-2xs"
                  >
                    <i data-lucide="target" class="w-3.5 h-3.5"></i>
                    <span>Focus</span>
                  </button>

                  ${block.slotCount > 1 ? `
                    <button
                      type="button"
                      data-action="split-mobile"
                      data-slot-keys='${JSON.stringify(block.slotKeys)}'
                      class="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg"
                      title="Tách khối gộp này"
                    >
                      Tách ca
                    </button>
                  ` : ""}
                </div>

                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-action="delete-mobile"
                    data-slot-keys='${JSON.stringify(block.slotKeys)}'
                    class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:hover:bg-rose-900/80 dark:text-rose-400 font-semibold rounded-lg flex items-center gap-1 transition"
                    title="Xóa block này"
                  >
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    <span>Xóa</span>
                  </button>
                  <button
                    type="button"
                    data-action="detail-mobile"
                    data-slot-keys='${JSON.stringify(block.slotKeys)}'
                    class="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg shadow-2xs"
                  >
                    Chi tiết
                  </button>
                </div>
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
          <span>Thêm ca vào ${DAY_NAMES[activeDay]}</span>
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
      priority: lesson.priority || "medium",
      isFocus: false,
      notes: lesson.notes || "",
      manualSplit: false,
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

  moveOrSwapItem(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    this.history.recordState();
    const state = this.store.getState();

    const sourceItem = state.schedule.find((s) => s.slotId === sourceKey);
    const targetItem = state.schedule.find((s) => s.slotId === targetKey);

    if (!sourceItem && !targetItem) return;

    if (sourceItem && targetItem) {
      // Direct SWAP between two occupied slots
      sourceItem.slotId = targetKey;
      targetItem.slotId = sourceKey;
      this.storage.debouncedSave();
      this.render();
      events.emit("schedule:updated");
      events.emit("toast:show", {
        message: `Đã đổi vị trí giữa "${sourceItem.subject}" và "${targetItem.subject}"`,
        type: "success",
      });
    } else if (sourceItem && !targetItem) {
      // Move to empty slot
      sourceItem.slotId = targetKey;
      this.storage.debouncedSave();
      this.render();
      events.emit("schedule:updated");
      events.emit("toast:show", { message: `Đã chuyển "${sourceItem.subject}" sang ô mới`, type: "info" });
    } else if (!sourceItem && targetItem) {
      targetItem.slotId = sourceKey;
      this.storage.debouncedSave();
      this.render();
      events.emit("schedule:updated");
      events.emit("toast:show", { message: `Đã chuyển "${targetItem.subject}" sang ô mới`, type: "info" });
    }
  }

  moveItem(sourceKey, targetKey) {
    this.moveOrSwapItem(sourceKey, targetKey);
  }
}
