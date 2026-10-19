import express from 'express';
import { codeStudioRouter, handleStudioSharePage } from '../server/codeStudioRoutes.bundled.js';
export const config = { api: { bodyParser: false } };
export const maxDuration = 30;
const app = express();
app.use((req, _res, next) => {
  if (typeof req.query.slug === 'string') return handleStudioSharePage(req, _res);
  const match = Array.isArray(req.query.match) ? req.query.match.join('/') : req.query.match;
  if (typeof match === 'string') req.url = '/' + match.replace(/^\//, '');
  next();
});
app.use('/api/code-studio', codeStudioRouter); app.use('/', codeStudioRouter);
app.use((_req, res) => res.status(404).json({ error: 'Đường dẫn Code Studio không tồn tại.' }));
export default app;
