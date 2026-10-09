import { describe, it, expect } from "vitest";
import {
  evaluateConfidenceLevel,
  buildTopicMasteryId,
  cleanKey,
} from "./topicMasteryService";

describe("topicMasteryService", () => {
  describe("buildTopicMasteryId & cleanKey", () => {
    it("sanitizes keys properly", () => {
      expect(cleanKey("Toán Học")).toBe("to_n_h_c");
      const id = buildTopicMasteryId("user-1", "Toán", "chuyen_de_1");
      expect(id).toBe("user-1_to_n_chuyen_de_1");
    });
  });

  describe("evaluateConfidenceLevel", () => {
    it("returns insufficient_evidence if attempts < 5, even with 100% accuracy", () => {
      expect(evaluateConfidenceLevel(0, 0)).toBe("insufficient_evidence");
      expect(evaluateConfidenceLevel(3, 100)).toBe("insufficient_evidence");
      expect(evaluateConfidenceLevel(4, 80)).toBe("insufficient_evidence");
    });

    it("returns needs_foundation if accuracy < 50%", () => {
      expect(evaluateConfidenceLevel(10, 40)).toBe("needs_foundation");
      expect(evaluateConfidenceLevel(20, 48.5)).toBe("needs_foundation");
    });

    it("returns developing if accuracy between 50% and 69%", () => {
      expect(evaluateConfidenceLevel(10, 50)).toBe("developing");
      expect(evaluateConfidenceLevel(12, 65)).toBe("developing");
      expect(evaluateConfidenceLevel(15, 69.9)).toBe("developing");
    });

    it("returns progressing if accuracy between 70% and 84%", () => {
      expect(evaluateConfidenceLevel(10, 70)).toBe("progressing");
      expect(evaluateConfidenceLevel(14, 82)).toBe("progressing");
    });

    it("requires at least 15 attempts and >= 85% accuracy to earn mastered", () => {
      // 10 attempts at 90% is progressing (conservative threshold)
      expect(evaluateConfidenceLevel(10, 90)).toBe("progressing");
      // 15 attempts at 85% earns mastered
      expect(evaluateConfidenceLevel(15, 85)).toBe("mastered");
      expect(evaluateConfidenceLevel(30, 95)).toBe("mastered");
    });
  });
});
