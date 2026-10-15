import React from 'react';
import { FireExtinguisher, Brush, Trash2 } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';
const SLOTS = [
  { id: 'extinguisher', label: 'Bình CO₂', inventory: 'hasFireExtinguisher', Icon: FireExtinguisher },
  { id: 'spillKit', label: 'Spill Kit', inventory: 'hasSweeper', Icon: Brush },
  { id: 'waste', label: 'Chất thải', inventory: 'isHoldingTrash', Icon: Trash2 },
] as const;
export function ToolBar() {
  const active = useStore(s => s.activeTool), inventory = useStore(s => s.player.inventory);
  const blocked = useStore(isSceneInputBlocked), select = useStore(s => s.selectTool);
  return <div data-ui role="toolbar" aria-label="Dụng cụ" className="tool-bar fixed left-1/2 bottom-4 -translate-x-1/2 z-30 flex gap-1.5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg">
    {SLOTS.map(({id,label,inventory:key,Icon},index) => <button key={id} data-tool={id} aria-label={`Ô ${index+1}: ${label}`} aria-pressed={active===id} disabled={blocked || !inventory[key]} onClick={() => select(active === id ? null : id)} className={`relative grid h-14 w-20 place-items-center rounded-xl border text-[10px] font-semibold transition disabled:opacity-40 ${active === id ? 'border-cyan-500 bg-cyan-50 text-cyan-800' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}>
      <span className="absolute top-1 left-1.5 text-[9px] text-slate-600">{index+1}</span><Icon className="h-5 w-5" /><span>{inventory[key] ? label : 'Trống'}</span>
    </button>)}
  </div>;
}
