import type { Folder } from "../types";

export function normalizeVietnameseKey(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/->]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FILLER_PREFIXES = [
  /^thu muc\s+/,
  /^folder\s+/,
  /^kho de thi\s+/,
  /^kho de\s+/,
  /^bo de thi\s+/,
  /^bo de\s+/,
  /^de thi\s+/,
  /^bai thi\s+/,
  /^mon hoc\s+/,
  /^mon\s+/,
  /^on thi\s+/,
  /^luyen thi\s+/,
];

export function stripFolderFillerWords(input: string): string {
  let key = normalizeVietnameseKey(input);
  let changed = true;
  while (changed) {
    changed = false;
    for (const rx of FILLER_PREFIXES) {
      const next = key.replace(rx, "").trim();
      if (next && next !== key) {
        key = next;
        changed = true;
      }
    }
  }
  return key;
}

const SUBJECT_ALIAS_GROUPS: string[][] = [
  ["toan", "toan hoc", "dai so", "giai tich", "hinh hoc", "math"],
  ["tieng anh", "anh van", "anh", "english"],
  ["vat ly", "vat li", "ly", "li", "physics"],
  ["hoa hoc", "hoa", "chemistry"],
  ["sinh hoc", "sinh", "biology"],
  ["ngu van", "van hoc", "van", "literature"],
  ["lich su", "su", "history"],
  ["dia ly", "dia li", "dia", "geography"],
  ["tin hoc", "tin", "lap trinh", "informatics"],
  ["gdcd", "giao duc cong dan", "ktpl", "kinh te phap luat", "kinh te va phap luat"],
  ["cong nghe", "technology"],
  ["khtn", "khoa hoc tu nhien"],
  ["khxh", "khoa hoc xa hoi", "lich su dia ly"],
  ["dgnl", "danh gia nang luc", "v act", "vact", "hsa"],
  ["dgtd", "danh gia tu duy", "tsa"],
];

function findCanonicalSubjectGroup(normalizedCore: string): number {
  for (let i = 0; i < SUBJECT_ALIAS_GROUPS.length; i++) {
    const aliases = SUBJECT_ALIAS_GROUPS[i];
    if (aliases.some((a) => normalizedCore === a)) {
      return i;
    }
  }
  return -1;
}

