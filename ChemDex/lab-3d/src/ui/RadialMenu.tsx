import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  Hand, RotateCw, Eye, Tag, Trash2, Copy, Sparkles, Lock, Unlock, X 
} from 'lucide-react';

export interface RadialMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetVesselId: string;
}

type RadialListener = (state: RadialMenuState | null) => void;
const radialListeners = new Set<RadialListener>();

export function openRadialMenu(x: number, y: number, targetVesselId: string) {
  const s: RadialMenuState = { isOpen: true, x, y, targetVesselId };
  for (const l of radialListeners) l(s);
}

export function closeRadialMenu() {
  for (const l of radialListeners) l(null);
}

export const RadialMenu: React.FC = () => {
  const [menu, setMenu] = useState<RadialMenuState | null>(null);
  const lang = useAppStore(state => state.language);
  const vessels = useAppStore(state => state.vessels);
  const removeVessel = useAppStore(state => state.removeVessel);
  const duplicateVessel = useAppStore(state => state.duplicateVessel);
  const rotateVessel = useAppStore(state => state.rotateVessel);
  const toggleLockVessel = useAppStore(state => state.toggleLockVessel);
  const focusVessel = useAppStore(state => state.focusVessel);
  const cleanVesselStain = useAppStore(state => state.cleanVesselStain);
  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const draggingVesselId = useAppStore(state => state.draggingVesselId);

  useEffect(() => {
    const onRadial = (s: RadialMenuState | null) => setMenu(s);
    radialListeners.add(onRadial);
    return () => { radialListeners.delete(onRadial); };
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Find if clicking over a vessel in store
      const selectedId = useAppStore.getState().selectedVesselId || useAppStore.getState().hoveredVesselId;
      if (selectedId && useAppStore.getState().vessels[selectedId]) {
        e.preventDefault();
        openRadialMenu(e.clientX, e.clientY, selectedId);
      }
    };

    const handlePointerDown = () => {
      if (menu?.isOpen) {
        closeRadialMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menu?.isOpen) {
        closeRadialMenu();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menu]);

  if (!menu || !menu.isOpen) return null;

  const targetVessel = vessels[menu.targetVesselId];
  if (!targetVessel) return null;

  const isLocked = targetVessel.isLocked;
  const isHeld = draggingVesselId === menu.targetVesselId;

  const items = [
    {
      id: 'grab',
      icon: Hand,
      label_en: isHeld ? 'Release' : 'Grab',
      label_vi: isHeld ? 'Đặt xuống' : 'Cầm lên',
      action: () => {
        setDraggingVesselId(isHeld ? null : menu.targetVesselId);
        setMenu(null);
      },
      color: 'hover:bg-cyan-500/20 text-cyan-400'
    },
    {
      id: 'rotate',
      icon: RotateCw,
      label_en: 'Rotate 45°',
      label_vi: 'Xoay 45°',
      action: () => {
        rotateVessel(menu.targetVesselId, Math.PI / 4);
        setMenu(null);
      },
      color: 'hover:bg-amber-500/20 text-amber-400'
    },
    {
      id: 'inspect',
      icon: Eye,
      label_en: 'Focus',
      label_vi: 'Tập trung',
      action: () => {
        focusVessel(menu.targetVesselId);
        setMenu(null);
      },
      color: 'hover:bg-sky-500/20 text-sky-400'
    },
    {
      id: 'lock',
      icon: isLocked ? Unlock : Lock,
      label_en: isLocked ? 'Unlock' : 'Lock',
      label_vi: isLocked ? 'Mở khóa' : 'Khóa vị trí',
      action: () => {
        toggleLockVessel(menu.targetVesselId);
        setMenu(null);
      },
      color: 'hover:bg-violet-500/20 text-violet-400'
    },
    {
      id: 'clean',
      icon: Sparkles,
      label_en: 'Clean Wall',
      label_vi: 'Tẩy cặn',
      action: () => {
        cleanVesselStain(menu.targetVesselId);
        setMenu(null);
      },
      color: 'hover:bg-emerald-500/20 text-emerald-400'
    },
    {
      id: 'duplicate',
      icon: Copy,
      label_en: 'Duplicate',
      label_vi: 'Nhân bản',
      action: () => {
        duplicateVessel(menu.targetVesselId);
        setMenu(null);
      },
      color: 'hover:bg-blue-500/20 text-blue-400'
    },
    {
      id: 'discard',
      icon: Trash2,
      label_en: 'Discard',
      label_vi: 'Dọn bỏ',
      action: () => {
        removeVessel(menu.targetVesselId);
        setMenu(null);
      },
      color: 'hover:bg-rose-500/20 text-rose-400'
    }
  ];

  // Position bounded in viewport
  const radius = 80; // px
  const centerX = Math.min(window.innerWidth - radius - 30, Math.max(radius + 30, menu.x));
  const centerY = Math.min(window.innerHeight - radius - 30, Math.max(radius + 30, menu.y));

  return (
    <div 
      className="fixed z-50 pointer-events-auto"
      style={{ left: centerX, top: centerY }}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Central target badge */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-slate-900/95 border border-slate-700/80 shadow-2xl flex flex-col items-center justify-center p-1 backdrop-blur-md">
        <span className="text-[10px] font-bold text-slate-200 truncate max-w-[48px]">
          {targetVessel.name.split(' ')[0]}
        </span>
        <span className="text-[8px] text-cyan-400 font-mono">
          {targetVessel.volume_ml} mL
        </span>
      </div>

      {/* Radial action buttons arranged in a ring */}
      {items.map((item, index) => {
        const angle = (index / items.length) * 2 * Math.PI - Math.PI / 2;
        const btnX = Math.cos(angle) * radius;
        const btnY = Math.sin(angle) * radius;

        const Icon = item.icon;
        const label = lang === 'vi' ? item.label_vi : item.label_en;

        return (
          <button
            key={item.id}
            onClick={(e) => {
              e.stopPropagation();
              item.action();
            }}
            style={{
              transform: `translate(${btnX - 22}px, ${btnY - 22}px)`
            }}
            className={`absolute w-11 h-11 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl flex flex-col items-center justify-center transition-all duration-150 active:scale-90 group backdrop-blur-md ${item.color}`}
            title={label}
          >
            <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="text-[7.5px] font-semibold text-slate-300 opacity-90 truncate max-w-[38px] leading-tight">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
