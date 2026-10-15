import React, { useEffect, useRef, useState } from 'react';
import { ArcadeGameProps } from '../core/types';
import { clamp, DIFFICULTY } from '../core/scoring';
import { Feedback, GameInstruction, HintButton } from '../components/GameUI';

interface FluidState {
  volume: number;
  temperature: number;
  pouring: boolean;
  stirring: boolean;
  overheated: boolean;
}

export function FlowGame(props: ArcadeGameProps) {
  const { definition, difficulty, paused, onCorrect, onMistake, onHint, onComplete } = props;
  const config = definition.flow!;
  const [source, setSource] = useState<'acid' | 'water'>('acid');
  const [fluid, setFluid] = useState<FluidState>({
    volume: 0,
    temperature: 25,
    pouring: false,
    stirring: false,
    overheated: false,
  });
  const [feedback, setFeedback] = useState('Chọn nguồn rồi giữ nút để rót từng phần; thả nút để dừng.');
  const [tone, setTone] = useState<'neutral' | 'correct' | 'mistake'>('neutral');
  const [stirs, setStirs] = useState(0);
  const current = useRef(fluid);
  const finished = useRef(false);
  const heatedWarning = useRef(false);
  const overfillWarning = useRef(false);
  const milestone = useRef(0);
  const callbacks = useRef(props);
  callbacks.current = props;

  const change = (next: FluidState) => {
    current.current = next;
    setFluid(next);
  };

  useEffect(() => {
    if (paused) {
      change({ ...current.current, pouring: false });
      return;
    }
    let animation = 0;
    let previous = performance.now();
    let sample = 0;
    const update = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (!finished.current) {
        const old = current.current;
        const rate = config.pourRate * (difficulty === 'challenge' ? 1.15 : 1);
        const volume = clamp(old.volume + (old.pouring ? rate * delta : 0), 0, config.target + 15);
        const heat = old.pouring ? config.heatingRate * rate * delta : 0;
        const cooling = (!old.pouring ? config.coolingRate : config.coolingRate * 0.12) * (old.stirring ? 1.7 : 1) * delta;
        const temperature = Math.max(25, old.temperature + heat - cooling);
        const next = {
          ...old,
          volume,
          temperature,
          overheated: old.overheated || temperature > config.maxTemperature,
        };
        current.current = next;
        sample += delta;
        if (sample >= 0.05) {
          sample = 0;
          setFluid(next);
        }
        if (temperature > config.maxTemperature && !heatedWarning.current) {
          heatedWarning.current = true;
          setFeedback('Nhiệt vượt vùng luyện tập. Dừng rót, khuấy trong mô phỏng và chờ; xem lại cách thêm từng phần.');
          setTone('mistake');
          callbacks.current.onMistake('Dòng rót làm nhiệt tăng quá nhanh', 'Rót từng phần nhỏ, quan sát và nghỉ giữa các phần.');
          current.current = { ...next, pouring: false };
        }
        if (volume > config.target + 3 && !overfillWarning.current) {
          overfillWarning.current = true;
          setFeedback('Đã rót quá lượng được giao trong trò chơi. Đặt lại mẻ mô phỏng và điều khiển chậm hơn.');
          setTone('mistake');
          callbacks.current.onMistake('Rót vượt lượng mô phỏng', 'Không cố đảo chiều thao tác hóa chất thật để sửa sai.');
          current.current = { ...current.current, pouring: false };
        }
        const newMilestone = Math.min(3, Math.floor(volume / config.target * 3));
        if (newMilestone > milestone.current) {
          milestone.current = newMilestone;
          callbacks.current.onCorrect(`Đã kiểm soát ${newMilestone}/3 phần dòng rót`);
        }
      }
      animation = requestAnimationFrame(update);
    };
    animation = requestAnimationFrame(update);
    const release = () => change({ ...current.current, pouring: false });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
    };
  }, [paused, config, difficulty]);

  const startPour = () => {
    if (paused || finished.current || overfillWarning.current) return;
    if (source === 'water') {
      setTone('mistake');
      setFeedback('Không rót nước vào axit đặc. Trong bài này hãy chọn axit làm nguồn, nước là nơi nhận.');
      onMistake('Chọn chiều rót không an toàn', 'Luôn theo quy trình pha loãng được giáo viên giao.');
      return;
    }
    if (current.current.temperature > config.maxTemperature - 2) {
      setFeedback('Chờ vùng nhiệt giảm trước khi rót phần tiếp theo.');
      setTone('neutral');
      return;
    }
    change({ ...current.current, pouring: true });
  };

  const finish = () => {
    if (paused || finished.current) return;
    const state = current.current;
    const tolerance = 2 * DIFFICULTY[difficulty].toleranceMultiplier;
    if (Math.abs(state.volume - config.target) > tolerance || state.temperature > 28 || state.pouring || stirs < 1) {
      setFeedback('Cần đạt lượng được giao, đã khuấy, dừng dòng rót và chờ về vùng nguội ≤28°C của mô hình.');
      setTone('neutral');
      return;
    }
    finished.current = true;
    onCorrect('Kết thúc dòng rót có kiểm soát');
    onComplete([
      'Đã chọn chiều rót axit vào nước trong mô phỏng.',
      `Lượng thêm: ${state.volume.toFixed(1)} / ${config.target} đơn vị mô phỏng.`,
      `Đã khuấy ${stirs} lượt và chờ nhiệt mô hình về ${state.temperature.toFixed(1)}°C.`,
      config.instruction,
    ]);
  };

  return (
    <div className="academy-game academy-flow-game" data-game-kind="flow">
      <GameInstruction icon="💧" title="Giữ để rót, thả để quan sát">
        {config.instruction}
      </GameInstruction>
      <div className="academy-flow-controls">
        <button type="button" className={`academy-button ${source === 'acid' ? 'is-selected' : ''}`} aria-pressed={source === 'acid'} disabled={paused || fluid.pouring} onClick={() => setSource('acid')}>
          Nguồn: axit mô phỏng
        </button>
        <button type="button" className={`academy-button ${source === 'water' ? 'is-selected' : ''}`} aria-pressed={source === 'water'} disabled={paused || fluid.pouring} onClick={() => setSource('water')}>
          Thử chọn nước làm nguồn
        </button>
      </div>
      <div className={`academy-flow-stage ${fluid.pouring ? 'is-pouring' : ''} ${fluid.temperature > 38 ? 'is-warm' : ''}`}>
        <div className="academy-flow-bottle" aria-hidden="true"><span>{source === 'acid' ? 'A' : 'W'}</span></div>
        {fluid.pouring && <div className="academy-flow-stream" aria-hidden="true" />}
        <div className="academy-flow-beaker" aria-hidden="true">
          <div style={{ height: `${35 + fluid.volume / config.target * 45}%` }} />
          <span>H₂O</span>
          {fluid.stirring && <i />}
        </div>
        <div className="academy-flow-readout">
          <strong>{fluid.volume.toFixed(1)} / {config.target}</strong>
          <span>đơn vị lượng trong mô hình</span>
          <strong>{fluid.temperature.toFixed(1)}°C</strong>
          <span>nhiệt mô hình</span>
        </div>
      </div>
      <div className="academy-heat-meter" aria-label={`Nhiệt mô hình ${fluid.temperature.toFixed(1)} độ C`}>
        <div style={{ width: `${clamp((fluid.temperature - 25) / (config.maxTemperature - 25) * 100, 0, 100)}%` }} />
      </div>
      <div className="academy-action-row">
        <button
          type="button"
          data-pour-control
          className="academy-button academy-button--primary academy-hold-button"
          disabled={paused || finished.current}
          onPointerDown={event => {
            event.currentTarget.setPointerCapture(event.pointerId);
            startPour();
          }}
          onPointerUp={() => change({ ...current.current, pouring: false })}
          onPointerCancel={() => change({ ...current.current, pouring: false })}
          onKeyDown={event => {
            if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
              event.preventDefault();
              startPour();
            }
          }}
          onKeyUp={event => {
            if (event.key === ' ' || event.key === 'Enter') change({ ...current.current, pouring: false });
          }}
        >
          {fluid.pouring ? 'Đang rót · thả để dừng' : 'Giữ để rót'}
        </button>
        <button type="button" className="academy-button" disabled={paused} aria-pressed={fluid.stirring} onClick={() => {
          change({ ...current.current, stirring: !current.current.stirring });
          if (!fluid.stirring) setStirs(value => value + 1);
        }}>
          {fluid.stirring ? '↻ Đang khuấy' : '↻ Khuấy trong mô hình'}
        </button>
        <button type="button" className="academy-button" disabled={paused} onClick={() => {
          change({ volume: 0, temperature: 25, pouring: false, stirring: false, overheated: false });
          heatedWarning.current = false;
          overfillWarning.current = false;
          milestone.current = 0;
          setStirs(0);
          setFeedback('Đã đặt lại mẻ mô phỏng. Thêm từng phần nhỏ và nghỉ giữa các lần.');
        }}>
          Đặt lại mẻ
        </button>
        <button type="button" className="academy-button academy-button--primary" disabled={paused} onClick={finish}>Kiểm tra mẻ</button>
        <HintButton disabled={paused} onClick={() => {
          const text = 'Giữ rót một đoạn ngắn, thả để nhiệt giảm, bật khuấy; gần mục tiêu thì nhấp từng phần nhỏ.';
          setFeedback(text);
          onHint(text);
        }} />
      </div>
      <Feedback text={feedback} tone={tone} />
    </div>
  );
}
