import { useEffect, useMemo, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { create } from 'zustand';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { restingToolHeight, toolVisible } from './handheldRest';
import { beginPointerDrag } from './pointerDrag';

export type ToolPosition = [number, number, number];
interface DockState {
  positions: Record<string, ToolPosition>;
  dragging: string | null;
}
export const useToolDockStore = create<DockState>(() => ({ positions: {}, dragging: null }));

export function constrainToolPosition(x: number, y: number, z: number): ToolPosition {
  return [Math.max(-10, Math.min(10, x)), y, Math.max(-4.5, Math.min(4.5, z))];
}

/** Move the resting position without coupling independent tools to vessel IDs.
 * Native pointer capture keeps movement/release working outside the canvas.
 */
export function useToolDock(id: string, initial: ToolPosition, onMove?: (position: ToolPosition) => void) {
  const { camera, gl } = useThree();
  const savedPosition = useToolDockStore(state => state.positions[id]);
  const moveMode = useAppStore(state => state.moveMode);
  const active = useAppStore(state => state.activeTool === id);
  const dragging = useToolDockStore(state => state.dragging === id);
  const rawPosition = savedPosition ?? initial;
  const position = useMemo<ToolPosition>(() => [rawPosition[0], restingToolHeight(id, rawPosition[1]), rawPosition[2]],
    [id, rawPosition[0], rawPosition[1], rawPosition[2]]);
  const options = useRef({ position, onMove });
  options.current = { position, onMove };
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => { if (!moveMode) cleanup.current?.(); }, [moveMode]);
  useEffect(() => () => cleanup.current?.(), [id]);

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!moveMode || event.button !== 0) return;
    event.stopPropagation();
    if (useToolDockStore.getState().dragging !== null) return;
    cleanup.current?.();
    useAppStore.getState().setActiveTool('none');
    const canvas = gl.domElement;
    const pointerId = event.pointerId;
    const origin: ToolPosition = [...options.current.position];
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -origin[1]);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const intersection = new THREE.Vector3();
    const offset = new THREE.Vector3();
    const project = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.ray.intersectPlane(plane, intersection);
    };
    if (!project(event.clientX, event.clientY)) return;
    offset.set(origin[0] - intersection.x, 0, origin[2] - intersection.z);
    const publish = (next: ToolPosition) => {
      useToolDockStore.setState(state => ({ positions: { ...state.positions, [id]: next } }));
      options.current.onMove?.(next);
    };
    useToolDockStore.setState({ dragging: id });
    cleanup.current = beginPointerDrag({ canvas, events: window, pointerId,
      schedule: requestAnimationFrame, cancelFrame: cancelAnimationFrame,
      onMove: native => {
        if (!project(native.clientX, native.clientY)) return;
        publish(constrainToolPosition(intersection.x + offset.x, origin[1], intersection.z + offset.z));
      },
      onEnd: committed => {
        if (!committed) publish(origin);
        if (useToolDockStore.getState().dragging === id) useToolDockStore.setState({ dragging: null });
        cleanup.current = null;
      },
    });
  };
  return { position, moveMode, onPointerDown, visible: toolVisible(active, dragging, moveMode) };
}
