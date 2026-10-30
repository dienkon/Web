import React from 'react';
import type { Point, PracticalWork, WorkStep } from '../../../data/practicalWork';
import type { SceneVisual } from './sceneVisuals';
import { InstrumentBackdrop, InstrumentEffects } from './InstrumentArt';

function Zone({x,y,w,h,label,color='#78939d'}:{x:number;y:number;w:number;h:number;label:string;color?:string}) {
 return <g><rect x={x} y={y} width={w} height={h} rx="12" fill="white" fillOpacity=".28" stroke={color} strokeOpacity=".6" strokeWidth="1.5"/><path d={`M${x+12} ${y+28}H${x+w-12}`} stroke={color} opacity=".25"/><text x={x+14} y={y+19} fontSize="10" letterSpacing="1" fontWeight="700" fill={color}>{label}</text></g>;
}

/** The board never moves. Each scene has its own functional landmarks. */
export function SceneBackdrop({visual:v}:{visual:SceneVisual}) {
 if(v.id.startsWith('instrument-')||v.id.startsWith('collect-')||v.id.startsWith('dispose-'))return <g pointerEvents="none" aria-hidden="true" data-scene-backdrop={v.id}><InstrumentBackdrop visual={v}/></g>;
 let art:React.ReactNode;
 switch(v.id){
 case 'incompatible-storage': art=<>{[[95,280,'AXIT','#aa853c'],[365,65,'OXY HÓA','#ab6370'],[635,280,'DUNG MÔI','#806aa2']].map(([x,y,label,color])=><Zone key={label} x={Number(x)} y={Number(y)} w={150} h={150} label={String(label)} color={String(color)}/>)}<path d="M310 75V430M585 75V430" stroke="#a4a1b4" strokeDasharray="4 9"/></>;break;
 case 'centrifuge-balance': art=<><Zone x={85} y={65} w={155} h={355} label="GIÁ ỐNG · CẶP A"/><Zone x={660} y={65} w={155} h={355} label="GIÁ ỐNG · CẶP B"/><rect x="315" y="120" width="270" height="300" rx="38" fill="#c7d0dc" stroke="#8796ad" strokeWidth="2"/><path d="M340 385h70m90 0h60" stroke="#8e9fb5" strokeWidth="5"/></>;break;
 case 'fume': art=<><rect x="310" y="45" width="280" height="300" rx="12" fill="#afc7d2" stroke="#648592" strokeWidth="3"/><rect x="330" y="75" width="240" height="240" rx="5" fill="#547786"/>{[355,385,415,445,475,505,535].map(x=><path key={x} d={`M${x} 90v200`} stroke="#739ca8" strokeWidth="5"/>)}<path d="M300 328h300" stroke="#e9f5f5" strokeWidth="15"/><text x="450" y="366" textAnchor="middle" fill="#496f7e" fontSize="11">VÙNG LÀM VIỆC TRONG TỦ</text></>;break;
 case 'evacuation': art=<><path d="M190 395V270H500L660 200 740 110" fill="none" stroke="#afc9b4" strokeWidth="76" strokeLinejoin="round"/><path d="M190 395V270H500L660 200 740 110" fill="none" stroke="#f8fbec" strokeWidth="2" strokeDasharray="12 9"/><Zone x={748} y={232} w={125} h={130} label="TẬP KẾT" color="#408665"/><rect x="696" y="40" width="85" height="35" rx="5" fill="#408665"/><text x="739" y="63" textAnchor="middle" fill="white" fontSize="13">EXIT ↗</text></>;break;
 case 'blocked-exit': art=<><path d="M390 450V45H510V450" fill="#d7e8d7" stroke="#90af95" strokeWidth="2"/><path d="M405 440V55M495 440V55" stroke="#f6fbdf" strokeWidth="4" strokeDasharray="18 10"/><Zone x={55} y={55} w={170} h={155} label="TỦ ĐỒ CÁ NHÂN"/><Zone x={660} y={55} w={170} h={155} label="KHU DỤNG CỤ"/></>;break;
 case 'electrical': art=<><path d="M310 125H590V365H310Z" fill="#d5c89a" fillOpacity=".2" stroke="#bd9d45" strokeWidth="4" strokeDasharray="14 8"/><path d="M370 100h160" stroke="#768591" strokeWidth="7"/><text x="450" y="424" textAnchor="middle" fontSize="11" fill="#96782e">RANH GIỚI · GIỮ KHOẢNG CÁCH</text><Zone x={660} y={50} w={130} h={120} label="VÙNG LÙI"/></>;break;
 case 'hot-glass': art=<><Zone x={590} y={150} w={180} h={220} label="VÙNG CHỜ NGUỘI" color="#aa7551"/><rect x="615" y="206" width="130" height="90" rx="8" fill="#d5c4ad" stroke="#a68b6f" strokeWidth="2"/>{[225,245,265,285].map(y=><path key={y} d={`M620 ${y}h120`} stroke="#e3d8c8"/>)}<path d="M265 160h150v135H265Z" fill="none" stroke="#c9ad91" strokeDasharray="6 5"/></>;break;
 case 'unknown-bottle': art=<><Zone x={335} y={140} w={180} h={245} label="CÁCH LY · KHÔNG DÙNG" color="#a78345"/><Zone x={565} y={55} w={165} h={155} label="PHIẾU BÀN GIAO" color="#758d90"/></>;break;
 case 'cracked-glass': art=<><Zone x={245} y={140} w={150} h={215} label="NGỪNG SỬ DỤNG" color="#aa7666"/><Zone x={625} y={190} w={150} h={180} label="HỘP VẬT SẮC"/><path d="M455 160v220" stroke="#a3b8c5" strokeDasharray="6 8"/></>;break;
 case 'gas-hose': art=<><path d="M210 150v90Q300 300 430 280T620 210" fill="none" stroke="#b3a28a" strokeWidth="20" opacity=".35"/><Zone x={110} y={70} w={190} h={150} label="NGUỒN KHÍ" color="#9a7952"/><path d="M575 190h85v60h-85z" fill="#e1d8c8" stroke="#a48a69"/></>;break;
 case 'pipette-bulb': art=<><Zone x={610} y={55} w={180} h={120} label="GIÁ PIPET"/><Zone x={580} y={210} w={160} h={170} label="CỐC MẪU"/><Zone x={380} y={320} w={145} h={115} label="VÙNG RỬA"/></>;break;
 case 'eye-protection': art=<><ellipse cx="450" cy="205" rx="120" ry="145" fill="#d1e3e8" stroke="#97b8c2"/><path d="M325 165h250M450 60v290" stroke="#afcad2" strokeDasharray="3 8"/><text x="450" y="405" textAnchor="middle" fontSize="12" fill="#567f91">MẮT · HAI BÊN · DÂY ĐEO</text></>;break;
 case 'dirty-gloves': art=<><Zone x={275} y={115} w={335} h={220} label="MẶT NGOÀI · VÙNG NHIỄM" color="#9d8e57"/><Zone x={75} y={245} w={225} h={190} label="VÙNG RỬA TAY" color="#548a81"/><path d="M635 100v320" stroke="#aabdb1" strokeWidth="2" strokeDasharray="8 8"/></>;break;
 case 'waste-mixing': art=<><Zone x={555} y={75} w={190} h={150} label="CHẤT THẢI · NHÓM 1" color="#a28d4d"/><Zone x={555} y={290} w={190} h={150} label="CHẤT THẢI · NHÓM 2" color="#8c769e"/><path d="M570 258h160" stroke="#a5a696" strokeWidth="2" strokeDasharray="5 8"/></>;break;
 case 'vacuum-check': art=<><Zone x={295} y={140} w={230} h={245} label="BÌNH CHỊU HÚT"/><path d="M300 365h220" stroke="#a3c2d1" strokeWidth="12"/><path d="M305 365V330M515 365V330" stroke="#6b8797" strokeWidth="6"/></>;break;
 case 'reagent-return': art=<><Zone x={85} y={45} w={150} h={160} label="CHAI GỐC · GIỮ KÍN" color="#77864d"/><Zone x={550} y={180} w={210} h={210} label="MẪU DƯ · BÀN GIAO"/><path d="M275 65v350" stroke="#aab99a" strokeDasharray="6 8"/></>;break;
 case 'crowded-bench': art=<><Zone x={55} y={45} w={155} h={145} label="ĐỒ CÁ NHÂN"/><path d="M240 85H810M240 425H810" stroke="#7d969f" strokeWidth="9"/><Zone x={230} y={140} w={125} h={130} label="CHAI ĐỨNG"/><Zone x={400} y={220} w={160} h={175} label="THAO TÁC"/><Zone x={630} y={220} w={170} h={175} label="KHAY RIÊNG"/></>;break;
 case 'shutdown-check': art=<>{[[100,'KHÍ'],[360,'ĐIỆN'],[570,'HÓA CHẤT']].map(([x,label])=><Zone key={label} x={Number(x)} y={85} w={170} h={180} label={String(label)}/>)}<Zone x={570} y={290} w={170} h={140} label="VÙNG CẤT CHAI"/></>;break;
 case 'bandage': art=<><rect x="240" y="190" width="425" height="155" rx="28" fill="#f9f7f4" stroke="#d5c7c5" strokeWidth="2"/><Zone x={90} y={220} w={135} h={180} label="GẠC SẠCH" color="#9c7a81"/></>;break;
 case 'pass': art=<><Zone x={540} y={240} w={235} h={155} label="GỐC MỤC TIÊU" color="#aa7054"/><path d="M550 365h210" stroke="#c29a73" strokeWidth="6"/></>;break;
 case 'spill-neutralize': art=<><ellipse cx="450" cy="260" rx="170" ry="115" fill="#c3bc83" opacity=".3"/><ellipse cx="450" cy="260" rx="215" ry="155" fill="none" stroke="#bdac6c" strokeWidth="3" strokeDasharray="14 9"/></>;break;
 case 'spill-collect': art=<><Zone x={315} y={165} w={300} h={195} label="VÙNG THẤM ĐÃ ĐƯỢC CHO PHÉP" color="#7b9986"/>{[210,260,310].map(y=><path key={y} d={`M340 ${y}H580`} stroke="#b6c9ba" strokeWidth="14"/>)}</>;break;
 default: art=<><path d="M60 425H840" stroke="#9fb5be" strokeWidth="5"/><path d="M60 55H840" stroke="#c6d8de" strokeWidth="2"/></>;
 }
 return <g pointerEvents="none" aria-hidden="true" data-scene-backdrop={v.id}>{art}</g>;
}

