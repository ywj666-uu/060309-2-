import api from './axios';
import { Submission } from '../types/trial';

export const submissionsApi = {
  list: (trialId: string, phase?: string, groupId?: string) => {
    const params = new URLSearchParams();
    if (phase) params.append('phase', phase);
    if (groupId) params.append('group_id', groupId);
    return api.get<Submission[]>(`/trials/${trialId}/submissions?${params}`);
  },

  create: (trialId: string, formData: FormData) =>
    api.post<Submission>(`/trials/${trialId}/submissions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  get: (trialId: string, submissionId: string) =>
    api.get<Submission>(`/trials/${trialId}/submissions/${submissionId}`),
};
