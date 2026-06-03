export enum DifficultyLevel {
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export interface EvidenceItem {
  number: string;
  description: string;
}

export interface CaseAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  background_facts: string;
  relevant_laws: string;
  difficulty_level: DifficultyLevel;
  evidence_items: EvidenceItem[];
  created_by: string;
  created_at: string;
  updated_at: string;
  attachments: CaseAttachment[];
}

export interface CaseListItem {
  id: string;
  title: string;
  difficulty_level: DifficultyLevel;
  created_by: string;
  created_at: string;
}
