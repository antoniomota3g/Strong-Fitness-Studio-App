const defaultBaseUrl = 'http://localhost:8000'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  })

  const contentType = res.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json') ? await res.json() : await res.text()

  if (!res.ok) {
    const detail = (body as any)?.detail ?? res.statusText
    throw new ApiError(String(detail), res.status, body)
  }

  return body as T
}
