import { validateUrlForSsrf } from "./ssrfGuard";

export interface FetchOptions {
  timeoutMs?: number;
  maxSizeBytes?: number;
  maxRedirects?: number;
  customHeaders?: Record<string, string>;
}

export interface FetchResult {
  html: string;
  finalUrl: string;
  contentType: string;
  statusCode: number;
  durationMs: number;
}

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 DkTestWebImporter/1.0";

/**
 * Tải HTML từ website an toàn, kiểm tra SSRF, chống redirect độc hại và giới hạn dung lượng.
 */
export async function safeFetchHtml(
  rawUrl: string,
  options?: FetchOptions
): Promise<FetchResult> {
  const timeoutMs = options?.timeoutMs || 18000;
  const maxSizeBytes = options?.maxSizeBytes || 10 * 1024 * 1024; // 10MB
  const maxRedirects = options?.maxRedirects ?? 5;

  let currentUrl = rawUrl;
  let redirectsCount = 0;
  const startTime = Date.now();

  while (redirectsCount <= maxRedirects) {
    // 1. Kiểm tra SSRF trước mỗi lượt kết nối
    const { url } = await validateUrlForSsrf(currentUrl);

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...(options?.customHeaders || {}),
        },
        signal: controller.signal,
        redirect: "manual", // Thủ công để kiểm tra SSRF trên từng redirection target
      });

      // Xử lý Redirect (301, 302, 303, 307, 308)
      if (
        response.status === 301 ||
        response.status === 302 ||
        response.status === 303 ||
        response.status === 307 ||
        response.status === 308
      ) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error(
            `Máy chủ trả về HTTP ${response.status} nhưng không có header Location để chuyển hướng.`
          );
        }

        const nextUrl = new URL(location, url).toString();
        currentUrl = nextUrl;
        redirectsCount++;
        continue;
      }

      if (!response.ok) {
        throw new Error(
          `Máy chủ trả về mã lỗi HTTP ${response.status} (${response.statusText || "Lỗi yêu cầu"}).`
        );
      }

      const contentType = response.headers.get("content-type") || "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml") &&
        !contentType.includes("text/plain")
      ) {
        throw new Error(
          `Định dạng phản hồi không phải là HTML (Content-Type: "${contentType}"). Không thể phân tích đề thi.`
        );
      }

      // Đọc stream với giới hạn dung lượng
      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > maxSizeBytes) {
        throw new Error(
          `Dung lượng trang web vượt quá giới hạn cho phép (${Math.round(
            maxSizeBytes / (1024 * 1024)
          )}MB).`
        );
      }

      const text = await response.text();
      if (text.length > maxSizeBytes) {
        throw new Error(
          `Nội dung HTML vượt quá giới hạn cho phép (${Math.round(
            maxSizeBytes / (1024 * 1024)
          )}MB).`
        );
      }

      const durationMs = Date.now() - startTime;
      return {
        html: text,
        finalUrl: url.toString(),
        contentType,
        statusCode: response.status,
        durationMs,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(
          `Kết nối đến website quá thời gian chờ (Timeout sau ${timeoutMs / 1000}s). Vui lòng kiểm tra lại đường truyền mạng của trang đích.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutTimer);
    }
  }

  throw new Error(`Quá số lần chuyển hướng cho phép (Max redirects: ${maxRedirects}).`);
}
