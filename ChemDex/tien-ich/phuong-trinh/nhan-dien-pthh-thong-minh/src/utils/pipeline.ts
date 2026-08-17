/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PipelineResult, StructuredEquation } from "../types";
import { parseEquation, formatEquation } from "./chemParser";
import { repairEquationString } from "./chemRepair";
import { inferReactionProducts } from "./chemInference";
import { balanceEquation } from "./chemBalancer";

/**
 * Runs the complete local chemical pipeline on raw OCR output text
 * @param rawOCR The raw text recognized from the image
 * @param ocrConfidence The confidence returned by the OCR engine (0-100)
 */
export function runLocalPipeline(
  rawOCR: string,
  ocrConfidence = 85,
): PipelineResult {
  const correctionsMade: string[] = [];
  const confidenceDetails: string[] = [];

  // 1. Repair OCR mistakes
  const { repaired, logs: repairLogs } = repairEquationString(
    rawOCR,
    correctionsMade,
  );

  // Calculate repair confidence
  // We start at 100 and deduct 10 points for each correction made. Min 50.
  const numCorrections = correctionsMade.length;
  const repairConfidence = Math.max(50, 100 - numCorrections * 10);
  confidenceDetails.push(
    `Độ tin cậy sửa lỗi OCR: ${repairConfidence}% (${numCorrections} sửa đổi)`,
  );

  // 2. Parse the repaired equation
  let parsed: StructuredEquation | null = null;
  let parseError: string | null = null;
  try {
    parsed = parseEquation(repaired);
  } catch (err: any) {
    parseError = err.message;
  }

  let finalEquation = repaired;
  let reactionType = "Chưa xác định";
  let localBalanced: string | null = null;
  let localInferredProducts: string[] | null = null;
  let localInferenceReasoning: string | null = null;
  let balancingConfidence = 0;
  let inferenceConfidence = 100; // default if not needed

  if (parsed) {
    // 3. Inference of missing products if incomplete
    const reactantFormulas = parsed.reactants.map((r) => r.formula);
    const hasProducts = parsed.products.length > 0;

    if (
      !hasProducts ||
      (parsed.products.length === 1 && parsed.products[0].formula === "?")
    ) {
      // Products are missing, run inference
      const inference = inferReactionProducts(reactantFormulas);
      if (inference) {
        localInferredProducts = inference.predictedProducts;
        localInferenceReasoning = inference.reasoning;
        reactionType = inference.reactionType;
        inferenceConfidence = inference.confidence;

        correctionsMade.push(
          `Dự đoán sản phẩm: [${inference.predictedProducts.join(", ")}]`,
        );
        confidenceDetails.push(
          `Độ tin cậy dự đoán sản phẩm: ${inferenceConfidence}% (${inference.reactionType})`,
        );

        // Reconstruct parsed equation with inferred products
        const inferredComponents = inference.predictedProducts.map((p) => ({
          raw: p,
          coefficient: 1,
          formula: p,
          elements: {}, // will be repopulated if parsed again or balanced
        }));

        parsed = {
          ...parsed,
          products: inferredComponents,
          isComplete: true,
        };

        // Re-format equation with products added
        finalEquation = formatEquation(parsed);
      } else {
        inferenceConfidence = 0;
        confidenceDetails.push(
          "Độ tin cậy dự đoán sản phẩm: 0% (Không khớp quy tắc nào)",
        );
      }
    } else {
      // Products are present, classify reaction if possible
      const inference = inferReactionProducts(reactantFormulas);
      if (inference) {
        reactionType = inference.reactionType;
      } else {
        reactionType = "Phản ứng thông thường";
      }
      confidenceDetails.push(
        "Độ tin cậy dự đoán sản phẩm: 100% (Không cần dự đoán)",
      );
    }

    // 4. Balance the equation
    // Only attempt if we have some reactants and products
    if (
      parsed.reactants.length > 0 &&
      parsed.products.length > 0 &&
      parsed.products[0].formula !== "?"
    ) {
      const balanceResult = balanceEquation(parsed);
      if (balanceResult.success && balanceResult.balanced) {
        parsed = balanceResult.balanced;
        localBalanced = formatEquation(parsed);
        finalEquation = localBalanced;
        balancingConfidence = 100;
        confidenceDetails.push(
          "Độ tin cậy cân bằng phương trình: 100% (Cân bằng thành công)",
        );
      } else {
        balancingConfidence = 0;
        parseError = balanceResult.error;
        confidenceDetails.push(
          `Độ tin cậy cân bằng phương trình: 0% (${balanceResult.error})`,
        );
      }
    }
  } else {
    confidenceDetails.push(
      "Độ tin cậy phân tích phương trình: 0% (Lỗi phân tích cú pháp)",
    );
    inferenceConfidence = 0;
    balancingConfidence = 0;
  }

  // Compute aggregated confidence score
  // Weights: OCR (20%), Repair (30%), Inference (25%), Balancing (25%)
  // Cap at 80% to be realistic and honest as requested by the user.
  const overallConfidence = Math.min(
    80,
    Math.round(
      ocrConfidence * 0.2 +
        repairConfidence * 0.3 +
        inferenceConfidence * 0.25 +
        balancingConfidence * 0.25,
    ),
  );

  return {
    rawOCR,
    repairedText: repaired,
    parsedLocal: parsed,
    localBalanced,
    localInferredProducts,
    localInferenceReasoning,
    localReactionType: reactionType,
    localError: parseError,

    // Gemini filled later
    geminiVerified: null,
    geminiError: null,

    finalEquation,
    finalReactionType: reactionType,
    finalIsBalanced: balancingConfidence === 100,
    confidence: {
      ocr: ocrConfidence,
      repair: repairConfidence,
      inference: inferenceConfidence,
      balancing: balancingConfidence,
      gemini: 0,
      overall: overallConfidence,
    },
    confidenceDetails,
    correctionsMade,
    reasoning:
      localInferenceReasoning ||
      (balancingConfidence === 100
        ? "Phương trình được tự động cân bằng hoàn toàn bằng thuật toán cục bộ."
        : "Không thể tự động cân bằng phương trình."),
  };
}
