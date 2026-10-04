import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (.env in lab or ChemDex root)
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import express from 'express';
import cors from 'cors';
import { resolveChemistryReaction } from './server/chemistryDb';
import { queryChemistryAI, CURRENT_GEMINI_MODEL } from './server/ai';
import { createServer as createViteServer } from 'vite';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 6767;

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // --- API Routes ---
  
  app.post('/api/experiment/mix', async (req, res) => {
    try {
      const { substances, volume, lang, isHeated } = req.body;
      
      if (!substances || !Array.isArray(substances)) {
        return res.status(400).json({ error: 'substances must be an array' });
      }

      // Layered Database-First Resolution (Memory -> Firestore -> Gemini Fallback)
      const { result, source, canonicalKey } = await resolveChemistryReaction(
        substances, 
        volume || 0.5, 
        lang || 'en', 
        isHeated || false
      );

      return res.json({
        ...result,
        _resolutionSource: source,
        _canonicalKey: canonicalKey
      });
    } catch (error: any) {
      console.error('[API Error in /api/experiment/mix]:', error);
      res.status(500).json({ error: error.message || 'Failed to process experiment' });
    }
  });

  app.post('/api/experiment/ai-query', async (req, res) => {
    try {
      const { equation, substances, userQuestion, temperature_c, isHeated, lang } = req.body;
      const analysis = await queryChemistryAI({
        equation,
        substances,
        userQuestion,
        temperature_c,
        isHeated,
        lang: lang || 'vi'
      });
      return res.json(analysis);
    } catch (error: any) {
      console.error('[API Error in /api/experiment/ai-query]:', error);
      res.status(500).json({ error: error.message || 'Failed to query chemistry AI' });
    }
  });

  // --- Vite Middleware (for development) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT} (AI Model: ${CURRENT_GEMINI_MODEL})`);
  });
}

startServer();
