import api from './axios';
import { Score } from '../types/trial';

export interface SubmissionScoreData {
  submission_id: string;
  score: number;
  comments?: string;
}

export interface SubmissionScoreResponse {
  id: string;
  submission_id: string;
  judge_id: string;
  trial_session_id: string;
  score: number;
  comments: string | null;
  scored_at: string;
}

export const scoresApi = {
  list: (trialId: string) => api.get<Score[]>(`/trials/${trialId}/scores`),

  create: (trialId: string, data: {
    group_id: string;
    phase: string;
    argumentation_quality: number;
    evidence_usage: number;
    legal_reasoning: number;
    presentation: number;
    overall_score: number;
    comments?: string;
  }) => api.post<Score>(`/trials/${trialId}/scores`, data),

  scoreSubmission: (trialId: string, data: SubmissionScoreData) =>
    api.post<SubmissionScoreResponse>(`/trials/${trialId}/scores/submission-score`, data),

  listSubmissionScores: (trialId: string) =>
    api.get<SubmissionScoreResponse[]>(`/trials/${trialId}/scores/submission-scores`),

  update: (trialId: string, scoreId: string, data: Partial<Score>) =>
    api.put<Score>(`/trials/${trialId}/scores/${scoreId}`, data),

  getSummary: (trialId: string) => api.get(`/trials/${trialId}/scores/summary`),
};
