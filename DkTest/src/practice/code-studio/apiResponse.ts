/** Gateways may return plain text/HTML when a function cannot start. */
export async function readStudioJson(response: Response, fallback: string): Promise<Record<string, any>> {
  const text = await response.text();
  let data: any;
  try { data = JSON.parse(text); }
  catch { throw new Error(`${fallback} Máy chủ trả về phản hồi không hợp lệ (HTTP ${response.status}). Vui lòng thử lại sau.`); }
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error.slice(0, 600) : `${fallback} (HTTP ${response.status}).`);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${fallback} Dữ liệu phản hồi không hợp lệ.`);
  return data;
}
