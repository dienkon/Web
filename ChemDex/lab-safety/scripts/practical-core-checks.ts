import {emptyStir,stirMotion,traceStroke,pathLength,pointAlong} from '../src/core/simulation/GestureProgress';
import assert from 'node:assert/strict';
import { LAB_SCENARIOS } from '../src/scenarios/catalog';
import { newScenarioAttempt, restoreScenarioAttempt, transitionScenario } from '../src/scenarios/engine';
import { PRACTICAL_WORK, collectionWork, disposalWork } from '../src/data/practicalWork';
import { instrumentWork } from '../src/data/instrumentWork';
import { SAFETY_ROUNDS } from '../src/data/safetyRounds';
import { INITIAL_TASKS } from '../src/data/tasks';
import { PhaseEngine } from '../src/core/PhaseEngine';
import { questOwnsEquipment } from '../src/systems/input/questEquipment';
import { useStore } from '../src/store/useStore';
import type { InstrumentKind } from '../src/store/useLabEquipment';
import { getPostPhaseWork, POST_PHASE_IDS, POST_PHASE_VERSION } from '../src/data/postPhaseWork';
import { followsSegment, placementAt, practicalScore } from '../src/core/simulation/PracticalEvaluation';
import { restorePractice, useAdvancedPractice } from '../src/store/useAdvancedPractice';
import { getSceneVisual, SCENE_VISUALS } from '../src/components/ui/practical/sceneVisuals';
import { INSTRUMENT_VISUALS } from '../src/components/ui/practical/instrumentVisuals';
import { ACID_WORK } from '../src/data/acidWork';
import { HAZARD_LABEL_WORK } from '../src/data/hazardLabelWork';

