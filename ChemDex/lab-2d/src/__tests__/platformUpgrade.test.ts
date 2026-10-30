import {describe,it,expect,beforeEach} from 'vitest';
import {useLabStore,captureSnapshot} from '../store/useLabStore';
import {makeSession,restoreSession,validateSession} from '../services/labSessions';
import {CHEMICAL_CATALOG} from '../data/chemicals';
import {REACTION_DATABASE} from '../chemistry/reactions/reactionDatabase';
import {EXPERIMENTS_CATALOG} from '../data/experiments';
import {isElementBalancedReaction} from '../chemistry/core/ledger';
const state=()=>useLabStore.getState();
const add=(id:string,chemical:string,ml=10,g=0)=>state().addChemicalToEquipment(id,chemical,ml,g);
const check=()=>{expect(state().checkStepProgress()).toBe(true);state().nextStep();};
beforeEach(()=>{state().resetWorkbench();state().selectExperiment(null);useLabStore.setState({undoStack:[],redoStack:[],simulationPaused:false,studentNotes:''});});

describe('AI reaction conservation gate',()=>{
 it('accepts balanced catalog chemistry and rejects changed atoms or invalid amounts',()=>{
  const balanced=REACTION_DATABASE.find(reaction=>reaction.id==='rx_fe_cuso4_displacement')!;
  expect(isElementBalancedReaction(balanced)).toBe(true);
  const unbalanced=structuredClone(balanced);unbalanced.products[0].coefficient+=1;
  expect(isElementBalancedReaction(unbalanced)).toBe(false);
  for(const value of [0,-1,NaN,Infinity]){const bad=structuredClone(balanced);bad.reactants[0].coefficient=value;expect(isElementBalancedReaction(bad)).toBe(false);}
  const invalidHeat=structuredClone(balanced);invalidHeat.deltaH_kJ_mol=Infinity;
  expect(isElementBalancedReaction(invalidHeat)).toBe(false);
 });
});
describe('New guided experiments',()=>{
 it('has 20 unique experiments and unique deterministic reaction IDs',()=>{expect(EXPERIMENTS_CATALOG).toHaveLength(20);expect(new Set(EXPERIMENTS_CATALOG.map(e=>e.id)).size).toBe(20);expect(new Set(REACTION_DATABASE.map(r=>r.id)).size).toBe(REACTION_DATABASE.length);});
 it('identifies AgCl, AgBr and AgI in separate vessels',()=>{state().selectExperiment('exp-halide-identification');for(const chemical of ['chem-nacl','chem-nabr','chem-ki']){const id=state().addEquipment('test_tube');add(id,'chem-agno3');add(id,chemical);check();}});
 it('precipitates aluminium hydroxide then dissolves it in excess base',()=>{state().selectExperiment('exp-aluminium-amphoteric');const id=state().addEquipment('beaker');add(id,'chem-alcl3');check();add(id,'chem-naoh',30);check();add(id,'chem-naoh',30);check();});
 it('forms copper ammonia complex after hydroxide precipitation',()=>{state().selectExperiment('exp-copper-ammonia');const id=state().addEquipment('beaker');add(id,'chem-cuso4');add(id,'chem-naoh',20);check();add(id,'chem-nh3',60);check();});
 it('forms and clears calcium carbonate with metered CO2',()=>{state().selectExperiment('exp-limewater-excess-co2');const id=state().addEquipment('beaker');add(id,'chem-caoh2',20);check();const gas=Number(((CHEMICAL_CATALOG.find(c=>c.id==='chem-caoh2')!.defaultConcentration_M??.1)*.02*44.01).toFixed(4));add(id,'chem-co2',0,gas);check();add(id,'chem-co2',0,gas);check();});
 it('records the actual iron/copper displacement reaction',()=>{state().selectExperiment('exp-iron-copper-displacement');const id=state().addEquipment('beaker');add(id,'chem-cuso4',20);check();add(id,'chem-fe',0,.2);check();expect(state().history.some(h=>h.reactionId==='rx_fe_cuso4_displacement')).toBe(true);});
 it('keeps acetate buffer pH close to pKa after dilution',()=>{state().selectExperiment('exp-acetate-buffer');const id=state().addEquipment('beaker');add(id,'chem-ch3cooh',20);check();add(id,'chem-ch3coona',20);check();const before=state().equipment[id].ph;add(id,'chem-h2o',40);check();expect(state().equipment[id].ph).toBeCloseTo(before,2);});
});
describe('Session consistency and undo',()=>{
 it('round-trips quantities, notes and guided progress, restoring paused',()=>{state().selectExperiment('exp-acetate-buffer');const id=state().addEquipment('beaker');add(id,'chem-ch3cooh',20);check();state().setStudentNotes('Quan sát: dung dịch không màu.');const saved=makeSession('Thực hành');const expected=captureSnapshot(state());state().resetWorkbench();restoreSession(JSON.parse(JSON.stringify(saved)));expect(JSON.parse(JSON.stringify(captureSnapshot(state())))).toEqual(JSON.parse(JSON.stringify(expected)));expect(state().simulationPaused).toBe(true);});
 it('rejects invalid amount, volume, type and unsupported session versions',()=>{const id=state().addEquipment('beaker');add(id,'chem-hcl',10);const good=makeSession();for(const mutate of [(s:any)=>s.version=2,(s:any)=>s.state.equipment[id].contents[0].moles=-1,(s:any)=>s.state.equipment[id].volume_ml=9999,(s:any)=>s.state.equipment[id].type='unknown']){const bad=structuredClone(good);mutate(bad);expect(()=>validateSession(bad)).toThrow();}expect(state().equipment[id].volume_ml).toBe(10);});
 it('undo/redo restores reaction history and quantities together',()=>{const id=state().addEquipment('beaker');add(id,'chem-hcl',20);const before=captureSnapshot(state());add(id,'chem-naoh',20);const after=captureSnapshot(state());state().undo();expect(captureSnapshot(state())).toEqual(before);state().redo();expect(captureSnapshot(state())).toEqual(after);});
 it('does not advance thermal simulation while paused',()=>{const id=state().addEquipment('beaker');add(id,'chem-h2o',40);state().setSimulationPaused(true);const before=captureSnapshot(state());state().tickSimulation(1);expect(captureSnapshot(state())).toEqual(before);});
 it('does not mutate previous quantity objects when adding the same reagent',()=>{const id=state().addEquipment('beaker');add(id,'chem-hcl',10);const previous=state().equipment[id].contents[0],moles=previous.moles;add(id,'chem-hcl',10);expect(previous.moles).toBe(moles);});
 it('keeps stock solvent mass through neutralization',()=>{const id=state().addEquipment('beaker');add(id,'chem-hcl',20);add(id,'chem-naoh',20);const vessel=state().equipment[id];const expected=20*CHEMICAL_CATALOG.find(c=>c.id==='chem-hcl')!.density_g_ml!+20*CHEMICAL_CATALOG.find(c=>c.id==='chem-naoh')!.density_g_ml!;expect(vessel.mass_g-vessel.tare_g!).toBeCloseTo(expected,2);expect(vessel.contents.find(c=>c.formula==='H2O')!.mass_g).toBeGreaterThan(39);});
 it('accounts for the mass of gas leaving an open carbonate reaction',()=>{const id=state().addEquipment('beaker');add(id,'chem-nahco3',20);add(id,'chem-hcl',20);const vessel=state().equipment[id];const stock=20*CHEMICAL_CATALOG.find(c=>c.id==='chem-nahco3')!.density_g_ml!+20*CHEMICAL_CATALOG.find(c=>c.id==='chem-hcl')!.density_g_ml!;expect(stock-(vessel.mass_g-vessel.tare_g!)).toBeCloseTo(.002*44.01,2);});
 it('only completes a guided experiment after the final physical criteria hold',()=>{state().selectExperiment('exp-acetate-buffer');expect(state().completeExperiment()).toBe(false);const id=state().addEquipment('beaker');add(id,'chem-ch3cooh',20);check();add(id,'chem-ch3coona',20);check();expect(state().completeExperiment()).toBe(false);add(id,'chem-h2o',40);expect(state().completeExperiment()).toBe(true);expect(state().completedExperiments['exp-acetate-buffer']).toBeTruthy();});
});
