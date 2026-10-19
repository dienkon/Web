import React, { useEffect, useId, useRef, useState } from 'react';
import { emptyStir, stirMotion, type StirState } from '../../core/simulation/GestureProgress';
import type { Point } from '../../data/practicalWork';
import './stirring.css';

export function StirringSurface({disabled=false,onComplete,onProgress,onActiveChange,turns=1}:{disabled?:boolean;onComplete:()=>void;onProgress?:(progress:number)=>void;onActiveChange?:(active:boolean)=>void;turns?:number}){
 const id=useId(),svg=useRef<SVGSVGElement>(null),state=useRef<StirState>(emptyStir()),pointer=useRef<number|null>(null),finished=useRef(false);
 const [display,setDisplay]=useState({progress:0,theta:0,active:false});
 const callbacks=useRef({onComplete,onProgress,onActiveChange});callbacks.current={onComplete,onProgress,onActiveChange};
 const center:Point=[180,140],radius=76;
 const stop=()=>{pointer.current=null;state.current={...state.current,lastAngle:null};setDisplay(v=>({...v,active:false}));callbacks.current.onActiveChange?.(false);};
 const apply=(p:Point)=>{
  if(disabled||finished.current)return;
  const next=stirMotion(state.current,p,center,radius,turns);state.current=next;
  setDisplay({progress:next.progress,theta:Math.atan2(p[1]-140,p[0]-180),active:true});callbacks.current.onProgress?.(next.progress);
  if(next.progress>=1){finished.current=true;stop();callbacks.current.onComplete();}
 };
 const point=(event:React.PointerEvent):Point=>{const matrix=svg.current?.getScreenCTM();if(!matrix)return center;const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());return [p.x,p.y];};
 useEffect(()=>{if(disabled)stop();},[disabled]);
 useEffect(()=>{
  const end=(e:PointerEvent)=>{if(e.pointerId===pointer.current)stop();};const blur=()=>stop();const visible=()=>{if(document.hidden)stop();};
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visible);
  return()=>{window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visible);callbacks.current.onActiveChange?.(false);};
 },[]);
 const x=180+Math.cos(display.theta)*60,y=140+Math.sin(display.theta)*60;
 return <div className={`stirring-surface ${disabled?'is-disabled':''}`} data-stirring>
  <svg ref={svg} viewBox="0 0 360 280" data-stir-surface role="img" aria-label="Cốc nhìn từ trên: kéo đũa quanh thành để khuấy" tabIndex={disabled?-1:0}
   onPointerDown={e=>{if(disabled||finished.current||e.button!==0||pointer.current!==null)return;const p=point(e);if(Math.hypot(p[0]-180,p[1]-140)>112)return;pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);state.current={...state.current,lastAngle:null};callbacks.current.onActiveChange?.(true);apply(p);}}
   onPointerMove={e=>{if(e.pointerId===pointer.current)apply(point(e));}}
   onPointerUp={stop} onPointerCancel={stop}
   onKeyDown={e=>{if(disabled||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const theta=(state.current.lastAngle??display.theta)+(e.key==='ArrowLeft'?-.18:.18);callbacks.current.onActiveChange?.(true);if(state.current.lastAngle===null)state.current.lastAngle=display.theta;apply([180+Math.cos(theta)*radius,140+Math.sin(theta)*radius]);}}
   onKeyUp={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){setDisplay(v=>({...v,active:false}));callbacks.current.onActiveChange?.(false);}}} onBlur={stop}>
   <defs><radialGradient id={id}><stop offset="0" stopColor="#65c6dc"/><stop offset="1" stopColor="#b9e7ef"/></radialGradient></defs>
   <ellipse cx="180" cy="155" rx="113" ry="100" fill="#a7bec7" opacity=".25"/>
   <path d="M275 82l25-10-10 34" fill="#e8f8fa" stroke="#6b9cac" strokeWidth="5"/>
   <circle cx="180" cy="140" r="102" fill="#edf9fc" stroke="#719eaf" strokeWidth="6"/>
   <circle cx="180" cy="140" r="91" fill={`url(#${id})`}/>
   <g transform={`rotate(${state.current.angle*180/Math.PI} 180 140)`} opacity=".65"><path d="M116 129q42-55 103-23t-12 88q-63 18-62-30t50-18" fill="none" stroke="#edfaff" strokeWidth="5" strokeLinecap="round"/></g>
   <circle cx="180" cy="140" r="76" fill="none" stroke="#4fafa9" strokeWidth="17" opacity=".16"/>
   <circle cx="180" cy="140" r="108" fill="none" stroke="#158b80" strokeWidth="6" strokeDasharray={`${display.progress*679} 679`} transform="rotate(-90 180 140)"/>
   <path d={`M${x} ${y}l${Math.cos(display.theta)*49} ${Math.sin(display.theta)*49}`} stroke="#4a8196" strokeWidth="10" strokeLinecap="round"/>
   <path d={`M${x} ${y}l${Math.cos(display.theta)*49} ${Math.sin(display.theta)*49}`} stroke="#d6f3fa" strokeWidth="5" strokeLinecap="round"/>
   <circle cx={x} cy={y} r="13" fill="#fff" fillOpacity=".65" stroke="#2c9795" strokeWidth="3"/>
   <text x="180" y="146" textAnchor="middle" fontSize="24" fontWeight="700" fill="#266579">{Math.round(display.progress*100)}%</text>
  </svg>
  <div className="stirring-caption"><strong>{display.progress>=1?'✓ Đã khuấy đủ vòng':display.active?'Đũa đang đi theo tay bạn':'Kéo đũa vòng quanh cốc'}</strong><span>Nhấc tay rồi khuấy tiếp được · Phím ← / → cũng điều khiển đũa</span></div>
  <progress data-stir-progress aria-label="Tiến độ khuấy" max="1" value={display.progress}/>
 </div>;
}
