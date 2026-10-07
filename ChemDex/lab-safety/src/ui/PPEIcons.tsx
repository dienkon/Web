import React from 'react';

interface IconProps {
  className?: string;
  active?: boolean;
}

export const GogglesIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', active = false }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6s-2.7 6-6 6H9c-3.3 0-6-2.7-6-6z" fill={active ? 'var(--primary-50)' : 'transparent'} />
    <circle cx="8" cy="13" r="3" fill={active ? 'var(--primary-50)' : 'transparent'} stroke="currentColor" />
    <circle cx="16" cy="13" r="3" fill={active ? 'var(--primary-50)' : 'transparent'} stroke="currentColor" />
    <path d="M11 13h2" />
    <path d="M3 12c-1.5 0-2 .5-2 1" />
    <path d="M21 12c1.5 0 2 .5 2 1" />
  </svg>
);

export const LabCoatIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', active = false }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3L3 9l3 2v10h12V11l3-2-3-6-4 3-2-1-2 1-4-3z" fill={active ? 'var(--primary-50)' : 'transparent'} />
    <path d="M10 5l2 3 2-3" />
    <path d="M12 8v13" />
    <circle cx="13.5" cy="11.5" r="0.75" fill="currentColor" />
    <circle cx="13.5" cy="14.5" r="0.75" fill="currentColor" />
    <circle cx="13.5" cy="17.5" r="0.75" fill="currentColor" />
  </svg>
);

export const GlovesIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', active = false }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 22h8v-3H8v3z" fill={active ? 'var(--primary-50)' : 'transparent'} />
    <path d="M8 19V9a1.5 1.5 0 0 1 3 0v4m0-4V7a1.5 1.5 0 0 1 3 0v6m0-6V5a1.5 1.5 0 0 1 3 0v9m0-6V9a1.5 1.5 0 0 1 3 0v10H8" fill={active ? 'var(--primary-50)' : 'transparent'} />
    <path d="M6 13a2 2 0 0 1 2 2v4" />
  </svg>
);

export const MaskIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', active = false }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8h14l-2 10H7L5 8z" fill={active ? 'var(--primary-50)' : 'transparent'} />
    <path d="M5 10C2 10 2 6 5 6" />
    <path d="M19 10c3 0 3-4 0-4" />
    <path d="M9 13h6" />
    <circle cx="8" cy="14" r="1.5" fill="currentColor" />
    <circle cx="16" cy="14" r="1.5" fill="currentColor" />
  </svg>
);

export const ShoesIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', active = false }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 17l2-7 4-1 3 3h7a3 3 0 0 1 3 3v2H4z" fill={active ? 'var(--primary-50)' : 'transparent'} />
    <path d="M4 17h19v3H4z" fill={active ? 'var(--primary-50)' : 'transparent'} />
    <path d="M9 11l2 2" />
  </svg>
);

export const HairTieIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', active = false }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="10" rx="6" ry="7" fill={active ? 'var(--primary-50)' : 'transparent'} />
    <ellipse cx="12" cy="15" rx="3" ry="1.5" fill="currentColor" />
    <path d="M12 16.5c-2 2-3 4-3 5.5" />
    <path d="M12 16.5c2 2 3 4 3 5.5" />
  </svg>
);
