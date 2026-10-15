import React, { useEffect, useRef } from 'react';
import { Check, ChevronRight, Eye, ListChecks, ShieldCheck, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SCENARIO_BY_ID, LAB_SCENARIOS } from './catalog';
import { useScenarioSession } from './store';
import { useScenarioModal } from './useScenarioModal';
import { scenarioProgress } from './engine';
import { ScenarioIllustration } from './ScenarioIllustration';
import type { LabScenario, ScenarioAttempt, ScenarioEvent } from './types';

const STAGES = [
  { id: 'observe', title: 'Quan sát', Icon: Eye },
  { id: 'decide', title: 'Quyết định', Icon: ShieldCheck },
  { id: 'act', title: 'Thực hiện', Icon: ListChecks },
  { id: 'review', title: 'Ghi nhớ', Icon: Check },
] as const;

function StageStrip({ attempt }: { attempt: ScenarioAttempt }) {
  const current = STAGES.findIndex(stage => stage.id === attempt.stage);
  return <ol className="scenario-stage-strip" aria-label="Tiến trình tình huống">
    {STAGES.map(({ id, title, Icon }, index) => <li
      key={id}
      className={`${index === current ? 'is-current' : ''} ${index < current ? 'is-done' : ''}`}
      aria-current={index === current ? 'step' : undefined}
    >
      <span>{index < current ? <Check size={16} /> : <Icon size={16} />}</span>
      <span>{title}</span>
    </li>)}
  </ol>;
}

function ObservationStage({ scenario, attempt, send }: {
  scenario: LabScenario;
  attempt: ScenarioAttempt;
  send: (event: ScenarioEvent) => void;
}) {
  const ready = attempt.observed.length === scenario.clues.length;
  return <>
    <p className="scenario-eyebrow">Quan sát hiện trường</p>
    <h3>Tìm đủ ba dấu hiệu trước khi xử lý</h3>
    <p className="scenario-supporting">Chạm vào điểm đánh dấu trên hình hoặc chọn từng dấu hiệu bên dưới để xem chi tiết.</p>
    <div className="scenario-clue-list">
      {scenario.clues.map((clue, index) => {
        const observed = attempt.observed.includes(clue.id);
        return <button
          key={clue.id}
          className={`scenario-clue ${observed ? 'is-observed' : ''}`}
          type="button"
          aria-pressed={observed}
          onClick={() => send({ type: 'observe', clueId: clue.id })}
        >
          <span className="scenario-clue-number">{observed ? <Check size={16} /> : index + 1}</span>
          <span>
            <strong>{clue.title}</strong>
            <span className="scenario-clue-detail">{observed ? clue.detail : 'Chọn để quan sát dấu hiệu'}</span>
          </span>
        </button>;
      })}
    </div>
    <p className="scenario-counter" aria-live="polite">Đã quan sát {attempt.observed.length}/{scenario.clues.length} dấu hiệu</p>
    <button
      type="button"
      className="lab-button lab-button-primary"
      disabled={!ready}
      onClick={() => send({ type: 'start-decisions' })}
    >Chọn cách xử lý <ChevronRight size={17} /></button>
  </>;
}

function DecisionStage({ scenario, attempt, send }: {
  scenario: LabScenario;
  attempt: ScenarioAttempt;
  send: (event: ScenarioEvent) => void;
}) {
  const question = scenario.decisions[attempt.decisionIndex];
  if (!question) return null;
  const selected = question.choices.find(choice => choice.id === attempt.answered[question.id]);
  return <>
    <p className="scenario-eyebrow">Quyết định {attempt.decisionIndex + 1}/{scenario.decisions.length} · {question.title}</p>
    <h3>{question.prompt}</h3>
    <div className="scenario-choice-list" role="group" aria-label={question.prompt}>
      {question.choices.map((choice, index) => <button
        key={choice.id}
        type="button"
        disabled={!!selected}
        className={`scenario-choice ${selected?.id === choice.id ? choice.safe ? 'is-correct' : 'is-wrong' : ''}`}
        onClick={() => send({ type: 'answer', choiceId: choice.id })}
      >
        <span className="scenario-choice-letter">{String.fromCharCode(65 + index)}</span>
        <span>{choice.label}</span>
        {selected?.id === choice.id && <span className="scenario-choice-result">{choice.safe ? '✓' : '×'}</span>}
      </button>)}
    </div>
    {selected && <div className={`scenario-feedback ${selected.safe ? 'is-correct' : 'is-wrong'}`} role="status">
      <strong>{selected.safe ? 'Quyết định phù hợp' : 'Cần xem lại thao tác'}</strong>
      <p>{selected.feedback}</p>
    </div>}
    {selected && <button
      type="button"
      className="lab-button lab-button-primary"
      onClick={() => send({ type: selected.safe ? 'continue' : 'retry' })}
    >{selected.safe ? 'Tiếp tục' : 'Chọn lại'} <ChevronRight size={17} /></button>}
  </>;
}

function ActionStage({ scenario, attempt, send }: {
  scenario: LabScenario;
  attempt: ScenarioAttempt;
  send: (event: ScenarioEvent) => void;
}) {
  // Rotate the available actions independently of the expected execution order.
  const choices = [scenario.actions[2], scenario.actions[0], scenario.actions[1]];
  return <>
    <p className="scenario-eyebrow">Thực hiện · Bước {attempt.actionIndex + 1}/{scenario.actions.length}</p>
    <h3>Chọn bước cần làm tiếp theo</h3>
    <p className="scenario-supporting">Thứ tự có ý nghĩa. Hoàn thành bước kiểm soát nguy cơ trước khi tiếp tục.</p>
    <ol className="scenario-action-history" aria-label="Các bước đã thực hiện">
      {scenario.actions.slice(0, attempt.actionIndex).map((action, index) => <li key={action.id}>
        <Check size={16} /><span>{index + 1}. {action.label}</span>
      </li>)}
    </ol>
    <div className="scenario-choice-list">
      {choices.map(action => {
        const done = scenario.actions.findIndex(item => item.id === action.id) < attempt.actionIndex;
        return <button
          key={action.id}
          type="button"
          disabled={done}
          className={`scenario-choice ${done ? 'is-complete' : ''}`}
          onClick={() => send({ type: 'action', actionId: action.id })}
        >
          <span className="scenario-choice-letter">{done ? <Check size={17} /> : <ChevronRight size={17} />}</span>
          <span>{action.label}</span>
        </button>;
      })}
    </div>
  </>;
}

