import { CrumpledPaperAsset, GlassShardsAsset } from '../assets/WasteAssets';
import React, { useState } from 'react';
import { PracticalSimulation } from '../../ui/PracticalSimulation';
import { collectionWork } from '../../../data/practicalWork';
import { InteractableItem } from '../InteractableItem';
import { useStore } from '../../../store/useStore';
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
  const sample = WASTE_SAMPLES.find(s => s.id === collecting);
  const begin = (id: string) => {
    const s = useStore.getState();
    if (!available || isSceneInputBlocked()) return;
    if (s.player.inventory.isHoldingTrash) { s.startDialog(['Bạn đang cầm một mẫu. Hãy phân loại mẫu đó ở trạm rác trước khi thu gom mẫu tiếp theo.']); return; }
    if (!s.player.equipment.hasGloves || !s.player.equipment.hasGoggles) { s.startDialog(['Trang bị kính và găng tay trước khi thu gom. Mảnh vỡ phải dùng chổi và hốt rác, không nhặt bằng tay.']); return; }
    if (!s.player.inventory.hasSweeper) { s.startDialog(['Đến thùng Spill Kit ở tường Tây để lấy chổi và hốt rác trước.']); return; }
    s.selectTool('spillKit'); setCollecting(id);
  };
  const collect = () => {
    if (!sample) return;
    const s = useStore.getState();
    if (s.player.inventory.isHoldingTrash || s.player.flags.wastePicked?.includes(sample.id)) return;
    useStore.setState(state => ({ activeTool: 'waste', player: { ...state.player,
      inventory: { ...state.player.inventory, isHoldingTrash: true, heldTrashType: sample.kind, heldWasteId: sample.id },
      flags: { ...state.player.flags, wastePicked: [...(state.player.flags.wastePicked ?? []), sample.id] } } }));
    soundManager.play('success'); useStore.getState().saveGame(); setCollecting(null);
  };
  if (!available) return null;
  return <group name="loose-waste-samples">
    {WASTE_SAMPLES.filter(s => !picked.includes(s.id)).map(s => <InteractableItem key={s.id} id={`loose-waste-${s.id}`} position={[...s.position]} label={`Thu gom: ${s.title}`} type="learn" dialogCallback={() => begin(s.id)}>
      <group name={`waste-sample-${s.id}`}>
        {s.kind==='sharps'?<GlassShardsAsset/>:<CrumpledPaperAsset contaminated={s.kind==='chemical'}/>}
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,.001,0]}><ringGeometry args={[.22,.25,24]}/><meshBasicMaterial color={s.kind === 'sharps' ? '#fb7185' : '#facc15'} toneMapped={false}/></mesh>
        <SceneHtml position={[0,.45,0]}><span className="rounded-lg border border-amber-400 bg-slate-100/80 px-2 py-1 text-[10px] text-amber-700 whitespace-nowrap">♻ {s.title}</span></SceneHtml>
      </group>
    </InteractableItem>)}
    {sample && <SceneHtml zIndexRange={[1500,0]}><PracticalSimulation key={sample.id} work={collectionWork(sample.title,sample.kind==='sharps',sample.kind==='chemical')} onClose={()=>setCollecting(null)} onComplete={collect}/></SceneHtml>}
  </group>;
}
