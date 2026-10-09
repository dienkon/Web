/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Discovery Events Types
 */

import type { SubjectThemeType } from "./journey3D";

export interface DiscoveryEvent {
  id: string;
  title: string;
  description: string;
  subject?: SubjectThemeType;
  startDate: string;
  endDate: string;
  isActive: boolean;
  linkedCampaignId?: string;
  targetObjective: string;
  badgeReward?: string;
}
