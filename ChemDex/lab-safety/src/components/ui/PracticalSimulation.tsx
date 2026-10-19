import React, { useEffect, useId, useRef, useState } from 'react';
import type { Model, Point, PracticalWork } from '../../data/practicalWork';
import { useScenarioModal } from '../../scenarios/useScenarioModal';
import { useDialogFocus } from '../../academy/hooks/useDialogFocus';
import { soundManager } from '../../audio/soundManager';
import './practical.css';
import { pathLength, pointAlong, traceStroke } from '../../core/simulation/GestureProgress';
import { StirringSurface } from './StirringSurface';
import { placementAt, practicalScore, type PracticalResult } from '../../core/simulation/PracticalEvaluation';

/** Code-native models share physical proportions and remain sharp on mobile. */
function ModelDrawing({ model, color = '#67c9d8', active = false, value = 0 }: { model: Model; color?: string; active?: boolean; value?: number }) {
 const metal = '#a9bdcb';
 switch(model) {
  case 'shield': return <><rect x="-67" y="-59" width="134" height="110" rx="7" fill="#bde4ee" fillOpacity=".35" stroke="#6d98ac" strokeWidth="5"/><path d="M-49-43-9-51M24-51 48-54" stroke="white" strokeWidth="6" opacity=".8"/><path d="M-55 51V67H-80M55 51V67H80" fill="none" stroke="#65879b" strokeWidth="8"/></>;
  case 'magnifier': return <><path d="M23 23 57 57" stroke="#405f76" strokeWidth="15"/><circle r="35" fill="#c0e9f2" fillOpacity=".5" stroke="#658a9f" strokeWidth="7"/><path d="M-23-4Q-18-23 4-24" stroke="white" strokeWidth="5" fill="none"/><path d="M-10 1H10M0-9V11" stroke="#6c9fb2" strokeWidth="2"/></>;
  case 'tongs': return <><path d="M-13-53 4 5-28 56M13-53-4 5 28 56" fill="none" stroke="#728da0" strokeWidth="7"/><path d="M-28 56-39 47M28 56 39 47" stroke="#405c70" strokeWidth="12"/><circle cy="5" r="7" fill="#bdced8" stroke="#668599" strokeWidth="2"/><path d="M-13-53-24-64M13-53 24-64" stroke="#ac8067" strokeWidth="10"/></>;
  case 'vacuumFlask': return <><path d="M-14-62H14V-24L46 42Q48 55 32 57H-32Q-48 55-46 42L-14-24Z" fill="#c8e7ed" stroke="#557d91" strokeWidth="5"/><path d="M18-14H50V-31" fill="none" stroke="#6b9caf" strokeWidth="8"/><path d="M-32 23H32L39 45H-39Z" fill="#70b2c8" opacity=".55"/><path d="M-9-53H9V-64H-9Z" fill="#9b7e67"/><path d="M-29 34-12-17" stroke="white" strokeWidth="5" opacity=".7"/></>;
  case 'cone': return <><path d="M-37 33H37L43 45H-43Z" fill="#a56f37"/><path d="M0-48 29 34H-29Z" fill="#edab48" stroke="#b47d32" strokeWidth="2"/><path d="M-9-21H9L15-4H-15ZM-21 13H21L26 28H-26Z" fill="#fff7e5"/></>;
  case 'shard': return <><path d="M-17 17-9-23 24 9 8 24Z" fill="#b9e6f2" stroke="#507f95" strokeWidth="2"/><path d="M-7-14 12 7-8 11Z" fill="#effaff"/><path d="M-17 17 8 24 1 9" fill="#85bfd6" opacity=".6"/></>;
  case 'paper': return <><path d="M-25-21 8-28 29-5 17 26-12 30-29 3Z" fill="#f8f7f0" stroke="#9caaa9" strokeWidth="2"/><path d="M-25-21-3-2 8-28M-3-2 17 26M-29 3-3-2 29-5M-12 30-3-2" fill="none" stroke="#d1d8d4" strokeWidth="2"/></>;
  case 'absorbent': return <><path d="M-28-19 14-27 29-4 19 26-23 29-32 4Z" fill="#d9c66b" stroke="#a08d40" strokeWidth="2"/><ellipse rx="18" ry="12" fill="#9aa25b" opacity=".6"/>{[-14,0,14].map(x=><path key={x} d={`M${x}-15v33`} stroke="#eeeba7" strokeWidth="2" opacity=".5"/>)}</>;
  case 'balance': return <><rect x="-90" y="-65" width="180" height="138" rx="15" fill="#c8d9e4" stroke="#5c7789" strokeWidth="4"/><path d="M-78-48H78V24H-78Z" fill="#e7f8fc" fillOpacity=".6" stroke="#8ba9b9" strokeWidth="3"/><ellipse cy="-12" rx="45" ry="26" fill="#849aa9"/><ellipse cy="-17" rx="45" ry="26" fill="#e8f0f4" stroke="#8ba4b5" strokeWidth="2"/><rect x="-66" y="39" width="104" height="23" rx="3" fill="#254e4f"/><text x="-15" y="55" fontSize="13" fill="#94f7c0" textAnchor="middle">{(value/10).toFixed(2)} g</text><circle cx="61" cy="49" r="9" fill="#459d9c"/></>;
  case 'cylinder': case 'burette': return <><path d="M-20-95H20V75Q0 92-20 75Z" fill="#d9f2f8" stroke="#658b9f" strokeWidth="3"/><path d={`M-16 ${73-value*1.6}H16V72Q0 87-16 72Z`} fill="#69c4e2" opacity=".8"/>{Array.from({length:9},(_,i)=><g key={i}><path d={`M3 ${65-i*18}h14`} stroke="#507b90" strokeWidth="2"/><text x="-10" y={68-i*18} fontSize="8" fill="#3c667a">{i*5}</text></g>)}{model==='cylinder'?<ellipse cy="91" rx="43" ry="12" fill="#afcedc" stroke="#678b9d" strokeWidth="2"/>:<><path d="M0 80v35" stroke="#66899a" strokeWidth="6"/><path d="M-19 87h38" stroke="#b94d50" strokeWidth="8"/></>}</>;
  case 'electrode': return <><rect x="-11" y="-72" width="22" height="108" rx="5" fill="#5f8ca6" stroke="#32536b" strokeWidth="2"/><path d="M-7 36H7V70Q0 85-7 70Z" fill="#c7eaf2" stroke="#688b9f" strokeWidth="2"/><path d="M0-72Q-40-110-66-60" fill="none" stroke="#334b5f" strokeWidth="5"/><circle cy="64" r="4" fill="#9a7fad"/></>;
  case 'thermometer': return <><rect x="-10" y="-75" width="20" height="125" rx="10" fill="#eff8fa" stroke="#5e879c" strokeWidth="3"/><circle cy="52" r="18" fill="#e06c6a"/><path d={`M0 50V${40-value}`} stroke="#e06c6a" strokeWidth="8"/>{[-55,-35,-15,5,25].map(y=><path key={y} d={`M4 ${y}h10`} stroke="#4d6f82"/>)}</>;
  case 'hood': return <><rect x="-115" y="-78" width="230" height="155" rx="9" fill="#b9ccd7" stroke="#5c7689" strokeWidth="4"/><rect x="-98" y="-55" width="196" height="107" fill="#355467"/>{[-70,-35,0,35,70].map(x=><path key={x} d={`M${x}-40v75`} stroke="#93bbca" strokeWidth="5"/>)}<rect x="-98" y="-55" width="196" height={Math.max(15,90-value*.6)} fill="#c9edf3" fillOpacity=".5" stroke="#608d9e" strokeWidth="3"/><path d="M-115 65H115" stroke="#e1ebf0" strokeWidth="12"/><circle cx="94" cy="-67" r="5" fill={active?'#43d3a4':'#bd7267'}/></>;
  case 'sink': return <><rect x="-100" y="-63" width="200" height="140" rx="19" fill="#c2d1db" stroke="#718c9e" strokeWidth="4"/><rect x="-83" y="-47" width="166" height="109" rx="25" fill="#86a4b5"/><circle cy="20" r="12" fill="#4f6c81"/><path d="M0-90V-35Q0-15 20-15H33" fill="none" stroke="#e7eff4" strokeWidth="12"/><path d="M30-10V33" stroke="#79d7ed" strokeWidth="7" strokeDasharray="5 3"/></>;
  case 'locker': case 'drawer': return <><rect x="-88" y="-75" width="176" height="150" rx="8" fill="#abbfcd" stroke="#5e7c90" strokeWidth="4"/><rect x="-78" y={-65+value*.5} width="156" height="125" rx="4" fill="#d9e5ec" stroke="#7694a7" strokeWidth="3"/><rect x="-27" y={-14+value*.5} width="54" height="10" rx="4" fill="#62869c"/>{[-49,-37,-25].map(y=><path key={y} d={`M-52 ${y+value*.5}H52`} stroke="#9cb7c7" strokeWidth="3"/>)}</>;
  case 'chair': return <><path d="M0 0V65M0 50-52 75M0 50 52 75M0 50-52 25M0 50 52 25" stroke="#7f9cad" strokeWidth="9"/><ellipse rx="58" ry="37" fill="#3f596d" stroke="#263f53" strokeWidth="4"/><ellipse cy="-5" rx="51" ry="30" fill="#5e8095"/></>;
  case 'door': return <><rect x="-65" y="-90" width="130" height="180" fill="#b8cedb" stroke="#627f93" strokeWidth="7"/><rect x="-52" y="-78" width="104" height="160" fill="#e3f0f4"/><rect x="-36" y="-65" width="72" height="45" fill="#73b7a1"/><path d="M-20-43H20M8-54 20-43 8-32" fill="none" stroke="white" strokeWidth="5"/><path d="M30 6H43V26" fill="none" stroke="#557b93" strokeWidth="6"/></>;
  case 'shower': return <><path d="M-55 90V-90H12Q45-90 45-60" fill="none" stroke="#bacbd7" strokeWidth="13"/><path d="M18-50Q45-80 72-50Z" fill="#7298ad"/><path d="M22-35V50M45-35V70M68-35V50" stroke="#7ac7de" strokeWidth="5" strokeDasharray="10 8"/><path d="M-40-60H-15V30" stroke="#b7a465" fill="none" strokeWidth="5"/><path d="M-28 35H-2" stroke="#cbaa58" strokeWidth="7"/></>;
  case 'blanket': return <><rect x="-65" y="-65" width="130" height="120" rx="9" fill="#bb514e" stroke="#8a363b" strokeWidth="3"/><rect x="-46" y="-48" width="92" height="75" rx="4" fill="#fff2db"/><path d="M-30-28H30M-30-12H30M-30 4H16" stroke="#b55653" strokeWidth="6"/><path d="M-25 44v60M25 44v60" stroke="#292e36" strokeWidth="13"/></>;
  case 'clock': return <><circle r="78" fill="#edf4f7" stroke="#7392a6" strokeWidth="7"/>{Array.from({length:12},(_,i)=><path key={i} d="M0-66V-57" stroke="#567588" strokeWidth="4" transform={`rotate(${i*30})`}/>)}<path d="M0 0V-40M0 0 26 18" stroke="#344e64" strokeWidth="6"/><path d="M0 0V-58" stroke="#df7865" strokeWidth="2" transform={`rotate(${value*3.6})`}/><circle r="6" fill="#df7865"/></>;
  case 'soap': return <><rect x="-28" y="-25" width="56" height="75" rx="12" fill="#b6ddd7" stroke="#60998e" strokeWidth="3"/><path d="M0-25V-50H35V-38" stroke="#7c98a7" strokeWidth="9" fill="none"/><rect x="-20" y="-2" width="40" height="29" rx="5" fill="#f1faf7"/><path d="M-8 12H8M0 4V20" stroke="#61a89b" strokeWidth="4"/></>;
  case 'hotplate': return <><rect x="-75" y="-55" width="150" height="120" rx="12" fill="#c7d8e2" stroke="#617c90" strokeWidth="4"/><ellipse cy="-10" rx="55" ry="37" fill="#465c70" stroke="#899daa" strokeWidth="4"/><circle cx="-38" cy="45" r="12" fill="#577c92"/><circle cx="38" cy="45" r="12" fill="#577c92"/></>;
  case 'bottle': return <><rect x="-24" y="-32" width="48" height="71" rx="12" fill={color} stroke="#285265" strokeWidth="3"/><rect x="-13" y="-52" width="26" height="24" rx="4" fill="#334155"/><path d="M-16-23V23" stroke="white" opacity=".5" strokeWidth="5"/><rect x="-20" y="-5" width="40" height="28" rx="3" fill="#fff9e8"/><path d="M0 0 9 9 0 18-9 9Z" fill="white" stroke="#d64747" strokeWidth="2"/></>;
  case 'glass': return <><path d="M-30-40H23L34-32 27-24V38H-28Z" fill="#bce4ee" fillOpacity=".65" stroke="#56849a" strokeWidth="3"/><path d="M-25 8H24V34H-25Z" fill={color} opacity=".6"/>{[-20,-8,4,16,28].map(y=><path key={y} d={`M10 ${y}h12`} stroke="#385d71" strokeWidth="2"/>)}<path d="M-17-30V25" stroke="white" strokeWidth="4"/></>;
  case 'bag': return <><rect x="-31" y="-35" width="62" height="74" rx="16" fill={color} stroke="#355367" strokeWidth="3"/><path d="M-14-35V-48H14V-35M-29-5H29M-20 9H20V29H-20Z" fill="none" stroke="#355367" strokeWidth="4"/></>;
  case 'cable': return <><path d="M-44 12C-52-40 17-43 22-4S-15 33 47 24" fill="none" stroke="#334155" strokeWidth="12"/><path d="M-44 12C-52-40 17-43 22-4S-15 33 47 24" fill="none" stroke={color} strokeWidth="7"/><rect x="38" y="16" width="17" height="16" rx="3" fill={metal}/></>;
  case 'tray': return <><rect x="-59" y="-40" width="118" height="80" rx="12" fill={metal} stroke="#647c8e" strokeWidth="4"/><rect x="-49" y="-30" width="98" height="60" rx="7" fill="#e8eff3" stroke="white" strokeWidth="2"/></>;
  case 'brush': return <><rect x="-5" y="-62" width="10" height="76" rx="4" fill="#ac7955"/><rect x="-36" y="8" width="72" height="14" rx="4" fill="#d3a868"/>{Array.from({length:14},(_,i)=><path key={i} d={`M${-32+i*5} 22v27`} stroke="#82633c" strokeWidth="3"/>)}</>;
  case 'pan': return <><path d="M-47-16H47L55 37H-55Z" fill="#82a5b9" stroke="#385569" strokeWidth="4"/><path d="M-45-10H45L49 30H-49Z" fill="#b6d0db"/><rect x="-6" y="-58" width="12" height="45" rx="5" fill="#334155"/></>;
  case 'arm': return <><path d="M-170-34Q-140-48-90-35L98-30Q126-50 160-28L177-5Q182 28 146 37L100 30-100 37Q-152 48-170 29Z" fill="#e7b395" stroke="#a87562" strokeWidth="3"/><path d="M-35-10 0 5-25 18" fill="none" stroke="#be5358" strokeWidth="5"/><path d="M110-18 153-12M110-5 161 0M110 8 153 14" stroke="#c48c71" strokeWidth="2"/></>;
  case 'gauze': return <><rect x="-34" y="-32" width="68" height="64" rx="6" fill="#fff" stroke="#9aafba" strokeWidth="2"/>{[-24,-12,0,12,24].map(v=><path key={v} d={`M${v}-28V28M-30 ${v}H30`} stroke="#d7e2e8" strokeWidth="2"/>)}</>;
  case 'bandage': return <><path d="M-20 25H-65V-8H-20" fill="#fff7e8" stroke="#cbbd9f" strokeWidth="2"/><ellipse rx="30" ry="37" fill="#e9dcc2" stroke="#b5a587" strokeWidth="3"/><ellipse rx="18" ry="25" fill="#fff9ed" stroke="#c5b797" strokeWidth="3"/><ellipse rx="6" ry="11" fill="#697d8d"/></>;
  case 'burner': return <><ellipse cy="24" rx="47" ry="33" fill="#91c4d0" stroke="#436a7a" strokeWidth="3"/><ellipse cy="15" rx="33" ry="23" fill="#d2edf1"/><rect x="-13" y="-18" width="26" height="40" rx="5" fill={metal}/><path d="M-7-21H7V-36H-7" fill="#ae9671"/>{active&&<><path d="M0-88C25-57 21-33 0-30-23-38-15-58 0-88" fill="#ffb132"/><path d="M0-66C12-46 9-36 0-32-9-39-8-48 0-66" fill="#71cfff"/></>}</>;
  case 'cap': return <><ellipse cy="18" rx="36" ry="24" fill="#65788a"/><path d="M-36 17V-14Q0-44 36-14V17Q0 43-36 17" fill={metal} stroke="#5c7183" strokeWidth="3"/><ellipse cy="-13" rx="35" ry="19" fill="#d4e1e8"/><path d="M-21-13H21" stroke="white" strokeWidth="4"/></>;
  case 'valve': return <><circle r="33" fill="#52697b"/><circle r="25" fill={active?'#37b6ab':'#d97862'}/><path d="M0-28V28M-28 0H28" stroke="#e3edf1" strokeWidth="10"/><circle r="9" fill={metal}/></>;
  case 'switch': return <><rect x="-34" y="-42" width="68" height="84" rx="9" fill="#c8d6df" stroke="#657c8e" strokeWidth="3"/><rect x="-19" y="-28" width="38" height="56" rx="5" fill={active?'#31b797':'#dd7864'}/><path d={active?'M-14-20H14':'M-14 18H14'} stroke="white" strokeWidth="5"/><circle cx="25" cy="-33" r="3" fill="#667e8d"/></>;
  case 'goggles': return <><path d="M-57-15Q0-48 57-15V20H12L0 10-12 20H-57Z" fill="#a1dce9" fillOpacity=".8" stroke="#3d6f89" strokeWidth="6"/><path d="M-45-12  -20-20M20-20 43-12" stroke="white" strokeWidth="5"/><path d="M-57-8H-72M57-8H72" stroke="#536779" strokeWidth="8"/></>;
  case 'glove': return <path d="M-23 39-30 9-45-9Q-48-21-36-18L-22-6-24-43Q-21-55-15-43L-10-17-8-50Q-1-59 3-48L7-16 12-45Q20-53 23-40L25-11 32-30Q43-35 43-23L34 18 18 39Z" fill={color} stroke="#487b91" strokeWidth="3"/>;
  case 'pipette': return <><path d="M-7-61H7V35L0 66-7 35Z" fill="#d4edf4" stroke="#4d7b92" strokeWidth="2"/>{[-40,-20,0,20].map(y=><path key={y} d={`M-5 ${y}h8`} stroke="#4b7387"/>)}</>;
  case 'bulb': return <><ellipse cy="-10" rx="27" ry="36" fill="#db706a" stroke="#974c50" strokeWidth="3"/><rect x="-8" y="20" width="16" height="25" rx="3" fill="#db706a"/></>;
  case 'tube': return <><path d="M-13-42H13V30Q0 54-13 30Z" fill="#c2e3ef" stroke="#5c8d9f" strokeWidth="2"/><path d="M-10 0H10V29Q0 46-10 29Z" fill={color}/><rect x="-15" y="-45" width="30" height="10" rx="3" fill="#7c699e"/></>;
  case 'rotor': return <><circle r="105" fill="#9dafbd" stroke="#425a70" strokeWidth="8"/>{[0,90,180,270].map(a=><ellipse key={a} cy="-80" rx="19" ry="25" fill="#334b60" transform={`rotate(${a})`}/>)}<circle r="30" fill="#dce6ec"/><circle r="8" fill="#60788a"/></>;
  case 'bin': return <><rect x="-42" y="-35" width="84" height="83" rx="8" fill={color} stroke="#506376" strokeWidth="3"/><rect x="-47" y="-44" width="94" height="17" rx="5" fill="#455d6f"/><rect x="-26" y="-15" width="52" height="38" rx="4" fill="white"/><path d="M0-9 17 15H-17Z" fill="none" stroke="#5d6670" strokeWidth="3"/></>;
  case 'person': return <><circle cy="-20" r="23" fill="#e5b798"/><path d="M-36 44V20Q0-5 36 20V44" fill="#edf4f7" stroke="#6e8a9c" strokeWidth="3"/><path d="M0 7V43" stroke="#7e98a6"/><circle cx="-7" cy="-22" r="2" fill="#334155"/><circle cx="7" cy="-22" r="2" fill="#334155"/></>;
  case 'water': return <><ellipse rx="57" ry="34" fill="#6bcde2" opacity=".65"/><path d="M-40 0Q-25-16-10 0T20 0T45 0M-25 15Q0 0 25 15" fill="none" stroke="#d8f9ff" strokeWidth="3"/></>;
  case 'extinguisher': return <><rect x="-29" y="-33" width="58" height="96" rx="20" fill="#d95350" stroke="#922e35" strokeWidth="3"/><rect x="-17" y="-54" width="34" height="25" fill={metal}/><path d="M-22-58H27M27-42Q65-35 50 43" fill="none" stroke="#344b5d" strokeWidth="9"/><rect x="-23" y="-3" width="46" height="39" fill="#fff7e5"/><path d="M-15 8H15M-15 18H15" stroke="#486174" strokeWidth="3"/></>;
  default: return <><rect x="-42" y="-25" width="84" height="50" rx="5" fill="#fff2b9" stroke="#b99a4c" strokeWidth="3"/><path d="M-28-10H28M-28 0H28M-28 10H15" stroke="#8c7745" strokeWidth="3"/></>;
 }
}

