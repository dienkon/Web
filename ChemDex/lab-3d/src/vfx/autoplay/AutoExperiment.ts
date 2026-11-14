import { ALL_HANDCRAFTED_PROGRAMS } from '../programs/library';
import type { ReactionProgram } from '../../shared/programSchema';
import type { VesselState, SubstanceContent } from '../../types/chemistry';
import { createStudioSample, planStudioProgram } from '../../engine/studioProgram';
import { advanceReaction } from '../../engine/advanceReaction';
import type { ActiveKineticsState } from '../../store/useAppStore';
import { stepAlcoholBurner, allocateBurnerHeat, burnerIsBurning } from '../../engine/burnerEnergy';
import { pointInAlcoholFlame } from '../../science/flameGeometry';
import { vesselInterior } from '../../science/vesselDimensions';
import { stepVesselThermal } from '../../engine/thermalState';
import type { BurnerState } from '../../types/chemistry';
import { receivePourAliquot } from '../../handling/pourReceiver';
import type { LiquidAliquot } from '../../handling/aliquot';
import { planMetalAcid } from '../../engine/metalAcidPlan';
import { planSodiumWater } from '../../engine/sodiumWaterPlan';
import { applyProgramWithThermalSinks } from '../../engine/thermalLedger';
import { measureGasFlux } from '../../engine/gasFlux';
import { gasVisualState, gasVolumeRateMl_s, retainedGasVisuals } from '../gasVisualState';
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
import { getRetainedVolumeSamples } from '../../pour/physics/retained';
import { gasInlet, gasSourceHome, gasVolumeMl } from './gasDelivery';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { identifySpecies } from '../../science/speciesIdentity';
import { AutoStockDynamics } from './AutoStockDynamics';
import { LiquidAppearanceField } from '../../simulation/effects/LiquidAppearanceField';
import { blendLiquidOptics, liquidOptics } from '../../pour/physics/mixing';
import { supernatantColor } from '../../science/supernatantAppearance';
import { pourContactRemaining } from '../../science/pourContactActivity';
import { Quaternion, Vector3 } from 'three';
import { autoSolid, autoSolidGravity, AUTO_DONOR_SCALE, createAutoSolidDose, solidFlightPosition, type AutoSolidDose } from './autoSolid';
import { vesselLocalToWorld, vesselBodyTransform } from '../../science/vesselScale';
import { scenePointToSI } from '../../science/sceneUnits';
import type { StockContactBirth } from '../../physical/stockTypes';

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
export interface AutoDonor { row: SubstanceContent; color: string; remaining: number; fraction: number; doseStartedAt?: number; solid?: AutoSolidDose }
export const AUTO_TIMING = { prepare: 1.6, carry: 2, tilt: 0.55, flow: 2.4, flight: 0.28, upright: 0.55, return: 1.5 } as const;
const RECEIVER_BODY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.04, 0, 1];
export const donorHome = (i: number): [number, number, number] => [-3.9 + i % 3 * 0.95, 0.63, 1.2 + Math.floor(i / 3) * 1.15];
const shell = (): VesselState => ({ id: 'auto_receiver', type: 'beaker', name: 'Bình phản ứng', capacity_ml: 100,
  position: [0, 1.04, 0], rotationY: 0, isLocked: false, contents: [], substances: [], mass_g: 0,
  volume_ml: 0, volume: 0, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false });
const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
function donorPouringTilt(remaining: number) {
  const profile = getVesselProfile('flask'), samples = getRetainedVolumeSamples(profile);
  const target = profile.capacity_ml * 0.4 * Math.max(0.002, remaining) * 0.85;
  for (let i = 1; i < samples.length; i++) if (samples[i] <= target) {
    const fraction = (samples[i - 1] - target) / Math.max(1e-12, samples[i - 1] - samples[i]);
    return Math.max(0.55, Math.min(2.1, (i - 1 + fraction) / (samples.length - 1) * Math.PI + 0.12));
  }
  return 2.1;
}

/** An isolated virtual experiment. Neither specimens, clocks, lesson sessions
 * nor exhaust receipts are written to the user's workbench or persistence. */
