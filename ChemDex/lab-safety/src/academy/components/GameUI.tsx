import React from 'react';

export function GameInstruction({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="academy-game-instruction">
      <span aria-hidden="true">{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function Feedback({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'correct' | 'mistake' }) {
  return (
    <div className={`academy-feedback academy-feedback--${tone}`} role="status" aria-live="polite">
      <span aria-hidden="true">{tone === 'correct' ? '✓' : tone === 'mistake' ? '!' : 'i'}</span>
      <p>{text}</p>
    </div>
  );
}

export function ProgressDots({ total, completed, label }: { total: number; completed: number; label: string }) {
  return (
    <div className="academy-step-progress" aria-label={`${label}: ${completed}/${total}`}>
      <span>{label}</span>
      <div aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <i key={index} className={index < completed ? 'is-complete' : ''} />
        ))}
      </div>
      <strong>{completed}/{total}</strong>
    </div>
  );
}

export function HintButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="academy-button academy-button--quiet" onClick={onClick} disabled={disabled}>
      💡 Gợi ý
    </button>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="academy-empty-state">
      <span aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon: string }) {
  return (
    <div className="academy-stat">
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}
