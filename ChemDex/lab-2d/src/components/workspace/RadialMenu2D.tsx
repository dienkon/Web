import React, { useEffect, useRef } from 'react';
import {
  ArrowRightLeft,
  RotateCw,
  Droplet,
  Pipette,
  Eraser,
  Lock,
  Unlock,
  Trash2,
  Flame,
} from 'lucide-react';
import { EquipmentState } from '../../types/equipment';
import { useLabStore } from '../../store/useLabStore';

interface RadialMenu2DProps {
  equipment: EquipmentState | null;
  anchorX: number;
  anchorY: number;
  onClose: () => void;
}

export const RadialMenu2D: React.FC<RadialMenu2DProps> = ({
  equipment,
  anchorX,
  anchorY,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    language,
    openTransferModal,
    toggleStir,
    addDistilledWater,
    emptyEquipment,
    toggleSeal,
    removeEquipment,
    drawWithPipette,
    dispenseFromPipette,
    pipetteBuffer,
    toggleHeat,
    toggleBuretteStopcock,
  } = useLabStore();

  const vi = language === 'vi';

  useEffect(() => {
    if (!equipment) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [equipment, onClose]);

  if (!equipment) return null;

  type RadialAction = {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    tone?: string;
  };

  const actions: RadialAction[] = [];

  if (equipment.isContainer) {
    if (equipment.volume_ml > 0) {
      actions.push({
        id: 'pour',
        label: vi ? 'Rót sang' : 'Pour',
        icon: <ArrowRightLeft size={14} />,
        onClick: () => openTransferModal(equipment.id),
        tone: 'hover:bg-blue-600 hover:text-white',
      });
    }
    actions.push({
      id: 'stir',
      label: equipment.isStirred ? (vi ? 'Dừng khuấy' : 'Stop') : (vi ? 'Khuấy' : 'Stir'),
      icon: <RotateCw size={14} className={equipment.isStirred ? 'animate-spin' : ''} />,
      onClick: () => toggleStir(equipment.id),
      tone: equipment.isStirred ? 'bg-blue-600 text-white' : 'hover:bg-cyan-600 hover:text-white',
    });
    actions.push({
      id: 'water',
      label: '+25mL H₂O',
      icon: <Droplet size={14} className="text-sky-500" />,
      onClick: () => addDistilledWater(equipment.id, 25),
      tone: 'hover:bg-sky-600 hover:text-white',
    });
    if (pipetteBuffer) {
      actions.push({
        id: 'dispense',
        label: vi ? 'Nhỏ Pipet' : 'Drop',
        icon: <Pipette size={14} className="text-amber-500" />,
        onClick: () => dispenseFromPipette(equipment.id, Math.min(2, pipetteBuffer.volume_ml), 0),
        tone: 'hover:bg-amber-600 hover:text-white',
      });
    } else if (equipment.volume_ml > 0.2) {
      actions.push({
        id: 'draw',
        label: vi ? 'Hút 5mL' : 'Draw 5mL',
        icon: <Pipette size={14} className="text-amber-500" />,
        onClick: () => drawWithPipette(equipment.id, 5),
        tone: 'hover:bg-amber-600 hover:text-white',
      });
    }
    if (equipment.type === 'burette' || equipment.type === 'separatory_funnel') {
      actions.push({
        id: 'valve',
        label: equipment.stopcockOpen ? (vi ? 'Đóng khóa' : 'Close Valve') : (vi ? 'Mở khóa' : 'Open Valve'),
        icon: <Droplet size={14} />,
        onClick: () => toggleBuretteStopcock(equipment.id),
        tone: equipment.stopcockOpen ? 'bg-emerald-600 text-white' : 'hover:bg-emerald-600 hover:text-white',
      });
    }
    actions.push({
      id: 'seal',
      label: equipment.isSealed ? (vi ? 'Mở nút' : 'Unseal') : (vi ? 'Đậy nút' : 'Seal'),
      icon: equipment.isSealed ? <Lock size={14} /> : <Unlock size={14} />,
      onClick: () => toggleSeal(equipment.id),
      tone: equipment.isSealed ? 'bg-amber-600 text-white' : 'hover:bg-amber-600 hover:text-white',
    });
    if (equipment.volume_ml > 0) {
      actions.push({
        id: 'rinse',
        label: vi ? 'Tráng rửa' : 'Rinse',
        icon: <Eraser size={14} />,
        onClick: () => emptyEquipment(equipment.id),
        tone: 'hover:bg-amber-600 hover:text-white',
      });
    }
  } else if (equipment.type === 'bunsen_burner' || equipment.type === 'hot_plate') {
    actions.push({
      id: 'heat',
      label: equipment.isOn ? (vi ? 'Tắt nhiệt' : 'Turn Off') : (vi ? 'Bật nhiệt' : 'Ignite'),
      icon: <Flame size={14} />,
      onClick: () => toggleHeat(equipment.id),
      tone: equipment.isOn ? 'bg-orange-600 text-white' : 'hover:bg-orange-600 hover:text-white',
    });
  }

  actions.push({
    id: 'delete',
    label: vi ? 'Xóa' : 'Remove',
    icon: <Trash2 size={14} />,
    onClick: () => removeEquipment(equipment.id),
    tone: 'text-rose-500 hover:bg-rose-600 hover:text-white',
  });

  const radius = Math.max(68, Math.min(96, actions.length * 12));
  const clampedX = Math.max(radius + 38, Math.min(window.innerWidth - radius - 38, anchorX));
  const clampedY = Math.max(radius + 38, Math.min(window.innerHeight - radius - 38, anchorY));

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={vi ? 'Thao tác nhanh dụng cụ' : 'Quick equipment radial menu'}
      className="fixed z-50 pointer-events-auto"
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`,
      }}
    >
      {/* Center ring close hub */}
      <button
        type="button"
        onClick={onClose}
        className="absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/92 text-white border border-slate-700 shadow-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
        title={vi ? 'Đóng menu' : 'Close menu'}
      >
        ✕
      </button>

      {actions.map((act, idx) => {
        const angle = (idx / actions.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <button
            key={act.id}
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              act.onClick();
              onClose();
            }}
            style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            className={`lab-popover absolute left-0 top-0 flex flex-col items-center justify-center w-[70px] h-[54px] rounded-2xl bg-white/95 backdrop-blur-md text-slate-700 border border-slate-200/90 shadow-lg text-[11px] font-bold transition-all hover:scale-105 cursor-pointer ${act.tone || ''}`}
          >
            {act.icon}
            <span className="mt-1 truncate max-w-[64px]">{act.label}</span>
          </button>
        );
      })}
    </div>
  );
};
