import api from './axios';
import { Case, CaseListItem } from '../types/case';

export const casesApi = {
  list: () => api.get<CaseListItem[]>('/cases'),

  get: (id: string) => api.get<Case>(`/cases/${id}`),

  create: (data: {
    title: string;
    description: string;
    background_facts: string;
    relevant_laws: string;
    difficulty_level: string;
    evidence_items?: { number: string; description: string }[];
  }) => api.post<Case>('/cases', data),

  update: (id: string, data: Partial<Case>) =>
    api.put<Case>(`/cases/${id}`, data),

  delete: (id: string) => api.delete(`/cases/${id}`),

  uploadAttachment: (caseId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/cases/${caseId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listAttachments: (caseId: string) => api.get(`/cases/${caseId}/attachments`),
};
