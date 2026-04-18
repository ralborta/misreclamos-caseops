const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

function getToken(): string | null {
  return localStorage.getItem('caseops_token');
}

async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) {
    localStorage.removeItem('caseops_token');
    localStorage.removeItem('caseops_user');
    window.location.href = '/login';
    throw new Error('No autorizado');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || 'Error en la solicitud');
  }

  return res.json();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('caseops_token');
    localStorage.removeItem('caseops_user');
    window.location.href = '/login';
    throw new Error('No autorizado');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || 'Error en la solicitud');
  }

  return res.json();
}

// Auth
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<any>('/auth/me'),
  },

  cases: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ cases: any[]; total: number; page: number; limit: number }>(`/cases${qs}`);
    },
    get: (id: string) => request<any>(`/cases/${id}`),
    create: (data: any) => request<any>('/cases', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  users: {
    list: () => request<any[]>('/users'),
  },

  alerts: {
    list: () =>
      request<{ alerts: any[]; total: number }>('/alerts').then((r) => r.alerts),
    resolve: (id: string) =>
      request<any>(`/alerts/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({}) }),
  },

  agenda: () =>
    request<{
      weekStart: string;
      weekEnd: string;
      tasksInWeek: any[];
      upcomingSoon: any[];
      overdueOpen: any[];
    }>('/agenda'),

  notes: {
    create: (caseId: string, data: { content: string; type?: string; visibility?: string }) =>
      request<any>(`/cases/${caseId}/notes`, { method: 'POST', body: JSON.stringify(data) }),
    update: (caseId: string, id: string, data: { content: string }) =>
      request<any>(`/cases/${caseId}/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (caseId: string, id: string) =>
      request<{ ok: boolean }>(`/cases/${caseId}/notes/${id}`, { method: 'DELETE' }),
  },

  documents: {
    create: (caseId: string, data: { name: string; type: string; size?: string; stage?: string }) =>
      request<any>(`/cases/${caseId}/documents`, { method: 'POST', body: JSON.stringify(data) }),
    analyze: (caseId: string, documentId: string, data: { legalIntelDocumentId: string; instructions?: string }) =>
      request<any>(`/cases/${caseId}/documents/${documentId}/analyze`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    remove: (caseId: string, id: string) =>
      request<{ ok: boolean }>(`/cases/${caseId}/documents/${id}`, { method: 'DELETE' }),
  },

  legalIntel: {
    upload: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return requestFormData<unknown>('/legal-intel/upload', fd);
    },
    generate: (data: {
      type: 'dictamen' | 'contrato' | 'memo' | 'escrito';
      title: string;
      instructions: string;
      knowledgeBases?: string[];
    }) => request<unknown>('/legal-intel/generate', { method: 'POST', body: JSON.stringify(data) }),
    query: (data: { documentId: string; query: string }) =>
      request<unknown>('/legal-intel/query', { method: 'POST', body: JSON.stringify(data) }),
    status: (liDocumentId: string) => request<unknown>(`/legal-intel/status/${encodeURIComponent(liDocumentId)}`),
    result: (liDocumentId: string) => request<unknown>(`/legal-intel/result/${encodeURIComponent(liDocumentId)}`),
  },

  tasks: {
    list: (caseId: string) => request<any[]>(`/cases/${caseId}/tasks`),
    create: (caseId: string, data: any) =>
      request<any>(`/cases/${caseId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
    update: (caseId: string, id: string, data: any) =>
      request<any>(`/cases/${caseId}/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (caseId: string, id: string) =>
      request<{ ok: boolean }>(`/cases/${caseId}/tasks/${id}`, { method: 'DELETE' }),
    generate: (caseId: string) =>
      request<any[]>(`/cases/${caseId}/tasks/generate`, { method: 'POST', body: JSON.stringify({}) }),
  },
};
