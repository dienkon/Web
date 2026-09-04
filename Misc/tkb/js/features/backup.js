/**
 * Backup, SheetJS Excel Export, JSON Import/Export Feature
 */

import { DAY_NAMES, DAY_ORDER } from "../utils/format.js";

export class BackupFeature {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
  }

  exportExcel() {
    if (typeof XLSX === "undefined") {
      alert("Thư viện SheetJS chưa sẵn sàng.");
      return;
    }

    const state = this.store.getState();

    // Sheet 1: Weekly Timetable Grid
    const headers = ["Ca học", "Khung giờ", ...DAY_ORDER.map((d) => DAY_NAMES[d])];
    const rows = [];

    state.timeSlots.forEach((slot) => {
      const row = [slot.label, `${slot.start} - ${slot.end}`];
      DAY_ORDER.forEach((day) => {
        const item = state.schedule.find((s) => s.slotId === `${day}-${slot.id}`);
        if (item) {
          const teacherStr = item.teacher ? ` (${item.teacher})` : "";
          const statusStr = item.status === "completed" ? " [✓ Xong]" : "";
          row.push(`${item.subject}${teacherStr}${statusStr}`);
        } else {
          row.push("");
        }
      });
      rows.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "Lịch Tuần");

    // Sheet 2: Detailed List
    const detailHeaders = ["Thứ", "Ca học", "Môn học", "Phụ trách", "Phòng", "Khung giờ", "Trạng thái", "Ghi chú"];
    const detailRows = [];
    state.schedule.forEach((item) => {
      if (item.slotId) {
        const [d, slotId] = item.slotId.split("-");
        const slot = state.timeSlots.find((s) => s.id === slotId);
        detailRows.push([
          DAY_NAMES[d] || "",
          slot?.label || "",
          item.subject || "",
          item.teacher || "",
          item.room || "",
          slot ? `${slot.start} - ${slot.end}` : "",
          item.status || "planned",
          item.notes || "",
        ]);
      }
    });
    const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Danh Sách Ca");

    XLSX.writeFile(wb, `ThoiKhoaBieu_${Date.now()}.xlsx`);
  }

  exportJSON() {
    const state = this.store.getState();
    const payload = {
      version: 5,
      exportedAt: new Date().toISOString(),
      lessons: state.lessons,
      schedule: state.schedule,
      timeSlots: state.timeSlots,
      settings: state.settings,
      goals: state.goals,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Schedule_Backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJSON(jsonString, replaceAll = false) {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data.schedule)) {
        throw new Error("File JSON không chứa trường schedule hợp lệ.");
      }

      this.storage.createSnapshot("Trước khi nhập file JSON");
      this.history.recordState();

      if (replaceAll) {
        this.store.hydrate(data);
      } else {
        // Merge: keep existing lessons, add new ones
        const state = this.store.getState();
        const existingSlotIds = new Set(state.schedule.map((s) => s.slotId));
        data.schedule.forEach((item) => {
          if (!existingSlotIds.has(item.slotId)) {
            state.schedule.push(item);
          }
        });
        if (Array.isArray(data.lessons)) {
          const existingLessonIds = new Set(state.lessons.map((l) => l.id));
          data.lessons.forEach((l) => {
            if (!existingLessonIds.has(l.id)) state.lessons.push(l);
          });
        }
      }

      this.storage.debouncedSave();
      return { success: true, count: data.schedule.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}
