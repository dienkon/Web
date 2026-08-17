import React from 'react';

export interface TitleStyle {
  name: string;
  badgeClass: string;
  textClass: string;
  glowColor: string;
  emoji: string;
}

export const TITLE_STYLES_MAP: Record<string, TitleStyle> = {
  'Khơi Đầu Phản Ứng': {
    name: 'Khơi Đầu Phản Ứng',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 title-pulse-cyan',
    textClass: 'text-cyan-400 font-extrabold tracking-tight',
    glowColor: 'rgba(6,182,212,0.2)',
    emoji: '🧪'
  },
  'Chất Kích Hoạt': {
    name: 'Chất Kích Hoạt',
    badgeClass: 'bg-amber-500/10 text-amber-500 border border-amber-500/30 title-flicker-amber',
    textClass: 'text-amber-500 font-black tracking-tight',
    glowColor: 'rgba(245,158,11,0.3)',
    emoji: '⚡'
  },
  'Hạt Nhân Siêu Bền': {
    name: 'Hạt Nhân Siêu Bền',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 title-spin-emerald',
    textClass: 'text-emerald-400 font-black tracking-tight',
    glowColor: 'rgba(16,185,129,0.3)',
    emoji: '⚛️'
  },
  'Bão Nhiệt Hạch': {
    name: 'Bão Nhiệt Hạch',
    badgeClass: 'bg-pink-500/10 text-pink-400 border border-pink-500/30 title-wave-pink',
    textClass: 'text-pink-400 font-black tracking-wide',
    glowColor: 'rgba(236,72,153,0.4)',
    emoji: '🔥'
  },
  'Xúc Tác Tuyệt Đối': {
    name: 'Xúc Tác Tuyệt Đối',
    badgeClass: 'border border-cyan-300/40 title-shimmer-cyan text-cyan-300',
    textClass: 'text-cyan-300 font-black tracking-tight uppercase',
    glowColor: 'rgba(34,211,238,0.5)',
    emoji: '💎'
  },
  'Thần Cân Bằng': {
    name: 'Thần Cân Bằng',
    badgeClass: 'bg-yellow-500/10 text-yellow-400 border border-yellow-400/40 title-oscillate-yellow',
    textClass: 'text-yellow-400 font-black tracking-widest uppercase',
    glowColor: 'rgba(234,179,8,0.5)',
    emoji: '⚖️'
  },
  'Đại Pháp Sư IUPAC': {
    name: 'Đại Pháp Sư IUPAC',
    badgeClass: 'bg-violet-500/15 text-violet-400 border border-violet-500/40 title-cosmic-violet',
    textClass: 'text-violet-400 font-black tracking-wide uppercase',
    glowColor: 'rgba(139,92,246,0.6)',
    emoji: '🔮'
  },
  'Triết Nhân Giả Kim': {
    name: 'Triết Nhân Giả Kim',
    badgeClass: 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 text-slate-900 dark:text-white border border-yellow-400/60 font-black title-rainbow-glowing',
    textClass: 'bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 bg-clip-text text-transparent font-black tracking-widest uppercase',
    glowColor: 'rgba(245,158,11,0.7)',
    emoji: '👑'
  }
};

export function renderTitleBadge(title: string | undefined, size: 'sm' | 'md' = 'sm') {
  if (!title) return null;
  const style = TITLE_STYLES_MAP[title];
  if (!style) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-tight">
        🛡️ {title}
      </span>
    );
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[11px]';

  return (
    <span className={`inline-flex items-center gap-1 rounded-md font-bold uppercase select-none transition-all duration-300 ${padding} ${style.badgeClass}`}>
      <span className="badge-emoji">{style.emoji}</span>
      <span className={style.textClass}>{style.name}</span>
    </span>
  );
}