let steps=0;
const kinds: InstrumentKind[]=['washBottle','ventilation','gas','blanket','locker','clock','smokeAlarm','balance','volume','titration','heat','wash','storage','glass','ph','hood','workspace','seat','drawer','door','electrical','board','ppe','extinguisher','spillKit','firstAid','shower','mirror','waste'];
const works=[ACID_WORK,HAZARD_LABEL_WORK,...Object.values(PRACTICAL_WORK),...POST_PHASE_IDS.map(getPostPhaseWork),collectionWork('Mảnh vỡ',true),collectionWork('Giấy',false),...['chemical','sharps','domestic'].map(disposalWork),...kinds.map(kind=>instrumentWork({id:kind,title:kind,kind,position:[0,0,0]}))];
for(const work of works){
 assert.ok(work.visualId,work.title+' missing visual identity');
 assert.ok(work.visualId in SCENE_VISUALS||work.visualId in INSTRUMENT_VISUALS,work.title+' has no registered visual profile');
 assert.equal(getSceneVisual(work).id,work.visualId,work.title+' falls through to a generic scene');
 assert.ok(work.steps.length>=2,work.title);
 const ids=new Set(work.objects.map(o=>o.id));
 assert.equal(ids.size,work.objects.length,work.title+' duplicate props');
 for(const step of work.steps){
  steps++; assert.ok(ids.has(step.object),work.title+' missing object '+step.object);
  assert.ok(step.instruction&&step.detail);
  assert.ok(step.target.every(Number.isFinite));
  if(step.mode==='trace')assert.ok(step.path&&step.path.length>=3);
  if(step.mode==='adjust')assert.ok(step.value!>=0&&step.value!<=100);
  if(step.mode==='inspect'){assert.ok(step.inspections!.length>=3);step.inspections!.forEach(c=>assert.ok(ids.has(c.object)&&c.title&&c.detail));}
  if(step.mode==='arrange'){assert.ok(step.placements!.length>=2);assert.equal(new Set(step.placements!.map(p=>p.object)).size,step.placements!.length);step.placements!.forEach(p=>assert.ok(ids.has(p.object)&&p.label));}
 }
}
for(const scenario of LAB_SCENARIOS){
 const work=getPostPhaseWork(scenario.id);assert.ok(work,scenario.id);
 let attempt=newScenarioAttempt(scenario);
 assert.equal(transitionScenario(scenario,attempt,{type:'finish'}).accepted,false);
 assert.equal(transitionScenario(scenario,attempt,{type:'physical-step',index:2}).accepted,false,'cannot skip');
 for(let i=1;i<=work.steps.length;i++){
  const result=transitionScenario(scenario,attempt,{type:'physical-step',index:i});assert.ok(result.accepted);attempt=result.attempt;
  assert.equal(transitionScenario(scenario,attempt,{type:'physical-step',index:i}).accepted,false,'cannot replay step');
  const restored=restoreScenarioAttempt(scenario,JSON.parse(JSON.stringify(attempt)));assert.equal(restored.physicalStep,i,'partial progress survives reload');
 }
 const result=transitionScenario(scenario,attempt,{type:'finish'});assert.ok(result.attempt.completed);
 assert.ok(restoreScenarioAttempt(scenario,result.attempt).completed);
 assert.equal(transitionScenario(scenario,result.attempt,{type:'finish'}).accepted,false,'no duplicate completion');
}
assert.ok(INITIAL_TASKS.some(t=>t.id==='task_alcohol_cap'&&t.phase===4));
assert.ok(SAFETY_ROUNDS.some(t=>t.id==='task_alcohol_cap'));
const tasks=INITIAL_TASKS.map(t=>({...t,completed:t.id!=='task_alcohol_cap'}));
assert.equal(PhaseEngine.isPhaseComplete(4,tasks,useStore.getState().player),false,'cap is required');
const state={...useStore.getState(),currentPhase:2,tasks:INITIAL_TASKS};
assert.ok(questOwnsEquipment({id:'aid',kind:'firstAid',title:'Tủ sơ cứu',position:[-9.85,1.4,1]},state));
assert.equal(questOwnsEquipment({id:'chair',kind:'seat',title:'Ghế',position:[0,0,0]},state),false);
// A saved phase-five player can reach the newly required lamp round without losing completed incidents.
const previousStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify({currentPhase:5,tasks:INITIAL_TASKS.filter(t=>t.id!=='task_alcohol_cap').map(t=>({...t,completed:true})),player:useStore.getState().player}),setItem:()=>{}}});
useStore.getState().resumeGame();
assert.equal(useStore.getState().currentPhase,4);
assert.ok(useStore.getState().tasks.find(t=>t.id===LAB_SCENARIOS[0].taskId)?.completed,'migration preserves finished tasks');
if(previousStorage)Object.defineProperty(globalThis,'localStorage',previousStorage);else Reflect.deleteProperty(globalThis,'localStorage');
for(const id of POST_PHASE_IDS){const w=getPostPhaseWork(id);assert.equal(w.steps[0].mode,'inspect');assert.ok(w.steps.length>PRACTICAL_WORK[id].steps.length||w.steps.some(s=>s.mode==='arrange'));}
assert.equal(followsSegment([0,0],[100,0],[0,0],[100,0]),true);
assert.equal(followsSegment([0,0],[100,100],[0,0],[100,0]),false,'diagonal shortcut cannot complete a straight work strip');
assert.equal(placementAt([4,5],[{object:'a',target:[0,0],label:'A'}])?.object,'a');
assert.equal(placementAt([100,100],[{object:'a',target:[0,0],label:'A'}]),undefined);
assert.equal(practicalScore(2,1),88);assert.equal(practicalScore(999,999),0);
const centrifuge=getPostPhaseWork('centrifuge-balance'),total=centrifuge.steps.length;
const invalid=restorePractice({'centrifuge-balance':{runs:-1,best:{score:999,totalSteps:1,completedSteps:1},draft:{version:POST_PHASE_VERSION,mode:'guided',progress:{step:1,inspected:[-1,999],placed:['tube1','foreign','tube1'],mistakes:-4,hints:2}}},foreign:{runs:999}});
assert.equal(invalid['centrifuge-balance'].best,undefined);assert.equal(invalid['centrifuge-balance'].runs,0);assert.deepEqual(invalid['centrifuge-balance'].draft!.progress.placed,['tube1']);assert.equal(invalid.foreign,undefined);
useAdvancedPractice.setState({records:{},selected:'centrifuge-balance',open:true});
const certScore=useStore.getState().score;
useAdvancedPractice.getState().finish('centrifuge-balance',{completedSteps:total,totalSteps:total,mistakes:2,hints:1,score:999,mode:'guided'});
assert.equal(useAdvancedPractice.getState().records['centrifuge-balance'].best!.score,88,'score is derived from actual mistakes and hints');
useAdvancedPractice.getState().finish('centrifuge-balance',{completedSteps:total,totalSteps:total,mistakes:0,hints:0,score:100,mode:'guided'});
assert.equal(useAdvancedPractice.getState().records['centrifuge-balance'].runs,1,'double completion is ignored');assert.equal(useStore.getState().score,certScore,'practice does not change certification score');
for(let i=0;i<12;i++){useAdvancedPractice.setState({selected:'centrifuge-balance'});useAdvancedPractice.getState().finish('centrifuge-balance',{completedSteps:total,totalSteps:total,mistakes:1,hints:0,score:95,mode:'independent'});}
assert.equal(useAdvancedPractice.getState().records['centrifuge-balance'].history!.length,10,'history remains bounded after repeated practice');
assert.equal(restoreScenarioAttempt(LAB_SCENARIOS[0],{...newScenarioAttempt(LAB_SCENARIOS[0]),workVersion:POST_PHASE_VERSION-1,physicalStep:3}).physicalStep,0,'older unfinished sessions cannot skip newly added inspection');
console.log(JSON.stringify({passed:true,scenarios:LAB_SCENARIOS.length,instrumentKinds:kinds.length,workflows:works.length,validatedSteps:steps},null,2));

