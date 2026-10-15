import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArcadeGameProps } from '../core/types';
import { shuffled } from '../core/random';
import { Feedback, GameInstruction, HintButton, ProgressDots } from '../components/GameUI';

interface Card {
  id: string;
  pairId: string;
  text: string;
  icon: string;
  side: 'left' | 'right';
}

export function MemoryGame(props: ArcadeGameProps) {
  const { definition, seed, paused, difficulty, onCorrect, onMistake, onHint, onComplete } = props;
  const pairs = definition.pairs ?? [];
  const cards = useMemo(() => shuffled<Card>(pairs.flatMap(pair => [
    { id: `${pair.id}-left`, pairId: pair.id, text: pair.left, icon: pair.icon, side: 'left' },
    { id: `${pair.id}-right`, pairId: pair.id, text: pair.right, icon: pair.icon, side: 'right' },
  ]), seed), [definition, seed]);
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('Lật một thẻ dụng cụ và một thẻ công dụng để tìm cặp.');
  const [tone, setTone] = useState<'neutral' | 'correct' | 'mistake'>('neutral');
  const [preview, setPreview] = useState(false);
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);
  const finished = useRef(false);
  const remainingDelay = useRef(0);

  useEffect(() => {
    if (open.length !== 2 || paused || finished.current) return;
    const first = cards.find(card => card.id === open[0]);
    const second = cards.find(card => card.id === open[1]);
    if (!first || !second) return;
    // The pair is assessed when the second card is selected; this timer only
    // returns nonmatching cards face down and is suspended while paused.
    if (first.pairId === second.pairId) return;
    const started = performance.now();
    const duration = remainingDelay.current || (difficulty === 'explore' ? 1600 : 1000);
    let timerCompleted = false;
    const timer = setTimeout(() => {
      timerCompleted = true;
      remainingDelay.current = 0;
      setOpen([]);
      lock.current = false;
    }, duration);
    return () => {
      clearTimeout(timer);
      remainingDelay.current = timerCompleted ? 0 : Math.max(50, duration - (performance.now() - started));
    };
  }, [open, paused, cards, difficulty]);

  useEffect(() => {
    if (!preview || paused) return;
    const timer = setTimeout(() => setPreview(false), 1800);
    return () => clearTimeout(timer);
  }, [preview, paused]);

  const flip = (card: Card) => {
    if (paused || lock.current || finished.current || preview || matched.includes(card.pairId) || open.includes(card.id)) return;
    if (open.length === 0) {
      setOpen([card.id]);
      return;
    }
    const first = cards.find(candidate => candidate.id === open[0]);
    if (!first) return;
    setMoves(value => value + 1);
    setOpen([first.id, card.id]);
    lock.current = true;
    if (first.pairId !== card.pairId) {
      setTone('mistake');
      setFeedback('Hai thẻ chưa tạo thành một cặp. Nhớ vị trí, đọc cả hai rồi thử lại.');
      onMistake('Cặp thẻ chưa khớp', `${first.text} ↔ ${card.text}`);
      return;
    }
    const pair = pairs.find(candidate => candidate.id === card.pairId)!;
    const next = [...matched, card.pairId];
    setMatched(next);
    setOpen([]);
    lock.current = false;
    setTone('correct');
    setFeedback(`${pair.left} → ${pair.right}. ${pair.explanation}`);
    onCorrect(`Ghép đúng: ${pair.left}`, pair.explanation);
    if (next.length === pairs.length) {
      finished.current = true;
      onComplete(pairs.map(item => `${item.left} → ${item.right}: ${item.explanation}`));
    }
  };

  return (
    <div className="academy-game academy-memory-game" data-game-kind="memory">
      <GameInstruction icon="▦" title="Nhớ vị trí, hiểu công dụng">
        Mặt sau có hai loại: dụng cụ/khái niệm và công dụng/ý nghĩa. Ghép một thẻ mỗi loại.
      </GameInstruction>
      <div className="academy-game-meta">
        <ProgressDots total={pairs.length} completed={matched.length} label="Cặp đúng" />
        <span>{moves} lượt ghép</span>
      </div>
      <div className="academy-memory-grid">
        {cards.map(card => {
          const complete = matched.includes(card.pairId);
          const visible = complete || preview || open.includes(card.id);
          return (
            <button
              type="button"
              key={card.id}
              data-memory-card={card.id}
              className={`academy-memory-card ${visible ? 'is-open' : ''} ${complete ? 'is-matched' : ''}`}
              disabled={paused || complete || preview}
              aria-label={visible ? card.text : `${card.side === 'left' ? 'Thẻ khái niệm' : 'Thẻ ý nghĩa'} chưa mở`}
              onClick={() => flip(card)}
            >
              <span aria-hidden="true">{visible ? complete ? '✓' : card.icon : card.side === 'left' ? '🧰' : '💬'}</span>
              <strong>{visible ? card.text : card.side === 'left' ? 'Khái niệm' : 'Ý nghĩa'}</strong>
            </button>
          );
        })}
      </div>
      <Feedback text={feedback} tone={tone} />
      <HintButton
        disabled={paused || preview || finished.current || open.length === 2}
        onClick={() => {
          setPreview(true);
          setFeedback('Quan sát toàn bộ thẻ trong giây lát. Cố liên hệ công dụng với dụng cụ.');
          setTone('neutral');
          onHint('Xem trước vị trí các cặp thẻ.');
        }}
      />
    </div>
  );
}