export class AutoExperiment {
  readonly program: ReactionProgram;
  readonly physics = new VesselSimulationManager('auto_receiver', 'medium');
  readonly clouds = new GasCloudRepository();
  readonly stocks = new AutoStockDynamics();
  readonly appearance = new LiquidAppearanceField();
  /** Optical residence/deposition partition; chemistry still owns every gram. */
  aerosolSuspended_g = 0;
  aerosolDeposited_g = 0;
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
  stirringIntensity = 0.65;
  get stirringDrive() {
    if (this.sample.volume_ml <= 0.2 || this.emission) return 0;
    const immersion = this.phase === 'condition' ? smooth((this.phaseTime - 0.5) / 0.9)
      : this.phase === 'react' ? 1 : this.phase === 'observe' ? 1 - smooth(this.phaseTime / 1.4) : 0;
    return this.stirringIntensity * immersion;
  }
  log: string[] = [];
  readonly transferWaste: LiquidAliquot[] = [];
  sourceEnabled = true;
  private baseline: VesselState;
  private lesson?: LessonSession;
  private emission: boolean;
  private heatTarget = 25;
  private reactionTime = 0;
  private lessonWater_g = 0;
  private contactProgress = 0;
  private replayProgress = 0;
  private conditioningStartTemp = 25;
  private kinetics?: ActiveKineticsState;
  private contactKinetics?: ActiveKineticsState;
  private lamp: BurnerState = { id: 'auto_lamp', position: [0, -0.21, 0], isOn: false,
    intensity: 5, fuelLevel_ml: 120, ethanolVolumeFraction: 0.96 };
  private heat(dt: number) {
    if (this.lesson) return;
    const ignition = this.program.chemistry.conditions?.activation === 'ignition' || this.emission;
    const mouth = vesselLocalToWorld(this.sample, [0, vesselInterior(this.sample.type).topY, 0]);
    this.lamp = { ...this.lamp, position: ignition ? [mouth[0], mouth[1] - 1.1, mouth[2]] : [0, -0.21, 0],
      isOn: this.sourceEnabled && (this.heatTarget > 25 || ignition) && ['condition', 'react'].includes(this.phase) };
    const burn = stepAlcoholBurner(this.lamp, dt); this.lamp = burn.burner;
    this.flame = burnerIsBurning(this.lamp);
    const energy = this.heatTarget > 25 ? allocateBurnerHeat(this.lamp, burn.capturableHeat_J, [this.sample]).energyByVessel_J.get(this.sample.id) ?? 0 : 0;
    this.sample = { ...this.sample, ...stepVesselThermal(this.sample, dt, energy / dt) };
  }
  private returnTilt = 0;
  private contactReference?: { formula: string; phase: string; initial: number; consumed: number };
  private contactCadence_s = 0;
  get lessonVisuals() { return this.lesson?.visuals; }
  get hasGasSupply() { return this.donors.some(d => d.row.phase === 'g'); }
  gasOrdinal(index: number) { return this.donors.slice(0, index).filter(d => d.row.phase === 'g').length; }
  get gasValveOpen() {
    return this.donors[this.donorIndex]?.row.phase === 'g' && this.phase === 'dose'
      && this.phaseTime >= AUTO_TIMING.tilt && this.phaseTime < AUTO_TIMING.tilt + AUTO_TIMING.flow;
  }
  get gasDeliveryRate_ml_s() {
    if (!this.gasValveOpen) return 0;
    const x = Math.max(0, Math.min(1, (this.phaseTime - AUTO_TIMING.tilt) / AUTO_TIMING.flow));
    return gasVolumeMl(this.donors[this.donorIndex].row.moles) * 6 * x * (1 - x) / AUTO_TIMING.flow;
  }

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
    // Even the solvent travels from a finite donor; a new bench starts empty.
    const order = (c: SubstanceContent) => c.formula === 'H2O' && c.phase === 'l' ? 0 : c.phase === 'g' ? 2 : 1;
    const rows = this.baseline.contents.filter(c => c.mass_g > 1e-12 && c.moles > 1e-12).sort((a, b) => order(a) - order(b));
    this.donors = rows.map(row => ({ row: { ...row },
      color: this.program.chemistry.species.find(s => s.formula === row.formula && s.phase === row.phase)?.colorHex ?? '#f8fafc',
      remaining: row.mass_g, fraction: 0, ...(row.phase === 's' ? { solid: createAutoSolidDose(row.formula, row.mass_g) } : {}) }));
    this.sample = { ...shell(),
      liquidColor: '#f1f5f9', isSealed: this.baseline.isSealed && this.donors.every(d => d.row.phase === 'g'), studioProgramId: this.program.id };
    this.steps = ['Dọn bàn và dàn dụng cụ cần dùng', ...this.donors.map(d => `${d.row.phase === 'g' ? 'Dẫn' : d.row.phase === 's' ? 'Chuyển' : 'Rót'} ${d.row.formula} (${d.row.phase})`),
      'Thiết lập điều kiện', 'Quan sát phản ứng cận cảnh', 'Đối chiếu sản phẩm'];
    this.log.push('Đã dọn bàn tự động: chỉ giữ bình nhận và các chất cần cho lượt này.');
  }
  get stepIndex() {
    return this.phase === 'prepare' ? 0 : ['carry', 'dose', 'return'].includes(this.phase) ? this.donorIndex + 1
      : this.phase === 'condition' ? this.donors.length + 1 : this.phase === 'react' ? this.donors.length + 2 : this.steps.length - 1;
  }
  get caption() {
    const d = this.donors[this.donorIndex];
    return this.error ?? (this.phase === 'prepare' ? 'Dọn bàn tự động, đặt bình nhận rỗng và sắp các chất cần dùng lên khay.'
      : this.phase === 'carry' ? d?.row.phase === 'g' ? `Lắp ống dẫn ${d.row.formula}, nối đầu cấp khí vào bình phản ứng.` : `Nhấc ${d?.row.formula} đến miệng bình nhận.`
      : this.phase === 'dose' ? this.phaseTime < AUTO_TIMING.tilt ? d?.row.phase === 'g' ? `Mở van cấp ${d.row.formula}, kiểm tra đường ống kín.` : `Nghiêng dụng cụ ${d?.row.formula}, căn miệng vào bình nhận.`
        : d?.row.phase === 'g' ? `Dẫn ${d.row.formula} qua ống · ${gasVolumeMl(d.row.moles * d.fraction).toFixed(1)} / ${gasVolumeMl(d.row.moles).toFixed(1)} mL.${this.progress > 0.001 ? ' ' + this.program.explain.observation_vi : ''}`
        : `${d?.row.phase === 's' ? 'Thêm chất rắn' : 'Rót'} ${d?.row.formula} tiếp xúc mẫu · ${((d?.row.mass_g ?? 0) * (d?.fraction ?? 0)).toPrecision(3)} / ${(d?.row.mass_g ?? 0).toPrecision(3)} g.${this.progress > 0.001 ? ' ' + this.program.explain.observation_vi : ''}`
      : this.phase === 'return' ? d?.row.phase === 'g' ? 'Đóng van cấp khí, giữ ống dẫn và chờ dòng trong ống ngừng.' : 'Dựng thẳng, ngừng dòng và đặt dụng cụ về khay.'
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
    if (phase === 'return') this.returnTilt = this.donorPose.tilt;
    this.phase = phase; this.phaseTime = 0;
    if (['error', 'observe', 'complete'].includes(phase)) this.flame = false;
    if (phase === 'dose') {
      this.donors[this.donorIndex].doseStartedAt = this.elapsed;
      // A gas donor uses a connected inlet after the open liquid transfers.
      if (this.donors[this.donorIndex].row.phase === 'g') this.sample.isSealed = true;
    }
    if (phase === 'condition') this.conditioningStartTemp = this.sample.temperature_c;
    if (this.automaticCamera) this.camera = phase === 'carry' || phase === 'dose' ? this.donors[this.donorIndex]?.row.phase === 'g' ? 'wide' : 'transfer'
      : phase === 'react' || (['return', 'condition'].includes(phase) && this.contactProgress > 0) ? 'close' : phase === 'observe' ? 'surface' : 'wide';
    this.log = [...this.log.slice(-11), this.caption];
  }
  /** Fixed 60 Hz director: render FPS changes neither dose nor sequence. */
  private accumulator = 0;
  tick(delta: number) {
    if (this.paused || this.phase === 'error' || !Number.isFinite(delta) || delta <= 0
      || !Number.isFinite(this.speed) || this.speed <= 0) return;
    this.accumulator += Math.min(delta, 0.1) * Math.min(8, this.speed);
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
    this.heat(dt);
    const previousProgress = this.progress;
    let gasArrival: { formula: string; moles: number } | undefined;
    if (this.sample.recentPourContact) this.sample = { ...this.sample, recentPourContact: {
      ...this.sample.recentPourContact, remaining_s: Math.max(0, (this.sample.recentPourContact.remaining_s ?? 0) - dt),
    } };
    if (this.phase === 'prepare' && this.phaseTime >= AUTO_TIMING.prepare) this.enter(this.donors.length ? 'carry' : 'condition');
    else if (this.phase === 'carry' && this.phaseTime >= AUTO_TIMING.carry) this.enter('dose');
    else if (this.phase === 'dose') {
      const donor = this.donors[this.donorIndex];
      const solidContact = donor.solid ? this.advanceSolidDose(donor) : undefined;
      const fraction = this.transferFraction;
      const portion = fraction - donor.fraction;
      const receiverBeforeDose = this.sample;
      if (donor.row.phase === 'g' && portion > 0) gasArrival = { formula: identifySpecies(donor.row.formula).formula, moles: donor.row.moles * portion };
      const contents = this.sample.contents.map(c => ({ ...c }));
      let row = contents.find(c => c.formula === donor.row.formula && c.phase === donor.row.phase);
      if (!row) { row = { ...donor.row, moles: 0, mass_g: 0 }; contents.push(row); }
      row.moles += donor.row.moles * portion; row.mass_g += donor.row.mass_g * portion;
      donor.fraction = fraction;
      donor.remaining = donor.row.mass_g * (1 - (donor.solid ? donor.solid.released / donor.solid.pieces.length : fraction));
      const fluid = contents.filter(c => c.phase === 'aq' || c.phase === 'l').reduce((sum, c) => sum + c.mass_g, 0);
      const volume_ml = fluid / (this.baseline.density_g_ml ?? 1);
      this.sample = { ...this.sample, contents, substances: contents.map(c => c.formula),
        mass_g: contents.reduce((sum, c) => sum + c.mass_g, 0), volume_ml, volume: volume_ml / this.sample.capacity_ml,
        liquidColor: portion > 0 && ['aq', 'l'].includes(donor.row.phase) ? supernatantColor(contents, volume_ml)
          ?? blendLiquidOptics(liquidOptics(this.sample.liquidColor ?? '#f8fafc'), this.sample.volume_ml,
            liquidOptics(donor.color), donor.row.mass_g * portion / (this.baseline.density_g_ml ?? 1)).hex : this.sample.liquidColor };
      if (portion > 0 && ['aq', 'l'].includes(donor.row.phase ?? '')) {
        const mass_g = donor.row.mass_g * portion;
        const arrival = receivePourAliquot(receiverBeforeDose, { volume_ml: mass_g / (this.baseline.density_g_ml ?? 1),
          mass_g, temperature_c: 25, color: donor.color, substances: [donor.row.formula],
          contents: [{ ...donor.row, mass_g, moles: donor.row.moles * portion }] });
        this.sample = arrival.vessel;
        if (arrival.spill.mass_g > 1e-10) this.transferWaste.push(arrival.spill);
        if (arrival.failureReason || arrival.spill.mass_g > 1e-10)
          throw new Error(arrival.failureReason ?? 'Bình nhận tràn hoặc không nhận được mẫu; đã giữ lượng tràn trong kiểm kê tự động.');
      }
      if (portion > 0) {
        const lip = this.donorLip, inlet = donor.row.phase === 'g' ? gasInlet(this, this.gasOrdinal(this.donorIndex)) : undefined;
        this.sample.recentPourContact = { point: inlet ? [inlet[0], inlet[1] - 1.04, inlet[2]]
          : [solidContact?.[0] ?? lip[0] + 0.12, vesselLiquidSurfaceY(this.sample), solidContact?.[2] ?? lip[2]], remaining_s: 0.25, expiresAt_ms: 0, color: donor.color };
      }
      this.advanceContact(dt);
      if (fraction >= 1) this.enter('return');
    } else if (this.phase === 'return' && this.phaseTime >= AUTO_TIMING.upright + AUTO_TIMING.return) {
      this.donorIndex++;
      this.enter(this.donorIndex < this.donors.length ? 'carry' : 'condition');
    } else if (this.phase === 'condition') {
      this.flame = this.lesson ? this.heatTarget > 25 || this.emission : burnerIsBurning(this.lamp);
      if (this.phaseTime > 180) throw new Error('Nguồn nhiệt không đưa mẫu đến điều kiện cần thiết.');
      if (this.phaseTime >= 4 && (this.lesson || this.heatTarget <= 25 || this.sample.temperature_c >= this.heatTarget)) {
        if (!this.lesson && (this.program.chemistry.conditions?.activation === 'ignition' || this.emission)) {
          const mouth = vesselLocalToWorld(this.sample, [0, vesselInterior(this.sample.type).topY, 0]);
          if (!burnerIsBurning(this.lamp) || !pointInAlcoholFlame(mouth, this.lamp.position)) return;
        }
        this.sample = { ...this.sample,
          ignitedProgramId: this.program.chemistry.conditions?.activation === 'ignition' ? this.program.id : undefined,
          studioProgramId: this.program.id };
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
        if (!this.lesson && !this.emission && this.contactProgress < 0.9999) {
          const plan = planStudioProgram(this.program, this.sample, 'vi');
          if (!plan.kinetics) throw new Error(plan.unmet.join(' '));
          this.kinetics = plan.kinetics;
          this.kinetics.inductionElapsed_s = this.contactKinetics?.inductionElapsed_s;
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
        const mouth = vesselLocalToWorld(this.sample, [0, vesselInterior(this.sample.type).topY, 0]);
        if (!burnerIsBurning(this.lamp) || !pointInAlcoholFlame(mouth, this.lamp.position))
          throw new Error('Nguồn đốt đã tắt hoặc mất tiếp xúc với mẫu thử màu ngọn lửa; cần bắt đầu lại mẫu thử.');
        this.progress = Math.min(1, this.phaseTime / 8); this.flame = this.progress < 1;
        if (this.progress === 1) this.enter('observe');
      } else {
        if (!this.kinetics) throw new Error('Chưa lập kế hoạch phản ứng từ kiểm kê thực tế.');
        const previousReplay = this.replayProgress;
        this.replayProgress = advanceReaction(this.kinetics, this.sample, dt, this.stirringDrive > 0, burnerIsBurning(this.lamp));
        this.kinetics.progress = this.replayProgress;
        this.progress = this.contactProgress + (1 - this.contactProgress) * this.replayProgress;
        const patch: Partial<VesselState> = this.replayProgress > previousReplay
          ? applyProgramWithThermalSinks(this.program, this.baseline, this.sample, this.replayProgress, dt) : { hasGas: false };
        if (patch.gasReplayBlocked) throw new Error('Mẫu đã chạm giới hạn mô hình pha khí.');
        this.sample = { ...this.sample, ...patch };
        // An ignited specimen can sustain its own combustion while reactants
        // remain; a switched-off lamp alone does not extinguish magnesium.
        if (this.program.chemistry.conditions?.activation === 'ignition') this.flame = this.replayProgress > previousReplay;
        if (this.replayProgress === 1) { this.progress = 1; this.flame = false; this.enter('observe'); }
      }
      if (this.reactionTime > 180) throw new Error('Chưa đạt trạng thái cuối sau 180 giây mô phỏng. Kiểm tra điều kiện của bài.');
    } else if (this.phase === 'observe' && this.phaseTime >= 8) this.enter('complete');
    if (this.phase === 'return' || this.phase === 'condition') this.advanceContact(dt);
    this.sample.gasFlux = measureGasFlux(this.sample, previous, dt);
    // A transferred reagent is not a newly generated reaction gas. Its finite
    // inlet bubbles are rendered at the tube tip, never emitted again at the floor.
    if (gasArrival) this.sample.gasFlux.generated_mol_s[gasArrival.formula] = Math.max(0,
      (this.sample.gasFlux.generated_mol_s[gasArrival.formula] ?? 0) - gasArrival.moles / dt);
    if (!this.simulateEffects) return;
    const gas = gasVisualState(this.sample);
    const profile = getVesselProfile('beaker', 100);
    const aerosols = solidAerosolVisuals(this.sample, previous, this.program.id, dt);
    this.aerosolSuspended_g += aerosols.reduce((sum, a) => sum + a.mol_s * dt * computeMolarMass(a.formula), 0);
    const deposited = this.aerosolSuspended_g * -Math.expm1(-dt / 12);
    this.aerosolSuspended_g -= deposited; this.aerosolDeposited_g += deposited;
    const visible = [...gas.visible.filter(g => g.mol_s > 0), ...retainedGasVisuals(this.sample), ...aerosols];
    this.clouds.advance(dt, visible.map(g => ({ vesselId: this.sample.id, revision: 1, receipt: this.sample.gasFlux!, seconds: dt,
      species: g.formula, input: { rate: g.rate, mol_s: g.mol_s, temperature_c: this.sample.temperature_c, ambient_c: 25,
        molarMass: g.molarMass, mouthY: profile.baseY + profile.H, mouthRadius: profile.mouthR,
        floorY: 0.03, wind_m_s: 0.015, sourceToWorld: ([x, y, z]) => [x, y + 1.04, z],
        chamber: { profile, bottomY: vesselLiquidSurfaceY(this.sample), sealed: !!this.sample.isSealed,
          inletJet: this.hasGasSupply && this.sample.volume_ml < 0.01,
          sourcePoint: this.sample.recentPourContact?.point,
          ...(this.hasGasSupply ? { vent: [0, 1.42, -0.35] as const } : {}) } } })));
    this.physics.step(this.sample, dt, { thermalStateAuthoritative: true,
      agitation: this.stirringDrive,
      bodyMatrixWorld: RECEIVER_BODY_MATRIX,
      reactionGasRate: gasVolumeRateMl_s(Object.values(this.sample.gasFlux.generated_mol_s).reduce((s, n) => s + n, 0), this.sample.temperature_c, 1) });
    this.stocks.advance(this.sample, dt, this.physics.vortex.surface);
    if (this.sample.volume_ml > 0.01) this.appearance.advance(dt, {
      color: supernatantColor(this.sample.contents, this.sample.volume_ml) ?? this.sample.liquidColor ?? '#f8fafc',
      turbidity: this.physics.cloudiness, radius: profile.r(vesselLiquidSurfaceY(this.sample)),
      baseY: profile.baseY, fillY: vesselLiquidSurfaceY(this.sample), agitation: this.stirringDrive,
      vortex: this.physics.vortex.surface,
      contact: this.sample.recentPourContact && pourContactRemaining(this.sample.recentPourContact) > 0
        ? this.sample.recentPourContact.point : undefined,
      contactColor: ['aq', 'l'].includes(this.donors[this.donorIndex]?.row.phase) ? this.sample.recentPourContact?.color : undefined,
      reactionRate_s1: this.progress > previousProgress ? Math.LN2 / Math.max(0.05, this.program.chemistry.kinetics.halfTime_s || 1) : 0,
    });
  }
  /** Mass in free flight belongs to neither the donor nor the receiving liquid. */
  get inFlightMass_g() {
    return this.donors.reduce((sum, d) => sum + (d.solid?.flights.reduce((mass, f) => mass + (f.arrived ? 0 : f.mass_g), 0) ?? 0), 0);
  }
  private advanceSolidDose(donor: AutoDonor) {
    const dose = donor.solid!, count = dose.pieces.length, solid = autoSolid(donor.row.formula);
    const births: StockContactBirth[] = [], position = new Vector3(), q = new Quaternion(), scale = new Vector3();
    let contact: [number, number, number] | undefined;
    for (let i = dose.released; i < count; i++) {
      const releaseAt = AUTO_TIMING.tilt + AUTO_TIMING.flow * (i + 0.5) / count;
      if (this.phaseTime < releaseAt) break;
      const start = this.donorLipAt(releaseAt), mass_g = donor.row.mass_g / count;
      dose.pieces[i].decompose(position, q, scale);
      // Keep material volume when moving from donor-local to receiver units.
      const size = scale.x * AUTO_DONOR_SCALE;
      const radius = solid.geometry.boundingSphere!.radius * size;
      const targetY = this.sample.position[1] + vesselLiquidSurfaceY(this.sample) + radius;
      const vy = -0.2, distance = Math.max(0, start[1] - targetY);
      const duration = (vy + Math.sqrt(vy * vy + 2 * autoSolidGravity * distance)) / autoSolidGravity;
      const flightTime = Math.max(1 / 120, duration);
      const targetX = Math.max(-0.35, Math.min(0.35, start[0] + 0.12));
      const targetZ = Math.sin(i * 2.399963) * 0.2;
      dose.flights.push({ mass_g, releaseAt, arrivalAt: releaseAt + flightTime, arrived: false,
        position: start, velocity: [(targetX - start[0]) / flightTime, vy, (targetZ - start[2]) / flightTime], rotation: q.clone(), scale: size });
      dose.released++;
    }
    for (const flight of dose.flights) {
      if (flight.arrived || this.phaseTime < flight.arrivalAt) continue;
      flight.arrived = true; dose.arrived++;
      const p = solidFlightPosition(flight, flight.arrivalAt);
      p.y -= this.sample.position[1];
      contact = p.toArray();
      const meters = vesselBodyTransform(this.sample).metersPerLocalUnit;
      births.push({ mass_g: flight.mass_g, position_m: scenePointToSI(vesselLocalToWorld(this.sample, p.toArray())),
        rotation: flight.rotation.toArray(), velocity_m_s: [flight.velocity[0] * meters,
          (flight.velocity[1] - autoSolidGravity * (flight.arrivalAt - flight.releaseAt)) * meters, flight.velocity[2] * meters],
        angularVelocity_rad_s: [0, 0, 0] });
    }
    if (this.simulateEffects) this.stocks.addContact(this.sample.id, donor.row.formula, births);
    return contact;
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
    const before = this.sample;
    const kinetics = planSodiumWater(before, 'vi')?.kinetics ?? planMetalAcid(before, 'vi')?.kinetics
      ?? planStudioProgram(this.program, before, 'vi').kinetics;
    if (!kinetics) return;
    kinetics.inductionElapsed_s = this.contactKinetics?.inductionElapsed_s;
    kinetics.surfaceReferenceMass_g = this.contactKinetics?.surfaceReferenceMass_g;
    kinetics.surfaceReferenceMoles = this.contactKinetics?.surfaceReferenceMoles;
    // Incremental dosing rebases the remaining sample, as manual transfers do.
    const fraction = advanceReaction(kinetics, before, dt, this.stirringDrive > 0, this.flame);
    this.contactKinetics = kinetics;
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
    return this.donorPoseAt(this.phaseTime);
  }
  donorPoseAt(time: number): { position: [number, number, number]; tilt: number } {
    if (this.donors[this.donorIndex]?.row.phase === 'g') return { position: gasSourceHome(this.gasOrdinal(this.donorIndex), this.donors[this.donorIndex].row.moles), tilt: 0 };
    const home = donorHome(this.donorIndex), hover: [number, number, number] = [-1, 2.8, 0];
    const t = this.phase === 'carry' ? smooth(time / AUTO_TIMING.carry)
      : this.phase === 'return' ? 1 - smooth((time - AUTO_TIMING.upright) / AUTO_TIMING.return) : this.phase === 'dose' ? 1 : 0;
    const position = home.map((n, k) => n + (hover[k] - n) * t) as [number, number, number];
    position[1] += Math.sin(t * Math.PI) * 0.8;
    const remaining = this.phase === 'dose' ? 1 - smooth((time - AUTO_TIMING.tilt - AUTO_TIMING.flight) / AUTO_TIMING.flow) : 0;
    const pouringTilt = this.phase === 'dose' || this.phase === 'return' ? donorPouringTilt(remaining) : 0;
    return { position, tilt: this.phase === 'dose' ? -pouringTilt * smooth(time / AUTO_TIMING.tilt)
      : this.phase === 'return' ? this.returnTilt * (1 - smooth(time / AUTO_TIMING.upright)) : 0 };
  }
  get transferFraction() {
    const dose = this.donors[this.donorIndex]?.solid;
    if (dose) return dose.arrived / dose.pieces.length;
    return smooth((this.phaseTime - AUTO_TIMING.tilt - AUTO_TIMING.flight) / AUTO_TIMING.flow);
  }
  get streamActive() {
    return this.donors[this.donorIndex]?.row.phase !== 'g' && this.phase === 'dose' && this.phaseTime >= AUTO_TIMING.tilt
      && this.phaseTime < AUTO_TIMING.tilt + AUTO_TIMING.flow + AUTO_TIMING.flight;
  }
  /** World-space pouring edge, shared by the vessel and all transfer effects. */
  get donorLip(): [number, number, number] {
    return this.donorLipAt(this.phaseTime);
  }
  donorLipAt(time: number): [number, number, number] {
    const { position, tilt } = this.donorPoseAt(time);
    const x = 0.35 * 0.6, y = 1.48 * 0.6;
    return [position[0] + x * Math.cos(tilt) - y * Math.sin(tilt),
      position[1] + x * Math.sin(tilt) + y * Math.cos(tilt), position[2]];
  }
}
