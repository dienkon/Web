import { create } from 'zustand';
import { EquipmentType } from '../types/equipment';

export type PointerDragPayload =
  | {
      kind: 'equipment';
      type: EquipmentType;
      label: string;
      icon: string;
    }
  | {
      kind: 'chemical';
      chemicalId: string;
      formula: string;
      label: string;
      colorHex: string;
    };

interface PointerDragStoreState {
  activeDrag: PointerDragPayload | null;
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
  isDraggingMoved: boolean;
  startDrag: (payload: PointerDragPayload, clientX: number, clientY: number) => void;
  moveDrag: (clientX: number, clientY: number) => void;
  clearDrag: () => void;
}

export const usePointerDragStore = create<PointerDragStoreState>((set) => ({
  activeDrag: null,
  clientX: 0,
  clientY: 0,
  startX: 0,
  startY: 0,
  isDraggingMoved: false,

  startDrag: (payload, clientX, clientY) =>
    set({
      activeDrag: payload,
      clientX,
      clientY,
      startX: clientX,
      startY: clientY,
      isDraggingMoved: false,
    }),

  moveDrag: (clientX, clientY) =>
    set((s) => {
      if (!s.activeDrag) return s;
      const moved = s.isDraggingMoved || Math.hypot(clientX - s.startX, clientY - s.startY) > 7;
      return {
        clientX,
        clientY,
        isDraggingMoved: moved,
      };
    }),

  clearDrag: () =>
    set({
      activeDrag: null,
      isDraggingMoved: false,
    }),
}));
