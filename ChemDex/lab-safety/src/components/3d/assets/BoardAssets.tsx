import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { PERIODIC_BOARD_ELEMENTS } from '../../../data/periodicBoard';
import { SAFETY_RULES } from '../../../data/rules';
import { BoardFrame, EraserAsset, MarkerAsset } from './ArchitectureAssets';
import { Solid } from './AssetPrimitives';

type BoardKind='periodic'|'evacuation'|'lesson'|'rules';
function text(c:CanvasRenderingContext2D,value:string,x:number,y:number,size=28,color='#365665',weight=500){c.fillStyle=color;c.font=`${weight} ${size}px sans-serif`;c.fillText(value,x,y);}
function arrow(c:CanvasRenderingContext2D,points:[number,number][],color='#679c89'){
 c.strokeStyle=color;c.lineWidth=8;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();const [x,y]=points.at(-1)!,[px,py]=points.at(-2)!,a=Math.atan2(y-py,x-px);c.beginPath();c.moveTo(x-20*Math.cos(a-.5),y-20*Math.sin(a-.5));c.lineTo(x,y);c.lineTo(x-20*Math.cos(a+.5),y-20*Math.sin(a+.5));c.stroke();
}

function drawPeriodic(c:CanvasRenderingContext2D){
 c.fillStyle='#edf0e6';c.fillRect(0,0,1400,800);text(c,'BẢNG TUẦN HOÀN · 118 NGUYÊN TỐ',45,55,36,'#355867',700);
 const left=45,top=110,cw=71,ch=58;
 for(let g=1;g<=18;g++)text(c,String(g),left+(g-.65)*cw,top-10,18);
 for(const [z,symbol,period,group] of PERIODIC_BOARD_ELEMENTS){
  const lan=z>=57&&z<=71,act=z>=89&&z<=103,col=lan?z-54:act?z-86:group,row=lan?8:act?9:period,x=left+(col-1)*cw,y=top+(row-1)*ch+(row>7?38:0);
  c.fillStyle=lan?'#cad4ba':act?'#d8c7bd':group===18?'#c9d5d6':group===17?'#bdd8ca':group<=2?'#dfd1ac':group<=12?'#bfcfd9':'#d0d9ba';c.fillRect(x,y,cw-3,ch-3);text(c,String(z),x+5,y+15,13);text(c,symbol,x+22,y+43,25,'#355360',700);
 }
 text(c,'57–71',left+2*cw+5,top+5*ch+34,16);text(c,'89–103',left+2*cw+2,top+6*ch+34,15);
 text(c,'Số hiệu nguyên tử · Ký hiệu | Bảng dùng dữ liệu cùng thư viện nguyên tố ChemDex',45,765,22);
}

function drawEvacuation(c:CanvasRenderingContext2D){
 c.fillStyle='#edf0e6';c.fillRect(0,0,1200,850);text(c,'SƠ ĐỒ PHÒNG · MÔ PHỎNG',55,65,39,'#40665d',700);
 const x=100,y=140,s=42,X=(v:number)=>x+(v+10)*s,Y=(v:number)=>y+(v+7.5)*s;
 c.fillStyle='#dce7df';c.fillRect(x,y,20*s,15*s);c.strokeStyle='#7a999f';c.lineWidth=6;c.strokeRect(x,y,20*s,15*s);
 c.fillStyle='#aac1c7';for(const bx of [-4.2,4.2])for(const bz of [-2.2,2.2])c.fillRect(X(bx-1.6),Y(bz-.7),3.2*s,1.4*s);
 c.fillRect(X(-1.5),Y(-6.05),3*s,1.1*s);text(c,'BÀN GIÁO VIÊN',X(-2),Y(-6.3),20);
 c.fillStyle='#bfd0c7';c.fillRect(X(8.25),Y(-4.7),1.1*s,2.4*s);text(c,'TỦ HÚT',X(5.5),Y(-3.4),18);
 c.fillStyle='#a6c4b1';for(const door of [-6,6])c.fillRect(X(door-1.1),Y(7.5)-7,2.2*s,14);
 arrow(c,[[X(-9.85),Y(4.85)],[X(-6),Y(4.85)],[X(-6),Y(7.3)]]);
 arrow(c,[[X(-6),Y(5)],[X(6),Y(5)],[X(6),Y(7.3)]],'#839e8b');
 c.fillStyle='#b17e66';c.beginPath();c.arc(X(-9.85),Y(4.85),10,0,Math.PI*2);c.fill();text(c,'VỊ TRÍ BẢNG',X(-9.6),Y(4.45),22,'#976e5f',700);
 text(c,'CỬA TÂY',X(-7.1),Y(7.5)+35,22);text(c,'CỬA ĐÔNG',X(4.9),Y(7.5)+35,22);text(c,'Theo biển thoát nạn và hướng dẫn của người phụ trách.',55,835,24);
}

