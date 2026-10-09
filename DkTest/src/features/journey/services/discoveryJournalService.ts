/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Personal Discovery Journal Service
 * Stores chronological learning milestones and private student reflections.
 */

import type { DiscoveryJournalEntry, JournalMilestoneType } from "../types/journal";

const LOCAL_JOURNAL_KEY = "dktest_discovery_journal_v1";

export function getStudentJournalEntries(
  studentUid: string,
  page: number = 1,
  limit: number = 10
): { entries: DiscoveryJournalEntry[]; total: number } {
  try {
    const raw = localStorage.getItem(`${LOCAL_JOURNAL_KEY}_${studentUid}`);
    if (raw) {
      const all: DiscoveryJournalEntry[] = JSON.parse(raw);
      // Sort newest first
      all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const start = (page - 1) * limit;
      return {
        entries: all.slice(start, start + limit),
        total: all.length,
      };
    }
  } catch {}
  return { entries: [], total: 0 };
}

export function saveJournalEntry(entry: DiscoveryJournalEntry): void {
  try {
    const raw = localStorage.getItem(`${LOCAL_JOURNAL_KEY}_${entry.studentUid}`);
    let all: DiscoveryJournalEntry[] = raw ? JSON.parse(raw) : [];

    const existingIdx = all.findIndex((e) => e.id === entry.id);
    if (existingIdx >= 0) {
      all[existingIdx] = entry;
    } else {
      all.unshift(entry);
    }
    localStorage.setItem(`${LOCAL_JOURNAL_KEY}_${entry.studentUid}`, JSON.stringify(all));
  } catch {}
}

export function recordMilestoneEntry(params: {
  studentUid: string;
  milestoneType: JournalMilestoneType;
  title: string;
  summary: string;
  topicOrSubject: string;
  sourceActivityId?: string;
}): DiscoveryJournalEntry {
  const { studentUid, milestoneType, title, summary, topicOrSubject, sourceActivityId } = params;

  // Prevent duplicate automatic entries for the same source activity
  if (sourceActivityId) {
    const existing = getStudentJournalEntries(studentUid, 1, 100);
    const found = existing.entries.find((e) => e.sourceActivityId === sourceActivityId);
    if (found) return found;
  }

  const newEntry: DiscoveryJournalEntry = {
    id: `jnl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    studentUid,
    milestoneType,
    title,
    summary,
    topicOrSubject,
    timestamp: new Date().toISOString(),
    sourceActivityId,
  };

  saveJournalEntry(newEntry);
  return newEntry;
}

export function updateJournalReflection(params: {
  studentUid: string;
  entryId: string;
  reflection: {
    learnedWhat: string;
    difficultPart?: string;
    nextGoal?: string;
    confidenceLevel: 1 | 2 | 3 | 4 | 5;
  };
}): boolean {
  const { studentUid, entryId, reflection } = params;
  try {
    const raw = localStorage.getItem(`${LOCAL_JOURNAL_KEY}_${studentUid}`);
    if (!raw) return false;
    const all: DiscoveryJournalEntry[] = JSON.parse(raw);
    const target = all.find((e) => e.id === entryId);
    if (!target) return false;

    target.reflection = {
      ...reflection,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(`${LOCAL_JOURNAL_KEY}_${studentUid}`, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

export function deleteJournalEntry(studentUid: string, entryId: string): boolean {
  try {
    const raw = localStorage.getItem(`${LOCAL_JOURNAL_KEY}_${studentUid}`);
    if (!raw) return false;
    let all: DiscoveryJournalEntry[] = JSON.parse(raw);
    all = all.filter((e) => e.id !== entryId);
    localStorage.setItem(`${LOCAL_JOURNAL_KEY}_${studentUid}`, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}
