import { useCallback, useEffect, useRef, useState } from 'react';
import { AttemptEvent, Difficulty, GameCallbacks, GameDefinition, GameResult } from '../core/types';
import { calculateAccuracy, calculateScore, experienceForResult, medalForScore } from '../core/scoring';
import { randomId } from '../core/random';
import { useAcademy } from '../core/store';
import { soundManager } from '../../audio/soundManager';

export function useRound(definition: GameDefinition, difficulty: Difficulty, playing: boolean, paused: boolean) {
  const [events, setEvents] = useState<AttemptEvent[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const started = useRef(0);
  const accumulated = useRef(0);
  const eventRef = useRef<AttemptEvent[]>([]);
  const completed = useRef(false);
  const playingRef = useRef(false);
  const sound = useAcademy(state => state.profile.preferences.sound);

  useEffect(() => {
    if (!playing || paused || completed.current) {
      playingRef.current = false;
      return;
    }
    started.current = performance.now();
    playingRef.current = true;
    const interval = setInterval(() => {
      setElapsed((accumulated.current + performance.now() - started.current) / 1000);
    }, 100);
    return () => {
      accumulated.current += performance.now() - started.current;
      playingRef.current = false;
      clearInterval(interval);
    };
  }, [playing, paused, result]);

  const record = useCallback((type: AttemptEvent['type'], message: string, detail?: string) => {
    if (completed.current) return;
    const event: AttemptEvent = {
      id: eventRef.current.length + 1,
      at: (accumulated.current + (playingRef.current ? performance.now() - started.current : 0)) / 1000,
      type,
      message,
      detail,
    };
    eventRef.current = [...eventRef.current, event];
    setEvents(eventRef.current);
    if (sound) soundManager.play(type === 'mistake' ? 'error' : type === 'correct' ? 'success' : 'click');
  }, [sound]);

  const onComplete = useCallback((details: string[]) => {
    if (completed.current) return;
    completed.current = true;
    const history = eventRef.current;
    const correct = history.filter(event => event.type === 'correct').length;
    const mistakes = history.filter(event => event.type === 'mistake').length;
    const hints = history.filter(event => event.type === 'hint').length;
    const elapsedSeconds = (accumulated.current + (playingRef.current ? performance.now() - started.current : 0)) / 1000;
    const outcome = { correct, mistakes, hints, elapsedSeconds, completed: true, details };
    const score = calculateScore(outcome, difficulty);
    const firstCompletion = !useAcademy.getState().profile.games[definition.id]?.completions;
    const next: GameResult = {
      ...outcome,
      id: randomId('round'),
      gameId: definition.id,
      difficulty,
      score,
      accuracy: calculateAccuracy(correct, mistakes),
      medal: medalForScore(score, true),
      xp: experienceForResult(score, difficulty, firstCompletion),
      playedAt: new Date().toISOString(),
      events: history,
    };
    useAcademy.getState().recordResult(next);
    setElapsed(elapsedSeconds);
    setResult(next);
    if (sound) soundManager.play('complete');
  }, [definition.id, difficulty, sound]);

  const callbacks: GameCallbacks = {
    onCorrect: (message, detail) => record('correct', message, detail),
    onMistake: (message, detail) => record('mistake', message, detail),
    onHint: message => record('hint', message),
    onComplete,
  };
  return { events, elapsed, result, callbacks };
}
