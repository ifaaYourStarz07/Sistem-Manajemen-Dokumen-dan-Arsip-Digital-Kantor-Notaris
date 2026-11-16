const TOKEN_KEY = 'notarydutty_token';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly details: Record<string, string> | null;

  constructor(message: string, status: number, details?: Record<string, string> | null) {
    super(message);
    this.status = status;
    this.details = details ?? null;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

let onUnauthorizedCallback: (() => void) | null = null;

export function registerUnauthorizedHandler(cb: () => void): void {
  onUnauthorizedCallback = cb;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    if (response.status === 401 && onUnauthorizedCallback && !path.includes('/api/auth/login')) {
      onUnauthorizedCallback();
    }
    const message =
      (payload && typeof payload.error === 'string' && payload.error) ||
      'Terjadi kesalahan saat memproses permintaan.';
    const details =
      payload && payload.details && typeof payload.details === 'object'
        ? (payload.details as Record<string, string>)
        : null;
    throw new ApiClientError(message, response.status, details);
  }

  return payload as T;
}
