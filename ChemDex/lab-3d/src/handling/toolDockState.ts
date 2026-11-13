import { create } from 'zustand';
export type ToolPosition = [number, number, number];
interface DockState {
  positions: Record<string, ToolPosition>;
  deployed: Record<string, boolean>;
  dragging: string | null;
}
// Presence is an explicit user action, independent of the global move mode.
export const useToolDockStore = create<DockState>(() => ({ positions: {}, deployed: {}, dragging: null }));
