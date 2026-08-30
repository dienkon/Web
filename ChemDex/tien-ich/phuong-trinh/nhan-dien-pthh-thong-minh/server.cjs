var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
var FEEDBACK_FILE = import_path.default.join(process.cwd(), "feedback_store.json");
async function readFeedbackLogs() {
  try {
    if (!import_fs.default.existsSync(FEEDBACK_FILE)) {
      return [];
    }
    const data = await import_fs.default.promises.readFile(FEEDBACK_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading feedback logs:", err);
    return [];
  }
}
async function saveFeedbackLog(newLog) {
  try {
    const logs = await readFeedbackLogs();
    logs.push(newLog);
    await import_fs.default.promises.writeFile(FEEDBACK_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving feedback log:", err);
  }
}
import_dotenv.default.config();
var PORT = 3e3;
var HOST = "0.0.0.0";
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured or still has a placeholder value.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/feedback", async (req, res) => {
    try {
      const { rawOCR, finalEquation, rating, comment } = req.body;
      if (!rating) {
        return res.status(400).json({ error: "Rating is required (like or dislike)." });
      }
      const newLog = {
        rawOCR: rawOCR || "",
        finalEquation: finalEquation || "",
        rating,
        comment: comment || "",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      await saveFeedbackLog(newLog);
      console.log(`[Feedback Saved] Rating: ${rating}, Equation: ${finalEquation || rawOCR}`);
      return res.json({ success: true, message: "Feedback saved successfully!" });
    } catch (err) {
      console.error("Failed to save feedback:", err);
      return res.status(500).json({ error: "Failed to process feedback.", details: err.message });
    }
  });
  app.post("/api/gemini/verify", async (req, res) => {
    try {
      const {
        rawOCR,
        repairedText,
        localBalanced,
        localReactionType,
        localInferredProducts,
        localInferenceReasoning,
        language
      } = req.body;
      if (!rawOCR) {
        return res.status(400).json({ error: "Th\u1EEBa s\u1ED1 'rawOCR' l\xE0 b\u1EAFt bu\u1ED9c." });
      }
      const isVi = language === "vi";
      const historicalLogs = await readFeedbackLogs();
      const dislikes = historicalLogs.filter((log) => log.rating === "dislike" && log.comment);
      let learningContext = "";
      if (dislikes.length > 0) {
        learningContext = isVi ? "\n\n\u26A0\uFE0F B\xC0I H\u1ECCC KINH NGHI\u1EC6M T\u1EEA PH\u1EA2N H\u1ED2I SAI S\xD3T TR\u01AF\u1EDAC \u0110\xC2Y C\u1EE6A NG\u01AF\u1EDCI D\xD9NG (B\u1EAET BU\u1ED8C TR\xC1NH L\u1EB6P L\u1EA0I PH\u1EA0M SAI L\u1EA6M N\xC0Y):\n" + dislikes.map((d, i) => `- \u0110\u1ED1i v\u1EDBi ph\u01B0\u01A1ng tr\xECnh "${d.rawOCR || d.finalEquation}", ng\u01B0\u1EDDi d\xF9ng b\xE1o l\u1ED7i: "${d.comment}". H\xE3y \u0111\u1EA3m b\u1EA3o ph\xE2n t\xEDch c\u1EE7a b\u1EA1n l\u1EA7n n\xE0y tuy\u1EC7t \u0111\u1ED1i ch\xEDnh x\xE1c v\xE0 kh\xF4ng l\u1EB7p l\u1EA1i l\u1ED7i tr\xEAn.`).join("\n") : "\n\n\u26A0\uFE0F LESSONS LEARNED FROM PAST DISLIKES/USER CORRECTIONS (MUST AVOID THESE MISTAKES):\n" + dislikes.map((d, i) => `- Past reported error when processing "${d.rawOCR || d.finalEquation}": "${d.comment}". Learn from this and ensure your current chemical analysis is highly accurate and free of these mistakes.`).join("\n");
      }
      let ai;
      try {
        ai = getGeminiClient();
      } catch (keyErr) {
        console.warn("Gemini API key error:", keyErr.message);
        return res.status(503).json({
          error: "Gemini API key not configured.",
          details: keyErr.message
        });
      }
      const prompt = isVi ? `
H\xE3y ki\u1EC3m ch\u1EE9ng, s\u1EEDa l\u1ED7i h\xF3a h\u1ECDc, d\u1EF1 \u0111o\xE1n s\u1EA3n ph\u1EA9m khuy\u1EBFt, c\xE2n b\u1EB1ng v\xE0 ph\xE2n t\xEDch chuy\xEAn s\xE2u ph\u01B0\u01A1ng tr\xECnh h\xF3a h\u1ECDc sau:
- V\u0103n b\u1EA3n OCR nh\u1EADn di\u1EC7n th\xF4 t\u1EEB \u1EA3nh: "${rawOCR}"
- S\u1EEDa l\u1ED7i h\xF3a h\u1ECDc \u0111\u1EC1 xu\u1EA5t b\u1EDFi thu\u1EADt to\xE1n c\u1EE5c b\u1ED9: "${repairedText}"
- Lo\u1EA1i ph\u1EA3n \u1EE9ng \u0111\u1EC1 xu\u1EA5t: "${localReactionType || "Ch\u01B0a x\xE1c \u0111\u1ECBnh"}"
- C\xE1c s\u1EA3n ph\u1EA9m d\u1EF1 \u0111o\xE1n c\u1EE5c b\u1ED9: ${JSON.stringify(localInferredProducts || [])}
- C\xE2n b\u1EB1ng \u0111\u1EC1 xu\u1EA5t: "${localBalanced || "Ch\u01B0a c\xE2n b\u1EB1ng"}"
- Gi\u1EA3i th\xEDch \u0111\u1EC1 xu\u1EA5t: "${localInferenceReasoning || "Ch\u01B0a c\xF3"}"

Y\xEAu c\u1EA7u Ph\xE2n t\xEDch H\xF3a h\u1ECDc Chi ti\u1EBFt (B\u1EAET BU\u1ED8C TR\u1EA2 L\u1EDCI B\u1EB0NG TI\u1EBENG VI\u1EC6T):
1. **Ki\u1EC3m tra v\xE0 S\u1EEDa l\u1ED7i Ch\u1EA5t \u0111\u1EA7u v\xE0o**: \u0110\xE1nh gi\xE1 xem c\xE1c ch\u1EA5t tham gia \u1EDF \u0111\u1EA7u v\xE0o c\xF3 vi\u1EBFt sai c\xF4ng th\u1EE9c ho\u1EB7c sai h\xF3a tr\u1ECB hay kh\xF4ng (v\xED d\u1EE5: vi\u1EBFt thi\u1EBFu ch\u1EC9 s\u1ED1, nh\u1EA7m l\u1EABn k\xFD t\u1EF1 nh\u01B0 'CaCl,' th\xE0nh 'CaCl2', 'K\xBBCO3' th\xE0nh 'K2CO3'). Gi\u1EA3i th\xEDch chi ti\u1EBFt v\xE0 c\u1EE5 th\u1EC3 l\u1ED7i sai h\xF3a tr\u1ECB hay sai k\xFD t\u1EF1 n\xE0y trong danh s\xE1ch 'corrections'.
2. **D\u1EF1 \u0111o\xE1n s\u1EA3n ph\u1EA9m khuy\u1EBFt**: D\u1EF1 \u0111o\xE1n v\xE0 ho\xE0n thi\u1EC7n c\xE1c s\u1EA3n ph\u1EA9m khuy\u1EBFt d\u1EF1a tr\xEAn c\xE1c quy lu\u1EADt ph\u1EA3n \u1EE9ng h\xF3a h\u1ECDc ch\xEDnh x\xE1c (v\xED d\u1EE5: Zn + HCl t\u1EA1o ra ZnCl2 + H2, Na + H2O t\u1EA1o ra NaOH + H2).
3. **C\xE2n b\u1EB1ng ph\u01B0\u01A1ng tr\xECnh**: C\xE2n b\u1EB1ng ph\u01B0\u01A1ng tr\xECnh h\xF3a h\u1ECDc v\u1EDBi c\xE1c h\u1EC7 s\u1ED1 nguy\xEAn t\u1ED1i gi\u1EA3n.
4. **\u0110i\u1EC1u ki\u1EC7n x\u1EA3y ra ph\u1EA3n \u1EE9ng**: N\xEAu c\u1EF1c k\u1EF3 chi ti\u1EBFt c\xE1c \u0111i\u1EC1u ki\u1EC7n ph\u1EA3n \u1EE9ng (nh\u01B0 nhi\u1EC7t \u0111\u1ED9 t\xB0, \xE1p su\u1EA5t, ch\u1EA5t x\xFAc t\xE1c \u0111\u1EB7c th\xF9, n\u1ED3ng \u0111\u1ED9 dung d\u1ECBch axit/baz\u01A1, dung m\xF4i n\u1EBFu c\xF3) trong ph\u1EA7n 'detailedMechanism'.
5. **Hi\u1EC7n t\u01B0\u1EE3ng th\u1EF1c nghi\u1EC7m**: M\xF4 t\u1EA3 chi ti\u1EBFt hi\u1EC7n t\u01B0\u1EE3ng th\u1EF1c nghi\u1EC7m quan s\xE1t \u0111\u01B0\u1EE3c (s\u1EF1 thay \u0111\u1ED5i m\xE0u s\u1EAFc, xu\u1EA5t hi\u1EC7n ch\u1EA5t k\u1EBFt t\u1EE7a m\xE0u g\xEC, gi\u1EA3i ph\xF3ng kh\xED c\xF3 m\xE0u hay kh\xF4ng m\xE0u, c\xF3 m\xF9i hay kh\xF4ng m\xF9i, ph\u1EA3n \u1EE9ng t\u1ECFa nhi\u1EC7t m\u1EA1nh hay kh\xF4ng).
6. **Ph\u01B0\u01A1ng tr\xECnh Ion**: Cung c\u1EA5p ph\u01B0\u01A1ng tr\xECnh ion \u0111\u1EA7y \u0111\u1EE7 v\xE0 ph\u01B0\u01A1ng tr\xECnh ion r\xFAt g\u1ECDn n\u1EBFu x\u1EA3y ra trong dung d\u1ECBch.
7. **Ph\xE2n t\xEDch Oxi h\xF3a - Kh\u1EED**: N\u1EBFu l\xE0 ph\u1EA3n \u1EE9ng oxi h\xF3a kh\u1EED, ch\u1EC9 r\xF5 s\u1ED1 oxi h\xF3a c\u1EE7a t\u1EEBng nguy\xEAn t\u1ED1 thay \u0111\u1ED5i th\u1EBF n\xE0o, x\xE1c \u0111\u1ECBnh ch\u1EA5t oxi h\xF3a, ch\u1EA5t kh\u1EED, qu\xE1 tr\xECnh oxi h\xF3a, qu\xE1 tr\xECnh kh\u1EED. N\u1EBFu kh\xF4ng ph\u1EA3i, gi\u1EA3i th\xEDch l\xFD do c\u1EE5 th\u1EC3.
8. **\u1EE8ng d\u1EE5ng th\u1EF1c ti\u1EC5n & An to\xE0n**: N\xEAu c\xE1c \u1EE9ng d\u1EE5ng th\u1EF1c t\u1EBF trong c\xF4ng nghi\u1EC7p, ph\xF2ng th\xED nghi\u1EC7m, \u0111\u1EDDi s\u1ED1ng v\xE0 c\xE1c c\u1EA3nh b\xE1o an to\xE0n quan tr\u1ECDng (\u0111\u1ED9c t\xEDnh, nguy c\u01A1 ch\xE1y n\u1ED5, t\u1ECFa nhi\u1EC7t g\xE2y b\u1ECFng).
9. **\u0110\u1ECBnh d\u1EA1ng LaTeX**: V\u1EDBi m\u1ECDi c\xF4ng th\u1EE9c h\xF3a h\u1ECDc ho\u1EB7c ion xu\u1EA5t hi\u1EC7n trong ph\u1EA7n m\xF4 t\u1EA3 b\u1EB1ng v\u0103n b\u1EA3n (v\xED d\u1EE5: H2O, CaCO3, Ba2+, Cl-, SO42-), h\xE3y vi\u1EBFt ch\xFAng d\u01B0\u1EDBi \u0111\u1ECBnh d\u1EA1ng LaTeX s\u1EA1ch s\u1EBD b\u1ECDc trong k\xFD hi\u1EC7u $ (v\xED d\u1EE5: $H_2O$, $CaCO_3$, $Ba^{2+}$, $Cl^-$, $SO_4^{2-}$, $Fe_2(SO_4)_3$) \u0111\u1EC3 hi\u1EC3n th\u1ECB \u0111\u1EB9p m\u1EAFt v\xE0 chuy\xEAn nghi\u1EC7p tr\xEAn giao di\u1EC7n.
` : `
Please verify, correct chemical errors, predict missing products, balance, and deeply analyze the following chemical equation:
- Raw OCR text from image: "${rawOCR}"
- Repaired text proposed locally: "${repairedText}"
- Reaction type proposed: "${localReactionType || "Unknown"}"
- Predicted products locally: ${JSON.stringify(localInferredProducts || [])}
- Balanced equation proposed: "${localBalanced || "Unbalanced"}"
- Reasoning proposed: "${localInferenceReasoning || "None"}"

Detailed Chemistry Analysis Requirements (MUST ANSWER IN ENGLISH):
1. **Input Substance Error Analysis**: Verify if input reactants are chemically invalid, have incorrect valency, or contain OCR spelling/notation errors (e.g., 'CaCl,' corrected to 'CaCl2', 'K\xBBCO3' corrected to 'K2CO3'). Explain these errors and corrections specifically in the 'corrections' list.
2. **Missing Product Prediction**: Predict and complete any missing products based on correct chemical reaction rules (e.g., Zn + HCl yields ZnCl2 + H2).
3. **Balancing**: Balance the equation using simplified integer coefficients.
4. **Reaction Conditions**: Detail all required reaction conditions (such as temperature t\xB0, pressure, specific catalysts, concentration of acids/bases, solvents) in 'detailedMechanism'.
5. **Physical Phenomena**: Describe physical observations in detail (color changes, precipitation color, gas evolution, gas characteristics, heat release).
6. **Ionic Equations**: Write full and net ionic equations if occurring in aqueous solution.
7. **Redox Analysis**: If it is a redox reaction, specify changes in oxidation states, identify oxidizing/reducing agents, and detail oxidation/reduction half-reactions.
8. **Applications & Safety**: List practical applications in industry, labs, or daily life, along with safety hazards (toxicity, explosion risk, severe exothermicity).
9. **LaTeX Formatting**: For every chemical formula or ion that appears in the descriptive text (e.g., H2O, CaCO3, Ba2+, Cl-, SO42-), wrap them in $ as clean LaTeX (e.g., $H_2O$, $CaCO_3$, $Ba^{2+}$, $Cl^-$, $SO_4^{2-}$, $Fe_2(SO_4)_3$) so the frontend can format them beautifully.
`;
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          systemInstruction: `You are an expert chemistry professor and assistant.
Your task is to analyze, verify, correct, balance, and explain chemical equations with high precision.

${learningContext}

Rules:
* Do not perform basic text OCR.
* If reactants have chemical formulas with invalid valencies or syntax errors, detect and detail exactly what was wrong and how you corrected it.
* Recover missing subscripts and coefficients.
* Predict products only if they are chemically valid.
* Balance the equation accurately with integer coefficients.
* Specify reaction conditions, catalysts, and physical phenomena.
* Write the net ionic equation (ph\u01B0\u01A1ng tr\xECnh ion r\xFAt g\u1ECDn) ONLY, and oxidation-reduction analysis. Ensure the ionic equation is wrapped entirely in LaTeX $...$ (e.g. $Ba^{2+} + SO_4^{2-} \rightarrow BaSO_4$).
* Format all chemical formulas and ions inside descriptions with LaTeX wrapped in $ (e.g. $H_2O$, $Ba^{2+}$, $Fe^{3+}$, $SO_4^{2-}$).
* Write all explanations strictly in ${isVi ? "Vietnamese" : "English"}.
* Output JSON only matching the schema.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              originalOCR: {
                type: import_genai.Type.STRING,
                description: "The raw OCR text sent in the request."
              },
              correctedEquation: {
                type: import_genai.Type.STRING,
                description: "The cleaned, corrected chemical equation string (with coefficients and subscripts properly formatted, e.g., 'CaCO3 + 2HCl -> CaCl2 + CO2 + H2O')."
              },
              reactionType: {
                type: import_genai.Type.STRING,
                description: "The type of the reaction (e.g. 'Ph\u1EA3n \u1EE9ng th\u1EBF', 'Ph\u1EA3n \u1EE9ng trao \u0111\u1ED5i')."
              },
              productsPredicted: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING },
                description: "Array of product formulas predicted (e.g. ['CaCl2', 'CO2', 'H2O'])."
              },
              balancedEquation: {
                type: import_genai.Type.STRING,
                description: "The fully balanced equation with correct integer coefficients (e.g., 'CaCO3 + 2HCl -> CaCl2 + CO2 + H2O')."
              },
              confidence: {
                type: import_genai.Type.INTEGER,
                description: "Your confidence score from 0 to 100."
              },
              corrections: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING },
                description: "A bulleted list of actual corrections made to element symbols or subscripts."
              },
              reasoning: {
                type: import_genai.Type.STRING,
                description: "A short explanation of how the reaction occurs and how it was balanced."
              },
              ionicEquation: {
                type: import_genai.Type.STRING,
                description: "The net ionic equation (ph\u01B0\u01A1ng tr\xECnh ion r\xFAt g\u1ECDn) ONLY, formatted by wrapping the whole equation in LaTeX math mode with $, for example: '$Ba^{2+} + SO_4^{2-} \\rightarrow BaSO_4$'. Do NOT include the full/complete ionic equation, ONLY the net/shortened ionic equation (ph\u01B0\u01A1ng tr\xECnh ion r\xFAt g\u1ECDn). If not solution-based or ionic, explain why."
              },
              redoxAnalysis: {
                type: import_genai.Type.STRING,
                description: "Oxidation states analysis, identifying oxidizing/reducing agents, oxidation/reduction half-reactions. If not redox, explain why."
              },
              detailedMechanism: {
                type: import_genai.Type.STRING,
                description: "Detailed reaction mechanism, required conditions (temperature, pressure, catalyst), and physical phenomena (color change, precipitate, gas release)."
              },
              practicalApplication: {
                type: import_genai.Type.STRING,
                description: "Industrial or laboratory applications, real-world uses, and safety warnings (toxicity, heat release, explosion hazard)."
              }
            },
            required: [
              "originalOCR",
              "correctedEquation",
              "reactionType",
              "productsPredicted",
              "balancedEquation",
              "confidence",
              "corrections",
              "reasoning",
              "ionicEquation",
              "redoxAnalysis",
              "detailedMechanism",
              "practicalApplication"
            ]
          }
        }
      });
      const responseText = response.text;
      if (!responseText) {
        throw new Error("Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c ph\u1EA3n h\u1ED3i d\u1EA1ng ch\u1EEF t\u1EEB Gemini.");
      }
      const parsedJSON = JSON.parse(responseText.trim());
      return res.json(parsedJSON);
    } catch (err) {
      console.error("Gemini route error:", err);
      return res.status(500).json({
        error: "C\u1ED5ng th\xF4ng tin Gemini g\u1EB7p l\u1ED7i x\u1EED l\xFD.",
        details: err.message
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up dev server with Vite middleware...");
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production files from dist/...");
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
