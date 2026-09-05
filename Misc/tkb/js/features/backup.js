import { DAY_NAMES, DAY_ORDER } from "../utils/format.js";
import { buildMergedBlocks } from "../core/merge-engine.js";
import { analyticsEngine } from "./analytics-engine.js";

const EXCEL_PASTEL_COLORS = {
  blue: { fill: "DBEAFE", text: "1E40AF" },
  sky: { fill: "E0F2FE", text: "0369A1" },
  cyan: { fill: "CFFAFE", text: "0E7490" },
  teal: { fill: "CCFBF1", text: "0F766E" },
  emerald: { fill: "D1FAE5", text: "047857" },
  green: { fill: "DCFCE7", text: "15803D" },
  lime: { fill: "ECFCCB", text: "3F6212" },
  yellow: { fill: "FEF9C3", text: "854D0E" },
  amber: { fill: "FEF3C7", text: "92400E" },
  orange: { fill: "FFEDD5", text: "9A3412" },
  red: { fill: "FEE2E2", text: "991B1B" },
  rose: { fill: "FFE4E6", text: "9F1239" },
  pink: { fill: "FCE7F3", text: "9D174D" },
  fuchsia: { fill: "FAE8FF", text: "86198F" },
  purple: { fill: "F3E8FF", text: "6B21A8" },
  violet: { fill: "EDE9FE", text: "5B21B6" },
  indigo: { fill: "E0E7FF", text: "3730A3" },
  slate: { fill: "F1F5F9", text: "334155" },
};

