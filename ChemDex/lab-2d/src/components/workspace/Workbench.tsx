import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLabStore } from '../../store/useLabStore';
import { useLabEnvironment } from '../../store/useLabEnvironment';
import { PointerDragPayload, usePointerDragStore } from '../../store/usePointerDragStore';
import { EquipmentRenderer } from '../equipment/EquipmentRenderer';
import { PourStreamVfx } from '../vfx/PourStreamVfx';
import { PouringBottle2D, ChemicalGhostCursor } from '../vfx/PouringBottle2D';
import { LitmusTestModal2D } from '../modals/LitmusTestModal2D';
import { SafetyPpeBar } from './SafetyPpeBar';
import { MeasurementHUD } from './MeasurementHUD';
import { RadialMenu2D } from './RadialMenu2D';
import { LabEnvironmentBackdrop } from './LabEnvironmentBackdrop';
import { EquipmentState, EquipmentType } from '../../types/equipment';
import { findChemicalById } from '../../data/chemicals';
import { soundEngine } from '../../services/soundEngine';
import { reactionRuntime2D } from '../../vfx/ReactionRuntime2D';
import {
  buildLiveAnnouncementText,
  formatEquipmentAriaLabel,
  handleEquipmentKeyboardAction,
} from './equipmentA11y';

