import React, { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useLabStore } from '../../store/useLabStore';

type Side = 'left' | 'right';
const DEFAULTS = { left: 300, right: 320 };
const STORAGE_KEY = 'chemdex-2d-sidebar-widths';

const clampWidth = (w: number) => Math.max(240, Math.min(480, w));

function loadSavedWidths() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      left: Number.isFinite(raw.left) ? clampWidth(raw.left) : DEFAULTS.left,
      right: Number.isFinite(raw.right) ? clampWidth(raw.right) : DEFAULTS.right,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

const useSidebarWidths = create(() => loadSavedWidths());

function persistWidth(side: Side, width: number) {
  const clamped = clampWidth(width);
  useSidebarWidths.setState({ [side]: clamped });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(useSidebarWidths.getState()));
  } catch {
    // Storage unavailable
  }
}

interface ResizableSidebarProps {
  side: Side;
  className?: string;
  children: React.ReactNode;
}

export const ResizableSidebar: React.FC<ResizableSidebarProps> = ({
  side,
  className = '',
  children,
}) => {
  const widths = useSidebarWidths();
  const language = useLabStore((s) => s.language);
  const rootRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ x: number; startWidth: number; pointerId: number } | null>(null);
  const rafRef = useRef(0);
  const pendingWidthRef = useRef(widths[side]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const stopResize = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    cancelAnimationFrame(rafRef.current);
    persistWidth(side, pendingWidthRef.current);
  };

  const label =
    language === 'en'
      ? `Resize ${side} panel`
      : `Điều chỉnh độ rộng bảng ${side === 'left' ? 'trái' : 'phải'}`;

  return (
    <aside
      ref={rootRef}
      data-sidebar={side}
      className={`relative shrink-0 h-full ${className}`}
      style={{ width: `${widths[side]}px` }}
    >
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuemin={240}
        aria-valuemax={480}
        aria-valuenow={widths[side]}
        tabIndex={0}
        title={`${label} (double-click to reset)`}
        className={`hidden lg:flex items-center justify-center absolute top-0 bottom-0 w-2 z-20 cursor-col-resize group hover:bg-blue-500/15 transition-colors ${
          side === 'left' ? '-right-1' : '-left-1'
        }`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          pendingWidthRef.current = rootRef.current?.getBoundingClientRect().width ?? widths[side];
          dragRef.current = { x: e.clientX, startWidth: pendingWidthRef.current, pointerId: e.pointerId };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = dragRef.current;
          if (!d || d.pointerId !== e.pointerId) return;
          const delta = (e.clientX - d.x) * (side === 'left' ? 1 : -1);
          pendingWidthRef.current = clampWidth(d.startWidth + delta);
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(() =>
            useSidebarWidths.setState({ [side]: pendingWidthRef.current })
          );
        }}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
        onLostPointerCapture={stopResize}
        onDoubleClick={() => persistWidth(side, DEFAULTS[side])}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          const dir = (e.key === 'ArrowRight' ? 1 : -1) * (side === 'left' ? 1 : -1);
          persistWidth(side, widths[side] + dir * (e.shiftKey ? 32 : 16));
        }}
      >
        <span className="w-0.5 h-10 rounded-full bg-slate-300/70 group-hover:bg-blue-500 transition-colors" />
      </div>
    </aside>
  );
};
