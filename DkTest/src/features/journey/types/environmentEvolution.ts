/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Living World Dynamic Environment Evolution Types
 */

import type { SubjectThemeType } from "./journey3D";

export type RegionEvolutionState =
  | "undiscovered"
  | "discovered"
  | "activated"
  | "developing"
  | "restored"
  | "thriving";

export interface RegionEvolutionStatus {
  regionId: string;
  name: string;
  subject: SubjectThemeType;
  state: RegionEvolutionState;
  unlockedFeatures: string[];
  visualAura: string;
  lightingIntensity: number; // 0.2 -> 1.0
  activeLandmark: string;
}

export interface WorldEnvironmentState {
  subject: SubjectThemeType;
  regions: Record<string, RegionEvolutionStatus>;
  overallAtmosphere: "dawn" | "day" | "twilight" | "mystic_night";
  ambientParticles: boolean;
  reducedMotion: boolean;
  unlockedLandmarksCount: number;
}
