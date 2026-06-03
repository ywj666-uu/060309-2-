import api from './axios';

export const reportsApi = {
  generate: (trialId: string) => api.post(`/trials/${trialId}/report/generate`),
  get: (trialId: string) => api.get(`/trials/${trialId}/report`),
};
