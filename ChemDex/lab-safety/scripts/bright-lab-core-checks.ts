import assert from 'node:assert/strict';
import { LAB_SCENARIOS } from '../src/scenarios/catalog';
import {
  newScenarioAttempt,
  restoreScenarioAttempt,
  scenarioProgress,
  transitionScenario,
  validateScenario,
} from '../src/scenarios/engine';
import {
  advanceFocusLatch,
  createFocusLatch,
  rankFocusCandidate,
  rankFocusCandidates,
} from '../src/core/focus/FocusResolver';
import type { ScenarioEvent } from '../src/scenarios/types';

const checks: string[] = [];
function test(name: string, run: () => void) {
  run();
  checks.push(name);
  console.log('PASS', name);
}

test('15 unique scenarios, task IDs, detailed clues and valid safe choices', () => {
  assert.equal(LAB_SCENARIOS.length, 15);
  assert.equal(new Set(LAB_SCENARIOS.map(s => s.id)).size, LAB_SCENARIOS.length);
  assert.equal(new Set(LAB_SCENARIOS.map(s => s.taskId)).size, LAB_SCENARIOS.length);
  for (const scenario of LAB_SCENARIOS) assert.deepEqual(validateScenario(scenario), []);
});

test('every scenario requires observations, three decisions and ordered actions', () => {
  for (const scenario of LAB_SCENARIOS) {
    let attempt = newScenarioAttempt(scenario);
    const dispatch = (event: ScenarioEvent) => {
      const result = transitionScenario(scenario, attempt, event);
      attempt = result.attempt;
      return result;
    };
    assert.equal(dispatch({ type: 'finish' }).accepted, false);
    assert.equal(dispatch({ type: 'start-decisions' }).accepted, false);
    for (const clue of scenario.clues) {
      assert.equal(dispatch({ type: 'observe', clueId: clue.id }).accepted, true);
      assert.equal(dispatch({ type: 'observe', clueId: clue.id }).accepted, false);
    }
    assert.equal(dispatch({ type: 'start-decisions' }).accepted, true);
    for (const question of scenario.decisions) {
      assert.equal(dispatch({ type: 'continue' }).accepted, false);
      const unsafe = question.choices.find(choice => !choice.safe)!;
      const safe = question.choices.find(choice => choice.safe)!;
      assert.equal(dispatch({ type: 'answer', choiceId: unsafe.id }).mistake, true);
      assert.equal(dispatch({ type: 'continue' }).accepted, false);
      assert.equal(dispatch({ type: 'answer', choiceId: safe.id }).accepted, false);
      assert.equal(dispatch({ type: 'retry' }).accepted, true);
      assert.equal(dispatch({ type: 'answer', choiceId: safe.id }).mistake, false);
      assert.equal(dispatch({ type: 'continue' }).accepted, true);
    }
    assert.equal(attempt.stage, 'act');
    assert.equal(dispatch({ type: 'action', actionId: scenario.actions[2].id }).mistake, true);
    assert.equal(attempt.actionIndex, 0);
    for (const action of scenario.actions) {
      assert.equal(dispatch({ type: 'action', actionId: action.id }).mistake, false);
    }
    assert.equal(attempt.stage, 'review');
    assert.ok(scenarioProgress(scenario, attempt) < 100);
    assert.equal(dispatch({ type: 'finish' }).accepted, true);
    assert.equal(attempt.completed, true);
    assert.equal(scenarioProgress(scenario, attempt), 100);
    assert.equal(dispatch({ type: 'finish' }).accepted, false);
    assert.equal(attempt.mistakes, scenario.decisions.length + 1);
    assert.deepEqual(restoreScenarioAttempt(scenario, attempt), attempt);
  }
});

