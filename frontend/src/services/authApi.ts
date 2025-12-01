import { apiClient } from './apiClient';
import type { User, UserRole } from '../context/AuthContext';

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
    return data;
  },
  async register(payload: RegisterPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/register', payload);
    return data;
  },
};
