import { getAuthToken } from './auth';

export interface ScriptItem {
  id: number;
  title: string | null;
  content: string;
  model_provider: string | null;
  token_used: number;
  created_at: string;
}

export interface GenerateScriptParams {
  title?: string;
  description?: string;
  style?: string;
  length?: string;
  provider?: string;
}

export interface GenerateScriptResponse extends ScriptItem {
  billing?: {
    tokens: number;
    unit_price: number;
    amount: number;
  };
}

function authHeaders() {
  const token = getAuthToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export async function fetchScripts(): Promise<ScriptItem[]> {
  const res = await fetch('/api/scripts', {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Failed to load scripts');
  }

  return (await res.json()) as ScriptItem[];
}

export async function generateScript(params: GenerateScriptParams): Promise<GenerateScriptResponse> {
  const res = await fetch('/api/scripts/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'Failed to generate script');
  }
  return data as GenerateScriptResponse;
}
