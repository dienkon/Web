import type {
  MatchingConnections,
  MatchingItem,
  MatchingMode,
  Question,
} from "../types";

export interface MatchingWire {
  leftKey: string;
  rightKey: string;
  leftIndex: number;
  rightIndex: number;
}

export interface MatchingGradeBreakdown {
  status: "correct" | "partial" | "incorrect" | "unanswered";
  earnedPoints: number;
  maxPoints: number;
  scoreRatio: number;
  correctEdges: number;
  totalRequiredEdges: number;
  wrongEdges: number;
  excessEdges: number;
  totalUserEdges: number;
  normalizedAnswer: MatchingConnections;
}

/**
 * Canonical label for a Cột 1 (left) item: "1", "2", "3", ...
 */
export function getLeftItemLabel(idx: number, item?: MatchingItem): string {
  const trimmed = item?.label?.trim();
  return trimmed ? trimmed : String(idx + 1);
}

/**
 * Canonical label for a Cột 2 (right) item: "a", "b", ..., "z", "a1", ...
 */
export function getRightItemLabel(idx: number, item?: MatchingItem): string {
  const trimmed = item?.label?.trim();
  if (trimmed) return trimmed;
  if (idx >= 0 && idx < 26) {
    return String.fromCharCode(97 + idx);
  }
  return `a${idx - 25}`;
}

/**
 * Resolve index of a left key/id/label in leftItems.
 */
export function findLeftItemIndex(
  rawKey: string | undefined | null,
  leftItems: MatchingItem[] = []
): number {
  if (rawKey === undefined || rawKey === null) return -1;
  const raw = String(rawKey).trim();
  if (!raw) return -1;
  const lower = raw.toLowerCase();

  // 1. Direct ID match
  const idIdx = leftItems.findIndex((it) => it.id === raw);
  if (idIdx !== -1) return idIdx;

  // 2. Canonical label match
  const labelIdx = leftItems.findIndex(
    (it, i) => getLeftItemLabel(i, it).toLowerCase() === lower
  );
  if (labelIdx !== -1) return labelIdx;

  // 3. 1-based numeric index fallback
  if (/^\d+$/.test(raw)) {
    const idx = parseInt(raw, 10) - 1;
    if (idx >= 0 && idx < leftItems.length) return idx;
  }

  return -1;
}

/**
 * Resolve index of a right key/id/label in rightItems.
 */
export function findRightItemIndex(
  rawVal: string | undefined | null,
  rightItems: MatchingItem[] = []
): number {
  if (rawVal === undefined || rawVal === null) return -1;
  const raw = String(rawVal).trim();
  if (!raw) return -1;
  const lower = raw.toLowerCase();

  // 1. Direct ID match
  const idIdx = rightItems.findIndex((it) => it.id === raw);
  if (idIdx !== -1) return idIdx;

  // 2. Canonical label match
  const labelIdx = rightItems.findIndex(
    (it, i) => getRightItemLabel(i, it).toLowerCase() === lower
  );
  if (labelIdx !== -1) return labelIdx;

  // 3. Single letter 'a'..'z' index fallback
  if (lower.length === 1 && lower >= "a" && lower <= "z") {
    const idx = lower.charCodeAt(0) - 97;
    if (idx >= 0 && idx < rightItems.length) return idx;
  }

  return -1;
}

/**
 * Parse a single value (string | string[] | unknown) into clean right target tokens.
 * Empty strings, null, undefined produce [].
 */
export function parseRightTargetTokens(rawVal: unknown): string[] {
  if (rawVal === undefined || rawVal === null) return [];
  const rawList: unknown[] = Array.isArray(rawVal) ? rawVal : [rawVal];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of rawList) {
    if (entry === undefined || entry === null) continue;
    const parts = String(entry)
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(part);
      }
    }
  }

  return result;
}

/**
 * Safely parse raw matches (object or JSON string) and normalize into
 * canonical `leftLabel -> rightLabel[]` (only keys with >= 1 valid target).
 */
