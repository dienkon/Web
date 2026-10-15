import { AcidPourGame } from '../../ui/AcidPourGame';
import React, { useEffect, useRef, useState } from 'react';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LabItem, useLabEquipment } from '../../../store/useLabEquipment';
import { playerCoords, useStore } from '../../../store/useStore';
import { useInteractionStore } from '../../../core/InteractionSystem';
import { interactionBus, INTERACTION_PRIORITY } from '../../../systems/input/InteractionBus';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';
import { SceneHtml } from '../SceneHtml';
import { LabInstrumentGame } from '../../ui/LabInstrumentGame';

export function handleLabItemClick(event: ThreeEvent<MouseEvent>) {
  if (isSceneInputBlocked()) return;
  let object: THREE.Object3D | null = event.object;
  while (object && !object.userData.labEntryId) object = object.parent;
  if (!object) return;
  event.stopPropagation();
  window.dispatchEvent(new CustomEvent('lab-use-equipment', {detail: object.userData.labEntryId}));
}

export function LabEquipmentController() {
  const {scene} = useThree();
  const [current, setCurrent] = useState<LabItem | null>(null);
  const [catalog,setCatalog]=useState(false),[query,setQuery]=useState('');
  const items=useLabEquipment(s=>s.items), progress=useLabEquipment(s=>s.progress);
  const blocked=useStore(isSceneInputBlocked);
  const objects=useRef(new Map<string,THREE.Object3D>());
  const startTime=useStore(s=>s.startTime);
  useEffect(()=>{useLabEquipment.getState().reset();setCurrent(null);setCatalog(false);},[startTime]);
  useEffect(()=>{
    // Descendant metadata describes whole functional objects, never individual screws.
    const scan=()=>{
      scene.updateMatrixWorld(true);
      const entries:LabItem[]=[];const point=new THREE.Vector3();
      scene.traverse(object=>{
        const metadata=object.userData.labItem;
        if(!metadata)return;
        const id=metadata.id??object.uuid;
        object.userData.labEntryId=id;
        object.getWorldPosition(point);
        entries.push({...metadata,id,position:point.toArray() as [number,number,number]});
        objects.current.set(id,object);
      });
      useLabEquipment.getState().setItems(entries);
    };
    scan();const timer=setTimeout(scan,600);
    return()=>{clearTimeout(timer);objects.current.clear();};
  },[scene]);
  useEffect(()=>{
    const store=useInteractionStore.getState();
    for (const item of items) {
      const object = objects.current.get(item.id);
      if (!object) continue;
      const bounds = new THREE.Box3().setFromObject(object);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const ambient = ['ventilation', 'clock', 'smokeAlarm'].includes(item.kind);
      store.register({
        id: `equipment:${item.id}`,
        position: item.position,
        aimPosition: center.toArray() as [number, number, number],
        label: `Dùng: ${item.title}`,
        isActive: !blocked && !ambient && center.y <= 2.5,
        priority: .45,
        reach: 1.9,
        radius: Math.max(.12, Math.min(.4, Math.max(size.x, size.y) * .25)),
        object,
        requireSurfaceHit: true,
      });
    }
    return()=>{for(const item of items)useInteractionStore.getState().unregister(`equipment:${item.id}`);};
  },[items,blocked]);
  useEffect(()=>{
    const open=(id:string)=>{
      if(isSceneInputBlocked() || useInteractionStore.getState().nearestId !== `equipment:${id}`)return;
      const item=useLabEquipment.getState().items.find(e=>e.id===id);if(!item)return;
      if(Math.hypot(item.position[0]-playerCoords.position[0],item.position[2]-playerCoords.position[2])>2.5){useLabEquipment.getState().navigate(item);return;}
      useLabEquipment.getState().navigate(null);setCurrent(item);
    };
    const useItem=(e:Event)=>open((e as CustomEvent<string>).detail);
    const openCatalog=()=>{if(!isSceneInputBlocked()){setQuery('');setCatalog(true);}};
    window.addEventListener('lab-use-equipment',useItem);window.addEventListener('lab-open-equipment',openCatalog);
    const off=interactionBus.subscribe({priority:INTERACTION_PRIORITY.TARGET,isActive:()=>!isSceneInputBlocked()&&!!useInteractionStore.getState().nearestId?.startsWith('equipment:'),onInteract:()=>{const id=useInteractionStore.getState().nearestId;if(id)open(id.slice(10));}});
    return()=>{window.removeEventListener('lab-use-equipment',useItem);window.removeEventListener('lab-open-equipment',openCatalog);off();};
  },[]);
  const tick=useRef(0);
  useFrame((_,delta)=>{
    tick.current+=delta;if(tick.current<.1)return;tick.current=0;
    for(const [id,object] of objects.current){
      const state=useLabEquipment.getState().progress[id];
      const kind=object.userData.labItem.kind;
      if(!object.userData.initialPosition)object.userData.initialPosition=object.position.clone();
      if(!object.userData.initialRotation)object.userData.initialRotation=object.rotation.clone();
      if(kind==='seat')object.rotation.y=object.userData.initialRotation.y+(state?.active?Math.PI/2:0);
      if(kind==='drawer')object.position.z=object.userData.initialPosition.z+(state?.active ? .22:0);
      if(kind==='door'){
        const left=object.getObjectByName('door-leaf-left'),right=object.getObjectByName('door-leaf-right');
        if(left)left.rotation.y=state?.active?1.15:0;
        if(right)right.rotation.y=state?.active?-1.15:0;
      }
    }
  });
  const visibleItems=items.filter(item=>item.title.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  return <group name="equipment-interactions">
    {current&&<SceneHtml zIndexRange={[1100,0]}>{current.kind==='acid'?<AcidPourGame onClose={()=>setCurrent(null)} onComplete={()=>{useLabEquipment.getState().record(current.id);useStore.getState().completeTask('task_inspect_acid');setCurrent(null);}}/>:<LabInstrumentGame key={current.id} item={current} onClose={()=>setCurrent(null)}/>}</SceneHtml>}
    {catalog&&<SceneHtml zIndexRange={[1100,0]}><div role="dialog" aria-modal="true" aria-labelledby="equipment-title" className="fixed inset-0 pointer-events-auto flex items-center justify-center bg-slate-100/80 backdrop-blur-none p-4 text-slate-800"><section className="w-full max-w-3xl max-h-[92dvh] flex flex-col bg-white border border-cyan-700 rounded-3xl overflow-hidden"><header className="p-5 border-b border-slate-200 flex gap-4 justify-between"><div><p className="text-xs text-cyan-700 uppercase">Khám phá phòng thí nghiệm</p><h2 id="equipment-title" className="text-xl font-bold">Sổ dụng cụ • {items.length} đồ tương tác</h2><p className="text-sm text-slate-600 mt-1">Đến gần rồi bấm E hoặc chạm trực tiếp để dùng.</p></div><button aria-label="Đóng sổ dụng cụ" onClick={()=>setCatalog(false)} className="self-start px-3 py-2 rounded-xl bg-slate-50">✕</button></header>
      <div className="p-4"><input aria-label="Tìm dụng cụ" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm cân, cốc, vòi, tủ, ghế…" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400"/></div>
      <div className="overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 pb-5">{visibleItems.map(item=>{
        const distance=Math.hypot(item.position[0]-playerCoords.position[0],item.position[2]-playerCoords.position[2]);
        return <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between gap-2"><h3 className="font-bold text-sm">{item.title}</h3><span className="text-xs text-cyan-700 whitespace-nowrap">{distance.toFixed(1)} m</span></div><p className="text-xs text-slate-600 my-2">{progress[item.id]?.completed?'✓ Đã thực hành':'Chưa thực hành'}</p><button className="acid-action text-xs w-full" onClick={()=>{setCatalog(false);useLabEquipment.getState().navigate(item);}}>Dẫn đường đến dụng cụ</button></article>;
      })}{visibleItems.length===0&&<p className="p-4 text-slate-600">Không tìm thấy dụng cụ phù hợp.</p>}</div>
    </section></div></SceneHtml>}
  </group>;
}
