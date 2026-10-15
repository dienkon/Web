import { StudyPlanScreen } from './screens/StudyPlanScreen';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAcademy } from './core/store';
import { ACADEMY_GAMES } from './data/games';
import { CHAPTERS } from './data/chapters';
import { SAFETY_CASES } from './data/cases';
import { dailyGames, filterGames, GAME_KIND_NAMES, GAME_MAP, recommendedGames, SKILL_NAMES, skillSummaries } from './core/catalog';
import { dueReviews, chooseReviewCases } from './core/review';
import { GameDefinition } from './core/types';
import { levelForXP, localStudyDay } from './core/scoring';
import { GamePlayer } from './screens/GamePlayer';
import { GlossaryScreen } from './screens/GlossaryScreen';
import { NotebookScreen } from './screens/NotebookScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { EmptyState, Stat } from './components/GameUI';
import { useDialogFocus } from './hooks/useDialogFocus';
import './academy.css';

type Page = 'plan' | 'home' | 'games' | 'progress' | 'glossary' | 'notebook' | 'settings';
const NAV = [
  { id: 'home', title: 'Tổng quan', icon: '◈' },
  { id: 'games', title: 'Phòng thử thách', icon: '🎮' },
  { id: 'plan', title: 'Lộ trình riêng', icon: '🧭' },
  { id: 'progress', title: 'Tiến trình', icon: '📈' },
  { id: 'glossary', title: 'Từ điển', icon: '📖' },
  { id: 'notebook', title: 'Sổ tay', icon: '📝' },
  { id: 'settings', title: 'Tùy chọn', icon: '⚙' },
] as const;

