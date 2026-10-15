import React, { useEffect, useRef, useState } from 'react';
import { ArcadeGameProps } from '../core/types';
import { clamp, DIFFICULTY } from '../core/scoring';
import { Feedback, GameInstruction, HintButton } from '../components/GameUI';

export function PrecisionGame(props: ArcadeGameProps) {
  const { definition, difficulty, paused, onCorrect, onMistake, onHint, onComplete } = props;
  const config = definition.precision!;
  const [value, setValue] = useState(config.minimum);
  const [tare, setTare] = useState(!config.needsTare);
  const [eye, setEye] = useState(!config.needsEyeLevel);
  const [stable, setStable] = useState(false);
  const [feedback, setFeedback] = useState(config.instruction);
  const [tone, setTone] = useState<'neutral' | 'correct' | 'mistake'>('neutral');
  const [attempts, setAttempts] = useState(0);
  const finished = useRef(false);
  const tolerance = config.tolerance * DIFFICULTY[difficulty].toleranceMultiplier;
  const percentage = (value - config.minimum) / (config.maximum - config.minimum) * 100;
  const targetPercent = (config.target - config.minimum) / (config.maximum - config.minimum) * 100;
  const error = Math.abs(value - config.target);

  useEffect(() => {
    setStable(false);
    if (paused) return;
    const timer = setTimeout(() => setStable(true), 600);
    return () => clearTimeout(timer);
  }, [value, paused]);

  const adjust = (amount: number) => {
    if (paused || finished.current) return;
    setValue(current => Math.round(clamp(current + amount, config.minimum, config.maximum) * 1000) / 1000);
  };

  const confirm = () => {
    if (paused || finished.current) return;
    setAttempts(current => current + 1);
    if (!tare || !eye) {
      const message = !tare ? 'Cần đặt vật chứa và trừ bì trước khi ghi khối lượng.' : 'Đặt mắt ngang vạch trước khi xác nhận thể tích.';
      setFeedback(message);
      setTone('mistake');
      onMistake('Thiếu bước chuẩn bị phép đo', message);
      return;
    }
    if (!stable) {
      setFeedback('Số đọc đang ổn định. Hãy dừng điều chỉnh một lát rồi xác nhận.');
      setTone('neutral');
      return;
    }
    if (error > tolerance + 1e-8) {
      const message = `Đang đọc ${value.toFixed(2)} ${config.unit}; mục tiêu là ${config.target} ${config.unit}. Điều chỉnh từng bước nhỏ.`;
      setFeedback(message);
      setTone('mistake');
      onMistake('Số đọc chưa đạt khoảng được giao', message);
      return;
    }
    finished.current = true;
    const text = `Đạt ${value.toFixed(2)} ${config.unit}, sai lệch ${error.toFixed(2)} ${config.unit} trong bài mô phỏng.`;
    setFeedback(text);
    setTone('correct');
    onCorrect('Phép đo đạt tiêu chí', text);
    onComplete([
      `Mục tiêu: ${config.target} ${config.unit}.`,
      text,
      config.needsTare ? 'Đã thực hiện trừ bì trước khi ghi.' : 'Đã kiểm tra công cụ trước khi xác nhận.',
      config.needsEyeLevel ? 'Đã xác nhận tư thế mắt ngang vạch.' : 'Đã chờ số đọc ổn định.',
      'Kết quả mô phỏng không thay thế hiệu chuẩn hoặc quy trình của thiết bị thật.',
    ]);
  };

  return (
    <div className="academy-game academy-precision-game" data-game-kind="precision">
      <GameInstruction icon="🎯" title={`Mục tiêu: ${config.target} ${config.unit}`}>
        Kéo thanh điều chỉnh, dùng nút tinh chỉnh hoặc phím mũi tên. Chờ số đọc ổn định trước khi ghi.
      </GameInstruction>
      <div className="academy-precision-layout">
        <div className={`academy-instrument academy-instrument--${config.instrument}`}>
          <div className="academy-instrument-scale" aria-hidden="true">
            <div className="academy-instrument-liquid" style={{ height: `${percentage}%` }} />
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} style={{ bottom: `${index * 20}%` }}>
                {Math.round(config.minimum + (config.maximum - config.minimum) * index / 5)} ─
              </span>
            ))}
            {difficulty === 'explore' && <i className="academy-target-line" style={{ bottom: `${targetPercent}%` }} />}
          </div>
          <div className="academy-instrument-base" />
        </div>
        <div className="academy-readout-panel">
          <span className="academy-eyebrow">Số đọc hiện tại</span>
          <output className="academy-digital-readout" aria-live="off">
            {(value + (config.needsTare && !tare ? 12 : 0)).toFixed(2)} <small>{config.unit}</small>
          </output>
          <span className={`academy-stability ${stable ? 'is-stable' : ''}`}>
            {stable ? '● Ổn định' : '◌ Đang ổn định'}
          </span>
          <p>Khoảng chấp nhận trong trò chơi: ±{tolerance.toFixed(2)} {config.unit}</p>
          <p>{attempts} lần xác nhận</p>
        </div>
      </div>
      <label className="academy-range-label">
        Điều chỉnh số đọc
        <input
          type="range"
          data-precision-input
          aria-label="Điều chỉnh số đọc"
          min={config.minimum}
          max={config.maximum}
          step={config.step}
          value={value}
          disabled={paused || finished.current}
          onChange={event => setValue(+event.target.value)}
        />
      </label>
      <div className="academy-fine-controls">
        {[-10, -1, 1, 10].map(multiplier => (
          <button
            key={multiplier}
            type="button"
            className="academy-button"
            disabled={paused || finished.current}
            onClick={() => adjust(multiplier * config.step)}
          >
            {multiplier > 0 ? '+' : ''}{Number((multiplier * config.step).toFixed(3))} {config.unit}
          </button>
        ))}
      </div>
      <div className="academy-action-row">
        {config.needsTare && (
          <button type="button" className="academy-button" aria-pressed={tare} disabled={paused} onClick={() => {
            setTare(true);
            setValue(0);
            setFeedback('Vật chứa đã được trừ bì. Bây giờ thêm lượng mẫu được giao.');
          }}>
            {tare ? '✓ Đã trừ bì' : 'Đặt cốc và trừ bì'}
          </button>
        )}
        {config.needsEyeLevel && (
          <button type="button" className="academy-button" aria-pressed={eye} disabled={paused} onClick={() => {
            setEye(true);
            setFeedback('Đã đặt tư thế quan sát ngang vạch. Đọc đúng mặt khum theo bài học.');
          }}>
            {eye ? '✓ Mắt ngang vạch' : 'Đặt mắt ngang vạch'}
          </button>
        )}
        <button type="button" className="academy-button academy-button--primary" disabled={paused || finished.current} onClick={confirm}>
          Ghi kết quả
        </button>
        <HintButton disabled={paused} onClick={() => {
          const text = `Cần ${config.target} ${config.unit}. ${!tare ? 'Trừ bì trước. ' : ''}${!eye ? 'Đặt mắt ngang vạch. ' : ''}Điều chỉnh chậm, chờ ổn định.`;
          setFeedback(text);
          setTone('neutral');
          onHint(text);
        }} />
      </div>
      <Feedback text={feedback} tone={tone} />
    </div>
  );
}
