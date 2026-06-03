export enum TrialStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TrialPhase {
  OPENING = 'opening',
  EVIDENCE = 'evidence',
  CROSS_EXAMINATION = 'cross_examination',
  CLOSING = 'closing',
  VERDICT = 'verdict',
}

export enum GroupSide {
  PLAINTIFF = 'plaintiff',
  DEFENDANT = 'defendant',
}

export enum SubmissionType {
  ARGUMENT = 'argument',
  EVIDENCE = 'evidence',
  REBUTTAL = 'rebuttal',
}

export interface PhaseConfig {
  id: string;
  phase: TrialPhase;
  duration_seconds: number;
  order_index: number;
  is_active: boolean;
  started_at: string | null;
  ended_at: string | null;
}

export interface TrialSession {
  id: string;
  case_id: string;
  title: string;
  status: TrialStatus;
  current_phase: TrialPhase | null;
  phase_started_at: string | null;
  phase_duration_seconds: number;
  created_by: string;
  judge_id: string | null;
  winner: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  phase_configs: PhaseConfig[];
}

export interface GroupMember {
  id: string;
  user_id: string;
  role_in_group: string | null;
  username?: string;
  full_name?: string;
  assigned_at: string;
}

export interface Group {
  id: string;
  trial_session_id: string;
  name: string;
  side: GroupSide;
  drawn_at: string;
  created_at: string;
  members: GroupMember[];
}

export interface Submission {
  id: string;
  trial_session_id: string;
  group_id: string;
  user_id: string;
  phase: TrialPhase;
  submission_type: SubmissionType;
  title: string;
  content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  submitted_at: string;
}

export interface Score {
  id: string;
  trial_session_id: string;
  group_id: string;
  judge_id: string;
  phase: TrialPhase;
  argumentation_quality: number;
  evidence_usage: number;
  legal_reasoning: number;
  presentation: number;
  overall_score: number;
  comments: string | null;
  scored_at: string;
}