export interface SceneState {work:PracticalWork;index:number;positions:Record<string,Point>;step?:WorkStep;progress:number;value:number;moving:Point|null;movingObject?:string}

/** No running JS animation loop: geometry follows gestures; ambient CSS stays on local details. */
export function SceneEffects({visual:v,state:s}:{visual:SceneVisual;state:SceneState}) {
 if(v.id.startsWith('instrument-')||v.id.startsWith('collect-')||v.id.startsWith('dispose-'))return <g pointerEvents="none" aria-hidden="true" data-scene-effect={v.id}><InstrumentEffects visual={v} state={s}/></g>;
 const {work,index,positions:p,step,progress,value,moving}=s;
 const at=(id:string):Point=>s.movingObject===id&&moving?moving:p[id]??[450,240];
 const completed=work.steps.slice(0,index);
 const did=(id:string,mode?:string)=>completed.some(x=>x.object===id&&(!mode||x.mode===mode));
 const level=(id:string)=>step?.object===id&&step.mode==='adjust'?value:completed.filter(x=>x.object===id&&x.mode==='adjust').at(-1)?.value??0;
 const marker=(id:string,text:string)=>{const [x,y]=at(id);return <g transform={`translate(${x+34} ${y-30})`}><rect x="-24" y="-12" width="48" height="20" rx="5" fill="#edf6ed" stroke="#87aa91"/><text textAnchor="middle" y="2" fontSize="9" fill="#47765a">{text}</text></g>;};
 let fx:React.ReactNode;
 switch(v.id){
 case 'alcohol-cap': {const [x,y]=at('burner'),covered=did('cap','trace');fx=!covered?<g transform={`translate(${x} ${y-42}) scale(${step?.object==='cap'&&step.mode==='trace'?1-progress*.85:1})`}><path className="fx-alcohol-flame" d="M0-55C24-27 15 5 0 6-18 1-20-22 0-55" fill="#f2b862" opacity=".85"/><path className="fx-alcohol-core" d="M0-27C13-10 8 5 0 6-10-1-8-12 0-27" fill="#9ddbe3"/></g>:marker('burner','ĐÃ ĐẬY');break;}
 case 'electrical': {const [x,y]=at('water');fx=<><g transform={`translate(${x} ${y})`}><ellipse className="fx-water-ripple" rx="75" ry="45" fill="none" stroke="#6899a7" strokeWidth="2"/><ellipse className="fx-water-ripple fx-delay" rx="50" ry="28" fill="none" stroke="#8db3be" strokeWidth="2"/></g>{did('switch','hold')?marker('switch','CÔ LẬP'):<path d="M413 112h74" stroke="#ba9845" strokeWidth="3"/>}</>;break;}
 case 'fume': fx=level('switch')>0?<g><g className="fx-extraction">{[365,410,455,500,540].map(x=><path key={x} d={`M${x} 290q-10-50 0-100v-65m-5 7 5-7 5 7`} fill="none" stroke="#bddfe0" strokeWidth="2"/>)}</g><text x="555" y="308" textAnchor="end" fill="#dcf9ea" fontSize="9">HÚT ĐANG BẬT</text></g>:null;break;
 case 'evacuation': fx=<><path className="fx-exit-route" d="M190 395V270H500L660 200 740 110" fill="none" stroke="#4c9470" strokeWidth="4" strokeDasharray="6 25"/>{did('person')&&marker('person','ĐIỂM DANH')}</>;break;
 case 'unknown-bottle': fx=did('label','drag')?<g className="fx-quarantine-seal"><path d="M382 209l76 60m-76 0 76-60" stroke="#b28d43" strokeWidth="3" opacity=".55"/>{marker('bottle','CÁCH LY')}</g>:null;break;
 case 'cracked-glass': {const [x,y]=at('glass');fx=!did('glass','drag')?<path className="fx-glass-fracture" d={`M${x-13} ${y-22}l15 18-9 12 19 13-7 16`} fill="none" stroke="#a56759" strokeWidth="2.5"/>:marker('bin','ĐÃ TÁCH');break;}
 case 'gas-hose': fx=<><circle className="fx-hose-inspection" cx="550" cy="259" r="21" fill="none" stroke="#ba8c57" strokeWidth="2" strokeDasharray="4 4"/>{did('valve','adjust')&&marker('valve','ĐÃ ĐÓNG')}{step?.mode==='trace'&&moving&&<circle cx={moving[0]} cy={moving[1]} r="31" fill="#f7edc7" fillOpacity=".2" stroke="#a68958"/>}</>;break;
 case 'hot-glass': {const [x,y]=at('glass');fx=<g transform={`translate(${x} ${y-45})`}><g className="fx-heat-drift">{[-18,0,18].map(dx=><path key={dx} d={`M${dx} 0q-9-15 0-28t0-28`} stroke="#b98665" strokeWidth="2" opacity=".6" fill="none"/>)}</g>{step?.object==='glass'&&moving&&<path d="M-45 42-28 20M45 42 28 20M-45 42-50 62M45 42 50 62" fill="none" stroke="#617e8d" strokeWidth="6"/>}</g>;break;}
 case 'incompatible-storage': fx=<>{['bottle','oxidizer','solvent'].map(id=>at(id)[0]===({bottle:170,oxidizer:440,solvent:710}[id])&&<g key={id} className="fx-storage-receive">{marker(id,'SẮP RIÊNG')}</g>)}</>;break;
 case 'pipette-bulb': {const [x,y]=at('pipette');fx=did('bulb','hold')?<g transform={`translate(${x} ${y})`}><path d={`M0 30V${30-level('bulb')*.85}`} stroke="#4f9db3" strokeWidth="6"/>{step?.object==='bulb'&&step.mode==='adjust'&&<ellipse cy="-70" rx={23-value*.08} ry={31-value*.08} fill="#ce7f77"/>}</g>:null;break;}
 case 'centrifuge-balance': fx=p.cap[1]>200?<>{did('rotor','hold')&&marker('rotor','ĐÃ KIỂM')}</>:<>{['tube1','tube2','tube3','tube4'].filter(id=>p[id]?.[0]>=370&&p[id]?.[0]<=530).map(id=><circle key={id} className="fx-rotor-seat" cx={p[id][0]} cy={p[id][1]} r="23" fill="none" stroke="#6a97a6" strokeWidth="2"/>)}{did('rotor','hold')&&marker('rotor','ĐÃ KIỂM')}</>;break;
 case 'blocked-exit': fx=did('bag')?<g>{[350,270,190,110].map((y,i)=><path key={y} className="fx-clear-exit" style={{animationDelay:`${i*.22}s`}} d={`M435 ${y+10}l15-15 15 15`} fill="none" stroke="#579073" strokeWidth="3"/>)}</g>:null;break;
 case 'eye-protection': {const [x,y]=at('goggles');fx=did('goggles','drag')?<g transform={`translate(${x} ${y})`}><path className="fx-goggle-seal" d="M-66-24Q0-56 66-24V29H15L0 18-15 29H-66Z" fill="none" stroke="#45958e" strokeWidth="2" strokeDasharray="5 5"/></g>:null;break;}
 case 'dirty-gloves': fx=<>{step?.object?.startsWith('glove')&&step.mode==='trace'&&<g transform={`translate(${at(step.object).join(' ')})`}><ellipse rx={30-progress*12} ry={10+progress*20} fill="#8fa76c" opacity=".5"/><path d="M-20 0Q0 15 20 0" stroke="#f4f5de" strokeWidth="3" fill="none"/></g>}{(step?.object==='hands'||step?.object==='soap')&&<g className="fx-hand-bubbles">{[[155,320,8],[205,340,12],[170,370,9],[220,375,6]].map(([x,y,r])=><circle key={x} cx={x} cy={y} r={r} fill="#edf9f7" stroke="#83b5ab"/>)}</g>}</>;break;
 case 'waste-mixing': fx=<>{['bottle','bottle2'].filter(id=>at(id)[0]===650).map(id=><g key={id} className="fx-waste-cap-check">{marker(id,'NẮP KÍN')}</g>)}</>;break;
 case 'vacuum-check': fx=<g transform="translate(595 100)"><circle r="35" fill="#eef4f7" stroke="#7897a9" strokeWidth="3"/><path d="M-25 0a25 25 0 0 1 50 0" fill="none" stroke="#aec8cf" strokeWidth="5"/><path d="M0 0V-23" stroke="#b37862" strokeWidth="3" transform={`rotate(${-70+level('valve')*1.4})`}/><circle r="4" fill="#66869b"/><text y="52" textAnchor="middle" fontSize="10" fill="#658493">ÁP KẾ MÔ PHỎNG</text></g>;break;
 case 'reagent-return': fx=<><path d="M260 85v85" stroke="#7e925c" strokeWidth="2"/>{did('glass','drag')&&<g className="fx-sample-handover">{marker('glass','MẪU DƯ')}</g>}{marker('bottle','GIỮ KÍN')}</>;break;
 case 'crowded-bench': fx=did('cable','trace')?<g className="fx-bench-cable"><path d="M450 200 480 140 560 110H650" fill="none" stroke="#516c79" strokeWidth="7" strokeLinejoin="round"/>{[490,560,630].map(x=><rect key={x} x={x} y="102" width="8" height="16" rx="2" fill="#95abb5"/>)}</g>:null;break;
 case 'shutdown-check': fx=<>{['valve','switch','bottle'].map((id,i)=><g key={`${id}-${did(id)}`} className={did(id)?'fx-shutdown-confirm':undefined}><circle cx={140+i*235} cy="64" r="6" fill={did(id)?'#75a895':'#bca883'}/><text x={154+i*235} y="68" fontSize="10" fill="#637e88">{did(id)?'ĐÃ KIỂM':'CHỜ KIỂM'}</text></g>)}</>;break;
 case 'bandage': fx=did('gauze','drag')?<g transform="translate(430 270)"><rect x="-30" y="-25" width="60" height="50" rx="5" fill="#faf9f1" stroke="#b7c2bc"/>{step?.object==='bandage'&&step.mode==='trace'&&Array.from({length:Math.floor(progress*5)},(_,i)=><path key={i} d={`M${-65+i*24}-33l13 67`} stroke="#f5eddf" strokeWidth="20"/>)}</g>:null;break;
 case 'pass': {const [x,y]=at('hose');fx=did('valve','hold')&&step?.mode==='trace'?<path className="fx-pass-stream" d={`M${x} ${y}l80-17v34Z`} fill="#f4f8ef" opacity=".8"/>:null;break;}
 case 'spill-neutralize': fx=did('powder','trace')?<g className="fx-spill-reaction">{Array.from({length:9},(_,i)=><circle key={i} cx={375+(i%3)*66} cy={225+Math.floor(i/3)*35} r={5+i%3*2} fill="#f5f2d8" stroke="#9e9e6b"/>)}</g>:null;break;
 case 'spill-collect': fx=step?.mode==='trace'?<path d={`M340 ${200+Math.min(index,2)*50}h${240*progress}`} stroke="#b5ccbe" strokeWidth="28" opacity=".6" strokeLinecap="round"/>:null;break;
 case 'burette': fx=level('valve')>0?<g className="fx-buret-drop"><path d="M450 305v20" stroke="#6eb7cf" strokeWidth="3"/><ellipse cx="450" cy="331" rx="3" ry="5" fill="#6eb7cf"/></g>:null;break;
 case 'electrode': fx=step?.mode==='hold'?<path className="fx-ph-signal" d="M580 90h15l8-10 8 20 8-10h35" fill="none" stroke="#72a49c" strokeWidth="2"/>:null;break;
 case 'balance': fx=step?.mode==='hold'?<path className="fx-balance-settle" d="M365 325h170" stroke="#65a58e" strokeWidth="2"/>:null;break;
 case 'shower': fx=did('valve','trace')?<g className="fx-shower-water">{[425,450,475].map(x=><path key={x} d={`M${x} 150v190`} stroke="#81c6d9" strokeWidth="3" strokeDasharray="10 14"/>)}</g>:null;break;
 default: fx=null;
 }
 return <g pointerEvents="none" aria-hidden="true" data-scene-effect={v.id}>{fx}</g>;
}
