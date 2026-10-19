import { create } from 'zustand';
import { getPostPhaseWork, POST_PHASE_IDS, POST_PHASE_VERSION } from '../data/postPhaseWork';
import { pathLength } from '../core/simulation/GestureProgress';
import { practicalScore, type PracticalResult } from '../core/simulation/PracticalEvaluation';
import type { PracticalProgress } from '../components/ui/PracticalSimulation';

export interface PracticeRecord { runs:number; best?:PracticalResult; last?:PracticalResult; independentBest?:PracticalResult; history?:{result:PracticalResult;completedAt:number}[]; draft?:{ mode:'guided'|'independent'; version:number; progress:PracticalProgress } }
const KEY='chemdex-advanced-practice-v2';
const count=(value:unknown,max=9999)=>Math.max(0,Math.min(max,Math.floor(Number(value)||0)));
function result(value:unknown,total:number):PracticalResult|undefined {
 if(!value||typeof value!=='object')return;
 const r=value as PracticalResult;
 if(r.completedSteps!==total||r.totalSteps!==total||!['guided','independent'].includes(r.mode))return;
 const mistakes=count(r.mistakes),hints=count(r.hints);
 return {completedSteps:total,totalSteps:total,mistakes,hints,score:practicalScore(mistakes,hints),mode:r.mode};
}
export function restorePractice(value:unknown):Record<string,PracticeRecord> {
 const restored:Record<string,PracticeRecord>={};
 if(!value||typeof value!=='object')return restored;
 for(const id of POST_PHASE_IDS){
  const raw=(value as Record<string,PracticeRecord>)[id];if(!raw||typeof raw!=='object')continue;
  const work=getPostPhaseWork(id),total=work.steps.length;
  const entry:PracticeRecord={runs:count(raw.runs),best:result(raw.best,total),last:result(raw.last,total),independentBest:result(raw.independentBest,total)};
  entry.history=Array.isArray(raw.history)?raw.history.slice(-10).flatMap(row=>{const checked=result(row?.result,total);return checked&&Number.isFinite(row?.completedAt)&&row.completedAt>0?[{result:checked,completedAt:row.completedAt}]:[];}):[];
  if(raw.draft?.version===POST_PHASE_VERSION&&['guided','independent'].includes(raw.draft.mode)&&raw.draft.progress){
   const input=raw.draft.progress,step=count(input.step,total),current=work.steps[step];
   entry.draft={mode:raw.draft.mode,version:POST_PHASE_VERSION,progress:{step,mistakes:count(input.mistakes),hints:count(input.hints),revealed:input.revealed===true,traceDistance:current?.mode==='trace'?Math.max(0,Math.min(pathLength(current.path??[]),Number(input.traceDistance)||0)):0,
    inspected:[...new Set(Array.isArray(input.inspected)?input.inspected.filter(i=>Number.isInteger(i)&&i>=0&&i<(current?.inspections?.length??0)):[])],
    placed:[...new Set(Array.isArray(input.placed)?input.placed.filter(id=>current?.placements?.some(p=>p.object===id)):[])],
   }};
  }
  restored[id]=entry;
 }
 return restored;
}
function load(){try{return restorePractice(JSON.parse(localStorage.getItem(KEY)??'{}'));}catch{return {};}}
function save(records:Record<string,PracticeRecord>){try{localStorage.setItem(KEY,JSON.stringify(records));}catch{/* Practice remains usable when storage is unavailable. */}}
interface AdvancedPracticeState {
 open:boolean; selected:string|null; mode:'guided'|'independent'; records:Record<string,PracticeRecord>;
 show:()=>void; close:()=>void; select:(id:string,mode:'guided'|'independent',restart?:boolean)=>void;
 saveDraft:(id:string,mode:'guided'|'independent',progress:PracticalProgress)=>void;
 finish:(id:string,value:PracticalResult)=>void;
}
export const useAdvancedPractice=create<AdvancedPracticeState>((set,get)=>({
 open:false,selected:null,mode:'guided',records:load(),
 show:()=>set({open:true,selected:null}),close:()=>set({open:false,selected:null}),
 select:(id,mode,restart=false)=>{
  if(!POST_PHASE_IDS.includes(id))return;
  if(restart){const entry={...get().records[id],runs:get().records[id]?.runs??0,draft:undefined};const records={...get().records,[id]:entry};save(records);set({records});}
  set({open:true,selected:id,mode});
 },
 saveDraft:(id,mode,progress)=>{
  if(!POST_PHASE_IDS.includes(id))return;
  const records=restorePractice({...get().records,[id]:{...get().records[id],runs:get().records[id]?.runs??0,draft:{version:POST_PHASE_VERSION,mode,progress}}});
  save(records);set({records});
 },
 finish:(id,value)=>{
  if(get().selected!==id||!POST_PHASE_IDS.includes(id))return;
  const verified=result(value,getPostPhaseWork(id).steps.length);if(!verified)return;
  const previous=get().records[id];
  const best=!previous?.best||verified.score>previous.best.score?verified:previous.best;
  const independentBest=verified.mode==='independent'&&(!previous?.independentBest||verified.score>previous.independentBest.score)?verified:previous?.independentBest;
  const history=[...(previous?.history??[]),{result:verified,completedAt:Date.now()}].slice(-10);
  const records={...get().records,[id]:{runs:(previous?.runs??0)+1,best,last:verified,independentBest,history}};
  save(records);set({records,selected:null});
 },
}));
