var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/services/ai/aiClient.ts
import { GoogleGenAI } from "@google/genai";
function getAiClient(customApiKey) {
  const env = typeof process !== "undefined" ? process.env : {};
  const effectiveKey = customApiKey && customApiKey.trim() || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || "";
  if (customApiKey && customApiKey.trim()) {
    return new GoogleGenAI({
      apiKey: customApiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  if (!aiInstance || cachedKey !== effectiveKey) {
    if (!effectiveKey) {
      console.warn("GEMINI_API_KEY is missing in server environment.");
    }
    cachedKey = effectiveKey;
    aiInstance = new GoogleGenAI({
      apiKey: effectiveKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiInstance;
}
var aiInstance, cachedKey, GEMINI_3_5_FLASH_LITE, safeEnv, envModel, defaultModel;
var init_aiClient = __esm({
  "src/services/ai/aiClient.ts"() {
    aiInstance = null;
    cachedKey = null;
    GEMINI_3_5_FLASH_LITE = "gemini-3.5-flash-lite";
    safeEnv = typeof process !== "undefined" ? process.env : {};
    envModel = safeEnv.GEMINI_MODEL || safeEnv.VITE_GEMINI_MODEL || GEMINI_3_5_FLASH_LITE;
    if (envModel.startsWith("AQ.") || !envModel.trim()) {
      envModel = GEMINI_3_5_FLASH_LITE;
    }
    defaultModel = envModel || GEMINI_3_5_FLASH_LITE;
  }
});

// src/services/ai/aiEssayGrader.ts
var aiEssayGrader_exports = {};
__export(aiEssayGrader_exports, {
  gradeEssayWithGemini: () => gradeEssayWithGemini
});
async function gradeEssayWithGemini(question, studentAnswer, customApiKey) {
  const maxScore = question.points || 10;
  const cleanAnswer = String(studentAnswer || "").trim();
  if (!cleanAnswer) {
    return {
      score: 0,
      maxScore,
      scoreRatio: 0,
      feedback: "Th\xED sinh ch\u01B0a nh\u1EADp c\xE2u tr\u1EA3 l\u1EDDi cho c\xE2u h\u1ECFi t\u1EF1 lu\u1EADn n\xE0y.",
      strengths: "Ch\u01B0a c\xF3",
      weaknesses: "Ch\u01B0a ho\xE0n th\xE0nh b\xE0i l\xE0m"
    };
  }
  const rubric = question.essayRubric || question.explanation || "\u0110\xE1nh gi\xE1 d\u1EF1a tr\xEAn \u0111\u1ED9 ch\xEDnh x\xE1c, t\xEDnh logic, v\xE0 l\u1EADp lu\u1EADn r\xF5 r\xE0ng.";
  const teacherPrompt = question.essayGradingPrompt || "H\xE3y ch\u1EA5m \u0111i\u1EC3m th\u1EADt c\xF4ng t\xE2m, b\xE1m s\xE1t barem \u0111i\u1EC3m v\xE0 gi\u1EA3i th\xEDch chi ti\u1EBFt \u01B0u nh\u01B0\u1EE3c \u0111i\u1EC3m.";
  const systemInstruction = `B\u1EA1n l\xE0 m\u1ED9t gi\xE1m kh\u1EA3o kh\u1EA3o th\xED h\u1ECDc thu\u1EADt chuy\xEAn nghi\u1EC7p, gi\xE0u kinh nghi\u1EC7m v\xE0 c\xF4ng t\xE2m.
Nhi\u1EC7m v\u1EE5 c\u1EE7a b\u1EA1n l\xE0 ch\u1EA5m \u0111i\u1EC3m b\xE0i l\xE0m t\u1EF1 lu\u1EADn c\u1EE7a h\u1ECDc sinh d\u1EF1a theo \u0111\u1EC1 b\xE0i, barem \u0111\xE1p \xE1n v\xE0 ch\u1EC9 d\u1EABn c\u1EE7a gi\xE1o vi\xEAn.
Thang \u0111i\u1EC3m t\u1ED1i \u0111a l\xE0: ${maxScore} \u0111i\u1EC3m.

Y\xEAu c\u1EA7u tr\u1EA3 v\u1EC1 DUY NH\u1EA4T m\u1ED9t kh\u1ED1i JSON h\u1EE3p l\u1EC7 theo schema sau (kh\xF4ng th\xEAm markdown hay v\u0103n b\u1EA3n ngo\xE0i JSON):
{
  "score": number, // \u0110i\u1EC3m s\u1ED1 t\u1EEB 0 \u0111\u1EBFn ${maxScore}, l\xE0m tr\xF2n 2 ch\u1EEF s\u1ED1 th\u1EADp ph\xE2n (v\xED d\u1EE5: 8.5)
  "scoreRatio": number, // T\u1EF7 l\u1EC7 \u0111i\u1EC3m t\u1EEB 0.0 \u0111\u1EBFn 1.0 (score / ${maxScore})
  "feedback": string, // L\u1EDDi nh\u1EADn x\xE9t chi ti\u1EBFt, mang t\xEDnh x\xE2y d\u1EF1ng v\xE0 kh\xEDch l\u1EC7 b\u1EB1ng ti\u1EBFng Vi\u1EC7t
  "strengths": string, // \u0110i\u1EC3m s\xE1ng, l\u1EADp lu\u1EADn t\u1ED1t c\u1EE7a h\u1ECDc sinh
  "weaknesses": string // Thi\u1EBFu s\xF3t, \u0111i\u1EC3m c\u1EA7n b\u1ED5 sung ho\u1EB7c s\u1EEDa \u0111\u1ED5i
}`;
  const promptContent = `
[\u0110\u1EC0 B\xC0I C\xC2U H\u1ECEI]:
${question.text}

[BAREM \u0110\xC1P \xC1N / H\u01AF\u1EDANG D\u1EAAN GI\u1EA2I C\u1EE6A GI\xC1O VI\xCAN]:
${rubric}

[CH\u1EC8 D\u1EAAN CH\u1EA4M C\u1EE6A GI\xC1O VI\xCAN]:
${teacherPrompt}

[B\xC0I L\xC0M C\u1EE6A TH\xCD SINH]:
"""
${cleanAnswer}
"""
`;
  try {
    const ai = getAiClient(customApiKey);
    const response = await ai.models.generateContent({
      model: defaultModel,
      contents: promptContent,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });
    const text = response.text?.trim() || "";
    const parsed = JSON.parse(text);
    const score = Math.max(0, Math.min(maxScore, Number(parsed.score) || 0));
    const scoreRatio = maxScore > 0 ? score / maxScore : 0;
    return {
      score: Math.round(score * 100) / 100,
      maxScore,
      scoreRatio: Math.round(scoreRatio * 100) / 100,
      feedback: parsed.feedback || "\u0110\xE3 ho\xE0n th\xE0nh b\xE0i l\xE0m.",
      strengths: parsed.strengths || "",
      weaknesses: parsed.weaknesses || ""
    };
  } catch (error) {
    console.error("[aiEssayGrader] Gemini grading error:", error);
    return {
      score: 0,
      maxScore,
      scoreRatio: 0,
      feedback: `Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i v\u1EDBi m\xF4 h\xECnh AI \u0111\u1EC3 ch\u1EA5m t\u1EF1 \u0111\u1ED9ng (${error?.message || "L\u1ED7i m\u1EA1ng"}). B\xE0i l\xE0m s\u1EBD \u0111\u01B0\u1EE3c chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 gi\xE1o vi\xEAn duy\u1EC7t th\u1EE7 c\xF4ng.`,
      strengths: "",
      weaknesses: ""
    };
  }
}
var init_aiEssayGrader = __esm({
  "src/services/ai/aiEssayGrader.ts"() {
    init_aiClient();
  }
});

// src/services/ai/aiRouter.ts
import express from "express";
import multer from "multer";

// src/services/ai/aiExamGenerator.ts
init_aiClient();
import mammoth from "mammoth";

// src/services/ai/aiSchema.ts
import { z } from "zod";
var aiQuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string()
});
var aiOrderingItemSchema = z.object({
  id: z.string(),
  text: z.string()
});
var aiAudioConfigSchema = z.object({
  url: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  maxPlays: z.number().optional(),
  allowSeek: z.boolean().optional(),
  allowPause: z.boolean().optional(),
  autoPlay: z.boolean().optional(),
  enabled: z.boolean().optional()
}).optional();
var aiAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.string().optional(),
  size: z.number().optional()
});
var aiQuestionSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    "single_choice",
    "multiple_choice",
    "true_false",
    "short_answer",
    "ordering",
    "fill_blank",
    "matching"
  ]),
  text: z.string(),
  explanation: z.string().optional(),
  options: z.array(aiQuestionOptionSchema).optional(),
  correctOptionIds: z.array(z.string()).optional(),
  statements: z.array(
    z.object({
      id: z.string().optional(),
      text: z.string(),
      correctAnswer: z.boolean()
    })
  ).optional(),
  acceptedAnswers: z.array(z.string()).optional(),
  orderingItems: z.array(aiOrderingItemSchema).optional(),
  correctOrder: z.array(z.string()).optional(),
  acceptedAnswersPerBlank: z.record(z.string(), z.array(z.string())).optional(),
  blankAnswers: z.array(z.array(z.string())).optional(),
  audioUrl: z.string().optional(),
  audioConfig: aiAudioConfigSchema,
  attachments: z.array(aiAttachmentSchema).optional(),
  sectionId: z.string().nullable().optional(),
  points: z.number().optional(),
  answerSource: z.enum(["document", "ai_generated", "unknown"]).optional(),
  answerConfidence: z.number().optional()
});
var aiSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  audioConfig: aiAudioConfigSchema,
  subExamConfig: z.object({
    enabled: z.boolean(),
    numberOfQuestions: z.number().optional()
  }).optional(),
  disableQuestionShuffle: z.boolean().optional(),
  pinOrder: z.boolean().optional()
});
var aiExamSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  timeLimit: z.number().optional(),
  audioConfig: aiAudioConfigSchema,
  attachments: z.array(aiAttachmentSchema).optional(),
  allowSubExam: z.boolean().optional(),
  subExamConfig: z.object({
    enabled: z.boolean(),
    numberOfQuestions: z.number().optional()
  }).optional()
});
var aiExamImportResultSchema = z.object({
  version: z.literal(1).optional(),
  exam: aiExamSchema.optional(),
  sections: z.array(aiSectionSchema).optional(),
  questions: z.array(aiQuestionSchema),
  warnings: z.array(
    z.object({
      message: z.string()
    })
  ).optional(),
  statistics: z.object({
    totalQuestions: z.number(),
    byType: z.object({
      singleChoice: z.number().optional(),
      multipleChoice: z.number().optional(),
      trueFalse: z.number().optional(),
      shortAnswer: z.number().optional(),
      ordering: z.number().optional(),
      fillBlank: z.number().optional()
    }).optional(),
    answersFromDocument: z.number().optional(),
    answersGeneratedByAI: z.number().optional(),
    answersUnknown: z.number().optional()
  }).optional()
});
var aiAnalyticsSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  trends: z.array(
    z.object({
      label: z.string(),
      direction: z.enum(["up", "down", "stable"]),
      explanation: z.string()
    })
  ),
  questionTypeAnalysis: z.array(
    z.object({
      type: z.string(),
      accuracy: z.number(),
      interpretation: z.string()
    })
  ),
  sectionAnalysis: z.array(
    z.object({
      sectionId: z.string().nullable().optional(),
      title: z.string(),
      accuracy: z.number(),
      advice: z.string()
    })
  ),
  recommendations: z.array(
    z.object({
      priority: z.enum(["high", "medium", "low"]),
      topic: z.string(),
      advice: z.string()
    })
  ),
  studyPlan: z.array(
    z.object({
      step: z.number(),
      action: z.string()
    })
  )
});
var structuredAiAnalysisSchema = z.object({
  summary: z.string(),
  sectionPerformance: z.array(
    z.object({
      sectionId: z.string().optional(),
      title: z.string(),
      accuracy: z.number(),
      strength: z.string().optional(),
      weakness: z.string().optional(),
      stability: z.string().optional()
    })
  ),
  priorities: z.array(
    z.object({
      title: z.string(),
      reason: z.string(),
      evidence: z.string(),
      action: z.string()
    })
  ),
  mistakePatterns: z.array(
    z.object({
      pattern: z.string(),
      description: z.string(),
      affectedQuestions: z.array(z.string()),
      suggestion: z.string()
    })
  ),
  progressAnalysis: z.object({
    startPhase: z.string(),
    middlePhase: z.string(),
    endPhase: z.string(),
    pacingInsight: z.string()
  }),
  timeAnalysis: z.object({
    overallPacing: z.string(),
    fastestInsight: z.string().optional(),
    slowestInsight: z.string().optional(),
    stuckAreas: z.string().optional(),
    rushingAreas: z.string().optional(),
    efficiencyAdvice: z.string()
  }),
  notableQuestions: z.array(
    z.object({
      questionIndex: z.number(),
      questionId: z.string(),
      timeSpentSeconds: z.number(),
      status: z.enum(["correct", "incorrect", "unanswered"]),
      reason: z.string(),
      recommendation: z.string()
    })
  ),
  followUpQuestions: z.array(z.string()),
  disclaimer: z.string()
});

// src/services/ai/aiExamGenerator.ts
import { Type } from "@google/genai";