export default function AcademyHub() {
  const profile = useAcademy(state => state.profile);
  const launch = useAcademy(state => state.launchGameId);
  const [page, setPage] = useState<Page>('home');
  const [game, setGame] = useState<GameDefinition | null>(null);
  const [plan, setPlan] = useState<string[]>([]);
  const [playerKey, setPlayerKey] = useState(0);
  const [exitRequested, setExitRequested] = useState(false);
  const [query, setQuery] = useState('');
  const [skill, setSkill] = useState('all');
  const [kind, setKind] = useState('all');
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const [sort, setSort] = useState('chapter');
  const root = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLElement>(null);
  const level = levelForXP(profile.xp);
  const recommended = useMemo(() => recommendedGames(profile), [profile]);
  const daily = useMemo(() => dailyGames(), []);
  const skills = useMemo(() => skillSummaries(profile), [profile]);
  const due = dueReviews(profile.reviews);
  const completed = ACADEMY_GAMES.filter(item => profile.games[item.id]?.completions > 0).length;
  const earnedGold = ACADEMY_GAMES.filter(item => profile.games[item.id]?.bestMedal === 'gold').length;
  const filtered = useMemo(() => {
    const choices = filterGames(query, skill, kind, onlyBookmarks, profile);
    if (sort === 'title') choices.sort((left, right) => left.title.localeCompare(right.title, 'vi'));
    if (sort === 'unplayed') choices.sort((left, right) => Number(!!profile.games[left.id]?.completions) - Number(!!profile.games[right.id]?.completions));
    if (sort === 'score') choices.sort((left, right) => (profile.games[right.id]?.bestScore ?? 0) - (profile.games[left.id]?.bestScore ?? 0));
    return choices;
  }, [query, skill, kind, onlyBookmarks, profile, sort]);

  const play = (id: string) => {
    const definition = GAME_MAP.get(id);
    if (!definition) return;
    setGame(definition);
    setPlayerKey(value => value + 1);
    setExitRequested(false);
  };

  useEffect(() => {
    if (launch) {
      const definition = GAME_MAP.get(launch);
      if (definition) setGame(definition);
      useAcademy.getState().clearLaunch();
    }
  }, [launch]);

  useEffect(() => {
    scroll.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [page, game?.id]);

  const close = useCallback(() => {
    if (game) setExitRequested(true);
    else useAcademy.getState().closeHub();
  }, [game]);
  useDialogFocus(root, close);

  const review = () => {
    const cases = chooseReviewCases(SAFETY_CASES, profile.reviews, 6);
    const base = ACADEMY_GAMES.find(item => item.kind === 'decision')!;
    setGame({
      ...base,
      id: 'review-practice',
      title: 'Ôn lại điều cần nhớ',
      subtitle: 'Ưu tiên tình huống đến lịch ôn hoặc chưa từng thực hành.',
      caseIds: cases.map(item => item.id),
    });
    setPlayerKey(value => value + 1);
    setExitRequested(false);
  };

  const plannedNext = game && plan.includes(game.id) ? plan[plan.indexOf(game.id)+1] : null;
  const nextGame = plannedNext ? GAME_MAP.get(plannedNext)! : game && plan.length ? null : game ? ACADEMY_GAMES[(ACADEMY_GAMES.findIndex(item => item.id === game.id) + 1) % ACADEMY_GAMES.length] : null;
  const navigate = (next: Page) => {
    if (game) {
      setExitRequested(true);
      return;
    }
    setPage(next);
  };

  return (
    <div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="academy-title"
      data-academy
      className={`academy-shell ${profile.preferences.highContrast ? 'academy-high-contrast' : ''} ${profile.preferences.largeText ? 'academy-large-text' : ''} ${profile.preferences.reducedMotion ? 'academy-reduce-motion' : ''}`}
    >
      <aside className="academy-sidebar">
        <div className="academy-brand"><span aria-hidden="true">⚗</span><div><strong>ChemDex</strong><small>ACADEMY</small></div></div>
        <nav aria-label="Học viện">
          {NAV.map(item => <button type="button" key={item.id} className={page === item.id && !game ? 'is-active' : ''} aria-current={page === item.id && !game ? 'page' : undefined} onClick={() => navigate(item.id)}><span aria-hidden="true">{item.icon}</span><strong>{item.title}</strong></button>)}
        </nav>
        <div className="academy-sidebar-progress"><span>Cấp {level.level}</span><strong>{level.title}</strong><div className="academy-meter"><i style={{ width: `${level.progress * 100}%` }} /></div><small>{profile.xp} XP · {completed}/{ACADEMY_GAMES.length} bài</small></div>
        <button type="button" className="academy-return" onClick={close}>← Trở lại phòng lab</button>
      </aside>
      <div className="academy-main">
        <header className="academy-header">
          <div><p className="academy-eyebrow">Thực hành • Quan sát • Hiểu nguyên tắc</p><h1 id="academy-title">{game ? 'Thử thách thực hành' : NAV.find(item => item.id === page)?.title}</h1></div>
          <div className="academy-header-actions"><span className="academy-pill">🔥 {profile.streak} ngày</span><button type="button" className="academy-close" aria-label="Đóng học viện" onClick={close}>✕</button></div>
        </header>
        <main ref={scroll} className="academy-content">
          {game ? (
            <GamePlayer key={`${game.id}-${playerKey}`} definition={game} exitRequested={exitRequested} onCancelExit={() => setExitRequested(false)} onBack={() => { setGame(null); setExitRequested(false); }} onNext={nextGame ? () => play(nextGame.id) : undefined} />
          ) : page === 'home' ? (
            <div className="academy-home">
              <section className="academy-hero">
                <div><p className="academy-eyebrow">Chào {profile.preferences.learnerName || 'người khám phá'}</p><h2>Học bằng cách<br /><em>tự tay thực hành.</em></h2><p>44 bài chơi, 7 kiểu tương tác. Quan sát, thử, sửa sai và giữ lại điều thực sự cần nhớ trong phòng thí nghiệm.</p><div className="academy-action-row"><button type="button" className="academy-button academy-button--primary" onClick={() => recommended[0] && play(recommended[0].id)}>Tiếp tục khám phá →</button><button type="button" className="academy-button" onClick={review}>Ôn tình huống {due.length ? `(${due.length})` : ''}</button></div></div>
                <div className="academy-hero-art" aria-hidden="true"><div className="academy-orbit academy-orbit--one" /><div className="academy-orbit academy-orbit--two" /><span className="academy-hero-flask">⚗️</span><span className="academy-orbit-token academy-orbit-token--one">🥽</span><span className="academy-orbit-token academy-orbit-token--two">🧪</span><span className="academy-orbit-token academy-orbit-token--three">⚖️</span></div>
              </section>
              <div className="academy-stat-grid"><Stat icon="🎓" label="Bài đã hiểu" value={`${completed}/${ACADEMY_GAMES.length}`} /><Stat icon="🥇" label="Bài đạt vàng" value={earnedGold} /><Stat icon="✨" label="Kinh nghiệm" value={`${profile.xp} XP`} /><Stat icon="🧠" label="Đến lịch ôn" value={due.length} /></div>
              <section><div className="academy-section-heading"><div><p className="academy-eyebrow">Theo tiến trình của em</p><h2>Gợi ý lượt tiếp theo</h2></div><button type="button" className="academy-text-link" onClick={() => setPage('games')}>Xem mọi bài →</button></div><div className="academy-game-grid">{recommended.map(item => <GameCard key={item.id} game={item} onPlay={play} />)}</div></section>
              <section><div className="academy-section-heading"><div><p className="academy-eyebrow">Lộ trình sáu kỹ năng</p><h2>Khám phá phòng thí nghiệm</h2></div></div><div className="academy-chapter-grid">{CHAPTERS.map(chapter => {
                const progress = skills.find(item => item.id === chapter.skill)!;
                return <button type="button" className="academy-chapter-card" key={chapter.id} style={{ '--chapter-color': chapter.color } as React.CSSProperties} onClick={() => { setSkill(chapter.skill); setPage('games'); }}><span className="academy-chapter-icon">{chapter.icon}</span><small>CHƯƠNG {chapter.number}</small><h3>{chapter.title}</h3><p>{chapter.subtitle}</p><div className="academy-meter"><i style={{ width: `${progress.mastery}%` }} /></div><footer>{progress.completed}/{progress.total} bài <span>Khám phá →</span></footer></button>;
              })}</div></section>
              <section className="academy-daily"><div><p className="academy-eyebrow">Thay đổi mỗi ngày · {localStudyDay()}</p><h2>Một vòng luyện tập cân bằng</h2><p>Mỗi nhóm kỹ năng một bài. Không cần làm hết trong một lần.</p></div><div className="academy-daily-list">{daily.map(item => <button type="button" key={item.id} onClick={() => play(item.id)}><span>{item.icon}</span><div><strong>{item.title}</strong><small>{SKILL_NAMES[item.skill]}</small></div><em>{profile.games[item.id]?.completions ? '✓' : '→'}</em></button>)}</div></section>
            </div>
          ) : page === 'games' ? (
            <section className="academy-library">
              <div className="academy-section-heading"><div><p className="academy-eyebrow">Lựa chọn kiểu chơi em thích</p><h2>Phòng thử thách</h2><p>{filtered.length} bài phù hợp · chọn mức chơi khi bắt đầu.</p></div><button type="button" className="academy-button" aria-pressed={onlyBookmarks} onClick={() => setOnlyBookmarks(value => !value)}>{onlyBookmarks ? '★ Đã lưu' : '☆ Chỉ xem đã lưu'}</button></div>
              <div className="academy-search-row"><input aria-label="Tìm bài thực hành" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm cân, kéo thả, rác, PASS…" /><select aria-label="Lọc kỹ năng" value={skill} onChange={event => setSkill(event.target.value)}><option value="all">Mọi kỹ năng</option>{CHAPTERS.map(chapter => <option key={chapter.id} value={chapter.skill}>{SKILL_NAMES[chapter.skill]}</option>)}</select><select aria-label="Lọc kiểu chơi" value={kind} onChange={event => setKind(event.target.value)}><option value="all">Mọi kiểu chơi</option>{Object.entries(GAME_KIND_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select aria-label="Sắp xếp bài" value={sort} onChange={event => setSort(event.target.value)}><option value="chapter">Theo lộ trình</option><option value="title">Theo tên</option><option value="unplayed">Chưa chơi trước</option><option value="score">Điểm cao trước</option></select></div>
              {filtered.length ? <div className="academy-game-grid">{filtered.map(item => <GameCard key={item.id} game={item} onPlay={play} />)}</div> : <EmptyState icon="🔎" title="Chưa thấy bài phù hợp" text="Thử từ tìm kiếm khác hoặc bỏ bớt bộ lọc." action={<button type="button" className="academy-button" onClick={() => { setQuery(''); setSkill('all'); setKind('all'); setOnlyBookmarks(false); }}>Xóa bộ lọc</button>} />}
            </section>
          ) : page === 'plan' ? <StudyPlanScreen onStart={ids=>{setPlan(ids);play(ids[0]);}}/> : page === 'progress' ? <ProgressScreen onPlay={play} /> : page === 'glossary' ? <GlossaryScreen /> : page === 'notebook' ? <NotebookScreen /> : <SettingsScreen />}
        </main>
        <footer className="academy-footer"><span>✦ Học để hiểu, thực hành theo hướng dẫn giáo viên.</span><span>Lưu trên thiết bị này</span></footer>
      </div>
    </div>
  );
}

function GameCard({ game, onPlay }: { game: GameDefinition; onPlay: (id: string) => void }) {
  const progress = useAcademy(state => state.profile.games[game.id]);
  const bookmarked = useAcademy(state => state.profile.bookmarks.includes(game.id));
  return (
    <article className="academy-game-card" style={{ '--game-accent': game.accent } as React.CSSProperties}>
      <div className="academy-game-card-top"><span className="academy-game-card-icon">{game.icon}</span><button type="button" aria-label={bookmarked ? `Bỏ lưu ${game.title}` : `Lưu ${game.title}`} aria-pressed={bookmarked} onClick={() => useAcademy.getState().toggleBookmark(game.id)}>{bookmarked ? '★' : '☆'}</button></div>
      <span className="academy-game-kind">{GAME_KIND_NAMES[game.kind]}</span>
      <h3>{game.title}</h3>
      <p>{game.subtitle}</p>
      <div className="academy-game-card-progress"><span>{progress?.completions ? `✓ ${progress.bestScore}/100` : 'Chưa thực hành'}</span><span>{progress?.bestMedal === 'gold' ? '🥇' : progress?.bestMedal === 'silver' ? '🥈' : progress?.bestMedal === 'bronze' ? '🥉' : SKILL_NAMES[game.skill]}</span></div>
      <button type="button" className="academy-button academy-button--primary" data-play-game={game.id} onClick={() => onPlay(game.id)}>{progress?.completions ? 'Luyện lại' : 'Vào thử thách'} →</button>
    </article>
  );
}
