/**
 * Modal Dialogs UI Component
 */

import { escapeHTML, $, $$ } from "../utils/dom.js";
import { formatMinutes, formatDurationShort, DAY_NAMES, DAY_SHORT_NAMES, DAY_ORDER } from "../utils/format.js";
import { COLOR_MAP } from "../state/store.js";
import { events } from "../core/events.js";
import { TimeEngine } from "../core/time-engine.js";
import { generateId } from "../utils/helpers.js";

export class ModalUI {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
  }

  init() {
    this.bindEvents();
    this.bindQuickAddForm();
    this.bindManageSlotsForm();
    this.bindPlaceActivityForm();
  }

  bindEvents() {
    // Backdrop clicks to close
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-backdrop")) {
        this.closeAll();
      }

      // Close buttons
      const closeBtn = e.target.closest("[data-modal-close]");
      if (closeBtn) {
        const modalId = closeBtn.dataset.modalClose;
        this.close(modalId);
      }

      // Open buttons (CRITICAL FIX: Allow [data-modal-open] to open modals!)
      const openBtn = e.target.closest("[data-modal-open]");
      if (openBtn) {
        const modalId = openBtn.dataset.modalOpen;
        this.open(modalId);
      }
    });

    // Esc key closes active modal
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeAll();
      }
    });

    // Event bus hooks
    events.on("modal:open", (id) => this.open(id));
    events.on("modal:close", (id) => this.close(id));
    events.on("modal:open-quick-add", (slotKey) => this.openQuickAdd(slotKey));
    events.on("modal:open-manage-slots", () => this.openManageSlots());
    events.on("modal:open-place-activity", (lessonId) => this.openPlaceActivity(lessonId));
  }

  open(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
      modal.classList.add("active");
      if (typeof lucide !== "undefined") lucide.createIcons();
    }
  }

  close(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) modal.classList.remove("active");
  }

  closeAll() {
    $$(".modal-backdrop.active").forEach((m) => m.classList.remove("active"));
  }

  /**
   * CRITICAL FIX: Populate detailed ongoing activity with safe null guards and matching DOM IDs
   */
  populateOngoingModal(activeData, nextData, now = new Date()) {
    const subEl = $("#modal-curr-subject");
    const teacherEl = $("#modal-curr-teacher");
    const roomEl = $("#modal-curr-room");
    const timeRangeEl = $("#modal-curr-time-range");
    const priorityEl = $("#modal-curr-priority");
    const notesEl = $("#modal-curr-notes");
    const percentEl = $("#modal-curr-percent");
    const progressBarEl = $("#modal-curr-progress-bar");
    const elapsedEl = $("#modal-curr-elapsed");
    const remainingEl = $("#modal-curr-remaining");
    const nextSubEl = $("#modal-next-subject");
    const nextTimeEl = $("#modal-next-time");
    const btnComplete = $("#btn-modal-curr-complete");
    const btnFocus = $("#btn-modal-curr-focus");

    if (!subEl) return;

    if (activeData && !activeData.isFree && activeData.activity) {
      const act = activeData.activity;
      const slot = activeData.slot;

      subEl.textContent = act.subject || "Chưa có tên";
      if (teacherEl) teacherEl.textContent = act.teacher || "Chưa ghi phụ trách";
      if (roomEl) roomEl.textContent = act.room || "Tự do";
      if (timeRangeEl) {
        timeRangeEl.textContent = slot ? `${slot.label}: ${slot.start} - ${slot.end}` : "--:--";
      }
      if (priorityEl) {
        priorityEl.textContent = (act.priority || "medium").toUpperCase();
      }
      if (notesEl) {
        notesEl.textContent = act.notes ? act.notes : "Không có ghi chú.";
      }

      const pct = Math.min(100, Math.max(0, Math.round(activeData.progress || 0)));
      if (percentEl) percentEl.textContent = `${pct}%`;
      if (progressBarEl) progressBarEl.style.width = `${pct}%`;

      const elapsedMin = Math.floor(activeData.elapsedMinutes || 0);
      const remainingMin = Math.ceil(activeData.remainingMinutes || 0);
      if (elapsedEl) elapsedEl.textContent = `Đã qua: ${elapsedMin} phút`;
      if (remainingEl) remainingEl.textContent = `Còn lại: ${remainingMin} phút`;

      if (btnComplete) {
        btnComplete.style.display = "inline-flex";
        btnComplete.onclick = () => {
          events.emit("focus:complete-current");
          this.close("modal-current-activity");
        };
      }

      if (btnFocus) {
        btnFocus.style.display = "inline-flex";
        btnFocus.onclick = () => {
          this.close("modal-current-activity");
          events.emit("focus:start", { ...act, slot });
        };
      }
    } else {
      const isFree = Boolean(activeData && activeData.isFree);
      subEl.textContent = isFree ? "Thời gian tự do / Nghỉ ngơi" : "Hiện không có ca học";
      if (teacherEl) teacherEl.textContent = "--";
      if (roomEl) roomEl.textContent = "--";
      if (timeRangeEl) {
        timeRangeEl.textContent = activeData?.slot
          ? `${activeData.slot.label}: ${activeData.slot.start} - ${activeData.slot.end}`
          : "Trống";
      }
      if (priorityEl) priorityEl.textContent = "TIÊU CHUẨN";
      if (notesEl) notesEl.textContent = "Không có hoạt động nào trong khung giờ này.";

      const pct = isFree ? Math.min(100, Math.max(0, Math.round(activeData.progress || 0))) : 0;
      if (percentEl) percentEl.textContent = `${pct}%`;
      if (progressBarEl) progressBarEl.style.width = `${pct}%`;

      if (elapsedEl) {
        elapsedEl.textContent = isFree ? `Đã qua: ${Math.floor(activeData.elapsedMinutes || 0)} phút` : "Đã qua: 0 phút";
      }
      if (remainingEl) {
        remainingEl.textContent = isFree ? `Còn lại: ${Math.ceil(activeData.remainingMinutes || 0)} phút` : "Còn lại: 0 phút";
      }

      if (btnComplete) btnComplete.style.display = "none";
      if (btnFocus) {
        btnFocus.style.display = "inline-flex";
        btnFocus.onclick = () => {
          this.close("modal-current-activity");
          events.emit("focus:start");
        };
      }
    }

    // Next activity today preview
    if (nextSubEl) {
      if (nextData && nextData.item) {
        nextSubEl.textContent = nextData.item.subject || "Chưa có tên";
      } else {
        nextSubEl.textContent = "Không có ca tiếp theo hôm nay";
      }
    }

    if (nextTimeEl) {
      if (nextData && nextData.slot) {
        const startsIn = Math.ceil(nextData.startsInMinutes || 0);
        nextTimeEl.textContent = `${nextData.slot.label} (${nextData.slot.start} - ${nextData.slot.end}) • Sau ${startsIn}p`;
      } else {
        nextTimeEl.textContent = "--:--";
      }
    }
  }

  // ==================== 1. QUICK ADD TO TIMETABLE MODAL ====================
  openQuickAdd(slotKey) {
    const modal = $("#modal-quick-add");
    if (!modal) return;

    const state = this.store.getState();
    const [d, slotId] = slotKey.split("-");
    const slot = state.timeSlots.find((s) => s.id === slotId);

    $("#quick-add-slot-key").value = slotKey;
    const titleEl = $("#quick-add-slot-title");
    if (titleEl && slot) {
      titleEl.textContent = `${DAY_NAMES[d]} • ${slot.label} (${slot.start} - ${slot.end})`;
    }

    // Render Library Grid in Tab 1
    this.renderQuickAddLibraryList(slotKey);

    this.open("modal-quick-add");
    setTimeout(() => $("#quick-add-search-input")?.focus(), 50);
  }

  renderQuickAddLibraryList(slotKey) {
    const container = $("#quick-add-library-list");
    if (!container) return;

    const state = this.store.getState();
    const query = ($("#quick-add-search-input")?.value || "").toLowerCase().trim();

    let items = state.lessons;
    if (query) {
      items = items.filter(
        (l) =>
          l.subject.toLowerCase().includes(query) ||
          (l.teacher && l.teacher.toLowerCase().includes(query)) ||
          (l.room && l.room.toLowerCase().includes(query))
      );
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400">
          Chưa có môn phù hợp trong kho. Bạn có thể sang tab "Tạo mới" bên cạnh để thêm nhanh!
        </div>
      `;
      return;
    }

    container.innerHTML = items
      .map((lesson) => {
        const col = COLOR_MAP[lesson.color] || COLOR_MAP.blue;
        return `
          <button
            type="button"
            data-pick-lesson-id="${lesson.id}"
            class="p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 hover:scale-[1.02] active:scale-[0.98] transition shadow-xs ${col.bg} ${col.border} ${col.text}"
          >
            <div class="truncate">
              <div class="font-bold text-xs truncate">${escapeHTML(lesson.subject)}</div>
              <div class="text-[10px] opacity-75 truncate mt-0.5">${escapeHTML(lesson.teacher || "-")} • ${escapeHTML(lesson.room || "-")}</div>
            </div>
            <span class="text-xs font-bold text-sky-600 dark:text-sky-400 shrink-0">Chọn ↵</span>
          </button>
        `;
      })
      .join("");

    // Click to place
    container.querySelectorAll("[data-pick-lesson-id]").forEach((btn) => {
      btn.onclick = () => {
        const lessonId = btn.dataset.pickLessonId;
        const targetSlotKey = $("#quick-add-slot-key").value;
        const lesson = state.lessons.find((l) => l.id === lessonId);
        if (!lesson) return;

        this.history.recordState();
        // Remove existing item in target slot if any
        state.schedule = state.schedule.filter((s) => s.slotId !== targetSlotKey);
        state.schedule.push({
          id: `item_${Date.now()}`,
          subject: lesson.subject,
          teacher: lesson.teacher || "",
          room: lesson.room || "",
          color: lesson.color || "blue",
          slotId: targetSlotKey,
          status: "planned",
          priority: "medium",
        });

        this.storage.debouncedSave();
        this.close("modal-quick-add");
        events.emit("schedule:updated");
        events.emit("toast:show", { message: `Đã xếp "${lesson.subject}" vào lịch`, type: "success" });
      };
    });
  }

  bindQuickAddForm() {
    // Search input in quick add
    const searchInput = $("#quick-add-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const slotKey = $("#quick-add-slot-key")?.value || "";
        this.renderQuickAddLibraryList(slotKey);
      });
    }

    // Tabs switch in quick add modal
    const tabBtns = $$("#modal-quick-add [data-quick-tab]");
    tabBtns.forEach((btn) => {
      btn.onclick = () => {
        const targetTab = btn.dataset.quickTab;
        tabBtns.forEach((b) => b.classList.toggle("active", b === btn));
        $("#quick-add-tab-library")?.classList.toggle("hidden", targetTab !== "library");
        $("#quick-add-tab-new")?.classList.toggle("hidden", targetTab !== "new");
      };
    });

    // Form create new and place into slot
    const formNew = $("#form-quick-add-new");
    if (formNew) {
      formNew.addEventListener("submit", (e) => {
        e.preventDefault();
        const slotKey = $("#quick-add-slot-key").value;
        const subject = $("#input-quick-new-subject").value.trim();
        const teacher = $("#input-quick-new-teacher").value.trim();
        const room = $("#input-quick-new-room").value.trim();
        const color = document.querySelector('input[name="quick_new_color"]:checked')?.value || "blue";
        const saveToLib = $("#quick-new-save-lib")?.checked;

        if (!subject || !slotKey) return;

        const state = this.store.getState();
        this.history.recordState();

        // Place into schedule
        state.schedule = state.schedule.filter((s) => s.slotId !== slotKey);
        state.schedule.push({
          id: `item_${Date.now()}`,
          subject,
          teacher,
          room,
          color,
          slotId: slotKey,
          status: "planned",
          priority: "medium",
        });

        // Optionally save into library
        if (saveToLib) {
          state.lessons.unshift({
            id: generateId("l"),
            subject,
            teacher,
            room,
            color,
            category: "study",
          });
          events.emit("library:updated");
        }

        this.storage.debouncedSave();
        this.close("modal-quick-add");
        formNew.reset();
        events.emit("schedule:updated");
        events.emit("toast:show", { message: `Đã xếp "${subject}" vào lịch`, type: "success" });
      });
    }
  }

  // ==================== 2. CUSTOM TIME SLOTS MANAGER MODAL ====================
  openManageSlots() {
    this.renderSlotsList();
    this.open("modal-manage-slots");
  }

  renderSlotsList() {
    const listEl = $("#manage-slots-list");
    const countEl = $("#manage-slots-count");
    if (!listEl) return;

    const state = this.store.getState();
    if (countEl) countEl.textContent = `${state.timeSlots.length} ca`;

    if (state.timeSlots.length === 0) {
      listEl.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400">
          Chưa có mốc thời gian nào. Hãy thêm mốc giờ mới bên dưới!
        </div>
      `;
      return;
    }

    listEl.innerHTML = state.timeSlots
      .map((slot, index) => {
        const isOvernight = TimeEngine.isOvernight(slot.start, slot.end);
        const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
        return `
          <div
            data-slot-row-id="${slot.id}"
            class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition"
          >
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs flex items-center justify-center">${index + 1}</span>
              <div>
                <input
                  type="text"
                  value="${escapeHTML(slot.label)}"
                  data-slot-edit-label="${slot.id}"
                  class="font-bold text-xs bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-sky-500 focus:outline-none text-slate-900 dark:text-white px-1 py-0.5 rounded"
                  title="Bấm để sửa tên ca"
                />
                <div class="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                  <span class="font-mono">${slot.start} - ${slot.end}</span>
                  <span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-semibold">${formatDurationShort(dur)}</span>
                  ${isOvernight ? '<span class="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 font-bold text-[10px]">Qua đêm</span>' : ""}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <!-- Move Up / Down -->
              <button
                type="button"
                data-slot-action="move-up"
                data-id="${slot.id}"
                class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition"
                ${index === 0 ? "disabled" : ""}
                title="Lên trên"
              >
                ▲
              </button>
              <button
                type="button"
                data-slot-action="move-down"
                data-id="${slot.id}"
                class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition"
                ${index === state.timeSlots.length - 1 ? "disabled" : ""}
                title="Xuống dưới"
              >
                ▼
              </button>

              <!-- Edit Times Dialog Trigger -->
              <button
                type="button"
                data-slot-action="edit-times"
                data-id="${slot.id}"
                class="btn btn-secondary py-1 px-2 text-[11px]"
                title="Sửa giờ bắt đầu và kết thúc"
              >
                Sửa giờ
              </button>

              <!-- Delete Slot -->
              <button
                type="button"
                data-slot-action="delete"
                data-id="${slot.id}"
                class="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 hover:text-rose-700 transition"
                title="Xóa ca này"
              >
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    if (typeof lucide !== "undefined") lucide.createIcons();

    // Inline label edits on blur
    listEl.querySelectorAll("[data-slot-edit-label]").forEach((input) => {
      input.onchange = () => {
        const id = input.dataset.slotEditLabel;
        const newLabel = input.value.trim();
        if (!newLabel) return;
        const slot = state.timeSlots.find((s) => s.id === id);
        if (slot && slot.label !== newLabel) {
          this.history.recordState();
          slot.label = newLabel;
          this.storage.debouncedSave();
          events.emit("schedule:updated");
        }
      };
    });

    // Slot action buttons
    listEl.querySelectorAll("[data-slot-action]").forEach((btn) => {
      btn.onclick = () => {
        const action = btn.dataset.slotAction;
        const id = btn.dataset.id;
        if (action === "move-up") this.moveSlot(id, -1);
        else if (action === "move-down") this.moveSlot(id, 1);
        else if (action === "delete") this.deleteSlot(id);
        else if (action === "edit-times") this.promptEditSlotTimes(id);
      };
    });
  }

  moveSlot(slotId, direction) {
    const state = this.store.getState();
    const idx = state.timeSlots.findIndex((s) => s.id === slotId);
    if (idx < 0) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= state.timeSlots.length) return;

    this.history.recordState();
    const temp = state.timeSlots[idx];
    state.timeSlots[idx] = state.timeSlots[targetIdx];
    state.timeSlots[targetIdx] = temp;

    this.storage.debouncedSave();
    this.renderSlotsList();
    events.emit("schedule:updated");
  }

  deleteSlot(slotId) {
    const state = this.store.getState();
    const slot = state.timeSlots.find((s) => s.id === slotId);
    if (!slot) return;

    const countOnSchedule = state.schedule.filter((s) => s.slotId && s.slotId.endsWith(`-${slotId}`)).length;
    let msg = `Xóa ca "${slot.label}" (${slot.start} - ${slot.end})?`;
    if (countOnSchedule > 0) {
      msg += ` Có ${countOnSchedule} buổi học đang xếp trong ca này sẽ bị xóa theo!`;
    }

    if (!confirm(msg)) return;

    this.history.recordState();
    state.timeSlots = state.timeSlots.filter((s) => s.id !== slotId);
    state.schedule = state.schedule.filter((s) => !s.slotId.endsWith(`-${slotId}`));

    this.storage.debouncedSave();
    this.renderSlotsList();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: `Đã xóa ca "${slot.label}"`, type: "info" });
  }

  promptEditSlotTimes(slotId) {
    const state = this.store.getState();
    const slot = state.timeSlots.find((s) => s.id === slotId);
    if (!slot) return;

    const newStart = prompt(`Nhập giờ bắt đầu (HH:MM):`, slot.start);
    if (!newStart) return;
    const newEnd = prompt(`Nhập giờ kết thúc (HH:MM):`, slot.end);
    if (!newEnd) return;

    // Validate format
    const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(newStart.trim()) || !timeRegex.test(newEnd.trim())) {
      alert("Định dạng giờ không hợp lệ! Vui lòng nhập đúng HH:MM (ví dụ 07:30 hoặc 23:00).");
      return;
    }

    this.history.recordState();
    slot.start = newStart.trim();
    slot.end = newEnd.trim();

    this.storage.debouncedSave();
    this.renderSlotsList();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: `Đã cập nhật giờ cho ca "${slot.label}"`, type: "success" });
  }

  bindManageSlotsForm() {
    const formAdd = $("#form-add-slot");
    if (formAdd) {
      formAdd.addEventListener("submit", (e) => {
        e.preventDefault();
        const label = $("#input-new-slot-label").value.trim();
        const start = $("#input-new-slot-start").value.trim();
        const end = $("#input-new-slot-end").value.trim();

        if (!label || !start || !end) return;

        const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
        if (!timeRegex.test(start) || !timeRegex.test(end)) {
          alert("Giờ bắt đầu và kết thúc phải đúng định dạng HH:MM");
          return;
        }

        const state = this.store.getState();
        this.history.recordState();

        const newSlot = {
          id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          label,
          start,
          end,
        };

        state.timeSlots.push(newSlot);
        this.storage.debouncedSave();
        formAdd.reset();
        this.renderSlotsList();
        events.emit("schedule:updated");
        events.emit("toast:show", { message: `Đã thêm ca học "${label}"`, type: "success" });
      });
    }

    // Sort chronologically button
    const btnSort = $("#btn-sort-slots-time");
    if (btnSort) {
      btnSort.onclick = () => {
        const state = this.store.getState();
        this.history.recordState();
        state.timeSlots.sort((a, b) => {
          const aMin = TimeEngine.parseMinutes(a.start);
          const bMin = TimeEngine.parseMinutes(b.start);
          return aMin - bMin;
        });
        this.storage.debouncedSave();
        this.renderSlotsList();
        events.emit("schedule:updated");
        events.emit("toast:show", { message: "Đã sắp xếp các ca theo thứ tự thời gian", type: "success" });
      };
    }
  }

  // ==================== 3. PLACE ACTIVITY FROM LIBRARY MODAL ====================
  openPlaceActivity(lessonId) {
    const state = this.store.getState();
    const lesson = state.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    $("#place-activity-lesson-id").value = lessonId;
    $("#place-activity-subject-title").textContent = lesson.subject;
    $("#place-activity-meta").textContent = `${lesson.teacher || "-"} • ${lesson.room || "-"}`;

    // Populate Slots Dropdown
    const slotSelect = $("#place-activity-slot-select");
    if (slotSelect) {
      slotSelect.innerHTML = state.timeSlots
        .map((slot) => `<option value="${slot.id}">${escapeHTML(slot.label)} (${slot.start} - ${slot.end})</option>`)
        .join("");
    }

    this.open("modal-place-activity");
  }

  bindPlaceActivityForm() {
    const form = $("#form-place-activity");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const lessonId = $("#place-activity-lesson-id").value;
      const day = $("#place-activity-day-select").value;
      const slotId = $("#place-activity-slot-select").value;
      const applyAllDays = $("#place-activity-all-days")?.checked;

      const state = this.store.getState();
      const lesson = state.lessons.find((l) => l.id === lessonId);
      if (!lesson || !slotId) return;

      this.history.recordState();

      const daysToApply = applyAllDays ? DAY_ORDER : [parseInt(day, 10)];
      daysToApply.forEach((targetDay) => {
        const targetSlotKey = `${targetDay}-${slotId}`;
        // Remove existing item in target slot
        state.schedule = state.schedule.filter((s) => s.slotId !== targetSlotKey);
        state.schedule.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          subject: lesson.subject,
          teacher: lesson.teacher || "",
          room: lesson.room || "",
          color: lesson.color || "blue",
          slotId: targetSlotKey,
          status: "planned",
          priority: "medium",
        });
      });

      this.storage.debouncedSave();
      this.close("modal-place-activity");
      events.emit("schedule:updated");
      events.emit("toast:show", {
        message: applyAllDays
          ? `Đã xếp "${lesson.subject}" vào cả tuần (T2 - CN)`
          : `Đã xếp "${lesson.subject}" vào ${DAY_NAMES[day]}`,
        type: "success",
      });
    });
  }
}
