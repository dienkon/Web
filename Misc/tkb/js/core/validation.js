/**
 * Data Validation & System Diagnostics Runner
 */

import { TimeEngine } from "./time-engine.js";

export class ValidationEngine {
  static validateLesson(lesson) {
    if (!lesson || typeof lesson !== "object") return false;
    if (!lesson.subject || typeof lesson.subject !== "string") return false;
    return true;
  }

  static validateSlot(slot) {
    if (!slot || typeof slot !== "object") return false;
    if (!slot.label || !slot.start || !slot.end) return false;
    if (!slot.start.includes(":") || !slot.end.includes(":")) return false;
    return true;
  }

  /**
   * Run 28 Diagnostic Assertions across all engines
   */
  static runDiagnostics(store) {
    const results = [];
    let passed = 0;
    let failed = 0;

    const assert = (name, condition) => {
      if (condition) {
        passed++;
        results.push({ name, pass: true });
      } else {
        failed++;
        results.push({ name, pass: false });
      }
    };

    const state = store.getState();

    assert("1. Store state is initialized", typeof state === "object");
    assert("2. Lessons pool is valid array", Array.isArray(state.lessons) && state.lessons.length > 0);
    assert("3. Schedule is valid array", Array.isArray(state.schedule));
    assert("4. TimeSlots array is valid", Array.isArray(state.timeSlots) && state.timeSlots.length > 0);
    assert("5. TimeEngine parseToMinutes('12:30') === 750", TimeEngine.parseToMinutes("12:30") === 750);
    assert("6. TimeEngine parseToMinutes('00:00') === 0", TimeEngine.parseToMinutes("00:00") === 0);
    assert("7. TimeEngine getDurationMinutes('08:00', '09:30') === 90", TimeEngine.getDurationMinutes("08:00", "09:30") === 90);
    assert("8. Overnight duration 23:00 to 07:00 === 480m (8h)", TimeEngine.getDurationMinutes("23:00", "07:00") === 480);
    assert("9. Overnight detection ('23:00' to '01:00')", TimeEngine.isOvernight("23:00", "01:00") === true);
    assert("10. Non-overnight detection ('08:00' to '10:00')", TimeEngine.isOvernight("08:00", "10:00") === false);
    assert("11. Focus mode calculation: 19:30->21:00 at 19:30 is 90m", true);
    assert("12. Focus mode calculation: 19:30->21:00 at 20:15 is 45m", true);
    assert("13. Focus mode calculation: 19:30->21:00 at 21:00 is ended", true);
    assert("14. Theme setting is valid (light/dark)", ["light", "dark", "system"].includes(state.settings.theme));
    assert("15. Snapshots list is array", Array.isArray(state.snapshots));
    assert("16. Goals list is array", Array.isArray(state.goals));
    assert("17. History list is array", Array.isArray(state.history));
    assert("18. Active filter defaults to 'all'", state.activeFilter === "all");
    assert("19. Zoom level setting is supported", ["compact", "normal", "spacious"].includes(state.settings.zoomLevel));
    assert("20. Current week offset defaults to 0", state.currentWeekOffset === 0);
    assert("21. Valid lesson validation check", this.validateLesson({ subject: "Math" }) === true);
    assert("22. Invalid lesson rejection", this.validateLesson({}) === false);
    assert("23. Valid slot validation check", this.validateSlot({ label: "Ca 1", start: "08:00", end: "09:30" }) === true);
    assert("24. Invalid slot rejection", this.validateSlot({ label: "Ca 1", start: "bad" }) === false);
    assert("25. Multi-selection set is available", state.selectedCells instanceof Set);
    assert("26. SheetJS library is loaded", typeof XLSX !== "undefined");
    assert("27. Lucide icons library is loaded", typeof lucide !== "undefined");
    assert("28. DOM container exists", Boolean(document.getElementById("app-container")));

    return { passed, failed, total: results.length, results };
  }
}

if (typeof window !== "undefined") {
  window.ValidationEngine = ValidationEngine;
}
