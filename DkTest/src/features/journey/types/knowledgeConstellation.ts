/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Knowledge Constellation Network Types
 */

import type { SubjectThemeType } from "./journey3D";

export type KnowledgeRelationshipType =
  | "prerequisite_for"
  | "related_to"
  | "extends"
  | "applied_in"
  | "commonly_confused_with";

export interface KnowledgeNode {
  id: string;
  code: string;
  label: string;
  subject: SubjectThemeType;
  chapter: string;
  learningObjectives: string[];
  cognitiveLevel: "nhan_biet" | "thong_hieu" | "van_dung" | "van_dung_cao";
  /** Optional practice mode route */
  practiceRoute?: string;
  x: number; // graph visualization coordinates
  y: number;
}

export interface KnowledgeEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: KnowledgeRelationshipType;
  description?: string;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}
