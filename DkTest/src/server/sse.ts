

export function initSse(res: any) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

export function sendSse(res: any, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function sendSseRaw(res: any, payload: string) {
  res.write(`data: ${payload}\n\n`);
}

export function sendSseError(res: any, error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";
  sendSse(res, { type: "error", message });
  res.end();
}