test('invalid event IDs cannot alter scenario progress', () => {
  const scenario = LAB_SCENARIOS[0];
  const attempt = newScenarioAttempt(scenario);
  assert.equal(transitionScenario(scenario, attempt, { type: 'observe', clueId: 'missing' }).accepted, false);
  assert.equal(transitionScenario(scenario, attempt, { type: 'answer', choiceId: 'missing' }).accepted, false);
  assert.equal(transitionScenario(scenario, attempt, { type: 'action', actionId: 'missing' }).accepted, false);
  assert.equal(attempt.observed.length, 0);
});

test('save restoration rejects foreign clues and incomplete claimed completion', () => {
  const scenario = LAB_SCENARIOS[0];
  const restored = restoreScenarioAttempt(scenario, {
    ...newScenarioAttempt(scenario),
    observed: [scenario.clues[0].id, scenario.clues[0].id, 'foreign'],
    completed: true,
    actionIndex: 100,
    mistakes: -30,
  });
  assert.deepEqual(restored.observed, [scenario.clues[0].id]);
  assert.equal(restored.completed, false);
  assert.equal(restored.stage, 'observe');
  assert.equal(restored.mistakes, 0);
  assert.deepEqual(restoreScenarioAttempt(scenario, null), newScenarioAttempt(scenario));
});

const view = {
  eye: [0, 1.62, 0] as const,
  feet: [0, 0, 0] as const,
  forward: [0, 0, -1] as const,
};
const target = {
  id: 'target',
  label: 'Dùng: Cốc mẫu',
  position: [0, 1.4, -1.5] as const,
  isActive: true,
};

test('focus accepts a reachable object in front of the player', () => {
  assert.ok(rankFocusCandidate(target, view, null));
});

test('focus rejects ceiling fixtures, far equipment and objects behind', () => {
  assert.equal(rankFocusCandidate({ ...target, position: [0, 3.7, -.5] }, view, null), null);
  assert.equal(rankFocusCandidate({ ...target, position: [0, 1.4, -4] }, view, null), null);
  assert.equal(rankFocusCandidate({ ...target, position: [0, 1.4, 1] }, view, null), null);
  assert.equal(rankFocusCandidate({ ...target, position: [1.5, 1.4, 0] }, view, null), null);
  assert.equal(rankFocusCandidate({ ...target, isActive: false }, view, null), null);
});

test('focus ranks the aimed object ahead of a closer off-axis object', () => {
  const ranked = rankFocusCandidates([
    { ...target, id: 'off-axis', position: [.5, 1.6, -.7] },
    target,
  ], view, null);
  assert.equal(ranked[0].candidate.id, 'target');
});

test('focus acquisition waits and losing aim clears immediately', () => {
  const latch = createFocusLatch();
  assert.equal(advanceFocusLatch(latch, 'cup', .075, false), null);
  assert.equal(advanceFocusLatch(latch, 'cup', .075, false), null);
  assert.equal(advanceFocusLatch(latch, 'cup', .075, false), 'cup');
  assert.equal(advanceFocusLatch(latch, null, .075, false), null);
  assert.equal(latch.pendingId, null);
});

test('adjacent targets do not flicker while the old target remains valid', () => {
  const latch = createFocusLatch();
  for (let i = 0; i < 3; i++) advanceFocusLatch(latch, 'cup', .075, true);
  assert.equal(latch.activeId, 'cup');
  assert.equal(advanceFocusLatch(latch, 'tap', .075, true), 'cup');
  assert.equal(advanceFocusLatch(latch, 'cup', .075, true), 'cup');
  assert.equal(latch.pendingId, null);
  for (let i = 0; i < 4; i++) advanceFocusLatch(latch, 'tap', .075, true);
  assert.equal(latch.activeId, 'tap');
});

export const report = {
  passed: true,
  checks,
  scenarios: LAB_SCENARIOS.length,
  decisions: LAB_SCENARIOS.reduce((count, scenario) => count + scenario.decisions.length, 0),
  observations: LAB_SCENARIOS.reduce((count, scenario) => count + scenario.clues.length, 0),
};
