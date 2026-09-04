/**
 * Pure Analytics & Smart Insights Feature
 */

import { escapeHTML, $ } from "../utils/dom.js";
import { DAY_NAMES, DAY_ORDER, formatDurationShort } from "../utils/format.js";
import { TimeEngine } from "../core/time-engine.js";

export class AnalyticsFeature {
  constructor(store) {
    this.store = store;
  }

  getMetrics() {
    const state = this.store.getState();
    const totalSessions = state.schedule.length;
    const completedCount = state.schedule.filter((s) => s.status === "completed").length;
    const completionRate = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

    let totalMinutes = 0;
    let focusMinutes = 0;
    let restMinutes = 0;
    let exerciseMinutes = 0;

    state.schedule.forEach((item) => {
      if (item.slotId) {
        const [, slotId] = item.slotId.split("-");
        const slot = state.timeSlots.find((s) => s.id === slotId);
        if (slot) {
          const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
          totalMinutes += dur;
          const sub = (item.subject || "").toLowerCase();
          if (sub.includes("thể dục") || sub.includes("thể thao") || sub.includes("vận động")) {
            exerciseMinutes += dur;
          } else if (sub.includes("nghỉ") || sub.includes("ngủ") || sub.includes("chill") || sub.includes("ăn")) {
            restMinutes += dur;
          } else {
            focusMinutes += dur;
          }
        }
      }
    });

    const totalCalculated = Math.max(1, focusMinutes + restMinutes + exerciseMinutes);
    const focusPct = Math.round((focusMinutes / totalCalculated) * 100);
    const restPct = Math.round((restMinutes / totalCalculated) * 100);
    const exercisePct = Math.round((exerciseMinutes / totalCalculated) * 100);

    let balanceStatus = "Cân bằng tốt";
    let balanceColor = "text-emerald-500";
    if (focusPct > 80) {
      balanceStatus = "Cường độ cao (Heavy)";
      balanceColor = "text-rose-500";
    } else if (restPct >= 18 && focusPct >= 50) {
      balanceStatus = "Cân bằng hoàn hảo (Excellent)";
      balanceColor = "text-emerald-500";
    }

    return {
      totalSessions,
      completedCount,
      completionRate,
      totalMinutes,
      focusMinutes,
      restMinutes,
      exerciseMinutes,
      focusPct,
      restPct,
      exercisePct,
      balanceStatus,
      balanceColor,
    };
  }

  getHeatmapGrid() {
    const state = this.store.getState();
    const timeBands = [
      { label: "06:30 - 09:00", start: 390, end: 540 },
      { label: "09:00 - 11:30", start: 540, end: 690 },
      { label: "11:30 - 14:00", start: 690, end: 840 },
      { label: "14:00 - 16:30", start: 840, end: 990 },
      { label: "16:30 - 19:00", start: 990, end: 1140 },
      { label: "19:00 - 21:30", start: 1140, end: 1290 },
      { label: "21:30 - 23:30", start: 1290, end: 1410 },
    ];

    return timeBands.map((band) => {
      const row = { band: band.label, days: {} };
      DAY_ORDER.forEach((day) => {
        let activeMinutes = 0;
        state.schedule.forEach((item) => {
          if (item.slotId && item.slotId.startsWith(`${day}-`)) {
            const [, slotId] = item.slotId.split("-");
            const slot = state.timeSlots.find((s) => s.id === slotId);
            if (slot) {
              const sMin = TimeEngine.parseToMinutes(slot.start);
              let eMin = TimeEngine.parseToMinutes(slot.end);
              if (eMin < sMin) eMin += 1440;
              const overlap = Math.max(0, Math.min(eMin, band.end) - Math.max(sMin, band.start));
              activeMinutes += overlap;
            }
          }
        });
        row.days[day] = activeMinutes;
      });
      return row;
    });
  }

  generateInsights() {
    const state = this.store.getState();
    const insights = [];

    // Check long continuous streaks
    let maxConsecutive = 0;
    DAY_ORDER.forEach((d) => {
      const dayItems = state.schedule.filter((s) => s.slotId && s.slotId.startsWith(`${d}-`));
      maxConsecutive = Math.max(maxConsecutive, dayItems.length);
    });

    if (maxConsecutive >= 4) {
      insights.push({
        type: "warning",
        title: "Phiên học dài liên tục",
        desc: `Có ngày bạn có đến ${maxConsecutive} ca học liên tiếp. Nên chèn các khoảng nghỉ ngắn 15-20 phút để não bộ tái tạo năng lượng.`,
      });
    }

    // Check dominant subject
    const counts = {};
    state.schedule.forEach((s) => {
      if (s.subject) counts[s.subject] = (counts[s.subject] || 0) + 1;
    });
    if (Object.keys(counts).length > 0) {
      const topSubject = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
      const pct = Math.round((counts[topSubject] / Math.max(1, state.schedule.length)) * 100);
      if (pct > 25) {
        insights.push({
          type: "success",
          title: `Trọng tâm môn ${topSubject}`,
          desc: `Môn ${topSubject} chiếm ${pct}% tổng số ca học của bạn trong tuần. Phân bổ này thể hiện mục tiêu rõ ràng.`,
        });
      }
    }

    if (insights.length === 0) {
      insights.push({
        type: "info",
        title: "Lịch trình cân đối",
        desc: "Các ca học và nghỉ ngơi đang được phân bổ tương đối đồng đều trong các ngày trong tuần.",
      });
    }

    return insights;
  }
}
