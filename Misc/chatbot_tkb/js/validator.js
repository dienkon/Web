/**
 * VALIDATION ENGINE FOR TKB SOURCE EDITOR
 * Kiểm tra tính hợp lệ của dữ liệu trước khi xuất file
 */

class Validator {
  static normalizeBuoi(b) {
    if (!b) return 'sang';
    const lower = b.toLowerCase().trim();
    return (lower === 'sang' || lower === 'sáng') ? 'sang' : 'chieu';
  }

  /**
   * Kiểm tra toàn diện dữ liệu thời khóa biểu và các block
   */
  static validateAll(state, finalSource) {
    const errors = [];
    const warnings = [];

    // 1. Kiểm tra mảng TKB
    if (!state.tkb || !Array.isArray(state.tkb)) {
      errors.push({
        field: 'TKB_JSON',
        message: 'Dữ liệu thời khóa biểu (TKB_JSON) không phải là một danh sách hợp lệ.'
      });
    } else {
      const slotMap = new Map();

      state.tkb.forEach((item, index) => {
        const thuNum = Number(item.thu);
        const tietNum = Number(item.tiet);
        const buoiNorm = this.normalizeBuoi(item.buoi);

        // Kiểm tra thứ (hỗ trợ cả hệ 0-6 lẫn hệ 2-8)
        if (isNaN(thuNum) || thuNum < 0 || thuNum > 8) {
          errors.push({
            field: `TKB[${index}]`,
            message: `Tiết học "${item.mon || 'Chưa đặt tên'}" có giá trị Thứ (${item.thu}) không hợp lệ (phải từ 0 đến 8).`
          });
        }

        // Kiểm tra tiết
        if (isNaN(tietNum) || tietNum < 1 || tietNum > 10) {
          errors.push({
            field: `TKB[${index}]`,
            message: `Tiết học "${item.mon || 'Chưa đặt tên'}" có số Tiết (${item.tiet}) không hợp lệ (phải từ 1 đến 10).`
          });
        }

        // Kiểm tra tên môn
        if (!item.mon || !item.mon.trim()) {
          warnings.push({
            field: `TKB[${index}]`,
            message: `Tiết học thứ ${thuNum}, buổi ${item.buoi}, tiết ${tietNum} đang để trống tên môn học.`
          });
        }

        // Kiểm tra trùng lặp thu + buoi + tiet
        const key = `${thuNum}_${buoiNorm}_${tietNum}`;
        if (slotMap.has(key)) {
          const prevItem = slotMap.get(key);
          errors.push({
            field: 'DUPLICATE_SLOT',
            message: `Trùng lặp tiết học: Thứ ${thuNum} / ${buoiNorm === 'sang' ? 'Sáng' : 'Chiều'} / Tiết ${tietNum} đã có môn "${prevItem.mon}", không thể thêm môn "${item.mon}".`
          });
        } else {
          slotMap.set(key, item);
        }
      });
    }

    // 2. Kiểm tra giờ chiều (GIO_CHIEU)
    if (state.gioChieu && typeof state.gioChieu === 'object') {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      for (const [tiet, times] of Object.entries(state.gioChieu)) {
        if (times) {
          if (times.batDau && !timeRegex.test(times.batDau.trim())) {
            warnings.push({
              field: `GIO_CHIEU[${tiet}]`,
              message: `Giờ bắt đầu tiết ${tiet} (${times.batDau}) chưa đúng định dạng HH:mm.`
            });
          }
          if (times.ketThuc && !timeRegex.test(times.ketThuc.trim())) {
            warnings.push({
              field: `GIO_CHIEU[${tiet}]`,
              message: `Giờ kết thúc tiết ${tiet} (${times.ketThuc}) chưa đúng định dạng HH:mm.`
            });
          }
        }
      }
    }

    // 3. Kiểm tra cú pháp JavaScript của source sau khi patch
    if (finalSource) {
      // Kiểm tra có result = {...} không
      if (!finalSource.includes('result =')) {
        warnings.push({
          field: 'RESULT_MISSING',
          message: 'Không phát hiện phần gán "result =" trong source code.'
        });
      }

      // Kiểm tra syntax bằng new Function()
      try {
        let result;
        new Function(finalSource);
      } catch (syntaxErr) {
        errors.push({
          field: 'SYNTAX_ERROR',
          message: `Lỗi cú pháp JavaScript trong source sau khi patch: ${syntaxErr.message}`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  }

  /**
   * Kiểm tra trùng slot nhanh khi thêm/sửa một tiết học trong modal
   */
  static checkDuplicateSlot(tkbList, targetItem, currentIndex = -1) {
    const targetThu = Number(targetItem.thu);
    const targetBuoi = this.normalizeBuoi(targetItem.buoi);
    const targetTiet = Number(targetItem.tiet);

    const duplicate = tkbList.find((item, idx) => {
      if (idx === currentIndex) return false;
      return Number(item.thu) === targetThu &&
             this.normalizeBuoi(item.buoi) === targetBuoi &&
             Number(item.tiet) === targetTiet;
    });

    if (duplicate) {
      return {
        isDuplicate: true,
        message: `Tiết học này đã tồn tại: Thứ ${targetThu} / ${targetBuoi === 'sang' ? 'Sáng' : 'Chiều'} / Tiết ${targetTiet} (Môn: ${duplicate.mon})`
      };
    }

    return { isDuplicate: false };
  }
}

if (typeof window !== 'undefined') {
  window.Validator = Validator;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validator;
}
