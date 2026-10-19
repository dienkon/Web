import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getPostPhaseWork, POST_PHASE_IDS } from '../../data/postPhaseWork';
import { useAdvancedPractice } from '../../store/useAdvancedPractice';
import { PracticalSimulation } from './PracticalSimulation';
import { useScenarioModal } from '../../scenarios/useScenarioModal';
import { useDialogFocus } from '../../academy/hooks/useDialogFocus';
import { isSceneInputBlocked } from '../../systems/input/sceneInput';
import { useStore } from '../../store/useStore';
import './practical.css';

export function AdvancedPracticeLibrary(){
 const open=useAdvancedPractice(s=>s.open),selected=useAdvancedPractice(s=>s.selected),mode=useAdvancedPractice(s=>s.mode),records=useAdvancedPractice(s=>s.records);
 const cinematic=useStore(s=>s.cinematic);
 const work=useMemo(()=>selected?getPostPhaseWork(selected):null,[selected]);
 useEffect(()=>{
  const show=()=>{const s=useStore.getState();if((s.view==='certificate'||!isSceneInputBlocked())&&!useAdvancedPractice.getState().open)useAdvancedPractice.getState().show();};
  window.addEventListener('lab-open-advanced-practice',show);return()=>window.removeEventListener('lab-open-advanced-practice',show);
 },[]);
 if(!open||cinematic)return null;
 if(selected&&work){
  const draft=records[selected]?.draft;
  return <PracticalSimulation key={selected+mode} work={work} mode={mode} initialProgress={draft?.mode===mode?draft.progress:undefined}
   onProgress={progress=>useAdvancedPractice.getState().saveDraft(selected,mode,progress)}
   onClose={()=>useAdvancedPractice.setState({selected:null})}
   onComplete={result=>{if(result)useAdvancedPractice.getState().finish(selected,result);}}/>;
 }
 return <PracticeCatalog/>;
}

function PracticeCatalog(){
 const records=useAdvancedPractice(s=>s.records);
 const [query,setQuery]=useState(''),[mode,setMode]=useState<'guided'|'independent'>('guided');
 const ref=useRef<HTMLElement>(null),close=()=>useAdvancedPractice.getState().close();
 useScenarioModal(true);useDialogFocus(ref,close);
 const exercises=useMemo(()=>POST_PHASE_IDS.map(id=>({id,work:getPostPhaseWork(id)})),[]);
 const completed=Object.values(records).filter(r=>r.best).length;
 const fold=(value:string)=>value.toLocaleLowerCase('vi').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/đ/g,'d');
 const visible=exercises.filter(e=>fold(e.work.title).includes(fold(query)));
 return <div className="practical-backdrop" data-ui data-advanced-practice><section ref={ref} className="advanced-practice-library" role="dialog" aria-modal="true" aria-labelledby="advanced-practice-title">
  <header><div><p>SAU CÁC CHẶNG CHÍNH · RÈN KỸ NĂNG THỰC HÀNH</p><h2 id="advanced-practice-title">Xưởng luyện tình huống</h2><span>{completed}/{exercises.length} bài đã hoàn thành · Kết quả luyện riêng với chứng chỉ</span></div><button onClick={close} aria-label="Đóng xưởng luyện">✕</button></header>
  <div className="advanced-practice-controls"><input aria-label="Tìm tình huống thực hành" placeholder="Tìm đèn cồn, ly tâm, bàn thực hành…" value={query} onChange={e=>setQuery(e.target.value)}/><div role="group" aria-label="Chế độ luyện"><button aria-pressed={mode==='guided'} onClick={()=>setMode('guided')}>Có hướng dẫn</button><button aria-pressed={mode==='independent'} onClick={()=>setMode('independent')}>Tự thực hành</button></div><p>{mode==='guided'?'Có khung đặt, điểm dẫn và vùng nhận diện dụng cụ.':'Ẩn gợi ý vị trí chính xác. Đọc nhãn, dùng các vùng làm việc; có thể xin gợi ý khi cần.'}</p></div>
  <div className="advanced-practice-grid">{visible.map(({id,work},i)=>{
   const record=records[id],draft=record?.draft,canResume=draft?.mode===mode;
   return <article key={id}><div className="advanced-practice-card-top"><span>BÀI {String(POST_PHASE_IDS.indexOf(id)+1).padStart(2,'0')}</span><span>{record?.best?'✓ Đã luyện':'Chưa luyện'}</span></div><h3>{work.title}</h3><p>{work.steps.length} bước · Quan sát vật thể và thao tác thực tế</p><ul>{work.steps.filter(s=>s.mode==='arrange'||s.mode==='trace').slice(0,2).map((s,i)=><li key={i}>{s.instruction}</li>)}</ul><div className="advanced-practice-record"><span>Tốt nhất: {record?.best?`${record.best.score}/100`:'—'}</span><span>Tự thực hành: {record?.independentBest?`${record.independentBest.score}/100`:'—'}</span><span>{record?.runs??0} lượt hoàn thành</span></div>
    {canResume&&<p className="advanced-practice-draft">Đang ở bước {Math.min(draft.progress.step+1,work.steps.length)}/{work.steps.length}</p>}
    {!!record?.history?.length&&<details className="advanced-practice-history"><summary>Lịch sử {record.history.length} lượt gần nhất</summary><ol>{[...record.history].reverse().map((row,i)=><li key={i}><span>{new Date(row.completedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</span> · {row.result.mode==='guided'?'Có hướng dẫn':'Tự thực hành'} · <strong>{row.result.score}/100</strong></li>)}</ol></details>}
    <div className="advanced-practice-card-actions"><button onClick={()=>useAdvancedPractice.getState().select(id,mode,!canResume)}>{canResume?'Tiếp tục bài đang luyện':'Bắt đầu thực hành'}</button>{canResume&&<button onClick={()=>useAdvancedPractice.getState().select(id,mode,true)}>Luyện lại từ đầu</button>}</div>
   </article>;
  })}{!visible.length&&<p className="p-5 text-sm text-slate-600">Không có tình huống phù hợp. Hãy thử tên dụng cụ hoặc nguy cơ khác.</p>}</div>
 </section></div>;
}
