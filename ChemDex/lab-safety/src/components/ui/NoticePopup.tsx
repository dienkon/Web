import React, { useId, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useScenarioModal } from '../../scenarios/useScenarioModal';
import { useDialogFocus } from '../../academy/hooks/useDialogFocus';
export function NoticePopup(){
 const notice=useStore(s=>s.activeErrorBanner);
 if(!notice)return null;
 return <NoticeContent title={notice.title} message={notice.consequence}/>;
}
function NoticeContent({title,message}:{title:string;message:string}){
 const ref=useRef<HTMLElement>(null),id=useId();
 const close=()=>useStore.getState().dismissErrorBanner();
 useScenarioModal(true);useDialogFocus(ref,close);
 return <div className="practical-backdrop" data-ui style={{zIndex:2600}}><section ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className="lab-popup w-full max-w-lg rounded-2xl bg-white border border-amber-200 p-6 shadow-xl text-slate-800"><p className="text-xs font-bold text-amber-700">PHẢN HỒI THAO TÁC</p><h2 id={id} className="text-xl font-bold mt-2">{title}</h2><p className="text-sm leading-6 my-4">{message}</p><button className="rounded-xl bg-cyan-700 text-white px-5 py-3 font-bold" onClick={close}>Đã hiểu · tiếp tục</button></section></div>;
}
