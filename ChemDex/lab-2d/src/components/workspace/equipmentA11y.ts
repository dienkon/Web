import type { EquipmentState } from '../../types/equipment';
import type { LabLogEntry } from '../../types/experiment';
import type { SafetyViolationAlert } from '../../engine/safetyEngine2D';

export const KEYBOARD_BENCH_BOUNDS = {
  minX: -20,
  maxX: 640, // BENCH_W (720) - 80
  minY: 10,
  maxY: 400, // BENCH_H (490) - 90
} as const;

/**
 * Guards global workbench keyboard shortcuts so typing in inputs, selects,
 * contentEditable regions, open modals, or already-consumed events never mutates the bench.
 */
export function shouldIgnoreWorkbenchGlobalKey(e: {
  target: EventTarget | null;
  defaultPrevented?: boolean;
}): boolean {
  if (e.defaultPrevented) return true;
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName?.toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (typeof target.closest === 'function') {
    if (target.closest('[contenteditable="true"], [role="dialog"], [aria-modal="true"]')) {
      return true;
    }
  }
  return false;
}

export interface EquipmentKeyHandlers {
  selectEquipment: (id: string | null) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  removeEquipment: (id: string) => void;
  openRadialMenu: (id: string) => void;
}

/**
 * Formats an informative screen-reader label summarizing equipment name, volume, and contents.
 */
export function formatEquipmentAriaLabel(item: EquipmentState, language: 'vi' | 'en'): string {
  const vi = language === 'vi';
  const name = vi ? item.name_vi : item.name;
  const activeContents = item.contents
    .filter((c) => c.moles > 1e-6)
    .slice(0, 4)
    .map((c) => c.formula);

  if (!item.isContainer) {
    if (item.type === 'bunsen_burner' || item.type === 'hot_plate') {
      const stateText = item.isOn ? (vi ? 'đang bật' : 'on') : vi ? 'đang tắt' : 'off';
      return `${name}, ${stateText}`;
    }
    return name;
  }

  const volText =
    item.volume_ml > 0.05
      ? `${item.volume_ml.toFixed(item.volume_ml < 10 ? 1 : 0)} mL`
      : vi
        ? 'trống'
        : 'empty';

  const contentsText =
    activeContents.length > 0
      ? activeContents.join(', ')
      : vi
        ? 'không có chất'
        : 'no reagents';

  const tempText = item.temperature_c > 35 ? `, ${item.temperature_c.toFixed(0)}°C` : '';
  return `${name}, ${volText}, ${contentsText}${tempText}`;
}

/**
 * Executes keyboard interaction commands (move, open actions menu, remove, deselect)
 * for a focused workbench equipment item. Returns true if the key was handled.
 */
export function handleEquipmentKeyboardAction(
  key: string,
  shiftKey: boolean,
  item: Pick<EquipmentState, 'id' | 'x' | 'y'>,
  isSelected: boolean,
  handlers: EquipmentKeyHandlers
): boolean {
  const step = shiftKey ? 40 : 10;

  switch (key) {
    case 'ArrowLeft':
      handlers.updatePosition(
        item.id,
        Math.max(KEYBOARD_BENCH_BOUNDS.minX, Math.min(KEYBOARD_BENCH_BOUNDS.maxX, item.x - step)),
        item.y
      );
      return true;
    case 'ArrowRight':
      handlers.updatePosition(
        item.id,
        Math.max(KEYBOARD_BENCH_BOUNDS.minX, Math.min(KEYBOARD_BENCH_BOUNDS.maxX, item.x + step)),
        item.y
      );
      return true;
    case 'ArrowUp':
      handlers.updatePosition(
        item.id,
        item.x,
        Math.max(KEYBOARD_BENCH_BOUNDS.minY, Math.min(KEYBOARD_BENCH_BOUNDS.maxY, item.y - step))
      );
      return true;
    case 'ArrowDown':
      handlers.updatePosition(
        item.id,
        item.x,
        Math.max(KEYBOARD_BENCH_BOUNDS.minY, Math.min(KEYBOARD_BENCH_BOUNDS.maxY, item.y + step))
      );
      return true;
    case 'Enter':
    case ' ':
      handlers.selectEquipment(item.id);
      handlers.openRadialMenu(item.id);
      return true;
    case 'Delete':
    case 'Backspace':
      handlers.removeEquipment(item.id);
      return true;
    case 'Escape':
      if (isSelected) {
        handlers.selectEquipment(null);
      }
      return true;
    default:
      return false;
  }
}

/**
 * Picks the latest reaction or safety warning announcement for the ARIA polite live region.
 */
export function buildLiveAnnouncementText(
  history: LabLogEntry[],
  safetyAlerts: SafetyViolationAlert[],
  language: 'vi' | 'en'
): string {
  const vi = language === 'vi';
  const latestAlert = safetyAlerts.at(-1);
  const latestLog = history.at(-1);

  if (latestAlert && (!latestLog || latestAlert.timestamp >= latestLog.timestamp)) {
    const title = vi ? latestAlert.title_vi : latestAlert.title_en;
    const msg = vi ? latestAlert.message_vi : latestAlert.message_en;
    return `${title}: ${msg}`;
  }

  if (latestLog && (latestLog.actionType === 'REACTION' || latestLog.actionType === 'HEAT')) {
    return vi ? latestLog.details_vi : latestLog.details_en;
  }

  return '';
}