export function normalizeMatchesToArrayMap(
  rawMatches: unknown,
  leftItems?: MatchingItem[],
  rightItems?: MatchingItem[]
): Record<string, string[]> {
  let obj: Record<string, unknown> | null = null;

  if (typeof rawMatches === "string") {
    const trimmed = rawMatches.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        obj = parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  } else if (rawMatches && typeof rawMatches === "object" && !Array.isArray(rawMatches)) {
    obj = rawMatches as Record<string, unknown>;
  }

  if (!obj) return {};

  const hasLeft = Array.isArray(leftItems) && leftItems.length > 0;
  const hasRight = Array.isArray(rightItems) && rightItems.length > 0;
  const normalized: Record<string, string[]> = {};

  for (const [rawL, rawR] of Object.entries(obj)) {
    let canonicalL = rawL.trim();
    if (!canonicalL) continue;

    if (hasLeft) {
      const lIdx = findLeftItemIndex(canonicalL, leftItems);
      if (lIdx === -1) continue;
      canonicalL = getLeftItemLabel(lIdx, leftItems[lIdx]);
    }

    const tokens = parseRightTargetTokens(rawR);
    if (tokens.length === 0) continue;

    const existing = normalized[canonicalL] || [];
    const existingLower = new Set(existing.map((v) => v.toLowerCase()));

    for (const token of tokens) {
      let canonicalR = token;
      if (hasRight) {
        const rIdx = findRightItemIndex(token, rightItems);
        if (rIdx === -1) continue;
        canonicalR = getRightItemLabel(rIdx, rightItems[rIdx]);
      }
      const lowerR = canonicalR.toLowerCase();
      if (!existingLower.has(lowerR)) {
        existingLower.add(lowerR);
        existing.push(canonicalR);
      }
    }

    if (existing.length > 0) {
      if (hasRight) {
        existing.sort(
          (a, b) => findRightItemIndex(a, rightItems) - findRightItemIndex(b, rightItems)
        );
      }
      normalized[canonicalL] = existing;
    }
  }

  return normalized;
}

/**
 * Determine effective matching mode for a question:
 * - "one_to_one": each cell in Cột 1 and Cột 2 can have at most 1 wire.
 * - "multiple": a cell can connect to multiple cells (1-to-many / many-to-many).
 * Auto-infers "multiple" for legacy questions whose correctMatches already map
 * 1-to-many or many-to-1 when matchingMode is unset.
 */
export function resolveMatchingMode(
  question?: Pick<Question, "matchingMode" | "correctMatches" | "matchingLeft" | "matchingRight"> | null
): MatchingMode {
  if (!question) return "one_to_one";
  if (question.matchingMode === "multiple") return "multiple";
  if (question.matchingMode === "one_to_one") return "one_to_one";

  const arrayMap = normalizeMatchesToArrayMap(
    question.correctMatches,
    question.matchingLeft,
    question.matchingRight
  );
  const usedRight = new Set<string>();
  for (const targets of Object.values(arrayMap)) {
    if (targets.length > 1) return "multiple";
    for (const t of targets) {
      const lower = t.toLowerCase();
      if (usedRight.has(lower)) return "multiple";
      usedRight.add(lower);
    }
  }
  return "one_to_one";
}

/**
 * Serialize normalized `Record<string, string[]>` into Firestore/JSON-safe `MatchingConnections`.
 * - Unconnected rows are omitted cleanly (never `""` or `[]`).
 * - Single-target rows are stored as plain `string` (100% backward compatible with v1/v3 schemas).
 * - Multi-target rows in "multiple" mode are stored as `string[]`.
 * - In "one_to_one" mode, enforces at most 1 wire per left item and at most 1 wire per right item.
 */
export function serializeMatchesMap(
  arrayMap: Record<string, string[]>,
  mode: MatchingMode = "multiple"
): MatchingConnections {
  const out: MatchingConnections = {};

  if (mode === "one_to_one") {
    const usedRight = new Set<string>();
    for (const [lKey, targets] of Object.entries(arrayMap)) {
      if (!targets || targets.length === 0) continue;
      const available = targets.find((t) => t.trim() && !usedRight.has(t.trim().toLowerCase()));
      if (available) {
        const clean = available.trim();
        usedRight.add(clean.toLowerCase());
        out[lKey] = clean;
      }
    }
    return out;
  }

  for (const [lKey, targets] of Object.entries(arrayMap)) {
    if (!targets || targets.length === 0) continue;
    const cleanTargets = targets.map((t) => t.trim()).filter(Boolean);
    if (cleanTargets.length === 1) {
      out[lKey] = cleanTargets[0];
    } else if (cleanTargets.length > 1) {
      out[lKey] = cleanTargets;
    }
  }

  return out;
}

