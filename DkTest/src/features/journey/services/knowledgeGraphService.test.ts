import { describe, it, expect } from "vitest";
import {
  MASTER_KNOWLEDGE_GRAPH,
  getKnowledgeGraph,
  searchKnowledgeNodes,
} from "./knowledgeGraphService";

describe("knowledgeGraphService", () => {
  it("provides comprehensive knowledge nodes and verified relationship edges", () => {
    expect(MASTER_KNOWLEDGE_GRAPH.nodes.length).toBeGreaterThan(5);
    expect(MASTER_KNOWLEDGE_GRAPH.edges.length).toBeGreaterThan(3);

    // Verify valid relationship types
    for (const edge of MASTER_KNOWLEDGE_GRAPH.edges) {
      expect(["prerequisite_for", "related_to", "extends", "applied_in", "commonly_confused_with"]).toContain(
        edge.relationship
      );
    }
  });

  it("filters graph by subject correctly", () => {
    const mathGraph = getKnowledgeGraph("math");
    expect(mathGraph.nodes.every((n) => n.subject === "math")).toBe(true);
    expect(mathGraph.nodes.length).toBeGreaterThanOrEqual(4);

    const chemGraph = getKnowledgeGraph("chemistry");
    expect(chemGraph.nodes.every((n) => n.subject === "chemistry")).toBe(true);
  });

  it("searches knowledge nodes by keyword matching label or learning objective", () => {
    const matchLabel = searchKnowledgeNodes("Cực trị");
    expect(matchLabel.some((n) => n.label.includes("Cực Trị"))).toBe(true);

    const matchObj = searchKnowledgeNodes("đổi biến số");
    expect(matchObj.some((n) => n.id === "kn_m_nguyen_ham")).toBe(true);
  });
});
