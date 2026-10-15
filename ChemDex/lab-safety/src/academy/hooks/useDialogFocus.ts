import { RefObject, useEffect } from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

export function useDialogFocus(ref: RefObject<HTMLElement | null>, onEscape: () => void) {
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;
    if (!root) return;
    const focus = () => {
      const first = root.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? root).focus();
    };
    focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
        return;
      }
      if (event.key !== 'Tab') return;
      const candidates = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(element => element.getClientRects().length > 0);
      if (!candidates.length) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = candidates[0];
      const last = candidates[candidates.length - 1];
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', key);
    return () => {
      root.removeEventListener('keydown', key);
      if (previous?.isConnected) previous.focus();
    };
  }, [ref, onEscape]);
}
