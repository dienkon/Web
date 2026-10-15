export type FocusPoint = readonly [number, number, number];

export interface FocusCandidate {
  id: string;
  position: FocusPoint;
  aimPosition?: FocusPoint;
  label: string;
  isActive: boolean;
  priority?: number;
  reach?: number;
  radius?: number;
  requireSurfaceHit?: boolean;
}

export interface FocusView {
  eye: FocusPoint;
  feet: FocusPoint;
  forward: FocusPoint;
}

export interface RankedFocus {
  candidate: FocusCandidate;
  distance: number;
  alignment: number;
  score: number;
}

export const FOCUS_POLICY = Object.freeze({
  reach: 2.15,
  releaseReach: 2.35,
  acquireSeconds: 0.18,
  switchSeconds: 0.3,
  sampleSeconds: 0.075,
  minAlignment: 0.91,
  maximumVerticalOffset: 1.65,
});

export function rankFocusCandidate(
  candidate: FocusCandidate,
  view: FocusView,
  currentId: string | null,
): RankedFocus | null {
  if (!candidate.isActive) return null;
  const aim = candidate.aimPosition ?? candidate.position;
  const dx = aim[0] - view.eye[0];
  const dy = aim[1] - view.eye[1];
  const dz = aim[2] - view.eye[2];
  const distance = Math.hypot(dx, dy, dz);
  const horizontal = Math.hypot(
    candidate.position[0] - view.feet[0],
    candidate.position[2] - view.feet[2],
  );
  const reach = candidate.reach ?? FOCUS_POLICY.reach;
  const limit = candidate.id === currentId ? reach + 0.2 : reach;
  if (horizontal > limit || distance > limit + 0.65) return null;
  if (Math.abs(dy) > FOCUS_POLICY.maximumVerticalOffset) return null;
  if (distance < 0.025) return null;
  const alignment = (
    dx * view.forward[0]
    + dy * view.forward[1]
    + dz * view.forward[2]
  ) / distance;
  const radiusAllowance = Math.min(0.055, (candidate.radius ?? 0.2) / distance * 0.12);
  if (alignment < FOCUS_POLICY.minAlignment - radiusAllowance) return null;
  const priority = Math.max(-0.2, Math.min(0.8, candidate.priority ?? 0));
  const continuity = candidate.id === currentId ? -0.12 : 0;
  return {
    candidate,
    distance,
    alignment,
    score: (1 - alignment) * 12 + distance * 0.16 + priority + continuity,
  };
}

export function rankFocusCandidates(
  candidates: readonly FocusCandidate[],
  view: FocusView,
  currentId: string | null,
): RankedFocus[] {
  const ranked: RankedFocus[] = [];
  for (const candidate of candidates) {
    const result = rankFocusCandidate(candidate, view, currentId);
    if (result) ranked.push(result);
  }
  return ranked.sort((a, b) => a.score - b.score || a.candidate.id.localeCompare(b.candidate.id));
}

export interface FocusLatch {
  activeId: string | null;
  pendingId: string | null;
  pendingSeconds: number;
}

export function createFocusLatch(): FocusLatch {
  return { activeId: null, pendingId: null, pendingSeconds: 0 };
}

export function advanceFocusLatch(
  latch: FocusLatch,
  candidateId: string | null,
  delta: number,
  activeStillValid: boolean,
): string | null {
  if (!activeStillValid) latch.activeId = null;
  if (candidateId === null) {
    latch.activeId = null;
    latch.pendingId = null;
    latch.pendingSeconds = 0;
    return null;
  }
  if (candidateId === latch.activeId) {
    latch.pendingId = null;
    latch.pendingSeconds = 0;
    return latch.activeId;
  }
  if (latch.pendingId !== candidateId) {
    latch.pendingId = candidateId;
    latch.pendingSeconds = 0;
  }
  latch.pendingSeconds += Math.max(0, Math.min(delta, 0.15));
  const threshold = latch.activeId ? FOCUS_POLICY.switchSeconds : FOCUS_POLICY.acquireSeconds;
  if (latch.pendingSeconds >= threshold) {
    latch.activeId = candidateId;
    latch.pendingId = null;
    latch.pendingSeconds = 0;
  }
  return latch.activeId;
}
