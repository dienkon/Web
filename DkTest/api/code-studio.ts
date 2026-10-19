import express from 'express';
import { codeStudioRouter, handleStudioSharePage } from '../server/routes/codeStudioRoutes.js';
export const config = { api: { bodyParser: false } };
export const maxDuration = 30;
const app = express();
app.use((req, _res, next) => {
  if (typeof req.query.slug === 'string') return handleStudioSharePage(req, _res);
  if (typeof req.query.match === 'string') req.url = '/' + req.query.match.replace(/^\//, '');
  next();
});
app.use('/api/code-studio', codeStudioRouter); app.use('/', codeStudioRouter);
export default app;
