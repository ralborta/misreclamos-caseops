import { config } from '../config';

const LI_BASE = config.LEGAL_INTEL_URL ?? '';

async function liRequest<T>(path: string, options?: RequestInit): Promise<T> {
  if (!LI_BASE) throw new Error('LEGAL_INTEL_URL not configured');
  const res = await fetch(`${LI_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Legal Intelligence error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const legalIntelService = {
  async uploadDocument(formData: FormData) {
    if (!LI_BASE) throw new Error('LEGAL_INTEL_URL not configured');
    const res = await fetch(`${LI_BASE}/legal/upload`, { method: 'POST', body: formData });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`LI upload failed ${res.status}${text ? `: ${text}` : ''}`);
    }
    return res.json();
  },

  async analyzeDocument(liDocumentId: string, instructions?: string) {
    return liRequest(`/legal/analyze/${liDocumentId}`, {
      method: 'POST',
      body: JSON.stringify({ instructions }),
    });
  },

  async getAnalysisStatus(liDocumentId: string) {
    return liRequest(`/legal/status/${liDocumentId}`);
  },

  async getAnalysisResult(liDocumentId: string) {
    return liRequest(`/legal/result/${liDocumentId}`);
  },

  async generateDocument(payload: {
    type: string;
    title: string;
    instructions: string;
    knowledgeBases?: string[];
  }) {
    return liRequest('/v1/generate', { method: 'POST', body: JSON.stringify(payload) });
  },

  async queryDocument(documentId: string, query: string) {
    return liRequest('/v1/query', {
      method: 'POST',
      body: JSON.stringify({ documentId, query }),
    });
  },

  async compareDocuments(payload: object) {
    return liRequest('/api/compare-documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getComparisonResult(comparisonId: string) {
    return liRequest(`/api/compare-documents/${comparisonId}`);
  },
};