const ribbon:[number,number][]=[[0,0],[200,0],[200,200],[400,200]];
assert.equal(pathLength(ribbon),600);assert.deepEqual(pointAlong(ribbon,250),[200,50]);
let stroke=traceStroke(ribbon,0,[0,0],[120,7]);assert.ok(stroke.distance>=115);
const saved=stroke.distance;stroke=traceStroke(ribbon,saved,pointAlong(ribbon,saved),[120,-150]);assert.ok(stroke.offPath&&stroke.distance>=saved);
assert.equal(traceStroke(ribbon,0,[0,0],[400,200]).complete,false,'diagonal cannot skip bent ribbon');
let distance=saved;for(const to of [[200,0],[200,200],[400,200]] as [number,number][]){distance=traceStroke(ribbon,distance,pointAlong(ribbon,distance),to).distance;}assert.ok(distance>=594,'resume after lifting follows all bends');
for(const sign of [-1,1]){let stir=emptyStir();for(let i=0;i<=40;i++){const a=sign*i/40*Math.PI*2;stir=stirMotion(stir,[76*Math.cos(a),76*Math.sin(a)],[0,0],76);}assert.equal(stir.progress,1,'either direction completes actual circle');}
let stir=emptyStir();for(let i=0;i<60;i++)stir=stirMotion(stir,[76,0],[0,0],76);assert.equal(stir.progress,0,'holding still never stirs');
for(let i=0;i<60;i++)stir=stirMotion(stir,[76*Math.cos(i%2*.2),76*Math.sin(i%2*.2)],[0,0],76);assert.ok(stir.progress<.1,'shaking does not accumulate circles');
stir=emptyStir();for(let i=0;i<20;i++)stir=stirMotion(stir,[i%2?76:-76,0],[0,0],76);assert.equal(stir.progress,0,'diameter jumps do not count');
console.log('Gesture checks passed: forgiving resumable ribbon; no shortcut; real circular stirring in either direction; idle and shaking rejected.');

const traceWork=getPostPhaseWork('evacuation'),traceIndex=traceWork.steps.findIndex(s=>s.mode==='trace');
const traceDraft=restorePractice({evacuation:{runs:0,draft:{version:POST_PHASE_VERSION,mode:'guided',progress:{step:traceIndex,inspected:[],placed:[],mistakes:0,hints:0,traceDistance:123}}}});
assert.equal(traceDraft.evacuation.draft!.progress.traceDistance,123,'partial ribbon progress survives restoration');
let resumed=emptyStir();for(let i=0;i<=20;i++){const a=i/40*Math.PI*2;resumed=stirMotion(resumed,[76*Math.cos(a),76*Math.sin(a)],[0,0],76);}resumed={...resumed,lastAngle:null};
for(let i=20;i<=40;i++){const a=i/40*Math.PI*2;resumed=stirMotion(resumed,[76*Math.cos(a),76*Math.sin(a)],[0,0],76);}assert.equal(resumed.progress,1,'stirring continues after finger lift');
