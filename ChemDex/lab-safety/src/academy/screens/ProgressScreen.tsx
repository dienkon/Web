import { CoachingScreen } from './CoachingScreen';
import React, { useMemo, useState } from 'react';
import { useAcademy } from '../core/store';
import { ACADEMY_GAMES } from '../data/games';
import { GAME_MAP, SKILL_NAMES, skillSummaries } from '../core/catalog';
import { achievements } from '../core/achievements';
import { formatDuration, levelForXP } from '../core/scoring';
import { downloadText, reportCSV } from '../core/export';
import { EmptyState, Stat } from '../components/GameUI';

export function ProgressScreen({ onPlay }: { onPlay: (id: string) => void }) {
  const profile = useAcademy(state => state.profile);
  const [tab, setTab] = useState<'skills' | 'badges' | 'history' | 'coaching'>('skills');
  const [historySkill, setHistorySkill] = useState('all');
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const skills = useMemo(() => skillSummaries(profile), [profile]);
  const badges = useMemo(() => achievements(profile), [profile]);
  const completed = ACADEMY_GAMES.filter(game => profile.games[game.id]?.completions > 0).length;
  const earned = badges.filter(badge => badge.earned).length;
  const totalMinutes = Math.round(profile.history.reduce((sum, item) => sum + item.elapsedSeconds, 0) / 60);
  const level = levelForXP(profile.xp);
  const chart = profile.history.slice(-12);
  const history = [...profile.history].reverse().filter(result => {
    return historySkill === 'all' || GAME_MAP.get(result.gameId)?.skill === historySkill;
  });
  const selected = selectedPoint === null ? null : chart[selectedPoint];

  return (
    <section className="academy-progress-screen">
      <div className="academy-section-heading">
        <div><p className="academy-eyebrow">Nhìn lại cách mình tiến bộ</p><h2>Hồ sơ học tập</h2><p>{profile.preferences.learnerName || 'Người khám phá'} · Cấp {level.level} · {level.title}</p></div>
        <button type="button" className="academy-button" onClick={() => downloadText('chemdex-academy-report.csv', reportCSV(profile), 'text/csv;charset=utf-8')}>↓ Xuất báo cáo</button>
      </div>
      <div className="academy-stat-grid">
        <Stat icon="🎓" label="Bài đã hoàn thành" value={`${completed}/${ACADEMY_GAMES.length}`} />
        <Stat icon="✨" label="Tổng kinh nghiệm" value={`${profile.xp} XP`} />
        <Stat icon="🏅" label="Thành tích hiện có" value={`${earned}/${badges.length}`} />
        <Stat icon="⏱️" label="Phút thực hành đã lưu" value={totalMinutes} />
      </div>
      <div className="academy-level-card">
        <div><strong>Cấp {level.level}</strong><span>Còn {level.remaining} XP đến cấp tiếp theo</span></div>
        <div className="academy-meter"><i style={{ width: `${level.progress * 100}%` }} /></div>
      </div>
      <div className="academy-tabs" role="tablist" aria-label="Xem tiến trình">
        {(['skills', 'badges', 'history', 'coaching'] as const).map(key => <button type="button" role="tab" key={key} aria-selected={tab === key} onClick={() => setTab(key)}>{key === 'skills' ? 'Kỹ năng' : key === 'badges' ? 'Thành tích' : key === 'coaching' ? 'Gợi ý luyện tập' : 'Lịch sử'}</button>)}
      </div>
      {tab === 'skills' && (
        <div className="academy-skill-section">
          <div className="academy-skill-grid">
            {skills.map(skill => (
              <article key={skill.id} className="academy-skill-card">
                <div><h3>{skill.label}</h3><strong>{skill.mastery}%</strong></div>
                <div className="academy-meter"><i style={{ width: `${skill.mastery}%` }} /></div>
                <p>{skill.completed}/{skill.total} bài hoàn thành · điểm tốt nhất trung bình {skill.averageScore}/100</p>
                {skill.nextGameId && <button type="button" className="academy-button academy-button--small" onClick={() => onPlay(skill.nextGameId!)}>Luyện kỹ năng này →</button>}
              </article>
            ))}
          </div>
          <section className="academy-chart-card">
            <h3>Điểm các lượt gần đây</h3>
            {chart.length === 0 ? <p>Hoàn thành một bài để bắt đầu theo dõi.</p> : (
              <>
                <div className="academy-score-chart" role="group" aria-label="Điểm các lượt gần đây, chọn một cột để xem">
                  {[100, 75, 50, 25].map(value => <span key={value} className="academy-chart-gridline" style={{ bottom: `${value}%` }}><small>{value}</small></span>)}
                  {chart.map((result, index) => (
                    <button type="button" key={result.id} aria-label={`${GAME_MAP.get(result.gameId)?.title ?? 'Ôn tập'}: ${result.score} điểm`} className={selectedPoint === index ? 'is-selected' : ''} style={{ height: `${Math.max(6, result.score)}%` }} onClick={() => setSelectedPoint(index)}><span>{result.score}</span></button>
                  ))}
                </div>
                <p className="academy-chart-caption">{selected ? `${GAME_MAP.get(selected.gameId)?.title ?? 'Ôn tập'} · ${selected.score}/100 · ${formatDuration(selected.elapsedSeconds)}` : 'Chọn một cột để xem lượt chơi.'}</p>
              </>
            )}
          </section>
        </div>
      )}
      {tab === 'badges' && (
        <div className="academy-badge-grid">
          {badges.map(badge => <article className={`academy-badge-card ${badge.earned ? 'is-earned' : ''}`} key={badge.id}><span aria-hidden="true">{badge.icon}</span><h3>{badge.title}</h3><p>{badge.description}</p><div className="academy-meter"><i style={{ width: `${badge.progress * 100}%` }} /></div><small>{badge.earned ? '✓ Đã đạt' : `${Math.floor(badge.value)}/${badge.target}`}</small></article>)}
        </div>
      )}
      {tab === 'coaching' && <CoachingScreen onPlay={onPlay}/>}
      {tab === 'history' && (
        <section>
          <div className="academy-search-row"><label>Lọc kỹ năng<select aria-label="Kỹ năng lịch sử" value={historySkill} onChange={event => setHistorySkill(event.target.value)}><option value="all">Tất cả</option>{skills.map(skill => <option key={skill.id} value={skill.id}>{SKILL_NAMES[skill.id]}</option>)}</select></label></div>
          {history.length === 0 ? <EmptyState icon="📚" title="Chưa có lượt phù hợp" text="Kết quả hoàn thành sẽ hiện tại đây." /> : (
            <div className="academy-history-list">
              {history.map(result => <article key={result.id}><span aria-hidden="true">{result.medal === 'gold' ? '🥇' : result.medal === 'silver' ? '🥈' : '🥉'}</span><div><h3>{GAME_MAP.get(result.gameId)?.title ?? 'Lượt ôn tập tình huống'}</h3><small>{new Date(result.playedAt).toLocaleString('vi-VN')} · {formatDuration(result.elapsedSeconds)}</small></div><strong>{result.score}/100</strong><button type="button" className="academy-button academy-button--small" onClick={() => onPlay(result.gameId)} disabled={!GAME_MAP.has(result.gameId)}>Chơi lại</button></article>)}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
