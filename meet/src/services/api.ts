export const SERVER_URL = (import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');

export async function createRoom(): Promise<{ id: string; code: string; hostToken: string }> {
  const res = await fetch(`${SERVER_URL}/api/rooms`, { method: 'POST', signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Không thể tạo phòng. Hãy kiểm tra kết nối máy chủ và thử lại.');
  return res.json();
}
