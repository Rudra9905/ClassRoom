import axios from 'axios';
import { useAuthContext } from '../context/AuthContext';

export const API_BASE_URL = 'http://localhost:8080/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// attach token on each request
apiClient.interceptors.request.use((config) => {
  const stored = localStorage.getItem('smart-classroom-auth');
  if (stored) {
    try {
      const { token } = JSON.parse(stored) as { token: string };
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
  }
  return config;
});

// Optional hook-based helper for components if needed
export const useApiClient = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = useAuthContext();
  return apiClient;
};
