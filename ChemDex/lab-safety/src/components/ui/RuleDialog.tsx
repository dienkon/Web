import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { vi } from '../../i18n/vi';
import { interactionBus, INTERACTION_PRIORITY } from '../../systems/input/InteractionBus';
import { useDialogFocus } from '../../academy/hooks/useDialogFocus';
import { useScenarioModal } from '../../scenarios/useScenarioModal';

export const RuleDialog: React.FC = () => {
 const rule = useStore(s => s.activeRuleDialog);
 return rule ? <RuleContent key={rule.id}/> : null;
};
function RuleContent(){
 const rule = useStore(s=>s.activeRuleDialog)!;
 const setRule=useStore(s=>s.setActiveRuleDialog);
 const [details,setDetails]=useState(false),id=useId(),ref=useRef<HTMLElement>(null);
 const close=useCallback(()=>setRule(null),[setRule]);
 useDialogFocus(ref,close);
 useScenarioModal(true);
 useEffect(()=>interactionBus.subscribe({priority:INTERACTION_PRIORITY.DIALOG,onInteract:close}),[close]);
 return <div data-ui className="lab-rule-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs">
  <section ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className="lab-rule-dialog white-glass-elevated rounded-3xl border border-slate-200 shadow-2xl">
   <header className="lab-rule-header"><div><span className="text-xs font-bold text-teal-700">QUY TẮC #{rule.id}</span><h2 id={id}>{rule.title}</h2></div><button onClick={close} aria-label="Đóng quy tắc">✕</button></header>
   <div className="lab-rule-content" key={String(details)}>
    <Badge level={rule.dangerLevel}/>
    {!details ? <p>{rule.description}</p> : <div className="space-y-4">
     {rule.why&&<div className="rounded-xl bg-cyan-50 p-3"><strong>{vi.ruleCard.why}</strong><p>{rule.why}</p></div>}
     {rule.correct&&<div className="rounded-xl bg-emerald-50 p-3"><strong>✓ {vi.ruleCard.correct}</strong><p>{rule.correct}</p></div>}
     {rule.wrong&&<div className="rounded-xl bg-rose-50 p-3"><strong>✕ {vi.ruleCard.wrong}</strong><p>{rule.wrong}</p></div>}
     {rule.consequence&&<div className="rounded-xl bg-amber-50 p-3"><strong>{vi.ruleCard.consequence}</strong><p>{rule.consequence}</p></div>}
    </div>}
   </div>
   <footer className="lab-rule-footer"><Button variant="secondary" onClick={()=>setDetails(v=>!v)}>{details?'Mặt trước':'Lật xem chi tiết'}</Button><Button onClick={close}>{vi.ruleCard.understood}</Button></footer>
  </section>
 </div>;
}
