import React, { useMemo, useState } from 'react';
import { useAcademy } from '../core/store';
import { normalizeSearch } from '../core/catalog';
import { EmptyState } from '../components/GameUI';

export function NotebookScreen() {
  const entries = useAcademy(state => state.profile.notebook);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [onlyStarred, setOnlyStarred] = useState(false);
  const visible = useMemo(() => entries.filter(entry => {
    if (onlyStarred && !entry.starred) return false;
    return normalizeSearch(`${entry.title} ${entry.text}`).includes(normalizeSearch(query));
  }).sort((left, right) => Number(right.starred) - Number(left.starred) || right.updatedAt.localeCompare(left.updatedAt)), [entries, query, onlyStarred]);

  const newEntry = () => {
    setActive(null);
    setTitle('');
    setText('');
    setEditing(true);
    setStatus('');
  };

  const save = () => {
    if (!title.trim() && !text.trim()) {
      setStatus('Thêm tiêu đề hoặc nội dung trước khi lưu.');
      return;
    }
    const source = entries.find(entry => entry.id === active)?.source ?? 'personal';
    useAcademy.getState().writeNote({ title, text, source }, active ?? undefined);
    setEditing(false);
    setStatus('Đã lưu ghi chú trên thiết bị này.');
  };

  return (
    <section className="academy-notebook">
      <div className="academy-section-heading">
        <div><p className="academy-eyebrow">Viết để hiểu sâu</p><h2>Sổ tay thực hành</h2><p>Lưu nguyên tắc bằng lời của em hoặc giữ phần tổng kết sau một lượt chơi.</p></div>
        <button type="button" className="academy-button academy-button--primary" onClick={newEntry}>＋ Ghi chú mới</button>
      </div>
      <div className="academy-search-row">
        <input aria-label="Tìm ghi chú" placeholder="Tìm trong sổ tay…" value={query} onChange={event => setQuery(event.target.value)} />
        <button type="button" className="academy-button" aria-pressed={onlyStarred} onClick={() => setOnlyStarred(value => !value)}>{onlyStarred ? '★ Đang ghim' : '☆ Tất cả ghi chú'}</button>
      </div>
      {status && <p role="status" className="academy-inline-status">{status}</p>}
      {editing ? (
        <div className="academy-note-editor">
          <label>Tiêu đề<input aria-label="Tiêu đề ghi chú" maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="Điều em muốn nhớ" /></label>
          <label>Nội dung<textarea aria-label="Nội dung ghi chú" maxLength={4000} rows={12} value={text} onChange={event => setText(event.target.value)} placeholder="Em vừa học được gì? Vì sao thao tác đó an toàn hơn? Khi nào em cần hỏi giáo viên?" /></label>
          <span className="academy-fineprint">{text.length}/4000 ký tự</span>
          <div className="academy-action-row">
            <button type="button" className="academy-button academy-button--primary" onClick={save}>Lưu ghi chú</button>
            <button type="button" className="academy-button" onClick={() => setEditing(false)}>Hủy chỉnh sửa</button>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon="📝" title={query ? 'Không thấy ghi chú phù hợp' : 'Sổ tay đang chờ em'} text="Sau mỗi bài, em có thể lưu tổng kết và bổ sung nhận xét của mình." action={<button type="button" className="academy-button" onClick={newEntry}>Viết điều đầu tiên</button>} />
      ) : (
        <div className="academy-note-grid">
          {visible.map(entry => (
            <article key={entry.id} className="academy-note-card">
              <header><h3>{entry.title}</h3><button type="button" aria-label={entry.starred ? 'Bỏ ghim ghi chú' : 'Ghim ghi chú'} aria-pressed={entry.starred} onClick={() => useAcademy.getState().toggleNoteStar(entry.id)}>{entry.starred ? '★' : '☆'}</button></header>
              <p>{entry.text}</p>
              <footer>
                <time dateTime={entry.updatedAt}>{new Date(entry.updatedAt).toLocaleDateString('vi-VN')}</time>
                <button type="button" onClick={() => { setActive(entry.id); setTitle(entry.title); setText(entry.text); setEditing(true); }}>Sửa</button>
                <button type="button" onClick={() => setDeleteId(entry.id)}>Xóa</button>
              </footer>
              {deleteId === entry.id && <div className="academy-inline-confirm"><p>Xóa ghi chú này khỏi sổ tay?</p><button type="button" className="academy-button" onClick={() => { useAcademy.getState().deleteNote(entry.id); setDeleteId(null); setStatus('Đã xóa ghi chú.'); }}>Xóa ghi chú</button><button type="button" className="academy-button" onClick={() => setDeleteId(null)}>Giữ lại</button></div>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
