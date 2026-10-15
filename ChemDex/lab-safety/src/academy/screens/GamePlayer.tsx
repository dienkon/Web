import React, { useEffect, useMemo, useState } from 'react';
import { Difficulty, GameDefinition } from '../core/types';
import { DIFFICULTY, formatDuration } from '../core/scoring';
import { useRound } from '../hooks/useRound';
import { useAcademy } from '../core/store';
import { SortingGame } from '../games/SortingGame';
import { SequenceGame } from '../games/SequenceGame';
import { MemoryGame } from '../games/MemoryGame';
import { HazardGame } from '../games/HazardGame';
import { PrecisionGame } from '../games/PrecisionGame';
import { DecisionGame } from '../games/DecisionGame';
import { FlowGame } from '../games/FlowGame';
import { ResultScreen } from './ResultScreen';
import { GAME_KIND_NAMES } from '../core/catalog';
import { hashText } from '../core/random';

const GAME_COMPONENTS = {
  sort: SortingGame,
  sequence: SequenceGame,
  memory: MemoryGame,
  hazard: HazardGame,
  precision: PrecisionGame,
  decision: DecisionGame,
  flow: FlowGame,
};

export function GamePlayer({ definition, onBack, onNext, exitRequested, onCancelExit }: {
  definition: GameDefinition;
  onBack: () => void;
  onNext?: () => void;
  exitRequested: boolean;
  onCancelExit: () => void;
}) {
  const preferences = useAcademy(state => state.profile.preferences);
  const [difficulty, setDifficulty] = useState<Difficulty>(preferences.difficulty);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [round, setRound] = useState(0);
  const [seed, setSeed] = useState(() => hashText(`${definition.id}:${Date.now()}`));
  const [showCoach, setShowCoach] = useState(false);

  useEffect(() => {
    const visibility = () => {
      if (document.hidden) setPaused(true);
    };
    const blur = () => setPaused(true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', blur);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const replay = () => {
    setRound(value => value + 1);
    setSeed(hashText(`${definition.id}:${Date.now()}`));
    setStarted(false);
    setPaused(false);
    setShowCoach(false);
    onCancelExit();
  };

  return (
    <div className="academy-game-player">
      {!started ? (
        <section className="academy-briefing" data-academy-briefing>
          <div className="academy-briefing-icon" style={{ '--game-accent': definition.accent } as React.CSSProperties}>{definition.icon}</div>
          <p className="academy-eyebrow">{GAME_KIND_NAMES[definition.kind]}</p>
          <h2>{definition.title}</h2>
          <p>{definition.subtitle}</p>
          <div className="academy-briefing-columns">
            <article>
              <h3>Mục tiêu lượt chơi</h3>
              <ul>{definition.objectives.map(objective => <li key={objective}>{objective}</li>)}</ul>
            </article>
            <article>
              <h3>Chơi để hiểu</h3>
              <p>Thời gian dùng để tự theo dõi. Em có thể tạm dừng, đọc phản hồi và thử lại khi chọn sai.</p>
              <p>Hướng dẫn và thông số trong trò chơi là mô phỏng học tập.</p>
            </article>
          </div>
          <fieldset className="academy-difficulty-picker">
            <legend>Chọn mức chơi</legend>
            {(Object.keys(DIFFICULTY) as Difficulty[]).map(key => (
              <label key={key} className={difficulty === key ? 'is-selected' : ''}>
                <input type="radio" name="academy-difficulty" value={key} checked={difficulty === key} onChange={() => setDifficulty(key)} />
                <span>{DIFFICULTY[key].icon}</span>
                <strong>{DIFFICULTY[key].label}</strong>
                <small>{DIFFICULTY[key].description}</small>
              </label>
            ))}
          </fieldset>
          <div className="academy-action-row">
            <button type="button" className="academy-button academy-button--primary" data-start-challenge onClick={() => {
              useAcademy.getState().updatePreferences({ difficulty });
              setStarted(true);
              setPaused(false);
              onCancelExit();
            }}>Bắt đầu thực hành →</button>
            <button type="button" className="academy-button academy-button--quiet" onClick={onBack}>Chọn bài khác</button>
          </div>
        </section>
      ) : (
        <ActiveRound
          key={`${definition.id}-${round}`}
          definition={definition}
          difficulty={difficulty}
          seed={seed}
          paused={paused || exitRequested}
          reducedMotion={preferences.reducedMotion}
          showTimer={preferences.showTimer}
          showCoach={showCoach}
          onPause={() => setPaused(true)}
          onResume={() => setPaused(false)}
          onCoach={() => setShowCoach(value => !value)}
          onReplay={replay}
          onBack={onBack}
          onNext={onNext}
        />
      )}
      {exitRequested && (
        <div className="academy-confirm-overlay" role="alertdialog" aria-labelledby="academy-exit-title">
          <section>
            <h3 id="academy-exit-title">Rời lượt chơi này?</h3>
            <p>Các bài đã hoàn thành vẫn được lưu. Nếu lượt này chưa hoàn tất, kết quả của lượt đó chưa được ghi.</p>
            <div className="academy-action-row">
              <button type="button" className="academy-button academy-button--primary" onClick={onCancelExit}>Tiếp tục chơi</button>
              <button type="button" className="academy-button" onClick={onBack}>Rời lượt chơi</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ActiveRound({ definition, difficulty, seed, paused, reducedMotion, showTimer, showCoach, onPause, onResume, onCoach, onReplay, onBack, onNext }: {
  definition: GameDefinition;
  difficulty: Difficulty;
  seed: number;
  paused: boolean;
  reducedMotion: boolean;
  showTimer: boolean;
  showCoach: boolean;
  onPause: () => void;
  onResume: () => void;
  onCoach: () => void;
  onReplay: () => void;
  onBack: () => void;
  onNext?: () => void;
}) {
  const { events, elapsed, result, callbacks } = useRound(definition, difficulty, true, paused);
  const correct = events.filter(event => event.type === 'correct').length;
  const mistakes = events.filter(event => event.type === 'mistake').length;
  const combo = useMemo(() => {
    let streak = 0;
    for (let index = events.length - 1; index >= 0; index--) {
      if (events[index].type !== 'correct') break;
      streak++;
    }
    return streak;
  }, [events]);
  const Component = GAME_COMPONENTS[definition.kind];
  if (result) return <ResultScreen definition={definition} result={result} onReplay={onReplay} onBack={onBack} onNext={onNext} />;
  return (
    <section className="academy-active-round" data-active-challenge={definition.id}>
      <div className="academy-round-toolbar">
        <div>
          <span className="academy-eyebrow">{GAME_KIND_NAMES[definition.kind]} · {DIFFICULTY[difficulty].label}</span>
          <h2>{definition.title}</h2>
        </div>
        <div className="academy-round-counters" aria-live="off">
          <span title="Thao tác đúng">✓ {correct}</span>
          <span title="Lần sửa sai">↻ {mistakes}</span>
          {combo >= 2 && <span className="academy-combo">⚡ {combo}</span>}
          {showTimer && <time>{formatDuration(elapsed)}</time>}
        </div>
        <div className="academy-action-row">
          <button type="button" className="academy-button academy-button--small" onClick={onCoach} aria-expanded={showCoach}>💡 Hướng dẫn</button>
          <button type="button" className="academy-button academy-button--small" onClick={onPause}>Ⅱ Tạm dừng</button>
        </div>
      </div>
      {showCoach && (
        <aside className="academy-coach-panel">
          <h3>Gợi ý của người hướng dẫn</h3>
          <ul>{definition.coachTips.map(tip => <li key={tip}>{tip}</li>)}</ul>
        </aside>
      )}
      <div className="academy-round-stage" aria-hidden={paused || undefined} inert={paused || undefined}>
        <Component
          {...callbacks}
          definition={definition}
          difficulty={difficulty}
          seed={seed}
          paused={paused}
          reducedMotion={reducedMotion}
        />
      </div>
      {paused && (
        <div className="academy-pause-overlay" role="dialog" aria-label="Lượt chơi đang tạm dừng">
          <section>
            <span aria-hidden="true">Ⅱ</span>
            <h3>Tạm dừng để quan sát</h3>
            <p>Đồng hồ và tương tác đã dừng. Tiếp tục khi em sẵn sàng.</p>
            <button type="button" className="academy-button academy-button--primary" onClick={onResume}>Tiếp tục thực hành</button>
          </section>
        </div>
      )}
    </section>
  );
}
