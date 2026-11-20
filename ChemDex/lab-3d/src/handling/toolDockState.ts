import { create } from 'zustand';
export type ToolPosition = [number, number, number];
export function constrainToolPosition(x: number, y: number, z: number): ToolPosition {
  return [Math.max(-10, Math.min(10, x)), y, Math.max(-4.5, Math.min(4.5, z))];
}

interface DockState {
  positions: Record<string, ToolPosition>;
  deployed: Record<string, boolean>;
  dragging: string | null;
}
// Presence is an explicit user action, independent of the global move mode.
export const useToolDockStore = create<DockState>(() => ({ positions: {}, deployed: {}, dragging: null }));
