import React, { useEffect, useRef, useState } from 'react';
import { Beaker, ChevronDown, FlaskConical, HelpCircle, Info, Layers, Move, Wand2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { LAB_TOUR_STEPS } from '../data/labTour';

/** One corner launcher keeps the surrounding ChemDex navigation off the bench. */
export function LabNavigation({ workspace, onWorkspaceChange, onOpenGuide, guideStep }: {
  workspace: 'manual' | 'auto'; onWorkspaceChange: (mode: 'manual' | 'auto') => void;
  onOpenGuide: () => void; guideStep?: number;
}) {
  const language = useAppStore(state => state.language);
  const leftOpen = useAppStore(state => state.leftSidebarOpen);
  const rightOpen = useAppStore(state => state.rightSidebarOpen);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const t = (en: string, vi: string) => language === 'en' ? en : vi;
  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', key); };
  }, [open]);
  const togglePanel = (side: 'left' | 'right') => {
    const state = useAppStore.getState(), compact = window.innerWidth < 1024;
    useAppStore.setState(side === 'left'
      ? { leftSidebarOpen: !state.leftSidebarOpen, ...(compact ? { rightSidebarOpen: false } : {}) }
      : { rightSidebarOpen: !state.rightSidebarOpen, ...(compact ? { leftSidebarOpen: false } : {}) });
  };
  return <nav className="lab-navigation" aria-label={t('Lab navigation', 'Điều hướng phòng lab')}>
    <div ref={root} className="relative shrink-0">
      <button ref={trigger} className="lab-brand" aria-expanded={open} aria-controls="chemdex-corner-menu"
        aria-label={t('ChemDex menu', 'Menu ChemDex')} onClick={() => setOpen(value => !value)}>
        <FlaskConical size={19} /><span className="hidden sm:inline">ChemDex <span className="font-normal text-slate-500">Lab</span></span><ChevronDown size={12} />
      </button>
      {open && <div id="chemdex-corner-menu" className="lab-corner-menu">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">ChemDex</p>
        <a href="../">{t('Periodic table & home', 'Trang chủ & bảng tuần hoàn')}</a>
        <a href="../tai-lieu-so.html">{t('Documents', 'Tài liệu số')}</a>
        <a href="../tien-ich/">{t('Utilities', 'Tiện ích')}</a>
        <a href="../trung-tam/">{t('Learning hub', 'Trung tâm học tập')}</a>
        <a href="?view=assets"><Layers size={15} />{t('3D model library', 'Thư viện mô hình 3D')}</a>
        <a href="?vfx=1">{t('Effects studio', 'Studio hiệu ứng')}</a>
      </div>}
    </div>
    <div role="tablist" aria-label={t('Lab mode', 'Chế độ thí nghiệm')} className="flex min-w-0 items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
      <button role="tab" id="manual-lab-tab" aria-selected={workspace === 'manual'} aria-controls="manual-lab"
        onClick={() => onWorkspaceChange('manual')} className={`lab-nav-tab ${workspace === 'manual' ? 'lab-nav-tab-active' : ''}`}>
        <Move size={14} /><span>{t('Hands-on', 'Thao tác')}</span></button>
      <button role="tab" id="automatic-lab-tab" aria-selected={workspace === 'auto'} aria-controls="automatic-lab"
        onClick={() => onWorkspaceChange('auto')} className={`lab-nav-tab ${workspace === 'auto' ? 'lab-nav-tab-active' : ''}`}>
        <Wand2 size={14} /><span>{t('Automatic', 'Tự động')}</span></button>
    </div>
    {workspace === 'manual' && <div className="ml-auto flex shrink-0 gap-1">
      <button onClick={() => togglePanel('left')} aria-expanded={leftOpen} aria-controls="lab-left-panel"
        data-tour="catalog-toggle"
        aria-label={t('Chemical and equipment catalog', 'Kho hóa chất và dụng cụ')}
        title={t('Chemical and equipment catalog', 'Kho hóa chất và dụng cụ')}
        className={`lab-panel-toggle ${leftOpen ? 'lab-nav-tab-active' : ''}`}><Beaker size={17} /><span className="hidden md:inline">{t('Catalog', 'Hóa chất')}</span></button>
      <button onClick={() => togglePanel('right')} aria-expanded={rightOpen} aria-controls="lab-right-panel"
        data-tour="inspect-toggle"
        aria-label={t('Vessel and reactions', 'Thông tin bình và phản ứng')}
        title={t('Vessel and reactions', 'Thông tin bình và phản ứng')}
        className={`lab-panel-toggle ${rightOpen ? 'lab-nav-tab-active' : ''}`}><Info size={17} /><span className="hidden md:inline">{t('Inspect', 'Quan sát')}</span></button>
    </div>}
    <button onClick={onOpenGuide} className={`lab-panel-toggle ${workspace === 'auto' ? 'ml-auto' : ''}`}
      aria-label={t('Open getting-started guide', 'Mở hướng dẫn người mới')}
      title={guideStep ? t(`Continue guide · Step ${guideStep}/${LAB_TOUR_STEPS.length}`, `Tiếp tục hướng dẫn · Bước ${guideStep}/${LAB_TOUR_STEPS.length}`) : t('Review getting-started guide', 'Xem lại hướng dẫn người mới')}>
      <HelpCircle size={17} /><span className="hidden lg:inline">{t('Guide', 'Hướng dẫn')}</span>
    </button>
  </nav>;
}