/**
 * Toggle a single wire `(leftKey, rightKey)` according to `mode`:
 * - If `(leftKey, rightKey)` already exists -> removes that wire.
 * - Else in `one_to_one` -> replaces any existing wire on `leftKey` AND any existing wire on `rightKey`.
 * - Else in `multiple` -> adds `(leftKey, rightKey)` while keeping existing wires.
 */
export function toggleMatchConnection(
  currentRawMatches: unknown,
  leftKey: string,
  rightKey: string,
  mode: MatchingMode = "one_to_one",
  leftItems?: MatchingItem[],
  rightItems?: MatchingItem[]
): MatchingConnections {
  const map = normalizeMatchesToArrayMap(currentRawMatches, leftItems, rightItems);

  let canonL = leftKey.trim();
  if (leftItems && leftItems.length > 0) {
    const lIdx = findLeftItemIndex(canonL, leftItems);
    if (lIdx !== -1) canonL = getLeftItemLabel(lIdx, leftItems[lIdx]);
  }

  let canonR = rightKey.trim();
  if (rightItems && rightItems.length > 0) {
    const rIdx = findRightItemIndex(canonR, rightItems);
    if (rIdx !== -1) canonR = getRightItemLabel(rIdx, rightItems[rIdx]);
  }

  if (!canonL || !canonR) {
    return serializeMatchesMap(map, mode);
  }

  const lowerR = canonR.toLowerCase();
  const currentTargets = map[canonL] || [];
  const alreadyConnected = currentTargets.some((t) => t.toLowerCase() === lowerR);

  if (alreadyConnected) {
    const nextTargets = currentTargets.filter((t) => t.toLowerCase() !== lowerR);
    if (nextTargets.length > 0) {
      map[canonL] = nextTargets;
    } else {
      delete map[canonL];
    }
    return serializeMatchesMap(map, mode);
  }

  if (mode === "one_to_one") {
    // Remove `canonR` from any other left item first so each cell has at most 1 wire
    for (const [k, targets] of Object.entries(map)) {
      const filtered = targets.filter((t) => t.toLowerCase() !== lowerR);
      if (filtered.length > 0) {
        map[k] = filtered;
      } else {
        delete map[k];
      }
    }
    map[canonL] = [canonR];
    return serializeMatchesMap(map, "one_to_one");
  }

  const nextTargets = [...currentTargets, canonR];
  if (rightItems && rightItems.length > 0) {
    nextTargets.sort(
      (a, b) => findRightItemIndex(a, rightItems) - findRightItemIndex(b, rightItems)
    );
  }
  map[canonL] = nextTargets;
  return serializeMatchesMap(map, "multiple");
}

/**
 * Explicitly set the right targets for a given `leftKey` (e.g. from editor dropdown/chips).
 * Passing `[]` or `[""]` marks `leftKey` as unconnected ("Không nối").
 */
export function setLeftTargetsInMode(
  currentRawMatches: unknown,
  leftKey: string,
  newRightTargets: string | string[],
  mode: MatchingMode = "one_to_one",
  leftItems?: MatchingItem[],
  rightItems?: MatchingItem[]
): MatchingConnections {
  const map = normalizeMatchesToArrayMap(currentRawMatches, leftItems, rightItems);

  let canonL = leftKey.trim();
  if (leftItems && leftItems.length > 0) {
    const lIdx = findLeftItemIndex(canonL, leftItems);
    if (lIdx !== -1) canonL = getLeftItemLabel(lIdx, leftItems[lIdx]);
  }

  const parsedTargets = parseRightTargetTokens(newRightTargets)
    .map((t) => {
      if (rightItems && rightItems.length > 0) {
        const rIdx = findRightItemIndex(t, rightItems);
        if (rIdx === -1) return "";
        return getRightItemLabel(rIdx, rightItems[rIdx]);
      }
      return t;
    })
    .filter(Boolean);

  if (parsedTargets.length === 0) {
    delete map[canonL];
    return serializeMatchesMap(map, mode);
  }

  if (mode === "one_to_one") {
    const chosen = parsedTargets[0];
    const lowerChosen = chosen.toLowerCase();
    for (const [k, targets] of Object.entries(map)) {
      if (k === canonL) continue;
      const filtered = targets.filter((t) => t.toLowerCase() !== lowerChosen);
      if (filtered.length > 0) {
        map[k] = filtered;
      } else {
        delete map[k];
      }
    }
    map[canonL] = [chosen];
    return serializeMatchesMap(map, "one_to_one");
  }

  const uniqueTargets = Array.from(new Set(parsedTargets));
  if (rightItems && rightItems.length > 0) {
    uniqueTargets.sort(
      (a, b) => findRightItemIndex(a, rightItems) - findRightItemIndex(b, rightItems)
    );
  }
  map[canonL] = uniqueTargets;
  return serializeMatchesMap(map, "multiple");
}

