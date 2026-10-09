import { describe, it, expect } from "vitest";
import {
  GRADE_12_CURRICULUM_METADATA,
  ALL_GRADE_12_TAXONOMIES,
  MATH_TAXONOMY,
  PHYSICS_TAXONOMY,
  CHEMISTRY_TAXONOMY,
  CS_TAXONOMY,
  getAllGrade12Topics,
  findTopicById,
} from "./grade12Taxonomy";
import { grade12CatalogService } from "./grade12CatalogService";

describe("Grade 12 Curriculum Taxonomy (GDPT 2018 & 2025 Exam Structure)", () => {
  it("has valid curriculum metadata reference", () => {
    expect(GRADE_12_CURRICULUM_METADATA.effectiveYear).toBe(2025);
    expect(GRADE_12_CURRICULUM_METADATA.decisionNumber).toContain("764/QĐ-BGDĐT");
    expect(GRADE_12_CURRICULUM_METADATA.decisionNumber).toContain("32/2018/TT-BGDĐT");
  });

  it("contains all 4 required Grade 12 subjects", () => {
    expect(ALL_GRADE_12_TAXONOMIES.math).toBeDefined();
    expect(ALL_GRADE_12_TAXONOMIES.physics).toBeDefined();
    expect(ALL_GRADE_12_TAXONOMIES.chemistry).toBeDefined();
    expect(ALL_GRADE_12_TAXONOMIES.computer_science).toBeDefined();
  });

  it("matches official Ministry exam specifications for Math (QĐ 764)", () => {
    expect(MATH_TAXONOMY.examDurationMinutes).toBe(90);
    expect(MATH_TAXONOMY.examQuestionCount.part1_multipleChoice).toBe(12);
    expect(MATH_TAXONOMY.examQuestionCount.part2_trueFalseGroup).toBe(4);
    expect(MATH_TAXONOMY.examQuestionCount.part3_shortAnswer).toBe(6);
    expect(MATH_TAXONOMY.examQuestionCount.total).toBe(22);
  });

  it("matches official Ministry exam specifications for Physics & Chemistry (QĐ 764)", () => {
    expect(PHYSICS_TAXONOMY.examDurationMinutes).toBe(50);
    expect(PHYSICS_TAXONOMY.examQuestionCount.part1_multipleChoice).toBe(18);
    expect(PHYSICS_TAXONOMY.examQuestionCount.part2_trueFalseGroup).toBe(4);
    expect(PHYSICS_TAXONOMY.examQuestionCount.part3_shortAnswer).toBe(6);
    expect(PHYSICS_TAXONOMY.examQuestionCount.total).toBe(28);

    expect(CHEMISTRY_TAXONOMY.examDurationMinutes).toBe(50);
    expect(CHEMISTRY_TAXONOMY.examQuestionCount.part1_multipleChoice).toBe(18);
    expect(CHEMISTRY_TAXONOMY.examQuestionCount.part2_trueFalseGroup).toBe(4);
    expect(CHEMISTRY_TAXONOMY.examQuestionCount.part3_shortAnswer).toBe(6);
    expect(CHEMISTRY_TAXONOMY.examQuestionCount.total).toBe(28);
  });

  it("matches official Ministry exam specifications for Computer Science (QĐ 764)", () => {
    expect(CS_TAXONOMY.examDurationMinutes).toBe(50);
    expect(CS_TAXONOMY.examQuestionCount.part1_multipleChoice).toBe(24);
    expect(CS_TAXONOMY.examQuestionCount.part2_trueFalseGroup).toBe(6);
    expect(CS_TAXONOMY.examQuestionCount.total).toBe(30);
  });

  it("ensures every topic belongs to a valid chapter within the same subject", () => {
    const allTopics = getAllGrade12Topics();
    expect(allTopics.length).toBeGreaterThan(30);

    allTopics.forEach((topic) => {
      const taxonomy = ALL_GRADE_12_TAXONOMIES[topic.subject];
      expect(taxonomy).toBeDefined();

      const chapter = taxonomy.chapters.find((c) => c.id === topic.chapterId);
      expect(chapter).toBeDefined();
      expect(chapter?.topicIds).toContain(topic.id);
      expect(topic.skills.length).toBeGreaterThan(0);
      expect(topic.cognitiveLevels.length).toBeGreaterThan(0);
    });
  });

  it("retrieves topics by ID reliably", () => {
    const topic = findTopicById("math_t1_monotonicity");
    expect(topic).toBeDefined();
    expect(topic?.title.toLowerCase()).toContain("tính đơn điệu");
    expect(topic?.subject).toBe("math");
  });
});

describe("Grade 12 Catalog Service", () => {
  it("provides summary for all 4 subjects", () => {
    const summaries = grade12CatalogService.getAllSubjectsSummary();
    expect(summaries.math).toBeDefined();
    expect(summaries.physics).toBeDefined();
    expect(summaries.chemistry).toBeDefined();
    expect(summaries.computer_science).toBeDefined();

    expect(summaries.math.totalTopics).toBe(MATH_TAXONOMY.topics.length);
    expect(summaries.physics.totalTopics).toBe(PHYSICS_TAXONOMY.topics.length);
  });

  it("never invents fake item counts (reports honest status)", () => {
    const mathSummary = grade12CatalogService.getSubjectSummary("math");
    mathSummary.topics.forEach((t) => {
      expect(t.itemCount).toBeGreaterThanOrEqual(0);
      if (t.itemCount === 0) {
        expect(["planned", "in_progress"]).toContain(t.status);
      }
    });
  });

  it("searches topics accurately by keyword and subject filter", () => {
    const results = grade12CatalogService.searchTopics({
      subject: "math",
      query: "tiệm cận",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].topic.title.toLowerCase()).toContain("tiệm cận");
  });
});
