import { useEffect, useRef, useState } from 'react';
import type React from 'react';

export type PointerPosition = { x: number; y: number };
/** Pointer capture supports mouse, pen and touch without intercepting page scrolling. */
export function usePointerGesture() {
  const cleanup = useRef<() => void>(() => {});
  const [active, setActive] = useState(false);
  useEffect(() => () => cleanup.current(), []);
  function begin(event: React.PointerEvent<HTMLElement>, onMove: (point: PointerPosition) => void, onEnd?: (cancelled: boolean) => void) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault(); event.stopPropagation(); cleanup.current();
    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    handle.setPointerCapture(pointerId); setActive(true);
    const move = (e: PointerEvent) => { if (e.pointerId === pointerId) onMove({ x: e.clientX, y: e.clientY }); };
    const finish = (cancelled: boolean) => { release(); onEnd?.(cancelled); };
    const up = (e: PointerEvent) => { if (e.pointerId === pointerId) { onMove({ x: e.clientX, y: e.clientY }); finish(false); } };
    const cancel = (e: PointerEvent) => { if (e.pointerId === pointerId) finish(true); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(true); };
    const blur = () => finish(true);
    const release = () => {
      handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', cancel); handle.removeEventListener('lostpointercapture', cancel);
      window.removeEventListener('keydown', escape); window.removeEventListener('blur', blur);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      cleanup.current = () => {}; setActive(false);
    };
    cleanup.current = release;
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', cancel); handle.addEventListener('lostpointercapture', cancel);
    window.addEventListener('keydown', escape); window.addEventListener('blur', blur);
  }
  return { active, begin };
}