function drawLesson(c:CanvasRenderingContext2D){
 c.fillStyle='#e9eee5';c.fillRect(0,0,1560,540);text(c,'AN TOÀN PHÒNG THÍ NGHIỆM',75,95,52,'#44788b',700);
 text(c,'Quan sát → Nhận diện → Thao tác → Ghi nhận',75,170,38);
 ['01   Chuẩn bị bảo hộ','02   Kiểm tra nhãn và dụng cụ','03   Thực hành theo hướng dẫn','04   Thu gom và ghi kết quả'].forEach((line,i)=>text(c,line,95,270+i*58,31));
 c.strokeStyle='#719ba9';c.lineWidth=7;c.beginPath();c.moveTo(1220,285);c.lineTo(1120,362);c.moveTo(1220,285);c.lineTo(1320,362);c.stroke();
 for(const [label,x,y,r] of [['O',1220,285,42],['H',1120,362,31],['H',1320,362,31]] as [string,number,number,number][]){c.fillStyle=label==='O'?'#d4a79a':'#cadfe1';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();text(c,label,x-14,y+12,35);}
 text(c,'H₂O',1180,450,34);text(c,'CHEMDEX · BÀN THỰC HÀNH',1080,500,18);
}

function drawRules(c:CanvasRenderingContext2D){
 c.fillStyle='#edf0e6';c.fillRect(0,0,1200,850);text(c,'NỘI QUY PHÒNG THÍ NGHIỆM',55,80,43,'#426c64',700);
 SAFETY_RULES.slice(0,9).forEach((rule,i)=>{c.fillStyle=i%2?'#e3e9de':'#d7e4de';c.fillRect(45,125+i*70,1110,62);text(c,String(i+1).padStart(2,'0'),65,168+i*70,28,'#658d81',700);text(c,rule.title,145,168+i*70,30);});
 text(c,'Đọc đầy đủ hướng dẫn trong bài học trước khi thao tác.',55,825,25);
}

export function PrintedBoardAsset({kind='periodic'}:{kind?:BoardKind}){
 const dims=kind==='lesson'?[5.2,1.8]:kind==='periodic'?[2.8,1.6]:[1.2,.85],pixels=kind==='lesson'?[1560,540]:kind==='periodic'?[1400,800]:[1200,850];
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');[canvas.width,canvas.height]=pixels;const c=canvas.getContext('2d')!;({periodic:drawPeriodic,evacuation:drawEvacuation,lesson:drawLesson,rules:drawRules})[kind](c);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;},[kind]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <group name={`asset-${kind}-board`} userData={{assetId:kind+'-board'}}><BoardFrame width={dims[0]} height={dims[1]}>
  <mesh position={[0,dims[1]/2,.025]}><planeGeometry args={[dims[0]-.075,dims[1]-.075]}/><meshStandardMaterial map={texture} roughness={.8}/></mesh>
 </BoardFrame>
 {kind==='lesson'&&<group name="whiteboard-tray"><Solid size={[3.2,.02,.09]} at={[0,.01,.075]} color="#8aa5b2"/><Solid size={[3.2,.03,.008]} at={[0,.035,.116]} color="#8aa5b2"/>{[-.7,-.4,-.1].map((x,i)=><group key={x} position={[x,.02,.07]} rotation={[0,Math.PI/2,0]}><MarkerAsset color={['#668ca2','#a1796c','#739b89'][i]}/></group>)}<group position={[.7,.02,.07]}><EraserAsset/></group></group>}
 </group>;
}
