/**
 * Advanced Analytics Engine - Pure Functions with Memoization Cache
 * Calculates rich schedule intelligence: KPIs, Subjects, Daily Workload, Breaks, Heatmap, and Smart Insights.
 */

import { TimeEngine } from "../core/time-engine.js";
import { COLOR_MAP } from "../state/store.js";
import { DAY_NAMES, DAY_SHORT_NAMES, formatDurationShort, pad2 } from "../utils/format.js";

class AnalyticsEngineClass {
  constructor() {
    this._cache = new Map();
  }

  _computeStateKey(schedule = [], timeSlots = [], lessons = [], grouping = "subject-teacher-room") {
    return `${schedule.length}_${timeSlots.length}_${lessons.length}_${grouping}_${this._hashSchedule(schedule)}`;
  }

  _hashSchedule(schedule = []) {
    let hash = 0;
    for (let i = 0; i < schedule.length; i++) {
      const s = schedule[i];
      const str = `${s.slotId}:${s.subject}:${s.status}:${s.color}`;
      for (let j = 0; j < str.length; j++) {
        hash = ((hash << 5) - hash + str.charCodeAt(j)) | 0;
      }
    }
    return hash;
  }

  /**
   * Main computation that derives all analytics with memoization.
   */
  computeAll(schedule = [], timeSlots = [], lessons = [], grouping = "subject-teacher-room") {
    // Robust argument handling: if state object passed as 1st argument
    if (schedule && !Array.isArray(schedule) && typeof schedule === "object") {
      timeSlots = schedule.timeSlots || [];
      lessons = schedule.lessons || [];
      schedule = schedule.schedule || [];
    }
    if (!Array.isArray(schedule)) schedule = [];
    if (!Array.isArray(timeSlots)) timeSlots = [];
    if (!Array.isArray(lessons)) lessons = [];

    const key = this._computeStateKey(schedule, timeSlots, lessons, grouping);
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    const slotMap = new Map();
    timeSlots.forEach((s, idx) => slotMap.set(s.id, { ...s, index: idx }));

    const overview = this.calculateOverview(schedule, timeSlots, lessons, slotMap);
    const daily = this.calculateDailyStats(schedule, timeSlots, slotMap);
    const subjects = this.calculateSubjectStats(schedule, timeSlots, grouping, slotMap);
    const teachers = this.calculateTeacherStats(schedule, timeSlots, slotMap);
    const rooms = this.calculateRoomStats(schedule, timeSlots, slotMap);
    const breaks = this.calculateBreakStats(schedule, timeSlots, slotMap);
    const streaks = this.calculateContinuousLoad(schedule, timeSlots, slotMap);
    const heatmap = this.calculateWorkloadHeatmap(schedule, timeSlots, slotMap);
    const distribution = this.calculateSubjectDistribution(schedule, timeSlots, slotMap);
    const insights = this.calculateInsights(schedule, timeSlots, lessons, { overview, daily, breaks, streaks, subjects });

    const result = {
      overview,
      daily,
      dailyStats: daily,
      subjects,
      subjectStats: subjects,
      teachers,
      teacherStats: teachers,
      rooms,
      roomStats: rooms,
      breaks,
      breakStats: breaks,
      streaks,
      heatmap,
      distribution,
      insights,
      computedAt: new Date().toISOString(),
    };

    // Keep cache size bounded
    if (this._cache.size > 20) this._cache.clear();
    this._cache.set(key, result);

    return result;
  }

