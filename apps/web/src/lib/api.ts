import { API_URL } from "./constants";

function parseApiErrorDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: string }).msg);
        }
        return JSON.stringify(item);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: string }).message);
  }
  return "Request failed";
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
  /** Abort the request after this many ms so the UI can never hang forever. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers, timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = options;

  // If the caller didn't supply a signal, enforce a timeout so a hung backend
  // can never leave the UI stuck in a loading state.
  const controller =
    signal ? undefined : new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (controller) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: signal ?? controller?.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 408);
    }
    // Network errors (backend down, DNS, offline) — surface a clear message.
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!response.ok) {
    let message = "Request failed";
    try {
      const body = await response.json();
      message = parseApiErrorDetail(body.detail ?? body.message ?? message);
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getGitHubLoginUrl(): string {
  return `${API_URL}/api/v1/auth/github/login`;
}