export interface PracticalProgress { step:number; inspected:number[]; placed:string[]; mistakes:number; hints:number; revealed?:boolean; traceDistance?:number }
export function PracticalSimulation({ work, onClose, onComplete, initialStep = 0, onStep, blockedReason, mode='guided', initialProgress, onProgress }: {
 work: PracticalWork; onClose:()=>void; onComplete:(result?:PracticalResult)=>void; initialStep?:number; onStep?:(step:number)=>void; blockedReason?:string;
 mode?:'guided'|'independent'; initialProgress?:PracticalProgress; onProgress?:(progress:PracticalProgress)=>void;
}) {
 useScenarioModal(true);
 const dialog = useRef<HTMLElement>(null);
 useDialogFocus(dialog, onClose);
 const titleId = useId();
 const svg = useRef<SVGSVGElement>(null);
 const [index,setIndex] = useState(Math.max(0,Math.min(initialProgress?.step??initialStep,work.steps.length)));
 const [moving,setMoving] = useState<Point|null>(null);
 const [progress,setProgress] = useState(0);
 const [traceSaved,setTraceSaved]=useState(initialProgress?.traceDistance??0);
 const traceDistance=useRef(initialProgress?.traceDistance??0);
 const [value,setValue] = useState(100);
 const [adjusted,setAdjusted] = useState(false);
 const [message,setMessage] = useState('');
 const [inspected,setInspected]=useState<number[]>(initialProgress?.inspected??[]);
 const [placed,setPlaced]=useState<string[]>(initialProgress?.placed??[]);
 const [expanded,setExpanded]=useState(false);
 const [restart,setRestart]=useState(0);
 const [inspection,setInspection]=useState<number|null>(null);
 const [mistakes,setMistakes]=useState(initialProgress?.mistakes??0);
 const [hints,setHints]=useState(initialProgress?.hints??0);
 const [hintVisible,setHintVisible]=useState(initialProgress?.revealed??false);
 const previousIndex=useRef(index);
 const showGuide=mode==='guided'||hintVisible;
 const fail=(feedback:string)=>{setMessage(feedback);setMistakes(n=>n+1);soundManager.play('error');};

 const gesture = useRef<{pointer:number; next:number; started:number; origin:Point; last:Point; object:string; distance?:number; traceStarted?:boolean; tolerance?:number} | null>(null);
 const timer = useRef<ReturnType<typeof setInterval>|null>(null);
 const advancing = useRef(false);
 const finishing = useRef(false);
 const step = work.steps[index];
 const done = !step;
 const positions: Record<string,Point> = Object.fromEntries(work.objects.map(obj=>[obj.id,obj.at]));
 work.steps.slice(0,index).forEach(s=>{ if(s.mode==='drag') positions[s.object]=s.target; if(s.mode==='trace'&&s.path)positions[s.object]=s.path[s.path.length-1]; if(s.mode==='stir')positions[s.object]=s.target; if(s.mode==='arrange')s.placements?.forEach(p=>positions[p.object]=p.target); });
 if(step?.mode==='arrange')step.placements?.forEach(p=>{if(placed.includes(p.object))positions[p.object]=p.target;});
 work.objects.forEach(obj=>{if(obj.follow&&index>=obj.follow.fromStep){const parent=gesture.current?.object===obj.follow.object&&moving?moving:positions[obj.follow.object];positions[obj.id]=[parent[0]+obj.follow.offset[0],parent[1]+obj.follow.offset[1]];}});
 if(step?.mode==='trace'&&step.path&&traceDistance.current>0)positions[step.object]=pointAlong(step.path,traceDistance.current);
 const stopTimer = () => {if(timer.current)clearInterval(timer.current);timer.current=null;};
 const resetGesture = () => {gesture.current=null;stopTimer();setMoving(null);setProgress(0);};
 const pauseTrace=()=>{gesture.current=null;setMoving(null);setTraceSaved(traceDistance.current);if(step?.path)setProgress(traceDistance.current/pathLength(step.path));};
 useEffect(()=>()=>stopTimer(),[]);
 useEffect(()=>{
  advancing.current=false;setValue(step?.value===0?100:0);setAdjusted(false);setMessage('');setInspection(null);resetGesture();
  if(previousIndex.current!==index){previousIndex.current=index;setInspected([]);setPlaced([]);setHintVisible(false);traceDistance.current=0;setTraceSaved(0);}
 },[index]);
 useEffect(()=>{onProgress?.({step:index,inspected,placed,mistakes,hints,revealed:hintVisible,traceDistance:traceSaved});},[index,inspected,placed,mistakes,hints,hintVisible,traceSaved]);
 useEffect(()=>{
  const end=()=>{if(gesture.current&&step?.mode==='trace')pauseTrace();else if(gesture.current||timer.current)resetGesture();};
  const holdMove=(e:PointerEvent)=>{
   if(!gesture.current||step?.mode!=='hold')return;
   const matrix=svg.current?.getScreenCTM();if(!matrix)return;
   const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
   if(Math.hypot(p.x-step.target[0],p.y-step.target[1])>50)resetGesture();
  };
  const visible=()=>{if(document.hidden)end();};document.addEventListener('visibilitychange',visible);
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);window.addEventListener('blur',end);window.addEventListener('pointermove',holdMove);
  return()=>{document.removeEventListener('visibilitychange',visible);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);window.removeEventListener('blur',end);window.removeEventListener('pointermove',holdMove);};
 },[step]);
 const advance = () => {
  if(advancing.current || !step || blockedReason)return;
  advancing.current=true; stopTimer(); gesture.current=null; setMoving(null);
  soundManager.play('snap'); if(index+1>=work.steps.length||['inspect','adjust','hold'].includes(work.steps[index+1]?.mode))setExpanded(false);onStep?.(index+1); setIndex(index+1);
 };
 const point = (e: React.PointerEvent): Point => {
  const matrix=svg.current?.getScreenCTM();
  if(!matrix)return [0,0];
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());return [p.x,p.y];
 };
 const near=(a:Point,b:Point,r=42)=>Math.hypot(a[0]-b[0],a[1]-b[1])<=r;
 const beginHold=()=>{
  if(!step || step.mode!=='hold' || timer.current || blockedReason)return;
  const started=performance.now();
  timer.current=setInterval(()=>{const p=Math.min(1,(performance.now()-started)/((step.seconds??2)*1000));setProgress(p);if(p>=1)advance();},40);
 };
 const down=(e:React.PointerEvent<SVGSVGElement>)=>{
  if(!step||step.mode==='adjust'||step.mode==='stir'||e.button!==0||gesture.current||blockedReason||inspection!==null)return;
  if(step.mode==='inspect'){
   const location=point(e),checks=step.inspections??[];
   const found=checks.findIndex((check,i)=>!inspected.includes(i)&&near(location,positions[check.object],65));
   if(found>=0)setInspection(found);else setMessage('Chọn vật cần kiểm tra hoặc dùng các thẻ quan sát bên dưới.');return;
  }
  if(step.mode==='arrange'){
   const location=point(e),candidates=step.placements??[];
   const picked=candidates.filter(p=>near(location,positions[p.object],60)).sort((a,b)=>Math.hypot(location[0]-positions[a.object][0],location[1]-positions[a.object][1])-Math.hypot(location[0]-positions[b.object][0],location[1]-positions[b.object][1]))[0];
   if(!picked){setMessage('Nắm từng vật thể cần sắp vào khu vực có nhãn.');return;}
   setPlaced(v=>v.filter(id=>id!==picked.object));e.currentTarget.setPointerCapture(e.pointerId);gesture.current={pointer:e.pointerId,next:0,started:performance.now(),origin:location,last:location,object:picked.object};setMoving(positions[picked.object]);return;
  }
  const p=point(e),origin=step.mode==='trace'?pointAlong(step.path!,traceDistance.current):step.mode==='hold'?step.target:positions[step.object];
  const scale=Math.abs(svg.current?.getScreenCTM()?.a??1);
  const tolerance=Math.max(36,Math.min(72,(e.pointerType==='touch'?26:19)/scale));
  const grabTool=step.mode==='trace'&&near(p,positions[step.object],Math.max(65,tolerance));
  if(!near(p,origin,step.mode==='drag'?Math.max(65,tolerance):Math.max(46,tolerance))&&!grabTool){setMessage('Nắm dụng cụ hoặc chạm vào đầu đoạn đang sáng để tiếp tục.');return;}
  e.currentTarget.setPointerCapture(e.pointerId);gesture.current={pointer:e.pointerId,next:0,started:performance.now(),origin:p,last:near(p,origin,tolerance)?origin:p,object:step.object,distance:traceDistance.current,traceStarted:step.mode==='trace'&&(traceDistance.current>0||near(p,origin,tolerance)),tolerance};
  if(step.mode==='hold')beginHold(); else setMoving(p);
 };
 const move=(e:React.PointerEvent<SVGSVGElement>)=>{
  const g=gesture.current;if(!g||!step||g.pointer!==e.pointerId)return;
  const p=point(e); if(step.mode==='hold'){if(!near(p,step.target,50)){resetGesture();setMessage('Giữ con trỏ trong vùng kiểm tra để thao tác liên tục.');}return;}
  setMoving([Math.max(55,Math.min(845,p[0])),Math.max(60,Math.min(425,p[1]))]);
  if(step.mode==='trace'&&step.path){
   if(!g.traceStarted){if(near(p,step.path[0],g.tolerance)){g.traceStarted=true;g.last=step.path[0];}return;}
   const next=traceStroke(step.path,traceDistance.current,g.last,p,g.tolerance);
   traceDistance.current=next.distance;setProgress(next.distance/pathLength(step.path));
   const grip=pointAlong(step.path,next.distance);g.last=grip;setMoving(grip);
   if(next.offPath)setMessage('Đã giữ đoạn bạn vừa làm. Đưa tay về đầu đoạn sáng để tiếp tục, không cần làm lại.');else setMessage('');
   if(next.complete)advance();
  }

 };
 const up=(e:React.PointerEvent<SVGSVGElement>)=>{
  const g=gesture.current;if(!g||g.pointer!==e.pointerId||!step)return;
  if(step.mode==='trace'){pauseTrace();setMessage('Đã giữ tiến độ. Nắm dụng cụ ở đầu đoạn sáng để tiếp tục.');return;}
  if(step.mode==='arrange'){
   const target=placementAt(point(e),step.placements??[]);
   if(target?.object===g.object){
    const next=[...new Set([...placed,g.object])];setPlaced(next);soundManager.play('snap');resetGesture();
    if(next.length===step.placements!.length)advance();else setMessage(`Đã đặt ${next.length}/${step.placements!.length} vật. Tiếp tục với món còn lại.`);
   }else{resetGesture();fail(target?'Vật này chưa phù hợp với khu vực vừa chọn. Đọc lại nhãn của vật và vị trí chứa.':'Chưa đặt trọn vào vùng chứa. Vật đã được trả về vị trí trước khi kéo.');}return;
  }
  if(step.mode==='drag'&&near(point(e),step.target,48)&&Math.hypot(point(e)[0]-g.origin[0],point(e)[1]-g.origin[1])>20)advance();
  else {if(step.mode==='hold')setMessage('Giữ liên tục đến khi vòng tiến độ đầy.');else fail('Chưa tới đích. Vật đã được trả về vị trí cũ, hãy kiểm tra vùng đặt và thử lại.');resetGesture();}
 };
 return <div className="practical-backdrop" data-ui data-practical-simulation>
  <section className="practical-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialog}>
   <header><div><p>THỰC HÀNH MÔ PHỎNG · GÓC NHÌN TỪ TRÊN</p><h2 id={titleId}>{work.title}</h2></div><div className="practical-header-actions">{!done&&<button type="button" className="practical-expand" aria-pressed={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'Hiện hướng dẫn':'Phóng vùng chơi'}</button>}<button type="button" onClick={onClose} aria-label="Đóng thực hành">✕</button></div></header>
   <div className="practical-session-meta"><span>{mode==='guided'?'Luyện có hướng dẫn':'Tự thực hành'}</span><span>Thao tác cần sửa: {mistakes} · Gợi ý: {hints}</span></div>
   <div className="practical-progress" aria-label="Tiến độ" role="progressbar" aria-valuenow={index} aria-valuemin={0} aria-valuemax={work.steps.length}>{work.steps.map((_,i)=><span key={i} className={i<index?'done':i===index?'current':''}/>)}</div>
   <div className={`practical-body ${expanded?'is-expanded':''}`}>

   <div className={`practical-scene ${step?.mode==='stir'?'practical-stir-scene':''}`}>
    {step?.mode==='stir'?<StirringSurface key={`${index}-${restart}`} turns={step.turns??1} disabled={!!blockedReason} onProgress={setProgress} onComplete={advance}/>:<svg ref={svg} viewBox="0 0 900 480" role="img" aria-label={`Bàn mô phỏng: ${work.title}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{if(step?.mode==='trace')pauseTrace();else resetGesture();}}>
     <defs><pattern id={titleId+'grid'} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#45616d" strokeOpacity=".15"/></pattern><filter id={titleId+'shadow'} x="-80%" y="-80%" width="260%" height="260%"><feDropShadow dx="0" dy="6" stdDeviation="5" floodOpacity=".16"/></filter></defs>
     <rect x="8" y="8" width="884" height="464" rx="22" fill={work.surface==='medical'?'#e0efef':work.surface==='floor'?'#d7e1df':'#dce7ea'} stroke="#8ba4ae" strokeWidth="4"/>
     <rect x="20" y="20" width="860" height="440" rx="15" fill={`url(#${titleId}grid)`}/>
     {work.title.includes('Sắp xếp')&&<><rect x="40" y="45" width="170" height="100" rx="10" fill="#f3e6cc"/><text x="55" y="65" fontSize="12" fill="#725f3c">KHU ĐỒ CÁ NHÂN</text><path d="M240 70H800M240 430H800" stroke="#647d87" strokeWidth="12"/></>}
     {work.surface==='floor'&&<path d="M90 440H810" stroke="#f2be55" strokeWidth="8" strokeDasharray="24 15"/>}
     {step&&step.mode==='drag'&&showGuide&&<g><rect x={step.target[0]-55} y={step.target[1]-48} width="110" height="96" rx="18" fill="#23b7a8" fillOpacity=".12" stroke="#178f85" strokeWidth="3" strokeDasharray="8 5"/><text x={step.target[0]} y={step.target[1]+62} textAnchor="middle" fontSize="13" fill="#12675e">ĐẶT VÀO ĐÂY</text></g>}
     {step?.mode==='trace'&&step.path&&<g pointerEvents="none"><polyline points={step.path.map(p=>p.join(',')).join(' ')} fill="none" stroke="#139d99" strokeWidth="58" opacity=".1" strokeLinecap="round" strokeLinejoin="round"/><polyline points={step.path.map(p=>p.join(',')).join(' ')} fill="none" stroke="#2c9f99" strokeWidth={showGuide?5:3} strokeDasharray="9 7" strokeLinecap="round"/></g>}
     {step?.mode==='arrange'&&step.placements?.map(p=><g key={p.object}><rect x={p.target[0]-45} y={p.target[1]-38} width="90" height="76" rx="12" fill={placed.includes(p.object)?'#a1dec9':'#f9fcfd'} fillOpacity=".7" stroke={placed.includes(p.object)?'#168977':'#6b939d'} strokeWidth="2" strokeDasharray={placed.includes(p.object)?undefined:'6 4'}/></g>)}
     {work.objects.map(obj=>{
      if(index<(obj.fromStep??0)||index>=(obj.untilStep??Infinity))return null;
      let at=gesture.current?.object===obj.id&&moving?moving:positions[obj.id];
      const isCurrent=step?.mode==='arrange'?step.placements?.some(p=>p.object===obj.id&&!placed.includes(obj.id)):step?.mode==='inspect'?step.inspections?.some((check,i)=>check.object===obj.id&&!inspected.includes(i)):step?.object===obj.id;
      const piece=obj.id.startsWith('piece')?Number(obj.id.slice(5)):-1;
      const swept=piece>=0&&piece<index;
      if(swept){const pan=step?.object==='pan'&&moving?moving:positions.pan;at=[pan[0]+(piece-2)*12,pan[1]+20];}
      else if(piece===index&&moving&&progress>0)at=[moving[0],moving[1]+20];
      const bandaged=work.surface==='medical'&&obj.id==='arm'&&index>=5;
      const itemLabel=piece>=0?String(piece+1):obj.label;
      const labelWidth=piece>=0?28:Math.max(84,obj.label.length*7.6);
      const previousAdjustment=work.steps.slice(0,index).filter(s=>s.object===obj.id&&s.mode==='adjust').at(-1)?.value??0;
      const modelValue=isCurrent&&step?.mode==='adjust'?value:obj.model==='clock'?progress*100:previousAdjustment;
      const fanOn=(work.steps.slice(0,index).filter(s=>s.object==='switch'&&s.mode==='adjust').at(-1)?.value??0)>0;
      const modelActive=obj.model==='burner'?!work.steps.slice(0,index).some(s=>s.object==='cap'&&s.mode==='trace'):obj.model==='hood'?fanOn:obj.model==='switch'?modelValue>0:index>0;
      return <g key={obj.id} data-work-object={obj.id} transform={`translate(${at[0]} ${at[1]})`} opacity={isCurrent&&step?.mode==='trace' ? .6 : 1}>
       {isCurrent&&showGuide&&<circle r={obj.model==='arm'?65:57} fill="none" stroke="#099b96" strokeWidth="3" strokeDasharray="7 4"/>}
       <g filter={`url(#${titleId}shadow)`} style={{pointerEvents:'none'}} transform={['valve','chair'].includes(obj.model)?`rotate(${modelValue*2.7})`:undefined}>{obj.image?<image href={obj.image} x="-65" y="-65" width="130" height="130"/>:<ModelDrawing model={obj.model} color={obj.color} active={modelActive} value={modelValue}/>}</g>
       {bandaged&&Array.from({length:index===5?Math.floor(progress*5):5},(_,i)=><path key={i} d={`M${-95+i*24}-34l12 70`} stroke="#fffcf4" strokeWidth="20"/>)}
       {!(step?.mode==='arrange'&&(placed.includes(obj.id)||obj.id==='rotor'))&&<g transform={`translate(0 ${at[1]>390?-75:obj.model==='arm'?65:68})`}><rect x={-labelWidth/2} y="-15" width={labelWidth} height="23" rx="6" fill="white" fillOpacity=".92"/><text textAnchor="middle" fontSize="13" fontWeight="600" fill="#314f62">{itemLabel}</text></g>}
      </g>;
     })}
     {step?.mode==='arrange'&&step.placements?.map(p=><g key={p.object} pointerEvents="none"><rect x={p.target[0]-50} y={p.target[1]-10} width="100" height="20" rx="6" fill={placed.includes(p.object)?'#d5f0e5':'#f7fbfd'} stroke="#8db4bd"/><text x={p.target[0]} y={p.target[1]+4} textAnchor="middle" fontSize="9" fill="#254e61">{placed.includes(p.object)?'✓ ':''}{p.label}</text></g>)}
     {step?.mode==='trace'&&step.path&&<g pointerEvents="none"><circle cx={step.path.at(-1)![0]} cy={step.path.at(-1)![1]} r="19" fill="#ecfaf4" stroke="#168b80" strokeWidth="3"/><text x={step.path.at(-1)![0]} y={step.path.at(-1)![1]+5} textAnchor="middle" fontSize="14" fill="#126b63">✓</text><circle cx={pointAlong(step.path,traceDistance.current)[0]} cy={pointAlong(step.path,traceDistance.current)[1]} r="25" fill="#16a093" fillOpacity=".25" stroke="#087f77" strokeWidth="4"/></g>}
     {step?.mode==='hold'&&<g transform={`translate(${step.target.join(' ')})`}><circle r="48" fill="#0ca595" fillOpacity=".1" stroke="#05998c" strokeWidth="7" strokeDasharray={`${progress*302} 302`} transform="rotate(-90)"/><text y="5" textAnchor="middle" fill="#123e4b" fontWeight="700">{Math.round(progress*100)}%</text></g>}
    </svg>}
   </div>
   <aside className="practical-side">
   <div className="practical-instruction" aria-live="polite"><strong>{blockedReason?'Cần chuẩn bị bảo hộ':done?'✓ Đã hoàn thành các thao tác':`${index+1}/${work.steps.length} · ${step.instruction}`}</strong><p>{blockedReason??(done?'Kiểm tra kết quả rồi ghi nhận để trở lại phòng lab.':step.detail)}</p></div>
   <footer>
    {step?.mode==='inspect'&&<div className="practical-inspections">{step.inspections?.map((check,i)=><button key={i} onClick={()=>setInspection(i)} disabled={!!blockedReason} aria-pressed={inspected.includes(i)}>{inspected.includes(i)?'✓ ':''}{check.title}</button>)}</div>}
    {step?.mode==='trace'&&<div className="practical-trace-status"><progress aria-label="Tiến độ đường thao tác" value={traceDistance.current} max={pathLength(step.path!)}/><span>{Math.round(traceDistance.current/pathLength(step.path!)*100)}% · Nhấc tay vẫn giữ tiến độ</span></div>}
    {step?.mode==='arrange'&&<p className="practical-placement-counter" aria-live="polite">Đã bố trí {placed.length}/{step.placements?.length} vật · Có thể kéo lại một món để điều chỉnh</p>}
    {done&&<div className="practical-result"><strong>Kết quả thực hành: {practicalScore(mistakes,hints)}/100</strong><span>{work.steps.length} bước hoàn tất · {mistakes} thao tác đã sửa · {hints} gợi ý</span><p>Điểm phản ánh độ chính xác, không thưởng vì làm nhanh. Các thao tác chưa phù hợp đã được sửa trước khi hoàn thành.</p></div>}
    {step?.mode==='adjust'?<div className="practical-adjust"><label htmlFor={titleId+'adjust'}>{step.instruction} · {value} / 100 · đích {step.value}</label><input id={titleId+'adjust'} type="range" min="0" max="100" value={value} disabled={!!blockedReason} onChange={e=>{setValue(Number(e.target.value));setAdjusted(true);}}/><button disabled={!!blockedReason||!adjusted||Math.abs(value-step.value!)>4} onClick={advance}>Xác nhận vị trí</button></div>:done?<button disabled={!!blockedReason} className="practical-finish" onClick={()=>{if(!finishing.current){finishing.current=true;onComplete({completedSteps:index,totalSteps:work.steps.length,mistakes,hints,score:practicalScore(mistakes,hints),mode});}}}>Ghi nhận kết quả và trở lại lab</button>:<p className="practical-help">{step.mode==='drag'?'Kéo vật thể sáng màu rồi thả đúng khung.':step.mode==='trace'?'Kéo dụng cụ theo dải rộng. Có thể nhấc tay, đổi tư thế rồi tiếp tục.':step.mode==='stir'?'Kéo đũa theo vòng tròn trong cốc; không cần đi qua số.':step.mode==='inspect'?'Mở từng vật để quan sát cận cảnh.':step.mode==='arrange'?'Kéo từng món về đúng khu vực. Không bắt buộc thứ tự giữa các món.':'Giữ chuột hoặc ngón tay trong vòng kiểm tra.'}</p>}
    {!done&&<div className="practical-assistance"><button onClick={()=>{if(!hintVisible){setHints(n=>n+1);setHintVisible(true);}const tool=work.objects.find(o=>o.id===step.object)?.label??'dụng cụ';setMessage(step.mode==='arrange'?`Còn lại: ${step.placements?.filter(p=>!placed.includes(p.object)).map(p=>`${work.objects.find(o=>o.id===p.object)?.label} → ${p.label}`).join('; ')}.`:step.mode==='adjust'?`Điều chỉnh ${tool} về ${step.value}, trong sai số ±4, rồi xác nhận.`:step.mode==='inspect'?'Mở các thẻ chưa có dấu ✓ và ghi nhận sau khi đọc dấu hiệu.':step.mode==='trace'?`Nắm ${tool} ở đầu đoạn sáng, kéo theo dải. Lệch một chút hoặc nhấc tay sẽ không mất đoạn đã làm.`:step.mode==='stir'?'Kéo đũa một vòng quanh thành cốc. Đổi chiều liên tục hoặc giữ yên không tính là khuấy; có thể nhấc tay rồi tiếp tục.':step.mode==='drag'?`Nắm ${tool} rồi đặt trọn vào khung đang hiện, sau đó thả tay.`:`Giữ tại vị trí kiểm tra đủ ${step.seconds??2} giây mô phỏng; rời vùng sẽ hủy lượt giữ.`);}}>Xem gợi ý thao tác</button><button onClick={()=>{setRestart(n=>n+1);resetGesture();traceDistance.current=0;setTraceSaved(0);setInspected([]);setPlaced([]);setInspection(null);setMessage('Đã đặt lại riêng bước hiện tại. Những bước hoàn thành trước đó vẫn được giữ.');}}>Làm lại bước này</button></div>}
    <p role="status" className="practical-feedback">{message}</p>
    {step?.mode==='hold'&&<button className="practical-key-hold" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);beginHold();}} onPointerUp={()=>{stopTimer();setProgress(0);}} onPointerCancel={()=>{stopTimer();setProgress(0);}} onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();beginHold();}}} onKeyUp={()=>{stopTimer();setProgress(0);}} onBlur={()=>{stopTimer();setProgress(0);}}>Giữ để kiểm tra (Space)</button>}
    {work.surface==='medical'&&<a href="https://www.redcross.org/take-a-class/resources/learn-first-aid/wounds" target="_blank" rel="noreferrer">Tham khảo kỹ thuật sơ cứu · American Red Cross</a>}
   </footer>
   </aside>
   {expanded&&<p className="practical-expanded-caption">{index+1}/{work.steps.length} · {step?.instruction}</p>}
   </div>
   {inspection!==null&&step?.inspections?.[inspection]&&<ObjectInspection object={work.objects.find(o=>o.id===step.inspections![inspection].object)!} title={step.inspections[inspection].title} detail={step.inspections[inspection].detail} onClose={()=>setInspection(null)} onCheck={()=>{const checked=[...new Set([...inspected,inspection])];setInspected(checked);setInspection(null);soundManager.play('snap');if(checked.length===step.inspections!.length)advance();}}/>}
  </section>
 </div>;
}

function ObjectInspection({object,title,detail,onClose,onCheck}:{object:PracticalWork['objects'][number];title:string;detail:string;onClose:()=>void;onCheck:()=>void}){
 const ref=useRef<HTMLElement>(null),id=useId();useDialogFocus(ref,onClose);
 return <div className="practical-inspector" data-ui><section ref={ref} role="dialog" aria-modal="true" aria-labelledby={id}>
 <header className="practical-inspector-header"><div><p>QUAN SÁT VẬT THỂ · {object.label}</p><h3 id={id}>{title}</h3></div><button onClick={onClose} aria-label="Đóng quan sát cận cảnh">✕</button></header>
 <div className="practical-inspector-content"><svg viewBox="-180 -140 360 280" aria-label={object.label} role="img"><rect x="-180" y="-140" width="360" height="280" rx="16" fill="#e5eff2"/>{object.image?<image href={object.image} x="-90" y="-90" width="180" height="180"/>:<g transform="scale(1.4)"><ModelDrawing model={object.model} color={object.color}/></g>}</svg>
 <p className="practical-inspector-detail">{detail}</p><button onClick={onCheck}>Đã kiểm tra vật này</button></div>
 </section></div>;
}