export class BackupFeature {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
  }

  exportExcel() {
    if (typeof XLSX === "undefined") {
      alert("Thư viện SheetJS chưa sẵn sàng.");
      return;
    }

    const state = this.store.getState();
    const slots = state.timeSlots;
    const wb = XLSX.utils.book_new();

    // Border Styles
    const borderDark = {
      top: { style: "thin", color: { rgb: "94A3B8" } },
      bottom: { style: "thin", color: { rgb: "94A3B8" } },
      left: { style: "thin", color: { rgb: "94A3B8" } },
      right: { style: "thin", color: { rgb: "94A3B8" } },
    };
    const borderHeader = {
      top: { style: "medium", color: { rgb: "0369A1" } },
      bottom: { style: "medium", color: { rgb: "0369A1" } },
      left: { style: "thin", color: { rgb: "38BDF8" } },
      right: { style: "thin", color: { rgb: "38BDF8" } },
    };
    const borderSoft = {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    };
    const thinBorder = borderDark;

    // Calculate analytics metrics
    const analytics = analyticsEngine.computeAll(state.schedule, slots, state.lessons);
    const dailyMap = new Map();
    (analytics.daily || analytics.dailyStats || []).forEach((d) => dailyMap.set(d.day, d));

    // =========================================================================
    // SHEET 1: THỜI KHÓA BIỂU CHUẨN KÈM HEATMAP MẬT ĐỘ (ALL-IN-ONE MASTER SHEET)
    // =========================================================================
    const ws1 = {};
    const merges1 = [];
    const rowHeights = [];
    let r = 0;

    const setC1 = (row, col, val, style = null) => {
      const ref = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = {
        v: val !== undefined && val !== null ? val : "",
        t: typeof val === "number" ? "n" : "s",
      };
      if (style) cell.s = style;
      ws1[ref] = cell;
    };

    // Row 0: Grand Title Banner
    setC1(r, 0, "THỜI KHÓA BIỂU HỌC TẬP & HOẠT ĐỘNG", {
      font: { name: "Arial", sz: 16, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F172A" } },
      alignment: { vertical: "center", horizontal: "center" },
    });
    for (let c = 1; c <= 8; c++) {
      setC1(r, c, "", { fill: { fgColor: { rgb: "0F172A" } } });
    }
    merges1.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
    rowHeights.push({ hpt: 36 });
    r++;

    // Row 1: Subtitle Info
    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const totalSessions = state.schedule.length;
    const completedSessions = state.schedule.filter((s) => s.status === "completed").length;
    const completionPercent = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    setC1(
      r,
      0,
      `Chuẩn hóa gộp khối liên tiếp • Heatmap mật độ phân bổ • Ngày xuất: ${dateStr} • Tổng số: ${totalSessions} ca (${completedSessions} ca hoàn thành - ${completionPercent}%)`,
      {
        font: { name: "Arial", sz: 10, italic: true, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: "F1F5F9" } },
        alignment: { vertical: "center", horizontal: "center" },
      }
    );
    for (let c = 1; c <= 8; c++) {
      setC1(r, c, "", { fill: { fgColor: { rgb: "F1F5F9" } } });
    }
    merges1.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } });
    rowHeights.push({ hpt: 24 });
    r++;

    // Row 2: Spacer
    for (let c = 0; c <= 8; c++) setC1(r, c, "", { fill: { fgColor: { rgb: "FFFFFF" } } });
    merges1.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 8 } });
    rowHeights.push({ hpt: 8 });
    r++;

    // Row 3: Table Column Headers (Symmetrical Days Col 2..8)
    const headers = ["Ca học", "Khung giờ", ...DAY_ORDER.map((d) => DAY_NAMES[d])];
    headers.forEach((h, colIdx) => {
      setC1(r, colIdx, h, {
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0284C7" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderHeader,
      });
    });
    rowHeights.push({ hpt: 28 });
    r++;

    // Rows for each time slot (Timetable Grid)
    const slotStartRow = r;
    const occupiedGrid = Array.from({ length: slots.length }, () => Array(DAY_ORDER.length).fill(false));

    slots.forEach((slot, sIdx) => {
      const curRow = slotStartRow + sIdx;
      // Col 0: Slot Label
      setC1(curRow, 0, slot.label, {
        font: { name: "Arial", sz: 10, bold: true, color: { rgb: "1E293B" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
      // Col 1: Slot Time
      setC1(curRow, 1, `${slot.start} - ${slot.end}`, {
        font: { name: "Arial", sz: 9.5, color: { rgb: "64748B" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
      rowHeights.push({ hpt: 52 }); // Generous card height like web app
    });

    // Populate day columns with Merged Blocks & Colors
    DAY_ORDER.forEach((day, dayIdx) => {
      const colIdx = 2 + dayIdx;
      const blocks = buildMergedBlocks(state.schedule, slots, day, true);

      blocks.forEach((block) => {
        const startR = slotStartRow + block.startSlotIndex;
        const endR = slotStartRow + block.endSlotIndex;
        const colScheme = EXCEL_PASTEL_COLORS[block.color] || EXCEL_PASTEL_COLORS.blue;

        // Multi-slot vertical merge
        if (block.slotCount > 1) {
          merges1.push({ s: { r: startR, c: colIdx }, e: { r: endR, c: colIdx } });
        }

        const teacherInfo = block.teacher && block.teacher !== "-" ? `GV: ${block.teacher}` : "";
        const roomInfo = block.room && block.room !== "-" ? `P: ${block.room}` : "";
        const subDetails = [teacherInfo, roomInfo].filter(Boolean).join(" • ");
        const statusText = block.status === "completed" ? "✓ Đã xong" : "⏳ Kế hoạch";
        const durationText = block.durationMinutes ? `${block.durationMinutes}p` : "";
        const metaLine = [statusText, durationText].filter(Boolean).join(" • ");
        const cellText = `${block.subject}\n${subDetails ? subDetails + "\n" : ""}${metaLine}`;

        // Color and border EVERY cell in the merged area for seamless Excel rendering
        for (let rowI = startR; rowI <= endR; rowI++) {
          occupiedGrid[rowI - slotStartRow][dayIdx] = true;
          setC1(rowI, colIdx, rowI === startR ? cellText : "", {
            font: {
              name: "Arial",
              sz: 10,
              bold: rowI === startR,
              color: { rgb: colScheme.text },
            },
            fill: { fgColor: { rgb: colScheme.fill } },
            alignment: { vertical: "center", horizontal: "center", wrapText: true },
            border: borderDark,
          });
        }
      });

      // Fill empty slots for this day
      for (let sIdx = 0; sIdx < slots.length; sIdx++) {
        if (!occupiedGrid[sIdx][dayIdx]) {
          const rowI = slotStartRow + sIdx;
          setC1(rowI, colIdx, "- Tự do -", {
            font: { name: "Arial", sz: 9, italic: true, color: { rgb: "94A3B8" } },
            fill: { fgColor: { rgb: "FFFFFF" } },
            border: borderSoft,
            alignment: { vertical: "center", horizontal: "center" },
          });
        }
      }
    });

    r = slotStartRow + slots.length;

    // =========================================================================
    // SECTION: EMBEDDED WORKLOAD HEATMAP & DAILY METRICS (IN MASTER SHEET 1)
    // =========================================================================

    // Row: MẬT ĐỘ TẢI HEATMAP
    setC1(r, 0, "MẬT ĐỘ TẢI / HEATMAP", {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E293B" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: borderDark,
    });
    setC1(r, 1, "", { fill: { fgColor: { rgb: "1E293B" } }, border: borderDark });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 1 } });

    DAY_ORDER.forEach((day, dayIdx) => {
      const d = dailyMap.get(day) || { workloadScore: 0, workloadLevel: "Nhẹ" };
      let heatBg = "DCFCE7";
      let heatText = "15803D";
      if (d.workloadScore > 80) {
        heatBg = "FEE2E2"; // Red
        heatText = "991B1B";
      } else if (d.workloadScore > 60) {
        heatBg = "FEF3C7"; // Amber
        heatText = "92400E";
      } else if (d.workloadScore > 30) {
        heatBg = "E0F2FE"; // Sky
        heatText = "0369A1";
      }

      setC1(r, 2 + dayIdx, `${d.workloadScore}đ (${d.workloadLevel})`, {
        font: { name: "Arial", sz: 10, bold: true, color: { rgb: heatText } },
        fill: { fgColor: { rgb: heatBg } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
    });
    rowHeights.push({ hpt: 26 });
    r++;

    // Row: TỔNG THỜI LƯỢNG HỌC
    setC1(r, 0, "TỔNG GIỜ HỌC", {
      font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "334155" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: borderDark,
    });
    setC1(r, 1, "", { fill: { fgColor: { rgb: "F1F5F9" } }, border: borderDark });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 1 } });

    DAY_ORDER.forEach((day, dayIdx) => {
      const d = dailyMap.get(day) || { totalHoursFormatted: 0, totalMinutes: 0 };
      setC1(r, 2 + dayIdx, `${d.totalHoursFormatted}h (${d.totalMinutes}p)`, {
        font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
    });
    rowHeights.push({ hpt: 24 });
    r++;

    // Row: SỐ CA & CHUỖI MAX
    setC1(r, 0, "SỐ CA & CHUỖI LIÊN TỤC", {
      font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "334155" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: borderDark,
    });
    setC1(r, 1, "", { fill: { fgColor: { rgb: "F1F5F9" } }, border: borderDark });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 1 } });

    DAY_ORDER.forEach((day, dayIdx) => {
      const d = dailyMap.get(day) || { sessionCount: 0, longestStreak: 0 };
      setC1(r, 2 + dayIdx, `${d.sessionCount} ca • Max ${d.longestStreak} tiết`, {
        font: { name: "Arial", sz: 9.5, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
    });
    rowHeights.push({ hpt: 24 });
    r++;

    // Row: NGHỈ GIẢI LAO
    setC1(r, 0, "NGHỈ GIẢI LAO TRONG NGÀY", {
      font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "334155" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: borderDark,
    });
    setC1(r, 1, "", { fill: { fgColor: { rgb: "F1F5F9" } }, border: borderDark });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 1 } });

    DAY_ORDER.forEach((day, dayIdx) => {
      const d = dailyMap.get(day) || { breakCount: 0, totalBreakMinutes: 0 };
      setC1(r, 2 + dayIdx, `${d.breakCount} lần (${d.totalBreakMinutes}p)`, {
        font: { name: "Arial", sz: 9.5, color: { rgb: "64748B" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
    });
    rowHeights.push({ hpt: 24 });
    r++;

    // Row: TIẾN ĐỘ HOÀN THÀNH
    setC1(r, 0, "TIẾN ĐỘ HOÀN THÀNH", {
      font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "065F46" } },
      fill: { fgColor: { rgb: "D1FAE5" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: borderDark,
    });
    setC1(r, 1, "", { fill: { fgColor: { rgb: "D1FAE5" } }, border: borderDark });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 1 } });

    DAY_ORDER.forEach((day, dayIdx) => {
      const d = dailyMap.get(day) || { completedCount: 0, sessionCount: 0 };
      const pct = d.sessionCount > 0 ? Math.round((d.completedCount / d.sessionCount) * 100) : 0;
      setC1(r, 2 + dayIdx, `${d.completedCount}/${d.sessionCount} ca (${pct}%)`, {
        font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "047857" } },
        fill: { fgColor: { rgb: "ECFDF5" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
    });
    rowHeights.push({ hpt: 24 });
    r++;

    // Row: Spacer
    for (let c = 0; c <= 8; c++) setC1(r, c, "", { fill: { fgColor: { rgb: "FFFFFF" } } });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 8 } });
    rowHeights.push({ hpt: 12 });
    r++;

    // =========================================================================
    // SECTION: WEEKLY KPI SUMMARY CARDS IN MASTER SHEET
    // =========================================================================
    setC1(r, 0, "BẢNG CHỈ SỐ TOÀN DIỆN TUẦN", {
      font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F172A" } },
      alignment: { vertical: "center", horizontal: "center" },
    });
    for (let c = 1; c <= 8; c++) setC1(r, c, "", { fill: { fgColor: { rgb: "0F172A" } } });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 8 } });
    rowHeights.push({ hpt: 26 });
    r++;

    const ov = analytics.overview || {};
    // KPI Card 1: Total Study Sessions
    setC1(r, 0, `TỔNG CA HỌC TUẦN\n${ov.totalSessions || 0} ca (${ov.totalStudyHours || 0} giờ)`, {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "0369A1" } },
      fill: { fgColor: { rgb: "E0F2FE" } },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: borderDark,
    });
    setC1(r, 1, "", { fill: { fgColor: { rgb: "E0F2FE" } }, border: borderDark });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 1 } });

    // KPI Card 2: Completion Rate
    setC1(r, 2, `TỶ LỆ HOÀN THÀNH\n${ov.completionRate || 0}% (${ov.completedSessions || 0}/${ov.totalSessions || 0} ca)`, {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "047857" } },
      fill: { fgColor: { rgb: "D1FAE5" } },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: borderDark,
    });
    setC1(r, 3, "", { fill: { fgColor: { rgb: "D1FAE5" } }, border: borderDark });
    merges1.push({ s: { r, c: 2 }, e: { r, c: 3 } });

    // KPI Card 3: Busiest Day
    const bDay = ov.busiestDay || { name: "--", minutes: 0 };
    setC1(r, 4, `NGÀY BẬN NHẤT\n${bDay.name} (${+(bDay.minutes / 60).toFixed(1)} giờ học)`, {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "B45309" } },
      fill: { fgColor: { rgb: "FEF3C7" } },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: borderDark,
    });
    setC1(r, 5, "", { fill: { fgColor: { rgb: "FEF3C7" } }, border: borderDark });
    merges1.push({ s: { r, c: 4 }, e: { r, c: 5 } });

    // KPI Card 4: Top Subject
    const topSub = ov.topSubject || { name: "--", count: 0 };
    setC1(r, 6, `MÔN HỌC NHIỀU NHẤT\n${topSub.name} (${topSub.count} ca)`, {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "6B21A8" } },
      fill: { fgColor: { rgb: "F3E8FF" } },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: borderDark,
    });
    for (let c = 7; c <= 8; c++) setC1(r, c, "", { fill: { fgColor: { rgb: "F3E8FF" } }, border: borderDark });
    merges1.push({ s: { r, c: 6 }, e: { r, c: 8 } });
    rowHeights.push({ hpt: 38 });
    r++;

    ws1["!merges"] = merges1;
    // Exactly balanced 9 columns: 2 time header columns + 7 identical width day columns
    ws1["!cols"] = [
      { wch: 14 }, // Ca học
      { wch: 16 }, // Khung giờ
      { wch: 26 }, // Thứ Hai
      { wch: 26 }, // Thứ Ba
      { wch: 26 }, // Thứ Tư
      { wch: 26 }, // Thứ Năm
      { wch: 26 }, // Thứ Sáu
      { wch: 26 }, // Thứ Bảy
      { wch: 26 }, // Chủ Nhật
    ];
    ws1["!rows"] = rowHeights;
    ws1["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: 8 } });

    XLSX.utils.book_append_sheet(wb, ws1, "Thời Khóa Biểu");

    // ==========================================
    // SHEET 2: MẬT ĐỘ HEATMAP THEO CA & NGÀY
    // ==========================================
    const wsHeatmap = {};
    const mergesHeatmap = [];
    let hr = 0;

    const setCH = (row, col, val, style = null) => {
      const ref = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = {
        v: val !== undefined && val !== null ? val : "",
        t: typeof val === "number" ? "n" : "s",
      };
      if (style) cell.s = style;
      wsHeatmap[ref] = cell;
    };

    setCH(hr, 0, "HEATMAP PHÂN BỔ MẬT ĐỘ HỌC TẬP", {
      font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F172A" } },
      alignment: { vertical: "center", horizontal: "center" },
    });
    for (let c = 1; c <= 8; c++) setCH(hr, c, "", { fill: { fgColor: { rgb: "0F172A" } } });
    mergesHeatmap.push({ s: { r: hr, c: 0 }, e: { r: hr, c: 8 } });
    hr++;

    setCH(
      hr,
      0,
      "Bản đồ nhiệt phản ánh mật độ phân bổ hoạt động giữa các ngày trong tuần (Xanh lá = Vừa, Vàng = Cao, Đỏ = Rất bận)",
      {
        font: { name: "Arial", sz: 9.5, italic: true, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: "F1F5F9" } },
        alignment: { vertical: "center", horizontal: "center" },
      }
    );
    for (let c = 1; c <= 8; c++) setCH(hr, c, "", { fill: { fgColor: { rgb: "F1F5F9" } } });
    mergesHeatmap.push({ s: { r: hr, c: 0 }, e: { r: hr, c: 8 } });
    hr++;

    headers.forEach((h, colIdx) => {
      setCH(hr, colIdx, h, {
        font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "334155" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: thinBorder,
      });
    });
    hr++;

    const heatmapStartRow = hr;
    slots.forEach((slot, sIdx) => {
      const curRow = heatmapStartRow + sIdx;
      setCH(curRow, 0, slot.label, {
        font: { name: "Arial", sz: 10, bold: true },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: thinBorder,
      });
      setCH(curRow, 1, `${slot.start} - ${slot.end}`, {
        font: { name: "Arial", sz: 9.5, color: { rgb: "64748B" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: thinBorder,
      });

      DAY_ORDER.forEach((day, dayIdx) => {
        const item = state.schedule.find((s) => s.slotId === `${day}-${slot.id}`);
        if (item) {
          setCH(curRow, 2 + dayIdx, item.subject, {
            font: { name: "Arial", sz: 10, bold: true, color: { rgb: "065F46" } },
            fill: { fgColor: { rgb: "A7F3D0" } }, // Bright emerald for active
            alignment: { vertical: "center", horizontal: "center" },
            border: thinBorder,
          });
        } else {
          setCH(curRow, 2 + dayIdx, "Trống", {
            font: { name: "Arial", sz: 9, color: { rgb: "94A3B8" } },
            fill: { fgColor: { rgb: "FFFFFF" } },
            alignment: { vertical: "center", horizontal: "center" },
            border: thinBorder,
          });
        }
      });
    });

    hr = heatmapStartRow + slots.length;
    wsHeatmap["!merges"] = mergesHeatmap;
    wsHeatmap["!cols"] = ws1["!cols"];
    wsHeatmap["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: hr, c: 8 } });
    XLSX.utils.book_append_sheet(wb, wsHeatmap, "Heatmap Mật Độ");

    // ==========================================
    // SHEET 3: THỐNG KÊ MÔN HỌC CHI TIẾT
    // ==========================================
    const detailHeaders = ["Thứ", "Ca học", "Môn học", "Phụ trách", "Phòng", "Khung giờ", "Trạng thái", "Ghi chú"];
    const detailRows = [];
    state.schedule.forEach((item) => {
      if (item.slotId) {
        const [d, slotId] = item.slotId.split("-");
        const slot = slots.find((s) => s.id === slotId);
        detailRows.push([
          DAY_NAMES[d] || "",
          slot?.label || "",
          item.subject || "",
          item.teacher || "",
          item.room || "",
          slot ? `${slot.start} - ${slot.end}` : "",
          item.status === "completed" ? "Đã hoàn thành" : "Dự kiến",
          item.notes || "",
        ]);
      }
    });

    const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    wsDetail["!cols"] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 16 },
      { wch: 16 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, "Danh Sách Chi Tiết");

    XLSX.writeFile(wb, `ThoiKhoaBieu_Chuan_${Date.now()}.xlsx`);
  }

  exportJSON() {
    const state = this.store.getState();
    const payload = {
      version: 5,
      exportedAt: new Date().toISOString(),
      lessons: state.lessons,
      schedule: state.schedule,
      timeSlots: state.timeSlots,
      settings: state.settings,
      goals: state.goals,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Schedule_Backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJSON(jsonString, replaceAll = false) {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data.schedule)) {
        throw new Error("File JSON không chứa trường schedule hợp lệ.");
      }

      this.storage.createSnapshot("Trước khi nhập file JSON");
      this.history.recordState();

      if (replaceAll) {
        this.store.hydrate(data);
      } else {
        // Merge: keep existing lessons, add new ones
        const state = this.store.getState();
        const existingSlotIds = new Set(state.schedule.map((s) => s.slotId));
        data.schedule.forEach((item) => {
          if (!existingSlotIds.has(item.slotId)) {
            state.schedule.push(item);
          }
        });
        if (Array.isArray(data.lessons)) {
          const existingLessonIds = new Set(state.lessons.map((l) => l.id));
          data.lessons.forEach((l) => {
            if (!existingLessonIds.has(l.id)) state.lessons.push(l);
          });
        }
      }

      this.storage.debouncedSave();
      return { success: true, count: data.schedule.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}
