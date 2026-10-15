import type {
  LabScenario,
  ScenarioAttempt,
  ScenarioEvent,
  ScenarioTransition,
} from './types';

export function newScenarioAttempt(scenario: LabScenario): ScenarioAttempt {
  return {
    scenarioId: scenario.id,
    stage: 'observe',
    observed: [],
    decisionIndex: 0,
    answered: {},
    actionIndex: 0,
    mistakes: 0,
    attempts: 0,
    completed: false,
  };
}

export function restoreScenarioAttempt(
  scenario: LabScenario,
  value: unknown,
): ScenarioAttempt {
  const clean = newScenarioAttempt(scenario);
  if (!value || typeof value !== 'object') return clean;
  const saved = value as Partial<ScenarioAttempt>;
  if (saved.scenarioId !== scenario.id) return clean;
  const validClues = new Set(scenario.clues.map(clue => clue.id));
  clean.observed = [...new Set(
    Array.isArray(saved.observed)
      ? saved.observed.filter(id => typeof id === 'string' && validClues.has(id))
      : [],
  )];
  clean.mistakes = Math.max(0, Math.min(999, Math.floor(Number(saved.mistakes) || 0)));
  clean.attempts = Math.max(0, Math.min(9999, Math.floor(Number(saved.attempts) || 0)));
  const allObserved = clean.observed.length === scenario.clues.length;
  if (!allObserved) return clean;
  clean.stage = 'decide';
  for (const decision of scenario.decisions) {
    const choiceId = saved.answered?.[decision.id];
    const choice = decision.choices.find(item => item.id === choiceId && item.safe);
    if (!choice) break;
    clean.answered[decision.id] = choice.id;
    clean.decisionIndex++;
  }
  if (clean.decisionIndex < scenario.decisions.length) return clean;
  clean.stage = 'act';
  clean.actionIndex = Math.max(0, Math.min(
    scenario.actions.length,
    Math.floor(Number(saved.actionIndex) || 0),
  ));
  if (clean.actionIndex < scenario.actions.length) return clean;
  clean.stage = saved.completed === true ? 'complete' : 'review';
  clean.completed = clean.stage === 'complete';
  return clean;
}

export function transitionScenario(
  scenario: LabScenario,
  current: ScenarioAttempt,
  event: ScenarioEvent,
): ScenarioTransition {
  const result: ScenarioTransition = {
    attempt: current,
    accepted: false,
    mistake: false,
    message: '',
  };
  if (current.completed || current.scenarioId !== scenario.id) return result;
  const next: ScenarioAttempt = {
    ...current,
    observed: [...current.observed],
    answered: { ...current.answered },
  };
  const accept = (message: string): ScenarioTransition => ({
    attempt: next,
    accepted: true,
    mistake: false,
    message,
  });
  const mistake = (message: string): ScenarioTransition => {
    next.mistakes++;
    next.attempts++;
    return { attempt: next, accepted: true, mistake: true, message };
  };
  if (event.type === 'observe' && current.stage === 'observe') {
    const clue = scenario.clues.find(item => item.id === event.clueId);
    if (!clue || next.observed.includes(clue.id)) return result;
    next.observed.push(clue.id);
    return accept(clue.detail);
  }
  if (event.type === 'start-decisions' && current.stage === 'observe') {
    if (current.observed.length !== scenario.clues.length) return result;
    next.stage = 'decide';
    return accept('Đã ghi nhận đủ dấu hiệu. Hãy quyết định cách xử lý.');
  }
  if (event.type === 'answer' && current.stage === 'decide') {
    const question = scenario.decisions[current.decisionIndex];
    if (!question || current.answered[question.id]) return result;
    const choice = question.choices.find(item => item.id === event.choiceId);
    if (!choice) return result;
    next.answered[question.id] = choice.id;
    next.attempts++;
    if (!choice.safe) {
      next.mistakes++;
      return { attempt: next, accepted: true, mistake: true, message: choice.feedback };
    }
    return accept(choice.feedback);
  }
  if (event.type === 'retry' && current.stage === 'decide') {
    const question = scenario.decisions[current.decisionIndex];
    const selected = question?.choices.find(item => item.id === current.answered[question.id]);
    if (!question || !selected || selected.safe) return result;
    delete next.answered[question.id];
    return accept('Hãy chọn lại cách xử lý phù hợp.');
  }
  if (event.type === 'continue' && current.stage === 'decide') {
    const question = scenario.decisions[current.decisionIndex];
    const selected = question?.choices.find(item => item.id === current.answered[question.id]);
    if (!selected?.safe) return result;
    next.decisionIndex++;
    if (next.decisionIndex >= scenario.decisions.length) next.stage = 'act';
    return accept(next.stage === 'act' ? 'Thực hiện các bước theo đúng thứ tự.' : 'Đã ghi nhận quyết định.');
  }
  if (event.type === 'action' && current.stage === 'act') {
    const expected = scenario.actions[current.actionIndex];
    if (!expected) return result;
    if (!scenario.actions.some(item => item.id === event.actionId)) return result;
    if (expected.id !== event.actionId) {
      return mistake(`Chưa đến bước này. Bước cần làm: ${expected.label}. ${expected.explanation}`);
    }
    next.actionIndex++;
    next.attempts++;
    if (next.actionIndex >= scenario.actions.length) next.stage = 'review';
    return accept(expected.explanation);
  }
  if (event.type === 'finish' && current.stage === 'review') {
    if (current.observed.length !== scenario.clues.length
      || current.decisionIndex !== scenario.decisions.length
      || current.actionIndex !== scenario.actions.length) return result;
    next.stage = 'complete';
    next.completed = true;
    return accept('Đã hoàn thành tình huống và ghi nhận kết quả.');
  }
  return result;
}

export function scenarioProgress(scenario: LabScenario, attempt: ScenarioAttempt): number {
  const total = scenario.clues.length + scenario.decisions.length + scenario.actions.length + 1;
  const completed = attempt.observed.length
    + Math.min(attempt.decisionIndex, scenario.decisions.length)
    + Math.min(attempt.actionIndex, scenario.actions.length)
    + Number(attempt.completed);
  return Math.min(100, Math.round(completed / total * 100));
}

export function validateScenario(scenario: LabScenario): string[] {
  const issues: string[] = [];
  if (!scenario.id || !scenario.title || !scenario.summary) issues.push('Missing identity or summary');
  if (scenario.clues.length < 3) issues.push('Needs at least three clues');
  if (scenario.decisions.length < 3) issues.push('Needs at least three decisions');
  if (scenario.actions.length < 3) issues.push('Needs at least three actions');
  if (scenario.dialogue.length < 3) issues.push('Needs at least three cinematic shots');
  const identifiers = new Set<string>();
  for (const clue of scenario.clues) {
    if (identifiers.has(clue.id)) issues.push(`Duplicate clue ${clue.id}`);
    identifiers.add(clue.id);
    if (!clue.detail) issues.push(`Clue lacks detail ${clue.id}`);
  }
  for (const decision of scenario.decisions) {
    if (decision.choices.filter(choice => choice.safe).length !== 1) {
      issues.push(`Decision must have exactly one safe choice: ${decision.id}`);
    }
    for (const choice of decision.choices) {
      if (!choice.feedback || !choice.label) issues.push(`Incomplete choice ${choice.id}`);
      if (identifiers.has(choice.id)) issues.push(`Duplicate choice ${choice.id}`);
      identifiers.add(choice.id);
    }
  }
  return issues;
}
