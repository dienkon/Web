import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FlaskConical, Lightbulb, X } from 'lucide-react';
import { LAB_GUIDE_STEPS, type GuideDestination } from '../data/labOnboarding';

const STORAGE_KEY = 'chemdex_lab_onboarding_v1';
type Progress = { step: number; completed: boolean };

function readProgress(): Progress | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && Number.isInteger(saved.step) && saved.step >= 0 && saved.step < LAB_GUIDE_STEPS.length
      && typeof saved.completed === 'boolean') return { step: saved.step, completed: saved.completed };
  } catch { /* Guidance remains usable when browser storage is unavailable. */ }
  return null;
}

export function useLabOnboarding(autoOpen: boolean) {
  const [initial] = useState(readProgress);
  const [open, setOpen] = useState(autoOpen && !initial);
  const [progress, setProgress] = useState<Progress>(initial ?? { step: 0, completed: false });
  const save = (next: Progress) => {
    setProgress(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Session-only fallback. */ }
  };
  return {
    open, step: progress.step, completed: progress.completed,
    show: () => { if (progress.completed) save({ step: 0, completed: false }); setOpen(true); },
    select: (step: number) => save({ step, completed: false }),
    close: () => { save(progress); setOpen(false); },
    finish: () => { save({ step: LAB_GUIDE_STEPS.length - 1, completed: true }); setOpen(false); },
  };
}

export function LabOnboarding({ guide, language, onLanguageChange, onPractice }: {
  guide: ReturnType<typeof useLabOnboarding>;
  language: 'vi' | 'en';
  onLanguageChange: (language: 'vi' | 'en') => void;
  onPractice: (destination: GuideDestination) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const close = useRef(guide.close);
  close.current = guide.close;
  const t = (vi: string, en: string) => language === 'vi' ? vi : en;
  const step = LAB_GUIDE_STEPS[guide.step];

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousFocus = document.activeElement;
    element.showModal();
    // Native modal inertness and focus trapping also protect the 3D workspace.
    heading.current?.focus();
    return () => {
      element.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    scrollArea.current?.scrollTo(0, 0);
    heading.current?.focus();
  }, [guide.step]);

  return <dialog ref={dialog} className="lab-guide" aria-labelledby="lab-guide-title" aria-describedby="lab-guide-summary"
    onCancel={event => { event.preventDefault(); close.current(); }}
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key !== 'Tab') return;
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }} onKeyUp={event => event.stopPropagation()}>
    <header className="lab-guide-header">
      <div className="flex items-center gap-2 text-blue-700"><FlaskConical size={20} /><span className="text-sm font-bold">ChemDex Lab</span></div>
      <div className="flex items-center gap-2">
        <button className="lab-guide-quiet" onClick={() => onLanguageChange(language === 'vi' ? 'en' : 'vi')}
          aria-label={t('Switch guide to English', 'Chuyển hướng dẫn sang tiếng Việt')}>{language === 'vi' ? 'English' : 'Tiếng Việt'}</button>
        <button className="lab-guide-icon" onClick={guide.close} aria-label={t('Tạm đóng hướng dẫn', 'Close guide for now')}><X size={19} /></button>
      </div>
    </header>
    <div className="lab-guide-progress" role="progressbar" aria-label={t('Tiến độ đọc hướng dẫn', 'Guide reading progress')}
      aria-valuemin={1} aria-valuemax={LAB_GUIDE_STEPS.length} aria-valuenow={guide.step + 1}>
      <span style={{ width: `${(guide.step + 1) / LAB_GUIDE_STEPS.length * 100}%` }} />
    </div>
    <div className="lab-guide-layout">
      <nav className="lab-guide-topics" aria-label={t('Các bước hướng dẫn', 'Guide topics')}>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('Bắt đầu cùng ChemDex', 'Getting started')}</p>
        <ol>{LAB_GUIDE_STEPS.map((item, index) => <li key={item.id}>
          <button onClick={() => guide.select(index)} aria-current={index === guide.step ? 'step' : undefined}>
            <span>{index + 1}</span><span>{item.title[language]}</span>
          </button>
        </li>)}</ol>
        <p className="mt-5 text-xs leading-relaxed text-slate-500">{t('Đọc → Thử trên bàn → Mở lại hướng dẫn để tiếp tục.', 'Read → Try on the bench → Reopen the guide to continue.')}</p>
      </nav>
      <div ref={scrollArea} className="lab-guide-content">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-blue-600">{t('Hướng dẫn người mới', 'New here?')} · {guide.step + 1} / {LAB_GUIDE_STEPS.length}</p>
        <h1 ref={heading} tabIndex={-1} id="lab-guide-title" className="text-2xl font-bold leading-tight text-slate-900 outline-none">{step.title[language]}</h1>
        <p id="lab-guide-summary" className="mt-3 text-sm leading-relaxed text-slate-500">{step.summary[language]}</p>
        <ol className="lab-guide-instructions">{step.instructions.map((instruction, index) => <li key={index}>
          <span className="lab-guide-number">{index + 1}</span><p>{instruction[language]}</p>
        </li>)}</ol>
        <aside className="lab-guide-tip"><Lightbulb size={18} className="shrink-0" /><p>{step.tip[language]}</p></aside>
        {step.action && <button className="lab-guide-practice" onClick={() => {
          guide.close(); onPractice(step.action!.destination);
        }}>{step.action.label[language]}<ArrowRight size={16} /></button>}
      </div>
    </div>
    <footer className="lab-guide-footer">
      <button className="lab-guide-quiet" onClick={guide.close}>{t('Để sau', 'Later')}</button>
      <div className="flex items-center gap-2">
        <button className="lab-guide-back" disabled={guide.step === 0} onClick={() => guide.select(guide.step - 1)}><ArrowLeft size={15} /><span>{t('Quay lại', 'Back')}</span></button>
        {guide.step === LAB_GUIDE_STEPS.length - 1
          ? <button className="lab-guide-next" onClick={guide.finish}><Check size={16} />{t('Hoàn tất hướng dẫn', 'Finish guide')}</button>
          : <button className="lab-guide-next" onClick={() => guide.select(guide.step + 1)}>{t('Tiếp theo', 'Next')}<ArrowRight size={15} /></button>}
      </div>
    </footer>
  </dialog>;
}
