const upstream = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const cache = new Map<string, { expires: number; value: any }>();
let nextRequest = 0;
export async function pubchem(path: string, text = false): Promise<any> {
  const key = path,
    hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const wait = Math.max(0, nextRequest - Date.now());
  if (wait > 2500)
    throw Object.assign(new Error("Tra cứu đang bận, vui lòng thử lại sau."), {
      status: 429,
    });
  nextRequest = Date.now() + wait + 500;
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(upstream + path, {
      signal: AbortSignal.timeout(12000),
      headers: { Accept: text ? "chemical/x-mdl-sdfile" : "application/json" },
    });
    if ([429, 503].includes(response.status) && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      continue;
    }
    if (!response.ok)
      throw Object.assign(
        new Error(
          response.status === 404
            ? "Không tìm thấy dữ liệu phù hợp."
            : "PubChem đang không khả dụng. Vui lòng dùng kho cấu trúc sẵn hoặc thử lại sau.",
        ),
        { status: response.status === 404 ? 404 : 503 },
      );
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("html"))
      throw Object.assign(
        new Error(
          "PubChem tạm từ chối truy cập. Kho cấu trúc sẵn vẫn hoạt động.",
        ),
        { status: 503 },
      );
    const value = text ? await response.text() : await response.json();
    if (text && (!value.includes("M  END") || value.length > 2_000_000))
      throw Object.assign(
        new Error("Dữ liệu cấu trúc không hợp lệ hoặc quá lớn."),
        { status: 502 },
      );
    if (cache.size > 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 3600000, value });
    return value;
  }
  throw Object.assign(new Error("PubChem đang bận."), { status: 503 });
}
export function fail(res: any, error: any) {
  return res
    .status(error?.status ?? 503)
    .json({
      error: error?.status
        ? error.message
        : "Dịch vụ tra cứu đang không khả dụng. Vui lòng thử lại sau.",
    });
}