/**
 * Remove a specific wire `(leftKey, rightKey)` or all wires from `leftKey` if `rightKey` is omitted.
 */
export function removeMatchWire(
  currentRawMatches: unknown,
  leftKey: string,
  rightKey?: string,
  mode: MatchingMode = "multiple",
  leftItems?: MatchingItem[],
  rightItems?: MatchingItem[]
): MatchingConnections {
  const map = normalizeMatchesToArrayMap(currentRawMatches, leftItems, rightItems);

  let canonL = leftKey.trim();
  if (leftItems && leftItems.length > 0) {
    const lIdx = findLeftItemIndex(canonL, leftItems);
    if (lIdx !== -1) canonL = getLeftItemLabel(lIdx, leftItems[lIdx]);
  }

  if (!rightKey) {
    delete map[canonL];
    return serializeMatchesMap(map, mode);
  }

  let canonR = rightKey.trim();
  if (rightItems && rightItems.length > 0) {
    const rIdx = findRightItemIndex(canonR, rightItems);
    if (rIdx !== -1) canonR = getRightItemLabel(rIdx, rightItems[rIdx]);
  }

  const lowerR = canonR.toLowerCase();
  const existing = map[canonL] || [];
  const filtered = existing.filter((t) => t.toLowerCase() !== lowerR);
  if (filtered.length > 0) {
    map[canonL] = filtered;
  } else {
    delete map[canonL];
  }
  return serializeMatchesMap(map, mode);
}

/**
 * List all active wires with resolved indices for rendering SVG lines and summary pills.
 */
export function getMatchingWires(
  rawMatches: unknown,
  leftItems: MatchingItem[] = [],
  rightItems: MatchingItem[] = []
): MatchingWire[] {
  const map = normalizeMatchesToArrayMap(rawMatches, leftItems, rightItems);
  const wires: MatchingWire[] = [];

  leftItems.forEach((lItem, lIdx) => {
    const lKey = getLeftItemLabel(lIdx, lItem);
    const targets = map[lKey] || [];
    targets.forEach((rKey) => {
      const rIdx = findRightItemIndex(rKey, rightItems);
      if (rIdx !== -1) {
        wires.push({
          leftKey: lKey,
          rightKey: getRightItemLabel(rIdx, rightItems[rIdx]),
          leftIndex: lIdx,
          rightIndex: rIdx,
        });
      }
    });
  });

  return wires;
}

/**
 * Count total active connection wires.
 */
export function countMatchingWires(
  rawMatches: unknown,
  leftItems?: MatchingItem[],
  rightItems?: MatchingItem[]
): number {
  const map = normalizeMatchesToArrayMap(rawMatches, leftItems, rightItems);
  return Object.values(map).reduce((sum, arr) => sum + arr.length, 0);
}

/**
 * Identify unconnected (distractor) items in Cột 1 and Cột 2.
 */
