import React, { useEffect, useRef, useState } from 'react';
import { Braces, Grip, Maximize2, Minimize2, Minus, Play, Smartphone, X } from 'lucide-react';
import { StudioFile } from './project';
import { usePointerGesture } from './usePointerGesture';

export type PreviewDock = 'right' | 'bottom' | 'floating';
interface Rect { x: number; y: number; width: number; height: number }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function fitFloating(rect: Rect, viewportWidth: number, viewportHeight: number): Rect {
  const width = clamp(rect.width, Math.min(270, viewportWidth - 16), viewportWidth - 16);
  const height = clamp(rect.height, Math.min(180, viewportHeight - 24), viewportHeight - 24);
  return { width, height, x: clamp(rect.x, 8, viewportWidth - width - 8), y: clamp(rect.y, 8, viewportHeight - height - 8) };
}
interface Props {
  dock: PreviewDock;
  onDock: (dock: PreviewDock) => void;
  frameRef: React.RefObject<HTMLIFrameElement>;
  doc: string;
  docKey: number;
  htmlFiles: StudioFile[];
  entry: string;
  onEntry: (path: string) => void;
  auto: boolean;
  onAuto: (value: boolean) => void;
  onRun: () => void;
  onClose: () => void;
}
export default function StudioPreview({ dock, onDock, frameRef, doc, docKey, htmlFiles, entry, onEntry, auto, onAuto, onRun, onClose }: Props) {
  const panel = useRef<HTMLElement>(null);
  const [phone, setPhone] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [rightWidth, setRightWidth] = useState(420);
  const [bottomHeight, setBottomHeight] = useState(300);
  const [rect, setRect] = useState(() => {
    const mobile = window.innerWidth < 700;
    const width = mobile ? 330 : 420, height = mobile ? 280 : 410;
    return fitFloating({ x: window.innerWidth - width - 20, y: mobile ? window.innerHeight - height - 100 : 125, width, height }, window.innerWidth, window.innerHeight);
  });
  const gesture = usePointerGesture();
  useEffect(() => {
    const resize = () => setRect(r => fitFloating(r, window.innerWidth, window.visualViewport?.height || window.innerHeight));
    window.addEventListener('resize', resize); window.visualViewport?.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize); };
  }, []);
  function changeDock(value: PreviewDock) { onDock(value); setMinimized(false); setMaximized(false); }
  function dragWindow(event: React.PointerEvent<HTMLButtonElement>) {
    if (dock !== 'floating' || maximized) return;
    const start = { x: event.clientX, y: event.clientY }; const original = rect;
    gesture.begin(event, point => setRect(fitFloating({ ...original, x: original.x + point.x - start.x, y: original.y + point.y - start.y }, window.innerWidth, window.visualViewport?.height || window.innerHeight)));
  }
  function resize(event: React.PointerEvent<HTMLElement>) {
    const start = { x: event.clientX, y: event.clientY }; const original = rect;
    const area = panel.current?.closest('.studio-document-area')?.getBoundingClientRect();
    gesture.begin(event, point => {
      if (dock === 'floating') setRect(fitFloating({ ...original, width: original.width + point.x - start.x, height: original.height + point.y - start.y }, window.innerWidth, window.visualViewport?.height || window.innerHeight));
      else if (dock === 'right' && area) setRightWidth(clamp(area.right - point.x, 250, Math.max(250, area.width - 180)));
      else if (area) setBottomHeight(clamp(area.bottom - point.y, 160, Math.max(160, area.height - 120)));
    });
  }
  const style: React.CSSProperties = maximized ? {} : dock === 'floating' ? { left: rect.x, top: rect.y, width: rect.width, height: minimized ? 42 : rect.height } : minimized ? {} : dock === 'right' ? { width: rightWidth } : { height: bottomHeight };
  return <>
    {dock !== 'floating' && !minimized && !maximized && <div className={`studio-preview-divider divider-${dock}`} role="separator" tabIndex={0} aria-label="Đổi kích thước preview" aria-orientation={dock === 'right' ? 'vertical' : 'horizontal'} aria-valuenow={Math.round(dock === 'right' ? rightWidth : bottomHeight)} onPointerDown={resize} onKeyDown={e => { const delta = ['ArrowRight', 'ArrowDown'].includes(e.key) ? -24 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? 24 : 0; if (delta) { e.preventDefault(); const area = panel.current?.closest('.studio-document-area')?.getBoundingClientRect(); if (dock === 'right') setRightWidth(w => clamp(w + delta, 250, Math.max(250, (area?.width || window.innerWidth) - 180))); else setBottomHeight(h => clamp(h + delta, 160, Math.max(160, (area?.height || window.innerHeight) - 120))); } }} />}
    <section ref={panel} style={style} className={`studio-preview dock-${dock} ${minimized ? 'is-minimized' : ''} ${maximized ? 'is-maximized' : ''} ${gesture.active ? 'is-adjusting' : ''}`} aria-label="Xem trước website">
      <div className="studio-preview-toolbar">
        <button className="studio-preview-grip" onPointerDown={dragWindow} onKeyDown={e => { const dx = e.key === 'ArrowRight' ? 16 : e.key === 'ArrowLeft' ? -16 : 0, dy = e.key === 'ArrowDown' ? 16 : e.key === 'ArrowUp' ? -16 : 0; if (dx || dy) { e.preventDefault(); setRect(r => fitFloating({ ...r, x: r.x + dx, y: r.y + dy }, window.innerWidth, window.innerHeight)); } }} disabled={dock !== 'floating' || maximized} aria-label="Kéo di chuyển preview" title="Kéo hoặc dùng phím mũi tên để di chuyển"><Grip size={13} /><span className="studio-live-dot" /><span>PREVIEW</span></button>
        <div>
          <select className="studio-preview-dock" aria-label="Vị trí preview" value={dock} onChange={e => changeDock(e.target.value as PreviewDock)}><option value="right">Bên phải</option><option value="bottom">Bên dưới</option><option value="floating">Cửa sổ nổi</option></select>
          <button className={phone ? 'active studio-preview-phone' : 'studio-preview-phone'} onClick={() => setPhone(v => !v)} title="Đổi kích thước preview" aria-label="Preview kích thước điện thoại"><Smartphone size={15} /></button>
          <button onClick={() => onRun()} aria-label="Chạy lại preview" title="Chạy lại preview"><Play size={14} /></button>
          <button onClick={() => { setMinimized(v => !v); setMaximized(false); }} aria-label={minimized ? 'Khôi phục preview' : 'Thu gọn preview'} title={minimized ? 'Khôi phục preview' : 'Thu gọn preview'}>{minimized ? <Maximize2 size={14} /> : <Minus size={14} />}</button>
          <button className="studio-preview-maximize" onClick={() => { setMaximized(v => !v); setMinimized(false); }} aria-label={maximized ? 'Thoát toàn màn hình preview' : 'Toàn màn hình preview'}>{maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
          <button onClick={onClose} aria-label="Đóng preview"><X size={15} /></button>
        </div>
      </div>
      <div className="studio-preview-content" hidden={minimized}>
        <div className="studio-preview-address"><span className="studio-address-dot" />{htmlFiles.length ? <select aria-label="Trang HTML mở đầu" value={entry} onChange={e => onEntry(e.target.value)}>{htmlFiles.map(f => <option key={f.path} value={f.path}>studio.local / {f.path}</option>)}</select> : <span>Chưa có trang HTML</span>}<label title="Tự chạy lại preview sau khi sửa code"><input type="checkbox" checked={auto} onChange={e => onAuto(e.target.checked)} />Tự chạy</label></div>
        <div className={`studio-preview-canvas ${phone ? 'phone-size' : ''}`}>{doc ? <iframe key={docKey} ref={frameRef} title="Preview dự án" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={doc} /> : <div className="studio-preview-empty"><Braces size={38} /><h2>Biến code thành hiện thực.</h2><p>{htmlFiles.length ? 'Bấm Chạy để mở website của bạn.' : 'Python, C++ và JavaScript console hiển thị kết quả trong Console.'}</p>{htmlFiles.length > 0 && <button className="studio-run" onClick={onRun}><Play size={14} />Chạy preview</button>}</div>}</div>
        <div className="studio-preview-footnote">HTML + CSS + JS · Chạy cách ly trong trình duyệt</div>
      </div>
      {dock === 'floating' && !minimized && !maximized && <button className="studio-preview-resize" aria-label="Đổi kích thước cửa sổ preview" onPointerDown={resize} onKeyDown={e => { const dx = e.key === 'ArrowRight' ? 20 : e.key === 'ArrowLeft' ? -20 : 0; const dy = e.key === 'ArrowDown' ? 20 : e.key === 'ArrowUp' ? -20 : 0; if (dx || dy) { e.preventDefault(); setRect(r => fitFloating({ ...r, width: r.width + dx, height: r.height + dy }, window.innerWidth, window.innerHeight)); } }}>◢</button>}
    </section>
    {gesture.active && <div className="studio-gesture-shield" />}
  </>;
}
