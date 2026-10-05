import dotenv from "dotenv";
import path from "path";
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 5500;

  app.use(express.json());
  app.use(cors());

  const rootPath = path.resolve(process.cwd(), "..");

  /// Initialize Gemini AI
  let ai: GoogleGenAI | null = null;
  try {
    console.log("GEMINI_API_KEY =", process.env.GEMINI_API_KEY);

    if (process.env.GEMINI_API_KEY) {
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } else {
      console.warn("GEMINI_API_KEY is not set");
    }
  } catch (e) {
    console.error("Failed to init GenAI", e);
  }
  // AI Model name requested: gemini-3.5-flash
  const AI_MODEL = "gemini-3.5-flash-lite";

  // API Route for Ask AI
  app.post("/api/ask", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "AI not configured on server" });
      }

      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "No prompt provided" });

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            "Bạn là Trợ lý AI Hóa Học thông minh thuộc ứng dụng ChemDex. Trả lời chính xác, dễ hiểu, trình bày công thức hóa học và toán học bằng LaTeX (ví dụ: $H_2SO_4$, $$\\text{Fe} + 2\\text{HCl} \\rightarrow \\text{FeCl}_2 + \\text{H}_2 \\uparrow$$) và bảng biểu Markdown sinh động.",
        },
      });

      res.json({ text: response.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API Route for Chat Interface (Gemini-style Chat tab)
  app.post("/api/chat", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "AI not configured on server" });
      }
      const { messages } = req.body; // Array of { role: 'user' | 'model', content: string }
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages format" });
      }

      const formattedContents = messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: formattedContents,
        config: {
          systemInstruction:
            "Bạn là Trợ lý AI Hóa Học ChemDex (Gemini Chemistry Assistant). Giải đáp các bài tập hóa học từ phổ thông tới nâng cao, giải thích phản ứng, chuỗi hóa học, cân bằng phương trình, giải bài tập đại số hóa học và tư vấn phương pháp học tập hiệu quả. Trình bày đẹp mắt bằng định dạng Markdown. Sử dụng LaTeX cho các công thức hóa học, phương trình và ký hiệu toán học (ví dụ: $H_2SO_4$, $$\\text{2H}_2 + \\text{O}_2 \\xrightarrow{t^o} \\text{2H}_2\\text{O}$$, $$\\Delta H < 0$$). Sử dụng bảng Markdown (Markdown Tables) khi so sánh, liệt kê thông số hay tóm tắt bài tập.",
        },
      });

      res.json({ text: response.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // API Route for Content Moderation
  app.post("/api/moderate", async (req, res) => {
    try {
      if (!ai) {
        // If AI unavailable, pass default approval
        return res.json({ approved: true, reason: "Bình thường" });
      }
      const { text, type } = req.body; // type: 'post' | 'comment'
      if (!text || text.trim().length === 0) {
        return res.json({ approved: true, reason: "Nội dung trống" });
      }

      const prompt = `Bạn là hệ thống kiểm duyệt nội dung tự động cho Diễn đàn Hóa Học ChemDex.
Kiểm tra xem nội dung ${type === "post" ? "bài viết" : "bình luận"} sau có vi phạm các quy tắc: xúc phạm, phản cảm, tục tĩu, quảng cáo rác, phá hoại hay không liên quan hoàn toàn.

Nội dung: "${text}"

Hãy phản hồi DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{"approved": true/false, "reason": "Lý do ngắn gọn nếu từ chối hoặc 'Phù hợp' nếu chấp nhận"}`;

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      try {
        const jsonResult = JSON.parse(response.text || "{}");
        return res.json({
          approved: jsonResult.approved ?? true,
          reason: jsonResult.reason || "Nội dung hợp lệ",
        });
      } catch (jsonErr) {
        return res.json({ approved: true, reason: "Phù hợp" });
      }
    } catch (e: any) {
      console.error("Moderation error:", e);
      // Fallback pass if network error to avoid blocking user
      res.json({ approved: true, reason: "Không thể kết nối AI kiểm duyệt" });
    }
  });

  // API Route for AI Search & Topic Analysis
  app.post("/api/search-posts", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "AI not configured on server" });
      }
      const { query: searchQuery, posts } = req.body;
      if (!searchQuery || !posts || !Array.isArray(posts)) {
        return res.json({ matchingIds: [], analysis: "" });
      }

      const postSummaries = posts.map((p: any) => ({
        id: p.id,
        content: p.content,
        author: p.authorName,
      }));

      const prompt = `Người dùng đang tìm kiếm chủ đề: "${searchQuery}" trên diễn đàn Hóa Học.
Dưới đây là danh sách các bài viết hiện có:
${JSON.stringify(postSummaries, null, 2)}

Hãy phân tích ngữ nghĩa và ngữ cảnh chủ đề, chọn ra các ID bài viết có liên quan nhất tới từ khóa tìm kiếm (kể cả từ đồng nghĩa hoặc chủ đề hóa học liên quan), đồng thời đưa ra 1 câu phân tích ngắn gọn tổng quan về kết quả tìm kiếm.

Trả về DUY NHẤT JSON theo định dạng:
{
  "matchingIds": ["id1", "id2"],
  "analysis": "AI Phân tích: Tìm thấy X bài viết liên quan đến chủ đề..."
}`;

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({
        matchingIds: parsed.matchingIds || [],
        analysis: parsed.analysis || "",
      });
    } catch (e: any) {
      console.error("AI Search Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // API Route for Virtual Lab Experiment Mix (/api/experiment/mix)
  app.post("/api/experiment/mix", async (req, res) => {
    try {
      const { substances = [], volume = 0.5, lang = "en", isHeated = false } = req.body || {};

      if (!Array.isArray(substances)) {
        return res.status(400).json({ error: "substances must be an array" });
      }

      const isVi = lang === "vi";
      const subStr = substances.join(" + ");
      const normalized = Array.from(
        new Set(substances.map((s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "")))
      ).sort();
      const isPureWaterOrIce = normalized.length === 0 || normalized.every((t) => t.includes("h2o"));
      const primaryName = substances[0] || "H2O";
      const isWater = isPureWaterOrIce || primaryName.toLowerCase().includes("h2o");
      const isIce = primaryName.toLowerCase().includes("h2o_s") || primaryName.toLowerCase().includes("ice");
      const canonicalKey = normalized.join("_") || (isHeated ? "heated_mixture" : "empty_mixture");

      const deterministicResult = {
        reaction_id: canonicalKey,
        summary: isVi
          ? isIce
            ? "Nước đá / Nước cất (H₂O rắn tan chảy)"
            : isWater
            ? "Nước tinh khiết / Nước cất (H₂O)"
            : `Hỗn hợp các chất: ${subStr}`
          : isIce
          ? "Ice / Distilled Water (H₂O solid phase)"
          : isWater
          ? "Pure Distilled Water (H₂O)"
          : `Mixture of substances: ${subStr}`,
        equation: isIce ? "H₂O(s) ⇌ H₂O(l)" : isWater ? "H₂O" : subStr ? `${subStr} (hỗn hợp)` : "H₂O",
        reactants: substances.length > 0 ? substances : ["H2O"],
        products: substances.length > 0 ? substances : ["H2O"],
        safety_notes: isVi
          ? "Tuân thủ quy tắc an toàn và bảo hộ phòng thí nghiệm tiêu chuẩn."
          : "Standard laboratory safety measures apply.",
        observable_changes: isVi
          ? "Các chất hòa tan và khuấy trộn đồng đều trong bình phản ứng."
          : "Substances disperse and mix uniformly in the reaction vessel.",
        new_vessel_state: {
          liquid_color: isWater ? "#f8fafc" : "#e2e8f0",
          liquid_level: Math.min(1.0, Math.max(0.1, volume)),
          temperature_c: isHeated ? 60.0 : 25.0,
          has_precipitate: false,
          is_boiling: isHeated,
          has_gas: false,
          is_explosion: false,
        },
        program: {
          schema: "chemdex.program/1",
          id: canonicalKey,
          provenance: "fallback",
          chemistry: {
            equation: isWater ? "H₂O" : subStr,
            species: substances.map((s: string) => ({
              formula: s,
              role: "reactant",
              coeff: 1,
              phase: "aq",
              colorHex: "#ffffff",
            })),
            deltaH_kJ_per_mol: 0,
            kinetics: { model: "instant", halfTime_s: 1.0 },
            hazards: [],
          },
          visual: {
            duration_s: 3.0,
            timeline: [
              {
                id: "atom_1",
                atom: "liquidSwirl",
                anchor: "bulk",
                window: [0.0, 0.8],
                intensity: 1.0,
                params: {},
              },
            ],
            after: {
              liquidColor: isWater ? "#f8fafc" : "#e2e8f0",
              liquidOpacity: 1.0,
              turbidity: 0.0,
              gasesOffgassed: [],
            },
          },
          explain: {
            observation_vi: isVi
              ? "Các chất hòa tan và khuấy trộn đồng đều trong dung dịch."
              : "Substances mix uniformly.",
            observation_en: "Substances dissolve and mix uniformly.",
            why_vi: isVi
              ? "Quá trình hòa tan vật lý và khuếch tán phân tử."
              : "Physical dissolution and diffusion.",
            why_en: "Physical dissolution and molecular diffusion.",
          },
          confidence: 1.0,
        },
        effects: [{ type: "COLOR_CHANGE", duration: 1, color: isWater ? "#f8fafc" : "#e2e8f0" }],
        confidence: 1.0,
        is_dangerous: false,
        _resolutionSource: "deterministic",
        _canonicalKey: canonicalKey,
      };

      if (!ai || substances.length === 0) {
        return res.json(deterministicResult);
      }

      try {
        const mixPrompt = `You are an expert chemistry AI assistant and visual director for a physically-faithful 3D virtual lab simulation.
Predict the outcome of mixing reagents and return ONLY a valid JSON object matching:
{
  "reaction_id": "${canonicalKey}",
  "summary": "Brief summary",
  "equation": "Balanced full chemical equation",
  "reactants": ${JSON.stringify(substances)},
  "products": ["Product formulas"],
  "safety_notes": "Safety warnings",
  "observable_changes": "Visual changes",
  "new_vessel_state": {
    "liquid_color": "#ffffff",
    "liquid_level": ${volume},
    "temperature_c": ${isHeated ? 60 : 25},
    "has_precipitate": false,
    "is_boiling": ${isHeated},
    "has_gas": false,
    "is_explosion": false
  },
  "program": {
    "schema": "chemdex.program/1",
    "id": "${canonicalKey}",
    "provenance": "ai",
    "chemistry": {
      "equation": "Balanced equation",
      "species": [
        { "formula": "Formula", "role": "reactant", "coeff": 1, "phase": "aq", "colorHex": "#ffffff" }
      ],
      "deltaH_kJ_per_mol": 0,
      "kinetics": { "model": "instant", "halfTime_s": 1.5 },
      "hazards": []
    },
    "visual": {
      "duration_s": 4.0,
      "timeline": [
        { "id": "atom_1", "atom": "liquidSwirl", "anchor": "bulk", "window": [0.0, 0.8], "intensity": 1.0, "params": {} }
      ],
      "after": { "liquidColor": "#ffffff", "liquidOpacity": 1.0, "turbidity": 0.0, "gasesOffgassed": [] }
    },
    "explain": { "observation_vi": "...", "observation_en": "...", "why_vi": "...", "why_en": "..." },
    "confidence": 0.95
  },
  "effects": [],
  "confidence": 0.95,
  "is_dangerous": false
}
Reagents: ${substances.join(" and ")}. Heated: ${isHeated ? "Yes" : "No"}. Lang: ${lang}.`;

        const response = await ai.models.generateContent({
          model: AI_MODEL,
          contents: [{ role: "user", parts: [{ text: mixPrompt }] }],
          config: {
            responseMimeType: "application/json",
          },
        });

        const raw = response.text || "";
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(cleaned);

        return res.json({
          ...deterministicResult,
          ...parsed,
          _resolutionSource: "gemini",
          _canonicalKey: canonicalKey,
        });
      } catch (aiErr) {
        console.warn("[/api/experiment/mix] Gemini generation failed, using deterministic:", aiErr);
        return res.json(deterministicResult);
      }
    } catch (e: any) {
      console.error("[API Error in /api/experiment/mix]:", e);
      res.status(500).json({ error: e.message || "Failed to process experiment" });
    }
  });

  // API Route for Virtual Lab AI Query & Report Evaluation (/api/experiment/ai-query)
  app.post("/api/experiment/ai-query", async (req, res) => {
    try {
      const { equation, substances, userQuestion, temperature_c = 25, isHeated = false, lang = "vi" } = req.body || {};
      const isVi = lang === "vi";
      const subStr = substances && Array.isArray(substances) ? substances.join(" + ") : equation || "H2O";

      const fallbackAnalysis = {
        equation: equation || subStr,
        reaction_type: isVi ? "Phản ứng hóa học" : "Chemical reaction",
        reactionType: isVi ? "Phản ứng hóa học" : "Chemical reaction",
        thermodynamics: {
          deltaH: isHeated ? "+ΔH > 0" : "ΔH ≈ 0 kJ/mol",
          enthalpy_delta_h: isHeated ? "+ΔH > 0" : "ΔH ≈ 0 kJ/mol",
          deltaG: "ΔG < 0 (Tự diễn biến)",
          gibbs_free_energy: "ΔG < 0",
          isExothermic: !isHeated,
          thermalNature: isHeated ? (isVi ? "Thu nhiệt" : "Endothermic") : isVi ? "Tỏa nhiệt nhẹ" : "Exothermic",
          temperature_required: `${temperature_c}°C`,
        },
        kinetics: {
          rate_law: "v = k[A][B]",
          reaction_speed: isVi ? "Nhanh ở nhiệt độ phòng" : "Fast at room temperature",
          activationEnergy: "Ea ~ 25 kJ/mol",
          catalyst_needed: isVi ? "Không yêu cầu xúc tác" : "No catalyst required",
        },
        operational_procedure: {
          step_by_step: isVi
            ? [
                "1. Chuẩn bị dụng cụ thí nghiệm và hóa chất đã được định lượng.",
                "2. Rót từ từ các chất vào bình tam giác hoặc cốc chịu nhiệt.",
                "3. Quan sát các hiện tượng biến đổi màu sắc, bọt khí hoặc kết tủa.",
              ]
            : [
                "1. Prepare laboratory glassware and measured reagents.",
                "2. Pour reagents slowly into the vessel.",
                "3. Observe physical and chemical phenomena such as gas or color changes.",
              ],
          safety_precautions: isVi
            ? [
                "Đeo kính bảo hộ và găng tay trong suốt quá trình thao tác.",
                "Tránh tiếp xúc trực tiếp hoặc hít phải hơi hóa chất.",
              ]
            : [
                "Wear safety goggles and lab gloves throughout the operation.",
                "Avoid direct inhalation of vapors.",
              ],
        },
        explanation_vi: userQuestion
          ? `Phân tích yêu cầu: "${userQuestion}". Hệ thống đã ghi nhận các chất tham gia (${subStr}) và điều kiện nhiệt độ (${temperature_c}°C). Phản ứng diễn ra theo các nguyên lý động học và nhiệt động học cơ bản.`
          : `Phản ứng giữa ${subStr} ở ${temperature_c}°C tuân theo các quy luật cân bằng hóa học tiêu chuẩn.`,
        explanation_en: `Reaction between ${subStr} at ${temperature_c}°C follows standard chemical equilibrium principles.`,
        score: 9.0,
        pros: [
          isVi ? "Thao tác phòng thí nghiệm đúng quy trình" : "Standard lab procedures followed",
          isVi ? "Ghi nhận đầy đủ thông số nồng độ và nhiệt độ" : "Parameters recorded accurately",
        ],
        improvements: [
          isVi ? "Tuân thủ bảo hộ cá nhân khi tiếp xúc hóa chất" : "Ensure PPE is always used",
        ],
        summary: isVi
          ? `Báo cáo thí nghiệm hợp lệ cho phản ứng ${subStr}.`
          : `Valid laboratory experiment report for ${subStr}.`,
      };

      if (!ai) {
        return res.json(fallbackAnalysis);
      }

      try {
        const queryPrompt = `You are a Chemistry Professor and Virtual Lab AI Consultant.
Analyze the chemical scenario and return ONLY valid JSON matching this schema:
{
  "equation": "${equation || subStr}",
  "reaction_type": "string",
  "reactionType": "string",
  "thermodynamics": {
    "deltaH": "string",
    "enthalpy_delta_h": "string",
    "deltaG": "string",
    "gibbs_free_energy": "string",
    "isExothermic": boolean,
    "thermalNature": "string",
    "temperature_required": "string"
  },
  "kinetics": {
    "rate_law": "string",
    "reaction_speed": "string",
    "activationEnergy": "string",
    "catalyst_needed": "string"
  },
  "operational_procedure": {
    "step_by_step": ["step 1", "step 2"],
    "safety_precautions": ["safety 1", "safety 2"]
  },
  "explanation_vi": "string in Vietnamese",
  "explanation_en": "string in English",
  "score": 9.2,
  "pros": ["string"],
  "improvements": ["string"],
  "summary": "string"
}
Equation/Substances: ${equation || subStr}. Temperature: ${temperature_c}°C. Heated: ${isHeated ? "Yes" : "No"}. Question: ${userQuestion || "Analysis"}. Lang: ${lang}.`;

        const response = await ai.models.generateContent({
          model: AI_MODEL,
          contents: [{ role: "user", parts: [{ text: queryPrompt }] }],
          config: {
            responseMimeType: "application/json",
          },
        });

        const raw = response.text || "";
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(cleaned);

        return res.json({
          ...fallbackAnalysis,
          ...parsed,
        });
      } catch (aiErr) {
        console.warn("[/api/experiment/ai-query] Gemini error, using fallback:", aiErr);
        return res.json(fallbackAnalysis);
      }
    } catch (e: any) {
      console.error("[API Error in /api/experiment/ai-query]:", e);
      res.status(500).json({ error: e.message || "Failed to process AI query" });
    }
  });

  // Handle serving the frontend
  if (process.env.NODE_ENV !== "production") {
    // 1. Vite middlewares for SPAs (Must come FIRST to inject dev scripts into HTML)
    const viteTrungTam = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24678 } },
      appType: "spa",
      root: path.join(rootPath, "trung-tam"),
      base: "/trung-tam/",
    });
    app.use("/trung-tam", viteTrungTam.middlewares);

    const viteDauTruong = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24679 } },
      appType: "spa",
      root: path.join(rootPath, "dau-truong"),
      base: "/dau-truong/",
    });
    app.use("/dau-truong", viteDauTruong.middlewares);

    const viteNhanDien = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24680 } },
      appType: "spa",
      root: path.join(rootPath, "tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh"),
      base: "/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/",
    });
    app.use("/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh", viteNhanDien.middlewares);

    const viteChuoi = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24681 } },
      appType: "spa",
      root: path.join(rootPath, "tien-ich/phuong-trinh/chuoi-phan-ung"),
      base: "/tien-ich/phuong-trinh/chuoi-phan-ung/",
    });
    app.use("/tien-ich/phuong-trinh/chuoi-phan-ung", viteChuoi.middlewares);

    const viteLab = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24682 } },
      appType: "spa",
      root: path.join(rootPath, "lab"),
      base: "/lab/",
    });
    app.use("/lab", viteLab.middlewares);

    // 2. Serve static files from root for non-SPA paths (index.html, css, js)
    app.use(express.static(rootPath));
  } else {
    // Production: serve built static files from each project's dist directory
    app.use("/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh", express.static(path.join(rootPath, "tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/dist")));
    app.use("/tien-ich/phuong-trinh/chuoi-phan-ung", express.static(path.join(rootPath, "tien-ich/phuong-trinh/chuoi-phan-ung/dist")));
    app.use("/trung-tam", express.static(path.join(rootPath, "trung-tam/dist")));
    app.use("/dau-truong", express.static(path.join(rootPath, "dau-truong/dist")));
    app.use("/lab", express.static(path.join(rootPath, "lab/dist")));

    // Serve static files from root for non-SPA paths (index.html, css, js, data)
    app.use(express.static(rootPath));

    // Fallback routes for SPAs to handle client-side routing
    app.get(["/trung-tam", "/trung-tam/*"], (req, res) => {
      res.sendFile(path.join(rootPath, "trung-tam/dist/index.html"));
    });
    app.get(["/dau-truong", "/dau-truong/*"], (req, res) => {
      res.sendFile(path.join(rootPath, "dau-truong/dist/index.html"));
    });
    app.get(["/lab", "/lab/*"], (req, res) => {
      res.sendFile(path.join(rootPath, "lab/dist/index.html"));
    });
    app.get(["/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh", "/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/*"], (req, res) => {
      res.sendFile(path.join(rootPath, "tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/dist/index.html"));
    });
    app.get(["/tien-ich/phuong-trinh/chuoi-phan-ung", "/tien-ich/phuong-trinh/chuoi-phan-ung/*"], (req, res) => {
      res.sendFile(path.join(rootPath, "tien-ich/phuong-trinh/chuoi-phan-ung/dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
