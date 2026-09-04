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
    const btnReopen = $("#btn-floating-reopen-library");
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
    if (btnReopen) btnReopen.addEventListener("click", toggleCollapse);
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

    // Delegated actions on Library list items (Place into schedule, Delete)
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
      const counts = {};
      state.schedule.forEach((s) => {
        if (s.subject) counts[s.subject] = (counts[s.subject] || 0) + 1;
      });
      items.sort((a, b) => (counts[b.subject] || 0) - (counts[a.subject] || 0));
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
        return `
          <div
            draggable="true"
            data-lesson-id="${lesson.id}"
            class="library-item-card p-2.5 rounded-2xl border ${col.bg} ${col.border} ${col.text} cursor-grab shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-2"
          >
            <div class="truncate flex-1">
              <div class="font-bold text-xs truncate">${escapeHTML(lesson.subject)}</div>
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
                + Đặt lịch
              </button>
              <!-- Delete Lesson -->
              <button
                type="button"
                data-action="delete-lesson"
                data-id="${lesson.id}"
                class="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-rose-500 transition"
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
