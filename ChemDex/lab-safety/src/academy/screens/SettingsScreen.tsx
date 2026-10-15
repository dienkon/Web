import React, { useRef, useState } from 'react';
import { useAcademy } from '../core/store';
import { DIFFICULTY } from '../core/scoring';
import { Difficulty } from '../core/types';
import { downloadText, profileJSON, reportCSV } from '../core/export';

export function SettingsScreen() {
  const profile = useAcademy(state => state.profile);
  const storageAvailable = useAcademy(state => state.storageAvailable);
  const preferences = profile.preferences;
  const [status, setStatus] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [importCandidate, setImportCandidate] = useState<unknown>(null);
  const file = useRef<HTMLInputElement>(null);
  const toggles = [
    { id: 'sound', title: 'Âm thanh phản hồi', detail: 'Âm ngắn sau thao tác; vẫn giữ phản hồi chữ khi tắt.' },
    { id: 'reducedMotion', title: 'Giảm chuyển động', detail: 'Giảm hiệu ứng trang trí và chuyển cảnh trong học viện.' },
    { id: 'highContrast', title: 'Tương phản cao', detail: 'Làm rõ viền, chữ và các trạng thái đang chọn.' },
    { id: 'largeText', title: 'Chữ lớn', detail: 'Tăng cỡ chữ trong giao diện học viện.' },
    { id: 'showTimer', title: 'Hiện đồng hồ', detail: 'Thời gian để tự theo dõi, không tự kết thúc bài khi chậm.' },
  ] as const;

  const readImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (selected.size > 2 * 1024 * 1024) {
      setStatus('Tệp quá lớn. Chọn bản sao lưu học viện nhỏ hơn 2 MB.');
      event.target.value = '';
      return;
    }
    try {
      const input = JSON.parse(await selected.text());
      if (input?.version !== 1) throw new Error('version');
      setImportCandidate(input);
      setStatus('Đã đọc tệp. Xác nhận bên dưới nếu muốn thay tiến trình hiện tại.');
    } catch {
      setStatus('Không đọc được bản sao lưu. Chọn tệp JSON được xuất từ học viện.');
    }
    event.target.value = '';
  };

  return (
    <section className="academy-settings">
      <div className="academy-section-heading"><div><p className="academy-eyebrow">Học theo cách phù hợp</p><h2>Tùy chọn học viện</h2><p>Thiết lập này áp dụng cho học viện và được lưu trên thiết bị này.</p></div></div>
      {!storageAvailable && <p role="status" className="academy-inline-status">Trình duyệt chưa lưu được dữ liệu. Tiến trình vẫn có trong phiên hiện tại; em có thể xuất bản sao lưu.</p>}
      <div className="academy-settings-card">
        <label className="academy-field">Tên hiển thị<input aria-label="Tên học viên" maxLength={80} value={preferences.learnerName} onChange={event => useAcademy.getState().updatePreferences({ learnerName: event.target.value })} placeholder="Tên dùng trong báo cáo học tập" /></label>
        <label className="academy-field">Mức chơi mặc định<select aria-label="Mức chơi mặc định" value={preferences.difficulty} onChange={event => useAcademy.getState().updatePreferences({ difficulty: event.target.value as Difficulty })}>{(Object.keys(DIFFICULTY) as Difficulty[]).map(key => <option key={key} value={key}>{DIFFICULTY[key].label}</option>)}</select></label>
      </div>
      <div className="academy-settings-card">
        <h3>Khả năng tiếp cận</h3>
        {toggles.map(toggle => (
          <label key={toggle.id} className="academy-toggle-row">
            <span><strong>{toggle.title}</strong><small>{toggle.detail}</small></span>
            <input type="checkbox" checked={preferences[toggle.id]} onChange={event => useAcademy.getState().updatePreferences({ [toggle.id]: event.target.checked })} />
          </label>
        ))}
      </div>
      <div className="academy-settings-card">
        <h3>Bản sao lưu và báo cáo</h3>
        <p>Hồ sơ học viện nằm trong trình duyệt. Xuất bản sao lưu để tự giữ hoặc báo cáo CSV để xem lại kết quả.</p>
        <div className="academy-action-row">
          <button type="button" className="academy-button" onClick={() => { downloadText('chemdex-academy-profile.json', profileJSON(profile), 'application/json'); setStatus('Đã tạo tệp sao lưu.'); }}>Xuất sao lưu JSON</button>
          <button type="button" className="academy-button" onClick={() => { downloadText('chemdex-academy-report.csv', reportCSV(profile), 'text/csv;charset=utf-8'); setStatus('Đã tạo báo cáo CSV.'); }}>Xuất báo cáo CSV</button>
          <button type="button" className="academy-button" onClick={() => file.current?.click()}>Nhập bản sao lưu</button>
          <input hidden ref={file} type="file" accept="application/json,.json" aria-label="Tệp sao lưu học viện" onChange={readImport} />
        </div>
        {importCandidate !== null && <div className="academy-inline-confirm"><p>Nhập bản sao lưu sẽ thay hồ sơ học viện hiện tại. Các nhiệm vụ phòng 3D được giữ riêng.</p><div className="academy-action-row"><button type="button" className="academy-button academy-button--primary" onClick={() => { const ok = useAcademy.getState().importProfile(importCandidate); setStatus(ok ? 'Đã nhập hồ sơ học viện.' : 'Hồ sơ không hợp lệ. Tiến trình hiện tại được giữ.'); setImportCandidate(null); }}>Thay bằng hồ sơ đã chọn</button><button type="button" className="academy-button" onClick={() => setImportCandidate(null)}>Hủy nhập</button></div></div>}
      </div>
      <div className="academy-settings-card">
        <h3>Bắt đầu lại học viện</h3>
        <p>Xóa tiến trình, sổ tay và lịch ôn của học viện trên thiết bị này. Có thể xuất bản sao lưu trước.</p>
        {!confirmReset ? <button type="button" className="academy-button" onClick={() => setConfirmReset(true)}>Chọn bắt đầu lại</button> : <div className="academy-inline-confirm"><p>Xác nhận xóa tiến trình học viện?</p><div className="academy-action-row"><button type="button" className="academy-button" onClick={() => { useAcademy.getState().resetProgress(); setConfirmReset(false); setStatus('Đã bắt đầu hồ sơ học viện mới.'); }}>Xóa tiến trình học viện</button><button type="button" className="academy-button academy-button--primary" onClick={() => setConfirmReset(false)}>Giữ tiến trình</button></div></div>}
      </div>
      {status && <p role="status" className="academy-inline-status">{status}</p>}
    </section>
  );
}
