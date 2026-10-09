import { describe, it, expect } from "vitest";
import {
  repairLearningDataHealth,
  type LearningHealthIssue,
} from "./learningDataReconciliationService";

describe("learningDataReconciliationService", () => {
  it("executes dry-run report without mutating records", async () => {
    const issues: LearningHealthIssue[] = [
      {
        id: "issue_1",
        type: "INVALID_DURATION",
        severity: "warning",
        description: "Negative duration",
        targetId: "act_1",
        suggestedAction: "Reset to 0",
        safeToAutoRepair: true,
        details: { activeDurationSeconds: -50 },
      },
      {
        id: "issue_2",
        type: "ORPHAN_TASK",
        severity: "error",
        description: "Orphaned task",
        targetId: "task_1",
        suggestedAction: "Manual link",
        safeToAutoRepair: false,
      },
    ];

    const dryRunResult = await repairLearningDataHealth(issues, true);
    expect(dryRunResult.dryRun).toBe(true);
    expect(dryRunResult.plannedRepairsCount).toBe(1);
    expect(dryRunResult.appliedRepairsCount).toBe(0);
    expect(dryRunResult.repairedIssueIds).toContain("issue_1");
    expect(dryRunResult.message).toContain("[Dry Run]");
  });
});
