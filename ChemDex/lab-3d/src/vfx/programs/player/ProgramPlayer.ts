/**
 * ProgramPlayer.ts — Runtime Reaction Program Timeline Execution Engine
 *
 * Implements §2.4, §4 & §19:
 * Tracks active ReactionPrograms, evaluates timeline windows [w_start, w_end],
 * orchestrates EffectAtom lifecycles (mount, update, writeBack, dispose),
 * and drives visual physical realism synchronized with chemical simulation extent xi(t).
 */

import { ReactionProgram } from '../../../shared/programSchema';
import { EffectAtom, AtomHandle, AtomCtx, LedgerView, VesselPatch } from '../../catalog/types';
import { getEffectAtom } from '../../catalog/index';

export interface ActiveAtomInstance {
  handle: AtomHandle;
  atom: EffectAtom;
  timelineId: string;
  window: [number, number];
  intensity?: number | any;
}

export interface ProgramPlayerSession {
  vesselId: string;
  program: ReactionProgram;
  ctx: AtomCtx;
  duration_s: number;
  elapsed_s: number;
  progress: number; // 0.0 to 1.0
  isComplete: boolean;
  activeAtoms: Map<string, ActiveAtomInstance>;
}

export class ProgramPlayer {
  private sessions: Map<string, ProgramPlayerSession> = new Map();

  /**
   * Starts playback of a ReactionProgram on a target vessel.
   */
  public startProgram(
    vesselId: string,
    program: ReactionProgram,
    ctx?: Partial<AtomCtx>
  ): ProgramPlayerSession {
    // If a session is already running for this vessel, clean it up first
    if (this.sessions.has(vesselId)) {
      this.stopProgram(vesselId);
    }

    const defaultCtx: AtomCtx = {
      vesselId,
      position: [0, 0, 0],
      dimensions: {
        radius: 0.045,
        height: 0.12,
        liquidY: 0.05,
        mouthY: 0.12
      },
      timeScale: 1.0,
      seed: 42,
      ...ctx
    };

    const duration_s = program.visual?.duration_s || 5.0;

    const session: ProgramPlayerSession = {
      vesselId,
      program,
      ctx: defaultCtx,
      duration_s,
      elapsed_s: 0,
      progress: 0,
      isComplete: false,
      activeAtoms: new Map()
    };

    this.sessions.set(vesselId, session);
    return session;
  }

  /**
   * Advances all active program timelines by dt, mounting/updating/disposing atoms.
   * Returns accumulated VesselPatch dictionary for all sessions.
   */
  public update(
    dt: number,
    ledgerViews?: Record<string, LedgerView>
  ): Record<string, VesselPatch> {
    const patches: Record<string, VesselPatch> = {};

    for (const [vesselId, session] of this.sessions.entries()) {
      if (session.isComplete) continue;

      const timeScale = session.ctx.timeScale || 1.0;
      session.elapsed_s += dt * timeScale;
      session.progress = Math.min(1.0, session.elapsed_s / session.duration_s);

      const sView = ledgerViews?.[vesselId] || this.createFallbackLedgerView(session);
      const patch: VesselPatch = {};

      const timeline = session.program.visual?.timeline || [];

      for (const item of timeline) {
        const [wStart, wEnd] = item.window;
        const inWindow = session.progress >= wStart && session.progress <= wEnd;

        if (inWindow) {
          // Atom should be active
          if (!session.activeAtoms.has(item.id)) {
            const atom = getEffectAtom(item.atom);
            if (atom) {
              const handle = atom.mount(session.ctx, item.params);
              session.activeAtoms.set(item.id, {
                handle,
                atom,
                timelineId: item.id,
                window: item.window,
                intensity: item.intensity || 1.0
              });
            }
          }

          const instance = session.activeAtoms.get(item.id);
          if (instance && instance.handle.alive) {
            instance.atom.update(instance.handle, dt, sView);
            if (instance.atom.writeBack) {
              instance.atom.writeBack(instance.handle, patch);
            }
          }
        } else {
          // Atom outside its timeline window
          if (session.activeAtoms.has(item.id)) {
            const instance = session.activeAtoms.get(item.id)!;
            instance.atom.dispose(instance.handle);
            session.activeAtoms.delete(item.id);
          }
        }
      }

      patches[vesselId] = patch;

      // Completion check
      if (session.progress >= 1.0) {
        session.isComplete = true;
        // Dispose all remaining active atoms
        for (const [, instance] of session.activeAtoms.entries()) {
          instance.atom.dispose(instance.handle);
        }
        session.activeAtoms.clear();
      }
    }

    return patches;
  }

  /**
   * Synchronously stops and disposes a vessel's active program session.
   */
  public stopProgram(vesselId: string): void {
    const session = this.sessions.get(vesselId);
    if (!session) return;

    for (const [, instance] of session.activeAtoms) {
      instance.atom.dispose(instance.handle);
    }
    session.activeAtoms.clear();
    session.isComplete = true;
    this.sessions.delete(vesselId);
  }

  /**
   * Retrieves active session for a vessel.
   */
  public getSession(vesselId: string): ProgramPlayerSession | undefined {
    return this.sessions.get(vesselId);
  }

  /**
   * Retrieves all running sessions.
   */
  public getAllSessions(): ProgramPlayerSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Disposes the entire player and all running sessions.
   */
  public dispose(): void {
    for (const vesselId of Array.from(this.sessions.keys())) {
      this.stopProgram(vesselId);
    }
    this.sessions.clear();
  }

  private createFallbackLedgerView(session: ProgramPlayerSession): LedgerView {
    return {
      time_s: session.elapsed_s,
      temperature_c: 25.0,
      pressure_atm: 1.0,
      pH: 7.0,
      turbidity: session.progress * 0.8,
      liquidColor: '#ffffff',
      gasHoldup: 0,
      foam_ml: 0,
      speciesAmounts: {},
      speciesRates: {},
      heatRate_W: 0
    };
  }
}

export const programPlayer = new ProgramPlayer();
