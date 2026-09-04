/**
 * Day & Week Schedule Templates Feature
 */

import { generateId } from "../utils/helpers.js";
import { DAY_ORDER, DAY_NAMES } from "../utils/format.js";

export class TemplatesFeature {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
  }

  saveDayAsTemplate(dayIndex, templateName) {
    const state = this.store.getState();
    const dayItems = state.schedule.filter((s) => s.slotId && s.slotId.startsWith(`${dayIndex}-`));

    const template = {
      id: generateId("tpl_day"),
      type: "day",
      name: templateName || `Mẫu ngày ${DAY_NAMES[dayIndex]}`,
      items: dayItems.map((item) => {
        const [, slotId] = item.slotId.split("-");
        return { ...item, slotIdOnly: slotId };
      }),
    };

    if (!Array.isArray(state.templates)) state.templates = [];
    state.templates.push(template);
    this.storage.debouncedSave();
    return template;
  }

  applyDayTemplate(templateId, targetDayIndex) {
    const state = this.store.getState();
    const template = (state.templates || []).find((t) => t.id === templateId);
    if (!template) return false;

    this.history.recordState();
    // Remove current items of target day
    state.schedule = state.schedule.filter((s) => !s.slotId.startsWith(`${targetDayIndex}-`));

    // Inject template items
    template.items.forEach((it) => {
      state.schedule.push({
        ...it,
        id: generateId("item"),
        slotId: `${targetDayIndex}-${it.slotIdOnly}`,
        status: "planned",
      });
    });

    this.storage.debouncedSave();
    return true;
  }
}
