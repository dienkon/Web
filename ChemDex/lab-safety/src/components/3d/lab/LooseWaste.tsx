import React, { useState } from 'react';
import { InteractableItem } from '../InteractableItem';
import { useStore, playerCoords } from '../../../store/useStore';
import { WASTE_SAMPLES } from '../../../data/wasteSamples';
import { SceneHtml } from '../SceneHtml';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';
import { soundManager } from '../../../audio/soundManager';

const EMPTY_PICKED: string[] = [];
export function LooseWaste() {
  const available = useStore(s => s.view === 'game' && s.currentPhase === 3
    && !!s.tasks.find(t => t.id === 'task_spill_wipe')?.completed
    && !s.tasks.find(t => t.id === 'task_trash_disposal')?.completed);
  const picked = useStore(s => s.player.flags.wastePicked ?? EMPTY_PICKED);
  const [collecting, setCollecting] = useState<string | null>(null);
  const [sweeps, setSweeps] = useState(0);
  const [hint, setHint] = useState('');
  const sample = WASTE_SAMPLES.find(s => s.id === collecting);
  const begin = (id: string) => {
    const s = useStore.getState();
    if (!available || isSceneInputBlocked()) return;
    if (s.player.inventory.isHoldingTrash) { s.startDialog(['Bạn đang cầm một mẫu. Hãy phân loại mẫu đó ở trạm rác trước khi thu gom mẫu tiếp theo.']); return; }
    if (!s.player.equipment.hasGloves || !s.player.equipment.hasGoggles) { s.startDialog(['Trang bị kính và găng tay trước khi thu gom. Mảnh vỡ phải dùng chổi và hốt rác, không nhặt bằng tay.']); return; }
    if (!s.player.inventory.hasSweeper) { s.startDialog(['Đến thùng Spill Kit ở tường Tây để lấy chổi và hốt rác trước.']); return; }
    s.selectTool('spillKit'); setSweeps(0); setHint('Quét từ ngoài vào trong, sau đó dùng hốt rác thu gom.'); setCollecting(id);
  };
  const collect = () => {
    if (!sample || sweeps < 3) return;
    const s = useStore.getState();
    if (s.player.inventory.isHoldingTrash || s.player.flags.wastePicked?.includes(sample.id)) return;
    useStore.setState(state => ({ activeTool: 'waste', player: { ...state.player,
      inventory: { ...state.player.inventory, isHoldingTrash: true, heldTrashType: sample.kind, heldWasteId: sample.id },
      flags: { ...state.player.flags, wastePicked: [...(state.player.flags.wastePicked ?? []), sample.id] } } }));
    soundManager.play('success'); setCollecting(null);
  };
  if (!available) return null;
  return <group name="loose-waste-samples">
    {WASTE_SAMPLES.filter(s => !picked.includes(s.id)).map(s => <InteractableItem key={s.id} id={`loose-waste-${s.id}`} position={[...s.position]} label={`Thu gom: ${s.title}`} type="learn" dialogCallback={() => begin(s.id)}>
      <group name={`waste-sample-${s.id}`}>
        {s.kind === 'sharps' ? [-.1, 0, .1].map((x,i)=><mesh key={x} position={[x,.01,Math.sin(i)*.1]} rotation={[-Math.PI/2,0,i*.7]}><circleGeometry args={[.09,3]}/><meshStandardMaterial color="#7dd3fc" metalness={.4} roughness={.2} side={2}/></mesh>) : <mesh scale={[1,.35,.8]} rotation={[0,.5,0]}><icosahedronGeometry args={[.14,0]}/><meshStandardMaterial color={s.kind === 'chemical' ? '#facc15' : '#f1f5f9'} flatShading roughness={1}/></mesh>}
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.025,0]}><ringGeometry args={[.22,.25,24]}/><meshBasicMaterial color={s.kind === 'sharps' ? '#fb7185' : '#facc15'} toneMapped={false}/></mesh>
        <SceneHtml position={[0,.45,0]}><span className="rounded-lg border border-amber-400 bg-slate-100/80 px-2 py-1 text-[10px] text-amber-700 whitespace-nowrap">♻ {s.title}</span></SceneHtml>
      </group>
    </InteractableItem>)}
    {sample && <SceneHtml zIndexRange={[1000,0]}><div role="dialog" aria-modal="true" aria-label="Thu gom mẫu rác" className="fixed inset-0 bg-slate-100/80 backdrop-blur-none flex items-center justify-center p-4 pointer-events-auto text-slate-800"><section className="max-w-lg w-full rounded-3xl bg-white border border-cyan-700 p-6">
      <header className="flex justify-between"><h2 className="font-bold text-xl">{sample.title}</h2><button onClick={()=>setCollecting(null)} aria-label="Đóng thu gom">✕</button></header>
      <div className="relative h-44 my-4 bg-slate-50 rounded-xl overflow-hidden"><div className="absolute inset-0 flex items-center justify-center text-5xl" style={{transform:`translateX(${sweeps*20}px)`,opacity:1-sweeps*.2}}>{sample.kind==='sharps'?'◭ ◮ ◬':sample.kind==='chemical'?'🟨 🟨':'📄 📄'}</div><div className="absolute bottom-4 right-5 text-5xl">🧹</div></div>
      <p role="status" className="text-sm text-cyan-700 mb-4">{hint} ({sweeps}/3 lượt)</p>
      {sweeps<3?<button className="acid-action" onClick={()=>{setSweeps(v=>Math.min(3,v+1));soundManager.play('snap');if(sweeps===2)setHint('Mẫu đã được gom gọn. Dùng hốt rác và chứa đúng loại.');}}>Quét mẫu vào vùng thu gom</button>:<button className="acid-action" onClick={collect}>Hốt vào {sample.kind==='sharps'?'hộp cứng chống đâm thủng':sample.kind==='chemical'?'túi chất thải hóa chất':'túi rác sinh hoạt'}</button>}
      <p className="text-xs text-slate-600 mt-4">Mẫu huấn luyện đã được giáo viên xác định. Với hóa chất tràn chưa biết, hãy cô lập và báo giáo viên.</p>
    </section></div></SceneHtml>}
  </group>;
}
