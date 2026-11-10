import { ALL_HANDCRAFTED_PROGRAMS } from '../programs/library';
import type { ReactionProgram } from '../../shared/programSchema';
import type { VesselState, SubstanceContent } from '../../types/chemistry';
import { createStudioSample } from '../../engine/studioProgram';
import { applyProgramWithThermalSinks } from '../../engine/thermalLedger';
import { measureGasFlux } from '../../engine/gasFlux';
import { gasVisualState, gasVolumeRateMl_s } from '../gasVisualState';
import { VesselSimulationManager } from '../../simulation/core/SimulationEngine';
import { GasCloudRepository } from '../../simulation/effects/GasCloudRepository';
import { getVesselProfile } from '../../pour/physics/profiles';
import { getLessonDefinition } from '../../lesson/catalog';
import { getLessonSpecies } from '../../lesson/catalog/species';
import { createLessonSession, applyLessonAction, advanceLessonSession } from '../../lesson/runtime';
import type { LessonSession } from '../../lesson/types';
import { solidAerosolVisuals } from '../solidAerosolVisuals';
import { computeMolarMass, applyProgramToLedger } from '../../engine/ledger';
import { assessProgramConditions } from '../../science/conditions';
import { sameMolecularFormula } from '../../science/speciesIdentity';

export type AutoPhase = 'prepare' | 'carry' | 'dose' | 'return' | 'condition' | 'react' | 'observe' | 'complete' | 'error';
export type AutoCamera = 'wide' | 'transfer' | 'close' | 'surface';
export const AUTO_EXPERIMENTS = ALL_HANDCRAFTED_PROGRAMS.map(program => ({
  id: program.id, program,
  title: getLessonDefinition(program.id)?.title_vi ?? (program.chemistry.representation === 'emission'
    ? `Phép thử ngọn lửa · ${program.chemistry.species.map(s => s.formula).join(', ')}`
    : program.chemistry.species.filter(s => s.role === 'reactant').map(s => s.formula).join(' + ')),
  category: getLessonDefinition(program.id) ? 'Bài học' : program.visual.after.gasesOffgassed.length ? 'Tạo khí / khói'
    : program.visual.after.precipitate ? 'Kết tủa' : 'Đổi màu / cân bằng',
}));
export interface AutoDonor { row: SubstanceContent; color: string; remaining: number; fraction: number }
const shell = (): VesselState => ({ id: 'auto_receiver', type: 'beaker', name: 'Bình phản ứng', capacity_ml: 100,
  position: [0, 1.04, 0], rotationY: 0, isLocked: false, contents: [], substances: [], mass_g: 0,
  volume_ml: 0, volume: 0, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false });
const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

/** An isolated virtual experiment. Neither specimens, clocks, lesson sessions
 * nor exhaust receipts are written to the user's workbench or persistence. */
export class AutoExperiment {
  readonly program: ReactionProgram;
  readonly physics = new VesselSimulationManager('auto_receiver', 'medium');
  readonly clouds = new GasCloudRepository();
  readonly donors: AutoDonor[];
  readonly steps: string[];
  sample: VesselState;
  phase: AutoPhase = 'prepare';
  phaseTime = 0;
  elapsed = 0;
  progress = 0;
  donorIndex = 0;
  paused = false;
  speed = 1;
  camera: AutoCamera = 'wide';
  automaticCamera = true;
  error: string | null = null;
  flame = false;
  log: string[] = [];
  private baseline: VesselState;
  private lesson?: LessonSession;
  private emission: boolean;
  private heatTarget = 25;
  private reactionTime = 0;
  private lessonWater_g = 0;
  private contactProgress = 0;
  private replayProgress = 0;
  private conditioningStartTemp = 25;
  private contactReference?: { formula: string; phase: string; initial: number; consumed: number };
  private contactCadence_s = 0;
  get lessonVisuals() { return this.lesson?.visuals; }

