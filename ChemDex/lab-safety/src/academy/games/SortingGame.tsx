import React, { useMemo, useRef, useState } from 'react';
import { ArcadeGameProps } from '../core/types';
import { shuffled } from '../core/random';
import { Feedback, GameInstruction, HintButton, ProgressDots } from '../components/GameUI';

export function SortingGame(props: ArcadeGameProps) {
  const { definition, seed, paused, onCorrect, onMistake, onHint, onComplete } = props;
  const objects = useMemo(() => shuffled(definition.objects ?? [], seed), [definition, seed]);
  const bins = definition.bins ?? [];
  const [sorted, setSorted] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('Chọn một mẫu rồi chọn thùng, hoặc kéo thả trực tiếp.');
  const [tone, setTone] = useState<'neutral' | 'correct' | 'mistake'>('neutral');
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [lastBin, setLastBin] = useState<string | null>(null);
  const sortedRef = useRef(new Set<string>());
  const finished = useRef(false);

  const place = (objectId: string, binId: string) => {
    if (paused || finished.current || sortedRef.current.has(objectId)) return;
    const object = objects.find(candidate => candidate.id === objectId);
    const bin = bins.find(candidate => candidate.id === binId);
    if (!object || !bin) return;
    setDrag(null);
    setLastBin(binId);
    if (object.binId !== binId) {
      setTone('mistake');
      setFeedback(`${object.label} chưa thuộc nhóm “${bin.label}”. Đọc nhãn và thử lại; mẫu vẫn ở trên bàn.`);
      onMistake(`Phân loại chưa đúng: ${object.label}`, object.explanation);
      return;
    }
    sortedRef.current.add(objectId);
    const next = [...sortedRef.current];
    setSorted(next);
    setSelected(null);
    setTone('correct');
    setFeedback(`${object.label}: ${object.explanation}`);
    onCorrect(`Đúng nhóm: ${object.label}`, object.explanation);
    if (next.length === objects.length) {
      finished.current = true;
      onComplete(objects.map(item => `${item.label}: ${item.explanation}`));
    }
  };

  const hint = () => {
    const object = objects.find(candidate => candidate.id === selected)
      ?? objects.find(candidate => !sortedRef.current.has(candidate.id));
    if (!object) return;
    const bin = bins.find(candidate => candidate.id === object.binId);
    const text = `${object.label} → ${bin?.label}. ${object.explanation}`;
    setSelected(object.id);
    setFeedback(text);
    setTone('neutral');
    onHint(text);
  };

  return (
    <div className="academy-game academy-sort-game" data-game-kind="sort">
      <GameInstruction icon="↗" title="Đọc nhãn, kéo đúng nhóm">
        Chạm mẫu rồi chạm nhóm đích. Chuột, cảm ứng và bàn phím đều dùng được.
      </GameInstruction>
      <ProgressDots total={objects.length} completed={sorted.length} label="Đã phân loại" />
      <div className="academy-sort-table" aria-label="Các mẫu cần phân loại">
        {objects.map(object => {
          const complete = sorted.includes(object.id);
          return (
            <button
              key={object.id}
              type="button"
              data-sort-object={object.id}
              className={`academy-sort-object ${selected === object.id ? 'is-selected' : ''} ${complete ? 'is-sorted' : ''}`}
              disabled={paused || complete}
              aria-pressed={selected === object.id}
              aria-label={`${object.label}${complete ? ', đã phân loại' : ''}`}
              onClick={() => setSelected(selected === object.id ? null : object.id)}
              onPointerDown={event => {
                if (paused || complete) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                setSelected(object.id);
                setDrag({ id: object.id, x: event.clientX, y: event.clientY });
              }}
              onPointerMove={event => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                setDrag({ id: object.id, x: event.clientX, y: event.clientY });
              }}
              onPointerCancel={() => setDrag(null)}
              onPointerUp={event => {
                const element = document.elementFromPoint(event.clientX, event.clientY);
                const bin = element?.closest<HTMLElement>('[data-sort-bin]');
                setDrag(null);
                if (bin?.dataset.sortBin) place(object.id, bin.dataset.sortBin);
              }}
            >
              <span aria-hidden="true">{complete ? '✓' : object.icon}</span>
              <strong>{object.label}</strong>
              <small>{complete ? 'Đã cất đúng nhóm' : 'Chọn hoặc kéo'}</small>
            </button>
          );
        })}
      </div>
      <div className="academy-sort-bins" aria-label="Các nhóm đích">
        {bins.map(bin => {
          const count = objects.filter(object => sorted.includes(object.id) && object.binId === bin.id).length;
          return (
            <button
              key={bin.id}
              type="button"
              data-sort-bin={bin.id}
              className={`academy-sort-bin ${lastBin === bin.id ? 'was-target' : ''}`}
              style={{ '--bin-color': bin.color } as React.CSSProperties}
              disabled={paused}
              onClick={() => selected ? place(selected, bin.id) : setFeedback('Chọn mẫu trên bàn trước khi chọn nhóm đích.')}
            >
              <span aria-hidden="true">{bin.icon}</span>
              <strong>{bin.label}</strong>
              <small>{bin.description}</small>
              <em>{count} mẫu</em>
            </button>
          );
        })}
      </div>
      {drag && (
        <div className="academy-drag-preview" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {objects.find(object => object.id === drag.id)?.icon}
        </div>
      )}
      <Feedback text={feedback} tone={tone} />
      <HintButton onClick={hint} disabled={paused || finished.current} />
    </div>
  );
}