export function getUnconnectedItems(
  leftItems: MatchingItem[] = [],
  rightItems: MatchingItem[] = [],
  rawMatches: unknown
): { unconnectedLeftLabels: string[]; unconnectedRightLabels: string[] } {
  const map = normalizeMatchesToArrayMap(rawMatches, leftItems, rightItems);
  const connectedRight = new Set<string>();
  Object.values(map).forEach((targets) => {
    targets.forEach((t) => connectedRight.add(t.toLowerCase()));
  });

  const unconnectedLeftLabels = leftItems
    .map((it, idx) => getLeftItemLabel(idx, it))
    .filter((lbl) => !map[lbl] || map[lbl].length === 0);

  const unconnectedRightLabels = rightItems
    .map((it, idx) => getRightItemLabel(idx, it))
    .filter((lbl) => !connectedRight.has(lbl.toLowerCase()));

  return { unconnectedLeftLabels, unconnectedRightLabels };
}

/**
 * Format human-readable summary of matches, e.g. "1 → a, c; 2 → b"
 */
export function formatMatchingPairsSummary(
  rawMatches: unknown,
  leftItems?: MatchingItem[],
  rightItems?: MatchingItem[],
  arrow = " → "
): string {
  const map = normalizeMatchesToArrayMap(rawMatches, leftItems, rightItems);
  const entries = Object.entries(map).filter(([_, arr]) => arr.length > 0);
  if (entries.length === 0) return "";
  return entries.map(([lKey, rTargets]) => `${lKey}${arrow}${rTargets.join(", ")}`).join("; ");
}

/**
 * Remove a left item at `removeIdx`, relabel remaining left items `1..n`,
 * and remap `correctMatches` keys so surviving rows keep their exact connections!
 */
export function removeLeftItemAndRemap(
  leftItems: MatchingItem[],
  rightItems: MatchingItem[],
  rawMatches: unknown,
  removeIdx: number,
  mode: MatchingMode = "multiple"
): { matchingLeft: MatchingItem[]; correctMatches: MatchingConnections } {
  if (leftItems.length <= 1 || removeIdx < 0 || removeIdx >= leftItems.length) {
    return {
      matchingLeft: leftItems,
      correctMatches: serializeMatchesMap(
        normalizeMatchesToArrayMap(rawMatches, leftItems, rightItems),
        mode
      ),
    };
  }

  const normalizedOld = normalizeMatchesToArrayMap(rawMatches, leftItems, rightItems);
  const surviving: Array<{ item: MatchingItem; oldTargets: string[] }> = [];

  leftItems.forEach((item, idx) => {
    if (idx === removeIdx) return;
    const oldLabel = getLeftItemLabel(idx, item);
    surviving.push({
      item,
      oldTargets: normalizedOld[oldLabel] || [],
    });
  });

  const relabeledLeft: MatchingItem[] = [];
  const remappedArrayMap: Record<string, string[]> = {};

  surviving.forEach(({ item, oldTargets }, newIdx) => {
    const newLabel = String(newIdx + 1);
    relabeledLeft.push({ ...item, label: newLabel });
    if (oldTargets.length > 0) {
      remappedArrayMap[newLabel] = oldTargets;
    }
  });

  return {
    matchingLeft: relabeledLeft,
    correctMatches: serializeMatchesMap(remappedArrayMap, mode),
  };
}

/**
 * Remove a right item at `removeIdx`, relabel remaining right items `a..z`,
 * drop connections to the removed item, and remap surviving right labels cleanly!
 */
export function removeRightItemAndRemap(
  leftItems: MatchingItem[],
  rightItems: MatchingItem[],
  rawMatches: unknown,
  removeIdx: number,
  mode: MatchingMode = "multiple"
): { matchingRight: MatchingItem[]; correctMatches: MatchingConnections } {
  if (rightItems.length <= 1 || removeIdx < 0 || removeIdx >= rightItems.length) {
    return {
      matchingRight: rightItems,
      correctMatches: serializeMatchesMap(
        normalizeMatchesToArrayMap(rawMatches, leftItems, rightItems),
        mode
      ),
    };
  }

  const normalizedOld = normalizeMatchesToArrayMap(rawMatches, leftItems, rightItems);
  const oldToNewRightLabel = new Map<string, string>();
  const relabeledRight: MatchingItem[] = [];

  rightItems.forEach((item, oldIdx) => {
    if (oldIdx === removeIdx) return;
    const oldLabel = getRightItemLabel(oldIdx, item).toLowerCase();
    const newIdx = relabeledRight.length;
    const newLabel = getRightItemLabel(newIdx, { ...item, label: undefined });
    oldToNewRightLabel.set(oldLabel, newLabel);
    relabeledRight.push({ ...item, label: newLabel });
  });

  const remappedArrayMap: Record<string, string[]> = {};
  for (const [lKey, oldTargets] of Object.entries(normalizedOld)) {
    const mapped = oldTargets
      .map((t) => oldToNewRightLabel.get(t.toLowerCase()) || "")
      .filter(Boolean);
    if (mapped.length > 0) {
      remappedArrayMap[lKey] = mapped;
    }
  }

  return {
    matchingRight: relabeledRight,
    correctMatches: serializeMatchesMap(remappedArrayMap, mode),
  };
}

