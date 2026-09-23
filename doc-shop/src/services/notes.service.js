/**
 * Personal Notes Service
 */
import { store } from "../app/state.js";

const STORAGE_KEY_NOTES = "dkdocshop_user_notes";

class NotesService {
  constructor() {
    this.loadNotes();
  }

  loadNotes() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTES);
      if (saved) {
        const items = JSON.parse(saved);
        store.setNotes(items);
      } else {
        // Seed initial demo notes for new students
        const initialNotes = {
          note_1: {
            id: "note_1",
            title: "Công thức Đạo hàm cần nhớ",
            text: "(sin x)' = cos x; (cos x)' = -sin x; (tan x)' = 1/cos²x. Lưu ý ôn kỹ dạng hàm hợp u(x).",
            docId: "",
            docTitle: "Sổ tay Toán 12",
            page: 1,
            color: "emerald",
            pinned: true,
            tags: ["Toán 12", "Giải tích"],
            createdAt: Date.now() - 86400000,
          },
          note_2: {
            id: "note_2",
            title: "Mẹo làm đề Tiếng Anh THPT",
            text: "Làm phần bài đọc hiểu sau cùng, ưu tiên làm ngữ âm, trọng âm, tìm lỗi sai trước để tối ưu thời gian 50 câu / 60 phút.",
            docId: "",
            docTitle: "Bộ đề Tiếng Anh",
            page: 1,
            color: "blue",
            pinned: false,
            tags: ["Tiếng Anh", "Ôn thi"],
            createdAt: Date.now() - 3600000,
          }
        };
        store.setNotes(initialNotes);
        this.persist(initialNotes);
      }
    } catch (e) {
      console.warn("Failed to load notes:", e);
    }
  }

  persist(notes) {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  }

  saveNote({ id, title, text, docId = "", docTitle = "", page = 1, color = "emerald", tags = [] }) {
    const notes = { ...store.getState().notes.items };
    const noteId = id || `note_${Date.now()}`;
    notes[noteId] = {
      id: noteId,
      title: title || "Ghi chú không tiêu đề",
      text: text || "",
      docId,
      docTitle,
      page: Number(page) || 1,
      color,
      pinned: notes[noteId]?.pinned || false,
      tags: Array.isArray(tags) ? tags : [],
      updatedAt: Date.now(),
      createdAt: notes[noteId]?.createdAt || Date.now(),
    };
    store.setNotes(notes);
    this.persist(notes);
    return notes[noteId];
  }

  deleteNote(noteId) {
    const notes = { ...store.getState().notes.items };
    delete notes[noteId];
    store.setNotes(notes);
    this.persist(notes);
  }

  togglePin(noteId) {
    const notes = { ...store.getState().notes.items };
    if (notes[noteId]) {
      notes[noteId].pinned = !notes[noteId].pinned;
      store.setNotes(notes);
      this.persist(notes);
    }
  }
}

export const notesService = new NotesService();
