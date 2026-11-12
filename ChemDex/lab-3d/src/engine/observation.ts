import { useAppStore } from '../store/useAppStore';
import { sameMolecularFormula } from '../science/speciesIdentity';

type Plan = { from: string; to: string; kind: 'liquid' | 'solid'; amount?: number } | { to: string; kind: 'heat' };
export const OBSERVATION_PLANS: Record<string, Plan> = {
  acid_base_titration: { kind: 'liquid', from: 'beaker_1', to: 'flask_1', amount: 20 },
  golden_rain_synthesis: { kind: 'liquid', from: 'beaker_2', to: 'beaker_1' },
  co2_gas_production: { kind: 'liquid', from: 'beaker_1', to: 'flask_1' },
  single_displacement_copper: { kind: 'solid', from: 'beaker_2', to: 'beaker_1' },
  mass_conservation_bacl2_na2so4: { kind: 'liquid', from: 'beaker_2', to: 'beaker_1' },
  catalytic_oxygen_prep: { kind: 'solid', from: 'beaker_1', to: 'flask_1', amount: 0.174 },
  thermal_decomp_cuoh2: { kind: 'heat', to: 'beaker_1' },
  redox_gas_cu_hno3: { kind: 'liquid', from: 'beaker_1', to: 'flask_1' },
  alkali_metal_water_na: { kind: 'solid', from: 'beaker_2', to: 'beaker_1' },
  agcl_curdy_precipitation: { kind: 'liquid', from: 'cylinder_1', to: 'beaker_1' },
  zn_hcl_hydrogen_production: { kind: 'liquid', from: 'beaker_1', to: 'test_tube_1' },
};

/** Drives the same finite transfers, chemistry and heat engine as user actions.
 * It never sets product colors, temperatures, gas or reaction progress. */
export class ObservationSession {
  readonly plan: Plan;
  elapsed = 0;
  moved = 0;
  total = 0;
  phase: 'preparing' | 'transferring' | 'observing' | 'complete' | 'stopped' | 'error' = 'preparing';
  private epoch: number;
  private previousScale: number;
  private previousPaused: boolean;
  private startedBurner: string | null = null;
  constructor(readonly id: string) {
    const plan = OBSERVATION_PLANS[id];
    if (!plan) throw Error('Thí nghiệm này chưa có quy trình quan sát tự động.');
    this.plan = plan;
    const state = useAppStore.getState();
    this.previousScale = state.timeScale; this.previousPaused = state.isSimulationPaused;
    state.setupExperimentPreset(id);
    this.epoch = useAppStore.getState().pourEpoch;
    useAppStore.setState({ isSimulationPaused: false, timeScale: 1, activeTool: 'none', selectedVesselId: plan.to });
    useAppStore.getState().focusVessel(plan.to);
    if (plan.kind !== 'heat') {
      const source = useAppStore.getState().vessels[plan.from];
      if (!source) throw Error('Thiếu bình chứa hóa chất của quy trình.');
      this.total = Math.min(plan.amount ?? Infinity, plan.kind === 'liquid' ? source.volume_ml : source.contents.reduce((n,c)=>n+c.mass_g,0));
      if (id === 'acid_base_titration') {
        const acid = useAppStore.getState().vessels[plan.to].contents.find(c=>sameMolecularFormula(c.formula,'HCl'));
        const base = source.contents.find(c=>sameMolecularFormula(c.formula,'NaOH'));
        if (acid && base && base.moles > 0) this.total = Math.min(source.volume_ml, acid.moles / base.moles * source.volume_ml);
      }
      if (!(this.total > 0)) throw Error('Mẫu ban đầu không đủ cho quy trình.');
    }
  }
  stop(phase: ObservationSession['phase'] = 'stopped') {
    if (['complete','stopped','error'].includes(this.phase)) return;
    const state = useAppStore.getState();
    if (this.startedBurner && state.burners[this.startedBurner]?.isOn) state.toggleBurner(this.startedBurner);
    state.setTimeScale(this.previousScale); state.setSimulationPaused(this.previousPaused);
    this.phase = phase;
  }
  advance(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0 || ['complete','stopped','error'].includes(this.phase)) return;
    const state = useAppStore.getState();
    if (state.activeExperimentId !== this.id || state.pourEpoch !== this.epoch) { this.stop(); return; }
    if (state.isSimulationPaused) return;
    this.elapsed += Math.min(dt, 0.5);
    const receiver = state.vessels[this.plan.to];
    if (!receiver || receiver.isShattered) { this.stop('error'); return; }
    if (this.elapsed < 1.5) return;
    if (this.plan.kind === 'heat') {
      if (!this.startedBurner) {
        const burner = Object.values(state.burners).find(b => Math.hypot(b.position[0]-receiver.position[0],b.position[2]-receiver.position[2])<1.5);
        if (!burner) { this.stop('error'); return; }
        if (!burner.isOn) { state.toggleBurner(burner.id); this.startedBurner = burner.id; }
        else this.startedBurner = burner.id;
        state.setTimeScale(4);
      }
      this.phase = 'observing';
      const hasProduct = receiver.contents.some(c=>sameMolecularFormula(c.formula,'CuO') && c.moles > 0);
      if (receiver.temperature_c >= 90) this.stop(hasProduct ? 'complete' : 'error');
      else if (this.elapsed > 120 || !useAppStore.getState().burners[this.startedBurner]?.isOn) this.stop('error');
      return;
    }
    if (this.moved < this.total - 1e-8) {
      this.phase = 'transferring';
      const portion = Math.min(this.total-this.moved, this.plan.kind === 'solid' ? this.total : this.total * Math.min(dt,0.5)/4);
      const moved = this.plan.kind === 'solid' ? state.transferDrySolid(this.plan.from,this.plan.to,portion)
        : state.transferLiquidContinuous(this.plan.from,this.plan.to,portion).accepted_ml;
      if (!(moved > 0)) { this.stop('error'); return; }
      this.moved += moved;
    } else {
      this.phase = 'observing';
      if (this.elapsed >= 16) this.stop('complete');
    }
  }
}