/**
 * Grade a matching question supporting:
 * - 1-to-1 ("one_to_one") and multi-connect ("multiple")
 * - Unconnected distractor items on both Cột 1 and Cột 2
 * - Anti-spam protection against connecting unconnected distractors or extra wires
 */
export function gradeMatchingQuestion(
  question: Pick<Question, "matchingLeft" | "matchingRight" | "correctMatches" | "matchingMode">,
  rawAnswer: unknown,
  maxPoints = 1
): MatchingGradeBreakdown {
  const mode = resolveMatchingMode(question);
  const correctMap = normalizeMatchesToArrayMap(
    question.correctMatches,
    question.matchingLeft,
    question.matchingRight
  );
  const userMap = normalizeMatchesToArrayMap(
    rawAnswer,
    question.matchingLeft,
    question.matchingRight
  );
  const normalizedAnswer = serializeMatchesMap(userMap, mode);

  const allLeftKeys = new Set<string>([
    ...Object.keys(correctMap),
    ...Object.keys(userMap),
  ]);

  let totalRequiredEdges = 0;
  let totalUserEdges = 0;
  let correctEdges = 0;
  let wrongEdges = 0;
  let excessEdges = 0;

  for (const lKey of allLeftKeys) {
    const corrTargets = correctMap[lKey] || [];
    const userTargets = userMap[lKey] || [];
    const corrLower = new Set(corrTargets.map((t) => t.toLowerCase()));

    totalRequiredEdges += corrTargets.length;
    totalUserEdges += userTargets.length;

    for (const uTarget of userTargets) {
      if (corrLower.has(uTarget.toLowerCase())) {
        correctEdges++;
      } else {
        wrongEdges++;
      }
    }

    if (userTargets.length > corrTargets.length) {
      excessEdges += userTargets.length - corrTargets.length;
    }
  }

  if (totalUserEdges === 0 || totalRequiredEdges === 0) {
    if (totalRequiredEdges === 0 && totalUserEdges > 0) {
      return {
        status: "incorrect",
        earnedPoints: 0,
        maxPoints,
        scoreRatio: 0,
        correctEdges: 0,
        totalRequiredEdges: 0,
        wrongEdges,
        excessEdges,
        totalUserEdges,
        normalizedAnswer,
      };
    }
    return {
      status: "unanswered",
      earnedPoints: 0,
      maxPoints,
      scoreRatio: 0,
      correctEdges: 0,
      totalRequiredEdges,
      wrongEdges: 0,
      excessEdges: 0,
      totalUserEdges: 0,
      normalizedAnswer,
    };
  }

  if (correctEdges === totalRequiredEdges && wrongEdges === 0) {
    return {
      status: "correct",
      earnedPoints: maxPoints,
      maxPoints,
      scoreRatio: 1,
      correctEdges,
      totalRequiredEdges,
      wrongEdges: 0,
      excessEdges: 0,
      totalUserEdges,
      normalizedAnswer,
    };
  }

  const netCorrectEdges = Math.max(0, correctEdges - excessEdges);
  const scoreRatio = netCorrectEdges / totalRequiredEdges;
  const earnedPoints = Math.round(scoreRatio * maxPoints * 100) / 100;

  return {
    status: netCorrectEdges > 0 ? "partial" : "incorrect",
    earnedPoints,
    maxPoints,
    scoreRatio,
    correctEdges,
    totalRequiredEdges,
    wrongEdges,
    excessEdges,
    totalUserEdges,
    normalizedAnswer,
  };
}
