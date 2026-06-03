import api from './axios';
import { TokenResponse } from '../types/user';

export const authApi = {
  register: (data: { username: string; email: string; password: string; full_name: string; role: string }) =>
    api.post<TokenResponse>('/auth/register', data),

  login: (data: { username: string; password: string }) =>
    api.post<TokenResponse>('/auth/login', data),

  getMe: () => api.get('/auth/me'),
};
