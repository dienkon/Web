/**
 * Global Clock & Pure Time Calculations Engine
 */

export class TimeEngine {
  static parseToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(":")) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  static getDurationMinutes(startStr, endStr) {
    const s = this.parseToMinutes(startStr);
    let e = this.parseToMinutes(endStr);
    if (e < s) e += 1440; // Overnight
    return Math.max(0, e - s);
  }

  static getSlotDurationMinutes(slot) {
    if (!slot) return 0;
    return this.getDurationMinutes(slot.start, slot.end);
  }

  static isOvernight(startStr, endStr) {
    return this.parseToMinutes(endStr) < this.parseToMinutes(startStr);
  }

  /**
   * Determine exact current activity and real-time elapsed / remaining / progress %
   */
  static getCurrentActivity(now = new Date(), schedule = [], timeSlots = []) {
    const curDay = now.getDay();
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    const curSeconds = now.getSeconds();
    const curTotalMinutesExact = curMinutes + curSeconds / 60;

    for (const slot of timeSlots) {
      const sMin = this.parseToMinutes(slot.start);
      let eMin = this.parseToMinutes(slot.end);
      const isOvernight = eMin < sMin;
      if (isOvernight) eMin += 1440;

      // Handle overnight comparison: if current time is past midnight (e.g. 00:30) and slot is overnight from yesterday
      let isActive = false;
      if (!isOvernight) {
        isActive = curMinutes >= sMin && curMinutes < eMin;
      } else {
        isActive = curMinutes >= sMin || curMinutes < this.parseToMinutes(slot.end);
      }

      if (isActive) {
        const slotKey = `${curDay}-${slot.id}`;
        const item = schedule.find((s) => s.slotId === slotKey);

        const durationMinutes = eMin - sMin;
        let elapsedMinutes = 0;
        if (!isOvernight) {
          elapsedMinutes = Math.max(0, curTotalMinutesExact - sMin);
        } else {
          elapsedMinutes = curMinutes >= sMin ? curTotalMinutesExact - sMin : curTotalMinutesExact + 1440 - sMin;
        }

        const remainingMinutes = Math.max(0, durationMinutes - elapsedMinutes);
        const progress = Math.min(100, Math.max(0, (elapsedMinutes / durationMinutes) * 100));

        if (item) {
          return {
            isFree: false,
            activity: item,
            slot,
            sMin,
            eMin,
            durationMinutes,
            elapsedMinutes,
            remainingMinutes,
            progress,
            status: "active",
          };
        } else {
          return {
            isFree: true,
            activity: {
              subject: "Thời gian tự do / Nghỉ",
              teacher: "Tự do",
              room: "Tự do",
              color: "slate",
            },
            slot,
            sMin,
            eMin,
            durationMinutes,
            elapsedMinutes,
            remainingMinutes,
            progress,
            status: "free",
          };
        }
      }
    }

    return null;
  }

  /**
   * Determine next upcoming activity today
   */
  static getNextActivity(now = new Date(), schedule = [], timeSlots = []) {
    const curDay = now.getDay();
    const curMinutes = now.getHours() * 60 + now.getMinutes();

    let nextItem = null;
    let minDiff = Infinity;

    for (const slot of timeSlots) {
      const sMin = this.parseToMinutes(slot.start);
      if (sMin > curMinutes) {
        const diff = sMin - curMinutes;
        if (diff < minDiff) {
          const slotKey = `${curDay}-${slot.id}`;
          const item = schedule.find((s) => s.slotId === slotKey);
          if (item) {
            minDiff = diff;
            nextItem = { item, slot, startsInMinutes: diff };
          }
        }
      }
    }

    return nextItem;
  }
}
