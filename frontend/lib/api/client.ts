/**
 * API client for the Smart Inventory System backend.
 * Centralises base URL configuration, JWT injection, and error handling.
 */

// ─── In-memory token store ────────────────────────────────────────────────────

let _token: string | null = null

export function getToken(): string | null {
  return _token
}

export function setToken(token: string): void {
  _token = token
}

export function clearToken(): void {
  _token = null
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─── Login redirect ───────────────────────────────────────────────────────────

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

/**
 * Authenticated fetch wrapper.
 *
 * - Prepends NEXT_PUBLIC_API_URL to every path.
 * - Injects `Authorization: Bearer <token>` when a token is stored.
 * - On HTTP 401 for authenticated routes: clears the token and redirects to /login.
 * - On HTTP 401 for the login route itself: throws ApiError so the form can display the error.
 * - On non-2xx: throws ApiError with the parsed error message.
 * - On 2xx: returns the raw Response (caller parses JSON as needed).
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  })

  // A 401 on the login endpoint means wrong credentials — do NOT redirect,
  // let the caller handle it so the form can display the error message.
  const isLoginRoute = path === '/api/auth/login'

  if (res.status === 401 && !isLoginRoute) {
    clearToken()
    redirectToLogin()
    throw new ApiError(401, 'Unauthorized — redirecting to login')
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
      // ignore JSON parse errors on error responses
    }
    throw new ApiError(res.status, message)
  }

  return res
}
