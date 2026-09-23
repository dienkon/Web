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
export async function getAuthToken(): Promise<string> {
  try {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
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
 * Catches network failures, handles timeouts, and normalizes Vietnamese error messages.
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, timeoutMs = 20000, headers = {}, ...customConfig } = options;

  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = await getAuthToken();
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
    const adminToken = localStorage.getItem("admin_token") || localStorage.getItem("dktest:admin_token");
    if (adminToken) {
      requestHeaders["X-Admin-Token"] = adminToken;
    }
    const authRole = localStorage.getItem("auth_role") || localStorage.getItem("dktest:auth_role");
    if (authRole) {
      requestHeaders["X-Auth-Role"] = authRole;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(fullUrl, {
      ...customConfig,
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
      let friendlyMessage = data?.message || data?.error || "";

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
    clearTimeout(timeoutId);

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
