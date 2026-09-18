/**
 * DIFF ENGINE FOR TKB SOURCE EDITOR
 * Tính toán và hiển thị sự khác biệt chính xác giữa Source Gốc và Source Sau Khi Chỉnh
 */

class DiffEngine {
  /**
   * Tính toán LCS (Longest Common Subsequence) theo từng dòng
   */
  static computeLineDiff(originalText, modifiedText) {
    const origLines = (originalText || '').split('\n');
    const modLines = (modifiedText || '').split('\n');

    const n = origLines.length;
    const m = modLines.length;

    // Tối ưu hóa: nếu 2 text giống hệt nhau
    if (originalText === modifiedText) {
      return {
        hasChanges: false,
        changesCount: 0,
        addedCount: 0,
        removedCount: 0,
        lines: origLines.map((line, idx) => ({
          type: 'unchanged',
          origLineNum: idx + 1,
          modLineNum: idx + 1,
          content: line
        }))
      };
    }

    // Xây dựng ma trận DP (giới hạn kích thước an toàn)
    // Để tối ưu bộ nhớ với file lớn (hàng trăm dòng), ta dùng mảng 1D hoặc chia block
    const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        if (origLines[i] === modLines[j]) {
          dp[i + 1][j + 1] = dp[i][j] + 1;
        } else {
          dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }

    // Truy vết ngược lại
    let i = n;
    let j = m;
    const result = [];
    let addedCount = 0;
    let removedCount = 0;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && origLines[i - 1] === modLines[j - 1]) {
        result.push({
          type: 'unchanged',
          origLineNum: i,
          modLineNum: j,
          content: origLines[i - 1]
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.push({
          type: 'added',
          origLineNum: null,
          modLineNum: j,
          content: modLines[j - 1]
        });
        addedCount++;
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        result.push({
          type: 'removed',
          origLineNum: i,
          modLineNum: null,
          content: origLines[i - 1]
        });
        removedCount++;
        i--;
      }
    }

    result.reverse();

    return {
      hasChanges: addedCount > 0 || removedCount > 0,
      changesCount: addedCount + removedCount,
      addedCount: addedCount,
      removedCount: removedCount,
      lines: result
    };
  }

  /**
   * Render HTML cho bảng Diff trực quan
   * filterOnlyChanges: chỉ hiển thị vùng có thay đổi kèm vài dòng ngữ cảnh xung quanh
   */
  static renderDiffHtml(diffResult, filterOnlyChanges = false, contextRadius = 4) {
    const { lines, hasChanges, addedCount, removedCount } = diffResult;

    if (!hasChanges) {
      return `
        <div class="diff-empty-state">
          <div class="empty-icon">✓</div>
          <h4>Hai bản source hoàn toàn giống nhau</h4>
          <p>Chưa có thay đổi nào so với source gốc.</p>
        </div>
      `;
    }

    // Xác định các dòng cần hiển thị nếu filterOnlyChanges = true
    const showFlags = Array(lines.length).fill(!filterOnlyChanges);
    if (filterOnlyChanges) {
      for (let idx = 0; idx < lines.length; idx++) {
        if (lines[idx].type === 'added' || lines[idx].type === 'removed') {
          for (let r = Math.max(0, idx - contextRadius); r <= Math.min(lines.length - 1, idx + contextRadius); r++) {
            showFlags[r] = true;
          }
        }
      }
    }

    let html = `
      <div class="diff-summary-bar">
        <span class="badge badge-success">+${addedCount} dòng thêm</span>
        <span class="badge badge-danger">-${removedCount} dòng xóa</span>
        <span class="diff-help-text">Chỉ highlight các block dữ liệu được chỉnh sửa</span>
      </div>
      <div class="diff-table-container">
        <table class="diff-table">
          <thead>
            <tr>
              <th class="col-num">Gốc</th>
              <th class="col-num">Mới</th>
              <th class="col-sign"></th>
              <th class="col-code">Nội dung mã nguồn</th>
            </tr>
          </thead>
          <tbody>
    `;

    let lastShownIndex = -1;

    for (let idx = 0; idx < lines.length; idx++) {
      if (!showFlags[idx]) {
        continue;
      }

      // Nếu có khoảng cách bị ẩn, thêm dòng separator (...)
      if (lastShownIndex !== -1 && idx > lastShownIndex + 1) {
        html += `
          <tr class="diff-row-separator">
            <td colspan="4">... (ẩn các dòng không thay đổi) ...</td>
          </tr>
        `;
      }
      lastShownIndex = idx;

      const item = lines[idx];
      let rowClass = 'diff-row-unchanged';
      let sign = ' ';
      if (item.type === 'added') {
        rowClass = 'diff-row-added';
        sign = '+';
      } else if (item.type === 'removed') {
        rowClass = 'diff-row-removed';
        sign = '-';
      }

      const escapedContent = (item.content || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      html += `
        <tr class="${rowClass}">
          <td class="col-num">${item.origLineNum || ''}</td>
          <td class="col-num">${item.modLineNum || ''}</td>
          <td class="col-sign">${sign}</td>
          <td class="col-code"><code>${escapedContent || ' '}</code></td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    return html;
  }
}

if (typeof window !== 'undefined') {
  window.DiffEngine = DiffEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiffEngine;
}
