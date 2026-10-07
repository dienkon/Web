/**
 * CHEMDEX LAB - KeyMap
 * Global keyboard shortcuts router adhering to project parity rules:
 * Q/E tilt, R/F lift, Z/X yaw, T tongs, G grab/release, Space pour assist,
 * Esc cancel, M meniscus reading mode, ? cheat-sheet.
 */

import { useAppStore } from '../store/useAppStore';
import { PourController } from '../pour/controller/PourController';
import { clampTilt, clampLift } from '../handling/limits';
import { wheelRouter } from './WheelRouter';

export interface KeyBindingHelp {
  key: string;
  action_en: string;
  action_vi: string;
  category: 'manipulation' | 'tools' | 'camera' | 'view';
}

export const LAB_KEY_BINDINGS: KeyBindingHelp[] = [
  { key: 'Q / E', action_en: 'Tilt vessel ∓', action_vi: 'Nghiêng bình ∓', category: 'manipulation' },
  { key: 'R / F', action_en: 'Lift / lower vessel', action_vi: 'Nâng / hạ bình', category: 'manipulation' },
  { key: 'Z / X', action_en: 'Rotate yaw ∓', action_vi: 'Xoay bình ngang ∓', category: 'manipulation' },
  { key: 'G', action_en: 'Grab / place vessel', action_vi: 'Cầm / đặt dụng cụ', category: 'manipulation' },
  { key: 'Space', action_en: 'Hold to pour assist', action_vi: 'Giữ phím để rót tự động', category: 'manipulation' },
  { key: 'Esc', action_en: 'Cancel pour / release object', action_vi: 'Hủy thao tác / thả dụng cụ', category: 'manipulation' },
  { key: 'T', action_en: 'Toggle tongs grip', action_vi: 'Kẹp / nhả bằng kẹp gắp', category: 'tools' },
  { key: 'M', action_en: 'Meniscus eye-level reading mode', action_vi: 'Góc nhìn đọc vạch chia (ngang tầm mắt)', category: 'view' },
  { key: 'Wheel', action_en: 'Tilt / adjust hovered parameter', action_vi: 'Lăn chuột để chỉnh thông số', category: 'manipulation' },
  { key: 'Shift+Wheel', action_en: 'Adjust height / fine volume', action_vi: 'Chỉnh độ cao / thể tích tinh', category: 'manipulation' },
  { key: 'Alt+Wheel', action_en: 'Rotate yaw / fine angle', action_vi: 'Xoay góc ngang / chỉnh siêu mịn', category: 'manipulation' },
  { key: '?', action_en: 'Show / hide shortcuts cheat-sheet', action_vi: 'Bật / tắt bảng phím tắt', category: 'view' },
];

export function handleLabKeyDown(e: KeyboardEvent): boolean {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return false;
  }

  const store = useAppStore.getState();
  const selectedId = store.selectedVesselId || store.draggingVesselId;
  const vessel = selectedId ? store.vessels[selectedId] : null;
  const session = PourController.getSession();

  switch (e.key) {
    // Tilt Left / More (Q)
    case 'q':
    case 'Q': {
      if (session) {
        const newTilt = clampTilt(vessel?.type, session.targetTilt + 0.08);
        PourController.setTilt(newTilt);
        return true;
      } else if (selectedId && store.nearestPourTargetId) {
        PourController.beginPour({
          mode: 'HAND_TILT',
          sourceId: selectedId,
          targetId: store.nearestPourTargetId
        });
        PourController.setTilt(0.2);
        return true;
      }
      break;
    }

    // Tilt Right / Less (E)
    case 'e':
    case 'E': {
      if (session) {
        const newTilt = clampTilt(vessel?.type, Math.max(0, session.targetTilt - 0.08));
        PourController.setTilt(newTilt);
        return true;
      }
      break;
    }

    // Lift Up (R)
    case 'r':
    case 'R': {
      if (vessel && selectedId) {
        const newLift = clampLift(vessel.type, vessel.position[1] + 0.1);
        store.updateVesselPosition(selectedId, [vessel.position[0], newLift, vessel.position[2]]);
        return true;
      }
      break;
    }

    // Lower Down (F)
    case 'f':
    case 'F': {
      if (vessel && selectedId) {
        const newLift = clampLift(vessel.type, vessel.position[1] - 0.1);
        store.updateVesselPosition(selectedId, [vessel.position[0], newLift, vessel.position[2]]);
        return true;
      }
      break;
    }

    // Rotate Yaw Left (Z)
    case 'z':
    case 'Z': {
      if (selectedId) {
        store.rotateVessel(selectedId, -0.15);
        return true;
      }
      break;
    }

    // Rotate Yaw Right (X)
    case 'x':
    case 'X': {
      if (selectedId) {
        store.rotateVessel(selectedId, 0.15);
        return true;
      }
      break;
    }

    // Grab / Release (G)
    case 'g':
    case 'G': {
      if (store.draggingVesselId) {
        store.setDraggingVesselId(null);
      } else if (store.selectedVesselId) {
        store.setDraggingVesselId(store.selectedVesselId);
      }
      return true;
    }

    // Toggle Tongs (T)
    case 't':
    case 'T': {
      // Find tongs
      const tongsEntry = Object.entries(store.vessels).find(([_, v]) => v.type === 'tongs');
      if (tongsEntry) {
        const [tongsId, tongsVessel] = tongsEntry;
        if (selectedId && selectedId !== tongsId) {
          store.toggleGripWithTongs(tongsId, selectedId);
          return true;
        }
      }
      break;
    }

    // Meniscus Reading Mode (M)
    case 'm':
    case 'M': {
      if (selectedId && vessel) {
        // Toggle camera focus to vessel mouth/meniscus level
        if (store.cameraFocusPosition) {
          store.setCameraFocusPosition(null);
        } else {
          store.setCameraFocusPosition([vessel.position[0], vessel.position[1] + 0.35, vessel.position[2]]);
        }
        return true;
      }
      break;
    }

    // Cancel / Put down (Esc)
    case 'Escape': {
      if (session) {
        PourController.cancelPour();
      }
      if (store.draggingVesselId) {
        store.setDraggingVesselId(null);
      }
      store.setSelectedVesselId(null);
      return true;
    }
  }

  return false;
}
