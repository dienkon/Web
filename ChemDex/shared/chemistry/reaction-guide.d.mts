import type { ReactionEntry } from './reaction-catalog.mjs';
export interface ReactionGuide {
  requirements: string[];
  stages: { id: string; title_vi: string; explanation_vi: string }[];
  mechanism_vi: string;
  stoichiometry_vi: string;
  rate: { calibrated: false; duration_s: null; explanation_vi: string; sourceIds: string[] };
  observations_vi: string[];
}
export function reactionGuide(entry: ReactionEntry): ReactionGuide;
export function reactionGuideErrors(entry: ReactionEntry): string[];
