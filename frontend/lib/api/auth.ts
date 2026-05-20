const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function publicFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  return res
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const res = await publicFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  return res.json() as Promise<{ message: string }>
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<{ message: string }> {
  const res = await publicFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
  return res.json() as Promise<{ message: string }>
}
