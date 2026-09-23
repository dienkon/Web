/**
 * Library Service
 * Manages user document folders, favorites, tags, and reading progress
 */
import { store } from "../app/state.js";

const STORAGE_KEY_FOLDERS = "dkdocshop_lib_folders";
const STORAGE_KEY_PROGRESS = "dkdocshop_lib_progress";

class LibraryService {
  constructor() {
    this.loadLocalData();
  }

  loadLocalData() {
    try {
      const savedFolders = localStorage.getItem(STORAGE_KEY_FOLDERS);
      const savedProgress = localStorage.getItem(STORAGE_KEY_PROGRESS);
      
      const folders = savedFolders ? JSON.parse(savedFolders) : ["Toán", "Vật Lý", "Hóa Học", "Sinh Học", "Ngữ Văn", "Tiếng Anh", "Ôn THPT", "ĐGNL", "HS Giỏi"];
      const readingProgress = savedProgress ? JSON.parse(savedProgress) : {};

      store.setLibrary({ folders, readingProgress });
    } catch (e) {
      console.warn("Failed to load library local data:", e);
    }
  }

  saveFolders(folders) {
    store.setLibrary({ folders });
    localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
  }

  addFolder(name) {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const folders = [...store.getState().library.folders];
    if (!folders.includes(trimmed)) {
      folders.push(trimmed);
      this.saveFolders(folders);
      return true;
    }
    return false;
  }

  removeFolder(name) {
    const folders = store.getState().library.folders.filter(f => f !== name);
    this.saveFolders(folders);
  }

  updateProgress(docId, page, totalPages, title) {
    const readingProgress = { ...store.getState().library.readingProgress };
    readingProgress[docId] = {
      page,
      totalPages,
      progressPct: Math.round((page / totalPages) * 100),
      lastReadAt: Date.now(),
      title,
    };
    store.setLibrary({ readingProgress });
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(readingProgress));
  }
}

export const libraryService = new LibraryService();
