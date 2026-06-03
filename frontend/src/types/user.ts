export enum UserRole {
  TEACHER = 'teacher',
  STUDENT = 'student',
  JUDGE = 'judge',
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}
