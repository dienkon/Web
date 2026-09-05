/**
 * Activity Library (Kho môn / Hoạt động) Feature
 */

import { escapeHTML, $, $$ } from "../utils/dom.js";
import { COLOR_MAP } from "../state/store.js";
import { events } from "../core/events.js";
import { generateId } from "../utils/helpers.js";

export class ActivitiesFeature {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
    this.searchQuery = "";
    this.activeCategory = "all";
    this.sortBy = "default";
  }

  init() {
    this.render();
    this.bindEvents();
    events.on("library:updated", () => this.render());
  }

  bindEvents() {
    // Search input
    const searchInput = $("#library-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.render();
      });
    }

    // Category filter chips
    const catContainer = $("#library-category-filters");
    if (catContainer) {
      catContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-category]");
        if (btn) {
          this.activeCategory = btn.dataset.category;
          catContainer.querySelectorAll("[data-category]").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.render();
        }
      });
    }

    // Sort selector
    const sortSelect = $("#library-sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this.sortBy = e.target.value;
        this.render();
      });
    }

    // Toggle Desktop Sidebar Collapse (Full 0-width collapse)
    const btnCollapse = $("#btn-toggle-library-collapse");
    const btnOpenFromHeader = $("#btn-header-open-library");

    const toggleCollapse = () => {
      const sidebar = $("#activity-library-sidebar");
      if (!sidebar) return;
      const isCollapsed = sidebar.classList.toggle("collapsed");
      document.body.classList.toggle("library-collapsed", isCollapsed);
      this.store.setState({
        settings: { ...this.store.getState().settings, libraryCollapsed: isCollapsed },
      });
      this.storage.debouncedSave();
    };

    if (btnCollapse) btnCollapse.addEventListener("click", toggleCollapse);
    if (btnOpenFromHeader) btnOpenFromHeader.addEventListener("click", toggleCollapse);

    // Form Add New Lesson to Library
    const addForm = $("#form-add-activity");
    if (addForm) {
      addForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const subject = $("#input-activity-subject").value.trim();
        const teacher = $("#input-activity-teacher").value.trim();
        const room = $("#input-activity-room").value.trim();
        const category = $("#select-activity-category").value;
        const color = document.querySelector('input[name="activity_color"]:checked')?.value || "blue";

        if (!subject) return;

        this.addLesson({ subject, teacher, room, category, color });
        addForm.reset();
        events.emit("toast:show", { message: `Đã thêm "${subject}" vào kho môn`, type: "success" });
        events.emit("drawer:close", "drawer-add-activity");
      });
    }

    // Populate Edit Lesson Color Selector
    const editColorSelect = $("#edit-activity-color");
    if (editColorSelect && editColorSelect.children.length === 0) {
      editColorSelect.innerHTML = Object.entries(COLOR_MAP)
        .map(([k, v]) => `<option value="${k}">${v.name}</option>`)
        .join("");
    }

    // Form Edit Existing Lesson in Library
    const editForm = $("#form-edit-activity");
    if (editForm) {
      editForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = $("#edit-activity-id").value;
        const subject = $("#edit-activity-subject").value.trim();
        const teacher = $("#edit-activity-teacher").value.trim();
        const room = $("#edit-activity-room").value.trim();
        const category = $("#edit-activity-category").value;
        const color = $("#edit-activity-color").value || "blue";
        const syncSchedule = $("#edit-activity-sync-schedule")?.checked ?? true;

        if (!id || !subject) return;

        this.updateLesson(id, { subject, teacher, room, category, color }, syncSchedule);
        events.emit("modal:close", "modal-edit-activity");
      });
    }

    // Delegated actions on Library list items (Place into schedule, Delete, View Detail, Edit)
    const listEl = $("#activity-library-list");
    if (listEl) {
      listEl.addEventListener("click", (e) => {
        const placeBtn = e.target.closest('[data-action="place-activity"], [data-action="place-mobile"]');
        if (placeBtn) {
          e.stopPropagation();
          const id = placeBtn.dataset.id;
          events.emit("modal:open-place-activity", id);
          return;
        }

        const editBtn = e.target.closest('[data-action="edit-lesson"]');
        if (editBtn) {
          e.stopPropagation();
          const id = editBtn.dataset.id;
          this.openEditModal(id);
          return;
        }

        const detailBtn = e.target.closest('[data-action="view-subject-detail"]');
        if (detailBtn) {
          e.stopPropagation();
          const id = detailBtn.dataset.id;
          const lesson = this.store.getState().lessons.find((l) => l.id === id);
          if (lesson) {
            events.emit("drawer:open-subject-detail", lesson);
          }
          return;
        }

        const delBtn = e.target.closest('[data-action="delete-lesson"]');
        if (delBtn) {
          e.stopPropagation();
          const id = delBtn.dataset.id;
          this.deleteLesson(id);
          return;
        }
      });
    }
  }

  openEditModal(id) {
    const state = this.store.getState();
    const lesson = state.lessons.find((l) => l.id === id);
    if (!lesson) return;

    $("#edit-activity-id").value = lesson.id;
    $("#edit-activity-subject").value = lesson.subject || "";
    $("#edit-activity-teacher").value = lesson.teacher || "";
    $("#edit-activity-room").value = lesson.room || "";
    $("#edit-activity-category").value = lesson.category || "study";

    const editColorSelect = $("#edit-activity-color");
    if (editColorSelect) {
      if (editColorSelect.children.length === 0) {
        editColorSelect.innerHTML = Object.entries(COLOR_MAP)
          .map(([k, v]) => `<option value="${k}">${v.name}</option>`)
          .join("");
      }
      editColorSelect.value = lesson.color || "blue";
    }

    events.emit("modal:open", "modal-edit-activity");
  }

  updateLesson(id, { subject, teacher, room, category, color }, syncSchedule = true) {
    const state = this.store.getState();
    const lesson = state.lessons.find((l) => l.id === id);
    if (!lesson) return;

    this.history.recordState();
    const oldSubject = lesson.subject;

    lesson.subject = subject;
    lesson.teacher = teacher;
    lesson.room = room;
    lesson.category = category;
    lesson.color = color;

    // Synchronize to existing schedule entries if selected
    let syncedCount = 0;
    if (syncSchedule && oldSubject) {
      const oldSubjectLower = oldSubject.toLowerCase().trim();
      state.schedule.forEach((item) => {
        if (item.subject && item.subject.toLowerCase().trim() === oldSubjectLower) {
          item.subject = subject;
          item.teacher = teacher;
          item.room = room;
          item.color = color;
          syncedCount++;
        }
      });
    }

    this.storage.debouncedSave();
    this.render();
    events.emit("library:updated");
    if (syncedCount > 0) {
      events.emit("schedule:updated");
      events.emit("toast:show", {
        message: `Đã cập nhật môn "${subject}" (và đồng bộ ${syncedCount} ca trên lịch)`,
        type: "success",
      });
    } else {
      events.emit("toast:show", { message: `Đã cập nhật "${subject}" trong kho`, type: "success" });
    }
  }

  addLesson({ subject, teacher, room, category = "study", color = "blue" }) {
    this.history.recordState();
    const newLesson = {
      id: generateId("l"),
      subject,
      teacher,
      room,
      category,
      color,
    };
    const state = this.store.getState();
    state.lessons.unshift(newLesson);
    this.storage.debouncedSave();
    this.render();
  }

  deleteLesson(id) {
    const state = this.store.getState();
    const lesson = state.lessons.find((l) => l.id === id);
    if (!lesson) return;

    if (!confirm(`Xóa hoạt động "${lesson.subject}" khỏi kho? Các ca đã xếp trên lịch vẫn được giữ nguyên.`)) return;

    this.history.recordState();
    state.lessons = state.lessons.filter((l) => l.id !== id);
    this.storage.debouncedSave();
    this.render();
    events.emit("toast:show", { message: `Đã xóa "${lesson.subject}" khỏi kho`, type: "info" });
  }

  render() {
    const listEl = $("#activity-library-list");
    if (!listEl) return;

    const state = this.store.getState();
    let items = [...state.lessons];

    // Compute placement counts
    const placementCounts = {};
    state.schedule.forEach((s) => {
      if (s.subject) {
        const key = s.subject.toLowerCase().trim();
        placementCounts[key] = (placementCounts[key] || 0) + 1;
      }
    });

    // 1. Search Query Filter
    if (this.searchQuery) {
      items = items.filter(
        (l) =>
          l.subject.toLowerCase().includes(this.searchQuery) ||
          (l.teacher && l.teacher.toLowerCase().includes(this.searchQuery)) ||
          (l.room && l.room.toLowerCase().includes(this.searchQuery))
      );
    }

    // 2. Category Filter
    if (this.activeCategory !== "all") {
      items = items.filter((l) => (l.category || "study") === this.activeCategory);
    }

    // 3. Sorting
    if (this.sortBy === "name") {
      items.sort((a, b) => a.subject.localeCompare(b.subject));
    } else if (this.sortBy === "frequency") {
      items.sort((a, b) => {
        const cA = placementCounts[a.subject.toLowerCase().trim()] || 0;
        const cB = placementCounts[b.subject.toLowerCase().trim()] || 0;
        return cB - cA;
      });
    }

    if (items.length === 0) {
      listEl.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400 italic">
          Không tìm thấy hoạt động nào trong kho.
        </div>
      `;
      return;
    }

    listEl.innerHTML = items
      .map((lesson) => {
        const col = COLOR_MAP[lesson.color] || COLOR_MAP.blue;
        const count = placementCounts[lesson.subject.toLowerCase().trim()] || 0;
        return `
          <div
            draggable="true"
            data-lesson-id="${lesson.id}"
            class="library-item-card p-2.5 rounded-2xl border ${col.bg} ${col.border} ${col.text} cursor-grab shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-2 group"
          >
            <div class="truncate flex-1 cursor-pointer" data-action="view-subject-detail" data-id="${lesson.id}" title="Bấm để xem thống kê & phân tích chi tiết môn này">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-xs truncate">${escapeHTML(lesson.subject)}</span>
                ${
                  count > 0
                    ? `<span class="text-[9px] px-1.5 py-0.2 rounded-md font-bold bg-white/80 dark:bg-slate-900/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">${count} ca</span>`
                    : `<span class="text-[9px] px-1.5 py-0.2 rounded-md font-medium bg-slate-100/80 dark:bg-slate-800/60 text-slate-400">Chưa xếp</span>`
                }
              </div>
              <div class="text-[10px] opacity-75 truncate mt-0.5 font-medium">
                ${escapeHTML(lesson.teacher || "-")} • ${escapeHTML(lesson.room || "-")}
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <!-- 1-Click Place into Schedule action for mobile and desktop -->
              <button
                type="button"
                data-action="place-activity"
                data-id="${lesson.id}"
                class="px-2 py-1 rounded-lg bg-white/90 dark:bg-slate-800/90 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 shadow-2xs font-semibold text-[10px] hover:bg-white dark:hover:bg-slate-700 transition"
                title="Đặt môn này vào một ca trên lịch"
              >
                + Đặt
              </button>
              <!-- Edit Lesson -->
              <button
                type="button"
                data-action="edit-lesson"
                data-id="${lesson.id}"
                class="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 hover:text-sky-500 transition"
                title="Chỉnh sửa thông tin môn học"
              >
                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
              </button>
              <!-- Info / Stats Drawer Trigger -->
              <button
                type="button"
                data-action="view-subject-detail"
                data-id="${lesson.id}"
                class="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 transition"
                title="Xem phân tích môn này"
              >
                <i data-lucide="bar-chart-2" class="w-3.5 h-3.5"></i>
              </button>
              <!-- Delete Lesson -->
              <button
                type="button"
                data-action="delete-lesson"
                data-id="${lesson.id}"
                class="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-rose-500 transition opacity-60 hover:opacity-100"
                title="Xóa khỏi kho"
              >
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    // Setup desktop drag
    listEl.querySelectorAll(".library-item-card").forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        const id = card.dataset.lessonId;
        e.dataTransfer.setData("text/plain", JSON.stringify({ type: "pool", id }));
        e.dataTransfer.effectAllowed = "copy";
      });
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
  }
}
