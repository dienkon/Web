import React from 'react';
import { useStore } from '../../store/useStore';
import { resolveFilm, useFilmCaption } from '../../data/cinematics';

export function CinematicOverlay() {
  const id = useStore(s => s.cinematic);
  const caption = useFilmCaption();
  if (!id) return null;
  const film = resolveFilm(id);
  const shot = film.shots[caption.id === id ? caption.shot : 0] ?? film.shots[0];
  return <div className="fixed inset-0 z-[1500] pointer-events-none" data-cinematic-overlay>
    <div className="absolute inset-x-0 top-0 h-[10vh] bg-white flex items-center justify-between px-8 text-slate-800">
      <span className="text-xs uppercase tracking-[.25em]">ChemDex · Tình huống {id === 'fire' ? '01' : id === 'electrical' ? '02' : id === 'fume' ? '03' : '04'}</span>
      <span className="text-sm font-semibold">{film.title}</span>
    </div>
    <div className="absolute inset-x-0 bottom-0 min-h-[15vh] bg-white/95 px-6 py-4 text-center text-slate-800" role="status" aria-live="polite" aria-atomic="true">
      <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-2">{shot.speaker}</p>
      <p className="max-w-3xl mx-auto text-sm sm:text-base leading-relaxed">{shot.line}</p>
    </div>
  </div>;
}
