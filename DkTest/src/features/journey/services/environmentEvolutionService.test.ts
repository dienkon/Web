import { describe, it, expect } from "vitest";
import {
  evaluateRegionState,
  getWorldEnvironmentState,
} from "./environmentEvolutionService";

describe("environmentEvolutionService", () => {
  describe("evaluateRegionState", () => {
    it("returns undiscovered when level is below region start", () => {
      expect(evaluateRegionState(5, 11, 25)).toBe("undiscovered");
    });

    it("returns discovered when level is exactly at region start", () => {
      expect(evaluateRegionState(11, 11, 25)).toBe("discovered");
    });

    it("returns activated, developing, and restored as level advances", () => {
      expect(evaluateRegionState(14, 11, 25)).toBe("activated");
      expect(evaluateRegionState(18, 11, 25)).toBe("developing");
      expect(evaluateRegionState(24, 11, 25)).toBe("restored");
    });

    it("returns thriving when level meets or exceeds maxLevel", () => {
      expect(evaluateRegionState(25, 11, 25)).toBe("thriving");
      expect(evaluateRegionState(30, 11, 25)).toBe("thriving");
    });
  });

  describe("getWorldEnvironmentState", () => {
    it("evaluates Math regions correctly for level 15", () => {
      const state = getWorldEnvironmentState({
        subject: "math",
        currentLevel: 15,
        reducedMotion: false,
        ambientParticles: true,
      });

      expect(state.subject).toBe("math");
      expect(state.regions["reg_1"]?.state).toBe("thriving"); // Region 1 (1-10) is conquered
      expect(state.regions["reg_2"]?.state).toBe("activated"); // Region 2 (11-25) is active
      expect(state.regions["reg_3"]?.state).toBe("undiscovered"); // Region 3 (26-40)
      expect(state.reducedMotion).toBe(false);
      expect(state.ambientParticles).toBe(true);
    });

    it("disables ambient particles when reducedMotion is enabled", () => {
      const state = getWorldEnvironmentState({
        subject: "physics",
        currentLevel: 20,
        reducedMotion: true,
        ambientParticles: true,
      });

      expect(state.reducedMotion).toBe(true);
      expect(state.ambientParticles).toBe(false);
    });
  });
});