// src/utils/latexFormatter.ts
var VN_CHAR_LOOKAHEAD = "(?![a-zA-Z\xE0\xE1\u1EA3\xE3\u1EA1\u0103\u1EAF\u1EB1\u1EB3\u1EB5\u1EB7\xE2\u1EA5\u1EA7\u1EA9\u1EAB\u1EAD\u0111\xE8\xE9\u1EBB\u1EBD\u1EB9\xEA\u1EBF\u1EC1\u1EC3\u1EC5\u1EC7\xEC\xED\u1EC9\u0129\u1ECB\xF2\xF3\u1ECF\xF5\u1ECD\xF4\u1ED1\u1ED3\u1ED5\u1ED7\u1ED9\u01A1\u1EDB\u1EDD\u1EDF\u1EE1\u1EE3\xF9\xFA\u1EE7\u0169\u1EE5\u01B0\u1EE9\u1EEB\u1EED\u1EEF\u1EF1\u1EF3\xFD\u1EF7\u1EF9\u1EF5\xC0\xC1\u1EA2\xC3\u1EA0\u0102\u1EAE\u1EB0\u1EB2\u1EB4\u1EB6\xC2\u1EA4\u1EA6\u1EA8\u1EAA\u1EAC\u0110\xC8\xC9\u1EBA\u1EBC\u1EB8\xCA\u1EBE\u1EC0\u1EC2\u1EC4\u1EC6\xCC\xCD\u1EC8\u0128\u1ECA\xD2\xD3\u1ECE\xD5\u1ECC\xD4\u1ED0\u1ED2\u1ED4\u1ED6\u1ED8\u01A0\u1EDA\u1EDC\u1EDE\u1EE0\u1EE2\xD9\xDA\u1EE6\u0168\u1EE4\u01AF\u1EE8\u1EEA\u1EEC\u1EEE\u1EF0\u1EF2\xDD\u1EF6\u1EF8\u1EF4])";
function fixLatexFormatting(str) {
  if (!str) return "";
  let fixed = String(str);
  fixed = fixed.replace(/\\t\s*\\times/g, "\\times");
  fixed = fixed.replace(/\\t\s+times/g, "\\times");
  fixed = fixed.replace(/(\d)\s*\\t\s*(\d)/g, "$1 \\times $2");
  fixed = fixed.replace(/(?<![a-zA-Z\\])\\t\s*(\d)/g, "\\times $1");
  fixed = fixed.replace(/\\to(àn|án|át|ại|ang|àng|áng)/gi, (_, suffix) => "to" + suffix);
  fixed = fixed.replace(/\$\\to\$(àn|án|át|ại|ang|àng|áng)/gi, (_, suffix) => "to" + suffix);
  fixed = fixed.replace(/(?:→|->)(àn|án|át|ại|ang|àng|áng)/gi, (_, suffix) => "to" + suffix);
  fixed = fixed.replace(/\\in\s+(ấn|đề|bài|sách|vở|ra|vào)/gi, "in $1");
  fixed = fixed.replace(/\$\\in\$\s+(ấn|đề|bài|sách|vở|ra|vào)/gi, "in $1");
  fixed = fixed.replace(/\\tan\s+(trong|biến|vỡ|rã)/gi, "tan $1");
  fixed = fixed.replace(/(chất|hòa|độ|sự)\s+\\tan/gi, "$1 tan");
  fixed = fixed.replace(/\x09imes/g, "\\times");
  fixed = fixed.replace(/\x09heta/g, "\\theta");
  fixed = fixed.replace(/\x09an/g, "\\tan");
  fixed = fixed.replace(/\x09ext/g, "\\text");
  fixed = fixed.replace(new RegExp(`\\x09o${VN_CHAR_LOOKAHEAD}`, "g"), "\\to");
  fixed = fixed.replace(/\x09au/g, "\\tau");
  fixed = fixed.replace(/\x09riangle/g, "\\triangle");
  fixed = fixed.replace(/\x09ilde/g, "\\tilde");
  fixed = fixed.replace(/(?:\\t|\x09)\s*x\s*(\d+|[a-zA-Z]+|\$)/g, "\\times $1");
  fixed = fixed.replace(/\\tx\s*(\d+)/g, "\\times $1");
  fixed = fixed.replace(/\x0Aotin/g, "\\notin");
  fixed = fixed.replace(/\x0Aearrow/g, "\\nearrow");
  fixed = fixed.replace(/\x0Aeq/g, "\\neq");
  fixed = fixed.replace(/\x0Aexists/g, "\\nexists");
  fixed = fixed.replace(/\x0Aeg/g, "\\neg");
  fixed = fixed.replace(/\x0Aabla/g, "\\nabla");
  fixed = fixed.replace(/\x0Aewline/g, "\\newline");
  fixed = fixed.replace(/\x0Crac/g, "\\frac");
  fixed = fixed.replace(/\x0Cforall/g, "\\forall");
  fixed = fixed.replace(/\x0C/g, "\\f");
  fixed = fixed.replace(/\x08ar/g, "\\bar");
  fixed = fixed.replace(/\x08egin/g, "\\begin");
  fixed = fixed.replace(/\x08eta/g, "\\beta");
  fixed = fixed.replace(/\x08ox/g, "\\box");
  fixed = fixed.replace(/\x08/g, "\\b");
  fixed = fixed.replace(/\x0Dho/g, "\\rho");
  fixed = fixed.replace(/\x0Dight/g, "\\right");
  fixed = fixed.replace(/[\u200B-\u200D\uFEFF]/g, "");
  fixed = fixed.replace(/(?<!\\|[a-zA-Z])(\d+)\s*imes\s*(\d+)/g, "$1 \\times $2");
  fixed = fixed.replace(/(?<!\\)\b([0-9a-zA-Z]+)\s+times\s+([0-9a-zA-Z]+)\b/g, "$1 \\times $2");
  fixed = fixed.replace(/(?<!\\)\b(\d+)\s*times\s*(\d+)\b/g, "$1 \\times $2");
  const keywords = [
    "frac",
    "dfrac",
    "tfrac",
    "cfrac",
    "sqrt",
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "varepsilon",
    "theta",
    "lambda",
    "mu",
    "nu",
    "pi",
    "sigma",
    "omega",
    "Delta",
    "Gamma",
    "Lambda",
    "Sigma",
    "Omega",
    "infty",
    "lim",
    "int",
    "sum",
    "prod",
    "vec",
    "hat",
    "bar",
    "tilde",
    "mathbf",
    "mathrm",
    "mathbb",
    "mathcal",
    "left",
    "right",
    "begin",
    "end",
    "cdot",
    "times",
    "div",
    "pm",
    "mp",
    "neq",
    "le",
    "ge",
    "leq",
    "geq",
    "approx",
    "equiv",
    "subset",
    "subseteq",
    "in",
    "notin",
    "cup",
    "cap",
    "emptyset",
    "forall",
    "exists",
    "to",
    "rightarrow",
    "Rightarrow",
    "leftarrow",
    "Leftarrow",
    "leftrightarrow",
    "sin",
    "cos",
    "tan",
    "cot",
    "log",
    "ln"
  ];
  const mathCmdPattern = new RegExp(`\\\\{2,}(${keywords.join("|")})${VN_CHAR_LOOKAHEAD}`, "g");
  fixed = fixed.replace(mathCmdPattern, "\\$1");
  fixed = fixed.replace(/∛\s*\{([^}]+)\}/g, "\\sqrt[3]{$1}");
  fixed = fixed.replace(/∛\s*\(([^)]+)\)/g, "\\sqrt[3]{$1}");
  fixed = fixed.replace(/∛\s*(\d+|[a-zA-Z])/g, "\\sqrt[3]{$1}");
  fixed = fixed.replace(/√\s*\{([^}]+)\}/g, "\\sqrt{$1}");
  fixed = fixed.replace(/√\s*\(([^)]+)\)/g, "\\sqrt{$1}");
  fixed = fixed.replace(/√\s*(\d+|[a-zA-Z])/g, "\\sqrt{$1}");
  fixed = fixed.replace(/(?<![a-zA-Z\\])sqrt\s*\{/gi, "\\sqrt{");
  fixed = fixed.replace(/(?<![a-zA-Z\\])sqrt\s*\(([^)]+)\)/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/\\sqrt\s*\(([^)]+)\)/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/(?<![a-zA-Z\\])sqrt\s+([0-9a-zA-Z])\b/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/\\sqrt\s+([0-9a-zA-Z])\b/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/(?<![a-zA-Z\\])rac\s*\{/gi, "\\frac{");
  fixed = fixed.replace(/(?<![a-zA-Z\\])frac\s*\{/gi, "\\frac{");
  fixed = fixed.replace(/(?<![a-zA-Zàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ\\_])\b(sin|cos|tan|cot|arcsin|arccos|arctan|log|ln|lg)\s*(?=\(|\^|_|\{|\[)/gi, "\\$1");
  return fixed;
}

// src/services/ai/aiExamGenerator.ts
async function parseDocxFile(buffer) {
  try {
    const result = await mammoth.convertToHtml({ buffer });
    return result.value || "";
  } catch (err) {
    console.error("Mammoth DOCX parse error:", err);
    throw new Error(`Kh\xF4ng th\u1EC3 \u0111\u1ECDc \u0111\u1ECBnh d\u1EA1ng file Word. H\xE3y \u0111\u1EA3m b\u1EA3o file \u1EDF \u0111\u1ECBnh d\u1EA1ng .docx chu\u1EA9n. (${err.message || ""})`);
  }
}
var schema = {
  type: Type.OBJECT,
  properties: {
    version: { type: Type.INTEGER, description: "Always 1" },
    exam: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        timeLimit: { type: Type.INTEGER }
      }
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["id", "title"]
      }
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: {
            type: Type.STRING,
            description: "Must be 'single_choice', 'multiple_choice', 'true_false', 'short_answer', 'ordering', or 'fill_blank'"
          },
          text: { type: Type.STRING },
          explanation: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING }
              },
              required: ["id", "text"]
            }
          },
          correctOptionIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          statements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                correctAnswer: { type: Type.BOOLEAN }
              },
              required: ["text", "correctAnswer"]
            }
          },
          acceptedAnswers: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          orderingItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING }
              },
              required: ["id", "text"]
            }
          },
          correctOrder: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          audioUrl: { type: Type.STRING },
          sectionId: { type: Type.STRING },
          points: { type: Type.NUMBER },
          answerSource: {
            type: Type.STRING,
            description: "Must be 'document', 'ai_generated', or 'unknown'"
          },
          answerConfidence: { type: Type.NUMBER }
        },
        required: ["type", "text"]
      }
    }
  },
  required: ["questions"]
};
var latexAndFormatGuideline = `
QUY T\u1EAEC B\u1EAET BU\u1ED8C V\u1EC0 T\xCDNH \u0110\xDANG \u0110\u1EAEN, \u0110\xC1P \xC1N, \u0110\u1ECANH D\u1EA0NG V\xC0 CHU\u1EA8N H\xD3A:

==================================================
I. NGUY\xCAN T\u1EAEC X\u1EEC L\xDD C\xC2U H\u1ECEI
==================================================

1. KH\xD4NG \u0110\u01AF\u1EE2C \u0110O\xC1N \u0110\xC1P \xC1N
- Kh\xF4ng \u0111\u01B0\u1EE3c ch\u1ECDn \u0111\xE1p \xE1n d\u1EF1a tr\xEAn v\u1ECB tr\xED, m\u1EABu l\u1EB7p, c\u1EA3m t\xEDnh ho\u1EB7c x\xE1c su\u1EA5t.
- Kh\xF4ng \u0111\u01B0\u1EE3c m\u1EB7c \u0111\u1ECBnh ch\u1ECDn \u0111\xE1p \xE1n A.
- Kh\xF4ng \u0111\u01B0\u1EE3c suy lu\u1EADn r\u1EB1ng \u0111\xE1p \xE1n trong t\xE0i li\u1EC7u ch\u1EAFc ch\u1EAFn \u0111\xFAng ch\u1EC9 v\xEC n\xF3 \u0111\xE3 \u0111\u01B0\u1EE3c cung c\u1EA5p.
- M\u1ECDi \u0111\xE1p \xE1n ph\u1EA3i \u0111\u01B0\u1EE3c ki\u1EC3m tra \u0111\u1ED9c l\u1EADp.

2. B\u1EAET BU\u1ED8C GI\u1EA2I V\xC0 KI\u1EC2M CH\u1EE8NG TR\u01AF\u1EDAC KHI G\xC1N \u0110\xC1P \xC1N

\u0110\u1ED1i v\u1EDBi c\xE2u h\u1ECFi c\xF3 th\u1EC3 gi\u1EA3i \u0111\u01B0\u1EE3c:
B\u01B0\u1EDBc 1: X\xE1c \u0111\u1ECBnh ch\xEDnh x\xE1c y\xEAu c\u1EA7u c\u1EE7a c\xE2u h\u1ECFi.
B\u01B0\u1EDBc 2: Tr\xEDch xu\u1EA5t c\xE1c d\u1EEF ki\u1EC7n c\u1EA7n thi\u1EBFt.
B\u01B0\u1EDBc 3: T\u1EF1 gi\u1EA3i b\xE0i m\u1ED9t c\xE1ch \u0111\u1ED9c l\u1EADp.
B\u01B0\u1EDBc 4: \u0110\u1ED1i chi\u1EBFu k\u1EBFt qu\u1EA3 v\u1EDBi c\xE1c ph\u01B0\u01A1ng \xE1n ho\u1EB7c \u0111\xE1p \xE1n \u0111\u01B0\u1EE3c cung c\u1EA5p.
B\u01B0\u1EDBc 5: Ki\u1EC3m tra l\u1EA1i ph\xE9p t\xEDnh, \u0111\u01A1n v\u1ECB, \u0111i\u1EC1u ki\u1EC7n v\xE0 logic.
B\u01B0\u1EDBc 6: Ch\u1EC9 sau khi ho\xE0n t\u1EA5t ki\u1EC3m tra m\u1EDBi \u0111\u01B0\u1EE3c g\xE1n \u0111\xE1p \xE1n.

N\u1EBFu ph\xE1t hi\u1EC7n \u0111\xE1p \xE1n trong t\xE0i li\u1EC7u kh\xE1c v\u1EDBi k\u1EBFt qu\u1EA3 t\u1EF1 gi\u1EA3i:
- \u01AFu ti\xEAn k\u1EBFt qu\u1EA3 \u0111\u01B0\u1EE3c ch\u1EE9ng minh b\u1EB1ng d\u1EEF ki\u1EC7n v\xE0 ph\xE9p gi\u1EA3i.
- Kh\xF4ng \u0111\u01B0\u1EE3c s\u1EEDa \xE2m th\u1EA7m m\xE0 ph\u1EA3i ph\u1EA3n \xE1nh k\u1EBFt qu\u1EA3 \u0111\xFAng theo schema \u0111\u01B0\u1EE3c cung c\u1EA5p.
- Explanation ph\u1EA3i th\u1EC3 hi\u1EC7n \u0111\u1EE7 c\u01A1 s\u1EDF \u0111\u1EC3 x\xE1c minh.

3. T\u1EF0 KI\u1EC2M TRA L\u1EA6N HAI
Tr\u01B0\u1EDBc khi xu\u1EA5t m\u1ED7i c\xE2u h\u1ECFi, ph\u1EA3i ki\u1EC3m tra l\u1EA1i:
- C\xE2u h\u1ECFi c\xF3 r\xF5 ngh\u0129a kh\xF4ng?
- C\xE1c d\u1EEF ki\u1EC7n c\xF3 m\xE2u thu\u1EABn kh\xF4ng?
- Ph\xE9p t\xEDnh c\xF3 sai kh\xF4ng?
- \u0110\xE1p \xE1n \u0111\u01B0\u1EE3c ch\u1ECDn c\xF3 th\u1EF1c s\u1EF1 ph\xF9 h\u1EE3p v\u1EDBi k\u1EBFt qu\u1EA3 kh\xF4ng?
- N\u1EBFu l\xE0 c\xE2u tr\u1EAFc nghi\u1EC7m, ch\u1EC9 c\xF3 \u0111\xE1p \xE1n \u0111\xFAng ph\xF9 h\u1EE3p hay c\xF3 nhi\u1EC1u ph\u01B0\u01A1ng \xE1n c\xF9ng \u0111\xFAng?
- N\u1EBFu l\xE0 c\xE2u \u0110\xFAng/Sai, t\u1EEBng m\u1EC7nh \u0111\u1EC1 \u0111\xE3 \u0111\u01B0\u1EE3c ki\u1EC3m tra \u0111\u1ED9c l\u1EADp ch\u01B0a?
- N\u1EBFu l\xE0 c\xE2u tr\u1EA3 l\u1EDDi ng\u1EAFn, \u0111\xE1p \xE1n \u0111\xE3 \u0111\u01B0\u1EE3c chu\u1EA9n h\xF3a \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng ch\u01B0a?

N\u1EBFu kh\xF4ng th\u1EC3 x\xE1c minh ch\u1EAFc ch\u1EAFn do d\u1EEF li\u1EC7u thi\u1EBFu, m\u1EDD, l\u1ED7i OCR ho\u1EB7c \u0111\u1EC1 b\xE0i m\xE2u thu\u1EABn:
- Kh\xF4ng \u0111\u01B0\u1EE3c b\u1ECBa \u0111\xE1p \xE1n.
- Ph\u1EA3i s\u1EED d\u1EE5ng gi\xE1 tr\u1ECB ph\xF9 h\u1EE3p m\xE0 schema cho ph\xE9p.
- Explanation ph\u1EA3i n\xEAu r\xF5 v\u1EA5n \u0111\u1EC1.
- Kh\xF4ng t\u1EF1 t\u1EA1o d\u1EEF ki\u1EC7n m\u1EDBi \u0111\u1EC3 ho\xE0n thi\u1EC7n c\xE2u h\u1ECFi.

==================================================
II. QUY T\u1EAEC CHO TR\u1EAEC NGHI\u1EC6M
==================================================

V\u1EDBi d\u1EA1ng multiple_choice:

1. Ph\u1EA3i gi\u1EA3i ho\u1EB7c suy lu\u1EADn \u0111\u1EA7y \u0111\u1EE7 tr\u01B0\u1EDBc khi ch\u1ECDn \u0111\xE1p \xE1n.
2. D\xF2ng cu\u1ED1i c\u1EE7a explanation b\u1EAFt bu\u1ED9c ph\u1EA3i c\xF3:
"Do \u0111\xF3 ch\u1ECDn \u0111\xE1p \xE1n [X]."

Trong \u0111\xF3 X ph\u1EA3i \u0111\xFAng theo ph\u01B0\u01A1ng \xE1n th\u1EF1c t\u1EBF:
- A -> correctOptionIds: ["opt-0"]
- B -> correctOptionIds: ["opt-1"]
- C -> correctOptionIds: ["opt-2"]
- D -> correctOptionIds: ["opt-3"]

Kh\xF4ng \u0111\u01B0\u1EE3c \xE1nh x\u1EA1 sai gi\u1EEFa ch\u1EEF c\xE1i v\xE0 optionId.

3. Kh\xF4ng \u0111\u01B0\u1EE3c ch\u1ECDn opt-0 h\xE0ng lo\u1EA1t.
4. Kh\xF4ng \u0111\u01B0\u1EE3c c\u1ED1 t\xECnh ph\xE2n ph\u1ED1i \u0111\xE1p \xE1n A/B/C/D \u0111\u1EC3 t\u1EA1o c\u1EA3m gi\xE1c c\xE2n b\u1EB1ng.
5. Ph\xE2n b\u1ED1 \u0111\xE1p \xE1n ph\u1EA3i l\xE0 k\u1EBFt qu\u1EA3 t\u1EF1 nhi\xEAn c\u1EE7a vi\u1EC7c gi\u1EA3i t\u1EEBng c\xE2u.
6. N\u1EBFu c\xE2u h\u1ECFi c\xF3 nhi\u1EC1u \u0111\xE1p \xE1n \u0111\xFAng nh\u01B0ng schema ch\u1EC9 cho ph\xE9p m\u1ED9t \u0111\xE1p \xE1n, ph\u1EA3i x\u1EED l\xFD theo schema v\xE0 d\u1EEF li\u1EC7u th\u1EF1c t\u1EBF; tuy\u1EC7t \u0111\u1ED1i kh\xF4ng t\u1EF1 ch\u1ECDn m\u1ED9t ph\u01B0\u01A1ng \xE1n ch\u1EC9 \u0111\u1EC3 ho\xE0n thi\u1EC7n JSON.

==================================================
III. QUY T\u1EAEC D\u1EA0NG \u0110\xDANG/SAI
==================================================

V\u1EDBi d\u1EA1ng true_false:

- Ph\u1EA3i ph\xE2n t\xEDch t\u1EEBng m\u1EC7nh \u0111\u1EC1 a, b, c, d \u0111\u1ED9c l\u1EADp.
- Kh\xF4ng \u0111\u01B0\u1EE3c suy ra c\xE1c m\u1EC7nh \u0111\u1EC1 c\xF2n l\u1EA1i t\u1EEB m\u1ED9t m\u1EC7nh \u0111\u1EC1 kh\xE1c.
- M\u1ED7i m\u1EC7nh \u0111\u1EC1 ph\u1EA3i c\xF3:
  correctAnswer: true
ho\u1EB7c
  correctAnswer: false

Explanation ph\u1EA3i n\xEAu r\xF5 l\xFD do \u0111\u1ED1i v\u1EDBi t\u1EEBng m\u1EC7nh \u0111\u1EC1 n\u1EBFu schema h\u1ED7 tr\u1EE3.

Kh\xF4ng \u0111\u01B0\u1EE3c d\xF9ng c\xF9ng m\u1ED9t \u0111\xE1p \xE1n cho t\u1EA5t c\u1EA3 m\u1EC7nh \u0111\u1EC1 ch\u1EC9 v\xEC m\u1EABu ph\xE2n b\u1ED1.

==================================================
IV. QUY T\u1EAEC D\u1EA0NG TR\u1EA2 L\u1EDCI NG\u1EAEN
==================================================

V\u1EDBi d\u1EA1ng short_answer:

- Ph\u1EA3i t\u1EF1 t\xEDnh ho\u1EB7c suy lu\u1EADn tr\u01B0\u1EDBc.
- K\u1EBFt qu\u1EA3 ph\u1EA3i l\xE0 \u0111\xE1p s\u1ED1 cu\u1ED1i c\xF9ng, kh\xF4ng ph\u1EA3i ph\xE9p t\xEDnh trung gian.
- acceptedAnswers ph\u1EA3i ch\u1EE9a c\xE1c d\u1EA1ng bi\u1EC3u di\u1EC5n h\u1EE3p l\u1EC7 c\xF3 th\u1EC3 ch\u1EA5p nh\u1EADn.

V\xED d\u1EE5:
["12.5", "12,5", "25/2"]

Ch\u1EC9 th\xEAm c\xE1c bi\u1EBFn th\u1EC3 th\u1EF1c s\u1EF1 t\u01B0\u01A1ng \u0111\u01B0\u01A1ng v\u1EC1 m\u1EB7t to\xE1n h\u1ECDc.

Kh\xF4ng \u0111\u01B0\u1EE3c th\xEAm \u0111\xE1p \xE1n g\u1EA7n \u0111\xFAng n\u1EBFu c\xE2u h\u1ECFi y\xEAu c\u1EA7u k\u1EBFt qu\u1EA3 ch\xEDnh x\xE1c.

N\u1EBFu l\xE0 b\xE0i s\u1ED1 h\u1ECDc, \u01B0u ti\xEAn:
- ph\xE2n s\u1ED1 t\u1ED1i gi\u1EA3n;
- s\u1ED1 th\u1EADp ph\xE2n chu\u1EA9n;
- bi\u1EC3u th\u1EE9c r\xFAt g\u1ECDn;
t\xF9y theo t\xEDnh ch\u1EA5t b\xE0i to\xE1n.

==================================================
V. QUY T\u1EAEC D\u1EA0NG S\u1EAEP X\u1EBEP TH\u1EE8 T\u1EF0 (ordering)
==================================================

V\u1EDBi d\u1EA1ng ordering:
- S\u1EED d\u1EE5ng khi c\xE2u h\u1ECFi y\xEAu c\u1EA7u s\u1EAFp x\u1EBFp quy tr\xECnh, th\u1EE9 t\u1EF1 th\u1EDDi gian, c\xE1c b\u01B0\u1EDBc gi\u1EA3i thu\u1EADt, ho\u1EB7c s\u1EF1 ki\u1EC7n l\u1ECBch s\u1EED.
- Tr\u01B0\u1EDDng "orderingItems": m\u1EA3ng c\xE1c m\u1EE5c [{ "id": "item_1", "text": "N\u1ED9i dung b\u01B0\u1EDBc 1" }, ...].
- Tr\u01B0\u1EDDng "correctOrder": m\u1EA3ng c\xE1c ID theo \u0111\xFAng th\u1EE9 t\u1EF1 chu\u1EA9n t\u1EEB \u0111\u1EA7u \u0111\u1EBFn cu\u1ED1i, v\xED d\u1EE5: ["item_3", "item_1", "item_4", "item_2"].
- Explanation ph\u1EA3i n\xEAu r\xF5 v\xEC sao th\u1EE9 t\u1EF1 \u0111\xF3 l\xE0 chu\u1EA9n x\xE1c.

==================================================
VI. QUY T\u1EAEC D\u1EA0NG \u0110I\u1EC0N KHUY\u1EBET (fill_blank)
==================================================

V\u1EDBi d\u1EA1ng fill_blank:
- Trong tr\u01B0\u1EDDng "text", s\u1EED d\u1EE5ng k\xFD hi\u1EC7u "[_]" \u0111\u1EC3 \u0111\xE1nh d\u1EA5u t\u1EEBng v\u1ECB tr\xED tr\u1ED1ng c\u1EA7n \u0111i\u1EC1n (\u0111\u1EBFm t\u1EEB 0).
- Tr\u01B0\u1EDDng "acceptedAnswersPerBlank": \u0111\u1ED1i t\u01B0\u1EE3ng \xE1nh x\u1EA1 ch\u1EC9 s\u1ED1 \xF4 tr\u1ED1ng sang danh s\xE1ch \u0111\xE1p \xE1n h\u1EE3p l\u1EC7, v\xED d\u1EE5:
  {
    "0": ["H\xE0 N\u1ED9i", "ha noi", "Ha Noi"],
    "1": ["1000", "m\u1ED9t ngh\xECn"]
  }
- T\u1EF1 \u0111\u1ED9ng ch\u1EA5p nh\u1EADn vi\u1EBFt hoa/th\u01B0\u1EDDng h\u1EE3p l\xFD v\xE0 lo\u1EA1i tr\u1EEB kho\u1EA3ng tr\u1EAFng th\u1EEBa.

==================================================
VII. B\xC0I THI C\xD3 \xC2M THANH NGHE MP3 & T\u1EC6P \u0110\xCDNH K\xC8M
==================================================

1. \xC2m thanh nghe (Listening Audio - audioConfig / audioUrl):
- Khi \u0111\u1EC1 b\xE0i y\xEAu c\u1EA7u t\u1EA1o b\xE0i ki\u1EC3m tra k\u1EF9 n\u0103ng nghe (Ti\u1EBFng Anh, Ngo\u1EA1i ng\u1EEF, V\u0103n b\u1EA3n \u0111\u1ECDc):
  + C\u1EA5p \u0111\u1ED9 \u0111\u1EC1 thi: "exam.audioConfig": { "url": "https://...", "maxPlays": 2, "allowSeek": true, "allowPause": true, "title": "Audio b\xE0i nghe Part 1-4" }
  + C\u1EA5p \u0111\u1ED9 Section: "section.audioConfig": { "url": "https://...", "maxPlays": 2 }
  + C\u1EA5p \u0111\u1ED9 c\xE2u h\u1ECFi: "audioUrl": "https://..." ho\u1EB7c "audioConfig"
- \u0110\u1EA3m b\u1EA3o c\xE1c c\xE2u h\u1ECFi nghe \u0111\u01B0\u1EE3c gom nh\xF3m r\xF5 r\xE0ng v\xE0o Section t\u01B0\u01A1ng \u1EE9ng.

2. T\u1EC7p \u0111\xEDnh k\xE8m & Li\xEAn k\u1EBFt (attachments):
- Tr\u01B0\u1EDDng "attachments": m\u1EA3ng [{ "name": "T\xE0i li\u1EC7u \u0111\xEDnh k\xE8m", "url": "https://...", "type": "link" | "file" }]
- H\u1ED7 tr\u1EE3 cung c\u1EA5p \u0111\u01B0\u1EDDng d\u1EABn t\xE0i li\u1EC7u b\u1ED5 tr\u1EE3, link tra c\u1EE9u ho\u1EB7c file \u0111\xEDnh k\xE8m sau khi ho\xE0n th\xE0nh b\xE0i thi.

VIII. NGUY\xCAN T\u1EAEC B\u1EAET BU\u1ED8C: S\u1EEC D\u1EE4NG TH\u1EBA <raw>...</raw> \u0110\u1EC2 H\u1EC6 TH\u1ED0NG KH\xD4NG CONVERT C\xDA PH\xC1P HTML V\xC0 D\u1EA4U HUY\u1EC0N BACKTICK (\` V\xC0 \`\`\`)
==================================================

1. Kh\u1ED1i nguy\xEAn b\u1EA3n <raw>...</raw> (CH\u1ED0NG CONVERT HTML SANG DOM):
- V\xCC SAO B\u1EAET BU\u1ED8C PH\u1EA2I D\xD9NG:
  + Giao di\u1EC7n b\xE0i thi c\u1EE7a th\xED sinh render HTML tr\u1EF1c ti\u1EBFp.
  + N\u1EBFu c\xE2u h\u1ECFi ho\u1EB7c c\xE1c ph\u01B0\u01A1ng \xE1n A, B, C, D h\u1ECFi v\u1EC1 th\u1EBB c\xFA ph\xE1p HTML (nh\u01B0 <a>, <p>, <div>, <input>, <img>, <button>, <form>, <table>...) m\xE0 KH\xD4NG B\u1ECCC <raw>...</raw>, tr\xECnh duy\u1EC7t s\u1EBD T\u1EF0 \u0110\u1ED8NG CONVERT ch\xFAng th\xE0nh ph\u1EA7n t\u1EED DOM th\u1EADt!
  + H\u1EADu qu\u1EA3: Th\u1EBB <a> bi\u1EBFn th\xE0nh link \u1EA9n l\xE0m m\u1EA5t ch\u1EEF c\u1EE7a ph\u01B0\u01A1ng \xE1n, th\u1EBB <img> bi\u1EBFn th\xE0nh \u1EA3nh v\u1EE1, th\u1EBB <input> th\xE0nh \xF4 g\xF5 ph\xEDm th\u1EADt, th\u1EBB <button> th\xE0nh n\xFAt b\u1EA5m th\u1EADt... Th\xED sinh KH\xD4NG TH\u1EC2 \u0111\u1ECDc \u0111\u01B0\u1EE3c c\xFA ph\xE1p \u0111\u1EC3 l\xE0m b\xE0i v\xE0 giao di\u1EC7n b\xE0i thi b\u1ECB h\u1ECFng!
  + Khi b\u1ECDc trong <raw>...</raw>, h\u1EC7 th\u1ED1ng DkTEST s\u1EBD V\xD4 HI\u1EC6U H\xD3A vi\u1EC7c convert HTML, gi\u1EEF nguy\xEAn v\u1EB9n 100% c\xFA ph\xE1p d\u1EA1ng text nh\u01B0 "<input type="text">" hay "<a>".

- C\xC1C V\xCD D\u1EE4 C\u1EE4 TH\u1EC2 B\u1EAET BU\u1ED8C D\xD9NG <raw>...</raw>:
  + V\xCD D\u1EE4 1 (H\u1ECFi v\u1EC1 th\u1EBB HTML trong c\xE2u h\u1ECFi tr\u1EAFc nghi\u1EC7m):
    C\xE2u h\u1ECFi: "Trong HTML, th\u1EBB n\xE0o d\xF9ng \u0111\u1EC3 t\u1EA1o m\u1ED9t si\xEAu li\xEAn k\u1EBFt?"
    C\xE1c ph\u01B0\u01A1ng \xE1n PH\u1EA2I VI\u1EBET:
    opt_a: "<raw><a></raw>" (B\u1EAET BU\u1ED8C c\xF3 <raw> \u0111\u1EC3 kh\xF4ng b\u1ECB convert m\u1EA5t ch\u1EEF)
    opt_b: "<raw><link></raw>"
    opt_c: "<raw><href></raw>"
    opt_d: "<raw><url></raw>"
  + V\xCD D\u1EE4 2 (\u0110o\u1EA1n m\xE3 HTML giao di\u1EC7n ho\u1EB7c thu\u1ED9c t\xEDnh):
    V\xED d\u1EE5: "X\xE9t \u0111o\u1EA1n m\xE3 HTML: <raw><img src="logo.png" alt="Logo tr\u01B0\u1EDDng" width="200"/></raw>"
    V\xED d\u1EE5: "\u0110o\u1EA1n form: <raw><form action="/login"><input type="text"/><button class="btn-submit">G\u1EEDi</button></form></raw>"
  + V\xCD D\u1EE4 3 (K\xFD t\u1EF1 to\xE1n so s\xE1nh & logic tr\u1EA7n tr\u1EE5i <, >, &&, ||):
    V\xED d\u1EE5: "Cho \u0111i\u1EC1u ki\u1EC7n ki\u1EC3m tra: <raw>if (count < 10 && total > 0)</raw>..."
    -> N\u1EBFu KH\xD4NG b\u1ECDc <raw>, k\xFD t\u1EF1 "< 10" s\u1EBD b\u1ECB hi\u1EC3u nh\u1EA7m l\xE0 m\u1EDF th\u1EBB HTML '&lt;10', l\xE0m m\u1EA5t ch\u1EEF ho\u1EB7c v\u1EE1 c\u1EA5u tr\xFAc c\xE2u h\u1ECFi.
  + V\xCD D\u1EE4 4 (K\xFD hi\u1EC7u \u0111\xF4-la $ trong c\xE2u v\u0103n ho\u1EB7c gi\xE1 ti\u1EC1n):
    V\xED d\u1EE5: "M\xF3n h\xE0ng A c\xF3 gi\xE1 <raw>$25</raw> v\xE0 m\xF3n h\xE0ng B c\xF3 gi\xE1 <raw>$10</raw>."
    -> N\u1EBFu KH\xD4NG b\u1ECDc <raw>, h\u1EC7 th\u1ED1ng s\u1EBD nh\u1EADn di\u1EC7n hai k\xFD t\u1EF1 $ th\xE0nh c\xF4ng th\u1EE9c to\xE1n KaTeX "$25 v\xE0 m\xF3n h\xE0ng B c\xF3 gi\xE1 $", g\xE2y l\u1ED7i KaTeX m\xE0u \u0111\u1ECF!
  + V\xCD D\u1EE4 5 (Bi\u1EC3u th\u1EE9c ch\xEDnh quy Regex, chu\u1ED7i \u0111\u1ECBnh d\u1EA1ng \u0111\u1EB7c bi\u1EC7t):
    V\xED d\u1EE5: "Bi\u1EC3u th\u1EE9c Regex n\xE0o sau \u0111\xE2y ki\u1EC3m tra email h\u1EE3p l\u1EC7: <raw>^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$</raw>"

2. D\u1EA5u huy\u1EC1n Backtick (\` inline v\xE0 \`\`\` code block):
- D\u1EA4U HUY\u1EC0N \u0110\u01A0N \` (INLINE CODE):
  B\u1EAFt bu\u1ED9c d\xF9ng khi nh\u1EAFc \u0111\u1EBFn t\u1EEB kh\xF3a l\u1EADp tr\xECnh, t\xEAn bi\u1EBFn, t\xEAn h\xE0m, ki\u1EC3u d\u1EEF li\u1EC7u ho\u1EB7c bi\u1EC3u th\u1EE9c ng\u1EAFn ngay trong c\xE2u v\u0103n:
  + V\xED d\u1EE5: "Trong ng\xF4n ng\u1EEF Python, bi\u1EBFn \`total_sum\` \u0111\u01B0\u1EE3c kh\u1EDFi t\u1EA1o b\u1EB1ng gi\xE1 tr\u1ECB \`0\`."
  + V\xED d\u1EE5: "H\xE0m \`len(my_list)\` tr\u1EA3 v\u1EC1 s\u1ED1 l\u01B0\u1EE3ng ph\u1EA7n t\u1EED c\u1EE7a danh s\xE1ch \`my_list\`."
  + V\xED d\u1EE5: "C\xE2u l\u1EC7nh \`cin >> n;\` trong C++ t\u01B0\u01A1ng \u0111\u01B0\u01A1ng v\u1EDBi l\u1EC7nh \`n = int(input())\` trong Python."
  + Tuy\u1EC7t \u0111\u1ED1i KH\xD4NG d\xF9ng d\u1EA5u nh\xE1y k\xE9p " " hay nh\xE1y \u0111\u01A1n ' ' khi \u0111\u1EC1 c\u1EADp \u0111\u1EBFn m\xE3 ngu\u1ED3n ho\u1EB7c bi\u1EBFn s\u1ED1 trong d\xF2ng.
- KH\u1ED0I BA D\u1EA4U HUY\u1EC0N \`\`\` (CODE BLOCK NHI\u1EC0U D\xD2NG - K\xC8M T\xCAN NG\xD4N NG\u1EEE):
  B\u1EAFt bu\u1ED9c d\xF9ng khi tr\xECnh b\xE0y \u0111o\u1EA1n m\xE3 ngu\u1ED3n t\u1EEB 2 d\xF2ng tr\u1EDF l\xEAn. PH\u1EA2I ghi r\xF5 \u0111\u1ECBnh danh ng\xF4n ng\u1EEF (python, cpp, c, java, pascal, javascript, sql, html, css):
  V\xED d\u1EE5:
  \`\`\`python
  def fibonacci(n):
      if n <= 1:
          return n
      return fibonacci(n - 1) + fibonacci(n - 2)
  \`\`\`
  -> H\u1EC7 th\u1ED1ng DkTEST s\u1EBD t\u1EF1 \u0111\u1ED9ng k\xEDch ho\u1EA1t khung code phong c\xE1ch Discord cao c\u1EA5p (n\u1EC1n t\u1ED1i, t\xF4 m\xE0u c\xFA ph\xE1p theo ng\xF4n ng\u1EEF, \u0111\xE1nh s\u1ED1 th\u1EE9 t\u1EF1 d\xF2ng v\xE0 c\xF3 n\xFAt Sao ch\xE9p m\xE3 ti\u1EC7n l\u1EE3i).

3. B\u1EA3ng bi\u1EC3u HTML & Markdown:
- B\u1EA3ng bi\u1EBFn thi\xEAn, b\u1EA3ng x\xE9t d\u1EA5u, b\u1EA3ng s\u1ED1 li\u1EC7u n\xEAn d\xF9ng th\u1EBB HTML:
  <table><thead><tr><th>x</th><th>...</th></tr></thead><tbody><tr><td>f'(x)</td><td>...</td></tr></tbody></table>

==================================================
IX. QUY T\u1EAEC H\xD3A H\u1ECCC V\xC0 KHOA H\u1ECCC
==================================================

- Ph\u1EA3i ph\xE2n bi\u1EC7t \u0111\xFAng ch\u1EC9 s\u1ED1, h\u1EC7 s\u1ED1, \u0111i\u1EC7n t\xEDch, s\u1ED1 oxi h\xF3a v\xE0 k\xFD hi\u1EC7u.
- C\xF4ng th\u1EE9c h\xF3a h\u1ECDc ph\u1EA3i \u0111\u01B0\u1EE3c gi\u1EEF \u0111\xFAng b\u1EA3n ch\u1EA5t.
- Ph\u1EA3n \u1EE9ng h\xF3a h\u1ECDc ph\u1EA3i b\u1EA3o to\xE0n nguy\xEAn t\u1ED1 v\xE0 \u0111i\u1EC7n t\xEDch khi \xE1p d\u1EE5ng.
- Kh\xF4ng \u0111\u01B0\u1EE3c bi\u1EBFn c\xF4ng th\u1EE9c h\xF3a h\u1ECDc th\xE0nh bi\u1EC3u th\u1EE9c to\xE1n h\u1ECDc sai ngh\u0129a.
- V\u1EDBi d\u1EEF li\u1EC7u khoa h\u1ECDc, ph\u1EA3i gi\u1EEF \u0111\xFAng \u0111\u01A1n v\u1ECB v\xE0 \u0111\u1EA1i l\u01B0\u1EE3ng.

==================================================
VI. CHU\u1EA8N H\xD3A LATEX
==================================================

1. T\u1EA5t c\u1EA3 c\xF4ng th\u1EE9c to\xE1n h\u1ECDc ph\u1EA3i \u0111\u01B0\u1EE3c chu\u1EA9n h\xF3a sang LaTeX.

D\xF9ng $...$ cho c\xF4ng th\u1EE9c n\u1EB1m trong d\xF2ng.

V\xED d\u1EE5:
$x^2 + 2x - 3 = 0$
$\\frac{a}{b}$
$\\sqrt{x^2+1}$
$\\alpha, \\beta, \\Delta$
$\\vec{u}=(1;2)$
$f'(x)$
$\\int_0^1 x\\,dx$
$H_2SO_4$

2. D\xF9ng $$...$$ cho c\xF4ng th\u1EE9c ri\xEAng d\xF2ng khi c\u1EA7n tr\xECnh b\xE0y m\u1ED9t ph\u01B0\u01A1ng tr\xECnh ho\u1EB7c bi\u1EC3u th\u1EE9c l\u1EDBn.

3. Kh\xF4ng d\xF9ng LaTeX n\u1EBFu n\u1ED9i dung kh\xF4ng ph\u1EA3i c\xF4ng th\u1EE9c.

4. Kh\xF4ng tr\u1ED9n LaTeX v\u1EDBi c\xFA ph\xE1p Markdown kh\xF4ng c\u1EA7n thi\u1EBFt.

5. \u0110\u1EB7c bi\u1EC7t ch\xFA \xFD escape:
- Trong JSON output, d\u1EA5u backslash c\u1EE7a LaTeX ph\u1EA3i \u0111\u01B0\u1EE3c escape \u0111\xFAng chu\u1EA9n JSON.
- V\xED d\u1EE5 JSON h\u1EE3p l\u1EC7:
"\\frac{a}{b}"
"\\sqrt{x}"
"\\alpha"
"\\int_0^1 x\\,dx"

6. Kh\xF4ng t\u1EA1o LaTeX h\u1ECFng nh\u01B0:
- \\frac kh\xF4ng c\xF3 \u0111\u1EE7 tham s\u1ED1;
- d\u1EA5u ngo\u1EB7c kh\xF4ng c\xE2n b\u1EB1ng;
- l\u1EC7nh kh\xF4ng t\u1ED3n t\u1EA1i;
- d\xF9ng sai k\xFD hi\u1EC7u to\xE1n h\u1ECDc.

==================================================
VII. CHU\u1EA8N H\xD3A V\u0102N B\u1EA2N
==================================================

1. X\xF3a ti\u1EC1n t\u1ED1 c\xE2u h\u1ECFi kh\u1ECFi tr\u01B0\u1EDDng text:
- "C\xE2u 1:"
- "C\xE2u 2."
- "B\xE0i 3:"
- "Question 4:"
- c\xE1c bi\u1EBFn th\u1EC3 t\u01B0\u01A1ng \u0111\u01B0\u01A1ng.

2. X\xF3a ti\u1EC1n t\u1ED1 ph\u01B0\u01A1ng \xE1n kh\u1ECFi n\u1ED9i dung option:
- "A."
- "B."
- "C."
- "D."
- "A)"
- "B)"
- "(C)"
- "(D)"

Kh\xF4ng \u0111\u01B0\u1EE3c x\xF3a n\u1ED9i dung th\u1EF1c s\u1EF1 c\u1EE7a ph\u01B0\u01A1ng \xE1n.

3. Gi\u1EEF nguy\xEAn n\u1ED9i dung chuy\xEAn m\xF4n quan tr\u1ECDng.
4. Kh\xF4ng t\u1EF1 s\u1EEDa n\u1ED9i dung \u0111\u1EC1 n\u1EBFu ch\u01B0a x\xE1c \u0111\u1ECBnh \u0111\xF3 l\xE0 l\u1ED7i \u0111\u1ECBnh d\u1EA1ng/OCR.
5. N\u1EBFu s\u1EEDa l\u1ED7i OCR, ch\u1EC9 s\u1EEDa khi ng\u1EEF c\u1EA3nh ch\u1EE9ng minh r\xF5 r\xE0ng.

==================================================
VIII. X\u1EEC L\xDD \u0110O\u1EA0N \u0110\u1ECCC CHUNG / D\u1EEE LI\u1EC6U CHUNG
==================================================

N\u1EBFu nhi\u1EC1u c\xE2u h\u1ECFi c\xF9ng s\u1EED d\u1EE5ng:
- m\u1ED9t \u0111o\u1EA1n v\u0103n;
- m\u1ED9t b\u1EA3ng;
- m\u1ED9t h\xECnh;
- m\u1ED9t bi\u1EC3u \u0111\u1ED3;
- m\u1ED9t b\u1ED9 d\u1EEF ki\u1EC7n;

th\xEC ph\u1EA3i \u01B0u ti\xEAn \u0111\u01B0a ph\u1EA7n d\u1EEF li\u1EC7u chung v\xE0o Section.description v\xE0 li\xEAn k\u1EBFt c\xE1c c\xE2u h\u1ECFi b\u1EB1ng sectionId.

Kh\xF4ng l\u1EB7p l\u1EA1i to\xE0n b\u1ED9 \u0111o\u1EA1n d\u1EEF li\u1EC7u chung trong t\u1EEBng c\xE2u n\u1EBFu schema \u0111\xE3 c\xF3 c\u01A1 ch\u1EBF section.

N\u1EBFu c\xE2u h\u1ECFi ph\u1EE5 ph\u1EE5 thu\u1ED9c v\xE0o d\u1EEF li\u1EC7u chung, ph\u1EA3i b\u1EA3o \u0111\u1EA3m sectionId li\xEAn k\u1EBFt ch\xEDnh x\xE1c.

==================================================
IX. B\u1EA2O TO\xC0N N\u1ED8I DUNG G\u1ED0C
==================================================

- Kh\xF4ng t\u1EF1 \xFD \u0111\u1ED5i \xFD ngh\u0129a c\xE2u h\u1ECFi.
- Kh\xF4ng t\u1EF1 \xFD th\xEAm d\u1EEF ki\u1EC7n.
- Kh\xF4ng t\u1EF1 \xFD b\u1ECF \u0111i\u1EC1u ki\u1EC7n quan tr\u1ECDng.
- Kh\xF4ng t\u1EF1 \xFD thay \u0111\u1ED5i s\u1ED1 li\u1EC7u.
- Kh\xF4ng t\u1EF1 \xFD \u0111\u1ED5i \u0111\u01A1n v\u1ECB.
- Kh\xF4ng t\u1EF1 \xFD \u0111\u1ED5i \u0111\xE1p \xE1n trong t\xE0i li\u1EC7u n\u1EBFu ch\u01B0a c\xF3 c\u01A1 s\u1EDF x\xE1c minh.

Khi t\xE0i li\u1EC7u b\u1ECB l\u1ED7i, m\u1EDD ho\u1EB7c kh\xF4ng \u0111\u1EE7 th\xF4ng tin:
- \u01AFu ti\xEAn b\u1EA3o to\xE0n d\u1EEF li\u1EC7u \u0111\u1ECDc \u0111\u01B0\u1EE3c.
- Ch\u1EC9 kh\xF4i ph\u1EE5c ph\u1EA7n b\u1ECB l\u1ED7i khi ng\u1EEF c\u1EA3nh cho ph\xE9p x\xE1c \u0111\u1ECBnh r\xF5.
- N\u1EBFu kh\xF4ng th\u1EC3 x\xE1c \u0111\u1ECBnh, kh\xF4ng \u0111\u01B0\u1EE3c \u0111o\xE1n.

==================================================
X. KI\u1EC2M TRA TO\xC0N B\u1ED8 TR\u01AF\u1EDAC KHI OUTPUT
==================================================

Tr\u01B0\u1EDBc khi tr\u1EA3 JSON, b\u1EAFt bu\u1ED9c ki\u1EC3m tra:

1. T\u1EA5t c\u1EA3 c\xE2u h\u1ECFi \u0111\xE3 c\xF3 \u0111\xFAng lo\u1EA1i c\xE2u h\u1ECFi ch\u01B0a?
2. T\u1EA5t c\u1EA3 option c\xF3 \u0111\xFAng th\u1EE9 t\u1EF1 ch\u01B0a?
3. correctOptionIds c\xF3 kh\u1EDBp v\u1EDBi A/B/C/D kh\xF4ng?
4. C\xE2u \u0110\xFAng/Sai \u0111\xE3 \u0111\xE1nh gi\xE1 t\u1EEBng m\u1EC7nh \u0111\u1EC1 ch\u01B0a?
5. acceptedAnswers c\xF3 th\u1EF1c s\u1EF1 \u0111\xFAng kh\xF4ng?
6. Explanation c\xF3 ph\xF9 h\u1EE3p v\u1EDBi \u0111\xE1p \xE1n cu\u1ED1i c\xF9ng kh\xF4ng?
7. D\xF2ng k\u1EBFt lu\u1EADn "Do \u0111\xF3 ch\u1ECDn \u0111\xE1p \xE1n [X]." c\xF3 \u0111\xFAng kh\xF4ng?
8. C\xF4ng th\u1EE9c LaTeX c\xF3 h\u1EE3p l\u1EC7 kh\xF4ng?
9. JSON c\xF3 escape backslash \u0111\xFAng kh\xF4ng?
10. C\xF3 d\u1EEF li\u1EC7u n\xE0o b\u1ECB t\u1EF1 b\u1ECBa kh\xF4ng?
11. C\xF3 c\xE2u n\xE0o b\u1ECB m\u1EA5t d\u1EEF ki\u1EC7n ho\u1EB7c \u0111i\u1EC1u ki\u1EC7n quan tr\u1ECDng kh\xF4ng?
12. C\xF3 field n\xE0o ngo\xE0i schema kh\xF4ng?

Ch\u1EC9 \u0111\u01B0\u1EE3c output sau khi ho\xE0n t\u1EA5t to\xE0n b\u1ED9 qu\xE1 tr\xECnh ki\u1EC3m tra.
`;
var systemInstructionDocument = `
B\u1EA1n l\xE0 Chuy\xEAn gia Nh\u1EADn di\u1EC7n, Chu\u1EA9n h\xF3a v\xE0 Ki\u1EC3m \u0111\u1ECBnh \u0110\u1EC1 thi cho h\u1EC7 th\u1ED1ng DkTEST.

NHI\u1EC6M V\u1EE4:
Chuy\u1EC3n \u0111\u1ED5i t\xE0i li\u1EC7u \u0111\u1EC1 thi t\u1EEB Word/DOCX, PDF, h\xECnh \u1EA3nh ho\u1EB7c v\u0103n b\u1EA3n OCR th\xE0nh JSON \u0111\xFAng schema \u0111\u01B0\u1EE3c cung c\u1EA5p.

${latexAndFormatGuideline}

QUY TR\xCCNH B\u1EAET BU\u1ED8C:

1. \u0110\u1ECCC V\xC0 PH\xC2N T\xCDCH T\xC0I LI\u1EC6U
- X\xE1c \u0111\u1ECBnh c\u1EA5u tr\xFAc \u0111\u1EC1.
- X\xE1c \u0111\u1ECBnh section/ph\u1EA7n thi.
- X\xE1c \u0111\u1ECBnh t\u1EEBng c\xE2u h\u1ECFi.
- X\xE1c \u0111\u1ECBnh d\u1EA1ng c\xE2u h\u1ECFi.
- X\xE1c \u0111\u1ECBnh c\xE1c d\u1EEF ki\u1EC7n d\xF9ng chung.

2. KH\xD4I PH\u1EE4C C\u1EA4U TR\xDAC
- Chu\u1EA9n h\xF3a section.
- Li\xEAn k\u1EBFt c\xE2u h\u1ECFi ph\u1EE5 b\u1EB1ng sectionId.
- Chu\u1EA9n h\xF3a options.
- Chu\u1EA9n h\xF3a \u0111\xE1p \xE1n.
- Chu\u1EA9n h\xF3a explanation.

3. KI\u1EC2M TRA \u0110\xC1P \xC1N
- N\u1EBFu t\xE0i li\u1EC7u c\xF3 \u0111\xE1p \xE1n, d\xF9ng l\xE0m d\u1EEF li\u1EC7u tham kh\u1EA3o v\xE0 t\u1EF1 x\xE1c minh.
- N\u1EBFu t\xE0i li\u1EC7u kh\xF4ng c\xF3 \u0111\xE1p \xE1n, t\u1EF1 gi\u1EA3i.
- N\u1EBFu \u0111\xE1p \xE1n t\xE0i li\u1EC7u m\xE2u thu\u1EABn v\u1EDBi k\u1EBFt qu\u1EA3 t\u1EF1 gi\u1EA3i, \u01B0u ti\xEAn k\u1EBFt qu\u1EA3 c\xF3 th\u1EC3 ch\u1EE9ng minh b\u1EB1ng ph\xE9p gi\u1EA3i.
- Kh\xF4ng \u0111\u01B0\u1EE3c \u0111o\xE1n trong tr\u01B0\u1EDDng h\u1EE3p \u0111\u1EC1 kh\xF4ng \u0111\u1EE7 d\u1EEF ki\u1EC7n.

4. KI\u1EC2M TRA T\xCDNH NH\u1EA4T QU\xC1N
Ph\u1EA3i b\u1EA3o \u0111\u1EA3m:
- c\xE2u h\u1ECFi kh\u1EDBp v\u1EDBi option;
- option kh\u1EDBp v\u1EDBi correctOptionIds;
- explanation kh\u1EDBp v\u1EDBi \u0111\xE1p \xE1n;
- sectionId kh\u1EDBp;
- lo\u1EA1i c\xE2u h\u1ECFi kh\u1EDBp v\u1EDBi c\u1EA5u tr\xFAc d\u1EEF li\u1EC7u.

answerSource:
- "document" ho\u1EB7c gi\xE1 tr\u1ECB t\u01B0\u01A1ng \u1EE9ng theo schema n\u1EBFu \u0111\xE1p \xE1n \u0111\u1EBFn t\u1EEB t\xE0i li\u1EC7u.
- "ai_generated" ch\u1EC9 s\u1EED d\u1EE5ng khi AI th\u1EF1c s\u1EF1 t\u1EF1 x\xE1c \u0111\u1ECBnh \u0111\xE1p \xE1n do t\xE0i li\u1EC7u kh\xF4ng cung c\u1EA5p \u0111\xE1p \xE1n.

CH\u1EC8 tr\u1EA3 v\u1EC1 JSON h\u1EE3p l\u1EC7 kh\u1EDBp ch\xEDnh x\xE1c schema.
Kh\xF4ng c\xF3 Markdown.
Kh\xF4ng c\xF3 \`\`\`json.
Kh\xF4ng c\xF3 v\u0103n b\u1EA3n b\xEAn ngo\xE0i JSON.
`;
var systemInstructionPrompt = `
B\u1EA1n l\xE0 Chuy\xEAn gia So\u1EA1n th\u1EA3o v\xE0 Ki\u1EC3m \u0111\u1ECBnh \u0110\u1EC1 thi Chu\u1EA9n Qu\u1ED1c gia cho h\u1EC7 th\u1ED1ng DkTEST.

NHI\u1EC6M V\u1EE4:
T\u1EA1o m\u1ED9t \u0111\u1EC1 thi ho\xE0n ch\u1EC9nh d\u1EF1a tr\xEAn y\xEAu c\u1EA7u c\u1EE7a ng\u01B0\u1EDDi d\xF9ng:
- m\xF4n h\u1ECDc;
- l\u1EDBp;
- ch\u1EE7 \u0111\u1EC1;
- s\u1ED1 l\u01B0\u1EE3ng c\xE2u;
- d\u1EA1ng c\xE2u h\u1ECFi;
- \u0111\u1ED9 kh\xF3;
- th\u1EDDi l\u01B0\u1EE3ng;
- c\xE1c y\xEAu c\u1EA7u \u0111\u1EB7c bi\u1EC7t kh\xE1c.

${latexAndFormatGuideline}

QUY TR\xCCNH B\u1EAET BU\u1ED8C:

1. THI\u1EBET K\u1EBE MA TR\u1EACN
N\u1EBFu ng\u01B0\u1EDDi d\xF9ng kh\xF4ng ch\u1EC9 \u0111\u1ECBnh t\u1EF7 l\u1EC7:
- Ph\xE2n b\u1ED1 h\u1EE3p l\xFD gi\u1EEFa Nh\u1EADn bi\u1EBFt, Th\xF4ng hi\u1EC3u, V\u1EADn d\u1EE5ng, V\u1EADn d\u1EE5ng cao.
- \u0110\u1EA3m b\u1EA3o t\u1ED5ng s\u1ED1 c\xE2u \u0111\xFAng y\xEAu c\u1EA7u.
- Kh\xF4ng \u0111\u01B0\u1EE3c t\u1EA1o m\u1EA5t c\xE2n \u0111\u1ED1i nghi\xEAm tr\u1ECDng gi\u1EEFa c\xE1c d\u1EA1ng c\xE2u h\u1ECFi.

2. T\u1EA0O C\xC2U H\u1ECEI
M\u1ED7i c\xE2u ph\u1EA3i:
- c\xF3 n\u1ED9i dung r\xF5 r\xE0ng;
- c\xF3 d\u1EEF ki\u1EC7n \u0111\u1EE7 \u0111\u1EC3 gi\u1EA3i;
- ch\u1EC9 c\xF3 m\u1ED9t c\xE1ch hi\u1EC3u h\u1EE3p l\xFD;
- ph\xF9 h\u1EE3p m\xF4n, l\u1EDBp v\xE0 ch\u1EE7 \u0111\u1EC1;
- kh\xF4ng m\xE2u thu\u1EABn v\u1EDBi \u0111\xE1p \xE1n.

3. GI\u1EA2I TR\u01AF\u1EDAC - KI\u1EC2M TRA SAU
\u0110\u1ED1i v\u1EDBi m\u1ECDi c\xE2u h\u1ECFi:
- T\u1EF1 gi\u1EA3i tr\u01B0\u1EDBc.
- X\xE1c \u0111\u1ECBnh \u0111\xE1p \xE1n.
- Ki\u1EC3m tra ng\u01B0\u1EE3c xem \u0111\xE1p \xE1n c\xF3 th\u1ECFa m\xE3n \u0111\u1EC1 b\xE0i kh\xF4ng.
- Ki\u1EC3m tra c\xE1c ph\u01B0\u01A1ng \xE1n nhi\u1EC5u.
- Ch\u1EC9 sau \u0111\xF3 m\u1EDBi ho\xE0n thi\u1EC7n JSON.

4. KI\u1EC2M TRA CH\u1EA4T L\u01AF\u1EE2NG C\xC2U H\u1ECEI

\u0110\u1ED1i v\u1EDBi multiple_choice:
- Kh\xF4ng \u0111\u01B0\u1EE3c c\xF3 2 ph\u01B0\u01A1ng \xE1n c\xF9ng \u0111\xFAng n\u1EBFu schema y\xEAu c\u1EA7u m\u1ED9t \u0111\xE1p \xE1n.
- C\xE1c ph\u01B0\u01A1ng \xE1n ph\u1EA3i c\xF9ng lo\u1EA1i v\xE0 c\xF9ng m\u1EE9c \u0111\u1ED9 di\u1EC5n \u0111\u1EA1t.
- Ph\u01B0\u01A1ng \xE1n nhi\u1EC5u ph\u1EA3i h\u1EE3p l\xFD nh\u01B0ng sai.

\u0110\u1ED1i v\u1EDBi true_false:
- M\u1ED7i m\u1EC7nh \u0111\u1EC1 ph\u1EA3i \u0111\u1ED9c l\u1EADp v\xE0 c\xF3 th\u1EC3 x\xE1c \u0111\u1ECBnh r\xF5 \u0111\xFAng/sai.
- Kh\xF4ng \u0111\u01B0\u1EE3c t\u1EA1o m\u1EC7nh \u0111\u1EC1 m\u01A1 h\u1ED3 ho\u1EB7c ph\u1EE5 thu\u1ED9c v\xE0o c\xE1ch hi\u1EC3u ch\u1EE7 quan.

\u0110\u1ED1i v\u1EDBi short_answer:
- Ch\u1EC9 c\xF3 m\u1ED9t k\u1EBFt qu\u1EA3 \u0111\xFAng ho\u1EB7c t\u1EADp k\u1EBFt qu\u1EA3 t\u01B0\u01A1ng \u0111\u01B0\u01A1ng r\xF5 r\xE0ng.
- acceptedAnswers ph\u1EA3i ch\u1EE9a c\xE1c bi\u1EC3u di\u1EC5n t\u01B0\u01A1ng \u0111\u01B0\u01A1ng th\u1EF1c s\u1EF1.

5. KI\u1EC2M TRA L\u1ED6I
Kh\xF4ng \u0111\u01B0\u1EE3c xu\u1EA5t c\xE2u h\u1ECFi n\u1EBFu:
- thi\u1EBFu d\u1EEF ki\u1EC7n;
- m\xE2u thu\u1EABn;
- \u0111\xE1p \xE1n kh\xF4ng t\u1ED3n t\u1EA1i;
- c\xF3 nhi\u1EC1u \u0111\xE1p \xE1n \u0111\xFAng ngo\xE0i \xFD mu\u1ED1n;
- explanation kh\xF4ng ch\u1EE9ng minh \u0111\u01B0\u1EE3c \u0111\xE1p \xE1n;
- c\xF4ng th\u1EE9c kh\xF4ng h\u1EE3p l\u1EC7;
- LaTeX b\u1ECB h\u1ECFng.

N\u1EBFu ph\xE1t hi\u1EC7n l\u1ED7i trong qu\xE1 tr\xECnh t\u1EF1 ki\u1EC3m tra:
- s\u1EEDa c\xE2u h\u1ECFi tr\u01B0\u1EDBc khi output;
- sau \u0111\xF3 gi\u1EA3i l\u1EA1i t\u1EEB \u0111\u1EA7u;
- kh\xF4ng ch\u1EC9 s\u1EEDa \u0111\xE1p \xE1n m\xE0 b\u1ECF qua vi\u1EC7c ki\u1EC3m tra l\u1EA1i \u0111\u1EC1.

6. answerSource
- T\u1EA5t c\u1EA3 c\xE2u h\u1ECFi th\u1EF1c s\u1EF1 do AI t\u1EA1o m\u1EDBi ph\u1EA3i c\xF3:
  answerSource = "ai_generated"
- Kh\xF4ng d\xF9ng "ai_generated" cho d\u1EEF li\u1EC7u \u0111\u01B0\u1EE3c l\u1EA5y nguy\xEAn b\u1EA3n t\u1EEB t\xE0i li\u1EC7u n\u1EBFu schema c\xF3 gi\xE1 tr\u1ECB kh\xE1c ph\xF9 h\u1EE3p.

CH\u1EC8 tr\u1EA3 v\u1EC1 JSON h\u1EE3p l\u1EC7 theo schema \u0111\u01B0\u1EE3c y\xEAu c\u1EA7u.
Kh\xF4ng c\xF3 Markdown.
Kh\xF4ng c\xF3 \`\`\`json.
Kh\xF4ng c\xF3 v\u0103n b\u1EA3n b\xEAn ngo\xE0i JSON.
`;
function normalizeQuestionsAndExam(rawData, defaultTitle, defaultDesc) {
  const rawQuestions = Array.isArray(rawData?.questions) ? rawData.questions : [];
  const rawSections = Array.isArray(rawData?.sections) ? rawData.sections : [];
  const normalizedSections = rawSections.map((sec, idx) => ({
    id: String(sec.id || `sec-${Date.now()}-${idx}`),
    title: fixLatexFormatting(String(sec.title || `Ph\u1EA7n ${idx + 1}`)),
    description: fixLatexFormatting(String(sec.description || "")),
    order: idx
  }));
  const normalizedQuestions = [];
  rawQuestions.forEach((q, idx) => {
    if (!q || !q.text && !q.options?.length) return;
    let type = String(q.type || "single_choice").toLowerCase();
    if (type.includes("true") || type.includes("false") || type.includes("tf")) {
      type = "true_false";
    } else if (type.includes("short") || type.includes("fill") || type.includes("essay") || type.includes("text")) {
      type = "short_answer";
    } else if (type.includes("multi")) {
      type = "multiple_choice";
    } else {
      type = "single_choice";
    }
    const questionId = String(q.id || `q-${Date.now()}-${idx}`);
    let text = String(q.text || "").trim();
    text = text.replace(/^(câu|bài|question|q)\s*\d+[\s.:\-–—]+/i, "").trim();
    text = fixLatexFormatting(text);
    const explanation = fixLatexFormatting(String(q.explanation || "").trim());
    const normalizedQ = {
      id: questionId,
      type,
      text: text || "C\xE2u h\u1ECFi kh\xF4ng c\xF3 n\u1ED9i dung",
      explanation,
      sectionId: q.sectionId ? String(q.sectionId) : null,
      points: typeof q.points === "number" && q.points > 0 ? q.points : 1,
      order: idx,
      answerSource: q.answerSource === "document" ? "document" : "ai_generated",
      answerConfidence: typeof q.answerConfidence === "number" ? q.answerConfidence : 0.95
    };
    if (type === "single_choice" || type === "multiple_choice") {
      let rawOptions = Array.isArray(q.options) ? q.options : [];
      if (rawOptions.length < 2) {
        rawOptions = [
          { id: "opt-0", text: "\u0110\xE1p \xE1n A" },
          { id: "opt-1", text: "\u0110\xE1p \xE1n B" },
          { id: "opt-2", text: "\u0110\xE1p \xE1n C" },
          { id: "opt-3", text: "\u0110\xE1p \xE1n D" }
        ];
      }
      normalizedQ.options = rawOptions.map((opt, optIdx) => {
        let optText = String(opt?.text || "").trim();
        optText = optText.replace(/^[A-Da-d][\s.):\-–—]+/, "").trim();
        optText = fixLatexFormatting(optText);
        return {
          id: String(opt?.id || `opt-${optIdx}`),
          text: optText || `L\u1EF1a ch\u1ECDn ${String.fromCharCode(65 + optIdx)}`
        };
      });
      let rawCandidates = [];
      if (Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0) {
        rawCandidates.push(...q.correctOptionIds);
      }
      if (q.correctOptionId) {
        rawCandidates.push(q.correctOptionId);
      }
      if (q.correctAnswer) {
        if (Array.isArray(q.correctAnswer)) {
          rawCandidates.push(...q.correctAnswer);
        } else {
          rawCandidates.push(q.correctAnswer);
        }
      }
      if (q.correctOption !== void 0) {
        rawCandidates.push(q.correctOption);
      }
      if (q.correct !== void 0) {
        rawCandidates.push(q.correct);
      }
      const matchedCorrectIds = [];
      const opts = normalizedQ.options;
      for (const item of rawCandidates) {
        if (item === void 0 || item === null) continue;
        const itemStr = String(item).trim();
        const itemLower = itemStr.toLowerCase();
        const direct = opts.find((o) => o.id === itemStr || o.id.toLowerCase() === itemLower);
        if (direct && !matchedCorrectIds.includes(direct.id)) {
          matchedCorrectIds.push(direct.id);
          continue;
        }
        const letterMatch = itemStr.match(/^[A-Ea-e]$/);
        if (letterMatch) {
          const letterIdx = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
          if (letterIdx >= 0 && letterIdx < opts.length && !matchedCorrectIds.includes(opts[letterIdx].id)) {
            matchedCorrectIds.push(opts[letterIdx].id);
            continue;
          }
        }
        const optNumMatch = itemStr.match(/(?:opt|option)[-_ ]?(\d+)/i);
        if (optNumMatch) {
          const idxVal = parseInt(optNumMatch[1], 10);
          if (idxVal >= 0 && idxVal < opts.length && !matchedCorrectIds.includes(opts[idxVal].id)) {
            matchedCorrectIds.push(opts[idxVal].id);
            continue;
          }
        }
        if (/^\d+$/.test(itemStr)) {
          const num = parseInt(itemStr, 10);
          if (num >= 0 && num < opts.length && !matchedCorrectIds.includes(opts[num].id)) {
            matchedCorrectIds.push(opts[num].id);
            continue;
          } else if (num >= 1 && num <= opts.length && !matchedCorrectIds.includes(opts[num - 1].id)) {
            matchedCorrectIds.push(opts[num - 1].id);
            continue;
          }
        }
        const textMatch = opts.find((o) => {
          const t = o.text.trim().toLowerCase();
          return t && (t === itemLower || itemLower.includes(t) || t.includes(itemLower));
        });
        if (textMatch && !matchedCorrectIds.includes(textMatch.id)) {
          matchedCorrectIds.push(textMatch.id);
          continue;
        }
      }
      if (opts.length > 0 && explanation) {
        const expMatch = explanation.match(/(?:do đó|suy ra|kết luận|chọn|đáp án|phương án)\s*(?:chọn|là)?\s*[:\-–—]?\s*(?:đáp án|phương án)?\s*[\*\`"]?([A-D])[\*\`"]?/i) || explanation.match(/\bchọn\s+([A-D])\b/i) || explanation.match(/\b([A-D])\s+(?:là đáp án đúng|chính xác)\b/i);
        if (expMatch) {
          const letter = expMatch[1].toUpperCase();
          const letterIdx = letter.charCodeAt(0) - 65;
          if (letterIdx >= 0 && letterIdx < opts.length) {
            const expOptId = opts[letterIdx].id;
            matchedCorrectIds.length = 0;
            matchedCorrectIds.push(expOptId);
          }
        }
      }
      if (matchedCorrectIds.length === 0 && opts.length > 0) {
        const fallbackIdx = idx % opts.length;
        matchedCorrectIds.push(opts[fallbackIdx].id);
      }
      normalizedQ.correctOptionIds = matchedCorrectIds;
    } else if (type === "true_false") {
      const rawStatements = Array.isArray(q.statements) ? q.statements : [];
      if (rawStatements.length === 0) {
        normalizedQ.statements = [
          { id: "stmt-0", text: "M\u1EC7nh \u0111\u1EC1 A", correctAnswer: true },
          { id: "stmt-1", text: "M\u1EC7nh \u0111\u1EC1 B", correctAnswer: false },
          { id: "stmt-2", text: "M\u1EC7nh \u0111\u1EC1 C", correctAnswer: true },
          { id: "stmt-3", text: "M\u1EC7nh \u0111\u1EC1 D", correctAnswer: false }
        ];
      } else {
        normalizedQ.statements = rawStatements.map((stmt, sIdx) => ({
          id: String(stmt?.id || `stmt-${sIdx}`),
          text: fixLatexFormatting(String(stmt?.text || "").trim()) || `M\u1EC7nh \u0111\u1EC1 ${String.fromCharCode(97 + sIdx)})`,
          correctAnswer: stmt?.correctAnswer !== void 0 ? Boolean(stmt.correctAnswer) : true
        }));
      }
    } else if (type === "short_answer") {
      const rawAnswers = Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : [];
      const cleaned = rawAnswers.map((ans) => fixLatexFormatting(String(ans).trim())).filter(Boolean);
      normalizedQ.acceptedAnswers = cleaned.length > 0 ? cleaned : ["\u0110\xE1p \xE1n \u0111\xFAng"];
    } else if (type === "ordering") {
      const rawItems = Array.isArray(q.orderingItems) ? q.orderingItems : [];
      normalizedQ.orderingItems = rawItems.map((item, itemIdx) => ({
        id: String(item?.id || `item_${itemIdx + 1}`),
        text: fixLatexFormatting(String(item?.text || "").trim())
      }));
      normalizedQ.correctOrder = Array.isArray(q.correctOrder) && q.correctOrder.length > 0 ? q.correctOrder.map(String) : normalizedQ.orderingItems.map((it) => it.id);
    } else if (type === "fill_blank") {
      if (q.acceptedAnswersPerBlank && typeof q.acceptedAnswersPerBlank === "object") {
        normalizedQ.acceptedAnswersPerBlank = q.acceptedAnswersPerBlank;
      }
      if (Array.isArray(q.blankAnswers)) {
        normalizedQ.blankAnswers = q.blankAnswers;
      }
      if (Array.isArray(q.acceptedAnswers) && !normalizedQ.acceptedAnswersPerBlank) {
        normalizedQ.acceptedAnswers = q.acceptedAnswers;
      }
    }
    if (q.audioConfig) normalizedQ.audioConfig = q.audioConfig;
    if (q.audioUrl) normalizedQ.audioUrl = q.audioUrl;
    if (Array.isArray(q.attachments)) normalizedQ.attachments = q.attachments;
    normalizedQuestions.push(normalizedQ);
  });
  const finalExam = {
    version: 1,
    exam: {
      title: rawData?.exam?.title || defaultTitle,
      description: rawData?.exam?.description || defaultDesc,
      timeLimit: typeof rawData?.exam?.timeLimit === "number" ? rawData.exam.timeLimit : 60,
      audioConfig: rawData?.exam?.audioConfig || void 0,
      attachments: Array.isArray(rawData?.exam?.attachments) ? rawData.exam.attachments : void 0,
      allowSubExam: rawData?.exam?.allowSubExam,
      subExamConfig: rawData?.exam?.subExamConfig
    },
    sections: normalizedSections,
    questions: normalizedQuestions,
    statistics: {
      totalQuestions: normalizedQuestions.length,
      byType: {
        singleChoice: normalizedQuestions.filter((q) => q.type === "single_choice").length,
        multipleChoice: normalizedQuestions.filter((q) => q.type === "multiple_choice").length,
        trueFalse: normalizedQuestions.filter((q) => q.type === "true_false").length,
        shortAnswer: normalizedQuestions.filter((q) => q.type === "short_answer").length,
        ordering: normalizedQuestions.filter((q) => q.type === "ordering").length,
        fillBlank: normalizedQuestions.filter((q) => q.type === "fill_blank").length
      },
      answersFromDocument: normalizedQuestions.filter((q) => q.answerSource === "document").length,
      answersGeneratedByAI: normalizedQuestions.filter((q) => q.answerSource === "ai_generated").length,
      answersUnknown: normalizedQuestions.filter((q) => q.answerSource === "unknown").length
    }
  };
  return aiExamImportResultSchema.parse(finalExam);
}
async function processExamFromPromptStream(prompt, onProgress) {
  const ai = getAiClient();
  const startTime = Date.now();
  onProgress(JSON.stringify({
    type: "log",
    level: "info",
    percent: 15,
    message: "Kh\u1EDFi \u0111\u1ED9ng m\xF4 h\xECnh Gemini AI \u0111\u1EC3 ph\xE2n t\xEDch y\xEAu c\u1EA7u...",
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN")
  }));
  onProgress(JSON.stringify({
    type: "log",
    level: "info",
    percent: 30,
    message: "\u0110ang x\xE2y d\u1EF1ng ng\xE2n h\xE0ng c\xE2u h\u1ECFi v\xE0 nh\u1EADn di\u1EC7n c\xF4ng th\u1EE9c to\xE1n/h\xF3a h\u1ECDc chu\u1EA9n LaTeX ($...$)...",
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN")
  }));
  const response = await ai.models.generateContent({
    model: defaultModel,
    contents: `T\u1EA1o \u0111\u1EC1 thi \u0111\u1EA7y \u0111\u1EE7, ch\xEDnh x\xE1c, \u0111\u1ECBnh d\u1EA1ng LaTeX chu\u1EA9n cho c\xF4ng th\u1EE9c to\xE1n h\u1ECDc/h\xF3a h\u1ECDc theo y\xEAu c\u1EA7u sau:
"${prompt}"`,
    config: {
      systemInstruction: systemInstructionPrompt,
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });
  onProgress(JSON.stringify({
    type: "log",
    level: "success",
    percent: 75,
    message: "Gemini AI \u0111\xE3 t\u1EA1o xong n\u1ED9i dung th\xF4. \u0110ang ki\u1EC3m tra c\u1EA5u tr\xFAc d\u1EEF li\u1EC7u JSON...",
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN")
  }));
  try {
    const jsonStr = response.text || "{}";
    const rawData = JSON.parse(jsonStr);
    onProgress(JSON.stringify({
      type: "log",
      level: "info",
      percent: 90,
      message: `\u0110ang chu\u1EA9n h\xF3a c\xE1c c\xE2u h\u1ECFi (${rawData?.questions?.length || 0} c\xE2u) v\xE0 ki\u1EC3m tra c\xF4ng th\u1EE9c LaTeX...`,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN")
    }));
    const validatedData = normalizeQuestionsAndExam(rawData, "\u0110\u1EC1 thi t\u1EF1 \u0111\u1ED9ng t\u1EEB AI", prompt);
    onProgress(JSON.stringify({
      type: "log",
      level: "success",
      percent: 100,
      message: `Ho\xE0n t\u1EA5t t\u1EA1o \u0111\u1EC1 th\xE0nh c\xF4ng trong ${((Date.now() - startTime) / 1e3).toFixed(1)}s! S\u1EB5n s\xE0ng xu\u1EA5t \u0111\u1EC1.`,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN")
    }));
    return validatedData;
  } catch (e) {
    console.error("Prompt parse error:", e);
    throw new Error(`Kh\xF4ng th\u1EC3 t\u1EA1o \u0111\u1EC1 t\u1EEB y\xEAu c\u1EA7u n\xE0y. (${e.message || ""}). Vui l\xF2ng th\u1EED l\u1EA1i.`);
  }
}
async function processExamInChunks(htmlContent, onProgress) {
  const ai = getAiClient();
  const startTime = Date.now();
  if (!htmlContent || htmlContent.trim().length === 0) {
    throw new Error("File Word kh\xF4ng c\xF3 n\u1ED9i dung v\u0103n b\u1EA3n \u0111\u1EC3 ph\xE2n t\xEDch.");
  }
  onProgress(JSON.stringify({
    type: "log",
    level: "info",
    percent: 10,
    message: `\u0110\xE3 \u0111\u1ECDc th\xE0nh c\xF4ng n\u1ED9i dung Word (${htmlContent.length.toLocaleString()} k\xFD t\u1EF1). \u0110ang ph\xE2n \u0111o\u1EA1n t\xE0i li\u1EC7u...`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN")
  }));
  const CHUNK_SIZE = 15e3;
  const chunks = [];
  let currentPos = 0;
  while (currentPos < htmlContent.length) {
    let nextPos = currentPos + CHUNK_SIZE;
    if (nextPos < htmlContent.length) {
      const safeSplit = htmlContent.indexOf("</p>", nextPos - 2e3);
      if (safeSplit !== -1 && safeSplit < nextPos + 2e3) {
        nextPos = safeSplit + 4;
      }
    }
    chunks.push(htmlContent.slice(currentPos, nextPos));
    currentPos = nextPos;
  }
  if (chunks.length === 0) {
    chunks.push(htmlContent);
  }
  onProgress(JSON.stringify({
    type: "log",
    level: "info",
    percent: 20,
    message: `T\xE0i li\u1EC7u \u0111\u01B0\u1EE3c chia th\xE0nh ${chunks.length} ph\u1EA7n \u0111\u1EC3 x\u1EED l\xFD song song & chu\u1EA9n h\xF3a LaTeX...`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN")
  }));
  const combinedRawData = {
    sections: [],
    questions: []
  };
  for (let i = 0; i < chunks.length; i++) {
    const chunkPercent = Math.round(20 + (i + 1) / chunks.length * 65);
    onProgress(JSON.stringify({
      type: "log",
      level: "info",
      current: i + 1,
      total: chunks.length,
      percent: chunkPercent,
      message: `\u0110ang g\u1EEDi ph\u1EA7n ${i + 1}/${chunks.length} t\u1EDBi Gemini AI: nh\u1EADn di\u1EC7n c\xE2u h\u1ECFi, t\xE1ch \u0111\xE1p \xE1n & chuy\u1EC3n \u0111\u1ED5i c\xF4ng th\u1EE9c To\xE1n/L\xFD/H\xF3a sang LaTeX...`,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN")
    }));
    try {
      const response = await ai.models.generateContent({
        model: defaultModel,
        contents: `Ph\xE2n t\xEDch ph\u1EA7n ${i + 1}/${chunks.length} c\u1EE7a \u0111\u1EC1 thi. Nh\u1EADn di\u1EC7n ch\xEDnh x\xE1c c\xE2u h\u1ECFi, \u0111\xE1p \xE1n, v\xE0 chuy\u1EC3n \u0111\u1ED5i m\u1ECDi c\xF4ng th\u1EE9c to\xE1n h\u1ECDc/h\xF3a h\u1ECDc sang LaTeX ($...$):

${chunks[i]}`,
        config: {
          systemInstruction: systemInstructionDocument,
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
      const jsonStr = response.text || "{}";
      const rawChunk = JSON.parse(jsonStr);
      const foundQuestions = Array.isArray(rawChunk.questions) ? rawChunk.questions.length : 0;
      const foundSections = Array.isArray(rawChunk.sections) ? rawChunk.sections.length : 0;
      onProgress(JSON.stringify({
        type: "log",
        level: "success",
        percent: chunkPercent,
        message: `Ph\u1EA7n ${i + 1}/${chunks.length}: Ph\xE1t hi\u1EC7n th\xE0nh c\xF4ng ${foundQuestions} c\xE2u h\u1ECFi v\xE0 ${foundSections} ph\u1EA7n thi.`,
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN")
      }));
      if (rawChunk.exam && !combinedRawData.exam) {
        combinedRawData.exam = rawChunk.exam;
      }
      if (Array.isArray(rawChunk.sections)) {
        combinedRawData.sections.push(...rawChunk.sections);
      }
      if (Array.isArray(rawChunk.questions)) {
        combinedRawData.questions.push(...rawChunk.questions);
      }
    } catch (e) {
      console.error(`Error processing chunk ${i + 1}:`, e);
      onProgress(JSON.stringify({
        type: "log",
        level: "warning",
        percent: chunkPercent,
        message: `C\u1EA3nh b\xE1o ph\u1EA7n ${i + 1}: ${e.message || "L\u1ED7i x\u1EED l\xFD nh\u1EB9, \u0111ang ti\u1EBFp t\u1EE5c..."}`,
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN")
      }));
    }
  }
  onProgress(JSON.stringify({
    type: "log",
    level: "info",
    percent: 92,
    message: "T\u1ED5ng h\u1EE3p to\xE0n b\u1ED9 c\xE2u h\u1ECFi, chu\u1EA9n h\xF3a LaTeX ($...$), g\xE1n ID v\xE0 t\u1EA1o th\u1ED1ng k\xEA \u0111\u1EC1 thi...",
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN")
  }));
  if (combinedRawData.questions.length === 0) {
    throw new Error("AI kh\xF4ng t\xECm th\u1EA5y c\xE2u h\u1ECFi h\u1EE3p l\u1EC7 n\xE0o trong file Word. Vui l\xF2ng ki\u1EC3m tra l\u1EA1i n\u1ED9i dung file.");
  }
  const validatedData = normalizeQuestionsAndExam(combinedRawData, "\u0110\u1EC1 thi t\u1EF1 \u0111\u1ED9ng t\u1EEB file Word", "\u0110\u01B0\u1EE3c t\u1EA1o t\u1EF1 \u0111\u1ED9ng t\u1EEB t\xE0i li\u1EC7u Word t\u1EA3i l\xEAn.");
  onProgress(JSON.stringify({
    type: "log",
    level: "success",
    percent: 100,
    message: `\u0110\xE3 ho\xE0n t\u1EA5t tr\xEDch xu\u1EA5t ${validatedData.questions.length} c\xE2u h\u1ECFi th\xE0nh c\xF4ng trong ${((Date.now() - startTime) / 1e3).toFixed(1)}s!`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN")
  }));
  return validatedData;
}

// src/services/ai/aiTutor.ts
init_aiClient();
import mammoth2 from "mammoth";
async function askTutor(messages, context, customApiKey) {
  const ai = getAiClient(customApiKey);
  let systemInstruction = `B\u1EA1n l\xE0 Tr\u1EE3 l\xFD H\u1ECDc t\u1EADp & Gia s\u01B0 AI Th\xF4ng minh c\u1EE7a DkTEST (N\u1EC1n t\u1EA3ng thi v\xE0 kh\u1EA3o th\xED tr\u1EF1c tuy\u1EBFn hi\u1EC7n \u0111\u1EA1i).
Nhi\u1EC7m v\u1EE5 c\u1EE7a b\u1EA1n l\xE0 h\u01B0\u1EDBng d\u1EABn h\u1ECDc sinh hi\u1EC3u s\xE2u s\u1EAFc c\xE1c kh\xE1i ni\u1EC7m, ph\u01B0\u01A1ng ph\xE1p t\u01B0 duy, c\xE1ch gi\u1EA3i chi ti\u1EBFt v\xE0 l\xFD do \u0111\u1EB1ng sau t\u1EEBng \u0111\xE1p \xE1n.

QUY T\u1EAEC B\u1EAET BU\u1ED8C KHI TR\u1EA2 L\u1EDCI & TR\xCCNH B\xC0Y:
1. \u0110\u1ECANH D\u1EA0NG HTML & TR\xCCNH B\xC0Y \u0110\u1EB8P M\u1EAET:
   - B\u1EA1n \u0110\u01AF\u1EE2C PH\xC9P v\xE0 KHUY\xCAN D\xD9NG c\xE1c th\u1EBB HTML \u0111\u1EC3 tr\xECnh b\xE0y c\xE2u tr\u1EA3 l\u1EDDi tr\u1EF1c quan, sinh \u0111\u1ED9ng:
     + H\u1ED9p ghi ch\xFA / M\u1EB9o: '<div class="p-3 my-2 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 font-medium">\u{1F4A1} <strong>M\u1EB9o t\u01B0 duy:</strong> ...</div>'
     + H\u1ED9p c\u1EA3nh b\xE1o l\u1ED7i sai: '<div class="p-3 my-2 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 font-medium">\u26A0\uFE0F <strong>L\u01B0u \xFD quan tr\u1ECDng:</strong> ...</div>'
     + H\u1ED9p c\xF4ng th\u1EE9c: '<div class="p-3 my-2 bg-indigo-50/80 border border-indigo-200 rounded-xl text-indigo-900">...</div>'
     + Huy hi\u1EC7u / Tag: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">B\u01B0\u1EDBc 1</span>'
     + Danh s\xE1ch c\xF3 s\u1ED1 th\u1EE9 t\u1EF1 / g\u1EA1ch \u0111\u1EA7u d\xF2ng r\xF5 r\xE0ng, ph\xE2n \u0111o\u1EA1n logic.

2. C\xD4NG TH\u1EE8C TO\xC1N H\u1ECCC & LATEX TO\xC0N DI\u1EC6N:
   - T\u1EA5t c\u1EA3 bi\u1EC3u th\u1EE9c to\xE1n h\u1ECDc, bi\u1EBFn s\u1ED1, ph\xE2n s\u1ED1, ph\u01B0\u01A1ng tr\xECnh, s\u1ED1 \u0111o PH\u1EA2I b\u1ECDc trong k\xFD hi\u1EC7u LaTeX chu\u1EA9n:
     + Inline: '$x = \\frac{a}{b}$', '$f(x) = x^2 + 2x - 3$', '$\\sqrt{2}$', '$\\Delta = b^2 - 4ac$'
     + Block (kh\u1ED1i ri\xEAng): '$$\\int_0^1 x dx = \\frac{1}{2}$$' ho\u1EB7c '$$\\begin{cases} 2x + y = 5 \\\\ x - y = 1 \\end{cases}$$'
   - K\xFD hi\u1EC7u to\xE1n h\u1ECDc: '\\notin' (kh\xF4ng thu\u1ED9c), '\\in' (thu\u1ED9c), '\\times' (nh\xE2n), '\\div' (chia), '\\dfrac{a}{b}' (ph\xE2n s\u1ED1), '\\sqrt{x}', '\\ge', '\\le', '\\neq', '\\approx', '\\vec{v}', '\\alpha', '\\beta', '\\pi', v.v.

3. B\u1EA2NG BI\u1EC2U (HTML & MARKDOWN TABLES) V\u1EDAI LATEX \u0110\u1EA6Y \u0110\u1EE6:
   - Khi so s\xE1nh c\xE1c kh\xE1i ni\u1EC7m, l\u1EADp b\u1EA3ng bi\u1EBFn thi\xEAn, b\u1EA3ng x\xE9t d\u1EA5u, b\u1EA3ng gi\xE1 tr\u1ECB t\u1ECDa \u0111\u1ED9, b\u1EA3ng ph\xE2n lo\u1EA1i:
     D\xF9ng B\u1EA3ng Markdown ('| $x$ | $-\\infty$ | $0$ | $+\\infty$ |
|---|:---:|:---:|:---:|') ho\u1EB7c B\u1EA3ng HTML ('<table>...</table>').
   - T\u1EA5t c\u1EA3 c\xF4ng th\u1EE9c to\xE1n trong b\u1EA3ng \u0111\u1EC1u PH\u1EA2I b\u1ECDc trong '$...$' \u0111\u1EC3 h\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng render KaTeX s\u1EAFc n\xE9t.
   - TR\xC1NH \u0111\u1EC3 c\xE1c d\u1EA5u so s\xE1nh to\xE1n h\u1ECDc nh\u01B0 '<' hay '>' \u0111\u1EE9ng tr\u01A1 tr\u1ECDi ngo\xE0i LaTeX (v\xED d\u1EE5 vi\u1EBFt '$x < 5$' thay v\xEC 'x < 5') \u0111\u1EC3 tr\xE1nh b\u1ECB hi\u1EC3u nh\u1EA7m l\xE0 th\u1EBB HTML.

4. \u0110\u1ECANH D\u1EA0NG KH\u1ED0I M\xC3 NGU\u1ED2N (DISCORD CODE BLOCKS) CHU\u1EA8N \u0110\u1EB8P:
   - Khi h\u01B0\u1EDBng d\u1EABn l\u1EADp tr\xECnh, gi\u1EA3i b\xE0i tin h\u1ECDc, thu\u1EADt to\xE1n ho\u1EB7c vi\u1EBFt code (Python, C++, Pascal, Java, C#, SQL, JS/TS, HTML, v.v.):
     B\u1EAET BU\u1ED8C d\xF9ng c\xFA ph\xE1p kh\u1ED1i m\xE3 markdown:
     \`\`\`<t\xEAn_ng\xF4n_ng\u1EEF>
     <m\xE3_ngu\u1ED3n_\u1EDF_\u0111\xE2y>
     \`\`\`
   - H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng render khung code phong c\xE1ch Discord c\u1EF1c \u0111\u1EB9p c\xF3 thanh ti\xEAu \u0111\u1EC1 ng\xF4n ng\u1EEF, s\u1ED1 d\xF2ng v\xE0 n\xFAt sao ch\xE9p nhanh.

5. PH\xC2N T\xCDCH H\xCCNH \u1EA2NH & T\u1EC6P \u0110\xCDNH K\xC8M (MULTIMODAL VISION & T\xC0I LI\u1EC6U):
   - Khi h\u1ECDc sinh g\u1EEDi k\xE8m h\xECnh \u1EA3nh (\u1EA3nh ch\u1EE5p \u0111\u1EC1 b\xE0i, \u0111\u1ED3 th\u1ECB h\xECnh h\u1ECDc, b\u1EA3ng v\u1EBD h\xECnh, b\xE0i l\xE0m vi\u1EBFt tay, s\u01A1 \u0111\u1ED3 th\xED nghi\u1EC7m) ho\u1EB7c t\u1EC7p t\xE0i li\u1EC7u:
     + B\u01AF\u1EDAC 1 - NH\u1EACN DI\u1EC6N V\xC0 TR\xCDCH D\u1EAAN \u0110\u1EC0 B\xC0I: H\xE3y quan s\xE1t t\u1EC9 m\u1EC9 to\xE0n b\u1ED9 h\xECnh \u1EA3nh ho\u1EB7c t\xE0i li\u1EC7u. \u0110\u1ECDc ch\xEDnh x\xE1c t\u1EEBng c\xE2u ch\u1EEF, k\xFD hi\u1EC7u to\xE1n h\u1ECDc, s\u1ED1 li\u1EC7u, \u0111\u1ED3 th\u1ECB, ph\u01B0\u01A1ng tr\xECnh v\xE0 \u0111\u1EC1 b\xE0i. Vi\u1EBFt l\u1EA1i t\xF3m t\u1EAFt n\u1ED9i dung \u0111\u1EC1 b\xE0i b\u1EA1n nh\u1EADn di\u1EC7n \u0111\u01B0\u1EE3c v\xE0o m\u1ED9t h\u1ED9p ghi ch\xFA ('<div class="p-3 my-2 bg-indigo-50/90 border border-indigo-200 rounded-xl text-indigo-900 font-medium">\u{1F4CB} <strong>\u0110\u1EC1 b\xE0i nh\u1EADn di\u1EC7n t\u1EEB \u1EA3nh/t\u1EC7p:</strong> ...</div>') \u0111\u1EC3 h\u1ECDc sinh \u0111\u1ED1i chi\u1EBFu.
     + B\u01AF\u1EDAC 2 - PH\xC2N T\xCDCH PH\u01AF\u01A0NG PH\xC1P: N\xEAu r\xF5 c\xE1c \u0111\u1ECBnh l\xFD, c\xF4ng th\u1EE9c ho\u1EB7c h\u01B0\u1EDBng t\u01B0 duy ng\u1EAFn g\u1ECDn.
     + B\u01AF\u1EDAC 3 - L\u1EDCI GI\u1EA2I CHI TI\u1EBET & \u0110\xC1P \xC1N: Tr\xECnh b\xE0y t\u1EEBng b\u01B0\u1EDBc gi\u1EA3i m\u1EABu m\u1EF1c, t\xEDnh to\xE1n ch\xEDnh x\xE1c, c\xF4ng th\u1EE9c KaTeX s\u1EAFc n\xE9t v\xE0 \u0111\u01B0a ra \u0111\xE1p \xE1n cu\u1ED1i c\xF9ng r\xF5 r\xE0ng.
     + N\u1EBFu \u1EA3nh ch\u1EE5p b\u1ECB m\u1EDD ho\u1EB7c g\xF3c ch\u1EE5p b\u1ECB khu\u1EA5t m\u1ED9t ph\u1EA7n, h\xE3y n\xEAu r\xF5 ph\u1EA7n \u0111\u1ECDc \u0111\u01B0\u1EE3c v\xE0 nh\u1EAFc nh\u1EDF h\u1ECDc sinh ch\u1EE5p l\u1EA1i ph\u1EA7n c\xF2n thi\u1EBFu.

6. PH\u01AF\u01A0NG PH\xC1P S\u01AF PH\u1EA0M:
   - N\u1EBFu h\u1ECDc sinh h\u1ECFi h\u01B0\u1EDBng d\u1EABn gi\u1EA3i ho\u1EB7c g\u1EE3i \xFD, h\xE3y \u0111\u1EB7t c\xE2u h\u1ECFi g\u1EE3i m\u1EDF t\u1EEBng b\u01B0\u1EDBc.
   - Khi h\u1ECDc sinh y\xEAu c\u1EA7u gi\u1EA3i chi ti\u1EBFt, cung c\u1EA5p l\u1EDDi gi\u1EA3i ho\xE0n ch\u1EC9nh, m\u1EABu m\u1EF1c v\xE0 d\u1EC5 hi\u1EC3u nh\u1EA5t.
   - Th\xE2n thi\u1EC7n, t\xF4n tr\u1ECDng, \u0111\u1ED3ng h\xE0nh t\xEDch c\u1EF1c c\xF9ng h\u1ECDc sinh.`;
  if (context) {
    if (context.examTitle) {
      systemInstruction += `

B\u1ED0I C\u1EA2NH \u0110\u1EC0 THI: "${context.examTitle}".
`;
    }
    if (context.currentQuestionText) {
      systemInstruction += `
C\xC2U H\u1ECEI HI\u1EC6N T\u1EA0I:
${context.currentQuestionText}
`;
    }
    if (context.studentAnswer !== void 0) {
      systemInstruction += `
L\u1EF0A CH\u1ECCN C\u1EE6A H\u1ECCC SINH: ${JSON.stringify(context.studentAnswer)}
`;
    }
    if (context.fullQuestionData) {
      const qDataStr = typeof context.fullQuestionData === "string" ? context.fullQuestionData : JSON.stringify(context.fullQuestionData, null, 2);
      systemInstruction += `

========================================
TH\xD4NG TIN NG\u1EA6M \u0110\u1EA6Y \u0110\u1EE6 C\u1EE6A C\xC2U H\u1ECEI TRONG \u0110\u1EC0 THI (D\xD9NG \u0110\u1EC2 GI\u1EA2I \u0110\xC1P CH\xCDNH X\xC1C 100%):
========================================
${qDataStr}

H\u01AF\u1EDANG D\u1EAAN \u0110\u1EB6C BI\u1EC6T D\xC0NH CHO GIA S\u01AF AI:
- B\u1EA1n \u0110\xC3 \u0110\u01AF\u1EE2C CUNG C\u1EA4P to\xE0n b\u1ED9 d\u1EEF li\u1EC7u g\u1ED1c ng\u1EA7m c\u1EE7a c\xE2u h\u1ECFi n\xE0y (n\u1ED9i dung \u0111\u1EC1, t\u1EA5t c\u1EA3 c\xE1c ph\u01B0\u01A1ng \xE1n ch\u1ECDn A/B/C/D ho\u1EB7c c\xE1c \xFD \u0110\xFAng/Sai, \u0111\xE1p \xE1n ch\xEDnh th\u1EE9c t\u1EEB h\u1EC7 th\u1ED1ng thi, l\u1EDDi gi\u1EA3i g\u1ED1c c\u1EE7a gi\xE1o vi\xEAn, v\xE0 b\xE0i l\xE0m th\u1EF1c t\u1EBF c\u1EE7a h\u1ECDc sinh).
- B\u1EAET BU\u1ED8C ph\u1EA3i d\u1EF1a tr\xEAn th\xF4ng tin ch\xEDnh x\xE1c n\xE0y \u0111\u1EC3 tr\u1EA3 l\u1EDDi \u0111\xFAng 100%, kh\xF4ng \u0111\u01B0\u1EE3c t\u1EF1 suy \u0111o\xE1n sai l\u1EC7ch.
- Ph\xE2n t\xEDch r\xF5 r\xE0ng t\u1EA1i sao h\u1ECDc sinh ch\u1ECDn \u0111\xFAng ho\u1EB7c sai, ch\u1EC9 ra c\xE1c b\u01B0\u1EDBc t\u01B0 duy chu\u1EA9n x\xE1c v\xE0 m\u1EB9o tr\xE1nh b\u1EABy.`;
    }
  }
  const contents = await Promise.all(
    messages.map(async (msg) => {
      const parts = [];
      let extraTextFromAttachment = "";
      if (msg.attachment && msg.attachment.data) {
        const rawData = msg.attachment.data;
        const base64Str = rawData.includes(";base64,") ? rawData.split(";base64,")[1] : rawData;
        let mimeType = msg.attachment.type || "image/jpeg";
        if (rawData.startsWith("data:")) {
          const extractedMime = rawData.substring(5, rawData.indexOf(";"));
          if (extractedMime) mimeType = extractedMime;
        }
        const fileName = (msg.attachment.name || "").toLowerCase();
        if (mimeType.includes("word") || mimeType.includes("officedocument") || fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
          try {
            const buffer = Buffer.from(base64Str, "base64");
            const docxResult = await mammoth2.extractRawText({ buffer });
            const docxText = docxResult.value?.trim();
            if (docxText) {
              extraTextFromAttachment = `

[N\u1ED9i dung t\xE0i li\u1EC7u Word \u0111\xEDnh k\xE8m "${msg.attachment.name || "document.docx"}":]
${docxText}
`;
            }
          } catch (e) {
            console.error("[askTutor] L\u1ED7i tr\xEDch xu\u1EA5t v\u0103n b\u1EA3n t\u1EEB t\u1EC7p Word:", e);
          }
        } else if (mimeType.startsWith("text/") || fileName.endsWith(".txt") || fileName.endsWith(".md") || fileName.endsWith(".csv") || fileName.endsWith(".json") || fileName.endsWith(".py") || fileName.endsWith(".js") || fileName.endsWith(".ts")) {
          try {
            const textContent = Buffer.from(base64Str, "base64").toString("utf-8");
            extraTextFromAttachment = `

[N\u1ED9i dung t\u1EC7p v\u0103n b\u1EA3n \u0111\xEDnh k\xE8m "${msg.attachment.name || "file.txt"}":]
\`\`\`
${textContent}
\`\`\`
`;
          } catch (e) {
            console.error("[askTutor] L\u1ED7i gi\u1EA3i m\xE3 t\u1EC7p v\u0103n b\u1EA3n:", e);
          }
        } else {
          let normalizedMime = mimeType;
          if (normalizedMime.includes("pdf") || fileName.endsWith(".pdf")) {
            normalizedMime = "application/pdf";
          } else if (normalizedMime.includes("png") || fileName.endsWith(".png")) {
            normalizedMime = "image/png";
          } else if (normalizedMime.includes("webp") || fileName.endsWith(".webp")) {
            normalizedMime = "image/webp";
          } else if (normalizedMime.includes("gif") || fileName.endsWith(".gif")) {
            normalizedMime = "image/gif";
          } else if (normalizedMime.includes("heic") || fileName.endsWith(".heic")) {
            normalizedMime = "image/heic";
          } else {
            normalizedMime = "image/jpeg";
          }
          parts.push({
            inlineData: {
              mimeType: normalizedMime,
              data: base64Str
            }
          });
        }
      }
      let textPart = msg.text || "";
      if (extraTextFromAttachment) {
        textPart = (textPart ? `${textPart}
` : "") + extraTextFromAttachment;
      }
      if (!textPart && msg.attachment) {
        textPart = "Em g\u1EEDi h\xECnh \u1EA3nh / t\u1EC7p b\xE0i t\u1EADp n\xE0y, Gia s\u01B0 AI h\xE3y quan s\xE1t, \u0111\u1ECDc k\u0129 \u0111\u1EC1 b\xE0i v\xE0 h\u01B0\u1EDBng d\u1EABn gi\u1EA3i chi ti\u1EBFt gi\xFAp em nh\xE9!";
      }
      if (textPart) {
        parts.push({ text: textPart });
      }
      return {
        role: msg.role,
        parts
      };
    })
  );
  const candidateModels = [
    "gemini-3.5-flash-lite",
    defaultModel,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);
  let lastError = null;
  for (const model of candidateModels) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction
        }
      });
      return stream;
    } catch (err) {
      lastError = err;
      const errMsg = err?.message || String(err);
      if (errMsg.includes("not found") || errMsg.includes("404") || errMsg.includes("unsupported") || errMsg.includes("is not found")) {
        console.warn(`[AI Tutor] Model ${model} unavailable, trying next candidate...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// src/services/ai/aiAnalytics.ts
init_aiClient();
import { Type as Type2 } from "@google/genai";
async function analyzeExamPerformance(analyticsInput) {
  const ai = getAiClient();
  const systemInstruction = `
B\u1EA1n l\xE0 "Chuy\xEAn gia Ph\xE2n t\xEDch N\u0103ng l\u1EF1c H\u1ECDc t\u1EADp AI" c\u1EE7a h\u1EC7 th\u1ED1ng DkTEST.

VAI TR\xD2:
B\u1EA1n c\xF3 nhi\u1EC7m v\u1EE5 ph\xE2n t\xEDch d\u1EEF li\u1EC7u k\u1EBFt qu\u1EA3 ki\u1EC3m tra c\u1EE7a h\u1ECDc sinh d\u1EF1a ho\xE0n to\xE0n tr\xEAn d\u1EEF li\u1EC7u th\u1ED1ng k\xEA \u0111\u01B0\u1EE3c h\u1EC7 th\u1ED1ng cung c\u1EA5p.
B\u1EA1n ph\u1EA3i \u0111\u01B0a ra nh\u1EADn x\xE9t kh\xE1ch quan, d\u1EC5 hi\u1EC3u, c\xF3 t\xEDnh s\u01B0 ph\u1EA1m v\xE0 gi\xFAp h\u1ECDc sinh bi\u1EBFt ch\xEDnh x\xE1c m\xECnh \u0111ang m\u1EA1nh \u1EDF \u0111\xE2u, y\u1EBFu \u1EDF \u0111\xE2u v\xE0 n\xEAn c\u1EA3i thi\u1EC7n nh\u01B0 th\u1EBF n\xE0o.

M\u1EE4C TI\xCAU:
1. Ph\xE2n t\xEDch m\u1EE9c \u0111\u1ED9 k\u1EBFt qu\u1EA3 h\u1ECDc t\u1EADp.
2. X\xE1c \u0111\u1ECBnh \u0111i\u1EC3m m\u1EA1nh v\xE0 \u0111i\u1EC3m y\u1EBFu.
3. Ph\xE2n t\xEDch s\u1EF1 thay \u0111\u1ED5i qua c\xE1c l\u1EA7n thi.
4. X\xE1c \u0111\u1ECBnh ch\u1EE7 \u0111\u1EC1 ho\u1EB7c d\u1EA1ng c\xE2u h\u1ECFi c\u1EA7n \u01B0u ti\xEAn c\u1EA3i thi\u1EC7n.
5. \u0110\u01B0a ra l\u1ED9 tr\xECnh h\u1ECDc t\u1EADp th\u1EF1c t\u1EBF, ph\xF9 h\u1EE3p v\u1EDBi d\u1EEF li\u1EC7u.
6. Ch\u1EC9 s\u1EED d\u1EE5ng th\xF4ng tin c\xF3 trong d\u1EEF li\u1EC7u \u0111\u1EA7u v\xE0o.

==================================================
I. NGUY\xCAN T\u1EAEC PH\xC2N T\xCDCH B\u1EAET BU\u1ED8C
==================================================

1. TRUNG TH\u1EF0C TUY\u1EC6T \u0110\u1ED0I V\u1EDAI D\u1EEE LI\u1EC6U
- Ch\u1EC9 s\u1EED d\u1EE5ng c\xE1c s\u1ED1 li\u1EC7u, k\u1EBFt qu\u1EA3, ch\u1EE7 \u0111\u1EC1 v\xE0 th\xF4ng tin th\u1EF1c s\u1EF1 \u0111\u01B0\u1EE3c cung c\u1EA5p.
- Kh\xF4ng t\u1EF1 t\u1EA1o \u0111i\u1EC3m s\u1ED1, ph\u1EA7n tr\u0103m, th\u1EE9 h\u1EA1ng, xu h\u01B0\u1EDBng ho\u1EB7c th\xE0nh t\xEDch kh\xF4ng c\xF3 trong d\u1EEF li\u1EC7u.
- Kh\xF4ng \u0111\u01B0\u1EE3c gi\u1EA3 \u0111\u1ECBnh h\u1ECDc sinh \u0111\xE3 h\u1ECDc ho\u1EB7c ch\u01B0a h\u1ECDc m\u1ED9t ki\u1EBFn th\u1EE9c n\u1EBFu d\u1EEF li\u1EC7u kh\xF4ng th\u1EC3 hi\u1EC7n \u0111i\u1EC1u \u0111\xF3.
- Kh\xF4ng \u0111\u01B0\u1EE3c bi\u1EBFn m\u1ED9t kh\u1EA3 n\u0103ng th\xE0nh k\u1EBFt lu\u1EADn ch\u1EAFc ch\u1EAFn.
- Khi d\u1EEF li\u1EC7u kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 k\u1EBFt lu\u1EADn, ph\u1EA3i n\xF3i r\xF5:
  "Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u \u0111\u1EC3 \u0111\xE1nh gi\xE1 ch\xEDnh x\xE1c."
- Kh\xF4ng \u0111\u01B0\u1EE3c d\xF9ng c\xE1c c\u1EE5m t\u1EEB mang t\xEDnh kh\u1EB3ng \u0111\u1ECBnh tuy\u1EC7t \u0111\u1ED1i nh\u01B0:
  "ch\u1EAFc ch\u1EAFn", "ho\xE0n to\xE0n", "lu\xF4n lu\xF4n", "kh\xF4ng bao gi\u1EDD"
  n\u1EBFu d\u1EEF li\u1EC7u kh\xF4ng ch\u1EE9ng minh \u0111\u01B0\u1EE3c.

2. PH\xC2N BI\u1EC6T S\u1ED0 LI\u1EC6U V\xC0 NH\u1EACN \u0110\u1ECANH
- S\u1ED1 li\u1EC7u l\xE0 d\u1EEF li\u1EC7u g\u1ED1c do h\u1EC7 th\u1ED1ng cung c\u1EA5p.
- Nh\u1EADn \u0111\u1ECBnh ph\u1EA3i \u0111\u01B0\u1EE3c suy ra h\u1EE3p l\xFD t\u1EEB s\u1ED1 li\u1EC7u.
- M\u1ED7i nh\u1EADn \u0111\u1ECBnh quan tr\u1ECDng ph\u1EA3i c\xF3 c\u01A1 s\u1EDF t\u1EEB d\u1EEF li\u1EC7u.
- Kh\xF4ng \u0111\u01B0\u1EE3c suy di\u1EC5n qu\xE1 xa kh\u1ECFi d\u1EEF li\u1EC7u.

3. KH\xD4NG B\u1ECAA TH\xCAM D\u1EEE LI\u1EC6U
Kh\xF4ng \u0111\u01B0\u1EE3c t\u1EF1 sinh:
- \u0111i\u1EC3m s\u1ED1;
- ph\u1EA7n tr\u0103m;
- s\u1ED1 c\xE2u \u0111\xFAng/sai;
- s\u1ED1 l\u1EA7n thi;
- th\u1EE9 h\u1EA1ng;
- th\u1EDDi gian l\xE0m b\xE0i;
- ch\u1EE7 \u0111\u1EC1 ch\u01B0a xu\u1EA5t hi\u1EC7n;
- m\u1EE9c \u0111\u1ED9 th\xE0nh th\u1EA1o ch\u01B0a \u0111\u01B0\u1EE3c th\u1ED1ng k\xEA.

==================================================
II. PH\xC2N T\xCDCH K\u1EBET QU\u1EA2
==================================================

1. PH\xC2N T\xCDCH T\u1ED4NG QUAN
\u0110\xE1nh gi\xE1:
- k\u1EBFt qu\u1EA3 chung;
- m\u1EE9c \u0111\u1ED9 \u1ED5n \u0111\u1ECBnh;
- xu h\u01B0\u1EDBng ti\u1EBFn b\u1ED9 ho\u1EB7c gi\u1EA3m s\xFAt;
- nh\u1EEFng \u0111i\u1EC3m \u0111\xE1ng ch\xFA \xFD nh\u1EA5t.

N\u1EBFu c\xF3 nhi\u1EC1u l\u1EA7n thi:
- So s\xE1nh c\xE1c l\u1EA7n thi theo th\u1EE9 t\u1EF1 th\u1EDDi gian.
- X\xE1c \u0111\u1ECBnh xu h\u01B0\u1EDBng:
  + c\u1EA3i thi\u1EC7n;
  + gi\u1EA3m s\xFAt;
  + \u1ED5n \u0111\u1ECBnh;
  + bi\u1EBFn \u0111\u1ED9ng;
  + ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u \u0111\u1EC3 x\xE1c \u0111\u1ECBnh.
- Kh\xF4ng g\u1ECDi l\xE0 "ti\u1EBFn b\u1ED9" ch\u1EC9 v\xEC m\u1ED9t l\u1EA7n thi c\xF3 \u0111i\u1EC3m cao h\u01A1n n\u1EBFu d\u1EEF li\u1EC7u cho th\u1EA5y k\u1EBFt qu\u1EA3 dao \u0111\u1ED9ng m\u1EA1nh.

2. PH\xC2N T\xCDCH THEO D\u1EA0NG C\xC2U H\u1ECEI
Ph\xE2n t\xEDch ri\xEAng n\u1EBFu d\u1EEF li\u1EC7u c\xF3 c\xE1c d\u1EA1ng:
- Tr\u1EAFc nghi\u1EC7m;
- \u0110\xFAng/Sai;
- Tr\u1EA3 l\u1EDDi ng\u1EAFn;
- C\xE1c d\u1EA1ng kh\xE1c.

V\u1EDBi m\u1ED7i d\u1EA1ng, x\xE1c \u0111\u1ECBnh:
- m\u1EE9c \u0111\u1ED9 k\u1EBFt qu\u1EA3;
- \u0111i\u1EC3m m\u1EA1nh;
- \u0111i\u1EC3m y\u1EBFu;
- xu h\u01B0\u1EDBng thay \u0111\u1ED5i;
- \u01B0u ti\xEAn c\u1EA3i thi\u1EC7n.

Kh\xF4ng \u0111\u01B0\u1EE3c \u0111\xE1nh gi\xE1 m\u1ED9t d\u1EA1ng c\xE2u h\u1ECFi n\u1EBFu d\u1EEF li\u1EC7u kh\xF4ng c\xF3 th\u1ED1ng k\xEA cho d\u1EA1ng \u0111\xF3.

3. PH\xC2N T\xCDCH THEO CH\u1EE6 \u0110\u1EC0 / KI\u1EBEN TH\u1EE8C
Khi c\xF3 d\u1EEF li\u1EC7u ch\u1EE7 \u0111\u1EC1:
- X\xE1c \u0111\u1ECBnh ch\u1EE7 \u0111\u1EC1 c\xF3 k\u1EBFt qu\u1EA3 t\u1ED1t.
- X\xE1c \u0111\u1ECBnh ch\u1EE7 \u0111\u1EC1 c\xF3 k\u1EBFt qu\u1EA3 th\u1EA5p.
- Ph\xE1t hi\u1EC7n ch\u1EE7 \u0111\u1EC1 c\xF3 d\u1EA5u hi\u1EC7u ti\u1EBFn b\u1ED9.
- Ph\xE1t hi\u1EC7n ch\u1EE7 \u0111\u1EC1 c\xF3 d\u1EA5u hi\u1EC7u suy gi\u1EA3m.
- X\xE1c \u0111\u1ECBnh ch\u1EE7 \u0111\u1EC1 n\xEAn \u01B0u ti\xEAn \xF4n t\u1EADp.

Kh\xF4ng \u0111\u01B0\u1EE3c t\u1EF1 th\xEAm ki\u1EBFn th\u1EE9c ho\u1EB7c ch\u1EE7 \u0111\u1EC1 ngo\xE0i d\u1EEF li\u1EC7u.

4. PH\xC2N T\xCDCH T\xCDNH \u1ED4N \u0110\u1ECANH
N\u1EBFu c\xF3 nhi\u1EC1u l\u1EA7n thi:
- Ki\u1EC3m tra k\u1EBFt qu\u1EA3 c\xF3 \u1ED5n \u0111\u1ECBnh hay kh\xF4ng.
- N\u1EBFu k\u1EBFt qu\u1EA3 dao \u0111\u1ED9ng l\u1EDBn, ph\u1EA3i m\xF4 t\u1EA3 l\xE0 "ch\u01B0a \u1ED5n \u0111\u1ECBnh" thay v\xEC k\u1EBFt lu\u1EADn h\u1ECDc sinh y\u1EBFu.
- N\u1EBFu d\u1EEF li\u1EC7u qu\xE1 \xEDt, ph\u1EA3i n\xEAu r\xF5 r\u1EB1ng ch\u01B0a \u0111\u1EE7 c\u01A1 s\u1EDF \u0111\u1EC3 \u0111\xE1nh gi\xE1 xu h\u01B0\u1EDBng d\xE0i h\u1EA1n.

==================================================
III. X\xC1C \u0110\u1ECANH \u0110I\u1EC2M M\u1EA0NH / \u0110I\u1EC2M Y\u1EBEU
==================================================

\u0110I\u1EC2M M\u1EA0NH:
Ch\u1EC9 x\xE1c \u0111\u1ECBnh khi d\u1EEF li\u1EC7u cho th\u1EA5y k\u1EBFt qu\u1EA3 t\u1ED1t ho\u1EB7c c\xF3 xu h\u01B0\u1EDBng c\u1EA3i thi\u1EC7n r\xF5 r\xE0ng.

\u0110I\u1EC2M Y\u1EBEU:
Ch\u1EC9 x\xE1c \u0111\u1ECBnh khi d\u1EEF li\u1EC7u cho th\u1EA5y k\u1EBFt qu\u1EA3 th\u1EA5p, thi\u1EBFu \u1ED5n \u0111\u1ECBnh ho\u1EB7c c\xF3 xu h\u01B0\u1EDBng gi\u1EA3m.

M\u1ED7i \u0111i\u1EC3m m\u1EA1nh / \u0111i\u1EC3m y\u1EBFu ph\u1EA3i:
- c\u1EE5 th\u1EC3;
- li\xEAn quan tr\u1EF1c ti\u1EBFp \u0111\u1EBFn s\u1ED1 li\u1EC7u;
- tr\xE1nh nh\u1EADn x\xE9t chung chung;
- \u01B0u ti\xEAn n\xEAu r\xF5 d\u1EA1ng c\xE2u h\u1ECFi ho\u1EB7c ch\u1EE7 \u0111\u1EC1.

Kh\xF4ng vi\u1EBFt:
"H\u1ECDc sinh c\u1EA7n c\u1ED1 g\u1EAFng h\u01A1n."

N\xEAn vi\u1EBFt theo h\u01B0\u1EDBng:
"Nh\xF3m c\xE2u h\u1ECFi X \u0111ang c\xF3 k\u1EBFt qu\u1EA3 th\u1EA5p h\u01A1n c\xE1c nh\xF3m c\xF2n l\u1EA1i, v\xEC v\u1EADy n\xEAn \u01B0u ti\xEAn c\u1EE7ng c\u1ED1 ph\u1EA7n ki\u1EBFn th\u1EE9c n\xE0y."

==================================================
IV. \u0110\u1EC0 XU\u1EA4T C\u1EA2I THI\u1EC6N
==================================================

M\u1ECDi l\u1EDDi khuy\xEAn ph\u1EA3i:
- th\u1EF1c t\u1EBF;
- c\xF3 th\u1EC3 th\u1EF1c hi\u1EC7n;
- li\xEAn quan tr\u1EF1c ti\u1EBFp \u0111\u1EBFn \u0111i\u1EC3m y\u1EBFu \u0111\u01B0\u1EE3c ph\xE1t hi\u1EC7n;
- \u01B0u ti\xEAn v\u1EA5n \u0111\u1EC1 quan tr\u1ECDng nh\u1EA5t tr\u01B0\u1EDBc.

L\u1ED9 tr\xECnh n\xEAn c\xF3 th\u1EE9 t\u1EF1 \u01B0u ti\xEAn:

\u01AFu ti\xEAn 1:
N\u1ED9i dung c\xF3 k\u1EBFt qu\u1EA3 th\u1EA5p ho\u1EB7c \u1EA3nh h\u01B0\u1EDFng l\u1EDBn \u0111\u1EBFn k\u1EBFt qu\u1EA3.

\u01AFu ti\xEAn 2:
N\u1ED9i dung c\xF3 k\u1EBFt qu\u1EA3 ch\u01B0a \u1ED5n \u0111\u1ECBnh.

\u01AFu ti\xEAn 3:
N\u1ED9i dung \u0111\xE3 kh\xE1 t\u1ED1t nh\u01B0ng v\u1EABn c\xF3 th\u1EC3 n\xE2ng cao.

Kh\xF4ng \u0111\u01B0a ra l\u1ECBch h\u1ECDc c\u1EE5 th\u1EC3 theo ng\xE0y/tu\u1EA7n n\u1EBFu d\u1EEF li\u1EC7u kh\xF4ng cung c\u1EA5p th\u1EDDi gian h\u1ECDc ho\u1EB7c y\xEAu c\u1EA7u \u0111\xF3.

Kh\xF4ng \u0111\u01B0a l\u1EDDi khuy\xEAn v\u01B0\u1EE3t qu\xE1 d\u1EEF li\u1EC7u.

==================================================
V. NG\xD4N NG\u1EEE V\xC0 PHONG C\xC1CH
==================================================

- Vi\u1EBFt b\u1EB1ng ti\u1EBFng Vi\u1EC7t chu\u1EA9n.
- Gi\u1ECDng \u0111i\u1EC7u t\xEDch c\u1EF1c, kh\xE1ch quan, mang t\xEDnh gi\xE1o d\u1EE5c.
- Kh\xF4ng ph\xE1n x\xE9t, kh\xF4ng g\xE2y \xE1p l\u1EF1c.
- Kh\xF4ng d\xF9ng ng\xF4n ng\u1EEF ti\xEAu c\u1EF1c ho\u1EB7c l\xE0m h\u1ECDc sinh m\u1EA5t \u0111\u1ED9ng l\u1EF1c.
- \u01AFu ti\xEAn c\xE2u ng\u1EAFn, r\xF5 r\xE0ng, d\u1EC5 hi\u1EC3u.
- Kh\xF4ng s\u1EED d\u1EE5ng thu\u1EADt ng\u1EEF qu\xE1 chuy\xEAn m\xF4n n\u1EBFu kh\xF4ng c\u1EA7n thi\u1EBFt.
- Kh\xF4ng t\xE2ng b\u1ED1c qu\xE1 m\u1EE9c.
- Kh\xF4ng k\u1EBFt lu\u1EADn v\u1EC1 n\u0103ng l\u1EF1c t\u1ED5ng th\u1EC3 c\u1EE7a h\u1ECDc sinh ch\u1EC9 t\u1EEB m\u1ED9t b\xE0i ki\u1EC3m tra.

==================================================
VI. QUY T\u1EAEC X\u1EEC L\xDD D\u1EEE LI\u1EC6U THI\u1EBEU
==================================================

N\u1EBFu ch\u1EC9 c\xF3 1 l\u1EA7n thi:
- Ch\u1EC9 ph\xE2n t\xEDch k\u1EBFt qu\u1EA3 hi\u1EC7n t\u1EA1i.
- Kh\xF4ng \u0111\u01B0\u1EE3c kh\u1EB3ng \u0111\u1ECBnh xu h\u01B0\u1EDBng ti\u1EBFn b\u1ED9 ho\u1EB7c gi\u1EA3m s\xFAt theo th\u1EDDi gian.

N\u1EBFu c\xF3 \xEDt h\u01A1n 2 l\u1EA7n thi:
- Kh\xF4ng \u0111\u01B0\u1EE3c k\u1EBFt lu\u1EADn v\u1EC1 xu h\u01B0\u1EDBng d\xE0i h\u1EA1n.

N\u1EBFu kh\xF4ng c\xF3 d\u1EEF li\u1EC7u c\u1EE7a m\u1ED9t d\u1EA1ng c\xE2u h\u1ECFi:
- Kh\xF4ng ph\xE2n t\xEDch d\u1EA1ng \u0111\xF3.

N\u1EBFu kh\xF4ng c\xF3 d\u1EEF li\u1EC7u theo ch\u1EE7 \u0111\u1EC1:
- Kh\xF4ng t\u1EF1 suy ra ch\u1EE7 \u0111\u1EC1 y\u1EBFu/m\u1EA1nh.

N\u1EBFu d\u1EEF li\u1EC7u m\xE2u thu\u1EABn:
- Kh\xF4ng t\u1EF1 s\u1EEDa d\u1EEF li\u1EC7u.
- N\xEAu r\xF5 d\u1EEF li\u1EC7u c\xF3 d\u1EA5u hi\u1EC7u kh\xF4ng nh\u1EA5t qu\xE1n.

N\u1EBFu kh\xF4ng th\u1EC3 k\u1EBFt lu\u1EADn:
- S\u1EED d\u1EE5ng gi\xE1 tr\u1ECB null ho\u1EB7c th\xF4ng b\xE1o ph\xF9 h\u1EE3p theo schema.
- Tuy\u1EC7t \u0111\u1ED1i kh\xF4ng b\u1ECBa d\u1EEF li\u1EC7u \u0111\u1EC3 l\u1EA5p ch\u1ED7 tr\u1ED1ng.

==================================================
VII. \u01AFU TI\xCAN PH\xC2N T\xCDCH
==================================================

Khi d\u1EEF li\u1EC7u l\u1EDBn, \u01B0u ti\xEAn theo th\u1EE9 t\u1EF1:

1. K\u1EBFt qu\u1EA3 t\u1ED5ng th\u1EC3.
2. Xu h\u01B0\u1EDBng qua c\xE1c l\u1EA7n thi.
3. D\u1EA1ng c\xE2u h\u1ECFi y\u1EBFu nh\u1EA5t.
4. Ch\u1EE7 \u0111\u1EC1 y\u1EBFu nh\u1EA5t.
5. Ch\u1EE7 \u0111\u1EC1 / d\u1EA1ng c\xE2u h\u1ECFi c\xF3 xu h\u01B0\u1EDBng gi\u1EA3m.
6. \u0110i\u1EC3m m\u1EA1nh n\u1ED5i b\u1EADt.
7. L\u1ED9 tr\xECnh c\u1EA3i thi\u1EC7n.

==================================================
VIII. QUY T\u1EAEC JSON
==================================================

- CH\u1EC8 tr\u1EA3 v\u1EC1 JSON h\u1EE3p l\u1EC7.
- KH\xD4NG c\xF3 Markdown.
- KH\xD4NG c\xF3 \`\`\`json.
- KH\xD4NG c\xF3 l\u1EDDi m\u1EDF \u0111\u1EA7u.
- KH\xD4NG c\xF3 l\u1EDDi k\u1EBFt.
- KH\xD4NG th\xEAm b\u1EA5t k\u1EF3 tr\u01B0\u1EDDng n\xE0o ngo\xE0i schema \u0111\u01B0\u1EE3c y\xEAu c\u1EA7u.
- T\xEAn field ph\u1EA3i kh\u1EDBp CH\xCDNH X\xC1C schema.
- \u0110\u1EA3m b\u1EA3o JSON c\xF3 th\u1EC3 parse tr\u1EF1c ti\u1EBFp b\u1EB1ng JSON.parse().
- Kh\xF4ng s\u1EED d\u1EE5ng comment trong JSON.
- Chu\u1ED7i ph\u1EA3i escape \u0111\xFAng chu\u1EA9n JSON.
- Kh\xF4ng d\xF9ng NaN, Infinity ho\u1EB7c undefined.
- Khi kh\xF4ng c\xF3 d\u1EEF li\u1EC7u cho m\u1ED9t tr\u01B0\u1EDDng v\xE0 schema cho ph\xE9p, s\u1EED d\u1EE5ng null ho\u1EB7c [] theo \u0111\xFAng schema.
- M\u1ECDi n\u1ED9i dung nh\u1EADn x\xE9t, \u0111\xE1nh gi\xE1 v\xE0 l\u1ED9 tr\xECnh ph\u1EA3i b\u1EB1ng ti\u1EBFng Vi\u1EC7t.

==================================================
IX. KI\u1EC2M TRA TR\u01AF\u1EDAC KHI TR\u1EA2 K\u1EBET QU\u1EA2
==================================================

Tr\u01B0\u1EDBc khi tr\u1EA3 JSON, t\u1EF1 ki\u1EC3m tra:

1. C\xF3 d\u1EEF li\u1EC7u n\xE0o b\u1ECB t\u1EF1 b\u1ECBa kh\xF4ng?
2. M\u1ECDi nh\u1EADn \u0111\u1ECBnh c\xF3 c\u0103n c\u1EE9 t\u1EEB d\u1EEF li\u1EC7u kh\xF4ng?
3. C\xF3 k\u1EBFt lu\u1EADn xu h\u01B0\u1EDBng khi ch\u01B0a \u0111\u1EE7 s\u1ED1 l\u1EA7n thi kh\xF4ng?
4. C\xF3 ph\xE2n t\xEDch m\u1ED9t d\u1EA1ng c\xE2u h\u1ECFi/ch\u1EE7 \u0111\u1EC1 kh\xF4ng t\u1ED3n t\u1EA1i trong d\u1EEF li\u1EC7u kh\xF4ng?
5. L\u1ED9 tr\xECnh c\xF3 li\xEAn quan \u0111\u1EBFn \u0111i\u1EC3m y\u1EBFu th\u1EF1c t\u1EBF kh\xF4ng?
6. JSON c\xF3 h\u1EE3p l\u1EC7 kh\xF4ng?
7. C\xF3 field n\xE0o ngo\xE0i schema kh\xF4ng?
8. C\xF3 Markdown ho\u1EB7c v\u0103n b\u1EA3n ngo\xE0i JSON kh\xF4ng?

N\u1EBFu ph\xE1t hi\u1EC7n m\u1ED9t n\u1ED9i dung kh\xF4ng c\xF3 \u0111\u1EE7 c\u0103n c\u1EE9, ph\u1EA3i lo\u1EA1i b\u1ECF ho\u1EB7c chuy\u1EC3n th\xE0nh nh\u1EADn \u0111\u1ECBnh c\xF3 \u0111i\u1EC1u ki\u1EC7n.

B\u1EA1n ph\u1EA3i \u01B0u ti\xEAn t\xEDnh ch\xEDnh x\xE1c v\xE0 trung th\u1EF1c c\u1EE7a d\u1EEF li\u1EC7u cao h\u01A1n vi\u1EC7c t\u1EA1o ra m\u1ED9t nh\u1EADn x\xE9t d\xE0i ho\u1EB7c \u1EA5n t\u01B0\u1EE3ng.
`;
  const schema2 = {
    type: Type2.OBJECT,
    properties: {
      summary: { type: Type2.STRING },
      strengths: { type: Type2.ARRAY, items: { type: Type2.STRING } },
      weaknesses: { type: Type2.ARRAY, items: { type: Type2.STRING } },
      trends: {
        type: Type2.ARRAY,
        items: {
          type: Type2.OBJECT,
          properties: {
            label: { type: Type2.STRING },
            direction: { type: Type2.STRING, description: "up, down, or stable" },
            explanation: { type: Type2.STRING }
          },
          required: ["label", "direction", "explanation"]
        }
      },
      questionTypeAnalysis: {
        type: Type2.ARRAY,
        items: {
          type: Type2.OBJECT,
          properties: {
            type: { type: Type2.STRING },
            accuracy: { type: Type2.NUMBER },
            interpretation: { type: Type2.STRING }
          },
          required: ["type", "accuracy", "interpretation"]
        }
      },
      sectionAnalysis: {
        type: Type2.ARRAY,
        items: {
          type: Type2.OBJECT,
          properties: {
            sectionId: { type: Type2.STRING },
            title: { type: Type2.STRING },
            accuracy: { type: Type2.NUMBER },
            advice: { type: Type2.STRING }
          },
          required: ["title", "accuracy", "advice"]
        }
      },
      recommendations: {
        type: Type2.ARRAY,
        items: {
          type: Type2.OBJECT,
          properties: {
            priority: { type: Type2.STRING, description: "high, medium, or low" },
            topic: { type: Type2.STRING },
            advice: { type: Type2.STRING }
          },
          required: ["priority", "topic", "advice"]
        }
      },
      studyPlan: {
        type: Type2.ARRAY,
        items: {
          type: Type2.OBJECT,
          properties: {
            step: { type: Type2.INTEGER },
            action: { type: Type2.STRING }
          },
          required: ["step", "action"]
        }
      }
    },
    required: ["summary", "strengths", "weaknesses", "trends", "questionTypeAnalysis", "sectionAnalysis", "recommendations", "studyPlan"]
  };
  const response = await ai.models.generateContent({
    model: defaultModel,
    contents: `Analyze the following performance data:

${JSON.stringify(analyticsInput, null, 2)}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schema2
    }
  });
  const jsonStr = response.text || "{}";
  const rawData = JSON.parse(jsonStr);
  const validatedData = aiAnalyticsSchema.parse(rawData);
  return validatedData;
}
async function analyzeStructuredExamPerformance(payload) {
  const ai = getAiClient();
  const systemInstruction = `
B\u1EA1n l\xE0 "Chuy\xEAn gia Kh\u1EA3o th\xED v\xE0 C\u1ED1 v\u1EA5n H\u1ECDc t\u1EADp AI Cao c\u1EA5p" c\u1EE7a h\u1EC7 th\u1ED1ng gi\xE1o d\u1EE5c DkTEST.

NHI\u1EC6M V\u1EE4:
Ph\xE2n t\xEDch chuy\xEAn s\xE2u b\xE0i l\xE0m c\u1EE7a h\u1ECDc sinh theo c\u1EA5u tr\xFAc khoa h\u1ECDc v\xE0 s\u01B0 ph\u1EA1m d\u1EF1a TR\xCAN D\u1EEE LI\u1EC6U \u0110\xC3 \u0110\u01AF\u1EE2C T\xCDNH TO\xC1N S\u1EB4N V\xC0 DANH S\xC1CH CHI TI\u1EBET C\xC2U H\u1ECEI TRONG PAYLOAD.

NGUY\xCAN T\u1EAEC B\u1EAET BU\u1ED8C:
1. KH\xD4NG \u0110\u01AF\u1EE2C T\u1EF0 B\u1ECAA HO\u1EB6C T\xCDNH L\u1EA0I S\u1ED0 LI\u1EC6U:
   - C\xE1c s\u1ED1 li\u1EC7u nh\u01B0: \u0110i\u1EC3m s\u1ED1, S\u1ED1 c\xE2u \u0111\xFAng/sai/b\u1ECF tr\u1ED1ng, T\u1EF7 l\u1EC7 %, T\u1ED5ng th\u1EDDi gian, Th\u1EDDi gian trung b\xECnh, Th\u1EDDi gian t\u1EEBng c\xE2u, T\u1EF7 l\u1EC7 c\xE1c giai \u0111o\u1EA1n (\u0110\u1EA7u / Gi\u1EEFa / Cu\u1ED1i) \u0111\xE3 \u0111\u01B0\u1EE3c h\u1EC7 th\u1ED1ng t\xEDnh to\xE1n CH\xCDNH X\xC1C trong payload.
   - B\u1EA1n h\xE3y \u0111\u1ECDc k\u1EF9 danh s\xE1ch "incorrectQuestionsDetail", "allQuestionsOverview", "questionTypeBreakdown", v\xE0 "sections" \u0111\u1EC3 hi\u1EC3u ch\xEDnh x\xE1c h\u1ECDc sinh \u0111ang l\xE0m b\xE0i thi m\xF4n g\xEC, nh\u1EEFng d\u1EA1ng b\xE0i n\xE0o b\u1ECB sai nhi\u1EC1u nh\u1EA5t v\xE0 l\xFD do b\u1EA3n ch\u1EA5t l\xE0 g\xEC.
2. N\u1ED8I DUNG C\xC1C M\u1EE4C C\u1EA6N PH\xC2N T\xCDCH THEO SCHEMA:
   - M\u1EE5c 1: "summary" - T\u1ED5ng quan s\xFAc t\xEDch (2-3 c\xE2u) v\u1EC1 k\u1EBFt qu\u1EA3, s\u1EF1 ph\xE2n b\u1ED1 \u0111i\u1EC3m s\u1ED1 v\xE0 phong \u0111\u1ED9 l\xE0m b\xE0i.
   - M\u1EE5c 2: "sectionPerformance" - Nh\u1EADn x\xE9t cho t\u1EEBng ph\u1EA7n/ch\u1EE7 \u0111\u1EC1 thi (\u0111i\u1EC3m m\u1EA1nh, l\u1ED7i th\u01B0\u1EDDng g\u1EB7p, t\xEDnh \u1ED5n \u0111\u1ECBnh).
   - M\u1EE5c 3: "priorities" - \u0110\xDANG 3 VI\u1EC6C \u01AFU TI\xCAN L\u1EDAN NH\u1EA4T C\u1EA6N S\u1EECA. M\u1ED7i vi\u1EC7c ph\u1EA3i c\xF3:
     + title: Ti\xEAu \u0111\u1EC1 d\u1EA1ng b\xE0i / ch\u1EE7 \u0111\u1EC1 ki\u1EBFn th\u1EE9c c\u1EE5 th\u1EC3.
     + reason: L\xFD do t\u1EA1i sao \u01B0u ti\xEAn vi\u1EC7c n\xE0y (d\u1EABn ch\u1EE9ng t\u1EEB t\u1EC9 l\u1EC7 sai ho\u1EB7c d\u1EA1ng c\xE2u h\u1ECFi trong payload).
     + evidence: D\u1EABn ch\u1EE9ng c\u1EE5 th\u1EC3 s\u1ED1 c\xE2u h\u1ECFi (v\xED d\u1EE5: "C\xE2u 5, C\xE2u 12, C\xE2u 18").
     + action: Ph\u01B0\u01A1ng ph\xE1p kh\u1EAFc ph\u1EE5c c\u1EE5 th\u1EC3, thi\u1EBFt th\u1EF1c (v\xED d\u1EE5: "\xD4n l\u1EA1i \u0111\u1ECBnh l\xFD v\u1EC1..., l\xE0m 10 b\xE0i t\u1EADp d\u1EA1ng t\u01B0\u01A1ng t\u1EF1").
   - M\u1EE5c 4: "mistakePatterns" - T\xECm 2-3 ki\u1EC3u sai l\u1EB7p l\u1EA1i (v\xED d\u1EE5: Sai ki\u1EBFn th\u1EE9c n\u1EC1n t\u1EA3ng, \u0110\u1ECDc l\u01B0\u1EDBt b\u1ECF s\xF3t t\u1EEB kh\xF3a quan tr\u1ECDng, Nh\u1EA7m l\u1EABn c\xE1c m\u1EC7nh \u0111\u1EC1 \u0111\xFAng/sai, v.v.).
   - M\u1EE5c 5: "progressAnalysis" - So s\xE1nh di\u1EC5n bi\u1EBFn 3 giai \u0111o\u1EA1n: \u0110\u1EA7u b\xE0i, Gi\u1EEFa b\xE0i, Cu\u1ED1i b\xE0i (v\u1EC1 \u0111\u1ED9 ch\xEDnh x\xE1c, t\u1ED1c \u0111\u1ED9 v\xE0 s\u1EE9c b\u1EC1n t\xE2m l\xFD).
   - M\u1EE5c 6: "timeAnalysis" - Ph\xE2n t\xEDch th\u1EDDi gian: t\u1ED1c \u0111\u1ED9 t\u1ED5ng th\u1EC3, c\xE1c c\xE2u m\u1EA5t nhi\u1EC1u th\u1EDDi gian nh\u01B0ng v\u1EABn sai (stuck), c\xE1c c\xE2u l\xE0m qu\xE1 v\u1ED9i v\xE0ng (rushing), chi\u1EBFn thu\u1EADt ph\xE2n b\u1ED5 th\u1EDDi gian.
   - M\u1EE5c 7: "notableQuestions" - 2 \u0111\u1EBFn 5 c\xE2u h\u1ECFi \u0111\xE1ng ch\xFA \xFD nh\u1EA5t (l\xE0m l\xE2u nh\u01B0ng sai, ho\u1EB7c l\xE0m nhanh nh\u01B0ng sai, ho\u1EB7c l\xE0m t\u1ED1t c\xE2u kh\xF3).
   - M\u1EE5c 8: "followUpQuestions" - 3 c\xE2u h\u1ECFi g\u1EE3i \xFD th\xF4ng minh h\u1ECDc sinh c\xF3 th\u1EC3 ti\u1EBFp t\u1EE5c h\u1ECFi Gia s\u01B0 AI.
   - M\u1EE5c 9: "disclaimer" - "G\u1EE3i \xFD mang t\xEDnh tham kh\u1EA3o s\u01B0 ph\u1EA1m d\u1EF1a tr\xEAn k\u1EBFt qu\u1EA3 b\xE0i l\xE0m th\u1EF1c t\u1EBF c\u1EE7a b\u1EA1n."
3. NG\xD4N T\u1EEA: Ti\u1EBFng Vi\u1EC7t s\u01B0 ph\u1EA1m chu\u1EA9n m\u1EF1c, \u1EA5m \xE1p, gi\xE0u \u0111\u1ED9ng l\u1EF1c, ch\u1EC9 d\u1EABn r\xF5 r\xE0ng.
4. CH\u1EC8 TR\u1EA2 V\u1EC0 JSON H\u1EE2P L\u1EC6 THEO SCHEMA. Tuy\u1EC7t \u0111\u1ED1i kh\xF4ng c\xF3 markdown block hay v\u0103n b\u1EA3n th\u1EEBa b\xEAn ngo\xE0i.
`;
  const structuredSchema = {
    type: Type2.OBJECT,
    properties: {
      summary: { type: Type2.STRING },
      sectionPerformance: {
        type: Type2.ARRAY,
        items: {
          type: Type2.OBJECT,
          properties: {
            sectionId: { type: Type2.STRING },
            title: { type: Type2.STRING },
            accuracy: { type: Type2.NUMBER },
            strength: { type: Type2.STRING },
            weakness: { type: Type2.STRING },
            stability: { type: Type2.STRING }
          },
          required: ["title", "accuracy"]
        }
      },
      priorities: {
        type: Type2.ARRAY,
        items: {
          type: Type2.OBJECT,
          properties: {
            title: { type: Type2.STRING },
            reason: { type: Type2.STRING },
            evidence: { type: Type2.STRING },
            action: { type: Type2.STRING }
          },
          required: ["title", "reason", "evidence", "action"]
        }
      },
      mistakePatterns: {
        type: Type2.ARRAY,
        items: {
          type: Type2.OBJECT,
          properties: {
            pattern: { type: Type2.STRING },
            description: { type: Type2.STRING },
            affectedQuestions: { type: Type2.ARRAY, items: { type: Type2.STRING } },
            suggestion: { type: Type2.STRING }
          },
          required: ["pattern", "description", "affectedQuestions", "suggestion"]
        }
      },
      progressAnalysis: {
        type: Type2.OBJECT,
        properties: {
          startPhase: { type: Type2.STRING },
          middlePhase: { type: Type2.STRING },
          endPhase: { type: Type2.STRING },
          pacingInsight: { type: Type2.STRING }
        },
        required: ["startPhase", "middlePhase", "endPhase", "pacingInsight"]
      },
      timeAnalysis: {
        type: Type2.OBJECT,
        properties: {
          overallPacing: { type: Type2.STRING },
          fastestInsight: { type: Type2.STRING },
          slowestInsight: { type: Type2.STRING },
          stuckAreas: { type: Type2.STRING },
          rushingAreas: { type: Type2.STRING },
          efficiencyAdvice: { type: Type2.STRING }
        },
        required: ["overallPacing", "efficiencyAdvice"]
      },
      notableQuestions: {
        type: Type2.ARRAY,
        items: {
          type: Type2.OBJECT,
          properties: {
            questionIndex: { type: Type2.INTEGER },
            questionId: { type: Type2.STRING },
            timeSpentSeconds: { type: Type2.NUMBER },
            status: { type: Type2.STRING },
            reason: { type: Type2.STRING },
            recommendation: { type: Type2.STRING }
          },
          required: ["questionIndex", "questionId", "timeSpentSeconds", "status", "reason", "recommendation"]
        }
      },
      followUpQuestions: {
        type: Type2.ARRAY,
        items: { type: Type2.STRING }
      },
      disclaimer: { type: Type2.STRING }
    },
    required: [
      "summary",
      "sectionPerformance",
      "priorities",
      "mistakePatterns",
      "progressAnalysis",
      "timeAnalysis",
      "notableQuestions",
      "followUpQuestions",
      "disclaimer"
    ]
  };
  try {
    const response = await ai.models.generateContent({
      model: defaultModel,
      contents: `D\u01B0\u1EDBi \u0111\xE2y l\xE0 payload d\u1EEF li\u1EC7u b\xE0i ki\u1EC3m tra c\u1EE7a h\u1ECDc sinh c\u1EA7n ph\xE2n t\xEDch:

${JSON.stringify(payload, null, 2)}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: structuredSchema
      }
    });
    const jsonStr = response.text || "{}";
    const rawData = JSON.parse(jsonStr);
    const validated = structuredAiAnalysisSchema.parse(rawData);
    return validated;
  } catch (err) {
    console.error("[aiAnalytics] Error in analyzeStructuredExamPerformance:", err);
    return {
      summary: `H\u1ECDc sinh \u0111\u1EA1t ${payload.result?.score ?? 0}/${payload.result?.maxScore ?? 10} \u0111i\u1EC3m v\u1EDBi ${payload.result?.correctCount ?? 0} c\xE2u \u0111\xFAng tr\xEAn t\u1ED5ng s\u1ED1 ${payload.result?.totalQuestions ?? payload.exam?.totalQuestions ?? 0} c\xE2u.`,
      sectionPerformance: (payload.sections || []).map((s) => ({
        title: s.title || "Ph\u1EA7n thi",
        accuracy: s.accuracy || 0,
        strength: s.accuracy >= 70 ? "Ho\xE0n th\xE0nh t\u1ED1t c\xE1c c\xE2u h\u1ECFi trong ph\u1EA7n n\xE0y." : void 0,
        weakness: s.accuracy < 70 ? "C\u1EA7n c\u1EE7ng c\u1ED1 th\xEAm c\xE1c d\u1EA1ng b\xE0i n\xE0y." : void 0,
        stability: "B\xECnh th\u01B0\u1EDDng"
      })),
      priorities: [
        {
          title: "\xD4n t\u1EADp l\u1EA1i c\xE1c c\xE2u h\u1ECFi tr\u1EA3 l\u1EDDi sai",
          reason: `C\xF3 ${payload.result?.incorrectCount ?? 0} c\xE2u tr\u1EA3 l\u1EDDi sai c\u1EA7n ki\u1EC3m tra l\u1EA1i l\xFD do.`,
          evidence: (payload.notableQuestionsSummary || []).map((q) => `C\xE2u ${q.questionIndex}`).join(", ") || "C\xE1c c\xE2u sai trong \u0111\u1EC1",
          action: "Xem l\u1EA1i chi ti\u1EBFt l\u1EDDi gi\u1EA3i trong b\u1EA3ng \u0111i\u1EC3m v\xE0 luy\u1EC7n t\u1EADp th\xEAm c\xE1c c\xE2u c\xF9ng d\u1EA1ng."
        },
        {
          title: "T\u1ED1i \u01B0u h\xF3a th\u1EDDi gian l\xE0m b\xE0i",
          reason: payload.timing?.averageSecondsPerQuestion ? `Th\u1EDDi gian trung b\xECnh l\xE0 ${payload.timing.averageSecondsPerQuestion}s/c\xE2u.` : "C\u1EA7n ph\xE2n b\u1ED1 th\u1EDDi gian \u0111\u1EC1u h\u01A1n gi\u1EEFa c\xE1c c\xE2u.",
          evidence: payload.timing?.slowestQuestion ? `C\xE2u ${payload.timing.slowestQuestion.index} (${payload.timing.slowestQuestion.seconds}s)` : "To\xE0n b\u1ED9 b\xE0i thi",
          action: "Tr\xE1nh d\u1EEBng l\u1EA1i qu\xE1 l\xE2u \u1EDF m\u1ED9t c\xE2u kh\xF3; \u0111\xE1nh d\u1EA5u v\xE0 quay l\u1EA1i sau khi \u0111\xE3 l\xE0m xong c\xE1c c\xE2u d\u1EC5."
        },
        {
          title: "Duy tr\xEC s\u1EF1 t\u1EADp trung \u1EDF giai \u0111o\u1EA1n cu\u1ED1i \u0111\u1EC1",
          reason: "T\u1EF7 l\u1EC7 ch\xEDnh x\xE1c th\u01B0\u1EDDng c\xF3 xu h\u01B0\u1EDBng bi\u1EBFn \u0111\u1ED9ng \u1EDF cu\u1ED1i th\u1EDDi gian l\xE0m b\xE0i.",
          evidence: `Giai \u0111o\u1EA1n cu\u1ED1i: ${payload.segments?.end?.accuracy ?? 0}% \u0111\xFAng`,
          action: "D\xE0nh ra \xEDt nh\u1EA5t 3-5 ph\xFAt cu\u1ED1i \u0111\u1EC3 r\xE0 so\xE1t l\u1EA1i to\xE0n b\u1ED9 phi\u1EBFu tr\u1EA3 l\u1EDDi."
        }
      ],
      mistakePatterns: [
        {
          pattern: "Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u \u0111\u1EC3 ph\xE2n lo\u1EA1i chuy\xEAn s\xE2u",
          description: "C\u1EA7n th\xEAm d\u1EEF li\u1EC7u t\u1EEB c\xE1c l\u1EA7n l\xE0m b\xE0i ti\u1EBFp theo \u0111\u1EC3 nh\u1EADn di\u1EC7n ch\xEDnh x\xE1c ki\u1EC3u l\u1ED7i t\u01B0 duy hay l\u1EB7p l\u1EA1i.",
          affectedQuestions: (payload.notableQuestionsSummary || []).filter((q) => q.status === "incorrect").map((q) => `C\xE2u ${q.questionIndex}`),
          suggestion: "T\u1EF1 r\xE0 so\xE1t l\u1EA1i c\xE1c c\xE2u sai theo l\u1EDDi gi\u1EA3i chi ti\u1EBFt \u0111\xE3 cung c\u1EA5p."
        }
      ],
      progressAnalysis: {
        startPhase: `\u0110\u1EA7u b\xE0i: ${payload.segments?.start?.accuracy ?? 0}% \u0111\xFAng, trung b\xECnh ${payload.segments?.start?.averageTimeSeconds ?? 0}s/c\xE2u.`,
        middlePhase: `Gi\u1EEFa b\xE0i: ${payload.segments?.middle?.accuracy ?? 0}% \u0111\xFAng, trung b\xECnh ${payload.segments?.middle?.averageTimeSeconds ?? 0}s/c\xE2u.`,
        endPhase: `Cu\u1ED1i b\xE0i: ${payload.segments?.end?.accuracy ?? 0}% \u0111\xFAng, trung b\xECnh ${payload.segments?.end?.averageTimeSeconds ?? 0}s/c\xE2u.`,
        pacingInsight: "T\u1ED1c \u0111\u1ED9 v\xE0 s\u1EF1 t\u1EADp trung c\u1EA7n \u0111\u01B0\u1EE3c ph\xE2n b\u1ED5 \u0111\u1EC1u qua c\u1EA3 3 giai \u0111o\u1EA1n c\u1EE7a \u0111\u1EC1 thi."
      },
      timeAnalysis: {
        overallPacing: `Th\u1EDDi gian trung b\xECnh ${payload.timing?.averageSecondsPerQuestion ?? 0} gi\xE2y m\u1ED7i c\xE2u.`,
        fastestInsight: payload.timing?.fastestQuestion ? `C\xE2u nhanh nh\u1EA5t: C\xE2u ${payload.timing.fastestQuestion.index} (${payload.timing.fastestQuestion.seconds}s).` : void 0,
        slowestInsight: payload.timing?.slowestQuestion ? `C\xE2u m\u1EA5t nhi\u1EC1u th\u1EDDi gian nh\u1EA5t: C\xE2u ${payload.timing.slowestQuestion.index} (${payload.timing.slowestQuestion.seconds}s).` : void 0,
        stuckAreas: payload.timing?.longestSlowStreak ? `\u0110o\u1EA1n m\u1EA5t nhi\u1EC1u th\u1EDDi gian: C\xE2u ${payload.timing.longestSlowStreak.startNumber} \u0111\u1EBFn C\xE2u ${payload.timing.longestSlowStreak.endNumber}.` : void 0,
        efficiencyAdvice: "N\xEAn gi\u1EEF t\u1ED1c \u0111\u1ED9 \u1ED5n \u0111\u1ECBnh, \u01B0u ti\xEAn l\xE0m ch\u1EAFc c\xE1c c\xE2u h\u1ECFi quen thu\u1ED9c tr\u01B0\u1EDBc."
      },
      notableQuestions: (payload.notableQuestionsSummary || []).slice(0, 4).map((q) => ({
        questionIndex: q.questionIndex,
        questionId: q.questionId,
        timeSpentSeconds: q.timeSpentSeconds || 0,
        status: q.status || "unanswered",
        reason: q.status === "incorrect" ? `M\u1EA5t ${q.timeSpentSeconds}s nh\u01B0ng ch\u01B0a ch\u1ECDn \u0111\xFAng ph\u01B0\u01A1ng \xE1n.` : `Ho\xE0n th\xE0nh trong ${q.timeSpentSeconds}s.`,
        recommendation: "Xem l\u1EA1i ph\u01B0\u01A1ng ph\xE1p gi\u1EA3i chi ti\u1EBFt."
      })),
      followUpQuestions: [
        "V\xEC sao em l\xE0m sai c\xE1c c\xE2u trong ph\u1EA7n n\xE0y?",
        "Em n\xEAn b\u1EAFt \u0111\u1EA7u \xF4n t\u1EADp t\u1EEB d\u1EA1ng b\xE0i n\xE0o tr\u01B0\u1EDBc?",
        "L\xE0m th\u1EBF n\xE0o \u0111\u1EC3 c\u1EA3i thi\u1EC7n t\u1ED1c \u0111\u1ED9 l\xE0m b\xE0i m\xE0 kh\xF4ng b\u1ECB nh\u1EA7m l\u1EABn?"
      ],
      disclaimer: "G\u1EE3i \xFD mang t\xEDnh tham kh\u1EA3o s\u01B0 ph\u1EA1m d\u1EF1a tr\xEAn d\u1EEF li\u1EC7u l\xE0m b\xE0i th\u1EF1c t\u1EBF c\u1EE7a b\u1EA1n."
    };
  }
}

// src/services/ai/aiLookup.ts
init_aiClient();
async function lookupAndTranslate(text, context, customApiKey) {
  const ai = getAiClient(customApiKey);
  const prompt = `B\u1EA1n l\xE0 m\u1ED9t tr\u1EE3 l\xFD ng\xF4n ng\u1EEF v\xE0 chuy\xEAn gia t\u1EEB \u0111i\u1EC3n h\u1ECDc th\xF4ng minh.
H\u1ECDc sinh \u0111ang \u0111\u1ECDc m\u1ED9t c\xE2u h\u1ECFi/b\xE0i t\u1EADp v\xE0 b\xF4i \u0111en \u0111o\u1EA1n v\u0103n b\u1EA3n sau:
"${text}"
${context ? `Ng\u1EEF c\u1EA3nh trong b\xE0i thi/c\xE2u h\u1ECFi: "${context}"` : ""}

Nhi\u1EC7m v\u1EE5 c\u1EE7a b\u1EA1n l\xE0 gi\u1EA3i ngh\u0129a, phi\xEAn \xE2m v\xE0 ph\xE2n t\xEDch chi ti\u1EBFt \u0111o\u1EA1n v\u0103n b\u1EA3n n\xE0y b\u1EB1ng ti\u1EBFng Vi\u1EC7t.
H\xC3Y TR\u1EA2 V\u1EC0 DUY NH\u1EA4T m\u1ED9t chu\u1ED7i JSON h\u1EE3p l\u1EC7 (kh\xF4ng k\xE8m Markdown code block \`\`\`json) theo \u0111\xFAng c\u1EA5u tr\xFAc sau:
{
  "pronunciation": "Phi\xEAn \xE2m qu\u1ED1c t\u1EBF IPA chu\u1EA9n x\xE1c (v\xED d\u1EE5: /\u02C8d\u026Ak\u0283\u0259nri/ ho\u1EB7c phi\xEAn \xE2m cho c\u1EA3 c\u1EE5m/c\xE2u n\u1EBFu c\xF3)",
  "translation": "B\u1EA3n d\u1ECBch ti\u1EBFng Vi\u1EC7t t\u1EF1 nhi\xEAn, chu\u1EA9n x\xE1c theo \u0111\xFAng ng\u1EEF c\u1EA3nh b\xE0i thi",
  "partOfSpeech": "T\u1EEB lo\u1EA1i (Danh t\u1EEB / \u0110\u1ED9ng t\u1EEB / T\xEDnh t\u1EEB / C\u1EE5m t\u1EEB / C\xE2u ho\xE0n ch\u1EC9nh)",
  "definition": "\u0110\u1ECBnh ngh\u0129a v\xE0 \xFD ngh\u0129a chi ti\u1EBFt",
  "grammarNotes": "Ghi ch\xFA ng\u1EEF ph\xE1p, c\u1EA5u tr\xFAc \u0111i k\xE8m, gi\u1EDBi t\u1EEB ho\u1EB7c l\u01B0u \xFD c\xE1ch d\xF9ng",
  "examples": [
    {
      "en": "V\xED d\u1EE5 c\xE2u ti\u1EBFng Anh",
      "vi": "D\u1ECBch ngh\u0129a ti\u1EBFng Vi\u1EC7t c\u1EE7a c\xE2u v\xED d\u1EE5"
    }
  ]
}`;
  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];
  let lastError = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      });
      const responseText = response.text || "";
      const cleaned = responseText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        text,
        pronunciation: parsed.pronunciation || "",
        translation: parsed.translation || "Ch\u01B0a c\xF3 b\u1EA3n d\u1ECBch",
        partOfSpeech: parsed.partOfSpeech || "T\u1EEB / C\u1EE5m t\u1EEB",
        definition: parsed.definition || "",
        grammarNotes: parsed.grammarNotes || "",
        examples: parsed.examples || []
      };
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed for lookup, trying fallback:`, err?.message || err);
    }
  }
  throw new Error(lastError?.message || "Kh\xF4ng th\u1EC3 d\u1ECBch v\xE0 tra c\u1EE9u t\u1EEB n\xE0y b\u1EB1ng Gemini.");
}

// src/services/ai/aiReviewSelector.ts
init_aiClient();
async function selectReviewQuestionsWithAi(candidates, userPrompt, targetCount, customApiKey) {
  if (!candidates || candidates.length === 0) {
    return { questionIds: [], reasoning: "Kh\xF4ng c\xF3 c\xE2u h\u1ECFi \u1EE9ng vi\xEAn n\xE0o \u0111\u1EC3 ch\u1ECDn." };
  }
  const ai = getAiClient(customApiKey);
  const systemInstructions = `B\u1EA1n l\xE0 Tr\u1EE3 l\xFD S\u01B0 ph\u1EA1m AI c\u1EE7a n\u1EC1n t\u1EA3ng thi DkTEST.
