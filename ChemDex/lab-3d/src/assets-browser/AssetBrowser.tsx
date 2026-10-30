import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Beaker, Box, Camera, Check, ChevronLeft, ChevronRight, CircleHelp, Grid2X2, Layers3, Maximize, Minus, Pause, Play, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { AssetViewport, type CameraCommand, type CameraView, type ModelStats } from './AssetViewport';
import { assets, categories, equipmentAssets, searchAssets, type Category } from './catalog';
import { ErrorBoundary } from '../components/ErrorBoundary';
import './asset-browser.css';

const backgrounds = [{ name: 'Đêm', color: '#101d2b' }, { name: 'Xám', color: '#3b4654' }, { name: 'Sáng', color: '#e2e8ef' }];
const initialAsset = () => assets.find(a => a.id === new URLSearchParams(location.search).get('asset')) ?? assets[0];

export default function AssetBrowser() {
  const [asset, setAsset] = useState(initialAsset);
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [rotate, setRotate] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [wireframe, setWireframe] = useState(false), [grid, setGrid] = useState(true);
  const [background, setBackground] = useState(backgrounds[0].color), [lighting, setLighting] = useState(1);
  const [quality, setQuality] = useState<'smooth' | 'detail'>('smooth');
  const [command, setCommand] = useState<CameraCommand>({ view: 'perspective', serial: 0 });
  const [stats, setStats] = useState<ModelStats>({ meshes: 0, triangles: 0 });
  const [catalogOpen, setCatalogOpen] = useState(false), [detailsOpen, setDetailsOpen] = useState(false);
  const [help, setHelp] = useState(false), [notice, setNotice] = useState('');
  const canvas = useRef<HTMLCanvasElement | null>(null), stage = useRef<HTMLDivElement>(null);
  const onCanvas = useCallback((element: HTMLCanvasElement) => { canvas.current = element; }, []);
  const filtered = useMemo(() => searchAssets(query, category), [query, category]);
  const index = filtered.findIndex(a => a.id === asset.id);
  const select = useCallback((next: typeof asset) => {
    setAsset(next); if (next.id !== asset.id) setStats({ meshes: 0, triangles: 0 }); setCatalogOpen(false);
    setCommand(c => ({ view: 'perspective', serial: c.serial + 1 }));
    const url = new URL(location.href); url.searchParams.set('view', 'assets'); url.searchParams.set('asset', next.id);
    history.replaceState(null, '', url);
  }, [asset.id]);
  const view = useCallback((next: CameraView) => {
    setRotate(false); setCommand(c => ({ view: next, serial: c.serial + 1 }));
  }, []);
  const adjacent = useCallback((offset: number) => {
    if (!filtered.length) return;
    select(filtered[(Math.max(0, index) + offset + filtered.length) % filtered.length]);
  }, [filtered, index, select]);
  useEffect(() => {
    const previous = document.title; document.title = 'Thư viện Asset 3D · ChemDex';
    return () => { document.title = previous; };
  }, []);
  useEffect(() => {
    if (!notice) return; const timeout = setTimeout(() => setNotice(''), 3200); return () => clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, select, textarea, button, a') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') { setHelp(false); setCatalogOpen(false); setDetailsOpen(false); }
      if (help) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); adjacent(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); adjacent(1); }
      if (e.key.toLowerCase() === 'r') view('perspective');
      if (e.key === '+' || e.key === '=') view('in');
      if (e.key === '-') view('out');
      if (e.code === 'Space') { e.preventDefault(); setRotate(r => !r); }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [adjacent, view, help]);
  const screenshot = () => {
    try {
      if (!canvas.current) return;
      const anchor = document.createElement('a'); anchor.download = `chemdex-${asset.id}.png`;
      anchor.href = canvas.current.toDataURL('image/png'); anchor.click(); setNotice('Đã lưu ảnh mô hình PNG');
    } catch { setNotice('Chưa thể lưu ảnh. Vui lòng thử lại.'); }
  };
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.current?.requestFullscreen(); }
    catch { setNotice('Trình duyệt chưa hỗ trợ toàn màn hình.'); }
  };
  const labUrl = new URL(location.href); labUrl.searchParams.delete('view'); labUrl.searchParams.delete('asset');
  const categoryName = categories.find(c => c[0] === asset.category)?.[1];

  return <div className="asset-browser">
    <header className="ab-header">
      <a className="ab-brand" href={labUrl.pathname + labUrl.search}><span className="ab-logo"><Beaker size={21} /></span><span>Chem<span>Dex</span><small>LABORATORY / 3D COLLECTION</small></span></a>
      <div className="ab-header-center"><span className="ab-live" /> Không gian khám phá <span className="ab-version">3D</span></div>
      <a className="ab-back" href={labUrl.pathname + labUrl.search}><ArrowLeft size={15} /><span>Về phòng lab</span></a>
    </header>
    <div className="ab-mobile-bar">
      <button onClick={() => { setCatalogOpen(v => !v); setDetailsOpen(false); }} aria-expanded={catalogOpen}><Grid2X2 size={16} /> Thư viện</button>
      <span>{asset.name}</span>
      <button onClick={() => { setDetailsOpen(v => !v); setCatalogOpen(false); }} aria-expanded={detailsOpen}><SlidersHorizontal size={16} /> Chi tiết</button>
    </div>
    {(catalogOpen || detailsOpen) && <button className="ab-scrim" aria-label="Đóng bảng" onClick={() => { setCatalogOpen(false); setDetailsOpen(false); }} />}
    <div className="ab-layout">
      <aside className={`ab-catalog ${catalogOpen ? 'is-open' : ''}`} aria-label="Thư viện mô hình">
        <div className="ab-catalog-heading"><span className="ab-eyebrow">KHÁM PHÁ PHÒNG LAB</span><h1>Thư viện <span>3D.</span></h1><p>Mỗi góc nhìn, một chi tiết mới.</p></div>
        <label className="ab-search"><Search size={16} /><input aria-label="Tìm asset" placeholder="Tìm tên, công thức…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}><X size={14} /></button>}</label>
        <div className="ab-categories" aria-label="Nhóm asset">{categories.map(([id, label]) => <button key={id} aria-pressed={category === id} onClick={() => setCategory(id)} className={category === id ? 'active' : ''}>{label}<span>{id === 'all' ? assets.length : assets.filter(a => a.category === id).length}</span></button>)}</div>
        <div className="ab-list-heading"><span>{filtered.length} MÔ HÌNH</span><Layers3 size={13} /></div>
        <div className="ab-asset-list">
          {filtered.map((item, i) => <button key={item.id} data-asset-id={item.id} className={`ab-asset-item ${item.id === asset.id ? 'selected' : ''}`} onClick={() => select(item)} aria-pressed={item.id === asset.id}>
            <span className={`ab-item-icon ${item.category}`} style={item.chemical ? { color: item.chemical.color } : undefined}>{item.chemical ? <span className="ab-formula">{item.chemical.formula}</span> : <Box size={22} strokeWidth={1.3} />}</span>
            <span className="ab-item-text"><strong>{item.name}</strong><small>{item.chemical?.formula ?? item.english}</small></span><span className="ab-item-number">{String(i + 1).padStart(2, '0')}</span>
          </button>)}
          {!filtered.length && <div className="ab-empty"><Search size={25} /><strong>Chưa tìm thấy mô hình</strong><p>Thử tên khác hoặc đổi nhóm asset.</p><button onClick={() => { setQuery(''); setCategory('all'); }}>Hiện tất cả</button></div>}
        </div>
        <div className="ab-catalog-footer"><span className="ab-live" /><span>{equipmentAssets.length} dụng cụ · {assets.length - equipmentAssets.length} mẫu hóa chất</span></div>
      </aside>

      <main className="ab-stage" ref={stage} aria-label={`Xem 3D: ${asset.name}`}>
        <div className="ab-stage-heading"><div><span className="ab-eyebrow">BỘ SƯU TẬP / {categoryName?.toLocaleUpperCase('vi')}</span><h2>{asset.name}</h2><p>{asset.english}</p></div><span className="ab-3d-badge"><Box size={14} /> 3D INTERACTIVE</span></div>
        <div className="ab-canvas">
          <ErrorBoundary fallbackTitle="Không thể hiển thị asset này">
            <AssetViewport asset={asset} wireframe={wireframe} rotate={rotate} grid={grid} background={background} lighting={lighting} quality={quality} command={command} onStats={setStats} onCanvas={onCanvas} />
          </ErrorBoundary>
        </div>
        <div className="ab-view-presets" aria-label="Góc nhìn">{([['perspective', 'Phối cảnh'], ['front', 'Trước'], ['back', 'Sau'], ['side', 'Bên'], ['top', 'Trên']] as const).map(([id, label]) => <button key={id} className={command.view === id ? 'active' : ''} onClick={() => view(id)}>{label}</button>)}</div>
        <div className="ab-stage-actions"><button title="Chụp ảnh PNG" aria-label="Chụp ảnh PNG" onClick={screenshot}><Camera size={18} /></button><button title="Toàn màn hình" aria-label="Toàn màn hình" onClick={fullscreen}><Maximize size={18} /></button><button title="Hướng dẫn điều khiển" aria-label="Hướng dẫn điều khiển" onClick={() => setHelp(true)}><CircleHelp size={18} /></button></div>
        <div className="ab-axis" aria-hidden="true"><span>Y</span><i /><b>X</b><em>Z</em></div>
        <div className="ab-stage-bottom">
          <div className="ab-controls"><button onClick={() => view('out')} aria-label="Thu nhỏ" title="Thu nhỏ (−)"><Minus size={18} /></button><button onClick={() => view('in')} aria-label="Phóng to" title="Phóng to (+)"><Plus size={18} /></button><i /><button onClick={() => view('perspective')} aria-label="Đặt lại góc nhìn" title="Đặt lại góc nhìn (R)"><RotateCcw size={17} /></button><i /><button aria-pressed={rotate} onClick={() => setRotate(r => !r)} className={rotate ? 'active' : ''} title="Tự xoay (Space)">{rotate ? <Pause size={16} /> : <Play size={16} />}<span>Tự xoay</span></button></div>
          <span className="ab-gesture-hint">Kéo để xoay <b>·</b> Cuộn để zoom <b>·</b> Chuột phải để di chuyển</span>
        </div>
        <div className="ab-stage-status"><span><span className="ab-live" /> Mô hình gốc Lab 3D</span><div><button aria-label="Asset trước" onClick={() => adjacent(-1)} disabled={filtered.length < 2}><ChevronLeft size={16} /></button><span>{index >= 0 ? String(index + 1).padStart(2, '0') : '—'} / {filtered.length}</span><button aria-label="Asset tiếp theo" onClick={() => adjacent(1)} disabled={filtered.length < 2}><ChevronRight size={16} /></button></div></div>
        {notice && <div className="ab-notice" role="status"><Check size={15} />{notice}</div>}
        {help && <HelpDialog onClose={() => setHelp(false)} />}
      </main>

      <aside className={`ab-details ${detailsOpen ? 'is-open' : ''}`} aria-label="Thông tin và tùy chỉnh">
        <div className="ab-detail-title"><SlidersHorizontal size={16} /><span>THÔNG TIN MÔ HÌNH</span></div>
        <section className="ab-description"><span className="ab-tag">{categoryName}</span><h3>{asset.name}</h3><p>{asset.description}</p><dl><div><dt>Vật liệu / mẫu</dt><dd>{asset.material}</dd></div>{!!asset.capacity && <div><dt>Dung tích mẫu</dt><dd>{asset.capacity} mL</dd></div>}{asset.chemical && <><div><dt>Công thức</dt><dd>{asset.chemical.formula}</dd></div><div><dt>Khối lượng mol</dt><dd>{asset.chemical.molarMass} g/mol</dd></div>{asset.chemical.solidMorphology && <div><dt>Hình thái</dt><dd>{asset.chemical.solidMorphology}</dd></div>}</>}<div><dt>Số mesh</dt><dd>{stats.meshes || '…'}</dd></div><div><dt>Tam giác</dt><dd>{stats.triangles ? stats.triangles.toLocaleString('vi-VN') : '…'}</dd></div></dl></section>
        <section><h4><span>01</span> Chi tiết cần quan sát</h4><ol className="ab-detail-points">{asset.details.map((detail, i) => <li key={detail}><span>{i + 1}</span>{detail}</li>)}</ol><button className="ab-closeup" onClick={() => view('detail')}>Khám phá cận cảnh <ArrowRight size={15} /></button></section>
        <section><h4><span>02</span> Không gian hiển thị</h4><label className="ab-field-title">Phông nền</label><div className="ab-backgrounds">{backgrounds.map(bg => <button key={bg.name} aria-pressed={background === bg.color} title={bg.name} onClick={() => setBackground(bg.color)} className={background === bg.color ? 'active' : ''}><i style={{ background: bg.color }} />{bg.name}</button>)}</div><label className="ab-range-label" htmlFor="asset-light"><span>Cường độ sáng</span><b>{Math.round(lighting * 100)}%</b></label><input id="asset-light" className="ab-range" type="range" min="0.35" max="2" step="0.05" value={lighting} onChange={e => setLighting(Number(e.target.value))} /><div className="ab-toggle-row"><label htmlFor="asset-grid">Lưới không gian</label><input id="asset-grid" type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)} /></div><div className="ab-toggle-row"><label htmlFor="asset-wireframe">Khung lưới mô hình</label><input id="asset-wireframe" type="checkbox" checked={wireframe} onChange={e => setWireframe(e.target.checked)} /></div></section>
        <section><h4><span>03</span> Chất lượng hiển thị</h4><div className="ab-quality"><button aria-pressed={quality === 'smooth'} className={quality === 'smooth' ? 'active' : ''} onClick={() => setQuality('smooth')}>Mượt mà</button><button aria-pressed={quality === 'detail'} className={quality === 'detail' ? 'active' : ''} onClick={() => setQuality('detail')}>Chi tiết cao</button></div><p className="ab-small">Tăng độ phân giải khi cần xem kỹ bề mặt. Tắt tự xoay để giảm hoạt động GPU.</p></section>
      </aside>
    </div>
  </div>;
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement; close.current?.focus(); return () => previous?.focus(); }, []);
  return <div className="ab-modal-backdrop" onClick={onClose}><div className="ab-help" role="dialog" aria-modal="true" aria-labelledby="ab-help-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Tab') { e.preventDefault(); close.current?.focus(); } }}><button ref={close} className="ab-help-close" aria-label="Đóng hướng dẫn" onClick={onClose}><X size={20} /></button><Box size={32} /><h2 id="ab-help-title">Khám phá từ mọi góc.</h2><p>Chuột và bàn phím</p><dl><div><dt>Xoay mô hình</dt><dd>Kéo chuột trái</dd></div><div><dt>Phóng to / thu nhỏ</dt><dd>Cuộn chuột · + / −</dd></div><div><dt>Di chuyển khung nhìn</dt><dd>Kéo chuột phải</dd></div><div><dt>Đặt lại camera</dt><dd>R</dd></div><div><dt>Bật / tắt tự xoay</dt><dd>Space</dd></div><div><dt>Chuyển asset</dt><dd>← / →</dd></div></dl><p>Trên điện thoại: kéo một ngón để xoay; chụm hoặc kéo hai ngón để zoom và di chuyển.</p></div></div>;
}
