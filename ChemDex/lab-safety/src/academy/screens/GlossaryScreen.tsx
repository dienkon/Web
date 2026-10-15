import React, { useMemo, useState } from 'react';
import { GLOSSARY } from '../data/glossary';
import { CHAPTERS } from '../data/chapters';
import { normalizeSearch, SKILL_NAMES } from '../core/catalog';
import { useAcademy } from '../core/store';
import { EmptyState } from '../components/GameUI';

export function GlossaryScreen() {
  const read = useAcademy(state => state.profile.readGlossaryIds);
  const [query, setQuery] = useState('');
  const [skill, setSkill] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const visible = useMemo(() => GLOSSARY.filter(entry => {
    if (skill !== 'all' && skill !== entry.skill) return false;
    if (unreadOnly && read.includes(entry.id)) return false;
    return normalizeSearch(`${entry.term} ${entry.shortDefinition} ${entry.example}`).includes(normalizeSearch(query));
  }), [query, skill, unreadOnly, read]);
  const active = GLOSSARY.find(entry => entry.id === selected);

  return (
    <section className="academy-glossary">
      <div className="academy-section-heading">
        <div><p className="academy-eyebrow">Tra nhanh, hiểu đúng</p><h2>Từ điển phòng thí nghiệm</h2><p>{GLOSSARY.length} khái niệm với ví dụ và nhầm lẫn thường gặp.</p></div>
        <span className="academy-pill">Đã đọc {read.length}/{GLOSSARY.length}</span>
      </div>
      <div className="academy-search-row">
        <input aria-label="Tìm khái niệm" placeholder="Tìm trừ bì, mặt khum, PASS…" value={query} onChange={event => setQuery(event.target.value)} />
        <select aria-label="Nhóm khái niệm" value={skill} onChange={event => setSkill(event.target.value)}>
          <option value="all">Mọi kỹ năng</option>
          {CHAPTERS.map(chapter => <option key={chapter.id} value={chapter.skill}>{SKILL_NAMES[chapter.skill]}</option>)}
        </select>
        <button type="button" className="academy-button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(value => !value)}>{unreadOnly ? '✓ Chưa đọc' : 'Chỉ xem chưa đọc'}</button>
      </div>
      {active && (
        <article className="academy-term-detail">
          <header><span className="academy-eyebrow">{SKILL_NAMES[active.skill]}</span><button type="button" aria-label="Đóng khái niệm" onClick={() => setSelected(null)}>✕</button></header>
          <h3>{active.term}</h3>
          <p className="academy-term-definition">{active.shortDefinition}</p>
          <p>{active.explanation}</p>
          <div className="academy-term-example"><strong>Trong phòng học</strong><p>{active.example}</p></div>
          <div className="academy-term-mistake"><strong>Nhầm lẫn cần tránh</strong><p>{active.commonMistake}</p></div>
          <div className="academy-action-row">
            <button type="button" className="academy-button academy-button--primary" disabled={read.includes(active.id)} onClick={() => useAcademy.getState().markRead(active.id)}>{read.includes(active.id) ? '✓ Đã đọc' : 'Đánh dấu đã hiểu'}</button>
            <button type="button" className="academy-button" onClick={() => {
              useAcademy.getState().writeNote({ title: active.term, text: `${active.shortDefinition}\n\n${active.explanation}\n\nVí dụ: ${active.example}`, source: active.id });
            }}>Lưu vào sổ tay</button>
          </div>
          <div className="academy-related-terms"><span>Liên quan:</span>{active.relatedTerms.map(id => {
            const entry = GLOSSARY.find(candidate => candidate.id === id);
            return entry ? <button type="button" key={id} onClick={() => setSelected(id)}>{entry.term}</button> : null;
          })}</div>
        </article>
      )}
      {visible.length === 0 ? <EmptyState icon="🔎" title="Chưa có kết quả phù hợp" text="Thử từ ngắn hơn hoặc đổi nhóm kỹ năng." /> : (
        <div className="academy-term-grid">
          {visible.map(entry => (
            <button type="button" className={`academy-term-card ${selected === entry.id ? 'is-selected' : ''}`} key={entry.id} onClick={() => setSelected(entry.id)}>
              <span>{SKILL_NAMES[entry.skill]} {read.includes(entry.id) ? '· ✓' : ''}</span>
              <strong>{entry.term}</strong>
              <p>{entry.shortDefinition}</p>
              <em>Xem ví dụ →</em>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