  constructor(id: string, private readonly simulateEffects = true) {
    const entry = AUTO_EXPERIMENTS.find(e => e.id === id);
    if (!entry) throw new Error('Không tìm thấy thí nghiệm.');
    this.program = entry.program;
    this.emission = this.program.chemistry.representation === 'emission';
    const definition = getLessonDefinition(id);
    if (definition) {
      this.lesson = createLessonSession(definition, `auto_${id}`, 'auto_receiver');
      const contents = this.lesson.inventory.map(row => {
        const s = getLessonSpecies(row.species);
        return { formula: s.formula, phase: s.phase, moles: row.amount_mol, mass_g: row.amount_mol * s.molarMass };
      });
      this.lessonWater_g = this.lesson.volume_ml > 0 ? 50 : 0;
      if (this.lessonWater_g) contents.push({ formula: 'H2O', phase: 'l', moles: this.lessonWater_g / 18.015, mass_g: this.lessonWater_g });
      this.baseline = { ...shell(), contents, volume_ml: this.lesson.volume_ml,
        mass_g: contents.reduce((sum, c) => sum + c.mass_g, 0), liquidColor: definition.initialColor };
    } else if (this.emission) {
      const contents = this.program.chemistry.species.filter(s => s.role === 'spectator').map(s => ({
        formula: s.formula, phase: s.phase, moles: s.coeff * 1e-5, mass_g: s.coeff * 1e-5 * computeMolarMass(s.formula) }));
      this.baseline = { ...shell(), contents, mass_g: contents.reduce((sum, c) => sum + c.mass_g, 0), liquidColor: '#ffffff' };
    } else this.baseline = createStudioSample(this.program, shell());
    this.baseline = { ...this.baseline, isSealed: this.program.chemistry.species.some(s => s.role === 'reactant' && s.phase === 'g') };
    const conditions = this.program.chemistry.conditions;
    if (!definition && !this.emission && !this.program.chemistry.representation && conditions?.activation !== 'ignition'
      && !conditions?.light && (conditions?.minTemp_c ?? 25) <= 25) {
      const pivot = this.program.chemistry.species.find(s => s.role === 'reactant' && s.formula !== 'H2O');
      if (pivot) {
        const moles = (rows: SubstanceContent[]) => rows.filter(c => sameMolecularFormula(c.formula, pivot.formula) && c.phase === pivot.phase).reduce((sum, c) => sum + c.moles, 0);
        const initial = moles(this.baseline.contents), end = applyProgramToLedger(this.program, this.baseline, 1);
        const consumed = initial - moles(end.contents ?? this.baseline.contents);
        if (consumed > 1e-12) this.contactReference = { formula: pivot.formula, phase: pivot.phase, initial, consumed };
      }
    }
    this.heatTarget = definition?.conditions.find(c => c.kind === 'temperature')?.minimum
      ?? this.program.chemistry.conditions?.minTemp_c ?? 25;
    const solvent = this.baseline.contents.filter(c => c.formula === 'H2O' && c.phase === 'l');
    this.donors = this.baseline.contents.filter(c => !solvent.includes(c)).map(row => ({ row: { ...row },
      color: this.program.chemistry.species.find(s => s.formula === row.formula && s.phase === row.phase)?.colorHex ?? '#dbeafe',
      remaining: row.mass_g, fraction: 0 }));
    this.sample = { ...shell(), contents: solvent.map(c => ({ ...c })),
      mass_g: solvent.reduce((sum, c) => sum + c.mass_g, 0),
      volume_ml: solvent.reduce((sum, c) => sum + c.mass_g, 0) / (this.baseline.density_g_ml ?? 1),
      liquidColor: '#f1f5f9', isSealed: this.baseline.isSealed, studioProgramId: this.program.id };
    this.steps = ['Dàn dụng cụ và dung môi', ...this.donors.map(d => `Thêm ${d.row.formula} (${d.row.phase})`),
      'Thiết lập điều kiện', 'Quan sát phản ứng cận cảnh', 'Đối chiếu sản phẩm'];
    this.log.push('Sân khấu riêng đã sẵn sàng; bàn thí nghiệm của bạn được giữ nguyên.');
  }
  get stepIndex() {
    return this.phase === 'prepare' ? 0 : ['carry', 'dose', 'return'].includes(this.phase) ? this.donorIndex + 1
      : this.phase === 'condition' ? this.donors.length + 1 : this.phase === 'react' ? this.donors.length + 2 : this.steps.length - 1;
  }
  get caption() {
    const d = this.donors[this.donorIndex];
    return this.error ?? (this.phase === 'prepare' ? 'Đặt bình, kiểm tra dung môi và nhãn hóa chất.'
      : this.phase === 'carry' ? `Nhấc ${d?.row.formula} đến miệng bình nhận.`
      : this.phase === 'dose' ? `${d?.row.phase === 'g' ? 'Dẫn khí' : d?.row.phase === 's' ? 'Thêm chất rắn' : 'Rót'} ${d?.row.formula} tiếp xúc mẫu · ${(d?.row.mass_g ?? 0).toPrecision(3)} g trong kịch bản ảo.${this.progress > 0.001 ? ' ' + this.program.explain.observation_vi : ''}`
      : this.phase === 'return' ? 'Dựng thẳng, ngừng dòng và đặt dụng cụ về khay.'
      : this.phase === 'condition' ? this.conditionText
      : this.phase === 'react' ? this.program.explain.observation_vi
      : this.phase === 'observe' ? 'Theo dõi phần đuôi khói, bọt và hạt sau khi nguồn phản ứng giảm.'
      : 'Đã hoàn tất trình tự. Có thể xem lại hoặc chọn thí nghiệm tiếp theo.');
  }
  get conditionText() {
    const definition = getLessonDefinition(this.program.id);
    return [this.heatTarget > 25 ? `Gia nhiệt ảo đến ${this.heatTarget} °C.` : 'Mẫu ở nhiệt độ thường.',
      this.program.chemistry.conditions?.catalyst ? `Xác nhận xúc tác ${this.program.chemistry.conditions.catalyst}.` : '',
      this.program.chemistry.conditions?.activation === 'ignition' || this.emission ? 'Đưa nguồn mồi vào mẫu.' : '',
      ...(definition?.conditions.filter(c => c.kind !== 'mixed').map(c => c.label_vi) ?? [])].filter(Boolean).join(' ');
  }
  private enter(phase: AutoPhase) {
    this.phase = phase; this.phaseTime = 0;
    if (phase === 'condition') this.conditioningStartTemp = this.sample.temperature_c;
    if (this.automaticCamera) this.camera = phase === 'carry' || phase === 'dose' ? 'transfer'
      : phase === 'react' || (['return', 'condition'].includes(phase) && this.contactProgress > 0) ? 'close' : phase === 'observe' ? 'surface' : 'wide';
    this.log = [...this.log.slice(-11), this.caption];
  }
  /** Fixed 60 Hz director: render FPS changes neither dose nor sequence. */
  private accumulator = 0;
  tick(delta: number) {
    if (this.paused || this.phase === 'error' || !Number.isFinite(delta) || delta <= 0) return;
    this.accumulator += Math.min(delta, 0.1) * this.speed;
    while (this.accumulator >= 1 / 60 - 1e-12) {
      this.accumulator = Math.max(0, this.accumulator - 1 / 60);
      try { this.step(1 / 60); } catch (e) {
        this.error = e instanceof Error ? e.message : 'Không thể tiếp tục mô phỏng.'; this.enter('error'); break;
      }
    }
  }
  private step(dt: number) {
    this.elapsed += dt; this.phaseTime += dt;
    const previous = this.sample;
    if (this.phase === 'prepare' && this.phaseTime >= 2) this.enter(this.donors.length ? 'carry' : 'condition');
    else if (this.phase === 'carry' && this.phaseTime >= 1.8) this.enter('dose');
    else if (this.phase === 'dose') {
      const donor = this.donors[this.donorIndex], fraction = Math.min(1, this.phaseTime / 2.4);
      const portion = fraction - donor.fraction;
      const contents = this.sample.contents.map(c => ({ ...c }));
      let row = contents.find(c => c.formula === donor.row.formula && c.phase === donor.row.phase);
      if (!row) { row = { ...donor.row, moles: 0, mass_g: 0 }; contents.push(row); }
      row.moles += donor.row.moles * portion; row.mass_g += donor.row.mass_g * portion;
      donor.fraction = fraction; donor.remaining = donor.row.mass_g * (1 - fraction);
      const fluid = contents.filter(c => c.phase === 'aq' || c.phase === 'l').reduce((sum, c) => sum + c.mass_g, 0);
      this.sample = { ...this.sample, contents, substances: contents.map(c => c.formula),
        mass_g: contents.reduce((sum, c) => sum + c.mass_g, 0), volume_ml: fluid / (this.baseline.density_g_ml ?? 1),
        liquidColor: donor.row.phase === 'aq' ? donor.color : this.sample.liquidColor };
      this.advanceContact(dt);
      if (fraction >= 1) this.enter('return');
    } else if (this.phase === 'return' && this.phaseTime >= 1.5) {
      this.donorIndex++;
      this.enter(this.donorIndex < this.donors.length ? 'carry' : 'condition');
    } else if (this.phase === 'condition') {
      this.flame = this.heatTarget > 25 || this.emission || this.program.chemistry.conditions?.activation === 'ignition';
      this.sample = { ...this.sample, temperature_c: Math.max(this.sample.temperature_c, this.conditioningStartTemp
        + (Math.max(this.conditioningStartTemp, this.heatTarget) - this.conditioningStartTemp) * smooth(this.phaseTime / 4)) };
      if (this.phaseTime >= 4) {
        this.sample = { ...this.sample, temperature_c: Math.max(this.sample.temperature_c, this.heatTarget),
          ignitedProgramId: this.program.id, studioProgramId: this.program.id };
        this.baseline = structuredClone(this.sample);
        const definition = getLessonDefinition(this.program.id);
        if (definition && this.lesson) {
          for (const c of definition.conditions) {
            if (c.kind === 'temperature') {
              this.lesson.environment.temperature_c = c.minimum ?? 25;
              applyLessonAction(this.lesson, definition, { type: 'temperature', value: c.minimum ?? 25 });
            } else if (c.kind === 'catalyst' || c.kind === 'enzyme') applyLessonAction(this.lesson, definition, { type: c.kind, id: c.value ?? '', active: true });
            else if (c.kind === 'acidic' || c.kind === 'alkaline') applyLessonAction(this.lesson, definition, { type: 'pH', value: c.kind === 'acidic' ? c.maximum ?? 2 : c.minimum ?? 12 });
            else if (c.kind === 'pressure') applyLessonAction(this.lesson, definition, { type: 'pressure', value: c.minimum ?? 1 });
            else if (c.kind === 'industrial' || c.kind === 'oxygen' || c.kind === 'ignition') applyLessonAction(this.lesson, definition, { type: c.kind, active: true });
          }
          applyLessonAction(this.lesson, definition, { type: 'mix' });
          applyLessonAction(this.lesson, definition, { type: 'stir', active: true });
        }
        this.enter(this.contactProgress >= 0.9999 ? 'observe' : 'react');
      }
    } else if (this.phase === 'react') {
      this.reactionTime += dt;
      const definition = getLessonDefinition(this.program.id);
      if (definition && this.lesson) {
        advanceLessonSession(definition, this.lesson, dt);
        this.progress = this.lesson.physicalProgress;
        const v = this.lesson.visuals;
        const contents: SubstanceContent[] = this.lesson.inventory.filter(r => r.amount_mol > 1e-12).map(r => {
          const s = getLessonSpecies(r.species);
          return { formula: s.formula, phase: s.phase, moles: r.amount_mol, mass_g: r.amount_mol * s.molarMass,
            ...(s.phase === 's' && r.produced_mol > 0 ? { solidOrigin: 'precipitate' as const } : {}) };
        });
        if (this.lessonWater_g) {
          const water = contents.find(c => c.formula === 'H2O' && c.phase === 'l');
          if (water) { water.mass_g += this.lessonWater_g; water.moles += this.lessonWater_g / 18.015; }
          else contents.push({ formula: 'H2O', phase: 'l', mass_g: this.lessonWater_g, moles: this.lessonWater_g / 18.015 });
        }
        const escapedGas_g = Object.fromEntries(this.lesson.inventory.filter(r => r.escaped_mol > 0).map(r => {
          const s = getLessonSpecies(r.species); return [s.formula, r.escaped_mol * s.molarMass];
        }));
        this.sample = { ...this.sample, liquidColor: v.color, turbidity: v.turbidity,
          contents, substances: contents.map(c => c.formula), escapedGas_g,
          mass_g: contents.reduce((sum, c) => sum + c.mass_g, 0),
          temperature_c: this.lesson.environment.temperature_c, ph: this.lesson.environment.pH,
          hasPrecipitate: v.precipitate_g > 0, precipitateAmount_g: v.precipitate_g, precipitateColor: v.precipitateColor,
          gasRate: v.gasRate_mol_s, hasGas: v.gasRate_mol_s > 0 };
        this.flame = v.flame > 0;
        if (this.lesson.status === 'complete') this.enter('observe');
        if (this.lesson.status === 'stopped') throw new Error(this.lesson.events.at(-1)?.message_vi ?? 'Bài học đã dừng.');
      } else if (this.emission) {
        this.progress = Math.min(1, this.phaseTime / 8); this.flame = this.progress < 1;
        if (this.progress === 1) this.enter('observe');
      } else {
        const half = this.program.chemistry.kinetics.halfTime_s;
        const model = this.program.chemistry.kinetics.model;
        const next = ['instant', 'first_order'].includes(model) && half > 0
          ? 1 - (1 - this.replayProgress) * Math.exp(-Math.LN2 * dt / half)
          : Math.min(1, this.replayProgress + dt / Math.max(1, this.program.visual.duration_s));
        this.replayProgress = next >= 0.9999 ? 1 : next;
        this.progress = this.contactProgress + (1 - this.contactProgress) * this.replayProgress;
        const patch = applyProgramWithThermalSinks(this.program, this.baseline, this.sample, this.replayProgress, dt);
        if (patch.gasReplayBlocked) throw new Error('Mẫu đã chạm giới hạn mô hình pha khí.');
        this.sample = { ...this.sample, ...patch };
        if (this.replayProgress === 1) { this.progress = 1; this.flame = false; this.enter('observe'); }
      }
      if (this.reactionTime > 180) throw new Error('Chưa đạt trạng thái cuối sau 180 giây mô phỏng. Kiểm tra điều kiện của bài.');
    } else if (this.phase === 'observe' && this.phaseTime >= 8) this.enter('complete');
    if (this.phase === 'return' || this.phase === 'condition') this.advanceContact(dt);
    this.sample.gasFlux = measureGasFlux(this.sample, previous, dt);
    if (!this.simulateEffects) return;
    const gas = gasVisualState(this.sample);
    const profile = getVesselProfile('beaker', 100);
    const visible = [...gas.visible, ...solidAerosolVisuals(this.sample, previous, this.program.id, dt)];
    this.clouds.advance(dt, visible.map(g => ({ vesselId: this.sample.id, revision: 1, receipt: this.sample.gasFlux!, seconds: dt,
      species: g.formula, input: { rate: g.rate, mol_s: g.mol_s, temperature_c: this.sample.temperature_c, ambient_c: 25,
        molarMass: g.molarMass, mouthY: profile.baseY + profile.H, mouthRadius: profile.mouthR,
        floorY: 0.03, wind_m_s: 0.015, sourceToWorld: ([x, y, z]) => [x, y + 1.04, z] } })));
    this.physics.step(this.sample, dt, { thermalStateAuthoritative: true,
      reactionGasRate: gasVolumeRateMl_s(Object.values(this.sample.gasFlux.generated_mol_s).reduce((s, n) => s + n, 0), this.sample.temperature_c, 1) });
  }
  private advanceContact(dt: number) {
    const ref = this.contactReference;
    if (this.contactProgress >= 0.9999) return;
    if (!ref || !assessProgramConditions(this.program, this.sample.contents, {
      temperature_c: this.sample.temperature_c, volume_ml: this.sample.volume_ml, pH: this.sample.ph,
    }).ready) return;
    if (this.program.id === 'fecl3_naoh') {
      // The ferric speciation solve is expensive and produces no gas receipt.
      // Sample it at 20 Hz, while choreography and finite dosing stay at 60 Hz.
      this.contactCadence_s += dt;
      if (this.contactCadence_s < 0.05 - 1e-12) return;
      dt = this.contactCadence_s; this.contactCadence_s = 0;
    }
    const halfTime = this.program.chemistry.kinetics.halfTime_s;
    const fraction = -Math.expm1(-Math.LN2 * dt / Math.max(0.05, halfTime || 1));
    const before = this.sample;
    const patch = applyProgramWithThermalSinks(this.program, before, before, fraction, dt);
    if (patch.gasReplayBlocked) return;
    this.sample = { ...this.sample, ...patch };
    const held = this.sample.contents.filter(c => sameMolecularFormula(c.formula, ref.formula) && c.phase === ref.phase).reduce((sum, c) => sum + c.moles, 0);
    const pending = this.donors.filter(d => sameMolecularFormula(d.row.formula, ref.formula) && d.row.phase === ref.phase)
      .reduce((sum, d) => sum + d.row.moles * (1 - d.fraction), 0);
    this.contactProgress = Math.max(this.contactProgress, Math.min(1, Math.max(0, (ref.initial - held - pending) / ref.consumed)));
    this.progress = this.contactProgress;
  }
  get donorPose(): { position: [number, number, number]; tilt: number } {
    const i = this.donorIndex, home: [number, number, number] = [-3.1 + i % 3 * 0.8, 0.63, -1.8 - Math.floor(i / 3) * 1.1];
    const hover: [number, number, number] = [-1, 2.75, 0];
    const t = this.phase === 'carry' ? smooth(this.phaseTime / 1.8) : this.phase === 'return' ? 1 - smooth(this.phaseTime / 1.5) : this.phase === 'dose' ? 1 : 0;
    return { position: home.map((n, k) => n + (hover[k] - n) * t) as [number, number, number],
      tilt: this.phase === 'dose' ? -1.25 * Math.min(1, this.phaseTime / 0.35) : this.phase === 'return' ? -1.25 * (1 - smooth(this.phaseTime / 0.5)) : 0 };
  }
}
