import React, { useRef, useState } from 'react';
import { useLabStore } from '../../store/useLabStore';
import { EquipmentRenderer } from '../equipment/EquipmentRenderer';
import { PourStreamVfx } from '../vfx/PourStreamVfx';
import { EquipmentType } from '../../types/equipment';

export const Workbench: React.FC = () => {
  const {
    equipment,
    selectedEquipmentId,
    selectEquipment,
    updatePosition,
    toggleHeat,
    tareEquipment,
    toggleBuretteStopcock,
    language,
    activePourVfx,
    draggedChemicalId,
    setDraggedChemicalId,
    addChemicalToEquipment,
    addEquipment,
    triggerDirectPour,
  } = useLabStore();

  const workbenchRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    selectEquipment(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const eq = equipment[id];
    if (eq && workbenchRef.current) {
      const rect = workbenchRef.current.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      setDraggingId(id);
      setDragOffset({
        x: pointerX - eq.x,
        y: pointerY - eq.y,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !workbenchRef.current) return;

    const rect = workbenchRef.current.getBoundingClientRect();
    const currentPointerX = e.clientX - rect.left;
    const currentPointerY = e.clientY - rect.top;

    const newX = Math.max(20, Math.min(rect.width - 150, currentPointerX - dragOffset.x));
    const newY = Math.max(20, Math.min(rect.height - 200, currentPointerY - dragOffset.y));

    updatePosition(draggingId, newX, newY);

    // Check collision / hover over another vessel for transfer
    const draggingEq = equipment[draggingId];
    if (draggingEq) {
      let foundTarget: string | null = null;
      for (const [otherId, otherEq] of Object.entries(equipment)) {
        if (otherId === draggingId) continue;
        const dx = Math.abs(newX - otherEq.x);
        const dy = Math.abs(newY - otherEq.y);
        if (dx < 110 && dy < 110 && otherEq.isContainer) {
          foundTarget = otherId;
          break;
        }
      }
      setHoverTargetId(foundTarget);
    }
  };

  const handlePointerUp = () => {
    if (draggingId) {
      if (hoverTargetId && equipment[draggingId]?.contents.length > 0) {
        // Trigger realistic direct pouring stream & sound effect
        triggerDirectPour(draggingId, hoverTargetId);
      }
      setDraggingId(null);
      setHoverTargetId(null);
    }
  };

  // HTML5 Drag and Drop handlers for dropping chemicals or apparatus onto workbench
  const handleWorkbenchDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleWorkbenchDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!workbenchRef.current) return;
    const rect = workbenchRef.current.getBoundingClientRect();
    const dropX = Math.max(20, Math.min(rect.width - 160, e.clientX - rect.left - 70));
    const dropY = Math.max(20, Math.min(rect.height - 200, e.clientY - rect.top - 80));

    // Handle dragged equipment from sidebar
    const eqType = e.dataTransfer.getData('application/equipment-type') as EquipmentType;
    if (eqType) {
      addEquipment(eqType, dropX, dropY);
      return;
    }

    // Handle chemical dropped onto empty workbench: automatically spawn a beaker and fill it!
    const chemId = e.dataTransfer.getData('text/plain') || draggedChemicalId;
    if (chemId) {
      const newVesselId = addEquipment('beaker', dropX, dropY);
      setTimeout(() => {
        addChemicalToEquipment(newVesselId, chemId, 25);
      }, 50);
      setDraggedChemicalId(null);
    }
  };

  const handleVesselDrop = (e: React.DragEvent, vesselId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const chemId = e.dataTransfer.getData('text/plain') || draggedChemicalId;
    const targetEq = equipment[vesselId];
    if (chemId && targetEq && targetEq.isContainer) {
      addChemicalToEquipment(vesselId, chemId, 25);
      setDraggedChemicalId(null);
    }
  };

  const allEquipmentList = Object.values(equipment);

  return (
    <div
      ref={workbenchRef}
      className="relative flex-1 w-full h-full bg-[#f8fafc] overflow-hidden select-none cursor-default"
      style={{
        backgroundImage: `radial-gradient(#cbd5e1 1.2px, transparent 1.2px)`,
        backgroundSize: '24px 24px',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragOver={handleWorkbenchDragOver}
      onDrop={handleWorkbenchDrop}
      onClick={() => selectEquipment(null)}
    >
      {/* Subtle Workbench Depth Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-slate-200/30 pointer-events-none" />

      {/* Empty State Banner */}
      {allEquipmentList.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M10 2v7.31L4.83 18.2A2 2 0 0 0 6.55 21h10.9a2 2 0 0 0 1.72-2.8L14 9.31V2" />
              <path d="M8.5 2h7" />
              <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
            </svg>
          </div>
          <p className="text-base font-medium text-slate-600">
            {language === 'vi' ? 'Bàn thí nghiệm đang trống' : 'Workbench is ready'}
          </p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
            {language === 'vi'
              ? 'Kéo thả dụng cụ hoặc hóa chất từ bảng bên trái vào bàn để bắt đầu thí nghiệm.'
              : 'Drag & drop apparatus or chemicals from the sidebar to start your experiment.'}
          </p>
        </div>
      )}

      {/* Active Pouring Fluid Arc VFX */}
      {activePourVfx && (
        <PourStreamVfx
          startX={activePourVfx.startX}
          startY={activePourVfx.startY}
          endX={activePourVfx.endX}
          endY={activePourVfx.endY}
          liquidColorHex={activePourVfx.liquidColorHex}
        />
      )}

      {/* Laboratory Equipment Items on Workbench */}
      {allEquipmentList.map(item => {
        const isDragging = draggingId === item.id;
        const isHoverTarget = hoverTargetId === item.id;
        const isPouring = activePourVfx?.sourceId === item.id;

        return (
          <div
            key={item.id}
            className={`absolute transition-shadow ${
              isDragging ? 'z-50 opacity-90 scale-105' : 'z-10'
            } ${isHoverTarget ? 'ring-4 ring-emerald-400/80 rounded-2xl' : ''}`}
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              touchAction: 'none',
            }}
            onPointerDown={e => handlePointerDown(item.id, e)}
            onDragOver={e => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={e => handleVesselDrop(e, item.id)}
          >
            <EquipmentRenderer
              equipment={item}
              isSelected={selectedEquipmentId === item.id}
              isPouring={isPouring}
              onSelect={() => selectEquipment(item.id)}
              onToggleHeat={() => toggleHeat(item.id)}
              onTare={() => tareEquipment(item.id)}
              onToggleBurette={() => toggleBuretteStopcock(item.id)}
              language={language}
            />
          </div>
        );
      })}
    </div>
  );
};
