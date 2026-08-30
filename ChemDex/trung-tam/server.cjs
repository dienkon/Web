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
var import_dotenv = __toESM(require("dotenv"), 1);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_cors = __toESM(require("cors"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 5500;
  app.use(import_express.default.json());
  app.use((0, import_cors.default)());
  const rootPath = import_path.default.resolve(process.cwd(), "..");
  let ai = null;
  try {
    console.log("GEMINI_API_KEY =", process.env.GEMINI_API_KEY);
    if (process.env.GEMINI_API_KEY) {
      ai = new import_genai.GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    } else {
      console.warn("GEMINI_API_KEY is not set");
    }
  } catch (e) {
    console.error("Failed to init GenAI", e);
  }
  const AI_MODEL = "gemini-3.5-flash-lite";
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
          systemInstruction: "B\u1EA1n l\xE0 Tr\u1EE3 l\xFD AI H\xF3a H\u1ECDc th\xF4ng minh thu\u1ED9c \u1EE9ng d\u1EE5ng ChemDex. Tr\u1EA3 l\u1EDDi ch\xEDnh x\xE1c, d\u1EC5 hi\u1EC3u, tr\xECnh b\xE0y c\xF4ng th\u1EE9c h\xF3a h\u1ECDc v\xE0 to\xE1n h\u1ECDc b\u1EB1ng LaTeX (v\xED d\u1EE5: $H_2SO_4$, $$\\text{Fe} + 2\\text{HCl} \\rightarrow \\text{FeCl}_2 + \\text{H}_2 \\uparrow$$) v\xE0 b\u1EA3ng bi\u1EC3u Markdown sinh \u0111\u1ED9ng."
        }
      });
      res.json({ text: response.text });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/chat", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "AI not configured on server" });
      }
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages format" });
      }
      const formattedContents = messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: formattedContents,
        config: {
          systemInstruction: "B\u1EA1n l\xE0 Tr\u1EE3 l\xFD AI H\xF3a H\u1ECDc ChemDex (Gemini Chemistry Assistant). Gi\u1EA3i \u0111\xE1p c\xE1c b\xE0i t\u1EADp h\xF3a h\u1ECDc t\u1EEB ph\u1ED5 th\xF4ng t\u1EDBi n\xE2ng cao, gi\u1EA3i th\xEDch ph\u1EA3n \u1EE9ng, chu\u1ED7i h\xF3a h\u1ECDc, c\xE2n b\u1EB1ng ph\u01B0\u01A1ng tr\xECnh, gi\u1EA3i b\xE0i t\u1EADp \u0111\u1EA1i s\u1ED1 h\xF3a h\u1ECDc v\xE0 t\u01B0 v\u1EA5n ph\u01B0\u01A1ng ph\xE1p h\u1ECDc t\u1EADp hi\u1EC7u qu\u1EA3. Tr\xECnh b\xE0y \u0111\u1EB9p m\u1EAFt b\u1EB1ng \u0111\u1ECBnh d\u1EA1ng Markdown. S\u1EED d\u1EE5ng LaTeX cho c\xE1c c\xF4ng th\u1EE9c h\xF3a h\u1ECDc, ph\u01B0\u01A1ng tr\xECnh v\xE0 k\xFD hi\u1EC7u to\xE1n h\u1ECDc (v\xED d\u1EE5: $H_2SO_4$, $$\\text{2H}_2 + \\text{O}_2 \\xrightarrow{t^o} \\text{2H}_2\\text{O}$$, $$\\Delta H < 0$$). S\u1EED d\u1EE5ng b\u1EA3ng Markdown (Markdown Tables) khi so s\xE1nh, li\u1EC7t k\xEA th\xF4ng s\u1ED1 hay t\xF3m t\u1EAFt b\xE0i t\u1EADp."
        }
      });
      res.json({ text: response.text });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/moderate", async (req, res) => {
    try {
      if (!ai) {
        return res.json({ approved: true, reason: "B\xECnh th\u01B0\u1EDDng" });
      }
      const { text, type } = req.body;
      if (!text || text.trim().length === 0) {
        return res.json({ approved: true, reason: "N\u1ED9i dung tr\u1ED1ng" });
      }
      const prompt = `B\u1EA1n l\xE0 h\u1EC7 th\u1ED1ng ki\u1EC3m duy\u1EC7t n\u1ED9i dung t\u1EF1 \u0111\u1ED9ng cho Di\u1EC5n \u0111\xE0n H\xF3a H\u1ECDc ChemDex.
Ki\u1EC3m tra xem n\u1ED9i dung ${type === "post" ? "b\xE0i vi\u1EBFt" : "b\xECnh lu\u1EADn"} sau c\xF3 vi ph\u1EA1m c\xE1c quy t\u1EAFc: x\xFAc ph\u1EA1m, ph\u1EA3n c\u1EA3m, t\u1EE5c t\u0129u, qu\u1EA3ng c\xE1o r\xE1c, ph\xE1 ho\u1EA1i hay kh\xF4ng li\xEAn quan ho\xE0n to\xE0n.

N\u1ED9i dung: "${text}"

H\xE3y ph\u1EA3n h\u1ED3i DUY NH\u1EA4T m\u1ED9t chu\u1ED7i JSON h\u1EE3p l\u1EC7 theo \u0111\u1ECBnh d\u1EA1ng:
{"approved": true/false, "reason": "L\xFD do ng\u1EAFn g\u1ECDn n\u1EBFu t\u1EEB ch\u1ED1i ho\u1EB7c 'Ph\xF9 h\u1EE3p' n\u1EBFu ch\u1EA5p nh\u1EADn"}`;
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      try {
        const jsonResult = JSON.parse(response.text || "{}");
        return res.json({
          approved: jsonResult.approved ?? true,
          reason: jsonResult.reason || "N\u1ED9i dung h\u1EE3p l\u1EC7"
        });
      } catch (jsonErr) {
        return res.json({ approved: true, reason: "Ph\xF9 h\u1EE3p" });
      }
    } catch (e) {
      console.error("Moderation error:", e);
      res.json({ approved: true, reason: "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i AI ki\u1EC3m duy\u1EC7t" });
    }
  });
  app.post("/api/search-posts", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "AI not configured on server" });
      }
      const { query: searchQuery, posts } = req.body;
      if (!searchQuery || !posts || !Array.isArray(posts)) {
        return res.json({ matchingIds: [], analysis: "" });
      }
      const postSummaries = posts.map((p) => ({
        id: p.id,
        content: p.content,
        author: p.authorName
      }));
      const prompt = `Ng\u01B0\u1EDDi d\xF9ng \u0111ang t\xECm ki\u1EBFm ch\u1EE7 \u0111\u1EC1: "${searchQuery}" tr\xEAn di\u1EC5n \u0111\xE0n H\xF3a H\u1ECDc.
D\u01B0\u1EDBi \u0111\xE2y l\xE0 danh s\xE1ch c\xE1c b\xE0i vi\u1EBFt hi\u1EC7n c\xF3:
${JSON.stringify(postSummaries, null, 2)}

H\xE3y ph\xE2n t\xEDch ng\u1EEF ngh\u0129a v\xE0 ng\u1EEF c\u1EA3nh ch\u1EE7 \u0111\u1EC1, ch\u1ECDn ra c\xE1c ID b\xE0i vi\u1EBFt c\xF3 li\xEAn quan nh\u1EA5t t\u1EDBi t\u1EEB kh\xF3a t\xECm ki\u1EBFm (k\u1EC3 c\u1EA3 t\u1EEB \u0111\u1ED3ng ngh\u0129a ho\u1EB7c ch\u1EE7 \u0111\u1EC1 h\xF3a h\u1ECDc li\xEAn quan), \u0111\u1ED3ng th\u1EDDi \u0111\u01B0a ra 1 c\xE2u ph\xE2n t\xEDch ng\u1EAFn g\u1ECDn t\u1ED5ng quan v\u1EC1 k\u1EBFt qu\u1EA3 t\xECm ki\u1EBFm.

Tr\u1EA3 v\u1EC1 DUY NH\u1EA4T JSON theo \u0111\u1ECBnh d\u1EA1ng:
{
  "matchingIds": ["id1", "id2"],
  "analysis": "AI Ph\xE2n t\xEDch: T\xECm th\u1EA5y X b\xE0i vi\u1EBFt li\xEAn quan \u0111\u1EBFn ch\u1EE7 \u0111\u1EC1..."
}`;
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json({
        matchingIds: parsed.matchingIds || [],
        analysis: parsed.analysis || ""
      });
    } catch (e) {
      console.error("AI Search Error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const viteTrungTam = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa",
      root: import_path.default.join(rootPath, "trung-tam"),
      base: "/trung-tam/"
    });
    app.use("/trung-tam", viteTrungTam.middlewares);
    const viteDauTruong = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa",
      root: import_path.default.join(rootPath, "dau-truong"),
      base: "/dau-truong/"
    });
    app.use("/dau-truong", viteDauTruong.middlewares);
    const viteNhanDien = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa",
      root: import_path.default.join(rootPath, "tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh"),
      base: "/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/"
    });
    app.use("/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh", viteNhanDien.middlewares);
    const viteChuoi = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa",
      root: import_path.default.join(rootPath, "tien-ich/phuong-trinh/chuoi-phan-ung"),
      base: "/tien-ich/phuong-trinh/chuoi-phan-ung/"
    });
    app.use("/tien-ich/phuong-trinh/chuoi-phan-ung", viteChuoi.middlewares);
    app.use(import_express.default.static(rootPath));
  } else {
    app.use(import_express.default.static(rootPath));
    app.get("/trung-tam/*", (req, res) => {
      res.sendFile(import_path.default.join(rootPath, "trung-tam/index.html"));
    });
    app.get("/dau-truong/*", (req, res) => {
      res.sendFile(import_path.default.join(rootPath, "dau-truong/index.html"));
    });
    app.get("/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/*", (req, res) => {
      res.sendFile(import_path.default.join(rootPath, "tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/index.html"));
    });
    app.get("/tien-ich/phuong-trinh/chuoi-phan-ung/*", (req, res) => {
      res.sendFile(import_path.default.join(rootPath, "tien-ich/phuong-trinh/chuoi-phan-ung/index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
