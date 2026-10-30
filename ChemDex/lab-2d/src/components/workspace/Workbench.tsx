import {useShallow} from 'zustand/react/shallow';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLabStore } from '../../store/useLabStore';
import { EquipmentRenderer } from '../equipment/EquipmentRenderer';
import { PourStreamVfx } from '../vfx/PourStreamVfx';
import { EquipmentType } from '../../types/equipment';
import { soundEngine } from '../../services/soundEngine';

export const Workbench: React.FC = () => {
  const {
    equipment,
    selectedEquipmentId,
    selectEquipment,
    updatePosition,
    toggleHeat,
    tareEquipment,
    toggleBuretteStopcock,
    tickSimulation,
    language,
    activePourVfx,
    draggedChemicalId,
    setDraggedChemicalId,
    addChemicalToEquipment,
    addEquipment,
    removeEquipment,
    toggleStir,
    triggerDirectPour,
    spillPuddles,
    cleanSpill,
  } = useLabStore(useShallow(state => ({equipment: state.equipment,selectedEquipmentId: state.selectedEquipmentId,selectEquipment: state.selectEquipment,updatePosition: state.updatePosition,toggleHeat: state.toggleHeat,tareEquipment: state.tareEquipment,toggleBuretteStopcock: state.toggleBuretteStopcock,tickSimulation: state.tickSimulation,language: state.language,activePourVfx: state.activePourVfx,draggedChemicalId: state.draggedChemicalId,setDraggedChemicalId: state.setDraggedChemicalId,addChemicalToEquipment: state.addChemicalToEquipment,addEquipment: state.addEquipment,removeEquipment: state.removeEquipment,toggleStir: state.toggleStir,triggerDirectPour: state.triggerDirectPour,spillPuddles: state.spillPuddles,cleanSpill: state.cleanSpill})));

  // Continuous simulation loop (thermal heat transfer, burette dropwise titration, boiling)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) tickSimulation(0.25);
    }, 250);
    return () => clearInterval(timer);
  }, [tickSimulation]);

  const workbenchRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);

  // Alignment guide states
  const [activeSnapGuide, setActiveSnapGuide] = useState<{
    type: 'burner' | 'burette' | 'balance';
    targetX: number;
    targetY: number;
    label_vi: string;
    label_en: string;
  } | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEquipmentId) {
        removeEquipment(selectedEquipmentId);
      } else if (e.key === 'Escape') {
        selectEquipment(null);
      } else if (e.key === 'h' || e.key === 'H') {
        if (selectedEquipmentId) toggleHeat(selectedEquipmentId);
      } else if (e.key === 's' || e.key === 'S') {
        if (selectedEquipmentId) toggleStir(selectedEquipmentId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEquipmentId, removeEquipment, selectEquipment, toggleHeat, toggleStir]);

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
      soundEngine.click();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !workbenchRef.current) return;

    const rect = workbenchRef.current.getBoundingClientRect();
    const currentPointerX = e.clientX - rect.left;
    const currentPointerY = e.clientY - rect.top;

    let newX = Math.max(20, Math.min(rect.width - 150, currentPointerX - dragOffset.x));
    let newY = Math.max(20, Math.min(rect.height - 200, currentPointerY - dragOffset.y));

    const draggingEq = equipment[draggingId];
    let detectedGuide: typeof activeSnapGuide = null;

    if (draggingEq) {
      const draggingCenterX = newX + draggingEq.width / 2;
      const draggingBottom = newY + draggingEq.height;

      // Check alignment with active Burners
      for (const other of Object.values(equipment)) {
        if (other.id === draggingId) continue;

        if (other.type === 'bunsen_burner') {
          const burnerCenterX = other.x + other.width / 2;
          const burnerMouthY = other.y + 42;
          const dx = Math.abs(draggingCenterX - burnerCenterX);
          const gap = burnerMouthY - draggingBottom;

          if (dx < 35 && gap >= -30 && gap <= 120) {
            // Magnetic snap alignment
            newX = burnerCenterX - draggingEq.width / 2;
            detectedGuide = {
              type: 'burner',
              targetX: burnerCenterX,
              targetY: burnerMouthY,
              label_vi: other.isOn ? '🔥 Đang đun nóng tối ưu' : 'Đèn Bunsen (Chưa bật)',
              label_en: other.isOn ? '🔥 Optimal Heating Alignment' : 'Bunsen Burner (Unlit)',
            };
            break;
          }
        } else if (other.type === 'burette' || other.type === 'separatory_funnel') {
          const drainCenterX = other.x + other.width / 2;
          const drainTipY = other.y + other.height - 20;
          const dx = Math.abs(draggingCenterX - drainCenterX);

          if (dx < 30 && draggingEq.isContainer && newY > other.y + 120) {
            newX = drainCenterX - draggingEq.width / 2;
            detectedGuide = {
              type: 'burette',
              targetX: drainCenterX,
              targetY: drainTipY,
              label_vi: other.type === 'separatory_funnel' ? '🍷 Hứng dịch chiết tách lớp' : '💧 Hứng dung dịch chuẩn độ',
              label_en: other.type === 'separatory_funnel' ? '🍷 Phase Extraction Receiving' : '💧 Titration Receiving Alignment',
            };
            break;
          }
        } else if (other.type === 'analytical_balance') {
          const balanceCenterX = other.x + other.width / 2;
          const balancePanY = other.y + 42;
          const dx = Math.abs(draggingCenterX - balanceCenterX);
          const dy = Math.abs(draggingBottom - balancePanY);

          if (dx < 35 && dy < 35 && draggingEq.isContainer) {
            newX = balanceCenterX - draggingEq.width / 2;
            newY = balancePanY - draggingEq.height;
            detectedGuide = {
              type: 'balance',
              targetX: balanceCenterX,
              targetY: balancePanY,
              label_vi: '⚖️ Cân khối lượng chính xác',
              label_en: '⚖️ Precision Analytical Weighing',
            };
            break;
          }
        } else if (other.type === 'test_tube_rack' && draggingEq.type === 'test_tube') {
          const rackCenterX = other.x + other.width / 2;
          const rackTopY = other.y + 10;
          const dx = Math.abs(draggingCenterX - rackCenterX);
          const dy = Math.abs(draggingBottom - (other.y + other.height - 10));

          if (dx < other.width * 0.55 && dy < 60) {
            // Find closest slot (0 to 5)
            const relX = draggingCenterX - (other.x + 25);
            const slotIdx = Math.max(0, Math.min(5, Math.round(relX / 28)));
            newX = other.x + 25 + slotIdx * 28 - draggingEq.width / 2;
            newY = other.y - 45; // Tube stands upright in the rack
            detectedGuide = {
              type: 'balance',
              targetX: newX + draggingEq.width / 2,
              targetY: rackTopY,
              label_vi: `🪜 Giá cắm ống nghiệm (Lỗ ${slotIdx + 1})`,
              label_en: `🪜 Test Tube Rack (Slot ${slotIdx + 1})`,
            };
            break;
          }
        }
      }

      // Check collision / hover over another vessel for pouring
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

    setActiveSnapGuide(detectedGuide);
    updatePosition(draggingId, newX, newY);
  };

  const handlePointerUp = () => {
    if (draggingId) {
      if (hoverTargetId && equipment[draggingId]?.contents.length > 0) {
        // Trigger realistic direct pouring stream & sound effect
        triggerDirectPour(draggingId, hoverTargetId);
      } else {
        soundEngine.glassClink();
      }
      setDraggingId(null);
      setHoverTargetId(null);
      setActiveSnapGuide(null);
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
      soundEngine.glassClink();
      return;
    }

    // Handle chemical dropped onto empty workbench: automatically spawn a beaker and fill it!
    const chemId = e.dataTransfer.getData('text/plain') || draggedChemicalId;
    if (chemId) {
      const newVesselId = addEquipment('beaker', dropX, dropY);
      soundEngine.glassClink();
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

  useEffect(()=>{if(selectedEquipmentId)workbenchRef.current?.querySelector(`[data-equipment-id="${CSS.escape(selectedEquipmentId)}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});},[selectedEquipmentId]);

  return (
    <div className="workbench-scroll">
    <div
      ref={workbenchRef}
      className="lab-workbench relative w-full h-full bg-[#f8fafc] overflow-hidden select-none cursor-default"
      style={{
        minWidth:Math.max(900,...allEquipmentList.map(item=>item.x+item.width+40)),
        minHeight:Math.max(600,...allEquipmentList.map(item=>item.y+item.height+40)),
        backgroundImage: `
          radial-gradient(#94a3b8 1.1px, transparent 1.1px),
          linear-gradient(to right, rgba(226, 232, 240, 0.4) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(226, 232, 240, 0.4) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px, 120px 120px, 120px 120px',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragOver={handleWorkbenchDragOver}
      onDrop={handleWorkbenchDrop}
      onClick={() => selectEquipment(null)}
    >
      {/* Tabletop Realistic Lighting & Shadow Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-slate-300/25 pointer-events-none" />

      {/* Lab Benchtop Front Bevel Edge */}
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-slate-300 to-slate-100 border-t border-slate-300 pointer-events-none" />

      {/* Metric Bench Ruler Calibration Strip (Top edge) */}
      <div className="absolute top-0 left-0 right-0 h-4 border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-2xs flex items-center justify-between px-4 text-[9px] font-mono text-slate-400 pointer-events-none select-none">
        <span>0 cm</span>
        <span>20 cm</span>
        <span>40 cm</span>
        <span>60 cm</span>
        <span>80 cm</span>
        <span>100 cm</span>
        <span>120 cm</span>
      </div>

      {/* Interactive Spatial Alignment Guides */}
      {activeSnapGuide && (
        <div
          className="absolute pointer-events-none z-40 transition-all duration-100"
          style={{
            left: `${activeSnapGuide.targetX}px`,
            top: `${activeSnapGuide.targetY - 50}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Vertical Alignment Beam */}
          <div
            className={`w-0.5 h-36 mx-auto ${
              activeSnapGuide.type === 'burner'
                ? 'bg-gradient-to-b from-orange-500 via-amber-400 to-transparent'
                : activeSnapGuide.type === 'burette'
                ? 'bg-gradient-to-b from-blue-500 via-sky-400 to-transparent'
                : 'bg-gradient-to-b from-emerald-500 via-emerald-400 to-transparent'
            }`}
          />
          {/* Badge */}
          <div className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900/90 text-white shadow-md border border-slate-700 whitespace-nowrap animate-pulse text-center">
            {language === 'vi' ? activeSnapGuide.label_vi : activeSnapGuide.label_en}
          </div>
        </div>
      )}

      {/* Hover Pouring Cue Overlay */}
      {hoverTargetId && draggingId && (
        <div
          className="absolute pointer-events-none z-40 px-3 py-1 rounded-xl bg-blue-600/95 text-white text-xs font-semibold shadow-lg border border-blue-400 animate-pulse"
          style={{
            left: `${equipment[hoverTargetId]?.x + (equipment[hoverTargetId]?.width || 100) / 2}px`,
            top: `${equipment[hoverTargetId]?.y - 32}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {language === 'vi' ? '⚡ Thả chuột để rót chất lỏng' : '⚡ Release to Pour'}
        </div>
      )}

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
            {language === 'vi' ? 'Bàn thí nghiệm ảo sẵn sàng' : 'Workbench is ready'}
          </p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
            {language === 'vi'
              ? 'Kéo thả dụng cụ hoặc hóa chất từ bảng bên trái vào bàn để bắt đầu phản ứng hóa học.'
              : 'Drag & drop apparatus or chemicals from the sidebar to begin chemical reactions.'}
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

      {/* Chemical Spill Puddles on Workbench Tabletop */}
      {spillPuddles.map(puddle => (
        <div
          key={puddle.id}
          className="absolute pointer-events-auto cursor-pointer group transition-transform hover:scale-105 z-5"
          style={{
            left: `${puddle.x}px`,
            top: `${puddle.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            cleanSpill(puddle.id);
            soundEngine.pour(0.3);
          }}
          title={language === 'vi' ? `Vết đổ ${puddle.formula} (${puddle.volume_ml.toFixed(1)} mL) - Bấm để lau dọn` : `Spill ${puddle.formula} - Click to clean`}
        >
          <svg
            width={puddle.radius_px ? puddle.radius_px * 2.2 : 60}
            height={puddle.radius_px ? puddle.radius_px * 1.5 : 40}
            viewBox="0 0 100 60"
            className="overflow-visible drop-shadow-xs"
          >
            {/* Irregular fluid splat path */}
            <path
              d="M 25,30 C 15,20 30,10 50,12 C 70,14 85,22 80,35 C 75,48 55,52 35,48 C 15,44 18,35 25,30 Z"
              fill={puddle.colorHex || '#94a3b8'}
              fillOpacity="0.75"
            />
            {/* Glossy specular reflection */}
            <path
              d="M 32,24 C 40,18 55,18 64,22 C 55,24 42,26 32,24 Z"
              fill="#ffffff"
              fillOpacity="0.5"
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap border border-slate-700 pointer-events-none shadow-md">
            🧽 {language === 'vi' ? 'Lau dọn' : 'Clean'}
          </div>
        </div>
      ))}

      {/* Laboratory Equipment Items on Workbench */}
      {allEquipmentList.map(item => {
        const isDragging = draggingId === item.id;
        const isHoverTarget = hoverTargetId === item.id;
        const isPouring = activePourVfx?.sourceId === item.id;

        const balanceVessel = item.type === 'analytical_balance'
          ? allEquipmentList.find(
              v => v.id !== item.id && v.isContainer && Math.abs((v.x + v.width / 2) - (item.x + item.width / 2)) < item.width * 0.45 && Math.abs((v.y + v.height) - (item.y + 40)) < 45
            )
          : null;

        return (
          <div
            key={item.id}
            data-equipment-id={item.id}
            className={`workbench-equipment absolute transition-shadow ${
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
              targetVesselForBalance={balanceVessel}
              language={language}
            />
          </div>
        );
      })}
    </div>
    </div>
  );
};
