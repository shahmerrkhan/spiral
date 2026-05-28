const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL || '';

export const API_BASE_URL = configuredApiUrl.replace(/\/$/, '');

export function assertApiConfigured() {
  if (!API_BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured. Spiral cannot talk to the backend yet.');
  }
}

export type AuthUser = {
  id: string;
  email: string;
  createdAt?: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export const AUTH_STORAGE_KEY = 'spiral_auth_session';

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const setTimer = typeof window === 'undefined' ? globalThis.setTimeout : window.setTimeout.bind(window);
  const clearTimer = typeof window === 'undefined' ? globalThis.clearTimeout : window.clearTimeout.bind(window);
  const timeoutId = setTimer(() => controller.abort(), timeoutMs);

  try {
    const signal = init.signal;
    if (signal?.aborted) {
      controller.abort();
    } else if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    return await fetch(input, { ...init, signal: controller.signal, cache: init.cache ?? 'no-store' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`The backend did not respond within ${Math.round(timeoutMs / 1000)} seconds. Check your connection and try again.`);
    }
    throw error;
  } finally {
    clearTimer(timeoutId);
  }
}

async function parseApiResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'The server coughed up static. Try again.');
  }
  return data;
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function saveSession(session: AuthSession) {
  if (typeof window === 'undefined') return;

  const token = typeof session?.token === 'string' ? session.token : '';
  const user = session?.user;

  if (!token || !user?.id || !user?.email) {
    console.error('[Auth] Refusing to store incomplete session', {
      hasToken: Boolean(token),
      hasUserId: Boolean(user?.id),
      hasUserEmail: Boolean(user?.email),
    });
    throw new Error('Login succeeded, but the session response was incomplete. Please try again.');
  }

  const normalizedSession: AuthSession = {
    token,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    },
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalizedSession));

  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) {
    throw new Error('Login succeeded, but the browser refused to save the session. Check storage permissions and try again.');
  }

  console.info('[Auth] Session saved to localStorage', { key: AUTH_STORAGE_KEY, email: normalizedSession.user.email });
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthSession> {
  assertApiConfigured();
  const data = await fetchWithTimeout(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(parseApiResponse);
  saveSession(data);
  return data;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  assertApiConfigured();
  const normalizedEmail = email.trim().toLowerCase();
  const loginUrl = `${API_BASE_URL}/api/auth/login`;

  console.info('[Login] Sending authentication request', {
    url: loginUrl,
    email: normalizedEmail || '<missing>',
    hasPassword: Boolean(password),
  });

  try {
    const data = await fetchWithTimeout(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password }),
    }).then(parseApiResponse);

    console.info('[Login] Authentication succeeded', { email: data?.user?.email || normalizedEmail });
    saveSession(data);
    return data;
  } catch (error) {
    console.error('[Login] Authentication request failed', {
      url: loginUrl,
      email: normalizedEmail || '<missing>',
      message: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof Error ? error : new Error('Login failed before Spiral could understand why. Try again.');
  }
}

export async function verifyStoredSession(): Promise<AuthSession | null> {
  assertApiConfigured();
  const session = getStoredSession();
  if (!session?.token) return null;

  try {
    const data = await fetchWithTimeout(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${session.token}` },
    }).then(parseApiResponse);
    const verified: AuthSession = { token: session.token, user: data.user as AuthUser };
    saveSession(verified);
    return verified;
  } catch {
    clearSession();
    return null;
  }
}

export async function signOut() {
  const session = getStoredSession();
  if (session?.token && API_BASE_URL) {
    await fetchWithTimeout(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
    }).catch(() => undefined);
  }
  clearSession();
}
