export interface AuthUser {
  id: number;
  email: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const LEGACY_AUTH_TOKEN_KEY = 'authToken';
const USER_ROLE_KEY = 'userRole';
const INVALID_STORAGE_VALUES = new Set(['', 'null', 'undefined']);

function clearAuthStorage() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');

    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isValidToken(token: string | null): token is string {
  if (!token) return false;

  const normalizedToken = token.trim();
  if (INVALID_STORAGE_VALUES.has(normalizedToken)) {
    return false;
  }

  const payload = decodeJwtPayload(normalizedToken);
  if (!payload) {
    return false;
  }

  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
    return false;
  }

  return true;
}

export function getAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null;

  const storedToken = localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_AUTH_TOKEN_KEY);
  if (!isValidToken(storedToken)) {
    if (storedToken) {
      clearAuthStorage();
    }
    return null;
  }

  if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
    localStorage.setItem(AUTH_TOKEN_KEY, storedToken);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  }

  return storedToken;
}

export function getAuthUser(): AuthUser | null {
  if (!getAuthToken() || typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    clearAuthStorage();
    return null;
  }
}

function saveAuth(resp: AuthResponse) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, resp.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(resp.user));
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  localStorage.setItem(USER_ROLE_KEY, resp.user.role || 'user');
}

async function request(path: string, body: unknown): Promise<AuthResponse> {
  const res = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || 'Request failed');
  }
  saveAuth(data as AuthResponse);
  return data as AuthResponse;
}

export async function register(email: string, password: string): Promise<AuthUser> {
  const resp = await request('register', { email, password });
  return resp.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const resp = await request('login', { email, password });
  return resp.user;
}

export function logout() {
  clearAuthStorage();
}
