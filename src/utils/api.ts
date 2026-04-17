const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

function getToken(): string | null {
  return localStorage.getItem('caseops_token');
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
    throw new Error(err.message || 'Error en la solicitud');
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
    list: () => request<any[]>('/alerts'),
  },

  tasks: {
    list: (caseId?: string) => {
      const qs = caseId ? `?caseId=${caseId}` : '';
      return request<any[]>(`/tasks${qs}`);
    },
    update: (id: string, data: any) => request<any>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
};
