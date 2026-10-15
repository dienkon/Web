import React, { useMemo, useRef, useState } from 'react';
import { ArcadeGameProps } from '../core/types';
import { shuffled } from '../core/random';
import { Feedback, GameInstruction, HintButton, ProgressDots } from '../components/GameUI';

export function SequenceGame(props: ArcadeGameProps) {
  const { definition, seed, paused, onCorrect, onMistake, onHint, onComplete } = props;
  const steps = definition.steps ?? [];
  const choices = useMemo(() => shuffled(steps, seed), [definition, seed]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('Xếp bước cần làm trước vào ô đang sáng.');
  const [tone, setTone] = useState<'neutral' | 'correct' | 'mistake'>('neutral');
  const nextIndex = useRef(0);
  const finished = useRef(false);

  const place = (id: string, index: number) => {
    if (paused || finished.current || placed.includes(id)) return;
    if (index !== nextIndex.current) {
      setFeedback('Hãy hoàn thành ô đang sáng trước. Quy trình cần đi từng bước.');
      setTone('neutral');
      return;
    }
    const step = steps.find(candidate => candidate.id === id);
    if (!step) return;
    if (steps[index]?.id !== id) {
      onMistake(`Chưa đến bước: ${step.title}`, step.detail);
      setFeedback(`Bước này chưa phù hợp ở vị trí ${index + 1}. Hãy nghĩ về điều kiện cần có trước khi làm.`);
      setTone('mistake');
      return;
    }
    nextIndex.current++;
    setPlaced(current => [...current, id]);
    setSelected(null);
    setFeedback(`${step.title}. ${step.detail}`);
    setTone('correct');
    onCorrect(`Bước ${index + 1}: ${step.title}`, step.detail);
    if (nextIndex.current === steps.length) {
      finished.current = true;
      onComplete(steps.map((item, order) => `${order + 1}. ${item.title}: ${item.detail}`));
    }
  };

  const hint = () => {
    const step = steps[nextIndex.current];
    if (!step) return;
    const text = `Tiếp theo: ${step.title}. ${step.detail}`;
    setSelected(step.id);
    setFeedback(text);
    setTone('neutral');
    onHint(text);
  };

  return (
    <div className="academy-game academy-sequence-game" data-game-kind="sequence">
      <GameInstruction icon="➜" title="Xếp quy trình theo thứ tự">
        Chọn thẻ rồi chọn ô sáng, kéo thả bằng chuột, hoặc dùng nút Đặt bước này.
      </GameInstruction>
      <ProgressDots total={steps.length} completed={placed.length} label="Quy trình" />
      <div className="academy-sequence-layout">
        <div className="academy-step-deck" aria-label="Các thẻ thao tác">
          {choices.map(step => (
            <button
              type="button"
              key={step.id}
              data-sequence-card={step.id}
              draggable={!paused && !placed.includes(step.id)}
              onDragStart={event => {
                event.dataTransfer.setData('text/plain', step.id);
                setSelected(step.id);
              }}
              disabled={paused || placed.includes(step.id)}
              aria-pressed={selected === step.id}
              className={`academy-step-card ${selected === step.id ? 'is-selected' : ''}`}
              onClick={() => setSelected(step.id)}
            >
              <span aria-hidden="true">{placed.includes(step.id) ? '✓' : step.icon}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </div>
            </button>
          ))}
        </div>
        <ol className="academy-step-slots" aria-label="Thứ tự quy trình">
          {steps.map((step, index) => {
            const complete = index < placed.length;
            const active = index === placed.length;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  data-sequence-slot={index}
                  className={`${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`}
                  disabled={paused || !active}
                  onDragOver={event => {
                    if (active) event.preventDefault();
                  }}
                  onDrop={event => {
                    event.preventDefault();
                    const id = event.dataTransfer.getData('text/plain');
                    if (id) place(id, index);
                  }}
                  onClick={() => selected && place(selected, index)}
                >
                  <span>{complete ? '✓' : index + 1}</span>
                  <strong>{complete ? step.title : active ? 'Đặt bước tiếp theo' : 'Chờ bước trước'}</strong>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="academy-action-row">
        <button
          type="button"
          className="academy-button academy-button--primary"
          disabled={paused || !selected || finished.current}
          onClick={() => selected && place(selected, placed.length)}
        >
          Đặt bước này →
        </button>
        <HintButton onClick={hint} disabled={paused || finished.current} />
      </div>
      <Feedback text={feedback} tone={tone} />
    </div>
  );
}
