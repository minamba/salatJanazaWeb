import axios from 'axios';
import { authStorage } from '../storage/authStorage';

const API_URL = process.env.REACT_APP_API_URL ?? '';
const AUTH_URL = process.env.REACT_APP_AUTH_URL ?? 'https://auth.salatjanaza.org';

export const apiClient = axios.create({ baseURL: API_URL });
export const authClient = axios.create({ baseURL: AUTH_URL });

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = authStorage.getRefreshToken();
      if (refreshToken) {
        try {
          const params = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: 'qabr-mobile',
            refresh_token: refreshToken,
          });
          const res = await authClient.post('/connect/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          authStorage.setAccessToken(res.data.access_token);
          if (res.data.refresh_token) authStorage.setRefreshToken(res.data.refresh_token);
          original.headers.Authorization = `Bearer ${res.data.access_token}`;
          return apiClient(original);
        } catch {
          authStorage.clear();
          window.location.href = '/connexion';
        }
      }
    }
    return Promise.reject(err);
  }
);
