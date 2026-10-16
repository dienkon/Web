import type {
  LessonAction,
  LessonDefinition,
  LessonEvent,
  LessonSession,
} from './types';
import { requireLessonDefinition } from './catalog';
import { getLessonSpecies } from './catalog/species';
import {
  advanceLessonTemperature,
  createLessonEnvironment,
  evaluateLessonConditions,
  lessonConditionsReady,
  toggleLessonList,
} from './chemistry/conditions';
import {
  auditLessonMass,
  consumeLessonExtent,
  createLessonInventory,
  lessonInventoryMass,
  limitingLessonExtent,
  ventLessonProducts,
} from './chemistry/inventory';
import { integrateLessonRate, lessonTargetExtent } from './chemistry/kinetics';
import { deriveLessonVisuals, emptyLessonVisuals } from './chemistry/optics';

const MAX_EVENTS = 200;
const FIXED_STEP = 1 / 60;
const MAX_SUBSTEPS = 8;

function recordLessonEvent(session: LessonSession, kind: LessonEvent['kind'], message_vi: string): void {
  session.events.push({
    sequence: ++session.eventSequence,
    time_s: session.elapsed_s,
    kind,
    message_vi,
  });
  if (session.events.length > MAX_EVENTS) session.events.splice(0, session.events.length - MAX_EVENTS);
}

export function createLessonSession(
  definition: LessonDefinition,
  id: string,
  vesselId: string,
  sampleScale_mol = 0.001,
  excess: Record<string, number> = {},
): LessonSession {
  const inventory = createLessonInventory(definition, sampleScale_mol, excess);
  const session: LessonSession = {
    id,
    definitionId: definition.id,
    vesselId,
    status: 'prepared',
    elapsed_s: 0,
    physicalProgress: 0,
    extent_mol: 0,
    maxExtent_mol: limitingLessonExtent(inventory, definition.reactants),
    initialMass_g: lessonInventoryMass(inventory, getLessonSpecies),
    escapedMass_g: 0,
    inventory,
    environment: createLessonEnvironment(),
    visuals: emptyLessonVisuals(definition.initialColor),
    conditionResults: [],
    events: [],
    reachedCheckpoints: ['prepare'],
    lastRate_mol_s: 0,
    accumulator_s: 0,
    eventSequence: 0,
    sampleScale_mol,
    volume_ml: definition.reactants.some(term => ['aq', 'l'].includes(getLessonSpecies(term.species).phase)) ? 50 : 0,
    answer: null,
    seed: [...id].reduce((hash, character) => ((hash * 31) ^ character.charCodeAt(0)) >>> 0, 17),
  };
  session.conditionResults = evaluateLessonConditions(definition, session.environment);
  session.visuals = deriveLessonVisuals(definition, session, getLessonSpecies);
  recordLessonEvent(session, 'checkpoint', 'Đã chuẩn bị mẫu ảo; các chất chưa tiếp xúc.');
  if (session.maxExtent_mol <= 0) {
    recordLessonEvent(session, 'warning', 'Thiếu ít nhất một chất đầu; mẫu không thể chuyển hóa. Xem mục chất giới hạn.');
  }
  return session;
}

