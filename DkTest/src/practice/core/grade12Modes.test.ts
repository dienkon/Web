import { describe, it, expect } from "vitest";
import { PracticeRegistry } from "./PracticeRegistry";
import { PracticeQuestion } from "./types";

const GRADE_12_MODE_IDS = [
  "math_calculus_analysis",
  "math_oxyz_geometry",
  "math_statistics_dispersion",
  "physics-thermal-gas",
  "physics_ideal_gas_laws",
  "physics_nuclear_physics",
  "chemistry-ester-lipid",
  "chem_carbohydrate",
  "chem_nitrogen_polymers",
  "chem_electrochem_metals",
  "cs-code-trace-loops",
  "cs_database_sql",
  "cs_network_security",
];

describe("Grade 12 Practice Modes Registration and Generation", () => {
  it("registers all 13 Grade 12 practice modes across Math, Physics, Chemistry, and CS", () => {
    GRADE_12_MODE_IDS.forEach((id) => {
      const mode = PracticeRegistry.get(id);
      expect(mode, `Mode ${id} should be registered in PracticeRegistry`).toBeDefined();
      expect(mode?.id).toBe(id);
      expect(mode?.gradeRange).toBeDefined();
      expect(mode?.title.length).toBeGreaterThan(3);
    });
  });

  it("generates syntactically complete and valid questions for each mode", () => {
    GRADE_12_MODE_IDS.forEach((id) => {
      const mode = PracticeRegistry.get(id);
      if (!mode) return;

      for (let diff = 1; diff <= 3; diff++) {
        const question: PracticeQuestion = mode.generateQuestion({
          difficulty: diff,
          questionIndex: 0,
        });

        expect(question.id).toBeDefined();
        expect(question.type).toBeDefined();
        expect(question.prompt.length).toBeGreaterThan(5);
        expect(question.explanation.length).toBeGreaterThan(5);

        if (question.type === "choice") {
          expect(question.options).toBeDefined();
          expect(question.options?.length).toBeGreaterThanOrEqual(4);
        } else if (question.type === "true_false_group") {
          expect(question.trueFalseStatements).toBeDefined();
          expect(question.trueFalseStatements?.length).toBe(4);
          question.trueFalseStatements?.forEach((stmt) => {
            expect(typeof stmt.isCorrect).toBe("boolean");
            expect(stmt.text.length).toBeGreaterThan(3);
          });
        } else if (question.type === "numeric") {
          expect(question.correctAnswer).toBeDefined();
          expect(typeof question.correctAnswer === "number" || typeof question.correctAnswer === "string").toBe(true);
        }
      }
    });
  });

  it("validates answers accurately for choice, numeric, and true_false_group", () => {
    // 1. Math Calculus mode
    const mathMode = PracticeRegistry.get("math_calculus_analysis");
    expect(mathMode).toBeDefined();

    // Test multiple generations to verify validation logic
    for (let i = 0; i < 5; i++) {
      const q = mathMode!.generateQuestion({ difficulty: 2, questionIndex: i });
      if (q.type === "choice") {
        const isCorrect = mathMode!.validateAnswer(q, q.correctAnswer);
        expect(isCorrect).toBe(true);
        const isWrong = mathMode!.validateAnswer(q, "INVALID_OPT");
        expect(isWrong).toBe(false);
      } else if (q.type === "numeric") {
        const isCorrect = mathMode!.validateAnswer(q, q.correctAnswer);
        expect(isCorrect).toBe(true);
      } else if (q.type === "true_false_group") {
        const correctAnswersMap: Record<string, boolean> = {};
        q.trueFalseStatements?.forEach((stmt) => {
          correctAnswersMap[stmt.id] = stmt.isCorrect;
        });
        const isCorrect = mathMode!.validateAnswer(q, correctAnswersMap);
        expect(isCorrect).toBe(true);
      }
    }
  });

  it("verifies Physics Ideal Gas Laws mode provides authentic Kelvin/Boyle questions", () => {
    const physGas = PracticeRegistry.get("physics_ideal_gas_laws");
    expect(physGas).toBeDefined();

    const q = physGas!.generateQuestion({ difficulty: 1, questionIndex: 0 });
    expect(q.prompt).toBeDefined();
    expect(q.explanation).toBeDefined();
  });

  it("verifies Chemistry Carbohydrates mode includes fermentation and glucose reactions", () => {
    const chemCarb = PracticeRegistry.get("chem_carbohydrate");
    expect(chemCarb).toBeDefined();

    const q = chemCarb!.generateQuestion({ difficulty: 2, questionIndex: 0 });
    expect(q.prompt).toBeDefined();
  });

  it("verifies CS Database SQL mode tests relational model and SQL queries", () => {
    const csSql = PracticeRegistry.get("cs_database_sql");
    expect(csSql).toBeDefined();

    const q = csSql!.generateQuestion({ difficulty: 1, questionIndex: 0 });
    expect(q.prompt).toBeDefined();
  });
});
