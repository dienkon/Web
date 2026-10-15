import React, { useMemo, useState } from 'react';
import { useAcademy } from '../core/store';
import { buildStudyPlan, StudyPlanOptions } from '../core/planner';
import { CHAPTERS } from '../data/chapters';
import { GAME_KIND_NAMES, SKILL_NAMES } from '../core/catalog';
import { EmptyState } from '../components/GameUI';

export function StudyPlanScreen({ onStart }: { onStart: (gameIds: string[]) => void }) {
  const profile = useAcademy(state => state.profile);
  const [options, setOptions] = useState<StudyPlanOptions>({
    minutes: 10,
    focus: 'balanced',
    includeCompleted: true,
    variety: true,
  });
  const plan = useMemo(() => buildStudyPlan(profile, options), [profile, options]);
  return (
    <section className="academy-study-plan">
      <div className="academy-section-heading">
        <div>
          <p className="academy-eyebrow">Một buổi học vừa sức</p>
          <h2>Tạo lộ trình của em</h2>
          <p>Chọn thời lượng và mục tiêu. Có thể xem trước mọi bài trước khi bắt đầu.</p>
        </div>
      </div>
      <div className="academy-settings-card">
        <label className="academy-field">
          Thời gian em muốn dành cho lượt học
          <select aria-label="Thời lượng lộ trình" value={options.minutes} onChange={event => setOptions(current => ({ ...current, minutes: +event.target.value as StudyPlanOptions['minutes'] }))}>
            {[5, 10, 15, 20].map(minutes => <option key={minutes} value={minutes}>Khoảng {minutes} phút</option>)}
          </select>
        </label>
        <label className="academy-field">
          Mục tiêu luyện tập
          <select aria-label="Mục tiêu lộ trình" value={options.focus} onChange={event => setOptions(current => ({ ...current, focus: event.target.value as StudyPlanOptions['focus'] }))}>
            <option value="balanced">Cân bằng mọi kỹ năng</option>
            <option value="weakest">Ưu tiên kỹ năng cần luyện thêm</option>
            {CHAPTERS.map(chapter => <option value={chapter.skill} key={chapter.id}>{SKILL_NAMES[chapter.skill]}</option>)}
          </select>
        </label>
        <label className="academy-toggle-row">
          <span><strong>Chơi lại bài đã hoàn thành</strong><small>Cho phép đưa bài cũ vào lộ trình, vẫn ưu tiên bài mới.</small></span>
          <input type="checkbox" checked={options.includeCompleted} onChange={event => setOptions(current => ({ ...current, includeCompleted: event.target.checked }))} />
        </label>
        <label className="academy-toggle-row">
          <span><strong>Xen kẽ kiểu chơi</strong><small>Tránh nhiều bài cùng cơ chế liên tiếp khi có lựa chọn khác.</small></span>
          <input type="checkbox" checked={options.variety} onChange={event => setOptions(current => ({ ...current, variety: event.target.checked }))} />
        </label>
      </div>
      {plan.games.length === 0 ? (
        <EmptyState icon="🎓" title="Đã hoàn thành các bài phù hợp" text="Bật chơi lại hoặc chọn nhóm kỹ năng khác để tạo lộ trình mới." />
      ) : (
        <div className="academy-settings-card">
          <div className="academy-section-heading">
            <div><h3>{plan.games.length} bài · khoảng {plan.estimatedMinutes} phút</h3><p>{plan.explanation}</p></div>
            <button type="button" className="academy-button academy-button--primary" onClick={() => onStart(plan.games.map(game => game.id))}>Bắt đầu lộ trình →</button>
          </div>
          <div className="academy-history-list">
            {plan.games.map((game, index) => (
              <article key={game.id}>
                <span aria-hidden="true">{game.icon}</span>
                <div><h3>{index + 1}. {game.title}</h3><small>{GAME_KIND_NAMES[game.kind]} · {SKILL_NAMES[game.skill]}</small></div>
                <strong>{profile.games[game.id]?.completions ? 'Ôn lại' : 'Khám phá'}</strong>
              </article>
            ))}
          </div>
          <p className="academy-fineprint" style={{ marginTop: 20 }}>Thời lượng là ước tính. Lộ trình không ép kết thúc bài khi hết thời gian; em có thể nghỉ giữa các bài.</p>
        </div>
      )}
    </section>
  );
}
