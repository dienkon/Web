# DkTEST V3 - Vercel deployment

## Environment Variables

Set these in Vercel for Production (and Preview if needed):

- `GEMINI_API_KEY` = Gemini credential của project
- `GEMINI_MODEL` = `gemini-3.5-flash-lite`

Also set the existing Firebase `VITE_*` variables used by the frontend.

## Deploy

1. Push the entire project to GitHub.
2. Import the repository into Vercel.
3. Keep the project root at the folder containing `package.json` and `vercel.json`.
4. Deploy with the default Node.js settings.

`vercel.json` builds the Vite frontend into `dist` and keeps `/api/*` out of the SPA fallback.

## API endpoints

- `POST /api/ai/tutor`
- `POST /api/ai/analyze-exam`
- `POST /api/ai/generate-exam-prompt-stream`
- `POST /api/ai/generate-exam-stream` (multipart field: `file`, max 10 MB)
- `POST /api/ai/generate-exam` (multipart field: `file`, max 10 MB)
- `GET /api/health`

Word import accepts `.docx`. Mammoth is a DOCX-to-HTML converter; legacy `.doc` binaries are intentionally rejected by the UI instead of failing later in the server.

## Important

Never put `GEMINI_API_KEY` in frontend code or commit it to Git. The AI client reads it only from `process.env.GEMINI_API_KEY` on the server.
