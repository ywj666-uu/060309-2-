import api from './axios';
import { TrialSession, Group } from '../types/trial';

export const trialsApi = {
  list: () => api.get<TrialSession[]>('/trials'),

  get: (id: string) => api.get<TrialSession>(`/trials/${id}`),

  create: (data: { case_id: string; title: string; judge_id?: string; phase_configs?: { phase: string; duration_seconds: number; weight?: number }[] }) =>
    api.post<TrialSession>('/trials', data),

  start: (id: string) => api.post<TrialSession>(`/trials/${id}/start`),

  nextPhase: (id: string) => api.post<TrialSession>(`/trials/${id}/next-phase`),

  end: (id: string) => api.post<TrialSession>(`/trials/${id}/end`),

  getGroups: (trialId: string) => api.get<Group[]>(`/trials/${trialId}/groups`),

  drawLots: (trialId: string) =>
    api.post<Group[]>(`/trials/${trialId}/groups/draw-lots`),

  createGroup: (trialId: string, data: { name: string; side: string }) =>
    api.post<Group>(`/trials/${trialId}/groups`, data),

  addMember: (trialId: string, groupId: string, data: { user_id: string; role_in_group?: string }) =>
    api.post(`/trials/${trialId}/groups/${groupId}/members`, data),
};
