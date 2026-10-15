import React, { useMemo, useRef, useState } from 'react';
import { ArcadeGameProps } from '../core/types';
import { CASE_MAP } from '../core/catalog';
import { shuffled } from '../core/random';
import { useAcademy } from '../core/store';
import { Feedback, GameInstruction, HintButton, ProgressDots } from '../components/GameUI';

export function DecisionGame(props: ArcadeGameProps) {
  const { definition, seed, paused, onCorrect, onMistake, onHint, onComplete } = props;
  const cases = useMemo(() => shuffled((definition.caseIds ?? []).map(id => CASE_MAP.get(id)).filter(Boolean), seed), [definition, seed]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState('Đọc tình huống, chọn cách xử lý rồi xác nhận.');
  const [tone, setTone] = useState<'neutral' | 'correct' | 'mistake'>('neutral');
  const finished = useRef(false);
  const current = cases[index];
  const options = useMemo(() => current ? shuffled(current.choices, seed + index * 101) : [], [current, seed, index]);
  const option = options.find(choice => choice.id === selected);

  if (!current) return <Feedback text="Chưa có tình huống cho bài này. Hãy trở lại chọn bài khác." />;

  const submit = () => {
    if (paused || answered || finished.current || !option) return;
    setAnswered(true);
    setFeedback(option.explanation);
    setTone(option.correct ? 'correct' : 'mistake');
    useAcademy.getState().answerCase(current.id, option.correct);
    if (option.correct) onCorrect(current.title, option.explanation);
    else onMistake(current.title, option.explanation);
  };

  const next = () => {
    if (paused || !answered || !option?.correct || finished.current) return;
    if (index + 1 === cases.length) {
      finished.current = true;
      onComplete(cases.map(item => `${item.title}: ${item.principle}`));
      return;
    }
    setIndex(value => value + 1);
    setSelected(null);
    setAnswered(false);
    setTone('neutral');
    setFeedback('Quan sát tình huống tiếp theo và chọn hành động phù hợp.');
  };

  return (
    <div className="academy-game academy-decision-game" data-game-kind="decision">
      <ProgressDots total={cases.length} completed={index} label="Tình huống" />
      <GameInstruction icon="🧠" title={current.title}>
        {current.setting}
      </GameInstruction>
      <div className="academy-case-prompt">
        <span className="academy-eyebrow">Em sẽ làm gì?</span>
        <h3>{current.prompt}</h3>
      </div>
      <div className="academy-choice-list">
        {options.map((choice, order) => (
          <button
            type="button"
            key={choice.id}
            data-decision-choice={choice.id}
            className={`academy-choice ${selected === choice.id ? 'is-selected' : ''} ${answered && selected === choice.id ? choice.correct ? 'is-correct' : 'is-mistake' : ''}`}
            aria-pressed={selected === choice.id}
            disabled={paused || answered}
            onClick={() => setSelected(choice.id)}
          >
            <span>{String.fromCharCode(65 + order)}</span>
            <strong>{choice.label}</strong>
          </button>
        ))}
      </div>
      <Feedback text={feedback} tone={tone} />
      <div className="academy-action-row">
        {!answered ? (
          <button type="button" className="academy-button academy-button--primary" disabled={paused || !selected} onClick={submit}>
            Xác nhận lựa chọn
          </button>
        ) : option?.correct ? (
          <button type="button" className="academy-button academy-button--primary" disabled={paused} onClick={next}>
            {index + 1 === cases.length ? 'Hoàn thành tình huống' : 'Tình huống tiếp theo →'}
          </button>
        ) : (
          <button type="button" className="academy-button" disabled={paused} onClick={() => {
            setAnswered(false);
            setSelected(null);
            setTone('neutral');
            setFeedback('Đọc phần giải thích rồi chọn lại. Hiểu nguyên tắc quan trọng hơn đoán đúng.');
          }}>
            Suy nghĩ và chọn lại
          </button>
        )}
        <HintButton disabled={paused || answered} onClick={() => {
          setFeedback(current.principle);
          setTone('neutral');
          onHint(current.principle);
        }} />
      </div>
      <details className="academy-reflection">
        <summary>Câu hỏi để tự giải thích</summary>
        <p>{current.reflection}</p>
      </details>
    </div>
  );
}