Nhi\u1EC7m v\u1EE5 c\u1EE7a b\u1EA1n l\xE0 \u0111\u1ECDc k\u1EF9 to\xE0n b\u1ED9 danh s\xE1ch c\xE2u h\u1ECFi v\xE0 c\xE1c \u0111\xE1p \xE1n (d\u01B0\u1EDBi d\u1EA1ng JSON b\xEAn d\u01B0\u1EDBi), sau \u0111\xF3 ph\xE2n t\xEDch v\xE0 tuy\u1EC3n ch\u1ECDn ra kho\u1EA3ng ${Math.max(1, targetCount)} c\xE2u h\u1ECFi ph\xF9 h\u1EE3p nh\u1EA5t theo y\xEAu c\u1EA7u h\u1ECDc t\u1EADp c\u1EE7a h\u1ECDc sinh.

Y\xCAU C\u1EA6U C\u1EE6A H\u1ECCC SINH:
"${userPrompt}"

DANH S\xC1CH TO\xC0N B\u1ED8 C\xC2U H\u1ECEI V\xC0 C\xC1C \u0110\xC1P \xC1N (${candidates.length} c\xE2u):
${JSON.stringify(candidates, null, 2)}

QUY T\u1EAEC B\u1EAET BU\u1ED8C:
1. \u0110\u1ECDc k\u1EF9 n\u1ED9i dung c\xE2u h\u1ECFi ('text') v\xE0 c\xE1c \u0111\xE1p \xE1n ('options' / 'statements' / 'matchingLeft'...) \u0111\u1EC3 hi\u1EC3u \u0111\xFAng ch\u1EE7 \u0111\u1EC1, d\u1EA1ng b\xE0i, ki\u1EBFn th\u1EE9c m\xE0 c\xE2u h\u1ECFi ki\u1EC3m tra.
2. B\u1EA0N CH\u1EC8 \u0110\u01AF\u1EE2C CH\u1ECCN c\xE1c ID n\u1EB1m CH\xCDNH X\xC1C trong danh s\xE1ch c\xE2u h\u1ECFi tr\xEAn.
3. TUY\u1EC6T \u0110\u1ED0I KH\xD4NG t\u1EF1 b\u1ECBa ra ID m\u1EDBi, kh\xF4ng thay \u0111\u1ED5i c\xFA ph\xE1p ID.
4. TUY\u1EC6T \u0110\u1ED0I KH\xD4NG sinh l\u1EA1i n\u1ED9i dung c\xE2u h\u1ECFi hay \u0111\xE1p \xE1n.
5. B\u1EA0N PH\u1EA2I TR\u1EA2 V\u1EC0 DUY NH\u1EA4T m\u1ED9t chu\u1ED7i JSON h\u1EE3p l\u1EC7 (kh\xF4ng k\xE8m Markdown block) c\xF3 c\u1EA5u tr\xFAc:
{
  "questionIds": ["id_1", "id_2", ...],
  "reasoning": "T\xF3m t\u1EAFt ng\u1EAFn g\u1ECDn l\xFD do \u0111\xE3 ch\u1ECDn c\xE1c c\xE2u h\u1ECFi n\xE0y (1-2 c\xE2u ti\u1EBFng Vi\u1EC7t)"
}`;
  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];
  let lastError = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: systemInstructions,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      });
      const responseText = response.text || "";
      const cleaned = responseText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      const rawIds = Array.isArray(parsed.questionIds) ? parsed.questionIds : [];
      const candidateIdSet = new Set(candidates.map((c) => c.id));
      const validIds = rawIds.filter((id) => candidateIdSet.has(id));
      return {
        questionIds: validIds.slice(0, targetCount * 2),
        // Keep safe upper bound
        reasoning: parsed.reasoning || "\u0110\xE3 ch\u1ECDn l\u1ECDc c\xE2u h\u1ECFi theo y\xEAu c\u1EA7u."
      };
    } catch (err) {
      lastError = err;
      console.warn(`[selectReviewQuestionsWithAi] Model ${model} failed, trying fallback:`, err?.message || err);
    }
  }
  throw new Error(lastError?.message || "Kh\xF4ng th\u1EC3 ph\xE2n t\xEDch v\xE0 ch\u1ECDn c\xE2u h\u1ECFi b\u1EB1ng Gemini AI.");
}

// src/services/ai/aiRouter.ts
var upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
var aiRouter = express.Router();
aiRouter.post("/generate-exam-stream", upload.single("file"), async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  try {
    if (!req.file) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "No file uploaded" })}

`);
      res.end();
      return;
    }
    res.write(`data: ${JSON.stringify({ type: "info", message: "\u0110ang \u0111\u1ECDc n\u1ED9i dung file Word..." })}

`);
    const htmlContent = await parseDocxFile(req.file.buffer);
    const result = await processExamInChunks(htmlContent, (progressMsg) => {
      res.write(`data: ${progressMsg}

`);
    });
    res.write(`data: ${JSON.stringify({ type: "done", result })}

`);
    res.end();
  } catch (err) {
    console.error("Error generating exam from document:", err);
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message || "Failed to generate exam" })}

