/**
 * TKB SOURCE EDITOR - MAIN APPLICATION CONTROLLER
 * Xử lý toàn bộ logic giao diện, sự kiện người dùng và tích hợp các module
 */

document.addEventListener('DOMContentLoaded', () => {
  // Khởi tạo App State
  const state = new AppStateManager();

  // DOM Elements
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const viewPanes = document.querySelectorAll('.view-pane');
  const pageTitle = document.getElementById('current-page-title');
  const pageSubtitle = document.getElementById('current-page-subtitle');
  const sidebarLineCount = document.getElementById('sidebar-line-count');
  const sidebarPeriodCount = document.getElementById('sidebar-period-count');
  const sidebarTheoryCount = document.getElementById('sidebar-theory-count');
  const sidebarDiffBadge = document.getElementById('sidebar-diff-badge');
  const systemStatusDot = document.getElementById('system-status-dot');
  const systemStatusText = document.getElementById('system-status-text');

  // Input elements
  const sourceInputTextarea = document.getElementById('source-input-textarea');
  const inputLineNumbers = document.getElementById('input-line-numbers');
  const inputStatsText = document.getElementById('input-stats-text');
  const btnParseSource = document.getElementById('btn-parse-source');
  const btnClearInput = document.getElementById('btn-clear-input');
  const btnLoadSample = document.getElementById('btn-load-sample');
  const btnPasteClipboard = document.getElementById('btn-paste-clipboard');
  const fileInputJs = document.getElementById('file-input-js');
  const btnTriggerUpload = document.getElementById('btn-trigger-upload');

  // Timetable elements
  const tkbMatrixBody = document.getElementById('tkb-matrix-body');
  const buoiTabs = document.querySelectorAll('.buoi-tab');
  const timetableSearchBox = document.getElementById('timetable-search-box');
  const btnOpenAddPeriod = document.getElementById('btn-open-add-period');

  // Notes, Hours, Theory elements
  const notesInputsList = document.getElementById('notes-inputs-list');
  const hoursTableBody = document.getElementById('hours-table-body');
  const theoryChipsContainer = document.getElementById('theory-chips-container');
  const theoryAddInput = document.getElementById('theory-add-input');
  const btnAddTheory = document.getElementById('btn-add-theory');

  // Code Viewers elements
  const origCodeContent = document.getElementById('orig-code-content');
  const origLineNumbers = document.getElementById('orig-line-numbers');
  const origStatsBadge = document.getElementById('orig-stats-badge');
  const btnCopyOrig = document.getElementById('btn-copy-orig');

  const patchedCodeContent = document.getElementById('patched-code-content');
  const patchedLineNumbers = document.getElementById('patched-line-numbers');
  const patchedStatsBadge = document.getElementById('patched-stats-badge');
  const btnCopyPatched = document.getElementById('btn-copy-patched');
  const btnDownloadPatched = document.getElementById('btn-download-patched');

  // Diff elements
  const diffContentWrapper = document.getElementById('diff-content-wrapper');
  const diffFilterToggle = document.getElementById('diff-filter-toggle');

  // History & Action elements
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnRestoreDraft = document.getElementById('btn-restore-draft');
  const btnClearDraft = document.getElementById('btn-clear-draft');
  const btnQuickCopy = document.getElementById('btn-quick-copy');
  const btnQuickDownload = document.getElementById('btn-quick-download');
  const sidebarBtnExport = document.getElementById('sidebar-btn-export');

  // Period Modal elements
  const periodModal = document.getElementById('period-modal');
  const periodModalTitle = document.getElementById('period-modal-title');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const modalBtnCancel = document.getElementById('modal-btn-cancel');
  const modalBtnSave = document.getElementById('modal-btn-save');
  const modalBtnDelete = document.getElementById('modal-btn-delete');
  const duplicateAlert = document.getElementById('duplicate-alert');
  const duplicateAlertMsg = document.getElementById('duplicate-alert-msg');

  const modalFieldThu = document.getElementById('modal-field-thu');
  const modalFieldBuoi = document.getElementById('modal-field-buoi');
  const modalFieldTiet = document.getElementById('modal-field-tiet');
  const modalFieldMon = document.getElementById('modal-field-mon');
  const modalFieldPhong = document.getElementById('modal-field-phong');
  const modalFieldGv = document.getElementById('modal-field-gv');
  const modalFieldGhichu = document.getElementById('modal-field-ghichu');
  const modalQuickSubjects = document.getElementById('modal-quick-subjects');

  // Validation Modal elements
  const validationModal = document.getElementById('validation-modal');
  const valModalBody = document.getElementById('val-modal-body');
  const btnCloseValModal = document.getElementById('btn-close-val-modal');
  const btnValModalOk = document.getElementById('btn-val-modal-ok');

  // Modal State
  let editingPeriodIndex = -1; // -1 = thêm mới

  // ============================================================
  // TOAST NOTIFICATIONS
  // ============================================================
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease-out';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // ============================================================
  // TAB NAVIGATION
  // ============================================================
  const tabTitles = {
    input: { title: 'Dán Source TKB', sub: 'Dán nguyên file JavaScript gốc vào đây để phân tích dữ liệu' },
    timetable: { title: 'Thời Khóa Biểu', sub: 'Chỉnh sửa ma trận các tiết học trong tuần trực quan' },
    notes: { title: 'Ghi Chú Chiều', sub: 'Cập nhật ghi chú cố định cho các tiết buổi chiều (GHI_CHU_CHIEU)' },
    hours: { title: 'Giờ Học Chiều', sub: 'Cấu hình khung giờ bắt đầu và kết thúc buổi chiều (GIO_CHIEU)' },
    theory: { title: 'Môn Lý Thuyết', sub: 'Danh sách môn lý thuyết nhắc mang sách vở (MON_LY_THUYET)' },
    orig_source: { title: 'Source Gốc (Original)', sub: 'Toàn bộ 100% mã nguồn ban đầu được bảo toàn nguyên vẹn' },
    patched_source: { title: 'Source Sau Khi Chỉnh', sub: 'Toàn bộ file hoàn chỉnh bao gồm đầy đủ comment, function và logic' },
    diff: { title: 'So Sánh Diff', sub: 'Chỉ highlight chính xác các block dữ liệu vừa được thay đổi' }
  };

  function switchTab(tabId) {
    state.activeTab = tabId;
    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
    });

    viewPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${tabId}`);
    });

    if (tabTitles[tabId]) {
      pageTitle.textContent = tabTitles[tabId].title;
      pageSubtitle.textContent = tabTitles[tabId].sub;
    }

    // Cập nhật nội dung đặc thù khi chuyển tab
    if (tabId === 'orig_source') {
      renderOrigSourceView();
    } else if (tabId === 'patched_source') {
      renderPatchedSourceView();
    } else if (tabId === 'diff') {
      renderDiffView();
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // ============================================================
  // EDITOR LINE NUMBERS HELPER
  // ============================================================
  function updateLineNumbers(textarea, targetElement) {
    const lines = (textarea.value || '').split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lines; i++) {
      numbers += i + '\n';
    }
    targetElement.textContent = numbers;
  }

  sourceInputTextarea.addEventListener('input', () => {
    updateLineNumbers(sourceInputTextarea, inputLineNumbers);
    const lineCount = sourceInputTextarea.value.split('\n').length;
    inputStatsText.textContent = `(${lineCount} dòng)`;
    sidebarLineCount.textContent = lineCount;
  });

  sourceInputTextarea.addEventListener('scroll', () => {
    inputLineNumbers.scrollTop = sourceInputTextarea.scrollTop;
  });

  // ============================================================
  // COLOR CODING FOR SUBJECTS
  // ============================================================
  function getSubjectColorClass(mon) {
    if (!mon) return 'sub-other';
    const m = mon.trim().toLowerCase();
    if (m.startsWith('toán')) return 'toan';
    if (m.startsWith('văn')) return 'van';
    if (m.startsWith('lí') || m.startsWith('vật lí') || m.startsWith('vật lý')) return 'li';
    if (m.startsWith('hóa')) return 'hoa';
    if (m.startsWith('sinh')) return 'sinh';
    if (m.startsWith('ta') || m.startsWith('tiếng anh') || m.startsWith('anh')) return 'ta';
    if (m.startsWith('tin')) return 'tin';
    if (m.startsWith('sử')) return 'su';
    if (m.startsWith('địa')) return 'dia';
    if (m.startsWith('thể dục') || m.startsWith('td')) return 'td';
    if (m.startsWith('shđt') || m.startsWith('shl') || m.startsWith('chào cờ')) return 'sh';
    if (m.startsWith('hđ') || m.startsWith('trải nghiệm')) return 'hd';
    return 'other';
  }

  // ============================================================
  // RENDER TIMETABLE MATRIX
  // ============================================================
  function getThuConfig() {
    const tenThuMap = state.parsedBlocks?.['TEN_THU']?.value;
    if (tenThuMap && tenThuMap[1] === 'Thứ Hai') {
      // Hệ 0-6 (1: Thứ Hai -> 6: Thứ Bảy, 0: Chủ Nhật)
      return {
        isSystem16: true,
        columns: [
          { thu: 1, name: 'Thứ Hai' },
          { thu: 2, name: 'Thứ Ba' },
          { thu: 3, name: 'Thứ Tư' },
          { thu: 4, name: 'Thứ Năm' },
          { thu: 5, name: 'Thứ Sáu' },
          { thu: 6, name: 'Thứ Bảy' },
          { thu: 0, name: 'Chủ Nhật' }
        ]
      };
    }
    // Hệ 2-8 (2: Thứ Hai -> 7: Thứ Bảy, 8: Chủ Nhật)
    return {
      isSystem16: false,
      columns: [
        { thu: 2, name: 'Thứ Hai' },
        { thu: 3, name: 'Thứ Ba' },
        { thu: 4, name: 'Thứ Tư' },
        { thu: 5, name: 'Thứ Năm' },
        { thu: 6, name: 'Thứ Sáu' },
        { thu: 7, name: 'Thứ Bảy' },
        { thu: 8, name: 'Chủ Nhật' }
      ]
    };
  }

  function getBuoiConvention() {
    const sampleItem = state.tkb.find(i => i.buoi);
    if (sampleItem && (sampleItem.buoi === 'sang' || sampleItem.buoi === 'chieu')) {
      return { sang: 'sang', chieu: 'chieu' };
    }
    return { sang: 'Sáng', chieu: 'Chiều' };
  }

  function renderTimetableMatrix() {
    sidebarPeriodCount.textContent = state.tkb.length;

    const thuConfig = getThuConfig();
    const sundayNum = thuConfig.isSystem16 ? 0 : 8;
    const hasSunday = state.tkb.some(item => Number(item.thu) === sundayNum);

    // Cập nhật header table
    const tableThead = document.querySelector('.tkb-matrix-table thead tr');
    let theadHtml = `<th class="col-tiet">Tiết</th>`;
    thuConfig.columns.forEach(col => {
      if (col.thu === sundayNum && !hasSunday) return;
      theadHtml += `<th>${col.name}</th>`;
    });
    tableThead.innerHTML = theadHtml;

    const searchQuery = (state.filterSubject || '').trim().toLowerCase();
    const rows = [1, 2, 3, 4, 5];
    let html = '';

    rows.forEach(tietNum => {
      html += `<tr>`;
      html += `<td class="cell-tiet-num"><span class="tiet-num-badge">${tietNum}</span></td>`;

      thuConfig.columns.forEach(col => {
        if (col.thu === sundayNum && !hasSunday) return;

        const matchingPeriods = state.tkb.filter(item => {
          if (Number(item.thu) !== col.thu || Number(item.tiet) !== tietNum) return false;
          const buoiNorm = Validator.normalizeBuoi(item.buoi);
          if (state.timetableBuoi === 'Sang' && buoiNorm !== 'sang') return false;
          if (state.timetableBuoi === 'Chieu' && buoiNorm !== 'chieu') return false;

          if (searchQuery) {
            const matchesMon = (item.mon || '').toLowerCase().includes(searchQuery);
            const gv = item.giaoVien || item.gv || '';
            const matchesGv = gv.toLowerCase().includes(searchQuery);
            const matchesPhong = (item.phong || '').toLowerCase().includes(searchQuery);
            const matchesNote = (item.ghiChu || '').toLowerCase().includes(searchQuery);
            return matchesMon || matchesGv || matchesPhong || matchesNote;
          }
          return true;
        });

        html += `<td>`;

        if (matchingPeriods.length > 0) {
          matchingPeriods.forEach(p => {
            const originalIndex = state.tkb.indexOf(p);
            const colorKey = getSubjectColorClass(p.mon);
            const isChieu = Validator.normalizeBuoi(p.buoi) === 'chieu';
            const buoiBadge = isChieu ? '<span class="slot-tag" style="background: #fed7aa; color: #9a3412;">Chiều</span>' : '';
            const roomText = p.phong ? `<span class="slot-meta-item">📍 ${p.phong}</span>` : '';
            const gvVal = p.giaoVien || p.gv;
            const gvText = gvVal ? `<span class="slot-meta-item">👤 ${gvVal}</span>` : '';
            const noteText = p.ghiChu ? `<span class="slot-meta-item" style="color: #ea580c;">📌 ${p.ghiChu}</span>` : '';

            html += `
              <div class="tkb-slot-card" data-index="${originalIndex}" draggable="true">
                <div class="slot-header">
                  <span class="slot-mon-title" style="color: var(--sub-${colorKey});">${p.mon || 'Chưa đặt tên'}</span>
                  <div class="slot-actions">
                    <button class="slot-action-btn btn-dup" data-action="dup" data-index="${originalIndex}" title="Nhân bản">📋</button>
                    <button class="slot-action-btn btn-edit" data-action="edit" data-index="${originalIndex}" title="Sửa">✏️</button>
                    <button class="slot-action-btn btn-del" data-action="del" data-index="${originalIndex}" title="Xóa">🗑️</button>
                  </div>
                </div>
                <div class="slot-meta">
                  ${roomText}
                  ${gvText}
                  ${noteText}
                </div>
                <div>${buoiBadge}</div>
              </div>
            `;
          });
        } else {
          const conv = getBuoiConvention();
          const defaultBuoi = state.timetableBuoi === 'Chieu' ? conv.chieu : conv.sang;
          html += `
            <div class="tkb-cell-empty" data-thu="${col.thu}" data-tiet="${tietNum}" data-buoi="${defaultBuoi}">
              + Thêm
            </div>
          `;
        }

        html += `</td>`;
      });

      html += `</tr>`;
    });

    tkbMatrixBody.innerHTML = html;
    attachTimetableEvents();
  }

  function attachTimetableEvents() {
    // Click vào card để edit
    tkbMatrixBody.querySelectorAll('.tkb-slot-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.slot-action-btn')) return; // Bỏ qua nếu bấm nút action
        const index = parseInt(card.getAttribute('data-index'), 10);
        openEditPeriodModal(index);
      });

      // Drag & drop
      card.addEventListener('dragstart', (e) => {
        const index = card.getAttribute('data-index');
        e.dataTransfer.setData('text/plain', index);
        card.style.opacity = '0.5';
      });

      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
      });
    });

    // Action buttons trong card
    tkbMatrixBody.querySelectorAll('.slot-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const index = parseInt(btn.getAttribute('data-index'), 10);

        if (action === 'edit') {
          openEditPeriodModal(index);
        } else if (action === 'dup') {
          state.duplicatePeriod(index);
          renderTimetableMatrix();
          showToast('Đã nhân bản tiết học thành công');
        } else if (action === 'del') {
          if (confirm('Bạn có chắc chắn muốn xóa tiết học này?')) {
            state.deletePeriod(index);
            renderTimetableMatrix();
            showToast('Đã xóa tiết học');
          }
        }
      });
    });

    // Click vào ô trống để thêm nhanh
    tkbMatrixBody.querySelectorAll('.tkb-cell-empty').forEach(cell => {
      cell.addEventListener('click', () => {
        const thu = parseInt(cell.getAttribute('data-thu'), 10);
        const tiet = parseInt(cell.getAttribute('data-tiet'), 10);
        const buoi = cell.getAttribute('data-buoi') || 'Sáng';
        openAddPeriodModal(thu, buoi, tiet);
      });

      // Drag over and drop
      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        cell.style.borderColor = 'var(--primary)';
        cell.style.backgroundColor = '#eff6ff';
      });

      cell.addEventListener('dragleave', () => {
        cell.style.borderColor = '';
        cell.style.backgroundColor = '';
      });

      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.style.borderColor = '';
        cell.style.backgroundColor = '';

        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (isNaN(sourceIndex) || !state.tkb[sourceIndex]) return;

        const targetThu = parseInt(cell.getAttribute('data-thu'), 10);
        const targetTiet = parseInt(cell.getAttribute('data-tiet'), 10);
        const targetBuoi = cell.getAttribute('data-buoi') || 'Sáng';

        // Kiểm tra duplicate
        const dupCheck = Validator.checkDuplicateSlot(state.tkb, {
          thu: targetThu,
          buoi: targetBuoi,
          tiet: targetTiet
        }, sourceIndex);

        if (dupCheck.isDuplicate) {
          showToast(dupCheck.message, 'error');
          return;
        }

        // Cập nhật vị trí
        state.updatePeriod(sourceIndex, {
          thu: targetThu,
          buoi: targetBuoi,
          tiet: targetTiet
        });
        renderTimetableMatrix();
        showToast('Đã di chuyển tiết học thành công');
      });
    });
  }

  // Buổi Tabs (Cả ngày / Sáng / Chiều)
  buoiTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      buoiTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.timetableBuoi = tab.getAttribute('data-buoi');
      renderTimetableMatrix();
    });
  });

  // Search input
  timetableSearchBox.addEventListener('input', (e) => {
    state.filterSubject = e.target.value;
    renderTimetableMatrix();
  });

  // ============================================================
  // RENDER GHI CHÚ CHIỀU (GHI_CHU_CHIEU)
  // ============================================================
  function renderNotesView() {
    const list = [1, 2, 3, 4, 5];
    let html = '';

    list.forEach(tiet => {
      const val = state.ghiChuChieu[tiet] || '';
      html += `
        <div class="note-item-card">
          <div class="note-tiet-badge">
            <span class="sub-label">Tiết</span>
            <span class="num">${tiet}</span>
          </div>
          <div class="note-input-wrapper">
            <label for="note-input-${tiet}">Ghi chú cố định cho Tiết ${tiet} buổi chiều:</label>
            <input type="text" class="note-text-input" id="note-input-${tiet}" data-tiet="${tiet}" value="${val.replace(/"/g, '&quot;')}" placeholder="VD: Mang đề cương, Đồng phục TD...">
          </div>
        </div>
      `;
    });

    notesInputsList.innerHTML = html;

    notesInputsList.querySelectorAll('.note-text-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const tiet = parseInt(input.getAttribute('data-tiet'), 10);
        state.updateGhiChuChieu(tiet, e.target.value);
        updateDiffBadge();
      });
    });
  }

  // ============================================================
  // RENDER GIỜ HỌC CHIỀU (GIO_CHIEU)
  // ============================================================
  function renderHoursView() {
    const list = [1, 2, 3, 4, 5];
    let html = '';

    list.forEach(tiet => {
      const item = state.gioChieu[tiet] || { batDau: '', ketThuc: '' };
      
      // Tính thời lượng
      let durationText = '45 phút';
      if (item.batDau && item.ketThuc) {
        const [h1, m1] = item.batDau.split(':').map(Number);
        const [h2, m2] = item.ketThuc.split(':').map(Number);
        if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
          const diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (diffMin > 0) durationText = `${diffMin} phút`;
        }
      }

      html += `
        <tr>
          <td><strong style="font-size: 15px; color: var(--primary);">Tiết ${tiet}</strong></td>
          <td>
            <input type="text" class="time-input hour-start" data-tiet="${tiet}" value="${item.batDau || ''}" placeholder="12:45">
          </td>
          <td>
            <input type="text" class="time-input hour-end" data-tiet="${tiet}" value="${item.ketThuc || ''}" placeholder="13:30">
          </td>
          <td style="color: var(--text-muted); font-weight: 600;">${durationText}</td>
        </tr>
      `;
    });

    hoursTableBody.innerHTML = html;

    hoursTableBody.querySelectorAll('.time-input').forEach(input => {
      input.addEventListener('change', () => {
        const tiet = parseInt(input.getAttribute('data-tiet'), 10);
        const row = input.closest('tr');
        const startVal = row.querySelector('.hour-start').value;
        const endVal = row.querySelector('.hour-end').value;
        state.updateGioChieu(tiet, startVal, endVal);
        renderHoursView();
        updateDiffBadge();
      });
    });
  }

  // ============================================================
  // RENDER MÔN LÝ THUYẾT (MON_LY_THUYET)
  // ============================================================
  function renderTheoryView() {
    sidebarTheoryCount.textContent = state.monLyThuyet.length;
    let html = '';

    state.monLyThuyet.forEach((mon, index) => {
      html += `
        <div class="theory-chip" data-index="${index}" draggable="true">
          <span>📖 ${mon}</span>
          <button class="theory-chip-remove" data-mon="${mon}" title="Xóa môn này">&times;</button>
        </div>
      `;
    });

    theoryChipsContainer.innerHTML = html;

    theoryChipsContainer.querySelectorAll('.theory-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mon = btn.getAttribute('data-mon');
        state.removeMonLyThuyet(mon);
        renderTheoryView();
        updateDiffBadge();
        showToast(`Đã xóa môn "${mon}" khỏi danh sách lý thuyết`);
      });
    });
  }

  btnAddTheory.addEventListener('click', () => {
    const val = theoryAddInput.value.trim();
    if (!val) return;
    if (state.addMonLyThuyet(val)) {
      theoryAddInput.value = '';
      renderTheoryView();
      updateDiffBadge();
      showToast(`Đã thêm "${val}" vào danh sách lý thuyết`);
    } else {
      showToast('Môn này đã có trong danh sách!', 'error');
    }
  });

  theoryAddInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnAddTheory.click();
    }
  });

  // ============================================================
  // CODE VIEWERS (SOURCE GỐC & SOURCE SAU CHỈNH)
  // ============================================================
  function renderOrigSourceView() {
    const code = state.originalSource || '';
    origCodeContent.textContent = code;
    const lines = code.split('\n').length;
    origStatsBadge.textContent = `${lines} dòng`;

    let numHtml = '';
    for (let i = 1; i <= lines; i++) numHtml += i + '\n';
    origLineNumbers.textContent = numHtml;
  }

  function renderPatchedSourceView() {
    const patched = state.getPatchedSource();
    patchedCodeContent.textContent = patched;
    const lines = patched.split('\n').length;
    patchedStatsBadge.textContent = `${lines} dòng`;

    let numHtml = '';
    for (let i = 1; i <= lines; i++) numHtml += i + '\n';
    patchedLineNumbers.textContent = numHtml;
  }

  // ============================================================
  // DIFF VIEW
  // ============================================================
  function renderDiffView() {
    const patched = state.getPatchedSource();
    const diff = DiffEngine.computeLineDiff(state.originalSource, patched);
    const filterOnly = diffFilterToggle.checked;
    diffContentWrapper.innerHTML = DiffEngine.renderDiffHtml(diff, filterOnly);
    sidebarDiffBadge.textContent = diff.changesCount;
  }

  diffFilterToggle.addEventListener('change', () => {
    renderDiffView();
  });

  function updateDiffBadge() {
    const patched = state.getPatchedSource();
    const diff = DiffEngine.computeLineDiff(state.originalSource, patched);
    sidebarDiffBadge.textContent = diff.changesCount;
  }

  // ============================================================
  // MODAL LOGIC: THÊM / SỬA TIẾT HỌC
  // ============================================================
  function populateModalDropdowns() {
    const thuConfig = getThuConfig();
    let thuOptionsHtml = '';
    thuConfig.columns.forEach(col => {
      thuOptionsHtml += `<option value="${col.thu}">${col.name}</option>`;
    });
    modalFieldThu.innerHTML = thuOptionsHtml;

    const conv = getBuoiConvention();
    modalFieldBuoi.innerHTML = `
      <option value="${conv.sang}">Sáng</option>
      <option value="${conv.chieu}">Chiều</option>
    `;
  }

  function openAddPeriodModal(thu = 1, buoi = 'sang', tiet = 1) {
    editingPeriodIndex = -1;
    periodModalTitle.textContent = 'Thêm tiết học mới';
    modalBtnDelete.style.display = 'none';

    populateModalDropdowns();

    modalFieldThu.value = thu;
    modalFieldBuoi.value = buoi;
    modalFieldTiet.value = tiet;
    modalFieldMon.value = '';
    modalFieldPhong.value = '';
    modalFieldGv.value = '';
    modalFieldGhichu.value = '';

    checkModalDuplicate();
    periodModal.classList.add('open');
    modalFieldMon.focus();
  }

  function openEditPeriodModal(index) {
    if (index < 0 || index >= state.tkb.length) return;
    editingPeriodIndex = index;
    const item = state.tkb[index];

    periodModalTitle.textContent = 'Chỉnh sửa tiết học';
    modalBtnDelete.style.display = 'inline-flex';

    populateModalDropdowns();

    modalFieldThu.value = item.thu;
    modalFieldBuoi.value = item.buoi;
    modalFieldTiet.value = item.tiet || 1;
    modalFieldMon.value = item.mon || '';
    modalFieldPhong.value = item.phong || '';
    modalFieldGv.value = item.giaoVien || item.gv || '';
    modalFieldGhichu.value = item.ghiChu || '';

    checkModalDuplicate();
    periodModal.classList.add('open');
    modalFieldMon.focus();
  }

  function closePeriodModal() {
    periodModal.classList.remove('open');
    duplicateAlert.classList.remove('show');
  }

  function checkModalDuplicate() {
    const targetItem = {
      thu: parseInt(modalFieldThu.value, 10),
      buoi: modalFieldBuoi.value,
      tiet: parseInt(modalFieldTiet.value, 10)
    };

    const dup = Validator.checkDuplicateSlot(state.tkb, targetItem, editingPeriodIndex);
    if (dup.isDuplicate) {
      duplicateAlertMsg.textContent = dup.message;
      duplicateAlert.classList.add('show');
      modalBtnSave.disabled = true;
    } else {
      duplicateAlert.classList.remove('show');
      modalBtnSave.disabled = false;
    }
  }

  [modalFieldThu, modalFieldBuoi, modalFieldTiet].forEach(field => {
    field.addEventListener('change', checkModalDuplicate);
  });

  // Quick subject chip click
  modalQuickSubjects.querySelectorAll('.quick-subject-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      modalFieldMon.value = chip.textContent.trim();
      modalFieldMon.focus();
    });
  });

  // Save Modal
  modalBtnSave.addEventListener('click', () => {
    const mon = modalFieldMon.value.trim();
    if (!mon) {
      showToast('Vui lòng nhập tên môn học', 'error');
      modalFieldMon.focus();
      return;
    }

    const gvVal = modalFieldGv.value.trim();
    const periodData = {
      thu: parseInt(modalFieldThu.value, 10),
      buoi: modalFieldBuoi.value,
      tiet: parseInt(modalFieldTiet.value, 10),
      mon: mon,
      phong: modalFieldPhong.value.trim(),
      giaoVien: gvVal,
      gv: gvVal,
      ghiChu: modalFieldGhichu.value.trim()
    };

    // Kiểm tra duplicate trước khi lưu
    const dup = Validator.checkDuplicateSlot(state.tkb, periodData, editingPeriodIndex);
    if (dup.isDuplicate) {
      showToast(dup.message, 'error');
      return;
    }

    if (editingPeriodIndex === -1) {
      state.addPeriod(periodData);
      showToast('Đã thêm tiết học mới');
    } else {
      state.updatePeriod(editingPeriodIndex, periodData);
      showToast('Đã cập nhật tiết học');
    }

    closePeriodModal();
    renderTimetableMatrix();
    updateDiffBadge();
  });

  // Delete Modal
  modalBtnDelete.addEventListener('click', () => {
    if (editingPeriodIndex >= 0) {
      if (confirm('Bạn có chắc chắn muốn xóa tiết học này?')) {
        state.deletePeriod(editingPeriodIndex);
        closePeriodModal();
        renderTimetableMatrix();
        updateDiffBadge();
        showToast('Đã xóa tiết học');
      }
    }
  });

  btnCloseModal.addEventListener('click', closePeriodModal);
  modalBtnCancel.addEventListener('click', closePeriodModal);
  btnOpenAddPeriod.addEventListener('click', () => openAddPeriodModal());

  // ============================================================
  // PARSER & INPUT ACTIONS
  // ============================================================
  btnParseSource.addEventListener('click', () => {
    const code = sourceInputTextarea.value.trim();
    if (!code) {
      showToast('Vui lòng dán source code JavaScript vào trước!', 'error');
      return;
    }

    const result = state.loadFromSource(code);
    if (!result.success) {
      alert(`⚠️ ${result.error}`);
      return;
    }

    renderAllViews();
    showToast(`Đã phân tích thành công: tìm thấy ${result.count} tiết học!`);
    switchTab('timetable');
  });

  btnClearInput.addEventListener('click', () => {
    if (confirm('Bạn có chắc muốn xóa nội dung trong khung soạn thảo?')) {
      sourceInputTextarea.value = '';
      updateLineNumbers(sourceInputTextarea, inputLineNumbers);
      inputStatsText.textContent = '(0 dòng)';
    }
  });

  btnLoadSample.addEventListener('click', () => {
    if (typeof window.sampleSourceText !== 'undefined' || typeof sampleCode !== 'undefined') {
      // Sử dụng sample_source.js
      loadSampleCode();
    }
  });

  async function loadSampleCode() {
    try {
      let text = window.DEFAULT_SAMPLE_SOURCE;
      if (!text) {
        const resp = await fetch('js/sample_source.js');
        text = await resp.text();
      }
      sourceInputTextarea.value = text;
      updateLineNumbers(sourceInputTextarea, inputLineNumbers);
      inputStatsText.textContent = `(${text.split('\n').length} dòng)`;
      state.loadFromSource(text, true);
      renderAllViews();
    } catch (err) {
      console.warn('Lỗi khi nạp sample code:', err);
    }
  }

  btnPasteClipboard.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        sourceInputTextarea.value = text;
        updateLineNumbers(sourceInputTextarea, inputLineNumbers);
        inputStatsText.textContent = `(${text.split('\n').length} dòng)`;
        showToast('Đã dán mã từ Clipboard!');
      }
    } catch (e) {
      showToast('Trình duyệt không cho phép đọc clipboard, vui lòng nhấn Ctrl+V', 'error');
    }
  });

  btnTriggerUpload.addEventListener('click', () => fileInputJs.click());
  fileInputJs.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      sourceInputTextarea.value = text;
      updateLineNumbers(sourceInputTextarea, inputLineNumbers);
      inputStatsText.textContent = `(${text.split('\n').length} dòng)`;
      showToast(`Đã tải file "${file.name}"! Nhấn "Phân tích Source" để bắt đầu.`);
    };
    reader.readAsText(file);
  });

  // ============================================================
  // UNDO / REDO & SHORTCUTS
  // ============================================================
  function updateUndoRedoButtons() {
    btnUndo.disabled = !state.canUndo();
    btnRedo.disabled = !state.canRedo();
  }

  btnUndo.addEventListener('click', () => {
    if (state.undo()) {
      renderAllViews();
      showToast('Đã hoàn tác (Undo)');
    }
  });

  btnRedo.addEventListener('click', () => {
    if (state.redo()) {
      renderAllViews();
      showToast('Đã làm lại (Redo)');
    }
  });

  document.addEventListener('keydown', (e) => {
    // Không bắt Ctrl+Z khi đang gõ trong textarea nguồn
    if (document.activeElement === sourceInputTextarea) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) {
        e.preventDefault();
        state.redo();
        renderAllViews();
      } else {
        e.preventDefault();
        state.undo();
        renderAllViews();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      state.redo();
      renderAllViews();
    }
  });

  // ============================================================
  // VALIDATION & EXPORT
  // ============================================================
  function exportFullSource() {
    const finalSource = state.getPatchedSource();
    const validation = Validator.validateAll(state, finalSource);

    if (!validation.isValid) {
      showValidationModal(validation.errors);
      return false;
    }

    // Tải file .js
    const blob = new Blob([finalSource], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tkb-updated.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('⚡ Đã xuất file tkb-updated.js thành công!');
    return true;
  }

  function copyFullSource() {
    const finalSource = state.getPatchedSource();
    const validation = Validator.validateAll(state, finalSource);

    if (!validation.isValid) {
      showValidationModal(validation.errors);
      return false;
    }

    navigator.clipboard.writeText(finalSource).then(() => {
      showToast('📋 Đã sao chép TOÀN BỘ file JavaScript hoàn chỉnh vào Clipboard!');
    }).catch(() => {
      showToast('Không thể sao chép tự động, vui lòng mở tab "Source sau chỉnh" và copy bằng tay.', 'error');
    });
  }

  function showValidationModal(errors) {
    let html = `
      <p style="margin-bottom: 12px; font-weight: 600; color: var(--text-primary);">
        Phát hiện các vấn đề cần khắc phục trước khi xuất file:
      </p>
      <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 8px; color: var(--danger); font-size: 13.5px;">
    `;

    errors.forEach(err => {
      html += `<li>${err.message}</li>`;
    });

    html += `</ul>`;
    valModalBody.innerHTML = html;
    validationModal.classList.add('open');
  }

  btnCloseValModal.addEventListener('click', () => validationModal.classList.remove('open'));
  btnValModalOk.addEventListener('click', () => validationModal.classList.remove('open'));

  sidebarBtnExport.addEventListener('click', exportFullSource);
  btnQuickDownload.addEventListener('click', exportFullSource);
  btnDownloadPatched.addEventListener('click', exportFullSource);

  btnQuickCopy.addEventListener('click', copyFullSource);
  btnCopyPatched.addEventListener('click', copyFullSource);

  btnCopyOrig.addEventListener('click', () => {
    navigator.clipboard.writeText(state.originalSource).then(() => {
      showToast('Đã sao chép Source gốc!');
    });
  });

  // LocalStorage Draft Buttons
  btnClearDraft.addEventListener('click', () => {
    if (confirm('Bạn có chắc muốn xóa bản lưu nháp trên trình duyệt này?')) {
      state.clearDraft();
      btnRestoreDraft.style.display = 'none';
      showToast('Đã xóa bản nháp khỏi LocalStorage');
    }
  });

  btnRestoreDraft.addEventListener('click', () => {
    state.loadDraftFromLocalStorage();
    renderAllViews();
    showToast('Đã khôi phục phiên chỉnh sửa từ LocalStorage!');
    btnRestoreDraft.style.display = 'none';
  });

  // State Listener
  state.subscribe((event, data) => {
    updateUndoRedoButtons();
    if (event === 'DATA_CHANGED') {
      systemStatusText.textContent = 'Đã vá các block mới';
      systemStatusDot.classList.add('warning');
    }
  });

  // ============================================================
  // RENDER ALL VIEWS
  // ============================================================
  function renderAllViews() {
    renderTimetableMatrix();
    renderNotesView();
    renderHoursView();
    renderTheoryView();
    updateDiffBadge();
    updateUndoRedoButtons();
  }

  // ============================================================
  // INITIAL BOOTSTRAP
  // ============================================================
  function bootstrap() {
    if (state.hasDraft()) {
      btnRestoreDraft.style.display = 'inline-flex';
    }

    // Tự động nạp mẫu chuẩn 12A1 ban đầu để người dùng có thể trải nghiệm ngay lập tức
    loadSampleCode();
  }

  bootstrap();
});
