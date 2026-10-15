import React, { useRef, useState } from 'react';
import { ArcadeGameProps, HazardSpot } from '../core/types';
import { Feedback, GameInstruction, HintButton, ProgressDots } from '../components/GameUI';

export function HazardGame(props: ArcadeGameProps) {
  const { definition, difficulty, paused, onCorrect, onMistake, onHint, onComplete } = props;
  const spots = definition.hazards ?? [];
  const [found, setFound] = useState<string[]>([]);
  const [selected, setSelected] = useState<HazardSpot | null>(null);
  const [feedback, setFeedback] = useState('Quan sát toàn cảnh. Chạm vật thể có điều kiện chưa an toàn.');
  const [tone, setTone] = useState<'neutral' | 'correct' | 'mistake'>('neutral');
  const [hintId, setHintId] = useState<string | null>(null);
  const foundRef = useRef(new Set<string>());
  const finished = useRef(false);

  const identify = (spot: HazardSpot) => {
    if (paused || finished.current || foundRef.current.has(spot.id)) return;
    setSelected(spot);
    setFeedback(`${spot.explanation} Cách xử lý: ${spot.remedy}`);
    setTone('correct');
    setHintId(null);
    foundRef.current.add(spot.id);
    setFound([...foundRef.current]);
    onCorrect(`Phát hiện: ${spot.label}`, spot.remedy);
  };

  const inspectScene = (event: React.MouseEvent<HTMLDivElement>) => {
    if (paused || finished.current) return;
    if ((event.target as HTMLElement).closest('button')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 100;
    const y = (event.clientY - rect.top) / rect.height * 100;
    const spot = spots.find(candidate => Math.hypot(candidate.x - x, candidate.y - y) <= candidate.radius);
    if (spot) identify(spot);
    else {
      setTone('neutral');
      setFeedback('Vùng này chưa có dấu hiệu được đánh dấu trong bài. Quan sát nhãn, vị trí vật thể và lối đi.');
    }
  };

  const finish = () => {
    if (paused || finished.current || found.length !== spots.length) return;
    finished.current = true;
    onComplete(spots.map(spot => `${spot.label}: ${spot.remedy}`));
  };

  return (
    <div className="academy-game academy-hazard-game" data-game-kind="hazard">
      <GameInstruction icon="🔎" title="Quan sát trước khi hành động">
        Chọn vật thể có nguy cơ. Bàn phím có thể Tab đến từng vật và nhấn Enter để kiểm tra.
      </GameInstruction>
      <ProgressDots total={spots.length} completed={found.length} label="Đã phát hiện" />
      <div
        className={`academy-hazard-scene academy-hazard-scene--${definition.scene ?? 'bench'}`}
        onClick={inspectScene}
        aria-label="Toàn cảnh phòng thực hành mô phỏng"
      >
        <div className="academy-scene-window" aria-hidden="true" />
        <div className="academy-scene-poster" aria-hidden="true">LAB<br />SAFETY</div>
        <div className="academy-scene-bench" aria-hidden="true" />
        <div className="academy-scene-shelf" aria-hidden="true" />
        <div className="academy-scene-exit" aria-hidden="true">EXIT</div>
        <div className="academy-scene-floor" aria-hidden="true" />
        {spots.map(spot => {
          const complete = found.includes(spot.id);
          return (
            <button
              type="button"
              key={spot.id}
              data-hazard-id={spot.id}
              className={`academy-hazard-object ${complete ? 'is-found' : ''} ${hintId === spot.id ? 'is-hinted' : ''}`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              aria-label={complete ? `${spot.label}, đã phát hiện` : `Kiểm tra vật thể: ${spot.label}`}
              disabled={paused || complete}
              onClick={event => {
                event.stopPropagation();
                identify(spot);
              }}
            >
              <span aria-hidden="true">{complete ? '✓' : spot.icon}</span>
              {(difficulty === 'explore' || complete || hintId === spot.id) && <small>{spot.label}</small>}
            </button>
          );
        })}
        <button
          type="button"
          className="academy-scene-safe-object"
          aria-label="Kiểm tra bình có nhãn, đặt ổn định"
          style={{ left: '40%', top: '49%' }}
          disabled={paused}
          onClick={event => {
            event.stopPropagation();
            setFeedback('Vật này đã có nhãn và được đặt ổn định trong bài mô phỏng. Hãy kiểm tra các vật khác.');
            setTone('mistake');
            onMistake('Đánh dấu một vật đang đạt điều kiện', 'Quan sát điều kiện cụ thể thay vì đánh dấu tất cả vật thể.');
          }}
        >
          🧴<small>Mẫu đã kiểm tra</small>
        </button>
      </div>
      <Feedback text={feedback} tone={tone} />
      {selected && (
        <div className="academy-hazard-remedy">
          <strong>{selected.label}</strong>
          <p>{selected.remedy}</p>
        </div>
      )}
      <div className="academy-action-row">
        <HintButton disabled={paused || found.length === spots.length} onClick={() => {
          const next = spots.find(spot => !foundRef.current.has(spot.id));
          if (!next) return;
          setHintId(next.id);
          setFeedback(`Quan sát vùng có ${next.label.toLocaleLowerCase('vi')}. ${next.explanation}`);
          setTone('neutral');
          onHint(`Gợi ý vị trí: ${next.label}`);
        }} />
        <button type="button" className="academy-button academy-button--primary" disabled={paused || found.length !== spots.length} onClick={finish}>
          Báo cáo các nguy cơ
        </button>
      </div>
    </div>
  );
}