export function applyLessonAction(session: LessonSession, definition: LessonDefinition, action: LessonAction): void {
  if (session.status === 'stopped' && action.type !== 'answer') return;
  const environment = session.environment;
  switch (action.type) {
    case 'pressure':
      if (!Number.isFinite(action.value) || action.value <= 0) return;
      environment.pressure_bar = Math.min(200, action.value);
      recordLessonEvent(session, 'action', `Áp suất kịch bản ${environment.pressure_bar.toFixed(1)} bar.`);
      break;
    case 'mix':
      environment.mixed = true;
      recordLessonEvent(session, 'action', 'Cho các chất đầu tiếp xúc.');
      break;
    case 'stir':
      environment.stirring = action.active;
      recordLessonEvent(session, 'action', action.active ? 'Bật khuấy.' : 'Dừng khuấy.');
      break;
    case 'temperature':
      if (!Number.isFinite(action.value)) return;
      environment.targetTemperature_c = Math.max(0, Math.min(1100, action.value));
      recordLessonEvent(session, 'action', `Đặt nhiệt độ đích ảo ${environment.targetTemperature_c} °C.`);
      break;
    case 'pH':
      if (!Number.isFinite(action.value)) return;
      environment.pH = Math.max(0, Math.min(14, action.value));
      recordLessonEvent(session, 'action', `Thiết lập môi trường pH ${environment.pH.toFixed(1)} của kịch bản.`);
      break;
    case 'catalyst':
      environment.catalysts = toggleLessonList(environment.catalysts, action.id, action.active);
      recordLessonEvent(session, 'action', `${action.active ? 'Chọn' : 'Bỏ'} xúc tác ${action.id}.`);
      break;
    case 'enzyme':
      environment.enzymes = toggleLessonList(environment.enzymes, action.id, action.active);
      recordLessonEvent(session, 'action', `${action.active ? 'Chọn' : 'Bỏ'} enzym ${action.id}.`);
      break;
    case 'ignition':
      environment.ignition = action.active;
      recordLessonEvent(session, 'action', action.active ? 'Bật nguồn mồi ảo.' : 'Tắt nguồn mồi ảo.');
      break;
    case 'industrial':
      environment.industrial = action.active;
      recordLessonEvent(session, 'action', action.active ? 'Chọn điều kiện công nghiệp giản lược.' : 'Bỏ điều kiện công nghiệp.');
      break;
    case 'oxygen':
      environment.oxygenAvailable = action.active;
      recordLessonEvent(session, 'action', action.active ? 'Có nguồn O2.' : 'Ngắt nguồn O2.');
      break;
    case 'vent':
      environment.vented = action.active;
      recordLessonEvent(session, 'action', action.active ? 'Mở đường thoát khí trong mô hình.' : 'Giữ khí trong mô hình kín.');
      break;
    case 'pause':
      if (session.status !== 'complete') session.status = 'paused';
      session.lastRate_mol_s = 0;
      recordLessonEvent(session, 'action', 'Tạm dừng bài mô phỏng.');
      break;
    case 'resume':
      if (session.status === 'paused') session.status = 'waiting';
      recordLessonEvent(session, 'action', 'Tiếp tục bài mô phỏng.');
      break;
    case 'stop':
      session.status = 'stopped';
      session.lastRate_mol_s = 0;
      session.visuals.flame = 0;
      session.visuals.gasRate_mol_s = 0;
      recordLessonEvent(session, 'action', 'Dừng bài mô phỏng; giữ lại trạng thái và nhật ký.');
      break;
    case 'answer':
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= definition.question.choices_vi.length) return;
      session.answer = action.index;
      recordLessonEvent(session, 'action', 'Đã trả lời câu hỏi kiểm tra kiến thức.');
      break;
  }
  session.conditionResults = evaluateLessonConditions(definition, environment);
  if (session.status === 'prepared' && environment.mixed) session.status = 'waiting';
  if (environment.mixed && session.maxExtent_mol <= 0 && session.status !== 'stopped') {
    session.status = 'stopped';
    recordLessonEvent(session, 'warning', 'Không có đủ chất đầu để bắt đầu. Hãy chuẩn bị mẫu mới với tỉ lệ lớn hơn không.');
  }
  session.visuals = deriveLessonVisuals(definition, session, getLessonSpecies);
}

function updateLessonCheckpoints(definition: LessonDefinition, session: LessonSession): void {
  const target = lessonTargetExtent(definition, session.maxExtent_mol);
  const completion = target > 0 ? session.extent_mol / target : 0;
  for (const checkpoint of definition.checkpoints) {
    if (completion < checkpoint.progress || session.reachedCheckpoints.includes(checkpoint.id)) continue;
    session.reachedCheckpoints.push(checkpoint.id);
    recordLessonEvent(session, 'checkpoint', checkpoint.observation_vi);
  }
}

