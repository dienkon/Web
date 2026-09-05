/**
 * Smart Block Merge Engine - Pure Function Utility
 * Merges consecutive schedule items sharing identical subject, teacher, room, and color.
 * Preserves raw schedule entries and never mutates original state directly.
 */

import { TimeEngine } from "./time-engine.js";

const PRIORITY_RANK = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Returns merged visual blocks for a specific day.
 * @param {Array} schedule - Raw schedule items
 * @param {Array} timeSlots - Ordered array of timeSlot definitions
 * @param {number} day - Day index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @param {boolean} [autoMerge=true] - Whether to merge or return 1:1 visual blocks
 * @returns {Array} List of merged visual blocks
 */
export function buildMergedBlocks(schedule = [], timeSlots = [], day, autoMerge = true) {
  if (!Array.isArray(schedule) || !Array.isArray(timeSlots) || day === undefined) {
    return [];
  }

  // 1. Get all items of the given day
  const prefix = `${day}-`;
  const dayItems = schedule.filter((s) => s && s.slotId && s.slotId.startsWith(prefix));
  if (dayItems.length === 0) return [];

  // 2. Map items with their slotIndex and slot object
  const itemsWithSlot = [];
  dayItems.forEach((item) => {
    const [, slotId] = item.slotId.split("-");
    const slotIdx = timeSlots.findIndex((s) => s.id === slotId);
    if (slotIdx >= 0) {
      itemsWithSlot.push({
        item,
        slotIdx,
        slot: timeSlots[slotIdx],
      });
    }
  });

  // Sort by slot index ascending
  itemsWithSlot.sort((a, b) => a.slotIdx - b.slotIdx);

  if (!autoMerge) {
    // Return each item as its own single-slot visual block
    return itemsWithSlot.map(({ item, slotIdx, slot }) => {
      const durationMinutes = TimeEngine.getDurationMinutes(slot.start, slot.end);
      return {
        id: `block_${day}_${slotIdx}_${item.id || slot.id}`,
        day,
        startSlotIndex: slotIdx,
        endSlotIndex: slotIdx,
        slotCount: 1,
        startSlot: slot,
        endSlot: slot,
        startTime: slot.start,
        endTime: slot.end,
        durationMinutes,
        subject: item.subject || "",
        teacher: item.teacher || "",
        room: item.room || "",
        color: item.color || "blue",
        status: item.status || "planned",
        priority: item.priority || "medium",
        isFocus: Boolean(item.isFocus),
        notes: item.notes || "",
        items: [item],
        slotKeys: [item.slotId],
        isMerged: false,
      };
    });
  }

  // 3. Smart Merge Algorithm
  const blocks = [];
  let currentGroup = [];

  const getMergeKey = (entry) => {
    const it = entry.item;
    const sub = (it.subject || "").trim().toLowerCase();
    const tch = (it.teacher || "").trim().toLowerCase();
    const rm = (it.room || "").trim().toLowerCase();
    const clr = (it.color || "blue").trim().toLowerCase();
    const st = (it.status || "planned").trim().toLowerCase();
    return `${sub}|${tch}|${rm}|${clr}|${st}`;
  };

  for (let i = 0; i < itemsWithSlot.length; i++) {
    const entry = itemsWithSlot[i];

    if (currentGroup.length === 0) {
      currentGroup.push(entry);
      continue;
    }

    const prevEntry = currentGroup[currentGroup.length - 1];
    const isConsecutive = entry.slotIdx === prevEntry.slotIdx + 1;
    const sameKey = getMergeKey(entry) === getMergeKey(prevEntry);
    const hasManualSplit = Boolean(entry.item.manualSplit) || Boolean(prevEntry.item.manualSplit);

    if (isConsecutive && sameKey && !hasManualSplit) {
      currentGroup.push(entry);
    } else {
      blocks.push(buildBlockFromGroup(currentGroup, day, timeSlots));
      currentGroup = [entry];
    }
  }

  if (currentGroup.length > 0) {
    blocks.push(buildBlockFromGroup(currentGroup, day, timeSlots));
  }

  return blocks;
}

function buildBlockFromGroup(group, day, timeSlots) {
  const firstEntry = group[0];
  const lastEntry = group[group.length - 1];
  const firstItem = firstEntry.item;

  const startSlot = firstEntry.slot;
  const endSlot = lastEntry.slot;
  const startSlotIndex = firstEntry.slotIdx;
  const endSlotIndex = lastEntry.slotIdx;
  const slotCount = group.length;

  // Calculate cumulative duration across the spanned slots
  const startTime = startSlot.start;
  const endTime = endSlot.end;
  const durationMinutes = TimeEngine.getDurationMinutes(startTime, endTime);

  // Determine highest priority in block
  let highestPriority = "medium";
  let maxRank = 0;
  group.forEach((g) => {
    const p = g.item.priority || "medium";
    const rank = PRIORITY_RANK[p] || 2;
    if (rank > maxRank) {
      maxRank = rank;
      highestPriority = p;
    }
  });

  const isFocus = group.some((g) => g.item.isFocus);
  const status = firstItem.status || "planned";

  return {
    id: `block_${day}_${startSlotIndex}_${endSlotIndex}_${firstItem.id || 'slot'}`,
    day,
    startSlotIndex,
    endSlotIndex,
    slotCount,
    startSlot,
    endSlot,
    startTime,
    endTime,
    durationMinutes,
    subject: firstItem.subject || "",
    teacher: firstItem.teacher || "",
    room: firstItem.room || "",
    color: firstItem.color || "blue",
    status,
    priority: highestPriority,
    isFocus,
    notes: firstItem.notes || "",
    items: group.map((g) => g.item),
    slotKeys: group.map((g) => g.item.slotId),
    isMerged: slotCount > 1,
  };
}

/**
 * Marks items in schedule with manualSplit: true so they will no longer auto-merge
 */
export function splitMergedBlock(schedule = [], slotKeys = []) {
  if (!Array.isArray(schedule) || !Array.isArray(slotKeys)) return schedule;
  const keySet = new Set(slotKeys);
  return schedule.map((item) => {
    if (keySet.has(item.slotId)) {
      return { ...item, manualSplit: true };
    }
    return item;
  });
}

/**
 * Clears manualSplit flag on items so they can merge again
 */
export function unsplitMergedBlock(schedule = [], slotKeys = []) {
  if (!Array.isArray(schedule) || !Array.isArray(slotKeys)) return schedule;
  const keySet = new Set(slotKeys);
  return schedule.map((item) => {
    if (keySet.has(item.slotId)) {
      return { ...item, manualSplit: false };
    }
    return item;
  });
}
