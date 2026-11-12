import { afterEach, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { ObservationSession, OBSERVATION_PLANS } from '../src/engine/observation';
import { transferDrySample } from '../src/handling/drySolidTransfer';
import { readComposition } from '../src/science/balance';
import { clearHistory } from '../src/store/persistence';

const original=useAppStore.getState();
afterEach(()=>{useAppStore.setState(original,true);clearHistory();});
const atoms=()=>{
  const result:Record<string,number>={};
  for(const v of Object.values(useAppStore.getState().vessels))for(const c of v.contents)
    for(const [e,n]of Object.entries(readComposition(c.formula==='Phenolphthalein'?'C20H14O4':c.formula).atoms))result[e]=(result[e]??0)+n*c.moles;
  return result;
};

it.each(Object.keys(OBSERVATION_PLANS).filter(id=>id!=='thermal_decomp_cuoh2'))('observes %s through finite inventory transfers and conserves all atoms before projection',id=>{
  useAppStore.setState({burners:{},burnerIds:[],isSimulationPaused:false,timeScale:1});
  const run=new ObservationSession(id), before=atoms();
  const mass=()=>Object.values(useAppStore.getState().vessels).reduce((n,v)=>n+v.contents.reduce((s,c)=>s+c.mass_g,0),0);
  const initialMass=mass();
  for(let i=0;i<80;i++)run.advance(.25);
  expect(run.phase).toBe('complete');expect(run.moved).toBeCloseTo(run.total,8);
  const after=atoms();
  for(const [e,n]of Object.entries(before))expect(after[e]??0,e).toBeCloseTo(n,7);
  expect(mass()).toBeCloseTo(initialMass,6);
  expect(useAppStore.getState().vessels[run.plan.to].contents.length).toBeGreaterThan(0);
});

it('dry transfer rejects wet/closed samples and cannot create more than the existing amount',()=>{
  useAppStore.getState().setupExperimentPreset('alkali_metal_water_na');
  const {beaker_1:water,beaker_2:sodium}=useAppStore.getState().vessels;
  expect(transferDrySample(water,sodium,1)).toBeNull();
  expect(transferDrySample(sodium,{...water,isSealed:true},1)).toBeNull();
  expect(transferDrySample(sodium,water,-1)).toBeNull();
  const transfer=transferDrySample(sodium,water,100)!;
  expect(transfer.mass_g).toBeCloseTo(.1,12);
  expect(transfer.source.contents).toHaveLength(0);
  expect(transfer.source.mass_g+transfer.receiver.mass_g).toBeCloseTo(sodium.mass_g+water.mass_g,12);
  expect(transferDrySample(transfer.source,transfer.receiver,1)).toBeNull();
});

it('pausing, stopping and changing the preset prevent later automatic transfers',()=>{
  useAppStore.setState({isSimulationPaused:false,timeScale:2});
  const run=new ObservationSession('golden_rain_synthesis');
  useAppStore.getState().setSimulationPaused(true);
  for(let i=0;i<40;i++)run.advance(.25);
  expect(run.moved).toBe(0);expect(run.elapsed).toBe(0);
  useAppStore.getState().setSimulationPaused(false);
  run.stop();run.advance(.25);expect(run.moved).toBe(0);expect(useAppStore.getState().timeScale).toBe(2);
  const other=new ObservationSession('agcl_curdy_precipitation');
  useAppStore.getState().setupExperimentPreset('single_displacement_copper');
  other.advance(.25);expect(other.phase).toBe('stopped');expect(other.moved).toBe(0);
});

it('thermal observation uses the burner, never sets a product or temperature, and shuts it off on stop',()=>{
  useAppStore.setState({burners:original.burners,burnerIds:original.burnerIds,isSimulationPaused:false,timeScale:1});
  const run=new ObservationSession('thermal_decomp_cuoh2');
  const before=useAppStore.getState().vessels[run.plan.to];
  for(let i=0;i<8;i++)run.advance(.25);
  expect(run.phase).toBe('observing');
  expect(useAppStore.getState().vessels[run.plan.to]).toEqual(before);
  expect(Object.values(useAppStore.getState().burners).some(b=>b.isOn)).toBe(true);
  run.stop();expect(Object.values(useAppStore.getState().burners).some(b=>b.isOn)).toBe(false);
});

it('thermal observation reaches the decomposition through the running heat and reaction engine',()=>{
  useAppStore.setState({burners:original.burners,burnerIds:original.burnerIds,isSimulationPaused:false,timeScale:1});
  const run=new ObservationSession('thermal_decomp_cuoh2');
  for(let i=0;i<600 && !['complete','error'].includes(run.phase);i++) {
    run.advance(.25);useAppStore.getState().tickSimulation(.25);
  }
  const final=useAppStore.getState();
  expect(run.phase).toBe('complete');
  expect(final.vessels[run.plan.to].contents.some(c=>c.formula==='CuO' && c.moles>0)).toBe(true);
  expect(Object.values(final.burners).some(b=>b.isOn)).toBe(false);
});
