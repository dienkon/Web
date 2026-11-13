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

const RECEIVER_PRODUCTS: Record<string,string> = {
  acid_base_titration:'NaCl', golden_rain_synthesis:'PbI2', co2_gas_production:'CaCl2',
  single_displacement_copper:'Cu', mass_conservation_bacl2_na2so4:'BaSO4',
  redox_gas_cu_hno3:'Cu(NO3)2', alkali_metal_water_na:'NaOH',
  agcl_curdy_precipitation:'AgCl', zn_hcl_hydrogen_production:'ZnCl2',
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
  private initialProductMoles = 0;
  private initialPeroxideMoles = 0;
  private initialWaterMoles = 0;
  private transferFinished = false;
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
    const contents=useAppStore.getState().vessels[plan.to]?.contents??[];
    const moles=(formula:string)=>contents.filter(c=>sameMolecularFormula(c.formula,formula)).reduce((n,c)=>n+c.moles,0);
    if(RECEIVER_PRODUCTS[id])this.initialProductMoles=moles(RECEIVER_PRODUCTS[id]);
    if(id==='catalytic_oxygen_prep'){this.initialPeroxideMoles=moles('H2O2');this.initialWaterMoles=moles('H2O');}
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
    // The caller supplies measured elapsed time. Limit a single interruption
    // while preserving normal delayed timer ticks instead of counting calls.
    const step=Math.min(dt,2);
    this.elapsed += step;
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
    if (!this.transferFinished && this.moved < this.total - 1e-8) {
      this.phase = 'transferring';
      const portion = Math.min(this.total-this.moved, this.plan.kind === 'solid' ? this.total : this.total * step/4);
      const moved = this.plan.kind === 'solid' ? state.transferDrySolid(this.plan.from,this.plan.to,portion)
        : state.transferLiquidContinuous(this.plan.from,this.plan.to,portion).accepted_ml;
      if (!(moved > 0)) {
        const source=useAppStore.getState().vessels[this.plan.from];
        const residue=source&&(this.plan.kind==='solid'?source.contents.reduce((n,c)=>n+c.mass_g,0):source.volume_ml);
        // Heating/evaporation can change a stock's volume during the run.
        // Keep the measured amount actually delivered; do not invent the
        // missing fraction or fail an otherwise completed finite transfer.
        const tolerance=Math.max(1e-6,this.total*1e-3);
        if(source&&!source.isShattered&&this.moved>0&&this.total-this.moved<=tolerance&&(residue??Infinity)<=tolerance){this.transferFinished=true;this.phase='observing';}
        else {this.stop('error');return;}
      } else this.moved += moved;
    } else {
      this.phase = 'observing';
      const contents=useAppStore.getState().vessels[this.plan.to].contents;
      const moles=(formula:string)=>contents.filter(c=>sameMolecularFormula(c.formula,formula)).reduce((n,c)=>n+c.moles,0);
      const product=RECEIVER_PRODUCTS[this.id];
      const reacted=this.id==='catalytic_oxygen_prep'
        ? moles('H2O2')<this.initialPeroxideMoles-1e-10&&moles('H2O')>this.initialWaterMoles+1e-10
        : Boolean(product)&&moles(product)>this.initialProductMoles+1e-10;
      if (this.elapsed >= 16 && reacted) this.stop('complete');
      else if(this.elapsed>120)this.stop('error');
    }
  }
}