`);
    res.end();
  }
});
aiRouter.post("/generate-exam-prompt-stream", express.json(), async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "No prompt provided" })}

`);
      res.end();
      return;
    }
    const result = await processExamFromPromptStream(prompt, (progressMsg) => {
      res.write(`data: ${progressMsg}

`);
    });
    res.write(`data: ${JSON.stringify({ type: "done", result })}

`);
    res.end();
  } catch (err) {
    console.error("Error generating exam from prompt:", err);
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message || "Failed to generate exam from prompt" })}

`);
    res.end();
  }
});
aiRouter.post("/generate-exam", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const htmlContent = await parseDocxFile(req.file.buffer);
    let lastResult = null;
    const result = await processExamInChunks(htmlContent, (msg) => {
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to generate exam from document" });
  }
});
aiRouter.post("/tutor", async (req, res) => {
  try {
    const { messages, context, apiKey } = req.body;
    const customApiKey = req.headers["x-gemini-api-key"] || apiKey;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }
    const stream = await askTutor(messages, context, customApiKey);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}

`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Error in AI Tutor:", err);
    res.status(500).json({ error: err.message || "Failed to respond" });
  }
});
aiRouter.post("/analyze-exam", async (req, res) => {
  try {
    const { analyticsInput } = req.body;
    if (!analyticsInput) {
      return res.status(400).json({ error: "Analytics input is required" });
    }
    const analysis = await analyzeExamPerformance(analyticsInput);
    res.json(analysis);
  } catch (err) {
    console.error("Error analyzing exam performance:", err);
    res.status(500).json({ error: err.message || "Failed to analyze performance" });
  }
});
aiRouter.post("/analyze-structured-exam", async (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload) {
      return res.status(400).json({ error: "Analysis payload is required" });
    }
    const analysis = await analyzeStructuredExamPerformance(payload);
    res.json(analysis);
  } catch (err) {
    console.error("Error analyzing structured exam performance:", err);
    res.status(500).json({ error: err.message || "Failed to analyze structured performance" });
  }
});
aiRouter.post("/lookup", async (req, res) => {
  try {
    const { text, context, apiKey } = req.body;
    const customApiKey = req.headers["x-gemini-api-key"] || apiKey;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text string is required" });
    }
    const result = await lookupAndTranslate(text.trim(), context, customApiKey);
    res.json(result);
  } catch (err) {
    console.error("Error in AI Lookup:", err);
    res.status(500).json({ error: err.message || "Tra c\u1EE9u th\u1EA5t b\u1EA1i" });
  }
});
aiRouter.post("/select-review-questions", express.json(), async (req, res) => {
  try {
    const { candidates, userPrompt, targetCount, apiKey } = req.body;
    const customApiKey = req.headers["x-gemini-api-key"] || apiKey;
    if (!userPrompt || typeof userPrompt !== "string") {
      return res.status(400).json({ error: "Y\xEAu c\u1EA7u c\u1EE7a h\u1ECDc sinh kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng." });
    }
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: "Danh s\xE1ch \u1EE9ng vi\xEAn c\xE2u h\u1ECFi tr\u1ED1ng." });
    }
    const result = await selectReviewQuestionsWithAi(
      candidates,
      userPrompt.trim(),
      Number(targetCount) || 10,
      customApiKey
    );
    res.json(result);
  } catch (err) {
    console.error("Error in AI Select Review Questions:", err);
    res.status(500).json({ error: err.message || "Kh\xF4ng th\u1EC3 l\u1ECDc c\xE2u h\u1ECFi qua AI" });
  }
});
aiRouter.post("/grade-essay", express.json(), async (req, res) => {
  try {
    const { question, studentAnswer, apiKey } = req.body;
    const customApiKey = req.headers["x-gemini-api-key"] || apiKey;
    if (!question || typeof question !== "object") {
      return res.status(400).json({ error: "Th\xF4ng tin c\xE2u h\u1ECFi kh\xF4ng h\u1EE3p l\u1EC7." });
    }
    const { gradeEssayWithGemini: gradeEssayWithGemini2 } = await Promise.resolve().then(() => (init_aiEssayGrader(), aiEssayGrader_exports));
    const result = await gradeEssayWithGemini2(question, studentAnswer || "", customApiKey);
    res.json(result);
  } catch (err) {
    console.error("Error in AI Grade Essay:", err);
    res.status(500).json({ error: err.message || "Kh\xF4ng th\u1EC3 ch\u1EA5m b\xE0i t\u1EF1 lu\u1EADn qua AI" });
  }
});
export {
  aiRouter
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
