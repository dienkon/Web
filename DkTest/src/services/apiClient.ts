import { auth } from "./firebase/config";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Resolves API base URL from Vite environment variables or defaults to current origin.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env?.VITE_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.startsWith("http")) {
    return envUrl.replace(/\/+$/, "");
  }
  return "";
}

/**
 * Retrieves valid Bearer ID Token from currently signed-in Firebase user
 */
export async function getAuthToken(forceRefresh = false): Promise<string> {
  try {
    if (!auth) return "";
    if (!auth.currentUser && typeof auth.authStateReady === "function") {
      await Promise.race([
        auth.authStateReady(),
        new Promise<void>((resolve) => setTimeout(resolve, 6000)),
      ]);
    }
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken(forceRefresh);
      } catch (innerErr) {
        if (!forceRefresh) {
          return await auth.currentUser.getIdToken(true);
        }
        throw innerErr;
      }
    }
  } catch (err) {
    console.warn("[apiClient] Could not fetch Firebase ID token:", err);
  }
  return "";
}

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  timeoutMs?: number;
}

/**
 * Central API Client for all backend requests.
 * Catches network failures, handles timeouts, auto-retries expired tokens on 401, and normalizes Vietnamese error messages.
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ApiError(
      "Chức năng này cần kết nối mạng. Bạn vẫn có thể làm các đề đã tải trong kho offline.",
      0
    );
  }
  const { requiresAuth = true, timeoutMs = 20000, headers = {}, ...customConfig } = options;

  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Cache busting for GET requests to guarantee fresh server data on reload/F5
  const isGet = !customConfig.method || customConfig.method.toUpperCase() === "GET";
  const separator = cleanEndpoint.includes("?") ? "&" : "?";
  const finalEndpoint = isGet ? `${cleanEndpoint}${separator}_t=${Date.now()}` : cleanEndpoint;
  const fullUrl = `${baseUrl}${finalEndpoint}`;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    ...(headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = await getAuthToken(false);
    if (!token) {
      throw new ApiError("Cần đăng nhập lại bằng tài khoản Firebase để thực hiện thao tác này.", 401);
    }
    requestHeaders["Authorization"] = "Bearer " + token;
  }

  const executeFetch = async (headersToSend: Record<string, string>) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(fullUrl, {
        ...customConfig,
        headers: headersToSend,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  try {
    let response = await executeFetch(requestHeaders);

    // If token crossed the 60-minute expiry boundary (e.g. after tab sleep / long video session),
    // automatically force-refresh the Firebase ID token and retry the request ONCE.
    if (response.status === 401 && requiresAuth && auth?.currentUser) {
      const refreshedToken = await getAuthToken(true);
      if (refreshedToken && `Bearer ${refreshedToken}` !== requestHeaders["Authorization"]) {
        requestHeaders["Authorization"] = `Bearer ${refreshedToken}`;
        response = await executeFetch(requestHeaders);
      }
    }

    // Parse JSON or fallback to text
    let data: any = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => "");
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      let friendlyMessage = "";
      if (typeof data?.message === "string" && data.message.trim()) {
        friendlyMessage = data.message;
      } else if (typeof data?.error === "string" && data.error.trim()) {
        friendlyMessage = data.error;
      } else if (typeof data?.error?.message === "string" && data.error.message.trim()) {
        friendlyMessage = data.error.message;
      } else if (typeof data === "string" && data.trim() && !data.trim().startsWith("<")) {
        friendlyMessage = data;
      }

      if (!friendlyMessage) {
        switch (response.status) {
          case 400:
            friendlyMessage = "Yêu cầu không hợp lệ hoặc dữ liệu gửi lên bị thiếu.";
            break;
          case 401:
            friendlyMessage = "Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập.";
            break;
          case 403:
            friendlyMessage = "Bạn không có quyền thực hiện thao tác này.";
            break;
          case 404:
            friendlyMessage = "Không tìm thấy tài nguyên yêu cầu trên máy chủ.";
            break;
          case 409:
            friendlyMessage = "Dữ liệu bị trùng lặp hoặc xung đột với bản ghi hiện có.";
            break;
          case 500:
            friendlyMessage = "Máy chủ gặp sự cố nội bộ. Vui lòng thử lại sau ít phút.";
            break;
          case 503:
            friendlyMessage = "Dịch vụ hoặc cơ sở dữ liệu tạm thời chưa sẵn sàng.";
            break;
          default:
            friendlyMessage = `Lỗi máy chủ (${response.status}).`;
        }
      }

      throw new ApiError(friendlyMessage, response.status, data);
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new ApiError(
        "Kết nối tới máy chủ quá thời gian chờ (timeout). Vui lòng kiểm tra mạng và thử lại.",
        408
      );
    }

    // Network error / Failed to fetch
    console.error(`[apiClient] Network request failed for ${fullUrl}:`, error);
    throw new ApiError(
      "Không thể kết nối tới máy chủ (Network Error). Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.",
      0
    );
  }
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: "DELETE" }),
};
