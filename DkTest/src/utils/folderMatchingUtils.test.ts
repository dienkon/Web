import { describe, it, expect } from "vitest";
import { findBestExistingFolder, formatFolderTreeForPrompt } from "./folderMatchingUtils";
import type { Folder } from "../types";

const sampleFolders: Folder[] = [
  { id: "f_math", name: "Đề thi Toán học", parentId: null } as Folder,
  { id: "f_math_12", name: "Lớp 12", parentId: "f_math" } as Folder,
  { id: "f_math_12_geo", name: "Hình học Oxyz", parentId: "f_math_12" } as Folder,
  { id: "f_eng", name: "Tiếng Anh", parentId: null } as Folder,
  { id: "f_chem", name: "Kho đề Hóa học 12", parentId: null } as Folder,
];

describe("folderMatchingUtils — smart existing folder resolution for Admin AI Agent", () => {
  it("matches existing root folders despite prefixes and Vietnamese diacritics without creating duplicates", () => {
    const m1 = findBestExistingFolder(sampleFolders, "Toán học");
    expect(m1?.folder.id).toBe("f_math");

    const m2 = findBestExistingFolder(sampleFolders, "toan");
    expect(m2?.folder.id).toBe("f_math");

    const m3 = findBestExistingFolder(sampleFolders, "tieng anh");
    expect(m3?.folder.id).toBe("f_eng");

    const m4 = findBestExistingFolder(sampleFolders, "Hóa học 12");
    expect(m4?.folder.id).toBe("f_chem");
  });

  it("matches nested subfolders by name or hierarchical path", () => {
    const sub1 = findBestExistingFolder(sampleFolders, "Hình học Oxyz");
    expect(sub1?.folder.id).toBe("f_math_12_geo");
    expect(sub1?.fullPath).toBe("Đề thi Toán học / Lớp 12 / Hình học Oxyz");

    const sub2 = findBestExistingFolder(sampleFolders, "Đề thi Toán học / Lớp 12");
    expect(sub2?.folder.id).toBe("f_math_12");

    const sub3 = findBestExistingFolder(sampleFolders, "f_math_12_geo");
    expect(sub3?.folder.id).toBe("f_math_12_geo");
  });

  it("returns null for completely unrelated folder names so AI does not misplace exams", () => {
    const none = findBestExistingFolder(sampleFolders, "Địa lý lớp 10 nâng cao");
    expect(none).toBeNull();
  });

  it("formats full hierarchy paths for AI Agent prompt context", () => {
    const text = formatFolderTreeForPrompt(sampleFolders);
    expect(text).toContain("[id: f_math_12_geo] Đề thi Toán học / Lớp 12 / Hình học Oxyz");
    expect(text).toContain("[id: f_eng] Tiếng Anh");
  });
});
