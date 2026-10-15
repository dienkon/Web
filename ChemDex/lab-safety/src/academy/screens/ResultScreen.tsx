import React, { useState } from 'react';
import { GameDefinition, GameResult } from '../core/types';
import { DIFFICULTY, formatDuration } from '../core/scoring';
import { useAcademy } from '../core/store';
import { Stat } from '../components/GameUI';

const MEDALS = {
  none: { icon: '📚', label: 'Tiếp tục khám phá' },
  bronze: { icon: '🥉', label: 'Hoàn thành bài học' },
  silver: { icon: '🥈', label: 'Thực hành vững vàng' },
  gold: { icon: '🥇', label: 'Thao tác xuất sắc' },
};

export function ResultScreen({ definition, result, onReplay, onBack, onNext }: {
  definition: GameDefinition;
  result: GameResult;
  onReplay: () => void;
  onBack: () => void;
  onNext?: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const medal = MEDALS[result.medal];
  const mistakes = result.events.filter(event => event.type === 'mistake');
  const saveNote = () => {
    if (saved) return;
    useAcademy.getState().writeNote({
      title: definition.title,
      text: `${definition.debrief}\n\n${result.details.join('\n')}\n\nĐiều cần ôn:\n${mistakes.map(event => event.detail ?? event.message).join('\n') || 'Tiếp tục luyện để duy trì kỹ năng.'}`,
      source: definition.id,
    });
    setSaved(true);
  };

  return (
    <div className="academy-result" data-academy-result>
      <div className={`academy-medal academy-medal--${result.medal}`} aria-hidden="true">{medal.icon}</div>
      <p className="academy-eyebrow">{DIFFICULTY[result.difficulty].label} · Đã lưu tiến trình</p>
      <h2>{medal.label}</h2>
      <p className="academy-result-title">{definition.title}</p>
      <div className="academy-stat-grid">
        <Stat icon="🎯" label="Điểm thao tác" value={`${result.score}/100`} />
        <Stat icon="✨" label="Kinh nghiệm" value={`+${result.xp} XP`} />
        <Stat icon="⏱️" label="Thời gian thực hành" value={formatDuration(result.elapsedSeconds)} />
        <Stat icon="✅" label="Tỷ lệ lựa chọn đúng" value={`${result.accuracy}%`} />
      </div>
      <section className="academy-result-debrief">
        <h3>Điều em vừa luyện</h3>
        <p>{definition.debrief}</p>
        <ul>{result.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul>
      </section>
      {mistakes.length > 0 && (
        <section className="academy-result-review">
          <h3>Biến lỗi thành điều nhớ được</h3>
          <p>Đọc lại lý do trước khi chơi lần tiếp theo.</p>
          {mistakes.map(event => (
            <article key={event.id}>
              <strong>{event.message}</strong>
              {event.detail && <p>{event.detail}</p>}
            </article>
          ))}
        </section>
      )}
      <details className="academy-event-log">
        <summary>Nhật ký thao tác · {result.events.length} sự kiện</summary>
        <ol>
          {result.events.map(event => (
            <li key={event.id}>
              <time>{formatDuration(event.at)}</time>
              <span className={`academy-event-type academy-event-type--${event.type}`}>
                {event.type === 'correct' ? '✓' : event.type === 'mistake' ? '!' : '💡'}
              </span>
              <div><strong>{event.message}</strong>{event.detail && <p>{event.detail}</p>}</div>
            </li>
          ))}
        </ol>
      </details>
      <div className="academy-action-row academy-result-actions">
        <button type="button" className="academy-button academy-button--primary" onClick={onReplay}>↻ Chơi lại</button>
        {onNext && <button type="button" className="academy-button" onClick={onNext}>Bài tiếp theo →</button>}
        <button type="button" className="academy-button" onClick={saveNote} disabled={saved}>{saved ? '✓ Đã lưu sổ tay' : '📝 Lưu vào sổ tay'}</button>
        <button type="button" className="academy-button academy-button--quiet" onClick={onBack}>Về học viện</button>
      </div>
      <p className="academy-fineprint">Điểm và huy chương phản ánh lượt chơi mô phỏng, không phải chứng nhận năng lực thực hành ngoài đời.</p>
    </div>
  );
}
