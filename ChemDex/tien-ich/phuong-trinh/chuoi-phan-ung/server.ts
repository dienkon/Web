import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createCatalogIndex, solveCatalogRequest } from '../../../shared/chemistry/reaction-catalog.mjs';

dotenv.config();
const app = express();
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT phải là số nguyên từ 1 đến 65535.');
app.use(express.json());
const index = createCatalogIndex(JSON.parse(fs.readFileSync(new URL('../../../shared/reaction-catalog.generated.json', import.meta.url), 'utf8')));
const chainHandler = (req: any, res: any) => {
  const result = solveCatalogRequest(index, req.body);
  return res.status(result.status === 'invalid' ? 400 : 200).json(result);
};
app.post('/api/gemini/chain/', chainHandler);
app.post('/api/analyze', (req, res) => chainHandler({method:req.method, body:{...req.body, action:'analyze'}}, res));
app.post('/api/generate', (req, res) => chainHandler({method:req.method, body:{...req.body, action:'generate'}}, res));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({server:{middlewareMode:true}, appType:'spa'});
    app.use(vite.middlewares);
  } else {
    const directory = path.join(process.cwd(), 'dist');
    const entry = path.join(directory, fs.existsSync(path.join(directory, 'index.html')) ? 'index.html' : 'index.source.html');
    app.use('/tien-ich/phuong-trinh/chuoi-phan-ung', express.static(directory));
    app.use(express.static(directory));
    app.get('*', (_req, res) => res.sendFile(entry));
  }
  app.listen(port, '0.0.0.0', () => console.log(`[Server] http://localhost:${port}`));
}
startServer().catch(error => { console.error('Failed to start server:', error); process.exitCode = 1; });
