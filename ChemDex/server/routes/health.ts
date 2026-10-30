export default function handler(req: any, res: any) {
  res.status(200).json({
    status: "ok",
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.CHEMDEX_RELEASE_SHA || null,
    platformVersion: "2026-platform-upgrade",
    time: new Date().toISOString(),
  });
}