const BENCH_W = 720;
const BENCH_H = 490;

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
    activeExternalDoses,
    draggedChemicalId,
    setDraggedChemicalId,
    triggerExternalChemicalPour,
    spatulaScoop,
    dispenseSpatulaToVessel,
    activeLitmusVesselId,
    setActiveLitmusVesselId,
    addEquipment,
    removeEquipment,
    toggleStir,
    triggerDirectPour,
    spillPuddles,
    cleanSpill,
    neutralizeSpill,
    activeTool,
    pipetteBuffer,
    drawWithPipette,
    dispenseFromPipette,
    workbenchZoom,
    setWorkbenchZoom,
    fitTriggerCount,
    history,
    safetyAlerts,
  } = useLabStore(
    useShallow((s) => ({
      equipment: s.equipment,
      selectedEquipmentId: s.selectedEquipmentId,
      selectEquipment: s.selectEquipment,
      updatePosition: s.updatePosition,
      toggleHeat: s.toggleHeat,
      tareEquipment: s.tareEquipment,
      toggleBuretteStopcock: s.toggleBuretteStopcock,
      tickSimulation: s.tickSimulation,
      language: s.language,
      activePourVfx: s.activePourVfx,
      activeExternalDoses: s.activeExternalDoses,
      draggedChemicalId: s.draggedChemicalId,
      setDraggedChemicalId: s.setDraggedChemicalId,
      triggerExternalChemicalPour: s.triggerExternalChemicalPour,
      spatulaScoop: s.spatulaScoop,
      dispenseSpatulaToVessel: s.dispenseSpatulaToVessel,
      activeLitmusVesselId: s.activeLitmusVesselId,
      setActiveLitmusVesselId: s.setActiveLitmusVesselId,
      addEquipment: s.addEquipment,
      removeEquipment: s.removeEquipment,
      toggleStir: s.toggleStir,
      triggerDirectPour: s.triggerDirectPour,
      spillPuddles: s.spillPuddles,
      cleanSpill: s.cleanSpill,
      neutralizeSpill: s.neutralizeSpill,
      activeTool: s.activeTool,
      pipetteBuffer: s.pipetteBuffer,
      drawWithPipette: s.drawWithPipette,
      dispenseFromPipette: s.dispenseFromPipette,
      workbenchZoom: s.workbenchZoom,
      setWorkbenchZoom: s.setWorkbenchZoom,
      fitTriggerCount: s.fitTriggerCount,
      history: s.history,
      safetyAlerts: s.safetyAlerts,
    }))
  );

  const activeDrag = usePointerDragStore((s) => s.activeDrag);
  const dragClientX = usePointerDragStore((s) => s.clientX);
  const dragClientY = usePointerDragStore((s) => s.clientY);
  const isDraggingMoved = usePointerDragStore((s) => s.isDraggingMoved);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const activeTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragPendingRef = useRef<{
    id: string;
    targetEl: HTMLElement;
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const isStirDraggingRef = useRef(false);
  const lastStirPlumeMsRef = useRef(0);
  const lastViewportSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const [radialTarget, setRadialTarget] = useState<{ id: string; x: number; y: number } | null>(null);

  const [activeSnapGuide, setActiveSnapGuide] = useState<{
    type: 'burner' | 'burette' | 'balance';
    targetX: number;
    targetY: number;
    label_vi: string;
    label_en: string;
  } | null>(null);

  const fitToViewport = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    if (vw < 40 || vh < 40) return;

    const items = Object.values(useLabStore.getState().equipment);
    const hudTopReserve = vw < 640 ? 18 : 52;
    const hudBottomReserve = vw < 640 ? 54 : 14;
    const usableH = Math.max(160, vh - hudTopReserve - hudBottomReserve);
    const usableW = Math.max(160, vw - 20);

    if (items.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const item of items) {
        minX = Math.min(minX, item.x);
        minY = Math.min(minY, item.y - 24);
        maxX = Math.max(maxX, item.x + item.width);
        maxY = Math.max(maxY, item.y + item.height + 34);
      }

      const contentW = Math.max(vw < 640 ? 320 : 420, maxX - minX + 56);
      const contentH = Math.max(vw < 640 ? 250 : 300, maxY - minY + 48);
      const rawZoom = Math.min(usableW / contentW, usableH / contentH);
      const targetZoom =
        vw >= 640
          ? rawZoom >= 0.96
            ? 1
            : Math.max(0.65, rawZoom)
          : Math.max(0.55, Math.min(1.05, rawZoom));
      const roundedZoom = Math.round(targetZoom * 100) / 100;
      const boxCenterX = (minX + maxX) / 2;
      const boxCenterY = (minY + maxY) / 2;

      setWorkbenchZoom(roundedZoom);
      setPan({
        x: Math.round(vw / 2 - boxCenterX * roundedZoom),
        y: Math.round(hudTopReserve + usableH / 2 - boxCenterY * roundedZoom),
      });
      return;
    }

    const targetZoom =
      vw >= BENCH_W && usableH >= BENCH_H
        ? 1
        : Math.max(0.54, Math.min(1, usableW / BENCH_W, usableH / BENCH_H));

    const roundedZoom = Math.round(targetZoom * 100) / 100;
    setWorkbenchZoom(roundedZoom);
    const scaledW = BENCH_W * roundedZoom;
    const scaledH = BENCH_H * roundedZoom;
    setPan({
      x: Math.round((vw - scaledW) / 2),
      y: Math.round(hudTopReserve + Math.max(0, (usableH - scaledH) / 2)),
    });
  }, [setWorkbenchZoom]);

  useEffect(() => {
    fitToViewport();
  }, [fitToViewport, fitTriggerCount]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const prev = lastViewportSizeRef.current;
      if (Math.abs(rect.width - prev.w) > 24 || Math.abs(rect.height - prev.h) > 24) {
        lastViewportSizeRef.current = { w: rect.width, h: rect.height };
        fitToViewport();
      }
    });
    observer.observe(vp);
    return () => observer.disconnect();
  }, [fitToViewport]);

  // 60Hz Visual Particle + Diffusion Loop & 12.5Hz Simulation Tick
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let storeAccum = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const storeState = useLabStore.getState();
      if (!document.hidden && !storeState.simulationPaused) {
        const env = useLabEnvironment.getState().environment;
        reactionRuntime2D.stepAll(
          Object.values(storeState.equipment),
          dt * storeState.simTimeScale,
          env
        );

        storeAccum += dt;
        if (storeAccum >= 0.08) {
          tickSimulation(storeAccum);
          storeAccum = 0;
        }
      }
      rafId = requestAnimationFrame(frame);
    };

    useLabStore.getState().setRealtimeKinetics(true);
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [tickSimulation]);

  // Helper: convert viewport screen coordinates to logical bench coordinates
  const clientToBench = useCallback(
    (clientX: number, clientY: number) => {
      const vp = viewportRef.current;
      if (!vp) return { x: 250, y: 200 };
      const rect = vp.getBoundingClientRect();
      return {
        x: (clientX - rect.left - pan.x) / workbenchZoom,
        y: (clientY - rect.top - pan.y) / workbenchZoom,
      };
    },
    [pan.x, pan.y, workbenchZoom]
  );

  // Trigger animated external reagent pouring / dropping / spatula dosing at horizontal site
  const doseChemicalIntoVessel = useCallback(
    (vessel: EquipmentState, chemId: string, benchX: number) => {
      const chem = findChemicalById(chemId);
      const isSolid = chem?.phase_STP === 'solid';
      const relX = Math.max(-0.85, Math.min(0.85, ((benchX - vessel.x) / Math.max(20, vessel.width)) * 2 - 1));
      triggerExternalChemicalPour(
        vessel.id,
        chemId,
        isSolid ? undefined : 25,
        isSolid ? 2 : undefined,
        relX
      );
    },
    [triggerExternalChemicalPour]
  );

  // Listen to unified cross-platform pointer drops from SidebarInventory (mouse + touch)
  useEffect(() => {
    const onPointerDrop = (event: Event) => {
      const detail = (event as CustomEvent<{ payload: PointerDragPayload; clientX: number; clientY: number }>).detail;
      const vp = viewportRef.current;
      if (!vp || !detail) return;
      const rect = vp.getBoundingClientRect();
      if (
        detail.clientX < rect.left ||
        detail.clientX > rect.right ||
        detail.clientY < rect.top ||
        detail.clientY > rect.bottom
      ) {
        return;
      }

      const pt = clientToBench(detail.clientX, detail.clientY);
      const dropX = Math.max(20, Math.min(BENCH_W - 150, pt.x - 60));
      const dropY = Math.max(30, Math.min(BENCH_H - 180, pt.y - 70));

      if (detail.payload.kind === 'equipment') {
        addEquipment(detail.payload.type, dropX, dropY);
        soundEngine.glassClink();
        useLabStore.getState().setMobilePanel(null);
        return;
      }

      if (detail.payload.kind === 'chemical') {
        const allEq = Object.values(useLabStore.getState().equipment);
        const hitVessel = allEq.find(
          (v) =>
            v.isContainer &&
            pt.x >= v.x - 16 &&
            pt.x <= v.x + v.width + 16 &&
            pt.y >= v.y - 16 &&
            pt.y <= v.y + v.height + 16
        );

        if (hitVessel) {
          doseChemicalIntoVessel(hitVessel, detail.payload.chemicalId, pt.x);
        } else {
          const newId = addEquipment('beaker', dropX, dropY);
          soundEngine.glassClink();
          const newVessel = useLabStore.getState().equipment[newId];
          if (newVessel) {
            doseChemicalIntoVessel(newVessel, detail.payload.chemicalId, pt.x);
          }
        }
        useLabStore.getState().setMobilePanel(null);
      }
    };

    window.addEventListener('chemdex:pointer-drop', onPointerDrop);
    return () => window.removeEventListener('chemdex:pointer-drop', onPointerDrop);
  }, [addEquipment, clientToBench, doseChemicalIntoVessel]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEquipmentId) {
        removeEquipment(selectedEquipmentId);
      } else if (e.key === 'Escape') {
        selectEquipment(null);
        setRadialTarget(null);
      } else if ((e.key === 'h' || e.key === 'H') && selectedEquipmentId) {
        toggleHeat(selectedEquipmentId);
      } else if ((e.key === 's' || e.key === 'S') && selectedEquipmentId) {
        toggleStir(selectedEquipmentId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEquipmentId, removeEquipment, selectEquipment, toggleHeat, toggleStir]);

  const handleEquipmentPointerDown = (id: string, e: React.PointerEvent) => {
    const targetEl = e.target as HTMLElement | null;
    if (targetEl?.closest('button, [role="button"], [data-interactive-control="true"]')) {
      e.stopPropagation();
      selectEquipment(id);
      return;
    }

    e.stopPropagation();
    const eq = equipment[id];
    if (!eq) return;

    selectEquipment(id);

    // Handle active workbench tool before dragging
    if (activeTool === 'stir_rod' && eq.isContainer) {
      isStirDraggingRef.current = true;
      if (!eq.isStirred) toggleStir(id);
      const st = reactionRuntime2D.getOrCreateState(eq);
      const pt = clientToBench(e.clientX, e.clientY);
      const normX = Math.max(0.1, Math.min(0.9, (pt.x - eq.x) / Math.max(20, eq.width)));
      const normY = Math.max(0.15, Math.min(0.85, (pt.y - eq.y) / Math.max(20, eq.height)));
      st.colorField?.injectPlume(normX, normY, 0.3, eq.liquidColorHex || '#38bdf8', 0.35);
      soundEngine.click();
      return;
    }

    if (activeTool === 'pipette' && eq.isContainer) {
      const pt = clientToBench(e.clientX, e.clientY);
      const contactX = Math.max(-0.85, Math.min(0.85, ((pt.x - eq.x) / Math.max(20, eq.width)) * 2 - 1));
      if (pipetteBuffer) {
        dispenseFromPipette(id, Math.min(2, pipetteBuffer.volume_ml), contactX);
      } else {
        drawWithPipette(id, 5);
      }
      return;
    }

    if (activeTool === 'spatula' && eq.isContainer) {
      const pt = clientToBench(e.clientX, e.clientY);
      const contactX = Math.max(-0.85, Math.min(0.85, ((pt.x - eq.x) / Math.max(20, eq.width)) * 2 - 1));
      if (spatulaScoop) {
        dispenseSpatulaToVessel(id, spatulaScoop.mass_g, contactX);
      } else {
        soundEngine.click();
      }
      return;
    }

    if (activeTool === 'litmus' && eq.isContainer) {
      soundEngine.click();
      setActiveLitmusVesselId(id);
      return;
    }

    if (activeTool === 'probe') {
      soundEngine.click();
      return;
    }

    // Normal Select / Drag mode (activate real drag only after 5px move so clicks never get swallowed)
    const pt = clientToBench(e.clientX, e.clientY);
    dragPendingRef.current = {
      id,
      targetEl: e.currentTarget as HTMLElement,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: pt.x - eq.x,
      offsetY: pt.y - eq.y,
    };
  };

  const handleViewportPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activeTouchesRef.current.size === 2) {
        const pts = Array.from(activeTouchesRef.current.values());
        pinchStartRef.current = {
          dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
          zoom: workbenchZoom,
        };
        setDraggingId(null);
        panDragRef.current = null;
        return;
      }
    }

    // Sponge tool wipes nearby spill puddles anywhere on bench
    if (activeTool === 'sponge') {
      const pt = clientToBench(e.clientX, e.clientY);
      const hitSpill = spillPuddles.find((p) => Math.hypot(pt.x - p.x, pt.y - p.y) < 55);
      if (hitSpill) {
        cleanSpill(hitSpill.id);
        soundEngine.playSpongeWipe();
        return;
      }
    }

    selectEquipment(null);
    setRadialTarget(null);
    panDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    };
  };

  const handleViewportPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && activeTouchesRef.current.has(e.pointerId)) {
      activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activeTouchesRef.current.size === 2 && pinchStartRef.current) {
        const pts = Array.from(activeTouchesRef.current.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        if (pinchStartRef.current.dist > 10) {
          setWorkbenchZoom(pinchStartRef.current.zoom * (dist / pinchStartRef.current.dist));
        }
        return;
      }
    }

    if (activeTool === 'stir_rod' && isStirDraggingRef.current) {
      const now = performance.now();
      if (now - lastStirPlumeMsRef.current >= 45) {
        lastStirPlumeMsRef.current = now;
        const pt = clientToBench(e.clientX, e.clientY);
        const hit = Object.values(equipment).find(
          (eq) =>
            eq.isContainer &&
            pt.x >= eq.x &&
            pt.x <= eq.x + eq.width &&
            pt.y >= eq.y &&
            pt.y <= eq.y + eq.height
        );
        if (hit) {
          if (!hit.isStirred) toggleStir(hit.id);
          const st = reactionRuntime2D.getOrCreateState(hit);
          const normX = Math.max(0.1, Math.min(0.9, (pt.x - hit.x) / Math.max(20, hit.width)));
          const normY = Math.max(0.15, Math.min(0.85, (pt.y - hit.y) / Math.max(20, hit.height)));
          st.colorField?.injectPlume(normX, normY, 0.24, hit.liquidColorHex || '#38bdf8', 0.25);
        }
      }
      return;
    }

    if (!draggingId && dragPendingRef.current) {
      const pending = dragPendingRef.current;
      if (Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) >= 5) {
        try {
          pending.targetEl.setPointerCapture?.(pending.pointerId);
        } catch {
          // Pointer capture unsupported
        }
        setDraggingId(pending.id);
        setDragOffset({ x: pending.offsetX, y: pending.offsetY });
        dragPendingRef.current = null;
        soundEngine.click();
      }
      return;
    }

    if (!draggingId) {
      if (panDragRef.current) {
        setPan({
          x: panDragRef.current.origX + (e.clientX - panDragRef.current.startX),
          y: panDragRef.current.origY + (e.clientY - panDragRef.current.startY),
        });
      }
      return;
    }

    const pt = clientToBench(e.clientX, e.clientY);
    let newX = Math.max(-20, Math.min(BENCH_W - 80, pt.x - dragOffset.x));
    let newY = Math.max(10, Math.min(BENCH_H - 90, pt.y - dragOffset.y));

    const draggingEq = equipment[draggingId];
    let detectedGuide: typeof activeSnapGuide = null;

    if (draggingEq) {
      const draggingCenterX = newX + draggingEq.width / 2;
      const draggingBottom = newY + draggingEq.height;

      for (const other of Object.values(equipment)) {
        if (other.id === draggingId) continue;

        if (other.type === 'bunsen_burner') {
          const burnerCenterX = other.x + other.width / 2;
          const burnerMouthY = other.y + 42;
          const dx = Math.abs(draggingCenterX - burnerCenterX);
          const gap = burnerMouthY - draggingBottom;

          if (dx <= 34 && gap >= -8 && gap <= 100) {
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
        } else if (
          draggingEq.type === 'bunsen_burner' &&
          other.isContainer &&
          (other.type === 'beaker' || other.type === 'erlenmeyer_flask' || other.type === 'test_tube' || other.type === 'evaporating_dish')
        ) {
          const vesselCenterX = other.x + other.width / 2;
          const burnerCenterX = newX + draggingEq.width / 2;
          const burnerMouthY = newY + 42;
          const vesselBottom = other.y + other.height;
          const dx = Math.abs(vesselCenterX - burnerCenterX);
          const gap = burnerMouthY - vesselBottom;

          if (dx <= 26 && gap >= -8 && gap <= 100) {
            newX = vesselCenterX - draggingEq.width / 2;
            detectedGuide = {
              type: 'burner',
              targetX: vesselCenterX,
              targetY: burnerMouthY,
              label_vi: draggingEq.isOn ? '🔥 Đèn khớp chính tâm đáy bình' : 'Đặt đèn chính tâm đáy bình',
              label_en: draggingEq.isOn ? '🔥 Flame Aligned Under Vessel' : 'Burner Centered Under Vessel',
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
              label_en: '⚖️ Precision Weighing',
            };
            break;
          }
        } else if (other.type === 'test_tube_rack' && draggingEq.type === 'test_tube') {
          const rackCenterX = other.x + other.width / 2;
          const rackTopY = other.y + 10;
          const dx = Math.abs(draggingCenterX - rackCenterX);
          const dy = Math.abs(draggingBottom - (other.y + other.height - 10));

          if (dx < other.width * 0.55 && dy < 60) {
            const relX = draggingCenterX - (other.x + 25);
            const slotIdx = Math.max(0, Math.min(5, Math.round(relX / 28)));
            newX = other.x + 25 + slotIdx * 28 - draggingEq.width / 2;
            newY = other.y - 45;
            detectedGuide = {
              type: 'balance',
              targetX: newX + draggingEq.width / 2,
              targetY: rackTopY,
              label_vi: `🪜 Giá ống nghiệm (Lỗ ${slotIdx + 1})`,
              label_en: `🪜 Tube Rack (Slot ${slotIdx + 1})`,
            };
            break;
          }
        }
      }

      let foundTarget: string | null = null;
      if (draggingEq.isContainer && draggingEq.contents.length > 0) {
        const dragCx = newX + draggingEq.width / 2;
        const dragCy = newY + draggingEq.height / 2;
        for (const [otherId, otherEq] of Object.entries(equipment)) {
          if (otherId === draggingId || !otherEq.isContainer) continue;
          const otherCx = otherEq.x + otherEq.width / 2;
          const otherCy = otherEq.y + otherEq.height / 2;
          if (
            Math.abs(dragCx - otherCx) < (draggingEq.width + otherEq.width) * 0.44 &&
            Math.abs(dragCy - otherCy) < (draggingEq.height + otherEq.height) * 0.48
          ) {
            foundTarget = otherId;
            break;
          }
        }
      }
      setHoverTargetId(foundTarget);
    }

    setActiveSnapGuide(detectedGuide);
    updatePosition(draggingId, newX, newY);
  };

  const handleViewportPointerUp = (e: React.PointerEvent) => {
    activeTouchesRef.current.delete(e.pointerId);
    if (activeTouchesRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    panDragRef.current = null;
    dragPendingRef.current = null;
    isStirDraggingRef.current = false;

    if (draggingId) {
      if (hoverTargetId && equipment[draggingId]?.contents.length > 0) {
        triggerDirectPour(draggingId, hoverTargetId);
      } else {
        soundEngine.glassClink();
      }
      setDraggingId(null);
      setHoverTargetId(null);
      setActiveSnapGuide(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.92 : 1.09;
    const nextZoom = Math.max(0.32, Math.min(2.2, Math.round(workbenchZoom * factor * 100) / 100));
    if (nextZoom === workbenchZoom) return;

    const ratio = nextZoom / workbenchZoom;
    setPan({
      x: cursorX - (cursorX - pan.x) * ratio,
      y: cursorY - (cursorY - pan.y) * ratio,
    });
    setWorkbenchZoom(nextZoom);
  };

  const handleWorkbenchDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const pt = clientToBench(e.clientX, e.clientY);
    const dropX = Math.max(20, Math.min(BENCH_W - 150, pt.x - 65));
    const dropY = Math.max(30, Math.min(BENCH_H - 180, pt.y - 75));

    const eqType = e.dataTransfer.getData('application/equipment-type') as EquipmentType;
    if (eqType) {
      addEquipment(eqType, dropX, dropY);
      soundEngine.glassClink();
      return;
    }

    const chemId = e.dataTransfer.getData('text/plain') || draggedChemicalId;
    if (chemId) {
      const newVesselId = addEquipment('beaker', dropX, dropY);
      soundEngine.glassClink();
      const newVessel = useLabStore.getState().equipment[newVesselId];
      if (newVessel) {
        doseChemicalIntoVessel(newVessel, chemId, pt.x);
      }
      setDraggedChemicalId(null);
    }
  };

  const handleVesselDrop = (e: React.DragEvent, vesselId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const chemId = e.dataTransfer.getData('text/plain') || draggedChemicalId;
    const targetEq = equipment[vesselId];
    if (chemId && targetEq && targetEq.isContainer) {
      const pt = clientToBench(e.clientX, e.clientY);
      doseChemicalIntoVessel(targetEq, chemId, pt.x);
      setDraggedChemicalId(null);
    }
  };

  const allEquipmentList = Object.values(equipment);
  const radialEquipment = radialTarget ? equipment[radialTarget.id] ?? null : null;
  const activeLitmusVessel = activeLitmusVesselId ? equipment[activeLitmusVesselId] ?? null : null;
  const liveAnnouncement = buildLiveAnnouncementText(history, safetyAlerts, language);

  let externalDragHoverVessel: EquipmentState | null = null;
  if (isDraggingMoved && activeDrag?.kind === 'chemical' && viewportRef.current) {
    const vpRect = viewportRef.current.getBoundingClientRect();
    if (
      dragClientX >= vpRect.left &&
      dragClientX <= vpRect.right &&
      dragClientY >= vpRect.top &&
      dragClientY <= vpRect.bottom
    ) {
      const pt = clientToBench(dragClientX, dragClientY);
      externalDragHoverVessel =
        allEquipmentList.find(
          (v) =>
            v.isContainer &&
            pt.x >= v.x - 16 &&
            pt.x <= v.x + v.width + 16 &&
            pt.y >= v.y - 16 &&
            pt.y <= v.y + v.height + 16
        ) ?? null;
    }
  }

  return (
    <div
      ref={viewportRef}
      className="lab-workbench relative flex-1 min-h-0 min-w-0 overflow-hidden select-none touch-none"
      style={{
        cursor:
          activeTool === 'stir_rod' || activeTool === 'spatula'
            ? 'crosshair'
            : activeTool === 'pipette'
            ? 'cell'
            : activeTool === 'litmus'
            ? 'pointer'
            : activeTool === 'sponge'
            ? 'grab'
            : 'default',
      }}
      onPointerDown={handleViewportPointerDown}
      onPointerMove={handleViewportPointerMove}
      onPointerUp={handleViewportPointerUp}
      onPointerCancel={handleViewportPointerUp}
      onWheel={handleWheel}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={handleWorkbenchDrop}
    >
      {/* Atmospheric 2D Lab Scene Background (Sunbeams, Tiles, Phenolic Benchtop) */}
      <LabEnvironmentBackdrop />

      {/* Live region announcing reactions and safety alerts for assistive tech */}
      <div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
        {liveAnnouncement}
      </div>

      {/* Top-Left Minimal Safety Chip + Responsive Tool Bar (Bottom-Center on Mobile, Top-Right on Desktop) */}
      <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
        <SafetyPpeBar />
      </div>
      <div className="absolute bottom-2 inset-x-2 flex justify-center sm:inset-x-auto sm:bottom-auto sm:top-2.5 sm:left-24 sm:right-2.5 sm:justify-end z-20 pointer-events-none">
        <MeasurementHUD />
      </div>

      {/* Empty Bench Intro Callout */}
      {allEquipmentList.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 z-10 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/90 border border-slate-200/80 shadow-md flex items-center justify-center mb-2.5 backdrop-blur-xs">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M10 2v7.31L4.83 18.2A2 2 0 0 0 6.55 21h10.9a2 2 0 0 0 1.72-2.8L14 9.31V2" />
              <path d="M8.5 2h7" />
              <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-700 bg-white/75 backdrop-blur-xs px-3 py-1 rounded-full">
            {language === 'vi' ? 'Bàn thí nghiệm sẵn sàng' : 'Lab Workbench Ready'}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 max-w-[260px] sm:max-w-sm bg-white/65 backdrop-blur-xs px-3 py-1 rounded-full">
            {language === 'vi'
              ? 'Thêm dụng cụ từ Kho hoặc thanh dưới để bắt đầu.'
              : 'Add gear from Shelf or Tray below to begin.'}
          </p>
        </div>
      )}

      {/* Transformed Logical Lab Stage Layer */}
      <div
        className="absolute left-0 top-0 origin-top-left pointer-events-none"
        style={{
          width: `${BENCH_W}px`,
          height: `${BENCH_H}px`,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${workbenchZoom})`,
        }}
      >
        {/* Snap Alignment Guides */}
        {activeSnapGuide && (
          <div
            className="absolute pointer-events-none z-40"
            style={{
              left: `${activeSnapGuide.targetX}px`,
              top: `${activeSnapGuide.targetY - 50}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className={`w-0.5 h-36 mx-auto ${
                activeSnapGuide.type === 'burner'
                  ? 'bg-gradient-to-b from-orange-500 via-amber-400 to-transparent'
                  : activeSnapGuide.type === 'burette'
                  ? 'bg-gradient-to-b from-blue-500 via-sky-400 to-transparent'
                  : 'bg-gradient-to-b from-emerald-500 via-emerald-400 to-transparent'
              }`}
            />
            <div className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900/90 text-white shadow-md whitespace-nowrap">
              {language === 'vi' ? activeSnapGuide.label_vi : activeSnapGuide.label_en}
            </div>
          </div>
        )}

        {/* Pour Drop Target Highlight Pill */}
        {(hoverTargetId && draggingId && equipment[hoverTargetId] ? equipment[hoverTargetId] : externalDragHoverVessel) && (
          (() => {
            const target =
              hoverTargetId && draggingId && equipment[hoverTargetId]
                ? equipment[hoverTargetId]
                : externalDragHoverVessel!;
            return (
              <div
                className="absolute pointer-events-none z-40 px-2.5 py-1 rounded-xl bg-blue-600/95 text-white text-[11px] font-semibold shadow-lg border border-blue-300"
                style={{
                  left: `${target.x + target.width / 2}px`,
                  top: `${target.y - 30}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                {hoverTargetId
                  ? language === 'vi' ? '⚡ Thả để rót sang' : '⚡ Release to Pour'
                  : language === 'vi' ? '💧 Thả để thêm hóa chất' : '💧 Release to Dispense'}
              </div>
            );
          })()
        )}

        {/* Animated External Reagent Pour / Dropper / Spatula SVG Overlay (Stage Coordinates) */}
        {activeExternalDoses.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none z-40 overflow-visible"
            width={BENCH_W}
            height={BENCH_H}
            viewBox={`0 0 ${BENCH_W} ${BENCH_H}`}
          >
            {activeExternalDoses.map((dose) => {
              const targetEq = equipment[dose.targetId];
              if (!targetEq) return null;
              return <PouringBottle2D key={dose.id} dose={dose} targetEq={targetEq} />;
            })}
          </svg>
        )}

        {/* Active Pouring Stream VFX */}
        {activePourVfx && (
          <PourStreamVfx
            startX={activePourVfx.startX}
            startY={activePourVfx.startY}
            endX={activePourVfx.endX}
            endY={activePourVfx.endY}
            liquidColorHex={activePourVfx.liquidColorHex}
          />
        )}

        {/* Chemical Spill Puddles */}
        {spillPuddles.map((puddle) => (
          <div
            key={puddle.id}
            className="absolute pointer-events-auto cursor-pointer group z-10"
            style={{
              left: `${puddle.x}px`,
              top: `${puddle.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              cleanSpill(puddle.id);
              soundEngine.playSpongeWipe();
            }}
            title={
              language === 'vi'
                ? `Vết tràn ${puddle.formula} (${puddle.volume_ml.toFixed(1)} mL, pH ${(puddle.ph ?? 7).toFixed(1)}) - Bấm để lau`
                : `Spill ${puddle.formula} (${puddle.volume_ml.toFixed(1)} mL) - Click to clean`
            }
          >
            <svg
              width={puddle.radius_px ? puddle.radius_px * 2.2 : 60}
              height={puddle.radius_px ? puddle.radius_px * 1.5 : 40}
              viewBox="0 0 100 60"
              className="overflow-visible drop-shadow-xs"
            >
              <path
                d="M 25,30 C 15,20 30,10 50,12 C 70,14 85,22 80,35 C 75,48 55,52 35,48 C 15,44 18,35 25,30 Z"
                fill={puddle.colorHex || '#94a3b8'}
                fillOpacity="0.78"
                stroke={puddle.isNeutralized ? '#10b981' : '#475569'}
                strokeWidth="1"
              />
              <path d="M 32,24 C 40,18 55,18 64,22 C 55,24 42,26 32,24 Z" fill="#ffffff" fillOpacity="0.45" />
              {puddle.isEffervescing && (
                <g fill="#ffffff" fillOpacity="0.85">
                  <circle cx="42" cy="28" r="2.8" />
                  <circle cx="55" cy="24" r="3.2" />
                  <circle cx="62" cy="32" r="2.4" />
                </g>
              )}
              {puddle.hasGlassShards && (
                <g stroke="#e2e8f0" strokeWidth="1" fill="#f8fafc" fillOpacity="0.8">
                  <polygon points="36,34 44,30 41,39" />
                  <polygon points="58,28 66,32 60,37" />
                </g>
              )}
            </svg>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900/95 text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap border border-slate-700 shadow-md z-30">
              <span>🧽 {language === 'vi' ? 'Lau' : 'Wipe'}</span>
              {puddle.ph !== undefined && (puddle.ph < 5.5 || puddle.ph > 8.5) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    neutralizeSpill(puddle.id);
                  }}
                  className="ml-1 px-1.5 py-0.2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                >
                  +NaHCO₃
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Benchtop Equipment Objects */}
        {allEquipmentList.map((item) => {
          const isDragging = draggingId === item.id;
          const isHoverTarget = hoverTargetId === item.id || externalDragHoverVessel?.id === item.id;
          const isPouring = activePourVfx?.sourceId === item.id;

          const balanceVessel =
            item.type === 'analytical_balance'
              ? allEquipmentList.find(
                  (v) =>
                    v.id !== item.id &&
                    v.isContainer &&
                    Math.abs(v.x + v.width / 2 - (item.x + item.width / 2)) < item.width * 0.45 &&
                    Math.abs(v.y + v.height - (item.y + 40)) < 45
                )
              : null;

          return (
            <div
              key={item.id}
              data-equipment-id={item.id}
              tabIndex={0}
              role="button"
              aria-label={formatEquipmentAriaLabel(item, language)}
              aria-pressed={selectedEquipmentId === item.id}
              className={`workbench-equipment pointer-events-auto absolute transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded-2xl ${
                isDragging ? 'z-40 opacity-95 scale-[1.03]' : 'z-10'
              } ${isHoverTarget ? 'ring-4 ring-emerald-400/80 rounded-2xl' : ''}`}
              style={{
                left: `${item.x}px`,
                top: `${item.y}px`,
                touchAction: 'none',
              }}
              onKeyDown={(e) => {
                if (
                  e.target !== e.currentTarget &&
                  (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement)
                ) {
                  return;
                }
                const rect = e.currentTarget.getBoundingClientRect();
                const handled = handleEquipmentKeyboardAction(
                  e.key,
                  e.shiftKey,
                  item,
                  selectedEquipmentId === item.id,
                  {
                    selectEquipment,
                    updatePosition,
                    removeEquipment,
                    openRadialMenu: (id) =>
                      setRadialTarget({
                        id,
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                      }),
                  }
                );
                if (handled) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.key === 'Escape') {
                    setRadialTarget(null);
                  }
                }
              }}
              onPointerDown={(e) => handleEquipmentPointerDown(item.id, e)}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(e) => handleVesselDrop(e, item.id)}
            >
              <EquipmentRenderer
                equipment={item}
                isSelected={selectedEquipmentId === item.id}
                isPouring={isPouring}
                onSelect={() => selectEquipment(item.id)}
                onToggleHeat={() => toggleHeat(item.id)}
                onTare={() => tareEquipment(item.id)}
                onToggleBurette={() => toggleBuretteStopcock(item.id)}
                onOpenRadialMenu={(cx, cy) => setRadialTarget({ id: item.id, x: cx, y: cy })}
                targetVesselForBalance={balanceVessel}
                language={language}
              />
            </div>
          );
        })}
      </div>

      {/* Pointer Drag Chemical Ghost Bottle / Dropper / Spatula Badge */}
      {isDraggingMoved && activeDrag?.kind === 'chemical' && (
        <ChemicalGhostCursor
          chemicalId={activeDrag.chemicalId}
          clientX={dragClientX}
          clientY={dragClientY}
          hoveredVesselName={
            externalDragHoverVessel
              ? language === 'vi'
                ? externalDragHoverVessel.name_vi
                : externalDragHoverVessel.name
              : undefined
          }
        />
      )}

      {/* Interactive Animated Litmus Strip Dip Modal */}
      <LitmusTestModal2D
        vessel={activeLitmusVessel}
        language={language}
        onClose={() => setActiveLitmusVesselId(null)}
      />

      {/* Floating Radial Quick Menu (Right-click, Long-press, or '⋯' icon) */}
      <RadialMenu2D
        equipment={radialEquipment}
        anchorX={radialTarget?.x ?? 0}
        anchorY={radialTarget?.y ?? 0}
        onClose={() => setRadialTarget(null)}
      />
    </div>
  );
};
