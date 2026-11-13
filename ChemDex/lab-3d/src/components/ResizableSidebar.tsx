import React, { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useAppStore } from '../store/useAppStore';

type Side = 'left' | 'right';
const defaults = { left: 288, right: 320 };
const storageKey = 'chemdex-sidebar-widths';
const clamp = (width: number) => Math.max(220, Math.min(560, width));
function savedWidths() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    return Object.fromEntries(Object.entries(defaults).map(([side, width]) =>
      [side, Number.isFinite(saved[side]) ? clamp(saved[side]) : width])) as typeof defaults;
  } catch { return defaults; }
}
const useWidths = create(() => savedWidths());
function setWidth(side: Side, width: number) {
  useWidths.setState({ [side]: clamp(width) });
  try { localStorage.setItem(storageKey, JSON.stringify(useWidths.getState())); } catch { /* Storage can be disabled. */ }
}

/** Shared by the manual and automatic benches; resizing never remounts a canvas. */
export function ResizableSidebar({ side, children, className = '' }: {
  side: Side; children: React.ReactNode; className?: string;
}) {
  const widths = useWidths();
  const oppositeOpen = useAppStore(s => side === 'left' ? s.rightSidebarOpen : s.leftSidebarOpen);
  const language = useAppStore(s => s.language);
  const root = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; width: number; pointer: number } | null>(null);
  const frame = useRef(0), pending = useRef(widths[side]);
  const width = widths[side];
  const otherWidth = oppositeOpen ? widths[side === 'left' ? 'right' : 'left'] : 0;
  const label = language === 'en' ? `Resize ${side} sidebar` : `Đổi chiều rộng sidebar ${side === 'left' ? 'trái' : 'phải'}`;
  const stop = () => {
    if (!drag.current) return;
    drag.current = null;
    cancelAnimationFrame(frame.current);
    setWidth(side, pending.current);
    document.documentElement.classList.remove('sidebar-resizing');
  };
  useEffect(() => () => { cancelAnimationFrame(frame.current); document.documentElement.classList.remove('sidebar-resizing'); }, []);
  const limit = (next: number) => clamp(Math.min(next, window.innerWidth < 768
    ? window.innerWidth * 0.85 : Math.max(220, window.innerWidth - otherWidth - 300)));
  return <aside ref={root} data-sidebar={side} className={`resizable-sidebar resizable-sidebar-${side} ${className}`}
    style={{ '--sidebar-width': `${width}px`, '--opposite-width': `${otherWidth}px` } as React.CSSProperties}>
    {children}
    <div role="separator" aria-orientation="vertical" aria-label={label} aria-valuemin={220} aria-valuemax={560}
      aria-valuenow={width} tabIndex={0} title={`${label} · ← → · ${language === 'en' ? 'Double-click to reset' : 'Nhấn đúp để đặt lại'}`}
      className="sidebar-resize-handle"
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault();
        pending.current = root.current?.getBoundingClientRect().width ?? width;
        drag.current = { x: event.clientX, width: pending.current, pointer: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
        document.documentElement.classList.add('sidebar-resizing');
      }}
      onPointerMove={event => {
        const start = drag.current;
        if (!start || start.pointer !== event.pointerId) return;
        pending.current = limit(start.width + (event.clientX - start.x) * (side === 'left' ? 1 : -1));
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => useWidths.setState({ [side]: pending.current }));
      }}
      onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
      onDoubleClick={() => setWidth(side, defaults[side])}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const change = (event.key === 'ArrowRight' ? 1 : -1) * (side === 'left' ? 1 : -1) * (event.shiftKey ? 40 : 16);
        setWidth(side, event.key === 'Home' ? defaults[side] : event.key === 'End' ? limit(560) : limit(width + change));
      }}><span /></div>
  </aside>;
}