export function advanceLessonSession(definition: LessonDefinition, session: LessonSession, dt: number): void {
  if (['paused', 'stopped', 'complete'].includes(session.status)) return;
  if (!Number.isFinite(dt) || dt <= 0) return;
  const step = Math.min(dt, 0.1);
  session.elapsed_s += step;
  advanceLessonTemperature(session.environment, step);
  const previousReady = lessonConditionsReady(session.conditionResults);
  session.conditionResults = evaluateLessonConditions(definition, session.environment);
  const ready = lessonConditionsReady(session.conditionResults);
  if (ready !== previousReady) {
    recordLessonEvent(session, 'condition', ready ? 'Đã đủ điều kiện để mô hình phản ứng tiến triển.' : 'Thiếu điều kiện; phản ứng tạm ngừng tiến triển.');
  }
  session.status = ready ? 'running' : session.environment.mixed ? 'waiting' : 'prepared';
  const result = integrateLessonRate(definition, session, step);
  const accepted = consumeLessonExtent(session.inventory, definition, result.extent_mol);
  session.extent_mol += accepted;
  session.lastRate_mol_s = accepted / step;
  session.physicalProgress = session.maxExtent_mol > 0 ? session.extent_mol / session.maxExtent_mol : 0;
  if (session.environment.vented) {
    session.escapedMass_g += ventLessonProducts(
      session.inventory,
      definition.products,
      getLessonSpecies,
      1 - Math.exp(-step * 2),
    );
  }
  updateLessonCheckpoints(definition, session);
  const target = lessonTargetExtent(definition, session.maxExtent_mol);
  const finished = session.maxExtent_mol > 0 && target - session.extent_mol <= Math.max(1e-12, target * 1e-7);
  if (finished || (ready && result.reason === 'depleted')) {
    session.status = 'complete';
    session.lastRate_mol_s = 0;
    recordLessonEvent(session, 'complete', definition.reversible
      ? 'Đạt mức chuyển hóa cân bằng minh họa; chất đầu có thể còn.'
      : 'Chất giới hạn đã phản ứng hết trong mô hình.');
  }
  session.visuals = deriveLessonVisuals(definition, session, getLessonSpecies);
  const mass = auditLessonMass(session.inventory, session.initialMass_g, getLessonSpecies);
  if (!mass.conserved) {
    session.status = 'stopped';
    session.lastRate_mol_s = 0;
    recordLessonEvent(session, 'warning', 'Dừng mô hình vì kiểm tra bảo toàn khối lượng không đạt.');
  }
}

export class LessonRuntime {
  private readonly sessions = new Map<string, LessonSession>();
  private sequence = 0;
  readonly maximumSessions = 4;

  create(definitionId: string, vesselId: string, scale = 0.001, excess: Record<string, number> = {}): LessonSession {
    if (this.sessions.size >= this.maximumSessions) throw new Error('Tối đa bốn bài mô phỏng đồng thời.');
    const definition = requireLessonDefinition(definitionId);
    const id = `lesson_${++this.sequence}`;
    const session = createLessonSession(definition, id, vesselId, scale, excess);
    this.sessions.set(id, session);
    return session;
  }

  get(id: string): LessonSession | undefined {
    return this.sessions.get(id);
  }

  list(): LessonSession[] {
    return [...this.sessions.values()];
  }

  dispatch(id: string, action: LessonAction): void {
    const session = this.sessions.get(id);
    if (!session) return;
    applyLessonAction(session, requireLessonDefinition(session.definitionId), action);
  }

  update(frameDelta: number, paused = false, timeScale = 1): void {
    if (paused || !Number.isFinite(frameDelta) || frameDelta <= 0 || !Number.isFinite(timeScale)) return;
    const scaledDelta = Math.min(frameDelta, 0.1) * Math.max(0, Math.min(5, timeScale));
    for (const session of this.sessions.values()) {
      if (['paused', 'complete', 'stopped'].includes(session.status)) continue;
      session.accumulator_s = Math.min(session.accumulator_s + scaledDelta, FIXED_STEP * MAX_SUBSTEPS);
      let steps = 0;
      const definition = requireLessonDefinition(session.definitionId);
      while (session.accumulator_s >= FIXED_STEP && steps++ < MAX_SUBSTEPS) {
        advanceLessonSession(definition, session, FIXED_STEP);
        session.accumulator_s -= FIXED_STEP;
      }
    }
  }

  remove(id: string): void {
    this.sessions.delete(id);
  }

  reset(): void {
    this.sessions.clear();
  }
}

export const lessonRuntime = new LessonRuntime();
