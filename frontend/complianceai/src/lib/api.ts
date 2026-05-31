// ─── Central API Client ───────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8001') + '/api';

function getToken(): string | null {
  return localStorage.getItem('ca_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('ca_token');
    localStorage.removeItem('ca_user');
    window.location.href = '/welcome';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'API error');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest  { email: string; password: string; }
export interface RegisterRequest { name: string; email: string; password: string; role: 'ADMIN' | 'USER'; }
export interface TokenResponse { access_token: string; token_type: string; user: UserResponse; }
export interface UserResponse  { id: string; name: string; email: string; role: 'ADMIN' | 'USER'; }

export const auth = {
  login:    (data: LoginRequest)    => request<TokenResponse>('/auth/login',    { method: 'POST', body: JSON.stringify(data) }),
  register: (data: RegisterRequest) => request<TokenResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<UserResponse>('/auth/me'),
};

// ─── Documents ────────────────────────────────────────────────────────────────

export interface RetrievedChunk {
  chunk_id: number;
  score: number;
  source: string;
  text: string;
}

export interface ArticleDetail {
  id: string;
  number: string;
  title: string;
  status: 'Uyumlu' | 'Kısmen Uyumlu' | 'Uyumsuz';
  similarity: number;
  text: string;
  yokReference: string;
  yokText: string;
  reasoning: string[];
  suggestion: string;
}

export interface DocumentSummary {
  id: string;
  name: string;
  category: string;
  status: 'Uyumlu' | 'Kısmen Uyumlu' | 'Uyumsuz';
  complianceScore: number;
  articleCount: number;
  nonCompliantArticles: string[];
  uploadDate: string;
  pipeline?: string;
  model?: string;
}

export interface DocumentDetail extends DocumentSummary {
  articles: ArticleDetail[];
  fullText?: string;
  retrievedChunks?: RetrievedChunk[];
}

export const documents = {
  list: () => request<DocumentSummary[]>('/documents'),

  get: (id: string) => request<DocumentDetail>(`/documents/${id}`),

  pdfUrl: (id: string) => `${BASE}/documents/${id}/pdf`,

  upload: (file: File, pipeline = 'hybrid', model = 'gpt-4o-mini') => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE}/analyze?pipeline=${pipeline}&model=${model}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(err.detail ?? 'Upload failed');
      }
      return res.json() as Promise<DocumentDetail>;
    });
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  stats: { activeAnalyses: number; completed: number; critical: number; pending: number };
  recentDocuments: { id: string; name: string; status: string; complianceScore: number; uploadDate: string }[];
  trendData: { month: string; uyumlu: number; kismen: number; uyumsuz: number }[];
  categoryScores: { name: string; score: number }[];
  systemHealth: { ragModel: string; embeddingApi: string; database: string };
}

export const dashboard = {
  metrics: () => request<DashboardMetrics>('/dashboard/metrics'),
};

// ─── Experiments ──────────────────────────────────────────────────────────────

export interface ExperimentRow {
  pipeline: string; model: string; accuracy: number;
  mean_score: number; latency: number; cost: number;
}

export const experiments = {
  list: () => request<{ rows: ExperimentRow[] }>('/experiments'),
};

// ─── Reports ─────────────────────────────────────────────────────────────────

export const reports = {
  trends:     () => request<{ month: string; uyumlu: number; kismen: number; uyumsuz: number }[]>('/reports/trends'),
  categories: () => request<{ name: string; score: number }[]>('/reports/categories'),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface YokDocument {
  id: string; title: string; filename: string; version: string; status: string; lastUpdate: string;
}

export const admin = {
  yokDocuments: {
    list:   ()          => request<YokDocument[]>('/admin/yok-documents'),
    delete: (id: string) => request<void>(`/admin/yok-documents/${id}`, { method: 'DELETE' }),
  },
  users: {
    list:   ()          => request<UserResponse[]>('/admin/users'),
    delete: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  },
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage { question: string; answer: string; createdAt: string; }

export const chat = {
  send:    (question: string) => request<{ answer: string; sources: string[] }>('/chat', {
    method: 'POST', body: JSON.stringify({ question }),
  }),
  history: () => request<ChatMessage[]>('/chat/history'),
};
