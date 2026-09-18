/**
 * STATE MANAGEMENT FOR TKB SOURCE EDITOR
 * Quản lý trạng thái ứng dụng, Lịch sử Undo / Redo và LocalStorage Auto-save
 */

class AppStateManager {
  constructor() {
    this.originalSource = "";
    this.parsedBlocks = null;

    // Dữ liệu thời khóa biểu hiện tại
    this.tkb = [];
    this.ghiChuChieu = { 1: "", 2: "", 3: "", 4: "", 5: "" };
    this.gioChieu = {};
    this.monLyThuyet = [];

    // Bộ nhớ Undo / Redo
    this.historyStack = [];
    this.futureStack = [];
    this.maxHistory = 50;

    // View & UI state
    this.activeTab = 'input'; // input | timetable | notes | hours | theory | orig_source | patched_source | diff
    this.timetableBuoi = 'all'; // all | Sang | Chieu
    this.filterSubject = '';

    // Trạng thái đã chỉnh sửa
    this.isDirty = false;

    // Event listeners
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(eventType, payload) {
    this.listeners.forEach(l => l(eventType, payload, this));
  }

  /**
   * Khởi tạo state từ source code
   */
  loadFromSource(sourceCode, isSample = false) {
    const parseResult = SourcePatcher.parseSource(sourceCode);
    if (!parseResult.success) {
      return { success: false, error: parseResult.error };
    }

    this.originalSource = sourceCode;
    this.parsedBlocks = parseResult.blocks;

    // Nạp dữ liệu
    this.tkb = JSON.parse(JSON.stringify(parseResult.blocks['TKB_JSON']?.value || []));
    this.ghiChuChieu = JSON.parse(JSON.stringify(parseResult.blocks['GHI_CHU_CHIEU']?.value || { 1: "", 2: "", 3: "", 4: "", 5: "" }));
    this.gioChieu = JSON.parse(JSON.stringify(parseResult.blocks['GIO_CHIEU']?.value || {}));
    this.monLyThuyet = JSON.parse(JSON.stringify(parseResult.blocks['MON_LY_THUYET']?.value || []));

    // Reset history
    this.historyStack = [];
    this.futureStack = [];
    this.isDirty = false;

    // Lưu snapshot đầu tiên
    this.saveHistorySnapshot(false);

    // Lưu vào LocalStorage nếu không phải là draft tạm
    this.saveToLocalStorage();

    this.notify('LOAD_SOURCE', { isSample });
    return { success: true, count: this.tkb.length };
  }

  /**
   * Lưu snapshot vào lịch sử phục vụ Undo
   */
  saveHistorySnapshot(markDirty = true) {
    const snapshot = {
      tkb: JSON.parse(JSON.stringify(this.tkb)),
      ghiChuChieu: JSON.parse(JSON.stringify(this.ghiChuChieu)),
      gioChieu: JSON.parse(JSON.stringify(this.gioChieu)),
      monLyThuyet: JSON.parse(JSON.stringify(this.monLyThuyet)),
      timestamp: Date.now()
    };

    this.historyStack.push(snapshot);
    if (this.historyStack.length > this.maxHistory) {
      this.historyStack.shift();
    }

    // Khi người dùng làm thao tác mới, xóa tương lai (future)
    this.futureStack = [];

    if (markDirty) {
      this.isDirty = true;
      this.saveToLocalStorage();
      this.notify('DATA_CHANGED', snapshot);
    }
  }

  /**
   * Thực hiện Hoàn tác (Undo)
   */
  undo() {
    if (this.historyStack.length <= 1) {
      return false; // Không còn thao tác nào để undo
    }

    // Đưa snapshot hiện tại vào futureStack
    const current = this.historyStack.pop();
    this.futureStack.push(current);

    // Lấy snapshot trước đó
    const previous = this.historyStack[this.historyStack.length - 1];
    this.tkb = JSON.parse(JSON.stringify(previous.tkb));
    this.ghiChuChieu = JSON.parse(JSON.stringify(previous.ghiChuChieu));
    this.gioChieu = JSON.parse(JSON.stringify(previous.gioChieu));
    this.monLyThuyet = JSON.parse(JSON.stringify(previous.monLyThuyet));

    this.isDirty = true;
    this.saveToLocalStorage();
    this.notify('UNDO', previous);
    return true;
  }

  /**
   * Thực hiện Làm lại (Redo)
   */
  redo() {
    if (this.futureStack.length === 0) {
      return false;
    }

    const next = this.futureStack.pop();
    this.historyStack.push(next);

    this.tkb = JSON.parse(JSON.stringify(next.tkb));
    this.ghiChuChieu = JSON.parse(JSON.stringify(next.ghiChuChieu));
    this.gioChieu = JSON.parse(JSON.stringify(next.gioChieu));
    this.monLyThuyet = JSON.parse(JSON.stringify(next.monLyThuyet));

    this.isDirty = true;
    this.saveToLocalStorage();
    this.notify('REDO', next);
    return true;
  }

  canUndo() {
    return this.historyStack.length > 1;
  }

  canRedo() {
    return this.futureStack.length > 0;
  }

  /**
   * Lấy full source sau khi patch
   */
  getPatchedSource() {
    if (!this.originalSource) return "";
    return SourcePatcher.patchOriginalSource(this.originalSource, {
      tkb: this.tkb,
      ghiChuChieu: this.ghiChuChieu,
      gioChieu: this.gioChieu,
      monLyThuyet: this.monLyThuyet
    });
  }

  /**
   * Thao tác trên TKB: Cập nhật một tiết học
   */
  updatePeriod(index, updatedData) {
    if (index >= 0 && index < this.tkb.length) {
      this.tkb[index] = { ...this.tkb[index], ...updatedData };
      this.saveHistorySnapshot(true);
      return true;
    }
    return false;
  }

  /**
   * Thao tác trên TKB: Thêm tiết học mới
   */
  addPeriod(newPeriod) {
    this.tkb.push({
      thu: Number(newPeriod.thu) || 2,
      buoi: newPeriod.buoi || "Sáng",
      tiet: Number(newPeriod.tiet) || 1,
      mon: newPeriod.mon || "",
      phong: newPeriod.phong || "",
      gv: newPeriod.gv || "",
      ghiChu: newPeriod.ghiChu || ""
    });
    this.saveHistorySnapshot(true);
  }

  /**
   * Thao tác trên TKB: Xóa một tiết học
   */
  deletePeriod(index) {
    if (index >= 0 && index < this.tkb.length) {
      this.tkb.splice(index, 1);
      this.saveHistorySnapshot(true);
      return true;
    }
    return false;
  }

  /**
   * Thao tác trên TKB: Nhân bản tiết học
   */
  duplicatePeriod(index) {
    if (index >= 0 && index < this.tkb.length) {
      const cloned = JSON.parse(JSON.stringify(this.tkb[index]));
      // Tìm tiết tiếp theo trống
      cloned.tiet = Math.min(5, (cloned.tiet || 1) + 1);
      cloned.ghiChu = cloned.ghiChu ? `${cloned.ghiChu} (bản sao)` : '(bản sao)';
      this.tkb.push(cloned);
      this.saveHistorySnapshot(true);
      return true;
    }
    return false;
  }

  /**
   * Thao tác trên GHI_CHU_CHIEU
   */
  updateGhiChuChieu(tiet, text) {
    this.ghiChuChieu[tiet] = text;
    this.saveHistorySnapshot(true);
  }

  /**
   * Thao tác trên GIO_CHIEU
   */
  updateGioChieu(tiet, batDau, ketThuc) {
    if (!this.gioChieu[tiet]) {
      this.gioChieu[tiet] = {};
    }
    this.gioChieu[tiet].batDau = batDau;
    this.gioChieu[tiet].ketThuc = ketThuc;
    this.saveHistorySnapshot(true);
  }

  /**
   * Thao tác trên MON_LY_THUYET: Thêm môn
   */
  addMonLyThuyet(subjectName) {
    const trimmed = (subjectName || '').trim();
    if (!trimmed || this.monLyThuyet.includes(trimmed)) return false;
    this.monLyThuyet.push(trimmed);
    this.saveHistorySnapshot(true);
    return true;
  }

  /**
   * Thao tác trên MON_LY_THUYET: Xóa môn
   */
  removeMonLyThuyet(subjectName) {
    const idx = this.monLyThuyet.indexOf(subjectName);
    if (idx !== -1) {
      this.monLyThuyet.splice(idx, 1);
      this.saveHistorySnapshot(true);
      return true;
    }
    return false;
  }

  /**
   * Thao tác trên MON_LY_THUYET: Di chuyển vị trí
   */
  moveMonLyThuyet(fromIndex, toIndex) {
    if (fromIndex >= 0 && fromIndex < this.monLyThuyet.length &&
        toIndex >= 0 && toIndex < this.monLyThuyet.length) {
      const item = this.monLyThuyet.splice(fromIndex, 1)[0];
      this.monLyThuyet.splice(toIndex, 0, item);
      this.saveHistorySnapshot(true);
      return true;
    }
    return false;
  }

  // --- LOCAL STORAGE AUTO-SAVE ---
  static STORAGE_KEY = "TKB_SOURCE_EDITOR_V1_DRAFT";

  saveToLocalStorage() {
    try {
      const data = {
        originalSource: this.originalSource,
        tkb: this.tkb,
        ghiChuChieu: this.ghiChuChieu,
        gioChieu: this.gioChieu,
        monLyThuyet: this.monLyThuyet,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(AppStateManager.STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("Không thể lưu draft vào localStorage:", err);
    }
  }

  loadDraftFromLocalStorage() {
    try {
      const raw = localStorage.getItem(AppStateManager.STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data.originalSource) return null;

      this.originalSource = data.originalSource;
      this.tkb = data.tkb || [];
      this.ghiChuChieu = data.ghiChuChieu || { 1: "", 2: "", 3: "", 4: "", 5: "" };
      this.gioChieu = data.gioChieu || {};
      this.monLyThuyet = data.monLyThuyet || [];

      // Parse blocks
      const parseResult = SourcePatcher.parseSource(this.originalSource);
      if (parseResult.success) {
        this.parsedBlocks = parseResult.blocks;
      }

      this.historyStack = [];
      this.futureStack = [];
      this.saveHistorySnapshot(false);
      this.isDirty = true;

      this.notify('RESTORE_DRAFT', data);
      return data;
    } catch (err) {
      console.error("Lỗi khi khôi phục draft:", err);
      return null;
    }
  }

  hasDraft() {
    return !!localStorage.getItem(AppStateManager.STORAGE_KEY);
  }

  clearDraft() {
    try {
      localStorage.removeItem(AppStateManager.STORAGE_KEY);
      this.notify('DRAFT_CLEARED');
    } catch (e) {}
  }
}

if (typeof window !== 'undefined') {
  window.AppStateManager = AppStateManager;
}
