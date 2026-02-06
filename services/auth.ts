export interface AuthUser {
  id: number;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export function getAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('authToken');
}

export function getAuthUser(): AuthUser | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function saveAuth(resp: AuthResponse) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, resp.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(resp.user));
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
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
