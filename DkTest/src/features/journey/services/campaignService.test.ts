import { describe, it, expect, beforeEach } from "vitest";
import {
  BUILTIN_CAMPAIGNS,
  validateCampaignGraph,
  getAllCampaigns,
  getStudentCampaignProgress,
  recordCampaignNodeCompletion,
} from "./campaignService";
import type { CampaignNode, NarrativeCampaign } from "../types/campaign";

describe("campaignService", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, String(val)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (idx: number) => Array.from(store.keys())[idx] ?? null,
      length: store.size,
    } as any;
  });

  describe("DAG validation & cycle detection", () => {
    it("validates all built-in campaigns successfully with 0 errors", () => {
      expect(BUILTIN_CAMPAIGNS.length).toBeGreaterThanOrEqual(3);
      for (const camp of BUILTIN_CAMPAIGNS) {
        const val = validateCampaignGraph(camp.nodes);
        expect(val.isValid).toBe(true);
        expect(val.errors).toHaveLength(0);
      }
    });

    it("detects cyclic dependency loop between two nodes", () => {
      const cycleNodes: CampaignNode[] = [
        {
          id: "node_A",
          title: "Node A",
          learningObjective: "Obj A",
          type: "practice_encounter",
          regionId: "reg_1",
          chapterName: "C1",
          topicName: "T1",
          prerequisiteNodeIds: ["node_B"],
          isOptional: false,
          estimatedMinutes: 5,
          x: 0,
          y: 0,
          questionCount: 3,
        },
        {
          id: "node_B",
          title: "Node B",
          learningObjective: "Obj B",
          type: "practice_encounter",
          regionId: "reg_1",
          chapterName: "C1",
          topicName: "T1",
          prerequisiteNodeIds: ["node_A"],
          isOptional: false,
          estimatedMinutes: 5,
          x: 0,
          y: 0,
          questionCount: 3,
        },
      ];

      const res = validateCampaignGraph(cycleNodes);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("Cycle"))).toBe(true);
    });

    it("detects missing prerequisite reference", () => {
      const brokenNodes: CampaignNode[] = [
        {
          id: "node_1",
          title: "Node 1",
          learningObjective: "Obj 1",
          type: "story_intro",
          regionId: "reg_1",
          chapterName: "C1",
          topicName: "T1",
          prerequisiteNodeIds: ["non_existent_node_id"],
          isOptional: false,
          estimatedMinutes: 5,
          x: 0,
          y: 0,
          questionCount: 3,
        },
      ];

      const res = validateCampaignGraph(brokenNodes);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("không tồn tại"))).toBe(true);
    });

    it("detects duplicate node IDs", () => {
      const dupNodes: CampaignNode[] = [
        {
          id: "node_duplicate",
          title: "Node 1",
          learningObjective: "Obj 1",
          type: "story_intro",
          regionId: "reg_1",
          chapterName: "C1",
          topicName: "T1",
          prerequisiteNodeIds: [],
          isOptional: false,
          estimatedMinutes: 5,
          x: 0,
          y: 0,
          questionCount: 3,
        },
        {
          id: "node_duplicate",
          title: "Node 2",
          learningObjective: "Obj 2",
          type: "practice_encounter",
          regionId: "reg_1",
          chapterName: "C1",
          topicName: "T1",
          prerequisiteNodeIds: [],
          isOptional: false,
          estimatedMinutes: 5,
          x: 0,
          y: 0,
          questionCount: 3,
        },
      ];

      const res = validateCampaignGraph(dupNodes);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("Trùng lặp"))).toBe(true);
    });
  });

  describe("Campaign progression & node unlocking", () => {
    const mathCampaign = BUILTIN_CAMPAIGNS[0];
    const studentUid = "student_test_camp_01";

    it("initializes progress with root node unlocked and downstream nodes locked", () => {
      const prog = getStudentCampaignProgress(studentUid, mathCampaign);
      expect(prog.completedNodeCount).toBe(0);
      expect(prog.isCompleted).toBe(false);

      // Root intro node has no prereqs -> unlocked
      expect(prog.nodeProgress["node_m1_intro"]?.isUnlocked).toBe(true);
      expect(prog.nodeProgress["node_m1_intro"]?.isCompleted).toBe(false);

      // Subsequent practice node has prereq node_m1_intro -> locked
      expect(prog.nodeProgress["node_m1_practice"]?.isUnlocked).toBe(false);
    });

    it("unlocks downstream nodes when prerequisite is completed with passing score", () => {
      // Pass intro node
      const updated = recordCampaignNodeCompletion({
        studentUid,
        campaign: mathCampaign,
        nodeId: "node_m1_intro",
        accuracy: 100,
      });

      expect(updated.nodeProgress["node_m1_intro"]?.isCompleted).toBe(true);
      expect(updated.nodeProgress["node_m1_practice"]?.isUnlocked).toBe(true);
      expect(updated.completedNodeCount).toBe(1);
    });

    it("does not complete node if accuracy is below threshold", () => {
      const checkpointNodeId = "node_m2_checkpoint"; // threshold 70%

      // First unlock practice
      recordCampaignNodeCompletion({
        studentUid,
        campaign: mathCampaign,
        nodeId: "node_m1_intro",
        accuracy: 100,
      });
      recordCampaignNodeCompletion({
        studentUid,
        campaign: mathCampaign,
        nodeId: "node_m1_practice",
        accuracy: 100,
      });

      // Attempt checkpoint with 50% (< 70%)
      const cpAttempt = recordCampaignNodeCompletion({
        studentUid,
        campaign: mathCampaign,
        nodeId: checkpointNodeId,
        accuracy: 50,
      });

      expect(cpAttempt.nodeProgress[checkpointNodeId]?.isCompleted).toBe(false);
      expect(cpAttempt.nodeProgress[checkpointNodeId]?.attemptsCount).toBe(1);

      // Retake with 80% (>= 70%)
      const cpPass = recordCampaignNodeCompletion({
        studentUid,
        campaign: mathCampaign,
        nodeId: checkpointNodeId,
        accuracy: 80,
      });
      expect(cpPass.nodeProgress[checkpointNodeId]?.isCompleted).toBe(true);
      expect(cpPass.nodeProgress[checkpointNodeId]?.bestAccuracy).toBe(80);
      expect(cpPass.nodeProgress[checkpointNodeId]?.attemptsCount).toBe(2);
    });
  });
});
