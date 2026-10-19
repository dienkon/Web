import React, { useId, useRef } from 'react';
import { useScenarioModal } from '../../scenarios/useScenarioModal';
import { useDialogFocus } from '../../academy/hooks/useDialogFocus';
export function ConfirmPopup({title,message,onClose,onConfirm}:{title:string;message:string;onClose:()=>void;onConfirm:()=>void}) {
 const ref=useRef<HTMLElement>(null),id=useId();
 useScenarioModal(true);useDialogFocus(ref,onClose);
 return <div className="practical-backdrop" data-ui><section ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className="lab-popup w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-slate-800"><h2 id={id} className="text-xl font-bold">{title}</h2><p className="my-4 text-sm leading-6">{message}</p><div className="flex flex-wrap justify-end gap-3"><button className="rounded-xl border px-4 py-2" onClick={onClose}>Giữ tiến trình</button><button className="rounded-xl bg-cyan-700 text-white px-4 py-2" onClick={onConfirm}>Bắt đầu lượt mới</button></div></section></div>;
}
