/**
 * LocalStorage & Data Migration Management
 */

import { debounce, generateId } from "../utils/helpers.js";

const STORAGE_KEYS = {
  DATA: "v5_timetable_data",
  SNAPSHOTS: "v5_timetable_snapshots",
  BACKUP_PRE_V5: "v5_pre_migration_backup",
};

export class StorageManager {
  constructor(store) {
    this.store = store;
    this.debouncedSave = debounce(() => this.save(), 350);
  }

  load() {
    try {
      // 1. Check if V5 data exists
      const v5Raw = localStorage.getItem(STORAGE_KEYS.DATA);
      if (v5Raw) {
        const data = JSON.parse(v5Raw);
        this.store.hydrate(data);
        return;
      }

      // 2. Perform safe migration from v2 / v3 / v4
      this.migrateLegacyData();
    } catch (err) {
      console.error("Storage load error:", err);
      // Fallback safely to defaults without crashing
    }
  }

  migrateLegacyData() {
    try {
      const lLessons = localStorage.getItem("v2_timetable_lessons");
      const lSchedule = localStorage.getItem("v2_timetable_schedule");
      const lSlots = localStorage.getItem("v2_timetable_slots");
      const lSettings = localStorage.getItem("v3_timetable_settings");
      const lSnapshots = localStorage.getItem("v4_timetable_snapshots");

      // Make safety backup of legacy keys before migrating
      if (lLessons || lSchedule) {
        const backup = {
          timestamp: new Date().toISOString(),
          lessons: lLessons ? JSON.parse(lLessons) : null,
          schedule: lSchedule ? JSON.parse(lSchedule) : null,
          slots: lSlots ? JSON.parse(lSlots) : null,
        };
        localStorage.setItem(STORAGE_KEYS.BACKUP_PRE_V5, JSON.stringify(backup));
      }

      const state = this.store.getState();
      const lessons = lLessons ? JSON.parse(lLessons) : state.lessons;
      let schedule = lSchedule ? JSON.parse(lSchedule) : state.schedule;
      const timeSlots = lSlots ? JSON.parse(lSlots) : state.timeSlots;
      const settings = lSettings ? { ...state.settings, ...JSON.parse(lSettings) } : state.settings;
      const snapshots = lSnapshots ? JSON.parse(lSnapshots) : state.snapshots;

      // Ensure every schedule item has required schema fields
      schedule = schedule.map((item) => ({
        ...item,
        status: item.status || "planned",
        priority: item.priority || "medium",
        isFocus: Boolean(item.isFocus),
        tags: Array.isArray(item.tags) ? item.tags : [],
        notes: item.notes || "",
      }));

      this.store.hydrate({
        lessons,
        schedule,
        timeSlots,
        settings,
        snapshots,
      });

      this.save();
    } catch (err) {
      console.error("Migration error:", err);
    }
  }

  save() {
    try {
      const state = this.store.getState();
      const payload = {
        version: 5,
        updatedAt: new Date().toISOString(),
        lessons: state.lessons,
        schedule: state.schedule,
        timeSlots: state.timeSlots,
        settings: state.settings,
        goals: state.goals,
        history: state.history.slice(0, 50),
      };
      localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(payload));
      localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(state.snapshots));

      // Also update legacy keys for reverse compatibility
      localStorage.setItem("v2_timetable_lessons", JSON.stringify(state.lessons));
      localStorage.setItem("v2_timetable_schedule", JSON.stringify(state.schedule));
      localStorage.setItem("v2_timetable_slots", JSON.stringify(state.timeSlots));
    } catch (err) {
      console.error("Save error:", err);
    }
  }

  createSnapshot(name = null) {
    const state = this.store.getState();
    const now = new Date();
    const snap = {
      id: generateId("snap"),
      name: name || `Bản lưu ${now.toLocaleTimeString()} - ${now.toLocaleDateString()}`,
      timestamp: now.toISOString(),
      scheduleCount: state.schedule.length,
      lessons: JSON.parse(JSON.stringify(state.lessons)),
      schedule: JSON.parse(JSON.stringify(state.schedule)),
      timeSlots: JSON.parse(JSON.stringify(state.timeSlots)),
    };
    state.snapshots.unshift(snap);
    if (state.snapshots.length > 20) state.snapshots.pop();
    this.save();
    return snap;
  }

  restoreSnapshot(id) {
    const state = this.store.getState();
    const snap = state.snapshots.find((s) => s.id === id);
    if (!snap) return false;

    this.store.hydrate({
      lessons: JSON.parse(JSON.stringify(snap.lessons)),
      schedule: JSON.parse(JSON.stringify(snap.schedule)),
      timeSlots: JSON.parse(JSON.stringify(snap.timeSlots)),
    });
    this.save();
    return true;
  }
}
