import { describe, expect, it } from 'vitest';
import { readStudioJson } from '../src/practice/code-studio/apiResponse';

describe('Code Studio gateway responses', () => {
  it('turns the Vercel plain-text crash into a readable error', async () => {
    await expect(readStudioJson(new Response('A server error has occurred\nFUNCTION_INVOCATION_FAILED', { status: 500 }), 'Không tạo được link.')).rejects.toThrow('HTTP 500');
  });
  it('handles HTML fallbacks and empty responses without leaking their contents', async () => {
    for (const body of ['<html>private stack trace</html>', '']) {
      await expect(readStudioJson(new Response(body), 'Không tạo được link.')).rejects.toThrow('phản hồi không hợp lệ');
    }
  });
  it('keeps actionable API errors and rejects malformed success data', async () => {
    await expect(readStudioJson(Response.json({ error: 'Firebase chưa cho phép lưu chia sẻ.' }, { status: 503 }), 'Fallback')).rejects.toThrow('Firebase chưa cho phép');
    await expect(readStudioJson(Response.json(null), 'Fallback')).rejects.toThrow('Dữ liệu phản hồi');
    await expect(readStudioJson(Response.json([]), 'Fallback')).rejects.toThrow('Dữ liệu phản hồi');
    expect(await readStudioJson(Response.json({ path: '/s/site.0123456789abcdef' }), 'Fallback')).toEqual({ path: '/s/site.0123456789abcdef' });
  });
});
