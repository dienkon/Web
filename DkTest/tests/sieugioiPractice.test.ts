import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  SIEUGIOI_QUESTIONS,
  SIEUGIOI_LESSONS_METADATA,
  getSieuGioiQuestionsByBai,
  getSieuGioiQuestionsByTopic,
} from "../src/practice/data/sieugioi/sieugioiQuestions";
import {
  sieugioiAllMathMode,
  ALL_SIEUGIOI_BAI_MODES,
  ALL_SIEUGIOI_EXAM_MODES,
} from "../src/practice/generators/math/sieugioiMathModes";
import { practiceRegistry } from "../src/practice/core/PracticeRegistry";
import { grade12CatalogService } from "../src/practice/curriculum/grade12CatalogService";

describe("SieuGioi 5000+ Practice Center Integration", () => {
  it("loads 992 authentic questions and metadata for all 17 lessons", () => {
    expect(SIEUGIOI_QUESTIONS.length).toBe(992);
    expect(Object.keys(SIEUGIOI_LESSONS_METADATA).length).toBe(17);

    // Verify all 17 lessons have at least 1 exam and questions
    for (let bai = 1; bai <= 17; bai++) {
      const baiQuestions = getSieuGioiQuestionsByBai(bai);
      expect(baiQuestions.length).toBeGreaterThan(0);
    }
  });

  it("verifies all 372 local image files exist in public/images/practice/sieugioi", () => {
    const imagesDir = path.resolve(process.cwd(), "public/images/practice/sieugioi");
    expect(fs.existsSync(imagesDir)).toBe(true);
    const files = fs.readdirSync(imagesDir);
    expect(files.length).toBe(372);

    // Check questions that reference local images
    const questionsWithImages = SIEUGIOI_QUESTIONS.filter((q) => q.images.length > 0);
    expect(questionsWithImages.length).toBeGreaterThan(100);

    for (const q of questionsWithImages) {
      for (const imgUrl of q.images) {
        expect(imgUrl.startsWith("/images/practice/sieugioi/")).toBe(true);
        const fileName = path.basename(imgUrl);
        expect(fs.existsSync(path.join(imagesDir, fileName))).toBe(true);
      }
    }
  });

  it("validates sieugioiAllMathMode generates functional PracticeQuestions", () => {
    const q1 = sieugioiAllMathMode.generateQuestion({ difficulty: 1, questionIndex: 0 });
    expect(q1).toBeDefined();
    expect(q1.options?.length).toBeGreaterThan(0);
    expect(q1.prompt.length).toBeGreaterThan(0);
    expect(q1.correctAnswer).toBeDefined();

    const isCorrect = sieugioiAllMathMode.validateAnswer(q1, q1.correctAnswer);
    expect(isCorrect).toBe(true);
  });

  it("registers 17 lesson modes and 61 exam modes in PracticeRegistry", () => {
    expect(ALL_SIEUGIOI_BAI_MODES.length).toBe(17);
    expect(ALL_SIEUGIOI_EXAM_MODES.length).toBe(61);

    // Check that each lesson mode is retrievable from registry
    for (let bai = 1; bai <= 17; bai++) {
      const mode = practiceRegistry.get(`math_sieugioi_bai_${bai}`);
      expect(mode).toBeDefined();
      expect(mode?.title).toContain(`Bài ${bai}`);
    }

    // Check sample exam mode
    const examMode = practiceRegistry.get("sg_exam_1744");
    expect(examMode).toBeDefined();
    expect(examMode?.title).toContain("Đề số 2");
  });

  it("integrates authentic question counts into grade12CatalogService", () => {
    // Topic: GTLN, GTNN (Bài 2)
    const summaryT3 = grade12CatalogService.getTopicSummary("math_t3_minmax");
    expect(summaryT3).toBeDefined();
    expect(summaryT3?.status).toBe("available");
    expect(summaryT3?.itemCount).toBeGreaterThanOrEqual(70);

    // Topic: Đường tiệm cận (Bài 3)
    const summaryT4 = grade12CatalogService.getTopicSummary("math_t4_asymptote");
    expect(summaryT4).toBeDefined();
    expect(summaryT4?.status).toBe("available");
    expect(summaryT4?.itemCount).toBeGreaterThanOrEqual(96);
  });
});