function ReviewStage({ scenario, attempt, send }: {
  scenario: LabScenario;
  attempt: ScenarioAttempt;
  send: (event: ScenarioEvent) => void;
}) {
  return <>
    <p className="scenario-eyebrow">Đối chiếu kết quả</p>
    <h3>Đã kiểm soát tình huống</h3>
    <div className="scenario-review-grid">
      <article><span>Nguyên nhân</span><p>{scenario.debrief.cause}</p></article>
      <article><span>Cách ứng phó</span><p>{scenario.debrief.response}</p></article>
      <article><span>Áp dụng lần sau</span><p>{scenario.debrief.transfer}</p></article>
    </div>
    <p className="scenario-supporting">{attempt.mistakes === 0
      ? 'Em đã nhận diện và thực hiện đúng ngay trong lần này.'
      : `Đã sửa ${attempt.mistakes} lựa chọn chưa phù hợp. Hãy ghi nhớ lý do trước khi tiếp tục.`}</p>
    <button type="button" className="lab-button lab-button-primary" onClick={() => send({ type: 'finish' })}>
      Ghi nhận và hoàn thành <Check size={17} />
    </button>
  </>;
}

export function ScenarioPanel() {
  const openId = useScenarioSession(s => s.openId);
  const waiting = useScenarioSession(s => s.waitingForFilm);
  const attempt = useScenarioSession(s => openId ? s.runs[openId] : undefined);
  const message = useScenarioSession(s => s.message);
  const lastMistake = useScenarioSession(s => s.lastMistake);
  const cinematic = useStore(s => s.cinematic);
  const active = !!openId && !waiting && !cinematic;
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useScenarioModal(active);

  useEffect(() => {
    if (openId && waiting && !cinematic) useScenarioSession.getState().reveal();
  }, [openId, waiting, cinematic]);
  useEffect(() => {
    if (!active) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        useScenarioSession.getState().close();
      }
      if (event.key !== 'Tab' || !panel.current) return;
      const targets = [...panel.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
      )].filter(element => element.getClientRects().length);
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active]);
  if (!active || !attempt || !openId) return null;
  const scenario = SCENARIO_BY_ID.get(openId);
  if (!scenario) return null;
  const send = (event: ScenarioEvent) => {
    const result = useScenarioSession.getState().dispatch(event);
    if (result.mistake) useStore.getState().addError('general_error');
    if (result.accepted) useStore.getState().saveGame();
    if (result.completed) {
      useStore.getState().completeTask(scenario.taskId);
      useScenarioSession.getState().close();
    }
  };
  const index = LAB_SCENARIOS.findIndex(item => item.id === scenario.id);
  return <div className="lab-modal-backdrop scenario-backdrop" data-ui data-scenario-panel>
    <section ref={panel} role="dialog" aria-modal="true" aria-labelledby="scenario-title" className="scenario-panel lab-dialog">
      <header className="scenario-header">
        <div>
          <p className="scenario-eyebrow">Tình huống {index + 1}/{LAB_SCENARIOS.length} · Phòng lab thực hành</p>
          <h2 id="scenario-title">{scenario.title}</h2>
          <p className="scenario-supporting">{scenario.summary}</p>
        </div>
        <button ref={closeButton} type="button" className="lab-icon-button" aria-label="Đóng tình huống và lưu tiến trình" onClick={() => useScenarioSession.getState().close()}><X size={20} /></button>
      </header>
      <StageStrip attempt={attempt} />
      <div className="scenario-body">
        <aside className="scenario-evidence">
          <ScenarioIllustration scenario={scenario} attempt={attempt} onInspect={clueId => send({ type: 'observe', clueId })} />
          <p className="scenario-image-caption">Mô hình quan sát · {scenario.title}</p>
          <div className="scenario-progress" role="progressbar" aria-label="Tiến trình tình huống" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scenarioProgress(scenario, attempt)}>
            <span style={{ width: `${scenarioProgress(scenario, attempt)}%` }} />
          </div>
          <p className="scenario-counter">{scenarioProgress(scenario, attempt)}% hoàn thành</p>
        </aside>
        <main className="scenario-content">
          {attempt.stage === 'observe' && <ObservationStage scenario={scenario} attempt={attempt} send={send} />}
          {attempt.stage === 'decide' && <DecisionStage scenario={scenario} attempt={attempt} send={send} />}
          {attempt.stage === 'act' && <ActionStage scenario={scenario} attempt={attempt} send={send} />}
          {attempt.stage === 'review' && <ReviewStage scenario={scenario} attempt={attempt} send={send} />}
          {message && attempt.stage === 'act' && <div className={`scenario-feedback ${lastMistake ? 'is-wrong' : 'is-correct'}`} role="status"><p>{message}</p></div>}
        </main>
      </div>
      <footer className="scenario-footer">
        <span>Tiến trình được lưu sau mỗi thao tác.</span>
        <span>Esc để đóng · Có thể tiếp tục sau</span>
      </footer>
    </section>
  </div>;
}