  calculateOverview(schedule = [], timeSlots = [], lessons = [], slotMap) {
    let totalMinutes = 0;
    let totalFocusMinutes = 0;
    let completedCount = 0;
    const subjectFreq = {};
    const teacherFreq = {};
    const roomFreq = {};
    const dayFreq = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayMinutes = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    schedule.forEach((item) => {
      const [d, slotId] = (item.slotId || "").split("-");
      const dayNum = parseInt(d, 10);
      const slot = slotMap.get(slotId);
      if (!slot) return;

      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      totalMinutes += dur;

      if (item.isFocus) totalFocusMinutes += dur;
      if (item.status === "completed") completedCount++;

      const sub = (item.subject || "Khác").trim();
      subjectFreq[sub] = (subjectFreq[sub] || 0) + 1;

      if (item.teacher && item.teacher.trim() !== "-") {
        const tch = item.teacher.trim();
        teacherFreq[tch] = (teacherFreq[tch] || 0) + 1;
      }

      if (item.room && item.room.trim() !== "-") {
        const rm = item.room.trim();
        roomFreq[rm] = (roomFreq[rm] || 0) + 1;
      }

      if (!isNaN(dayNum)) {
        dayFreq[dayNum] = (dayFreq[dayNum] || 0) + 1;
        dayMinutes[dayNum] = (dayMinutes[dayNum] || 0) + dur;
      }
    });

    const totalSessions = schedule.length;
    const completionRate = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

    const findTop = (obj) => {
      let topKey = "--";
      let max = 0;
      for (const k in obj) {
        if (obj[k] > max) {
          max = obj[k];
          topKey = k;
        }
      }
      return { name: topKey, count: max };
    };

    // Find busiest and lightest active day (excluding 0 sessions days if others exist)
    let busiestDay = 1;
    let lightestDay = 1;
    let maxMins = -1;
    let minMins = 99999;

    for (let d = 0; d <= 6; d++) {
      const mins = dayMinutes[d];
      if (mins > maxMins) {
        maxMins = mins;
        busiestDay = d;
      }
      if (mins < minMins && mins > 0) {
        minMins = mins;
        lightestDay = d;
      }
    }
    if (minMins === 99999) minMins = 0;

    const activeUniqueSubjects = Object.keys(subjectFreq).length;

    return {
      totalSessions,
      totalSlots: totalSessions,
      totalStudyMinutes: totalMinutes,
      totalStudyHours: +(totalMinutes / 60).toFixed(1),
      totalFocusMinutes,
      totalFocusHours: +(totalFocusMinutes / 60).toFixed(1),
      completedSessions: completedCount,
      completionRate,
      totalSubjectsInLibrary: lessons.length,
      activeUniqueSubjects,
      topSubject: findTop(subjectFreq),
      topTeacher: findTop(teacherFreq),
      topRoom: findTop(roomFreq),
      busiestDay: { day: busiestDay, name: DAY_NAMES[busiestDay], minutes: maxMins },
      lightestDay: { day: lightestDay, name: DAY_NAMES[lightestDay], minutes: minMins },
    };
  }

  calculateSubjectStats(schedule = [], timeSlots = [], groupBy = "subject-teacher-room", slotMap) {
    const groups = new Map();
    let totalScheduleMinutes = 0;

    schedule.forEach((item) => {
      const [d, slotId] = (item.slotId || "").split("-");
      const dayNum = parseInt(d, 10);
      const slot = slotMap.get(slotId);
      if (!slot) return;

      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      totalScheduleMinutes += dur;

      let key = "";
      let groupName = "";
      const sub = (item.subject || "Chưa đặt tên").trim();
      const tch = (item.teacher || "").trim();
      const rm = (item.room || "").trim();
      const clr = (item.color || "blue").trim();

      switch (groupBy) {
        case "subject":
          key = sub.toLowerCase();
          groupName = sub;
          break;
        case "subject-teacher":
          key = `${sub.toLowerCase()}|${tch.toLowerCase()}`;
          groupName = `${sub}${tch ? ` • ${tch}` : ""}`;
          break;
        case "subject-room":
          key = `${sub.toLowerCase()}|${rm.toLowerCase()}`;
          groupName = `${sub}${rm ? ` • ${rm}` : ""}`;
          break;
        case "teacher":
          key = (tch || "Chưa phân công").toLowerCase();
          groupName = tch || "Chưa phân công";
          break;
        case "room":
          key = (rm || "Tự do / Online").toLowerCase();
          groupName = rm || "Tự do / Online";
          break;
        case "color":
          key = clr.toLowerCase();
          groupName = COLOR_MAP[clr]?.name || clr;
          break;
        case "subject-teacher-room":
        default:
          key = `${sub.toLowerCase()}|${tch.toLowerCase()}|${rm.toLowerCase()}|${clr.toLowerCase()}`;
          groupName = sub;
          break;
      }

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name: groupName,
          subject: sub,
          teacher: tch,
          room: rm,
          color: clr,
          colorHex: COLOR_MAP[clr]?.hex || "#3b82f6",
          sessionCount: 0,
          slotCount: 0,
          totalMinutes: 0,
          daysSet: new Set(),
          daysMap: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          completedCount: 0,
          focusCount: 0,
          priorities: {},
          firstSlotIndex: 999,
          lastSlotIndex: -1,
          items: [],
        });
      }

      const g = groups.get(key);
      g.sessionCount += 1;
      g.slotCount += 1;
      g.totalMinutes += dur;
      g.daysSet.add(dayNum);
      g.daysMap[dayNum] = (g.daysMap[dayNum] || 0) + 1;
      if (item.status === "completed") g.completedCount += 1;
      if (item.isFocus) g.focusCount += 1;

      const prio = item.priority || "medium";
      g.priorities[prio] = (g.priorities[prio] || 0) + 1;

