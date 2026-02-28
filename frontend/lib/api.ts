const DEFAULT_API_BASE = "http://127.0.0.1:9010";

export function getApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    DEFAULT_API_BASE;
  return raw.replace(/\/+$/, "");
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  authToken?: string;
};

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

async function withTimeout(url: string, options: ApiRequestOptions): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    authToken,
    headers,
    ...requestInit
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestHeaders = new Headers(headers || {});
    if (authToken && !requestHeaders.has("Authorization")) {
      requestHeaders.set("Authorization", `Bearer ${authToken}`);
    }

    return await fetch(url, {
      ...requestInit,
      headers: requestHeaders,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiRequestRaw(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const {
    retries = 1,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    ...requestOptions
  } = options;

  const url = buildApiUrl(path);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await withTimeout(url, requestOptions);

      if (!response.ok) {
        const message = await parseErrorMessage(response);
        const shouldRetry = attempt < retries && shouldRetryStatus(response.status);
        if (shouldRetry) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }
        throw new Error(message);
      }

      return response;
    } catch (error: any) {
      if (attempt >= retries) {
        throw new Error(error?.message || "Request failed");
      }
      await sleep(retryDelayMs * (attempt + 1));
    }
  }

  throw new Error("Request failed");
}

export async function apiRequest<T = any>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await apiRequestRaw(path, options);
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.error === "string") return data.error;
  } catch {
    try {
      const text = await response.text();
      if (text) return text;
    } catch {
      return `Request failed (${response.status})`;
    }
  }
  return `Request failed (${response.status})`;
}
