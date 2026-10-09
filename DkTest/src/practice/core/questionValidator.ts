/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Automated Question Validation Utility for DkTEST Learning Platform
 * Validates prompt structure, option uniqueness, correct answer indexing, and LaTeX syntax balance.
 */

import type { PracticeQuestion } from "./types";

export interface QuestionValidationError {
  field: string;
  code: "EMPTY_FIELD" | "TOO_SHORT" | "INSUFFICIENT_OPTIONS" | "DUPLICATE_OPTIONS" | "INVALID_CORRECT_INDEX" | "CORRECT_ANSWER_MISMATCH" | "UNBALANCED_LATEX" | "DUPLICATE_ID";
  message: string;
}

export interface QuestionValidationResult {
  isValid: boolean;
  errors: QuestionValidationError[];
  warnings: string[];
}

export interface GenericQuestionInput {
  id?: string;
  prompt?: string;
  text?: string;
  question?: string;
  type?: string;
  options?: Array<string | { id?: string; text?: string; latex?: string }>;
  correctIndex?: number;
  correctAnswer?: any;
  explanation?: string;
}

/**
 * Validates inline and display LaTeX delimiters in text
 */
export function checkLatexDelimiters(text: string): { isBalanced: boolean; reason?: string } {
  if (!text) return { isBalanced: true };

  // Check double dollar $$ balance
  const doubleDollarCount = (text.match(/\$\$/g) || []).length;
  if (doubleDollarCount % 2 !== 0) {
    return { isBalanced: false, reason: "Unclosed display math $$ delimiter" };
  }

  // Remove all $$ before checking single $
  const withoutDouble = text.replace(/\$\$/g, "");
  // Count unescaped $ signs
  let singleDollarCount = 0;
  for (let i = 0; i < withoutDouble.length; i++) {
    if (withoutDouble[i] === "$") {
      if (i === 0 || withoutDouble[i - 1] !== "\\") {
        singleDollarCount++;
      }
    }
  }

  if (singleDollarCount % 2 !== 0) {
    return { isBalanced: false, reason: "Unclosed inline math $ delimiter" };
  }

  // Check curly brace balance inside LaTeX formulas
  let braceCount = 0;
  let inMath = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "$" && (i === 0 || text[i - 1] !== "\\")) {
      inMath = !inMath;
    } else if (inMath) {
      if (text[i] === "{") braceCount++;
      else if (text[i] === "}") braceCount--;
    }
  }
  if (braceCount !== 0) {
    return { isBalanced: false, reason: "Unbalanced curly braces {} inside LaTeX formula" };
  }

  return { isBalanced: true };
}

/**
 * Validates a single question item against quality constraints
 */
export function validateQuestion(q: GenericQuestionInput): QuestionValidationResult {
  const errors: QuestionValidationError[] = [];
  const warnings: string[] = [];

  // 1. ID check
  if (!q.id || typeof q.id !== "string" || q.id.trim().length === 0) {
    errors.push({
      field: "id",
      code: "EMPTY_FIELD",
      message: "Question ID must be a non-empty string.",
    });
  }

  // 2. Prompt text check (supports prompt, text, or question)
  const promptText = (q.prompt || q.text || q.question || "").trim();
  if (promptText.length === 0) {
    errors.push({
      field: "prompt",
      code: "EMPTY_FIELD",
      message: "Question prompt text is required.",
    });
  } else if (promptText.length < 5) {
    errors.push({
      field: "prompt",
      code: "TOO_SHORT",
      message: "Question prompt text must be at least 5 characters long.",
    });
  }

  // Validate LaTeX in prompt
  const promptLatex = checkLatexDelimiters(promptText);
  if (!promptLatex.isBalanced) {
    errors.push({
      field: "prompt",
      code: "UNBALANCED_LATEX",
      message: promptLatex.reason || "Prompt has invalid LaTeX syntax.",
    });
  }

  // 3. Options validation (if present)
  if (q.options !== undefined && q.options !== null) {
    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push({
        field: "options",
        code: "INSUFFICIENT_OPTIONS",
        message: "Multiple choice question must have at least 2 options.",
      });
    } else {
      const optionTexts = q.options.map((opt) => {
        if (typeof opt === "string") return opt.trim();
        return (opt.text || opt.latex || "").trim();
      });

      // Check empty options
      if (optionTexts.some((t) => t.length === 0)) {
        errors.push({
          field: "options",
          code: "EMPTY_FIELD",
          message: "All options must contain non-empty content.",
        });
      }

      // Check duplicate options
      const uniqueOptions = new Set(optionTexts);
      if (uniqueOptions.size < optionTexts.length) {
        errors.push({
          field: "options",
          code: "DUPLICATE_OPTIONS",
          message: "Options contain duplicate values.",
        });
      }

      // Check LaTeX in each option
      optionTexts.forEach((optText, idx) => {
        const optLatex = checkLatexDelimiters(optText);
        if (!optLatex.isBalanced) {
          errors.push({
            field: `options[${idx}]`,
            code: "UNBALANCED_LATEX",
            message: `Option ${idx + 1} has invalid LaTeX syntax: ${optLatex.reason}`,
          });
        }
      });

      // Check correctIndex bounds
      if (q.correctIndex !== undefined && q.correctIndex !== null) {
        if (
          typeof q.correctIndex !== "number" ||
          !Number.isInteger(q.correctIndex) ||
          q.correctIndex < 0 ||
          q.correctIndex >= q.options.length
        ) {
          errors.push({
            field: "correctIndex",
            code: "INVALID_CORRECT_INDEX",
            message: `correctIndex (${q.correctIndex}) is out of bounds [0, ${q.options.length - 1}].`,
          });
        }
      }

      // Check correctAnswer matching for choice questions
      if (q.type === "choice" && q.correctAnswer !== undefined) {
        const matchFound = q.options.some((opt) => {
          if (typeof opt === "string") {
            return opt.trim() === String(q.correctAnswer).trim();
          }
          return (
            (opt.id && opt.id === String(q.correctAnswer)) ||
            (opt.text && opt.text.trim() === String(q.correctAnswer).trim())
          );
        });
        if (!matchFound) {
          errors.push({
            field: "correctAnswer",
            code: "CORRECT_ANSWER_MISMATCH",
            message: `correctAnswer '${q.correctAnswer}' does not match any available option.`,
          });
        }
      }
    }
  }

  // 4. Explanation check
  if (!q.explanation || q.explanation.trim().length === 0) {
    warnings.push("Explanation is empty; providing explanation improves learning feedback.");
  } else {
    const expLatex = checkLatexDelimiters(q.explanation);
    if (!expLatex.isBalanced) {
      errors.push({
        field: "explanation",
        code: "UNBALANCED_LATEX",
        message: expLatex.reason || "Explanation has invalid LaTeX syntax.",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a collection of questions for internal correctness and ID uniqueness.
 */
export function validateQuestionCollection(
  questions: GenericQuestionInput[]
): { isValid: boolean; duplicateIds: string[]; itemResults: Map<string, QuestionValidationResult> } {
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();
  const itemResults = new Map<string, QuestionValidationResult>();
  let allValid = true;

  questions.forEach((q, idx) => {
    const qId = q.id || `unknown_${idx}`;
    if (seenIds.has(qId)) {
      duplicateIds.add(qId);
      allValid = false;
    } else {
      seenIds.add(qId);
    }

    const res = validateQuestion(q);
    if (!res.isValid) {
      allValid = false;
    }
    itemResults.set(qId, res);
  });

  return {
    isValid: allValid && duplicateIds.size === 0,
    duplicateIds: Array.from(duplicateIds),
    itemResults,
  };
}