      if (slot.index < g.firstSlotIndex) g.firstSlotIndex = slot.index;
      if (slot.index > g.lastSlotIndex) g.lastSlotIndex = slot.index;
      g.items.push(item);
    });

    const result = [];
    groups.forEach((g) => {
      const daysList = Array.from(g.daysSet)
        .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
        .map((d) => DAY_SHORT_NAMES[d]);

      let highestPriority = "medium";
      if (g.priorities.critical) highestPriority = "critical";
      else if (g.priorities.high) highestPriority = "high";
      else if (g.priorities.medium) highestPriority = "medium";
      else if (g.priorities.low) highestPriority = "low";

      const firstSlot = g.firstSlotIndex !== 999 ? timeSlots[g.firstSlotIndex] : null;
      const lastSlot = g.lastSlotIndex !== -1 ? timeSlots[g.lastSlotIndex] : null;

      result.push({
        ...g,
        dayCount: g.daysSet.size,
        daysList,
        totalHoursFormatted: +(g.totalMinutes / 60).toFixed(1),
        completionRate: g.sessionCount > 0 ? Math.round((g.completedCount / g.sessionCount) * 100) : 0,
        highestPriority,
        firstSlotTime: firstSlot ? `${firstSlot.label} (${firstSlot.start})` : "--",
        lastSlotTime: lastSlot ? `${lastSlot.label} (${lastSlot.end})` : "--",
        sessionsCount: g.sessionCount,
        percentageOfTotalTime: totalScheduleMinutes > 0 ? Math.round((g.totalMinutes / totalScheduleMinutes) * 100) : 0,
        percentageOfWeek: totalScheduleMinutes > 0 ? Math.round((g.totalMinutes / totalScheduleMinutes) * 100) : 0,
        averageSessionMinutes: g.sessionCount > 0 ? Math.round(g.totalMinutes / g.sessionCount) : 0,
      });
    });

    // Sort by totalMinutes descending
    result.sort((a, b) => b.totalMinutes - a.totalMinutes);
    return result;
  }

  calculateDailyStats(schedule = [], timeSlots = [], slotMap) {
    const days = [1, 2, 3, 4, 5, 6, 0]; // Mon -> Sun order

    return days.map((dayNum) => {
      const prefix = `${dayNum}-`;
      const dayItems = schedule.filter((s) => s.slotId && s.slotId.startsWith(prefix));

      const itemsWithSlot = [];
      const subjectsSet = new Set();
      const teachersSet = new Set();
      const roomsSet = new Set();
      let totalMinutes = 0;
      let completedCount = 0;
      let focusCount = 0;

      dayItems.forEach((it) => {
        const [, sId] = it.slotId.split("-");
        const slot = slotMap.get(sId);
        if (slot) {
          const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
          totalMinutes += dur;
          itemsWithSlot.push({ item: it, slot, dur });
          subjectsSet.add(it.subject);
          if (it.teacher && it.teacher !== "-") teachersSet.add(it.teacher);
          if (it.room && it.room !== "-") roomsSet.add(it.room);
          if (it.status === "completed") completedCount++;
          if (it.isFocus) focusCount++;
        }
      });

      itemsWithSlot.sort((a, b) => a.slot.index - b.slot.index);

      // Streaks and breaks calculation
      let longestStreak = 0;
      let currentStreak = 0;
      let totalBreakMinutes = 0;
      let longestBreakMinutes = 0;
      let shortestBreakMinutes = 9999;
      let breakCount = 0;
      const dayBreaks = [];

      for (let i = 0; i < itemsWithSlot.length; i++) {
        if (i === 0) {
          currentStreak = 1;
          longestStreak = 1;
        } else {
          const prev = itemsWithSlot[i - 1];
          const curr = itemsWithSlot[i];

          if (curr.slot.index === prev.slot.index + 1) {
            // Consecutive
            currentStreak++;
            if (currentStreak > longestStreak) longestStreak = currentStreak;
          } else {
            // Break between slots
            currentStreak = 1;
            const breakDur = TimeEngine.getDurationMinutes(prev.slot.end, curr.slot.start);
            if (breakDur > 0) {
              breakCount++;
              totalBreakMinutes += breakDur;
              dayBreaks.push({ duration: breakDur, from: prev.slot.end, to: curr.slot.start });
              if (breakDur > longestBreakMinutes) longestBreakMinutes = breakDur;
              if (breakDur < shortestBreakMinutes) shortestBreakMinutes = breakDur;
            }
          }
        }
      }

      if (shortestBreakMinutes === 9999) shortestBreakMinutes = 0;

      const startTime = itemsWithSlot.length > 0 ? itemsWithSlot[0].slot.start : "--:--";
      const endTime = itemsWithSlot.length > 0 ? itemsWithSlot[itemsWithSlot.length - 1].slot.end : "--:--";

      // Transparent Workload Score Algorithm (0 - 100)
      // 1. Duration factor (up to 50 pts for 8 hours study)
      const durationScore = Math.min(50, (totalMinutes / 480) * 50);
      // 2. Session density factor (up to 20 pts for 8+ sessions)
      const sessionScore = Math.min(20, (dayItems.length / 8) * 20);
      // 3. Continuous streak factor (up to 20 pts for continuous blocks >= 3 slots)
      const streakScore = Math.min(20, Math.max(0, (longestStreak - 1) * 7));
      // 4. Break deficit penalty (up to 10 pts if heavy day but little break)
      let breakDeficit = 0;
      if (totalMinutes > 180 && totalBreakMinutes < 30) {
        breakDeficit = 10;
      }

      const workloadScore = Math.min(100, Math.round(durationScore + sessionScore + streakScore + breakDeficit));

      let workloadLevel = "Nhẹ";
      let workloadColor = "emerald";
      if (workloadScore > 80) {
        workloadLevel = "Rất cao";
        workloadColor = "rose";
      } else if (workloadScore > 60) {
        workloadLevel = "Cao";
        workloadColor = "amber";
      } else if (workloadScore > 30) {
        workloadLevel = "Vừa";
        workloadColor = "sky";
      }

      return {
        day: dayNum,
        dayName: DAY_NAMES[dayNum],
        shortName: DAY_SHORT_NAMES[dayNum],
        sessionCount: dayItems.length,
        sessionsCount: dayItems.length,
        slotCount: dayItems.length,
        maxContinuousSessions: longestStreak,
        totalMinutes,
        totalHoursFormatted: +(totalMinutes / 60).toFixed(1),
        subjectCount: subjectsSet.size,
        teacherCount: teachersSet.size,
        roomCount: roomsSet.size,
        startTime,
        endTime,
        longestStreak,
        breaks: dayBreaks,
        breakCount,
        totalBreakMinutes,
        longestBreakMinutes,
        shortestBreakMinutes,
        completedCount,
        focusCount,
        workloadScore,
        workloadLevel,
        workloadColor,
      };
    });
  }

  calculateBreakStats(schedule = [], timeSlots = [], slotMap) {
    const allBreaks = [];
    const brackets = {
      short: { label: "< 10 phút", count: 0, items: [] },
      standard: { label: "10 - 20 phút", count: 0, items: [] },
      moderate: { label: "20 - 30 phút", count: 0, items: [] },
      long: { label: "> 30 phút", count: 0, items: [] },
    };

    for (let dayNum = 0; dayNum <= 6; dayNum++) {
      const prefix = `${dayNum}-`;
      const dayItems = schedule.filter((s) => s.slotId && s.slotId.startsWith(prefix));
      const itemsWithSlot = [];

      dayItems.forEach((it) => {
        const [, sId] = it.slotId.split("-");
        const slot = slotMap.get(sId);
        if (slot) itemsWithSlot.push({ item: it, slot });
      });

      itemsWithSlot.sort((a, b) => a.slot.index - b.slot.index);

      for (let i = 0; i < itemsWithSlot.length - 1; i++) {
        const curr = itemsWithSlot[i];
        const next = itemsWithSlot[i + 1];

        if (next.slot.index > curr.slot.index + 1) {
          const dur = TimeEngine.getDurationMinutes(curr.slot.end, next.slot.start);
          if (dur > 0) {
            const breakEntry = {
              day: dayNum,
              dayName: DAY_NAMES[dayNum],
              startTime: curr.slot.end,
              endTime: next.slot.start,
              durationMinutes: dur,
              beforeSubject: curr.item.subject,
              afterSubject: next.item.subject,
            };
            allBreaks.push(breakEntry);

            if (dur < 10) {
              brackets.short.count++;
              brackets.short.items.push(breakEntry);
            } else if (dur <= 20) {
              brackets.standard.count++;
              brackets.standard.items.push(breakEntry);
            } else if (dur <= 30) {
              brackets.moderate.count++;
              brackets.moderate.items.push(breakEntry);
            } else {
              brackets.long.count++;
              brackets.long.items.push(breakEntry);
            }
          }
        }
      }
    }

    const totalBreaks = allBreaks.length;
    const totalBreakMinutes = allBreaks.reduce((acc, b) => acc + b.durationMinutes, 0);
    const avgBreakMinutes = totalBreaks > 0 ? Math.round(totalBreakMinutes / totalBreaks) : 0;
    const maxBreak = allBreaks.reduce((max, b) => (b.durationMinutes > max ? b.durationMinutes : max), 0);

    return {
      totalBreaks,
      totalBreakMinutes,
      totalBreakHours: +(totalBreakMinutes / 60).toFixed(1),
      avgBreakMinutes,
      maxBreakMinutes: maxBreak,
      brackets,
      allBreaks: allBreaks.sort((a, b) => b.durationMinutes - a.durationMinutes),
    };
  }

  calculateContinuousLoad(schedule = [], timeSlots = [], slotMap) {
    const streakBuckets = { 2: 0, 3: 0, 4: 0, 5: 0 };
    let overallLongestStreak = { count: 0, day: 1, dayName: "Thứ Hai", start: "", end: "", subject: "" };

    for (let dayNum = 0; dayNum <= 6; dayNum++) {
      const prefix = `${dayNum}-`;
      const dayItems = schedule.filter((s) => s.slotId && s.slotId.startsWith(prefix));
      const itemsWithSlot = [];

      dayItems.forEach((it) => {
        const [, sId] = it.slotId.split("-");
        const slot = slotMap.get(sId);
        if (slot) itemsWithSlot.push({ item: it, slot });
      });

      itemsWithSlot.sort((a, b) => a.slot.index - b.slot.index);

      let currentStreak = [];
      for (let i = 0; i < itemsWithSlot.length; i++) {
        const entry = itemsWithSlot[i];
        if (currentStreak.length === 0) {
          currentStreak.push(entry);
          continue;
        }

        const prev = currentStreak[currentStreak.length - 1];
        if (entry.slot.index === prev.slot.index + 1) {
          currentStreak.push(entry);
        } else {
          evaluateStreak(currentStreak, dayNum);
          currentStreak = [entry];
        }
      }
      if (currentStreak.length > 0) {
        evaluateStreak(currentStreak, dayNum);
      }
    }

    function evaluateStreak(streak, dayNum) {
      const len = streak.length;
      if (len >= 5) streakBuckets[5]++;
      else if (len === 4) streakBuckets[4]++;
      else if (len === 3) streakBuckets[3]++;
      else if (len === 2) streakBuckets[2]++;

      if (len > overallLongestStreak.count) {
        overallLongestStreak = {
          count: len,
          day: dayNum,
          dayName: DAY_NAMES[dayNum],
          start: streak[0].slot.start,
          end: streak[streak.length - 1].slot.end,
          subject: streak[0].item.subject,
        };
      }
    }

    return {
      buckets: streakBuckets,
      overallLongestStreak,
    };
  }

  calculateWorkloadHeatmap(schedule = [], timeSlots = [], slotMap) {
    const days = [1, 2, 3, 4, 5, 6, 0];
    const matrix = [];

    timeSlots.forEach((slot, slotIdx) => {
      const row = {
        slotIndex: slotIdx,
        slotId: slot.id,
        label: slot.label,
        start: slot.start,
        end: slot.end,
        durationMinutes: TimeEngine.getDurationMinutes(slot.start, slot.end),
        cells: {},
      };

      days.forEach((dayNum) => {
        const slotKey = `${dayNum}-${slot.id}`;
        const item = schedule.find((s) => s.slotId === slotKey);

        if (item) {
          row.cells[dayNum] = {
            hasActivity: true,
            subject: item.subject,
            teacher: item.teacher || "",
            room: item.room || "",
            color: item.color || "blue",
            colorHex: COLOR_MAP[item.color]?.hex || "#3b82f6",
            status: item.status || "planned",
            priority: item.priority || "medium",
            durationMinutes: row.durationMinutes,
            intensity: row.durationMinutes > 90 ? 4 : row.durationMinutes > 60 ? 3 : row.durationMinutes > 40 ? 2 : 1,
          };
        } else {
          row.cells[dayNum] = {
            hasActivity: false,
            intensity: 0,
          };
        }
      });

      matrix.push(row);
    });

    return matrix;
  }

  calculateSubjectDistribution(schedule = [], timeSlots = [], slotMap) {
    const subjectMap = {};
    let totalMinutes = 0;
    let totalSessions = schedule.length;

    schedule.forEach((item) => {
      const [, slotId] = (item.slotId || "").split("-");
      const slot = slotMap.get(slotId);
      if (!slot) return;

      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      totalMinutes += dur;

      const sub = (item.subject || "Khác").trim();
      if (!subjectMap[sub]) {
        subjectMap[sub] = {
          subject: sub,
          color: item.color || "blue",
          colorHex: COLOR_MAP[item.color]?.hex || "#3b82f6",
          sessions: 0,
          minutes: 0,
        };
      }
      subjectMap[sub].sessions++;
      subjectMap[sub].minutes += dur;
    });

    const list = Object.values(subjectMap).map((entry) => ({
      ...entry,
      hoursFormatted: +(entry.minutes / 60).toFixed(1),
      percentTime: totalMinutes > 0 ? Math.round((entry.minutes / totalMinutes) * 100) : 0,
      percentSessions: totalSessions > 0 ? Math.round((entry.sessions / totalSessions) * 100) : 0,
    }));

    list.sort((a, b) => b.minutes - a.minutes);
    return {
      items: list,
      totalMinutes,
      totalSessions,
    };
  }

  calculateTeacherStats(schedule = [], timeSlots = [], slotMap) {
    const teachers = {};
    schedule.forEach((it) => {
      if (!it.teacher || it.teacher.trim() === "-") return;
      const t = it.teacher.trim();
      const [, slotId] = (it.slotId || "").split("-");
      const slot = slotMap.get(slotId);
      if (!slot) return;

      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      if (!teachers[t]) {
        teachers[t] = {
          name: t,
          sessions: 0,
          totalMinutes: 0,
          subjects: new Set(),
          rooms: new Set(),
          days: new Set(),
        };
      }
      teachers[t].sessions++;
      teachers[t].totalMinutes += dur;
      teachers[t].subjects.add(it.subject);
      if (it.room && it.room !== "-") teachers[t].rooms.add(it.room);
      const [d] = it.slotId.split("-");
      teachers[t].days.add(parseInt(d, 10));
    });

    return Object.values(teachers)
      .map((t) => ({
        name: t.name,
        sessions: t.sessions,
        totalMinutes: t.totalMinutes,
        totalHoursFormatted: +(t.totalMinutes / 60).toFixed(1),
        subjects: Array.from(t.subjects).join(", "),
        rooms: Array.from(t.rooms).join(", "),
        days: Array.from(t.days).map((d) => DAY_SHORT_NAMES[d]).join(", "),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }

  calculateRoomStats(schedule = [], timeSlots = [], slotMap) {
    const rooms = {};
    schedule.forEach((it) => {
      if (!it.room || it.room.trim() === "-") return;
      const r = it.room.trim();
      const [, slotId] = (it.slotId || "").split("-");
      const slot = slotMap.get(slotId);
      if (!slot) return;

      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      if (!rooms[r]) {
        rooms[r] = {
          name: r,
          sessions: 0,
          totalMinutes: 0,
          subjects: new Set(),
          days: new Set(),
        };
      }
      rooms[r].sessions++;
      rooms[r].totalMinutes += dur;
      rooms[r].subjects.add(it.subject);
      const [d] = it.slotId.split("-");
      rooms[r].days.add(parseInt(d, 10));
    });

    return Object.values(rooms)
      .map((r) => ({
        name: r.name,
        sessions: r.sessions,
        totalMinutes: r.totalMinutes,
        totalHoursFormatted: +(r.totalMinutes / 60).toFixed(1),
        subjects: Array.from(r.subjects).join(", "),
        days: Array.from(r.days).map((d) => DAY_SHORT_NAMES[d]).join(", "),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }

  calculateInsights(schedule, timeSlots, lessons, calculated) {
    const insights = [];
    const { daily, breaks, streaks, subjects } = calculated;

    // 1. Critical Rule: Extremely High Workload
    const heavyDays = daily.filter((d) => d.workloadScore >= 80 && d.sessionCount > 0);
    if (heavyDays.length > 0) {
      heavyDays.forEach((d) => {
        insights.push({
          severity: "critical",
          badge: "Tải học cực cao",
          title: `Áp lực lớn vào ${d.dayName} (${d.workloadScore}/100)`,
          desc: `${d.dayName} có ${d.sessionCount} ca học (${d.totalHoursFormatted} giờ) với chuỗi liên tục ${d.longestStreak} tiết. Nên cân nhắc giãn ca hoặc tăng thời gian nghỉ ngơi.`,
        });
      });
    }

    // 2. Warning Rule: Continuous load streak >= 4
    if (streaks.overallLongestStreak && streaks.overallLongestStreak.count >= 4) {
      const s = streaks.overallLongestStreak;
      insights.push({
        severity: "warning",
        badge: "Chuỗi học liên tục",
        title: `Chuỗi học liên tục ${s.count} tiết vào ${s.dayName}`,
        desc: `Từ ${s.start} đến ${s.end} không có khoảng nghỉ xen kẽ. Việc học dồn ${s.count} tiết liên tiếp có thể làm giảm đáng kể khả năng tập trung.`,
      });
    }

    // 3. Warning Rule: Short breaks < 10m
    if (breaks.brackets.short.count > 0) {
      const count = breaks.brackets.short.count;
      insights.push({
        severity: "warning",
        badge: "Khoảng nghỉ gấp",
        title: `Có ${count} khoảng nghỉ dưới 10 phút`,
        desc: `Các khoảng chuyển tiếp quá ngắn giữa các ca học khiến bạn khó kịp chuẩn bị tài liệu hoặc di chuyển giữa các phòng học.`,
      });
    }

    // 4. Info Rule: Dominant subject > 30% total study time
    if (subjects.length > 0) {
      const top = subjects[0];
      if (top.percentageOfTotalTime >= 30) {
        insights.push({
          severity: "info",
          badge: "Tỷ trọng môn",
          title: `${top.name} chiếm ${top.percentageOfTotalTime}% tổng thời gian học`,
          desc: `Môn này chiếm đến ${top.totalHoursFormatted} giờ trong tuần qua ${top.sessionCount} ca học. Hãy đảm bảo các môn khác vẫn nhận đủ sự ưu tiên cần thiết.`,
        });
      }
    }

    // 5. Info Rule: Early start before 07:00
    const earlyDays = daily.filter((d) => d.startTime !== "--:--" && d.startTime < "07:00");
    if (earlyDays.length > 0) {
      const dNames = earlyDays.map((d) => `${d.shortName} (${d.startTime})`).join(", ");
      insights.push({
        severity: "info",
        badge: "Khởi động sớm",
        title: `Lịch học bắt đầu rất sớm vào ${dNames}`,
        desc: `Cần sắp xếp thời gian đi ngủ sớm từ đêm hôm trước để đảm bảo tỉnh táo cho các ca học sáng sớm.`,
      });
    }

    // 6. Info Rule: Late finish after 21:30
    const lateDays = daily.filter((d) => d.endTime !== "--:--" && d.endTime > "21:30");
    if (lateDays.length > 0) {
      const dNames = lateDays.map((d) => `${d.shortName} (${d.endTime})`).join(", ");
      insights.push({
        severity: "info",
        badge: "Kết thúc muộn",
        title: `Lịch học kéo dài tới đêm vào ${dNames}`,
        desc: `Các ca học kết thúc muộn cần được theo sau bởi thời gian nghỉ ngơi thư giãn trước khi đi ngủ.`,
      });
    }

    // 7. Positive Rule: Balanced days
    const balancedDays = daily.filter((d) => d.workloadScore >= 30 && d.workloadScore <= 60 && d.breakCount >= 1);
    if (balancedDays.length > 0) {
      const dNames = balancedDays.map((d) => d.shortName).join(", ");
      insights.push({
        severity: "positive",
        badge: "Cân bằng tối ưu",
        title: `Nhịp điệu học tập rất tốt vào ${dNames}`,
        desc: `Các ngày này có thời lượng học vừa phải kèm khoảng nghỉ hợp lý, giúp duy trì năng lượng và hiệu suất bền vững.`,
      });
    }

    return insights;
  }

  /**
   * Export Analytics Data in multiple formats: JSON, CSV, Excel (XLSX)
   */
  exportData(format = "json", computedData) {
    if (format === "json") {
      const blob = new Blob([JSON.stringify(computedData, null, 2)], { type: "application/json" });
      this._triggerDownload(blob, `TKB_Analytics_${Date.now()}.json`);
      return;
    }

    if (format === "csv") {
      let csv = "\uFEFF"; // UTF-8 BOM
      csv += "PHÂN TÍCH THỜI KHÓA BIỂU\n\n";

      // Overview
      csv += "TỔNG QUAN\n";
      csv += `Tổng số ca học,${computedData.overview.totalSessions}\n`;
      csv += `Tổng giờ học,${computedData.overview.totalStudyHours} giờ\n`;
      csv += `Tỷ lệ hoàn thành,${computedData.overview.completionRate}%\n`;
      csv += `Môn học nhiều nhất,${computedData.overview.topSubject.name} (${computedData.overview.topSubject.count} ca)\n\n`;

      // Subjects
      csv += "CHI TIẾT MÔN HỌC\n";
      csv += "Môn học,Phụ trách,Vị trí,Số ca,Tổng phút,Tổng giờ,Tỷ lệ %,Ngày học\n";
      computedData.subjects.forEach((s) => {
        csv += `"${s.name}","${s.teacher}","${s.room}",${s.sessionCount},${s.totalMinutes},${s.totalHoursFormatted},${s.percentageOfTotalTime}%,"${s.daysList.join(", ")}"\n`;
      });
      csv += "\n";

      // Daily
      csv += "THỐNG KÊ THEO NGÀY\n";
      csv += "Thứ,Số ca,Tổng giờ học,Bắt đầu,Kết thúc,Chuỗi học max,Điểm Workload,Mức độ\n";
      computedData.daily.forEach((d) => {
        csv += `"${d.dayName}",${d.sessionCount},${d.totalHoursFormatted},"${d.startTime}","${d.endTime}",${d.longestStreak},${d.workloadScore},"${d.workloadLevel}"\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      this._triggerDownload(blob, `TKB_Analytics_${Date.now()}.csv`);
      return;
    }

    if (format === "excel") {
      if (typeof window.XLSX === "undefined") {
        alert("Thư viện SheetJS (XLSX) chưa sẵn sàng. Đang tải định dạng CSV thay thế.");
        return this.exportData("csv", computedData);
      }

      const wb = window.XLSX.utils.book_new();

      // Sheet 1: Overview
      const overviewData = [
        ["CHỈ SỐ THỜI KHÓA BIỂU", "GIÁ TRỊ"],
        ["Tổng số ca học", computedData.overview.totalSessions],
        ["Tổng thời gian học", `${computedData.overview.totalStudyHours} giờ (${computedData.overview.totalStudyMinutes} phút)`],
        ["Thời lượng Focus", `${computedData.overview.totalFocusHours} giờ`],
        ["Tỷ lệ hoàn thành", `${computedData.overview.completionRate}%`],
        ["Số môn học độc lập", computedData.overview.activeUniqueSubjects],
        ["Môn học nhiều nhất", `${computedData.overview.topSubject.name} (${computedData.overview.topSubject.count} ca)`],
        ["Giáo viên nhiều nhất", `${computedData.overview.topTeacher.name} (${computedData.overview.topTeacher.count} ca)`],
        ["Phòng học nhiều nhất", `${computedData.overview.topRoom.name} (${computedData.overview.topRoom.count} ca)`],
        ["Ngày bận nhất", `${computedData.overview.busiestDay.name} (${computedData.overview.busiestDay.minutes} phút)`],
      ];
      const wsOverview = window.XLSX.utils.aoa_to_sheet(overviewData);
      window.XLSX.utils.book_append_sheet(wb, wsOverview, "Tong_Quan");

      // Sheet 2: Subjects
      const subjectsData = [
        ["Môn học", "Phụ trách", "Phòng", "Số ca", "Số tiết", "Tổng phút", "Tổng giờ", "Tỷ lệ %", "Tỷ lệ xong %", "Số ca Focus", "Độ ưu tiên", "Các ngày học"],
        ...computedData.subjects.map((s) => [
          s.name,
          s.teacher || "",
          s.room || "",
          s.sessionCount,
          s.slotCount,
          s.totalMinutes,
          s.totalHoursFormatted,
          `${s.percentageOfTotalTime}%`,
          `${s.completionRate}%`,
          s.focusCount,
          s.highestPriority,
          s.daysList.join(", "),
        ]),
      ];
      const wsSubjects = window.XLSX.utils.aoa_to_sheet(subjectsData);
      window.XLSX.utils.book_append_sheet(wb, wsSubjects, "Thong_Ke_Mon_Hoc");

      // Sheet 3: Daily
      const dailyData = [
        ["Thứ", "Số ca", "Tổng phút", "Tổng giờ", "Số môn", "Số GV", "Số phòng", "Giờ bắt đầu", "Giờ kết thúc", "Chuỗi dài nhất", "Tổng phút nghỉ", "Điểm Workload", "Mức độ tải"],
        ...computedData.daily.map((d) => [
          d.dayName,
          d.sessionCount,
          d.totalMinutes,
          d.totalHoursFormatted,
          d.subjectCount,
          d.teacherCount,
          d.roomCount,
          d.startTime,
          d.endTime,
          d.longestStreak,
          d.totalBreakMinutes,
          d.workloadScore,
          d.workloadLevel,
        ]),
      ];
      const wsDaily = window.XLSX.utils.aoa_to_sheet(dailyData);
      window.XLSX.utils.book_append_sheet(wb, wsDaily, "Theo_Ngay");

      // Sheet 4: Teachers & Rooms
      const teachersData = [
        ["Giáo viên / Phụ trách", "Số ca", "Tổng giờ", "Các môn", "Các phòng", "Các ngày"],
        ...computedData.teachers.map((t) => [t.name, t.sessions, t.totalHoursFormatted, t.subjects, t.rooms, t.days]),
      ];
      const wsTeachers = window.XLSX.utils.aoa_to_sheet(teachersData);
      window.XLSX.utils.book_append_sheet(wb, wsTeachers, "Giao_Vien");

      const roomsData = [
        ["Phòng / Vị trí", "Số ca", "Tổng giờ", "Các môn", "Các ngày"],
        ...computedData.rooms.map((r) => [r.name, r.sessions, r.totalHoursFormatted, r.subjects, r.days]),
      ];
      const wsRooms = window.XLSX.utils.aoa_to_sheet(roomsData);
      window.XLSX.utils.book_append_sheet(wb, wsRooms, "Phong_Hoc");

      // Sheet 5: Breaks
      const breaksData = [
        ["Thứ", "Bắt đầu", "Kết thúc", "Thời lượng (phút)", "Trước môn", "Sau môn"],
        ...computedData.breaks.allBreaks.map((b) => [b.dayName, b.startTime, b.endTime, b.durationMinutes, b.beforeSubject, b.afterSubject]),
      ];
      const wsBreaks = window.XLSX.utils.aoa_to_sheet(breaksData);
      window.XLSX.utils.book_append_sheet(wb, wsBreaks, "Khoang_Nghi");

      window.XLSX.writeFile(wb, `TKB_Analytics_${Date.now()}.xlsx`);
    }
  }

  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const analyticsEngine = new AnalyticsEngineClass();
