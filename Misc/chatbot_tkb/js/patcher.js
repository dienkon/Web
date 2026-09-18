/**
 * TKB SOURCE PATCHER ENGINE
 * 
 * Nguyên tắc cốt lõi:
 * 1. BẢO TOÀN 100% SOURCE GỐC
 * 2. CHỈ THAY THẾ CHÍNH XÁC VÙNG KÝ TỰ CỦA DỮ LIỆU ĐƯỢC CHỈNH (slice & splice)
 * 3. BẢO TỒN TẤT CẢ COMMENT, FUNCTION, LOGIC VÀ `result`
 * 4. KHÔNG FORMAT LẠI TOÀN BỘ FILE NGOÀI VÙNG DỮ LIỆU
 */

class SourcePatcher {
  /**
   * Quét và tìm vị trí bắt đầu & kết thúc của một cặp ngoặc {...} hoặc [...]
   * Có bỏ qua comment (//..., /*...*\/) và chuỗi ('...', "...", `...`)
   */
  static findBalancedEnclosure(source, startIndex, openChar, closeChar) {
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let inLineComment = false;
    let inBlockComment = false;
    let foundOpen = false;
    let openIndex = -1;

    for (let i = startIndex; i < source.length; i++) {
      const char = source[i];
      const prevChar = i > 0 ? source[i - 1] : '';
      const nextChar = i + 1 < source.length ? source[i + 1] : '';

      // Xử lý comment
      if (inLineComment) {
        if (char === '\n') inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (char === '*' && nextChar === '/') {
          inBlockComment = false;
          i++;
        }
        continue;
      }

      // Xử lý string
      if (inString) {
        if (char === stringChar && prevChar !== '\\') {
          inString = false;
        }
        continue;
      }

      // Bắt đầu comment
      if (char === '/' && nextChar === '/') {
        inLineComment = true;
        i++;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        i++;
        continue;
      }

      // Bắt đầu string
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
        continue;
      }

      // Tìm ký tự mở ngoặc đầu tiên
      if (!foundOpen) {
        if (char === openChar) {
          foundOpen = true;
          openIndex = i;
          depth = 1;
        }
        continue;
      }

      // Đếm độ sâu ngoặc
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          return {
            start: openIndex,
            end: i + 1
          };
        }
      }
    }

    return null;
  }

  /**
   * Tìm vị trí khai báo của biến (const / let / var)
   */
  static locateBlock(source, varName, expectedType = 'object') {
    // Regex tìm từ khóa khai báo
    const regex = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=`, 'g');
    const match = regex.exec(source);

    if (!match) return null;

    const equalsPos = match.index + match[0].length;
    const openChar = expectedType === 'array' ? '[' : '{';
    const closeChar = expectedType === 'array' ? ']' : '}';

    const range = this.findBalancedEnclosure(source, equalsPos, openChar, closeChar);
    if (!range) return null;

    const rawText = source.slice(range.start, range.end);
    let parsedValue = null;

    try {
      // Evaluate an toàn nội dung block data
      parsedValue = new Function(`"use strict"; return (${rawText});`)();
    } catch (err) {
      console.warn(`Lỗi khi parse block ${varName}:`, err);
      return null;
    }

    return {
      name: varName,
      type: expectedType,
      declStart: match.index,
      valueStart: range.start,
      valueEnd: range.end,
      rawText: rawText,
      value: parsedValue
    };
  }

  /**
   * Phân tích toàn bộ các block dữ liệu có thể chỉnh sửa trong source
   */
  static parseSource(source) {
    if (!source || typeof source !== 'string') {
      return {
        success: false,
        error: "Source code trống hoặc không hợp lệ"
      };
    }

    const blocks = {};
    const foundNames = [];

    // Danh sách các block cần tìm kiếm
    const targetBlocks = [
      { name: 'GHI_CHU_CHIEU', type: 'object' },
      { name: 'TKB_JSON', type: 'array' },
      { name: 'GIO_CHIEU', type: 'object' },
      { name: 'MON_LY_THUYET', type: 'array' },
      { name: 'TAT_CA_TIET_CHIEU', type: 'array' },
      { name: 'TEN_THU', type: 'object' },
      { name: 'WEEKDAY_MAP', type: 'object' }
    ];

    for (const target of targetBlocks) {
      const info = this.locateBlock(source, target.name, target.type);
      if (info) {
        blocks[target.name] = info;
        foundNames.push(target.name);
      }
    }

    // Kiểm tra tối thiểu phải có TKB_JSON
    if (!blocks['TKB_JSON']) {
      return {
        success: false,
        error: "Không nhận diện được block TKB_JSON trong source. Source gốc vẫn được bảo toàn nguyên vẹn. Vui lòng kiểm tra lại source code.",
        source: source,
        blocks: blocks
      };
    }

    return {
      success: true,
      blocks: blocks,
      foundList: foundNames,
      source: source,
      lineCount: source.split('\n').length
    };
  }

  /**
   * Serialize đối tượng GHI_CHU_CHIEU thành JS code chuẩn đẹp
   */
  static formatGhiChuChieu(obj, indent = "  ") {
    const keys = Object.keys(obj || {}).sort((a, b) => Number(a) - Number(b));
    if (keys.length === 0) return "{}";

    const lines = ["{"];
    keys.forEach((key, index) => {
      const val = obj[key] || "";
      const comma = index < keys.length - 1 ? "," : "";
      lines.push(`${indent}${key}: ${JSON.stringify(val)}${comma}`);
    });
    lines.push("}");
    return lines.join("\n");
  }

  /**
   * Serialize đối tượng GIO_CHIEU thành JS code chuẩn đẹp giống source gốc
   */
  static formatGioChieu(obj, indent = "  ") {
    const keys = Object.keys(obj || {}).sort((a, b) => Number(a) - Number(b));
    if (keys.length === 0) return "{}";

    const lines = ["{"];
    keys.forEach((key, index) => {
      const item = obj[key] || {};
      const comma = index < keys.length - 1 ? "," : "";
      lines.push(`${indent}${key}: {`);
      lines.push(`${indent}${indent}batDau: ${JSON.stringify(item.batDau || "")},`);
      lines.push(`${indent}${indent}ketThuc: ${JSON.stringify(item.ketThuc || "")}`);
      lines.push(`${indent}}${comma}`);
      if (index < keys.length - 1) lines.push("");
    });
    lines.push("}");
    return lines.join("\n");
  }

  /**
   * Serialize mảng MON_LY_THUYET thành JS code
   */
  static formatMonLyThuyet(arr, indent = "  ") {
    if (!Array.isArray(arr) || arr.length === 0) return "[]";
    const lines = ["["];
    arr.forEach((item, index) => {
      const comma = index < arr.length - 1 ? "," : "";
      lines.push(`${indent}${JSON.stringify(item)}${comma}`);
    });
    lines.push("]");
    return lines.join("\n");
  }

  /**
   * Serialize mảng TKB_JSON thành JS code chuẩn đẹp
   * Giữ đúng phong cách của source người dùng:
   * - thu: 1 (Thứ Hai), 2 (Thứ Ba), ...
   * - buoi: "sang" / "chieu"
   * - Không sinh trường rỗng thừa
   */
  static formatTkbJson(arr, indent = "  ", tenThuMap = null) {
    if (!Array.isArray(arr) || arr.length === 0) return "[]";

    // Phân loại thứ tự: Thứ -> Buổi (sang trước, chieu sau) -> Tiết
    const normalizeBuoi = b => {
      if (!b) return "sang";
      const lower = b.toLowerCase();
      return (lower === "sang" || lower === "sáng") ? "sang" : "chieu";
    };

    const sorted = [...arr].sort((a, b) => {
      const thuA = Number(a.thu);
      const thuB = Number(b.thu);
      // Nếu 0 là Chủ Nhật, sắp xếp 1-6 trước, 0 sau
      const orderA = thuA === 0 ? 99 : thuA;
      const orderB = thuB === 0 ? 99 : thuB;
      if (orderA !== orderB) return orderA - orderB;

      const buoiVal = b => (normalizeBuoi(b) === "sang" ? 1 : 2);
      if (normalizeBuoi(a.buoi) !== normalizeBuoi(b.buoi)) {
        return buoiVal(a.buoi) - buoiVal(b.buoi);
      }
      return (Number(a.tiet) || 0) - (Number(b.tiet) || 0);
    });

    const lines = ["["];
    let currentThu = null;
    let currentBuoi = null;

    sorted.forEach((item, index) => {
      const thuNum = Number(item.thu);
      const buoiKey = normalizeBuoi(item.buoi);

      // Phân nhóm Thứ
      if (thuNum !== currentThu) {
        currentThu = thuNum;
        currentBuoi = null;
        let thuName = "THỨ HAI";
        if (tenThuMap && tenThuMap[thuNum]) {
          thuName = tenThuMap[thuNum].toUpperCase();
        } else {
          const mapNames = { 0: "CHỦ NHẬT", 1: "THỨ HAI", 2: "THỨ BA", 3: "THỨ TƯ", 4: "THỨ NĂM", 5: "THỨ SÁU", 6: "THỨ BẢY", 7: "THỨ BẢY", 8: "CHỦ NHẬT" };
          thuName = mapNames[thuNum] || `THỨ ${thuNum}`;
        }

        if (index > 0) lines.push("");
        lines.push(`${indent}// =========================`);
        lines.push(`${indent}// ${thuName}`);
        lines.push(`${indent}// =========================`);
      }

      // Phân nhóm Buổi
      if (buoiKey !== currentBuoi) {
        currentBuoi = buoiKey;
        lines.push("");
        lines.push(`${indent}// ${buoiKey === "sang" ? "Sáng" : "Chiều"}`);
      }

      const isLast = index === sorted.length - 1;
      const comma = isLast ? "" : ",";

      lines.push(`${indent}{`);
      lines.push(`${indent}${indent}thu: ${thuNum},`);
      lines.push(`${indent}${indent}buoi: ${JSON.stringify(buoiKey)},`);
      lines.push(`${indent}${indent}tiet: ${Number(item.tiet) || 1},`);
      lines.push(`${indent}${indent}mon: ${JSON.stringify(item.mon || "")}${item.phong || item.giaoVien || item.gv || item.ghiChu ? ',' : ''}`);

      if (item.phong && item.phong.trim()) {
        const hasMore = !!(item.giaoVien || item.gv || item.ghiChu);
        lines.push(`${indent}${indent}phong: ${JSON.stringify(item.phong.trim())}${hasMore ? ',' : ''}`);
      }

      const gv = item.giaoVien || item.gv;
      if (gv && gv.trim()) {
        const hasMore = !!(item.ghiChu);
        lines.push(`${indent}${indent}giaoVien: ${JSON.stringify(gv.trim())}${hasMore ? ',' : ''}`);
      }

      if (item.ghiChu && item.ghiChu.trim()) {
        lines.push(`${indent}${indent}ghiChu: ${JSON.stringify(item.ghiChu.trim())}`);
      }

      lines.push(`${indent}}${comma}`);
    });

    lines.push("];");
    return lines.join("\n");
  }

  /**
   * PATCH SOURCE GỐC:
   * Nhận originalSource và dữ liệu mới, thực hiện thay thế chính xác phạm vi ký tự [valueStart, valueEnd]
   * của từng block.
   * TUYỆT ĐỐI KHÔNG ẢNH HƯỞNG ĐẾN BẤT KỲ DÒNG NÀO NGOÀI PHẠM VI BLOCK.
   */
  static patchOriginalSource(originalSource, newStates) {
    if (!originalSource) return "";

    // Phân tích lại vị trí block trên source hiện tại
    const parseResult = this.parseSource(originalSource);
    if (!parseResult.success) {
      console.error("Không thể patch vì không tìm thấy blocks:", parseResult.error);
      return originalSource;
    }

    const { blocks } = parseResult;
    const replacements = [];
    const tenThuMap = blocks['TEN_THU']?.value || null;

    // 1. Block TKB_JSON
    if (newStates.tkb && blocks['TKB_JSON']) {
      let formattedTkb = this.formatTkbJson(newStates.tkb, "  ", tenThuMap);
      // Bỏ dấu chấm phẩy cuối nếu enclosure chỉ bao gồm [...]
      if (formattedTkb.endsWith(";")) {
        formattedTkb = formattedTkb.slice(0, -1);
      }
      replacements.push({
        name: 'TKB_JSON',
        start: blocks['TKB_JSON'].valueStart,
        end: blocks['TKB_JSON'].valueEnd,
        newContent: formattedTkb
      });
    }

    // 2. Block GHI_CHU_CHIEU
    if (newStates.ghiChuChieu && blocks['GHI_CHU_CHIEU']) {
      replacements.push({
        name: 'GHI_CHU_CHIEU',
        start: blocks['GHI_CHU_CHIEU'].valueStart,
        end: blocks['GHI_CHU_CHIEU'].valueEnd,
        newContent: this.formatGhiChuChieu(newStates.ghiChuChieu)
      });
    }

    // 3. Block GIO_CHIEU
    if (newStates.gioChieu && blocks['GIO_CHIEU']) {
      replacements.push({
        name: 'GIO_CHIEU',
        start: blocks['GIO_CHIEU'].valueStart,
        end: blocks['GIO_CHIEU'].valueEnd,
        newContent: this.formatGioChieu(newStates.gioChieu)
      });
    }

    // 4. Block MON_LY_THUYET
    if (newStates.monLyThuyet && blocks['MON_LY_THUYET']) {
      replacements.push({
        name: 'MON_LY_THUYET',
        start: blocks['MON_LY_THUYET'].valueStart,
        end: blocks['MON_LY_THUYET'].valueEnd,
        newContent: this.formatMonLyThuyet(newStates.monLyThuyet)
      });
    }

    // Sắp xếp các đoạn cần thay thế từ CUỐI file lên ĐẦU file
    // Điều này đảm bảo việc thay thế block sau không làm lệch vị trí ký tự của block trước!
    replacements.sort((a, b) => b.start - a.start);

    let finalSource = originalSource;
    for (const rep of replacements) {
      finalSource = finalSource.slice(0, rep.start) + rep.newContent + finalSource.slice(rep.end);
    }

    return finalSource;
  }
}

// Xuất ra window cho browser sử dụng
if (typeof window !== 'undefined') {
  window.SourcePatcher = SourcePatcher;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SourcePatcher;
}
