# DkTEST V3 - Vercel deployment

## Environment variables
Set these in Vercel Production (and Preview if needed):

- `GEMINI_API_KEY` = Gemini credential accepted by the Gemini API for your Google project.
- `GEMINI_MODEL` = `gemini-3.5-flash-lite` (or another model available to the credential/project).

Do not commit `.env` or API keys to Git.

## API functions
Vercel discovers these directly under `/api`:

- `GET /api/health`
- `POST /api/ai/tutor`
- `POST /api/ai/analyze-exam`
- `POST /api/ai/generate-exam`
- `POST /api/ai/generate-exam-stream`
- `POST /api/ai/generate-exam-prompt-stream`

The handlers intentionally use plain `req`/`res` and do not import `@vercel/node`.

## ESM imports
Backend-relative imports use explicit `.js` extensions so Node ESM can resolve the compiled modules on Vercel.

## Deploy
Push the project to the connected Git repository and redeploy the latest production commit. If environment variables were changed, create a new deployment so the function receives the new values.