export function buildFolderPathMap(folders: Folder[]): Map<string, string> {
  const byId = new Map<string, Folder>();
  for (const f of folders) {
    byId.set(f.id, f);
  }
  const pathMap = new Map<string, string>();
  for (const f of folders) {
    const parts: string[] = [f.name.trim()];
    const visited = new Set<string>([f.id]);
    let cur = f.parentId ? byId.get(f.parentId) : undefined;
    while (cur && !visited.has(cur.id)) {
      visited.add(cur.id);
      parts.unshift(cur.name.trim());
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    pathMap.set(f.id, parts.join(" / "));
  }
  return pathMap;
}

export interface FolderMatchResult {
  folder: Folder;
  fullPath: string;
  score: number;
  matchReason: string;
}

/**
 * Intelligently locates the best matching existing folder across BOTH root folders AND subfolders.
 * Supports exact ID, full hierarchical path ("Toán học / Lớp 12"), diacritic-insensitive names,
 * prefix-stripped names ("Đề thi Toán 12" <-> "Toán 12"), canonical subjects ("Toán" <-> "Toán học"),
 * and high-confidence token subset overlap.
 */
export function findBestExistingFolder(
  folders: Folder[],
  queryOrId: string,
  options?: { preferRoot?: boolean; parentId?: string | null }
): FolderMatchResult | null {
  const raw = String(queryOrId || "").trim();
  if (!raw || !folders || folders.length === 0) return null;

  const pathMap = buildFolderPathMap(folders);

  // Tier 1: Exact ID match
  const byId = folders.find((f) => f.id === raw);
  if (byId) {
    return {
      folder: byId,
      fullPath: pathMap.get(byId.id) || byId.name,
      score: 100,
      matchReason: "Khớp chính xác ID thư mục",
    };
  }

  const rawNorm = normalizeVietnameseKey(raw);
  const rawCore = stripFolderFillerWords(raw);
  const rawSubjectGroup = findCanonicalSubjectGroup(rawCore);
  const queryPathSegments = raw
    .split(/\s*(?:\/|>|→)\s*/)
    .map((s) => normalizeVietnameseKey(s))
    .filter(Boolean);
  const isPathQuery = queryPathSegments.length > 1;
  const rawTokens = rawCore.split(" ").filter((t) => t.length >= 2 || /^\d+$/.test(t));

  let best: FolderMatchResult | null = null;

  const consider = (folder: Folder, score: number, reason: string) => {
    let adjusted = score;
    if (options?.parentId !== undefined) {
      if ((folder.parentId || null) === (options.parentId || null)) {
        adjusted += 4;
      }
    } else if (options?.preferRoot && !folder.parentId) {
      adjusted += 3;
    }
    if (!best || adjusted > best.score) {
      best = {
        folder,
        fullPath: pathMap.get(folder.id) || folder.name,
        score: adjusted,
        matchReason: reason,
      };
    }
  };

  for (const folder of folders) {
    const fullPath = pathMap.get(folder.id) || folder.name;
    const pathSegments = fullPath
      .split(/\s*\/\s*/)
      .map((s) => normalizeVietnameseKey(s))
      .filter(Boolean);

    // Tier 2: Hierarchical path match (e.g. "Toán / Lớp 12")
    if (isPathQuery && pathSegments.length >= queryPathSegments.length) {
      const tail = pathSegments.slice(pathSegments.length - queryPathSegments.length);
      const exactPath = tail.every((seg, i) => seg === queryPathSegments[i]);
      const corePath = tail.every(
        (seg, i) => stripFolderFillerWords(seg) === stripFolderFillerWords(queryPathSegments[i])
      );
      if (exactPath) {
        consider(folder, 96, `Khớp đường dẫn "${fullPath}"`);
        continue;
      }
      if (corePath) {
        consider(folder, 92, `Khớp gần đúng đường dẫn "${fullPath}"`);
        continue;
      }
    }

    const fNorm = normalizeVietnameseKey(folder.name);
    const fCore = stripFolderFillerWords(folder.name);
    const fSubjectGroup = findCanonicalSubjectGroup(fCore);

    // Tier 3: Exact diacritic-insensitive name match
    if (fNorm === rawNorm) {
      consider(folder, 90, `Khớp tên thư mục "${folder.name}"`);
      continue;
    }

    // Tier 4: Exact stripped-core name match (e.g. "Toán học" <-> "Đề thi Toán học")
    if (rawCore && fCore && fCore === rawCore) {
      consider(folder, 85, `Khớp tên rút gọn "${folder.name}"`);
      continue;
    }

    // Tier 5: Canonical subject alias match (e.g. "Toán" <-> "Toán học", "Anh" <-> "Tiếng Anh")
    if (rawSubjectGroup >= 0 && rawSubjectGroup === fSubjectGroup) {
      consider(folder, 80, `Khớp môn học chuẩn "${folder.name}"`);
      continue;
    }

    // Tier 6: Token subset / strong containment match
    if (rawTokens.length > 0 && fCore) {
      const fTokens = fCore.split(" ").filter((t) => t.length >= 2 || /^\d+$/.test(t));
      const allQueryTokensInFolder = rawTokens.every((t) => fTokens.includes(t));
      const allFolderTokensInQuery = fTokens.length > 0 && fTokens.every((t) => rawTokens.includes(t));

      if (allQueryTokensInFolder && fTokens.length <= rawTokens.length + 2) {
        consider(folder, 74, `Khớp từ khóa thư mục "${folder.name}"`);
        continue;
      }
      if (allFolderTokensInQuery && rawTokens.length <= fTokens.length + 2) {
        consider(folder, 70, `Khớp thư mục bao hàm "${folder.name}"`);
        continue;
      }
      // Subject group + folder contains that subject alias (e.g. query "Toán học", existing folder "Đề Toán 12" only if unambiguous)
      if (
        rawSubjectGroup >= 0 &&
        SUBJECT_ALIAS_GROUPS[rawSubjectGroup].some(
          (alias) => alias.length >= 3 && (fCore === alias || fCore.startsWith(`${alias} `))
        )
      ) {
        consider(folder, 64, `Khớp nhóm môn "${folder.name}"`);
      }
    }
  }

  return best;
}

export function formatFolderTreeForPrompt(folders: Folder[], maxItems = 60): string {
  if (!folders || folders.length === 0) return "(Chưa có thư mục nào)";
  const pathMap = buildFolderPathMap(folders);
  return folders
    .slice(0, maxItems)
    .map((f) => `- [id: ${f.id}] ${pathMap.get(f.id) || f.name}${f.isPublic ? " (Công khai)" : ""}`)
    .join("\n");
}
