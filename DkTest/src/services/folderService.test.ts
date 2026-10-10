import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock firebase/firestore
vi.mock("firebase/firestore", () => {
  return {
    collection: vi.fn(),
    doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id}`, id: id || "doc-123" })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _methodName: "serverTimestamp" })),
    writeBatch: vi.fn(() => ({
      update: vi.fn(),
      commit: vi.fn(),
    })),
    query: vi.fn((_coll, ...conditions) => ({ _query: true, conditions })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
  };
});

vi.mock("./firebase/config", () => ({
  db: {},
}));

vi.mock("./examService", () => ({
  deleteExam: vi.fn(),
}));

import { getDocs, updateDoc, setDoc } from "firebase/firestore";
import {
  createFolder,
  toggleFolderPublic,
  getPublicFolders,
  getPublicExamsInFolder,
  isFolderDescendantOf,
  moveFolder,
  renameFolder,
  updateFolderColor,
} from "./folderService";

describe("folderService - Public Folder Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createFolder sets isPublic correctly", async () => {
    (setDoc as any).mockResolvedValueOnce(undefined);

    const folder = await createFolder({
      name: "Đề thi công khai",
      color: "emerald",
      isPublic: true,
    });

    expect(folder.name).toBe("Đề thi công khai");
    expect(folder.isPublic).toBe(true);
    expect(setDoc).toHaveBeenCalled();
  });

  it("toggleFolderPublic updates document with isPublic boolean", async () => {
    (updateDoc as any).mockResolvedValueOnce(undefined);

    await toggleFolderPublic("folder-1", true);

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        isPublic: true,
      })
    );

    await toggleFolderPublic("folder-1", false);

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        isPublic: false,
      })
    );
  });

  it("getPublicFolders queries folders with isPublic == true and parentId", async () => {
    (getDocs as any).mockResolvedValueOnce({
      size: 2,
      docs: [
        {
          id: "f1",
          data: () => ({ name: "Toán 12", isPublic: true, parentId: null, createdAt: { seconds: 200 } }),
        },
        {
          id: "f2",
          data: () => ({ name: "Vật Lý 12", isPublic: true, parentId: null, createdAt: { seconds: 100 } }),
        },
      ],
    });

    const folders = await getPublicFolders(null);

    expect(folders).toHaveLength(2);
    expect(folders[0].id).toBe("f1");
    expect(folders[0].name).toBe("Toán 12");
    expect(folders[1].id).toBe("f2");
  });

  it("getPublicFolders includes independently shared subfolder at root if parent is not public", async () => {
    (getDocs as any).mockResolvedValueOnce({
      size: 2,
      docs: [
        {
          id: "root-1",
          data: () => ({ name: "Root Public", isPublic: true, parentId: null, createdAt: { seconds: 200 } }),
        },
        {
          id: "nested-shared",
          data: () => ({ name: "Nested Shared", isPublic: true, parentId: "private-parent", createdAt: { seconds: 150 } }),
        },
      ],
    });

    const folders = await getPublicFolders(null);

    expect(folders).toHaveLength(2);
    expect(folders.map((f) => f.id)).toContain("nested-shared");
  });

  it("getPublicFolders inside folder returns subfolders that are not private", async () => {
    (getDocs as any).mockResolvedValueOnce({
      size: 2,
      docs: [
        {
          id: "sub-1",
          data: () => ({ name: "Chương 1", parentId: "f1", createdAt: { seconds: 200 } }),
        },
        {
          id: "sub-2-private",
          data: () => ({ name: "Chương 2 Private", isPublic: false, parentId: "f1", createdAt: { seconds: 100 } }),
        },
      ],
    });

    const subfolders = await getPublicFolders("f1");

    expect(subfolders).toHaveLength(1);
    expect(subfolders[0].id).toBe("sub-1");
  });

  it("getPublicExamsInFolder queries published exams in folder", async () => {
    (getDocs as any).mockResolvedValueOnce({
      size: 1,
      docs: [
        {
          id: "ex-1",
          data: () => ({
            title: "Đề thi thử Toán",
            status: "published",
            folderId: "f1",
            createdAt: { seconds: 100 },
          }),
        },
      ],
    });

    const exams = await getPublicExamsInFolder("f1");

    expect(exams).toHaveLength(1);
    expect(exams[0].id).toBe("ex-1");
    expect(exams[0].title).toBe("Đề thi thử Toán");
  });

  it("isFolderDescendantOf detects direct and deeply nested descendants correctly", () => {
    const sampleFolders = [
      { id: "root-1", name: "Root 1", parentId: null },
      { id: "sub-1", name: "Sub 1", parentId: "root-1" },
      { id: "deep-sub-1", name: "Deep Sub 1", parentId: "sub-1" },
      { id: "root-2", name: "Root 2", parentId: null },
    ] as any;

    expect(isFolderDescendantOf("sub-1", "root-1", sampleFolders)).toBe(true);
    expect(isFolderDescendantOf("deep-sub-1", "root-1", sampleFolders)).toBe(true);
    expect(isFolderDescendantOf("root-1", "deep-sub-1", sampleFolders)).toBe(false);
    expect(isFolderDescendantOf("root-2", "root-1", sampleFolders)).toBe(false);
    expect(isFolderDescendantOf("root-1", "root-1", sampleFolders)).toBe(true);
  });

  it("moveFolder prevents moving into self or its descendants", async () => {
    const sampleFolders = [
      { id: "f-a", name: "Folder A", parentId: null },
      { id: "f-b", name: "Folder B", parentId: "f-a" },
    ] as any;

    await expect(moveFolder("f-a", "f-a", sampleFolders)).rejects.toThrow("Không thể di chuyển thư mục vào chính nó");
    await expect(moveFolder("f-a", "f-b", sampleFolders)).rejects.toThrow("Không thể di chuyển thư mục vào bên trong thư mục con");
  });

  it("moveFolder successfully updates parentId when valid", async () => {
    (updateDoc as any).mockResolvedValueOnce(undefined);
    const sampleFolders = [
      { id: "f-a", name: "Folder A", parentId: null },
      { id: "f-c", name: "Folder C", parentId: null },
    ] as any;

    await moveFolder("f-a", "f-c", sampleFolders);
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        parentId: "f-c",
      })
    );
  });

  it("renameFolder trims and updates folder name", async () => {
    (updateDoc as any).mockResolvedValueOnce(undefined);

    await renameFolder("f-1", "  Tên mới  ");
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Tên mới",
      })
    );

    await expect(renameFolder("f-1", "   ")).rejects.toThrow("Tên thư mục không được để trống");
  });

  it("updateFolderColor updates folder color", async () => {
    (updateDoc as any).mockResolvedValueOnce(undefined);

    await updateFolderColor("f-1", "rose");
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        color: "rose",
      })
    );
  });
});
