import dotenv from 'dotenv';
import path from 'path';

// Load .env from lab or root workspace
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const PORT = parseInt(process.env.PORT || '5174', 10);
const inMemoryServerKnowledge = new Map<string, any>();

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Gemini Client Initialization
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (apiKey) {
    try {
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'chemdex-virtual-lab',
          },
        },
      });
      console.log('✅ Gemini GenAI Client initialized successfully.');
    } catch (e) {
      console.error('❌ Failed to initialize Gemini GenAI Client:', e);
    }
  } else {
    console.warn('⚠️ GEMINI_API_KEY is not set. Gemini Fallback Tier will be simulated or offline.');
  }

  // --- API Endpoints ---

  // 1. GET /api/reaction/:key
  app.get('/api/reaction/:key', (req, res) => {
    const key = decodeURIComponent(req.params.key);
    if (inMemoryServerKnowledge.has(key)) {
      return res.json(inMemoryServerKnowledge.get(key));
    }
    return res.status(404).json({ error: 'Reaction not found in remote cache' });
  });

  // 2. POST /api/reaction/cache
  app.post('/api/reaction/cache', (req, res) => {
    const data = req.body;
    if (data && data.canonicalKey) {
      inMemoryServerKnowledge.set(data.canonicalKey, data);
      return res.json({ success: true, storedKey: data.canonicalKey });
    }
    return res.status(400).json({ error: 'Invalid reaction payload' });
  });

  // 3. POST /api/reaction/resolve (Tier 4 Gemini Fallback)
  app.post('/api/reaction/resolve', async (req, res) => {
    const { canonicalKey, context } = req.body;

    if (!canonicalKey) {
      return res.status(400).json({ error: 'canonicalKey is required' });
    }

    if (!ai) {
      return res.status(503).json({ error: 'Gemini AI not configured on server' });
    }

    try {
      const prompt = `
Bạn là một nhà hóa học tính toán và chuyên gia sư phạm hóa học trực thuộc hệ thống phòng thí nghiệm ảo ChemDex.
Người dùng vừa cho tương tác các chất sau trong bình thí nghiệm:
- Khóa phản ứng: ${canonicalKey}
- Danh sách chất và lượng: ${JSON.stringify(context.reactants)}
- Trạng thái đun nóng: ${context.isHeating ? 'Đang đun nóng ngọn lửa' : 'Nhiệt độ phòng (25°C)'}
- pH hiện tại: ${context.currentPh}
- Nhiệt độ hiện tại: ${context.temperatureC}°C

HÃY PHÂN TÍCH VÀ TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ (Không thêm bất kỳ markdown backticks, không giải thích ngoài JSON) theo đúng cấu trúc sau:
{
  "id": "rxn_${Date.now()}",
  "canonicalKey": "${canonicalKey}",
  "schemaVersion": 1,
  "equation": "Phương trình phân tử dạng chuẩn quốc tế, ví dụ: A(aq) + B(aq) -> C(s) + D(aq)",
  "ionicEquation": "Phương trình ion đầy đủ",
  "netIonicEquation": "Phương trình ion thu gọn",
  "reactionTypeVi": "Tên loại phản ứng bằng Tiếng Việt",
  "conditionsVi": "Điều kiện phản ứng (nhiệt độ, xúc tác)",
  "reactants": [
    { "chemicalId": "...", "formula": "...", "coefficient": 1, "state": "aq" }
  ],
  "products": [
    { "chemicalId": "...", "formula": "...", "coefficient": 1, "state": "s" }
  ],
  "observations": {
    "phenomenonVi": "Mô tả hiện tượng trực quan sinh động bằng Tiếng Việt (đổi màu, tạo tủa, sủi bọt)",
    "liquidColor": { "r": 240, "g": 245, "b": 255, "a": 0.2, "hex": "#f0f5ff" },
    "precipitate": null hoặc { "chemicalId": "...", "formula": "...", "nameVi": "...", "colorHex": "#ffffff", "type": "crystalline|gelatinous|fine_powder|metallic", "descriptionVi": "..." },
    "gas": null hoặc { "chemicalId": "...", "formula": "...", "nameVi": "...", "bubbleRate": 0.7, "descriptionVi": "..." },
    "temperatureChangeC": 1.5,
    "resultingPhEstimate": 7.0
  },
  "educationalExplanationVi": {
    "titleVi": "Tiêu đề bài học Tiếng Việt",
    "summaryVi": "Tóm tắt bản chất phản ứng Tiếng Việt",
    "detailVi": "Giải thích chi tiết sư phạm Tiếng Việt",
    "realWorldApplicationVi": "Ứng dụng thực tế đời sống Tiếng Việt"
  },
  "safetyAdviceVi": {
    "level": "NOTICE|WARNING|CRITICAL",
    "messageVi": "Cảnh báo an toàn Tiếng Việt",
    "ppeRecommendedVi": ["Kính bảo hộ", "Găng tay"],
    "wasteHandlingVi": "Hướng dẫn xử lý chất thải an toàn Tiếng Việt"
  }
}
LƯU Ý: Tên hóa chất, công thức dạng quốc tế (HCl, NaOH, Cu, v.v.). Toàn bộ lời giải thích, hiện tượng, cảnh báo bằng Tiếng Việt chuẩn mực.
`;

      const targetModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
      let response;
      try {
        response = await ai.models.generateContent({
          model: targetModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
      } catch (genErr: any) {
        // Fallback to gemini-2.5-flash if 3.5 preview is unavailable
        console.warn(`⚠️ Model ${targetModel} error, falling back to gemini-2.5-flash:`, genErr?.message);
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
      }

      const text = response.text || '';
      const cleanJson = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Cache server-side
      inMemoryServerKnowledge.set(canonicalKey, parsed);

      return res.json(parsed);
    } catch (err: any) {
      console.error('❌ Error during Gemini reaction resolution:', err);
      return res.status(500).json({ error: 'AI resolution failed', details: err.message });
    }
  });

  // Setup Vite development server or static serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 ChemDex 3D Virtual Lab running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start ChemDex server:', err);
});
